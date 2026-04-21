# Gestion Camion Pro

Projet web Firebase pour la gestion d’une entreprise de camions.

## Ce que fait le projet
- connexion par email / mot de passe
- rôles `admin` et `chauffeur`
- dashboard admin avec indicateurs
- gestion des camions
- gestion des chauffeurs
- gestion des voyages aller / retour
- gestion de l’entretien camion / remorque
- gestion des autres dépenses
- espace chauffeur avec ses propres voyages
- PWA installable sur mobile

## Structure Firestore
Collections utilisées :
- `users`
- `trucks`
- `drivers`
- `trips`
- `maintenance`
- `expenses`

## Exemple document utilisateur
Document : `users/{uid}`

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

## Déploiement
1. Créer un projet Firebase
2. Activer **Authentication > Email/Password**
3. Créer **Firestore Database**
4. Coller les clés Firebase dans `js/firebase.js`
5. Déployer les règles depuis `firestore.rules`
6. Héberger le dossier sur Netlify, GitHub Pages ou Firebase Hosting

## Important
- l’admin peut ajouter / modifier / supprimer partout
- le chauffeur peut voir, ajouter, modifier et supprimer **ses propres voyages uniquement**
- si tu veux relier un chauffeur à un camion, utilise le champ `assignedTruck` dans la collection `drivers`
- si tu veux relier une fiche chauffeur à un compte Auth précis, tu peux ajouter un champ `userUid` dans `drivers`

## Champs métier intégrés
### Camion
- numéro de camion
- numéro de plaque
- marque et modèle
- remarque
- numéro de remorque
- plaque de remorque

### Voyage
- client
- destination
- date de départ
- date d’arrivée
- prix de course
- gasoil
- frais de mission
- auteur des dépenses

### Voyage retour
- client retour
- destination retour
- date de retour
- date d’arrivée retour
- prix retour
- frais de mission retour
- gasoil retour

### Chauffeur
- nom du chauffeur
- numéro du chauffeur
- numéro de permis
- adresse
- kilométrage après chèque 10 voyages

### Entretien camion et remorque
- pneus
- vidange
- pièces mécaniques
- frais de réparation
- hôtel réparation

### Autres dépenses
- assurance chauffeur
- frais comptable
- déclaration d’impôts
- salaire chauffeur
- assurance du camion
- assurance de marchandise
