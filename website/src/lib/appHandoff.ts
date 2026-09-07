import { supabase } from './supabase';

/**
 * Cheia sub care ținem codul de pairing cât timp userul e pe site — necesară
 * pentru cazul de signup: pagina /app-login nu are încă sesiune când
 * userul trebuie doar să-și confirme emailul, așa că /email-confirmed
 * termină handoff-ul mai târziu, citind codul de aici.
 */
export const PENDING_APP_CODE_KEY = 'beatsly_pending_app_code';

/**
 * Trimite sesiunea curentă către edge function-ul care o leagă de codul
 * generat de aplicația desktop. Nu face nimic dacă nu există un cod în
 * așteptare sau dacă userul nu e de fapt logat — ambele sunt stări normale,
 * nu erori (majoritatea vizitelor pe site n-au nicio aplicație care așteaptă).
 */
export async function submitPendingAppAuthCode(): Promise<boolean> {
  const code = localStorage.getItem(PENDING_APP_CODE_KEY);
  if (!code) return false;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;

  const { error } = await supabase.functions.invoke('submit-auth-code', {
    body: { code, refresh_token: session.refresh_token },
  });
  if (error) throw error;

  localStorage.removeItem(PENDING_APP_CODE_KEY);
  return true;
}
