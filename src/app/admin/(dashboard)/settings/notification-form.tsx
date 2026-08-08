"use client";

import { useActionState } from "react";
import {
  AdminField,
  FormError,
  INPUT_CLASSES,
  SubmitButton,
} from "@/components/admin/form-controls";
import { ADMIN_FORM_IDLE } from "@/lib/admin-form";
import { saveDiscordWebhookAction } from "./actions";

export function NotificationForm({ webhookUrl }: { webhookUrl: string }) {
  const [state, formAction, pending] = useActionState(saveDiscordWebhookAction, ADMIN_FORM_IDLE);

  return (
    <form action={formAction} className="max-w-[42rem] space-y-5">
      <AdminField
        label="Discord webhook URL"
        name="webhookUrl"
        error={state.errors?.webhookUrl}
        hint="Leave empty and save to turn notifications off."
      >
        <input
          className={INPUT_CLASSES}
          id="webhookUrl"
          name="webhookUrl"
          type="url"
          defaultValue={state.values?.webhookUrl ?? webhookUrl}
          placeholder="https://discord.com/api/webhooks/…"
        />
      </AdminField>
      <FormError message={state.message} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton pending={pending}>Save</SubmitButton>
        <button
          type="submit"
          name="intent"
          value="test"
          disabled={pending}
          className="mono-label cursor-pointer border border-hairline bg-surface px-6 py-3 text-text hover:border-accent disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save and send a test"}
        </button>
      </div>
    </form>
  );
}
