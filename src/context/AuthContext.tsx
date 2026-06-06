import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { User } from '../types';
import { getUser, createDefaultUser, createGuestUser } from '../services/firestoreService';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  setUser: (u: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  user: null,
  loading: true,
  setUser: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      // Show spinner immediately — prevents navigator from routing
      // to Assessment before the Firestore user doc is loaded/created
      setLoading(true);
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          let userData = await getUser(fbUser.uid);
          // Auto-heal: if Auth user exists but Firestore doc is missing, create it
          if (!userData) {
            if (fbUser.isAnonymous) {
              await createGuestUser(fbUser.uid);
            } else {
              await createDefaultUser(
                fbUser.uid,
                fbUser.email ?? '',
                fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'User'
              );
            }
            userData = await getUser(fbUser.uid);
          }
          setUser(userData);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const refreshUser = async () => {
    if (!firebaseUser) return;
    const userData = await getUser(firebaseUser.uid);
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
