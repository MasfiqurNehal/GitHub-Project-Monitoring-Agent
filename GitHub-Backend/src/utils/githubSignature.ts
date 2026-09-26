import crypto from 'crypto';

export function verifyGitHubWebhookSignature(
  payload: string | Buffer,
  signature: string | undefined,
  secret: string | undefined
): boolean {
  if (!signature) {
    return false; // Never trust an unsigned webhook!
  }

  const effectiveSecret = secret || process.env.GITHUB_WEBHOOK_SECRET;
  if (!effectiveSecret) {
    return false; // Secret required to authenticate webhook
  }

  try {
    const hmac = crypto.createHmac('sha256', effectiveSecret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');

    const sigBuffer = Buffer.from(signature);
    const digestBuffer = Buffer.from(digest);

    if (sigBuffer.length !== digestBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, digestBuffer);
  } catch (err) {
    return false;
  }
}
