import { getSiteConfig } from "@/config/site-config";
import { stripInlineMarkdown } from "@/lib/markdown";
import { absoluteUrl } from "@/lib/site";
import { listNews } from "@/services/news";

export const revalidate = 300;

export async function GET() {
  const { person } = getSiteConfig();
  const news = await listNews();
  const feed = {
    version: "https://jsonfeed.org/version/1.1",
    title: `News from ${person.name}`,
    home_page_url: absoluteUrl("/news"),
    feed_url: absoluteUrl("/news/feed.json"),
    description: `News from ${person.name}: publications, talks, and research updates.`,
    language: "en",
    authors: [{ name: person.name, url: absoluteUrl("/") }],
    items: news.map((item) => ({
      id: item.id,
      url: absoluteUrl(`/news#${item.id}`),
      content_text: `${item.emoji} ${stripInlineMarkdown(item.text)}`,
      date_published: item.date.toISOString(),
      date_modified: item.updatedAt.toISOString(),
    })),
  };

  return Response.json(feed, {
    headers: { "Content-Type": "application/feed+json; charset=utf-8" },
  });
}
