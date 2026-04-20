import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

interface UserData {
  uid: string;
  email: string;
  displayName: string;
  balance: number;
}

interface UserContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({ user: null, userData: null, loading: true });

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        
        // Listen for user data changes (balance, etc.)
        const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data() as UserData);
          } else {
            // New user registration
            const initialData = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || 'Trader',
              balance: 10000, // $10,000 sign-up bonus
              createdAt: serverTimestamp(),
            };
            setDoc(userDocRef, initialData);
            setUserData(initialData as any);
          }
          setLoading(false);
        });
        
        return () => unsubscribe();
      } else {
        setUserData(null);
        setLoading(false);
      }
    });
  }, []);

  return (
    <UserContext.Provider value={{ user, userData, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
