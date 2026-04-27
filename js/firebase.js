import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, "us-central1");

function withTimestamp(data, isUpdate = false) {
  return {
    ...data,
    ...(isUpdate ? { updatedAt: serverTimestamp() } : { createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  };
}

// Auth
export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}
export async function logout() {
  return signOut(auth);
}
export function observeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
export function currentUser() {
  return auth.currentUser;
}

// Users
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
export async function saveUserProfile(uid, data) {
  return setDoc(doc(db, "users", uid), withTimestamp(data), { merge: true });
}

// Generic CRUD
export async function addRecord(colName, data) {
  return addDoc(collection(db, colName), withTimestamp(data));
}
export async function updateRecord(colName, id, data) {
  return updateDoc(doc(db, colName, id), withTimestamp(data, true));
}
export async function deleteRecord(colName, id) {
  return deleteDoc(doc(db, colName, id));
}
function asMillis(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (typeof value?.toDate === "function") return value.toDate().getTime();
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortRecords(items, orderField = "createdAt") {
  return [...items].sort((a, b) => asMillis(b?.[orderField]) - asMillis(a?.[orderField]));
}

export async function listRecords(colName, orderField = "createdAt") {
  try {
    const q = query(collection(db, colName), orderBy(orderField, "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    const snap = await getDocs(collection(db, colName));
    return sortRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })), orderField);
  }
}
export async function listWhere(colName, field, op, value, orderField = "createdAt") {
  const q = query(collection(db, colName), where(field, op, value));
  const snap = await getDocs(q);
  return sortRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })), orderField);
}


export async function inviteDriverAccount(data) {
  const callInviteDriver = httpsCallable(functions, "inviteDriver");
  const result = await callInviteDriver(data);
  return result.data;
}

export async function deleteDriverAccount({ chauffeurDocId, uid }) {
  const callDeleteDriver = httpsCallable(functions, "deleteDriver");
  const result = await callDeleteDriver({ chauffeurDocId, uid });
  return result.data;
}

export async function createDriverAuthAccount(email, password) {
  const secondaryApp = initializeApp(firebaseConfig, `driver-create-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = cred.user.uid;
    await signOut(secondaryAuth);
    return { uid, email: cred.user.email };
  } finally {
    await deleteApp(secondaryApp);
  }
}

// Business helpers
export async function addCamion(data) {
  return addRecord("camions", data);
}
export async function updateCamion(id, data) {
  return updateRecord("camions", id, data);
}
export async function deleteCamion(id) {
  return deleteRecord("camions", id);
}
export async function getCamions() {
  return listRecords("camions");
}

export async function addChauffeur(data) {
  return addRecord("chauffeurs", data);
}
export async function updateChauffeur(id, data) {
  return updateRecord("chauffeurs", id, data);
}
export async function deleteChauffeur(id) {
  return deleteRecord("chauffeurs", id);
}
export async function getChauffeurs() {
  return listRecords("chauffeurs");
}

export async function addVoyage(data) {
  const user = currentUser();
  return addRecord("voyages", {
    ...data,
    chauffeurId: data.chauffeurId || user?.uid || "",
    createdBy: user?.uid || ""
  });
}
export async function updateVoyage(id, data) {
  return updateRecord("voyages", id, data);
}
export async function deleteVoyage(id) {
  return deleteRecord("voyages", id);
}
export async function getVoyages() {
  return listRecords("voyages");
}
export async function getMesVoyages() {
  const user = currentUser();
  return listWhere("voyages", "chauffeurId", "==", user.uid);
}

export async function addEntretien(data) {
  return addRecord("entretien", data);
}
export async function updateEntretien(id, data) {
  return updateRecord("entretien", id, data);
}
export async function deleteEntretien(id) {
  return deleteRecord("entretien", id);
}
export async function getEntretiens() {
  return listRecords("entretien");
}

export async function addDepense(data) {
  return addRecord("depenses", data);
}
export async function updateDepense(id, data) {
  return updateRecord("depenses", id, data);
}
export async function deleteDepense(id) {
  return deleteRecord("depenses", id);
}
export async function getDepenses() {
  return listRecords("depenses");
}

// Storage
export async function uploadFile(path, file) {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export { auth, db, storage, serverTimestamp };
