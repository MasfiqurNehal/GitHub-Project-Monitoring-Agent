import crypto from 'crypto';

export function verifyGitHubWebhookSignature(payload: string | Buffer, signature: string | undefined, secret: string | undefined): boolean {
  if (!secret || !signature) {
    return true; // Pass if secret is not set in dev
  }

  try {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
  } catch (err) {
    return false;
  }
}
