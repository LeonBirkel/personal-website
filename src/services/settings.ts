import { prisma } from "@/lib/prisma";

export async function getSetting(key: string): Promise<string | null> {
  const row = await prisma.globalSettings.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.globalSettings.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function listSettings(): Promise<{ key: string; value: string }[]> {
  return prisma.globalSettings.findMany({ orderBy: { key: "asc" } });
}
