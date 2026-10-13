import { createContext, useContext } from 'react';
import { en, type TranslationKey } from './en';

export type Lang = 'en' | 'ro';

export const LANG_STORAGE_KEY = 'beatsly_lang';

export interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Textul pentru `key`, cu `{nume}` înlocuit din `vars`. */
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

export const I18nContext = createContext<I18n>({
  lang: 'en',
  setLang: () => {},
  t: (key) => en[key],
});

export function useT(): I18n {
  return useContext(I18nContext);
}

export function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'ro') return saved;
  } catch {
    // storage blocat — cădem pe limba browserului
  }
  return navigator.language?.toLowerCase().startsWith('ro') ? 'ro' : 'en';
}
