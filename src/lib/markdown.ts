import { marked } from "marked";

marked.use({ gfm: true, breaks: false });

/**
 * Long-form content is stored as markdown (single trusted admin author) so the
 * HTML page and its .md mirror render from one source.
 */
export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false });
}

export function renderInlineMarkdown(md: string): string {
  return marked.parseInline(md, { async: false });
}

/**
 * First paragraph of an abstract, trimmed at a word boundary. The publications
 * list stays scannable while the full abstract lives on the detail page.
 */
export function abstractPreview(abstract: string, maxChars = 280): string {
  const firstParagraph = stripInlineMarkdown(abstract.split(/\n\s*\n/)[0].trim());
  if (firstParagraph.length <= maxChars) return firstParagraph;
  const cut = firstParagraph.slice(0, maxChars);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[.,;:]$/, "")}…`;
}

/** Plain text for RSS titles and JSON Feed content_text. No markdown syntax leaks. */
export function stripInlineMarkdown(md: string): string {
  return md
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(.*?)\1/g, "$2")
    .replace(/`([^`]*)`/g, "$1");
}
