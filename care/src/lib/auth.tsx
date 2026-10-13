import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { AdminScope } from './types';

interface AuthState {
  session: Session | null;
  user: User | null;
  adminScope: AdminScope | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthState>({ session: null, user: null, adminScope: null, loading: true, signOut: async () => {} });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [adminScope, setAdminScope] = useState<AdminScope | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [adminLoaded, setAdminLoaded] = useState(false);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    // keep this callback synchronous (no Supabase calls inside it)
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessionLoaded) return;
    if (!userId) {
      setAdminScope(null);
      setAdminLoaded(true);
      return;
    }
    setAdminLoaded(false);
    supabase
      .from('admins')
      .select('scope')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setAdminScope((data?.scope as AdminScope | undefined) ?? null);
        setAdminLoaded(true);
      });
  }, [userId, sessionLoaded]);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    adminScope,
    loading: !sessionLoaded || !adminLoaded,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
