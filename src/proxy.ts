import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rewrites for machine-readable twins (never gated by challenges) and the
 * cookie-presence gate for /admin. Real session validation happens
 * server-side in the admin layout and every admin action.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const isLogin = pathname === "/admin/login";
    const hasSessionCookie = getSessionCookie(request) !== null;
    // Never redirect login -> /admin on cookie presence alone: a stale cookie
    // with an invalid session would loop between the two routes forever.
    if (!isLogin && !hasSessionCookie) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  const indexNowKey = process.env.INDEXNOW_KEY;
  if (indexNowKey && pathname === `/${indexNowKey}.txt`) {
    return NextResponse.rewrite(new URL("/indexnow-key.txt", request.url));
  }

  if (pathname.startsWith("/publications/") && pathname.endsWith(".bib")) {
    const slug = pathname.slice("/publications/".length, -".bib".length);
    return NextResponse.rewrite(
      new URL(`/publications/${encodeURIComponent(slug)}/bib`, request.url),
    );
  }

  if (pathname.endsWith(".md")) {
    const clean = pathname.slice(0, -".md".length);
    const target = clean === "" || clean === "/index" ? "/md/index" : `/md${clean}`;
    return NextResponse.rewrite(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/|uploads/|icons/|favicon\\.ico).*)"],
};
