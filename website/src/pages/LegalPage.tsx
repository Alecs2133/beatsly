import { Fragment, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { fadeInUp, staggerContainer } from '../lib/animations';
import { useT } from '../i18n/context';
import type { TranslationKey } from '../i18n/en';
import { TERMS } from '../legal/terms';
import { PRIVACY } from '../legal/privacy';
import { COOKIES } from '../legal/cookies';
import { PAYMENTS } from '../legal/payments';
import { LEGAL_VERSION } from '../legal/version';
import { OPERATOR, OPERATOR_TOKENS } from '../legal/operator';
import type { LegalBlock, LegalDocId, LegalDocSet } from '../legal/types';
import './LegalPage.css';

const DOCS: Record<LegalDocId, { set: LegalDocSet; label: TranslationKey }> = {
  terms: { set: TERMS, label: 'footer_terms' },
  privacy: { set: PRIVACY, label: 'footer_privacy' },
  cookies: { set: COOKIES, label: 'footer_cookies' },
  payments: { set: PAYMENTS, label: 'footer_payments' },
};

function isDocId(value: string | undefined): value is LegalDocId {
  return !!value && value in DOCS;
}

/** Înlocuiește `{operator_email}` etc. și face URL-urile din text clickabile. */
function renderText(text: string): ReactNode {
  const filled = text.replace(/\{(\w+)\}/g, (match, name: string) => OPERATOR_TOKENS[name] ?? match);
  const parts = filled.split(/(https?:\/\/[^\s,;)]+)/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer">{part.replace(/^https?:\/\//, '')}</a>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    )
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (typeof block === 'string') return <p>{renderText(block)}</p>;
  return (
    <ul>
      {block.list.map((item, i) => (
        <li key={i}>{renderText(item)}</li>
      ))}
    </ul>
  );
}

export function LegalPage() {
  const { doc } = useParams();
  const { t, lang } = useT();

  if (!isDocId(doc)) return <Navigate to="/legal/terms" replace />;

  const content = DOCS[doc].set[lang];
  const updated = new Date(LEGAL_VERSION).toLocaleDateString(lang === 'ro' ? 'ro-RO' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <header className="page-intro legal-intro">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.h1 className="page-title" variants={fadeInUp}>{content.title}</motion.h1>
          <motion.p className="legal-updated" variants={fadeInUp}>
            {t('legal_last_updated', { date: updated })}
          </motion.p>
        </motion.div>
      </header>

      <section className="legal-layout">
        <aside className="legal-aside glass">
          <h2>{t('legal_toc')}</h2>
          <ol>
            {content.sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => {
                    // Fără `#` în URL — vezi ScrollManager din Layout.
                    e.preventDefault();
                    document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>

          <h2>{t('legal_other_docs')}</h2>
          <ul>
            {(Object.keys(DOCS) as LegalDocId[])
              .filter((id) => id !== doc)
              .map((id) => (
                <li key={id}>
                  <Link to={`/legal/${id}`}>{t(DOCS[id].label)}</Link>
                </li>
              ))}
          </ul>
        </aside>

        <article className="legal-article glass">
          {!OPERATOR.complete && (
            <div className="legal-draft">
              <AlertTriangle size={16} />
              <span>{t('legal_draft_notice')}</span>
            </div>
          )}

          <p className="legal-lead">{renderText(content.intro)}</p>

          {content.sections.map((section) => (
            <section key={section.id} id={section.id} className="legal-section">
              <h2>{section.heading}</h2>
              {section.body.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </section>
          ))}
        </article>
      </section>
    </>
  );
}
