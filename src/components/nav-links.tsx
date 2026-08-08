"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { index: "01", label: "Publications", href: "/publications" },
  { index: "02", label: "Projects", href: "/projects" },
  { index: "03", label: "News", href: "/news" },
  { index: "04", label: "Contact", href: "/contact" },
] as const;

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main">
      <ul className="flex items-center gap-4 md:gap-6">
        {NAV.map(({ index, label, href }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`mono-label link-underline inline-block py-3 ${
                  active ? "text-accent" : "text-text"
                }`}
              >
                <span className={`hidden sm:inline ${active ? "" : "text-muted"}`}>{index} </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
