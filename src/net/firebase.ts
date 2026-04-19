import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDzJRBy8Dd0RHz5J_-l_82F6gb6uMIYclw',
  authDomain: 'thatserver.firebaseapp.com',
  databaseURL: 'https://thatserver-default-rtdb.firebaseio.com',
  projectId: 'thatserver',
  storageBucket: 'thatserver.appspot.com',
  messagingSenderId: '484732996848',
  appId: '1:484732996848:web:f283a6b3627421fff4c635',
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

let authReady: Promise<string> | null = null;

export function ensureAuth(): Promise<string> {
  if (authReady) return authReady;
  authReady = new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      (user) => {
        if (user) {
          unsub();
          resolve(user.uid);
        } else {
          signInAnonymously(auth).catch(reject);
        }
      },
      reject,
    );
  });
  return authReady;
}
