/**
 * Funcții care există în cod, dar nu sunt încă gata pentru useri. Pune pe
 * `true` ca să le activezi — rutele, link-urile din sidebar și butoanele se
 * adaptează singure.
 */
export const FEATURES = {
  aiGenerator: false,
  helpCenter: false,
  /** Cumpărarea de credite. Oprită până există o firmă care poate încasa; pe
   *  server o blochează și PAYMENTS_ENABLED din create-checkout. */
  creditPurchases: false,
} as const;
