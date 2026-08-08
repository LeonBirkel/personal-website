import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Wipes all content rows so `npm run seed` can repopulate from scratch.
 * Auth tables (user/session/account) and the migration history are left
 * intact, so the admin stays logged in. Content only — but still
 * destructive: never point this at production.
 */
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const [news, projects, publications, inquiries, settings] = await prisma.$transaction([
    prisma.newsItem.deleteMany(),
    prisma.project.deleteMany(),
    prisma.publication.deleteMany(),
    prisma.contactInquiry.deleteMany(),
    prisma.globalSettings.deleteMany(),
  ]);
  console.log(
    `cleared content — news: ${news.count}, projects: ${projects.count}, ` +
      `publications: ${publications.count}, inquiries: ${inquiries.count}, settings: ${settings.count}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
