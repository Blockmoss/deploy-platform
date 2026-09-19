import { Router } from 'express';
import { getStatus } from '../services/exampleService.js';

const router = Router();

router.get('/', (req, res) => {
  const status = getStatus();
  res.json({ status: 'ok', uptime: status.uptime, timestamp: new Date().toISOString() });
});

export default router;
