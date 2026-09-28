import { createServer } from 'node:http';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import { env } from './env';
import { authRouter, requireUser } from './auth';
import { sourcesRouter } from './routes/sources';
import { jobsRouter } from './routes/jobs';
import { tasksRouter } from './routes/tasks';
import { auditRouter } from './routes/audit';
import { attachStream } from './stream';

const app = express();
app.use(cors({ origin: env.WEB_ORIGIN }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1', requireUser); // every route below needs a signed-in user

app.get('/api/v1/formats', (_req, res) => {
  res.json([
    { id: 'advisory', label: 'Advisory', description: 'Technical security advisory with mitigations' },
    { id: 'executive_summary', label: 'Executive Summary', description: 'Concise executive briefing' },
    { id: 'linkedin_post', label: 'LinkedIn Post', description: 'Professional social post' },
    { id: 'x_thread', label: 'X Thread', description: 'Multi-post thread' },
    { id: 'video_package', label: 'Video Package', description: 'Storyboard scenes with narration and timings' },
  ]);
});

app.use('/api/v1/sources', sourcesRouter);
app.use('/api/v1/jobs', jobsRouter);
app.use('/api/v1/tasks', tasksRouter);
app.use('/api/v1/audit', auditRouter);

const onError: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Invalid request', issues: err.issues });
    return;
  }
  const status = err.status ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message ?? 'Server error' });
};
app.use(onError);

const server = createServer(app);
attachStream(server);
server.listen(env.PORT, () => console.log(`API on http://localhost:${env.PORT}`));
