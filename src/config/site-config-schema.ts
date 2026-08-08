import { z } from "zod";
import { newsSchema, pageRangeIssues, projectSchema, publicationSchema } from "@/lib/validation";

/**
 * Schema for site.config.json, the file that makes the framework's person
 * exchangeable. Every instance mounts its own copy; the loader in
 * ./site-config.ts validates it at runtime. site.config.schema.json is
 * generated from this module (npm run schema) so editors can autocomplete.
 */

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "six-digit hex color, e.g. #c43d00")
  .describe("Six-digit hex color");

const colorPair = z.strictObject({
  light: hexColor,
  dark: hexColor,
});

const backgroundEntrySchema = z.strictObject({
  period: z.string().min(1).max(40).describe('Display range, e.g. "2024 – 2025"'),
  title: z.string().min(1).max(120),
  org: z.string().min(1).max(160),
  ongoing: z.boolean().optional().describe("Current position, rendered with the accent dot"),
  credential: z
    .boolean()
    .optional()
    .describe(
      "Education only: mark degrees that belong in JSON-LD hasCredential. " +
        "Duplicate titles count once.",
    ),
});
export type BackgroundEntry = z.infer<typeof backgroundEntrySchema>;

const siteLinkSchema = z.strictObject({
  label: z.string().min(1).max(40),
  url: z.url().max(500),
  showOnContact: z.boolean().optional().describe("Also list this link on the contact page"),
});

const pendingSameAsSchema = z.strictObject({
  url: z.url().max(500),
  live: z
    .boolean()
    .describe(
      "Set true once the page actually exists. A sameAs entry that 404s " +
        "weakens the entity graph instead of strengthening it.",
    ),
});

/** Seed variants of the shared content schemas: strict, with sensible defaults. */
const seedPublicationSchema = z
  .strictObject({
    ...publicationSchema.shape,
    active: z.boolean().default(true),
    featured: z.boolean().default(true),
  })
  .superRefine((pub, ctx) => {
    for (const [field, message] of Object.entries(pageRangeIssues(pub))) {
      ctx.addIssue({ code: "custom", message, path: [field] });
    }
  });

const seedProjectSchema = z.strictObject({
  ...projectSchema.shape,
  active: z.boolean().default(true),
  featured: z.boolean().default(true),
});

const seedNewsSchema = z.strictObject({
  id: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase letters, digits and hyphens only")
    .describe(
      "Stable identifier. It becomes the RSS GUID, the JSON Feed id and the " +
        "JSON-LD anchor. Never change it after first publish.",
    ),
  ...newsSchema.shape,
  active: z.boolean().default(true),
  featured: z.boolean().default(true),
});

