import { Fragment, type ReactNode } from 'react';

/**
 * Înlocuiește `{nume}` dintr-un text tradus cu elemente React (de ex. link-uri),
 * ca o propoziție cu link-uri să se poată traduce întreagă, nu pe bucăți.
 *   richText(t('auth_accept_terms'), { terms: <Link …/>, privacy: <Link …/> })
 */
export function richText(template: string, parts: Record<string, ReactNode>): ReactNode {
  const pieces = template.split(/\{(\w+)\}/);
  return pieces.map((piece, i) =>
    // Split cu grup de captură: indicii impari sunt numele placeholder-elor.
    i % 2 === 1 ? <Fragment key={i}>{parts[piece] ?? `{${piece}}`}</Fragment> : piece
  );
}
