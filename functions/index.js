const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

function cleanString(value) {
  return String(value || '').trim();
}

function cleanEmail(value) {
  return cleanString(value).toLowerCase();
}

function randomPassword(length = 22) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let out = '';
  for (let i = 0; i < length; i += 1) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function friendlyError(error) {
  const code = error?.code || 'internal';
  const msg = error?.message || 'Erreur interne.';
  if (code === 'auth/email-already-exists') return 'Cet email existe déjà dans Firebase Auth.';
  if (code === 'auth/invalid-email') return 'Email chauffeur invalide.';
  if (code === 'auth/unauthorized-continue-uri') return 'Le domaine du lien invitation n’est pas autorisé dans Firebase Authentication > Settings > Authorized domains.';
  if (code === 'permission-denied') return 'Permission refusée.';
  return `${code}: ${msg}`;
}

exports.inviteDriver = onCall({ region: 'us-central1' }, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Connexion requise.');
    }

    const adminDoc = await db.collection('users').doc(request.auth.uid).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      throw new HttpsError('permission-denied', 'Seul un admin peut inviter un chauffeur.');
    }

    const data = request.data || {};
    const email = cleanEmail(data.email);
    const nom = cleanString(data.nom);
    const numeroChauffeur = cleanString(data.numeroChauffeur);
    const numeroPermis = cleanString(data.numeroPermis);
    const telephone = cleanString(data.telephone);
    const adresse = cleanString(data.adresse);
    const kilometrageApres10Voyages = Number(data.kilometrageApres10Voyages || 0);

    if (!email) throw new HttpsError('invalid-argument', 'Email chauffeur obligatoire.');
    if (!nom) throw new HttpsError('invalid-argument', 'Nom chauffeur obligatoire.');

    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
    }

    if (!userRecord) {
      userRecord = await admin.auth().createUser({
        email,
        emailVerified: false,
        displayName: nom,
        password: randomPassword()
      });
    } else {
      await admin.auth().updateUser(userRecord.uid, { displayName: nom, disabled: false });
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

    let chauffeurDocId = null;
    const chauffeurSnap = await db.collection('chauffeurs').where('userId', '==', uid).limit(1).get();
    const chauffeurData = {
      userId: uid,
      nom,
      numeroChauffeur,
      numeroPermis,
      telephone,
      adresse,
      kilometrageApres10Voyages: Number.isFinite(kilometrageApres10Voyages) ? kilometrageApres10Voyages : 0,
      invitedEmail: email,
      statutInvitation: 'envoyee',
      updatedAt: now
    };

    if (chauffeurSnap.empty) {
      const newDoc = await db.collection('chauffeurs').add({ ...chauffeurData, createdAt: now });
      chauffeurDocId = newDoc.id;
    } else {
      chauffeurDocId = chauffeurSnap.docs[0].id;
      await chauffeurSnap.docs[0].ref.set(chauffeurData, { merge: true });
    }

    // Pas de URL custom ici: ça évite l’erreur auth/unauthorized-continue-uri.
    const resetLink = await admin.auth().generatePasswordResetLink(email);

    // Nécessite l’extension Firebase “Trigger Email” configurée sur la collection mail.
    await db.collection('mail').add({
      to: [email],
      message: {
        subject: 'Invitation - Gestion Camion Pro',
        text: `Bonjour ${nom},\n\nVotre compte chauffeur a été créé. Cliquez sur ce lien pour créer votre mot de passe :\n${resetLink}\n\nEnsuite connectez-vous à Gestion Camion Pro avec votre email.`,
        html: `<p>Bonjour ${nom},</p><p>Votre compte chauffeur a été créé.</p><p><a href="${resetLink}">Créer mon mot de passe</a></p><p>Ensuite connectez-vous à Gestion Camion Pro avec votre email.</p>`
      },
      createdAt: now
    });

    return { ok: true, uid, email, chauffeurDocId, resetLink };
  } catch (error) {
    console.error('inviteDriver error:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', friendlyError(error));
  }
});
