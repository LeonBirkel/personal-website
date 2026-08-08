"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AdminField,
  INPUT_CLASSES,
  SubmitButton,
  FormError,
} from "@/components/admin/form-controls";
import { authClient } from "@/lib/auth-client";
import { loginSchema } from "@/lib/validation";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
    if (!parsed.success) {
      setError("Enter a valid email and a password of at least 8 characters.");
      return;
    }

    setPending(true);
    setError(undefined);
    const { error: signInError } = await authClient.signIn.email(parsed.data);
    setPending(false);
    if (signInError) {
      setError(signInError.message ?? "Sign-in failed.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    // method="post" so a no-JS submit never puts credentials in the URL.
    <form method="post" onSubmit={handleSubmit} className="max-w-[24rem] space-y-5">
      <AdminField label="Email" name="email" error={undefined}>
        <input
          className={INPUT_CLASSES}
          type="email"
          id="email"
          name="email"
          required
          autoComplete="username"
        />
      </AdminField>
      <AdminField label="Password" name="password" error={undefined}>
        <input
          className={INPUT_CLASSES}
          type="password"
          id="password"
          name="password"
          required
          autoComplete="current-password"
        />
      </AdminField>
      <FormError message={error} />
      <SubmitButton pending={pending}>Sign in</SubmitButton>
    </form>
  );
}
