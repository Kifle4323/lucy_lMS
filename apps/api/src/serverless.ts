// @ts-nocheck
import serverless from 'serverless-http';
import 'express-async-errors';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

import { registerAuthRoutes } from './routes/authRoutes';
import { registerCourseRoutes } from './routes/courseRoutes';
import { registerAssessmentRoutes } from './routes/assessmentRoutes';
import { registerClassRoutes } from './routes/classRoutes';
import { registerMaterialRoutes } from './routes/materialRoutes';
import { registerLiveSessionRoutes } from './routes/liveSessionRoutes';
import { registerGradebookRoutes } from './routes/gradebookRoutes';
import { registerFaceVerificationRoutes } from './routes/faceVerificationRoutes';
import { registerStudentProfileRoutes } from './routes/studentProfileRoutes';
import { registerNotificationRoutes } from './routes/notificationRoutes';
import { registerAcademicRoutes } from './routes/academicRoutes';

const app = express();

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : true;

app.use(cors({ origin: corsOrigins, credentials: true }));
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
registerAcademicRoutes(router);

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', router);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  const message = err instanceof Error ? err.message : 'internal_error';
  res.status(500).json({ error: 'internal_error', message });
});

export const handler = serverless(app);
export default handler;
