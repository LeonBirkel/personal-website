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

  const response = NextResponse.next();
  maybeStampNotFoundEgg(response, pathname);
  return response;
}

/** Real routes this middleware still hands to Next. Anything else 404s. */
const KNOWN_ROUTES = new Set([
  "/",
  "/publications",
  "/projects",
  "/news",
  "/contact",
  "/side-channel",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/llms.txt",
  "/llms-full.txt",
  "/favicon.ico",
  "/icon",
  "/apple-icon",
  "/news/feed.xml",
  "/news/feed.json",
  "/publications.json",
  "/.well-known/security.txt",
]);

/**
 * Third easter egg: a response header served only on paths that do not resolve,
 * so it rewards path fuzzing and never appears on the home page or any real
 * route. The name and value come from the config, forwarded by the entrypoint
 * as env because middleware cannot read the config file. Admin, IndexNow and
 * the twin rewrites return earlier, so this only sees pages and unknown paths.
 * A real publication slug lives under /publications/, which is excluded.
 */
function maybeStampNotFoundEgg(response: NextResponse, pathname: string): void {
  const name = process.env.EGG_NOT_FOUND_HEADER_NAME;
  const value = process.env.EGG_NOT_FOUND_HEADER_VALUE;
  if (!name || !value) return;
  if (KNOWN_ROUTES.has(pathname) || pathname.startsWith("/publications/")) return;
  // A joke must never break routing. A stray control character in the value
  // would throw from headers.set, so a bad config just drops the egg.
  try {
    response.headers.set(name, value);
  } catch {
    // ignore an invalid configured header
  }
}

export const config = {
  matcher: ["/((?!_next/|api/|uploads/|icons/|favicon\\.ico).*)"],
};
