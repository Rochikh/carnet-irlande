// app.js — Carte interactive Leaflet

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

const JOURS = [
  { date: '2026-08-08', label: 'Sam 8' },
  { date: '2026-08-09', label: 'Dim 9' },
  { date: '2026-08-10', label: 'Lun 10' },
  { date: '2026-08-11', label: 'Mar 11' },
  { date: '2026-08-12', label: 'Mer 12' },
  { date: '2026-08-13', label: 'Jeu 13' },
  { date: '2026-08-14', label: 'Ven 14' },
  { date: '2026-08-15', label: 'Sam 15' }
];

function createMarkerIcon(categorie) {
  const color = CATEGORY_COLORS[categorie] || '#888';
  return L.divIcon({
    className: '',
    html: `<div class="marker-icon" style="background:${color};">${categorie[0].toUpperCase()}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16]
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function buildPopup(point) {
  const isHotel = point.categorie === 'hotel';
  const dateInfo = isHotel
    ? `${formatDate(point.check_in)} → ${formatDate(point.check_out)}`
    : formatDate(point.jour);
  const prixInfo = point.prix ? `<br><strong>${point.prix.toFixed(2)} €</strong>` : '';
  const dureeInfo = point.duree ? ` | ${point.duree}` : '';
  const coordWarning = point.coord_verifiee === false
    ? '<br><em style="font-size:0.75rem;color:#c0392b;">Coordonnées approximatives</em>' : '';

  return `
    <div style="min-width:180px">
      <span class="card-badge badge-${point.categorie}">${CATEGORY_LABELS[point.categorie]}</span>
      <span class="badge-statut statut-${point.statut}" style="margin-left:4px">${STATUT_LABELS[point.statut] || point.statut}</span>
      <h3 style="margin:6px 0 2px;font-size:1rem">${point.nom}</h3>
      <p style="font-size:0.85rem;color:#666;margin:0">${point.description}</p>
      <p style="font-size:0.8rem;margin:4px 0 0;color:#444">${dateInfo}${dureeInfo}${prixInfo}</p>
      ${coordWarning}
    </div>
  `;
}

async function initMap() {
  await Storage.init();

  const map = L.map('map', {
    zoomControl: false
  }).setView([53.5, -7.5], 7);

  L.control.zoom({ position: 'topright' }).addTo(map);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18
  }).addTo(map);

  const points = Storage.getAllPoints();
  const markers = [];

  points.forEach(p => {
    if (p.lat && p.lng) {
      const marker = L.marker([p.lat, p.lng], {
        icon: createMarkerIcon(p.categorie)
      }).addTo(map);
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
