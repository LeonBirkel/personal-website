"use client";

import { useActionState } from "react";
import {
  AdminField,
  FormError,
  INPUT_CLASSES,
  SubmitButton,
} from "@/components/admin/form-controls";
import { ADMIN_FORM_IDLE, type AdminFormState } from "@/lib/admin-form";
import type { Publication } from "@/generated/prisma/client";

type Action = (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;

export function PublicationForm({
  action,
  personName,
  publication,
}: {
  action: Action;
  /** Configured person name, passed from the server side (client components cannot read the config). */
  personName: string;
  publication?: Publication;
}) {
  const [state, formAction, pending] = useActionState(action, ADMIN_FORM_IDLE);
  const errors = state.errors;

  return (
    <form action={formAction} className="max-w-[42rem] space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <AdminField label="Slug" name="slug" error={errors?.slug} hint="lowercase-with-hyphens">
          <input
            className={INPUT_CLASSES}
            id="slug"
            name="slug"
            required
            defaultValue={publication?.slug}
          />
        </AdminField>
        <AdminField label="Year" name="year" error={errors?.year}>
          <input
            className={INPUT_CLASSES}
            id="year"
            name="year"
            type="number"
            required
            defaultValue={publication?.year ?? new Date().getFullYear()}
          />
        </AdminField>
      </div>
      <AdminField label="Title" name="title" error={errors?.title}>
        <input
          className={INPUT_CLASSES}
          id="title"
          name="title"
          required
          defaultValue={publication?.title}
        />
      </AdminField>
      <AdminField
        label="Authors"
        name="authors"
        error={errors?.authors}
        hint={`One per line, in order. Use exactly "${personName}" for yourself.`}
      >
        <textarea
          className={INPUT_CLASSES}
          id="authors"
          name="authors"
          rows={3}
          required
          defaultValue={publication?.authors.join("\n")}
        />
      </AdminField>
      <AdminField label="Venue" name="venue" error={errors?.venue}>
        <input
          className={INPUT_CLASSES}
          id="venue"
          name="venue"
          required
          defaultValue={publication?.venue}
        />
      </AdminField>
      <div className="grid gap-5 sm:grid-cols-2">
        <AdminField label="DOI" name="doi" error={errors?.doi} hint="e.g. 10.1007/xxx (optional)">
          <input
            className={INPUT_CLASSES}
            id="doi"
            name="doi"
            defaultValue={publication?.doi ?? ""}
          />
        </AdminField>
        <AdminField
          label="PDF URL"
          name="pdfUrl"
          error={errors?.pdfUrl}
          hint="/uploads/… or absolute (optional)"
        >
          <input
            className={INPUT_CLASSES}
            id="pdfUrl"
            name="pdfUrl"
            defaultValue={publication?.pdfUrl ?? ""}
          />
        </AdminField>
      </div>
      <AdminField
        label="Abstract"
        name="abstract"
        error={errors?.abstract}
        hint="Markdown (optional)"
      >
        <textarea
          className={INPUT_CLASSES}
          id="abstract"
          name="abstract"
          rows={6}
          defaultValue={publication?.abstract ?? ""}
        />
      </AdminField>
      <AdminField
        label="BibTeX"
        name="bibtex"
        error={errors?.bibtex}
        hint="Leave empty to auto-generate"
      >
        <textarea
          className={`${INPUT_CLASSES} font-mono text-sm`}
          id="bibtex"
          name="bibtex"
          rows={8}
          defaultValue={publication?.bibtex ?? ""}
        />
      </AdminField>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <label className="flex items-center gap-3">
          <input type="checkbox" name="active" defaultChecked={publication?.active ?? true} />
          <span className="mono-label text-muted">Active (visible on the site)</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" name="featured" defaultChecked={publication?.featured ?? false} />
          <span className="mono-label text-muted">Featured (shown on the home page)</span>
        </label>
      </div>
      <FormError message={state.message} />
      <SubmitButton pending={pending}>
        {publication ? "Save changes" : "Create publication"}
      </SubmitButton>
    </form>
  );
}
