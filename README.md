# Gestion Camion Algérie Pro — KM + Email Photo

Version bilingue français / arabe pour chauffeurs en Algérie.

## Nouveauté

- Le chauffeur inscrit le KM du jour dans Firestore.
- La photo odomètre est optionnelle.
- Si le chauffeur ajoute une photo, elle est compressée dans le navigateur puis envoyée par email avec EmailJS.
- Firebase Storage n'est plus nécessaire pour les photos odomètre.

## Configuration Firebase

1. Remplir `js/firebase-config.js` avec la config Firebase.
2. Publier `firestore.rules`.
3. Publier `storage.rules` seulement si tu gardes les documents de voyages/entretien/dépenses avec upload.

## Configuration EmailJS

Ouvre `js/email-config.js` et remplace :

```js
window.EMAILJS_CONFIG = {
  publicKey: "REMPLACE_PUBLIC_KEY",
  serviceId: "REMPLACE_SERVICE_ID",
  templateId: "REMPLACE_TEMPLATE_ID",
  toEmail: "ton-email@exemple.com"
};
```

## Variables à mettre dans ton template EmailJS

Utilise ces variables dans le modèle EmailJS :

- `{{subject}}`
- `{{title_fr}}`
- `{{title_ar}}`
- `{{chauffeur_name}}`
- `{{chauffeur_email}}`
- `{{camion}}`
- `{{kilometrage}}`
- `{{date}}`
- `{{remarque}}`
- `{{image}}`

## Exemple de template EmailJS HTML

```html
<div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden">
  <div style="background:#0f172a;color:white;padding:22px">
    <h2 style="margin:0">{{title_fr}}</h2>
    <p style="margin:6px 0 0;direction:rtl;text-align:right">{{title_ar}}</p>
  </div>
  <div style="padding:22px">
    <p><b>Chauffeur:</b> {{chauffeur_name}}</p>
    <p><b>Email:</b> {{chauffeur_email}}</p>
    <p><b>Camion:</b> {{camion}}</p>
    <p><b>Kilométrage:</b> {{kilometrage}} km</p>
    <p><b>Date:</b> {{date}}</p>
    <p><b>Remarque:</b> {{remarque}}</p>
    <hr>
    <p><b>Photo odomètre:</b></p>
    <img src="{{image}}" style="max-width:100%;border-radius:14px;border:1px solid #ddd" />
  </div>
</div>
```

## Test conseillé

1. Connecte-toi chauffeur.
2. Entre le KM sans photo : doit enregistrer seulement.
3. Entre le KM avec photo : doit enregistrer + envoyer email.

Si EmailJS n'est pas configuré, le KM sera quand même enregistré, mais l'email ne partira pas.

## Stats KM Pro
- Admin > Stats KM affiche les statistiques par camion et chauffeur.
- Collection principale utilisée: `odometres`.
- Les rules autorisent la lecture des relevés KM aux utilisateurs connectés pour éviter le blocage dashboard.
- Publie `firestore.rules`, remplace les fichiers, puis recharge avec `?v=alertmodels1`.


## Mise à jour KM Pro avancé

- Suppression du champ inutile `kilométrage après chaque 10 voyages`.
- Ajout de `KM départ voyage` et `KM arrivée voyage`.
- Calcul automatique de la distance du voyage.
- Calcul conso moyenne: gasoil / distance × 100.
- Calcul coût/km et bénéfice/km.
- Nouvelle section Stats KM: rentabilité voyages + alertes relevés KM.

Après upload, recharge avec `?v=alertmodels1`.

## Mise à jour C — Voyage aller simple / aller-retour

Cette version inclut :
- choix du type de voyage : `simple` ou `aller_retour`
- départ aller séparé de destination aller
- retour indépendant avec `retourDepart` et `retourDestination`
- KM départ / KM arrivée pour calculer la distance
- calculs de rentabilité : distance, consommation / 100 km, coût / km, bénéfice / km
- alertes entretien dans Stats KM Pro

Recharge conseillé : `?v=alertmodels1`

## Mise à jour Entretien Pro

