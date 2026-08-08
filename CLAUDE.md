# CLAUDE.md

**personal-website**: an MIT-licensed, self-hostable framework for personal
academic websites. One shared Docker image, zero personal data inside. Each
instance mounts a `site.config.json` that defines the person it presents.
Reference instance: **leonbirkel.com** (Leon Birkel, the maintainer). The
repo root carries the reference instance's config, which dev mode uses.

## Purpose & priorities

The framework exists primarily for **online visibility** of the person each
instance presents: strong technical SEO and recognition as a person entity in
**Google's Knowledge Graph**, plus retrievability by other search engines, AI
assistants, and autonomous agents. Every technical decision defers to that
goal. Secondary purpose: showcase research (publications, projects, news) and
provide a contact channel.

When trade-offs arise, prioritize in this order:

1. Entity SEO / structured-data correctness
2. Crawlability & performance (Core Web Vitals)
3. Maintainability
4. Visual polish

## Person entity (single source of truth)

- All identity lives in the instance's **`site.config.json`**, validated by
  the Zod schema in `src/config/site-config-schema.ts` and loaded at runtime
  by `src/config/site-config.ts`. Nothing person-specific may be hardcoded in
  `src/` or compiled into the image. Ever.
- Use the configured `person.name` exactly as spelled, everywhere: titles,
  JSON-LD, OG tags, alt text, publication author lists.
- `site.config.schema.json` is generated (`npm run schema`) and CI fails if
  it drifts. Editors autocomplete configs via its `$schema` pointer.
- Two images, two jobs, both uploaded through the admin portal. The portrait
  at `/uploads/portrait.jpg` is the JSON-LD `image`, so it wants a square or
  portrait crop: consumers show it as a thumbnail. The link preview at
  `/uploads/og-image.jpg` is the `og:image` and must be **1200×630**, the
  1.91:1 shape Facebook and LinkedIn render as a full-width card.
- Never serve the portrait as the `og:image` by choice. It is only a fallback,
  and platforms that crop to 2:1 take the top and bottom off the head. Never
  use a logo or icon as `og:image`. Every tag is omitted automatically while
  its file is missing, so nothing ever points at a 404.
- Ask before publishing any personal data of the maintainer beyond name,
  role, and public profile links.

## SEO requirements (non-negotiable, every public page)

- schema.org JSON-LD: `Person` site-wide; `WebSite`; `ProfilePage` on home;
  `ScholarlyArticle` per publication; `BlogPosting` per news item;
  `BreadcrumbList` on nested pages.
- **Stable entity IDs**: the Person node is
  `<canonicalOrigin>/#person`; the affiliation is an `Organization` node at
  `<canonicalOrigin>/#<orgIdFragment>` with its own `sameAs` (website,
  Wikidata item, ROR ID). Every other JSON-LD node references these by `@id`
  (`WebSite.publisher`, `ProfilePage.mainEntity`, `ScholarlyArticle.author`).
  One entity, many references, never duplicated inline. `canonicalOrigin`
  and `orgIdFragment` never change after launch.
- Person node carries: `name`, `givenName`/`familyName`, `jobTitle`,
  `worksFor`, `image`, `url`, `sameAs`, and `knowsAbout`, all from the
  config.
- JSON-LD is typed with `schema-dts` and generated in `src/lib/jsonld.ts`
  from the runtime config — no hand-written blocks.
- Publication pages additionally carry Google Scholar (Highwire) meta tags:
  `citation_title`, `citation_author` (one per author, in order),
  `citation_publication_date`, `citation_doi`, `citation_pdf_url`, plus
  `citation_conference_title`, `citation_publisher` and
  `citation_firstpage`/`citation_lastpage` when the structured fields are set.
- Next.js Metadata API: title template `%s | <person.name>`, unique
  descriptions, canonical URLs on the instance origin (https, non-www),
  OpenGraph + Twitter cards. Metadata that depends on the config must use
  `generateMetadata()`, never a static `metadata` export, so ISR
  regeneration picks up the runtime config.
