const DICT = {
  ar: {
    "Gestion Camion Pro Ultra": "إدارة الشاحنات برو",
    "Connexion admin / chauffeur": "دخول المدير / السائق",
    "Email": "البريد الإلكتروني",
    "Mot de passe": "كلمة المرور",
    "Connexion": "تسجيل الدخول",
    "Mot de passe oublié / modifier": "نسيت أو تغيير كلمة المرور",
    "Étapes Firebase :": "خطوات Firebase:",
    "Créer l'utilisateur dans Firebase Auth": "أنشئ المستخدم في Firebase Auth",
    "Créer le document": "أنشئ المستند",
    "Ajouter le rôle": "أضف الدور",
    "Admin": "مدير",
    "Dashboard": "لوحة التحكم",
    "Camions": "الشاحنات",
    "Chauffeurs": "السائقون",
    "Voyages": "الرحلات",
    "Entretien": "الصيانة",
    "Dépenses": "المصاريف",
    "Paramètres": "الإعدادات",
    "Déconnexion": "تسجيل الخروج",
    "Chargement...": "جاري التحميل...",
    "Chauffeurs actifs": "السائقون النشطون",
    "Revenu total": "إجمالي المداخيل",
    "Bénéfice estimé": "الربح التقديري",
    "Résumé rapide": "ملخص سريع",
    "Vue globale de l'activité camion": "نظرة عامة على نشاط الشاحنات",
    "Coûts voyages": "تكاليف الرحلات",
    "Autres dépenses": "مصاريف أخرى",
    "Ajouter un camion": "إضافة شاحنة",
    "Numéro, plaque, marque, remorque": "الرقم، اللوحة، النوع، المقطورة",
    "Numéro de camion": "رقم الشاحنة",
    "Numéro de plaque": "رقم اللوحة",
    "Marque et modèle": "العلامة والموديل",
    "Numéro de remorque": "رقم المقطورة",
    "Plaque de remorque": "لوحة المقطورة",
    "Remarque": "ملاحظة",
    "Photo camion (optionnel)": "صورة الشاحنة (اختياري)",
    "Enregistrer le camion": "حفظ الشاحنة",
    "Liste des camions": "قائمة الشاحنات",
    "Clique modifier pour mettre à jour les infos": "اضغط تعديل لتحديث المعلومات",
    "Modifier": "تعديل",
    "Supprimer": "حذف",
    "Voir le fichier": "عرض الملف",
    "Aucun camion pour le moment.": "لا توجد شاحنات حاليا.",
    "Ajouter un chauffeur": "إضافة سائق",
    "Créer le compte chauffeur avec un mot de passe temporaire": "إنشاء حساب السائق بكلمة مرور مؤقتة",
    "Nom complet": "الاسم الكامل",
    "Numéro de chauffeur": "رقم السائق",
    "Numéro de permis": "رقم رخصة السياقة",
    "Téléphone": "الهاتف",
    "Adresse": "العنوان",
    "Kilométrage après 10 voyages": "الكيلومترات بعد 10 رحلات",
    "Mot de passe temporaire": "كلمة مرور مؤقتة",
    "Document permis / dossier (optionnel)": "وثيقة الرخصة / الملف (اختياري)",
    "Créer chauffeur": "إنشاء السائق",
    "Liste des chauffeurs": "قائمة السائقين",
    "Actifs": "نشطون",
    "Inactifs": "غير نشطين",
    "Tous": "الكل",
    "Détails": "التفاصيل",
    "Réinitialiser mot de passe": "إعادة تعيين كلمة المرور",
    "Désactiver": "تعطيل",
    "Réactiver": "تفعيل",
    "Aucun chauffeur dans ce filtre.": "لا يوجد سائق في هذا الفلتر.",
    "Détails chauffeur": "تفاصيل السائق",
    "Profil, invitation, voyages et performance": "الملف، الحساب، الرحلات والأداء",
    "Fermer": "إغلاق",
    "Informations personnelles": "المعلومات الشخصية",
    "Travail / permis": "العمل / الرخصة",
    "Statut compte": "حالة الحساب",
    "Actif": "نشط",
    "Inactif": "غير نشط",
    "Ajouter un voyage": "إضافة رحلة",
    "Aller + retour + coûts": "ذهاب + إياب + التكاليف",
    "Chauffeur (UID)": "السائق (UID)",
    "Choisir": "اختر",
    "Nom du chauffeur": "اسم السائق",
    "Client": "الزبون",
    "Destination": "الوجهة",
    "Date de départ": "تاريخ الانطلاق",
    "Date d'arrivée": "تاريخ الوصول",
    "Prix de course": "سعر الرحلة",
    "Gasoil": "المازوت",
    "Frais de mission": "مصاريف المهمة",
    "Auteur dépenses": "صاحب المصاريف",
    "Client retour": "زبون الرجوع",
    "Destination retour": "وجهة الرجوع",
    "Date de retour": "تاريخ الرجوع",
    "Date arrivée retour": "تاريخ وصول الرجوع",
    "Prix course retour": "سعر رحلة الرجوع",
    "Frais mission retour": "مصاريف مهمة الرجوع",
    "Gasoil retour": "مازوت الرجوع",
    "Document du voyage (optionnel)": "وثيقة الرحلة (اختياري)",
    "Ajouter le voyage": "إضافة الرحلة",
    "Liste des voyages": "قائمة الرحلات",
    "Tous les voyages aller/retour": "كل رحلات الذهاب والرجوع",
    "Aucun voyage pour le moment.": "لا توجد رحلات حاليا.",
    "Ajouter un entretien": "إضافة صيانة",
    "Pneus, vidange, pièces, réparation": "العجلات، تغيير الزيت، القطع، التصليح",
    "Camion": "الشاحنة",
    "Type": "النوع",
    "Pneus": "العجلات",
    "Vidange": "تغيير الزيت",
    "Pièces mécaniques": "قطع ميكانيكية",
    "Frais de réparation": "مصاريف التصليح",
    "Hôtel réparation": "مبيت/فندق أثناء التصليح",
    "Coût": "التكلفة",
    "Date": "التاريخ",
    "Garage": "الورشة",
    "Remorque ?": "مقطورة؟",
    "Non": "لا",
    "Oui": "نعم",
    "Description": "الوصف",
    "Facture / photo (optionnel)": "فاتورة / صورة (اختياري)",
    "Enregistrer l'entretien": "حفظ الصيانة",
    "Liste des entretiens": "قائمة الصيانة",
    "Historique mécanique": "سجل الصيانة",
    "Aucun entretien pour le moment.": "لا توجد صيانة حاليا.",
    "Ajouter une dépense": "إضافة مصروف",
    "Assurance, comptable, impôts, salaire...": "التأمين، المحاسب، الضرائب، الراتب...",
    "Montant": "المبلغ",
    "Camion (optionnel)": "الشاحنة (اختياري)",
    "Chauffeur UID (optionnel)": "UID السائق (اختياري)",
    "Reçu / facture (optionnel)": "وصل / فاتورة (اختياري)",
    "Enregistrer la dépense": "حفظ المصروف",
    "Liste des dépenses": "قائمة المصاريف",
    "Toutes les dépenses diverses": "كل المصاريف الأخرى",
    "Aucune dépense pour le moment.": "لا توجد مصاريف حاليا.",
    "Base pour ajouter les réglages entreprise plus tard": "قاعدة لإضافة إعدادات الشركة لاحقا",
    "Collections utilisées": "المجموعات المستعملة",
    "Rôles": "الأدوار",
    "admin : accès complet": "المدير: صلاحيات كاملة",
    "chauffeur : ses propres voyages": "السائق: رحلاته فقط",
    "Mon espace chauffeur": "مساحة السائق",
    "Mes voyages": "رحلاتي",
    "Le chauffeur ajoute uniquement ses voyages": "السائق يضيف رحلاته فقط",
    "Modification rapide disponible": "تعديل سريع متوفر",
    "Voir le document": "عرض الوثيقة",
    "Aucun voyage pour le moment.": "لا توجد رحلات حاليا.",
    "Revenu": "المداخيل",
    "Coûts": "التكاليف",
    "Net estimé": "الصافي التقديري",
    "Bienvenue": "مرحبا",
    "Vérification de la connexion...": "جاري التحقق من الاتصال...",
    "Erreur de chargement": "خطأ في التحميل"
  }
};

