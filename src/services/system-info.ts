import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { getSiteConfig, siteConfigPath } from "@/config/site-config";
import { ogImageExists, portraitExists } from "@/lib/portrait";
import { prisma } from "@/lib/prisma";
import { SEED_COMPLETED_KEY } from "@/lib/settings-keys";
import { turnstileSecretMode, type TurnstileSecretMode } from "@/lib/turnstile";
import { indexNowStatus, type IndexNowStatus } from "@/services/indexnow";
import { DISCORD_WEBHOOK_KEY } from "@/services/notifications";
import { getSetting } from "@/services/settings";

export type SystemInfo = {
  version: string;
  build: { gitSha: string | null; builtAt: Date | null };
  runtime: { node: string; platform: string; startedAt: Date; uptimeSeconds: number };
  frameworks: { next: string; prisma: string; betterAuth: string };
  instance: {
    canonicalOrigin: string;
    configModifiedAt: Date | null;
    seededAt: Date | null;
    lastInquiryAt: Date | null;
    spamFiltered: number;
  };
  checks: {
    turnstile: TurnstileSecretMode;
    discordWebhook: boolean;
    indexNow: IndexNowStatus;
    portrait: boolean;
    ogImage: boolean;
  };
};

const UNKNOWN = "unknown";

/**
 * Read a version from disk at request time rather than importing package.json
 * into the bundle. The versions then describe the running container rather
 * than the build that produced it. A missing file degrades to "unknown"
 * instead of a crash.
 */
async function packageVersion(packageDir: string): Promise<string> {
  try {
    const raw = await readFile(path.join(packageDir, "package.json"), "utf8");
    return (JSON.parse(raw) as { version?: string }).version ?? UNKNOWN;
  } catch {
    return UNKNOWN;
  }
}

async function modifiedAt(file: string): Promise<Date | null> {
  try {
    return (await stat(file)).mtime;
  } catch {
    return null;
  }
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Everything the admin dashboard shows about the running instance. */
export async function getSystemInfo(): Promise<SystemInfo> {
  const root = process.cwd();
  const dependency = (name: string) => packageVersion(path.join(root, "node_modules", name));
  const [
    version,
    next,
    prismaVersion,
    betterAuth,
    configModifiedAt,
    seeded,
    webhook,
    lastInquiry,
    spamFiltered,
  ] = await Promise.all([
    packageVersion(root),
    dependency("next"),
    dependency("@prisma/client"),
    dependency("better-auth"),
    modifiedAt(siteConfigPath()),
    getSetting(SEED_COMPLETED_KEY),
    getSetting(DISCORD_WEBHOOK_KEY),
    prisma.contactInquiry.findFirst({
      where: { spam: false },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.contactInquiry.count({ where: { spam: true } }),
  ]);
  const uptimeSeconds = Math.floor(process.uptime());

  return {
    version,
    build: { gitSha: process.env.GIT_SHA || null, builtAt: parseDate(process.env.BUILD_DATE) },
    runtime: {
      node: process.version,
      platform: `${process.platform}/${process.arch}`,
      startedAt: new Date(Date.now() - uptimeSeconds * 1000),
      uptimeSeconds,
    },
    frameworks: { next, prisma: prismaVersion, betterAuth },
    instance: {
      canonicalOrigin: getSiteConfig().site.canonicalOrigin,
      configModifiedAt,
      seededAt: parseDate(seeded),
      lastInquiryAt: lastInquiry?.createdAt ?? null,
      spamFiltered,
    },
    checks: {
      turnstile: turnstileSecretMode(),
      discordWebhook: Boolean(webhook),
      indexNow: indexNowStatus(),
      portrait: portraitExists(),
      ogImage: ogImageExists(),
    },
  };
}
