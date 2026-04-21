export const translations = {
  fr: {
    email: 'Email',
    password: 'Mot de passe',
    login: 'Connexion',
    hint: 'Crée un utilisateur dans Firebase Auth puis ajoute son rôle dans Firestore.'
  },
  ar: {
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    login: 'دخول',
    hint: 'أنشئ مستخدمًا في Firebase Auth ثم أضف دوره في Firestore.'
  }
};

export function applyLang(lang) {
  const map = translations[lang] || translations.fr;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (map[key]) el.textContent = map[key];
  });
  document.querySelectorAll('.chip').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
  localStorage.setItem('gc_lang', lang);
}
