// @ts-nocheck
import type { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authRequired, requireRole, type AuthedRequest } from '../middleware';

export function registerMaterialRoutes(router: Router) {
  // Get materials for a course
  router.get('/courses/:courseId/materials', authRequired, async (req: AuthedRequest, res: Response) => {
    const params = z.object({ courseId: z.string() }).parse(req.params);
    const user = req.user!;

    // Check if user has access to this course
    if (user.role === 'ADMIN') {
      const materials = await prisma.material.findMany({
        where: { courseId: params.courseId },
        include: { author: { select: { id: true, fullName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json(materials);
      return;
    }

    if (user.role === 'TEACHER') {
      // Teacher must be assigned to teach this course in some class
      const courseClass = await prisma.courseClass.findFirst({
        where: { courseId: params.courseId, teacherId: user.id },
      });
      if (!courseClass) {
        res.status(403).json({ error: 'forbidden' });
        return;
      }
      const materials = await prisma.material.findMany({
        where: { courseId: params.courseId },
        include: { author: { select: { id: true, fullName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json(materials);
      return;
    }

    // Student must be in a class that has this course
    const courseClass = await prisma.courseClass.findFirst({
      where: {
        courseId: params.courseId,
        class: { students: { some: { studentId: user.id } } },
      },
    });
    if (!courseClass) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }
    const materials = await prisma.material.findMany({
      where: { courseId: params.courseId },
      include: { author: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(materials);
  });

  // Create material (Teacher only)
  router.post('/courses/:courseId/materials', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ courseId: z.string() }).parse(req.params);
    const body = z.object({
      title: z.string().min(2),
      content: z.string().optional(),
      fileUrl: z.string().optional(),
      fileType: z.string().optional(),
    }).parse(req.body);
    const user = req.user!;

    // Verify teacher is assigned to teach this course
    const courseClass = await prisma.courseClass.findFirst({
      where: { courseId: params.courseId, teacherId: user.id },
    });
    if (!courseClass) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    const material = await prisma.material.create({
      data: {
        courseId: params.courseId,
        title: body.title,
        content: body.content,
        fileUrl: body.fileUrl,
        fileType: body.fileType,
        createdBy: user.id,
      },
      include: { author: { select: { id: true, fullName: true, email: true } } },
    });
    res.json(material);
  });

  // Update material (Teacher only - only author can update)
  router.put('/materials/:materialId', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ materialId: z.string() }).parse(req.params);
    const body = z.object({
      title: z.string().min(2).optional(),
      content: z.string().optional(),
      fileUrl: z.string().optional(),
      fileType: z.string().optional(),
    }).parse(req.body);
    const user = req.user!;

    const material = await prisma.material.findUnique({ where: { id: params.materialId } });
    if (!material) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    if (material.createdBy !== user.id) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    const updated = await prisma.material.update({
      where: { id: params.materialId },
      data: body,
      include: { author: { select: { id: true, fullName: true, email: true } } },
    });
    res.json(updated);
  });

  // Delete material (Teacher only - only author can delete)
  router.delete('/materials/:materialId', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ materialId: z.string() }).parse(req.params);
    const user = req.user!;

    const material = await prisma.material.findUnique({ where: { id: params.materialId } });
    if (!material) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    if (material.createdBy !== user.id) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    await prisma.material.delete({ where: { id: params.materialId } });
    res.json({ success: true });
  });
}
