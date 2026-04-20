const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    try {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      const userDoc = await db.collection('users').doc(cred.user.uid).get();
      if (!userDoc.exists) throw new Error('Utilisateur sans profil Firestore.');
      const role = userDoc.data().role;
      location.href = role === 'admin' ? './admin.html' : './chauffeur.html';
    } catch (err) {
      showToast(err.message || 'Connexion impossible.', 'error');
    }
  });
}
