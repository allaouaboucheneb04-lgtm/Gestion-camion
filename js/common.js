let deferredPrompt = null;

function formatMoney(value) {
  return `${Number(value || 0).toFixed(2)} $`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = typeof value === 'string' ? new Date(value) : value.toDate ? value.toDate() : new Date(value);
  return isNaN(date) ? value : date.toLocaleString('fr-CA');
}

function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showToast(message, type = 'success') {
  const status = document.getElementById('status');
  if (!status) return alert(message);
  status.className = `status ${type}`;
  status.textContent = message;
}

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('installBtn');
  if (btn) btn.classList.remove('hidden');
});

window.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(console.error);
  }

  const installBtn = document.getElementById('installBtn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.classList.add('hidden');
    });
  }

  const chips = document.querySelectorAll('[data-lang]');
  chips.forEach(btn => btn.addEventListener('click', () => setLanguage(btn.dataset.lang)));
  if (document.querySelector('[data-i18n]')) {
    setLanguage(localStorage.getItem('lang') || 'fr');
  }
});

function setLanguage(lang) {
  localStorage.setItem('lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-lang]').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const txt = window.TRANSLATIONS?.[lang]?.[key];
    if (txt) el.innerHTML = txt;
  });
}

function requireAuth(expectedRole) {
  auth.onAuthStateChanged(async user => {
    if (!user) return location.href = './index.html';
    const userDoc = await db.collection('users').doc(user.uid).get();
    const role = userDoc.exists ? userDoc.data().role : null;
    if (!role) return alert('Rôle utilisateur introuvable dans Firestore.');
    if (expectedRole && role !== expectedRole) {
      location.href = role === 'admin' ? './admin.html' : './chauffeur.html';
      return;
    }
    window.currentUser = { uid: user.uid, ...userDoc.data(), email: user.email };
    window.dispatchEvent(new CustomEvent('app:user-ready', { detail: window.currentUser }));
  });
}

function bindLogout() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', async () => {
    await auth.signOut();
    location.href = './index.html';
  });
}
