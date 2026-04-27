import { logout, observeAuth, getUserProfile } from "./firebase.js";

export function money(value) {
  const currentLang = localStorage.getItem("truckLang") || "fr";
  return new Intl.NumberFormat(currentLang === "ar" ? "ar-DZ" : "fr-DZ", { style: "currency", currency: "DZD", maximumFractionDigits: 2 }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return "-";
  try {
    const d = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    const currentLang = localStorage.getItem("truckLang") || "fr";
    return new Intl.DateTimeFormat(currentLang === "ar" ? "ar-DZ" : "fr-DZ", { dateStyle: "medium", timeStyle: "short" }).format(d);
  } catch {
    return String(value);
  }
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formToObject(form) {
  const fd = new FormData(form);
  const out = {};
  for (const [k, v] of fd.entries()) out[k] = v;
  return out;
}

export function numberOrZero(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export function dateTimeOrNull(v) {
  return v ? new Date(v) : null;
}

export async function requireRole(expectedRole, redirectPath = "../index.html") {
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (!done) { done = true; reject(new Error("Connexion trop longue. Va à la page de connexion et reconnecte-toi.")); }
    }, 12000);
    observeAuth(async user => {
      if (done) return;
      try {
        if (!user) {
          clearTimeout(timer); done = true; window.location.href = redirectPath; return;
        }
        const profile = await getUserProfile(user.uid);
        if (!profile) throw new Error(`Profil introuvable. Crée Firestore users/${user.uid} avec role: admin.`);
        if (profile.status === "inactif") { await logout(); throw new Error("Compte désactivé. Contacte l’administrateur."); }
        if (expectedRole && profile.role !== expectedRole) throw new Error(`Rôle incorrect: ${profile.role || "aucun"}. Rôle attendu: ${expectedRole}.`);
        clearTimeout(timer); done = true; resolve({ user, profile });
      } catch (e) {
        clearTimeout(timer); done = true; reject(e);
      }
    });
  });
}

export function bindLogout(buttonId = "logoutBtn") {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.addEventListener("click", async () => {
    await logout();
    window.location.href = "../index.html";
  });
}

export function bindSidebar() {
  const sidebar = document.getElementById("sidebar");
  const openBtn = document.getElementById("openSidebar");
  const closeBtn = document.getElementById("closeSidebar");
  if (openBtn && sidebar) openBtn.addEventListener("click", () => sidebar.classList.add("open"));
  if (closeBtn && sidebar) closeBtn.addEventListener("click", () => sidebar.classList.remove("open"));
}

export function installSW() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("../service-worker.js?v=entreprise-finale1").catch(() => {}));
  }
}
