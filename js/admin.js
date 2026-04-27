import {
  addCamion, updateCamion, deleteCamion, getCamions,
  addChauffeur, updateChauffeur, deleteChauffeur, getChauffeurs,
  inviteDriverAccount, createDriverAuthAccount, saveUserProfile, sendPasswordReset,
  addVoyage, updateVoyage, deleteVoyage, getVoyages, getOdometres,
  addEntretien, updateEntretien, deleteEntretien, getEntretiens,
  addDepense, updateDepense, deleteDepense, getDepenses,
  uploadFile
} from "./firebase.js";
import {
  money, formatDate, escapeHtml, formToObject, numberOrZero, dateTimeOrNull,
  requireRole, bindLogout, bindSidebar, installSW
} from "./common.js";


function displayError(error, context = "Erreur") {
  console.error(context, error);
  const raw = error?.message || error?.code || String(error || "Erreur inconnue");
  let msg = raw;

  if (raw.includes("permission-denied")) {
    msg = "Permission refusée: vérifie que ton document users/{ton UID} contient exactement role: admin.";
  } else if (raw.includes("functions/not-found") || raw.includes("not-found") || raw.includes("Function")) {
    msg = "Cloud Function introuvable. Déploie les functions du ZIP avec: firebase deploy --only functions.";
  } else if (context.includes("Suppression") && raw.includes("internal")) {
    msg = "Erreur Cloud Function deleteDriver. Vérifie que deleteDriver est déployée dans le même projet Firebase et que tu es connecté en admin.";
  } else if (context.includes("Création") && raw.includes("internal")) {
    msg = "Erreur création chauffeur. Vérifie les rules Firestore, ton rôle admin, et teste sans fichier si besoin.";
  } else if (raw.includes("auth/email-already-in-use")) {
    msg = "Cet email existe déjà dans Firebase Authentication. Utilise un autre email ou supprime l’ancien compte Auth.";
  }

  alert(context + ": " + msg);
}
const state = {
  profile: null,
  camions: [],
  chauffeurs: [],
  voyages: [],
  entretien: [],
  depenses: [],
  odometres: [],
  selectedChauffeurId: null,
  chauffeurFilter: "actif"
};

function setActiveView(name) {
  document.querySelectorAll(".menu-item").forEach(btn => btn.classList.toggle("active", btn.dataset.view === name));
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  const view = document.getElementById(`${name}View`);
  if (view) view.classList.add("active");
  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) pageTitle.textContent = name.charAt(0).toUpperCase() + name.slice(1);
  const sidebar = document.getElementById("sidebar");
  sidebar?.classList.remove("open");
}

function bindMenu() {
  document.querySelectorAll(".menu-item").forEach(btn => {
    btn.addEventListener("click", () => setActiveView(btn.dataset.view));
  });
}


function lastKmForCamion(camionId) {
  const rows = state.odometres
    .filter(r => r.camionId === camionId)
    .sort((a,b) => dateMillis(b.date || b.createdAt) - dateMillis(a.date || a.createdAt));
  return rows.length ? kmNumber(rows[0]) : 0;
}

function defaultEntretienInterval(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('vidange')) return 10000;
  if (t.includes('pneu')) return 50000;
  if (t.includes('piece') || t.includes('pièce')) return 30000;
  if (t.includes('reparation') || t.includes('réparation')) return 20000;
  return 10000;
}

function entretienProgress(item) {
  const currentKm = lastKmForCamion(item.camionId);
  const startKm = numberOrZero(item.kmEntretien || item.kmService || item.kmDepart || item.km || 0);
  const intervalKm = numberOrZero(item.intervalKm || item.prochainKm || defaultEntretienInterval(item.type));
  const usedKm = Math.max(0, currentKm - startKm);
  const percent = intervalKm > 0 ? Math.min(100, Math.round((usedKm / intervalKm) * 100)) : 0;
  const remainingKm = Math.max(0, intervalKm - usedKm);
  let status = 'ok';
  if (percent >= 100) status = 'danger';
  else if (percent >= 80) status = 'warning';
  return { currentKm, startKm, intervalKm, usedKm, percent, remainingKm, status };
}

function entretienProgressCircle(item, compact = false) {
  const p = entretienProgress(item);
  return `<div class="maintenance-circle-wrap ${p.status} ${compact ? 'compact' : ''}">
    <div class="maintenance-circle" style="--p:${p.percent}">
      <span>${p.percent}%</span>
    </div>
    <div class="maintenance-circle-info">
      <strong>${p.remainingKm.toLocaleString('fr-CA')} km restants</strong>
      <small>Actuel: ${p.currentKm.toLocaleString('fr-CA')} km · Départ entretien: ${p.startKm.toLocaleString('fr-CA')} km</small>
    </div>
  </div>`;
}

function entretienAlerts() {
  return state.entretien
    .filter(e => e.camionId)
    .map(e => ({ ...e, progress: entretienProgress(e) }))
    .sort((a,b) => b.progress.percent - a.progress.percent);
}

function dashboardEntretienHtml() {
  const items = entretienAlerts().slice(0, 6);
  return `
    <div class="card maintenance-dashboard-card">
      <div class="card-header"><div><h2>Suivi entretien</h2><p class="muted">Progression kilométrage par camion et type d'entretien.</p></div><button class="btn secondary" data-go-alertes>Voir alertes</button></div>
      <div class="maintenance-grid">
        ${items.length ? items.map(e => `
          <div class="maintenance-mini-card">
            <div><h4>${escapeHtml(camionName(e.camionId))}</h4><p>${escapeHtml(e.type || 'Entretien')}</p></div>
            ${entretienProgressCircle(e, true)}
          </div>
        `).join('') : `<div class="item-card"><p>Aucun entretien avec kilométrage. Ajoute un entretien avec KM entretien et intervalle KM.</p></div>`}
      </div>
    </div>
  `;
}

