// src/services/companyUpiService.js
import {
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { userDoc, userSubcollection, userSubdoc } from "./userDb";

/**
 * Manage UPI entries under companies/{companyId}/upis
 */

function upisCol(companyId) {
  return userSubcollection("companies", companyId, "upis");
}

export async function getUpis(companyId) {
  if (!companyId) return [];
  const q = query(upisCol(companyId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUpi(companyId, upiId) {
  if (!companyId || !upiId) return null;
  const ref = userSubdoc("companies", companyId, "upis", upiId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function addUpi(companyId, payload) {
  if (!companyId) throw new Error("companyId required");
  const col = upisCol(companyId);
  // add server timestamp
  const docRef = await addDoc(col, {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateUpi(companyId, upiDocId, payload) {
  if (!companyId || !upiDocId) throw new Error("companyId & upiDocId required");
  const ref = userSubdoc("companies", companyId, "upis", upiDocId);
  await updateDoc(ref, { ...payload, updatedAt: serverTimestamp() });
}

export async function deleteUpi(companyId, upiDocId) {
  if (!companyId || !upiDocId) throw new Error("companyId & upiDocId required");
  await deleteDoc(userSubdoc("companies", companyId, "upis", upiDocId));
}

// set company default upi id in company doc
export async function setCompanyDefaultUpi(companyId, upiDocId) {
  const ref = userDoc("companies", companyId);
  await setDoc(ref, { defaultUpiId: upiDocId }, { merge: true });
}
