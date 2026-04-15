// @ts-nocheck
import type { Request, Response, Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { authRequired, requireRole, type AuthedRequest } from '../middleware';

export function registerQuestionReportRoutes(router: Router) {
  // Student: Report a question
  router.post('/questions/:questionId/report', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ questionId: z.string() }).parse(req.params);
    const body = z.object({
      reason: z.string().min(10, 'Reason must be at least 10 characters'),
    }).parse(req.body);
    const user = req.user!;

    try {
      // Check if question exists
      const question = await prisma.question.findUnique({
        where: { id: params.questionId },
        include: { assessment: { include: { course: true } } },
      });

      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      // Check if student already reported this question
      const existingReport = await prisma.questionReport.findUnique({
        where: {
          questionId_studentId: {
            questionId: params.questionId,
            studentId: user.id,
          },
        },
      });

      if (existingReport) {
        return res.status(400).json({ error: 'You have already reported this question' });
      }

      const report = await prisma.questionReport.create({
        data: {
          questionId: params.questionId,
          studentId: user.id,
          reason: body.reason,
        },
        include: {
          question: {
            include: { assessment: { include: { course: true } } },
          },
        },
      });

      res.json(report);
    } catch (err) {
      console.error('Error reporting question:', err);
      res.status(500).json({ error: 'Failed to report question' });
    }
  });

  // Student: Get my reports
  router.get('/my/question-reports', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const user = req.user!;

    try {
      const reports = await prisma.questionReport.findMany({
        where: { studentId: user.id },
        include: {
          question: {
            include: {
              assessment: { include: { course: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(reports);
    } catch (err) {
      console.error('Error fetching reports:', err);
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
  });

  // Student: Cancel/delete a report
  router.delete('/my/question-reports/:reportId', authRequired, requireRole(['STUDENT']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ reportId: z.string() }).parse(req.params);
    const user = req.user!;

    try {
      const report = await prisma.questionReport.findFirst({
        where: { id: params.reportId, studentId: user.id, status: 'PENDING' },
      });

      if (!report) {
        return res.status(404).json({ error: 'Report not found or already processed' });
      }

      await prisma.questionReport.delete({
        where: { id: params.reportId },
      });

      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting report:', err);
      res.status(500).json({ error: 'Failed to delete report' });
    }
  });

  // Teacher: Get question reports for courses they teach
  router.get('/teacher/question-reports', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const query = z.object({
      status: z.enum(['PENDING', 'UNDER_REVIEW', 'RESOLVED_CORRECT', 'RESOLVED_INCORRECT', 'DISMISSED', 'ALL']).optional().default('ALL'),
    }).parse(req.query);
    const user = req.user!;

    try {
      // Get course sections the teacher teaches
      const courseSections = await prisma.courseSection.findMany({
        where: { teacherId: user.id },
        select: { id: true },
      });
      const courseSectionIds = courseSections.map(cs => cs.id);

      // Get assessments in those course sections
      const assessments = await prisma.assessment.findMany({
        where: { courseSectionId: { in: courseSectionIds } },
        select: { id: true },
      });
      const assessmentIds = assessments.map(a => a.id);

      // Get reports for questions in those assessments
      const reports = await prisma.questionReport.findMany({
        where: {
          question: { assessmentId: { in: assessmentIds } },
          ...(query.status === 'ALL' ? {} : { status: query.status }),
        },
        include: {
          question: {
            include: {
              assessment: { include: { course: true } },
            },
          },
          student: { select: { id: true, fullName: true, email: true } },
          reviewer: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(reports);
    } catch (err) {
      console.error('Error fetching reports:', err);
      res.status(500).json({ error: 'Failed to fetch reports' });
    }
  });

  // Teacher: Update report status
  router.patch('/teacher/question-reports/:reportId', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const params = z.object({ reportId: z.string() }).parse(req.params);
    const body = z.object({
      status: z.enum(['UNDER_REVIEW', 'RESOLVED_CORRECT', 'RESOLVED_INCORRECT', 'DISMISSED']),
      adminNotes: z.string().optional(),
    }).parse(req.body);
    const user = req.user!;

    try {
      // Verify the report is for a question in a course the teacher teaches
      const report = await prisma.questionReport.findUnique({
        where: { id: params.reportId },
        include: {
          question: {
            include: {
              assessment: {
                include: { courseSection: true },
              },
            },
          },
        },
      });

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      const courseSection = await prisma.courseSection.findFirst({
        where: {
          id: report.question.assessment.courseSectionId,
          teacherId: user.id,
        },
      });

      if (!courseSection) {
        return res.status(403).json({ error: 'You can only review reports for your own courses' });
      }

      const updatedReport = await prisma.questionReport.update({
        where: { id: params.reportId },
        data: {
          status: body.status,
          adminNotes: body.adminNotes,
          reviewedBy: user.id,
          reviewedAt: new Date(),
        },
        include: {
          question: {
            include: {
              assessment: { include: { course: true } },
            },
          },
          student: { select: { id: true, fullName: true, email: true } },
        },
      });

      // Notify student about the resolution
      let notificationTitle = '';
      let notificationMessage = '';

      if (body.status === 'RESOLVED_CORRECT') {
        notificationTitle = 'Question Report Accepted';
        notificationMessage = `Your report for question in "${updatedReport.question.assessment.title}" has been reviewed and accepted. The question has been flagged for correction.`;
      } else if (body.status === 'RESOLVED_INCORRECT') {
        notificationTitle = 'Question Report Reviewed';
        notificationMessage = `Your report for question in "${updatedReport.question.assessment.title}" has been reviewed. The question was found to be correct.`;
      } else if (body.status === 'DISMISSED') {
        notificationTitle = 'Question Report Dismissed';
        notificationMessage = `Your report for question in "${updatedReport.question.assessment.title}" has been dismissed.`;
      }

      if (notificationTitle) {
        await prisma.notification.create({
          data: {
            userId: updatedReport.studentId,
            type: 'QUESTION_REPORT_RESOLVED',
            title: notificationTitle,
            message: notificationMessage,
            data: { reportId: params.reportId },
          },
        });
      }

      res.json(updatedReport);
    } catch (err) {
      console.error('Error updating report:', err);
      res.status(500).json({ error: 'Failed to update report' });
    }
  });

  // Teacher: Get report counts for notifications
  router.get('/teacher/question-reports/count', authRequired, requireRole(['TEACHER']), async (req: AuthedRequest, res: Response) => {
    const user = req.user!;

    try {
      // Get course sections the teacher teaches
      const courseSections = await prisma.courseSection.findMany({
        where: { teacherId: user.id },
        select: { id: true },
      });
      const courseSectionIds = courseSections.map(cs => cs.id);

      // Get assessments in those course sections
      const assessments = await prisma.assessment.findMany({
        where: { courseSectionId: { in: courseSectionIds } },
        select: { id: true },
      });
      const assessmentIds = assessments.map(a => a.id);

      const pendingCount = await prisma.questionReport.count({
        where: {
          question: { assessmentId: { in: assessmentIds } },
          status: 'PENDING',
        },
      });

      res.json({ pendingCount });
    } catch (err) {
      console.error('Error fetching report count:', err);
      res.status(500).json({ error: 'Failed to fetch report count' });
    }
  });
}
