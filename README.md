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
