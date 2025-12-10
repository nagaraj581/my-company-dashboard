// src/services/companyService.js
import { db } from "../firebase";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  orderBy,
  query,
} from "firebase/firestore";

/**
 * Firestore helpers for companies + activeCompany setting
 */

const companiesCol = () => collection(db, "companies");

export async function getCompanies() {
  const q = query(companiesCol(), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getCompany(id) {
  if (!id) return null;
  const ref = doc(db, "companies", id);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveCompany(id, data) {
  // if id provided -> merge, else use auto-id by setDoc on generated doc
  if (id) {
    const ref = doc(db, "companies", id);
    await setDoc(ref, data, { merge: true });
    return id;
  } else {
    // generate id with setDoc on a new doc
    const newRef = doc(companiesCol()); // auto-id
    await setDoc(newRef, data);
    return newRef.id;
  }
}

export async function deleteCompany(id) {
  if (!id) throw new Error("No company id specified");
  await deleteDoc(doc(db, "companies", id));
}

/* ---- Active company saved in settings/activeCompany (single document) ---- */
export async function getActiveCompanyId() {
  const ref = doc(db, "settings", "activeCompany");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().id : null;
}

export async function setActiveCompanyId(id) {
  if (!id) throw new Error("No company id specified");
  await setDoc(doc(db, "settings", "activeCompany"), { id });
}
