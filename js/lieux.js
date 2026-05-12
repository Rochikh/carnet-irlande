// lieux.js — Liste CRUD et filtres

const CATEGORY_LABELS = {
  hotel: 'Hôtel',
  monument: 'Monument',
  nature: 'Nature',
  ville: 'Ville',
  restaurant: 'Restaurant'
};

const STATUT_LABELS = {
  a_voir: 'À voir',
  visite: 'Visité',
  annule: 'Annulé'
};

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function renderLieux() {
  const jourFilter = document.getElementById('filter-jour').value;
  const catFilter = document.getElementById('filter-cat').value;

  const hotels = Storage.getHotels();
  const lieux = Storage.getLieux();
  const all = [...hotels, ...lieux];

  const filtered = all.filter(p => {
    if (catFilter && p.categorie !== catFilter) return false;
    if (jourFilter) {
      if (p.check_in) {
        return jourFilter >= p.check_in && jourFilter < p.check_out;
      }
      return p.jour === jourFilter;
    }
    return true;
  });

  const container = document.getElementById('lieux-list');
  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-center card-sub" style="padding:24px 0">Aucun lieu trouvé.</p>';
    return;
  }

  container.innerHTML = filtered.map(p => {
    const isHotel = p.categorie === 'hotel';
    const dateStr = isHotel
      ? `${formatDateShort(p.check_in)} → ${formatDateShort(p.check_out)}`
      : formatDateShort(p.jour);
    const prix = p.prix ? `${p.prix.toFixed(2)} €` : '';
    const duree = p.duree ? ` | ${p.duree}` : '';
    const editAttr = isHotel ? '' : `onclick="openEditModal('${p.id}')" style="cursor:pointer"`;

    return `
      <div class="card" ${editAttr}>
        <div class="flex-between">
          <span class="card-badge badge-${p.categorie}">${CATEGORY_LABELS[p.categorie]}</span>
          <span class="badge-statut statut-${p.statut}">${STATUT_LABELS[p.statut] || p.statut}</span>
        </div>
        <div class="card-title" style="margin-top:6px">${p.nom}</div>
        <div class="card-sub">${p.description}</div>
        <div class="card-sub" style="margin-top:4px">${dateStr}${duree}${prix ? ' | ' + prix : ''}</div>
      </div>
    `;
  }).join('');
}

// Modal
const modal = document.getElementById('modal-lieu');
const modalTitle = document.getElementById('modal-title');
const form = document.getElementById('form-lieu');
const btnDelete = document.getElementById('btn-delete-lieu');
let editingId = null;

function openModal() {
  modal.classList.remove('hidden');
}

function closeModal() {
  modal.classList.add('hidden');
  form.reset();
  editingId = null;
  btnDelete.classList.add('hidden');
  modalTitle.textContent = 'Ajouter un lieu';
}

document.getElementById('btn-add-lieu').addEventListener('click', () => {
  editingId = null;
  modalTitle.textContent = 'Ajouter un lieu';
  btnDelete.classList.add('hidden');
  form.reset();
  openModal();
});

document.getElementById('modal-close').addEventListener('click', closeModal);

modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

function openEditModal(id) {
  const lieux = Storage.getLieux();
  const lieu = lieux.find(l => l.id === id);
  if (!lieu) return;

  editingId = id;
  modalTitle.textContent = 'Modifier le lieu';
  document.getElementById('lieu-id').value = lieu.id;
  document.getElementById('lieu-nom').value = lieu.nom || '';
  document.getElementById('lieu-desc').value = lieu.description || '';
  document.getElementById('lieu-cat').value = lieu.categorie || 'monument';
  document.getElementById('lieu-jour').value = lieu.jour || '2026-08-08';
  document.getElementById('lieu-lat').value = lieu.lat || '';
  document.getElementById('lieu-lng').value = lieu.lng || '';
  document.getElementById('lieu-duree').value = lieu.duree || '';
  document.getElementById('lieu-statut').value = lieu.statut || 'a_voir';
  btnDelete.classList.remove('hidden');
  openModal();
}

window.openEditModal = openEditModal;

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const nom = document.getElementById('lieu-nom').value.trim();
  if (!nom) return;

  const lieuData = {
    id: editingId || 'custom-' + Date.now(),
    nom,
    description: document.getElementById('lieu-desc').value.trim(),
    categorie: document.getElementById('lieu-cat').value,
    jour: document.getElementById('lieu-jour').value,
    lat: parseFloat(document.getElementById('lieu-lat').value) || null,
    lng: parseFloat(document.getElementById('lieu-lng').value) || null,
    duree: document.getElementById('lieu-duree').value.trim(),
    statut: document.getElementById('lieu-statut').value,
    prix: null,
    coord_verifiee: false
  };

  if (editingId) {
    Storage.updateLieu(editingId, lieuData);
  } else {
    Storage.addLieu(lieuData);
  }

  closeModal();
  renderLieux();
});

btnDelete.addEventListener('click', () => {
  if (editingId && confirm('Supprimer ce lieu ?')) {
    Storage.deleteLieu(editingId);
    closeModal();
    renderLieux();
  }
});

// Filters
document.getElementById('filter-jour').addEventListener('change', renderLieux);
document.getElementById('filter-cat').addEventListener('change', renderLieux);

// Init
(async () => {
  await Storage.init();
  renderLieux();
})();