function dashboardHtml() {
  const revenu = state.voyages.reduce((s, v) => s + voyageRevenue(v), 0);
  const coutsVoyages = state.voyages.reduce((s, v) => s + voyageCosts(v), 0);
  const coutsEntretien = state.entretien.reduce((s, e) => s + numberOrZero(e.cout), 0);
  const autresDepenses = state.depenses.reduce((s, d) => s + numberOrZero(d.montant), 0);
  const benefice = revenu - coutsVoyages - coutsEntretien - autresDepenses;
  const kmJour = state.odometres.length;

  return `
    <div class="stats-grid">
      <div class="card stat-card"><div class="label">Camions</div><div class="value">${state.camions.length}</div></div>
      <div class="card stat-card"><div class="label">Chauffeurs actifs</div><div class="value">${state.chauffeurs.filter(c => (c.status || "actif") === "actif").length}</div></div>
      <div class="card stat-card"><div class="label">Revenu total</div><div class="value">${money(revenu)}</div></div>
      <div class="card stat-card"><div class="label">Bénéfice estimé</div><div class="value">${money(benefice)}</div></div>
      <div class="card stat-card"><div class="label">KM journaliers</div><div class="value">${kmJour}</div></div>
    </div>

    <div class="card">
      <div class="card-header"><div><h2>Résumé rapide</h2><p class="muted">Vue globale de l'activité camion</p></div></div>
      <div class="grid">
        <div class="item-card"><h4>Coûts voyages</h4><p>${money(coutsVoyages)}</p></div>
        <div class="item-card"><h4>Entretien</h4><p>${money(coutsEntretien)}</p></div>
        <div class="item-card"><h4>Autres dépenses</h4><p>${money(autresDepenses)}</p></div>
      </div>
    </div>

    ${dashboardEntretienHtml()}
  `;
}

function camionFormHtml() {
  return `
    <div class="card">
      <div class="card-header"><div><h2>Ajouter un camion</h2><p class="muted">Numéro, plaque, marque, remorque</p></div></div>
      <form id="camionForm" class="form-grid">
        <label><span>Numéro de camion</span><input name="numeroCamion" required></label>
        <label><span>Numéro de plaque</span><input name="numeroPlaque" required></label>
        <label><span>Marque et modèle</span><input name="marqueModele" required></label>
        <label><span>Numéro de remorque</span><input name="numeroRemorque"></label>
        <label><span>Plaque de remorque</span><input name="plaqueRemorque"></label>
        <label class="full"><span>Remarque</span><textarea name="remarque"></textarea></label>
        <label class="full"><span>Photo camion (optionnel)</span><input type="file" name="photoCamion" accept="image/*,.pdf"></label>
        <button class="btn primary full" type="submit">Enregistrer le camion</button>
      </form>
    </div>`;
}

function camionsListHtml() {
  return `
    <div class="card">
      <div class="card-header"><div><h2>Liste des camions</h2><p class="muted">Clique modifier pour mettre à jour les infos</p></div></div>
      <div class="list">
        ${state.camions.length ? state.camions.map(c => `
          <div class="item-card">
            <h4>${escapeHtml(c.numeroCamion || "-")} <span class="badge">${escapeHtml(c.numeroPlaque || "-")}</span></h4>
            <p>Marque / modèle : ${escapeHtml(c.marqueModele || "-")}</p>
            <p>Remorque : ${escapeHtml(c.numeroRemorque || "-")} | Plaque remorque : ${escapeHtml(c.plaqueRemorque || "-")}</p>
            <p>Remarque : ${escapeHtml(c.remarque || "-")}</p>
            ${c.photoUrl ? `<p><a href="${c.photoUrl}" target="_blank" rel="noopener">Voir le fichier</a></p>` : ""}
            <div class="actions">
              <button class="btn secondary" data-edit-camion="${c.id}">Modifier</button>
              <button class="btn danger" data-delete-camion="${c.id}">Supprimer</button>
            </div>
          </div>
        `).join("") : `<div class="item-card"><p>Aucun camion pour le moment.</p></div>`}
      </div>
    </div>`;
}


function fullDate(value) {
  if (!value) return "-";
  try {
    const d = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("fr-CA");
  } catch {
    return "-";
  }
}

function chauffeurDetailsHtml(chauffeur) {
  if (!chauffeur) return "";
  const uid = chauffeur.userId || "";
  const voyages = state.voyages.filter(v => v.chauffeurId === uid);
  const depenses = state.depenses.filter(d => d.chauffeurId === uid || d.chauffeurId === chauffeur.id);
  const odometres = state.odometres.filter(o => o.chauffeurId === uid);
  const revenu = voyages.reduce((s, v) => s + voyageRevenue(v), 0);
  const gasoil = voyages.reduce((s, v) => s + numberOrZero(v.gasoil) + numberOrZero(v.gasoilRetour), 0);
  const distanceVoyages = voyages.reduce((s, v) => s + voyageDistance(v), 0);
  const fraisMission = voyages.reduce((s, v) => s + numberOrZero(v.fraisMission) + numberOrZero(v.fraisMissionRetour), 0);
  const autresDepenses = depenses.reduce((s, d) => s + numberOrZero(d.montant), 0);
  const net = revenu - gasoil - fraisMission - autresDepenses;

  return `
    <div class="card detail-card" id="chauffeurDetailsCard">
      <div class="card-header">
        <div>
          <h2>Détails chauffeur : ${escapeHtml(chauffeur.nom || "-")}</h2>
          <p class="muted">Profil, invitation, voyages et performance</p>
        </div>
        <button class="btn secondary" data-reset-password="${chauffeur.id}">Réinitialiser mot de passe</button>
        <button class="btn secondary" data-close-chauffeur-details>Fermer</button>
      </div>

      <div class="stats-grid">
        <div class="card stat-card"><div class="label">Voyages</div><div class="value">${voyages.length}</div></div>
        <div class="card stat-card"><div class="label">Revenu</div><div class="value">${money(revenu)}</div></div>
        <div class="card stat-card"><div class="label">Coûts</div><div class="value">${money(gasoil + fraisMission + autresDepenses)}</div></div>
        <div class="card stat-card"><div class="label">Net estimé</div><div class="value">${money(net)}</div></div>
        <div class="card stat-card"><div class="label">Dernier KM</div><div class="value">${odometres[0]?.kilometrage || "-"}</div></div>
        <div class="card stat-card"><div class="label">Distance voyages</div><div class="value">${distanceVoyages ? distanceVoyages.toLocaleString("fr-CA") + " km" : "-"}</div></div>
      </div>

      <div class="grid detail-grid">
        <div class="item-card">
          <h4>Informations personnelles</h4>
          <p><strong>Nom :</strong> ${escapeHtml(chauffeur.nom || "-")}</p>
          <p><strong>Email :</strong> ${escapeHtml(chauffeur.invitedEmail || chauffeur.email || "-")}</p>
          <p><strong>Téléphone :</strong> ${escapeHtml(chauffeur.telephone || "-")}</p>
          <p><strong>Adresse :</strong> ${escapeHtml(chauffeur.adresse || "-")}</p>
          <p><strong>UID :</strong> ${escapeHtml(uid || "-")}</p>
          <p><strong>Statut compte :</strong> <span class="status-pill ${(chauffeur.status || "actif") === "inactif" ? "inactive" : "active"}">${(chauffeur.status || "actif") === "inactif" ? "Inactif" : "Actif"}</span></p>
        </div>
        <div class="item-card">
          <h4>Travail / permis</h4>
          <p><strong>Numéro chauffeur :</strong> ${escapeHtml(chauffeur.numeroChauffeur || "-")}</p>
          <p><strong>Numéro permis :</strong> ${escapeHtml(chauffeur.numeroPermis || "-")}</p>
          <p><strong>Statut invitation :</strong> ${escapeHtml(chauffeur.statutInvitation || "-")}</p>
          <p><strong>Créé le :</strong> ${fullDate(chauffeur.createdAt)}</p>
          ${chauffeur.documentUrl ? `<p><a href="${chauffeur.documentUrl}" target="_blank" rel="noopener">Voir permis / document</a></p>` : ""}
        </div>
      </div>

      <div class="item-card">
        <h4>Voyages de ce chauffeur</h4>
        ${voyages.length ? voyages.map(v => `
          <div class="item-card">
            <h4><span class="badge">${v.typeVoyage === "aller_retour" ? "Aller-retour" : "Aller simple"}</span> ${escapeHtml(v.depart || "-")} → ${escapeHtml(v.destination || "-")}</h4>
            <p>Client aller : ${escapeHtml(v.client || "-")} | Départ : ${formatDate(v.dateDepart)} | Arrivée : ${formatDate(v.dateArrivee)}</p>
            <p>Prix aller : ${money(v.prixCourse)} | Retour : ${money(v.prixCourseRetour)}</p>
            <p>Gasoil : ${money(numberOrZero(v.gasoil) + numberOrZero(v.gasoilRetour))} | Frais mission : ${money(numberOrZero(v.fraisMission) + numberOrZero(v.fraisMissionRetour))}</p>
            ${voyageAdvancedLine(v)}
            ${v.documentUrl ? `<p><a href="${v.documentUrl}" target="_blank" rel="noopener">Voir document voyage</a></p>` : ""}
          </div>
        `).join("") : `<p class="muted">Aucun voyage enregistré pour ce chauffeur.</p>`}
      </div>

      <div class="item-card">
        <h4>Dépenses liées au chauffeur</h4>
        ${depenses.length ? depenses.map(d => `
          <div class="item-card">
            <h4>${escapeHtml(d.type || "-")}</h4>
            <p>Montant : ${money(d.montant)} | Date : ${formatDate(d.date)}</p>
            <p>${escapeHtml(d.description || "-")}</p>
            ${d.documentUrl ? `<p><a href="${d.documentUrl}" target="_blank" rel="noopener">Voir reçu</a></p>` : ""}
          </div>
        `).join("") : `<p class="muted">Aucune dépense liée directement à ce chauffeur.</p>`}
      </div>
    </div>
  `;
}

