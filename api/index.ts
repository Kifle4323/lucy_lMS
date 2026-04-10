import type { VercelRequest, VercelResponse } from '@vercel/node';
import serverless from 'serverless-http';

// Create Express app inline for Vercel
import 'express-async-errors';
import cors from 'cors';
import express from 'express';

// Import routes
import { registerAuthRoutes } from '../apps/api/src/routes/authRoutes';
import { registerCourseRoutes } from '../apps/api/src/routes/courseRoutes';
import { registerAssessmentRoutes } from '../apps/api/src/routes/assessmentRoutes';
import { registerClassRoutes } from '../apps/api/src/routes/classRoutes';
import { registerMaterialRoutes } from '../apps/api/src/routes/materialRoutes';
import { registerLiveSessionRoutes } from '../apps/api/src/routes/liveSessionRoutes';
import { registerGradebookRoutes } from '../apps/api/src/routes/gradebookRoutes';
import { registerFaceVerificationRoutes } from '../apps/api/src/routes/faceVerificationRoutes';
import { registerStudentProfileRoutes } from '../apps/api/src/routes/studentProfileRoutes';
import { registerNotificationRoutes } from '../apps/api/src/routes/notificationRoutes';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));

const router = express.Router();
registerAuthRoutes(router);
registerCourseRoutes(router);
registerAssessmentRoutes(router);
registerClassRoutes(router);
registerMaterialRoutes(router);
registerLiveSessionRoutes(router);
registerGradebookRoutes(router);
registerFaceVerificationRoutes(router);
registerStudentProfileRoutes(router);
registerNotificationRoutes(router);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', router);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'internal_error';
  res.status(500).json({ error: 'internal_error', message });
});

export default serverless(app);
