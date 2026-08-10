-- AlterTable
ALTER TABLE "ContactInquiry" ADD COLUMN     "messageHash" TEXT,
ADD COLUMN     "spam" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "spamReasons" TEXT,
ADD COLUMN     "spamScore" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "ContactInquiry_spam_createdAt_idx" ON "ContactInquiry"("spam", "createdAt");

-- CreateIndex
CREATE INDEX "ContactInquiry_email_createdAt_idx" ON "ContactInquiry"("email", "createdAt");

-- CreateIndex
CREATE INDEX "ContactInquiry_messageHash_createdAt_idx" ON "ContactInquiry"("messageHash", "createdAt");
