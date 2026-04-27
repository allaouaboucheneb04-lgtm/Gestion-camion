import {
  addVoyage, updateVoyage, deleteVoyage, getMesVoyages, getCamions, addOdometre, updateOdometre, getMesOdometres, uploadFile, addDepense
} from "./firebase.js";
import {
  money, formatDate, escapeHtml, formToObject, numberOrZero, dateTimeOrNull,
  requireRole, bindLogout, installSW
} from "./common.js";

const state = {
  profile: null,
  voyages: [],
  camions: [],
  odometres: []
};

function voyageRevenue(v) {
  return numberOrZero(v.prixCourse) + numberOrZero(v.prixCourseRetour);
}
function voyageCosts(v) {
  return numberOrZero(v.gasoil) + numberOrZero(v.fraisMission) + numberOrZero(v.gasoilRetour) + numberOrZero(v.fraisMissionRetour);
}
function voyageDistance(v) {
  const d = numberOrZero(v.kmDepart);
  const a = numberOrZero(v.kmArrivee);
  return a > d ? a - d : 0;
}
function voyageProfit(v) {
  return voyageRevenue(v) - voyageCosts(v);
}
function formatRatio(value, suffix) {
  return Number.isFinite(value) && value > 0 ? value.toLocaleString("fr-CA", { maximumFractionDigits: 2 }) + suffix : "-";
}
function voyageAdvancedLine(v) {
  const distance = voyageDistance(v);
  const gasoil = numberOrZero(v.gasoil) + numberOrZero(v.gasoilRetour);
  const couts = voyageCosts(v);
  const profit = voyageProfit(v);
  const conso = distance ? (gasoil / distance) * 100 : 0;
  const coutKm = distance ? couts / distance : 0;
  const profitKm = distance ? profit / distance : 0;
  return `<p class="km-advanced-line">Distance : <strong>${distance ? distance.toLocaleString("fr-CA") + " km" : "-"}</strong> | Conso : ${formatRatio(conso, " /100 km")} | Coût/km : ${formatRatio(coutKm, " DA/km")} | Bénéfice/km : ${formatRatio(profitKm, " DA/km")}</p>`;
}

function dashboardHtml() {
  const revenu = state.voyages.reduce((s, v) => s + voyageRevenue(v), 0);
  const couts = state.voyages.reduce((s, v) => s + voyageCosts(v), 0);
  const benefice = revenu - couts;
  const distance = state.voyages.reduce((s, v) => s + voyageDistance(v), 0);
  const dernierKm = state.odometres.length ? state.odometres[0].kilometrage : 0;

  return `
    <div class="stats-grid">
      <div class="card stat-card"><div class="label">Mes voyages</div><div class="value">${state.voyages.length}</div></div>
      <div class="card stat-card"><div class="label">Revenu</div><div class="value">${money(revenu)}</div></div>
      <div class="card stat-card"><div class="label">Coûts</div><div class="value">${money(couts)}</div></div>
      <div class="card stat-card"><div class="label">Bénéfice estimé</div><div class="value">${money(benefice)}</div></div>
      <div class="card stat-card"><div class="label">Distance voyages</div><div class="value">${distance ? distance.toLocaleString("fr-CA") + " km" : "-"}</div></div>
      <div class="card stat-card"><div class="label">Dernier KM</div><div class="value">${dernierKm || "-"}</div></div>
    </div>
  `;
}

