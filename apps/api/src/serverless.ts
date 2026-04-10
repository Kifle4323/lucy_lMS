import serverless from 'serverless-http';
import 'express-async-errors';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

import { registerAuthRoutes } from './routes/authRoutes.js';
import { registerCourseRoutes } from './routes/courseRoutes.js';
import { registerAssessmentRoutes } from './routes/assessmentRoutes.js';
import { registerClassRoutes } from './routes/classRoutes.js';
import { registerMaterialRoutes } from './routes/materialRoutes.js';
import { registerLiveSessionRoutes } from './routes/liveSessionRoutes.js';
import { registerGradebookRoutes } from './routes/gradebookRoutes.js';
import { registerFaceVerificationRoutes } from './routes/faceVerificationRoutes.js';
import { registerStudentProfileRoutes } from './routes/studentProfileRoutes.js';
import { registerNotificationRoutes } from './routes/notificationRoutes.js';

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

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', router);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  const message = err instanceof Error ? err.message : 'internal_error';
  res.status(500).json({ error: 'internal_error', message });
});

export const handler = serverless(app);
export default handler;
