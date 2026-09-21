import express, { Router } from 'express';
import crypto from 'crypto';
import { log } from '../utils/logger.js';

const router = Router();

function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const digest = `sha256=${hmac.digest('hex')}`;

  const sigBuf = Buffer.from(String(signature), 'utf8');
  const digestBuf = Buffer.from(digest, 'utf8');
  if (sigBuf.length !== digestBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, digestBuf);
}

router.use(express.raw({ type: 'application/json', limit: '1mb' }));

router.post('/', (req, res) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const signature = req.get('X-Hub-Signature-256') || req.get('x-hub-signature-256');

  if (!secret) {
    log('GITHUB_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  if (!Buffer.isBuffer(req.body)) {
    return res.status(400).send('Invalid payload');
  }

  const valid = verifySignature(req.body, signature, secret);
  if (!valid) {
    log('Invalid GitHub webhook signature');
    return res.status(401).send('Invalid signature');
  }

  let payload;
  try {
    payload = JSON.parse(req.body.toString('utf8'));
  } catch (error) {
    log('Invalid GitHub webhook JSON payload');
    return res.status(400).send('Invalid JSON payload');
  }

  const event = req.get('X-GitHub-Event') || req.get('x-github-event');

  if (event !== 'push') {
    log('Ignored GitHub event:', event);
    return res.status(200).send('Event ignored');
  }

  const repoCloneUrl = payload.repository && payload.repository.clone_url ? payload.repository.clone_url : null;
  const ref = typeof payload.ref === 'string' ? payload.ref : '';
  const branch = ref.startsWith('refs/heads/') ? ref.replace('refs/heads/', '') : ref;
  const commitSha =
    (typeof payload.after === 'string' && payload.after) ||
    (payload.head_commit && typeof payload.head_commit.id === 'string' ? payload.head_commit.id : null);

  log('GitHub push received and verified:', { repoCloneUrl, branch, commitSha });

  return res.status(200).json({ ok: true });
});

export default router;
