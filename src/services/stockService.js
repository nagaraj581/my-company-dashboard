import { addDoc, query, where, getDocs } from "firebase/firestore";
import { userCollection } from "./userDb";

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
  await addDoc(userCollection("stockMovements"), {
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
    userCollection("stockMovements"),
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
