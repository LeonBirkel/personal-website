"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-session";
import { type AdminFormState, zodErrorState } from "@/lib/admin-form";
import {
  DISCORD_WEBHOOK_KEY,
  DISCORD_WEBHOOK_PATTERN,
  sendTestNotification,
} from "@/services/notifications";
import { deleteSetting, setSetting } from "@/services/settings";

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

const discordWebhookSchema = z.object({
  webhookUrl: z
    .string()
    .trim()
    .max(300)
    .refine((value) => value === "" || DISCORD_WEBHOOK_PATTERN.test(value), {
      message: "must look like https://discord.com/api/webhooks/<id>/<token>",
    }),
});

export async function saveDiscordWebhookAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const values = { webhookUrl: String(formData.get("webhookUrl") ?? "") };
  const parsed = discordWebhookSchema.safeParse(values);
  if (!parsed.success) return { ...zodErrorState(parsed.error), values };

  const url = parsed.data.webhookUrl;
  if (url === "") {
    await deleteSetting(DISCORD_WEBHOOK_KEY);
    redirect("/admin/settings");
  }

  await setSetting(DISCORD_WEBHOOK_KEY, url);
  if (formData.get("intent") === "test") {
    const failure = await sendTestNotification(url);
    if (failure) {
      return {
        status: "error",
        message: `Saved, but the test message failed: ${failure}`,
        values: { webhookUrl: url },
      };
    }
  }
  redirect("/admin/settings");
}
