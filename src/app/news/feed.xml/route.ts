import { getSiteConfig } from "@/config/site-config";
import { stripInlineMarkdown } from "@/lib/markdown";
import { absoluteUrl } from "@/lib/site";
import { listNews } from "@/services/news";

export const revalidate = 300;

function xmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function GET() {
  const { person } = getSiteConfig();
  const news = await listNews();
  const items = news
    .map((item) => {
      const link = absoluteUrl(`/news#${item.id}`);
      return [
        "    <item>",
        `      <title>${xmlEscape(`${item.emoji} ${stripInlineMarkdown(item.text)}`)}</title>`,
        `      <link>${link}</link>`,
        `      <guid isPermaLink="false">${item.id}</guid>`,
        `      <pubDate>${item.date.toUTCString()}</pubDate>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>News from ${xmlEscape(person.name)}</title>
    <link>${absoluteUrl("/news")}</link>
    <description>News from ${xmlEscape(person.name)}: publications, talks, and research updates.</description>
    <language>en</language>
    <atom:link href="${absoluteUrl("/news/feed.xml")}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
