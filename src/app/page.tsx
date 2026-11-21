import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { Container, LedgerRow, RegisterRule } from "@/components/register";
import { getSiteConfig } from "@/config/site-config";
import { graph, profilePageNode } from "@/lib/jsonld";
import { buildSharedOpenGraph, pageAlternates } from "@/lib/metadata";
import { portraitExists } from "@/lib/portrait";
import { formatDate, isoDate } from "@/lib/site";
import { renderInlineMarkdown } from "@/lib/markdown";
import { listFeaturedPublications } from "@/services/publications";
import { listFeaturedProjects } from "@/services/projects";
import { listFeaturedNews } from "@/services/news";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return {
    alternates: pageAlternates("/"),
    openGraph: { ...buildSharedOpenGraph(), type: "profile" },
  };
}

/** Hero link row: the configured links plus the internal contact entry. */
function metaLinks() {
  return [
    ...getSiteConfig().links.map((link) => ({ label: link.label, href: link.url, external: true })),
    { label: "Contact", href: "/contact", external: false },
  ];
}

/** Derived first sentence of the hero paragraph. Empty without an affiliation. */
function heroIntro(): string {
  const { person, affiliation } = getSiteConfig();
  if (!affiliation) return "";
  const org = affiliation.department
    ? `the ${affiliation.department}, ${affiliation.name}`
    : affiliation.name;
  return `${person.jobTitle} at ${org}. `;
}

