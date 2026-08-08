import Link from "next/link";
import { Container, PageHeader } from "@/components/register";
import { listAllProjects } from "@/services/projects";
import { deleteProjectAction } from "./actions";
import { requireAdmin } from "@/lib/admin-session";

export default async function AdminProjectsPage() {
  await requireAdmin();
  const projects = await listAllProjects();

  return (
    <>
      <PageHeader index="00" label="Admin" title="Projects" />
      <Container className="py-8">
        <p className="mono-label">
          <Link className="link-underline text-text" href="/admin/projects/new">
            + New project
          </Link>
        </p>
        <ul className="mt-8 space-y-4">
          {projects.map((project) => (
            <li
              key={project.id}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-hairline pb-4"
            >
              <span className="mono-label text-muted">#{project.order}</span>
              <span className="min-w-0 flex-1 font-medium">{project.title}</span>
              {!project.active ? <span className="mono-label text-muted">Hidden</span> : null}
              {project.featured ? <span className="mono-label text-accent">Featured</span> : null}
              <Link
                className="mono-label link-underline text-text"
                href={`/admin/projects/${project.id}/edit`}
              >
                Edit
              </Link>
              <form action={deleteProjectAction}>
                <input type="hidden" name="id" value={project.id} />
                <button
                  type="submit"
                  className="mono-label link-underline cursor-pointer text-muted"
                >
                  Delete
                </button>
              </form>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
