import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { Container, LedgerRow, PageHeader } from "@/components/register";
import { breadcrumbNode, graph } from "@/lib/jsonld";
import { abstractPreview } from "@/lib/markdown";
import { pageAlternates } from "@/lib/metadata";
import { getSiteConfig } from "@/config/site-config";
import { listPublications } from "@/services/publications";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { person, pageDescriptions } = getSiteConfig();
  return {
    title: "Publications",
    description: pageDescriptions.publications ?? `Publications by ${person.name}.`,
    alternates: pageAlternates("/publications"),
  };
}

export default async function PublicationsPage() {
  const publications = await listPublications();

  return (
    <>
      <JsonLd
        data={graph(
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Publications", path: "/publications" },
          ]),
        )}
      />
      <PageHeader index="01" label="Publications" title="Publications" />
      <Container className="py-10 md:py-14">
        {publications.length === 0 ? (
          <p className="max-w-[65ch] text-muted">No publications yet. The first is underway.</p>
        ) : (
          <div className="space-y-12">
            {publications.map((pub) => (
              <LedgerRow key={pub.id} left={String(pub.year)}>
                <h2 className="font-semibold">
                  <Link className="link-underline" href={`/publications/${pub.slug}`}>
                    {pub.title}
                  </Link>
                </h2>
                <p className="mt-1 text-muted">{pub.authors.join(", ")}</p>
                <p className="mono-label mt-2 text-muted">{pub.venue}</p>
                {pub.abstract ? (
                  <p className="mt-4 max-w-[65ch] text-muted">{abstractPreview(pub.abstract)}</p>
                ) : null}
              </LedgerRow>
            ))}
          </div>
        )}
        <p className="mono-label mt-14 text-muted">
          Also available as{" "}
          <a className="link-underline text-text" href="/publications.json">
            JSON
          </a>{" "}
          ·{" "}
          <a className="link-underline text-text" href="/publications.md">
            Markdown
          </a>
        </p>
      </Container>
    </>
  );
}
