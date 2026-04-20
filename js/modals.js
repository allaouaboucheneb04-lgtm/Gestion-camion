window.MODAL_DEFS = {
  camionModal: {
    title: 'Ajouter un camion',
    collection: 'camions',
    fields: [
      ['numeroCamion', 'Numéro de camion'],
      ['plaque', 'Plaque'],
      ['marqueModele', 'Marque / modèle'],
      ['remarque', 'Remarque'],
      ['numeroRemorque', 'Numéro de remorque'],
      ['plaqueRemorque', 'Plaque remorque']
    ]
  },
  chauffeurModal: {
    title: 'Ajouter un chauffeur',
    collection: 'chauffeurs',
    fields: [
      ['nom', 'Nom du chauffeur'],
      ['numeroChauffeur', 'Numéro chauffeur'],
      ['numeroPermis', 'Numéro de permis'],
      ['adresse', 'Adresse']
    ]
  },
  voyageModal: {
    title: 'Ajouter un voyage',
    collection: 'voyages',
    fields: [
      ['client', 'Client'],
      ['destination', 'Destination'],
      ['dateDepart', 'Date départ', 'datetime-local'],
      ['dateArrivee', 'Date arrivée', 'datetime-local'],
      ['prixCourse', 'Prix course', 'number'],
      ['gasoil', 'Gasoil', 'number'],
      ['fraisMission', 'Frais mission', 'number'],
      ['auteurDepense', 'Auteur dépense'],
      ['chauffeurNom', 'Nom du chauffeur'],
      ['kilometrage', 'Kilométrage après 10 voyages', 'number']
    ]
  },
  entretienModal: {
    title: 'Ajouter un entretien',
    collection: 'entretiens',
    fields: [
      ['type', 'Type (pneus, vidange...)'],
      ['camion', 'Camion'],
      ['montant', 'Montant', 'number'],
      ['date', 'Date', 'date'],
      ['notes', 'Notes']
    ]
  },
  depenseModal: {
    title: 'Ajouter une dépense',
    collection: 'depenses',
    fields: [
      ['categorie', 'Catégorie'],
      ['montant', 'Montant', 'number'],
      ['auteur', 'Auteur'],
      ['date', 'Date', 'date']
    ]
  }
};

function openModal(key) {
  const def = MODAL_DEFS[key];
  if (!def) return;
  const root = document.getElementById('modalRoot');
  const fieldsHtml = def.fields.map(([name, label, type = 'text']) => `
    <label>
      <span>${label}</span>
      <input name="${name}" type="${type}" ${type !== 'text' ? '' : ''} />
    </label>
  `).join('');

  root.innerHTML = `
    <div class="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <h3>${def.title}</h3>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
          <form id="dynamicModalForm" class="grid-form">
            ${fieldsHtml}
            <button class="btn primary" type="submit">Enregistrer</button>
          </form>
        </div>
      </div>
    </div>`;

  document.getElementById('dynamicModalForm').addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    ['prixCourse', 'gasoil', 'fraisMission', 'kilometrage', 'montant'].forEach(k => {
      if (k in data && data[k] !== '') data[k] = Number(data[k]);
    });
    data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    data.createdBy = window.currentUser?.uid || null;
    try {
      await db.collection(def.collection).add(data);
      closeModal();
      window.dispatchEvent(new CustomEvent('data:refresh'));
    } catch (err) {
      alert(err.message || 'Erreur enregistrement');
    }
  });
}

function closeModal() {
  const root = document.getElementById('modalRoot');
  if (root) root.innerHTML = '';
}
