import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { onSnapshot } from "firebase/firestore";
import { getCompanyInfo } from "../config/companyInfo";
import {
  query,
  where,
} from "firebase/firestore";


export default function Items() {
  const defaultUnits = ["Nos"];
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", unit: "", rate: "", category: "" });
  const [units, setUnits] = useState(defaultUnits);
  const [newUnit, setNewUnit] = useState("");
  const [companyInfo, setCompanyInfo] = useState(null);

  // Editing
  const [editingItem, setEditingItem] = useState(null);

  // Load items and units
useEffect(() => {
  const unsub = onSnapshot(collection(db, "items"), (snapshot) => {
    const list = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setItems(list);
  });

  return () => unsub(); // cleanup listener on unmount
}, []);  // Save to localStorage
// Load company info
useEffect(() => {
  let mounted = true;
  (async () => {
    try {
      const info = await getCompanyInfo();
      if (mounted) setCompanyInfo(info);
    } catch (e) {
      console.error('Failed to load company info', e);
    }
  })();
  return () => (mounted = false);
}, []);
  useEffect(() => localStorage.setItem("items", JSON.stringify(items)), [items]);
// 🔹 Load units in real-time from Firestore
useEffect(() => {
  const unsub = onSnapshot(collection(db, "units"), (snapshot) => {
    const firestoreUnits = snapshot.docs.map((doc) => doc.data().name);
    setUnits([...new Set([...defaultUnits, ...firestoreUnits])]);
  });
  return () => unsub();
}, []);  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

const handleAdd = async () => {
  if (!form.name.trim()) return alert("Item name is required");

  const newItem = {
    name: form.name,
    unit: form.unit,
    rate: form.rate,
    category: form.category,
  };

  const docRef = await addDoc(collection(db, "items"), newItem);
  setItems([...items, { id: docRef.id, ...newItem }]);
  setForm({ name: "", unit: "", rate: "", category: "" });
};

const handleDelete = async (id) => {
  if (window.confirm("Are you sure you want to delete this item?")) {
    await deleteDoc(doc(db, "items", id));
    setItems(items.filter((i) => i.id !== id));
  }
};

// 🔹 Add new unit
const handleAddUnit = async () => {
  const trimmed = newUnit.trim().toLowerCase();
  if (!trimmed) return alert("Please enter a valid unit");
  if (units.includes(trimmed)) return alert("Unit already exists");

  try {
    await addDoc(collection(db, "units"), { name: trimmed });
    setNewUnit("");
    alert(`✅ Unit "${trimmed}" added successfully!`);
  } catch (err) {
    console.error("Error adding unit:", err);
    alert("❌ Failed to add unit!");
  }
};
// 🔹 Clean up unused unit (auto-remove when no items use it)
const cleanupUnusedUnits = async (unitName) => {
  const itemsSnapshot = await getDocs(query(collection(db, "items"), where("unit", "==", unitName)));
  if (itemsSnapshot.empty) {
    const unitsSnapshot = await getDocs(query(collection(db, "units"), where("name", "==", unitName)));
    if (!unitsSnapshot.empty) {
      await deleteDoc(doc(db, "units", unitsSnapshot.docs[0].id));
      console.log(`🧹 Cleaned up unused unit: ${unitName}`);
    }
  }
};

// 🔹 Delete item + cleanup its unit if unused
const handleDeleteItem = async (itemId, itemUnit) => {
  if (!window.confirm("Are you sure you want to delete this item?")) return;
  try {
    await deleteDoc(doc(db, "items", itemId));
    await cleanupUnusedUnits(itemUnit);
    alert("🗑️ Item deleted successfully!");
  } catch (err) {
    console.error("Delete error:", err);
    alert("❌ Failed to delete item!");
  }
};
  // --- Edit Item ---
  const handleEdit = (item) => setEditingItem({ ...item });
  const handleEditChange = (e) =>
    setEditingItem({ ...editingItem, [e.target.name]: e.target.value });
const handleSaveEdit = async () => {
  const ref = doc(db, "items", editingItem.id);
  await updateDoc(ref, {
    name: editingItem.name,
    unit: editingItem.unit,
    rate: editingItem.rate,
    category: editingItem.category,
  });
  setItems(items.map((i) => (i.id === editingItem.id ? editingItem : i)));
  setEditingItem(null);
};

  // --- Import from Excel ---
const handleFileUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (evt) => {
    const data = new Uint8Array(evt.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const imported = XLSX.utils.sheet_to_json(sheet);

    const formatted = imported.map((row) => ({
      name: row.name?.toString().trim() || "",
      unit: row.unit?.toString().trim() || "",
      rate: row.rate?.toString().trim() || "",
      category: row.category?.toString().trim() || "",
    }));

    // ✅ Add all items to Firestore
    const addedItems = await Promise.all(
      formatted.map(async (item) => {
        const docRef = await addDoc(collection(db, "items"), item);
        return { id: docRef.id, ...item };
      })
    );

    // ✅ Update local UI immediately (optimistic update)
    setItems((prev) => [...prev, ...addedItems]);

    alert(`✅ ${formatted.length} items imported successfully!`);
  };

  reader.readAsArrayBuffer(file);
};
const handleExport = () => {
  if (items.length === 0) return alert("No items to export");

  const ws = XLSX.utils.json_to_sheet(items.map(({ id, ...rest }) => rest));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Items");
  XLSX.writeFile(wb, "items_export.xlsx");
};


  return (
    <div className="p-8 min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      <h2 className="text-2xl font-bold text-blue-700 mb-6 flex items-center gap-2">
        📋 Manage Items
      </h2>

      {/* Add form */}
{/* Add form */}
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4 mb-6">
  {/* Item name */}
  <input
    name="name"
    value={form.name}
    onChange={handleChange}
    placeholder="Item name"
    className="p-3 border rounded-lg w-full"
  />

  {/* Unit dropdown */}
  <select
    name="unit"
    value={form.unit}
    onChange={handleChange}
    className="p-3 border rounded-lg w-full"
  >
    <option value="">Select unit</option>
    {units.map((u) => (
      <option key={u} value={u}>
        {u}
      </option>
    ))}
  </select>

  {/* New unit + add button */}
  <div className="flex gap-2 col-span-1 md:col-span-2 xl:col-span-2">
    <input
      type="text"
      placeholder="New unit"
      value={newUnit}
      onChange={(e) => setNewUnit(e.target.value)}
      className="p-3 border rounded-lg flex-1"
    />
    <button
      onClick={handleAddUnit}
      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow transition shrink-0"
    >
      +
    </button>
  </div>

  {/* Rate */}
  <input
    name="rate"
    value={form.rate}
    onChange={handleChange}
    placeholder="Rate"
    type="number"
    className="p-3 border rounded-lg w-full"
  />

  {/* Category */}
  <input
    name="category"
    value={form.category}
    onChange={handleChange}
    placeholder="Category (optional)"
    className="p-3 border rounded-lg w-full"
  />
  

  {/* Add button */}
  <button
    onClick={handleAdd}
    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold w-full"
  >
    ➕ Add Item
  </button>
</div>
<div className="flex gap-2 mt-4">
  <input
    type="text"
    value={newUnit}
    onChange={(e) => setNewUnit(e.target.value)}
    placeholder="Enter new unit"
    className="p-3 border rounded-lg w-full"
  />
  <button
    onClick={handleAddUnit}
    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
  >
    ➕ Add Unit
  </button>
</div>


      {/* Import Button */}
      <div className="flex items-center gap-3 mb-6">
        <label className="bg-gray-200 px-4 py-2 rounded-lg cursor-pointer hover:bg-gray-300">
          📤 Import from Excel
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
        <span className="text-sm text-gray-500">Supported: .xlsx, .xls, .csv</span>
      </div>
      <button
  onClick={handleExport}
  className="bg-blue-200 hover:bg-blue-300 text-blue-800 px-4 py-2 rounded-lg shadow transition"
>
  📤 Export to Excel
</button>


      {/* Items table */}
      <div className="mt-8 overflow-x-auto">
        {items.length === 0 ? (
          <p className="text-gray-500 mt-4">No items saved yet.</p>
        ) : (
          <table className="w-full border-collapse rounded-lg overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-blue-100">
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-left">Unit</th>
                <th className="p-2 text-left">Rate</th>
                <th className="p-2 text-left">Category</th>
                <th className="p-2 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b hover:bg-blue-50">
                  <td className="p-2">{i.name}</td>
                  <td className="p-2">{i.unit}</td>
                  <td className="p-2">{i.rate}</td>
                  <td className="p-2">{i.category}</td>
                  <td className="p-2 flex gap-3">
                    <button
                      onClick={() => handleEdit(i)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(i.id)}
                      className="text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-sm text-gray-500 mt-6 italic">
        💡 Saved items and units will appear automatically in Quotation, Invoice, and Material Request.
      </p>

<footer className="text-center text-gray-600 mt-20 text-sm">
  © {new Date().getFullYear()} {companyInfo?.name || "My Company LTD"} — All rights reserved.
</footer>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded-xl shadow-xl w-96">
            <h3 className="text-lg font-semibold mb-4 text-blue-700">✏️ Edit Item</h3>
            <input
              name="name"
              value={editingItem.name}
              onChange={handleEditChange}
              placeholder="Item name"
              className="p-2 border rounded w-full mb-2"
            />
            <input
              name="unit"
              value={editingItem.unit}
              onChange={handleEditChange}
              placeholder="Unit"
              className="p-2 border rounded w-full mb-2"
            />
            <input
              name="rate"
              value={editingItem.rate}
              onChange={handleEditChange}
              placeholder="Rate"
              type="number"
              className="p-2 border rounded w-full mb-2"
            />
            <input
              name="category"
              value={editingItem.category}
              onChange={handleEditChange}
              placeholder="Category"
              className="p-2 border rounded w-full mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
