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


## Mise à jour - détails chauffeur dans admin

Dans l’espace Admin > Chauffeurs, un bouton **Détails** est ajouté pour chaque chauffeur.
Il affiche : profil complet, statut invitation, document/permis, voyages, dépenses liées, revenu, coûts et bénéfice net estimé.

## Correctif création chauffeur propre

Cette version corrige la création chauffeur dans l’admin :

- le formulaire vérifie email + nom avant l’envoi ;
- le bouton affiche “Création + invitation en cours...” pendant le traitement ;
- la Cloud Function `inviteDriver` retourne maintenant aussi `chauffeurDocId` ;
- l’upload du permis/document est enregistré directement sur le bon document chauffeur ;
- les erreurs Firebase ne s’affichent plus seulement comme `internal`, elles sont expliquées.

### Important pour l’invitation

La création du compte chauffeur + lien de mot de passe nécessite Cloud Functions :

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Ensuite, installe/configure l’extension Firebase **Trigger Email** avec la collection :

```text
mail
```

Si l’extension email n’est pas configurée, le compte chauffeur peut être créé, mais l’email d’invitation ne sera pas envoyé.

### Si tu vois encore “internal”

Vérifie :

1. ton document `users/{TON_UID}` contient bien :
```json
{ "role": "admin" }
```
2. la function `inviteDriver` est bien déployée dans Firebase Functions ;
3. Authentication > Email/Password est activé ;
4. l’extension Trigger Email est configurée sur la collection `mail`.

## Suppression complète chauffeur

Le bouton **Supprimer** dans Admin > Chauffeurs appelle la Cloud Function `deleteDriver`.
Elle supprime :

- la fiche `chauffeurs/{docId}`
- le document `users/{uid}`
- le compte dans **Firebase Authentication**

À déployer :

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Sans déployer les Functions, Firebase Authentication ne peut pas être supprimé depuis une app HTML/JS statique.

## Correctif suppression complète chauffeur

Cette version corrige le bouton **Supprimer chauffeur** :

- appelle la Cloud Function `deleteDriver` dans la région `us-central1`
- supprime la fiche `chauffeurs/{docId}`
- supprime `users/{uid}` si un UID existe
- supprime le compte Firebase Authentication si un UID existe
- si une ancienne fiche n’a pas de UID, seule la fiche chauffeur est supprimée proprement

À déployer après remplacement des fichiers :

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Puis republier `firestore.rules`.

## Correctif final: suppression complète chauffeur

Cette version corrige la suppression complète des chauffeurs.

### À faire après upload sur GitHub Pages

1. Publie `firestore.rules` dans Firebase > Firestore > Rules.
2. Déploie la Cloud Function dans le même projet Firebase:

```bash
npm install -g firebase-tools
firebase login
cd chemin/du/projet
firebase use gestion-camion-93e44
cd functions
npm install
cd ..
firebase deploy --only functions
```

3. Dans Firebase > Functions, tu dois voir:

```text
deleteDriver — us-central1
```

4. Ton compte admin doit être dans Firestore:

```text
users/{TON_UID_FIREBASE}
```

avec:

```json
{
  "role": "admin",
  "name": "Alaoua",
  "email": "allaouaboucheneb04@gmail.com"
}
```

### Important

- Les rules bloquent la suppression directe de `users` et `chauffeurs` côté navigateur.
- La suppression complète passe par `deleteDriver` avec Firebase Admin SDK.
- Les anciennes fiches chauffeur avec `UID: -` seront supprimées seulement dans Firestore, car elles n'ont pas de compte Auth.

## Correctif blocage dashboard
Cette version met à jour le service worker, supprime les anciens caches et affiche une erreur claire si le rôle admin ou le profil Firestore manque.
