# Roadmap

Open work on the framework itself, plus the decisions that shape it. Instance
chores (DNS, profiles, content) belong to each instance owner and are not
tracked here. Contributions follow [CONTRIBUTING.md](CONTRIBUTING.md).

## Next release

- **Unreleased on `main`:** dotenv 18 and stylelint 18 with its standard
  config. dotenv is a runtime dependency, because the entrypoint's migration
  step loads `prisma.config.ts`, which imports it.
- **Cap news rows at 65ch on wide screens.** The item paragraph on `/news`
  (`src/app/news/page.tsx`) and the home page's Recent News
  (`src/app/page.tsx`) have no maximum width. At 3840 px each row runs about
  104ch. The about paragraphs already use `max-w-[65ch]`, which fits here too.
  Verify at all five widths afterwards.

## Open

- **Change the admin password in the portal.** Today
  `scripts/set-admin-password.ts` does it from the host (see DEPLOYMENT.md).
  Better-Auth ships a change-password endpoint that a settings form could
  call.
- **Gate `worksFor` behind an employment flag.** `src/lib/jsonld.ts` emits
  `worksFor` for any instance that sets `affiliation`. That misrepresents a
  person who studies at their affiliation without working there. The fix is
  an optional `employedByAffiliation` flag on the person block. `worksFor`
  follows the flag while `affiliation` stays unconditional. It needs a
  regenerated JSON Schema and the Person-node line in CLAUDE.md.
- **Move to Node 26.** It became LTS on 2026-10-28. Update `node:26-alpine` in
  all three `Dockerfile` stages and `node-version` in `ci.yml`, then release.
- **Drop the `effect` override once Prisma ships a fix.** `package.json`
  overrides `effect` to 3.22.5 for `@prisma/config`, because 7.10.1 pins a
  version hit by GHSA-7589-6fvf-x4pw. Remove it when a Prisma 7.x release
  depends on `effect >=3.22.1` itself
  (`npm view @prisma/config@<version> dependencies.effect`).
- **Dependency majors held back by upstream.** TypeScript 7 waits for
  `typescript-eslint` to widen its peer range. ESLint 10 waits for
  `eslint-plugin-react` to release past 7.37.5, which `eslint-config-next`
  depends on. Both stay Dependabot-ignored until then. Odd Node majors are
  skipped because they are not LTS.

## Accepted trade-offs

Revisit only if the requirements change.

- Markdown renders without a sanitizer. The only author is the single trusted
  admin.
- Uploads overwrite files with the same name. Portrait replacement depends on
  it.
- CD actions are pinned to major tags, not commit SHAs.

## Decided against

- **An MCP server at `/mcp`.** The markdown twins, `llms.txt` and the JSON
  exports already serve agents. Not planned for now.
- **Push-based deploys.** A deploy endpoint must never live in the Next.js
  app, because it would need the Docker socket inside the web container.
  Watchtower polling, or Watchtower's own token-authenticated API, covers it.
- **Multi-person instances, a CMS, tracking scripts.** One deployment presents
  one person. See the out-of-scope list in CLAUDE.md.
