import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

// 🔹 Add Stock Movement
export const addStockMovement = async ({
  itemId,
  itemName,
  type, // "IN" | "OUT"
  quantity,
  referenceType,
  referenceId,
  currency,
  date,
}) => {
  await addDoc(collection(db, "stockMovements"), {
    itemId,
    itemName,
    type,
    quantity: Number(quantity),
    referenceType,
    referenceId,
    currency,
    date,
    createdAt: new Date(),
  });
};

// 🔹 Get Current Stock for One Item
export const getItemStock = async (itemId, currency) => {
  const q = query(
    collection(db, "stockMovements"),
    where("itemId", "==", itemId),
    where("currency", "==", currency)
  );

  const snapshot = await getDocs(q);

  let totalIn = 0;
  let totalOut = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.type === "IN") totalIn += Number(data.quantity);
    if (data.type === "OUT") totalOut += Number(data.quantity);
  });

  return totalIn - totalOut;
};