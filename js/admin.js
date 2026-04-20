requireAuth('admin');
bindLogout();

const refs = {
  camions: document.getElementById('camionsTable'),
  chauffeurs: document.getElementById('chauffeursTable'),
  voyages: document.getElementById('voyagesTable'),
  entretiens: document.getElementById('entretiensTable'),
  depenses: document.getElementById('depensesTable')
};

window.addEventListener('app:user-ready', loadAll);
window.addEventListener('data:refresh', loadAll);

document.querySelectorAll('[data-open-modal]').forEach(btn => btn.addEventListener('click', () => openModal(btn.dataset.openModal)));

async function loadCollection(name) {
  const snap = await db.collection(name).orderBy('createdAt', 'desc').get().catch(() => db.collection(name).get());
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadAll() {
  const [camions, chauffeurs, voyages, entretiens, depenses] = await Promise.all([
    loadCollection('camions'),
    loadCollection('chauffeurs'),
    loadCollection('voyages'),
    loadCollection('entretiens'),
    loadCollection('depenses')
  ]);

  renderCamions(camions);
  renderChauffeurs(chauffeurs);
  renderVoyages(voyages);
  renderEntretiens(entretiens);
  renderDepenses(depenses);
  renderStats({ camions, chauffeurs, voyages, depenses });
}

function renderStats({ camions, chauffeurs, voyages, depenses }) {
  document.getElementById('statCamions').textContent = camions.length;
  document.getElementById('statChauffeurs').textContent = chauffeurs.length;
  document.getElementById('statVoyages').textContent = voyages.length;
  document.getElementById('statDepenses').textContent = depenses.length;
  const totalRevenus = voyages.reduce((s, v) => s + Number(v.prixCourse || 0), 0);
  const totalGasoil = voyages.reduce((s, v) => s + Number(v.gasoil || 0), 0);
  const totalDepenses = depenses.reduce((s, d) => s + Number(d.montant || 0), 0);
  document.getElementById('totalRevenus').textContent = formatMoney(totalRevenus);
  document.getElementById('totalGasoil').textContent = formatMoney(totalGasoil);
  document.getElementById('totalDepenses').textContent = formatMoney(totalDepenses);
}

function actionButtons(collection, id) {
  return `<div class="actions"><button class="btn small danger" onclick="deleteDoc('${collection}','${id}')">Supprimer</button></div>`;
}

function renderCamions(items) {
  refs.camions.innerHTML = items.length ? items.map(i => `<tr><td>${escapeHtml(i.numeroCamion)}</td><td>${escapeHtml(i.plaque)}</td><td>${escapeHtml(i.marqueModele)}</td><td>${escapeHtml(i.numeroRemorque || '-')}</td><td>${actionButtons('camions', i.id)}</td></tr>`).join('') : `<tr><td colspan="5" class="empty-state">Aucun camion</td></tr>`;
}
function renderChauffeurs(items) {
  refs.chauffeurs.innerHTML = items.length ? items.map(i => `<tr><td>${escapeHtml(i.nom)}</td><td>${escapeHtml(i.numeroChauffeur)}</td><td>${escapeHtml(i.numeroPermis)}</td><td>${escapeHtml(i.adresse)}</td><td>${actionButtons('chauffeurs', i.id)}</td></tr>`).join('') : `<tr><td colspan="5" class="empty-state">Aucun chauffeur</td></tr>`;
}
function renderVoyages(items) {
  refs.voyages.innerHTML = items.length ? items.map(i => `<tr><td>${escapeHtml(i.client)}</td><td>${escapeHtml(i.destination)}</td><td>${formatDate(i.dateDepart)}</td><td>${formatDate(i.dateArrivee)}</td><td>${formatMoney(i.prixCourse)}</td><td>${formatMoney(i.gasoil)}</td><td>${escapeHtml(i.chauffeurNom || '-')}</td><td>${actionButtons('voyages', i.id)}</td></tr>`).join('') : `<tr><td colspan="8" class="empty-state">Aucun voyage</td></tr>`;
}
function renderEntretiens(items) {
  refs.entretiens.innerHTML = items.length ? items.map(i => `<tr><td>${escapeHtml(i.type)}</td><td>${escapeHtml(i.camion)}</td><td>${formatMoney(i.montant)}</td><td>${formatDate(i.date)}</td><td>${escapeHtml(i.notes || '-')}</td><td>${actionButtons('entretiens', i.id)}</td></tr>`).join('') : `<tr><td colspan="6" class="empty-state">Aucun entretien</td></tr>`;
}
function renderDepenses(items) {
  refs.depenses.innerHTML = items.length ? items.map(i => `<tr><td>${escapeHtml(i.categorie)}</td><td>${formatMoney(i.montant)}</td><td>${escapeHtml(i.auteur || '-')}</td><td>${formatDate(i.date)}</td><td>${actionButtons('depenses', i.id)}</td></tr>`).join('') : `<tr><td colspan="5" class="empty-state">Aucune dépense</td></tr>`;
}

async function deleteDoc(collection, id) {
  if (!confirm('Supprimer cet élément ?')) return;
  await db.collection(collection).doc(id).delete();
  loadAll();
}
window.deleteDoc = deleteDoc;

document.getElementById('globalSearch').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('tbody tr').forEach(tr => {
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
});
