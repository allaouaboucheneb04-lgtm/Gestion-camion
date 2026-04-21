import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

// Remplace par TES vraies clés Firebase.
const firebaseConfig = {
  apiKey: 'REMPLACE_MOI',
  authDomain: 'REMPLACE_MOI.firebaseapp.com',
  projectId: 'REMPLACE_MOI',
  storageBucket: 'REMPLACE_MOI.appspot.com',
  messagingSenderId: 'REMPLACE_MOI',
  appId: 'REMPLACE_MOI'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
