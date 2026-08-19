import { create } from 'zustand';
import { User, Session, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useAppStore } from './useAppStore';
import { AppRole } from '../lib/roles';

let realtimeChannel: RealtimeChannel | null = null;
let authSubscription: { unsubscribe: () => void } | null = null;

export interface UserProfile {
  id: string;
  /**
   * Rolul vine din baza de date, nu din `user_metadata` (care e scriptibil
   * de utilizator). Vezi src/lib/roles.ts.
   */
  role: AppRole;
  tier: 'free' | 'producer' | 'ultimate';
  credits: number;
  last_refill_date: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  phone_number?: string;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

// NOTĂ: nu există `deductCredit` aici. Creditele se consumă exclusiv pe server,
// în aceeași cerere cu operațiunea plătită (`get-download-url`,
// `generate-audio`), ca ele să nu poată fi disociate. Valoarea nouă ajunge
// înapoi în store prin abonamentul realtime de mai jos.

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  initialized: false,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      await loadProfile(session.user.id, set);
      subscribeToProfile(session.user.id, get, set);
    }

    set({ session, user: session?.user ?? null, initialized: true });

    // Evită abonamente duplicate dacă initialize() e apelat de două ori
    // (StrictMode montează efectele de două ori în dev).
    authSubscription?.unsubscribe();
    const { data } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (nextSession?.user) {
        await loadProfile(nextSession.user.id, set);
        subscribeToProfile(nextSession.user.id, get, set);
      } else {
        set({ profile: null });
        if (realtimeChannel) {
          supabase.removeChannel(realtimeChannel);
          realtimeChannel = null;
        }
      }
      set({ session: nextSession, user: nextSession?.user ?? null });
    });
    authSubscription = data.subscription;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }
    set({ user: null, session: null, profile: null });
  },

}));

type SetState = (partial: Partial<AuthState>) => void;

/**
 * Încarcă profilul și revendică refill-ul zilnic.
 * Ambele decizii (cât refill, când) sunt luate în baza de date — clientul doar
 * cere, nu calculează.
 */
async function loadProfile(userId: string, set: SetState) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Failed to load profile:', error);
    return;
  }

  // Profilul e creat de trigger-ul `on_auth_user_created`. Fallback-ul acoperă
  // conturile create înainte de existența trigger-ului.
  if (!profile) {
    const { data: created, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: userId })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create profile:', insertError);
      return;
    }
    set({ profile: created as UserProfile });
  } else {
    set({ profile: profile as UserProfile });
  }

  const { data: refreshed, error: refillError } = await supabase.rpc('claim_daily_refill');
  if (refillError) {
    console.error('claim_daily_refill failed:', refillError);
    return;
  }
  if (refreshed) {
    set({ profile: refreshed as UserProfile });
  }
}

function subscribeToProfile(
  userId: string,
  get: () => AuthState,
  set: SetState
) {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel(`profiles:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        const newProfile = payload.new as UserProfile;
        const currentProfile = get().profile;
        set({ profile: newProfile });

        if (!currentProfile) return;

        if (newProfile.credits > currentProfile.credits) {
          const diff = newProfile.credits - currentProfile.credits;
          useAppStore.getState().showToast(`+${diff} Credits received! 🎉`, 'success');
        } else if (newProfile.tier !== currentProfile.tier) {
          useAppStore
            .getState()
            .showToast(`Tier upgraded to ${newProfile.tier.toUpperCase()}! 🎉`, 'success');
        } else if (newProfile.role !== currentProfile.role) {
          useAppStore
            .getState()
            .showToast(`Role updated to ${newProfile.role}! 🎉`, 'success');
        }
      }
    )
    .subscribe();
}
