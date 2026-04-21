import 'express-async-errors';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

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
import { registerAddDropRoutes } from './routes/addDropRoutes';
import { registerQuestionReportRoutes } from './routes/questionReportRoutes';
import { registerAnalyticsRoutes } from './routes/analyticsRoutes';
import { registerPaymentRoutes } from './routes/paymentRoutes';

dotenv.config();

const app = express();

// Parse CORS origins from env (comma-separated)
// If CORS_ORIGIN is "*" or not set, allow all origins
const corsOrigin = process.env.CORS_ORIGIN;
const corsOrigins = corsOrigin && corsOrigin !== '*'
  ? corsOrigin.split(',').map(o => o.trim())
  : true;

app.use(
  cors({
    origin: corsOrigins,
    credentials: corsOrigins === true ? false : true,
  }),
);
app.use(express.json({ limit: '50mb' })); // Increased for document uploads

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
registerAddDropRoutes(router);
registerQuestionReportRoutes(router);
registerAnalyticsRoutes(router);
registerPaymentRoutes(router);

app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ ok: true });
});

app.use('/api', router);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'internal_error';
  res.status(500).json({ error: 'internal_error', message });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, '0.0.0.0', () => {
  process.stdout.write(`API listening on http://localhost:${port} (network accessible)\n`);
});
