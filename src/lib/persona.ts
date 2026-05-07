export type Persona = 'senior' | 'family';

export const PERSONA_COOKIE = 'legacy_persona';

export function resolvePersonaFromCookie(value: string | undefined): Persona {
  return value === 'family' ? 'family' : 'senior';
}