function formHtml() {
  return `
    <div class="card">
      <div class="card-header"><div><h2>Ajouter un voyage</h2><p class="muted">Le chauffeur ajoute uniquement ses voyages</p></div></div>
      <form id="driverTripForm" class="form-grid">
        <label><span>Type de voyage</span><select name="typeVoyage" data-trip-type required><option value="simple">Aller simple</option><option value="aller_retour">Aller-retour</option></select></label>
        <label><span>Camion</span><select name="camionId" required><option value="">Choisir camion</option>${state.camions.map(c => `<option value="${c.id}">${escapeHtml(c.numeroCamion || "Camion")} - ${escapeHtml(c.numeroPlaque || "")}</option>`).join("")}</select></label>
        <label><span>Nom du chauffeur</span><input name="nomChauffeur" value="${escapeHtml(state.profile.name || "")}" required></label>
        <label><span>Client aller</span><input name="client" required></label>
        <label><span>Départ aller</span><input name="depart" required></label>
        <label><span>Destination aller</span><input name="destination" required></label>
        <label><span>Date de départ</span><input name="dateDepart" type="datetime-local"></label>
        <label><span>Date d'arrivée</span><input name="dateArrivee" type="datetime-local"></label>
        <label><span>Prix de course aller</span><input name="prixCourse" type="number" step="0.01"></label>
        <label><span>Gasoil aller</span><input name="gasoil" type="number" step="0.01"></label>
        <label><span>Frais de mission aller</span><input name="fraisMission" type="number" step="0.01"></label>
        <label><span>Auteur dépenses</span><input name="auteurDepenses" value="${escapeHtml(state.profile.name || "")}"></label>

        <div class="return-section full" data-return-section style="display:none;">
          <div class="section-title">Retour indépendant</div>
          <div class="form-grid nested-grid">
            <label><span>Client retour</span><input name="retourClient"></label>
            <label><span>Départ retour</span><input name="retourDepart"></label>
            <label><span>Destination retour</span><input name="retourDestination"></label>
            <label><span>Date de retour</span><input name="dateRetour" type="datetime-local"></label>
            <label><span>Date arrivée retour</span><input name="dateRetourArrivee" type="datetime-local"></label>
            <label><span>Prix course retour</span><input name="prixCourseRetour" type="number" step="0.01"></label>
            <label><span>Frais mission retour</span><input name="fraisMissionRetour" type="number" step="0.01"></label>
            <label><span>Gasoil retour</span><input name="gasoilRetour" type="number" step="0.01"></label>
          </div>
        </div>
        <label><span>KM départ voyage</span><input name="kmDepart" type="number" step="1" min="0"></label>
        <label><span>KM arrivée voyage</span><input name="kmArrivee" type="number" step="1" min="0"></label>
        <label class="full"><span>Document du voyage (optionnel)</span><input type="file" name="voyageFile" accept="image/*,.pdf"></label>
        <button class="btn primary full" type="submit">Ajouter le voyage</button>
      </form>
    </div>
  `;
}


function odometerHtml() {
  const today = new Date().toISOString().slice(0, 10);
  const camionOptions = state.camions.map(c => `<option value="${c.id}">${escapeHtml(c.numeroCamion || "Camion")} - ${escapeHtml(c.numeroPlaque || "")}</option>`).join("");
  return `
    <div class="card odometer-card">
      <div class="card-header"><div><h2>KM du jour / عداد اليوم</h2><p class="muted">Chaque jour, inscris le kilométrage. La photo de l’odomètre est optionnelle : si tu l’ajoutes, elle sera envoyée par email.</p></div></div>
      <form id="odometerForm" class="form-grid">
        <label><span>Date / التاريخ</span><input name="date" type="date" value="${today}" required></label>
        <label><span>Camion / الشاحنة</span><select name="camionId" required><option value="">Choisir camion</option>${camionOptions}</select></label>
        <label><span>Kilométrage compteur / الكيلومترات</span><input name="kilometrage" type="number" step="1" min="0" required></label>
        <label class="full"><span>Photo odomètre optionnelle / صورة العداد اختيارية</span><input type="file" name="odometrePhoto" accept="image/*" capture="environment"></label>
        <label class="full"><span>Remarque / ملاحظة</span><textarea name="remarque" placeholder="Optionnel"></textarea></label>
        <button class="btn primary full" type="submit">Enregistrer le KM / حفظ الكيلومترات</button>
      </form>
      <div class="list odometer-list">
        <h3>Mes derniers kilométrages</h3>
        ${state.odometres.length ? state.odometres.slice(0, 10).map(o => {
          const camion = state.camions.find(c => c.id === o.camionId);
          return `
          <div class="item-card odometer-item">
            <h4>${escapeHtml(o.kilometrage || "-")} km <span class="badge">${formatDate(o.date)}</span></h4>
            <p>Camion : ${escapeHtml(camion?.numeroCamion || o.camionId || "-")}</p>
            ${o.remarque ? `<p>Remarque : ${escapeHtml(o.remarque)}</p>` : ""}
            ${o.photoEmailSent ? `<p><span class="badge success">Photo envoyée par email</span></p>` : ""}
          </div>`;
        }).join("") : `<div class="item-card"><p>Aucun kilométrage enregistré.</p></div>`}
      </div>
    </div>
  `;
}

