# Gestion Camion Pro Ultra

Projet web **mobile-first** pour la gestion des camions avec Firebase.

## Contenu
- Connexion Firebase Auth (Email / Mot de passe)
- Rôles **admin** et **chauffeur**
- Gestion des **camions**
- Gestion des **chauffeurs**
- Gestion des **voyages aller / retour**
- Gestion des **entretiens**
- Gestion des **autres dépenses**
- Upload des documents dans **Firebase Storage**
- PWA installable
- `firestore.rules`
- `storage.rules`

## Collections Firestore
- `users`
- `camions`
- `chauffeurs`
- `voyages`
- `entretien`
- `depenses`
- `parametres`

## Mise en route
1. Créer un projet Firebase
2. Activer **Authentication > Email/Password**
3. Activer **Firestore Database**
4. Activer **Storage**
5. Remplacer la config dans `js/firebase-config.js`
6. Déployer les règles `firestore.rules` et `storage.rules`
7. Créer les comptes Firebase Auth
8. Créer les documents dans `users/{uid}`

## Exemple users/{uid}
### Admin
```json
{
  "name": "Alaoua",
  "email": "admin@exemple.com",
  "role": "admin",
  "phone": "5140000000",
  "address": "Montreal",
  "createdAt": "timestamp"
}
```

### Chauffeur
```json
{
  "name": "Karim",
  "email": "karim@exemple.com",
  "role": "chauffeur",
  "phone": "5141111111",
  "address": "Montreal",
  "createdAt": "timestamp"
}
```

## Important
- Le chauffeur ne voit que **ses propres voyages**
- L'admin voit tout
- L'upload des fichiers utilise les chemins :
  - `voyages/{voyageId}/...`
  - `entretien/{entretienId}/...`
  - `depenses/{depenseId}/...`
  - `camions/{camionId}/...`
  - `chauffeurs/{uid}/...`

## Pages
- `index.html` : connexion
- `pages/admin.html` : tableau de bord admin
- `pages/chauffeur.html` : espace chauffeur

## Notes
- Le projet est pensé pour être facilement déployé sur **Firebase Hosting**, **Netlify** ou **GitHub Pages**.
- Si tu veux une version encore plus avancée, on peut ajouter :
  - rapports PDF
  - graphiques
  - filtre par période
  - export Excel
  - alertes entretien
