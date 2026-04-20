requireAuth('chauffeur');
bindLogout();

window.addEventListener('app:user-ready', initDriver);

async function initDriver() {
  renderProfile();
  await loadMyTrips();
}

function renderProfile() {
  const box = document.getElementById('profileBox');
  const u = window.currentUser || {};
  box.innerHTML = `
    <div class="profile-row"><span>Nom</span><strong>${escapeHtml(u.name || '-')}</strong></div>
    <div class="profile-row"><span>Email</span><strong>${escapeHtml(u.email || '-')}</strong></div>
    <div class="profile-row"><span>Numéro chauffeur</span><strong>${escapeHtml(u.driverNumber || '-')}</strong></div>
    <div class="profile-row"><span>Adresse</span><strong>${escapeHtml(u.address || '-')}</strong></div>
  `;
}

const form = document.getElementById('voyageForm');
form?.addEventListener('submit', async e => {
  e.preventDefault();
  const data = {
    client: document.getElementById('client').value,
    destination: document.getElementById('destination').value,
    dateDepart: document.getElementById('dateDepart').value,
    dateArrivee: document.getElementById('dateArrivee').value,
    prixCourse: Number(document.getElementById('prixCourse').value || 0),
    gasoil: Number(document.getElementById('gasoil').value || 0),
    fraisMission: Number(document.getElementById('fraisMission').value || 0),
    kilometrage: Number(document.getElementById('kilometrage').value || 0),
    chauffeurUid: window.currentUser.uid,
    chauffeurNom: window.currentUser.name || '',
    createdBy: window.currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  try {
    await db.collection('voyages').add(data);
    form.reset();
    await loadMyTrips();
    alert('Voyage enregistré.');
  } catch (err) {
    alert(err.message || 'Erreur');
  }
});

async function loadMyTrips() {
  const snap = await db.collection('voyages').where('createdBy', '==', window.currentUser.uid).get();
  const trips = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  document.getElementById('myTripsCount').textContent = trips.length;
  document.getElementById('myTripRevenue').textContent = formatMoney(trips.reduce((s, t) => s + Number(t.prixCourse || 0), 0));
  const tbody = document.getElementById('myTripsTable');
  tbody.innerHTML = trips.length ? trips.map(t => `<tr><td>${escapeHtml(t.client)}</td><td>${escapeHtml(t.destination)}</td><td>${formatMoney(t.prixCourse)}</td><td>${formatDate(t.dateDepart)}</td><td><button class="btn small danger" onclick="deleteMyTrip('${t.id}')">Supprimer</button></td></tr>`).join('') : `<tr><td colspan="5" class="empty-state">Aucun voyage</td></tr>`;
}

async function deleteMyTrip(id) {
  if (!confirm('Supprimer ce voyage ?')) return;
  await db.collection('voyages').doc(id).delete();
  loadMyTrips();
}
window.deleteMyTrip = deleteMyTrip;
