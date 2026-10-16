import { supabase } from './supabase';
import { readSocialLinks, type SocialLinks } from './socialLinks';

export interface PublicProfile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_path: string | null;
  social_links: SocialLinks;
  /** Lipsește până se aplică migrarea 20261017110000. */
  role?: string | null;
  sound_count: number;
  follower_count: number;
  following_count: number;
}

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase.rpc('get_public_profile', { p_user_id: userId });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    // jsonb scris de user — validat din nou la citire, ca un link
    // `javascript:` strecurat direct prin API să nu ajungă clickabil.
    social_links: readSocialLinks(row.social_links),
  };
}

/** Numele de afișat: numele ales, altfel username-ul. */
export function profileName(p: { display_name?: string | null; username?: string | null } | null | undefined): string {
  return p?.display_name?.trim() || p?.username?.trim() || '';
}

export async function isFollowing(userId: string): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;
  if (!me) return false;

  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', me)
    .eq('followed_id', userId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function followUser(userId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;
  if (!me) throw new Error('Not authenticated');

  const { error } = await supabase.from('follows').insert({ follower_id: me, followed_id: userId });
  if (error) throw error;
}

export async function unfollowUser(userId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const me = userData.user?.id;
  if (!me) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', me)
    .eq('followed_id', userId);
  if (error) throw error;
}
