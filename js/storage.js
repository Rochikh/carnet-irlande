// storage.js — Couche localStorage pour Carnet Irlande 2026

const Storage = {
  KEYS: {
    LIEUX: 'carnet_irlande_lieux',
    HOTELS: 'carnet_irlande_hotels',
    JOURNAL: 'carnet_irlande_journal',
    BUDGET: 'carnet_irlande_budget',
    BUDGET_GLOBAL: 'carnet_irlande_budget_global',
    INITIALIZED: 'carnet_irlande_initialized'
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
    if (this.get(this.KEYS.INITIALIZED)) return;

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
    } catch (e) {
      console.error('Storage.init error:', e);
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
