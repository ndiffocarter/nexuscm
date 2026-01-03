import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // We split “auth initialized” and “role/profile loaded” to avoid redirecting
  // before we actually know if the user is admin or client.
  const [authInitialized, setAuthInitialized] = useState(false);
  const [accessInitialized, setAccessInitialized] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthInitialized(true);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthInitialized(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadAccess(userId: string) {
      setAccessInitialized(false);

      try {
        const [{ data: profileData }, { data: adminFlag }] = await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle(),
          // Roles are validated server-side via a DB function.
          supabase.rpc('has_role', { _role: 'admin', _user_id: userId }),
        ]);

        if (cancelled) return;

        setProfile((profileData as UserProfile) ?? null);
        setIsAdmin(Boolean(adminFlag));
      } finally {
        if (!cancelled) setAccessInitialized(true);
      }
    }

    if (!authInitialized) return;

    if (!user) {
      setProfile(null);
      setIsAdmin(false);
      setAccessInitialized(true);
      return;
    }

    loadAccess(user.id);

    return () => {
      cancelled = true;
    };
  }, [authInitialized, user?.id]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
    setAuthInitialized(true);
    setAccessInitialized(true);
  };

  const isLoading = !authInitialized || !accessInitialized;

  return (
    <AuthContext.Provider value={{ user, session, profile, isLoading, isAdmin, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

