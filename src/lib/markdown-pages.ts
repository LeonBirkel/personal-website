import { getPersonSameAs, getSiteConfig } from "@/config/site-config";
import { absoluteUrl, isoDate } from "@/lib/site";
import { projectLinks } from "@/lib/project-links";
import { bibtexFor, listFeaturedPublications, listPublications } from "@/services/publications";
import { listActiveProjects, listFeaturedProjects } from "@/services/projects";
import { listFeaturedNews, listNews } from "@/services/news";
import type { NewsItem, Publication } from "@/generated/prisma/client";

/**
 * Markdown twins: every public page is also served as clean markdown at
 * <path>.md. Long-form fields are already stored as markdown, so the HTML
 * page and its twin render from one source.
 */

function publicationLine(pub: Publication): string {
  return `- [${pub.title}](${absoluteUrl(`/publications/${pub.slug}`)}.md). ${pub.authors.join(", ")}. ${pub.venue}, ${pub.year}.`;
}

function newsLine(item: NewsItem): string {
  return `- ${isoDate(item.date)} ${item.emoji} ${item.text}`;
}

export async function homeMarkdown(): Promise<string> {
  const { person, background, home } = getSiteConfig();
  const [featured, projects, news] = await Promise.all([
    listFeaturedPublications(),
    listFeaturedProjects(),
    listFeaturedNews(3),
  ]);
  const sections = [
    `# ${person.name}`,
    "",
    `${person.description}`,
    "",
    "## About",
    // The about paragraphs are the single bio source, shared with the home page.
    ...home.about.flatMap((paragraph) => ["", paragraph]),
    "",
    "## Background",
    "",
    ...background.experience.map((e) => `- ${e.period}: ${e.title}, ${e.org}`),
    "",
    "### Education",
    "",
    ...background.education.map((e) => `- ${e.period}: ${e.title}, ${e.org}`),
    "",
    "## Research topics",
    "",
    ...person.researchTopics.map((t) => `- ${t}`),
    "",
    "## Profiles",
    "",
    ...getPersonSameAs().map((url) => `- ${url}`),
    `- Contact: ${absoluteUrl("/contact")}`,
  ];
  if (projects.length > 0) {
    sections.push(
      "",
      "## Projects",
      "",
      ...projects.map((p) => `- **${p.title}**. ${p.summary}`),
      "",
      `Full descriptions: ${absoluteUrl("/projects.md")}`,
    );
  }
  if (featured.length > 0) {
    sections.push("", "## Selected publications", "", ...featured.map(publicationLine));
  }
  if (news.length > 0) {
    sections.push("", "## Recent news", "", ...news.map(newsLine));
  }
  return sections.join("\n");
}

export async function publicationsMarkdown(): Promise<string> {
  const publications = await listPublications();
  return [
    `# Publications by ${getSiteConfig().person.name}`,
    "",
    `Machine-readable list: ${absoluteUrl("/publications.json")}`,
    "",
    ...(publications.length === 0 ? ["No publications yet."] : publications.map(publicationLine)),
  ].join("\n");
}

export async function publicationMarkdown(pub: Publication): Promise<string> {
  const lines = [
    `# ${pub.title}`,
    "",
    `- Authors: ${pub.authors.join(", ")}`,
    `- Venue: ${pub.venue}`,
    `- Year: ${pub.year}`,
  ];
  if (pub.publisher) lines.push(`- Publisher: ${pub.publisher}`);
  if (pub.firstPage && pub.lastPage) lines.push(`- Pages: ${pub.firstPage}–${pub.lastPage}`);
  if (pub.doi) lines.push(`- DOI: [${pub.doi}](https://doi.org/${pub.doi})`);
  if (pub.pdfUrl) lines.push(`- PDF: ${absoluteUrl(pub.pdfUrl)}`);
  lines.push(`- BibTeX: ${absoluteUrl(`/publications/${pub.slug}.bib`)}`);
  if (pub.abstract) lines.push("", "## Abstract", "", pub.abstract);
  lines.push("", "## BibTeX", "", "```bibtex", bibtexFor(pub), "```");
  return lines.join("\n");
}

export async function projectsMarkdown(): Promise<string> {
  const projects = await listActiveProjects();
  const lines = [`# Projects by ${getSiteConfig().person.name}`, ""];
  for (const project of projects) {
    lines.push(`## ${project.title}`, "", `_${project.summary}_`, "", project.description, "");
    const links = projectLinks(project);
    if (links.length > 0) {
      lines.push(...links.map((l) => `- [${l.label}](${l.url})`), "");
    }
    if (project.techTags.length > 0) {
      lines.push(`Tech: ${project.techTags.join(", ")}`, "");
    }
  }
  return lines.join("\n").trimEnd();
}

export async function newsMarkdown(): Promise<string> {
  const news = await listNews();
  return [
    `# News from ${getSiteConfig().person.name}`,
    "",
    `Feeds: ${absoluteUrl("/news/feed.xml")} (RSS), ${absoluteUrl("/news/feed.json")} (JSON Feed)`,
    "",
    ...(news.length === 0 ? ["No news yet."] : news.map(newsLine)),
  ].join("\n");
}

export async function contactMarkdown(): Promise<string> {
  // The email address is deliberately absent from every machine-readable
  // surface. Humans find it (JavaScript-protected) on /contact.
  const { person, links } = getSiteConfig();
  return [
    `# Contact ${person.name}`,
    "",
    `- Contact form: ${absoluteUrl("/contact")}`,
    ...links.map((link) => `- ${link.label}: ${link.url}`),
  ].join("\n");
}

export async function llmsIndex(): Promise<string> {
  const { person } = getSiteConfig();
  return [
    `# ${person.name}`,
    "",
    `> ${person.description}`,
    "",
    "This site serves every public page as clean markdown: append `.md` to any path.",
    "",
    "## Pages",
    "",
    `- [Home / About](${absoluteUrl("/index.md")})`,
    `- [Publications](${absoluteUrl("/publications.md")})`,
    `- [Projects](${absoluteUrl("/projects.md")})`,
    `- [News](${absoluteUrl("/news.md")})`,
    `- [Contact](${absoluteUrl("/contact.md")})`,
    "",
    "## Machine-readable exports",
    "",
    `- [All content, concatenated](${absoluteUrl("/llms-full.txt")})`,
    `- [Publications JSON](${absoluteUrl("/publications.json")})`,
    `- [News RSS](${absoluteUrl("/news/feed.xml")})`,
    `- [News JSON Feed](${absoluteUrl("/news/feed.json")})`,
    `- Per-publication BibTeX: append \`.bib\` to a publication URL`,
  ].join("\n");
}

export async function llmsFull(): Promise<string> {
  const publications = await listPublications();
  const parts = [
    await homeMarkdown(),
    await publicationsMarkdown(),
    ...(await Promise.all(publications.map(publicationMarkdown))),
    await projectsMarkdown(),
    await newsMarkdown(),
    await contactMarkdown(),
  ];
  return parts.join("\n\n---\n\n");
}
