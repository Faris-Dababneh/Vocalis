import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyC_vX88FNAZAloxLt1RR1RxIjXTMkAmG_E',
  authDomain: 'vocalis-1.firebaseapp.com',
  projectId: 'vocalis-1',
  storageBucket: 'vocalis-1.firebasestorage.app',
  messagingSenderId: '1068431961280',
  appId: '1:1068431961280:web:19ff1355963d65b5489125',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