function Crosshair({ position }: { position: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`absolute ${position} text-hairline`}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
    >
      <path d="M6 0v12M0 6h12" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

export default async function HomePage() {
  const { person, background, home } = getSiteConfig();
  const [featured, projects, news] = await Promise.all([
    listFeaturedPublications(),
    listFeaturedProjects(),
    listFeaturedNews(3),
  ]);

  return (
    <>
      <JsonLd data={graph(profilePageNode())} />

      <Container>
        <section
          aria-label="Introduction"
          className="relative flex min-h-[60vh] flex-col justify-end py-16 md:py-24"
        >
          <Crosshair position="top-0 left-0" />
          <Crosshair position="top-0 right-0" />
          <Crosshair position="bottom-0 left-0" />
          <Crosshair position="bottom-0 right-0" />

          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between md:gap-12">
            <div className="min-w-0">
              <p className="mono-label text-muted">{home.eyebrow}</p>
              <h1 className="mt-4 text-[clamp(2.75rem,7vw,4.75rem)] leading-[1.02] font-semibold tracking-[-0.03em]">
                {person.name}
                <span aria-hidden="true" className="cursor-blink" />
              </h1>
              <p className="md-inline mt-6 max-w-[65ch]">
                {heroIntro()}
                <span dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(home.pitch) }} />
              </p>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-1">
                {metaLinks().map(({ label, href, external }) => (
                  <li key={label}>
                    <a
                      className="mono-label link-underline inline-block py-3 text-text"
                      href={href}
                      {...(external ? { target: "_blank", rel: "me noopener" } : { rel: "me" })}
                    >
                      {label}
                      {external ? <span aria-hidden="true"> ↗</span> : null}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            {/* The JSON-LD image, shown to readers as well. Google asks that marked-up
                content be visible, and visitors recognise the person they came for.
                Above the name on phones. From md up it sits beside the text: the top
                margin skips the eyebrow line so the frame starts level with the name,
                and from lg up 13.5rem matches the name plus intro, which measure about
                13.6rem at every width because the type scales with the root size. */}
            {portraitExists() ? (
              <div className="relative order-first aspect-square w-24 shrink-0 overflow-hidden border border-hairline md:order-last md:mt-[2.375rem] md:w-[9.5rem] lg:w-[13.5rem]">
                <Image
                  src={person.portraitPath}
                  alt={`Portrait of ${person.name}`}
                  fill
                  sizes="(min-width: 1024px) 300px, (min-width: 768px) 160px, 100px"
                  loading="eager"
                  className="object-cover"
                />
              </div>
            ) : null}
          </div>
        </section>
      </Container>

      <section aria-labelledby="about-heading">
        <RegisterRule label="About" />
        <Container className="py-12 md:py-16">
          <h2 id="about-heading" className="sr-only">
            About
          </h2>
          <div className="max-w-[65ch] space-y-4">
            {home.about.map((paragraph) => (
              <p
                key={paragraph}
                className="md-inline"
                dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(paragraph) }}
              />
            ))}
          </div>
          {person.languagesLabel ? (
            <p className="mono-label mt-8 text-muted">{person.languagesLabel}</p>
          ) : null}
        </Container>
      </section>

      <section aria-labelledby="background-heading">
        <RegisterRule label="Background" />
        <Container className="py-12 md:py-16">
          <h2 id="background-heading" className="sr-only">
            Background
          </h2>
          <div className="space-y-6">
            {background.experience.map((entry) => (
              <LedgerRow key={`${entry.period}-${entry.org}`} left={entry.period}>
                <p className="font-medium">
                  {entry.ongoing ? (
                    <span
                      aria-hidden="true"
                      className="mr-2 inline-block size-1.5 rounded-full bg-accent align-middle"
                    />
                  ) : null}
                  {entry.title}
                </p>
                <p className="text-muted">{entry.org}</p>
              </LedgerRow>
            ))}
          </div>
          <h3 className="mono-label mt-12 text-muted">Education</h3>
          <div className="mt-6 space-y-6">
            {background.education.map((entry) => (
              <LedgerRow key={`${entry.period}-${entry.title}`} left={entry.period}>
                <p className="font-medium">{entry.title}</p>
                <p className="text-muted">{entry.org}</p>
              </LedgerRow>
            ))}
          </div>
        </Container>
      </section>

      <section aria-labelledby="research-heading">
        <RegisterRule label="Research Topics" />
        <Container className="py-12 md:py-16">
          <h2 id="research-heading" className="sr-only">
            Research topics
          </h2>
          <ul className="grid gap-x-10 md:grid-cols-2">
            {person.researchTopics.map((topic, i) => (
              <li key={topic} className="mono-label border-b border-hairline py-3 text-text">
                <span className="text-muted">{String(i + 1).padStart(2, "0")} </span>
                {topic}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {projects.length > 0 ? (
        <section aria-labelledby="projects-heading">
          <RegisterRule label="Projects" />
          <Container className="py-12 md:py-16">
            <h2 id="projects-heading" className="sr-only">
              Projects
            </h2>
            <div className="space-y-8">
              {projects.map((project, i) => (
                <LedgerRow key={project.id} left={String(i + 1).padStart(2, "0")}>
                  <h3 className="font-semibold">
                    <Link className="link-underline" href={`/projects#project-${project.slug}`}>
                      {project.title}
                    </Link>
                  </h3>
                  <p className="mt-1 max-w-[65ch] text-muted">{project.summary}</p>
                </LedgerRow>
              ))}
            </div>
            <p className="mono-label mt-10">
              <Link className="link-underline text-text" href="/projects">
                All projects →
              </Link>
            </p>
          </Container>
        </section>
      ) : null}

      {featured.length > 0 ? (
        <section aria-labelledby="selected-publications-heading">
          <RegisterRule label="Selected Publications" />
          <Container className="py-12 md:py-16">
            <h2 id="selected-publications-heading" className="sr-only">
              Selected publications
            </h2>
            <div className="space-y-10">
              {featured.map((pub) => (
                <LedgerRow key={pub.id} left={String(pub.year)}>
                  <h3 className="font-semibold">
                    <Link className="link-underline" href={`/publications/${pub.slug}`}>
                      {pub.title}
                    </Link>
                  </h3>
                  <p className="mt-1 text-muted">
                    {pub.authors.join(", ")} · {pub.venue}
                  </p>
                </LedgerRow>
              ))}
            </div>
            <p className="mono-label mt-10">
              <Link className="link-underline text-text" href="/publications">
                All publications →
              </Link>
            </p>
          </Container>
        </section>
      ) : null}

      {news.length > 0 ? (
        <section aria-labelledby="recent-news-heading">
          <RegisterRule label="Recent News" />
          <Container className="py-12 md:py-16">
            <h2 id="recent-news-heading" className="sr-only">
              Recent news
            </h2>
            <div className="space-y-6">
              {news.map((item) => (
                <LedgerRow
                  key={item.id}
                  left={<time dateTime={isoDate(item.date)}>{formatDate(item.date)}</time>}
                >
                  <p>
                    <span aria-hidden="true" className="mr-2">
                      {item.emoji}
                    </span>
                    <span
                      className="md-inline"
                      dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(item.text) }}
                    />
                  </p>
                </LedgerRow>
              ))}
            </div>
            <p className="mono-label mt-10">
              <Link className="link-underline text-text" href="/news">
                All news →
              </Link>
            </p>
          </Container>
        </section>
      ) : null}
    </>
  );
}
