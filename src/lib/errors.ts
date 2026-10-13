/**
 * Mesajul unei erori prinse într-un `catch`, oricare i-ar fi forma: `Error`,
 * obiectele de eroare Supabase (`{ message, code, ... }`) sau un string.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return String(err);
}

export interface FunctionErrorDetail {
  error?: string;
  retryable?: boolean;
}

/**
 * Statusul HTTP și corpul JSON al unei erori de la `supabase.functions.invoke`.
 * La un răspuns non-2xx, supabase-js pune obiectul `Response` pe
 * `error.context`; corpul conține mesajul nostru (`{ error: '...' }`).
 */
export async function readFunctionError(error: unknown): Promise<{ status?: number; detail: FunctionErrorDetail }> {
  const context = (error as { context?: unknown } | null)?.context as
    | { status?: unknown; json?: () => Promise<unknown> }
    | undefined;

  const status = typeof context?.status === 'number' ? context.status : undefined;
  let detail: FunctionErrorDetail = {};
  try {
    const body = await context?.json?.();
    if (body && typeof body === 'object') detail = body as FunctionErrorDetail;
  } catch {
    // corp non-JSON
  }
  return { status, detail };
}