- `app/sitemap.ts` (entries carry `lastModified` from DB timestamps),
  `app/robots.ts`, RSS feed for news.
- All public content is server-rendered (SSG/ISR). Pages must render complete
  content with JavaScript disabled. No `useEffect` data fetching.
- **Every config- or DB-dependent route needs `revalidate`** (or must be
  dynamic). The published image is prerendered against the fictional example
  config, and the entrypoint's boot-time cache flush
  (`/api/internal/revalidate`) only helps routes that can regenerate.
- Semantic HTML: exactly one `<h1>` per page, landmark elements, alt text
  everywhere, `next/image` with explicit sizes. `<html lang="en">` —
  English-only, no hreflang until a second locale exists.
- Favicons and manifest icons render dynamically from the configured
  initials and accent color (`src/lib/icon-image.tsx`), including a real
  `/favicon.ico` (Google shows favicons in results).
- www → apex and http → https redirects (handled at the CDN/proxy in front).

## Search engines & AI assistants (beyond Google)

- Instance owners verify their domain in **Google Search Console** and
  **Bing Webmaster Tools** and submit the sitemap in both. Bing's index also
  feeds DuckDuckGo, Yahoo, Ecosia — and ChatGPT's web search.
- **IndexNow**: the key file is served at the site root and the service layer
  pings `api.indexnow.org` after every content mutation (same place as
  `revalidatePath`). One ping notifies Bing, Yandex, Seznam, and Naver.
- `robots.ts` **allows all legitimate crawlers, including AI crawlers**
  (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot).
  Being retrievable and citable by AI assistants is part of the visibility
  goal — never block them.
- **`/llms.txt`**: a short markdown index (who the person is, key pages) for
  LLM agents.
- Brave Search and other independent engines crawl the open web — the
  standards above cover them. Baidu and per-engine registrations beyond
  Google/Bing are out of scope.

## AI-agent & AI-model readability

The site must be as consumable by an LLM fetch tool as by a browser:

- **Markdown mirror**: every public page is also served as clean markdown at
  `<path>.md` (same content, no chrome), linked from `/llms.txt`, plus
  `/llms-full.txt` (all content concatenated). Long-form fields are stored as
  markdown in Postgres, so the HTML page and its `.md` twin render from one
  source.
- **Machine-readable exports**: per-publication BibTeX at
  `/publications/<slug>.bib`, a JSON list at `/publications.json`, and a JSON
  Feed for news alongside RSS.
- **Snippet permissions**: robots meta `max-snippet:-1,
max-image-preview:large` on every page — answer engines may quote freely.
- **No challenges on content**: Turnstile only guards the contact-form
  action. Content pages are never gated by JavaScript challenges,
  interstitials, or logins.
- **Cloudflare caveat (critical, documented for every instance)**: Cloudflare
  blocks AI crawlers by default on new domains. In the dashboard: allow
  verified AI bots, keep Bot Fight Mode / AI-scraper blocking off, never
  enable AI Labyrinth or pay-per-crawl, and ensure a managed robots.txt does
  not override `robots.ts`. robots.txt is advisory — Cloudflare enforcement
  would silently defeat everything in this section.
- **Stretch goal (optional)**: **Decision was to NOT do it for now** a
  minimal MCP server at `/mcp` (Streamable HTTP) exposing `get_profile`,
  `list_publications`, `list_news`; mention it in `llms.txt`.

## Framework contract (what keeps instances safe)

- The published image contains **zero instance data**. The Docker build
  renders against `deploy/site.config.example.json` (fictional person), and
  `.dockerignore` excludes the root `site.config.json`.
- The entrypoint boots in this order: validate config (fail loudly), migrate,
  seed `--if-needed`, flush all prerendered pages, warm the cache.
- Content seeding comes from the config's `seedContent` section, once per
  database (GlobalSettings key `seed:completed`). Redeploys never clobber
  admin edits.
