import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

// Without this the sitemap is baked once at build time (against the empty
// Docker build DB) and never refreshes.
export const revalidate = 300;
import { listPublications } from "@/services/publications";
import { listAllProjects } from "@/services/projects";
import { listNews } from "@/services/news";

function latest(dates: Date[]): Date | undefined {
  return dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [publications, projects, news] = await Promise.all([
    listPublications(),
    listAllProjects(),
    listNews(),
  ]);

  const allDates = [...publications, ...projects, ...news].map((x) => x.updatedAt);

  return [
    { url: absoluteUrl("/"), lastModified: latest(allDates), priority: 1 },
    {
      url: absoluteUrl("/publications"),
      lastModified: latest(publications.map((p) => p.updatedAt)),
      priority: 0.9,
    },
    ...publications.map((pub) => ({
      url: absoluteUrl(`/publications/${pub.slug}`),
      lastModified: pub.updatedAt,
      priority: 0.8,
    })),
    {
      url: absoluteUrl("/projects"),
      lastModified: latest(projects.map((p) => p.updatedAt)),
      priority: 0.7,
    },
    {
      url: absoluteUrl("/news"),
      lastModified: latest(news.map((n) => n.updatedAt)),
      priority: 0.6,
    },
    { url: absoluteUrl("/contact"), priority: 0.5 },
  ];
}
