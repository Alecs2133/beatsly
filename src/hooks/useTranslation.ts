import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { en, TranslationKeys } from '../i18n/en';
import { ro } from '../i18n/ro';

const dictionaries = {
  en,
  ro
};

export const useTranslation = () => {
  const language = useAppStore(state => state.language);
  
  // Stabil între randări (se schimbă doar cu limba), ca `t` să poată sta în
  // dependențele unui useEffect fără să-l repornească la fiecare randare.
  const t = useCallback(
    (key: TranslationKeys): string => dictionaries[language][key] || dictionaries.en[key] || key,
    [language]
  );

  return { t, language };
};
