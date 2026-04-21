const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

function randomPassword(length = 18) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

exports.inviteDriver = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Connexion requise.');
  }

  const adminDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Seul un admin peut inviter un chauffeur.');
  }

  const data = request.data || {};
  const email = String(data.email || '').trim().toLowerCase();
  const nom = String(data.nom || '').trim();
  const numeroChauffeur = String(data.numeroChauffeur || '').trim();
  const numeroPermis = String(data.numeroPermis || '').trim();
  const telephone = String(data.telephone || '').trim();
  const adresse = String(data.adresse || '').trim();
  const kilometrageApres10Voyages = Number(data.kilometrageApres10Voyages || 0);

  if (!email || !nom) {
    throw new HttpsError('invalid-argument', 'Nom et email sont obligatoires.');
  }

  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') {
      throw error;
    }
  }

  if (!userRecord) {
    userRecord = await admin.auth().createUser({
      email,
      emailVerified: false,
      displayName: nom,
      password: randomPassword()
    });
  }

  const uid = userRecord.uid;
  const now = admin.firestore.FieldValue.serverTimestamp();

  await db.collection('users').doc(uid).set({
    name: nom,
    email,
    role: 'chauffeur',
    phone: telephone,
    address: adresse,
    invitedAt: now,
    updatedAt: now
  }, { merge: true });

  const chauffeurSnap = await db.collection('chauffeurs').where('userId', '==', uid).limit(1).get();
  if (chauffeurSnap.empty) {
    await db.collection('chauffeurs').add({
      userId: uid,
      nom,
      numeroChauffeur,
      numeroPermis,
      telephone,
      adresse,
      kilometrageApres10Voyages,
      invitedEmail: email,
      statutInvitation: 'envoyee',
      createdAt: now,
      updatedAt: now
    });
  } else {
    await chauffeurSnap.docs[0].ref.set({
      nom,
      numeroChauffeur,
      numeroPermis,
      telephone,
      adresse,
      kilometrageApres10Voyages,
      invitedEmail: email,
      statutInvitation: 'envoyee',
      updatedAt: now
    }, { merge: true });
  }

  const resetLink = await admin.auth().generatePasswordResetLink(email, {
    url: 'https://allaouaboucheneb04-lgtm.github.io/',
    handleCodeInApp: false
  });

  await db.collection('mail').add({
    to: [email],
    message: {
      subject: 'Invitation - Gestion Camion Pro',
      text: `Bonjour ${nom},\n\nVotre compte chauffeur a été créé. Cliquez sur ce lien pour définir votre mot de passe :\n${resetLink}\n\nEnsuite connectez-vous à l'application.`,
      html: `<p>Bonjour ${nom},</p><p>Votre compte chauffeur a été créé.</p><p><a href="${resetLink}">Cliquez ici pour définir votre mot de passe</a></p><p>Ensuite connectez-vous à l'application.</p>`
    },
    createdAt: now
  });

  return {
    ok: true,
    uid,
    email,
    resetLink
  };
});
