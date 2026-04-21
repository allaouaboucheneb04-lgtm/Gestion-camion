import { login, observeAuth, getUserProfile } from "./firebase.js";

const form = document.getElementById("loginForm");
const message = document.getElementById("loginMessage");

observeAuth(async user => {
  if (!user) return;
  const profile = await getUserProfile(user.uid);
  if (!profile) return;
  window.location.href = profile.role === "admin" ? "./pages/admin.html" : "./pages/chauffeur.html";
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
    window.location.href = profile.role === "admin" ? "./pages/admin.html" : "./pages/chauffeur.html";
  } catch (err) {
    message.textContent = err.message || "Erreur de connexion";
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
}