function chauffeursHtml() {
  const activeCount = state.chauffeurs.filter(c => (c.status || "actif") === "actif").length;
  const inactiveCount = state.chauffeurs.filter(c => (c.status || "actif") === "inactif").length;
  const shown = state.chauffeurs.filter(c => {
    const st = c.status || "actif";
    if (state.chauffeurFilter === "tous") return true;
    return st === state.chauffeurFilter;
  });

  return `
    <div class="driver-hero card">
      <div>
        <p class="eyebrow">Gestion chauffeurs</p>
        <h2>Tableau chauffeur professionnel</h2>
        <p class="muted">Crée, consulte, désactive ou réactive un chauffeur sans supprimer son historique.</p>
      </div>
      <div class="driver-mini-stats">
        <div><strong>${activeCount}</strong><span>Actifs</span></div>
        <div><strong>${inactiveCount}</strong><span>Inactifs</span></div>
        <div><strong>${state.chauffeurs.length}</strong><span>Total</span></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div><h2>Ajouter un chauffeur</h2><p class="muted">Créer le compte chauffeur avec un mot de passe temporaire</p></div></div>
      <form id="chauffeurForm" class="form-grid">
        <label><span>Email du chauffeur</span><input name="email" type="email" required></label>
        <label><span>Mot de passe temporaire</span><input name="password" type="text" value="123456" required></label>
        <label><span>Nom du chauffeur</span><input name="nom" required></label>
        <label><span>Numéro de chauffeur</span><input name="numeroChauffeur"></label>
        <label><span>Numéro de permis</span><input name="numeroPermis"></label>
        <label><span>Téléphone</span><input name="telephone"></label>
        <label><span>Statut</span><select name="status"><option value="actif">Actif</option><option value="inactif">Inactif</option></select></label>
        <label class="full"><span>Adresse</span><textarea name="adresse"></textarea></label>
        <label class="full"><span>Permis / document (optionnel)</span><input type="file" name="profilFile" accept="image/*,.pdf"></label>
        <button class="btn primary full" type="submit">Créer chauffeur</button>
      </form>
    </div>

    <div class="card">
      <div class="card-header driver-list-header">
        <div><h2>Liste des chauffeurs</h2><p class="muted">Détails, performance, activation et désactivation du compte</p></div>
        <div class="segmented">
          <button class="seg-btn ${state.chauffeurFilter === "actif" ? "active" : ""}" data-filter-chauffeurs="actif">Actifs</button>
          <button class="seg-btn ${state.chauffeurFilter === "inactif" ? "active" : ""}" data-filter-chauffeurs="inactif">Inactifs</button>
          <button class="seg-btn ${state.chauffeurFilter === "tous" ? "active" : ""}" data-filter-chauffeurs="tous">Tous</button>
        </div>
      </div>
      <div class="list driver-list">
        ${shown.length ? shown.map(c => {
          const status = c.status || "actif";
          const isInactive = status === "inactif";
          const uid = c.userId || c.uid || "";
          const voyages = state.voyages.filter(v => v.chauffeurId === uid);
          const revenu = voyages.reduce((sum, v) => sum + voyageRevenue(v), 0);
          const lastKm = state.odometres.find(o => o.chauffeurId === uid);
          return `
          <div class="item-card driver-card ${isInactive ? "is-inactive" : ""}">
            <div class="driver-card-top">
              <div>
                <h4>${escapeHtml(c.nom || "-")} <span class="status-pill ${isInactive ? "inactive" : "active"}">${isInactive ? "Inactif" : "Actif"}</span></h4>
                <p>${escapeHtml(c.email || c.invitedEmail || "-")} · ${escapeHtml(c.telephone || "-")}</p>
              </div>
              <div class="driver-score"><strong>${voyages.length}</strong><span>voyages</span></div>
            </div>
            <div class="driver-info-grid">
              <p><strong>UID</strong><br>${escapeHtml(uid || "-")}</p>
              <p><strong>No chauffeur</strong><br>${escapeHtml(c.numeroChauffeur || "-")}</p>
              <p><strong>Permis</strong><br>${escapeHtml(c.numeroPermis || "-")}</p>
              <p><strong>Revenu</strong><br>${money(revenu)}</p>
              <p><strong>Dernier KM</strong><br>${lastKm?.kilometrage || "-"}</p>
            </div>
            <p class="muted">Adresse : ${escapeHtml(c.adresse || "-")}</p>
            ${c.documentUrl ? `<p><a href="${c.documentUrl}" target="_blank" rel="noopener">Voir permis / document</a></p>` : ""}
            <div class="actions">
              <button class="btn primary" data-detail-chauffeur="${c.id}">Détails</button>
              <button class="btn secondary" data-edit-chauffeur="${c.id}">Modifier</button>
              <button class="btn secondary" data-reset-password="${c.id}">Mot de passe</button>
              ${isInactive ? `<button class="btn success" data-enable-chauffeur="${c.id}">Réactiver</button>` : `<button class="btn danger" data-disable-chauffeur="${c.id}">Désactiver</button>`}
            </div>
          </div>`;
        }).join("") : `<div class="item-card"><p>Aucun chauffeur dans ce filtre.</p></div>`}
      </div>
    </div>
    ${chauffeurDetailsHtml(pickForEdit(state.chauffeurs, state.selectedChauffeurId))}
  `;
}

