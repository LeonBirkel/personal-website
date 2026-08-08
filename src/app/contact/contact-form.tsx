"use client";

import Script from "next/script";
import { useActionState, useEffect, useState } from "react";
import { contactSchema } from "@/lib/validation";
import { submitContactForm, type ContactFormState } from "./actions";

const INITIAL: ContactFormState = { status: "idle" };

const FIELD_CLASSES =
  "w-full border border-hairline bg-surface px-3 py-2 text-text placeholder:text-muted";

type FieldErrors = ContactFormState["fieldErrors"];

declare global {
  interface Window {
    turnstile?: { reset: () => void };
  }
}

export function ContactForm({ siteKey }: { siteKey: string }) {
  const [state, formAction, pending] = useActionState(submitContactForm, INITIAL);
  const [clientErrors, setClientErrors] = useState<FieldErrors>(undefined);

  const errors: FieldErrors = clientErrors ?? state.fieldErrors;
  const values = state.values;

  // A Turnstile token is single-use. Reset the widget so a retry can pass.
  useEffect(() => {
    if (state.status === "error") window.turnstile?.reset();
  }, [state]);

  function validateBeforeSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const parsed = contactSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
    });
    if (!parsed.success) {
      event.preventDefault();
      const flat = parsed.error.flatten().fieldErrors;
      setClientErrors({
        name: flat.name?.[0],
        email: flat.email?.[0],
        subject: flat.subject?.[0],
        message: flat.message?.[0],
      });
      return;
    }
    setClientErrors(undefined);
  }

  if (state.status === "success") {
    return (
      <p role="status" className="max-w-[65ch] border border-hairline bg-surface p-4">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} onSubmit={validateBeforeSubmit} className="max-w-[40rem] space-y-5">
      {/* afterInteractive, not lazyOnload: the widget must have a token ready by
          the time someone submits, and lazyOnload can lose that race. */}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" name="name" error={errors?.name}>
          <input
            className={FIELD_CLASSES}
            type="text"
            id="name"
            name="name"
            required
            maxLength={100}
            defaultValue={values?.name}
            aria-invalid={errors?.name ? true : undefined}
            aria-describedby={errors?.name ? "name-error" : undefined}
          />
        </Field>
        <Field label="Email" name="email" error={errors?.email}>
          <input
            className={FIELD_CLASSES}
            type="email"
            id="email"
            name="email"
            required
            maxLength={200}
            defaultValue={values?.email}
            aria-invalid={errors?.email ? true : undefined}
            aria-describedby={errors?.email ? "email-error" : undefined}
          />
        </Field>
      </div>
      <Field label="Subject" name="subject" error={errors?.subject}>
        <input
          className={FIELD_CLASSES}
          type="text"
          id="subject"
          name="subject"
          required
          maxLength={150}
          defaultValue={values?.subject}
          aria-invalid={errors?.subject ? true : undefined}
          aria-describedby={errors?.subject ? "subject-error" : undefined}
        />
      </Field>
      <Field label="Message" name="message" error={errors?.message}>
        <textarea
          className={FIELD_CLASSES}
          id="message"
          name="message"
          rows={7}
          required
          minLength={10}
          maxLength={5000}
          defaultValue={values?.message}
          aria-invalid={errors?.message ? true : undefined}
          aria-describedby={errors?.message ? "message-error" : undefined}
        />
      </Field>

      {/* Visible on purpose. An invisible widget that has not issued a token yet
          fails the submit with no explanation the visitor can act on. */}
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="auto" />

      {state.status === "error" ? (
        <p role="alert" className="text-accent">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mono-label cursor-pointer border border-hairline bg-text px-6 py-3 text-bg hover:bg-accent disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mono-label mb-2 block text-muted" htmlFor={name}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} role="alert" className="mt-1 text-sm text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}
