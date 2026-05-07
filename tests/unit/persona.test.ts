import { describe, it, expect } from 'vitest';
import { resolvePersonaFromCookie, PERSONA_COOKIE } from '@/lib/persona';

describe('persona', () => {
  it('defaults to senior when no cookie', () => {
    expect(resolvePersonaFromCookie(undefined)).toBe('senior');
  });

  it('reads explicit family value', () => {
    expect(resolvePersonaFromCookie('family')).toBe('family');
  });

  it('reads explicit senior value', () => {
    expect(resolvePersonaFromCookie('senior')).toBe('senior');
  });

  it('falls back to senior for invalid values', () => {
    expect(resolvePersonaFromCookie('admin')).toBe('senior');
    expect(resolvePersonaFromCookie('')).toBe('senior');
  });

  it('exposes the cookie name constant', () => {
    expect(PERSONA_COOKIE).toBe('legacy_persona');
  });
});
