import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

  // Public routes that don't need auth
  const publicRoutes = ['/login', '/api/auth/login'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  // Student viewer routes are public
  const isViewerRoute = pathname.startsWith('/v/');
  
  // API routes for submissions are public (students submit without auth)
  const isSubmissionRoute = pathname.startsWith('/api/submissions');
  
  // Serve routes are public (serves HTML files)
  const isServeRoute = pathname.startsWith('/api/serve/');

  // Module info routes are public (used by viewer page)
  const isModuleInfoRoute = pathname.startsWith('/api/modules/info/');

  if (isPublicRoute || isViewerRoute || isSubmissionRoute || isServeRoute || isModuleInfoRoute) {
    return NextResponse.next();
  }

  // Protected routes
  if ((pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/api/')) && !token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/api/:path*',
    '/login',
    '/v/:path*',
  ],
};
