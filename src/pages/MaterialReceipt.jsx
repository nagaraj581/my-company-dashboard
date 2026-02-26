import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  addDoc
} from "firebase/firestore";

import { addStockMovement } from "../services/stockService";
import { db } from "../firebase";
import { useCurrency } from "../context/CurrencyContext";

export default function MaterialReceipt() {
  const { currency } = useCurrency();
  const [items, setItems] = useState([]);
  const [rows, setRows] = useState([
    { itemId: "", itemName: "", unit: "", quantity: "" },
  ]);

  const [form, setForm] = useState({
    supplier: "",
    grnNumber: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // Load items (currency filtered)
  useEffect(() => {
    const q = query(
      collection(db, "items"),
      where("currency", "==", currency)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setItems(list);
    });

    return () => unsub();
  }, [currency]);

  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;

    if (field === "itemId") {
      const selected = items.find((i) => i.id === value);
      if (selected) {
        updated[index].itemName = selected.name;
        updated[index].unit = selected.unit;
      }
    }

    setRows(updated);
  };

  const addRow = () => {
    setRows([...rows, { itemId: "", itemName: "", unit: "", quantity: "" }]);
  };

  const removeRow = (index) => {
    const updated = rows.filter((_, i) => i !== index);
    setRows(updated);
  };

  const handleSave = async () => {
  if (!form.supplier.trim()) return alert("Supplier is required");
  if (!form.grnNumber.trim()) return alert("GRN Number is required");

  const validRows = rows.filter(
    (r) => r.itemId && Number(r.quantity) > 0
  );

  if (validRows.length === 0)
    return alert("Add at least one valid item");

  // 🔍 Check duplicate GRN (per currency)
  const duplicateQuery = query(
    collection(db, "materialReceipts"),
    where("grnNumber", "==", form.grnNumber),
    where("currency", "==", currency)
  );

  const duplicateSnapshot = await getDocs(duplicateQuery);

  if (!duplicateSnapshot.empty) {
    return alert("❌ GRN Number already exists!");
  }

  try {
    // 💾 Save receipt
    const receiptRef = await addDoc(
      collection(db, "materialReceipts"),
      {
        supplier: form.supplier,
        grnNumber: form.grnNumber,
        date: form.date,
        currency,
        items: validRows,
        notes: form.notes,
        createdAt: new Date(),
      }
    );

    // 📦 Create stock movements
    for (const row of validRows) {
      await addStockMovement({
        itemId: row.itemId,
        itemName: row.itemName,
        type: "IN",
        quantity: row.quantity,
        referenceType: "PURCHASE",
        referenceId: receiptRef.id,
        currency,
        date: form.date,
      });
    }

    alert("✅ Receipt saved successfully!");

    // 🔄 Reset form
    setForm({
      supplier: "",
      grnNumber: "",
      date: new Date().toISOString().split("T")[0],
      notes: "",
    });

    setRows([{ itemId: "", itemName: "", unit: "", quantity: "" }]);

  } catch (error) {
    console.error(error);
    alert("❌ Failed to save receipt");
  }
};

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
        ?? Material Receipt (GRN)
      </h2>

      <div className="bg-white p-6 rounded-xl shadow-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            placeholder="Supplier Name"
            value={form.supplier}
            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            className="p-3 border rounded"
          />
          <input
            placeholder="GRN Number"
            value={form.grnNumber}
            onChange={(e) => setForm({ ...form, grnNumber: e.target.value })}
            className="p-3 border rounded"
          />
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="p-3 border rounded"
          />
        </div>

        {/* Items Table */}
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
              <select
                value={row.itemId}
                onChange={(e) => handleRowChange(index, "itemId", e.target.value)}
                className="p-3 border rounded"
              >
                <option value="">Select Item</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>

              <input
                value={row.unit}
                disabled
                className="p-3 border rounded bg-gray-100"
              />

              <input
                type="number"
                placeholder="Quantity"
                value={row.quantity}
                onChange={(e) => handleRowChange(index, "quantity", e.target.value)}
                className="p-3 border rounded"
              />

              <button
                onClick={() => removeRow(index)}
                className="bg-red-500 text-white p-2 rounded"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addRow}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          ? Add Row
        </button>

        <textarea
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full p-3 border rounded"
        />

        <button
  onClick={handleSave}
  className="w-full bg-green-600 text-white py-3 rounded font-semibold"
>
  💾 Save Receipt
</button>
      </div>
    </div>
  );
}
