import { supabase } from './supabase';

/**
 * Trimite o eroare către `client_error_reports`. Best-effort — o eroare la
 * raportarea erorii n-ar trebui să mai crape încă o dată aplicația, deci
 * orice eșec de-aici se oprește într-un console.error, nu urcă mai departe.
 */
export function reportError(context: string, error: unknown): void {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    supabase.auth.getUser().then(({ data }) => {
      supabase
        .from('client_error_reports')
        .insert({
          user_id: data.user?.id ?? null,
          platform: 'desktop',
          context: context.slice(0, 200),
          message: message.slice(0, 2000),
          stack: stack?.slice(0, 8000),
          app_version: __APP_VERSION__,
        })
        .then(({ error: insertError }) => {
          if (insertError) console.error('reportError insert failed:', insertError);
        });
    });
  } catch (err) {
    console.error('reportError itself failed:', err);
  }
}

/** Prinde erorile care ar fi scăpat total necaptate — sincrone și promisiuni respinse. */
export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (event) => {
    reportError('window.onerror', event.error ?? event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportError('unhandledrejection', event.reason);
  });
}
