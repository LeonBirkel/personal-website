"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import { deleteAllSpamInquiries, deleteInquiry, markInquiryNotSpam } from "@/services/contact";

const INQUIRIES_PATH = "/admin/inquiries";

async function withInquiryId(
  formData: FormData,
  run: (id: string) => Promise<void>,
): Promise<void> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id === "string" && id) await run(id);
  redirect(INQUIRIES_PATH);
}

export async function deleteInquiryAction(formData: FormData): Promise<void> {
  await withInquiryId(formData, deleteInquiry);
}

export async function markNotSpamAction(formData: FormData): Promise<void> {
  await withInquiryId(formData, markInquiryNotSpam);
}

export async function deleteAllSpamAction(): Promise<void> {
  await requireAdmin();
  await deleteAllSpamInquiries();
  redirect(INQUIRIES_PATH);
}
