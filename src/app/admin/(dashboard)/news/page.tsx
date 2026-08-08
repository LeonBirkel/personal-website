import Link from "next/link";
import { Container, PageHeader } from "@/components/register";
import { formatDate } from "@/lib/site";
import { listAllNews } from "@/services/news";
import { deleteNewsAction } from "./actions";
import { requireAdmin } from "@/lib/admin-session";

export default async function AdminNewsPage() {
  await requireAdmin();
  const news = await listAllNews();

  return (
    <>
      <PageHeader index="00" label="Admin" title="News" />
      <Container className="py-8">
        <p className="mono-label">
          <Link className="link-underline text-text" href="/admin/news/new">
            + New news item
          </Link>
        </p>
        <ul className="mt-8 space-y-4">
          {news.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-hairline pb-4"
            >
              <span className="mono-label text-muted">{formatDate(item.date)}</span>
              <span aria-hidden="true">{item.emoji}</span>
              <span className="min-w-0 flex-1">{item.text}</span>
              {!item.active ? <span className="mono-label text-muted">Hidden</span> : null}
              {item.featured ? <span className="mono-label text-accent">Featured</span> : null}
              <Link
                className="mono-label link-underline text-text"
                href={`/admin/news/${item.id}/edit`}
              >
                Edit
              </Link>
              <form action={deleteNewsAction}>
                <input type="hidden" name="id" value={item.id} />
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
