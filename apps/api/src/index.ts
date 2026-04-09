import 'express-async-errors';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

import { registerAuthRoutes } from './routes/authRoutes.js';
import { registerCourseRoutes } from './routes/courseRoutes.js';
import { registerAssessmentRoutes } from './routes/assessmentRoutes.js';
import { registerClassRoutes } from './routes/classRoutes.js';
import { registerMaterialRoutes } from './routes/materialRoutes.js';
import { registerLiveSessionRoutes } from './routes/liveSessionRoutes.js';
import { registerGradebookRoutes } from './routes/gradebookRoutes.js';
import { registerFaceVerificationRoutes } from './routes/faceVerificationRoutes.js';
import { registerStudentProfileRoutes } from './routes/studentProfileRoutes.js';

dotenv.config();

const app = express();

// Parse CORS origins from env (comma-separated)
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : true;

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
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
