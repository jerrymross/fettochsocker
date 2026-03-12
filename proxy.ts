import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { protectedPaths } from "@/lib/constants";
import { SESSION_COOKIE } from "@/lib/server/session";

function matchesProtectedPath(pathname: string) {
  return protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  return new TextEncoder().encode(secret);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!matchesProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(token, getSessionSecret());
    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/recipes/:path*", "/import/:path*", "/export/:path*", "/settings/:path*"],
};
