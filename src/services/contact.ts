import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, type ContactInquiry } from "@/generated/prisma/client";
import { assessInquiry, messageFingerprint } from "@/lib/spam-score";
import type { ContactInput } from "@/lib/validation";
import { notifyInquiryReceived } from "@/services/notifications";

const MAX_INQUIRIES_PER_IP_PER_HOUR = 3;
const MAX_INQUIRIES_PER_EMAIL_PER_DAY = 3;
const MAX_NOTIFICATIONS_PER_HOUR = 30;

/**
 * Spam is stored so a false positive stays recoverable, but a flood from
 * rotating addresses must not fill the database. Past this many stored spam
 * rows in an hour, further spam is dropped. Legitimate mail is never affected,
 * because the cap is only consulted once a message has already scored as spam.
 */
const MAX_SPAM_STORED_PER_HOUR = 50;

/** A bot campaign replays one body for days, so the window is generous. */
const DUPLICATE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Enough repeats to be a pattern, few enough that a real follow-up is fine. */
const REPEAT_SENDER_THRESHOLD = 2;

const SERIALIZATION_RETRIES = 4;

export class RateLimitError extends Error {
  constructor() {
    super("Too many inquiries. Please try again later.");
    this.name = "RateLimitError";
  }
}

/**
 * Postgres aborts serialization losers with SQLSTATE 40001. Prisma surfaces
 * that as P2034 from inside the transaction, but the pg driver adapter can
 * also deliver it as a DriverAdapterError carrying the code in its cause.
 * Both mean the same thing: retry.
 */
function isSerializationConflict(error: unknown): boolean {
  let node: unknown = error;
  for (let depth = 0; depth < 5 && typeof node === "object" && node !== null; depth++) {
    if (node instanceof Prisma.PrismaClientKnownRequestError && node.code === "P2034") return true;
    const { code, originalCode, kind } = node as {
      code?: unknown;
      originalCode?: unknown;
      kind?: unknown;
    };
    if (code === "40001" || originalCode === "40001" || kind === "TransactionWriteConflict") {
      return true;
    }
    node = (node as { cause?: unknown }).cause;
  }
  return false;
}

/**
 * Per-IP limit (an absent/spoofable IP still counts against the shared
 * "unknown" bucket). Counting, scoring and the insert run in one serializable
 * transaction, so concurrent submissions cannot all read the pre-insert state
 * and all pass. Postgres aborts the losers (P2034), which retry and then count
 * correctly.
 *
 * Scoring decides where the message lands, never whether it is accepted. Spam
 * is filed out of the inbox and notifies nobody, so a misjudged message is
 * still there to recover. The notification cap counts only messages that
 * passed as legitimate, so a spam flood can no longer silence the alert for
 * real mail.
 */
export async function createInquiry(
  data: ContactInput,
  ip: string | null,
  honeypotTripped: boolean,
): Promise<void> {
  const bucket = ip ?? "unknown";
  const now = Date.now();
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
  const duplicatesSince = new Date(now - DUPLICATE_WINDOW_MS);
  const messageHash = messageFingerprint(data.message);

  let notify = false;
  for (let attempt = 1; ; attempt++) {
    try {
      notify = await prisma.$transaction(
        async (tx) => {
          const [perIp, perEmail, duplicates, spamStored, legitimateThisHour] = await Promise.all([
            tx.contactInquiry.count({ where: { ip: bucket, createdAt: { gte: oneHourAgo } } }),
            tx.contactInquiry.count({
              where: { email: data.email, createdAt: { gte: oneDayAgo } },
            }),
            tx.contactInquiry.count({
              where: { messageHash, createdAt: { gte: duplicatesSince } },
            }),
            tx.contactInquiry.count({
              where: { spam: true, createdAt: { gte: oneHourAgo } },
            }),
            tx.contactInquiry.count({
              where: { spam: false, createdAt: { gte: oneHourAgo } },
            }),
          ]);
          if (perIp >= MAX_INQUIRIES_PER_IP_PER_HOUR) throw new RateLimitError();

          const assessment = assessInquiry(data, {
            honeypotTripped,
            duplicateOfRecent: duplicates > 0,
            repeatSender: perEmail >= REPEAT_SENDER_THRESHOLD,
          });
          const row = {
            ...data,
            ip: bucket,
            messageHash,
            spam: assessment.spam,
            spamScore: assessment.score,
            spamReasons: assessment.reasons.join("; ") || null,
          };

          if (assessment.spam) {
            if (spamStored < MAX_SPAM_STORED_PER_HOUR)
              await tx.contactInquiry.create({ data: row });
            return false;
          }

          if (perEmail >= MAX_INQUIRIES_PER_EMAIL_PER_DAY) throw new RateLimitError();
          await tx.contactInquiry.create({ data: row });
          return legitimateThisHour < MAX_NOTIFICATIONS_PER_HOUR;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      break;
    } catch (error) {
      if (error instanceof RateLimitError || !isSerializationConflict(error)) throw error;
      // A conflict that survives every retry only happens under concurrent
      // submission pressure, so the rate-limit answer is the honest one.
      if (attempt >= SERIALIZATION_RETRIES) throw new RateLimitError();
      await new Promise((resolve) => setTimeout(resolve, 25 * attempt));
    }
  }

  // Runs once the response is sent, so the visitor never waits on Discord.
  if (notify) after(() => notifyInquiryReceived(data));
}

/** The inbox. Spam is deliberately excluded, `listSpamInquiries` serves it. */
export async function listInquiries(): Promise<ContactInquiry[]> {
  return prisma.contactInquiry.findMany({
    where: { spam: false },
    orderBy: { createdAt: "desc" },
  });
}

export async function listSpamInquiries(): Promise<ContactInquiry[]> {
  return prisma.contactInquiry.findMany({
    where: { spam: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteInquiry(id: string): Promise<void> {
  await prisma.contactInquiry.delete({ where: { id } });
}

/** Bulk cleanup, because a campaign leaves more rows than anyone deletes by hand. */
export async function deleteAllSpamInquiries(): Promise<number> {
  const { count } = await prisma.contactInquiry.deleteMany({ where: { spam: true } });
  return count;
}

/** Recovers a misjudged message into the inbox. The score is kept for tuning. */
export async function markInquiryNotSpam(id: string): Promise<void> {
  await prisma.contactInquiry.update({ where: { id }, data: { spam: false } });
}
