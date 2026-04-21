import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBwimUb2MZ4WGb2Uc2IQlEmwmVSNaMgCrs",
  authDomain: "gestion-camion-93e44.firebaseapp.com",
  projectId: "gestion-camion-93e44",
  storageBucket: "gestion-camion-93e44.firebasestorage.app",
  messagingSenderId: "134820820100",
  appId: "1:134820820100:web:a019b0f6cfd76e0227bed1",
  measurementId: "G-XG97EVF0Q0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
