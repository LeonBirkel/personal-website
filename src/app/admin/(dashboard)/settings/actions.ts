"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-session";
import { type AdminFormState, zodErrorState } from "@/lib/admin-form";
import { setSetting } from "@/services/settings";

const settingSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9._-]+$/, "letters, digits, dot, underscore, hyphen"),
  value: z.string().max(5000),
});

export async function setSettingAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = settingSchema.safeParse({
    key: formData.get("key"),
    value: formData.get("value"),
  });
  if (!parsed.success) return zodErrorState(parsed.error);
  await setSetting(parsed.data.key, parsed.data.value);
  redirect("/admin/settings");
}
