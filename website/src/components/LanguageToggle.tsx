import { useT } from '../i18n/context';

/** Comutator EN / RO. Alegerea se păstrează în localStorage. */
export function LanguageToggle() {
  const { lang, setLang, t } = useT();
  return (
    <div className="lang-toggle" role="group" aria-label={t('nav_language')}>
      {(['en', 'ro'] as const).map((code) => (
        <button
          key={code}
          type="button"
          className={lang === code ? 'active' : undefined}
          aria-pressed={lang === code}
          onClick={() => setLang(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