function voyagesHtml() {
  const chauffeurOptions = state.chauffeurs.filter(c => (c.status || "actif") === "actif" && c.userId).map(c => `<option value="${c.userId}">${escapeHtml(c.nom)} (${escapeHtml(c.userId)})</option>`).join("");
  const camionOptions = state.camions.map(c => `<option value="${c.id}">${escapeHtml(c.numeroCamion)} - ${escapeHtml(c.marqueModele)}</option>`).join("");
  return `
    <div class="card">
      <div class="card-header"><div><h2>Ajouter un voyage</h2><p class="muted">Aller + retour + coûts</p></div></div>
      <form id="voyageForm" class="form-grid">
        <label><span>Type de voyage</span><select name="typeVoyage" data-trip-type required><option value="simple">Aller simple</option><option value="aller_retour">Aller-retour</option></select></label>
        <label><span>Chauffeur (UID)</span><select name="chauffeurId" required><option value="">Choisir</option>${chauffeurOptions}</select></label>
        <label><span>Nom du chauffeur</span><input name="nomChauffeur" required></label>
        <label><span>Camion</span><select name="camionId"><option value="">Choisir</option>${camionOptions}</select></label>
        <label><span>Client aller</span><input name="client" required></label>
        <label><span>Départ aller</span><input name="depart" required></label>
        <label><span>Destination aller</span><input name="destination" required></label>
        <label><span>Date de départ</span><input name="dateDepart" type="datetime-local"></label>
        <label><span>Date d'arrivée</span><input name="dateArrivee" type="datetime-local"></label>
        <label><span>Prix de course aller</span><input name="prixCourse" type="number" step="0.01"></label>
        <label><span>Gasoil aller</span><input name="gasoil" type="number" step="0.01"></label>
        <label><span>Frais de mission aller</span><input name="fraisMission" type="number" step="0.01"></label>
        <label><span>Auteur dépenses</span><input name="auteurDepenses"></label>

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
        <button class="btn primary full" type="submit">Enregistrer le voyage</button>
      </form>
    </div>

    <div class="card">
      <div class="card-header"><div><h2>Liste des voyages</h2><p class="muted">Revenus, coûts, retour</p></div></div>
      <div class="list">
        ${state.voyages.length ? state.voyages.map(v => `
          <div class="item-card">
            <h4><span class="badge">${v.typeVoyage === "aller_retour" ? "Aller-retour" : "Aller simple"}</span> ${escapeHtml(v.depart || "-")} → ${escapeHtml(v.destination || "-")}</h4>
            <p>Client aller : ${escapeHtml(v.client || "-")} | Chauffeur : ${escapeHtml(v.nomChauffeur || v.chauffeurId || "-")}</p>
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

function entretienHtml() {
  return `
    <div class="card">
      <div class="card-header"><div><h2>Ajouter un entretien</h2><p class="muted">Pneus, vidange, pièces, réparation</p></div></div>
      <form id="entretienForm" class="form-grid">
        <label><span>Camion</span><select name="camionId"><option value="">Choisir</option>${state.camions.map(c => `<option value="${c.id}">${escapeHtml(c.numeroCamion)}</option>`).join("")}</select></label>
        <label><span>Type</span><select name="type" required>
          <option value="pneus">Pneus</option>
          <option value="vidange">Vidange</option>
          <option value="pieces mecaniques">Pièces mécaniques</option>
          <option value="reparation">Frais de réparation</option>
          <option value="hotel reparation">Hôtel réparation</option>
        </select></label>
        <label><span>Coût</span><input name="cout" type="number" step="0.01"></label>
        <label><span>Date</span><input name="date" type="datetime-local"></label>
        <label><span>Garage</span><input name="garage"></label>
        <label><span>KM lors entretien</span><input name="kmEntretien" type="number" placeholder="Ex: 125000"></label>
        <label><span>Intervalle prochain entretien (km)</span><input name="intervalKm" type="number" placeholder="Ex: 10000"></label>
        <label><span>Remorque ?</span><select name="remorque"><option value="false">Non</option><option value="true">Oui</option></select></label>
        <label class="full"><span>Description</span><textarea name="description"></textarea></label>
        <label class="full"><span>Facture / photo (optionnel)</span><input type="file" name="entretienFile" accept="image/*,.pdf"></label>
        <button class="btn primary full" type="submit">Enregistrer l'entretien</button>
      </form>
    </div>

    <div class="card">
      <div class="card-header"><div><h2>Liste des entretiens</h2><p class="muted">Historique mécanique</p></div></div>
      <div class="list">
        ${state.entretien.length ? state.entretien.map(e => `
          <div class="item-card">
            <h4>${escapeHtml(e.type || "-")}</h4>
            <p>Coût : ${money(e.cout)} | Date : ${formatDate(e.date)}</p>
            <p>Garage : ${escapeHtml(e.garage || "-")} | Remorque : ${e.remorque ? "Oui" : "Non"}</p>
            <p>Description : ${escapeHtml(e.description || "-")}</p>
            ${entretienProgressCircle(e, true)}
            ${e.documentUrl ? `<p><a href="${e.documentUrl}" target="_blank" rel="noopener">Voir la facture</a></p>` : ""}
            <div class="actions">
              <button class="btn secondary" data-edit-entretien="${e.id}">Modifier</button>
              <button class="btn danger" data-delete-entretien="${e.id}">Supprimer</button>
            </div>
          </div>
        `).join("") : `<div class="item-card"><p>Aucun entretien pour le moment.</p></div>`}
      </div>
    </div>
  `;
}


function alertesEntretienHtml() {
  const items = entretienAlerts();
  const danger = items.filter(x => x.progress.status === 'danger').length;
  const warning = items.filter(x => x.progress.status === 'warning').length;
  return `
    <div class="card maintenance-hero">
      <div><p class="eyebrow">Alertes entretien</p><h2>Contrôle entretien par kilométrage</h2><p class="muted">Chaque cercle montre où le camion est arrivé par rapport au prochain entretien.</p></div>
      <div class="driver-mini-stats"><div><strong>${items.length}</strong><span>Suivis</span></div><div><strong>${warning}</strong><span>À surveiller</span></div><div><strong>${danger}</strong><span>Urgents</span></div></div>
    </div>
    <div class="card">
      <div class="card-header"><div><h2>Camions à surveiller</h2><p class="muted">Vert = OK, orange = bientôt, rouge = entretien dépassé.</p></div></div>
      <div class="maintenance-list">
        ${items.length ? items.map(e => `
          <div class="maintenance-alert-card ${e.progress.status}">
            <div class="maintenance-alert-main">
              <div><h3>${escapeHtml(camionName(e.camionId))}</h3><p>${escapeHtml(e.type || 'Entretien')} · ${formatDate(e.date)}</p><p class="muted">Garage: ${escapeHtml(e.garage || '-')} · Coût: ${money(e.cout)}</p></div>
              ${entretienProgressCircle(e)}
            </div>
            <div class="maintenance-details">
              <span>Intervalle: ${e.progress.intervalKm.toLocaleString('fr-CA')} km</span>
              <span>KM utilisés: ${e.progress.usedKm.toLocaleString('fr-CA')} km</span>
              <span>Restant: ${e.progress.remainingKm.toLocaleString('fr-CA')} km</span>
            </div>
            ${e.progress.status === 'danger' ? '<div class="alert-text danger">Entretien dépassé: planifie une intervention.</div>' : e.progress.status === 'warning' ? '<div class="alert-text warning">Attention: entretien bientôt nécessaire.</div>' : '<div class="alert-text ok">Situation normale.</div>'}
          </div>
        `).join('') : `<div class="item-card"><p>Aucune alerte. Ajoute des entretiens avec KM entretien et intervalle KM.</p></div>`}
      </div>
    </div>
  `;
}

function depensesHtml() {
  return `
    <div class="card">
      <div class="card-header"><div><h2>Ajouter une dépense</h2><p class="muted">Assurance, comptable, impôts, salaire...</p></div></div>
      <form id="depenseForm" class="form-grid">
        <label><span>Type</span><select name="type" required>
          <option value="assurance chauffeur">Assurance chauffeur</option>
          <option value="frais comptable">Frais comptable</option>
          <option value="declaration impots">Déclaration d'impôts</option>
          <option value="salaire chauffeur">Salaire chauffeur</option>
          <option value="assurance camion">Assurance du camion</option>
          <option value="assurance marchandise">Assurance de marchandise</option>
        </select></label>
        <label><span>Montant</span><input name="montant" type="number" step="0.01"></label>
        <label><span>Camion (optionnel)</span><select name="camionId"><option value="">Choisir</option>${state.camions.map(c => `<option value="${c.id}">${escapeHtml(c.numeroCamion)}</option>`).join("")}</select></label>
        <label><span>Chauffeur UID (optionnel)</span><input name="chauffeurId"></label>
        <label><span>Date</span><input name="date" type="datetime-local"></label>
        <label class="full"><span>Description</span><textarea name="description"></textarea></label>
        <label class="full"><span>Reçu / facture (optionnel)</span><input type="file" name="depenseFile" accept="image/*,.pdf"></label>
        <button class="btn primary full" type="submit">Enregistrer la dépense</button>
      </form>
    </div>

    <div class="card">
      <div class="card-header"><div><h2>Liste des dépenses</h2><p class="muted">Toutes les dépenses diverses</p></div></div>
      <div class="list">
        ${state.depenses.length ? state.depenses.map(d => `
          <div class="item-card">
            <h4>${escapeHtml(d.type || "-")}</h4>
            <p>Montant : ${money(d.montant)} | Date : ${formatDate(d.date)}</p>
            <p>Description : ${escapeHtml(d.description || "-")}</p>
            ${d.documentUrl ? `<p><a href="${d.documentUrl}" target="_blank" rel="noopener">Voir le reçu</a></p>` : ""}
            <div class="actions">
              <button class="btn secondary" data-edit-depense="${d.id}">Modifier</button>
              <button class="btn danger" data-delete-depense="${d.id}">Supprimer</button>
            </div>
          </div>
        `).join("") : `<div class="item-card"><p>Aucune dépense pour le moment.</p></div>`}
      </div>
    </div>
  `;
}


function kmNumber(record) {
  return Number(record?.kilometrage ?? record?.km ?? record?.odometre ?? 0) || 0;
}

function dateMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function dateLabel(value) {
  if (!value) return "-";
  try {
    const d = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("fr-CA");
  } catch { return "-"; }
}

function chauffeurName(uid) {
  const c = state.chauffeurs.find(x => (x.userId || x.uid) === uid);
  return c?.nom || uid || "-";
}

function camionName(id) {
  const c = state.camions.find(x => x.id === id);
  return c ? `${c.numeroCamion || "Camion"} ${c.marqueModele ? "- " + c.marqueModele : ""}` : (id || "Non assigné");
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
function ratio(value, suffix) {
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
  return `<p class="km-advanced-line">Distance : <strong>${distance ? distance.toLocaleString("fr-CA") + " km" : "-"}</strong> · Conso : ${ratio(conso, " /100 km")} · Coût/km : ${ratio(coutKm, " DA/km")} · Bénéfice/km : ${ratio(profitKm, " DA/km")}</p>`;
}

function buildKmStats(groupField) {
  const map = new Map();
  for (const r of state.odometres) {
    const key = r[groupField] || "non-assigne";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  return [...map.entries()].map(([key, rows]) => {
    const sorted = [...rows].sort((a,b) => dateMillis(a.date || a.createdAt) - dateMillis(b.date || b.createdAt));
    const kms = sorted.map(kmNumber).filter(n => n > 0);
    const firstKm = kms.length ? kms[0] : 0;
    const lastKm = kms.length ? kms[kms.length - 1] : 0;
    const distance = Math.max(0, lastKm - firstKm);
    const last = sorted[sorted.length - 1] || {};
    const daysSince = dateMillis(last.date || last.createdAt) ? Math.floor((Date.now() - dateMillis(last.date || last.createdAt)) / 86400000) : null;
    return { key, rows: sorted, count: rows.length, firstKm, lastKm, distance, last, daysSince };
  }).sort((a,b) => b.distance - a.distance);
}

function statsKmHtml() {
  const totalEntries = state.odometres.length;
  const totalDistance = buildKmStats("camionId").reduce((sum, x) => sum + x.distance, 0);
  const activeDrivers = new Set(state.odometres.map(x => x.chauffeurId).filter(Boolean)).size;
  const activeTrucks = new Set(state.odometres.map(x => x.camionId).filter(Boolean)).size;
  const byCamion = buildKmStats("camionId");
  const byChauffeur = buildKmStats("chauffeurId");
  const voyageDistanceTotal = state.voyages.reduce((sum, v) => sum + voyageDistance(v), 0);
  const voyageProfitTotal = state.voyages.reduce((sum, v) => sum + voyageProfit(v), 0);
  const voyageGasoilTotal = state.voyages.reduce((sum, v) => sum + numberOrZero(v.gasoil) + numberOrZero(v.gasoilRetour), 0);
  const consoMoyenne = voyageDistanceTotal ? (voyageGasoilTotal / voyageDistanceTotal) * 100 : 0;
  const profitParKm = voyageDistanceTotal ? voyageProfitTotal / voyageDistanceTotal : 0;
  const recent = [...state.odometres].sort((a,b) => dateMillis(b.date || b.createdAt) - dateMillis(a.date || a.createdAt)).slice(0, 20);
  const alerts = byCamion.filter(x => x.daysSince !== null && x.daysSince >= 2);

  return `
    <div class="km-hero card">
      <div><p class="eyebrow">Stats KM Pro</p><h2>Contrôle kilométrage camions</h2><p class="muted">Suivi par camion, chauffeur, dernier relevé et alertes de saisie.</p></div>
      <div class="driver-mini-stats"><div><strong>${totalEntries}</strong><span>Relevés</span></div><div><strong>${activeTrucks}</strong><span>Camions</span></div><div><strong>${activeDrivers}</strong><span>Chauffeurs</span></div></div>
    </div>
    <div class="stats-grid">
      <div class="card stat-card"><div class="label">Distance estimée</div><div class="value">${totalDistance.toLocaleString("fr-CA")} km</div></div>
      <div class="card stat-card"><div class="label">Derniers relevés</div><div class="value">${recent.length}</div></div>
      <div class="card stat-card"><div class="label">Alertes KM</div><div class="value">${alerts.length}</div></div>
      <div class="card stat-card"><div class="label">Moyenne/camion</div><div class="value">${activeTrucks ? Math.round(totalDistance / activeTrucks).toLocaleString("fr-CA") : 0} km</div></div>
      <div class="card stat-card"><div class="label">Conso moyenne voyages</div><div class="value">${ratio(consoMoyenne, " /100 km")}</div></div>
      <div class="card stat-card"><div class="label">Bénéfice moyen/km</div><div class="value">${ratio(profitParKm, " DA/km")}</div></div>
    </div>
    <div class="card"><div class="card-header"><div><h2>Par camion</h2><p class="muted">Distance = dernier KM - premier KM enregistré.</p></div></div><div class="list">
      ${byCamion.length ? byCamion.map(x => `<div class="item-card km-row"><div><h4>${escapeHtml(camionName(x.key))}</h4><p>Premier KM : ${x.firstKm.toLocaleString("fr-CA")} · Dernier KM : ${x.lastKm.toLocaleString("fr-CA")}</p><p>Dernier relevé : ${dateLabel(x.last.date || x.last.createdAt)} par ${escapeHtml(chauffeurName(x.last.chauffeurId))}</p></div><div class="driver-score"><strong>${x.distance.toLocaleString("fr-CA")}</strong><span>km</span></div></div>`).join("") : `<div class="item-card"><p>Aucun relevé KM.</p></div>`}
    </div></div>

    <div class="card"><div class="card-header"><div><h2>Rentabilité voyages</h2><p class="muted">Basée sur KM départ / KM arrivée par voyage.</p></div></div><div class="list">
      ${state.voyages.length ? state.voyages.map(v => `<div class="item-card km-row"><div><h4>${escapeHtml(v.client || "-")} → ${escapeHtml(v.destination || "-")}</h4><p>Camion : ${escapeHtml(camionName(v.camionId))} · Chauffeur : ${escapeHtml(v.nomChauffeur || chauffeurName(v.chauffeurId))}</p>${voyageAdvancedLine(v)}</div><div class="driver-score"><strong>${money(voyageProfit(v))}</strong><span>bénéfice</span></div></div>`).join("") : `<div class="item-card"><p>Aucun voyage avec données KM.</p></div>`}
    </div></div>
    <div class="card"><div class="card-header"><div><h2>Par chauffeur</h2><p class="muted">Performance kilométrage par chauffeur.</p></div></div><div class="list">
      ${byChauffeur.length ? byChauffeur.map(x => `<div class="item-card km-row"><div><h4>${escapeHtml(chauffeurName(x.key))}</h4><p>Relevés : ${x.count} · Dernier KM : ${x.lastKm.toLocaleString("fr-CA")}</p><p>Dernier camion : ${escapeHtml(camionName(x.last.camionId))} · ${dateLabel(x.last.date || x.last.createdAt)}</p></div><div class="driver-score"><strong>${x.distance.toLocaleString("fr-CA")}</strong><span>km</span></div></div>`).join("") : `<div class="item-card"><p>Aucun relevé chauffeur.</p></div>`}
    </div></div>
    <div class="card"><div class="card-header"><div><h2>Alertes de suivi</h2><p class="muted">Camions sans relevé depuis 2 jours ou plus.</p></div></div><div class="list">
      ${alerts.length ? alerts.map(x => `<div class="item-card alert-card"><h4>⚠️ ${escapeHtml(camionName(x.key))}</h4><p>Dernier relevé il y a ${x.daysSince} jour(s) · Dernier KM ${x.lastKm.toLocaleString("fr-CA")}</p></div>`).join("") : `<div class="item-card"><p>Aucune alerte. Les relevés KM sont à jour.</p></div>`}
    </div></div>
    <div class="card"><div class="card-header"><div><h2>Historique récent</h2><p class="muted">20 derniers relevés KM.</p></div></div><div class="list">
      ${recent.length ? recent.map(r => `<div class="item-card km-row"><div><h4>${kmNumber(r).toLocaleString("fr-CA")} km</h4><p>${escapeHtml(chauffeurName(r.chauffeurId))} · ${escapeHtml(camionName(r.camionId))}</p><p>${dateLabel(r.date || r.createdAt)} ${r.note ? "· " + escapeHtml(r.note) : ""}</p></div></div>`).join("") : `<div class="item-card"><p>Aucun historique.</p></div>`}
    </div></div>`;
}

function parametresHtml() {
  return `
    <div class="card">
      <div class="card-header"><div><h2>Paramètres</h2><p class="muted">Base pour ajouter les réglages entreprise plus tard</p></div></div>
      <div class="grid">
        <div class="item-card">
          <h4>Collections utilisées</h4>
          <p>users, camions, chauffeurs, voyages, entretien, depenses, parametres</p>
        </div>
        <div class="item-card">
          <h4>Rôles</h4>
          <p>admin : accès complet</p>
          <p>chauffeur : ses propres voyages</p>
        </div>
      </div>
    </div>
  `;
}

function render() {
  document.getElementById("dashboardView").innerHTML = dashboardHtml();
  document.getElementById("camionsView").innerHTML = camionFormHtml() + camionsListHtml();
  document.getElementById("chauffeursView").innerHTML = chauffeursHtml();
  document.getElementById("voyagesView").innerHTML = voyagesHtml();
  document.getElementById("entretienView").innerHTML = entretienHtml();
  document.getElementById("alertesEntretienView").innerHTML = alertesEntretienHtml();
  document.getElementById("depensesView").innerHTML = depensesHtml();
  const statsView = document.getElementById("statskmView");
  if (statsView) statsView.innerHTML = statsKmHtml();
  document.getElementById("parametresView").innerHTML = parametresHtml();
  bindForms();
  bindActions();
}

async function safeLoad(label, loader) {
  try {
    return await loader();
  } catch (error) {
    console.error(`Erreur chargement ${label}`, error);
    alert(`Erreur chargement ${label}: ${error?.message || error}`);
    return [];
  }
}

async function refreshData() {
  const results = await Promise.all([
    safeLoad("camions", getCamions),
    safeLoad("chauffeurs", getChauffeurs),
    safeLoad("voyages", getVoyages),
    safeLoad("entretien", getEntretiens),
    safeLoad("depenses", getDepenses),
    safeLoad("KM journaliers", getOdometres)
  ]);

  [state.camions, state.chauffeurs, state.voyages, state.entretien, state.depenses, state.odometres] = results;
  render();
}

function pickForEdit(list, id) {
  return list.find(x => x.id === id);
}

function promptUpdate(item, fields) {
  const data = {};
  for (const field of fields) {
    const current = item[field] ?? "";
    const value = prompt(`Modifier ${field}`, current);
    if (value === null) return null;
    data[field] = value;
  }
  return data;
}

function bindActions() {
  document.querySelectorAll("[data-delete-camion]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Supprimer ce camion ?")) return;
    await deleteCamion(btn.dataset.deleteCamion);
    await refreshData();
  }));
  document.querySelectorAll("[data-edit-camion]").forEach(btn => btn.addEventListener("click", async () => {
    const item = pickForEdit(state.camions, btn.dataset.editCamion);
    const update = promptUpdate(item, ["numeroCamion", "numeroPlaque", "marqueModele", "numeroRemorque", "plaqueRemorque", "remarque"]);
    if (!update) return;
    await updateCamion(item.id, update);
    await refreshData();
  }));

  document.querySelectorAll("[data-detail-chauffeur]").forEach(btn => btn.addEventListener("click", () => {
    state.selectedChauffeurId = btn.dataset.detailChauffeur;
    render();
    setActiveView("chauffeurs");
    setTimeout(() => document.getElementById("chauffeurDetailsCard")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }));
  document.querySelectorAll("[data-close-chauffeur-details]").forEach(btn => btn.addEventListener("click", () => {
    state.selectedChauffeurId = null;
    render();
    setActiveView("chauffeurs");
  }));

  document.querySelectorAll("[data-filter-chauffeurs]").forEach(btn => btn.addEventListener("click", () => {
    state.chauffeurFilter = btn.dataset.filterChauffeurs;
    render();
    setActiveView("chauffeurs");
  }));

  document.querySelectorAll("[data-disable-chauffeur]").forEach(btn => btn.addEventListener("click", async () => {
    const chauffeur = pickForEdit(state.chauffeurs, btn.dataset.disableChauffeur);
    if (!chauffeur) return;
    if (!confirm(`Désactiver ${chauffeur.nom || "ce chauffeur"} ?\n\nIl ne sera plus disponible dans les nouveaux voyages et son compte sera marqué inactif.`)) return;
    try {
      await updateChauffeur(chauffeur.id, { status: "inactif" });
      if (chauffeur.userId) await saveUserProfile(chauffeur.userId, { status: "inactif" });
      alert("Chauffeur désactivé ✅");
      await refreshData();
      setActiveView("chauffeurs");
    } catch (error) {
      displayError(error, "Désactivation chauffeur");
    }
  }));

  document.querySelectorAll("[data-enable-chauffeur]").forEach(btn => btn.addEventListener("click", async () => {
    const chauffeur = pickForEdit(state.chauffeurs, btn.dataset.enableChauffeur);
    if (!chauffeur) return;
    try {
      await updateChauffeur(chauffeur.id, { status: "actif" });
      if (chauffeur.userId) await saveUserProfile(chauffeur.userId, { status: "actif" });
      alert("Chauffeur réactivé ✅");
      await refreshData();
      setActiveView("chauffeurs");
    } catch (error) {
      displayError(error, "Réactivation chauffeur");
    }
  }));

  document.querySelectorAll("[data-reset-password]").forEach(btn => btn.addEventListener("click", async () => {
    const chauffeur = pickForEdit(state.chauffeurs, btn.dataset.resetPassword);
    if (!chauffeur) return;
    const email = (chauffeur.email || chauffeur.invitedEmail || "").trim().toLowerCase();
    if (!email) return alert("Ce chauffeur n’a pas d’email enregistré.");
    if (!confirm(`Envoyer un lien de réinitialisation de mot de passe à ${email} ?`)) return;
    try {
      await sendPasswordReset(email);
      alert("Lien de réinitialisation envoyé ✅\nLe chauffeur doit ouvrir son email et choisir un nouveau mot de passe.");
    } catch (error) {
      displayError(error, "Réinitialisation mot de passe");
    }
  }));

  document.querySelectorAll("[data-edit-chauffeur]").forEach(btn => btn.addEventListener("click", async () => {
    const item = pickForEdit(state.chauffeurs, btn.dataset.editChauffeur);
    const update = promptUpdate(item, ["nom", "numeroChauffeur", "numeroPermis", "telephone", "adresse", "status"]);
    if (!update) return;
    await updateChauffeur(item.id, update);
    await refreshData();
  }));

  document.querySelectorAll("[data-delete-voyage]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Supprimer ce voyage ?")) return;
    await deleteVoyage(btn.dataset.deleteVoyage);
    await refreshData();
  }));
  document.querySelectorAll("[data-edit-voyage]").forEach(btn => btn.addEventListener("click", async () => {
    const item = pickForEdit(state.voyages, btn.dataset.editVoyage);
    const update = promptUpdate(item, ["typeVoyage", "client", "depart", "destination", "prixCourse", "gasoil", "fraisMission", "retourClient", "retourDepart", "retourDestination", "prixCourseRetour", "gasoilRetour", "fraisMissionRetour", "kmDepart", "kmArrivee"]);
    if (!update) return;
    await updateVoyage(item.id, update);
    await refreshData();
  }));

  document.querySelectorAll("[data-delete-entretien]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Supprimer cet entretien ?")) return;
    await deleteEntretien(btn.dataset.deleteEntretien);
    await refreshData();
  }));
  document.querySelectorAll("[data-edit-entretien]").forEach(btn => btn.addEventListener("click", async () => {
    const item = pickForEdit(state.entretien, btn.dataset.editEntretien);
    const update = promptUpdate(item, ["type", "cout", "garage", "description"]);
    if (!update) return;
    await updateEntretien(item.id, update);
    await refreshData();
  }));

  document.querySelectorAll("[data-delete-depense]").forEach(btn => btn.addEventListener("click", async () => {
    if (!confirm("Supprimer cette dépense ?")) return;
    await deleteDepense(btn.dataset.deleteDepense);
    await refreshData();
  }));
  document.querySelectorAll("[data-edit-depense]").forEach(btn => btn.addEventListener("click", async () => {
    const item = pickForEdit(state.depenses, btn.dataset.editDepense);
    const update = promptUpdate(item, ["type", "montant", "description", "chauffeurId"]);
    if (!update) return;
    await updateDepense(item.id, update);
    await refreshData();
  }));
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

