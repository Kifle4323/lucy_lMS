import type { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authRequired, requireRole, type AuthedRequest } from '../middleware.js';

export function registerStudentProfileRoutes(router: Router) {
  // === STUDENT ROUTES ===

  // Get own profile
  router.get('/student/profile', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
      include: { documents: true },
    });

    if (!profile) {
      // Create empty profile if doesn't exist
      const newProfile = await prisma.studentProfile.create({
        data: { userId: req.user!.id },
        include: { documents: true },
      });
      res.json(newProfile);
      return;
    }

    res.json(profile);
  });

  // Save profile (draft or submit for approval)
  router.patch('/student/profile', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const body = z.object({
      // Basic Information
      firstName: z.string().optional(),
      fatherName: z.string().optional(),
      grandFatherName: z.string().optional(),
      firstNameLocal: z.string().optional(),
      fatherNameLocal: z.string().optional(),
      grandFatherNameLocal: z.string().optional(),
      dateOfBirthGC: z.string().optional(),
      gender: z.string().optional(),
      placeOfBirth: z.string().optional(),
      motherTongue: z.string().optional(),
      healthStatus: z.string().optional(),
      maritalStatus: z.string().optional(),
      nationalIdFan: z.string().optional(),
      // Location and Address
      citizenship: z.string().optional(),
      country: z.string().optional(),
      city: z.string().optional(),
      subCity: z.string().optional(),
      kebele: z.string().optional(),
      woreda: z.string().optional(),
      houseNumber: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      pobox: z.string().optional(),
      // Others
      economicalStatus: z.string().optional(),
      areaType: z.string().optional(),
      tinNumber: z.string().optional(),
      accountNumber: z.string().optional(),
      // Educational - Campus Related
      stream: z.string().optional(),
      entryYear: z.number().optional(),
      sponsorCategory: z.string().optional(),
      sponsoredBy: z.string().optional(),
      nationalExamYearEC: z.number().optional(),
      examinationId: z.string().optional(),
      admissionDate: z.string().optional(),
      checkedInDate: z.string().optional(),
      nationalExamResultTotal: z.number().optional(),
      // National Exam Results
      examEnglish: z.number().optional(),
      examPhysics: z.number().optional(),
      examCivics: z.number().optional(),
      examNaturalMath: z.number().optional(),
      examChemistry: z.number().optional(),
      examBiology: z.number().optional(),
      examAptitude: z.number().optional(),
      // Submit action
      submitForApproval: z.boolean().optional(),
    }).parse(req.body);

    // Check if profile exists
    let profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!profile) {
      profile = await prisma.studentProfile.create({
        data: { userId: req.user!.id },
      });
    }

    // Update profile
    const updateData: any = {
      ...body,
      dateOfBirthGC: body.dateOfBirthGC ? new Date(body.dateOfBirthGC) : undefined,
      admissionDate: body.admissionDate ? new Date(body.admissionDate) : undefined,
      checkedInDate: body.checkedInDate ? new Date(body.checkedInDate) : undefined,
    };

    if (body.submitForApproval) {
      updateData.status = 'PENDING_APPROVAL';
    }

    const updatedProfile = await prisma.studentProfile.update({
      where: { userId: req.user!.id },
      data: updateData,
      include: { documents: true },
    });

    res.json(updatedProfile);
  });

  // Upload document
  router.post('/student/profile/documents', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const body = z.object({
      documentType: z.string(),
      fileName: z.string().optional(),
      fileUrl: z.string(), // Base64 encoded file
    }).parse(req.body);

    // Ensure profile exists
    let profile = await prisma.studentProfile.findUnique({
      where: { userId: req.user!.id },
    });

    if (!profile) {
      profile = await prisma.studentProfile.create({
        data: { userId: req.user!.id },
      });
    }

    // Check if document type already exists
    const existing = await prisma.studentDocument.findFirst({
      where: { studentProfileId: profile.id, documentType: body.documentType },
    });

    if (existing) {
      // Update existing document
      const updated = await prisma.studentDocument.update({
        where: { id: existing.id },
        data: {
          fileName: body.fileName,
          fileUrl: body.fileUrl,
          status: 'SUBMITTED',
          uploadedAt: new Date(),
        },
      });
      res.json(updated);
      return;
    }

    // Create new document
    const document = await prisma.studentDocument.create({
      data: {
        studentProfileId: profile.id,
        documentType: body.documentType,
        fileName: body.fileName,
        fileUrl: body.fileUrl,
        status: 'SUBMITTED',
        uploadedAt: new Date(),
      },
    });

    res.json(document);
  });

  // Delete document
  router.delete('/student/profile/documents/:documentId', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ documentId: z.string() }).parse(req.params);

    const document = await prisma.studentDocument.findUnique({
      where: { id: params.documentId },
      include: { studentProfile: true },
    });

    if (!document || document.studentProfile.userId !== req.user!.id) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    await prisma.studentDocument.delete({
      where: { id: params.documentId },
    });

    res.json({ success: true });
  });

  // === ADMIN ROUTES ===

  // Get all pending profiles
  router.get('/admin/student-profiles/pending', authRequired, requireRole(['ADMIN']), async (req: AuthedRequest, res: Response) => {
    const profiles = await prisma.studentProfile.findMany({
      where: { status: 'PENDING_APPROVAL' },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        documents: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(profiles);
  });

  // Get all profiles (with filter)
  router.get('/admin/student-profiles', authRequired, requireRole(['ADMIN']), async (req: AuthedRequest, res: Response) => {
    const query = z.object({
      status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED']).optional(),
    }).parse(req.query);

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }

    const profiles = await prisma.studentProfile.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, fullName: true, profileImage: true } },
        documents: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(profiles);
  });

  // Get single profile
  router.get('/admin/student-profiles/:profileId', authRequired, requireRole(['ADMIN']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ profileId: z.string() }).parse(req.params);

    const profile = await prisma.studentProfile.findUnique({
      where: { id: params.profileId },
      include: {
        user: { select: { id: true, email: true, fullName: true, profileImage: true, createdAt: true } },
        documents: true,
      },
    });

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json(profile);
  });

  // Approve profile
  router.post('/admin/student-profiles/:profileId/approve', authRequired, requireRole(['ADMIN']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ profileId: z.string() }).parse(req.params);

    const profile = await prisma.studentProfile.update({
      where: { id: params.profileId },
      data: {
        status: 'APPROVED',
        adminReviewedBy: req.user!.id,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        documents: true,
      },
    });

    res.json(profile);
  });

  // Reject profile
  router.post('/admin/student-profiles/:profileId/reject', authRequired, requireRole(['ADMIN']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ profileId: z.string() }).parse(req.params);
    const body = z.object({ reason: z.string().min(1) }).parse(req.body);

    const profile = await prisma.studentProfile.update({
      where: { id: params.profileId },
      data: {
        status: 'REJECTED',
        adminReviewedBy: req.user!.id,
        reviewedAt: new Date(),
        rejectionReason: body.reason,
      },
      include: {
        user: { select: { id: true, email: true, fullName: true } },
        documents: true,
      },
    });

    res.json(profile);
  });
}
