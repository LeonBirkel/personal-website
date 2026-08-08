import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { ObfuscatedEmail } from "@/components/obfuscated-email";
import { Container, PageHeader } from "@/components/register";
import { getSiteConfig } from "@/config/site-config";
import { breadcrumbNode, graph } from "@/lib/jsonld";
import { renderInlineMarkdown } from "@/lib/markdown";
import { pageAlternates } from "@/lib/metadata";
import { ContactForm } from "./contact-form";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Contact",
    description: getSiteConfig().contact.metaDescription,
    alternates: pageAlternates("/contact"),
  };
}

/** Base64 + reversal so the plain address never appears in HTML or the RSC payload. */
function encodeEmail(email: string): string {
  return Buffer.from(email, "utf8").toString("base64").split("").reverse().join("");
}

export default function ContactPage() {
  const { person, contact, links } = getSiteConfig();
  const contactLinks = links.filter((link) => link.showOnContact);

  return (
    <>
      <JsonLd
        data={graph(
          breadcrumbNode([
            { name: "Home", path: "/" },
            { name: "Contact", path: "/contact" },
          ]),
        )}
      />
      <PageHeader index="04" label="Contact" title="Contact" />
      <Container className="py-10 md:py-14">
        <p
          className="md-inline max-w-[65ch]"
          dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(contact.blurb) }}
        />
        <div className="mt-8">
          <ContactForm siteKey={process.env.TURNSTILE_SITE_KEY ?? ""} />
        </div>

        {person.email ? (
          <>
            <h2 className="mono-label mt-14 text-muted">Prefer email?</h2>
            <p className="mt-4">
              <ObfuscatedEmail encoded={encodeEmail(person.email)} />
            </p>
          </>
        ) : null}
        {contactLinks.length > 0 ? (
          <p className="mono-label mt-6 flex flex-wrap gap-x-5 text-muted">
            {contactLinks.map((link) => (
              <a
                key={link.label}
                className="link-underline text-text"
                href={link.url}
                target="_blank"
                rel="me noopener"
              >
                {link.label}
                <span aria-hidden="true"> ↗</span>
              </a>
            ))}
          </p>
        ) : null}
      </Container>
    </>
  );
}
