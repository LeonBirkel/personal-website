import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/register";
import { requireAdmin } from "@/lib/admin-session";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const ADMIN_NAV = [
  { label: "Dashboard", href: "/admin" },
  { label: "Publications", href: "/admin/publications" },
  { label: "Projects", href: "/admin/projects" },
  { label: "News", href: "/admin/news" },
  { label: "Inquiries", href: "/admin/inquiries" },
  { label: "Settings", href: "/admin/settings" },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <>
      <div className="border-t border-hairline bg-surface">
        <Container>
          <nav aria-label="Admin" className="flex flex-wrap items-center gap-x-5 py-2">
            {ADMIN_NAV.map(({ label, href }) => (
              <Link key={href} href={href} className="mono-label link-underline py-2 text-text">
                {label}
              </Link>
            ))}
            <span className="flex-1" />
            <SignOutButton />
          </nav>
        </Container>
      </div>
      {children}
    </>
  );
}
