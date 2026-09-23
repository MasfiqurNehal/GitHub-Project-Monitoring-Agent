import crypto from 'crypto';

export function verifyGitHubWebhookSignature(payload: string | Buffer, signature: string | undefined, secret: string | undefined): boolean {
  if (!secret) {
    return true; // Pass if secret is not configured
  }

  if (!signature) {
    return false; // Fail if secret is configured but signature is missing
  }

  try {
    const hmac = crypto.createHmac('sha256', secret);
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
