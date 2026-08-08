import { headers } from "next/headers";

/** Client IP behind Cloudflare (or a generic proxy). Used for contact-form spam prevention. */
export async function requestIp(): Promise<string | null> {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip")
  );
}
