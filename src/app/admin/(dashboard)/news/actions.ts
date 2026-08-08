"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import { type AdminFormState, zodErrorState } from "@/lib/admin-form";
import { newsSchema } from "@/lib/validation";
import { createNewsItem, deleteNewsItem, updateNewsItem } from "@/services/news";

function parseForm(formData: FormData) {
  return newsSchema.safeParse({
    date: formData.get("date"),
    emoji: formData.get("emoji"),
    text: formData.get("text"),
    active: formData.get("active") === "on",
    featured: formData.get("featured") === "on",
  });
}

export async function createNewsAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) return zodErrorState(parsed.error);
  await createNewsItem(parsed.data);
  redirect("/admin/news");
}

export async function updateNewsAction(
  id: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = parseForm(formData);
  if (!parsed.success) return zodErrorState(parsed.error);
  await updateNewsItem(id, parsed.data);
  redirect("/admin/news");
}

export async function deleteNewsAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id === "string" && id) await deleteNewsItem(id);
  redirect("/admin/news");
}
