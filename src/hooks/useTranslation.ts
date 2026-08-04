import { useAppStore } from '../store/useAppStore';
import { en, TranslationKeys } from '../i18n/en';
import { ro } from '../i18n/ro';

const dictionaries = {
  en,
  ro
};

export const useTranslation = () => {
  const language = useAppStore(state => state.language);
  
  const t = (key: TranslationKeys): string => {
    return dictionaries[language][key] || dictionaries.en[key] || key;
  };

  return { t, language };
};
