# Carnet Irlande 2026

Application web mobile-first pour organiser un voyage de 2 personnes en Irlande du 8 au 15 août 2026.

## Fonctionnalités

- **Carte interactive** (Leaflet.js) avec marqueurs colorés par catégorie
- **Itinéraire** jour par jour avec hôtels et lieux à visiter
- **Liste des lieux** filtrable par jour et catégorie, avec ajout/modification/suppression
- **Journal de voyage** avec saisie par jour et sauvegarde automatique
- **Suivi du budget** avec hôtels pré-remplis (1 104,31 €) et reste sur budget global
- **PWA installable** avec mode hors-ligne (service worker)

## Lancer en local

```bash
python -m http.server 8000
```

Ouvrir http://localhost:8000 dans un navigateur.

## Stack

HTML, CSS, JavaScript vanilla — aucun framework. Données stockées dans le `localStorage` du navigateur.
