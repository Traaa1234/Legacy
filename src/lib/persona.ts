import { cookies } from 'next/headers';

export type Persona = 'senior' | 'family';

export const PERSONA_COOKIE = 'legacy_persona';

export function resolvePersonaFromCookie(value: string | undefined): Persona {
  return value === 'family' ? 'family' : 'senior';
}

export async function getPersona(): Promise<Persona> {
  const store = await cookies();
  const value = store.get(PERSONA_COOKIE)?.value;
  return resolvePersonaFromCookie(value);
}
