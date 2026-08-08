import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { Container, LedgerRow, PageHeader } from "@/components/register";
import { blogPostingNode, breadcrumbNode, graph } from "@/lib/jsonld";
import { pageAlternates } from "@/lib/metadata";
import { getSiteConfig } from "@/config/site-config";
import { renderInlineMarkdown } from "@/lib/markdown";
import { formatDate, isoDate } from "@/lib/site";
import { listNews } from "@/services/news";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { person, pageDescriptions } = getSiteConfig();
  return {
    title: "News",
    description:
      pageDescriptions.news ??
      `News from ${person.name}: publications, talks, and research updates.`,
    alternates: pageAlternates("/news"),
  };
}

export default async function NewsPage() {
  const news = await listNews();

  return (
    <>
      <JsonLd
        data={graph(
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "News", path: "/news" },
          ]),
          ...news.map(blogPostingNode),
        )}
      />
      <PageHeader index="03" label="News" title="News" />
      <Container className="py-10 md:py-14">
        {news.length === 0 ? (
          <p className="max-w-[65ch] text-muted">No news yet.</p>
        ) : (
          <div className="space-y-6">
            {news.map((item) => (
              <LedgerRow
                key={item.id}
                id={item.id}
                left={<time dateTime={isoDate(item.date)}>{formatDate(item.date)}</time>}
              >
                <p>
                  <span aria-hidden="true" className="mr-2">
                    {item.emoji}
                  </span>
                  <span
                    className="inline-md"
                    dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(item.text) }}
                  />
                </p>
              </LedgerRow>
            ))}
          </div>
        )}
        <p className="mono-label mt-14 text-muted">
          Subscribe:{" "}
          <a className="link-underline text-text" href="/news/feed.xml">
            RSS
          </a>{" "}
          ·{" "}
          <a className="link-underline text-text" href="/news/feed.json">
            JSON Feed
          </a>
        </p>
      </Container>
    </>
  );
}