- Release channels: `vX.Y.Z` (pin), `vN` (floating major, safe for
  auto-update), `latest`. A breaking change (config schema, required env,
  compose contract, destructive migration) requires a major bump. Within a
  major, migrations are expand-only.
- CI runs entirely as the example person. The structured-data smoke test
  reads its expectations from the config.
- Client components never import the config loader. Instance data reaches
  them as props from server components. No `NEXT_PUBLIC_*` variable may ever
  carry instance data (it would bake into the shared bundle).

## TODO.md (living task list)

`TODO.md` in the repo root is the shared checklist between the maintainer and
Claude.

- **Update it in every session that changes the state of any item.** Check
  items off as they land, add new ones as they come up, move finished work to
  the Done section with its date.
- Anything the maintainer has to do himself (secrets, DNS, off-site profiles,
  content to verify) belongs there, marked as his. Anything blocked on
  upstream belongs there with the reason.
- It is the answer to "what is still open", so it must never go stale.

## Responsive design (every public and admin page)

The site must look deliberate on every common screen, not merely survive.

- **Target classes**: phone (360–430 px), tablet (768–1024 px, both
  orientations), laptop (1280–1440 px), FullHD (1920 px), and 4K
  (2560–3840 px).
- No horizontal scrolling at any width. Long content (tables, code blocks,
  BibTeX, long URLs) scrolls inside its own container.
- On FullHD and 4K the layout must not stretch into unreadable line lengths.
  Body copy stays near 65ch, and the page keeps a bounded, centred measure
  with generous whitespace instead of full-width text.
- Type and spacing scale with the viewport (`clamp()`), so a 4K screen
  renders larger text rather than the same text with more empty space.
- Touch targets stay at least 44 px on phones and tablets. Hover-only
  affordances need a non-hover equivalent.
- Verify changes at 390, 768, 1280, 1920 and 3840 px **in a real browser**
  before calling a UI change done. HTML-level diffs do not catch rendering
  regressions: the v1.0.1 paragraph-width bug shipped with byte-verified
  markup.

## Writing style (all prose, no exceptions)

Applies to every word a human reads: site copy, example-config content,
publication and project descriptions, README, TODO, commit messages, and PR
bodies.

- **No dashes as sentence punctuation.** Not `—`, not `–`, not `--`, not a
  spaced hyphen. Write two sentences instead, or use a comma, colon, or
  parentheses.
- **No semicolons in prose.** Split the sentence.
- **Short sentences.** One idea per sentence. Shorter is easier to read.
- Normal orthography stays: hyphenated compounds (`post-quantum`,
  `well-known`) and en dashes inside number ranges (`2024–2025`) are fine.
  The rule targets dashes used as a dramatic pause.
- Avoid the "not X, but Y" and "it's not just X, it's Y" constructions, and
  filler adjectives that state nothing (`robust`, `seamless`, `cutting-edge`,
  `passionate about technology`).
- Claims must be verifiable from a source. Never inflate, never invent.
- **Exemption: quoted material.** Published abstracts, citations and anything
  else reproduced from an external source stay verbatim, including their
  dashes and semicolons. Never edit a quote to fit house style.

## Stack (fixed — do not substitute)

- TypeScript (strict) · Next.js 16+ App Router · React Server Components by default
- Tailwind CSS
- PostgreSQL + Prisma ORM (`prisma/schema.prisma` is the single source of truth; **never raw SQL**)
- Better-Auth for `/admin` (email/password only, single admin user, Argon2id hashing)
- Zod validation on client **and** server for every input edge
- Cloudflare in front (recommended: Tunnel, Turnstile on the contact form)
- Node.js LTS (v24+), npm (not pnpm/yarn), `package-lock.json` committed

## Architecture conventions

- **Service pattern**: Server Actions and route handlers only parse, validate
  (Zod), and check permissions. Business logic and all Prisma calls live in
  `src/services/` and are reused everywhere.
- **RSC-first**: fetch data directly in server components.
- **Self-documenting code**: descriptive names; comments only explain _why_,
  never _what_.
