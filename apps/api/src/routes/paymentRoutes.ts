// @ts-nocheck
import type { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authRequired, requireRole, type AuthedRequest } from '../middleware';

const CHAPA_API = 'https://api.chapa.co/v1/transaction';
const CHAPA_SECRET = process.env.CHAPA_SECRET_KEY || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

export function registerPaymentRoutes(router: Router) {
  // Student: Initialize payment for semester registration
  router.post('/payments/initialize', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const body = z.object({
      semesterId: z.string(),
    }).parse(req.body);

    try {
      // Check semester exists and has registration open
      const semester = await prisma.semester.findUnique({
        where: { id: body.semesterId },
      });

      if (!semester) {
        return res.status(404).json({ error: 'Semester not found' });
      }

      if (!semester.registrationFee || semester.registrationFee <= 0) {
        return res.status(400).json({ error: 'No registration fee set for this semester' });
      }

      // Check if already paid
      const existingPayment = await prisma.semesterPayment.findFirst({
        where: {
          studentId: user.id,
          semesterId: body.semesterId,
          status: 'COMPLETED',
        },
      });

      if (existingPayment) {
        return res.status(400).json({ error: 'You have already paid for this semester', payment: existingPayment });
      }

      // Check if there's a pending payment
      const pendingPayment = await prisma.semesterPayment.findFirst({
        where: {
          studentId: user.id,
          semesterId: body.semesterId,
          status: 'PENDING',
        },
      });

      if (pendingPayment) {
        // Return existing checkout URL
        return res.json({
          message: 'You have a pending payment',
          payment: pendingPayment,
          checkoutUrl: pendingPayment.checkoutUrl,
        });
      }

      // Generate unique transaction reference
      const txRef = `LUCY-${body.semesterId.substring(0, 8)}-${user.id.substring(0, 8)}-${Date.now()}`;

      // Get student profile for name
      const studentProfile = await prisma.studentProfile.findUnique({
        where: { userId: user.id },
      });

      const firstName = studentProfile?.firstName || user.fullName.split(' ')[0] || 'Student';
      const lastName = studentProfile?.fatherName || user.fullName.split(' ').slice(1).join(' ') || 'User';

      // Initialize Chapa transaction
      const chapaPayload = {
        amount: semester.registrationFee.toString(),
        currency: 'ETB',
        email: user.email,
        first_name: firstName,
        last_name: lastName,
        phone_number: studentProfile?.phone || '',
        tx_ref: txRef,
        callback_url: `${process.env.API_URL || 'http://localhost:4000'}/api/payments/callback`,
        return_url: `${FRONTEND_URL}/payment-return?txRef=${txRef}`,
        customization: {
          title: `Lucy LMS - ${semester.name} Registration`,
          description: `Semester registration fee for ${semester.name}`,
        },
      };

      const chapaResponse = await fetch(`${CHAPA_API}/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CHAPA_SECRET}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chapaPayload),
      });

      const chapaData = await chapaResponse.json();

      if (chapaData.status !== 'success') {
        console.error('Chapa initialization failed:', chapaData);
        return res.status(400).json({ error: 'Payment initialization failed', details: chapaData.message });
      }

      // Save payment record
      const payment = await prisma.semesterPayment.create({
        data: {
          studentId: user.id,
          semesterId: body.semesterId,
          amount: semester.registrationFee,
          currency: 'ETB',
          txRef,
          checkoutUrl: chapaData.data.checkout_url,
          returnUrl: `${FRONTEND_URL}/payment-return?txRef=${txRef}`,
          status: 'PENDING',
        },
      });

      res.json({
        message: 'Payment initialized successfully',
        payment,
        checkoutUrl: chapaData.data.checkout_url,
      });
    } catch (err) {
      console.error('Error initializing payment:', err);
      res.status(500).json({ error: 'Failed to initialize payment' });
    }
  });

  // Chapa callback URL (called by Chapa after payment)
  router.get('/payments/callback', async (req: Request, res: Response) => {
    const { trx_ref, ref_id, status } = req.query;

    console.log('Chapa callback received:', { trx_ref, ref_id, status });

    try {
      if (!trx_ref) {
        return res.status(400).json({ error: 'Missing transaction reference' });
      }

      const payment = await prisma.semesterPayment.findUnique({
        where: { txRef: trx_ref as string },
      });

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      if (status === 'success') {
        // Verify with Chapa before marking as completed
        const verifyResponse = await fetch(`${CHAPA_API}/verify/${trx_ref}`, {
          headers: {
            'Authorization': `Bearer ${CHAPA_SECRET}`,
          },
        });

        const verifyData = await verifyResponse.json();

        if (verifyData.status === 'success' && verifyData.data.status === 'success') {
          await prisma.semesterPayment.update({
            where: { txRef: trx_ref as string },
            data: {
              status: 'COMPLETED',
              chapaRefId: ref_id as string || verifyData.data.ref_id,
              paidAt: new Date(),
            },
          });

          console.log(`Payment completed: ${trx_ref}`);
        } else {
          await prisma.semesterPayment.update({
            where: { txRef: trx_ref as string },
            data: {
              status: 'FAILED',
              chapaRefId: ref_id as string || null,
            },
          });
        }
      } else {
        await prisma.semesterPayment.update({
          where: { txRef: trx_ref as string },
          data: {
            status: 'FAILED',
            chapaRefId: ref_id as string || null,
          },
        });
      }

      // Redirect to frontend
      res.redirect(`${FRONTEND_URL}/payment-return?txRef=${trx_ref}&status=${status}`);
    } catch (err) {
      console.error('Error processing callback:', err);
      res.redirect(`${FRONTEND_URL}/payment-return?txRef=${trx_ref}&status=error`);
    }
  });

  // Student: Verify payment status
  router.get('/payments/verify/:txRef', authRequired, async (req: AuthedRequest, res: Response) => {
    const params = z.object({ txRef: z.string() }).parse(req.params);

    try {
      const payment = await prisma.semesterPayment.findUnique({
        where: { txRef: params.txRef },
        include: { semester: true },
      });

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      // If still pending, verify with Chapa
      if (payment.status === 'PENDING') {
        const verifyResponse = await fetch(`${CHAPA_API}/verify/${params.txRef}`, {
          headers: {
            'Authorization': `Bearer ${CHAPA_SECRET}`,
          },
        });

        const verifyData = await verifyResponse.json();

        if (verifyData.status === 'success' && verifyData.data.status === 'success') {
          await prisma.semesterPayment.update({
            where: { txRef: params.txRef },
            data: {
              status: 'COMPLETED',
              chapaRefId: verifyData.data.ref_id,
              paidAt: new Date(),
            },
          });
          payment.status = 'COMPLETED';
          payment.chapaRefId = verifyData.data.ref_id;
          payment.paidAt = new Date();
        } else if (verifyData.data?.status === 'failed') {
          await prisma.semesterPayment.update({
            where: { txRef: params.txRef },
            data: { status: 'FAILED' },
          });
          payment.status = 'FAILED';
        }
      }

      res.json({ payment });
    } catch (err) {
      console.error('Error verifying payment:', err);
      res.status(500).json({ error: 'Failed to verify payment' });
    }
  });

  // Student: Get my payments
  router.get('/payments/my', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const user = req.user!;

    try {
      const payments = await prisma.semesterPayment.findMany({
        where: { studentId: user.id },
        include: { semester: true },
        orderBy: { createdAt: 'desc' },
      });

      res.json(payments);
    } catch (err) {
      console.error('Error fetching payments:', err);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  });

  // Student: Check if paid for semester
  router.get('/payments/semester/:semesterId/status', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const params = z.object({ semesterId: z.string() }).parse(req.params);

    try {
      const payment = await prisma.semesterPayment.findFirst({
        where: {
          studentId: user.id,
          semesterId: params.semesterId,
          status: 'COMPLETED',
        },
      });

      const pendingPayment = await prisma.semesterPayment.findFirst({
        where: {
          studentId: user.id,
          semesterId: params.semesterId,
          status: 'PENDING',
        },
      });

      res.json({
        isPaid: !!payment,
        payment: payment || pendingPayment || null,
        status: payment ? 'COMPLETED' : pendingPayment ? 'PENDING' : 'NONE',
      });
    } catch (err) {
      console.error('Error checking payment status:', err);
      res.status(500).json({ error: 'Failed to check payment status' });
    }
  });

  // Admin: Get all payments for a semester
  router.get('/admin/payments/semester/:semesterId', authRequired, requireRole(['ADMIN']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ semesterId: z.string() }).parse(req.params);

    try {
      const payments = await prisma.semesterPayment.findMany({
        where: { semesterId: params.semesterId },
        include: {
          student: { select: { id: true, fullName: true, email: true } },
          semester: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(payments);
    } catch (err) {
      console.error('Error fetching semester payments:', err);
      res.status(500).json({ error: 'Failed to fetch payments' });
    }
  });

  // Admin: Set registration fee for semester
  router.patch('/admin/semesters/:semesterId/fee', authRequired, requireRole(['ADMIN']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ semesterId: z.string() }).parse(req.params);
    const body = z.object({
      registrationFee: z.number().positive().nullable(),
    }).parse(req.body);

    try {
      const semester = await prisma.semester.update({
        where: { id: params.semesterId },
        data: { registrationFee: body.registrationFee },
      });

      res.json(semester);
    } catch (err) {
      console.error('Error setting registration fee:', err);
      res.status(500).json({ error: 'Failed to set registration fee' });
    }
  });
}
