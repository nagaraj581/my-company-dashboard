import { collection, doc } from "firebase/firestore";
import { auth, db } from "../firebase";

export function getCurrentUserId() {
  return auth.currentUser?.uid || null;
}

export function requireCurrentUserId() {
  const uid = getCurrentUserId();
  if (!uid) {
    throw new Error("User must be signed in");
  }
  return uid;
}

export function userCollection(name, uid = requireCurrentUserId()) {
  return collection(db, "users", uid, name);
}

export function userDoc(name, id, uid = requireCurrentUserId()) {
  return doc(db, "users", uid, name, id);
}

export function userSubcollection(name, id, childName, uid = requireCurrentUserId()) {
  return collection(db, "users", uid, name, id, childName);
}

export function userSubdoc(name, id, childName, childId, uid = requireCurrentUserId()) {
  return doc(db, "users", uid, name, id, childName, childId);
}

export function userSettingDoc(id, uid = requireCurrentUserId()) {
  return doc(db, "users", uid, "settings", id);
}
