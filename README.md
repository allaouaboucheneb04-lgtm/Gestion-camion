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


## Optimisations ajoutées

- Les listes filtrées du chauffeur ne dépendent plus d'un index composite Firestore pour s'afficher.
- Un fichier `firestore.indexes.json` est inclus si tu veux quand même créer l'index recommandé plus tard.
- Les rules `chauffeurs` acceptent maintenant les champs envoyés par le formulaire.


## Invitation chauffeur par email

Cette version ajoute une vraie invitation chauffeur.

### Ce que fait l'admin
- remplit le formulaire chauffeur avec email + nom
- clique sur enregistrer
- l'application appelle la Cloud Function `inviteDriver`
- la function crée le compte Firebase Auth du chauffeur
- elle crée ou met à jour `users/{uid}` avec `role: "chauffeur"`
- elle crée ou met à jour la fiche `chauffeurs`
- elle génère un lien officiel Firebase de création/réinitialisation du mot de passe
- elle dépose un email dans la collection `mail`

### À activer côté Firebase
1. Authentication > Email/Password
2. Cloud Functions déployées (`functions/index.js`)
3. Extension officielle Trigger Email connectée à la collection `mail`

### Commandes Functions
```bash
cd functions
npm install
firebase deploy --only functions
```

### Trigger Email
Installe l'extension Firebase `firestore-send-email` et choisis la collection `mail`.

### Important
Sans Cloud Functions + Trigger Email, le bouton invitation ne pourra pas envoyer le mail automatiquement.
