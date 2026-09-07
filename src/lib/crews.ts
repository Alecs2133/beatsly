import { supabase } from './supabase';

export interface Crew {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface CrewMember {
  user_id: string;
  username: string | null;
  joined_at: string;
  is_owner: boolean;
}

/** RLS scopes this la crew-urile din care userul curent face parte. */
export async function fetchMyCrews(): Promise<Crew[]> {
  const { data, error } = await supabase
    .from('crews')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * `profiles_select_own` nu ar lăsa userul să vadă username-urile celorlalți
 * membri printr-un query direct — funcția asta e scrisă special pentru caz.
 */
export async function fetchCrewMembers(crewId: string): Promise<CrewMember[]> {
  const { data, error } = await supabase.rpc('get_crew_members', { p_crew_id: crewId });
  if (error) throw error;
  return (data ?? []) as CrewMember[];
}

/** Verificarea de tier (Ultimate) se face server-side, în funcție — nu aici. */
export async function createCrew(name: string): Promise<Crew> {
  const { data, error } = await supabase.rpc('create_crew', { p_name: name });
  if (error) throw error;
  return data as Crew;
}

export async function addCrewMember(crewId: string, username: string): Promise<void> {
  const { error } = await supabase.rpc('add_crew_member', {
    p_crew_id: crewId,
    p_username: username,
  });
  if (error) throw error;
}

export async function removeCrewMember(crewId: string, userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_crew_member', {
    p_crew_id: crewId,
    p_user_id: userId,
  });
  if (error) throw error;
}
