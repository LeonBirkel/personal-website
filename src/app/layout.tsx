import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSiteConfig, getSiteUrl } from "@/config/site-config";
import { frameworkTheme } from "@/config/theme";
import { baseGraphNodes, graph } from "@/lib/jsonld";
import { buildSharedOpenGraph, feedAlternateTypes } from "@/lib/metadata";
import { resolveOgImage } from "@/lib/portrait";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

// generateMetadata rather than a static export so the runtime config and a
// newly uploaded portrait are reflected on every ISR regeneration.
export async function generateMetadata(): Promise<Metadata> {
  const { person, affiliation } = getSiteConfig();
  const orgLabel = affiliation ? ` at ${affiliation.alternateName ?? affiliation.name}` : "";
  return {
    metadataBase: new URL(getSiteUrl()),
    title: {
      default: `${person.name}, ${person.jobTitle}${orgLabel}`,
      template: `%s | ${person.name}`,
    },
    description: person.description,
    robots: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
    openGraph: { ...buildSharedOpenGraph(), type: "website" },
    twitter: { card: resolveOgImage() ? "summary_large_image" : "summary" },
    alternates: { types: feedAlternateTypes },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: frameworkTheme.lightBg },
    { media: "(prefers-color-scheme: dark)", color: frameworkTheme.darkBg },
  ],
};

/** Instance accent colors override the globals.css defaults at runtime. */
function accentStyle(): string {
  const { accent, accentHover } = getSiteConfig().theme;
  return (
    `:root{--accent:${accent.light};--accent-hover:${accentHover.light}}` +
    `@media (prefers-color-scheme:dark){:root{--accent:${accent.dark};--accent-hover:${accentHover.dark}}}`
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="flex min-h-dvh flex-col bg-bg font-sans text-text">
        <style dangerouslySetInnerHTML={{ __html: accentStyle() }} />
        <a
          href="#main"
          className="mono-label sr-only bg-bg px-4 py-3 text-accent focus:not-sr-only focus:absolute focus:top-0 focus:left-0 focus:z-100"
        >
          Skip to content
        </a>
        <JsonLd data={graph(...baseGraphNodes())} />
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
