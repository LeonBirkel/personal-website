# personal-website

A self-hostable framework for personal academic websites, built **entity-SEO
first**. One shared Docker image, zero personal data inside. Your identity
lives in a single `site.config.json` that you mount into the container. The
framework's job is making you a recognized person entity for Google's
Knowledge Graph, other search engines, and AI assistants.

The reference instance is [leonbirkel.com](https://leonbirkel.com), the
author's own site. It runs the exact image this repository publishes.

## What it does

- **One entity, one source of truth.** All identity lives in your
  `site.config.json`. Every JSON-LD node (`Person`, `Organization` with
  Wikidata and ROR, `WebSite`, `ProfilePage`, `ScholarlyArticle`,
  `BlogPosting`, `BreadcrumbList`) is generated from it via typed `schema-dts`
  builders and referenced by a stable `@id` such as
  `https://your-domain/#person`, never duplicated inline.
- **Scholar-ready publications.** Per-publication pages carry Highwire
  `citation_*` meta tags, BibTeX (`<slug>.bib`), and DOI links. A JSON export
  lives at `/publications.json`.
- **Readable by machines on purpose.** Every public page has a markdown twin
  (append `.md` to any path), plus `/llms.txt` and `/llms-full.txt`.
  robots.txt explicitly welcomes AI crawlers (GPTBot, ClaudeBot,
  PerplexityBot, and more).
- **Fresh in every index.** Sitemap with database `lastModified`, RSS and
  JSON Feed for news, and IndexNow pings (Bing, Yandex, Seznam, Naver) fired
  after every content mutation.
- **Protected contact email.** The address appears nowhere a crawler can read
  it (no JSON-LD, no mirrors, no HTML source). It is decoded client-side on
  `/contact`. The Turnstile-guarded contact form is the primary channel.
- **Admin portal** at `/admin`. Single user (Better-Auth, Argon2id, sign-ups
  disabled), CRUD for publications, projects and news, an inquiry inbox, and
  uploads (portrait, PDFs) on a persistent volume. Every mutation revalidates
  the affected pages and their machine-readable twins, then pings IndexNow.
- **Identity theming.** Your name, wordmark initials, portrait, bio, accent
  color, and all copy come from the config. The visual system itself stays
  consistent across instances.

## Run your own site

Prerequisites: a Docker host and a domain.

```bash
mkdir mysite && cd mysite
curl -O https://raw.githubusercontent.com/leonbirkel/personal-website/main/deploy/compose.yaml
curl -o .env https://raw.githubusercontent.com/leonbirkel/personal-website/main/deploy/.env.example
curl -o site.config.json https://raw.githubusercontent.com/leonbirkel/personal-website/main/deploy/site.config.example.json
# edit site.config.json (who you are) and .env (secrets + domain)
docker compose up -d
```

The first boot validates your config, migrates the database, creates your
admin user and seeds your initial content. Point your domain at the host (or
use the built-in Cloudflare Tunnel profile) and log in at `/admin`. The full
walkthrough, including Cloudflare setup, lives in
[DEPLOYMENT.md](DEPLOYMENT.md) and [deploy/README.md](deploy/README.md).

### Update channels

| Tag                | Meaning                                                  | For                |
| ------------------ | -------------------------------------------------------- | ------------------ |
| `v1` (recommended) | every release of the current major, never a breaking one | auto-updaters      |
| `vX.Y.Z`           | one exact release, immutable                             | pinners, rollbacks |
| `latest`           | every release, breaking ones included                    | the adventurous    |

Auto-updates are opt-in via the `watchtower` profile in the deploy compose
file. Breaking changes (config schema, required env vars, compose contract)
only ever land in a new major, announced in the GitHub release notes.

### Fork instead

Prefer full control? Fork the repository, keep `upstream` as a remote, and
merge when you want. A `vX.Y.Z` tag pushed to your fork publishes an image to
your own GHCR namespace automatically. Set `APP_IMAGE` in your `.env` to that
image. See [CICD.md](CICD.md).

## Development

```bash
cp .env.sample .env              # generated dev secrets; see comments
docker compose --profile db up -d
npm ci
npm run migrate:dev
npm run seed                     # admin user + seedContent from site.config.json
npm run dev                      # applies migrations, then starts next dev
```

The repo root carries the reference instance's `site.config.json`, which dev
mode uses by default. Point `SITE_CONFIG_PATH` at your own file to develop
against different data.

| Command                                                          | Purpose                                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `npm run check`                                                  | typecheck and lint. **Run before every commit**                              |
| `npm run build` / `start`                                        | production build / serve                                                     |
| `npm run migrate:dev` / `migrate:deploy` / `studio` / `generate` | Prisma workflows                                                             |
| `npm run seed`                                                   | seed from the config (re-runs refresh prose, never curation flags)           |
| `npm run db:reseed`                                              | migrate, wipe **all content rows**, re-seed (dev only; keeps the admin user) |
| `npm run schema` / `schema:check`                                | regenerate / verify `site.config.schema.json`                                |
| `npm run config:validate`                                        | validate a site config against the schema                                    |
| `node scripts/smoke-structured-data.mjs <url>`                   | JSON-LD / mirror smoke test                                                  |

Note: if another app occupies port 3000, run on a different port **and** set
`BETTER_AUTH_URL` and `SITE_URL` in `.env` to match. Better-Auth rejects
cross-origin logins ("Invalid origin").

## Architecture notes

- **Runtime identity.** `src/config/site-config.ts` loads and validates
  `site.config.json` (Zod, fail-fast). Nothing person-specific is compiled
  into the image. The published image renders against a fictional example
  config at build time, and the entrypoint flushes every prerendered page at
  boot so only your content is ever served.
- **Service pattern.** Server actions and route handlers only parse (Zod),
  check the session, and call [src/services/](src/services/). All Prisma
  access lives there.
- **Content is markdown.** Long-form fields are stored as markdown in
  Postgres, so the HTML page and its `.md` twin render from one source.
- **`src/proxy.ts`** rewrites `<path>.md` to markdown twins, `<slug>.bib` to
  BibTeX, `/<INDEXNOW_KEY>.txt` to the key file, and cookie-gates `/admin`
  (real session validation happens again in every admin page and action).
- **Docker build runs its own throwaway Postgres** so `next build` can
  prerender DB-backed pages on any architecture.

## Releasing (maintainers and forks)

```bash
npm version minor              # or patch / major. Bumps, commits and tags
git push origin main --follow-tags
```

CI must be green. CD builds linux/amd64 and linux/arm64 on native runners,
publishes the manifest to GHCR under `vX.Y.Z`, `vN` and `latest`, and creates
a GitHub release with generated notes. Details in [CICD.md](CICD.md).

## Machine-readable endpoints

| Endpoint                                                 | Content                                                 |
| -------------------------------------------------------- | ------------------------------------------------------- |
| `/<path>.md`                                             | markdown twin of any public page (`/index.md` for home) |
| `/llms.txt` · `/llms-full.txt`                           | LLM index / full content dump                           |
| `/publications.json`                                     | publication list with DOIs and BibTeX links             |
| `/publications/<slug>.bib`                               | BibTeX per publication                                  |
| `/news/feed.xml` · `/news/feed.json`                     | RSS · JSON Feed                                         |
| `/sitemap.xml` · `/robots.txt` · `/manifest.webmanifest` | crawl plumbing                                          |

## License

[MIT](LICENSE). A link back to this repository is appreciated, never
required.
