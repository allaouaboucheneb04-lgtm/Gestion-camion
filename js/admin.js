import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  collection, addDoc, getDocs, serverTimestamp,
  updateDoc, deleteDoc, doc, getDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { money, fmtDate, slugContains } from './helpers.js';

const state = {
  me: null,
  search: '',
  currentView: 'dashboard',
  trucks: [],
  drivers: [],
  trips: [],
  maintenance: [],
  expenses: [],
  editing: {
    trucks: null,
    drivers: null,
    trips: null,
    maintenance: null,
    expenses: null
  }
};

const collections = ['trucks', 'drivers', 'trips', 'maintenance', 'expenses'];
const viewTitles = {
  dashboard: 'Dashboard',
  trucks: 'Camions',
  drivers: 'Chauffeurs',
  trips: 'Voyages',
  maintenance: 'Entretien',
  expenses: 'Autres dépenses',
  settings: 'Réglages'
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '../index.html';
    return;
  }

  const profileSnap = await getDoc(doc(db, 'users', user.uid));
  if (!profileSnap.exists() || profileSnap.data().role !== 'admin') {
    await signOut(auth);
    window.location.href = '../index.html';
    return;
  }

  state.me = { uid: user.uid, ...profileSnap.data() };
  const welcome = `Bienvenue ${state.me.name || state.me.email || 'Admin'}`;
  byId('welcomeText').textContent = welcome;
  byId('welcomeTextMobile').textContent = welcome;

  bindShell();
  await refreshAll();
});

function bindShell() {
  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  byId('globalSearch').addEventListener('input', (e) => {
    state.search = e.target.value.trim();
    renderCurrentView();
  });

  byId('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '../index.html';
  });

  byId('menuToggle').addEventListener('click', openMenu);
  byId('closeMenu').addEventListener('click', closeMenu);
  byId('menuOverlay').addEventListener('click', closeMenu);
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) closeMenu();
  });
}

async function refreshAll() {
  for (const name of collections) {
    state[name] = await readCollection(name);
  }
  renderAll();
}

async function readCollection(name) {
  const snap = await getDocs(collection(db, name));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => getTime(b.updatedAt || b.createdAt) - getTime(a.updatedAt || a.createdAt));
}

function renderAll() {
  renderDashboard();
  renderTrucks();
  renderDrivers();
  renderTrips();
  renderMaintenance();
  renderExpenses();
  renderSettings();
  switchView(state.currentView, false);
}

function renderCurrentView() {
  if (state.currentView === 'dashboard') renderDashboard();
  if (state.currentView === 'trucks') renderTrucks();
  if (state.currentView === 'drivers') renderDrivers();
  if (state.currentView === 'trips') renderTrips();
  if (state.currentView === 'maintenance') renderMaintenance();
  if (state.currentView === 'expenses') renderExpenses();
  if (state.currentView === 'settings') renderSettings();
}

function switchView(view, rerender = true) {
  state.currentView = view;
  Object.keys(viewTitles).forEach((key) => {
    const el = byId(`${key}View`);
    if (el) el.classList.toggle('active', key === view);
  });
  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  byId('pageTitle').textContent = viewTitles[view];
  byId('pageTitleMobile').textContent = viewTitles[view];
  closeMenu();
  if (rerender) renderCurrentView();
}

