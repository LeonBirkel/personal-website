import type { MetadataRoute } from "next";
import { getSiteConfig } from "@/config/site-config";
import { absoluteUrl } from "@/lib/site";

/** Fixed path of the opt-in easter-egg trap page (see src/app/side-channel). */
export const TRAP_PATH = "/side-channel";

// Regenerated through ISR so the sitemap URL reflects the runtime SITE_URL.
export const revalidate = 300;

/**
 * All legitimate crawlers are welcome, including AI crawlers. Being
 * retrievable and citable by AI assistants is part of the visibility goal.
 * The explicit AI-bot rules document that intent; never add blocks here
 * (and keep Cloudflare's AI-bot blocking OFF, since it would silently override this).
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  // A crawler obeys only its most specific group, so the AI-bot groups must
  // repeat the disallow list or those bots would crawl /admin and /api too.
  // The trap path joins the shared array for the same reason, so every group
  // disallows it. It also carries a noindex, so it never costs crawl budget.
  const disallow = ["/admin", "/api/"];
  if (getSiteConfig().easterEggs?.trap) disallow.push(TRAP_PATH);
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow })),
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
