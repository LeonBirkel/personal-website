import type { Metadata } from "next";
import { getSiteConfig } from "@/config/site-config";
import { resolveOgImage } from "@/lib/portrait";

/**
 * Next's Metadata API replaces top-level fields wholesale (no deep merge), so
 * every page that sets `openGraph` or `alternates` must spread these shared
 * bases. Otherwise siteName, locale, og:image and the feed-autodiscovery links
 * silently disappear on that page.
 *
 * Built per call (inside generateMetadata) so the runtime config and a newly
 * uploaded image are picked up on every ISR regeneration.
 */
export function buildSharedOpenGraph(): NonNullable<Metadata["openGraph"]> {
  const { person } = getSiteConfig();
  const image = resolveOgImage();
  return {
    siteName: person.name,
    locale: "en_US",
    ...(image ? { images: [{ ...image, alt: `Portrait of ${person.name}` }] } : {}),
  };
}

export const feedAlternateTypes = {
  "application/rss+xml": "/news/feed.xml",
  "application/feed+json": "/news/feed.json",
} as const;

export function pageAlternates(canonical: string): NonNullable<Metadata["alternates"]> {
  return { canonical, types: feedAlternateTypes };
}
