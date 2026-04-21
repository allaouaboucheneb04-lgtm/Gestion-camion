import {
  addVoyage, updateVoyage, deleteVoyage, getMesVoyages, uploadFile
} from "./firebase.js";
import {
  money, formatDate, escapeHtml, formToObject, numberOrZero, dateTimeOrNull,
  requireRole, bindLogout, installSW
} from "./common.js";

const state = {
  profile: null,
  voyages: []
};

function dashboardHtml() {
  const revenu = state.voyages.reduce((s, v) => s + numberOrZero(v.prixCourse) + numberOrZero(v.prixCourseRetour), 0);
  const couts = state.voyages.reduce((s, v) => s + numberOrZero(v.gasoil) + numberOrZero(v.fraisMission) + numberOrZero(v.gasoilRetour) + numberOrZero(v.fraisMissionRetour), 0);
  const benefice = revenu - couts;

  return `
    <div class="stats-grid">
      <div class="card stat-card"><div class="label">Mes voyages</div><div class="value">${state.voyages.length}</div></div>
      <div class="card stat-card"><div class="label">Revenu</div><div class="value">${money(revenu)}</div></div>
      <div class="card stat-card"><div class="label">Coûts</div><div class="value">${money(couts)}</div></div>
      <div class="card stat-card"><div class="label">Bénéfice estimé</div><div class="value">${money(benefice)}</div></div>
    </div>
  `;
}

function formHtml() {
  return `
    <div class="card">
      <div class="card-header"><div><h2>Ajouter un voyage</h2><p class="muted">Le chauffeur ajoute uniquement ses voyages</p></div></div>
      <form id="driverTripForm" class="form-grid">
        <label><span>Nom du chauffeur</span><input name="nomChauffeur" value="${escapeHtml(state.profile.name || "")}" required></label>
        <label><span>Client</span><input name="client" required></label>
        <label><span>Destination</span><input name="destination" required></label>
        <label><span>Date de départ</span><input name="dateDepart" type="datetime-local"></label>
        <label><span>Date d'arrivée</span><input name="dateArrivee" type="datetime-local"></label>
        <label><span>Prix de course</span><input name="prixCourse" type="number" step="0.01"></label>
        <label><span>Gasoil</span><input name="gasoil" type="number" step="0.01"></label>
        <label><span>Frais de mission</span><input name="fraisMission" type="number" step="0.01"></label>
        <label><span>Auteur dépenses</span><input name="auteurDepenses" value="${escapeHtml(state.profile.name || "")}"></label>

        <label><span>Client retour</span><input name="retourClient"></label>
        <label><span>Destination retour</span><input name="retourDestination"></label>
        <label><span>Date de retour</span><input name="dateRetour" type="datetime-local"></label>
        <label><span>Date arrivée retour</span><input name="dateRetourArrivee" type="datetime-local"></label>
        <label><span>Prix course retour</span><input name="prixCourseRetour" type="number" step="0.01"></label>
        <label><span>Frais mission retour</span><input name="fraisMissionRetour" type="number" step="0.01"></label>
        <label><span>Gasoil retour</span><input name="gasoilRetour" type="number" step="0.01"></label>
        <label><span>Kilométrage après chèque 10 voyages</span><input name="kilometrageApres10Voyages" type="number" step="0.01"></label>
        <label class="full"><span>Document du voyage (optionnel)</span><input type="file" name="voyageFile" accept="image/*,.pdf"></label>
        <button class="btn primary full" type="submit">Ajouter le voyage</button>
      </form>
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
            <h4>${escapeHtml(v.client || "-")} → ${escapeHtml(v.destination || "-")}</h4>
            <p>Départ : ${formatDate(v.dateDepart)} | Arrivée : ${formatDate(v.dateArrivee)}</p>
            <p>Prix : ${money(v.prixCourse)} | Gasoil : ${money(v.gasoil)} | Frais mission : ${money(v.fraisMission)}</p>
            <p>Retour : ${escapeHtml(v.retourClient || "-")} → ${escapeHtml(v.retourDestination || "-")}</p>
            <p>Prix retour : ${money(v.prixCourseRetour)} | Gasoil retour : ${money(v.gasoilRetour)} | Frais retour : ${money(v.fraisMissionRetour)}</p>
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
  document.getElementById("driverFormView").innerHTML = formHtml();
  document.getElementById("driverTripsView").innerHTML = tripsHtml();
  bindForm();
  bindActions();
}

async function refreshData() {
  state.voyages = await getMesVoyages();
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

function bindForm() {
  document.getElementById("driverTripForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = formToObject(form);
    data.chauffeurId = state.profile.id;
    ["prixCourse","gasoil","fraisMission","prixCourseRetour","fraisMissionRetour","gasoilRetour","kilometrageApres10Voyages"].forEach(k => data[k] = numberOrZero(data[k]));
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
