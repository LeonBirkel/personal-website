# Deployment

How to run your own instance in production. The quickstart lives in
[deploy/README.md](deploy/README.md), releases and CI in [CICD.md](CICD.md).

## The shape of it

One published Docker image serves every instance. Your identity is a mounted
`site.config.json`, your content lives in Postgres, your uploads in a volume.
The container validates the config, migrates the database, seeds on first
boot, and flushes the prerendered example content before visitors see it.

Two ways to put it on the internet:

**Cloudflare Tunnel (recommended).** `cloudflared` opens an outbound
connection to Cloudflare, and Cloudflare hands requests back down that
tunnel. No inbound port is open at all. Nothing to port-scan, no certificate
to harvest from the origin, no origin address worth finding. The deploy
compose file ships this as the `tunnel` profile.

```
visitor ──HTTPS──> Cloudflare edge ──tunnel──> cloudflared ──> app ──> db
```

**Your own reverse proxy.** Point nginx, Caddy or Traefik at the app's
loopback port. Then your firewall and TLS setup are your own responsibility.

## Ports and firewalls: one critical warning

The app publishes on `127.0.0.1:3000` by default. Keep it that way unless you
know why you are changing it. **`ufw` and similar host firewalls do not
filter Docker-published ports.** Anything Docker publishes on `0.0.0.0` is
exposed to the internet even if your firewall says otherwise. Use your cloud
provider's firewall as the real perimeter.

Postgres sits on a compose network marked `internal: true`. Nothing outside
the compose project can reach the database, and the database has no route
out.

## Setting up

### 1. Files

```bash
mkdir mysite && cd mysite
curl -O https://raw.githubusercontent.com/leonbirkel/personal-website/main/deploy/compose.yaml
curl -o .env https://raw.githubusercontent.com/leonbirkel/personal-website/main/deploy/.env.example
curl -o site.config.json https://raw.githubusercontent.com/leonbirkel/personal-website/main/deploy/site.config.example.json
```

Fill in `site.config.json` (who the site presents) and `.env` (secrets and
domain). Generate secrets with:

```bash
openssl rand -hex 32
```

The database password is spliced into a connection URL, so keep it to
URL-safe characters. The generator above is safe.

`SITE_URL` and `BETTER_AUTH_URL` must both be your public origin, for example
`https://your-domain.example`.

### 2. Start

```bash
docker compose up -d
docker compose ps          # both services must read (healthy)
docker compose logs app    # watch the first boot: validate, migrate, seed
```

A broken `site.config.json` stops the boot with a readable validation error.
Fix the file and `docker compose up -d` again.

### 3. Cloudflare (recommended)

In the Cloudflare Zero Trust dashboard: **Networks → Tunnels → Create a
tunnel**, connector type **Cloudflared**. Add the public hostnames **before**
running the connector, and make sure the DNS names have no `A` or `AAAA`
records first, or Cloudflare refuses to create its `CNAME`:

| Subdomain | Domain      | Type | URL        |
| --------- | ----------- | ---- | ---------- |
| _(empty)_ | your-domain | HTTP | `app:3000` |
| www       | your-domain | HTTP | `app:3000` |

`app:3000` is the container name on the compose network, because the bundled
connector runs inside the same project. **HTTP**, not HTTPS: that hop never
leaves the machine and visitors still get HTTPS from the edge.

Copy the tunnel token into `.env` as `TUNNEL_TOKEN`, then:

```bash
docker compose --profile tunnel up -d
```

Recommended Cloudflare settings:

