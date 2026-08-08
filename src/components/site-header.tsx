import Link from "next/link";
import { NavLinks } from "@/components/nav-links";
import { getInitials, getSiteConfig } from "@/config/site-config";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-bg">
      <div className="mx-auto flex h-14 max-w-(--container-max) items-center justify-between px-6 md:px-10">
        <Link href="/" className="mono-label link-underline py-3 text-text">
          <span className="hidden min-[480px]:inline">{getSiteConfig().person.name}</span>
          <span className="min-[480px]:hidden">{getInitials()}</span>
        </Link>
        <NavLinks />
      </div>
    </header>
  );
}
