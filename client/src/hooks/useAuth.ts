import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User } from '@/types/game';
import { useToast } from '@/hooks/use-toast';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const provider = new GoogleAuthProvider();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            setUser(userDoc.data() as User);
          } else {
            // Create new user document
            const newUser: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Anonymous',
              isAdmin: false,
              wins: 0,
              losses: 0,
              hp: 20,
              energy: 100,
              deck: [],
              createdAt: Date.now()
            };
            
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            setUser(newUser);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          toast({
            title: "Error",
            description: "Failed to load user data",
            variant: "destructive"
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "Success",
        description: "Signed in successfully!"
      });
    } catch (error: any) {
      toast({
        title: "Sign In Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: "Success",
        description: "Account created successfully!"
      });
    } catch (error: any) {
      toast({
        title: "Registration Error", 
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, provider);
      toast({
        title: "Success",
        description: "Signed in with Google successfully!"
      });
    } catch (error: any) {
      toast({
        title: "Google Sign In Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Success",
        description: "Signed out successfully!"
      });
    } catch (error: any) {
      toast({
        title: "Sign Out Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateUserStats = async (wins: number, losses: number) => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { wins, losses });
      setUser({ ...user, wins, losses });
    } catch (error) {
      console.error('Error updating user stats:', error);
    }
  };

  const updateUserHP = async (hp: number) => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { hp });
      setUser({ ...user, hp });
    } catch (error) {
      console.error('Error updating user HP:', error);
    }
  };

  const updateUserEnergy = async (energy: number) => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { energy });
      setUser({ ...user, energy });
    } catch (error) {
      console.error('Error updating user energy:', error);
    }
  };

  return {
    user,
    loading,
    signInWithEmail,
    registerWithEmail,
    signInWithGoogle,
    logout,
    updateUserStats,
    updateUserHP,
    updateUserEnergy
  };
}
