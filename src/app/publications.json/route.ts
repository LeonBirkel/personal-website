import { getSiteConfig } from "@/config/site-config";
import { absoluteUrl } from "@/lib/site";
import { listPublications } from "@/services/publications";

export const revalidate = 300;

export async function GET() {
  const publications = await listPublications();
  return Response.json({
    author: getSiteConfig().person.name,
    source: absoluteUrl("/publications"),
    publications: publications.map((pub) => ({
      title: pub.title,
      authors: pub.authors,
      venue: pub.venue,
      year: pub.year,
      conferenceTitle: pub.conferenceTitle,
      publisher: pub.publisher,
      firstPage: pub.firstPage,
      lastPage: pub.lastPage,
      doi: pub.doi,
      url: absoluteUrl(`/publications/${pub.slug}`),
      pdf: pub.pdfUrl ? absoluteUrl(pub.pdfUrl) : null,
      bibtex: absoluteUrl(`/publications/${pub.slug}.bib`),
    })),
  });
}
