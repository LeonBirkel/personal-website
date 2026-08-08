import { getSiteConfig } from "@/config/site-config";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 300;

/** RFC 9116 wants an expiry under a year. Regenerating keeps it from going stale. */
const EXPIRY_DAYS = 365;

function expiresAt(): string {
  const midnightToday = new Date();
  midnightToday.setUTCHours(0, 0, 0, 0);
  return new Date(midnightToday.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Security contact for researchers, at the well-known path scanners already
 * probe. Everything comes from the instance config. The default Contact is the
 * site's own contact form rather than an address, so the file cannot become a
 * new harvesting surface for the address the rest of the site deliberately
 * hides.
 */
export async function GET() {
  const security = getSiteConfig().security;
  const contacts = security?.contact ?? [absoluteUrl("/contact")];
  const languages = security?.preferredLanguages ?? ["en"];

  const eggComment = getSiteConfig().easterEggs?.securityTxtComment;
  const lines = [
    ...contacts.map((contact) => `Contact: ${contact}`),
    `Expires: ${expiresAt()}`,
    `Preferred-Languages: ${languages.join(", ")}`,
    `Canonical: ${absoluteUrl("/.well-known/security.txt")}`,
    ...(security?.encryption ? [`Encryption: ${security.encryption}`] : []),
    ...(security?.policy ? [`Policy: ${security.policy}`] : []),
    ...(security?.acknowledgments ? [`Acknowledgments: ${security.acknowledgments}`] : []),
    // RFC 9116 allows comment lines. Scanners print them verbatim.
    ...(eggComment ? [`# ${eggComment}`] : []),
  ];

  return new Response(`${lines.join("\n")}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
