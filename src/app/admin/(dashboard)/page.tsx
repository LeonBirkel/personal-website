import Link from "next/link";
import { Container, PageHeader } from "@/components/register";
import { requireAdmin } from "@/lib/admin-session";
import { dashboardCounts } from "@/services/stats";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const counts = await dashboardCounts();

  const cards = [
    { label: "Publications", count: counts.publications, href: "/admin/publications" },
    { label: "Projects", count: counts.projects, href: "/admin/projects" },
    { label: "News items", count: counts.news, href: "/admin/news" },
    { label: "Inquiries", count: counts.inquiries, href: "/admin/inquiries" },
  ];

  return (
    <>
      <PageHeader index="00" label="Admin" title="Dashboard" />
      <Container className="py-10">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ label, count, href }) => (
            <li key={href} className="border border-hairline bg-surface p-5">
              <Link href={href} className="block">
                <p className="text-3xl font-semibold tabular-nums">{count}</p>
                <p className="mono-label mt-1 text-muted">{label}</p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mono-label mt-10 text-muted">
          <Link className="link-underline text-text" href="/">
            View site →
          </Link>
        </p>
      </Container>
    </>
  );
}
