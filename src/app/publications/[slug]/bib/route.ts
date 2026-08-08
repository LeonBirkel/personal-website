import { getSiteConfig } from "@/config/site-config";
import { bibtexFor, getPublicPublicationBySlug, listPublications } from "@/services/publications";

export const revalidate = 300;

/** Prerenders every visible slug, so the revalidate window actually applies. */
export async function generateStaticParams() {
  const publications = await listPublications();
  return publications.map((pub) => ({ slug: pub.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pub = await getPublicPublicationBySlug(slug);
  if (!pub) return new Response("Not found", { status: 404 });

  // Fourth easter egg: a valid, parser-ignored @comment line, on the download
  // only, never in the BibTeX shown on the page. The config is the source.
  const eggComment = getSiteConfig().easterEggs?.bibComment;
  const body = eggComment ? `@comment{${eggComment}}\n${bibtexFor(pub)}\n` : `${bibtexFor(pub)}\n`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-bibtex; charset=utf-8",
      "Content-Disposition": `attachment; filename="${pub.slug}.bib"`,
    },
  });
}
