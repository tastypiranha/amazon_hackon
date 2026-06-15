import { useState, useEffect } from 'react';

// Hardcoded users for hackathon demo
const DEMO_USERS: Record<string, { password: string; id: string; email: string }> = {
  "user1": { password: "12345", id: "user-1", email: "user1@ex.com" },
  "user2": { password: "1234567", id: "user-2", email: "user2@ex.com" },
  "user1@ex.com": { password: "12345", id: "user-1", email: "user1@ex.com" },
  "user2@ex.com": { password: "1234567", id: "user-2", email: "user2@ex.com" },
};

interface DemoUser {
  id: string;
  email: string;
}

interface DemoSession {
  user: DemoUser;
}

export function useAuth() {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [session, setSession] = useState<DemoSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for persisted session
    const stored = localStorage.getItem('amazon_relife_session');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSession(parsed);
        setUser(parsed.user);
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const username = email.replace(/@.*/, '').toLowerCase(); // allow "user1" or "user1@anything"
    const lookup = DEMO_USERS[username] || DEMO_USERS[email.toLowerCase()];
    
    if (!lookup) {
      // Allow any email/password for demo flexibility
      const demoUser: DemoUser = { id: 'demo-' + email, email };
      const demoSession: DemoSession = { user: demoUser };
      localStorage.setItem('amazon_relife_session', JSON.stringify(demoSession));
      setUser(demoUser);
      setSession(demoSession);
      return { data: { user: demoUser, session: demoSession }, error: null };
    }

    if (lookup.password !== password) {
      return { data: null, error: { message: "Invalid password" } };
    }

    const demoUser: DemoUser = { id: lookup.id, email: lookup.email };
    const demoSession: DemoSession = { user: demoUser };
    localStorage.setItem('amazon_relife_session', JSON.stringify(demoSession));
    setUser(demoUser);
    setSession(demoSession);
    return { data: { user: demoUser, session: demoSession }, error: null };
  };

  const signUp = async (email: string, password: string) => {
    return signIn(email, password);
  };

  const signOut = async () => {
    localStorage.removeItem('amazon_relife_session');
    setUser(null);
    setSession(null);
    return { error: null };
  };

  return { user, session, loading, signIn, signUp, signOut };
}