function tripsHtml() {
  return `
    <div class="card">
      <div class="card-header"><div><h2>Mes voyages</h2><p class="muted">Modification rapide disponible</p></div></div>
      <div class="list">
        ${state.voyages.length ? state.voyages.map(v => `
          <div class="item-card">
            <h4><span class="badge">${v.typeVoyage === "aller_retour" ? "Aller-retour" : "Aller simple"}</span> ${escapeHtml(v.depart || "-")} → ${escapeHtml(v.destination || "-")}</h4><p>Client aller : ${escapeHtml(v.client || "-")}</p>
            <p>Départ : ${formatDate(v.dateDepart)} | Arrivée : ${formatDate(v.dateArrivee)}</p>
            <p>Prix : ${money(v.prixCourse)} | Gasoil : ${money(v.gasoil)} | Frais mission : ${money(v.fraisMission)}</p>
            ${v.typeVoyage === "aller_retour" ? `<p>Retour : ${escapeHtml(v.retourDepart || "-")} → ${escapeHtml(v.retourDestination || "-")}</p><p>Client retour : ${escapeHtml(v.retourClient || "-")} | Prix retour : ${money(v.prixCourseRetour)} | Gasoil retour : ${money(v.gasoilRetour)} | Frais retour : ${money(v.fraisMissionRetour)}</p>` : `<p class="muted">Voyage aller simple</p>`}
            <p>KM départ : ${v.kmDepart || "-"} | KM arrivée : ${v.kmArrivee || "-"}</p>
            ${voyageAdvancedLine(v)}
            ${v.documentUrl ? `<p><a href="${v.documentUrl}" target="_blank" rel="noopener">Voir le document</a></p>` : ""}
            <div class="actions">
              <button class="btn secondary" data-edit-voyage="${v.id}">Modifier</button>
              <button class="btn danger" data-delete-voyage="${v.id}">Supprimer</button>
            </div>
          </div>
        `).join("") : `<div class="item-card"><p>Aucun voyage pour le moment.</p></div>`}
      </div>
    </div>
  `;
}

function depensesHtml() {
  const camionOptions = state.camions.map(c => `<option value="${c.id}">${escapeHtml(c.numeroCamion || "Camion")} - ${escapeHtml(c.numeroPlaque || "")}</option>`).join("");
  return `
    <div class="card">
      <div class="card-header"><div><h2>Ajouter une dépense</h2><p class="muted">Dépense chauffeur envoyée à l’admin.</p></div></div>
      <form id="driverExpenseForm" class="form-grid">
        <label><span>Camion</span><select name="camionId"><option value="">Aucun / général</option>${camionOptions}</select></label>
        <label><span>Type</span><select name="type"><option>Gasoil</option><option>Péage</option><option>Repas</option><option>Réparation route</option><option>Autre</option></select></label>
        <label><span>Montant</span><input name="montant" type="number" step="0.01" required></label>
        <label><span>Date</span><input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></label>
        <label class="full"><span>Description</span><textarea name="description" placeholder="Détail de la dépense"></textarea></label>
        <button class="btn primary full" type="submit">Enregistrer dépense</button>
      </form>
    </div>`;
}

function settingsHtml() {
  return `
    <div class="card">
      <div class="card-header"><div><h2>Paramètres chauffeur</h2><p class="muted">Compte et sécurité.</p></div></div>
      <div class="driver-quick-grid">
        <div class="item-card"><h4>Profil</h4><p>${escapeHtml(state.profile.name || "-")}</p><p>${escapeHtml(state.profile.email || "-")}</p></div>
        <div class="item-card"><h4>Statut</h4><span class="status-pill">${escapeHtml(state.profile.status || "actif")}</span></div>
      </div>
      <button class="btn secondary" id="driverResetPasswordBtn" style="margin-top:14px">Modifier / réinitialiser mot de passe</button>
    </div>`;
}

function bindDriverNav() {
  document.querySelectorAll("[data-driver-nav]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-driver-nav]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".driver-page").forEach(p => p.classList.remove("active"));
      document.getElementById("page-" + btn.dataset.driverNav)?.classList.add("active");
    });
  });
}

