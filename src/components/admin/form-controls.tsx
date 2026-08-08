"use client";

import type { ReactNode } from "react";

export const INPUT_CLASSES =
  "w-full border border-hairline bg-surface px-3 py-2 text-text placeholder:text-muted";

export function AdminField({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mono-label mb-2 block text-muted" htmlFor={name}>
        {label}
      </label>
      {children}
      {hint ? (
        <p id={`${name}-hint`} className="mt-1 text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${name}-error`} role="alert" className="mt-1 text-sm text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mono-label cursor-pointer border border-hairline bg-text px-6 py-3 text-bg hover:bg-accent disabled:opacity-60"
    >
      {pending ? "Saving…" : children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-accent">
      {message}
    </p>
  ) : null;
}
