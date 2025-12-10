import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export function useUnits() {
  const defaultUnits = ["pcs", "kg", "litre", "box", "meter", "bundle"];
  const [units, setUnits] = useState(defaultUnits);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "units"), (snapshot) => {
      const firestoreUnits = snapshot.docs.map((doc) => doc.data().name);
      setUnits([...new Set([...defaultUnits, ...firestoreUnits])]);
    });
    return () => unsub();
  }, []);

  return units;
}
