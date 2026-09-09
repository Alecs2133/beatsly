export type SoundLicense = 'royalty_free' | 'attribution_required' | 'exclusive';

export const LICENSE_OPTIONS: { value: SoundLicense; label: string }[] = [
  { value: 'royalty_free', label: 'Royalty-Free' },
  { value: 'attribution_required', label: 'Attribution Required' },
  { value: 'exclusive', label: 'Exclusive' },
];

export const LICENSE_LABELS: Record<SoundLicense, string> = {
  royalty_free: 'Royalty-Free',
  attribution_required: 'Attribution Required',
  exclusive: 'Exclusive',
};

/** Etichetă scurtă pentru spații strânse (rândul dintr-un SoundGrid). */
export const LICENSE_SHORT_LABELS: Record<SoundLicense, string> = {
  royalty_free: 'RF',
  attribution_required: 'AT',
  exclusive: 'EX',
};

export function licenseLabel(license?: string | null): string {
  return LICENSE_LABELS[(license as SoundLicense) ?? 'royalty_free'] ?? license ?? 'Royalty-Free';
}

export function licenseShortLabel(license?: string | null): string {
  return LICENSE_SHORT_LABELS[(license as SoundLicense) ?? 'royalty_free'] ?? 'RF';
}
