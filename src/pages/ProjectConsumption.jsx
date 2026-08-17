import { useEffect, useState } from "react";
import { addDoc, getDocs, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import { AlertTriangle, ClipboardList, Plus, Save, Trash2 } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { addStockMovement } from "../services/stockService";
import { getCurrentUserId, userCollection } from "../services/userDb";

const emptyRow = { itemId: "", itemName: "", unit: "", quantity: "" };

export default function ProjectConsumption() {
  const { currency } = useCurrency();
  const [projects, setProjects] = useState([]);
  const [items, setItems] = useState([]);
  const [stocks, setStocks] = useState({});
  const [rows, setRows] = useState([emptyRow]);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    projectId: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      setProjects([]);
      return undefined;
    }

    const projectsQuery = query(
      userCollection("projects", userId),
      where("currency", "==", currency),
    );

    const unsub = onSnapshot(projectsQuery, (snapshot) => {
      const list = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setProjects(list);
    });

    return () => unsub();
  }, [currency]);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      setItems([]);
      return undefined;
    }

    const itemsQuery = query(
      userCollection("items", userId),
      where("currency", "==", currency),
    );
    const unsub = onSnapshot(itemsQuery, (snapshot) => {
      const list = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setItems(list);
    });

    return () => unsub();
  }, [currency]);

  useEffect(() => {
    const loadStock = async () => {
      const userId = getCurrentUserId();
      if (!userId) {
        setStocks({});
        return;
      }

      const snapshot = await getDocs(
        query(
          userCollection("stockMovements", userId),
          where("currency", "==", currency),
        ),
      );

      const stockMap = {};
      snapshot.forEach((doc) => {
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
    updated[index] = { ...updated[index], [field]: value };

    if (field === "itemId") {
      const selected = items.find((item) => item.id === value);
      updated[index].itemName = selected?.name || "";
      updated[index].unit = selected?.unit || "";
    }

    setRows(updated);
  };

  const addRow = () => {
    setRows((current) => [...current, emptyRow]);
  };

  const removeRow = (index) => {
    setRows((current) =>
      current.length === 1 ? current : current.filter((_, i) => i !== index),
    );
  };

  const handleSave = async () => {
    if (!form.projectId) return alert("Select project");
    const userId = getCurrentUserId();
    if (!userId) return alert("You must be signed in");

    const validRows = rows.filter((row) => row.itemId && Number(row.quantity) > 0);
    if (validRows.length === 0) return alert("Add valid items");

    const hasInsufficientStock = validRows.some((row) => {
      const currentStock = stocks[row.itemId] || 0;
      return Number(row.quantity) > currentStock;
    });

    if (hasInsufficientStock) {
      const proceed = window.confirm(
        "Some items exceed available stock. Continue anyway?",
      );
      if (!proceed) return;
    }

    try {
      setIsSaving(true);
      const consumptionRef = await addDoc(
        userCollection("projectConsumptions", userId),
        {
          projectId: form.projectId,
          currency,
          date: form.date,
          items: validRows,
          notes: form.notes.trim(),
          createdAt: serverTimestamp(),
        },
      );

      for (const row of validRows) {
        await addStockMovement({
          itemId: row.itemId,
          itemName: row.itemName,
          type: "OUT",
          quantity: row.quantity,
          referenceType: "PROJECT",
          referenceId: consumptionRef.id,
          currency,
          date: form.date,
        });
      }

      alert("Stock usage saved successfully");
      setRows([emptyRow]);
      setForm((current) => ({ ...current, notes: "" }));
    } catch (error) {
      console.error("Unable to save stock usage:", error);
      alert(`Unable to save stock usage: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="flex items-center gap-2 text-3xl font-bold bg-gradient-to-r from-rose-600 to-amber-500 bg-clip-text text-transparent">
          <ClipboardList className="text-rose-600" size={30} />
          Project Consumption
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Issue materials from inventory to active projects.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/75 space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]">
          <select
            value={form.projectId}
            onChange={(e) => setForm({ ...form, projectId: e.target.value })}
            className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
          >
            <option value="">Select Project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>

        <div className="space-y-3">
          {rows.map((row, index) => {
            const currentStock = stocks[row.itemId] || 0;
            const insufficient = row.quantity && Number(row.quantity) > currentStock;

            return (
              <div
                key={index}
                className="grid grid-cols-1 items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-700/70 dark:bg-slate-800/45 md:grid-cols-[1.4fr_0.7fr_0.9fr_1fr_auto]"
              >
                <select
                  value={row.itemId}
                  onChange={(e) => handleRowChange(index, "itemId", e.target.value)}
                  className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  <option value="">Select Item</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>

                <input
                  value={row.unit}
                  disabled
                  placeholder="Unit"
                  className="px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                />

                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Quantity"
                  value={row.quantity}
                  onChange={(e) => handleRowChange(index, "quantity", e.target.value)}
                  className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
                />

                <div
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    insufficient
                      ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                  }`}
                >
                  {insufficient && <AlertTriangle className="mr-1 inline" size={15} />}
                  Stock: {currentStock}
                </div>

                <button
                  onClick={() => removeRow(index)}
                  disabled={rows.length === 1}
                  title="Remove row"
                  className="inline-flex h-12 items-center justify-center rounded-lg bg-red-500 px-4 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={addRow}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-600"
        >
          <Plus size={17} />
          Add Row
        </button>

        <textarea
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full min-h-24 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-rose-500 outline-none"
        />

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 py-3 font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={18} />
          {isSaving ? "Saving..." : "Save Usage"}
        </button>
      </div>
    </div>
  );
}
