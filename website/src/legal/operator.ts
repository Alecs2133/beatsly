/**
 * Datele operatorului (cine vinde și cine prelucrează datele). Legea
 * (OUG 34/2014, Legea 365/2002, GDPR) cere ca ele să fie afișate.
 *
 * DE COMPLETAT înainte de pornirea abonamentelor — apoi setează `complete: true`
 * ca să dispară avertismentul de pe paginile legale.
 */
export const OPERATOR = {
  complete: false,
  /** Numele firmei sau al persoanei (PFA / SRL / persoană fizică). */
  name: '[Numele operatorului]',
  /** Nr. de înregistrare la Registrul Comerțului (ex. J40/1234/2026). */
  registration: '[Nr. Registrul Comerțului]',
  /** CUI / CIF. */
  taxId: '[CUI]',
  address: '[Adresa sediului]',
  email: '[email de contact]',
};

export const SITE_URL = 'https://beatsly.vercel.app';

/** Valorile care înlocuiesc `{operator_name}` etc. în textele legale. */
export const OPERATOR_TOKENS: Record<string, string> = {
  operator_name: OPERATOR.name,
  operator_registration: OPERATOR.registration,
  operator_tax_id: OPERATOR.taxId,
  operator_address: OPERATOR.address,
  operator_email: OPERATOR.email,
  site: SITE_URL,
};
