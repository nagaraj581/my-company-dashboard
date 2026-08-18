import { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";
import { getCurrentUserId, userCollection } from "../services/userDb";

const DEFAULT_UNITS = ["pcs", "kg", "litre", "box", "meter", "bundle"];

export function useUnits() {
  const [units, setUnits] = useState(DEFAULT_UNITS);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      setUnits(DEFAULT_UNITS);
      return undefined;
    }

    const unsub = onSnapshot(userCollection("units", userId), (snapshot) => {
      const firestoreUnits = snapshot.docs.map((doc) => doc.data().name);
      setUnits([...new Set([...DEFAULT_UNITS, ...firestoreUnits])]);
    });
    return () => unsub();
  }, []);

  return units;
}
