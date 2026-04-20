# Gestion Camion Pro

Application web installable (PWA) avec Firebase.

## Fonctionnalités
- Connexion email / mot de passe
- Rôle admin et rôle chauffeur
- Gestion des camions
- Gestion des chauffeurs
- Gestion des voyages
- Gestion des entretiens
- Gestion des dépenses
- Installable sur iPhone / Android / ordinateur

## Configuration Firebase
1. Créez un projet Firebase.
2. Activez Authentication > Email/Password.
3. Activez Firestore Database.
4. Remplissez le fichier `firebase-config.js`.
5. Déployez les règles Firestore contenues dans `firestore.rules`.

## Structure Firestore recommandée
### users/{uid}
```json
{
  "name": "Nom utilisateur",
  "role": "admin",
  "phone": "",
  "address": "",
  "driverNumber": ""
}
```

### camions/{id}
```json
{
  "numeroCamion": "TR-01",
  "plaque": "ABC123",
  "marqueModele": "Volvo FH",
  "remarque": "",
  "numeroRemorque": "RM-90",
  "plaqueRemorque": "XYZ789",
  "createdAt": "serverTimestamp"
}
```

### voyages/{id}
```json
{
  "client": "Client A",
  "destination": "Montréal",
  "dateDepart": "2026-04-20T08:00",
  "dateArrivee": "2026-04-20T13:00",
  "prixCourse": 1200,
  "gasoil": 250,
  "fraisMission": 100,
  "auteurDepense": "Nom",
  "chauffeurNom": "Ali",
  "chauffeurUid": "uid",
  "kilometrage": 123456,
  "createdBy": "uid"
}
```

### entretiens/{id}
```json
{
  "type": "Vidange",
  "camion": "TR-01",
  "montant": 180,
  "date": "2026-04-20",
  "notes": "huile + filtre"
}
```

### depenses/{id}
```json
{
  "categorie": "Assurance camion",
  "montant": 950,
  "auteur": "Admin",
  "date": "2026-04-20"
}
```

## Déploiement
- Netlify
- Firebase Hosting
- GitHub Pages (possible pour la partie statique)

## Important
Pour que le bouton Installer apparaisse, ouvrez l'application depuis un vrai serveur web (pas directement via fichier local).