function render() {
  document.getElementById("driverDashboard").innerHTML = dashboardHtml();
  document.getElementById("driverFormView").innerHTML = odometerHtml();
  document.getElementById("driverTripFormView").innerHTML = formHtml();
  document.getElementById("driverTripsView").innerHTML = tripsHtml();
  document.getElementById("driverDepensesView").innerHTML = depensesHtml();
  document.getElementById("driverSettingsView").innerHTML = settingsHtml();
  bindDriverNav();
  bindForm();
  bindActions();
}

async function refreshData() {
  [state.voyages, state.camions, state.odometres] = await Promise.all([getMesVoyages(), getCamions(), getMesOdometres()]);
  render();
}

function pick(id) {
  return state.voyages.find(v => v.id === id);
}

function bindActions() {
  document.querySelectorAll("[data-delete-voyage]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Supprimer ce voyage ?")) return;
    await deleteVoyage(btn.dataset.deleteVoyage);
    await refreshData();
  }));
  document.querySelectorAll("[data-edit-voyage]").forEach(btn => btn.addEventListener("click", async () => {
    const item = pick(btn.dataset.editVoyage);
    const client = prompt("Client", item.client || "");
    if (client === null) return;
    const destination = prompt("Destination", item.destination || "");
    if (destination === null) return;
    const prixCourse = prompt("Prix de course", item.prixCourse || 0);
    if (prixCourse === null) return;
    const gasoil = prompt("Gasoil", item.gasoil || 0);
    if (gasoil === null) return;
    const fraisMission = prompt("Frais de mission", item.fraisMission || 0);
    if (fraisMission === null) return;
    await updateVoyage(item.id, {
      client,
      destination,
      prixCourse: numberOrZero(prixCourse),
      gasoil: numberOrZero(gasoil),
      fraisMission: numberOrZero(fraisMission)
    });
    await refreshData();
  }));
}

function emailConfigReady() {
  const cfg = window.EMAILJS_CONFIG || {};
  return cfg.publicKey && cfg.serviceId && cfg.templateId &&
    !String(cfg.publicKey).includes("REMPLACE") &&
    !String(cfg.serviceId).includes("REMPLACE") &&
    !String(cfg.templateId).includes("REMPLACE");
}

function readImageCompressed(file, maxSize = 900, quality = 0.68) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function sendOdometerEmail({ data, camion, imageDataUrl }) {
  if (!window.emailjs) throw new Error("EmailJS n’est pas chargé.");
  if (!emailConfigReady()) throw new Error("Configuration EmailJS manquante dans js/email-config.js");

  const cfg = window.EMAILJS_CONFIG;
  window.emailjs.init({ publicKey: cfg.publicKey });

  const dateText = formatDate(data.date);
  const params = {
    to_email: cfg.toEmail || "",
    subject: `KM camion - ${camion?.numeroCamion || data.camionId || "Camion"} - ${data.kilometrage} km`,
    title_fr: "Preuve kilométrage camion",
    title_ar: "إثبات كيلومترات الشاحنة",
    chauffeur_name: state.profile.name || state.profile.email || "Chauffeur",
    chauffeur_email: state.profile.email || "",
    camion: `${camion?.numeroCamion || ""} ${camion?.numeroPlaque ? "- " + camion.numeroPlaque : ""}`.trim() || data.camionId || "-",
    kilometrage: data.kilometrage,
    date: dateText,
    remarque: data.remarque || "-",
    image: imageDataUrl
  };

  return window.emailjs.send(cfg.serviceId, cfg.templateId, params);
}

function bindTripTypeToggle(root = document) {
  root.querySelectorAll("[data-trip-type]").forEach(select => {
    const form = select.closest("form");
    const section = form?.querySelector("[data-return-section]");
    const update = () => { if (section) section.style.display = select.value === "aller_retour" ? "block" : "none"; };
    select.addEventListener("change", update);
    update();
  });
}

