// @ts-nocheck
import type { Request, Response, Router } from 'express';
import { prisma } from '../db';
import { authRequired, requireRole, type AuthedRequest } from '../middleware';

export function registerNotificationRoutes(router: Router) {
  // Get notification counts for admin
  router.get('/admin/notifications', authRequired, requireRole(['ADMIN']), async (req: AuthedRequest, res: Response) => {
    // Count pending face verifications (not yet reviewed by admin)
    const pendingFaceVerifications = await prisma.faceVerification.count({
      where: { adminReviewed: false },
    });

    // Count pending student profiles
    const pendingStudentProfiles = await prisma.studentProfile.count({
      where: { status: 'PENDING_APPROVAL' },
    });

    // Count pending user approvals
    const pendingUsers = await prisma.user.count({
      where: { isApproved: false },
    });

    // Count pending add/drop requests
    const pendingAddDropRequests = await prisma.addDropRequest.count({
      where: { status: 'PENDING' },
    });

    res.json({
      faceVerifications: pendingFaceVerifications,
      studentProfiles: pendingStudentProfiles,
      pendingUsers: pendingUsers,
      pendingAddDropRequests: pendingAddDropRequests,
      total: pendingFaceVerifications + pendingStudentProfiles + pendingUsers + pendingAddDropRequests,
    });
  });

  // Mark face verifications as seen (when admin visits the page)
  router.post('/admin/notifications/seen/face-verifications', authRequired, requireRole(['ADMIN']), async (_req: AuthedRequest, res: Response) => {
    // We don't actually mark them as seen - the count just updates naturally
    // This endpoint exists for future extensibility (e.g., storing last seen timestamp)
    res.json({ success: true });
  });

  // Mark student profiles as seen
  router.post('/admin/notifications/seen/student-profiles', authRequired, requireRole(['ADMIN']), async (_req: AuthedRequest, res: Response) => {
    res.json({ success: true });
  });

  // Mark pending users as seen
  router.post('/admin/notifications/seen/pending-users', authRequired, requireRole(['ADMIN']), async (_req: AuthedRequest, res: Response) => {
    res.json({ success: true });
  });

  // ==================== STUDENT NOTIFICATIONS ====================

  // Get student notifications
  router.get('/notifications', authRequired, async (req: AuthedRequest, res: Response) => {
    const user = req.user!;

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    });

    res.json({ notifications, unreadCount });
  });

  // Mark notification as read
  router.patch('/notifications/:id/read', authRequired, async (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const { id } = req.params;

    const notification = await prisma.notification.update({
      where: { id, userId: user.id },
      data: { isRead: true },
    });

    res.json(notification);
  });

  // Mark all notifications as read
  router.post('/notifications/read-all', authRequired, async (req: AuthedRequest, res: Response) => {
    const user = req.user!;

    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true });
  });
}