function lang() { return localStorage.getItem("truckLang") || "fr"; }
function setDir() {
  const current = lang();
  document.documentElement.lang = current;
  document.documentElement.dir = current === "ar" ? "rtl" : "ltr";
  document.body.classList.toggle("rtl", current === "ar");
}
function translateText(text) {
  const current = lang();
  if (current === "fr") return text;
  const clean = text.trim();
  return DICT.ar[clean] || text;
}
function walk(node) {
  const current = lang();
  if (current === "fr") return;
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const p = n.parentElement;
      if (!p || ["SCRIPT","STYLE","TEXTAREA","INPUT","OPTION"].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n => {
    const original = n.nodeValue;
    const trimmed = original.trim();
    if (DICT.ar[trimmed]) n.nodeValue = original.replace(trimmed, DICT.ar[trimmed]);
  });
  document.querySelectorAll("input[placeholder]").forEach(el => {
    const v = el.getAttribute("placeholder");
    if (DICT.ar[v]) el.setAttribute("placeholder", DICT.ar[v]);
  });
  document.querySelectorAll("option").forEach(el => {
    const v = el.textContent.trim();
    if (DICT.ar[v]) el.textContent = DICT.ar[v];
  });
}
function applyI18n() { setDir(); walk(document.body); updateButtons(); }
function updateButtons() {
  document.querySelectorAll("[data-set-lang]").forEach(btn => btn.classList.toggle("active", btn.dataset.setLang === lang()));
}
function addSwitcher() {
  if (document.getElementById("langSwitch")) return;
  const wrap = document.createElement("div");
  wrap.id = "langSwitch";
  wrap.className = "lang-switch";
  wrap.innerHTML = `<button data-set-lang="fr">FR</button><button data-set-lang="ar">عربي</button>`;
  document.body.appendChild(wrap);
  wrap.addEventListener("click", e => {
    const btn = e.target.closest("[data-set-lang]");
    if (!btn) return;
    localStorage.setItem("truckLang", btn.dataset.setLang);
    location.reload();
  });
}

addSwitcher();
applyI18n();
new MutationObserver(() => applyI18n()).observe(document.body, { childList: true, subtree: true });
