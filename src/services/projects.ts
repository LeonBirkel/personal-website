import { prisma } from "@/lib/prisma";
import type { Project } from "@/generated/prisma/client";
import type { ProjectInput } from "@/lib/validation";
import { afterContentMutation } from "@/services/revalidate";

export async function listActiveProjects(): Promise<Project[]> {
  return prisma.project.findMany({ where: { active: true }, orderBy: { order: "asc" } });
}

/** Home-page selection. */
export async function listFeaturedProjects(): Promise<Project[]> {
  return prisma.project.findMany({
    where: { active: true, featured: true },
    orderBy: { order: "asc" },
  });
}

export async function listAllProjects(): Promise<Project[]> {
  return prisma.project.findMany({ orderBy: { order: "asc" } });
}

export async function getProjectById(id: string): Promise<Project | null> {
  return prisma.project.findUnique({ where: { id } });
}

export async function createProject(data: ProjectInput): Promise<Project> {
  const project = await prisma.project.create({ data });
  await afterContentMutation(["/projects"]);
  return project;
}

export async function updateProject(id: string, data: ProjectInput): Promise<Project> {
  const project = await prisma.project.update({ where: { id }, data });
  await afterContentMutation(["/projects"]);
  return project;
}

export async function deleteProject(id: string): Promise<void> {
  await prisma.project.delete({ where: { id } });
  await afterContentMutation(["/projects"]);
}
