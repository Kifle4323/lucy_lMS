// @ts-nocheck
import type { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authRequired, requireRole, type AuthedRequest } from '../middleware';

export function registerGradebookRoutes(router: Router) {
  // Get or create grade config for a course
  router.get('/courses/:courseId/grade-config', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ courseId: z.string() }).parse(req.params);

    // Verify teacher teaches this course
    const courseClass = await prisma.courseClass.findFirst({
      where: { courseId: params.courseId, teacherId: req.user!.id },
    });

    if (!courseClass) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    let config = await prisma.courseGradeConfig.findUnique({
      where: { courseId: params.courseId },
    });

    // Create default config if not exists
    if (!config) {
      config = await prisma.courseGradeConfig.create({
        data: { courseId: params.courseId },
      });
    }

    res.json(config);
  });

  // Update grade config
  router.patch('/courses/:courseId/grade-config', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ courseId: z.string() }).parse(req.params);
    const body = z.object({
      quizWeight: z.number().int().min(0).max(100).optional(),
      midtermWeight: z.number().int().min(0).max(100).optional(),
      finalWeight: z.number().int().min(0).max(100).optional(),
      attendanceWeight: z.number().int().min(0).max(100).optional(),
    }).parse(req.body);

    // Verify teacher teaches this course
    const courseClass = await prisma.courseClass.findFirst({
      where: { courseId: params.courseId, teacherId: req.user!.id },
    });

    if (!courseClass) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    // Validate weights sum to 100
    const current = await prisma.courseGradeConfig.findUnique({
      where: { courseId: params.courseId },
    }) || { quizWeight: 25, midtermWeight: 25, finalWeight: 40, attendanceWeight: 10 };

    const newWeights = {
      quizWeight: body.quizWeight ?? current.quizWeight,
      midtermWeight: body.midtermWeight ?? current.midtermWeight,
      finalWeight: body.finalWeight ?? current.finalWeight,
      attendanceWeight: body.attendanceWeight ?? current.attendanceWeight,
    };

    const total = newWeights.quizWeight + newWeights.midtermWeight + newWeights.finalWeight + newWeights.attendanceWeight;
    if (total !== 100) {
      res.status(400).json({ error: 'invalid_weights', message: `Weights must sum to 100, got ${total}` });
      return;
    }

    const config = await prisma.courseGradeConfig.upsert({
      where: { courseId: params.courseId },
      update: newWeights,
      create: { courseId: params.courseId, ...newWeights },
    });

    res.json(config);
  });

  // Get attendance for a course (all students)
  router.get('/courses/:courseId/attendance', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ courseId: z.string() }).parse(req.params);

    // Verify teacher teaches this course
    const courseClass = await prisma.courseClass.findFirst({
      where: { courseId: params.courseId, teacherId: req.user!.id },
    });

    if (!courseClass) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    const attendance = await prisma.attendance.findMany({
      where: { courseId: params.courseId },
      include: { student: { select: { id: true, fullName: true, email: true } } },
    });

    res.json(attendance);
  });

  // Set attendance for a student
  router.put('/courses/:courseId/attendance/:studentId', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ courseId: z.string(), studentId: z.string() }).parse(req.params);
    const body = z.object({
      score: z.number().int().min(0).max(100),
      feedback: z.string().optional(),
    }).parse(req.body);

    // Verify teacher teaches this course
    const courseClass = await prisma.courseClass.findFirst({
      where: { courseId: params.courseId, teacherId: req.user!.id },
    });

    if (!courseClass) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        courseId_studentId: {
          courseId: params.courseId,
          studentId: params.studentId,
        },
      },
      update: { score: body.score, feedback: body.feedback },
      create: {
        courseId: params.courseId,
        studentId: params.studentId,
        score: body.score,
        feedback: body.feedback,
      },
      include: { student: { select: { id: true, fullName: true, email: true } } },
    });

    res.json(attendance);
  });

  // Get complete gradebook for a course (teacher view)
  router.get('/courses/:courseId/gradebook', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ courseId: z.string() }).parse(req.params);

    // Verify teacher teaches this course
    const courseClass = await prisma.courseClass.findFirst({
      where: { courseId: params.courseId, teacherId: req.user!.id },
    });

    if (!courseClass) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    // Get grade config
    const config = await prisma.courseGradeConfig.findUnique({
      where: { courseId: params.courseId },
    }) || { quizWeight: 25, midtermWeight: 25, finalWeight: 40, attendanceWeight: 10 };

    // Get students enrolled in this course
    const courseClasses = await prisma.courseClass.findMany({
      where: { courseId: params.courseId, teacherId: req.user!.id },
      include: {
        class: {
          include: {
            students: {
              include: { student: { select: { id: true, fullName: true, email: true } } },
            },
          },
        },
      },
    });

    // Flatten students from all classes
    type CourseClassWithStudents = {
      classId: string;
      class: {
        id: string;
        name: string;
        students: { student: { id: string; fullName: string; email: string } }[];
      };
    };
    
    const typedCourseClasses = courseClasses as CourseClassWithStudents[];
    
    const students = typedCourseClasses.flatMap(cc =>
      cc.class.students.map(s => ({
        ...s.student,
        classId: cc.classId,
        className: cc.class.name,
      }))
    );

    // Remove duplicates
    type StudentWithClass = { id: string; fullName: string; email: string; classId: string; className: string };
    const uniqueStudents = students.reduce<StudentWithClass[]>((acc, student) => {
      if (!acc.find(s => s.id === student.id)) {
        acc.push(student);
      }
      return acc;
    }, []);

    // Get all assessments for this course
    const assessments = await prisma.assessment.findMany({
      where: { courseId: params.courseId },
      include: {
        questions: true,
        attempts: {
          where: { status: 'GRADED' },
          include: { student: { select: { id: true } } },
        },
      },
    });

    // Define types for the assessment data
    type AttemptType = { studentId: string; status: string; score: number | null };
    type AssessmentType = {
      id: string;
      title: string;
      examType: string;
      maxScore: number | null;
      questions: unknown[];
      attempts: AttemptType[];
    };
    const typedAssessments = assessments as AssessmentType[];

    // Get attendance
    const attendance = await prisma.attendance.findMany({
      where: { courseId: params.courseId },
    });
    type AttendanceType = { studentId: string; score: number };
    const typedAttendance = attendance as AttendanceType[];

    // Calculate grades for each student
    const gradebook = uniqueStudents.map(student => {
      const studentAttempts = typedAssessments.flatMap(a =>
        a.attempts.filter(attempt => attempt.studentId === student.id)
      );

      // Quiz average (average of all QUIZ assessments)
      const quizzes = typedAssessments.filter(a => a.examType === 'QUIZ');
      let quizScore = 0;
      let quizCount = 0;
      for (const quiz of quizzes) {
        const attempt = quiz.attempts.find(at => at.studentId === student.id && at.status === 'GRADED');
        if (attempt && attempt.score !== null && quiz.maxScore) {
          quizScore += (attempt.score / quiz.maxScore) * 100;
          quizCount++;
        }
      }
      const quizAverage = quizCount > 0 ? quizScore / quizCount : 0;

      // Midterm score
      const midterm = typedAssessments.find(a => a.examType === 'MIDTERM');
      let midtermScore = 0;
      if (midterm) {
        const attempt = midterm.attempts.find(at => at.studentId === student.id && at.status === 'GRADED');
        if (attempt && attempt.score !== null && midterm.maxScore) {
          midtermScore = (attempt.score / midterm.maxScore) * 100;
        }
      }

      // Final score
      const final = typedAssessments.find(a => a.examType === 'FINAL');
      let finalScore = 0;
      if (final) {
        const attempt = final.attempts.find(at => at.studentId === student.id && at.status === 'GRADED');
        if (attempt && attempt.score !== null && final.maxScore) {
          finalScore = (attempt.score / final.maxScore) * 100;
        }
      }

      // Attendance score
      const studentAttendance = typedAttendance.find(a => a.studentId === student.id);
      const attendanceScore = studentAttendance?.score || 0;

      // Calculate total grade
      const totalGrade =
        (quizAverage * config.quizWeight / 100) +
        (midtermScore * config.midtermWeight / 100) +
        (finalScore * config.finalWeight / 100) +
        (attendanceScore * config.attendanceWeight / 100);

      return {
        student,
        quizAverage: Math.round(quizAverage * 10) / 10,
        midtermScore: Math.round(midtermScore * 10) / 10,
        finalScore: Math.round(finalScore * 10) / 10,
        attendanceScore,
        totalGrade: Math.round(totalGrade * 10) / 10,
      };
    });

    res.json({
      config,
      gradebook,
      assessments: typedAssessments.map(a => ({
        id: a.id,
        title: a.title,
        examType: a.examType,
        maxScore: a.maxScore,
        questionCount: a.questions.length,
      })),
    });
  });

  // Get student's own grades for a course
  router.get('/courses/:courseId/my-grades', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ courseId: z.string() }).parse(req.params);

    // Get grade config
    const config = await prisma.courseGradeConfig.findUnique({
      where: { courseId: params.courseId },
    }) || { quizWeight: 25, midtermWeight: 25, finalWeight: 40, attendanceWeight: 10 };

    // Get all assessments for this course
    const assessments = await prisma.assessment.findMany({
      where: { courseId: params.courseId },
      include: {
        questions: true,
        attempts: {
          where: { studentId: req.user!.id },
        },
      },
    });

    // Define types for the assessment data
    type StudentAttemptType = { studentId: string; status: string; score: number | null };
    type StudentAssessmentType = {
      id: string;
      title: string;
      examType: string;
      maxScore: number | null;
      questions: unknown[];
      attempts: StudentAttemptType[];
    };
    const typedAssessments = assessments as StudentAssessmentType[];

    // Get attendance
    const attendance = await prisma.attendance.findUnique({
      where: {
        courseId_studentId: {
          courseId: params.courseId,
          studentId: req.user!.id,
        },
      },
    });

    // Quiz average
    const quizzes = typedAssessments.filter(a => a.examType === 'QUIZ');
    let quizScore = 0;
    let quizCount = 0;
    const quizDetails: { title: string; score: number; maxScore: number; percent: number }[] = [];
    for (const quiz of quizzes) {
      const attempt = quiz.attempts.find(at => at.studentId === req.user!.id && at.status === 'GRADED');
      if (attempt && attempt.score !== null && quiz.maxScore) {
        const percent = (attempt.score / quiz.maxScore) * 100;
        quizScore += percent;
        quizCount++;
        quizDetails.push({
          title: quiz.title,
          score: attempt.score,
          maxScore: quiz.maxScore,
          percent: Math.round(percent * 10) / 10,
        });
      }
    }
    const quizAverage = quizCount > 0 ? quizScore / quizCount : 0;

    // Midterm score
    const midterm = typedAssessments.find(a => a.examType === 'MIDTERM');
    let midtermScore = 0;
    let midtermDetail: { title: string; score: number; maxScore: number; percent: number } | null = null;
    if (midterm) {
      const attempt = midterm.attempts.find(at => at.studentId === req.user!.id && at.status === 'GRADED');
      if (attempt && attempt.score !== null && midterm.maxScore) {
        midtermScore = (attempt.score / midterm.maxScore) * 100;
        midtermDetail = {
          title: midterm.title,
          score: attempt.score,
          maxScore: midterm.maxScore,
          percent: Math.round(midtermScore * 10) / 10,
        };
      }
    }

    // Final score
    const final = typedAssessments.find(a => a.examType === 'FINAL');
    let finalScore = 0;
    let finalDetail: { title: string; score: number; maxScore: number; percent: number } | null = null;
    if (final) {
      const attempt = final.attempts.find(at => at.studentId === req.user!.id && at.status === 'GRADED');
      if (attempt && attempt.score !== null && final.maxScore) {
        finalScore = (attempt.score / final.maxScore) * 100;
        finalDetail = {
          title: final.title,
          score: attempt.score,
          maxScore: final.maxScore,
          percent: Math.round(finalScore * 10) / 10,
        };
      }
    }

    // Attendance score
    const attendanceScore = attendance?.score || 0;

    // Calculate total grade
    const totalGrade =
      (quizAverage * config.quizWeight / 100) +
      (midtermScore * config.midtermWeight / 100) +
      (finalScore * config.finalWeight / 100) +
      (attendanceScore * config.attendanceWeight / 100);

    res.json({
      config,
      quizAverage: Math.round(quizAverage * 10) / 10,
      quizDetails,
      midtermScore: Math.round(midtermScore * 10) / 10,
      midtermDetail,
      finalScore: Math.round(finalScore * 10) / 10,
      finalDetail,
      attendanceScore,
      totalGrade: Math.round(totalGrade * 10) / 10,
    });
  });
}
