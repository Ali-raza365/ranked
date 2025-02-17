import { createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export const signUp = async (email: string, password: string, username: string, fullName: string): Promise<void> => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Check if this is a new user
  const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
  
  if (!userDoc.exists()) {
    // Create new user document for first-time users
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      followers: [],
      following: [],
      followerCount: 0,
      followingCount: 0,
      email: email,
      displayName: username,
      displayNameLower: username.toLowerCase(),
      fullName: fullName,
      blockedUsers: [],
      badWordsMode: true,
    });
  }
};

export const signIn = async (email: string, password: string): Promise<void> => {
  // Check if email exists first
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email.toLowerCase()));
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    throw new Error('auth/user-not-found');
  }
  
  // If email exists, attempt to sign in
  await signInWithEmailAndPassword(auth, email, password);
};

export const signOut = () => auth.signOut();

export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('displayNameLower', '==', username.toLowerCase()));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty;
};

export const checkEmailAvailability = async (email: string): Promise<boolean> => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('email', '==', email.toLowerCase()));
  const querySnapshot = await getDocs(q);
  return querySnapshot.empty;
};

export const deleteAccount = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // Delete user's rankings
    const rankingsQuery = query(collection(db, 'rankings'), where('userId', '==', user.uid));
    const rankingsSnapshot = await getDocs(rankingsQuery);
    const deletionPromises = rankingsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletionPromises);

    // Delete user document
    await deleteDoc(doc(db, 'users', user.uid));

    // Delete Firebase Auth user
    await deleteUser(user);
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
};
