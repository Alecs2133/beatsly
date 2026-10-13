export interface FunctionErrorDetail {
  error?: string;
  message?: string;
}

/**
 * Statusul HTTP și corpul JSON al unei erori de la `supabase.functions.invoke`.
 * La un răspuns non-2xx, supabase-js pune obiectul `Response` pe
 * `error.context`. (Aceeași logică ca în aplicație, src/lib/errors.ts.)
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
