import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { addDoc, getDocs, deleteDoc, updateDoc, onSnapshot, query, where } from "firebase/firestore";
import { getCompanyInfo } from "../config/companyInfo";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { useCurrency } from "../context/useCurrency";
import { getCurrentUserId, userCollection, userDoc } from "../services/userDb";

const DEFAULT_UNITS = ["Nos"];

export default function Items() {
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [form, setForm] = useState({ name: "", unit: "", rate: "", category: "" });
  const [units, setUnits] = useState(DEFAULT_UNITS);
  const [newUnit, setNewUnit] = useState("");
  const [_companyInfo, setCompanyInfo] = useState(null);
  const { currency } = useCurrency();
  const [categories, setCategories] = useState([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Editing
  const [editingItem, setEditingItem] = useState(null);

  // Load items and units
useEffect(() => {
  const userId = getCurrentUserId();
  if (!userId) {
    setItems([]);
    setLoadingItems(false);
    return undefined;
  }

  const q = query(
    userCollection("items", userId),
    where("currency", "==", currency)
  );
  const unsub = onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setItems(list);
    
    // Extract unique categories
    const uniqueCategories = [...new Set(list.map(item => item.category).filter(cat => cat))];
    setCategories(uniqueCategories.sort());
    setLoadingItems(false); // 🔑 IMPORTANT
  });

  return () => unsub(); // cleanup listener on unmount
}, [currency]);  // Save to localStorage
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

// Close category dropdown on outside click
useEffect(() => {
  const handleClickOutside = (e) => {
    const categoryInput = document.querySelector('input[name="category"]');
    const categoryDropdown = document.querySelector('.category-dropdown');
    
    if (categoryInput && !categoryInput.contains(e.target) && categoryDropdown && !categoryDropdown.contains(e.target)) {
      setShowCategoryDropdown(false);
    }
  };
  
  window.addEventListener("click", handleClickOutside);
  return () => window.removeEventListener("click", handleClickOutside);
}, []);  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

const handleAdd = async () => {
  if (!form.name.trim()) return alert("Item name is required");
  const userId = getCurrentUserId();
  if (!userId) return alert("You must be signed in");

  const newItem = {
    name: form.name,
    unit: form.unit,
    rate: form.rate,
    category: form.category,
    currency,
  };

  const docRef = await addDoc(userCollection("items", userId), newItem);
  setItems([...items, { id: docRef.id, ...newItem }]);
  setForm({ name: "", unit: "", rate: "", category: "" });
};

// 🔹 Add new unit
const handleAddUnit = async () => {
  const trimmed = newUnit.trim().toLowerCase();
  if (!trimmed) return alert("Please enter a valid unit");
  if (units.includes(trimmed)) return alert("Unit already exists");
  const userId = getCurrentUserId();
  if (!userId) return alert("You must be signed in");

  try {
    await addDoc(userCollection("units", userId), { name: trimmed });
    setNewUnit("");
    alert(`✅ Unit "${trimmed}" added successfully!`);
  } catch (err) {
    console.error("Error adding unit:", err);
    alert("❌ Failed to add unit!");
  }
};
// 🔹 Clean up unused unit (auto-remove when no items use it)
const cleanupUnusedUnits = async (unitName) => {
  const userId = getCurrentUserId();
  if (!userId) return;

  const itemsSnapshot = await getDocs(
    query(
      userCollection("items", userId),
      where("unit", "==", unitName)
    )
  );
  if (itemsSnapshot.empty) {
    const unitsSnapshot = await getDocs(
      query(userCollection("units", userId), where("name", "==", unitName))
    );
    if (!unitsSnapshot.empty) {
      await deleteDoc(userDoc("units", unitsSnapshot.docs[0].id, userId));
      console.log(`🧹 Cleaned up unused unit: ${unitName}`);
    }
  }
};

// 🔹 Delete item + cleanup its unit if unused
const handleDeleteItem = async (itemId, itemUnit) => {
  if (!window.confirm("Are you sure you want to delete this item?")) return;
  try {
    await deleteDoc(userDoc("items", itemId));
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
  const ref = userDoc("items", editingItem.id);
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
  const userId = getCurrentUserId();
  if (!userId) return alert("You must be signed in");

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
      currency,
    }));

    // ✅ Add all items to Firestore
    const addedItems = await Promise.all(
      formatted.map(async (item) => {
        const docRef = await addDoc(userCollection("items", userId), item);
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

  const rows = items.map((item) => {
    const row = { ...item };
    delete row.id;
    return row;
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Items");
  XLSX.writeFile(wb, "items_export.xlsx");
};


  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent mb-2 flex items-center gap-2">
          📋 Manage Items
        </h2>
        <p className="text-slate-600 dark:text-slate-400">Create, update and organize your inventory items</p>
      </div>

      {/* Add Item Form */}
      <div className="bg-white/90 dark:bg-slate-900/75 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Add New Item</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Item Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Enter item name"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 transition-all"
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Unit</label>
            <select
              name="unit"
              value={form.unit}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 transition-all"
            >
              <option value="">Select unit</option>
              {units.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Rate */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Rate</label>
            <input
              name="rate"
              value={form.rate}
              onChange={handleChange}
              placeholder="0.00"
              type="number"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 transition-all"
            />
          </div>

          {/* Category */}
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 uppercase tracking-wide">Category</label>
            <input
              name="category"
              value={form.category}
              onChange={(e) => {
                setForm({ ...form, category: e.target.value });
                setShowCategoryDropdown(true);
              }}
              onFocus={() => setShowCategoryDropdown(true)}
              placeholder="Select or create"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 transition-all"
            />
            
            {showCategoryDropdown && categories.length > 0 && (
              <div className="category-dropdown absolute z-20 mt-1 w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg max-h-40 overflow-auto">
                {categories
                  .filter((cat) =>
                    cat.toLowerCase().includes(form.category.toLowerCase())
                  )
                  .map((cat) => (
                    <div
                      key={cat}
                      onClick={() => {
                        setForm({ ...form, category: cat });
                        setShowCategoryDropdown(false);
                      }}
                      className="px-4 py-2 cursor-pointer hover:bg-sky-100 dark:hover:bg-slate-600 text-sm dark:text-white transition-colors"
                    >
                      {cat}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Add Item Button */}
        <button
          onClick={handleAdd}
          className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white px-6 py-3 rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
        >
          ➕ Add Item
        </button>
      </div>

      {/* New Unit Section */}
      <div className="bg-white/90 dark:bg-slate-900/75 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Add New Unit</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            placeholder="Enter new unit (e.g., cft, Kgs, Ltrs)"
            className="flex-1 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-green-500 transition-all"
          />
          <button
            onClick={handleAddUnit}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 whitespace-nowrap"
          >
            ➕ Add Unit
          </button>
        </div>
      </div>

      {/* Import/Export Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-6 py-4 rounded-lg cursor-pointer shadow-lg hover:shadow-xl transition-all duration-200 font-semibold flex items-center gap-2 justify-center">
          📤 Import from Excel
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
        
        <button
          onClick={handleExport}
          className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white px-6 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 font-semibold flex items-center gap-2 justify-center"
        >
          📥 Export to Excel
        </button>
      </div>

      {/* Items Table */}
      <div className="bg-white/90 dark:bg-slate-900/75 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-lg overflow-hidden">
        {loadingItems ? (
          <div className="p-8">
            <SkeletonLoader rows={5} variant="table" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 px-4">
            <p className="text-slate-500 dark:text-slate-400 text-lg">📭 No items yet. Create your first item to get started!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white">
                  <th className="px-6 py-4 text-left text-sm font-semibold">Item Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Unit</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Rate</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Category</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {items.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800 dark:text-white">{i.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      <span className="bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-3 py-1 rounded-full text-xs font-semibold">
                        {i.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-sky-600 dark:text-sky-400">{i.rate}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {i.category ? (
                        <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-xs font-semibold">
                          {i.category}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(i)}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteItem(i.id, i.unit)}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500 mt-6 italic">
        💡 Saved items and units will appear automatically in Quotation, Invoice, and Material Request.
      </p>



      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white/95 dark:bg-slate-900/90 p-6 rounded-2xl shadow-2xl w-96 border border-slate-200 dark:border-slate-700">
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
