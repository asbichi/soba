import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleAuthProvider } from '../lib/firebase';
import { onAuthStateChanged, signInWithPopup, User, signOut as firebaseSignOut } from 'firebase/auth';

interface DBUser {
  id: number;
  email: string;
  name: string;
  role: string;
  assignedWardId: number | null;
  assignedPollingUnitId: number | null;
}

interface AuthContextType {
  user: User | null;
  dbUser: DBUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<DBUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoToken, setDemoToken] = useState<string | null>(localStorage.getItem('demo_token'));

  useEffect(() => {
    if (demoToken) {
      let username = 'asbichi';
      if (demoToken === 'ASBICHI_DEMO_TOKEN' || demoToken === 'ADMIN_DEMO_TOKEN') {
        username = 'asbichi';
      } else if (demoToken.startsWith('AGENT_DEMO_TOKEN_')) {
        username = demoToken.replace('AGENT_DEMO_TOKEN_', '');
      } else if (demoToken.startsWith('DEMO_TOKEN_')) {
        username = demoToken.replace('DEMO_TOKEN_', '');
      }

      const isAdmin = ['asbichi', 'admin', 'superadmin', 'administrator'].includes(username.toLowerCase());
      const isAgent = username.toLowerCase().startsWith('agent-');

      const mockUser = { uid: username, email: `${username}@soba.local` } as User;
      mockUser.getIdToken = async () => demoToken;
      setUser(mockUser);
      
      fetch('/api/me', {
        headers: { Authorization: `Bearer ${demoToken}` }
      }).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setDbUser(data);
        } else {
          // Default fallback
          setDbUser({
            id: 1,
            email: `${username}@soba.local`,
            name: isAdmin ? 'Abdullahi S. Bichi (Admin)' : (isAgent ? `Agent ${username}` : username),
            role: isAdmin ? 'SUPER_ADMIN' : (isAgent ? 'POLLING_UNIT_OFFICER' : 'VIEWER'),
            assignedWardId: null,
            assignedPollingUnitId: null
          });
        }
        setLoading(false);
      }).catch((err) => {
        console.error('Fetch me error', err);
        setDbUser({
          id: 1,
          email: `${username}@soba.local`,
          name: isAdmin ? 'Abdullahi S. Bichi (Admin)' : (isAgent ? `Agent ${username}` : username),
          role: isAdmin ? 'SUPER_ADMIN' : (isAgent ? 'POLLING_UNIT_OFFICER' : 'VIEWER'),
          assignedWardId: null,
          assignedPollingUnitId: null
        });
        setLoading(false);
      });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const res = await fetch('/api/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setDbUser(data);
          } else {
            console.error('Failed to sync user');
          }
        } catch (error) {
          console.error(error);
        }
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [demoToken]);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error('Sign in error', error);
      throw error;
    }
  };

  const signInDemo = async (username: string) => {
    const cleanUser = username.trim().toLowerCase();
    if (['asbichi', 'admin', 'superadmin', 'administrator', 'abdullahibichishuaib.abs@gmail.com'].includes(cleanUser)) {
      localStorage.setItem('demo_token', 'ASBICHI_DEMO_TOKEN');
      setDemoToken('ASBICHI_DEMO_TOKEN');
    } else if (cleanUser.startsWith('agent-')) {
      const token = `AGENT_DEMO_TOKEN_${cleanUser}`;
      localStorage.setItem('demo_token', token);
      setDemoToken(token);
    } else {
      const token = `DEMO_TOKEN_${cleanUser}`;
      localStorage.setItem('demo_token', token);
      setDemoToken(token);
    }
  };

  const signOut = async () => {
    if (demoToken) {
      localStorage.removeItem('demo_token');
      setDemoToken(null);
      setUser(null);
      setDbUser(null);
      return;
    }
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, signIn, signOut, signInDemo } as any}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
