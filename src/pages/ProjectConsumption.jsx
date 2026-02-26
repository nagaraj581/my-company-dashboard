import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  getDocs
} from "firebase/firestore";
import { db } from "../firebase";
import { useCurrency } from "../context/CurrencyContext";
import { addStockMovement } from "../services/stockService";

export default function ProjectConsumption() {
  const { currency } = useCurrency();

  const [projects, setProjects] = useState([]);
  const [items, setItems] = useState([]);
  const [stocks, setStocks] = useState({});
  const [rows, setRows] = useState([
    { itemId: "", itemName: "", unit: "", quantity: "" }
  ]);

  const [form, setForm] = useState({
    projectId: "",
    date: new Date().toISOString().split("T")[0],
    notes: ""
  });

  // Load projects
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "projects"), (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // Load items
  useEffect(() => {
    const q = query(
      collection(db, "items"),
      where("currency", "==", currency)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [currency]);

  // Load stock (optimized)
  useEffect(() => {
    const loadStock = async () => {
      const q = query(
        collection(db, "stockMovements"),
        where("currency", "==", currency)
      );
      const snapshot = await getDocs(q);

      const stockMap = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        if (!stockMap[data.itemId]) stockMap[data.itemId] = 0;

        if (data.type === "IN") stockMap[data.itemId] += Number(data.quantity);
        if (data.type === "OUT") stockMap[data.itemId] -= Number(data.quantity);
      });

      setStocks(stockMap);
    };

    loadStock();
  }, [currency]);

  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;

    if (field === "itemId") {
      const selected = items.find(i => i.id === value);
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
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!form.projectId) return alert("Select project");

    const validRows = rows.filter(r => r.itemId && Number(r.quantity) > 0);
    if (validRows.length === 0) return alert("Add valid items");

    // Show warning if insufficient stock
    let warning = false;

    validRows.forEach(row => {
      const currentStock = stocks[row.itemId] || 0;
      if (Number(row.quantity) > currentStock) {
        warning = true;
      }
    });

    if (warning) {
      const proceed = window.confirm(
        "⚠ Some items exceed available stock. Continue anyway?"
      );
      if (!proceed) return;
    }

    // Save consumption record
    const consumptionRef = await addDoc(
      collection(db, "projectConsumptions"),
      {
        projectId: form.projectId,
        currency,
        date: form.date,
        items: validRows,
        notes: form.notes,
        createdAt: new Date()
      }
    );

    // Create stock OUT entries
    for (const row of validRows) {
      await addStockMovement({
        itemId: row.itemId,
        itemName: row.itemName,
        type: "OUT",
        quantity: row.quantity,
        referenceType: "PROJECT",
        referenceId: consumptionRef.id,
        currency,
        date: form.date
      });
    }

    alert("✅ Stock used successfully");

    setRows([{ itemId: "", itemName: "", unit: "", quantity: "" }]);
  };

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
        🏗 Project Consumption
      </h2>

      <div className="bg-white p-6 rounded-xl shadow-md space-y-4">

        <select
          value={form.projectId}
          onChange={(e) => setForm({ ...form, projectId: e.target.value })}
          className="p-3 border rounded w-full"
        >
          <option value="">Select Project</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {rows.map((row, index) => {
          const currentStock = stocks[row.itemId] || 0;

          return (
            <div key={index} className="grid grid-cols-4 gap-3 items-center">
              <select
                value={row.itemId}
                onChange={(e) =>
                  handleRowChange(index, "itemId", e.target.value)
                }
                className="p-3 border rounded"
              >
                <option value="">Select Item</option>
                {items.map(i => (
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
                onChange={(e) =>
                  handleRowChange(index, "quantity", e.target.value)
                }
                className="p-3 border rounded"
              />

              <div className="text-sm">
                Stock: {currentStock}
                {row.quantity && Number(row.quantity) > currentStock && (
                  <div className="text-red-600 font-semibold">
                    ⚠ Insufficient
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <button
          onClick={addRow}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          ➕ Add Row
        </button>

        <button
          onClick={handleSave}
          className="w-full bg-red-600 text-white py-3 rounded font-semibold"
        >
          💾 Save Usage
        </button>
      </div>
    </div>
  );
}