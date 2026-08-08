"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import { type AdminFormState, isUniqueConstraintError, zodErrorState } from "@/lib/admin-form";
import { projectSchema } from "@/lib/validation";
import { createProject, deleteProject, updateProject } from "@/services/projects";

/** Links are entered one per line as "Label | https://url". */
function parseForm(formData: FormData) {
  return projectSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    description: formData.get("description"),
    links: String(formData.get("links") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, ...rest] = line.split("|");
        return { label: label?.trim() ?? "", url: rest.join("|").trim() };
      }),
    techTags: String(formData.get("techTags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    active: formData.get("active") === "on",
    featured: formData.get("featured") === "on",
    order: formData.get("order"),
  });
}

export async function createProjectAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) return zodErrorState(parsed.error);
  try {
    await createProject(parsed.data);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { status: "error", errors: { slug: "Slug already in use" } };
    }
    throw error;
  }
  redirect("/admin/projects");
}

export async function updateProjectAction(
  id: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) return zodErrorState(parsed.error);
  try {
    await updateProject(id, parsed.data);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { status: "error", errors: { slug: "Slug already in use" } };
    }
    throw error;
  }
  redirect("/admin/projects");
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id === "string" && id) await deleteProject(id);
  redirect("/admin/projects");
}
