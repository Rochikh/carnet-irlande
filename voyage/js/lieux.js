// lieux.js — Liste des lieux en lecture seule + filtres (données CSV)

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
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

let allLieux = [];

function renderLieux() {
  const jourFilter = document.getElementById('filter-jour').value;
  const catFilter = document.getElementById('filter-cat').value;

  const filtered = allLieux.filter(p => {
    if (catFilter && p.categorie !== catFilter) return false;
    if (jourFilter && p.jour !== jourFilter) return false;
    return true;
  });

  const container = document.getElementById('lieux-list');
  if (filtered.length === 0) {
    container.innerHTML = '<p class="text-center card-sub" style="padding:24px 0">Aucun lieu trouvé.</p>';
    return;
  }

  container.innerHTML = filtered.map(p => {
    const dateStr = formatDateShort(p.jour);
    const prix = p.prix ? `${p.prix.toFixed(2)} €` : '';
    const duree = p.duree ? ` | ${p.duree}` : '';
    return `
      <div class="card">
        <div class="flex-between">
          <span class="card-badge badge-${p.categorie}">${CATEGORY_LABELS[p.categorie] || p.categorie}</span>
          <span class="badge-statut statut-${p.statut}">${STATUT_LABELS[p.statut] || p.statut}</span>
        </div>
        <div class="card-title" style="margin-top:6px">${p.nom}</div>
        <div class="card-sub">${p.description}</div>
        <div class="card-sub" style="margin-top:4px">${dateStr}${duree}${prix ? ' | ' + prix : ''}</div>
      </div>
    `;
  }).join('');
}

document.getElementById('filter-jour').addEventListener('change', renderLieux);
document.getElementById('filter-cat').addEventListener('change', renderLieux);

(async () => {
  const data = await Data.load();
  if (data.errors.length) showDataError(data.errors);
  allLieux = data.lieux;
  renderLieux();
})();
