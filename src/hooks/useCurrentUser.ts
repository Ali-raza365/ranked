import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { useAuth } from '../firebase/AuthContext';
import { User } from '../types/user';

export const useCurrentUser = () => {
  const { firebaseUser, loading: authLoading } = useAuth();
  const [firestoreUser, setFirestoreUser] = useState<Partial<User> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!firebaseUser) {
      setFirestoreUser(null);
      setLoading(false);
      return;
    }

    const userRef = doc(db, 'users', firebaseUser.uid);
    const unsubscribe = onSnapshot(userRef, 
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data() as Partial<User>;
          setFirestoreUser({
            ...userData,
            followers: userData.followers || [],
            following: userData.following || [],
            followerCount: userData.followerCount || 0,
            followingCount: userData.followingCount || 0,
            blockedUsers: userData.blockedUsers || [],
            badWordsMode: userData.badWordsMode ?? true,
          });
        } else {
          setFirestoreUser(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching user data:', error);
        setFirestoreUser(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser, authLoading]);

  const user = firebaseUser && firestoreUser
    ? {
        ...firebaseUser,
        ...firestoreUser,
        uid: firebaseUser.uid,
        followers: firestoreUser.followers || [],
        following: firestoreUser.following || [],
        followerCount: firestoreUser.followerCount || 0,
        followingCount: firestoreUser.followingCount || 0,
        blockedUsers: firestoreUser.blockedUsers || [],
        badWordsMode: firestoreUser.badWordsMode ?? true,
      } as User
    : null;

  return { user, loading: authLoading || loading };
};
