// csv-loader.js — Chargement des données depuis 3 CSV Google Sheets (lecture seule)
// Version collaborative : ma femme et moi saisissons dans Google Sheets, l'app affiche.

// ─────────────────────────────────────────────────────────────────────────────
// ▼▼▼  COLLEZ ICI le lien d'ÉDITION de votre Google Sheets  ▼▼▼
// (celui qui se termine par /edit, PAS le lien de publication CSV)
// Exemple : 'https://docs.google.com/spreadsheets/d/XXXXXXXXXXXX/edit'
const SHEET_EDIT_URL = 'https://docs.google.com/spreadsheets/d/1oAG9ZJ4OCnkgnj1jAdkzmHXI-ntF7Ax1q5RmyFp64-w/edit';
// ▲▲▲ ────────────────────────────────────────────────────── ▲▲▲

// Les 3 URLs de publication CSV. L'ordre n'a pas d'importance :
// le contenu de chaque fichier est identifié par ses en-têtes de colonnes.
const CSV_URLS = [
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vREshyVOUBfYCdJd4dHc5l9jTJZdIY08FwoqEjAYsuAZf4J4Ejhn2oRdVxaogAJIV1N_Fh0Qtyiyg-m/pub?gid=0&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vREshyVOUBfYCdJd4dHc5l9jTJZdIY08FwoqEjAYsuAZf4J4Ejhn2oRdVxaogAJIV1N_Fh0Qtyiyg-m/pub?gid=1135651472&single=true&output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vREshyVOUBfYCdJd4dHc5l9jTJZdIY08FwoqEjAYsuAZf4J4Ejhn2oRdVxaogAJIV1N_Fh0Qtyiyg-m/pub?gid=1436112612&single=true&output=csv'
];

