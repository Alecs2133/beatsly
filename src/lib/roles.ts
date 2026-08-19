/**
 * Sursă unică de adevăr pentru roluri.
 *
 * Rolul vine din `profiles.role` (coloană în baza de date, protejată de RLS),
 * NU din `session.user.user_metadata`. `user_metadata` e scriptibil de către
 * utilizator prin `supabase.auth.updateUser({ data: { role: 'OWNER' } })`,
 * deci orice verificare bazată pe el poate fi ocolită.
 *
 * Verificările de aici sunt doar pentru UI — ascund butoane și rute.
 * Autorizarea reală se face în policies-urile RLS din
 * supabase/migrations/20260819120000_security_roles_and_credits.sql
 */

export type AppRole =
  | 'USER'
  | 'PRODUCER'
  | 'VIDEO MAKER'
  | 'EDITOR'
  | 'SOUND ENGINEER'
  | 'ARTIST'
  | 'PRODUCER ADMIN'
  | 'OWNER';

/** Poate modera sunete, aproba cereri de rol, șterge conținut. */
const ADMIN_ROLES: readonly string[] = ['PRODUCER ADMIN', 'OWNER'];

/** Poate urca sunete în cloud (ajung cu status 'pending' spre moderare). */
const PUBLISHER_ROLES: readonly string[] = [
  'PRODUCER',
  'VIDEO MAKER',
  'PRODUCER ADMIN',
  'OWNER',
];

export const isAdminRole = (role?: string | null): boolean =>
  !!role && ADMIN_ROLES.includes(role);

export const isPublisherRole = (role?: string | null): boolean =>
  !!role && PUBLISHER_ROLES.includes(role);

/** OWNER are credite nelimitate, la fel ca tier-ul 'ultimate'. */
export const hasUnlimitedCredits = (
  role?: string | null,
  tier?: string | null
): boolean => role === 'OWNER' || tier === 'ultimate';
