import { supabase } from './supabase';

export interface Collection {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
}

export async function fetchMyCollections(): Promise<Collection[]> {
  const { data, error } = await supabase
    .from('collections')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createCollection(name: string): Promise<Collection> {
  const { data: userData } = await supabase.auth.getUser();
  const owner_id = userData.user?.id;
  if (!owner_id) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('collections')
    .insert({ name: name.trim(), owner_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCollection(collectionId: string): Promise<void> {
  const { error } = await supabase.from('collections').delete().eq('id', collectionId);
  if (error) throw error;
}

/** Doar id-urile sunetelor — pagina care afișează colecția le rezolvă din `sounds`. */
export async function fetchCollectionSoundIds(collectionId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('collection_sounds')
    .select('sound_id')
    .eq('collection_id', collectionId)
    .order('added_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(row => row.sound_id);
}

export async function addSoundToCollection(collectionId: string, soundId: string | number): Promise<void> {
  const { error } = await supabase
    .from('collection_sounds')
    .insert({ collection_id: collectionId, sound_id: soundId });
  if (error) throw error;
}

export async function removeSoundFromCollection(collectionId: string, soundId: string | number): Promise<void> {
  const { error } = await supabase
    .from('collection_sounds')
    .delete()
    .eq('collection_id', collectionId)
    .eq('sound_id', soundId);
  if (error) throw error;
}