function bindForms() {
  bindTripTypeToggle(document);
  document.getElementById("camionForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = formToObject(form);
    const file = form.photoCamion?.files?.[0];
    delete data.photoCamion;
    const ref = await addCamion(data);
    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const url = await uploadFile(`camions/${ref.id}/${Date.now()}-${safeName}`, file);
      await updateCamion(ref.id, { photoUrl: url });
    }
    form.reset();
    await refreshData();
    setActiveView("camions");
  });

  document.getElementById("chauffeurForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const submitBtn = form.querySelector('button[type="submit"]');
    const data = formToObject(form);
    const email = (data.email || "").trim().toLowerCase();
    const password = (data.password || "123456").trim();
    const nom = (data.nom || "").trim();
    const file = form.profilFile?.files?.[0];

    if (!email) return alert("Email chauffeur obligatoire.");
    if (!password || password.length < 6) return alert("Mot de passe obligatoire, minimum 6 caractères.");
    if (!nom) return alert("Nom chauffeur obligatoire.");

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Création du compte chauffeur...";
      }

      const account = await createDriverAuthAccount(email, password);
      const uid = account.uid;

      await saveUserProfile(uid, {
        name: nom,
        email,
        role: "chauffeur",
        phone: data.telephone || "",
        address: data.adresse || "",
        status: data.status || "actif"
      });

      const chauffeurRef = await addChauffeur({
        userId: uid,
        nom,
        numeroChauffeur: data.numeroChauffeur || "",
        numeroPermis: data.numeroPermis || "",
        telephone: data.telephone || "",
        adresse: data.adresse || "",
        email,
        invitedEmail: email,
        status: data.status || "actif",
        statutInvitation: "compte_cree"
      });

      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const url = await uploadFile(`chauffeurs/${uid}/${Date.now()}-${safeName}`, file);
        await updateChauffeur(chauffeurRef.id, { documentUrl: url });
      }

      form.reset();
      await refreshData();
      alert(`Chauffeur créé ✅\nEmail: ${email}\nMot de passe temporaire: ${password}`);
    } catch (error) {
      displayError(error, "Création chauffeur");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Créer chauffeur";
      }
    }
  });

  document.getElementById("voyageForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = formToObject(form);
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

  document.getElementById("entretienForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = formToObject(form);
    data.cout = numberOrZero(data.cout);
    data.kmEntretien = numberOrZero(data.kmEntretien);
    data.intervalKm = numberOrZero(data.intervalKm) || defaultEntretienInterval(data.type);
    data.date = dateTimeOrNull(data.date);
    data.remorque = data.remorque === "true";
    const file = form.entretienFile.files[0];
    delete data.entretienFile;
    const ref = await addEntretien(data);
    if (file) {
      const url = await uploadFile(`entretien/${ref.id}/${file.name}`, file);
      await updateEntretien(ref.id, { documentUrl: url });
    }
    form.reset();
    await refreshData();
  });

  document.getElementById("depenseForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = formToObject(form);
    data.montant = numberOrZero(data.montant);
    data.date = dateTimeOrNull(data.date);
    const file = form.depenseFile.files[0];
    delete data.depenseFile;
    const ref = await addDepense(data);
    if (file) {
      const url = await uploadFile(`depenses/${ref.id}/${file.name}`, file);
      await updateDepense(ref.id, { documentUrl: url });
    }
    form.reset();
    await refreshData();
  });
}

