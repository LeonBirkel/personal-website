import { z } from "zod";

/** Shared Zod schemas, imported by client forms and server actions alike. */

export const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "lowercase letters, digits and hyphens only");

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.email("Enter a valid email address").max(200),
  subject: z.string().trim().min(1, "Subject is required").max(150),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(5000),
});
export type ContactInput = z.infer<typeof contactSchema>;

export const publicationSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(300),
  authors: z.array(z.string().trim().min(1).max(120)).min(1).max(30),
  venue: z.string().trim().min(1).max(300),
  year: z.coerce.number().int().min(1900).max(2100),
  doi: z
    .string()
    .trim()
    .regex(/^10\..+\/.+$/, "DOI must look like 10.xxxx/yyyy")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  pdfUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  abstract: z
    .string()
    .max(10000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  bibtex: z
    .string()
    .max(10000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  active: z.boolean(),
  featured: z.boolean(),
});
export type PublicationInput = z.infer<typeof publicationSchema>;

export const projectLinkSchema = z.object({
  label: z.string().trim().min(1).max(60),
  url: z.url().max(500),
});

export const projectSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10000),
  links: z.array(projectLinkSchema).max(10),
  techTags: z.array(z.string().trim().min(1).max(40)).max(20),
  active: z.boolean(),
  featured: z.boolean(),
  order: z.coerce.number().int().min(0).max(9999),
});
export type ProjectInput = z.infer<typeof projectSchema>;

export const newsSchema = z.object({
  date: z.coerce.date(),
  emoji: z.string().trim().min(1).max(8),
  text: z.string().trim().min(1).max(500),
  active: z.boolean(),
  featured: z.boolean(),
});
export type NewsInput = z.infer<typeof newsSchema>;

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;
