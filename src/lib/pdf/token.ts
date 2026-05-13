import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '@/lib/env';

const TTL_MS = 60_000;

function sign(payload: string): string {
  return createHmac('sha256', env.pdfGeneratorToken())
    .update(payload)
    .digest('hex');
}

export function mintToken(): string {
  const expiresAt = Date.now() + TTL_MS;
  const payload = `${expiresAt}`;
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function consumeToken(token: string): boolean {
  const dot = token.indexOf('.');
  if (dot < 0) return false;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expiresAt = Number.parseInt(payload, 10);
  if (!Number.isFinite(expiresAt)) return false;
  if (expiresAt < Date.now()) return false;

  // Constant-time comparison to prevent timing attacks
  const expectedSig = sign(payload);
  if (signature.length !== expectedSig.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSig, 'hex'),
    );
  } catch {
    return false;
  }
}
