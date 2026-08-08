"use client";

import { useActionState } from "react";
import {
  AdminField,
  FormError,
  INPUT_CLASSES,
  SubmitButton,
} from "@/components/admin/form-controls";
import { ADMIN_FORM_IDLE, type AdminFormState } from "@/lib/admin-form";
import type { NewsItem } from "@/generated/prisma/client";

type Action = (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;

export function NewsForm({ action, item }: { action: Action; item?: NewsItem }) {
  const [state, formAction, pending] = useActionState(action, ADMIN_FORM_IDLE);
  const errors = state.errors;

  return (
    <form action={formAction} className="max-w-[42rem] space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <AdminField label="Date" name="date" error={errors?.date}>
          <input
            className={INPUT_CLASSES}
            id="date"
            name="date"
            type="date"
            required
            defaultValue={item?.date.toISOString().slice(0, 10)}
          />
        </AdminField>
        <AdminField label="Emoji" name="emoji" error={errors?.emoji}>
          <input
            className={INPUT_CLASSES}
            id="emoji"
            name="emoji"
            required
            defaultValue={item?.emoji ?? "🎉"}
          />
        </AdminField>
      </div>
      <AdminField
        label="Text"
        name="text"
        error={errors?.text}
        hint="Short, one or two sentences. Inline markdown allowed."
      >
        <textarea
          className={INPUT_CLASSES}
          id="text"
          name="text"
          rows={3}
          required
          defaultValue={item?.text}
        />
      </AdminField>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <label className="flex items-center gap-3">
          <input type="checkbox" name="active" defaultChecked={item?.active ?? true} />
          <span className="mono-label text-muted">Active (visible on the site)</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" name="featured" defaultChecked={item?.featured ?? false} />
          <span className="mono-label text-muted">Featured (shown on the home page)</span>
        </label>
      </div>
      <FormError message={state.message} />
      <SubmitButton pending={pending}>{item ? "Save changes" : "Create news item"}</SubmitButton>
    </form>
  );
}
