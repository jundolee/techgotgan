export type SignupReason = "favorite_save" | "reading_progress";

export function normalizeSignupReason(value: unknown): SignupReason | undefined {
  return value === "favorite_save" || value === "reading_progress" ? value : undefined;
}
