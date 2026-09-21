import express from 'express';
import dotenv from 'dotenv';
import healthRouter from './routes/health.js';
import webhookRouter from './routes/webhook.js';
import { log } from './utils/logger.js';

// Load environment variables from .env
dotenv.config();

const app = express();

// Routes
app.use('/webhook/github', webhookRouter);
app.use(express.json());
app.use('/health', healthRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  log(`Server running on port ${port} (env: ${process.env.NODE_ENV || 'development'})`);
});

export default app;
