import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { Container, PageHeader } from "@/components/register";
import { breadcrumbNode, graph, scholarlyArticleNode } from "@/lib/jsonld";
import { buildSharedOpenGraph, pageAlternates } from "@/lib/metadata";
import { renderMarkdown } from "@/lib/markdown";
import { absoluteUrl } from "@/lib/site";
import { bibtexFor, getPublicPublicationBySlug, listPublications } from "@/services/publications";

export const revalidate = 300;

export async function generateStaticParams() {
  const publications = await listPublications();
  return publications.map((pub) => ({ slug: pub.slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const pub = await getPublicPublicationBySlug(slug);
  if (!pub) return {};

  // Google Scholar (Highwire) tags alongside standard metadata.
  const citation: Record<string, string | string[]> = {
    citation_title: pub.title,
    citation_author: [...pub.authors],
    citation_publication_date: String(pub.year),
  };
  if (pub.conferenceTitle) citation.citation_conference_title = pub.conferenceTitle;
  if (pub.publisher) citation.citation_publisher = pub.publisher;
  if (pub.firstPage) citation.citation_firstpage = String(pub.firstPage);
  if (pub.lastPage) citation.citation_lastpage = String(pub.lastPage);
  if (pub.doi) citation.citation_doi = pub.doi;
  if (pub.pdfUrl) citation.citation_pdf_url = absoluteUrl(pub.pdfUrl);

  return {
    title: pub.title,
    description: `${pub.title}. ${pub.authors.join(", ")}. ${pub.venue}, ${pub.year}.`,
    alternates: pageAlternates(`/publications/${pub.slug}`),
    openGraph: { ...buildSharedOpenGraph(), type: "article", title: pub.title },
    other: citation,
  };
}

export default async function PublicationPage({ params }: Params) {
  const { slug } = await params;
  const pub = await getPublicPublicationBySlug(slug);
  if (!pub) notFound();

  const meta: { label: string; value: React.ReactNode }[] = [
    { label: "Authors", value: pub.authors.join(", ") },
    { label: "Venue", value: pub.venue },
    { label: "Year", value: String(pub.year) },
  ];
  if (pub.publisher) meta.push({ label: "Publisher", value: pub.publisher });
  if (pub.firstPage && pub.lastPage) {
    meta.push({ label: "Pages", value: `${pub.firstPage}–${pub.lastPage}` });
  }
  if (pub.doi) {
    meta.push({
      label: "DOI",
      value: (
        <a
          className="link-underline underline decoration-accent underline-offset-3"
          href={`https://doi.org/${pub.doi}`}
          target="_blank"
          rel="noopener"
        >
          {pub.doi}
          <span aria-hidden="true"> ↗</span>
        </a>
      ),
    });
  }
  if (pub.pdfUrl) {
    meta.push({
      label: "PDF",
      value: (
        <a
          className="link-underline underline decoration-accent underline-offset-3"
          href={pub.pdfUrl}
        >
          Download<span aria-hidden="true"> ↗</span>
        </a>
      ),
    });
  }

  return (
    <>
      <JsonLd
        data={graph(
          scholarlyArticleNode(pub),
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Publications", path: "/publications" },
            { name: pub.title, path: `/publications/${pub.slug}` },
          ]),
        )}
      />
      <PageHeader index="01" label="Publication" title={pub.title} />
      <Container className="py-8 md:py-10">
        <dl className="max-w-[65ch] space-y-3">
          {meta.map(({ label, value }) => (
            <div key={label} className="grid gap-y-0.5 md:grid-cols-[160px_1fr] md:gap-x-10">
              <dt className="mono-label pt-0.5 text-muted">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        {pub.abstract ? (
          <section aria-labelledby="abstract-heading" className="mt-12">
            <h2 id="abstract-heading" className="mono-label text-muted">
              Abstract
            </h2>
            <div
              className="prose-md mt-3"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(pub.abstract) }}
            />
          </section>
        ) : null}

        <section aria-labelledby="bibtex-heading" className="mt-12">
          <h2 id="bibtex-heading" className="mono-label text-muted">
            BibTeX
          </h2>
          <pre className="mt-3 overflow-x-auto border border-hairline bg-surface p-4 font-mono text-[0.8125rem] leading-relaxed">
            {bibtexFor(pub)}
          </pre>
          <p className="mono-label mt-3">
            <a className="link-underline text-text" href={`/publications/${pub.slug}.bib`}>
              Download .bib
            </a>
          </p>
        </section>
      </Container>
    </>
  );
}
