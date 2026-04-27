import { getInvitation, registerEmailPassword, acceptDriverInvitation } from "./firebase.js";

const params = new URLSearchParams(location.search);
const inviteId = params.get("invite");
const info = document.getElementById("inviteInfo");
const emailInput = document.getElementById("email");
const form = document.getElementById("registerForm");
let invite = null;

async function init() {
  if (!inviteId) throw new Error("Lien d’invitation manquant.");
  invite = await getInvitation(inviteId);
  if (!invite) throw new Error("Invitation introuvable.");
  if (invite.used || invite.status === "accepted") throw new Error("Cette invitation a déjà été utilisée.");
  const email = (invite.email || invite.emailLower || "").trim().toLowerCase();
  emailInput.value = email;
  info.textContent = `Invitation chauffeur pour ${invite.nom || email}`;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const email = emailInput.value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const password2 = document.getElementById("password2").value;
    if (password.length < 6) throw new Error("Mot de passe minimum 6 caractères.");
    if (password !== password2) throw new Error("Les mots de passe ne sont pas identiques.");
    if (email !== (invite.emailLower || invite.email || "").trim().toLowerCase()) throw new Error("Email différent de l’invitation.");

    const cred = await registerEmailPassword(email, password);
    await acceptDriverInvitation(invite, cred.user.uid);
    alert("Compte chauffeur créé ✅");
    location.href = "pages/chauffeur.html";
  } catch (err) {
    console.error(err);
    alert("Erreur: " + (err.message || err.code || err));
  }
});

init().catch(err => {
  console.error(err);
  info.textContent = "Erreur: " + (err.message || err);
  form.style.display = "none";
});
