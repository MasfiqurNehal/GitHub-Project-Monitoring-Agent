import { Request, Response } from 'express';
import { verifyGitHubWebhookSignature } from '../utils/githubSignature.js';
import { webhookRepository } from '../repositories/webhook.repository.js';
import { webhookProcessorService } from '../services/webhookProcessor.service.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

export async function handleGitHubWebhook(req: Request, res: Response) {
  const signature = req.headers['x-hub-signature-256'] as string;
  const eventName = req.headers['x-github-event'] as string;
  const deliveryId = (req.headers['x-github-delivery'] as string) || `del-${Date.now()}`;
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  const isValid = verifyGitHubWebhookSignature(JSON.stringify(req.body), signature, secret);
  if (!isValid) {
    logger.warn('WEBHOOK', `Rejected GitHub Webhook with invalid signature from IP ${req.ip}`);
    return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
  }

  const eventId = `wh-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const repoFullName = req.body?.repository?.full_name;

  logger.info('WEBHOOK', `Received GitHub Webhook event '${eventName}' [Delivery: ${deliveryId}] for ${repoFullName || 'unknown'}`);

  const saved = await webhookRepository.saveEvent(eventId, deliveryId, eventName || 'unknown', null, req.body);

  // Asynchronously process real-time event
  webhookProcessorService.processEvent(eventName, req.body)
    .then(async () => {
      if (saved) await webhookRepository.markProcessed(saved.id);
    })
    .catch(async (err) => {
      if (saved) await webhookRepository.markFailed(saved.id, err.message);
    });

  res.status(200).json({ success: true, received: true, deliveryId });
}
