import { logout, observeAuth, getUserProfile } from "./firebase.js";

export function money(value) {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return "-";
  try {
    const d = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    return new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short" }).format(d);
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
  return new Promise(resolve => {
    observeAuth(async user => {
      if (!user) {
        window.location.href = redirectPath;
        return;
      }
      const profile = await getUserProfile(user.uid);
      if (!profile || (expectedRole && profile.role !== expectedRole)) {
        window.location.href = redirectPath;
        return;
      }
      resolve({ user, profile });
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
    window.addEventListener("load", () => navigator.serviceWorker.register("../service-worker.js").catch(() => {}));
  }
}
