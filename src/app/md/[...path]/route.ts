import {
  contactMarkdown,
  homeMarkdown,
  newsMarkdown,
  projectsMarkdown,
  publicationMarkdown,
  publicationsMarkdown,
} from "@/lib/markdown-pages";
import { getPublicationBySlug } from "@/services/publications";

export const revalidate = 300;

/** Serves the markdown twin of each public page. Reached via the proxy rewrite of <path>.md. */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const markdown = await resolveMarkdown(path);
  if (markdown === null) return new Response("Not found", { status: 404 });

  return new Response(markdown, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}

async function resolveMarkdown(path: string[]): Promise<string | null> {
  const [head, ...rest] = path;
  if (head === "index" && rest.length === 0) return homeMarkdown();
  if (head === "publications" && rest.length === 0) return publicationsMarkdown();
  if (head === "publications" && rest.length === 1) {
    const pub = await getPublicationBySlug(rest[0]);
    return pub ? publicationMarkdown(pub) : null;
  }
  if (head === "projects" && rest.length === 0) return projectsMarkdown();
  if (head === "news" && rest.length === 0) return newsMarkdown();
  if (head === "contact" && rest.length === 0) return contactMarkdown();
  return null;
}
