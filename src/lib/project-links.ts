import type { Project } from "@/generated/prisma/client";

export type ProjectLink = { label: string; url: string };

/** Typed view of the Project.links JSON column. Client-safe (no Prisma runtime import). */
export function projectLinks(project: Pick<Project, "links">): ProjectLink[] {
  return (project.links ?? []) as ProjectLink[];
}