const Data = {
  _cache: null,

  // Convertit "1 104,31 €" → 1104.31 (gère espaces, espaces insécables, €, virgule décimale)
  parseMontant(raw) {
    if (raw === null || raw === undefined) return 0;
    let s = String(raw).trim();
    if (!s) return 0;
    s = s.replace(/€/g, '')
         .replace(/ /g, '')   // espace insécable
         .replace(/ /g, '')   // espace fine insécable
         .replace(/\s/g, '')       // espaces (séparateurs de milliers)
         .replace(',', '.');       // virgule décimale → point
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  },

  // Convertit lat/lng en nombre (gère virgule décimale éventuelle)
  parseNum(raw) {
    if (raw === null || raw === undefined || String(raw).trim() === '') return null;
    const n = parseFloat(String(raw).trim().replace(',', '.'));
    return isNaN(n) ? null : n;
  },

  // Accès insensible à la casse à un champ d'une ligne parsée
  field(row, name) {
    const lower = name.toLowerCase();
    for (const k in row) {
      if (k && k.toLowerCase().trim() === lower) return row[k];
    }
    return undefined;
  },

  // DD/MM/YYYY → YYYY-MM-DD (pour tri / formatage). Tolère déjà ISO.
  toISODate(raw) {
    if (!raw) return '';
    const s = String(raw).trim();
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) {
      return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
    return s; // suppose déjà ISO
  },

  // Identifie le type d'un tableau de lignes parsées via ses en-têtes
  classify(rows) {
    if (!rows || !rows.length) return 'inconnu';
    const headers = Object.keys(rows[0]).map(h => h.toLowerCase().trim());
    const has = (h) => headers.includes(h);
    if (has('lat') && has('lng')) return 'lieux';
    if (has('montant')) return 'budget';
    if (has('photo_url') || (has('date') && has('note'))) return 'journal';
    return 'inconnu';
  },

  // Récupère et parse un CSV. Renvoie {rows, error}
  async fetchCSV(url) {
    try {
      const resp = await fetch(url, { cache: 'no-store' });
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const text = await resp.text();
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: h => h.trim()
      });
      return { rows: parsed.data, error: null };
    } catch (e) {
      return { rows: [], error: e.message || String(e) };
    }
  },

  // Charge les 3 CSV en parallèle, les classe, les normalise. Résultat mis en cache.
  async load() {
    if (this._cache) return this._cache;

    const results = await Promise.all(CSV_URLS.map(u => this.fetchCSV(u)));

    const out = {
      lieux: [],
      budget: [],
      journal: [],
      errors: []
    };

    results.forEach((res, i) => {
      if (res.error) {
        out.errors.push(`Source ${i + 1} inaccessible (${res.error})`);
        return;
      }
      const type = this.classify(res.rows);
      if (type === 'lieux') out.lieux = this.normLieux(res.rows);
      else if (type === 'budget') out.budget = this.normBudget(res.rows);
      else if (type === 'journal') out.journal = this.normJournal(res.rows);
      else out.errors.push(`Source ${i + 1} : en-têtes non reconnus`);
    });

    this._cache = out;
    return out;
  },

  normLieux(rows) {
    return rows
      .map(r => ({
        id: (this.field(r, 'id') || '').trim(),
        nom: (this.field(r, 'nom') || '').trim(),
        description: (this.field(r, 'description') || '').trim(),
        categorie: (this.field(r, 'categorie') || 'monument').trim().toLowerCase(),
        lat: this.parseNum(this.field(r, 'lat')),
        lng: this.parseNum(this.field(r, 'lng')),
        jour: (this.field(r, 'jour') || '').trim(),
        duree: (this.field(r, 'duree') || '').trim(),
        statut: (this.field(r, 'statut') || 'a_voir').trim().toLowerCase(),
        prix: this.parseMontant(this.field(r, 'prix'))
      }))
      .filter(l => l.nom); // ignore lignes vides
  },

  normBudget(rows) {
    return rows
      .map(r => {
        const libelle = (this.field(r, 'libelle') || '').trim();
        return {
          libelle,
          categorie: (this.field(r, 'categorie') || 'divers').trim().toLowerCase(),
          montant: this.parseMontant(this.field(r, 'montant')),
          statut: (this.field(r, 'statut') || '').trim().toLowerCase(),
          notes: (this.field(r, 'notes') || '').trim(),
          // Ligne de total saisie manuellement dans le Sheet : on l'exclut des calculs
          isTotal: libelle.toUpperCase() === 'TOTAL'
        };
      })
      .filter(d => d.libelle);
  },

  normJournal(rows) {
    return rows
      .map(r => {
        const dateRaw = (this.field(r, 'date') || '').trim();
        return {
          date: dateRaw,
          dateISO: this.toISODate(dateRaw),
          lieu: (this.field(r, 'lieu') || '').trim(),
          note: (this.field(r, 'note') || '').trim(),
          photo_url: (this.field(r, 'photo_url') || '').trim()
        };
      })
      .filter(e => e.date);
  },

  // Total des dépenses (exclut la ligne TOTAL et les montants vides)
  totalBudget(budget) {
    return budget
      .filter(d => !d.isTotal)
      .reduce((s, d) => s + d.montant, 0);
  }
};

// Helpers d'affichage partagés
function formatMontantFR(n) {
  return n.toFixed(2).replace('.', ',') + ' €';
}

function showDataError(messages) {
  let banner = document.getElementById('data-error');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'data-error';
    banner.style.cssText =
      'margin:12px;padding:12px 14px;background:#fdecea;border:1px solid #f5c6cb;' +
      'color:#a12622;border-radius:10px;font-size:0.85rem;line-height:1.4';
    const main = document.querySelector('.main') || document.body;
    main.insertBefore(banner, main.firstChild);
  }
  banner.innerHTML =
    '<strong>Données partiellement indisponibles</strong><br>' +
    messages.join('<br>') +
    '<br><span style="opacity:.8">Vérifiez votre connexion ou réessayez plus tard.</span>';
}

// Bouton flottant « Modifier les données » (ouvre le Google Sheets en édition)
function injectEditButton() {
  if (document.getElementById('btn-edit-data')) return;
  const a = document.createElement('a');
  a.id = 'btn-edit-data';
  a.href = SHEET_EDIT_URL;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = '✎ Modifier les données';
  a.style.cssText =
    'position:fixed;right:12px;bottom:calc(var(--nav-height) + 12px);z-index:1000;' +
    'background:#1a6b3c;color:#fff;text-decoration:none;font-size:0.8rem;font-weight:600;' +
    'padding:9px 14px;border-radius:22px;box-shadow:0 2px 8px rgba(0,0,0,.25)';
  document.body.appendChild(a);
}

document.addEventListener('DOMContentLoaded', injectEditButton);
