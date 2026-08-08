import { getHexName, getSiteConfig } from "@/config/site-config";

export function SiteFooter() {
  const { person } = getSiteConfig();
  const copyrightSuffix = person.location ? ` · ${person.location.city}` : "";
  return (
    <footer className="mt-24">
      {/* The uppercased name as ASCII hex, the site's one ornament. */}
      <p
        aria-hidden="true"
        className="mono-label overflow-hidden pb-3 text-center whitespace-nowrap text-muted opacity-60"
      >
        {getHexName()}
      </p>
      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-(--container-max) flex-col gap-2 px-6 py-6 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between md:px-10">
          <p className="mono-label text-muted">
            © {new Date().getFullYear()} {person.name}
            {copyrightSuffix}
          </p>
          <p className="mono-label flex flex-wrap gap-x-5 text-muted">
            <a className="link-underline inline-block py-3" href="/news/feed.xml">
              RSS
            </a>
            <a className="link-underline inline-block py-3" href="/llms.txt">
              llms.txt
            </a>
            <a className="link-underline inline-block py-3" href="/admin">
              Admin
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
