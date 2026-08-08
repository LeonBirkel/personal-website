import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { Container, PageHeader } from "@/components/register";
import { breadcrumbNode, graph } from "@/lib/jsonld";
import { pageAlternates } from "@/lib/metadata";
import { getSiteConfig } from "@/config/site-config";
import { renderMarkdown } from "@/lib/markdown";
import { projectLinks } from "@/lib/project-links";
import { listActiveProjects } from "@/services/projects";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { person, pageDescriptions } = getSiteConfig();
  return {
    title: "Projects",
    description: pageDescriptions.projects ?? `Projects by ${person.name}.`,
    alternates: pageAlternates("/projects"),
  };
}

export default async function ProjectsPage() {
  const projects = await listActiveProjects();

  return (
    <>
      <JsonLd
        data={graph(
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Projects", path: "/projects" },
          ]),
        )}
      />
      <PageHeader index="02" label="Projects" title="Projects" />
      <Container className="py-10 md:py-14">
        {projects.length === 0 ? (
          <p className="max-w-[65ch] text-muted">Nothing here yet.</p>
        ) : (
          <div className="space-y-14">
            {projects.map((project) => (
              <article
                key={project.id}
                aria-labelledby={`project-${project.slug}-heading`}
                className="scroll-mt-24"
                id={`project-${project.slug}`}
              >
                <h2 id={`project-${project.slug}-heading`} className="font-semibold">
                  {project.title}
                </h2>
                <p className="mt-1 max-w-[65ch] text-muted">{project.summary}</p>
                <div
                  className="prose-md mt-4"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(project.description) }}
                />
                {projectLinks(project).length > 0 ? (
                  <p className="mono-label mt-3 flex flex-wrap gap-x-5 gap-y-1">
                    {projectLinks(project).map(({ label, url }) => (
                      <a
                        key={url}
                        className="link-underline inline-block py-3 text-text"
                        href={url}
                        target="_blank"
                        rel="noopener"
                      >
                        {label}
                        <span aria-hidden="true"> ↗</span>
                      </a>
                    ))}
                  </p>
                ) : null}
                {project.techTags.length > 0 ? (
                  <p className="mono-label mt-2 text-muted">{project.techTags.join(" · ")}</p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
