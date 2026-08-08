"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import { type AdminFormState, isUniqueConstraintError, zodErrorState } from "@/lib/admin-form";
import { publicationSchema, type PublicationInput } from "@/lib/validation";
import { createPublication, deletePublication, updatePublication } from "@/services/publications";

function parseForm(formData: FormData) {
  return publicationSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    authors: String(formData.get("authors") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    venue: formData.get("venue"),
    year: formData.get("year"),
    doi: formData.get("doi") ?? "",
    pdfUrl: formData.get("pdfUrl") ?? "",
    abstract: formData.get("abstract") ?? "",
    bibtex: formData.get("bibtex") ?? "",
    active: formData.get("active") === "on",
    featured: formData.get("featured") === "on",
  });
}

/** Optional fields resolve to null so edits can clear a previously set value. */
function toData(input: PublicationInput) {
  return {
    ...input,
    doi: input.doi ?? null,
    pdfUrl: input.pdfUrl ?? null,
    abstract: input.abstract ?? null,
    bibtex: input.bibtex ?? null,
  };
}

export async function createPublicationAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) return zodErrorState(parsed.error);
  try {
    await createPublication(toData(parsed.data));
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { status: "error", errors: { slug: "Slug already in use" } };
    }
    throw error;
  }
  redirect("/admin/publications");
}

export async function updatePublicationAction(
  id: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) return zodErrorState(parsed.error);
  try {
    await updatePublication(id, toData(parsed.data));
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { status: "error", errors: { slug: "Slug already in use" } };
    }
    throw error;
  }
  redirect("/admin/publications");
}

export async function deletePublicationAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id === "string" && id) await deletePublication(id);
  redirect("/admin/publications");
}
