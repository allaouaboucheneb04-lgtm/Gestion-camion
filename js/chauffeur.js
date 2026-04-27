import {
  addVoyage, updateVoyage, deleteVoyage, getMesVoyages, getCamions, addOdometre, updateOdometre, getMesOdometres, getOdometres, uploadFile, setAffectationJour, getAffectationJour
} from "./firebase.js";
import {
  money, formatDate, escapeHtml, formToObject, numberOrZero, dateTimeOrNull,
  requireRole, bindLogout, installSW
} from "./common.js";

const state = {
  profile: null,
  voyages: [],
  camions: [],
  odometres: [],
  affectationJour: null
};

const KM_SUSPECT_JUMP = 2000;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function camionLabel(camionId) {
  const c = state.camions.find(x => x.id === camionId);
  if (!c) return camionId || "Aucun camion";
  return `${c.numeroCamion || "Camion"}${c.numeroPlaque ? " - " + c.numeroPlaque : ""}${c.marqueModele ? " · " + c.marqueModele : ""}`;
}

function selectedCamionId() {
  return state.affectationJour?.camionId || localStorage.getItem(`camionJour_${state.profile?.id || ""}_${todayKey()}`) || "";
}

function camionOptions(selected = "") {
  return state.camions.map(c => `<option value="${c.id}" ${c.id === selected ? "selected" : ""}>${escapeHtml(c.numeroCamion || "Camion")} - ${escapeHtml(c.numeroPlaque || "")}${c.marqueModele ? " · " + escapeHtml(c.marqueModele) : ""}</option>`).join("");
}


function normalizeDateKey(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (typeof value?.toDate === "function") return value.toDate().toISOString().slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : "";
}

function findLastOdometerForTruck(odometres, camionId) {
  return (odometres || [])
    .filter(o => o.camionId === camionId && Number(o.kilometrage) > 0)
    .sort((a, b) => Number(b.kilometrage || 0) - Number(a.kilometrage || 0))[0] || null;
}

async function getAllOdometersSafe() {
  try {
    return await getOdometres();
  } catch (error) {
    console.warn("Lecture globale odomètres impossible, fallback mes odomètres", error);
    return state.odometres || [];
  }
}

async function validateOdometerBeforeSave(data) {
  const camionId = data.camionId;
  const km = Number(data.kilometrage || 0);
  const dateKey = normalizeDateKey(data.date);

  if (!camionId) throw new Error("Choisis un camion.");
  if (!Number.isFinite(km) || km <= 0) throw new Error("Le kilométrage doit être supérieur à 0.");

  const allOdometers = await getAllOdometersSafe();
  const sameDay = allOdometers.find(o => o.camionId === camionId && normalizeDateKey(o.date) === dateKey);
  if (sameDay) {
    throw new Error(`KM déjà enregistré pour ce camion à cette date. Dernier saisi: ${sameDay.kilometrage || "-"} km.`);
  }

  const last = findLastOdometerForTruck(allOdometers, camionId);
  if (last) {
    const lastKm = Number(last.kilometrage || 0);
    if (km <= lastKm) {
      throw new Error(`KM invalide. Le nouveau KM (${km.toLocaleString("fr-CA")}) doit être supérieur au dernier KM enregistré (${lastKm.toLocaleString("fr-CA")}).`);
    }
    const diff = km - lastKm;
    if (diff > KM_SUSPECT_JUMP) {
      const ok = confirm(`⚠️ KM suspect: +${diff.toLocaleString("fr-CA")} km depuis le dernier relevé (${lastKm.toLocaleString("fr-CA")}).\n\nContinuer quand même ?`);
      if (!ok) throw new Error("Enregistrement annulé: KM suspect à vérifier.");
      data.kmAlerte = true;
      data.kmAlerteMessage = `Saut élevé: +${diff} km depuis ${lastKm}`;
    }
  }

  data.kmPrecedent = last ? Number(last.kilometrage || 0) : 0;
  data.kmDifference = data.kmPrecedent ? km - data.kmPrecedent : 0;
  return data;
}

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


function dailyTruckHtml() {
  const selected = selectedCamionId();
  const lockedMsg = selected
    ? `Camion choisi aujourd’hui : <strong>${escapeHtml(camionLabel(selected))}</strong>. Tu peux le changer si nécessaire.`
    : `Choisis le camion avec lequel tu travailles aujourd’hui. Cette sélection sera utilisée par défaut pour le KM et les voyages.`;
  return `
    <div class="card daily-truck-card">
      <div class="card-header">
        <div>
          <h2>Camion du jour / شاحنة اليوم</h2>
          <p class="muted">${lockedMsg}</p>
        </div>
      </div>
      <form id="dailyTruckForm" class="form-grid">
        <label class="full"><span>Choisir camion / اختر الشاحنة</span><select name="camionId" required><option value="">Choisir camion</option>${camionOptions(selected)}</select></label>
        <button class="btn primary full" type="submit">Valider camion du jour</button>
      </form>
    </div>
  `;
}

