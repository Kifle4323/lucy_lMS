import type { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authRequired, requireRole, type AuthedRequest } from '../middleware.js';

export function registerFaceVerificationRoutes(router: Router) {
  // Student: Update profile with image
  router.patch('/users/me/profile', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const body = z.object({
      fullName: z.string().min(2).optional(),
      profileImage: z.string().min(1), // Base64 encoded image
    }).parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        fullName: body.fullName,
        profileImage: body.profileImage,
        isProfileComplete: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isProfileComplete: true,
      },
    });

    res.json(user);
  });

  // Student: Get own profile status
  router.get('/users/me/profile-status', authRequired, async (req: AuthedRequest, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        fullName: true,
        profileImage: true,
        isProfileComplete: true,
      },
    });

    res.json(user);
  });

  // Admin: Get all students with profile status
  router.get('/admin/students-profiles', authRequired, requireRole(['ADMIN']), async (req: AuthedRequest, res: Response) => {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: {
        id: true,
        email: true,
        fullName: true,
        profileImage: true,
        isProfileComplete: true,
        createdAt: true,
        classStudents: {
          include: {
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(students);
  });

  // Admin: Get pending face verifications
  router.get('/admin/face-verifications/pending', authRequired, requireRole(['ADMIN']), async (req: AuthedRequest, res: Response) => {
    const verifications = await prisma.faceVerification.findMany({
      where: {
        matchResult: false,
        adminReviewed: false,
      },
      include: {
        student: {
          select: { id: true, fullName: true, email: true, profileImage: true },
        },
        attempt: {
          include: {
            assessment: {
              select: { id: true, title: true, examType: true, course: { select: { title: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(verifications);
  });

  // Admin: Get all face verifications (with filters)
  router.get('/admin/face-verifications', authRequired, requireRole(['ADMIN']), async (req: AuthedRequest, res: Response) => {
    const query = z.object({
      status: z.enum(['pending', 'approved', 'rejected', 'matched']).optional(),
    }).parse(req.query);

    const where: any = {};
    if (query.status === 'pending') {
      where.matchResult = false;
      where.adminReviewed = false;
    } else if (query.status === 'approved') {
      where.matchResult = false;
      where.adminReviewed = true;
      where.adminApproved = true;
    } else if (query.status === 'rejected') {
      where.matchResult = false;
      where.adminReviewed = true;
      where.adminApproved = false;
    } else if (query.status === 'matched') {
      where.matchResult = true;
    }

    const verifications = await prisma.faceVerification.findMany({
      where,
      include: {
        student: {
          select: { id: true, fullName: true, email: true, profileImage: true },
        },
        attempt: {
          include: {
            assessment: {
              select: { id: true, title: true, examType: true, course: { select: { title: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(verifications);
  });

  // Admin: Approve or reject face verification
  router.post('/admin/face-verifications/:id/review', authRequired, requireRole(['ADMIN']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ id: z.string() }).parse(req.params);
    const body = z.object({
      approved: z.boolean(),
    }).parse(req.body);

    const verification = await prisma.faceVerification.findUnique({
      where: { id: params.id },
      include: { attempt: true },
    });

    if (!verification) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // Update verification and attempt
    const [updated] = await prisma.$transaction([
      prisma.faceVerification.update({
        where: { id: params.id },
        data: {
          adminReviewed: true,
          adminApproved: body.approved,
          adminId: req.user!.id,
          reviewedAt: new Date(),
        },
        include: {
          student: { select: { id: true, fullName: true, email: true } },
          attempt: { include: { assessment: { select: { title: true } } } },
        },
      }),
      prisma.attempt.update({
        where: { id: verification.attemptId },
        data: {
          faceVerified: body.approved,
          faceVerifiedAt: body.approved ? new Date() : null,
        },
      }),
    ]);

    res.json(updated);
  });

  // Teacher: Get attempts with face verification status for grading
  router.get('/assessments/:assessmentId/attempts-for-grading', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ assessmentId: z.string() }).parse(req.params);

    const assessment = await prisma.assessment.findUnique({
      where: { id: params.assessmentId },
      include: { course: { include: { courseClasses: true } } },
    });

    if (!assessment) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // Check if teacher is assigned to this course
    const courseClass = assessment.course.courseClasses.find((cc: { teacherId: string | null }) => cc.teacherId === req.user!.id);
    if (!courseClass) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    const attempts = await prisma.attempt.findMany({
      where: { assessmentId: params.assessmentId, status: 'SUBMITTED' },
      include: {
        student: { select: { id: true, fullName: true, email: true, profileImage: true } },
        faceVerification: true,
        answers: {
          include: { question: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json(attempts);
  });

  // Internal: Create or update face verification record
  router.post('/face-verifications', authRequired, async (req: AuthedRequest, res: Response) => {
    const body = z.object({
      attemptId: z.string(),
      capturedImage: z.string(),
      matchResult: z.boolean(),
    }).parse(req.body);

    // Verify the attempt belongs to this student
    const attempt = await prisma.attempt.findFirst({
      where: { id: body.attemptId, studentId: req.user!.id },
    });

    if (!attempt) {
      res.status(404).json({ error: 'attempt_not_found' });
      return;
    }

    // Get student's profile image for reference
    const student = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { profileImage: true },
    });

    // Use upsert to create or update the verification record
    const verification = await prisma.faceVerification.upsert({
      where: { attemptId: body.attemptId },
      create: {
        attemptId: body.attemptId,
        studentId: req.user!.id,
        capturedImage: body.capturedImage,
        matchedImage: student?.profileImage,
        matchResult: body.matchResult,
      },
      update: {
        capturedImage: body.capturedImage,
        matchResult: body.matchResult,
      },
    });

    res.json(verification);
  });
}
