// app.js — Carte interactive Leaflet (version collaborative, données CSV)

const CATEGORY_COLORS = {
  hotel: '#2980b9',
  monument: '#e67e22',
  nature: '#27ae60',
  ville: '#8e44ad',
  restaurant: '#c0392b'
};

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

function createMarkerIcon(categorie) {
  const color = CATEGORY_COLORS[categorie] || '#888';
  const letter = (categorie && categorie[0] ? categorie[0] : '?').toUpperCase();
  return L.divIcon({
    className: '',
    html: `<div class="marker-icon" style="background:${color};">${letter}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16]
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function buildPopup(p) {
  const prixInfo = p.prix ? `<br><strong>${p.prix.toFixed(2)} €</strong>` : '';
  const dureeInfo = p.duree ? ` | ${p.duree}` : '';
  return `
    <div style="min-width:180px">
      <span class="card-badge badge-${p.categorie}">${CATEGORY_LABELS[p.categorie] || p.categorie}</span>
      <span class="badge-statut statut-${p.statut}" style="margin-left:4px">${STATUT_LABELS[p.statut] || p.statut}</span>
      <h3 style="margin:6px 0 2px;font-size:1rem">${p.nom}</h3>
      <p style="font-size:0.85rem;color:#666;margin:0">${p.description}</p>
      <p style="font-size:0.8rem;margin:4px 0 0;color:#444">${formatDate(p.jour)}${dureeInfo}${prixInfo}</p>
    </div>
  `;
}

async function initMap() {
  const map = L.map('map', { zoomControl: false }).setView([53.5, -7.5], 7);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18
  }).addTo(map);

  const data = await Data.load();
  if (data.errors.length) showDataError(data.errors);

  const markers = [];
  data.lieux.forEach(p => {
    if (p.lat != null && p.lng != null) {
      const marker = L.marker([p.lat, p.lng], { icon: createMarkerIcon(p.categorie) }).addTo(map);
      marker.bindPopup(buildPopup(p));
      markers.push(marker);
    }
  });

  if (markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

if (document.getElementById('map')) {
  initMap();
}
