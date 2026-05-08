import { NextRequest, NextResponse } from 'next/server';
import { PERSONA_COOKIE } from '@/lib/persona';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Initialize persona cookie to 'senior' on the first visit.
  if (!req.cookies.get(PERSONA_COOKIE)) {
    res.cookies.set(PERSONA_COOKIE, 'senior', { path: '/', sameSite: 'lax' });
  }

  // Allow ?persona= query param to switch personas (used by fake invite link
  // and the dev-only "switch view" toggle).
  const personaParam = req.nextUrl.searchParams.get('persona');
  if (personaParam === 'family' || personaParam === 'senior') {
    res.cookies.set(PERSONA_COOKIE, personaParam, { path: '/', sameSite: 'lax' });
  }

  return res;
}

export const config = {
  matcher: ['/', '/family/:path*', '/stories/:path*', '/memoir/:path*'],
};
