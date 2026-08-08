import { revalidatePath } from "next/cache";
import { pingIndexNow } from "@/services/indexnow";
import { listPublications } from "@/services/publications";

/** Machine-readable twins that must refresh together with their HTML page. */
function derivedPaths(path: string): string[] {
  const derived = [path === "/" ? "/md/index" : `/md${path}`];
  if (/^\/publications\/[^/]+$/.test(path)) derived.push(`${path}/bib`);
  if (path === "/publications") derived.push("/publications.json");
  return derived;
}

/** Refresh the ISR cache for the given pages plus all derived representations. */
function revalidateWithDerived(pages: string[]): void {
  const affected = [
    ...new Set([
      ...pages,
      ...pages.flatMap(derivedPaths),
      "/sitemap.xml",
      "/llms.txt",
      "/llms-full.txt",
    ]),
  ];
  for (const path of affected) {
    revalidatePath(path);
  }
}

/**
 * Every content mutation funnels through here: refresh the affected pages and
 * ping IndexNow.
 */
export async function afterContentMutation(paths: string[]): Promise<void> {
  const pages = [...new Set(["/", ...paths])];
  revalidateWithDerived(pages);
  await pingIndexNow(pages);
}

/**
 * Invalidate every public page. The Docker entrypoint calls this once per
 * boot (via /api/internal/revalidate): the image ships pages prerendered
 * against the example config and an empty database, and those entries must
 * never be served regardless of how recently the image was built. No
 * IndexNow ping: booting is not a content change.
 */
export async function revalidateEverything(): Promise<void> {
  // The layout-level flush covers every page under the root layout, including
  // routes no enumeration would list, such as the prerendered 404 page.
  revalidatePath("/", "layout");
  const publications = await listPublications();
  revalidateWithDerived([
    "/",
    "/publications",
    "/projects",
    "/news",
    "/contact",
    ...publications.map((pub) => `/publications/${pub.slug}`),
  ]);
  for (const path of [
    "/news/feed.xml",
    "/news/feed.json",
    "/robots.txt",
    "/manifest.webmanifest",
    "/icon",
    "/apple-icon",
    "/favicon.ico",
  ]) {
    revalidatePath(path);
  }
}
