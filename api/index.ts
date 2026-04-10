import serverless from 'serverless-http';
import 'express-async-errors';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

// Load environment variables
dotenv.config();

// Import routes with .js extension for ESM
import { registerAuthRoutes } from '../apps/api/src/routes/authRoutes.js';
import { registerCourseRoutes } from '../apps/api/src/routes/courseRoutes.js';
import { registerAssessmentRoutes } from '../apps/api/src/routes/assessmentRoutes.js';
import { registerClassRoutes } from '../apps/api/src/routes/classRoutes.js';
import { registerMaterialRoutes } from '../apps/api/src/routes/materialRoutes.js';
import { registerLiveSessionRoutes } from '../apps/api/src/routes/liveSessionRoutes.js';
import { registerGradebookRoutes } from '../apps/api/src/routes/gradebookRoutes.js';
import { registerFaceVerificationRoutes } from '../apps/api/src/routes/faceVerificationRoutes.js';
import { registerStudentProfileRoutes } from '../apps/api/src/routes/studentProfileRoutes.js';
import { registerNotificationRoutes } from '../apps/api/src/routes/notificationRoutes.js';

const app = express();

// Parse CORS origins from env (comma-separated)
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

app.get('/health', (_req: express.Request, res: express.Response) => {
  res.json({ ok: true });
});
app.use('/api', router);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error:', err);
  const message = err instanceof Error ? err.message : 'internal_error';
  res.status(500).json({ error: 'internal_error', message });
});

export default serverless(app);
