import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { siteConfigSchema, type SiteConfig } from "@/config/site-config-schema";

/**
 * Runtime loader for site.config.json, the single source of truth for the
 * person this instance presents. The file is read once per process and
 * validated with Zod; a config change applies on restart.
 *
 * Server-only by construction: the node:fs import fails any client-component
 * bundle, which is intentional. Instance data must never be compiled in.
 */

export function siteConfigPath(): string {
  return resolve(process.cwd(), process.env.SITE_CONFIG_PATH ?? "site.config.json");
}

let cached: SiteConfig | null = null;

export function getSiteConfig(): SiteConfig {
  if (cached) return cached;
  const path = siteConfigPath();

  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    throw new Error(
      `Site config not found at ${path}. Mount your site.config.json there or ` +
        `set SITE_CONFIG_PATH. A starting point lives at deploy/site.config.example.json.`,
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Site config at ${path} is not valid JSON: ${(error as Error).message}`);
  }

  const parsed = siteConfigSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Site config at ${path} is invalid:\n${z.prettifyError(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}

/** Runtime origin. Dev and CI override via SITE_URL; production defaults to the canonical origin. */
export function getSiteUrl(): string {
  return (
    process.env.SITE_URL ??
    (process.env.NODE_ENV === "production"
      ? getSiteConfig().site.canonicalOrigin
      : "http://localhost:3000")
  );
}

/** Stable entity IDs. Built on the canonical origin so they never vary across environments. */
export function getIds(): { personId: string; orgId: string; websiteId: string } {
  const { canonicalOrigin, orgIdFragment } = getSiteConfig().site;
  return {
    personId: `${canonicalOrigin}/#person`,
    orgId: `${canonicalOrigin}/#${orgIdFragment}`,
    websiteId: `${canonicalOrigin}/#website`,
  };
}

/** Person sameAs links, including pending ones once they are live. */
export function getPersonSameAs(): string[] {
  const { person } = getSiteConfig();
  return [...person.sameAs, ...person.pendingSameAs.filter((p) => p.live).map((p) => p.url)];
}

/** Wordmark and favicon initials, configurable with a derived default. */
export function getInitials(): string {
  const { person, theme } = getSiteConfig();
  return theme.initials ?? `${person.givenName[0]}${person.familyName[0]}`.toUpperCase();
}

/** The footer ornament: the uppercased name as space-joined ASCII hex. */
export function getHexName(): string {
  return [...getSiteConfig().person.name.toUpperCase()]
    .map((char) => char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}
