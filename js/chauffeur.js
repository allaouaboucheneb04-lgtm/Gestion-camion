import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, serverTimestamp, doc, getDoc, query, where } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { money, fmtDate, slugContains } from './helpers.js';

let me = null;
let trips = [];
let editId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '../index.html';
    return;
  }

  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) {
    await signOut(auth);
    window.location.href = '../index.html';
    return;
  }

  me = { uid: user.uid, ...snap.data() };
  if (me.role !== 'chauffeur') {
    window.location.href = './admin.html';
    return;
  }

  byId('driverWelcome').textContent = `Bienvenue ${me.name || me.email || 'Chauffeur'}`;
  bindShell();
  renderForm();
  await refreshTrips();
});

function bindShell() {
  byId('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '../index.html';
  });

  byId('driverSearch').addEventListener('input', renderTrips);
  byId('driverCancelEdit').addEventListener('click', () => {
    editId = null;
    renderForm();
  });
}

async function refreshTrips() {
  const snap = await getDocs(query(collection(db, 'trips'), where('driverUid', '==', me.uid)));
  trips = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => getTime(b.updatedAt || b.createdAt) - getTime(a.updatedAt || a.createdAt));

  renderStats();
  renderTrips();
}

function renderForm() {
  const current = trips.find((item) => item.id === editId) || null;
  byId('driverFormTitle').textContent = current ? 'Modifier un voyage' : 'Ajouter un voyage';
  byId('driverCancelEdit').style.display = current ? 'inline-flex' : 'none';

  byId('driverTripForm').innerHTML = `
    ${inputField('client', 'Client', current?.client)}
    ${inputField('destination', 'Destination', current?.destination)}
    ${inputField('departureDate', 'Date départ', toInputDate(current?.departureDate), 'datetime-local')}
    ${inputField('arrivalDate', 'Date arrivée', toInputDate(current?.arrivalDate), 'datetime-local')}
    ${inputField('price', 'Prix course aller', current?.price, 'number')}
    ${inputField('fuel', 'Gasoil aller', current?.fuel, 'number')}
    ${inputField('missionFee', 'Frais mission aller', current?.missionFee, 'number')}
    ${inputField('truckNumber', 'Camion', current?.truckNumber)}
    ${inputField('returnClient', 'Client retour', current?.returnClient)}
    ${inputField('returnDestination', 'Destination retour', current?.returnDestination)}
    ${inputField('returnDate', 'Date retour', toInputDate(current?.returnDate), 'datetime-local')}
    ${inputField('returnArrivalDate', 'Date arrivée retour', toInputDate(current?.returnArrivalDate), 'datetime-local')}
    ${inputField('returnPrice', 'Prix course retour', current?.returnPrice, 'number')}
    ${inputField('returnFuel', 'Gasoil retour', current?.returnFuel, 'number')}
    ${inputField('returnMissionFee', 'Frais mission retour', current?.returnMissionFee, 'number')}
    ${inputField('authorExpense', 'Auteur, dépenses', current?.authorExpense || me.name || me.email, 'text', 'full')}
    <div class="full actions"><button class="btn primary" type="submit">${current ? 'Mettre à jour' : 'Enregistrer'}</button></div>
  `;

  byId('driverTripForm').onsubmit = saveTrip;
}

async function saveTrip(event) {
  event.preventDefault();

  const payload = {
    client: val('client'),
    destination: val('destination'),
    departureDate: val('departureDate'),
    arrivalDate: val('arrivalDate'),
    price: num(val('price')),
    fuel: num(val('fuel')),
    missionFee: num(val('missionFee')),
    truckNumber: val('truckNumber'),
    driverName: me.name || me.email,
    driverUid: me.uid,
    returnClient: val('returnClient'),
    returnDestination: val('returnDestination'),
    returnDate: val('returnDate'),
    returnArrivalDate: val('returnArrivalDate'),
    returnPrice: num(val('returnPrice')),
    returnFuel: num(val('returnFuel')),
    returnMissionFee: num(val('returnMissionFee')),
    authorExpense: val('authorExpense'),
    updatedAt: serverTimestamp()
  };

  if (editId) {
    await updateDoc(doc(db, 'trips', editId), payload);
  } else {
    await addDoc(collection(db, 'trips'), {
      ...payload,
      createdAt: serverTimestamp()
    });
  }

  editId = null;
  renderForm();
  await refreshTrips();
}

