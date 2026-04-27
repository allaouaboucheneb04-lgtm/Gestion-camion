# Gestion Camion Pro — invitations style Garage

Version corrigée comme ton système de garage: pas besoin de Trigger Email ni Cloud Functions.

## Fonctionnement
1. Admin crée un chauffeur dans `Admin > Chauffeurs`.
2. L’app crée une fiche chauffeur + un document `invitations/{inviteId}`.
3. L’app affiche un lien du type: `/register.html?invite=...`.
4. Tu copies ce lien et tu l’envoies au chauffeur par SMS/WhatsApp/email.
5. Le chauffeur ouvre le lien, crée son mot de passe, puis son compte `users/{uid}` est créé avec `role: chauffeur`.

## À publier
- Remplace ton site GitHub Pages avec ce ZIP.
- Publie `firestore.rules`.
- Publie `storage.rules`.
- Active Firebase Auth > Email/Password.

## Rôles
- `admin`: accès total
- `manager`: accès opérationnel sans paramètres sensibles
- `chauffeur`: voit et gère ses propres voyages

## Important
Le système d’invitation ne dépend plus de `functions/inviteDriver` et ne dépend plus de Trigger Email.
