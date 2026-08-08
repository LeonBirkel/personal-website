import { prisma } from "@/lib/prisma";
import type { ContactInquiry } from "@/generated/prisma/client";
import type { ContactInput } from "@/lib/validation";

const MAX_INQUIRIES_PER_IP_PER_HOUR = 5;
const MAX_INQUIRIES_TOTAL_PER_HOUR = 30;

export class RateLimitError extends Error {
  constructor() {
    super("Too many inquiries. Please try again later.");
    this.name = "RateLimitError";
  }
}

/**
 * Per-IP limit (an absent/spoofable IP still counts against the shared
 * "unknown" bucket) plus a global hourly cap as a backstop against header
 * spoofing when the app is not behind Cloudflare.
 */
export async function createInquiry(data: ContactInput, ip: string | null): Promise<void> {
  const bucket = ip ?? "unknown";
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [perIp, total] = await Promise.all([
    prisma.contactInquiry.count({ where: { ip: bucket, createdAt: { gte: oneHourAgo } } }),
    prisma.contactInquiry.count({ where: { createdAt: { gte: oneHourAgo } } }),
  ]);
  if (perIp >= MAX_INQUIRIES_PER_IP_PER_HOUR || total >= MAX_INQUIRIES_TOTAL_PER_HOUR) {
    throw new RateLimitError();
  }
  await prisma.contactInquiry.create({ data: { ...data, ip: bucket } });
}

export async function listInquiries(): Promise<ContactInquiry[]> {
  return prisma.contactInquiry.findMany({ orderBy: { createdAt: "desc" } });
}

export async function deleteInquiry(id: string): Promise<void> {
  await prisma.contactInquiry.delete({ where: { id } });
}
