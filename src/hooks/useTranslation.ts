import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { en, TranslationKeys } from '../i18n/en';
import { ro } from '../i18n/ro';

const dictionaries = {
  en,
  ro
};

/** Textul pentru `key` în limba dată, cu `{nume}` înlocuit din `vars`. */
export function translate(
  language: keyof typeof dictionaries,
  key: TranslationKeys,
  vars?: Record<string, string | number>
): string {
  let text: string = dictionaries[language][key] || dictionaries.en[key] || key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}

export const useTranslation = () => {
  const language = useAppStore(state => state.language);

  // Stabil între randări (se schimbă doar cu limba), ca `t` să poată sta în
  // dependențele unui useEffect fără să-l repornească la fiecare randare.
  const t = useCallback(
    (key: TranslationKeys, vars?: Record<string, string | number>): string => translate(language, key, vars),
    [language]
  );

  return { t, language };
};
