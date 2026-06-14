import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { Session, User } from '@supabase/supabase-js';

// Demo mode fallback — creates a fake user/session when Supabase is unavailable
function createDemoUser(email: string): User {
  return {
    id: 'demo-user-' + Math.random().toString(36).slice(2),
    email,
    app_metadata: {},
    user_metadata: { name: email.split('@')[0] },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as unknown as User;
}

function createDemoSession(user: User): Session {
  return {
    access_token: 'demo-token',
    refresh_token: 'demo-refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user,
  } as unknown as Session;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for persisted demo session
    const demoSession = localStorage.getItem('demo_session');
    if (demoSession) {
      try {
        const parsed = JSON.parse(demoSession);
        setSession(parsed);
        setUser(parsed.user);
        setLoading(false);
        return;
      } catch { /* fall through */ }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      // Supabase unreachable — just mark loading done
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await supabase.auth.signInWithPassword({ email, password });
      if (!result.error) return result;

      // If invalid credentials, try signUp first (existing logic)
      if (result.error.message.includes("Invalid login credentials")) {
        const signUpResult = await supabase.auth.signUp({ email, password });
        if (!signUpResult.error) return signUpResult;
      }

      // If it's a network error ("Failed to fetch"), fall back to demo mode
      if (result.error.message.includes("fetch") || result.error.message.includes("network")) {
        const demoUser = createDemoUser(email);
        const demoSess = createDemoSession(demoUser);
        localStorage.setItem('demo_session', JSON.stringify(demoSess));
        setUser(demoUser);
        setSession(demoSess);
        return { data: { user: demoUser, session: demoSess }, error: null };
      }

      return result;
    } catch (err: any) {
      // Network completely down — use demo mode
      const demoUser = createDemoUser(email);
      const demoSess = createDemoSession(demoUser);
      localStorage.setItem('demo_session', JSON.stringify(demoSess));
      setUser(demoUser);
      setSession(demoSess);
      return { data: { user: demoUser, session: demoSess }, error: null };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      return await supabase.auth.signUp({ email, password });
    } catch {
      // Fallback to demo
      const demoUser = createDemoUser(email);
      const demoSess = createDemoSession(demoUser);
      localStorage.setItem('demo_session', JSON.stringify(demoSess));
      setUser(demoUser);
      setSession(demoSess);
      return { data: { user: demoUser, session: demoSess }, error: null };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('demo_session');
    setUser(null);
    setSession(null);
    try {
      return await supabase.auth.signOut();
    } catch {
      return { error: null };
    }
  };

  return { user, session, loading, signIn, signUp, signOut };
}
