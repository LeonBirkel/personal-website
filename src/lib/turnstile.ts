/** Server-side Cloudflare Turnstile verification. Guards only the contact-form action. */
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
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
    });
    const data = (await response.json()) as { success: boolean; "error-codes"?: string[] };
    if (!data.success) {
      // Cloudflare's codes name the cause precisely, for example
      // invalid-input-secret, hostname-mismatch, timeout-or-duplicate.
      console.warn(`turnstile: rejected [${(data["error-codes"] ?? []).join(", ")}]`);
    }
    return data.success;
  } catch (error) {
    console.error("Turnstile verification failed", error);
    return false;
  }
}
