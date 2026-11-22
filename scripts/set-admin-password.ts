import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/password";
import { PrismaClient } from "../src/generated/prisma/client";

/**
 * Sets a new password for the single admin user and signs out every open
 * admin session. ADMIN_PASSWORD in .env applies on first boot only, and the
 * admin portal has no password form, so this is the supported way to change
 * it later. The password is read from NEW_ADMIN_PASSWORD, never from argv,
 * so it stays out of the process list. A distinct name keeps the container's
 * first-boot ADMIN_PASSWORD from being applied by accident.
 *
 *   read -rsp 'New admin password: ' NEW_ADMIN_PASSWORD; echo; export NEW_ADMIN_PASSWORD
 *   docker compose exec -e NEW_ADMIN_PASSWORD app npx tsx scripts/set-admin-password.ts
 */

const MIN_PASSWORD_LENGTH = 12;

async function main() {
  const password = process.env.NEW_ADMIN_PASSWORD ?? "";
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Set NEW_ADMIN_PASSWORD to at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const admin = await prisma.user.findFirst({ where: { role: "admin" } });
    if (!admin) {
      console.error(
        "No admin user exists yet. The first boot creates it from ADMIN_EMAIL and ADMIN_PASSWORD.",
      );
      process.exitCode = 1;
      return;
    }

    const updated = await prisma.account.updateMany({
      where: { userId: admin.id, providerId: "credential" },
      data: { password: await hashPassword(password) },
    });
    if (updated.count === 0) {
      console.error(`The admin user ${admin.email} has no password login to update.`);
      process.exitCode = 1;
      return;
    }

    const signedOut = await prisma.session.deleteMany({ where: { userId: admin.id } });
    console.log(
      `Password updated for ${admin.email}. Signed out ${signedOut.count} open session(s).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
