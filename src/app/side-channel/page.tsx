import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, PageHeader } from "@/components/register";
import { getSiteConfig } from "@/config/site-config";
import { renderMarkdown } from "@/lib/markdown";

export const revalidate = 300;

/**
 * The second easter egg, reached by whoever reads the Disallow line in
 * robots.txt. It only exists when the instance opts in through
 * easterEggs.trap, and it 404s otherwise, so a bare framework never advertises
 * it. It is noindex on top of the robots Disallow, so it costs no crawl budget.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SideChannelPage() {
  const trap = getSiteConfig().easterEggs?.trap;
  if (!trap) notFound();

  return (
    <>
      <PageHeader index="99" label="Off the map" title="You read the robots file" />
      <Container className="py-8">
        <div
          className="prose-md max-w-[65ch]"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(trap.message) }}
        />
      </Container>
    </>
  );
}
