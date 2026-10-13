import type { TranslationKey } from '../i18n/en';

export interface Faq {
  id: string;
  q: TranslationKey;
  a: TranslationKey;
}

// Textele sunt în dicționare (i18n/en.ts, i18n/ro.ts); aici doar ordinea.
export const FAQS: Faq[] = [
  { id: 'free', q: 'faq_free_q', a: 'faq_free_a' },
  { id: 'credits', q: 'faq_credits_q', a: 'faq_credits_a' },
  { id: 'ai-generator', q: 'faq_ai_q', a: 'faq_ai_a' },
  { id: 'platforms', q: 'faq_platforms_q', a: 'faq_platforms_a' },
  { id: 'data-safety', q: 'faq_data_q', a: 'faq_data_a' },
];

export const findFaq = (id: string): Faq =>
  FAQS.find((f) => f.id === id) ?? FAQS[0];
