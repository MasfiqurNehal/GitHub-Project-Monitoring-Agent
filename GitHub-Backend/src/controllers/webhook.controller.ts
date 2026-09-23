import { Request, Response } from 'express';
import { verifyGitHubWebhookSignature } from '../utils/githubSignature.js';
import { webhookRepository } from '../repositories/webhook.repository.js';
import { repositoryRepository } from '../repositories/repository.repository.js';
import { webhookProcessorService } from '../services/webhookProcessor.service.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

export async function handleGitHubWebhook(req: Request & { rawBody?: Buffer }, res: Response) {
  const signature = req.headers['x-hub-signature-256'] as string;
  const eventName = req.headers['x-github-event'] as string;
  const deliveryId = (req.headers['x-github-delivery'] as string) || `del-${Date.now()}`;
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  // 1. Verify HMAC SHA-256 Webhook Signature
  const rawPayload = req.rawBody || JSON.stringify(req.body);
  const isValid = verifyGitHubWebhookSignature(rawPayload, signature, secret);

  if (!isValid) {
    logger.warn('WEBHOOK', `Rejected GitHub Webhook with invalid X-Hub-Signature-256 header from IP ${req.ip}`);
    return res.status(401).json({
      success: false,
      error: 'Invalid webhook signature',
    });
  }

  // 2. Idempotency Check (Check if deliveryId already processed)
  const existingEvent = await webhookRepository.findByDeliveryId(deliveryId);
  if (existingEvent) {
    logger.info('WEBHOOK', `Duplicate webhook delivery '${deliveryId}' ignored [Event: ${eventName}]`);
    return res.status(200).json({
      success: true,
      duplicate: true,
      message: `Webhook delivery '${deliveryId}' already processed`,
    });
  }

  // 3. Resolve Monitored Repository Context
  const repoFullName = req.body?.repository?.full_name;
  let repositoryId: string | null = null;

  if (repoFullName) {
    const repo = await repositoryRepository.findByFullName(repoFullName);
    if (repo) {
      repositoryId = repo.id;
    }
  }

  const eventId = `wh-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

  logger.info('WEBHOOK', `Received GitHub Webhook event '${eventName}' [Delivery: ${deliveryId}] for ${repoFullName || 'global'}`);

  // 4. Store Delivery Details in Neon
  const saved = await webhookRepository.saveEvent(eventId, deliveryId, eventName || 'unknown', repositoryId, req.body);

  // 5. Return Quick 202 Accepted Response to GitHub
  res.status(202).json({
    success: true,
    received: true,
    deliveryId,
    eventId,
  });

  // 6. Asynchronous Background Event Processing
  webhookProcessorService.processEvent(eventName, req.body)
    .then(async () => {
      if (saved) await webhookRepository.markProcessed(saved.id);
    })
    .catch(async (err) => {
      logger.error('WEBHOOK', `Failed background processing for event '${eventName}' [Delivery: ${deliveryId}]: ${err.message}`, err);
      if (saved) await webhookRepository.markFailed(saved.id, err.message);
    });
}
