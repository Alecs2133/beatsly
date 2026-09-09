import { supabase } from './supabase';

export interface PublicProfile {
  user_id: string;
  username: string | null;
  sound_count: number;
  follower_count: number;
  following_count: number;
}

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase.rpc('get_public_profile', { p_user_id: userId });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : data ? [data] : [];
  return rows[0] ?? null;
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
