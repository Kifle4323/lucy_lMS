import type { Request, Response, Router } from 'express';
import { authRequired, requireRole, type AuthedRequest } from '../middleware';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export function registerMLRoutes(router: Router) {

  // Train the ML model (Admin only)
  router.post('/ml/train', authRequired, async (req: AuthedRequest, res: Response) => {
    try {
      const mlRes = await fetch(`${ML_SERVICE_URL}/ml/train`, { method: 'POST' });
      if (!mlRes.ok) {
        const err = await mlRes.json().catch(() => ({ detail: 'ML service error' }));
        return res.status(mlRes.status).json(err);
      }
      const data = await mlRes.json();
      res.json(data);
    } catch (err: any) {
      console.error('ML train proxy error:', err.message);
      res.status(502).json({ error: 'ML service unavailable', detail: err.message });
    }
  });

  // Get analytics (Admin/Teacher)
  router.get('/ml/analytics', authRequired, async (req: AuthedRequest, res: Response) => {
    try {
      const mlRes = await fetch(`${ML_SERVICE_URL}/ml/analytics`);
      if (!mlRes.ok) {
        const err = await mlRes.json().catch(() => ({ detail: 'ML service error' }));
        return res.status(mlRes.status).json(err);
      }
      const data = await mlRes.json();
      res.json(data);
    } catch (err: any) {
      console.error('ML analytics proxy error:', err.message);
      res.status(502).json({ error: 'ML service unavailable', detail: err.message });
    }
  });

  // Get feature importance (Admin/Teacher)
  router.get('/ml/feature-importance', authRequired, requireRole(['ADMIN', 'TEACHER']), async (req: AuthedRequest, res: Response) => {
    try {
      const mlRes = await fetch(`${ML_SERVICE_URL}/ml/feature-importance`);
      if (!mlRes.ok) {
        const err = await mlRes.json().catch(() => ({ detail: 'ML service error' }));
        return res.status(mlRes.status).json(err);
      }
      const data = await mlRes.json();
      res.json(data);
    } catch (err: any) {
      console.error('ML feature-importance proxy error:', err.message);
      res.status(502).json({ error: 'ML service unavailable', detail: err.message });
    }
  });

  // Predict for a specific student (Admin/Teacher/Student-self)
  router.post('/ml/predict', authRequired, async (req: AuthedRequest, res: Response) => {
    try {
      const mlRes = await fetch(`${ML_SERVICE_URL}/ml/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      if (!mlRes.ok) {
        const err = await mlRes.json().catch(() => ({ detail: 'ML service error' }));
        return res.status(mlRes.status).json(err);
      }
      const data = await mlRes.json();
      res.json(data);
    } catch (err: any) {
      console.error('ML predict proxy error:', err.message);
      res.status(502).json({ error: 'ML service unavailable', detail: err.message });
    }
  });

  // Predict for a student by ID (Admin/Teacher, or Student for self)
  router.get('/ml/predict-student/:studentId', authRequired, async (req: AuthedRequest, res: Response) => {
    try {
      const { studentId } = req.params;
      // Students can only predict for themselves
      if (req.user?.role === 'STUDENT' && req.user.id !== studentId) {
        return res.status(403).json({ error: 'You can only view your own predictions' });
      }
      const mlRes = await fetch(`${ML_SERVICE_URL}/ml/predict-student/${studentId}`);
      if (!mlRes.ok) {
        const err = await mlRes.json().catch(() => ({ detail: 'ML service error' }));
        return res.status(mlRes.status).json(err);
      }
      const data = await mlRes.json();
      res.json(data);
    } catch (err: any) {
      console.error('ML predict-student proxy error:', err.message);
      res.status(502).json({ error: 'ML service unavailable', detail: err.message });
    }
  });
}