export const siteConfigSchema = z.strictObject({
  $schema: z.string().optional(),
  configVersion: z.literal(1).describe("Config format version. A breaking schema change bumps it."),

  site: z.strictObject({
    canonicalOrigin: z
      .url()
      .max(200)
      .refine((u) => !u.endsWith("/"), "no trailing slash")
      .describe(
        "Canonical production origin, e.g. https://example.org. Used for " +
          "stable JSON-LD @id values, so entity IDs stay identical across " +
          "environments. Never change it after launch.",
      ),
    orgIdFragment: z
      .string()
      .regex(/^[a-z0-9-]+$/, "lowercase letters, digits and hyphens only")
      .max(40)
      .default("org")
      .describe(
        'Fragment of the affiliation Organization @id, e.g. "tum" for ' +
          "<origin>/#tum. Never change it after launch.",
      ),
  }),

  security: z
    .strictObject({
      contact: z
        .array(
          z
            .string()
            .min(1)
            .max(300)
            .regex(/^(https:\/\/|mailto:|tel:\+)\S+$/, "must be an https://, mailto: or tel:+ URI"),
        )
        .min(1)
        .max(5)
        .optional()
        .describe(
          "Ordered Contact lines for /.well-known/security.txt, most preferred " +
            "first. Defaults to the site's own contact page, which keeps the " +
            "address out of a file crawlers read.",
        ),
      encryption: z
        .url()
        .max(300)
        .optional()
        .describe("URL of a public key a reporter can encrypt to."),
      acknowledgments: z.url().max(300).optional().describe("URL of a page thanking reporters."),
      policy: z
        .url()
        .max(300)
        .optional()
        .describe("URL of the vulnerability disclosure policy, e.g. the repository SECURITY.md."),
      preferredLanguages: z
        .array(z.string().regex(/^[a-z]{2}$/, "two-letter language codes"))
        .min(1)
        .max(5)
        .default(["en"])
        .describe("Languages a report may be written in, as RFC 9116 Preferred-Languages."),
    })
    .optional()
    .describe(
      "Optional inputs for /.well-known/security.txt (RFC 9116). The file is " +
        "served with sensible defaults even when this section is absent.",
    ),

  person: z.strictObject({
    name: z
      .string()
      .min(1)
      .max(120)
      .describe("Full name, spelled exactly as it should appear everywhere"),
    givenName: z.string().min(1).max(60),
    familyName: z.string().min(1).max(60),
    jobTitle: z.string().min(1).max(120),
    description: z
      .string()
      .min(1)
      .max(500)
      .describe(
        "One-paragraph third-person summary. Meta description, JSON-LD description and llms.txt blurb.",
      ),
    email: z
      .email()
      .max(200)
      .optional()
      .describe(
        "Never rendered where a crawler can read it: not in JSON-LD, not in " +
          "markdown mirrors, not in server-rendered HTML. The only public " +
          "surface is the obfuscated click-to-reveal on /contact. Omit to " +
          "hide the email section entirely.",
      ),
    location: z
      .strictObject({ city: z.string().min(1).max(80) })
      .optional()
      .describe("Feeds JSON-LD occupationLocation and the footer line. Omit to drop both."),
    portraitPath: z
      .string()
      .regex(/^\//, "must start with /")
      .max(300)
      .default("/uploads/portrait.jpg")
      .describe(
        "Path of the portrait photo and the JSON-LD image. The default points " +
          "at the admin uploads volume: upload portrait.jpg in /admin/settings. " +
          "The tag is omitted while the file is missing. A square or portrait " +
          "crop is right here, because consumers show this one as a thumbnail.",
      ),
    ogImagePath: z
      .string()
      .regex(/^\//, "must start with /")
      .max(300)
      .default("/uploads/og-image.jpg")
      .describe(
        "Path of the 1200x630 link-preview image (og:image). Upload it as " +
          "og-image.jpg in /admin/settings. A portrait is the wrong shape for a " +
          "link preview, because X crops to 2:1 and takes the top and bottom off " +
          "the head. Falls back to portraitPath while this file is missing. The " +
          "declared og:image:width and og:image:height assume 1200x630, so keep " +
          "to that size.",
      ),
    researchTopics: z
      .array(z.string().min(1).max(80))
      .min(1)
      .max(20)
      .describe("JSON-LD knowsAbout and the home-page topics list"),
    languagesLabel: z
      .string()
      .max(120)
      .optional()
      .describe('Small label under the About section, e.g. "DE Native · EN Fluent". Omit to hide.'),
    sameAs: z
      .array(z.url().max(500))
      .max(30)
      .describe(
        "Profile URLs that identify the same person: Scholar, ORCID, LinkedIn, GitHub, Wikidata, ...",
      ),
    pendingSameAs: z
      .array(pendingSameAsSchema)
      .max(10)
      .default([])
      .describe("sameAs candidates that are not published yet. Appended once live is true."),
  }),

  affiliation: z
    .strictObject({
      name: z.string().min(1).max(200),
      alternateName: z.string().max(60).optional().describe('Short name, e.g. "TUM"'),
      department: z.string().max(200).optional(),
      url: z.url().max(500),
      departmentUrl: z.url().max(500).optional(),
      sameAs: z
        .array(z.url().max(500))
        .max(10)
        .describe("Identity links of the organization: website, Wikidata, ROR"),
    })
    .optional()
    .describe(
      "Omit entirely if there is no affiliation. JSON-LD then drops the Organization node.",
    ),

  background: z.strictObject({
    experience: z.array(backgroundEntrySchema).max(30),
    education: z.array(backgroundEntrySchema).max(30),
  }),

  links: z
    .array(siteLinkSchema)
    .max(15)
    .describe(
      "Link row on the home hero, in order. A Contact entry is appended " +
        "automatically. Entries with showOnContact also appear on /contact.",
    ),

  home: z.strictObject({
    eyebrow: z
      .string()
      .min(1)
      .max(120)
      .describe('Small line above the hero name, e.g. "Munich, DE · Space Systems Security"'),
    pitch: z
      .string()
      .min(1)
      .max(600)
      .describe(
        "Hero paragraph, inline markdown. Rendered after the derived " +
          '"{jobTitle} at the {department}, {affiliation}." sentence.',
      ),
    about: z
      .array(z.string().min(1).max(2000))
      .min(1)
      .max(10)
      .describe(
        "About paragraphs, inline markdown. The single source for the home " +
          "page and the markdown mirror.",
      ),
  }),

  contact: z.strictObject({
    blurb: z.string().min(1).max(600).describe("Paragraph above the contact form, inline markdown"),
    metaDescription: z.string().min(1).max(300),
  }),

  pageDescriptions: z
    .strictObject({
      publications: z.string().max(300).optional(),
      projects: z.string().max(300).optional(),
      news: z.string().max(300).optional(),
    })
    .default({})
    .describe("Per-page meta descriptions. Omitted entries fall back to name-derived defaults."),

  theme: z.strictObject({
    accent: colorPair.describe("Accent color, light and dark scheme"),
    accentHover: colorPair.describe("Hover variant of the accent"),
    initials: z
      .string()
      .min(1)
      .max(3)
      .optional()
      .describe(
        "Wordmark and favicon initials. Defaults to first letters of given and family name.",
      ),
  }),

  seedContent: z
    .strictObject({
      publications: z.array(seedPublicationSchema).max(200).default([]),
      projects: z.array(seedProjectSchema).max(200).default([]),
      news: z.array(seedNewsSchema).max(500).default([]),
    })
    .optional()
    .describe(
      "Initial content, seeded into the database on first boot. Managed in " +
        "/admin afterwards. Re-seeding by hand overwrites admin edits to " +
        "seeded slugs.",
    ),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;
export type SeedContent = NonNullable<SiteConfig["seedContent"]>;
