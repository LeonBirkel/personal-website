import { prisma } from "@/lib/prisma";

export type DashboardCounts = {
  publications: number;
  projects: number;
  news: number;
  inquiries: number;
};

export async function dashboardCounts(): Promise<DashboardCounts> {
  const [publications, projects, news, inquiries] = await Promise.all([
    prisma.publication.count(),
    prisma.project.count(),
    prisma.newsItem.count(),
    prisma.contactInquiry.count(),
  ]);
  return { publications, projects, news, inquiries };
}
