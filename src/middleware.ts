import { NextRequest, NextResponse } from 'next/server';
import { PERSONA_COOKIE } from '@/lib/persona';

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Visiting /family flips the cookie to family.
  // Visiting / (or anything else) flips it to senior.
  const path = req.nextUrl.pathname;
  if (path.startsWith('/family')) {
    res.cookies.set(PERSONA_COOKIE, 'family', { path: '/', sameSite: 'lax' });
  } else if (path === '/' || path.startsWith('/stories') || path.startsWith('/memoir')) {
    res.cookies.set(PERSONA_COOKIE, 'senior', { path: '/', sameSite: 'lax' });
  }

  return res;
}

export const config = {
  matcher: ['/', '/family/:path*', '/stories/:path*', '/memoir/:path*'],
};
