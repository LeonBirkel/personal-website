/**
 * Structured-data smoke test: renders key routes and asserts the JSON-LD
 * parses and the configured #person entity is present. Run against a live
 * server:
 *   node scripts/smoke-structured-data.mjs http://localhost:3000
 * Expected values come from the site config at $SITE_CONFIG_PATH
 * (default ./site.config.json).
 */
import { readFileSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";
const config = JSON.parse(readFileSync(process.env.SITE_CONFIG_PATH ?? "site.config.json", "utf8"));
const PERSON_ID = `${config.site.canonicalOrigin}/#person`;
const ORG_ID = `${config.site.canonicalOrigin}/#${config.site.orgIdFragment ?? "org"}`;
const PERSON_NAME = config.person.name;

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`✗ ${message}`);
}

function ok(message) {
  console.log(`✓ ${message}`);
}

function extractJsonLd(html) {
  const blocks = [];
  const pattern = /<script type="application\/ld\+json">(.*?)<\/script>/gs;
  for (const match of html.matchAll(pattern)) {
    blocks.push(JSON.parse(match[1]));
  }
  return blocks;
}

function graphNodes(blocks) {
  return blocks.flatMap((block) => block["@graph"] ?? [block]);
}

async function fetchText(path, contentType) {
  const response = await fetch(`${base}${path}`);
  if (!response.ok) {
    fail(`${path} returned HTTP ${response.status}`);
    return null;
  }
  const type = response.headers.get("content-type") ?? "";
  if (contentType && !type.includes(contentType)) {
    fail(`${path} content-type is "${type}", expected ${contentType}`);
  }
  return response.text();
}

async function checkPage(path, expectations) {
  const html = await fetchText(path, "text/html");
  if (html === null) return;
  let blocks;
  try {
    blocks = extractJsonLd(html);
  } catch (error) {
    fail(`${path}: JSON-LD failed to parse — ${error.message}`);
    return;
  }
  const nodes = graphNodes(blocks);
  for (const { description, test } of expectations) {
    if (test(nodes, html)) ok(`${path}: ${description}`);
    else fail(`${path}: ${description}`);
  }
}

const hasPersonId = (nodes) => nodes.some((node) => node["@id"] === PERSON_ID);

await checkPage("/", [
  { description: "has #person entity", test: hasPersonId },
  {
    description: "has ProfilePage referencing #person",
    test: (nodes) =>
      nodes.some(
        (node) =>
          node["@type"] === "ProfilePage" &&
          typeof node.mainEntity?.["@id"] === "string" &&
          node.mainEntity["@id"] === PERSON_ID,
      ),
  },
  {
    description: "has WebSite publisher reference",
    test: (nodes) => nodes.some((node) => node["@type"] === "WebSite" && node.publisher?.["@id"]),
  },
  {
    description: "has the affiliation Organization node (when configured)",
    test: (nodes) => !config.affiliation || nodes.some((node) => node["@id"] === ORG_ID),
  },
  {
    description: "exactly one h1",
    test: (_nodes, html) => (html.match(/<h1[\s>]/g) ?? []).length === 1,
  },
]);

await checkPage("/publications", [
  { description: "has #person entity", test: hasPersonId },
  {
    description: "has BreadcrumbList",
    test: (nodes) => nodes.some((node) => node["@type"] === "BreadcrumbList"),
  },
]);

const publicationsJson = await fetchText("/publications.json", "application/json");
if (publicationsJson) {
  const parsed = JSON.parse(publicationsJson);
  const first = parsed.publications?.[0];
  if (first) {
    const slug = new URL(first.url).pathname.split("/").at(-1);
    await checkPage(`/publications/${slug}`, [
      {
        description: "has ScholarlyArticle with author reference",
        test: (nodes) => nodes.some((node) => node["@type"] === "ScholarlyArticle"),
      },
      {
        description: "has Highwire citation_title meta",
        test: (_nodes, html) => html.includes('name="citation_title"'),
      },
    ]);
    const bib = await fetchText(`/publications/${slug}.bib`, "application/x-bibtex");
    if (bib && /@[a-zA-Z]+\s*\{/.test(bib)) ok(`/publications/${slug}.bib serves BibTeX`);
    else fail(`/publications/${slug}.bib missing BibTeX`);
  } else {
    ok("no publications to spot-check (empty DB)");
  }
}

for (const path of ["/index.md", "/publications.md", "/llms.txt"]) {
  const markdown = await fetchText(path, "text/markdown");
  if (markdown?.includes(PERSON_NAME)) ok(`${path} serves markdown`);
  else if (markdown !== null) fail(`${path} does not mention ${PERSON_NAME}`);
}

if (failures > 0) {
  console.error(`\n${failures} structured-data check(s) failed`);
  process.exit(1);
}
console.log("\nAll structured-data checks passed");
