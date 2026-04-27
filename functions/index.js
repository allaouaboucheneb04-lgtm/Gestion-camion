const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

function cleanString(value) {
  return String(value || '').trim();
}

function cleanEmail(value) {
  return cleanString(value).toLowerCase();
}

async function assertAdmin(context) {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Connexion requise. Reconnecte-toi en admin.');
  }

  const adminDoc = await db.collection('users').doc(context.auth.uid).get();
  if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Seul un admin peut faire cette action. Vérifie users/{tonUID} avec role: admin.');
  }

  return context.auth.uid;
}

exports.deleteDriver = functions
  .region('us-central1')
  .https.onCall(async (data, context) => {
    const callerUid = await assertAdmin(context);

    const chauffeurDocId = cleanString(data && data.chauffeurDocId);
    let uid = cleanString(data && data.uid);

    if (!chauffeurDocId && !uid) {
      throw new functions.https.HttpsError('invalid-argument', 'UID ou document chauffeur obligatoire.');
    }

    let chauffeurRef = null;
    let chauffeurSnap = null;

    if (chauffeurDocId) {
      chauffeurRef = db.collection('chauffeurs').doc(chauffeurDocId);
      chauffeurSnap = await chauffeurRef.get();
      if (!chauffeurSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'Fiche chauffeur introuvable. Recharge la page.');
      }
      const c = chauffeurSnap.data() || {};
      uid = uid || cleanString(c.userId || c.uid);
    } else if (uid) {
      const qs = await db.collection('chauffeurs').where('userId', '==', uid).limit(1).get();
      if (!qs.empty) {
        chauffeurSnap = qs.docs[0];
        chauffeurRef = chauffeurSnap.ref;
      }
    }

    // Ancienne fiche invitation sans UID Auth: suppression Firestore seulement.
    if (!uid) {
      if (chauffeurRef) {
        await chauffeurRef.delete();
        return { ok: true, authDeleted: false, userDeleted: false, chauffeurDeleted: true, note: 'Fiche sans UID supprimée.' };
      }
      throw new functions.https.HttpsError('invalid-argument', 'Ce chauffeur n’a pas de UID Auth.');
    }

    if (uid === callerUid) {
      throw new functions.https.HttpsError('failed-precondition', 'Tu ne peux pas supprimer ton propre compte admin.');
    }

    const targetUserDoc = await db.collection('users').doc(uid).get();
    if (targetUserDoc.exists && targetUserDoc.data().role === 'admin') {
      throw new functions.https.HttpsError('failed-precondition', 'Impossible de supprimer un admin avec le bouton chauffeur.');
    }

    const batch = db.batch();
    if (chauffeurRef) batch.delete(chauffeurRef);
    batch.delete(db.collection('users').doc(uid));
    await batch.commit();

    let authDeleted = true;
    try {
      await admin.auth().deleteUser(uid);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        authDeleted = false;
      } else {
        throw new functions.https.HttpsError('internal', `Auth delete error: ${error.code || ''} ${error.message || error}`);
      }
    }

    return {
      ok: true,
      uid,
      chauffeurDocId: chauffeurDocId || (chauffeurSnap ? chauffeurSnap.id : null),
      authDeleted,
      userDeleted: true,
      chauffeurDeleted: !!chauffeurRef
    };
  });

// Optionnel: invitation backend si tu l'utilises plus tard.
exports.inviteDriver = functions
  .region('us-central1')
  .https.onCall(async (data, context) => {
    await assertAdmin(context);

    const email = cleanEmail(data && data.email);
    const nom = cleanString(data && data.nom);
    if (!email) throw new functions.https.HttpsError('invalid-argument', 'Email obligatoire.');
    if (!nom) throw new functions.https.HttpsError('invalid-argument', 'Nom obligatoire.');

    let userRecord;
    try {
      userRecord = await admin.auth().getUserByEmail(email);
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
    }

    if (!userRecord) {
      userRecord = await admin.auth().createUser({
        email,
        displayName: nom,
        password: cleanString(data.password) || Math.random().toString(36).slice(2) + 'Aa1!'
      });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    await db.collection('users').doc(userRecord.uid).set({
      name: nom,
      email,
      role: 'chauffeur',
      updatedAt: now,
      createdAt: now
    }, { merge: true });

    const chauffeurRef = await db.collection('chauffeurs').add({
      userId: userRecord.uid,
      nom,
      email,
      telephone: cleanString(data.telephone),
      adresse: cleanString(data.adresse),
      numeroPermis: cleanString(data.numeroPermis),
      numeroChauffeur: cleanString(data.numeroChauffeur),
      kilometrageApres10Voyages: Number(data.kilometrageApres10Voyages || 0),
      createdAt: now,
      updatedAt: now
    });

    return { ok: true, uid: userRecord.uid, chauffeurDocId: chauffeurRef.id };
  });
