# CI/CD: automated checks and releases

How code gets from a commit to a published image. Deploying that image is
covered in [DEPLOYMENT.md](DEPLOYMENT.md).

## The short version

| You do                        | What happens                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------- |
| Push any branch, or open a PR | CI runs. Nothing publishes.                                                  |
| Merge to `main`               | CI runs again. Still nothing publishes.                                      |
| Push a tag `vX.Y.Z`           | A multi-arch image is built and pushed to GHCR. A GitHub release is created. |
| Edit content in `/admin`      | Live immediately. No deploy, no pipeline.                                    |

Releases are deliberately tied to tags rather than to `main`. Merging is
safe, and releasing is an explicit act. The pipeline never contacts any
server: deployment is pull-based (Watchtower or a manual
`docker compose pull`).

## CI on every push and pull request

`.github/workflows/ci.yml` runs two jobs in parallel. CI runs entirely as
the fictional example person from `deploy/site.config.example.json`, which
proves the framework ships no baked-in instance data.

**check-build** starts a PostgreSQL 17 service, then runs:

1. `npm ci`
2. `npm run check`, which is `tsc --noEmit`, ESLint, `prettier --check` and Stylelint
3. `npx jscpd src`, the duplication gate
4. `npm run schema:check`, so `site.config.schema.json` never drifts from the Zod schema
5. validation of both the example config and the reference instance's config
6. shellcheck over `ops/bin`, `ops/install.sh` and the Docker entrypoint
7. `prisma migrate deploy` and `npm run seed`
8. `npm run build`
9. a built-CSS grep that fails if a `globals.css` component class collides with a
   Tailwind utility namespace (that once shrank every tagged paragraph to 28rem)
10. `npm audit --audit-level=high`
11. the structured-data smoke test against a real server started from the build

**megalinter** runs Prettier and Stylelint across the whole repository. It
deliberately does not run ESLint, because MegaLinter v9 bundles ESLint 8,
which cannot load this project's ESLint 9 flat config. ESLint runs in
check-build instead.

`npm run check` mirrors the pipeline exactly, so run it before pushing and CI
will agree with your machine.

## Releasing

```bash
git checkout main && git pull
npm version minor          # or patch / major. Bumps package.json, commits and tags
git push origin main --follow-tags
```

Main is push-protected, so this push delivers the tag and rejects the version
commit. That is expected: CD builds from the tag, whose commit carries the
right version, and the preflight guard passes. Land the version commit
afterwards through a small PR from a branch at that commit (see #37 and #40
for the pattern), so the next release computes from the right base.

`.github/workflows/cd.yml` then:

1. **Preflight**: the tag must match `package.json`'s version, or the run fails.
2. **Build**: one native runner per architecture (`ubuntu-latest` for amd64,
   `ubuntu-24.04-arm` for arm64), no QEMU. Each leg pushes by digest.
3. **Merge**: one `docker buildx imagetools create` assembles the multi-arch
   manifest and applies every tag, so all channels share a single digest.
   A verify step asserts both platforms are present.
4. **Release**: a GitHub release with generated notes. For a breaking
   release, edit the notes afterwards and spell out the required operator
   actions.

Published tags per release: `vX.Y.Z` (immutable), `vN` (floating major, the
recommended consumer channel, skipped while on 0.x), and `latest`.

The image name derives from `github.repository`, lowercased. **A fork
publishes to its own GHCR namespace with zero workflow edits.** Two follow-ups
for forks: make the GHCR package public (or configure a pull secret on your
host), and point `APP_IMAGE` in your `.env` at your image.

Semantic versioning, from the consumer's point of view: patch for fixes,
minor for features that need nothing from operators, major for anything that
requires touching `site.config.json`, `.env` or the compose file.

## Database migrations

Migrations are never applied by hand in production. The container entrypoint
runs `prisma migrate deploy` before the server starts, so every deploy brings
the schema up to date. A failing migration leaves the container restarting
instead of serving a broken site.

When you change `prisma/schema.prisma`:

```bash
npm run migrate:dev -- --name describe_the_change
```

Commit the generated folder in `prisma/migrations/`. Two rules keep
unattended updates safe for every instance:

- Within a major version, migrations must be expand-only: they apply cleanly
  to a database that already holds rows, and the previous release's code
  still runs against the new schema. Adding a required column needs a
  temporary default, then a follow-up that drops the default
  (`20260807084840_add_project_summary` is the worked example).
- Never edit a migration that has already shipped in a release. Write a new
  one.

## Content updates need no pipeline

Publications, projects, news items and inquiries live in Postgres and are
edited at `/admin`. Each mutation revalidates the affected pages, their
markdown twins, the sitemap and the LLM files, then pings IndexNow so Bing,
Yandex, Seznam and Naver re-crawl. Pages also refresh through ISR.

Release only when code changes.

## Dependency updates

Dependabot opens weekly PRs, grouped so that minor and patch updates arrive
together, with separate PRs for major bumps, GitHub Actions and the Docker
base image.

Merge a Dependabot PR only when CI is green on it. For a major bump, check
the release notes first. Some are pinned back on purpose in
`.github/dependabot.yml`:

- TypeScript 7, because typescript-eslint does not support it yet
- ESLint 10, because eslint-config-next@16 bundles an incompatible eslint-plugin-react
- odd-numbered Node majors, because CLAUDE.md requires an LTS release

Revisit those when a newer `eslint-config-next` ships.
