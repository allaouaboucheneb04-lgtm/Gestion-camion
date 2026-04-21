import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, getDoc, orderBy } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { money, fmtDate } from './helpers.js';

let me = null;
let trips = [];

onAuthStateChanged(auth, async user => {
  if (!user) return window.location.href = '../index.html';
  const snap = await getDoc(doc(db, 'users', user.uid));
  if (!snap.exists()) return signOut(auth).then(() => window.location.href = '../index.html');
  me = { uid: user.uid, ...snap.data() };
  if (me.role !== 'chauffeur') return window.location.href = './admin.html';
  document.getElementById('driverWelcome').textContent = `Bienvenue ${me.name || me.email || 'Chauffeur'}`;
  renderForm();
  await loadTrips();
  renderStats();
  renderTrips();
  document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth).then(() => window.location.href = '../index.html'));
});

function renderForm() {
  document.getElementById('driverTripForm').innerHTML = `
    <label><span>Client</span><input id="client" /></label>
    <label><span>Destination</span><input id="destination" /></label>
    <label><span>Date départ</span><input id="departureDate" type="datetime-local" /></label>
    <label><span>Date arrivée</span><input id="arrivalDate" type="datetime-local" /></label>
    <label><span>Prix course</span><input id="price" type="number" /></label>
    <label><span>Gasoil</span><input id="fuel" type="number" /></label>
    <label><span>Frais mission</span><input id="missionFee" type="number" /></label>
    <label><span>Camion</span><input id="truckNumber" /></label>
    <div class="full"><button class="btn primary">Enregistrer</button></div>
  `;
  document.getElementById('driverTripForm').addEventListener('submit', saveTrip);
}

async function saveTrip(e) {
  e.preventDefault();
  const payload = {
    client: val('client'),
    destination: val('destination'),
    departureDate: val('departureDate'),
    arrivalDate: val('arrivalDate'),
    price: Number(val('price') || 0),
    fuel: Number(val('fuel') || 0),
    missionFee: Number(val('missionFee') || 0),
    truckNumber: val('truckNumber'),
    driverName: me.name || me.email,
    driverUid: me.uid,
    createdAt: serverTimestamp()
  };
  await addDoc(collection(db, 'trips'), payload);
  e.target.reset();
  await loadTrips();
  renderStats();
  renderTrips();
}

async function loadTrips() {
  const snap = await getDocs(query(collection(db, 'trips'), where('driverUid', '==', me.uid)));
  trips = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function renderStats() {
  const revenue = trips.reduce((s, i) => s + Number(i.price || 0), 0);
  const costs = trips.reduce((s, i) => s + Number(i.fuel || 0) + Number(i.missionFee || 0), 0);
  document.getElementById('driverStats').innerHTML = `
    <div class="card stat-card"><h3>Mes voyages</h3><div class="value">${trips.length}</div></div>
    <div class="card stat-card"><h3>Mon revenu</h3><div class="value">${money(revenue)}</div></div>
    <div class="card stat-card"><h3>Mes coûts</h3><div class="value">${money(costs)}</div></div>
    <div class="card stat-card"><h3>Net estimé</h3><div class="value">${money(revenue - costs)}</div></div>`;
}

function renderTrips() {
  document.getElementById('driverTripList').innerHTML = trips.map(t => `
    <div class="list-item">
      <div>
        <h4>${escapeHtml(t.client || '-')} → ${escapeHtml(t.destination || '-')}</h4>
        <p>${fmtDate(t.departureDate)} | Camion: ${escapeHtml(t.truckNumber || '-')}</p>
        <p>Prix: ${money(t.price)} | Gasoil: ${money(t.fuel)} | Frais mission: ${money(t.missionFee)}</p>
      </div>
    </div>
  `).join('') || '<div class="empty">Aucun voyage pour le moment</div>';
}

function val(id){ return document.getElementById(id).value; }
function escapeHtml(v='') { return String(v).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