async function init() {
  installSW();
  bindLogout();
  bindSidebar();
  bindMenu();
  const welcome = document.getElementById("welcomeText");
  if (welcome) welcome.textContent = "Vérification de la connexion...";
  const { profile } = await requireRole("admin");
  state.profile = profile;
  if (welcome) welcome.textContent = `Bienvenue ${profile.name || "Admin"}`;
  await refreshData();
  setActiveView("dashboard");
}

init().catch(err => {
  console.error(err);
  const msg = err?.message || "Erreur de chargement admin";
  const welcome = document.getElementById("welcomeText");
  if (welcome) welcome.textContent = "Erreur de chargement";
  const dash = document.getElementById("dashboardView");
  if (dash) {
    dash.innerHTML = `
      <div class="card">
        <h2>Erreur dashboard</h2>
        <p class="helper error">${escapeHtml(msg)}</p>
        <p class="muted">Crée/vérifie Firestore > users > TON_UID avec role: admin, puis reconnecte-toi.</p>
        <button class="btn primary" id="goLoginBtn">Retour connexion</button>
      </div>`;
    document.getElementById("goLoginBtn")?.addEventListener("click", async () => {
      try { await import("./firebase.js").then(m => m.logout()); } catch {}
      window.location.href = "../index.html";
    });
  }
  alert("Erreur dashboard: " + msg);
});
