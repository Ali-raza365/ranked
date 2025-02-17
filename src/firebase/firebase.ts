import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';


//firebase configs
const firebaseConfig = {
  apiKey: "AIzaSyAF05zLVnnxQNisHRcCbYl3cFC5OybRvvE",
  authDomain: "kuaba-cbc2d.firebaseapp.com",
  projectId: "kuaba-cbc2d",
  storageBucket: "kuaba-cbc2d.firebasestorage.app",
  messagingSenderId: "968636678405",
  appId: "1:968636678405:web:440bfae31d8a616cf7f76c",
  measurementId: "G-K5G7J7DBMP"
};


const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

const db = getFirestore(app);

export { app, auth, db };