function bindForm() {
  bindTripTypeToggle(document);
  document.getElementById("odometerForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = formToObject(form);
    const file = form.odometrePhoto.files[0];
    data.chauffeurId = state.profile.id;
    data.nomChauffeur = state.profile.name || "";
    data.kilometrage = numberOrZero(data.kilometrage);
    data.date = data.date ? new Date(data.date + "T12:00:00") : new Date();
    delete data.odometrePhoto;

    let photoEmailSent = false;
    let photoEmailError = "";

    if (file) {
      try {
        const camion = state.camions.find(c => c.id === data.camionId);
        const imageDataUrl = await readImageCompressed(file);
        await sendOdometerEmail({ data, camion, imageDataUrl });
        photoEmailSent = true;
      } catch (err) {
        console.error(err);
        photoEmailError = err.message || "Erreur envoi email";
      }
    }

    const sameDay = state.odometres.find(o => o.camionId === data.camionId && new Date(o.date).toISOString().slice(0,10) === new Date(data.date).toISOString().slice(0,10));
    if (sameDay) {
      alert("❌ KM déjà enregistré pour ce camion aujourd’hui.");
      return;
    }
    const lastForCamion = state.odometres
      .filter(o => o.camionId === data.camionId)
      .sort((a,b) => numberOrZero(b.kilometrage) - numberOrZero(a.kilometrage))[0];
    if (lastForCamion && data.kilometrage <= numberOrZero(lastForCamion.kilometrage)) {
      alert("❌ KM invalide. Dernier KM du camion: " + numberOrZero(lastForCamion.kilometrage));
      return;
    }
    if (lastForCamion && data.kilometrage > numberOrZero(lastForCamion.kilometrage) + 2000) {
      if (!confirm("⚠️ KM suspect (+2000 km). Confirmer quand même ?")) return;
    }

    await addOdometre({
      ...data,
      photoEmailSent,
      photoEmailError
    });

    form.reset();
    alert(photoEmailSent ? "KM enregistré et photo envoyée par email ✅" : (file ? `KM enregistré, mais photo non envoyée: ${photoEmailError}` : "KM enregistré ✅"));
    await refreshData();
  });

  document.getElementById("driverTripForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = formToObject(form);
    data.chauffeurId = state.profile.id;
    data.typeVoyage = data.typeVoyage || "simple";
    if (data.typeVoyage !== "aller_retour") {
      data.retourClient = "";
      data.retourDepart = "";
      data.retourDestination = "";
      data.dateRetour = null;
      data.dateRetourArrivee = null;
      data.prixCourseRetour = 0;
      data.fraisMissionRetour = 0;
      data.gasoilRetour = 0;
    }
    ["prixCourse","gasoil","fraisMission","prixCourseRetour","fraisMissionRetour","gasoilRetour","kmDepart","kmArrivee"].forEach(k => data[k] = numberOrZero(data[k]));
    ["dateDepart","dateArrivee","dateRetour","dateRetourArrivee"].forEach(k => data[k] = dateTimeOrNull(data[k]));
    if (!data.camionId) { alert("❌ Choisir un camion"); return; }
    if (data.kmArrivee && data.kmDepart && data.kmArrivee <= data.kmDepart) { alert("❌ KM arrivée doit être supérieur au KM départ"); return; }
    const file = form.voyageFile.files[0];
    delete data.voyageFile;
    const ref = await addVoyage(data);
    if (file) {
      const url = await uploadFile(`voyages/${ref.id}/${file.name}`, file);
      await updateVoyage(ref.id, { documentUrl: url });
    }
    form.reset();
    await refreshData();
    document.querySelector('[data-driver-nav="km"]')?.click();
  });

  document.getElementById("driverExpenseForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = formToObject(form);
    data.montant = numberOrZero(data.montant);
    data.date = data.date ? new Date(data.date + "T12:00:00") : new Date();
    data.chauffeurId = state.profile.id;
    data.nomChauffeur = state.profile.name || "";
    data.status = "a_valider";
    await addDepense(data);
    form.reset();
    alert("Dépense enregistrée ✅");
  });

  document.getElementById("driverResetPasswordBtn")?.addEventListener("click", async () => {
    if (!state.profile.email) return alert("Email introuvable");
    const { sendPasswordResetEmail } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
    const { auth } = await import("./firebase-config.js");
    await sendPasswordResetEmail(auth, state.profile.email);
    alert("Lien de réinitialisation envoyé ✅");
  });

}

async function init() {
  installSW();
  bindLogout();
  const { profile } = await requireRole("chauffeur");
  state.profile = profile;
  document.getElementById("driverWelcome").textContent = `Bienvenue ${profile.name || "Chauffeur"}`;
  await refreshData();
}

init().catch(err => {
  console.error(err);
  alert(err.message || "Erreur de chargement chauffeur");
});
