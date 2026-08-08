import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, type ContactInquiry } from "@/generated/prisma/client";
import type { ContactInput } from "@/lib/validation";
import { notifyInquiryReceived } from "@/services/notifications";

const MAX_INQUIRIES_PER_IP_PER_HOUR = 5;
const MAX_INQUIRIES_TOTAL_PER_HOUR = 30;
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
 * "unknown" bucket). Count and insert run in one serializable transaction, so
 * concurrent submissions cannot all read the pre-insert state and all pass.
 * Postgres aborts the losers (P2034), which retry and then count correctly.
 *
 * The global hourly cap degrades instead of denying: the inquiry is stored,
 * only the notification is skipped. Rejecting would let one flood silence the
 * site's only contact channel for everyone else.
 */
export async function createInquiry(data: ContactInput, ip: string | null): Promise<void> {
  const bucket = ip ?? "unknown";
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  let notify = true;
  for (let attempt = 1; ; attempt++) {
    try {
      notify = await prisma.$transaction(
        async (tx) => {
          const [perIp, total] = await Promise.all([
            tx.contactInquiry.count({ where: { ip: bucket, createdAt: { gte: oneHourAgo } } }),
            tx.contactInquiry.count({ where: { createdAt: { gte: oneHourAgo } } }),
          ]);
          if (perIp >= MAX_INQUIRIES_PER_IP_PER_HOUR) throw new RateLimitError();
          await tx.contactInquiry.create({ data: { ...data, ip: bucket } });
          return total < MAX_INQUIRIES_TOTAL_PER_HOUR;
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

export async function listInquiries(): Promise<ContactInquiry[]> {
  return prisma.contactInquiry.findMany({ orderBy: { createdAt: "desc" } });
}

export async function deleteInquiry(id: string): Promise<void> {
  await prisma.contactInquiry.delete({ where: { id } });
}
