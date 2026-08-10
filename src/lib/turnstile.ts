import { getSiteConfig, getSiteUrl } from "@/config/site-config";
import { TURNSTILE_ACTION } from "@/lib/contact-fields";

/**
 * Cloudflare tokens stay valid for 300 seconds. Rejecting older ones costs a
 * visitor nothing and devalues a farm that solves challenges in bulk and feeds
 * them to a queue of submissions later.
 */
const MAX_TOKEN_AGE_MS = 5 * 60 * 1000;

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const SITEVERIFY_TIMEOUT_MS = 8_000;

type SiteVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
  hostname?: string;
  action?: string;
  challenge_ts?: string;
};

/**
 * Cloudflare's public test secrets (prefix 1x, 2x, 3x) answer for a fictional
 * hostname and never carry an action, so the strict checks cannot apply to
 * them. The compose production self-test boots on them on purpose. The
 * entrypoint already warns that a site running on test keys is unguarded.
 */
function isTestSecret(secret: string): boolean {
  return /^[123]x/.test(secret);
}

/**
 * The hostnames a token may legitimately have been solved on. Cloudflare
 * reports the page that issued it, and comparing it here is what stops a token
 * minted on a copy of this form hosted elsewhere from being replayed against
 * the real site.
 */
function allowedHostnames(): Set<string> {
  const hosts = new Set<string>();
  for (const origin of [getSiteConfig().site.canonicalOrigin, getSiteUrl()]) {
    try {
      const { hostname } = new URL(origin);
      hosts.add(hostname);
      hosts.add(hostname.startsWith("www.") ? hostname.slice(4) : `www.${hostname}`);
    } catch {
      // The schema validates canonicalOrigin at boot, so only a malformed
      // SITE_URL reaches this, and it simply contributes no hostname.
    }
  }
  return hosts;
}

/** Absent or unparseable timestamps are not held against the visitor. */
function isFresh(challengeTs: string | undefined): boolean {
  if (!challengeTs) return true;
  const solvedAt = Date.parse(challengeTs);
  if (Number.isNaN(solvedAt)) return true;
  return Date.now() - solvedAt <= MAX_TOKEN_AGE_MS;
}

/**
 * Server-side Cloudflare Turnstile verification. Guards only the contact-form
 * action. `success` alone is not enough: it says the token is genuine, not that
 * it was minted for this site and this form.
 */
export async function verifyTurnstileToken(token: string, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn("TURNSTILE_SECRET_KEY not set, skipping verification (dev only)");
    return process.env.NODE_ENV !== "production";
  }
  if (!token) {
    // The widget had not produced a token yet, or it was stripped in transit.
    console.warn("turnstile: no token submitted with the form");
    return false;
  }

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
    });
    const data = (await response.json()) as SiteVerifyResponse;

    if (!data.success) {
      // Cloudflare's codes name the cause precisely, for example
      // invalid-input-secret, hostname-mismatch, timeout-or-duplicate.
      console.warn(`turnstile: rejected [${(data["error-codes"] ?? []).join(", ")}]`);
      return false;
    }
    if (isTestSecret(secret)) return true;

    if (data.hostname && !allowedHostnames().has(data.hostname)) {
      console.warn(`turnstile: token was solved on ${data.hostname}, which is not this site`);
      return false;
    }
    if (data.action !== TURNSTILE_ACTION) {
      console.warn(`turnstile: token carries action "${data.action}", expected the contact form`);
      return false;
    }
    if (!isFresh(data.challenge_ts)) {
      console.warn(`turnstile: token was solved at ${data.challenge_ts}, too long ago`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Turnstile verification failed", error);
    return false;
  }
}
