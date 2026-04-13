// @ts-nocheck
import type { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authRequired, requireRole, type AuthedRequest } from '../middleware';

export function registerAssessmentRoutes(router: Router) {
  router.post(
    '/courses/:courseId/assessments',
    authRequired,
    requireRole(['TEACHER']),
    async (req: AuthedRequest, res: Response) => {
      const params = z.object({ courseId: z.string() }).parse(req.params);
      const body = z.object({
        title: z.string().min(2),
        examType: z.enum(['QUIZ', 'MIDTERM', 'FINAL']).optional(),
        timeLimit: z.number().int().positive().optional(),
        maxScore: z.number().int().positive().optional(),
      }).parse(req.body);

      // Check if teacher is assigned to this course through CourseSection
      const courseSection = await prisma.courseSection.findFirst({
        where: { courseId: params.courseId, teacherId: req.user!.id },
        include: { course: true },
      });

      if (!courseSection) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }

      const assessment = await prisma.assessment.create({
        data: {
          courseId: params.courseId,
          title: body.title,
          examType: body.examType ?? 'QUIZ',
          timeLimit: body.timeLimit,
          maxScore: body.maxScore ?? 100,
        },
      });

      // Notify all students enrolled in this teacher's course courseSections
      const enrollments = await prisma.studentEnrollment.findMany({
        where: { 
          courseSectionId: courseSection.id,
          status: 'ENROLLED',
        },
        select: { studentId: true },
      });

      if (enrollments.length > 0) {
        await prisma.notification.createMany({
          data: enrollments.map(e => ({
            userId: e.studentId,
            type: 'NEW_ASSESSMENT',
            title: 'New Assessment Available',
            message: `A new ${body.examType?.toLowerCase() || 'quiz'} "${body.title}" has been created for ${courseSection.course?.title || 'your course'}.`,
          })),
        });
      }

      res.json(assessment);
    },
  );

  router.post(
    '/assessments/:assessmentId/questions',
    authRequired,
    requireRole(['TEACHER']),
    async (req: AuthedRequest, res: Response) => {
      const params = z.object({ assessmentId: z.string() }).parse(req.params);
      const body = z.object({
        type: z.enum(['MCQ', 'FITB', 'SHORT_ANSWER']).default('MCQ'),
        prompt: z.string().min(2),
        // MCQ fields
        optionA: z.string().optional(),
        optionB: z.string().optional(),
        optionC: z.string().optional(),
        optionD: z.string().optional(),
        correct: z.enum(['A', 'B', 'C', 'D']).optional(),
        // FITB field
        correctAnswer: z.string().optional(),
        // Short answer field
        modelAnswer: z.string().optional(),
        points: z.number().int().positive().optional(),
      }).parse(req.body);

      const assessment = await prisma.assessment.findUnique({ where: { id: params.assessmentId }, include: { course: { include: { courseSections: true } } } });
      if (!assessment) {
        res.status(404).json({ error: 'not_found' });
        return;
      }

      // Check if teacher is assigned to this course through CourseSection
      const courseSection = assessment.course.courseSections.find((s: { teacherId: string | null }) => s.teacherId === req.user!.id);
      if (!courseSection) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }

      // Validate required fields based on type
      if (body.type === 'MCQ') {
        if (!body.optionA || !body.optionB || !body.optionC || !body.optionD || !body.correct) {
          res.status(400).json({ error: 'MCQ requires options A-D and correct answer' });
          return;
        }
      } else if (body.type === 'FITB') {
        if (!body.correctAnswer) {
          res.status(400).json({ error: 'FITB requires correctAnswer' });
          return;
        }
      } else if (body.type === 'SHORT_ANSWER') {
        if (!body.modelAnswer) {
          res.status(400).json({ error: 'SHORT_ANSWER requires modelAnswer' });
          return;
        }
      }

      const question = await prisma.question.create({
        data: {
          assessmentId: params.assessmentId,
          type: body.type,
          prompt: body.prompt,
          optionA: body.optionA,
          optionB: body.optionB,
          optionC: body.optionC,
          optionD: body.optionD,
          correct: body.correct,
          correctAnswer: body.correctAnswer,
          modelAnswer: body.modelAnswer,
          points: body.points ?? 1,
        },
      });

      res.json(question);
    },
  );

  router.get('/courses/:courseId/assessments', authRequired, async (req: AuthedRequest, res: Response) => {
    const params = z.object({ courseId: z.string() }).parse(req.params);

    const course = await prisma.course.findUnique({
      where: { id: params.courseId },
      include: {
        courseSections: {
          include: {
            class: { include: { students: true, teachers: true } },
            teacher: true,
            enrollments: { where: { status: 'ENROLLED' } },
          },
        },
      },
    });

    if (!course) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const user = req.user!;

    // Check access: admin, teacher assigned to this course, or student enrolled in this course
    const isAdmin = user.role === 'ADMIN';
    const isTeacher = course.courseSections.some((s: { teacherId: string | null }) => s.teacherId === user.id);
    const isStudent = course.courseSections.some((s: { enrollments: { studentId: string }[] }) =>
      s.enrollments.some((e: { studentId: string }) => e.studentId === user.id)
    );

    if (!isAdmin && !isTeacher && !isStudent) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    const assessments = await prisma.assessment.findMany({ where: { courseId: params.courseId }, orderBy: { createdAt: 'desc' } });
    res.json(assessments);
  });

  // Toggle assessment open/closed status (Teacher only)
  router.patch('/assessments/:assessmentId/open', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ assessmentId: z.string() }).parse(req.params);
    const body = z.object({ isOpen: z.boolean() }).parse(req.body);

    const assessment = await prisma.assessment.findUnique({
      where: { id: params.assessmentId },
      include: { course: { include: { courseSections: true } } },
    });

    if (!assessment) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // Check if teacher is assigned to this course through CourseSection
    const courseSection = assessment.course.courseSections.find((s: { teacherId: string | null }) => s.teacherId === req.user!.id);
    if (!courseSection) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    const updated = await prisma.assessment.update({
      where: { id: params.assessmentId },
      data: { isOpen: body.isOpen },
    });

    res.json(updated);
  });

  // Update assessment (Teacher only)
  router.put('/assessments/:assessmentId', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ assessmentId: z.string() }).parse(req.params);
    const body = z.object({
      title: z.string().min(2).optional(),
      examType: z.enum(['QUIZ', 'MIDTERM', 'FINAL']).optional(),
      timeLimit: z.number().int().positive().nullable().optional(),
      maxScore: z.number().int().positive().optional(),
    }).parse(req.body);

    const assessment = await prisma.assessment.findUnique({
      where: { id: params.assessmentId },
      include: { course: { include: { courseSections: true } } },
    });

    if (!assessment) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // Check if teacher is assigned to this course
    const courseSection = assessment.course.courseSections.find((s: { teacherId: string | null }) => s.teacherId === req.user!.id);
    if (!courseSection) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    const updated = await prisma.assessment.update({
      where: { id: params.assessmentId },
      data: body,
    });

    res.json(updated);
  });

  // Delete assessment (Teacher only)
  router.delete('/assessments/:assessmentId', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ assessmentId: z.string() }).parse(req.params);

    const assessment = await prisma.assessment.findUnique({
      where: { id: params.assessmentId },
      include: { course: { include: { courseSections: true } } },
    });

    if (!assessment) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // Check if teacher is assigned to this course
    const courseSection = assessment.course.courseSections.find((s: { teacherId: string | null }) => s.teacherId === req.user!.id);
    if (!courseSection) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    // Delete related records first (attempts, answers, manual grades, questions)
    await prisma.$transaction(async (tx) => {
      // Get all attempt IDs for this assessment
      const attempts = await tx.attempt.findMany({
        where: { assessmentId: params.assessmentId },
        select: { id: true },
      });
      const attemptIds = attempts.map(a => a.id);

      // Delete answers for these attempts
      if (attemptIds.length > 0) {
        await tx.answer.deleteMany({
          where: { attemptId: { in: attemptIds } },
        });
      }

      // Delete attempts
      await tx.attempt.deleteMany({
        where: { assessmentId: params.assessmentId },
      });

      // Delete manual grades
      await tx.manualGrade.deleteMany({
        where: { assessmentId: params.assessmentId },
      });

      // Delete questions
      await tx.question.deleteMany({
        where: { assessmentId: params.assessmentId },
      });

      // Delete the assessment
      await tx.assessment.delete({
        where: { id: params.assessmentId },
      });
    });

    res.json({ success: true, message: 'Assessment deleted successfully' });
  });

  // Get all manual grades for an assessment (Teacher only)
  router.get('/assessments/:assessmentId/manual-grades', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ assessmentId: z.string() }).parse(req.params);

    const assessment = await prisma.assessment.findUnique({
      where: { id: params.assessmentId },
      include: { course: { include: { courseSections: true } } },
    });

    if (!assessment) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // Check if teacher is assigned to this course
    const courseClass = assessment.course.courseSections.find((cc: { teacherId: string | null }) => cc.teacherId === req.user!.id);
    if (!courseClass) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    const grades = await prisma.manualGrade.findMany({
      where: { assessmentId: params.assessmentId },
      include: { student: { select: { id: true, fullName: true, email: true } } },
    });

    res.json(grades);
  });

  // Create or update manual grade (Teacher only)
  router.put('/assessments/:assessmentId/manual-grades/:studentId', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ assessmentId: z.string(), studentId: z.string() }).parse(req.params);
    const body = z.object({
      score: z.number().int().min(0),
      feedback: z.string().optional(),
    }).parse(req.body);

    const assessment = await prisma.assessment.findUnique({
      where: { id: params.assessmentId },
      include: { course: { include: { courseSections: true } } },
    });

    if (!assessment) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // Check if teacher is assigned to this course
    const courseClass = assessment.course.courseSections.find((cc: { teacherId: string | null }) => cc.teacherId === req.user!.id);
    if (!courseClass) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    // Validate score doesn't exceed maxScore
    if (body.score > assessment.maxScore) {
      res.status(400).json({ error: 'score_exceeds_max', message: `Score cannot exceed ${assessment.maxScore}` });
      return;
    }

    const grade = await prisma.manualGrade.upsert({
      where: {
        assessmentId_studentId: {
          assessmentId: params.assessmentId,
          studentId: params.studentId,
        },
      },
      update: {
        score: body.score,
        feedback: body.feedback,
      },
      create: {
        assessmentId: params.assessmentId,
        studentId: params.studentId,
        score: body.score,
        feedback: body.feedback,
      },
      include: { student: { select: { id: true, fullName: true, email: true } } },
    });

    res.json(grade);
  });

  // Delete manual grade (Teacher only)
  router.delete('/assessments/:assessmentId/manual-grades/:studentId', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ assessmentId: z.string(), studentId: z.string() }).parse(req.params);

    const assessment = await prisma.assessment.findUnique({
      where: { id: params.assessmentId },
      include: { course: { include: { courseSections: true } } },
    });

    if (!assessment) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // Check if teacher is assigned to this course
    const courseClass = assessment.course.courseSections.find((cc: { teacherId: string | null }) => cc.teacherId === req.user!.id);
    if (!courseClass) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    await prisma.manualGrade.delete({
      where: {
        assessmentId_studentId: {
          assessmentId: params.assessmentId,
          studentId: params.studentId,
        },
      },
    });

    res.json({ success: true });
  });

  router.post('/assessments/:assessmentId/attempts', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ assessmentId: z.string() }).parse(req.params);

    const assessment = await prisma.assessment.findUnique({
      where: { id: params.assessmentId },
      include: {
        course: {
          include: {
            courseSections: {
              include: {
                enrollments: { where: { status: 'ENROLLED' } },
              },
            },
          },
        },
      },
    });

    if (!assessment) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // Check if assessment is open for students
    if (!assessment.isOpen) {
      res.status(403).json({ error: 'assessment_closed', message: 'This assessment is not yet open for students' });
      return;
    }

    // Check if student is enrolled in this course
    const isEnrolled = assessment.course.courseSections.some((s: { enrollments: { studentId: string }[] }) =>
      s.enrollments.some((e: { studentId: string }) => e.studentId === req.user!.id)
    );

    if (!isEnrolled) {
      res.status(403).json({ error: 'not_enrolled' });
      return;
    }

    // Check if student already has any attempt for this assessment (submitted or in progress)
    const existingAttempt = await prisma.attempt.findFirst({
      where: {
        assessmentId: params.assessmentId,
        studentId: req.user!.id,
      },
    });

    if (existingAttempt) {
      if (existingAttempt.status === 'IN_PROGRESS') {
        // Return the existing in-progress attempt instead of creating a new one
        res.json(existingAttempt);
        return;
      }
      res.status(400).json({ error: 'already_submitted', message: 'You have already submitted this assessment' });
      return;
    }

    const attempt = await prisma.attempt.create({
      data: {
        assessmentId: params.assessmentId,
        studentId: req.user!.id,
      },
    });

    res.json(attempt);
  });

  router.get('/attempts/:attemptId', authRequired, async (req: AuthedRequest, res: Response) => {
    const params = z.object({ attemptId: z.string() }).parse(req.params);

    const attempt = await prisma.attempt.findUnique({
      where: { id: params.attemptId },
      include: {
        assessment: { include: { questions: true } },
        answers: true,
      },
    });

    if (!attempt) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    const user = req.user!;
    const isOwner = user.role === 'STUDENT' && attempt.studentId === user.id;
    const isTeacher = user.role === 'TEACHER' && attempt.assessment.courseId;
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isTeacher && !isAdmin) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    res.json(attempt);
  });

  router.patch('/attempts/:attemptId/answers', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ attemptId: z.string() }).parse(req.params);
    const body = z.object({
      questionId: z.string(),
      selected: z.enum(['A', 'B', 'C', 'D']).optional(),      // For MCQ
      textAnswer: z.string().optional(),                       // For FITB and SHORT_ANSWER
    }).parse(req.body);

    const attempt = await prisma.attempt.findUnique({ where: { id: params.attemptId } });
    if (!attempt || attempt.studentId !== req.user!.id || attempt.status !== 'IN_PROGRESS') {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    const answer = await prisma.answer.upsert({
      where: { attemptId_questionId: { attemptId: params.attemptId, questionId: body.questionId } },
      update: {
        selected: body.selected,
        textAnswer: body.textAnswer,
      },
      create: {
        attemptId: params.attemptId,
        questionId: body.questionId,
        selected: body.selected,
        textAnswer: body.textAnswer,
      },
    });

    res.json(answer);
  });

  router.post('/attempts/:attemptId/submit', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ attemptId: z.string() }).parse(req.params);

    const attempt = await prisma.attempt.findUnique({
      where: { id: params.attemptId },
      include: { answers: true, assessment: { include: { questions: true } } },
    });

    if (!attempt || attempt.studentId !== req.user!.id || attempt.status !== 'IN_PROGRESS') {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    // Build question map with all needed fields
    const questionMap = new Map<string, { id: string; type: string; correct: string | null; correctAnswer: string | null; points: number }>(
      attempt.assessment.questions.map((q: { id: string; type: string; correct: string | null; correctAnswer: string | null; points: number }) => [q.id, {
        id: q.id,
        type: q.type,
        correct: q.correct,
        correctAnswer: q.correctAnswer,
        points: q.points,
      }]),
    );

    let autoScore = 0;
    let hasManualGrading = false;

    for (const ans of attempt.answers) {
      const q = questionMap.get(ans.questionId);
      if (!q) continue;

      if (q.type === 'MCQ') {
        // Auto-grade MCQ
        if (ans.selected === q.correct) {
          autoScore += q.points;
        }
      } else if (q.type === 'FITB') {
        // Auto-grade FITB (case-insensitive, trimmed)
        if (ans.textAnswer && q.correctAnswer) {
          const studentAns = ans.textAnswer.trim().toLowerCase();
          const correctAns = q.correctAnswer.trim().toLowerCase();
          if (studentAns === correctAns) {
            autoScore += q.points;
          }
        }
      } else if (q.type === 'SHORT_ANSWER') {
        // Needs manual grading
        hasManualGrading = true;
      }
    }

    // If there are short answer questions, status remains SUBMITTED until teacher grades
    // Otherwise, mark as GRADED
    const status = hasManualGrading ? 'SUBMITTED' : 'GRADED';
    const score = hasManualGrading ? autoScore : autoScore; // Will be updated after manual grading

    const updated = await prisma.attempt.update({
      where: { id: params.attemptId },
      data: { status, submittedAt: new Date(), score },
    });

    res.json({ ...updated, hasManualGrading, autoScore });
  });

  // Teacher grades short answer questions
  router.post('/attempts/:attemptId/grade', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ attemptId: z.string() }).parse(req.params);
    const body = z.object({
      answers: z.array(z.object({
        answerId: z.string(),
        score: z.number().int().min(0),
        feedback: z.string().optional(),
      })),
    }).parse(req.body);

    const attempt = await prisma.attempt.findUnique({
      where: { id: params.attemptId },
      include: {
        assessment: {
          include: {
            course: {
              include: {
                courseSections: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // Check if teacher is assigned to this course
    const isTeacher = attempt.assessment.course.courseSections.some(
      (cc: { teacherId: string | null }) => cc.teacherId === req.user!.id
    );
    if (!isTeacher) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    // Update each answer's score and feedback
    for (const a of body.answers) {
      await prisma.answer.update({
        where: { id: a.answerId },
        data: { score: a.score, feedback: a.feedback },
      });
    }

    // Recalculate total score
    const answers = await prisma.answer.findMany({ where: { attemptId: params.attemptId } });
    const totalScore = answers.reduce((sum: number, a: { score: number | null }) => sum + (a.score ?? 0), 0);

    const updated = await prisma.attempt.update({
      where: { id: params.attemptId },
      data: { status: 'GRADED', score: totalScore },
    });

    res.json(updated);
  });
}
