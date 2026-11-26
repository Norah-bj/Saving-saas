import { z } from "zod";
import { ApiError } from "@/lib/api/client";

/**
 * Field rules shared by every form. They mirror the backend's
 * common/ValidationRules.java, which enforces the same formats server-side —
 * keep the two in step.
 */

export const PASSWORD_MIN = 8;

/** Required: 8+ characters with a letter and a number (what the server enforces). */
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(128, "Use at most 128 characters")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");

/** Rwandan national ID: 16 digits (spaces are ignored). */
export const nationalIdSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s+/g, ""))
  .pipe(z.string().regex(/^\d{16}$/, "National ID must be exactly 16 digits"));

/** Rwandan mobile: 07X XXX XXXX (072/073/078/079), optionally +250 7X…; spaces allowed. */
export const PHONE_REGEX = /^(\+?250\s?|0)7[2389](\s?\d){7}$/;
export const phoneSchema = z
  .string()
  .trim()
  .regex(PHONE_REGEX, "Enter a Rwandan mobile number, e.g. 0788 123 456");

export const emailSchema = z.string().trim().min(1, "Email is required").email("Enter a valid email address").max(160);

export const employeeIdSchema = z
  .string()
  .trim()
  .min(1, "Employee ID is required")
  .regex(/^[A-Za-z0-9][A-Za-z0-9._/-]{0,39}$/, "Use letters, numbers, - _ / . (up to 40 characters)");

export const hexColorSchema = z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Use a colour like #1f6f5c");

export const requiredText = (label: string, min = 1, max = 200) =>
  z
    .string()
    .trim()
    .min(min, min > 1 ? `${label} must be at least ${min} characters` : `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

/** A password plus its confirmation; the mismatch error lands on the confirm field. */
export const newPasswordFields = {
  password: passwordSchema,
  confirmPassword: z.string().min(1, "Repeat your password"),
};
export const passwordsMatch = <T extends { password: string; confirmPassword: string }>(v: T) =>
  v.password === v.confirmPassword;
export const passwordsMatchError = { message: "The passwords don't match", path: ["confirmPassword"] };

/** Copies the server's per-field validation messages onto a react-hook-form form. */
export function applyServerFieldErrors(
  err: unknown,
  setError: (name: never, error: { type: string; message: string }) => void,
  fieldMap: Record<string, string> = {}
): boolean {
  if (!(err instanceof ApiError) || !err.details) return false;
  let applied = false;
  for (const [field, message] of Object.entries(err.details)) {
    setError((fieldMap[field] ?? field) as never, { type: "server", message });
    applied = true;
  }
  return applied;
}

/** Strength checks shown under a new-password field. `required` ones must pass to submit. */
export function passwordChecks(password: string) {
  return [
    { label: `At least ${PASSWORD_MIN} characters`, met: password.length >= PASSWORD_MIN, required: true },
    { label: "A letter and a number", met: /[A-Za-z]/.test(password) && /\d/.test(password), required: true },
    { label: "Upper and lower case letters", met: /[a-z]/.test(password) && /[A-Z]/.test(password), required: false },
    { label: "A symbol, e.g. ! @ # ?", met: /[^A-Za-z0-9]/.test(password), required: false },
    { label: "12 characters or more", met: password.length >= 12, required: false },
  ];
}

const COMMON = ["password", "12345678", "qwerty", "ikimina", "sacco", "rwanda", "letmein", "welcome"];

/** 0–4 score with a label, for the strength bar. */
export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  if (!password) return { score: 0, label: "" };
  const checks = passwordChecks(password);
  const requiredMet = checks.filter((c) => c.required).every((c) => c.met);
  const extras = checks.filter((c) => !c.required && c.met).length;
  const lower = password.toLowerCase();
  const isCommon = COMMON.some((w) => lower.includes(w)) && password.length < 14;
  if (!requiredMet) return { score: 1, label: "Too weak" };
  if (isCommon || extras === 0) return { score: 2, label: "Fair" };
  if (extras === 1 || extras === 2) return { score: 3, label: "Good" };
  return { score: 4, label: "Strong" };
}
