import type { ZodError } from "zod";

export type AdminFormState = {
  status: "idle" | "error";
  message?: string;
  errors?: Record<string, string>;
};

export const ADMIN_FORM_IDLE: AdminFormState = { status: "idle" };

export function zodErrorState(error: ZodError): AdminFormState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return { status: "error", message: "Please fix the highlighted fields.", errors };
}

export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
