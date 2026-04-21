# Gestion Camion Pro

Projet web Firebase pour gérer :
- camions
- chauffeurs
- voyages aller / retour
- entretien
- autres dépenses
- documents / factures
- espace admin
- espace chauffeur
- PWA installable

## 1. Config Firebase
Dans `js/firebase.js`, remplace les valeurs par ton vrai projet Firebase.

## 2. Active Auth
Firebase Authentication > Sign-in method > Email/Password.

## 3. Crée les rôles
Après avoir créé un utilisateur dans Auth, crée aussi un document dans `users/{uid}`.

### Admin
```json
{
  "name": "Alaoua",
  "email": "admin@exemple.com",
  "role": "admin"
}
```

### Chauffeur
```json
{
  "name": "Karim",
  "email": "karim@exemple.com",
  "role": "chauffeur"
}
```

## 4. Collections utilisées
- `users`
- `camions`
- `chauffeurs`
- `voyages`
- `entretien`
- `depenses`
- `parametres/general`

## 5. Règles
- Firestore: `firestore.rules`
- Storage: `storage.rules`

## 6. Déploiement
Tu peux héberger sur Firebase Hosting, Netlify ou GitHub Pages.
Pour GitHub Pages, garde Firebase comme backend et publie les fichiers du dossier.

## 7. Important
- Le chauffeur voit seulement ses voyages.
- L'admin peut tout gérer.
- Les documents peuvent être joints aux voyages, entretiens et dépenses.
