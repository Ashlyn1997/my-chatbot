import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Define paths that are always public
  const publicPaths = ["/login", "/register", "/api/auth"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  
  // Define paths that require authentication
  const protectedPaths = ["/profile", "/admin"];
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));
  
  // Get the token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // Redirect logic for protected routes
  if (isProtectedPath && !token) {
    const url = new URL(`/login`, request.url);
    url.searchParams.set("callbackUrl", encodeURI(pathname));
    return NextResponse.redirect(url);
  }
  
  // Handle admin-only routes
  if (pathname.startsWith("/admin") && token?.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  
  // Redirect to home if already logged in and trying to access login/register pages
  if (token && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Add routes that should be checked by middleware
    "/login",
    "/register",
    "/profile/:path*",
    "/admin/:path*",
    // Don't add API routes for external APIs that don't need auth
    "/api/auth/:path*"
  ],
}; 