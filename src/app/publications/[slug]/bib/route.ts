import { bibtexFor, getPublicationBySlug } from "@/services/publications";

export const revalidate = 300;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pub = await getPublicationBySlug(slug);
  if (!pub) return new Response("Not found", { status: 404 });

  return new Response(`${bibtexFor(pub)}\n`, {
    headers: {
      "Content-Type": "application/x-bibtex; charset=utf-8",
      "Content-Disposition": `attachment; filename="${pub.slug}.bib"`,
    },
  });
}
