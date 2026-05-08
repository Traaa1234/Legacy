import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mintToken, consumeToken } from '@/lib/pdf/token';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('pdf token cache', () => {
  it('mintToken returns a unique uuid each time', () => {
    const t1 = mintToken();
    const t2 = mintToken();
    expect(t1).not.toBe(t2);
    expect(t1).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('consumeToken returns true for a valid token, then false on re-use', () => {
    const t = mintToken();
    expect(consumeToken(t)).toBe(true);
    expect(consumeToken(t)).toBe(false);
  });

  it('consumeToken returns false for an unknown token', () => {
    expect(consumeToken('00000000-0000-4000-8000-000000000099')).toBe(false);
  });

  it('consumeToken returns false after the 60s TTL elapses', () => {
    const t = mintToken();
    vi.advanceTimersByTime(61_000);
    expect(consumeToken(t)).toBe(false);
  });
});