- **Aggressive DRY**: duplicated code blocks fail CI (jscpd).
- Public pages use SSG/ISR; admin mutations call
  `revalidatePath`/`revalidateTag` **and trigger the IndexNow ping**.

## Content model (Prisma / Postgres)

- `Publication` — title, authors, venue, year, DOI, PDF URL, BibTeX, featured flag
- `Project` — title, description, links, tech tags, active flag, order
- `NewsItem` — date, emoji, short text (supervisor-style news feed)
- `ContactInquiry` — name, email, subject, message, ip (spam prevention)
- `GlobalSettings` — key-value store (holds the `seed:completed` flag and the
  Discord webhook URL for inquiry notifications)
- Admin portal at `/admin`, protected by middleware RBAC (`role` field on user).

## Commands

- `npm run dev` — dev server (applies migrations first)
- `npm run check` — typecheck + lint; **run before every commit**
- `npm run build` / `npm run start`
- `npm run generate` / `migrate:dev` / `migrate:deploy` / `studio` / `seed`
- `npm run schema` / `schema:check` — regenerate / verify the config JSON Schema
- `npm run config:validate` — validate a site config

Docker Compose profiles:

- `docker compose --profile db up -d` — Postgres only (default for development)
- `docker compose --profile production up --build` — full production stack test
- `deploy/compose.yaml` — the consumer-facing file (pull-only, watchtower and
  tunnel profiles)

## Environment

`.env` is never committed; keep `.env.sample` in sync. Variables:
`DATABASE_URL` (postgres://…), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`SITE_URL` (optional in production, defaults to the config's
canonicalOrigin), `SITE_CONFIG_PATH` (optional, defaults to
./site.config.json), `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `INDEXNOW_KEY`, `UPLOADS_DIR`.
Generate secrets with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`

## CI/CD (GitHub Actions)

CI on every push/PR: typecheck, MegaLinter (Prettier, Stylelint), jscpd,
config schema sync check, config validation, shellcheck over the ops
scripts, `next build`, a built-CSS guard against component classes that
collide with Tailwind utility namespaces, `npm audit`, and a
**structured-data smoke test** (render key routes, assert JSON-LD parses and
the configured `#person` `@id` is present). Dependabot enabled. CI runs as
the fictional example person.

CD on version tag `vX.Y.Z` (must match `package.json`, release with
`npm version`):

1. Build linux/amd64 and linux/arm64 on native runners, assemble one
   manifest list, push to GHCR as `vX.Y.Z` + `vN` + `latest`.
2. Create a GitHub release with generated notes.
3. Deployment is pull-based on each instance (Watchtower profile or manual
   pull). `prisma migrate deploy` runs in the container entrypoint before the
   app starts. The uploads volume is preserved across deploys.

## Definition of done (any user-facing change)

- `npm run check` and `next build` pass
- Structured data validates (Google Rich Results test + schema.org validator) — no schema regressions
- Page renders fully with JavaScript disabled; its `.md` twin serves the same content
- Works with the example config AND the reference config (no hardcoded person data)
- Responsive and accessible (keyboard navigation, contrast, alt text)

## Off-site entity checklist (playbook for every instance owner)

- [ ] Verify the domain in Google Search Console + Bing Webmaster Tools; submit the sitemap in both.
- [ ] Set the domain as the website on every profile: staff page, Google
      Scholar, ORCID, LinkedIn, GitHub, ResearchGate — closes the `sameAs`
      loop in both directions.
- [ ] Create a Wikidata item (human; occupation: researcher; employer;
      ORCID; official website) once the first DOI-indexed publication exists.
      `ops/wikidata-quickstatements.txt` is a worked example.
- [ ] Use the domain in the email signature and in paper author footers.
- [ ] When Google shows a knowledge panel: claim it ("Claim this knowledge
      panel") and suggest the portrait as featured image.

## Out of scope

- No CMS SaaS, no heavy client-side frameworks, no tracking scripts that hurt
  Core Web Vitals. No auth beyond the single admin user. No multi-person
  instances: one deployment presents one person.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
