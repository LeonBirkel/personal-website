# Shared framework image: contains zero instance data. Every instance mounts
# its own site.config.json (validated by the entrypoint) and the ISR warm-up
# replaces the build-time example content after boot.
# `next build` prerenders DB-backed pages, so the builder stage runs a
# throwaway Postgres — the image builds self-contained on any arch. Pages are
# built against an empty DB and the bundled example config. ISR
# (revalidate=300) and revalidatePath refresh them at runtime.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM node:24-alpine AS builder
RUN apk add --no-cache postgresql17
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN chown -R node:node /app && mkdir -p /run/postgresql && chown node:node /run/postgresql
USER node
ENV NEXT_TELEMETRY_DISABLED=1
# The build renders against the fictional example config so no personal data
# is ever baked into the published image.
ENV SITE_CONFIG_PATH=/app/deploy/site.config.example.json
RUN initdb -D /tmp/pgdata --auth=trust --username=build && \
    pg_ctl -D /tmp/pgdata -o "-c listen_addresses=127.0.0.1 -k /tmp" -w start && \
    export DATABASE_URL="postgresql://build@127.0.0.1:5432/postgres" && \
    export BETTER_AUTH_SECRET="build-time-placeholder" && \
    npx prisma generate && \
    npx prisma migrate deploy && \
    npm run build && \
    pg_ctl -D /tmp/pgdata -w stop && \
    npm prune --omit=dev

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Instances mount their config here (see deploy/compose.yaml). The entrypoint
# refuses to start without a valid one.
ENV SITE_CONFIG_PATH=/app/site.config.json
COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json /app/next.config.ts /app/prisma.config.ts /app/tsconfig.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/prisma ./prisma
# src and scripts are needed at runtime: the entrypoint validates the mounted
# config and runs the first-boot seed, both via tsx.
COPY --from=builder --chown=node:node /app/src ./src
COPY --from=builder --chown=node:node /app/scripts ./scripts
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --chown=node:node docker/entrypoint.sh ./entrypoint.sh
RUN mkdir -p /app/uploads && chown node:node /app/uploads && chmod +x ./entrypoint.sh
USER node
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
