import Link from "next/link";
import { Container, PageHeader } from "@/components/register";
import { listAllPublications } from "@/services/publications";
import { deletePublicationAction } from "./actions";
import { requireAdmin } from "@/lib/admin-session";

export default async function AdminPublicationsPage() {
  await requireAdmin();
  const publications = await listAllPublications();

  return (
    <>
      <PageHeader index="00" label="Admin" title="Publications" />
      <Container className="py-8">
        <p className="mono-label">
          <Link className="link-underline text-text" href="/admin/publications/new">
            + New publication
          </Link>
        </p>
        <ul className="mt-8 space-y-4">
          {publications.map((pub) => (
            <li
              key={pub.id}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-hairline pb-4"
            >
              <span className="mono-label text-muted">{pub.year}</span>
              <span className="min-w-0 flex-1 font-medium">{pub.title}</span>
              {!pub.active ? <span className="mono-label text-muted">Hidden</span> : null}
              {pub.featured ? <span className="mono-label text-accent">Featured</span> : null}
              <Link
                className="mono-label link-underline text-text"
                href={`/admin/publications/${pub.id}/edit`}
              >
                Edit
              </Link>
              <form action={deletePublicationAction}>
                <input type="hidden" name="id" value={pub.id} />
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
