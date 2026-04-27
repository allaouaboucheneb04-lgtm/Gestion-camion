# Gestion Camion Algérie Pro — FR / عربي

Version avec design arabe professionnel :
- interface FR / عربي
- RTL arabe complet
- sidebar à droite en arabe
- devise DZD
- design mobile amélioré
- chauffeurs actifs/inactifs
- modification mot de passe chauffeur via email Firebase

Après upload sur GitHub Pages :
1. Remplace tous les fichiers.
2. Recharge le site.
3. Si l'ancien design reste affiché, ajoute `?v=dz2` à l'URL ou supprime le cache Safari.
4. Publie `firestore.rules` si tu changes les règles.

Important : vérifie que ton admin existe dans Firestore :
`users/{uid}` avec `role: "admin"`.


## Nouveau: kilométrage quotidien avec photo
Chaque chauffeur peut enregistrer chaque jour le kilométrage du camion avec une photo obligatoire de l’odomètre.
Collection Firestore: `odometres`
Storage: `odometres/{odometreId}/...`

Après upload: publie `firestore.rules` et `storage.rules`, puis recharge avec `?v=km1`.
