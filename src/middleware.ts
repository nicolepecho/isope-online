import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = (await getToken({ req, secret: process.env.NEXTAUTH_SECRET })) as any;

  const pathname = req.nextUrl.pathname;

  // Allow public password reset APIs
  if (pathname.startsWith("/api/forgot-password") || pathname.startsWith("/api/reset-password")) {
    return NextResponse.next();
  }

  // Not logged in: only allow /login, /signup, /forgot-password, and /reset-password
  if (!token && pathname !== "/login" && pathname !== "/signup" && pathname !== "/forgot-password" && !pathname.startsWith("/reset-password")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // // Block /admin for non-osas users
  // if (req.nextUrl.pathname.startsWith("/admin") && token?.role !== "osas") {
  //   return NextResponse.redirect(new URL("/no-access", req.url));
  // }

  // Logged in users shouldn't see login or signup pages
  if (token && (pathname === "/login" || pathname === "/signup" || pathname === "/forgot-password")) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public|img|api/auth|ui).*)"],
};
// ...existing code...