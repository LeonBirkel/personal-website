import { prisma } from "@/lib/prisma";
import { Prisma, type NewsItem } from "@/generated/prisma/client";
import type { NewsInput } from "@/lib/validation";
import { afterContentMutation } from "@/services/revalidate";

/**
 * Several milestones share a date, and Postgres returns tied rows in whatever
 * order it likes, which can change after any write. The id breaks the tie so the
 * page, the feeds and the home-page selection stay in one order. Feed readers
 * treat a reshuffle as new items.
 */
const byDateThenId: Prisma.NewsItemOrderByWithRelationInput[] = [{ date: "desc" }, { id: "asc" }];

/** Everything, including hidden entries. Admin only. */
export async function listAllNews(): Promise<NewsItem[]> {
  return prisma.newsItem.findMany({ orderBy: byDateThenId });
}

/** Publicly visible entries. */
export async function listNews(): Promise<NewsItem[]> {
  return prisma.newsItem.findMany({ where: { active: true }, orderBy: byDateThenId });
}

/** Home-page selection. */
export async function listFeaturedNews(count: number): Promise<NewsItem[]> {
  return prisma.newsItem.findMany({
    where: { active: true, featured: true },
    orderBy: byDateThenId,
    take: count,
  });
}

export async function getNewsItemById(id: string): Promise<NewsItem | null> {
  return prisma.newsItem.findUnique({ where: { id } });
}

export async function createNewsItem(data: NewsInput): Promise<NewsItem> {
  const item = await prisma.newsItem.create({ data });
  await afterContentMutation(["/news", "/news/feed.xml", "/news/feed.json"]);
  return item;
}

export async function updateNewsItem(id: string, data: NewsInput): Promise<NewsItem> {
  const item = await prisma.newsItem.update({ where: { id }, data });
  await afterContentMutation(["/news", "/news/feed.xml", "/news/feed.json"]);
  return item;
}

export async function deleteNewsItem(id: string): Promise<void> {
  await prisma.newsItem.delete({ where: { id } });
  await afterContentMutation(["/news", "/news/feed.xml", "/news/feed.json"]);
}
