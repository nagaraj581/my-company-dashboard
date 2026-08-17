import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { getCurrentUserId, userCollection } from "../services/userDb";

export function useUnits() {
  const defaultUnits = ["pcs", "kg", "litre", "box", "meter", "bundle"];
  const [units, setUnits] = useState(defaultUnits);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      setUnits(defaultUnits);
      return undefined;
    }

    const unsub = onSnapshot(userCollection("units", userId), (snapshot) => {
      const firestoreUnits = snapshot.docs.map((doc) => doc.data().name);
      setUnits([...new Set([...defaultUnits, ...firestoreUnits])]);
    });
    return () => unsub();
  }, []);

  return units;
}
