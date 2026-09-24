import type { FieldErrors } from "@/lib/validation";

export type ActionResult<T = undefined> =
  | { status: "idle" }
  | { status: "success"; message: string; data?: T }
  | { status: "error"; message: string; fieldErrors?: FieldErrors };

export const IDLE: ActionResult<never> = { status: "idle" };

type PostgrestLikeError = { code?: string; message?: string; details?: string } | null | undefined;

export function isUniqueViolation(error: PostgrestLikeError): boolean {
  return error?.code === "23505";
}

export function isPermissionError(error: PostgrestLikeError): boolean {
  return error?.code === "42501" || error?.code === "PGRST301";
}
