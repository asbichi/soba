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
    if (demoToken === 'ASBICHI_DEMO_TOKEN') {
      const mockUser = { uid: 'asbichi', email: 'asbichi@soba.local' } as User;
      // Provide a mock getIdToken that returns the static token string
      mockUser.getIdToken = async () => 'ASBICHI_DEMO_TOKEN';
      setUser(mockUser);
      
      fetch('/api/me', {
        headers: { Authorization: `Bearer ASBICHI_DEMO_TOKEN` }
      }).then(async (res) => {
        if (res.ok) setDbUser(await res.json());
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
    if (username.toLowerCase() === 'asbichi') {
      localStorage.setItem('demo_token', 'ASBICHI_DEMO_TOKEN');
      setDemoToken('ASBICHI_DEMO_TOKEN');
    } else {
      throw new Error('Invalid credentials');
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