function renderDashboard() {
  const totalRevenue = state.trips.reduce((sum, item) => sum + num(item.price) + num(item.returnPrice), 0);
  const tripCosts = state.trips.reduce((sum, item) => sum + num(item.fuel) + num(item.missionFee) + num(item.returnFuel) + num(item.returnMissionFee), 0);
  const maintenanceCosts = state.maintenance.reduce((sum, item) => sum + num(item.cost), 0);
  const expenseCosts = state.expenses.reduce((sum, item) => sum + num(item.amount), 0);
  const totalCosts = tripCosts + maintenanceCosts + expenseCosts;
  const profit = totalRevenue - totalCosts;

  const recentTrips = state.trips.slice(0, 5);
  const topDrivers = groupBySum(state.trips, 'driverName', (item) => num(item.price) + num(item.returnPrice));
  const topTrucks = groupBySum(state.trips, 'truckNumber', (item) => num(item.price) + num(item.returnPrice));

  byId('dashboardView').innerHTML = `
    <div class="grid stats-grid">
      ${statCard('Revenu total', money(totalRevenue))}
      ${statCard('Coûts voyages', money(tripCosts))}
      ${statCard('Entretien + dépenses', money(maintenanceCosts + expenseCosts))}
      ${statCard('Bénéfice estimé', money(profit))}
    </div>

    <div class="grid dashboard-grid" style="margin-top:18px; grid-template-columns: 1.2fr .8fr;">
      <section class="card">
        <div class="card-header"><h2>Résumé activité</h2><p class="muted">Vue globale de la gestion des camions.</p></div>
        <div class="table-like">
          ${summaryRow('Camions', `${state.trucks.length} camion(s) enregistrés`, 'Flotte')}
          ${summaryRow('Chauffeurs', `${state.drivers.length} chauffeur(s) enregistrés`, 'Équipe')}
          ${summaryRow('Voyages', `${state.trips.length} voyage(s) enregistrés`, 'Transport')}
          ${summaryRow('Entretien', `${state.maintenance.length} opération(s)`, 'Maintenance')}
          ${summaryRow('Autres dépenses', `${state.expenses.length} ligne(s)`, 'Finance')}
        </div>
      </section>

      <section class="card">
        <div class="card-header"><h2>Répartition rapide</h2><p class="muted">Ce qui génère le plus.</p></div>
        <div class="list compact-list">
          <div class="mini-block">
            <strong>Top chauffeurs</strong>
            ${topDrivers.length ? topDrivers.slice(0, 3).map(item => `<p>${escapeHtml(item.label)} — ${money(item.total)}</p>`).join('') : '<p class="muted">Aucune donnée</p>'}
          </div>
          <div class="mini-block">
            <strong>Top camions</strong>
            ${topTrucks.length ? topTrucks.slice(0, 3).map(item => `<p>${escapeHtml(item.label)} — ${money(item.total)}</p>`).join('') : '<p class="muted">Aucune donnée</p>'}
          </div>
        </div>
      </section>
    </div>

    <section class="card" style="margin-top:18px;">
      <div class="card-header"><h2>Derniers voyages</h2><p class="muted">Les voyages les plus récents enregistrés.</p></div>
      <div class="list">
        ${recentTrips.length ? recentTrips.map(itemTrip).join('') : '<div class="empty">Aucun voyage enregistré</div>'}
      </div>
    </section>
  `;
}

function renderTrucks() {
  const current = state.editing.trucks;
  const list = filterData(state.trucks, ['truckNumber', 'plate', 'brandModel', 'trailerNumber', 'trailerPlate', 'note']);

  byId('trucksView').innerHTML = `
    <div class="section-space">
      <section class="card">
        <div class="card-header between">
          <div>
            <h2>${current ? 'Modifier un camion' : 'Ajouter un camion'}</h2>
            <p class="muted">Informations camion et remorque.</p>
          </div>
          ${current ? '<button type="button" id="cancelTruckEdit" class="btn secondary">Annuler</button>' : ''}
        </div>
        <form id="truckForm" class="form-grid">
          ${inputField('truckNumber', 'Numéro de camion', current?.truckNumber)}
          ${inputField('plate', 'Numéro de plaque', current?.plate)}
          ${inputField('brandModel', 'Marque et modèle', current?.brandModel)}
          ${inputField('trailerNumber', 'Numéro de remorque', current?.trailerNumber)}
          ${inputField('trailerPlate', 'Plaque de remorque', current?.trailerPlate)}
          ${textAreaField('note', 'Remarque', current?.note, 'full')}
          <div class="full actions">
            <button class="btn primary" type="submit">${current ? 'Mettre à jour' : 'Enregistrer'}</button>
          </div>
        </form>
      </section>

      <section class="card">
        <div class="card-header between"><div><h2>Liste des camions</h2><p class="muted">${list.length} résultat(s)</p></div></div>
        <div class="list">
          ${list.length ? list.map(itemTruck).join('') : '<div class="empty">Aucun camion enregistré</div>'}
        </div>
      </section>
    </div>
  `;

  byId('truckForm').addEventListener('submit', saveTruck);
  byId('cancelTruckEdit')?.addEventListener('click', () => {
    state.editing.trucks = null;
    renderTrucks();
  });
  bindCrudButtons('trucks');
}

