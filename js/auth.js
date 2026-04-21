import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.login = async function(){
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const user = await signInWithEmailAndPassword(auth,email,password);
  const snap = await getDoc(doc(db,"users",user.user.uid));

  if(snap.data().role==="admin"){
    window.location="pages/admin.html";
  } else {
    window.location="pages/chauffeur.html";
  }
}
