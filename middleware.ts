import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

// This function must be named "middleware" or exported as default
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // List of public routes that don't require authentication
  const publicRoutes = [
    '/login',
    '/api/payment-link',
    '/api/payments/razorpay',
    '/api/razorpay',
    '/public',
    '/payment-success'
  ];
  
  // Check if the current route is in the public routes list
  const isPublicRoute = publicRoutes.some(route => 
    req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(route + '/')
  );
  
  // If it's a public route, allow access without authentication
  if (isPublicRoute) {
    return res;
  }
  
  // For protected routes, check for admin session in cookies
  const sessionCookie = req.cookies.get('adminSession');
  
  // If there's no session cookie and it's not a public route, redirect to login
  if (!sessionCookie) {
    // Redirect to login page
    const url = new URL('/login', req.url);
    
    // Add a redirect param to go back to the original page after login
    url.searchParams.set('redirect', req.nextUrl.pathname);
    
    return NextResponse.redirect(url);
  }
  
  return res;
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    '/',
    '/login',
    '/api/:path*',
    '/services/:path*',
    '/invoices/:path*',
    '/transactions/:path*',
    '/public/:path*',
    '/payment-success',
    // Match all request paths except for the ones starting with:
    // - api (API routes)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 