function renderDrivers() {
  const current = state.editing.drivers;
  const truckOptions = state.trucks.map((truck) => {
    const label = truck.truckNumber || truck.brandModel || truck.id;
    return `<option value="${escapeAttr(label)}" ${label === (current?.assignedTruck || '') ? 'selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('');
  const list = filterData(state.drivers, ['name', 'driverNumber', 'licenseNumber', 'address', 'phone', 'assignedTruck']);

  byId('driversView').innerHTML = `
    <div class="section-space">
      <section class="card">
        <div class="card-header between">
          <div>
            <h2>${current ? 'Modifier un chauffeur' : 'Ajouter un chauffeur'}</h2>
            <p class="muted">Gestion de la fiche chauffeur.</p>
          </div>
          ${current ? '<button type="button" id="cancelDriverEdit" class="btn secondary">Annuler</button>' : ''}
        </div>
        <form id="driverForm" class="form-grid">
          ${inputField('name', 'Nom du chauffeur', current?.name)}
          ${inputField('driverNumber', 'Numéro de chauffeur', current?.driverNumber)}
          ${inputField('licenseNumber', 'Numéro de permis', current?.licenseNumber)}
          ${inputField('phone', 'Numéro / téléphone', current?.phone)}
          <label>
            <span>Camion affecté</span>
            <select id="assignedTruck"><option value="">Aucun</option>${truckOptions}</select>
          </label>
          ${inputField('kmCheckpoint', 'Kilométrage après chèque 10 voyages', current?.kmCheckpoint, 'number')}
          ${inputField('address', 'Adresse', current?.address, 'text', 'full')}
          <div class="full actions"><button class="btn primary" type="submit">${current ? 'Mettre à jour' : 'Enregistrer'}</button></div>
        </form>
      </section>

      <section class="card">
        <div class="card-header between"><div><h2>Liste des chauffeurs</h2><p class="muted">${list.length} résultat(s)</p></div></div>
        <div class="list">${list.length ? list.map(itemDriver).join('') : '<div class="empty">Aucun chauffeur enregistré</div>'}</div>
      </section>
    </div>
  `;

  byId('driverForm').addEventListener('submit', saveDriver);
  byId('cancelDriverEdit')?.addEventListener('click', () => {
    state.editing.drivers = null;
    renderDrivers();
  });
  bindCrudButtons('drivers');
}

function renderTrips() {
  const current = state.editing.trips;
  const driverOptions = state.drivers.map((driver) => `<option value="${escapeAttr(driver.name || '')}" ${(driver.name || '') === (current?.driverName || '') ? 'selected' : ''}>${escapeHtml(driver.name || '-')}</option>`).join('');
  const truckOptions = state.trucks.map((truck) => {
    const label = truck.truckNumber || truck.brandModel || truck.id;
    return `<option value="${escapeAttr(label)}" ${label === (current?.truckNumber || '') ? 'selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('');
  const list = filterData(state.trips, ['client', 'destination', 'driverName', 'truckNumber', 'authorExpense', 'returnClient', 'returnDestination']);

  byId('tripsView').innerHTML = `
    <div class="section-space">
      <section class="card">
        <div class="card-header between">
          <div>
            <h2>${current ? 'Modifier un voyage' : 'Ajouter un voyage'}</h2>
            <p class="muted">Aller, retour, prix, gasoil et frais.</p>
          </div>
          ${current ? '<button type="button" id="cancelTripEdit" class="btn secondary">Annuler</button>' : ''}
        </div>
        <form id="tripForm" class="form-grid">
          ${inputField('client', 'Client', current?.client)}
          ${inputField('destination', 'Destination', current?.destination)}
          <label><span>Nom du chauffeur</span><select id="driverName"><option value="">Choisir</option>${driverOptions}</select></label>
          <label><span>Camion</span><select id="truckNumber"><option value="">Choisir</option>${truckOptions}</select></label>
          ${inputField('departureDate', 'Date de départ', toInputDate(current?.departureDate), 'datetime-local')}
          ${inputField('arrivalDate', 'Date d’arrivée', toInputDate(current?.arrivalDate), 'datetime-local')}
          ${inputField('price', 'Prix de course', current?.price, 'number')}
          ${inputField('fuel', 'Gasoil aller', current?.fuel, 'number')}
          ${inputField('missionFee', 'Frais de mission aller', current?.missionFee, 'number')}
          ${inputField('authorExpense', 'Auteur, dépenses', current?.authorExpense)}
          ${inputField('returnClient', 'Client retour', current?.returnClient)}
          ${inputField('returnDestination', 'Destination retour', current?.returnDestination)}
          ${inputField('returnDate', 'Date de retour', toInputDate(current?.returnDate), 'datetime-local')}
          ${inputField('returnArrivalDate', 'Date arrivée retour', toInputDate(current?.returnArrivalDate), 'datetime-local')}
          ${inputField('returnPrice', 'Prix course retour', current?.returnPrice, 'number')}
          ${inputField('returnMissionFee', 'Frais mission retour', current?.returnMissionFee, 'number')}
          ${inputField('returnFuel', 'Gasoil retour', current?.returnFuel, 'number')}
          ${inputField('kmAfter10Trips', 'Kilométrage après chèque 10 voyages', current?.kmAfter10Trips, 'number', 'full')}
          <div class="full actions"><button class="btn primary" type="submit">${current ? 'Mettre à jour' : 'Enregistrer'}</button></div>
        </form>
      </section>

      <section class="card">
        <div class="card-header between"><div><h2>Liste des voyages</h2><p class="muted">${list.length} résultat(s)</p></div></div>
        <div class="list">${list.length ? list.map(itemTrip).join('') : '<div class="empty">Aucun voyage enregistré</div>'}</div>
      </section>
    </div>
  `;

  byId('tripForm').addEventListener('submit', saveTrip);
  byId('cancelTripEdit')?.addEventListener('click', () => {
    state.editing.trips = null;
    renderTrips();
  });
  bindCrudButtons('trips');
}

function renderMaintenance() {
  const current = state.editing.maintenance;
  const truckOptions = state.trucks.map((truck) => {
    const label = truck.truckNumber || truck.brandModel || truck.id;
    return `<option value="${escapeAttr(label)}" ${label === (current?.truckNumber || '') ? 'selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('');
  const list = filterData(state.maintenance, ['type', 'truckNumber', 'note']);

  byId('maintenanceView').innerHTML = `
    <div class="section-space">
      <section class="card">
        <div class="card-header between">
          <div>
            <h2>${current ? 'Modifier un entretien' : 'Ajouter un entretien'}</h2>
            <p class="muted">Camion et remorque, pneus, vidange, pièces, réparations, hôtel réparation.</p>
          </div>
          ${current ? '<button type="button" id="cancelMaintenanceEdit" class="btn secondary">Annuler</button>' : ''}
        </div>
        <form id="maintenanceForm" class="form-grid">
          <label>
            <span>Type d’entretien</span>
            <select id="type">
              ${['Pneus', 'Vidange', 'Pièces mécaniques', 'Frais de réparation', 'Hôtel réparation'].map(type => `<option value="${escapeAttr(type)}" ${type === (current?.type || '') ? 'selected' : ''}>${type}</option>`).join('')}
            </select>
          </label>
          <label><span>Camion</span><select id="truckNumber"><option value="">Choisir</option>${truckOptions}</select></label>
          ${inputField('cost', 'Frais de réparation / coût', current?.cost, 'number')}
          ${inputField('date', 'Date', toInputDate(current?.date), 'datetime-local')}
          ${textAreaField('note', 'Remarque', current?.note, 'full')}
          <div class="full actions"><button class="btn primary" type="submit">${current ? 'Mettre à jour' : 'Enregistrer'}</button></div>
        </form>
      </section>

      <section class="card"><div class="card-header"><h2>Liste entretien</h2></div><div class="list">${list.length ? list.map(itemMaintenance).join('') : '<div class="empty">Aucun entretien enregistré</div>'}</div></section>
    </div>
  `;

  byId('maintenanceForm').addEventListener('submit', saveMaintenance);
  byId('cancelMaintenanceEdit')?.addEventListener('click', () => {
    state.editing.maintenance = null;
    renderMaintenance();
  });
  bindCrudButtons('maintenance');
}

function renderExpenses() {
  const current = state.editing.expenses;
  const driverOptions = state.drivers.map((driver) => `<option value="${escapeAttr(driver.name || '')}" ${(driver.name || '') === (current?.driverName || '') ? 'selected' : ''}>${escapeHtml(driver.name || '-')}</option>`).join('');
  const categories = ['Assurance chauffeur', 'Frais comptable', 'Déclaration d’impôts', 'Salaire chauffeur', 'Assurance du camion', 'Assurance de marchandise', 'Autre'];
  const list = filterData(state.expenses, ['category', 'driverName', 'note']);

  byId('expensesView').innerHTML = `
    <div class="section-space">
      <section class="card">
        <div class="card-header between">
          <div>
            <h2>${current ? 'Modifier une dépense' : 'Ajouter une dépense'}</h2>
            <p class="muted">Assurance, comptable, impôts, salaire et autres coûts.</p>
          </div>
          ${current ? '<button type="button" id="cancelExpenseEdit" class="btn secondary">Annuler</button>' : ''}
        </div>
        <form id="expenseForm" class="form-grid">
          <label><span>Catégorie</span><select id="category">${categories.map(cat => `<option value="${escapeAttr(cat)}" ${cat === (current?.category || '') ? 'selected' : ''}>${cat}</option>`).join('')}</select></label>
          <label><span>Nom du chauffeur</span><select id="driverName"><option value="">Aucun</option>${driverOptions}</select></label>
          ${inputField('amount', 'Montant', current?.amount, 'number')}
          ${inputField('date', 'Date', toInputDate(current?.date), 'datetime-local')}
          ${textAreaField('note', 'Remarque', current?.note, 'full')}
          <div class="full actions"><button class="btn primary" type="submit">${current ? 'Mettre à jour' : 'Enregistrer'}</button></div>
        </form>
      </section>

      <section class="card"><div class="card-header"><h2>Liste dépenses</h2></div><div class="list">${list.length ? list.map(itemExpense).join('') : '<div class="empty">Aucune dépense enregistrée</div>'}</div></section>
    </div>
  `;

  byId('expenseForm').addEventListener('submit', saveExpense);
  byId('cancelExpenseEdit')?.addEventListener('click', () => {
    state.editing.expenses = null;
    renderExpenses();
  });
  bindCrudButtons('expenses');
}

function renderSettings() {
  byId('settingsView').innerHTML = `
    <section class="card">
      <div class="card-header"><h2>Réglages du projet</h2><p class="muted">Ce projet fonctionne avec Firebase Auth + Firestore.</p></div>
      <div class="list">
        <div class="list-item"><div><h4>Collections utilisées</h4><p>users, trucks, drivers, trips, maintenance, expenses</p></div></div>
        <div class="list-item"><div><h4>Rôles</h4><p>Dans <strong>users/{uid}</strong>, le champ <strong>role</strong> doit être <strong>admin</strong> ou <strong>chauffeur</strong>.</p></div></div>
        <div class="list-item"><div><h4>Connexion</h4><p>Active Email/Password dans Firebase Authentication puis crée les comptes.</p></div></div>
        <div class="list-item"><div><h4>PWA</h4><p>Le manifest et le service worker sont inclus pour installation mobile.</p></div></div>
      </div>
    </section>
  `;
}

async function saveTruck(event) {
  event.preventDefault();
  const payload = {
    truckNumber: val('truckNumber'),
    plate: val('plate'),
    brandModel: val('brandModel'),
    trailerNumber: val('trailerNumber'),
    trailerPlate: val('trailerPlate'),
    note: val('note')
  };
  await writeDoc('trucks', payload);
}

async function saveDriver(event) {
  event.preventDefault();
  const payload = {
    name: val('name'),
    driverNumber: val('driverNumber'),
    licenseNumber: val('licenseNumber'),
    phone: val('phone'),
    address: val('address'),
    assignedTruck: val('assignedTruck'),
    kmCheckpoint: num(val('kmCheckpoint'))
  };
  await writeDoc('drivers', payload);
}

async function saveTrip(event) {
  event.preventDefault();
  const payload = {
    client: val('client'),
    destination: val('destination'),
    driverName: val('driverName'),
    truckNumber: val('truckNumber'),
    departureDate: val('departureDate'),
    arrivalDate: val('arrivalDate'),
    price: num(val('price')),
    fuel: num(val('fuel')),
    missionFee: num(val('missionFee')),
    authorExpense: val('authorExpense'),
    returnClient: val('returnClient'),
    returnDestination: val('returnDestination'),
    returnDate: val('returnDate'),
    returnArrivalDate: val('returnArrivalDate'),
    returnPrice: num(val('returnPrice')),
    returnMissionFee: num(val('returnMissionFee')),
    returnFuel: num(val('returnFuel')),
    kmAfter10Trips: num(val('kmAfter10Trips'))
  };

  const matchedDriver = state.drivers.find((driver) => driver.name === payload.driverName);
  if (matchedDriver) payload.driverUid = matchedDriver.userUid || matchedDriver.uid || matchedDriver.authUid || '';

  await writeDoc('trips', payload);
}

async function saveMaintenance(event) {
  event.preventDefault();
  const payload = {
    type: val('type'),
    truckNumber: val('truckNumber'),
    cost: num(val('cost')),
    date: val('date'),
    note: val('note')
  };
  await writeDoc('maintenance', payload);
}

async function saveExpense(event) {
  event.preventDefault();
  const payload = {
    category: val('category'),
    driverName: val('driverName'),
    amount: num(val('amount')),
    date: val('date'),
    note: val('note')
  };
  await writeDoc('expenses', payload);
}

async function writeDoc(collectionName, payload) {
  const current = state.editing[collectionName];
  if (current?.id) {
    await updateDoc(doc(db, collectionName, current.id), {
      ...payload,
      updatedAt: serverTimestamp()
    });
  } else {
    await addDoc(collection(db, collectionName), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  state.editing[collectionName] = null;
  await refreshAll();
  switchView(collectionName === 'maintenance' ? 'maintenance' : collectionName, false);
}

function bindCrudButtons(collectionName) {
  document.querySelectorAll(`[data-edit-col="${collectionName}"]`).forEach((btn) => {
    btn.addEventListener('click', () => {
      state.editing[collectionName] = state[collectionName].find((item) => item.id === btn.dataset.id) || null;
      renderCurrentView();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  document.querySelectorAll(`[data-delete-col="${collectionName}"]`).forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer cet élément ?')) return;
      await deleteDoc(doc(db, collectionName, btn.dataset.id));
      if (state.editing[collectionName]?.id === btn.dataset.id) state.editing[collectionName] = null;
      await refreshAll();
      switchView(collectionName === 'maintenance' ? 'maintenance' : collectionName, false);
    });
  });
}

function itemTruck(item) {
  return cardItem(`
    <h4>${escapeHtml(item.truckNumber || '-')} • ${escapeHtml(item.brandModel || '-')}</h4>
    <p><strong>Plaque :</strong> ${escapeHtml(item.plate || '-')}</p>
    <p><strong>Remorque :</strong> ${escapeHtml(item.trailerNumber || '-')} | <strong>Plaque remorque :</strong> ${escapeHtml(item.trailerPlate || '-')}</p>
    <p><strong>Remarque :</strong> ${escapeHtml(item.note || '-')}</p>
  `, 'trucks', item.id);
}

function itemDriver(item) {
  return cardItem(`
    <h4>${escapeHtml(item.name || '-')}</h4>
    <p><strong>Numéro chauffeur :</strong> ${escapeHtml(item.driverNumber || '-')}</p>
    <p><strong>Permis :</strong> ${escapeHtml(item.licenseNumber || '-')}</p>
    <p><strong>Téléphone :</strong> ${escapeHtml(item.phone || '-')}</p>
    <p><strong>Adresse :</strong> ${escapeHtml(item.address || '-')}</p>
    <p><strong>Camion affecté :</strong> ${escapeHtml(item.assignedTruck || '-')}</p>
    <p><strong>Kilométrage après chèque 10 voyages :</strong> ${escapeHtml(item.kmCheckpoint || '-')}</p>
  `, 'drivers', item.id);
}

function itemTrip(item) {
  const revenue = num(item.price) + num(item.returnPrice);
  const costs = num(item.fuel) + num(item.missionFee) + num(item.returnFuel) + num(item.returnMissionFee);
  return cardItem(`
    <h4>${escapeHtml(item.client || '-')} → ${escapeHtml(item.destination || '-')}</h4>
    <p><strong>Chauffeur :</strong> ${escapeHtml(item.driverName || '-')} | <strong>Camion :</strong> ${escapeHtml(item.truckNumber || '-')}</p>
    <p><strong>Départ :</strong> ${fmtDate(item.departureDate)} | <strong>Arrivée :</strong> ${fmtDate(item.arrivalDate)}</p>
    <p><strong>Prix aller :</strong> ${money(item.price)} | <strong>Gasoil aller :</strong> ${money(item.fuel)} | <strong>Frais mission aller :</strong> ${money(item.missionFee)}</p>
    <p><strong>Auteur dépenses :</strong> ${escapeHtml(item.authorExpense || '-')}</p>
    <p><strong>Retour :</strong> ${escapeHtml(item.returnClient || '-')} → ${escapeHtml(item.returnDestination || '-')}</p>
    <p><strong>Date retour :</strong> ${fmtDate(item.returnDate)} | <strong>Arrivée retour :</strong> ${fmtDate(item.returnArrivalDate)}</p>
    <p><strong>Prix retour :</strong> ${money(item.returnPrice)} | <strong>Gasoil retour :</strong> ${money(item.returnFuel)} | <strong>Frais mission retour :</strong> ${money(item.returnMissionFee)}</p>
    <p><strong>Kilométrage après chèque 10 voyages :</strong> ${escapeHtml(item.kmAfter10Trips || '-')}</p>
    <p><strong>Total revenu :</strong> ${money(revenue)} | <strong>Total coûts :</strong> ${money(costs)}</p>
  `, 'trips', item.id);
}

function itemMaintenance(item) {
  return cardItem(`
    <h4>${escapeHtml(item.type || '-')}</h4>
    <p><strong>Camion :</strong> ${escapeHtml(item.truckNumber || '-')}</p>
    <p><strong>Date :</strong> ${fmtDate(item.date)}</p>
    <p><strong>Coût :</strong> ${money(item.cost)}</p>
    <p><strong>Remarque :</strong> ${escapeHtml(item.note || '-')}</p>
  `, 'maintenance', item.id);
}

function itemExpense(item) {
  return cardItem(`
    <h4>${escapeHtml(item.category || '-')}</h4>
    <p><strong>Chauffeur :</strong> ${escapeHtml(item.driverName || '-')}</p>
    <p><strong>Date :</strong> ${fmtDate(item.date)}</p>
    <p><strong>Montant :</strong> ${money(item.amount)}</p>
    <p><strong>Remarque :</strong> ${escapeHtml(item.note || '-')}</p>
  `, 'expenses', item.id);
}

function cardItem(content, collectionName, id) {
  return `
    <div class="list-item">
      <div>${content}</div>
      <div class="actions">
        <button type="button" class="btn secondary" data-edit-col="${collectionName}" data-id="${id}">Modifier</button>
        <button type="button" class="btn danger" data-delete-col="${collectionName}" data-id="${id}">Supprimer</button>
      </div>
    </div>
  `;
}

function statCard(title, value) {
  return `<div class="card stat-card"><h3>${title}</h3><div class="value">${value}</div></div>`;
}

function summaryRow(title, text, badge) {
  return `<div class="list-item"><div><strong>${title}</strong><p>${text}</p></div><span class="badge">${badge}</span></div>`;
}

function inputField(id, label, value = '', type = 'text', klass = '') {
  return `<label class="${klass}"><span>${label}</span><input id="${id}" type="${type}" value="${escapeAttr(value ?? '')}" /></label>`;
}

function textAreaField(id, label, value = '', klass = '') {
  return `<label class="${klass}"><span>${label}</span><textarea id="${id}">${escapeHtml(value ?? '')}</textarea></label>`;
}

function filterData(data, keys) {
  if (!state.search) return data;
  return data.filter((item) => keys.some((key) => slugContains(item[key], state.search)));
}

function groupBySum(items, labelKey, sumFn) {
  const map = new Map();
  items.forEach((item) => {
    const label = item[labelKey] || 'Non défini';
    map.set(label, (map.get(label) || 0) + sumFn(item));
  });
  return [...map.entries()].map(([label, total]) => ({ label, total })).sort((a, b) => b.total - a.total);
}

function toInputDate(value) {
  if (!value) return '';
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getTime(value) {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function openMenu() {
  byId('sidebar').classList.add('open');
  byId('menuOverlay').classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  byId('sidebar').classList.remove('open');
  byId('menuOverlay').classList.remove('show');
  document.body.style.overflow = '';
}

function num(value) {
  return Number(value || 0);
}

function val(id) {
  return byId(id)?.value?.trim?.() ?? byId(id)?.value ?? '';
}

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

function escapeAttr(value = '') {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
