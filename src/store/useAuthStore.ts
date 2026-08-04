import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
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
  deductCredit: () => Promise<boolean>;
}

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
      await fetchAndProcessProfile(session.user.id, set);
    }
    
    set({ session, user: session?.user || null, initialized: true });

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await fetchAndProcessProfile(session.user.id, set);
      } else {
        set({ profile: null });
      }
      set({ session, user: session?.user || null });
    });
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },
  deductCredit: async () => {
    const { profile, user, session } = get();
    if (!profile || !user) return false;
    
    const role = session?.user?.user_metadata?.role;
    if (profile.tier === 'ultimate' || role === 'OWNER') return true; // Ultimate & Owner have unlimited
    if (profile.credits <= 0) return false;
    
    const newCredits = profile.credits - 1;
    const { error } = await supabase
      .from('profiles')
      .update({ credits: newCredits })
      .eq('id', user.id);
      
    if (error) {
      console.error('Failed to deduct credit:', error);
      return false;
    }
    
    set({ profile: { ...profile, credits: newCredits } });
    return true;
  }
}));

async function fetchAndProcessProfile(userId: string, set: any) {
  let { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // No profile exists, create one
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: userId, tier: 'free', credits: 5, last_refill_date: new Date().toISOString().split('T')[0] })
      .select()
      .single();
      
    if (!insertError && newProfile) {
      profile = newProfile;
    }
  }

  if (profile) {
    // Daily Refill Logic
    const today = new Date().toISOString().split('T')[0];
    if (profile.last_refill_date !== today) {
      let newCredits = profile.credits;
      
      if (profile.tier === 'free' && newCredits < 5) {
        newCredits = 5;
      } else if (profile.tier === 'producer' && newCredits < 100) {
        newCredits = 100;
      }
      
      // Update DB if date or credits changed
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .update({ credits: newCredits, last_refill_date: today })
        .eq('id', userId)
        .select()
        .single();
        
      if (updatedProfile) {
        profile = updatedProfile;
      }
    }
    set({ profile });
  }
}
