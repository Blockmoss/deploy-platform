import { Router } from 'express';
import crypto from 'crypto';
import { log } from '../utils/logger.js';

const router = Router();

function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;

  // Compute HMAC SHA-256 digest of the raw body
  const hmac = crypto.createHmac('sha256', secret);
  // rawBody may be a Buffer
  hmac.update(rawBody);
  const digest = `sha256=${hmac.digest('hex')}`;

  try {
    const sigBuf = Buffer.from(String(signature), 'utf8');
    const digestBuf = Buffer.from(digest, 'utf8');
    if (sigBuf.length !== digestBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, digestBuf);
  } catch (err) {
    return false;
  }
}

router.post('/', (req, res) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  const signature = req.get('X-Hub-Signature-256') || req.get('x-hub-signature-256');

  if (!secret) {
    log('GITHUB_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook secret not configured');
  }

  const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  const valid = verifySignature(raw, signature, secret);
  if (!valid) {
    log('Invalid GitHub webhook signature');
    return res.status(401).send('Invalid signature');
  }

  // Parse payload (expecting GitHub push event)
  const event = req.get('X-GitHub-Event') || req.get('x-github-event');
  const payload = req.body || {};

  if (event !== 'push') {
    log('Ignored GitHub event:', event);
    return res.status(200).send('Event ignored');
  }

  const repoCloneUrl = payload?.repository?.clone_url || null;
  const ref = payload?.ref || '';
  const branch = ref.startsWith('refs/heads/') ? ref.replace('refs/heads/', '') : ref;
  const commitSha = payload?.after || payload?.head_commit?.id || null;

  // Log extracted info for now
  log('GitHub push received and verified:', { repoCloneUrl, branch, commitSha });

  return res.status(200).json({ ok: true });
});

export default router;
