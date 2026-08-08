# Deploy your own instance

Everything you need to run this site as your own. Full guide: [DEPLOYMENT.md](../DEPLOYMENT.md).

Prerequisites: a Docker host and a domain. A free Cloudflare account is
recommended for the Turnstile contact-form guard and the optional tunnel.

```bash
mkdir mysite && cd mysite
curl -O https://raw.githubusercontent.com/leonbirkel/personal-website/main/deploy/compose.yaml
curl -o .env https://raw.githubusercontent.com/leonbirkel/personal-website/main/deploy/.env.example
curl -o site.config.json https://raw.githubusercontent.com/leonbirkel/personal-website/main/deploy/site.config.example.json
```

Then:

1. Edit `site.config.json`. It is who the site presents: name, role,
   affiliation, bio, links, colors, and your initial publications, projects
   and news. The schema documents every field. Keep the `$schema` line and
   most editors autocomplete the file on their own.
2. Edit `.env`. Secrets, your domain, and the admin login.
3. Start it:

```bash
docker compose up -d
```

The first boot validates your config, migrates the database, creates your
admin user and seeds your content. Then point your domain at the host (or use
the `tunnel` profile) and log in at `https://your-domain/admin`.

Auto-updates are opt-in:

```bash
docker compose --profile watchtower up -d
```

The default image tag `v1` receives every release of the current major and
never a breaking one. Details, updates, rollback and backups:
[DEPLOYMENT.md](../DEPLOYMENT.md).
