import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  collection, addDoc, getDocs, query, where, orderBy, serverTimestamp,
  updateDoc, deleteDoc, doc, getDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { money, fmtDate, slugContains } from './helpers.js';

const state = {
  me: null,
  trucks: [],
  drivers: [],
  trips: [],
  maintenance: [],
  expenses: [],
  search: ''
};

const views = ['dashboard', 'trucks', 'drivers', 'trips', 'maintenance', 'expenses', 'settings'];

onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href = '../index.html';
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists() || snap.data().role !== 'admin') return signOut(auth).then(() => window.location.href = '../index.html');
  state.me = { uid: user.uid, ...snap.data() };
  document.getElementById('welcomeText').textContent = `Bienvenue ${state.me.name || state.me.email || 'Admin'}`;
  await loadAll();
  renderAll();
  bindUI();
});

async function loadAll() {
  state.trucks = await readCollection('trucks');
  state.drivers = await readCollection('drivers');
  state.trips = await readCollection('trips');
  state.maintenance = await readCollection('maintenance');
  state.expenses = await readCollection('expenses');
}

async function readCollection(name) {
  const snap = await getDocs(query(collection(db, name), orderBy('createdAt', 'desc'))).catch(() => getDocs(collection(db, name)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function bindUI() {
  document.querySelectorAll('.menu-item').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
  document.getElementById('globalSearch').addEventListener('input', e => { state.search = e.target.value; renderAll(); });
  document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth).then(() => window.location.href = '../index.html'));
  document.getElementById('openSidebar').addEventListener('click', () => document.getElementById('sidebar').classList.add('open'));
  document.getElementById('closeSidebar').addEventListener('click', () => document.getElementById('sidebar').classList.remove('open'));
}

function switchView(view) {
  views.forEach(v => document.getElementById(`${v}View`).classList.toggle('active', v === view));
  document.querySelectorAll('.menu-item').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  document.getElementById('pageTitle').textContent = document.querySelector(`.menu-item[data-view="${view}"]`).textContent;
  document.getElementById('sidebar').classList.remove('open');
}

function renderAll() {
  renderDashboard();
  renderTrucks();
  renderDrivers();
  renderTrips();
  renderMaintenance();
  renderExpenses();
  renderSettings();
}

function filtered(arr, keys) {
  if (!state.search) return arr;
  return arr.filter(item => keys.some(k => slugContains(item[k], state.search)));
}

function renderDashboard() {
  const revenue = state.trips.reduce((s, i) => s + Number(i.price || 0), 0);
  const tripCosts = state.trips.reduce((s, i) => s + Number(i.fuel || 0) + Number(i.missionFee || 0) + Number(i.returnFuel || 0) + Number(i.returnMissionFee || 0), 0);
  const otherExpenses = state.expenses.reduce((s, i) => s + Number(i.amount || 0), 0) + state.maintenance.reduce((s, i) => s + Number(i.cost || 0), 0);
  const profit = revenue - tripCosts - otherExpenses;

  document.getElementById('dashboardView').innerHTML = `
    <div class="grid stats-grid">
      ${statCard('Revenu total', money(revenue))}
      ${statCard('Coûts voyages', money(tripCosts))}
      ${statCard('Autres dépenses', money(otherExpenses))}
      ${statCard('Bénéfice', money(profit))}
    </div>
    <div class="grid" style="grid-template-columns: 1.2fr .8fr; margin-top:18px;">
      <section class="card">
        <div class="card-header"><h2>Résumé activité</h2><p class="muted">Vue rapide de l’entreprise.</p></div>
        <div class="table-like">
          <div class="list-item"><div><strong>Camions</strong><p>${state.trucks.length} fiche(s)</p></div><span class="badge">Parc</span></div>
          <div class="list-item"><div><strong>Chauffeurs</strong><p>${state.drivers.length} fiche(s)</p></div><span class="badge">Équipe</span></div>
          <div class="list-item"><div><strong>Voyages</strong><p>${state.trips.length} voyage(s)</p></div><span class="badge">Transport</span></div>
          <div class="list-item"><div><strong>Entretien + Dépenses</strong><p>${state.maintenance.length + state.expenses.length} opération(s)</p></div><span class="badge">Finance</span></div>
        </div>
      </section>
      <section class="card">
        <div class="card-header"><h2>Derniers voyages</h2><p class="muted">Les 5 plus récents.</p></div>
        <div class="list">
          ${state.trips.slice(0,5).map(t => `
            <div class="list-item"><div><h4>${t.client || 'Client'} → ${t.destination || '-'}</h4><p>${fmtDate(t.departureDate)}</p><p>${t.driverName || '-'}</p></div><strong>${money(t.price)}</strong></div>
          `).join('') || '<div class="empty">Aucun voyage</div>'}
        </div>
      </section>
    </div>`;
}

function renderTrucks() {
  const data = filtered(state.trucks, ['truckNumber','plate','brandModel','trailerNumber','trailerPlate','note']);
  document.getElementById('trucksView').innerHTML = `
    <div class="section-space">
      <section class="card">
        <div class="card-header"><h2>Ajouter un camion</h2></div>
        <form id="truckForm" class="form-grid">
          ${field('truckNumber','Numéro de camion')}
          ${field('plate','Plaque')}
          ${field('brandModel','Marque / modèle')}
          ${field('trailerNumber','Numéro remorque')}
          ${field('trailerPlate','Plaque remorque')}
          <label class="full"><span>Remarque</span><textarea id="note"></textarea></label>
          <div class="full"><button class="btn primary">Enregistrer</button></div>
        </form>
      </section>
      <section class="card">
        <div class="card-header between"><div><h2>Liste camions</h2><p class="muted">${data.length} résultat(s)</p></div></div>
        <div class="list">${data.map(i => itemTruck(i)).join('') || '<div class="empty">Aucun camion</div>'}</div>
      </section>
    </div>`;
  document.getElementById('truckForm').addEventListener('submit', saveTruck);
  bindActionButtons('trucks');
}

function renderDrivers() {
  const data = filtered(state.drivers, ['name','driverNumber','licenseNumber','address','phone','assignedTruck']);
  const truckOptions = state.trucks.map(t => `<option value="${escapeHtml(t.truckNumber || t.brandModel || t.id)}">${escapeHtml(t.truckNumber || t.brandModel || t.id)}</option>`).join('');
  document.getElementById('driversView').innerHTML = `
    <div class="section-space">
      <section class="card">
        <div class="card-header"><h2>Ajouter un chauffeur</h2></div>
        <form id="driverForm" class="form-grid">
          ${field('name','Nom du chauffeur')}
          ${field('driverNumber','Numéro chauffeur')}
          ${field('licenseNumber','Numéro de permis')}
          ${field('phone','Téléphone')}
          <label><span>Camion affecté</span><select id="assignedTruck"><option value="">Aucun</option>${truckOptions}</select></label>
          ${field('address','Adresse','text','full')}
          <div class="full"><button class="btn primary">Enregistrer</button></div>
        </form>
      </section>
      <section class="card">
        <div class="card-header"><h2>Liste chauffeurs</h2></div>
        <div class="list">${data.map(i => itemDriver(i)).join('') || '<div class="empty">Aucun chauffeur</div>'}</div>
      </section>
    </div>`;
  document.getElementById('driverForm').addEventListener('submit', saveDriver);
  bindActionButtons('drivers');
}

function renderTrips() {
  const data = filtered(state.trips, ['client','destination','driverName','truckNumber','authorExpense']);
  const drivers = state.drivers.map(d => `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`).join('');
  const trucks = state.trucks.map(t => `<option value="${escapeHtml(t.truckNumber || t.brandModel)}">${escapeHtml(t.truckNumber || t.brandModel)}</option>`).join('');
  document.getElementById('tripsView').innerHTML = `
    <div class="section-space">
      <section class="card">
        <div class="card-header"><h2>Ajouter un voyage</h2><p class="muted">Aller + retour + coûts.</p></div>
        <form id="tripForm" class="form-grid">
          ${field('client','Client')}
          ${field('destination','Destination')}
          <label><span>Chauffeur</span><select id="driverName"><option value="">Choisir</option>${drivers}</select></label>
          <label><span>Camion</span><select id="truckNumber"><option value="">Choisir</option>${trucks}</select></label>
          ${field('departureDate','Date départ','datetime-local')}
          ${field('arrivalDate','Date arrivée','datetime-local')}
          ${field('price','Prix course','number')}
          ${field('fuel','Gasoil aller','number')}
          ${field('missionFee','Frais mission aller','number')}
          ${field('authorExpense','Auteur dépense')}
          ${field('returnClient','Client retour')}
          ${field('returnDestination','Destination retour')}
          ${field('returnDate','Date retour','datetime-local')}
          ${field('returnArrivalDate','Date arrivée retour','datetime-local')}
          ${field('returnPrice','Prix retour','number')}
          ${field('returnFuel','Gasoil retour','number')}
          ${field('returnMissionFee','Frais mission retour','number')}
          ${field('kmAfter10Trips','Kilométrage après 10 voyages','number','full')}
          <div class="full"><button class="btn primary">Enregistrer</button></div>
        </form>
      </section>
      <section class="card">
        <div class="card-header"><h2>Liste voyages</h2></div>
        <div class="filter-row">
          <input id="tripFilterDriver" placeholder="Filtre chauffeur" />
          <input id="tripFilterTruck" placeholder="Filtre camion" />
          <input id="tripFilterClient" placeholder="Filtre client" />
          <button id="clearTripFilters" class="btn secondary">Effacer filtres</button>
        </div>
        <div id="tripList" class="list"></div>
      </section>
    </div>`;
  document.getElementById('tripForm').addEventListener('submit', saveTrip);
  const renderTripList = () => {
    const fd = document.getElementById('tripFilterDriver')?.value || '';
    const ft = document.getElementById('tripFilterTruck')?.value || '';
    const fc = document.getElementById('tripFilterClient')?.value || '';
    const subset = data.filter(t => slugContains(t.driverName, fd) && slugContains(t.truckNumber, ft) && slugContains(t.client, fc));
    document.getElementById('tripList').innerHTML = subset.map(i => itemTrip(i)).join('') || '<div class="empty">Aucun voyage</div>';
    bindActionButtons('trips');
  };
  ['tripFilterDriver','tripFilterTruck','tripFilterClient'].forEach(id => document.getElementById(id).addEventListener('input', renderTripList));
  document.getElementById('clearTripFilters').addEventListener('click', () => {
    ['tripFilterDriver','tripFilterTruck','tripFilterClient'].forEach(id => document.getElementById(id).value = ''); renderTripList();
  });
  renderTripList();
}

function renderMaintenance() {
  const data = filtered(state.maintenance, ['type','truckNumber','note']);
  const trucks = state.trucks.map(t => `<option value="${escapeHtml(t.truckNumber || t.brandModel)}">${escapeHtml(t.truckNumber || t.brandModel)}</option>`).join('');
  document.getElementById('maintenanceView').innerHTML = `
    <div class="section-space">
      <section class="card">
        <div class="card-header"><h2>Ajouter entretien</h2></div>
        <form id="maintenanceForm" class="form-grid">
          <label><span>Type</span><select id="type"><option>Pneus</option><option>Vidange</option><option>Pièces mécaniques</option><option>Frais de réparation</option><option>Hôtel réparation</option></select></label>
          <label><span>Camion</span><select id="truckNumber"><option value="">Choisir</option>${trucks}</select></label>
          ${field('cost','Coût','number')}
          ${field('date','Date','datetime-local')}
          <label class="full"><span>Remarque</span><textarea id="note"></textarea></label>
          <div class="full"><button class="btn primary">Enregistrer</button></div>
        </form>
      </section>
      <section class="card"><div class="card-header"><h2>Liste entretien</h2></div><div class="list">${data.map(i => itemMaintenance(i)).join('') || '<div class="empty">Aucun entretien</div>'}</div></section>
    </div>`;
  document.getElementById('maintenanceForm').addEventListener('submit', saveMaintenance);
  bindActionButtons('maintenance');
}

function renderExpenses() {
  const data = filtered(state.expenses, ['category','driverName','note']);
  const drivers = state.drivers.map(d => `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`).join('');
  document.getElementById('expensesView').innerHTML = `
    <div class="section-space">
      <section class="card">
        <div class="card-header"><h2>Ajouter dépense</h2></div>
        <form id="expenseForm" class="form-grid">
          <label><span>Catégorie</span><select id="category"><option>Assurance chauffeur</option><option>Frais comptable</option><option>Déclaration d’impôts</option><option>Salaire chauffeur</option><option>Assurance camion</option><option>Assurance marchandise</option><option>Autre</option></select></label>
          <label><span>Chauffeur</span><select id="driverName"><option value="">Aucun</option>${drivers}</select></label>
          ${field('amount','Montant','number')}
          ${field('date','Date','datetime-local')}
          <label class="full"><span>Remarque</span><textarea id="note"></textarea></label>
          <div class="full"><button class="btn primary">Enregistrer</button></div>
        </form>
      </section>
      <section class="card"><div class="card-header"><h2>Liste dépenses</h2></div><div class="list">${data.map(i => itemExpense(i)).join('') || '<div class="empty">Aucune dépense</div>'}</div></section>
    </div>`;
  document.getElementById('expenseForm').addEventListener('submit', saveExpense);
  bindActionButtons('expenses');
}

function renderSettings() {
  document.getElementById('settingsView').innerHTML = `
    <section class="card">
      <div class="card-header"><h2>Réglages / déploiement</h2></div>
      <div class="list-item"><div><h4>Rôle utilisateur</h4><p>Dans Firestore, collection <strong>users</strong>, document UID, champ <strong>role</strong> = admin ou chauffeur.</p></div></div>
      <div class="list-item"><div><h4>Collections utilisées</h4><p>users, trucks, drivers, trips, maintenance, expenses</p></div></div>
      <div class="list-item"><div><h4>PWA installable</h4><p>Manifest + service worker inclus.</p></div></div>
    </section>`;
}

function statCard(title, value) {
  return `<div class="card stat-card"><h3>${title}</h3><div class="value">${value}</div></div>`;
}

function field(id, label, type='text', klass='') {
  return `<label class="${klass}"><span>${label}</span><input id="${id}" type="${type}" /></label>`;
}
function escapeHtml(v='') { return String(v).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }

function itemTruck(i) {
  return cardItem(i.id, `<h4>${escapeHtml(i.truckNumber || '-')} • ${escapeHtml(i.brandModel || '')}</h4><p>Plaque: ${escapeHtml(i.plate || '-')}</p><p>Remorque: ${escapeHtml(i.trailerNumber || '-')} / ${escapeHtml(i.trailerPlate || '-')}</p><p>${escapeHtml(i.note || '')}</p>`, 'trucks');
}
function itemDriver(i) {
  return cardItem(i.id, `<h4>${escapeHtml(i.name || '-')}</h4><p>Numéro: ${escapeHtml(i.driverNumber || '-')}</p><p>Permis: ${escapeHtml(i.licenseNumber || '-')}</p><p>Camion: ${escapeHtml(i.assignedTruck || '-')}</p><p>${escapeHtml(i.address || '')}</p>`, 'drivers');
}
function itemTrip(i) {
  return cardItem(i.id, `<h4>${escapeHtml(i.client || '-')} → ${escapeHtml(i.destination || '-')}</h4><p>Chauffeur: ${escapeHtml(i.driverName || '-')} | Camion: ${escapeHtml(i.truckNumber || '-')}</p><p>Départ: ${fmtDate(i.departureDate)} | Arrivée: ${fmtDate(i.arrivalDate)}</p><p>Prix: ${money(i.price)} | Gasoil: ${money(i.fuel)} | Frais mission: ${money(i.missionFee)}</p><p>Retour: ${escapeHtml(i.returnClient || '-')} → ${escapeHtml(i.returnDestination || '-')} | Prix retour: ${money(i.returnPrice)}</p><p>Km après 10 voyages: ${escapeHtml(i.kmAfter10Trips || '-')}</p>`, 'trips');
}
function itemMaintenance(i) {
  return cardItem(i.id, `<h4>${escapeHtml(i.type || '-')}</h4><p>Camion: ${escapeHtml(i.truckNumber || '-')}</p><p>Coût: ${money(i.cost)}</p><p>Date: ${fmtDate(i.date)}</p><p>${escapeHtml(i.note || '')}</p>`, 'maintenance');
}
function itemExpense(i) {
  return cardItem(i.id, `<h4>${escapeHtml(i.category || '-')}</h4><p>Chauffeur: ${escapeHtml(i.driverName || '-')}</p><p>Montant: ${money(i.amount)}</p><p>Date: ${fmtDate(i.date)}</p><p>${escapeHtml(i.note || '')}</p>`, 'expenses');
}
function cardItem(id, html, collectionName) {
  return `<div class="list-item"><div>${html}</div><div class="actions"><button class="btn secondary edit-btn" data-col="${collectionName}" data-id="${id}">Modifier</button><button class="btn danger delete-btn" data-col="${collectionName}" data-id="${id}">Supprimer</button></div></div>`;
}

async function saveTruck(e) {
  e.preventDefault();
  const payload = grab(['truckNumber','plate','brandModel','note','trailerNumber','trailerPlate']);
  payload.createdAt = serverTimestamp();
  await addDoc(collection(db, 'trucks'), payload);
  await refresh(); switchView('trucks');
}
async function saveDriver(e) {
  e.preventDefault();
  const payload = grab(['name','driverNumber','licenseNumber','address','phone','assignedTruck']);
  payload.createdAt = serverTimestamp();
  await addDoc(collection(db, 'drivers'), payload);
  await refresh(); switchView('drivers');
}
async function saveTrip(e) {
  e.preventDefault();
  const keys = ['client','destination','driverName','truckNumber','departureDate','arrivalDate','price','fuel','missionFee','authorExpense','returnClient','returnDestination','returnDate','returnArrivalDate','returnPrice','returnFuel','returnMissionFee','kmAfter10Trips'];
  const payload = grab(keys);
  ['price','fuel','missionFee','returnPrice','returnFuel','returnMissionFee','kmAfter10Trips'].forEach(k => payload[k] = Number(payload[k] || 0));
  payload.createdAt = serverTimestamp();
  await addDoc(collection(db, 'trips'), payload);
  await refresh(); switchView('trips');
}
async function saveMaintenance(e) {
  e.preventDefault();
  const payload = grab(['type','truckNumber','cost','date','note']);
  payload.cost = Number(payload.cost || 0);
  payload.createdAt = serverTimestamp();
  await addDoc(collection(db, 'maintenance'), payload);
  await refresh(); switchView('maintenance');
}
async function saveExpense(e) {
  e.preventDefault();
  const payload = grab(['category','driverName','amount','date','note']);
  payload.amount = Number(payload.amount || 0);
  payload.createdAt = serverTimestamp();
  await addDoc(collection(db, 'expenses'), payload);
  await refresh(); switchView('expenses');
}

function grab(ids) {
  const out = {};
  ids.forEach(id => out[id] = document.getElementById(id)?.value ?? '');
  return out;
}

function bindActionButtons(defaultCollection) {
  document.querySelectorAll('.delete-btn').forEach(btn => btn.onclick = async () => {
    if (!confirm('Supprimer cet élément ?')) return;
    await deleteDoc(doc(db, btn.dataset.col, btn.dataset.id));
    await refresh();
  });
  document.querySelectorAll('.edit-btn').forEach(btn => btn.onclick = async () => {
    const newNote = prompt('Modification rapide: ajoute une note / remplace le champ note si disponible');
    if (newNote === null) return;
    await updateDoc(doc(db, btn.dataset.col, btn.dataset.id), { note: newNote, updatedAt: serverTimestamp() });
    await refresh();
  });
}

async function refresh() {
  await loadAll();
  renderAll();
}
