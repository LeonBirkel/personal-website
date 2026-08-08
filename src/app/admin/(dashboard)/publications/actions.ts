"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import { type AdminFormState, isUniqueConstraintError, zodErrorState } from "@/lib/admin-form";
import { pageRangeIssues, publicationSchema, type PublicationInput } from "@/lib/validation";
import { createPublication, deletePublication, updatePublication } from "@/services/publications";

function parseForm(formData: FormData): AdminFormState | { data: PublicationInput } {
  const parsed = publicationSchema.safeParse({
    slug: formData.get("slug"),
    title: formData.get("title"),
    authors: String(formData.get("authors") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    venue: formData.get("venue"),
    year: formData.get("year"),
    conferenceTitle: formData.get("conferenceTitle") ?? "",
    publisher: formData.get("publisher") ?? "",
    firstPage: formData.get("firstPage") ?? "",
    lastPage: formData.get("lastPage") ?? "",
    doi: formData.get("doi") ?? "",
    pdfUrl: formData.get("pdfUrl") ?? "",
    abstract: formData.get("abstract") ?? "",
    bibtex: formData.get("bibtex") ?? "",
    active: formData.get("active") === "on",
    featured: formData.get("featured") === "on",
  });
  if (!parsed.success) return zodErrorState(parsed.error);
  const rangeIssues = pageRangeIssues(parsed.data);
  if (Object.keys(rangeIssues).length > 0) {
    return { status: "error", message: "Please fix the highlighted fields.", errors: rangeIssues };
  }
  return { data: parsed.data };
}

/** Optional fields resolve to null so edits can clear a previously set value. */
function toData(input: PublicationInput) {
  return {
    ...input,
    conferenceTitle: input.conferenceTitle ?? null,
    publisher: input.publisher ?? null,
    firstPage: input.firstPage ?? null,
    lastPage: input.lastPage ?? null,
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
  if (!("data" in parsed)) return parsed;
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
  if (!("data" in parsed)) return parsed;
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
