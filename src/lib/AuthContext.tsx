import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  balance: number;
  totalProfit: number;
  totalInvested: number;
  referralEarnings: number;
  referralCode: string;
  referredBy?: string | null;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, userData: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setUserData(null);
        setLoading(false);
      } else {
        // Fetch user data from firestore
        const userDocRef = doc(db, 'users', u.uid);
        
        // Initial check to ensure document exists (Self-healing)
        try {
          const snap = await getDoc(userDocRef);
          if (!snap.exists()) {
            const adminEmails = ['btechtools.ng@gmail.com', 'goldbrickexchange31@gmail.com'];
            const myReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            await setDoc(userDocRef, {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName || u.email?.split('@')[0] || 'User',
              balance: 0,
              totalProfit: 0,
              totalInvested: 0,
              referralEarnings: 0,
              referralCode: myReferralCode,
              role: adminEmails.includes(u.email || '') ? 'admin' : 'user',
              status: 'active',
              createdAt: serverTimestamp()
            });
          }
        } catch (e) {
          console.error("Error checking/creating user doc:", e);
        }

        const unsubDoc = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            setUserData(doc.data() as UserData);
          }
          setLoading(false);
        });
        return () => unsubDoc();
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
