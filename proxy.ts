import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/**
 * Optimistic page-level auth for the admin pages only (dashboard, projects,
 * login). Published pages at site-url/<slug> stay public, and API routes
 * check the session themselves (so large uploads are not buffered here).
 */
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const authenticated = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    return authenticated ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  if (!authenticated) {
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/projects", "/projects/:path*", "/login"],
};