- SSL/TLS mode: **Full (Strict)**
- Turnstile: a widget covering your domain. Put its keys in `.env`
  (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`). Two widget settings matter
  more than anything in this repo, because the app can only check a token that
  Cloudflare already decided to issue:
  - **Widget mode.** Managed passes most visitors without a click, which also
    means it passes automation that drives a real browser or buys a solve from
    a captcha-solving service. If the form is being abused, switch the widget
    to **Interactive**. It costs a legitimate visitor one click.
  - **Hostname list.** Restrict the widget to your own domain, nothing else.
    The app refuses a token that Cloudflare reports as solved on another
    hostname, but the widget should not have issued it in the first place.
- Contact-form rate limiting: a WAF rate-limiting rule scoped to
  `http.request.method eq "POST" and http.request.uri.path eq "/contact"` stops
  a flood at the edge, before it reaches the app. Scope it to that path and
  method. A site-wide bot rule would block the AI and search crawlers the
  section below is about.
- HSTS: the app already sends
  `Strict-Transport-Security: max-age=31536000; includeSubDomains` in
  production, so Cloudflare's HSTS toggle is optional. Turning it on as well
  is fine. Keep both values identical if you do, and note that
  `includeSubDomains` forces HTTPS on every subdomain of the apex. Drop that
  part in `next.config.ts` if you run anything on plain HTTP under the same
  domain. Neither place enables `preload`, which is deliberate: preloading is
  slow to reverse and is your call, not the framework's.
- DNS: if the domain sends no email, add a null `MX`, `v=spf1 -all` and a
  `p=reject` DMARC record so it cannot be spoofed.
- **Allow verified AI bots. This one is critical.** Bot Fight Mode off, AI
  scraper blocking off, no AI Labyrinth, no managed `robots.txt`. Cloudflare
  enforces before the request reaches the app, so restrictive defaults
  silently defeat the entire purpose of this framework: being retrievable
  and citable by search engines and AI assistants. See CLAUDE.md.

### 4. Verify

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://your-domain/api/health
SITE_CONFIG_PATH=/path/to/mysite/site.config.json node scripts/smoke-structured-data.mjs https://your-domain
```

The smoke test needs the repo checked out. `SITE_CONFIG_PATH` must point at
the config file you filled in during setup, not at the reference config
committed in this repository. It asserts the JSON-LD parses,
your `#person` entity is present, publication pages carry Highwire citation
tags, and the `.bib` and `.md` twins serve. Then by hand: the site renders
with JavaScript disabled, `/admin` redirects when signed out, and the contact
form stores a message.

## Updates

Releases follow semantic versioning. A breaking change is any of: a
`site.config.json` schema change that requires editing your file, a new or
renamed required environment variable, a destructive database migration, or
a change to the compose contract (ports, volumes, service names). Breaking
changes only land in a new major version and are called out in the GitHub
release notes.

Channels:

- **`v1` (default in the deploy compose file).** Every release of the current
  major. Safe to auto-update: within a major, migrations are expand-only and
  apply automatically at boot, and your config keeps validating.
- **`vX.Y.Z`.** Pinned. Update by editing `APP_IMAGE` in `.env` and running
  `docker compose up -d`.
- **`latest`.** Every release including majors. A major with a config schema
  change will stop the container at boot with a validation error until you
  update your file. The site stays on the old container until then only if
  you have not yet removed it, so prefer `v1` for unattended hosts.

Auto-updating is opt-in:

```bash
docker compose --profile watchtower up -d
```

The bundled Watchtower is scoped with labels and polls daily. Only the app
container updates. Postgres never auto-updates, because a surprise major
version would strand the data directory. If you already run Watchtower on
the host, skip the profile and add the scope labels to your own instance.

To be notified of releases without auto-updating, watch the GitHub
repository (Watch → Custom → Releases).

## Rollback

```bash
# .env
APP_IMAGE=ghcr.io/leonbirkel/personal-website:v1.2.3
```

```bash
docker compose up -d
```

Rolling back one minor within a major is safe without touching the database
(expand-only migrations). Rolling back across a major, or past a release
whose notes flag a migration, needs a database restore first.

## Backups

The two things worth saving are the database and the uploads volume:

```bash
docker compose exec -T db pg_dump -U postgres -Fc personal_website > backup-$(date +%F).dump
docker run --rm -v mysite_uploads:/u -v "$PWD":/out alpine tar czf /out/uploads-$(date +%F).tgz -C /u .
```

Put those two lines in a cron job and copy the results somewhere off the
host. The database has no published port, so restore through the container
as well:

```bash
docker compose exec -T db pg_restore -U postgres --clean --if-exists -d personal_website < backup-2026-01-01.dump
```

Restore uploads by untarring the archive back into the volume.

## Troubleshooting

**Cloudflare error 1033, or the site is down.** The tunnel connector is not
running: `docker compose logs tunnel`.

**Error 502.** The tunnel is up but the app is not answering:
`docker compose ps` and `docker compose logs --tail 50 app`.

**The container restarts in a loop after an update.** Almost always a config
validation error or a failed migration. `docker compose logs app` names the
problem. A validation error means the new major needs a config edit, see the
release notes.

**The site loads but shows the example person or missing content.** The
boot-time cache flush did not complete. Check the app log for
`ISR warm-up complete`, and that no `boot revalidation call failed` line
precedes it.

**Contact form rejects submissions.** `docker compose logs app | grep
turnstile`. The log names Cloudflare's error code, for example
`hostname-mismatch` or `invalid-input-secret`.

**A name resolves to nothing after changing DNS.** Negative caching. Flush
locally with `resolvectl flush-caches`.
