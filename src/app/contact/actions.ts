"use server";

import { tooManyAttempts } from "@/lib/attempt-limit";
import { HONEYPOT_FIELD } from "@/lib/contact-fields";
import { requestIp } from "@/lib/request-ip";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { contactSchema } from "@/lib/validation";
import { RateLimitError, createInquiry } from "@/services/contact";

/**
 * Verification runs against Cloudflare, so an unthrottled endpoint lets one
 * client drive unbounded outbound requests. This bounds the attempts, not the
 * stored inquiries, which the service limits separately.
 */
const MAX_ATTEMPTS_PER_IP = 10;
const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;

const SUCCESS_MESSAGE = "Thanks, your message has been sent.";

type ContactFields = "name" | "email" | "subject" | "message";

export type ContactFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<ContactFields, string>>;
  /** Echoed back on error so React 19's automatic form reset doesn't wipe input. */
  values?: Partial<Record<ContactFields, string>>;
};

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    message: String(formData.get("message") ?? ""),
  };
  const parsed = contactSchema.safeParse(values);

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      values,
      fieldErrors: {
        name: flat.name?.[0],
        email: flat.email?.[0],
        subject: flat.subject?.[0],
        message: flat.message?.[0],
      },
    };
  }

  const ip = await requestIp();
  if (tooManyAttempts(ip ?? "unknown", MAX_ATTEMPTS_PER_IP, ATTEMPT_WINDOW_MS)) {
    return { status: "error", message: "Too many attempts. Please try again later.", values };
  }

  const token = formData.get("cf-turnstile-response");
  const human = typeof token === "string" && (await verifyTurnstileToken(token, ip));
  if (!human) {
    return {
      status: "error",
      message: "Human verification failed. Please try again (JavaScript is required).",
      values,
    };
  }

  const honeypotTripped = String(formData.get(HONEYPOT_FIELD) ?? "").trim().length > 0;

  try {
    await createInquiry(parsed.data, ip, honeypotTripped);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return { status: "error", message: error.message, values };
    }
    console.error("Failed to store contact inquiry", error);
    return { status: "error", message: "Something went wrong. Please try again later.", values };
  }

  // Deliberately the same answer whether the message reached the inbox or the
  // spam list. Telling a bot it was caught is how it learns to tune itself,
  // and a person caught by mistake still had their message stored.
  return { status: "success", message: SUCCESS_MESSAGE };
}
