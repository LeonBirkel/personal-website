"use client";

import { useActionState } from "react";
import {
  AdminField,
  FormError,
  INPUT_CLASSES,
  SubmitButton,
} from "@/components/admin/form-controls";
import { ADMIN_FORM_IDLE, type AdminFormState } from "@/lib/admin-form";
import type { Project } from "@/generated/prisma/client";
import { projectLinks } from "@/lib/project-links";

type Action = (prev: AdminFormState, formData: FormData) => Promise<AdminFormState>;

export function ProjectForm({ action, project }: { action: Action; project?: Project }) {
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
            defaultValue={project?.slug}
          />
        </AdminField>
        <AdminField label="Order" name="order" error={errors?.order} hint="Lower numbers first">
          <input
            className={INPUT_CLASSES}
            id="order"
            name="order"
            type="number"
            required
            defaultValue={project?.order ?? 0}
          />
        </AdminField>
      </div>
      <AdminField label="Title" name="title" error={errors?.title}>
        <input
          className={INPUT_CLASSES}
          id="title"
          name="title"
          required
          defaultValue={project?.title}
        />
      </AdminField>
      <AdminField
        label="Summary"
        name="summary"
        error={errors?.summary}
        hint="One line, shown in the home-page project overview"
      >
        <input
          className={INPUT_CLASSES}
          id="summary"
          name="summary"
          required
          maxLength={200}
          defaultValue={project?.summary}
        />
      </AdminField>
      <AdminField
        label="Description"
        name="description"
        error={errors?.description}
        hint="Markdown"
      >
        <textarea
          className={INPUT_CLASSES}
          id="description"
          name="description"
          rows={6}
          required
          defaultValue={project?.description}
        />
      </AdminField>
      <AdminField
        label="Links"
        name="links"
        error={errors?.links}
        hint='One per line: "Label | https://example.com"'
      >
        <textarea
          className={INPUT_CLASSES}
          id="links"
          name="links"
          rows={3}
          defaultValue={
            project
              ? projectLinks(project)
                  .map((l) => `${l.label} | ${l.url}`)
                  .join("\n")
              : ""
          }
        />
      </AdminField>
      <AdminField label="Tech tags" name="techTags" error={errors?.techTags} hint="Comma-separated">
        <input
          className={INPUT_CLASSES}
          id="techTags"
          name="techTags"
          defaultValue={project?.techTags.join(", ") ?? ""}
        />
      </AdminField>
      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <label className="flex items-center gap-3">
          <input type="checkbox" name="active" defaultChecked={project?.active ?? true} />
          <span className="mono-label text-muted">Active (visible on the site)</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" name="featured" defaultChecked={project?.featured ?? false} />
          <span className="mono-label text-muted">Featured (shown on the home page)</span>
        </label>
      </div>
      <FormError message={state.message} />
      <SubmitButton pending={pending}>{project ? "Save changes" : "Create project"}</SubmitButton>
    </form>
  );
}
