// src/services/companyService.js
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { getUpis } from "./companyUpiService";
import {
  getCurrentUserId,
  requireCurrentUserId,
  userCollection,
  userDoc,
  userSettingDoc,
} from "./userDb";


/**
 * Firestore helpers for companies + activeCompany setting
 */

const companiesCol = () => userCollection("companies");

export async function getCompanies() {
  const q = query(companiesCol(), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getCompany(id) {
  if (!id) return null;

  const ref = userDoc("companies", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const companyData = { id: snap.id, ...snap.data() };

  // fetch UPI list
  const upis = await getUpis(id);

  return {
    ...companyData,
    upis,
    defaultUpiId: companyData.defaultUpiId || null
  };
}


export async function saveCompany(id, data) {
  // if id provided -> merge, else use auto-id by setDoc on generated doc
  if (id) {
    const ref = userDoc("companies", id);
    await setDoc(ref, data, { merge: true });
    return id;
  } else {
    requireCurrentUserId();
    const newRef = doc(companiesCol());
    await setDoc(newRef, data);
    return newRef.id;
  }
}

export async function deleteCompany(id) {
  if (!id) throw new Error("No company id specified");
  await deleteDoc(userDoc("companies", id));
}

/* ---- Active company saved in settings/activeCompany (single document) ---- */
export async function getActiveCompanyId() {
  const uid = getCurrentUserId();
  if (!uid) return null;

  const ref = userSettingDoc("activeCompany", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().id : null;
}


export async function setActiveCompanyId(id) {
  const ref = userSettingDoc("activeCompany");

  if (id === null) {
    await deleteDoc(ref);
  } else {
    await setDoc(ref, { id });
  }

  // 🔔 notify app
  window.dispatchEvent(new Event("companyChanged"));
}


