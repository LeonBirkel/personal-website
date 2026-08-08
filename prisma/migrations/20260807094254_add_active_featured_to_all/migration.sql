-- AlterTable
ALTER TABLE "NewsItem" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Publication" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- Backfill: everything already stored was visible on the home page before this
-- migration, so keep it featured. New rows default to featured = false.
UPDATE "Project" SET "featured" = true;
UPDATE "NewsItem" SET "featured" = true;
