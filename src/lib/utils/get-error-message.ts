/**
 * Safely extract a human-readable error message from any thrown value.
 *
 * Handles:
 * - `Error` instances (standard JS errors)
 * - Supabase `PostgrestError` objects (`{ message: string, details: string }`)
 * - Fetch response JSON (`{ error: { message: string } }`)
 * - Plain strings
 * - Anything else → fallback
 */
export function getErrorMessage(err: unknown, fallback = '오류가 발생했습니다.'): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;

  if (typeof err === 'object' && err !== null) {
    // Supabase PostgrestError or similar { message: string }
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.length > 0) return obj.message;

    // Nested { error: { message: string } }
    if (typeof obj.error === 'object' && obj.error !== null) {
      const inner = obj.error as Record<string, unknown>;
      if (typeof inner.message === 'string' && inner.message.length > 0) return inner.message;
    }
  }

  return fallback;
}
