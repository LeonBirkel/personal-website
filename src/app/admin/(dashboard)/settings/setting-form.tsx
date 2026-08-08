"use client";

import { useActionState } from "react";
import {
  AdminField,
  FormError,
  INPUT_CLASSES,
  SubmitButton,
} from "@/components/admin/form-controls";
import { ADMIN_FORM_IDLE } from "@/lib/admin-form";
import { setSettingAction } from "./actions";

export function SettingForm() {
  const [state, formAction, pending] = useActionState(setSettingAction, ADMIN_FORM_IDLE);

  return (
    <form action={formAction} className="max-w-[42rem] space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <AdminField label="Key" name="key" error={state.errors?.key}>
          <input className={INPUT_CLASSES} id="key" name="key" required />
        </AdminField>
        <AdminField label="Value" name="value" error={state.errors?.value}>
          <input className={INPUT_CLASSES} id="value" name="value" />
        </AdminField>
      </div>
      <FormError message={state.message} />
      <SubmitButton pending={pending}>Save setting</SubmitButton>
    </form>
  );
}
