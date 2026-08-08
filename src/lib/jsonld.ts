import type {
  BlogPosting,
  BreadcrumbList,
  Graph,
  Organization,
  Person,
  ProfilePage,
  ScholarlyArticle,
  WebSite,
} from "schema-dts";
import { getIds, getPersonSameAs, getSiteConfig } from "@/config/site-config";
import { portraitExists } from "@/lib/portrait";
import type { NewsItem, Publication } from "@/generated/prisma/client";

/**
 * Every JSON-LD node referencing the person or their affiliation does so by
 * @id. One entity, many references, never duplicated inline. All @id values
 * and URLs build on the canonical origin from site.config.json so they stay
 * stable across environments.
 */
export const personRef = () => ({ "@id": getIds().personId }) as const;
export const orgRef = () => ({ "@id": getIds().orgId }) as const;
export const websiteRef = () => ({ "@id": getIds().websiteId }) as const;

export function orgNode(): Organization | undefined {
  const { affiliation } = getSiteConfig();
  if (!affiliation) return undefined;
  return {
    "@type": "CollegeOrUniversity",
    "@id": getIds().orgId,
    name: affiliation.name,
    ...(affiliation.alternateName ? { alternateName: affiliation.alternateName } : {}),
    url: affiliation.url,
    ...(affiliation.department
      ? {
          department: {
            "@type": "Organization",
            name: affiliation.department,
            ...(affiliation.departmentUrl ? { url: affiliation.departmentUrl } : {}),
          },
        }
      : {}),
    sameAs: [...affiliation.sameAs],
  };
}

export function personNode(): Person {
  const config = getSiteConfig();
  const { person, affiliation, background } = config;
  const origin = config.site.canonicalOrigin;

  // Deduplicated by name: the same degree listed twice in the timeline is
  // still one credential.
  const credentialNames = [
    ...new Set(
      background.education.filter((entry) => entry.credential).map((entry) => entry.title),
    ),
  ];

  return {
    "@type": "Person",
    "@id": getIds().personId,
    name: person.name,
    givenName: person.givenName,
    familyName: person.familyName,
    jobTitle: person.jobTitle,
    description: person.description,
    ...(affiliation ? { worksFor: orgRef(), affiliation: orgRef() } : {}),
    ...(portraitExists() ? { image: `${origin}${person.portraitPath}` } : {}),
    url: `${origin}/`,
    // email intentionally omitted, see the crawl-protection note in the config schema
    sameAs: getPersonSameAs(),
    knowsAbout: [...person.researchTopics],
    // Degrees are studied at institutions, so they belong on the entity as
    // alumniOf. The doctorate is a position and stays under worksFor above.
    ...(affiliation ? { alumniOf: orgRef() } : {}),
    ...(credentialNames.length > 0
      ? {
          hasCredential: credentialNames.map((name) => ({
            "@type": "EducationalOccupationalCredential" as const,
            credentialCategory: "degree",
            name,
            ...(affiliation ? { recognizedBy: orgRef() } : {}),
          })),
        }
      : {}),
    hasOccupation: {
      "@type": "Occupation",
      name: person.jobTitle,
      ...(person.location
        ? {
            occupationLocation: {
              "@type": "City",
              name: person.location.city,
            },
          }
        : {}),
    },
  };
}

export function websiteNode(): WebSite {
  const config = getSiteConfig();
  return {
    "@type": "WebSite",
    "@id": getIds().websiteId,
    name: config.person.name,
    url: `${config.site.canonicalOrigin}/`,
    publisher: personRef(),
    inLanguage: "en",
  };
}

export function profilePageNode(dateModified?: Date): ProfilePage {
  const config = getSiteConfig();
  const { person, affiliation } = config;
  const orgLabel = affiliation ? ` at ${affiliation.alternateName ?? affiliation.name}` : "";
  return {
    "@type": "ProfilePage",
    "@id": `${config.site.canonicalOrigin}/#profilepage`,
    url: `${config.site.canonicalOrigin}/`,
    name: `${person.name}, ${person.jobTitle}${orgLabel}`,
    mainEntity: personRef(),
    isPartOf: websiteRef(),
    ...(dateModified ? { dateModified: dateModified.toISOString() } : {}),
  };
}

export function scholarlyArticleNode(pub: Publication): ScholarlyArticle {
  const config = getSiteConfig();
  const url = `${config.site.canonicalOrigin}/publications/${pub.slug}`;
  return {
    "@type": "ScholarlyArticle",
    "@id": `${url}#article`,
    headline: pub.title,
    name: pub.title,
    author: pub.authors.map((name) =>
      name === config.person.name ? personRef() : ({ "@type": "Person", name } as Person),
    ),
    datePublished: String(pub.year),
    isPartOf: { "@type": "CreativeWork", name: pub.venue },
    ...(pub.abstract ? { abstract: pub.abstract } : {}),
    ...(pub.doi
      ? {
          identifier: {
            "@type": "PropertyValue",
            propertyID: "DOI",
            value: pub.doi,
          },
          sameAs: `https://doi.org/${pub.doi}`,
        }
      : {}),
    url,
  };
}

export function blogPostingNode(item: NewsItem): BlogPosting {
  const origin = getSiteConfig().site.canonicalOrigin;
  const headline = item.text.length > 108 ? `${item.text.slice(0, 105)}…` : item.text;
  return {
    "@type": "BlogPosting",
    "@id": `${origin}/news#${item.id}`,
    headline,
    datePublished: item.date.toISOString(),
    dateModified: item.updatedAt.toISOString(),
    author: personRef(),
    url: `${origin}/news#${item.id}`,
    inLanguage: "en",
  };
}

export function breadcrumbNode(items: { name: string; path: string }[]): BreadcrumbList {
  const origin = getSiteConfig().site.canonicalOrigin;
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${origin}${item.path}`,
    })),
  };
}

type GraphNode = Graph["@graph"][number];

export function graph(...nodes: GraphNode[]): Graph {
  return { "@context": "https://schema.org", "@graph": nodes };
}

/** Base graph included on every page: the entity trio (duo without an affiliation). */
export function baseGraphNodes(): GraphNode[] {
  const org = orgNode();
  return org ? [personNode(), org, websiteNode()] : [personNode(), websiteNode()];
}
