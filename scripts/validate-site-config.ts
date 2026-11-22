import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { siteConfigSchema } from "../src/config/site-config-schema";

/**
 * Validates a site config and prints readable errors. The Docker entrypoint
 * runs this before starting the server so a broken config fails the boot
 * loudly instead of serving a broken site.
 *
 *   npx tsx scripts/validate-site-config.ts [path]
 *
 * Without an argument it validates $SITE_CONFIG_PATH, falling back to
 * ./site.config.json.
 */

const path = resolve(process.argv[2] ?? process.env.SITE_CONFIG_PATH ?? "site.config.json");

let raw: string;
try {
  raw = readFileSync(path, "utf8");
} catch {
  console.error(`✗ No site config found at ${path}.`);
  console.error("  Mount your site.config.json there or set SITE_CONFIG_PATH.");
  console.error("  A starting point lives at deploy/site.config.example.json.");
  process.exit(1);
}

let json: unknown;
try {
  json = JSON.parse(raw);
} catch (error) {
  console.error(`✗ ${path} is not valid JSON: ${(error as Error).message}`);
  process.exit(1);
}

const parsed = siteConfigSchema.safeParse(json);
if (!parsed.success) {
  console.error(`✗ ${path} is invalid:\n`);
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

const config = parsed.data;
const seed = config.seedContent;
const seedSummary = seed
  ? `${seed.publications.length} publication(s), ${seed.projects.length} project(s), ${seed.news.length} news item(s)`
  : "none";
console.log(`✓ ${path} is valid`);
console.log(`  person: ${config.person.name}`);
console.log(`  canonical origin: ${config.site.canonicalOrigin}`);
console.log(`  seed content: ${seedSummary}`);