function formHtml() {
  return `
    <div class="card">
      <div class="card-header"><div><h2>Ajouter un voyage</h2><p class="muted">Le chauffeur ajoute uniquement ses voyages</p></div></div>
      <form id="driverTripForm" class="form-grid">
        <label><span>Type de voyage</span><select name="typeVoyage" data-trip-type required><option value="simple">Aller simple</option><option value="aller_retour">Aller-retour</option></select></label>
        <label><span>Camion</span><select name="camionId" data-trip-camion required><option value="">Choisir camion</option>${camionOptions(selectedCamionId())}</select></label>
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
  const selected = selectedCamionId();
  const options = camionOptions(selected);
  return `
    <div class="card odometer-card">
      <div class="card-header"><div><h2>KM du jour / عداد اليوم</h2><p class="muted">Chaque jour, inscris le kilométrage. La photo de l’odomètre est optionnelle : si tu l’ajoutes, elle sera envoyée par email.</p></div></div>
      <form id="odometerForm" class="form-grid">
        <label><span>Date / التاريخ</span><input name="date" type="date" value="${today}" required></label>
        <label><span>Camion / الشاحنة</span><select name="camionId" data-km-camion required><option value="">Choisir camion</option>${options}</select></label>\n        <div class="full km-validation-hint" data-km-hint>Choisis un camion pour voir le dernier KM enregistré.</div>
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
            ${o.kmAlerte ? `<p><span class="badge danger">KM suspect vérifié</span> ${escapeHtml(o.kmAlerteMessage || "")}</p>` : ""}\n            ${o.kmDifference ? `<p>Différence depuis dernier relevé : ${Number(o.kmDifference).toLocaleString("fr-CA")} km</p>` : ""}\n            ${o.photoEmailSent ? `<p><span class="badge success">Photo envoyée par email</span></p>` : ""}
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

function render() {
  document.getElementById("driverDashboard").innerHTML = dashboardHtml();
  document.getElementById("driverFormView").innerHTML = dailyTruckHtml() + odometerHtml() + formHtml();
  document.getElementById("driverTripsView").innerHTML = tripsHtml();
  bindForm();
  bindActions();
}

async function refreshData() {
  [state.voyages, state.camions, state.odometres] = await Promise.all([getMesVoyages(), getCamions(), getMesOdometres()]);
  state.affectationJour = state.profile?.id ? await getAffectationJour(state.profile.id, todayKey()).catch(() => null) : null;
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

function bindKmValidationHint() {
  const select = document.querySelector("[data-km-camion]");
  const hint = document.querySelector("[data-km-hint]");
  if (!select || !hint) return;
  const update = async () => {
    const camionId = select.value;
    if (!camionId) {
      hint.textContent = "Choisis un camion pour voir le dernier KM enregistré.";
      hint.className = "full km-validation-hint";
      return;
    }
    const all = await getAllOdometersSafe();
    const last = findLastOdometerForTruck(all, camionId);
    if (!last) {
      hint.textContent = "Aucun ancien KM pour ce camion. Premier relevé.";
      hint.className = "full km-validation-hint success";
      return;
    }
    hint.textContent = `Dernier KM enregistré pour ce camion : ${Number(last.kilometrage || 0).toLocaleString("fr-CA")} km. Le nouveau KM doit être supérieur.`;
    hint.className = "full km-validation-hint warning";
  };
  select.addEventListener("change", () => update().catch(console.error));
  update().catch(console.error);
}

function bindForm() {
  bindTripTypeToggle(document);
  bindKmValidationHint();

  document.getElementById("dailyTruckForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const camionId = form.camionId.value;
    if (!camionId) return alert("Choisis un camion.");
    await setAffectationJour({
      chauffeurId: state.profile.id,
      nomChauffeur: state.profile.name || "",
      camionId,
      camionLabel: camionLabel(camionId),
      dateKey: todayKey(),
      source: "chauffeur"
    });
    localStorage.setItem(`camionJour_${state.profile.id}_${todayKey()}`, camionId);
    alert("Camion du jour enregistré ✅");
    await refreshData();
  });

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

    try {
      await validateOdometerBeforeSave(data);
    } catch (validationError) {
      alert(validationError.message || "KM invalide");
      return;
    }

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
    data.camionId = data.camionId || selectedCamionId();
    if (!data.camionId) { alert("Choisir un camion pour ce voyage."); return; }
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
    if (data.kmDepart && data.kmArrivee && data.kmArrivee <= data.kmDepart) {
      alert("KM arrivée doit être supérieur au KM départ.");
      return;
    }
    ["dateDepart","dateArrivee","dateRetour","dateRetourArrivee"].forEach(k => data[k] = dateTimeOrNull(data[k]));
    const file = form.voyageFile.files[0];
    delete data.voyageFile;
    const ref = await addVoyage(data);
    if (file) {
      const url = await uploadFile(`voyages/${ref.id}/${file.name}`, file);
      await updateVoyage(ref.id, { documentUrl: url });
    }
    form.reset();
    await refreshData();
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
