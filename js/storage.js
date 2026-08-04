// storage.js — Couche localStorage pour Carnet Irlande 2026

const Storage = {
  KEYS: {
    LIEUX: 'carnet_irlande_lieux',
    HOTELS: 'carnet_irlande_hotels',
    JOURNAL: 'carnet_irlande_journal',
    BUDGET: 'carnet_irlande_budget',
    BUDGET_GLOBAL: 'carnet_irlande_budget_global',
    INITIALIZED: 'carnet_irlande_initialized',
    LIENS_REPRIS: 'carnet_irlande_liens_repris'
  },

  get(key) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Storage.get error:', e);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage.set error:', e);
    }
  },

  // Initialise les données depuis le JSON de données si premier lancement
  // Cherche d'abord lieux.json (données personnelles), sinon lieux-exemple.json
  async init() {
    if (this.get(this.KEYS.INITIALIZED)) return this.reprendreLiens();

    try {
      let resp = await fetch('data/lieux.json');
      if (!resp.ok) {
        resp = await fetch('data/lieux-exemple.json');
      }
      const data = await resp.json();
      this.set(this.KEYS.HOTELS, data.hotels);
      this.set(this.KEYS.LIEUX, data.lieux);
      this.set(this.KEYS.JOURNAL, {});
      // Pré-remplir budget avec hôtels
      const depenses = data.hotels.map(h => ({
        id: h.id,
        label: h.nom,
        montant: h.prix,
        categorie: 'hebergement',
        date: h.check_in,
        confirme: true
      }));
      this.set(this.KEYS.BUDGET, depenses);
      this.set(this.KEYS.BUDGET_GLOBAL, null);
      this.set(this.KEYS.INITIALIZED, true);
      this.set(this.KEYS.LIENS_REPRIS, true); // données fraîches : rien à reprendre
    } catch (e) {
      console.error('Storage.init error:', e);
    }
  },

  // Le fichier de données n'est lu qu'au tout premier lancement. Le champ « lien »
  // est arrivé après coup : sans cette reprise, tout appareil ayant déjà ouvert le
  // carnet garderait des lieux sans lien et le bouton « En savoir plus » n'y
  // apparaîtrait jamais. Le passage du service worker en v4 n'y change rien : il
  // vide le cache HTTP, pas le localStorage.
  //
  // On ne recopie qu'un lien absent, et rien d'autre : les fiches stockées portent
  // les modifications de l'utilisateur, qui doivent survivre à cette reprise.
  async reprendreLiens() {
    if (this.get(this.KEYS.LIENS_REPRIS)) return;

    try {
      let resp = await fetch('data/lieux.json');
      if (!resp.ok) resp = await fetch('data/lieux-exemple.json');
      const source = await resp.json();

      const completer = (cle, reference) => {
        const stockes = this.get(cle);
        if (!Array.isArray(stockes) || !Array.isArray(reference)) return;
        const liens = new Map(reference.filter(x => x.lien).map(x => [x.id, x.lien]));
        let modifie = false;
        const liste = stockes.map(x => {
          const lien = liens.get(x.id);
          if (!lien || x.lien) return x;
          modifie = true;
          return { ...x, lien };
        });
        if (modifie) this.set(cle, liste);
      };

      completer(this.KEYS.LIEUX, source.lieux);
      completer(this.KEYS.HOTELS, source.hotels);
      this.set(this.KEYS.LIENS_REPRIS, true);
    } catch (e) {
      // Réseau indisponible : on ne pose pas le drapeau, la reprise sera retentée.
      console.error('Storage.reprendreLiens error:', e);
    }
  },

  // Lieux
  getLieux() {
    return this.get(this.KEYS.LIEUX) || [];
  },

  saveLieux(lieux) {
    this.set(this.KEYS.LIEUX, lieux);
  },

  addLieu(lieu) {
    const lieux = this.getLieux();
    lieux.push(lieu);
    this.saveLieux(lieux);
  },

  updateLieu(id, updates) {
    const lieux = this.getLieux();
    const idx = lieux.findIndex(l => l.id === id);
    if (idx !== -1) {
      Object.assign(lieux[idx], updates);
      this.saveLieux(lieux);
    }
  },

  deleteLieu(id) {
    const lieux = this.getLieux().filter(l => l.id !== id);
    this.saveLieux(lieux);
  },

  // Hôtels
  getHotels() {
    return this.get(this.KEYS.HOTELS) || [];
  },

  // Tous les points (hôtels + lieux)
  getAllPoints() {
    return [...this.getHotels(), ...this.getLieux()];
  },

  // Journal
  getJournal() {
    return this.get(this.KEYS.JOURNAL) || {};
  },

  saveJournalEntry(date, text) {
    const journal = this.getJournal();
    journal[date] = text;
    this.set(this.KEYS.JOURNAL, journal);
  },

  // Budget
  getDepenses() {
    return this.get(this.KEYS.BUDGET) || [];
  },

  addDepense(depense) {
    const depenses = this.getDepenses();
    depenses.push(depense);
    this.set(this.KEYS.BUDGET, depenses);
  },

  deleteDepense(id) {
    const depenses = this.getDepenses().filter(d => d.id !== id);
    this.set(this.KEYS.BUDGET, depenses);
  },

  getBudgetGlobal() {
    return this.get(this.KEYS.BUDGET_GLOBAL);
  },

  setBudgetGlobal(montant) {
    this.set(this.KEYS.BUDGET_GLOBAL, montant);
  }
};

// N'accepte qu'une URL http(s). Le champ « lien » peut venir d'un fichier de
// données édité à la main : une valeur « javascript:… » placée dans un href
// serait exécutable au clic. Tout autre schéma est traité comme un lien absent.
function lienSur(url) {
  const s = String(url ?? '').trim();
  return /^https?:\/\//i.test(s) ? s : '';
}

function escapeAttr(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// Rendu du lien « En savoir plus », vide si l'URL est absente ou refusée.
// stopPropagation : sur l'onglet Lieux la fiche entière ouvre la modale
// d'édition, le lien ne doit pas la déclencher en plus.
function boutonLien(url) {
  const sur = lienSur(url);
  if (!sur) return '';
  return `<a class="lien-info" href="${escapeAttr(sur)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">En savoir plus ↗</a>`;
}
