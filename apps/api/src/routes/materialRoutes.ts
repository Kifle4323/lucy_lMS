// @ts-nocheck
import type { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authRequired, requireRole, type AuthedRequest } from '../middleware';
import { convert as libreConvert } from 'libreoffice-convert';
import tmp from 'tmp';
import fs from 'fs';
import path from 'path';

const OFFICE_TYPES = ['ppt', 'doc', 'xls', 'pptx', 'docx', 'xlsx'];

async function convertToPdf(fileUrl: string, fileType: string): Promise<string | null> {
  if (!OFFICE_TYPES.includes(fileType)) return null;
  if (!fileUrl.startsWith('data:')) return null; // Only convert base64 uploads

  return new Promise((resolve) => {
    tmp.file({ postfix: `.${fileType}` }, (err, tmpPath, fd, cleanup) => {
      if (err) { console.error('tmp file error:', err); resolve(null); return; }

      try {
        const matches = fileUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) { cleanup(); resolve(null); return; }

        const buffer = Buffer.from(matches[2], 'base64');
        fs.writeFileSync(tmpPath, buffer);

        const outputDir = path.dirname(tmpPath);

        libreConvert(tmpPath, '.pdf', outputDir, (err: any) => {
          cleanup();
          if (err) {
            console.error('LibreOffice conversion error:', err.message || err);
            resolve(null);
            return;
          }
          try {
            const outputPath = tmpPath + '.pdf';
            const pdfBuffer = fs.readFileSync(outputPath);
            const pdfBase64 = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
            try { fs.unlinkSync(outputPath); } catch (_) {}
            resolve(pdfBase64);
          } catch (readErr) {
            console.error('Error reading converted PDF:', readErr);
            resolve(null);
          }
        });
      } catch (writeErr) {
        console.error('Error writing temp file:', writeErr);
        cleanup();
        resolve(null);
      }
    });
  });
}

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
      // Teacher must be assigned to teach this course via courseSection or courseClass
      const courseSection = await prisma.courseSection.findFirst({
        where: { courseId: params.courseId, teacherId: user.id },
      });
      const courseClass = await prisma.courseClass.findFirst({
        where: { courseId: params.courseId, teacherId: user.id },
      });
      if (!courseSection && !courseClass) {
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

    // Student must be enrolled in this course via courseSection or courseClass
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        studentId: user.id,
        status: 'ENROLLED',
        courseSection: { courseId: params.courseId },
      },
    });
    const courseClass = await prisma.courseClass.findFirst({
      where: {
        courseId: params.courseId,
        class: { students: { some: { studentId: user.id } } },
      },
    });
    if (!enrollment && !courseClass) {
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
      fileName: z.string().optional(),
    }).parse(req.body);
    const user = req.user!;

    // Verify teacher is assigned to teach this course
    const courseSection = await prisma.courseSection.findFirst({
      where: { courseId: params.courseId, teacherId: user.id },
    });
    const courseClass = await prisma.courseClass.findFirst({
      where: { courseId: params.courseId, teacherId: user.id },
    });
    if (!courseSection && !courseClass) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    // Convert office files to PDF for inline preview
    let previewFileUrl = null;
    if (body.fileUrl && body.fileType && OFFICE_TYPES.includes(body.fileType)) {
      try {
        previewFileUrl = await convertToPdf(body.fileUrl, body.fileType);
      } catch (err) {
        console.error('Conversion failed, material will be created without preview:', err);
      }
    }

    const material = await prisma.material.create({
      data: {
        courseId: params.courseId,
        title: body.title,
        content: body.content,
        fileUrl: body.fileUrl,
        fileType: body.fileType,
        fileName: body.fileName,
        previewFileUrl,
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
      fileName: z.string().optional(),
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

  // Serve material preview PDF (converted from PPT/DOC/XLS or original PDF)
  router.get('/materials/:materialId/preview', async (req: Request, res: Response) => {
    const params = z.object({ materialId: z.string() }).parse(req.params);

    try {
      const material = await prisma.material.findUnique({
        where: { id: params.materialId },
        select: { fileUrl: true, fileType: true, fileName: true, title: true, previewFileUrl: true },
      });

      if (!material || !material.fileUrl) {
        return res.status(404).json({ error: 'File not found' });
      }

      // For PDFs, serve directly
      if (material.fileType === 'pdf') {
        if (material.fileUrl.startsWith('data:')) {
          const matches = material.fileUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (!matches) return res.status(400).json({ error: 'Invalid data URL' });
          const buffer = Buffer.from(matches[2], 'base64');
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${material.fileName || material.title}.pdf"`);
          res.setHeader('Content-Length', buffer.length);
          res.setHeader('Access-Control-Allow-Origin', '*');
          return res.send(buffer);
        }
        return res.redirect(material.fileUrl);
      }

      // For office files, serve the converted preview PDF
      if (OFFICE_TYPES.includes(material.fileType)) {
        // Lazy conversion: if previewFileUrl is null, convert now
        if (!material.previewFileUrl && material.fileUrl.startsWith('data:')) {
          const pdfBase64 = await convertToPdf(material.fileUrl, material.fileType);
          if (pdfBase64) {
            await prisma.material.update({
              where: { id: params.materialId },
              data: { previewFileUrl: pdfBase64 },
            });
            material.previewFileUrl = pdfBase64;
          }
        }

        if (material.previewFileUrl && material.previewFileUrl.startsWith('data:')) {
          const matches = material.previewFileUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (!matches) return res.status(400).json({ error: 'Invalid preview data URL' });
          const buffer = Buffer.from(matches[2], 'base64');
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${material.fileName || material.title}.pdf"`);
          res.setHeader('Content-Length', buffer.length);
          res.setHeader('Access-Control-Allow-Origin', '*');
          return res.send(buffer);
        }

        // If conversion failed, serve original file for download
        if (material.fileUrl.startsWith('data:')) {
          const matches = material.fileUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (!matches) return res.status(400).json({ error: 'Invalid data URL' });
          const buffer = Buffer.from(matches[2], 'base64');
          const ext = material.fileType || 'bin';
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader('Content-Disposition', `attachment; filename="${material.fileName || material.title}.${ext}"`);
          res.setHeader('Content-Length', buffer.length);
          return res.send(buffer);
        }

        return res.redirect(material.fileUrl);
      }

      // For other types, serve the original file
      if (material.fileUrl.startsWith('data:')) {
        const matches = material.fileUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) return res.status(400).json({ error: 'Invalid data URL' });
        const buffer = Buffer.from(matches[2], 'base64');
        res.setHeader('Content-Type', matches[1]);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(buffer);
      }

      return res.redirect(material.fileUrl);
    } catch (err) {
      console.error('Error serving material preview:', err);
      res.status(500).json({ error: 'Failed to serve preview' });
    }
  });

  // Serve material file (original, for download)
  router.get('/materials/:materialId/file', async (req: Request, res: Response) => {
    const params = z.object({ materialId: z.string() }).parse(req.params);

    try {
      const material = await prisma.material.findUnique({
        where: { id: params.materialId },
        select: { fileUrl: true, fileType: true, fileName: true, title: true },
      });

      if (!material || !material.fileUrl) {
        return res.status(404).json({ error: 'File not found' });
      }

      // If it's a data URL (base64), decode and serve the raw file
      if (material.fileUrl.startsWith('data:')) {
        const matches = material.fileUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
          return res.status(400).json({ error: 'Invalid data URL' });
        }

        const mimeType = matches[1];
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');

        const fileName = material.fileName || `${material.title}.${material.fileType || 'bin'}`;

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(buffer);
      }

      // If it's a regular URL, redirect to it
      return res.redirect(material.fileUrl);
    } catch (err) {
      console.error('Error serving material file:', err);
      res.status(500).json({ error: 'Failed to serve file' });
    }
  });

  // Student: Record material view (open)
  router.post('/materials/:materialId/view', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ materialId: z.string() }).parse(req.params);
    const user = req.user!;

    try {
      const view = await prisma.materialView.create({
        data: {
          materialId: params.materialId,
          studentId: user.id,
          openedAt: new Date(),
        },
      });
      res.json({ viewId: view.id });
    } catch (err) {
      console.error('Error recording material view:', err);
      res.status(500).json({ error: 'Failed to record view' });
    }
  });

  // Student: Update material view (close with duration)
  router.patch('/material-views/:viewId/close', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ viewId: z.string() }).parse(req.params);
    const user = req.user!;

    try {
      const view = await prisma.materialView.findUnique({ where: { id: params.viewId } });
      if (!view || view.studentId !== user.id) {
        return res.status(403).json({ error: 'forbidden' });
      }

      const closedAt = new Date();
      const durationSec = Math.round((closedAt.getTime() - view.openedAt.getTime()) / 1000);

      await prisma.materialView.update({
        where: { id: params.viewId },
        data: { closedAt, durationSec },
      });
      res.json({ success: true });
    } catch (err) {
      console.error('Error closing material view:', err);
      res.status(500).json({ error: 'Failed to close view' });
    }
  });

  // Teacher: Get material view stats for a course
  router.get('/courses/:courseId/material-stats', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ courseId: z.string() }).parse(req.params);
    const user = req.user!;

    try {
      // Verify teacher teaches this course
      const courseSection = await prisma.courseSection.findFirst({
        where: { courseId: params.courseId, teacherId: user.id },
      });
      const courseClass = await prisma.courseClass.findFirst({
        where: { courseId: params.courseId, teacherId: user.id },
      });
      if (!courseSection && !courseClass) {
        return res.status(403).json({ error: 'forbidden' });
      }

      // Get all materials for this course
      const materials = await prisma.material.findMany({
        where: { courseId: params.courseId },
        include: {
          views: {
            include: {
              student: { select: { id: true, fullName: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get enrolled students count
      const courseClasses = await prisma.courseClass.findMany({
        where: { courseId: params.courseId },
        include: { class: { include: { students: true } } },
      });
      const studentIds = new Set<string>();
      courseClasses.forEach(cc => {
        cc.class.students.forEach(cs => studentIds.add(cs.studentId));
      });

      const stats = materials.map(m => {
        const uniqueViewers = new Set(m.views.map(v => v.studentId));
        const totalViews = m.views.length;
        const avgDuration = m.views.filter(v => v.durationSec).length > 0
          ? Math.round(m.views.filter(v => v.durationSec).reduce((sum, v) => sum + (v.durationSec || 0), 0) / m.views.filter(v => v.durationSec).length)
          : 0;

        return {
          materialId: m.id,
          title: m.title,
          fileType: m.fileType,
          totalViews,
          uniqueViewers: uniqueViewers.size,
          totalStudents: studentIds.size,
          avgDurationSec: avgDuration,
          viewers: m.views.map(v => ({
            student: v.student,
            openedAt: v.openedAt,
            closedAt: v.closedAt,
            durationSec: v.durationSec,
          })),
          notViewed: [...studentIds].filter(id => !uniqueViewers.has(id)),
        };
      });

      res.json(stats);
    } catch (err) {
      console.error('Error fetching material stats:', err);
      res.status(500).json({ error: 'Failed to fetch material stats' });
    }
  });
}
