/**
 * Inicjalizacja Firebase dla frontendu.
 *
 * Ten config jest z założenia publiczny - Firebase identyfikuje nim projekt, a nie
 * autoryzuje dostępu. Bezpieczeństwo trzymają reguły Firestore i Storage oraz
 * lista dozwolonych domen w Firebase Auth, nie ukrywanie kluczy.
 *
 * Front celowo NIE importuje `firebase/storage`. Zdjęcia ładują się zwykłym
 * `<img src>` z adresów tokenowych zapisanych w manifeście, więc SDK Storage
 * byłby tu martwym kodem. Ze Storage rozmawiają wyłącznie skrypty administracyjne
 * przez Admin SDK.
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDyldGrzfABvHz9e0XXQVgenAOIsoTCilM',
  authDomain: 'frame-a4fba.firebaseapp.com',
  projectId: 'frame-a4fba',
  storageBucket: 'frame-a4fba.firebasestorage.app',
  messagingSenderId: '821986771624',
  appId: '1:821986771624:web:b6a6f1290196c93931789d',
};

/**
 * Baza została utworzona jako nazwana, nie jako `(default)`, więc identyfikator
 * trzeba podawać jawnie - zarówno tutaj, jak i przy wgrywaniu reguł.
 */
export const DATABASE_ID = 'frame-db';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, DATABASE_ID);
