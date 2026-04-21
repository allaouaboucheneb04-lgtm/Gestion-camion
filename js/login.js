import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const form=document.getElementById('loginForm'); const msg=document.getElementById('loginMsg');
form?.addEventListener('submit', async e=>{e.preventDefault(); msg.textContent=''; try{ const cred=await signInWithEmailAndPassword(auth,email.value,password.value); const snap=await getDoc(doc(db,'users',cred.user.uid)); if(!snap.exists()) throw new Error('Profil manquant dans users/{uid}.'); const role=snap.data().role; window.location.href = role==='admin' ? './pages/admin.html' : './pages/chauffeur.html'; }catch(err){ msg.textContent=err.message||'Connexion impossible'; }});
onAuthStateChanged(auth, async user=>{ if(!user) return; try{ const snap=await getDoc(doc(db,'users',user.uid)); if(!snap.exists()) return; window.location.href=snap.data().role==='admin'?'./pages/admin.html':'./pages/chauffeur.html'; }catch{}});
