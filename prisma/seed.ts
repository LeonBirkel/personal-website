import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { getSiteConfig } from "../src/config/site-config";
import type { SeedContent } from "../src/config/site-config-schema";
import { hashPassword } from "../src/lib/password";
import { SEED_COMPLETED_KEY } from "../src/lib/settings-keys";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Seeds the admin user and the seedContent section of site.config.json.
 *
 *   npm run seed                    force mode, upserts everything
 *   npx tsx prisma/seed.ts --if-needed   first-boot mode, exits once completed
 *
 * The Docker entrypoint runs --if-needed on every boot, so a fresh instance
 * gets its admin user and initial content without any manual step. Force mode
 * refreshes the prose of seeded projects and news, and never touches the
 * `active`/`featured` flags of existing rows: those are curation choices made
 * in the admin portal.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function seedAdminUser(name: string) {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("ADMIN_EMAIL / ADMIN_PASSWORD not set, skipping admin user seed");
    return;
  }

  // One admin user, ever. ADMIN_EMAIL / ADMIN_PASSWORD apply on first boot
  // only: keying on the email would silently create a second admin (with the
  // old credential still active) whenever the env value changes.
  const existingAdmin = await prisma.user.findFirst({ where: { role: "admin" } });
  if (existingAdmin) {
    if (existingAdmin.email !== email) {
      console.warn(
        `an admin user (${existingAdmin.email}) already exists. ` +
          `ADMIN_EMAIL / ADMIN_PASSWORD apply only on first boot and were ignored.`,
      );
    } else {
      console.log(`admin user ${email} already exists, skipping`);
    }
    return;
  }

  const userId = randomUUID();
  await prisma.user.create({
    data: {
      id: userId,
      name,
      email,
      emailVerified: true,
      role: "admin",
      accounts: {
        create: {
          id: randomUUID(),
          accountId: userId,
          providerId: "credential",
          password: await hashPassword(password),
        },
      },
    },
  });
  console.log(`created admin user ${email}`);
}

/** Curation flags stay with the admin portal: never restored from the seed on update. */
function withoutFlags<T extends { active: boolean; featured: boolean }>(row: T) {
  const { active: _active, featured: _featured, ...content } = row;
  return content;
}

async function seedPublications(publications: SeedContent["publications"]) {
  for (const publication of publications) {
    // Existing rows are left untouched so admin edits to a publication survive
    // a manual re-seed.
    await prisma.publication.upsert({
      where: { slug: publication.slug },
      update: {},
      create: publication,
    });
  }
  console.log(`seeded ${publications.length} publication(s)`);
}

async function seedProjects(projects: SeedContent["projects"]) {
  for (const project of projects) {
    // Re-seeding refreshes the prose, so a content fix in the config reaches a
    // database that already has the row. It deliberately leaves `active` and
    // `featured` alone on update: restoring them from the seed would silently
    // undo curation done in the admin portal.
    await prisma.project.upsert({
      where: { slug: project.slug },
      update: withoutFlags(project),
      create: project,
    });
  }
  console.log(`seeded ${projects.length} project(s)`);
}

async function seedNews(news: SeedContent["news"]) {
  for (const item of news) {
    // Same rule as projects: refresh the text, never the visibility flags.
    await prisma.newsItem.upsert({
      where: { id: item.id },
      update: withoutFlags(item),
      create: item,
    });
  }

  // Dropping an entry from the config has to remove it from the database as
  // well, or a retracted item survives every future deploy. Only ids carrying
  // the seed-news- prefix are eligible, so anything written in the admin
  // portal, which gets a generated cuid, is never at risk.
  const retracted = await prisma.newsItem.deleteMany({
    where: { id: { startsWith: "seed-news-", notIn: news.map((item) => item.id) } },
  });

  console.log(`seeded ${news.length} news item(s)`);
  if (retracted.count > 0) {
    const plural = retracted.count === 1 ? "item" : "items";
    console.log(`retracted ${retracted.count} seeded news ${plural} no longer in the config`);
  }
}

async function main() {
  const config = getSiteConfig();

  // The admin user seed is idempotent and self-healing, so it runs on every
  // boot: an instance that first booted without ADMIN_EMAIL set gets its
  // admin on the next boot after fixing the env.
  await seedAdminUser(config.person.name);

  if (process.argv.includes("--if-needed")) {
    const completed = await prisma.globalSettings.findUnique({
      where: { key: SEED_COMPLETED_KEY },
    });
    if (completed) {
      console.log(`content seed already completed at ${completed.value}, nothing to do`);
      return;
    }
  }

  const seed = config.seedContent;
  if (seed) {
    await seedPublications(seed.publications);
    await seedProjects(seed.projects);
    await seedNews(seed.news);
  } else {
    console.log("no seedContent in the site config, skipping content seed");
  }

  const now = new Date().toISOString();
  await prisma.globalSettings.upsert({
    where: { key: SEED_COMPLETED_KEY },
    update: { value: now },
    create: { key: SEED_COMPLETED_KEY, value: now },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
