import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

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
  const disallow = ["/admin", "/api/"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow })),
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
