// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAuQYxyHYOY9BtyVyvP6b21SEMhUY2y5ok",
  authDomain: "my-company-95a6f.firebaseapp.com",
  projectId: "my-company-95a6f",
  storageBucket: "my-company-95a6f.appspot.com", // ✅ Correct format
  messagingSenderId: "923000956865",
  appId: "1:923000956865:web:5d3694f36822ef4f12b140",
  measurementId: "G-HNF5RP4FXB",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
