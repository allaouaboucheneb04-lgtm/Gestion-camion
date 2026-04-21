import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
const form=document.getElementById("loginForm"), msg=document.getElementById("msg"), installBox=document.getElementById("installBox"), installBtn=document.getElementById("installBtn"); let deferredPrompt=null;
window.addEventListener("beforeinstallprompt",(e)=>{e.preventDefault(); deferredPrompt=e; installBox.classList.remove("hidden");});
installBtn?.addEventListener("click", async()=>{ if(!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; installBox.classList.add("hidden"); });
form?.addEventListener("submit", async(e)=>{e.preventDefault(); msg.textContent=""; try{ const email=document.getElementById("email").value.trim(); const password=document.getElementById("password").value.trim(); const cred=await signInWithEmailAndPassword(auth,email,password); const snap=await getDoc(doc(db,"users",cred.user.uid)); if(!snap.exists()){msg.textContent="Utilisateur sans rôle dans Firestore."; return;} const role=snap.data().role||"chauffeur"; window.location.href=role==="admin"?"./pages/admin.html":"./pages/chauffeur.html"; }catch(err){ msg.textContent=err.message || "Erreur de connexion"; }});
