import { login, observeAuth, getUserProfile, sendPasswordReset } from "./firebase.js";

const form = document.getElementById("loginForm");
const message = document.getElementById("loginMessage");

observeAuth(async user => {
  if (!user) return;
  try {
    const profile = await getUserProfile(user.uid);
    if (!profile) {
      message.textContent = `Profil introuvable. Crée users/${user.uid} dans Firestore.`;
      return;
    }
    if (profile.status === "inactif") {
      message.textContent = "Compte désactivé. Contacte l’administrateur.";
      return;
    }
    window.location.href = profile.role === "admin" ? "./pages/admin.html?v=prochauffeur" : "./pages/chauffeur.html?v=prochauffeur";
  } catch (e) {
    message.textContent = e.message || "Erreur de lecture du profil";
  }
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  message.textContent = "";
  try {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const cred = await login(email, password);
    const profile = await getUserProfile(cred.user.uid);
    if (!profile) throw new Error("Rôle introuvable dans users/{uid}");
    if (profile.status === "inactif") throw new Error("Compte désactivé. Contacte l’administrateur.");
    window.location.href = profile.role === "admin" ? "./pages/admin.html?v=prochauffeur" : "./pages/chauffeur.html?v=prochauffeur";
  } catch (err) {
    message.textContent = err.message || "Erreur de connexion";
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js?v=entreprise-finale1").catch(() => {}));
}

const resetBtn = document.getElementById("resetPasswordBtn");
resetBtn?.addEventListener("click", async () => {
  const email = document.getElementById("email")?.value?.trim()?.toLowerCase();
  if (!email) {
    message.textContent = "Entre ton email d’abord, puis clique sur Mot de passe oublié.";
    return;
  }
  try {
    await sendPasswordReset(email);
    message.textContent = "Lien de réinitialisation envoyé. Vérifie ta boîte email.";
  } catch (err) {
    message.textContent = err.message || "Erreur réinitialisation mot de passe";
  }
});
