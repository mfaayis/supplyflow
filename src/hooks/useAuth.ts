import { useState, useEffect } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  // Read the session synchronously from Supabase's in-memory cache so we
  // never block on a round-trip when the token is already present locally.
  const getInitialSession = (): Session | null => {
    try {
      // @ts-ignore – internal property, stable in supabase-js v2
      return (supabase.auth as any)._session ?? null;
    } catch {
      return null;
    }
  };

  const initialSession = getInitialSession();
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const [session, setSession] = useState<Session | null>(initialSession);
  // Skip the loading spinner if we already have a session in memory
  const [loading, setLoading] = useState<boolean>(initialSession === null);

  useEffect(() => {
    // Confirm / refresh the session asynchronously
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
}