Ajouté dans cette version :
- page Admin > Alertes entretien
- section Suivi entretien dans le Dashboard
- cercle de progression par entretien/camion
- champs dans Entretien : KM lors entretien + Intervalle prochain entretien
- couleurs : vert OK, orange bientôt, rouge dépassé

Recharge le site avec : `?v=alertmodels1`


## Alertes entretien configurables
L’admin peut maintenant créer des alertes à suivre dans **Admin > Alertes entretien**.

Exemples :
- Vidange — 10000 km
- Pneus — 50000 km
- Contrôle freins — 20000 km

Ces alertes s’appliquent automatiquement à chaque camion. Le dashboard affiche un cercle de progression pour chaque camion et chaque type d’entretien. Le calcul utilise le dernier relevé KM du camion et le dernier entretien enregistré avec le même type.


## Statut réparation / entretien

Chaque entretien peut maintenant avoir un statut :

- `en_attente` : En attente / قيد الانتظار
- `en_cours` : En cours / جاري الإصلاح
- `repare` : Réparé / تم الإصلاح

Dans Admin > Entretien, l’admin peut cliquer sur **En attente**, **En cours** ou **Réparé**.
Quand l’entretien passe à **Réparé**, l’application enregistre `dateReparation`. Si le KM entretien est vide, elle utilise le dernier KM connu du camion pour recalculer les alertes.

## Entretien intelligent pro

- L’admin crée les modèles d’alertes dans `alertes_entretien`, exemple: Vidange / 10000 km.
- Quand un entretien est enregistré avec statut `Réparé`, ou quand l’admin clique sur **Réparé**, l’application remet le compteur de cette alerte à zéro pour le camion sélectionné.
- Le reset est stocké dans le document du camion:
  - `dernierEntretien.<type>` = KM au moment de la réparation
  - `dernierEntretienDates.<type>` = date de réparation
- Le dashboard et la page Alertes entretien utilisent ce KM de départ pour recalculer les cercles.

Exemple: camion à 150000 km, vidange faite, intervalle 10000 km. Le cercle repart à 0% et deviendra 50% à 155000 km.


## Version Entreprise Finale
- Menu chauffeur latéral pro : KM du jour, Voyages, Dépenses, Paramètres.
- KM du jour affiché en premier.
- Le chauffeur choisit un camion dans KM et dans Voyage.
- Voyage : aller simple / aller-retour, retour indépendant, KM départ / arrivée.
- Validation KM : bloque KM inférieur/égal au dernier, double saisie du jour, alerte saut +2000 km.
- Dépenses chauffeur : enregistrées avec `status: a_valider` pour validation admin.
- Entretien intelligent : statut réparé et reset dernierEntretien du camion.
- Alertes configurables : collection `alertes_entretien`.

Recharge le site avec `?v=entreprise-finale1`.

## Mise à jour filtres PRO
Version: `filtres-pro1`

Ajouté/corrigé dans cette version:
- Filtres admin dans Voyages: recherche, période, chauffeur, camion, type de voyage.
- Filtres admin dans Dépenses: recherche, période, camion, chauffeur, type.
- Filtres admin dans Entretien: recherche, période, camion, type, statut.
- Filtres admin dans Stats KM: période, camion, chauffeur.
- Nouvelle page Admin: Profit & Performance avec filtres période/camion/chauffeur.
- Profit par camion, profit par chauffeur, meilleur chauffeur.

Après upload sur GitHub, recharge avec:
`?v=filtres-pro1`

## Correctif dashboard
- Correction de l’erreur `alertesEntretienHtml` manquante.
- Recharge avec `?v=fix-alertes1`.


## Cercles Ultra Pro Animés
- Remplace les lignes par des cercles SVG animés.
- 1 carte par camion.
- Filtres camion/type/statut/recherche.
- Recharge: ?v=cercle-ultra-pro1


## Fix final cercles entretien
- Ancien script entretien supprimé des HTML.
- Nouveau script: js/entretien-cercles-fix-final.js
- Force un seul rendu en cercles.
- Cache: recharge avec ?v=cercle-fix-final1
