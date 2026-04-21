import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { applyLang } from './i18n.js';

const form = document.getElementById('loginForm');
const msg = document.getElementById('loginMsg');
const lang = localStorage.getItem('gc_lang') || 'fr';
applyLang(lang);
document.querySelectorAll('.chip').forEach(btn => btn.addEventListener('click', () => applyLang(btn.dataset.lang)));

onAuthStateChanged(auth, async user => {
  if (!user) return;
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) return;
  const role = snap.data().role;
  window.location.href = role === 'admin' ? 'pages/admin.html' : 'pages/chauffeur.html';
});

form.addEventListener('submit', async e => {
  e.preventDefault();
  msg.textContent = '';
  try {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const snap = await getDoc(doc(db, 'users', cred.user.uid));
    if (!snap.exists()) throw new Error('Utilisateur connecté mais rôle introuvable dans Firestore/users.');
    const role = snap.data().role;
    window.location.href = role === 'admin' ? 'pages/admin.html' : 'pages/chauffeur.html';
  } catch (err) {
    msg.textContent = err.message || 'Erreur de connexion';
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
}
