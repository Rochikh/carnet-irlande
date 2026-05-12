# Carnet Irlande 2026

Application web mobile-first pour organiser un voyage en Irlande du 8 au 15 août 2026.

## Démo en ligne

**https://irlande.rochane.fr**

Les données affichées sont des exemples génériques. Chaque utilisateur peut personnaliser ses propres hôtels, lieux et budget directement depuis le navigateur — tout est sauvegardé dans le `localStorage`.

## Fonctionnalités

- **Carte interactive** (Leaflet.js) avec marqueurs colorés par catégorie
- **Itinéraire** jour par jour avec hôtels et lieux à visiter
- **Liste des lieux** filtrable par jour et catégorie, avec ajout/modification/suppression
- **Journal de voyage** avec saisie par jour et sauvegarde automatique
- **Suivi du budget** avec catégories (hébergement, restauration, visites, essence, etc.)
- **PWA installable** avec mode hors-ligne (service worker)

## Lancer en local

```bash
python -m http.server 8000
```

Ouvrir http://localhost:8000 dans un navigateur.

Pour utiliser vos propres données d'hôtels, créez un fichier `data/lieux.json` en vous basant sur `data/lieux-exemple.json`. Le fichier `lieux.json` est ignoré par git pour protéger vos données personnelles.

## Stack

HTML, CSS, JavaScript vanilla — aucun framework. Données stockées dans le `localStorage` du navigateur.

## Licence

Application open source sous [licence MIT](LICENSE) — Rochane Kherbouche, 2026.
