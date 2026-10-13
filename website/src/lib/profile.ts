import { supabase } from './supabase';
import { readFunctionError } from './functionError';
import type { SocialLinks } from './socialLinks';

// Aceeași logică ca în aplicație (src/lib/profile.ts), pe clientul site-ului.

const AVATAR_BUCKET = 'avatars';
const AVATAR_SIZE = 256;

export interface MyProfile {
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_path: string | null;
  social_links: unknown;
  tier: 'free' | 'producer' | 'ultimate';
  credits: number;
  stripe_customer_id: string | null;
}

export async function fetchMyProfile(userId: string): Promise<MyProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, display_name, bio, avatar_path, social_links, tier, credits, stripe_customer_id')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as MyProfile | null;
}

export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('invalid_image'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Decupează pătrat din centru, 256×256, WebP (sau JPEG unde WebP nu se poate encoda). */
async function resizeAvatar(file: Blob): Promise<Blob> {
  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_unavailable');
  ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  const webp = await canvasToBlob(canvas, 'image/webp', 0.85);
  if (webp && webp.type === 'image/webp') return webp;
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.88);
  if (!jpeg) throw new Error('encode_failed');
  return jpeg;
}

export async function uploadAvatar(userId: string, file: Blob, previousPath?: string | null): Promise<string> {
  const blob = await resizeAvatar(file);
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, blob, { contentType: blob.type, cacheControl: '31536000' });
  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId);
  if (updateError) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    throw updateError;
  }
  if (previousPath && previousPath !== path) {
    await supabase.storage.from(AVATAR_BUCKET).remove([previousPath]);
  }
  return path;
}

export async function removeAvatar(userId: string, path: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ avatar_path: null }).eq('id', userId);
  if (error) throw error;
  await supabase.storage.from(AVATAR_BUCKET).remove([path]);
}

export async function updatePublicProfile(
  userId: string,
  fields: { display_name: string | null; bio: string | null; social_links: SocialLinks }
): Promise<void> {
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId);
  if (error) throw error;
}

export async function deleteAccount(): Promise<'deleted' | 'active_subscription'> {
  const { error } = await supabase.functions.invoke('delete-account', { body: { confirm: 'DELETE' } });
  if (!error) return 'deleted';
  const { status, detail } = await readFunctionError(error);
  if (status === 409 || detail.error === 'active_subscription') return 'active_subscription';
  throw new Error(detail.error ?? error.message);
}
