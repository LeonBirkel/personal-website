import { prisma } from "@/lib/prisma";
import type { Publication } from "@/generated/prisma/client";
import type { PublicationInput } from "@/lib/validation";
import { afterContentMutation } from "@/services/revalidate";

/** Validated input with optional fields resolved to explicit null (clears values on update). */
export type PublicationData = Omit<
  PublicationInput,
  | "conferenceTitle"
  | "publisher"
  | "firstPage"
  | "lastPage"
  | "doi"
  | "pdfUrl"
  | "abstract"
  | "bibtex"
> & {
  conferenceTitle?: string | null;
  publisher?: string | null;
  firstPage?: number | null;
  lastPage?: number | null;
  doi?: string | null;
  pdfUrl?: string | null;
  abstract?: string | null;
  bibtex?: string | null;
};

const BY_YEAR = [{ year: "desc" as const }, { createdAt: "desc" as const }];

/** Everything, including hidden entries. Admin only. */
export async function listAllPublications(): Promise<Publication[]> {
  return prisma.publication.findMany({ orderBy: BY_YEAR });
}

/** Publicly visible entries. */
export async function listPublications(): Promise<Publication[]> {
  return prisma.publication.findMany({ where: { active: true }, orderBy: BY_YEAR });
}

/** Home-page selection. */
export async function listFeaturedPublications(): Promise<Publication[]> {
  return prisma.publication.findMany({
    where: { active: true, featured: true },
    orderBy: BY_YEAR,
  });
}

/**
 * Public detail lookup. Filters on `active` like every list surface, so
 * unchecking "Active" hides a paper from its detail page, BibTeX and markdown
 * twin as well, not only from the lists. Admin lookups go by id.
 */
export async function getPublicPublicationBySlug(slug: string): Promise<Publication | null> {
  return prisma.publication.findFirst({ where: { slug, active: true } });
}

export async function getPublicationById(id: string): Promise<Publication | null> {
  return prisma.publication.findUnique({ where: { id } });
}

export async function createPublication(data: PublicationData): Promise<Publication> {
  const publication = await prisma.publication.create({ data });
  await afterContentMutation(["/publications", `/publications/${publication.slug}`]);
  return publication;
}

export async function updatePublication(id: string, data: PublicationData): Promise<Publication> {
  const before = await prisma.publication.findUniqueOrThrow({ where: { id } });
  const publication = await prisma.publication.update({ where: { id }, data });
  const paths = ["/publications", `/publications/${publication.slug}`];
  if (before.slug !== publication.slug) paths.push(`/publications/${before.slug}`);
  await afterContentMutation(paths);
  return publication;
}

export async function deletePublication(id: string): Promise<void> {
  const publication = await prisma.publication.delete({ where: { id } });
  await afterContentMutation(["/publications", `/publications/${publication.slug}`]);
}

/** BibTeX shown on the site: stored value if present, otherwise generated from fields. */
export function bibtexFor(pub: Publication): string {
  if (pub.bibtex) return pub.bibtex;
  const firstAuthorLastName = (pub.authors[0] ?? "unknown").split(" ").at(-1)?.toLowerCase();
  const key = `${firstAuthorLastName}${pub.year}${pub.slug.split("-")[0]}`;
  const lines = [
    `@inproceedings{${key},`,
    `  author    = {${pub.authors.join(" and ")}},`,
    `  title     = {${pub.title}},`,
    `  booktitle = {${pub.venue}},`,
    `  year      = {${pub.year}},`,
  ];
  if (pub.firstPage && pub.lastPage)
    lines.push(`  pages     = {${pub.firstPage}--${pub.lastPage}},`);
  if (pub.publisher) lines.push(`  publisher = {${pub.publisher}},`);
  if (pub.doi) lines.push(`  doi       = {${pub.doi}},`);
  lines.push("}");
  return lines.join("\n");
}
