/**
 * Detail teknis hanya ke log server (Vercel logs / terminal). Pengguna cukup menerima pesan sederhana.
 */
export function logError(context: string, error: unknown): void {
  if (process.env.NODE_ENV === "test") return;
  const detail =
    error instanceof Error
      ? { message: error.message, stack: process.env.NODE_ENV === "development" ? error.stack : undefined }
      : error;
  console.error(`[tpu] ${context}`, detail);
}
