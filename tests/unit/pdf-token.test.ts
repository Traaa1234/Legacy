import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mintToken, consumeToken } from '@/lib/pdf/token';

beforeEach(() => {
  // Provide the secret the implementation reads from env
  process.env.PDF_GENERATOR_TOKEN = 'test-secret-key';
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('pdf token cache (HMAC stateless)', () => {
  it('mintToken returns a payload.signature pair', () => {
    const t = mintToken();
    expect(t).toMatch(/^\d+\.[0-9a-f]+$/);
  });

  it('mintToken returns different tokens at different times (monotonic expiry)', () => {
    const t1 = mintToken();
    vi.advanceTimersByTime(10);
    const t2 = mintToken();
    expect(t1).not.toBe(t2);
  });

  it('consumeToken returns true for a freshly-minted token', () => {
    const t = mintToken();
    expect(consumeToken(t)).toBe(true);
  });

  it('consumeToken returns false for a tampered token', () => {
    const t = mintToken();
    // Flip a hex character in the signature
    const dot = t.indexOf('.');
    const sig = t.slice(dot + 1);
    const tampered =
      t.slice(0, dot + 1) +
      (sig[0] === 'a' ? 'b' : 'a') +
      sig.slice(1);
    expect(consumeToken(tampered)).toBe(false);
  });

  it('consumeToken returns false for a malformed token', () => {
    expect(consumeToken('not-a-token')).toBe(false);
    expect(consumeToken('')).toBe(false);
    expect(consumeToken('123.abc')).toBe(false); // wrong signature
  });

  it('consumeToken returns false after the 60s TTL elapses', () => {
    const t = mintToken();
    vi.advanceTimersByTime(61_000);
    expect(consumeToken(t)).toBe(false);
  });
});
