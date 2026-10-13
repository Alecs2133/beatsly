import type { Lang } from '../i18n/context';

/** Un paragraf, sau o listă cu puncte. */
export type LegalBlock = string | { list: string[] };

export interface LegalSection {
  id: string;
  heading: string;
  body: LegalBlock[];
}

export interface LegalDoc {
  title: string;
  intro: string;
  sections: LegalSection[];
}

/** Fiecare document există obligatoriu în ambele limbi. */
export type LegalDocSet = Record<Lang, LegalDoc>;

export type LegalDocId = 'terms' | 'privacy' | 'cookies' | 'payments';
