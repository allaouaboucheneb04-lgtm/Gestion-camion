# Gestion Camion Pro Max 2

## Inclus
- Firebase Web SDK moderne (module)
- Connexion email/mot de passe
- Rôles `admin` et `chauffeur`
- Dashboard admin
- Espace chauffeur
- Camions, chauffeurs, voyages, entretien, dépenses
- Calcul revenu / coûts / bénéfice
- PWA installable
- `firestore.rules`

## Collections Firestore
- `users`
- `trucks`
- `drivers`
- `trips`
- `maintenance`
- `expenses`

## Rôle utilisateur
Dans `users/{uid}` ajoute par exemple:
```json
{
  "name": "Alaoua",
  "email": "admin@exemple.com",
  "role": "admin"
}
```
Pour un chauffeur:
```json
{
  "name": "Karim",
  "email": "karim@exemple.com",
  "role": "chauffeur"
}
```

## Déploiement
1. Ouvre Firebase et active Authentication > Email/Password
2. Crée Firestore Database
3. Déploie les règles du fichier `firestore.rules`
4. Héberge le dossier sur Netlify, GitHub Pages ou Firebase Hosting

## Remarques
- Le bouton `Modifier` fait une modification rapide du champ `note`
- Le code est prêt pour être étendu avec PDF, graphiques et notifications



## Informations métier intégrées
### Camion
- Numéro de camion
- Numéro de plaque
- Marque de camion et modèle
- Remarque
- Numéro de remorque
- Plaque de remorque

### Voyage
- Client
- Destination
- Date de départ
- Date d’arrivée
- Prix de course
- Gasoil
- Frais de mission
- Auteur, dépenses

### Voyage de retour
- Client
- Destination
- Date de retour
- Date d’arrivée
- Prix de course
- Frais de mission
- Gasoil

### Chauffeur
- Nom de chauffeur
- Numéro de chauffeur
- Numéro de permis
- Adresse
- Kilométrage après chèque 10 voyages

### Entretien, camion et remorque
- Pneus
- Vidange
- Pièces mécaniques
- Frais de réparation
- Tout hôtel réparation

### Autre dépense
- Assurance chauffeur
- Frais comptable
- Déclaration d’impôts
- Salaire chauffeur
- Assurance du camion
- Assurance de marchandise
