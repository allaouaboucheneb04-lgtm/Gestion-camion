# Gestion Camion Algérie Pro — Français / عربي

Version adaptée pour une utilisation avec des chauffeurs en Algérie.

## Ajouts
- Interface bilingue : français / arabe.
- Bouton flottant `FR / عربي` sur toutes les pages.
- Mode arabe en RTL automatiquement.
- Devise changée en dinar algérien : DZD.
- Format date adapté `fr-DZ` / `ar-DZ`.
- Fonction chauffeur conservée : actif/inactif, reset mot de passe, voyages, entretien, dépenses.

## Firebase
Remplis `js/firebase-config.js` avec ton projet Firebase.

## Rôles Firestore
Dans `users/{uid}` :

```json
{
  "name": "Alaoua",
  "email": "ton@email.com",
  "role": "admin",
  "status": "actif"
}
```

Pour un chauffeur :

```json
{
  "name": "Nom Chauffeur",
  "email": "chauffeur@email.com",
  "role": "chauffeur",
  "status": "actif"
}
```

## Important
Après upload sur GitHub Pages, vide le cache ou change la version du service worker si besoin. Cette version utilise déjà un nouveau cache : `gestion-camion-algerie-bilingue-v1`.
