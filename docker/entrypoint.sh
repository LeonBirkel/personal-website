#!/bin/sh
# Boot order: validate the mounted config (fail loudly on a bad one), apply
# migrations, run the first-boot seed, then start the server while the ISR
# warm-up replaces the build-time example content in the background. The
# uploads volume persists across deploys.
set -e

npx tsx scripts/validate-site-config.ts

# Cloudflare's public test keys (prefix 1x/2x/3x) make siteverify accept any
# input, so a contact form running on them is unguarded. Loud warning rather
# than a refusal: the compose production self-test legitimately boots with
# them, and the form fails closed while the secret is empty.
case "${TURNSTILE_SECRET_KEY:-}" in
"")
  echo "WARNING: TURNSTILE_SECRET_KEY is empty. The contact form will reject every submission until real Turnstile keys are set." ;;
1x* | 2x* | 3x*)
  echo "WARNING: TURNSTILE_SECRET_KEY is a Cloudflare TEST key. The contact form is NOT protected. Create real keys at https://dash.cloudflare.com/ (Turnstile)." ;;
esac

npx prisma migrate deploy

# Creates the admin user and, only once per database, the seedContent from
# site.config.json. Subsequent boots are no-ops, so redeploys never clobber
# admin edits.
npx tsx prisma/seed.ts --if-needed

# The image is built against a throwaway empty database and the example
# config, so every DB-backed page ships prerendered with placeholder content.
# ISR would serve that version to the first visitors after each deploy.
# Warming the routes in the background makes the regeneration happen before a
# human sees it. Never allowed to block or fail the boot.
BASE=http://127.0.0.1:3000

warm_isr() {
  i=0
  while [ "$i" -lt 60 ]; do
    if wget -q -T 3 -O /dev/null "$BASE/api/health" 2>/dev/null; then
      break
    fi
    i=$((i + 1))
    sleep 2
  done

  # Flush every prerendered entry first. Freshly built images would otherwise
  # serve the example content until the ISR window expires.
  wget -q -T 10 -O /dev/null --post-data="" \
    --header="x-boot-token: ${BOOT_REVALIDATE_TOKEN}" \
    "$BASE/api/internal/revalidate" 2>/dev/null ||
    echo "boot revalidation call failed, relying on ISR expiry"

  # Every public route, not only the HTML pages. The feeds, the JSON exports and
  # the markdown twins are what crawlers and AI agents fetch, and warming only
  # the pages left them serving the build-time version to whoever asked first
  # after a deploy. The trailing 404 probe regenerates the not-found page, which
  # is otherwise never requested by a warm-up.
  paths="/ /publications /projects /news /contact
    /robots.txt /sitemap.xml /manifest.webmanifest /llms.txt /llms-full.txt
    /.well-known/security.txt
    /news/feed.xml /news/feed.json /publications.json
    /index.md /publications.md /projects.md /news.md /contact.md
    /icon /apple-icon /favicon.ico /icons/192 /icons/512 /boot-warmup-404-probe"

  # First pass regenerates the flushed entries, second pass confirms the
  # freshly generated ones are cached.
  for pass in 1 2; do
    for path in $paths; do
      wget -q -T 10 -O /dev/null "$BASE$path" 2>/dev/null || true
    done

    # Publication routes are per-slug, so read them from the sitemap that the
    # loop above just refreshed instead of hardcoding a list that would rot.
    for path in $(wget -q -T 10 -O - "$BASE/sitemap.xml" 2>/dev/null | grep -o '/publications/[^<]*' || true); do
      wget -q -T 10 -O /dev/null "$BASE$path" 2>/dev/null || true
      wget -q -T 10 -O /dev/null "$BASE$path.md" 2>/dev/null || true
      wget -q -T 10 -O /dev/null "$BASE$path.bib" 2>/dev/null || true
    done

    if [ "$pass" = "1" ]; then
      sleep 5
    fi
  done
  echo "ISR warm-up complete"
}

# Per-boot secret for the cache-flush endpoint. Only this process tree and
# the server (which inherits the export) ever know it.
BOOT_REVALIDATE_TOKEN="$(head -c 32 /dev/urandom | sha256sum | cut -d' ' -f1)"
export BOOT_REVALIDATE_TOKEN

warm_isr &

exec npx next start -H 0.0.0.0 -p 3000
