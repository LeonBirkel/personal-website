-- AlterTable
-- Added via a temporary default so the migration also applies to databases
-- that already hold projects; the column stays required afterwards.
ALTER TABLE "Project" ADD COLUMN "summary" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Project" ALTER COLUMN "summary" DROP DEFAULT;
