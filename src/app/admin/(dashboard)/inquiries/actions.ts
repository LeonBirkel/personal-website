"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import { deleteInquiry } from "@/services/contact";

export async function deleteInquiryAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id === "string" && id) await deleteInquiry(id);
  redirect("/admin/inquiries");
}
