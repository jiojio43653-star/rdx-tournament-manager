import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, signInWithGoogle, db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { PlayerProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: PlayerProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  signIn: async () => {},
  logOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    // Left for compatibility, but real-time updates handle this
  };

  const signIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        alert("Sign in was cancelled. If you are on mobile, please make sure popups are allowed or try opening the app in a new tab.");
      } else if (error.code === 'auth/popup-blocked') {
        alert("Your browser blocked the sign-in popup. Please allow popups for this site or open it in a new tab.");
      } else if (error.code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        alert(`This domain (${currentDomain}) is not authorized in your Firebase Project. 

Please follow these steps to fix:
1. Open your Firebase Console (https://console.firebase.google.com)
2. Go to Build -> Authentication -> Settings -> Authorized domains
3. Click "Add domain" and add: ${currentDomain}
4. Save and try signing in again!`);
      } else {
        console.error("Sign in failed", error);
        alert("Failed to sign in. Please try again.");
      }
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('isAdmin');
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    let loadingTimeout: ReturnType<typeof setTimeout>;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const profileRef = doc(db, 'players', currentUser.uid);
        
        // Timeout to stop loading spinner if db hangs
        loadingTimeout = setTimeout(() => {
           setLoading(false);
        }, 3000);

        // Use onSnapshot directly to prevent blocking the loading state
        unsubscribeProfile = onSnapshot(profileRef, async (snapshot) => {
          clearTimeout(loadingTimeout);
          if (snapshot.exists()) {
            const data = snapshot.data();
            setProfile(data as PlayerProfile);
            setLoading(false);

            // Update email if missing
            if (!data.email && currentUser.email) {
              try {
                await setDoc(profileRef, { email: currentUser.email }, { merge: true });
              } catch (err) {
                console.error("Error updating email", err);
              }
            }
          } else {
            // Profile does not exist yet, create it
            try {
              await setDoc(profileRef, {
                uid: currentUser.uid,
                name: currentUser.displayName || 'Guest Player',
                email: currentUser.email || '',
                upiId: '',
                photoUrl: currentUser.photoURL || '',
                createdAt: Date.now()
              });
            } catch (err) {
              console.error("Error creating Firestore profile:", err);
            }
            setProfile(null); // Will be updated when onSnapshot triggers again after set
            setLoading(false);
          }
        }, (error) => {
          console.error("Error fetching profile:", error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
        if (unsubscribeProfile) {
          unsubscribeProfile();
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