function renderStats() {
  const revenue = trips.reduce((sum, item) => sum + num(item.price) + num(item.returnPrice), 0);
  const costs = trips.reduce((sum, item) => sum + num(item.fuel) + num(item.missionFee) + num(item.returnFuel) + num(item.returnMissionFee), 0);
  const net = revenue - costs;

  byId('driverStats').innerHTML = `
    <div class="card stat-card"><h3>Mes voyages</h3><div class="value">${trips.length}</div></div>
    <div class="card stat-card"><h3>Mon revenu</h3><div class="value">${money(revenue)}</div></div>
    <div class="card stat-card"><h3>Mes coûts</h3><div class="value">${money(costs)}</div></div>
    <div class="card stat-card"><h3>Net estimé</h3><div class="value">${money(net)}</div></div>
  `;
}

function renderTrips() {
  const search = byId('driverSearch').value.trim();
  const filtered = !search ? trips : trips.filter((trip) => (
    slugContains(trip.client, search) ||
    slugContains(trip.destination, search) ||
    slugContains(trip.returnClient, search) ||
    slugContains(trip.returnDestination, search) ||
    slugContains(trip.truckNumber, search)
  ));

  byId('driverTripList').innerHTML = filtered.length ? filtered.map((trip) => `
    <div class="list-item">
      <div>
        <h4>${escapeHtml(trip.client || '-')} → ${escapeHtml(trip.destination || '-')}</h4>
        <p><strong>Départ :</strong> ${fmtDate(trip.departureDate)} | <strong>Arrivée :</strong> ${fmtDate(trip.arrivalDate)}</p>
        <p><strong>Prix aller :</strong> ${money(trip.price)} | <strong>Gasoil aller :</strong> ${money(trip.fuel)} | <strong>Frais mission aller :</strong> ${money(trip.missionFee)}</p>
        <p><strong>Retour :</strong> ${escapeHtml(trip.returnClient || '-')} → ${escapeHtml(trip.returnDestination || '-')}</p>
        <p><strong>Date retour :</strong> ${fmtDate(trip.returnDate)} | <strong>Arrivée retour :</strong> ${fmtDate(trip.returnArrivalDate)}</p>
        <p><strong>Prix retour :</strong> ${money(trip.returnPrice)} | <strong>Gasoil retour :</strong> ${money(trip.returnFuel)} | <strong>Frais mission retour :</strong> ${money(trip.returnMissionFee)}</p>
        <p><strong>Camion :</strong> ${escapeHtml(trip.truckNumber || '-')} | <strong>Auteur dépenses :</strong> ${escapeHtml(trip.authorExpense || '-')}</p>
      </div>
      <div class="actions">
        <button class="btn secondary" data-edit-id="${trip.id}">Modifier</button>
        <button class="btn danger" data-delete-id="${trip.id}">Supprimer</button>
      </div>
    </div>
  `).join('') : '<div class="empty">Aucun voyage pour le moment</div>';

  document.querySelectorAll('[data-edit-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      editId = btn.dataset.editId;
      renderForm();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  document.querySelectorAll('[data-delete-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Supprimer ce voyage ?')) return;
      await deleteDoc(doc(db, 'trips', btn.dataset.deleteId));
      if (editId === btn.dataset.deleteId) {
        editId = null;
        renderForm();
      }
      await refreshTrips();
    });
  });
}

function inputField(id, label, value = '', type = 'text', klass = '') {
  return `<label class="${klass}"><span>${label}</span><input id="${id}" type="${type}" value="${escapeAttr(value ?? '')}" /></label>`;
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

function num(value) { return Number(value || 0); }
function val(id) { return byId(id)?.value?.trim?.() ?? byId(id)?.value ?? ''; }
function byId(id) { return document.getElementById(id); }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s])); }
function escapeAttr(value = '') { return escapeHtml(value).replace(/`/g, '&#96;'); }
