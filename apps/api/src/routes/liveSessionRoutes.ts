import type { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authRequired, requireRole, type AuthedRequest } from '../middleware.js';

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
}
