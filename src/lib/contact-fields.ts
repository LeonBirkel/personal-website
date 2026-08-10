/**
 * Names shared by the contact form and the code that checks it. A "use server"
 * file may only export async functions, and the Turnstile module reaches for
 * the config loader, which client components must never pull in. Both
 * constants therefore live here, where either side can import them.
 */

/** The field a bot sees and a person never does. */
export const HONEYPOT_FIELD = "website";

/** Binds a Turnstile token to this one form. */
export const TURNSTILE_ACTION = "contact";
