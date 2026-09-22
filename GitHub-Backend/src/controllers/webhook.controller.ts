import { Request, Response } from 'express';
import { verifyGitHubWebhookSignature } from '../utils/githubSignature.js';
import { webhookRepository } from '../repositories/webhook.repository.js';
import crypto from 'crypto';

export async function handleGitHubWebhook(req: Request, res: Response) {
  const signature = req.headers['x-hub-signature-256'] as string;
  const eventName = req.headers['x-github-event'] as string;
  const deliveryId = (req.headers['x-github-delivery'] as string) || `del-${Date.now()}`;
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  const isValid = verifyGitHubWebhookSignature(JSON.stringify(req.body), signature, secret);
  if (!isValid) {
    return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
  }

  const eventId = `wh-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const repoFullName = req.body?.repository?.full_name;

  console.log(`[Webhook Ingestion] Received event '${eventName}' for ${repoFullName || 'unknown'}`);

  await webhookRepository.saveEvent(eventId, deliveryId, eventName || 'unknown', null, req.body);

  res.status(200).json({ success: true, received: true, deliveryId });
}
