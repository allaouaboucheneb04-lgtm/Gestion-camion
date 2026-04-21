# Gestion Entreprise Camions - Version Pro

## Ce projet gère
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
- Nom du chauffeur
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
- ASSURANCE, chauffeur
- Frais comptable
- Déclaration d’impôts
- Salaire, chauffeur
- Assurance du camion
- Assurance, de marchandise

## Dashboard admin
- Revenus
- Dépenses
- Bénéfice
- Rapport global

## Espace chauffeur
- Voir ses voyages
- Ajouter ses voyages
- Voir son camion assigné

## Firebase
Déjà configuré avec ton projet `gestion-camion-93e44`

### À faire dans Firebase
1. Activer Authentication > Email / Password
2. Activer Firestore Database
3. Déployer `firestore.rules`
4. Créer les users dans Authentication
5. Créer dans Firestore la collection `users`

Exemple:
users/{uid}
- role: "admin"
- email: "admin@exemple.com"

ou

users/{uid}
- role: "chauffeur"
- email: "chauffeur@exemple.com"

## Collections utilisées
- users
- camions
- chauffeurs
- voyages
- entretiens
- depenses
- assignations
