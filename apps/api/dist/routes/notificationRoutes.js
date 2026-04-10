import { prisma } from '../db.js';
import { authRequired, requireRole } from '../middleware.js';
export function registerNotificationRoutes(router) {
    // Get notification counts for admin
    router.get('/admin/notifications', authRequired, requireRole(['ADMIN']), async (req, res) => {
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
        res.json({
            faceVerifications: pendingFaceVerifications,
            studentProfiles: pendingStudentProfiles,
            pendingUsers: pendingUsers,
            total: pendingFaceVerifications + pendingStudentProfiles + pendingUsers,
        });
    });
    // Mark face verifications as seen (when admin visits the page)
    router.post('/admin/notifications/seen/face-verifications', authRequired, requireRole(['ADMIN']), async (_req, res) => {
        // We don't actually mark them as seen - the count just updates naturally
        // This endpoint exists for future extensibility (e.g., storing last seen timestamp)
        res.json({ success: true });
    });
    // Mark student profiles as seen
    router.post('/admin/notifications/seen/student-profiles', authRequired, requireRole(['ADMIN']), async (_req, res) => {
        res.json({ success: true });
    });
    // Mark pending users as seen
    router.post('/admin/notifications/seen/pending-users', authRequired, requireRole(['ADMIN']), async (_req, res) => {
        res.json({ success: true });
    });
}
