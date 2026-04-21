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
