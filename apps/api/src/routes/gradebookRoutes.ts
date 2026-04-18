// @ts-nocheck
import type { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authRequired, requireRole, type AuthedRequest } from '../middleware';

export function registerGradebookRoutes(router: Router) {
  // Get or create grade config for a course
  router.get('/courses/:courseId/grade-config', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ courseId: z.string() }).parse(req.params);

    // Verify teacher teaches this course through CourseSection or CourseClass
    const courseSection = await prisma.courseSection.findFirst({
      where: { courseId: params.courseId, teacherId: req.user!.id },
    });
    const courseClass = await prisma.courseClass.findFirst({
      where: { courseId: params.courseId, teacherId: req.user!.id },
    });

    if (!courseSection && !courseClass) {
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

    // Verify teacher teaches this course through CourseSection or CourseClass
    const courseSection = await prisma.courseSection.findFirst({
      where: { courseId: params.courseId, teacherId: req.user!.id },
    });
    const courseClass = await prisma.courseClass.findFirst({
      where: { courseId: params.courseId, teacherId: req.user!.id },
    });

    if (!courseSection && !courseClass) {
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

    // Verify teacher teaches this course through CourseSection or CourseClass
    const courseSection = await prisma.courseSection.findFirst({
      where: { courseId: params.courseId, teacherId: req.user!.id },
    });
    const courseClass = await prisma.courseClass.findFirst({
      where: { courseId: params.courseId, teacherId: req.user!.id },
    });

    if (!courseSection && !courseClass) {
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
      score: z.number().min(0).max(100),
      feedback: z.string().optional(),
    }).parse(req.body);

    // Verify teacher teaches this course through CourseSection or CourseClass
    const courseSection = await prisma.courseSection.findFirst({
      where: { courseId: params.courseId, teacherId: req.user!.id },
    });
    const courseClass = await prisma.courseClass.findFirst({
      where: { courseId: params.courseId, teacherId: req.user!.id },
    });

    if (!courseSection && !courseClass) {
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

    // Verify teacher teaches this course through CourseSection or CourseClass
    const courseSection = await prisma.courseSection.findFirst({
      where: { courseId: params.courseId, teacherId: req.user!.id },
    });
    const courseClass = await prisma.courseClass.findFirst({
      where: { courseId: params.courseId, teacherId: req.user!.id },
    });

    if (!courseSection && !courseClass) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    // Get grade config
    const config = await prisma.courseGradeConfig.findUnique({
      where: { courseId: params.courseId },
    }) || { quizWeight: 25, midtermWeight: 25, finalWeight: 40, attendanceWeight: 10 };

    // Get students enrolled in this teacher's course sections
    const sections = await prisma.courseSection.findMany({
      where: { courseId: params.courseId },
      include: {
        class: true,
        enrollments: {
          where: { status: 'ENROLLED' },
          include: { student: { select: { id: true, fullName: true, email: true } } },
        },
      },
    });

    // Also get students from course classes
    const courseClasses = await prisma.courseClass.findMany({
      where: { courseId: params.courseId },
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

    // Flatten students from all sections
    const sectionStudents = sections.flatMap(section =>
      section.enrollments.map(e => ({
        ...e.student,
        classId: section.classId,
        className: section.class?.name || 'No Class',
        sectionCode: section.sectionCode,
      }))
    );

    // Flatten students from course classes
    type CourseClassWithStudents = {
      classId: string;
      class: {
        id: string;
        name: string;
        students: { student: { id: string; fullName: string; email: string } }[];
      };
    };
    const classStudents = (courseClasses as CourseClassWithStudents[]).flatMap(cc =>
      cc.class.students.map(s => ({
        ...s.student,
        classId: cc.classId,
        className: cc.class.name,
        sectionCode: '',
      }))
    );

    // Merge and remove duplicates
    const allStudents = [...sectionStudents, ...classStudents];
    type StudentWithClass = { id: string; fullName: string; email: string; classId: string | null; className: string; sectionCode: string };
    const uniqueStudents = allStudents.reduce<StudentWithClass[]>((acc, student) => {
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

      // Attendance score (stored as weighted mark out of attendanceWeight)
      const studentAttendance = typedAttendance.find(a => a.studentId === student.id);
      const attendanceScore = studentAttendance?.score || 0;
      const attendanceMark = Math.round(attendanceScore * 10) / 10;

      // Calculate weighted marks (each component out of its weight)
      const quizMark = Math.round(quizAverage * config.quizWeight / 100 * 10) / 10;
      const midtermMark = Math.round(midtermScore * config.midtermWeight / 100 * 10) / 10;
      const finalMark = Math.round(finalScore * config.finalWeight / 100 * 10) / 10;

      // Total = sum of weighted marks (out of 100)
      const totalGrade = quizMark + midtermMark + finalMark + attendanceMark;

      return {
        student,
        quizAverage: Math.round(quizAverage * 10) / 10,
        midtermScore: Math.round(midtermScore * 10) / 10,
        finalScore: Math.round(finalScore * 10) / 10,
        attendanceScore,
        quizMark,
        midtermMark,
        finalMark,
        attendanceMark,
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

  // Get attendance stats (live + manual) for a course section
  router.get('/course-sections/:sectionId/live-attendance', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ sectionId: z.string() }).parse(req.params);
    const user = req.user!;

    try {
      // Verify teacher teaches this section
      const section = await prisma.courseSection.findFirst({
        where: { id: params.sectionId, teacherId: user.id },
        include: { course: true, class: true },
      });

      if (!section) {
        return res.status(403).json({ error: 'forbidden' });
      }

      // Get all live sessions for this course
      const liveSessions = await prisma.liveSession.findMany({
        where: { courseId: section.courseId, classId: section.classId },
        orderBy: { scheduledAt: 'asc' },
      });

      // Get all manual attendance sessions
      const manualSessions = await prisma.manualAttendanceSession.findMany({
        where: { courseId: section.courseId, classId: section.classId },
        include: { records: true },
        orderBy: { date: 'desc' },
      });

      const totalLiveSessions = liveSessions.length;
      const endedLiveSessions = liveSessions.filter(s => s.status === 'ENDED').length;
      const totalManualSessions = manualSessions.length;
      const totalSessions = totalLiveSessions + totalManualSessions;
      const endedSessions = endedLiveSessions + totalManualSessions;

      if (totalSessions === 0) {
        return res.json({
          totalSessions: 0,
          endedSessions: 0,
          liveSessions: 0,
          manualSessions: 0,
          students: [],
          manualAttendanceHistory: [],
        });
      }

      // Get all students in the class
      const classStudents = await prisma.classStudent.findMany({
        where: { classId: section.classId },
        include: { student: { select: { id: true, fullName: true, email: true } } },
      });

      // Get attendance records for all live sessions
      const sessionIds = liveSessions.map(s => s.id);
      const attendanceRecords = await prisma.liveSessionAttendance.findMany({
        where: { sessionId: { in: sessionIds } },
      });

      // Calculate per-student attendance stats (cumulative)
      const studentStats = classStudents.map(cs => {
        // Live session stats
        const studentRecords = attendanceRecords.filter(a => a.studentId === cs.studentId);
        const liveAttended = studentRecords.filter(a => a.status === 'ATTENDED').length;
        const livePartial = studentRecords.filter(a => a.status === 'PARTIAL').length;
        const liveAbsent = studentRecords.filter(a => a.status === 'ABSENT').length;

        // Manual session stats
        let manualPresent = 0;
        let manualLate = 0;
        let manualExcused = 0;
        let manualAbsent = 0;
        for (const ms of manualSessions) {
          const record = ms.records.find(r => r.studentId === cs.studentId);
          if (record) {
            if (record.status === 'PRESENT') manualPresent++;
            else if (record.status === 'LATE') manualLate++;
            else if (record.status === 'EXCUSED') manualExcused++;
            else manualAbsent++;
          } else {
            manualAbsent++;
          }
        }

        // Cumulative score
        let score = 0;
        if (endedSessions > 0) {
          const livePoints = (liveAttended * 100) + (livePartial * 50);
          const manualPoints = (manualPresent * 100) + (manualLate * 75) + (manualExcused * 50);
          const totalPoints = livePoints + manualPoints;
          score = Math.round(totalPoints / endedSessions);
        }

        return {
          student: cs.student,
          liveAttended,
          livePartial,
          liveAbsent,
          manualPresent,
          manualLate,
          manualExcused,
          manualAbsent,
          totalJoined: studentRecords.filter(a => a.status !== 'ABSENT').length + manualPresent + manualLate + manualExcused,
          score,
        };
      });

      res.json({
        totalSessions,
        endedSessions,
        liveSessions: totalLiveSessions,
        endedLiveSessions,
        manualSessions: totalManualSessions,
        students: studentStats,
        manualAttendanceHistory: manualSessions,
      });
    } catch (err) {
      console.error('Error fetching live attendance:', err);
      res.status(500).json({ error: 'Failed to fetch attendance stats' });
    }
  });

  // Sync attendance (live + manual) to grade attendance scores
  router.post('/course-sections/:sectionId/sync-attendance', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ sectionId: z.string() }).parse(req.params);
    const user = req.user!;

    try {
      // Verify teacher teaches this section
      const section = await prisma.courseSection.findFirst({
        where: { id: params.sectionId, teacherId: user.id },
        include: { course: { include: { gradeConfig: true } }, class: true },
      });

      if (!section) {
        return res.status(403).json({ error: 'forbidden' });
      }

      // Get all ended live sessions for this course
      const liveSessions = await prisma.liveSession.findMany({
        where: { courseId: section.courseId, classId: section.classId, status: 'ENDED' },
      });

      // Get all manual attendance sessions
      const manualSessions = await prisma.manualAttendanceSession.findMany({
        where: { courseId: section.courseId, classId: section.classId },
        include: { records: true },
      });

      const endedLiveSessions = liveSessions.length;
      const totalManualSessions = manualSessions.length;
      const totalSessions = endedLiveSessions + totalManualSessions;

      if (totalSessions === 0) {
        return res.status(400).json({ error: 'No attendance data to sync' });
      }

      // Get all students in the class
      const classStudents = await prisma.classStudent.findMany({
        where: { classId: section.classId },
      });

      // Get live attendance records
      const liveSessionIds = liveSessions.map(s => s.id);
      const liveAttendanceRecords = await prisma.liveSessionAttendance.findMany({
        where: { sessionId: { in: liveSessionIds } },
      });

      // Calculate and upsert attendance scores (cumulative: live + manual)
      const results = [];
      for (const cs of classStudents) {
        // Live session points
        const studentLiveRecords = liveAttendanceRecords.filter(a => a.studentId === cs.studentId);
        const liveAttended = studentLiveRecords.filter(a => a.status === 'ATTENDED').length;
        const livePartial = studentLiveRecords.filter(a => a.status === 'PARTIAL').length;
        const livePoints = (liveAttended * 100) + (livePartial * 50);

        // Manual session points
        let manualPoints = 0;
        for (const ms of manualSessions) {
          const record = ms.records.find(r => r.studentId === cs.studentId);
          if (record) {
            if (record.status === 'PRESENT') manualPoints += 100;
            else if (record.status === 'LATE') manualPoints += 75;
            else if (record.status === 'EXCUSED') manualPoints += 50;
            // ABSENT = 0
          }
        }

        const totalPoints = livePoints + manualPoints;
        const percentage = Math.round(totalPoints / totalSessions);
        // Convert percentage to weighted mark (out of attendanceWeight)
        const config = section.course.gradeConfig || { attendanceWeight: 10 };
        const score = Math.round(percentage * config.attendanceWeight / 100 * 10) / 10;

        const record = await prisma.attendance.upsert({
          where: {
            courseId_studentId: {
              courseId: section.courseId,
              studentId: cs.studentId,
            },
          },
          update: {
            score,
            feedback: `Auto-calculated from ${endedLiveSessions} live + ${totalManualSessions} in-person sessions (live: ${liveAttended} attended, ${livePartial} partial)`,
          },
          create: {
            courseId: section.courseId,
            studentId: cs.studentId,
            score,
            feedback: `Auto-calculated from ${endedLiveSessions} live + ${totalManualSessions} in-person sessions (live: ${liveAttended} attended, ${livePartial} partial)`,
          },
          include: {
            student: { select: { id: true, fullName: true, email: true } },
          },
        });

        results.push(record);
      }

      res.json({
        success: true,
        synced: results.length,
        attendance: results,
      });
    } catch (err) {
      console.error('Error syncing attendance:', err);
      res.status(500).json({ error: 'Failed to sync attendance' });
    }
  });

  // === Manual (Face-to-Face) Attendance ===

  // Create a manual attendance session
  router.post('/course-sections/:sectionId/manual-attendance', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ sectionId: z.string() }).parse(req.params);
    const body = z.object({
      title: z.string().optional(),
      date: z.string(),
      records: z.array(z.object({
        studentId: z.string(),
        status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
      })).optional(),
    }).parse(req.body);
    const user = req.user!;

    try {
      const section = await prisma.courseSection.findFirst({
        where: { id: params.sectionId, teacherId: user.id },
        include: { course: true, class: true },
      });

      if (!section) {
        return res.status(403).json({ error: 'forbidden' });
      }

      const date = new Date(body.date);

      // Create or find session for this date
      const session = await prisma.manualAttendanceSession.upsert({
        where: {
          courseId_classId_date: {
            courseId: section.courseId,
            classId: section.classId,
            date,
          },
        },
        update: {
          title: body.title || 'Face-to-Face Class',
          teacherId: user.id,
        },
        create: {
          courseId: section.courseId,
          classId: section.classId,
          teacherId: user.id,
          title: body.title || 'Face-to-Face Class',
          date,
        },
      });

      // If records provided, save them
      if (body.records && body.records.length > 0) {
        for (const record of body.records) {
          await prisma.manualAttendanceRecord.upsert({
            where: {
              sessionId_studentId: {
                sessionId: session.id,
                studentId: record.studentId,
              },
            },
            update: { status: record.status },
            create: {
              sessionId: session.id,
              studentId: record.studentId,
              status: record.status,
            },
          });
        }
      }

      // Return session with records
      const result = await prisma.manualAttendanceSession.findUnique({
        where: { id: session.id },
        include: {
          records: {
            include: {
              student: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
      });

      res.json(result);
    } catch (err) {
      console.error('Error creating manual attendance:', err);
      res.status(500).json({ error: 'Failed to create manual attendance' });
    }
  });

  // Get manual attendance sessions for a section
  router.get('/course-sections/:sectionId/manual-attendance', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ sectionId: z.string() }).parse(req.params);
    const user = req.user!;

    try {
      const section = await prisma.courseSection.findFirst({
        where: { id: params.sectionId, teacherId: user.id },
        include: { course: true, class: true },
      });

      if (!section) {
        return res.status(403).json({ error: 'forbidden' });
      }

      const sessions = await prisma.manualAttendanceSession.findMany({
        where: { courseId: section.courseId, classId: section.classId },
        include: {
          records: {
            include: {
              student: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
      });

      res.json(sessions);
    } catch (err) {
      console.error('Error fetching manual attendance:', err);
      res.status(500).json({ error: 'Failed to fetch manual attendance' });
    }
  });

  // Delete a manual attendance session
  router.delete('/manual-attendance/:sessionId', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ sessionId: z.string() }).parse(req.params);
    const user = req.user!;

    try {
      const session = await prisma.manualAttendanceSession.findUnique({
        where: { id: params.sessionId },
      });

      if (!session || session.teacherId !== user.id) {
        return res.status(403).json({ error: 'forbidden' });
      }

      await prisma.manualAttendanceSession.delete({
        where: { id: params.sessionId },
      });

      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting manual attendance:', err);
      res.status(500).json({ error: 'Failed to delete manual attendance' });
    }
  });
}
