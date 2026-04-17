// @ts-nocheck
import type { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authRequired, requireRole, type AuthedRequest } from '../middleware';

// Generate a unique Jitsi meeting room name
function generateMeetingRoom(title: string): string {
  const randomId = Math.random().toString(36).substring(2, 8);
  const sanitized = title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20);
  return `edulms-${sanitized}-${randomId}`;
}

export function registerLiveSessionRoutes(router: Router) {
  // Get live sessions for a course
  router.get('/courses/:courseId/live-sessions', authRequired, async (req: AuthedRequest, res: Response) => {
    const params = z.object({ courseId: z.string() }).parse(req.params);
    const user = req.user!;

    // Check access
    if (user.role === 'ADMIN') {
      const sessions = await prisma.liveSession.findMany({
        where: { courseId: params.courseId },
        include: { teacher: { select: { id: true, fullName: true, email: true } }, class: true },
        orderBy: { scheduledAt: 'asc' },
      });
      res.json(sessions);
      return;
    }

    if (user.role === 'TEACHER') {
      // Teacher sees sessions they created for courses they teach
      const sessions = await prisma.liveSession.findMany({
        where: { courseId: params.courseId, teacherId: user.id },
        include: { teacher: { select: { id: true, fullName: true, email: true } }, class: true },
        orderBy: { scheduledAt: 'asc' },
      });
      res.json(sessions);
      return;
    }

    // Student sees sessions for classes they're enrolled in
    const sessions = await prisma.liveSession.findMany({
      where: {
        courseId: params.courseId,
        class: { students: { some: { studentId: user.id } } },
      },
      include: { teacher: { select: { id: true, fullName: true, email: true } }, class: true },
      orderBy: { scheduledAt: 'asc' },
    });
    res.json(sessions);
  });

  // Get live sessions for a class (for students/teachers)
  router.get('/classes/:classId/live-sessions', authRequired, async (req: AuthedRequest, res: Response) => {
    const params = z.object({ classId: z.string() }).parse(req.params);
    const user = req.user!;

    const sessions = await prisma.liveSession.findMany({
      where: { classId: params.classId },
      include: { 
        teacher: { select: { id: true, fullName: true, email: true } }, 
        course: true,
        class: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });
    res.json(sessions);
  });

  // Get all upcoming live sessions for current user - MUST be before /live-sessions/:sessionId
  router.get('/live-sessions/upcoming', authRequired, async (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    console.log('Fetching sessions for user:', user.id, 'role:', user.role);

    if (user.role === 'ADMIN') {
      const sessions = await prisma.liveSession.findMany({
        where: { status: { in: ['SCHEDULED', 'LIVE'] } },
        include: { teacher: { select: { id: true, fullName: true, email: true } }, course: true, class: true },
        orderBy: { scheduledAt: 'asc' },
        take: 50,
      });
      console.log('Found sessions (admin):', sessions.length);
      res.json(sessions);
      return;
    }

    if (user.role === 'TEACHER') {
      const sessions = await prisma.liveSession.findMany({
        where: { teacherId: user.id, status: { in: ['SCHEDULED', 'LIVE'] } },
        include: { teacher: { select: { id: true, fullName: true, email: true } }, course: true, class: true },
        orderBy: { scheduledAt: 'asc' },
        take: 50,
      });
      console.log('Found sessions (teacher):', sessions.length, 'for teacher:', user.id);
      res.json(sessions);
      return;
    }

    // Student - show all scheduled and live sessions for their classes
    const sessions = await prisma.liveSession.findMany({
      where: {
        class: { students: { some: { studentId: user.id } } },
        status: { in: ['SCHEDULED', 'LIVE'] },
      },
      include: { teacher: { select: { id: true, fullName: true, email: true } }, course: true, class: true },
      orderBy: { scheduledAt: 'asc' },
      take: 50,
    });
    console.log('Found sessions (student):', sessions.length);
    res.json(sessions);
  });

  // Get a single live session by ID
  router.get('/live-sessions/:sessionId', authRequired, async (req: AuthedRequest, res: Response) => {
    const params = z.object({ sessionId: z.string() }).parse(req.params);
    const user = req.user!;

    const session = await prisma.liveSession.findUnique({
      where: { id: params.sessionId },
      include: { 
        teacher: { select: { id: true, fullName: true, email: true } }, 
        course: true,
        class: true,
      },
    });

    if (!session) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    // Check access
    if (user.role === 'ADMIN') {
      res.json(session);
      return;
    }

    if (user.role === 'TEACHER') {
      if (session.teacherId === user.id) {
        res.json(session);
        return;
      }
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    // Student - must be in the class
    const enrollment = await prisma.classStudent.findUnique({
      where: { classId_studentId: { classId: session.classId, studentId: user.id } },
    });

    if (enrollment) {
      res.json(session);
      return;
    }

    res.status(403).json({ error: 'forbidden' });
  });

  // Create a live session (Teacher only)
  router.post('/courses/:courseId/live-sessions', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ courseId: z.string() }).parse(req.params);
    const body = z.object({
      classId: z.string(),
      title: z.string().min(2),
      description: z.string().optional(),
      scheduledAt: z.string(),
      duration: z.number().int().min(15).max(480),
    }).parse(req.body);
    const user = req.user!;

    // Verify teacher teaches this course in this class
    const courseClass = await prisma.courseClass.findFirst({
      where: { courseId: params.courseId, classId: body.classId, teacherId: user.id },
    });
    if (!courseClass) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    const meetingRoom = generateMeetingRoom(body.title);
    const meetingUrl = `https://meet.jit.si/${meetingRoom}`;

    const session = await prisma.liveSession.create({
      data: {
        courseId: params.courseId,
        classId: body.classId,
        teacherId: user.id,
        title: body.title,
        description: body.description,
        scheduledAt: new Date(body.scheduledAt),
        duration: body.duration,
        meetingUrl,
        status: 'SCHEDULED',
      },
      include: { 
        teacher: { select: { id: true, fullName: true, email: true } }, 
        course: true,
        class: true,
      },
    });
    res.json(session);
  });

  // Update live session status (Teacher only)
  router.patch('/live-sessions/:sessionId', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ sessionId: z.string() }).parse(req.params);
    const body = z.object({
      status: z.enum(['SCHEDULED', 'LIVE', 'ENDED']).optional(),
      title: z.string().min(2).optional(),
      description: z.string().optional(),
      scheduledAt: z.string().optional(),
      duration: z.number().int().min(15).max(480).optional(),
    }).parse(req.body);
    const user = req.user!;

    const session = await prisma.liveSession.findUnique({ where: { id: params.sessionId } });
    if (!session) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    if (session.teacherId !== user.id) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    const updated = await prisma.liveSession.update({
      where: { id: params.sessionId },
      data: {
        ...body,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      },
      include: { 
        teacher: { select: { id: true, fullName: true, email: true } }, 
        course: true,
        class: true,
      },
    });
    res.json(updated);
  });

  // Delete live session (Teacher only)
  router.delete('/live-sessions/:sessionId', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ sessionId: z.string() }).parse(req.params);
    const user = req.user!;

    const session = await prisma.liveSession.findUnique({ where: { id: params.sessionId } });
    if (!session) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    if (session.teacherId !== user.id) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    await prisma.liveSession.delete({ where: { id: params.sessionId } });
    res.json({ success: true });
  });

  // Student: Join a live session (record attendance)
  router.post('/live-sessions/:sessionId/join', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ sessionId: z.string() }).parse(req.params);
    const user = req.user!;

    try {
      const session = await prisma.liveSession.findUnique({
        where: { id: params.sessionId },
        include: { class: { include: { students: true } } },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Verify student is in this class
      const isEnrolled = session.class.students.some(s => s.studentId === user.id);
      if (!isEnrolled) {
        return res.status(403).json({ error: 'You are not enrolled in this class' });
      }

      // Upsert attendance record
      const attendance = await prisma.liveSessionAttendance.upsert({
        where: {
          sessionId_studentId: {
            sessionId: params.sessionId,
            studentId: user.id,
          },
        },
        update: {
          joinedAt: new Date(),
          status: 'JOINED',
        },
        create: {
          sessionId: params.sessionId,
          studentId: user.id,
          joinedAt: new Date(),
          status: 'JOINED',
        },
      });

      res.json(attendance);
    } catch (err) {
      console.error('Error joining session:', err);
      res.status(500).json({ error: 'Failed to join session' });
    }
  });

  // Student: Leave a live session (update attendance)
  router.post('/live-sessions/:sessionId/leave', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ sessionId: z.string() }).parse(req.params);
    const user = req.user!;

    try {
      const attendance = await prisma.liveSessionAttendance.findUnique({
        where: {
          sessionId_studentId: {
            sessionId: params.sessionId,
            studentId: user.id,
          },
        },
      });

      if (!attendance) {
        return res.status(404).json({ error: 'No attendance record found' });
      }

      const leftAt = new Date();
      const durationMs = leftAt.getTime() - attendance.joinedAt.getTime();
      const durationMin = Math.round(durationMs / 60000);

      const updated = await prisma.liveSessionAttendance.update({
        where: { id: attendance.id },
        data: {
          leftAt,
          duration: durationMin,
          status: 'LEFT',
        },
      });

      res.json(updated);
    } catch (err) {
      console.error('Error leaving session:', err);
      res.status(500).json({ error: 'Failed to leave session' });
    }
  });

  // Teacher: End session and finalize attendance
  router.post('/live-sessions/:sessionId/end', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ sessionId: z.string() }).parse(req.params);
    const user = req.user!;

    try {
      const session = await prisma.liveSession.findUnique({
        where: { id: params.sessionId },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      if (session.teacherId !== user.id) {
        return res.status(403).json({ error: 'Only the teacher can end this session' });
      }

      const endedAt = new Date();
      const sessionDurationMin = session.duration; // scheduled duration

      // Update all attendance records that are still JOINED (student didn't leave manually)
      const activeAttendances = await prisma.liveSessionAttendance.findMany({
        where: {
          sessionId: params.sessionId,
          status: { in: ['JOINED', 'LEFT'] },
        },
      });

      for (const att of activeAttendances) {
        const leftAt = att.leftAt || endedAt;
        const durationMin = Math.round((leftAt.getTime() - att.joinedAt.getTime()) / 60000);
        const attendanceRatio = sessionDurationMin > 0 ? durationMin / sessionDurationMin : 0;

        let status: string;
        if (attendanceRatio >= 0.8) {
          status = 'ATTENDED';
        } else if (attendanceRatio >= 0.5) {
          status = 'PARTIAL';
        } else {
          status = 'ABSENT';
        }

        await prisma.liveSessionAttendance.update({
          where: { id: att.id },
          data: {
            leftAt: att.leftAt || endedAt,
            duration: durationMin,
            status,
          },
        });
      }

      // Mark students who never joined as ABSENT
      const classStudents = await prisma.classStudent.findMany({
        where: { classId: session.classId },
      });

      for (const cs of classStudents) {
        const existing = await prisma.liveSessionAttendance.findUnique({
          where: {
            sessionId_studentId: {
              sessionId: params.sessionId,
              studentId: cs.studentId,
            },
          },
        });

        if (!existing) {
          await prisma.liveSessionAttendance.create({
            data: {
              sessionId: params.sessionId,
              studentId: cs.studentId,
              joinedAt: session.scheduledAt,
              leftAt: session.scheduledAt,
              duration: 0,
              status: 'ABSENT',
            },
          });
        }
      }

      // Update session status
      await prisma.liveSession.update({
        where: { id: params.sessionId },
        data: { status: 'ENDED' },
      });

      // Get final attendance summary
      const finalAttendance = await prisma.liveSessionAttendance.findMany({
        where: { sessionId: params.sessionId },
        include: {
          student: { select: { id: true, fullName: true, email: true } },
        },
      });

      res.json({
        success: true,
        attendance: finalAttendance,
        totalStudents: classStudents.length,
        attended: finalAttendance.filter(a => a.status === 'ATTENDED').length,
        partial: finalAttendance.filter(a => a.status === 'PARTIAL').length,
        absent: finalAttendance.filter(a => a.status === 'ABSENT').length,
      });
    } catch (err) {
      console.error('Error ending session:', err);
      res.status(500).json({ error: 'Failed to end session' });
    }
  });

  // Teacher: Get attendance for a live session
  router.get('/live-sessions/:sessionId/attendance', authRequired, async (req: AuthedRequest, res: Response) => {
    const params = z.object({ sessionId: z.string() }).parse(req.params);
    const user = req.user!;

    try {
      const session = await prisma.liveSession.findUnique({
        where: { id: params.sessionId },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Admin or the teacher who created the session can view
      if (user.role !== 'ADMIN' && session.teacherId !== user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const attendance = await prisma.liveSessionAttendance.findMany({
        where: { sessionId: params.sessionId },
        include: {
          student: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: { joinedAt: 'asc' },
      });

      // Get all class students for full picture
      const classStudents = await prisma.classStudent.findMany({
        where: { classId: session.classId },
        include: { student: { select: { id: true, fullName: true, email: true } } },
      });

      res.json({
        attendance,
        classStudents: classStudents.map(cs => cs.student),
        totalStudents: classStudents.length,
        attended: attendance.filter(a => a.status === 'ATTENDED').length,
        partial: attendance.filter(a => a.status === 'PARTIAL').length,
        absent: attendance.filter(a => a.status === 'ABSENT').length,
        joined: attendance.filter(a => a.status === 'JOINED').length,
      });
    } catch (err) {
      console.error('Error fetching attendance:', err);
      res.status(500).json({ error: 'Failed to fetch attendance' });
    }
  });
}
