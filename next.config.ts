import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/** The only third-party origin the browser ever contacts: the Turnstile widget. */
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

/**
 * Content Security Policy.
 *
 * script-src carries 'unsafe-inline' on purpose. Next.js streams the RSC
 * payload through inline `self.__next_f.push(...)` blocks, and the only way to
 * allow those without 'unsafe-inline' is a per-request nonce. A nonce forces
 * every page to render dynamically, which would cost the site its prerendered
 * SSG/ISR output. Crawlability outranks a directive that buys little here: the
 * site has no user-generated HTML sink, so the policy earns its keep through
 * object-src, base-uri, form-action, and frame-ancestors instead.
 *
 * Dev mode needs 'unsafe-eval' and a websocket for React Fast Refresh, so those
 * two relaxations are gated on NODE_ENV and never ship to production.
 */
function contentSecurityPolicy(): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", TURNSTILE_ORIGIN],
    // Tailwind, next/font, and the runtime accent block are all inline styles.
    "style-src": ["'self'", "'unsafe-inline'"],
    // data: covers the generated favicon and manifest icons.
    "img-src": ["'self'", "data:"],
    // next/font self-hosts the IBM Plex families, so no external font origin.
    "font-src": ["'self'"],
    "connect-src": ["'self'", TURNSTILE_ORIGIN],
    // The Turnstile widget renders in an iframe.
    "frame-src": [TURNSTILE_ORIGIN],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    // Server actions post to this origin only.
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  if (!isProduction) {
    directives["script-src"].push("'unsafe-eval'");
    directives["connect-src"].push("ws:");
  }

  return Object.entries(directives)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  // X-Frame-Options is redundant next to frame-ancestors, kept for old browsers.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Browsers ignore HSTS over plain http, but sending it only in production
  // keeps a local http dev server out of the browser's HSTS cache entirely.
  // No `preload`: that commits the apex domain to the preload list, which is
  // slow to undo and is the instance owner's decision, not the framework's.
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  // Nothing gains from advertising the framework and its version to a scanner.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
