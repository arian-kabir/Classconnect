// src/proxy.ts

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protected routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/courses',
  '/assignments',
  '/materials',
  '/calendar',
  '/profile',
  '/settings',
];

// Public routes that are accessible without authentication
const publicRoutes = [
  '/auth/signin',
  '/auth/signout',
  '/auth/error',
  '/api/auth',
  '/',
  '/about',
  '/contact',
];

export default withAuth(
  function proxy(req: NextRequest) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Check if route is protected
    const isProtected = protectedRoutes.some(route => path.startsWith(route));
    
    // Check if user is authenticated
    const isAuthenticated = !!token;

    // If route is protected and user is not authenticated
    if (isProtected && !isAuthenticated) {
      const signInUrl = new URL('/auth/signin', req.url);
      signInUrl.searchParams.set('callbackUrl', path);
      return NextResponse.redirect(signInUrl);
    }

    // If route is auth and user is authenticated, redirect to dashboard
    if (path.startsWith('/auth') && isAuthenticated && path !== '/auth/signout') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Role-based access control
    if (isProtected && isAuthenticated) {
      const role = token.role as string;
      
      // Admin-only routes
      if (path.startsWith('/admin') && role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      // Lecturer-only routes
      if (path.startsWith('/lecturer') && !['LECTURER', 'ADMIN'].includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      // Tutor-only routes
      if (path.startsWith('/tutor') && !['STUDENT_TUTOR', 'ADMIN'].includes(role)) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/courses/:path*',
    '/assignments/:path*',
    '/materials/:path*',
    '/calendar/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/lecturer/:path*',
    '/tutor/:path*',
    '/api/auth/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};