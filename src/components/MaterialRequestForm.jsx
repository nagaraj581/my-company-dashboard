import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { getCompanyInfo } from "../config/companyInfo";
import { useUnits } from "../hooks/useUnits";


export default function MaterialRequestForm() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [requests, setRequests] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [unit, setUnit] = useState("");
  const units = useUnits();




  // Fetch master items
  useEffect(() => {
    const fetchItems = async () => {
      const querySnapshot = await getDocs(collection(db, "items"));
      setItems(querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchItems();
  }, []);

  // Live updates for material requests
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "materialRequests"), (snapshot) => {
      const reqs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRequests(reqs.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
    });
    return () => unsub();
  }, []);

  // Fetch company info
  useEffect(() => {
    (async () => {
      try {
        const info = await getCompanyInfo();
        setCompanyInfo(info);
      } catch (e) {
        console.error("Company info error:", e);
      }
    })();
  }, []);

  // Add new item (supports custom name)
const handleAddItem = () => {
  if (!selectedItem || !quantity || !unit)
    return alert("Please enter item, quantity, and unit.");

  // Check if item exists in the master list
  const existingItem = items.find(
    (i) => i.name.toLowerCase() === selectedItem.toLowerCase()
  );

  const newItem = existingItem
    ? { id: existingItem.id, name: existingItem.name, unit: existingItem.unit, quantity }
    : { id: Date.now().toString(), name: selectedItem, unit, quantity }; // ✅ allow custom items

  setSelectedItems([...selectedItems, newItem]);
  setSelectedItem("");
  setQuantity("");
  setUnit("");
};

  // Edit an individual item inline
  const handleEditItem = (index) => setEditingItemIndex(index);
  const handleDeleteItem = (index) => {
    if (!window.confirm("Delete this item?")) return;
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleSaveItem = (index, updatedItem) => {
    const updatedItems = [...selectedItems];
    updatedItems[index] = updatedItem;
    setSelectedItems(updatedItems);
    setEditingItemIndex(null);
  };

  // Save or update the full request
  const handleSubmitRequest = async () => {
    if (!projectName.trim()) return alert("Enter project/site name");
    if (selectedItems.length === 0) return alert("Add at least one item");

    setSubmitting(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "materialRequests", editingId), {
          project: projectName.trim(),
          items: selectedItems,
        });
        alert("✅ Request updated successfully!");
      } else {
        await addDoc(collection(db, "materialRequests"), {
          project: projectName.trim(),
          items: selectedItems,
          createdAt: Timestamp.now(),
        });
        alert("✅ Request saved successfully!");
      }

      setEditingId(null);
      setSelectedItems([]);
      setProjectName("");
    } catch (err) {
      console.error("Error saving:", err);
      alert("❌ Failed to save!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (req) => {
    if (!window.confirm(`Edit request "${req.project}"?`)) return;
    setEditingId(req.id);
    setProjectName(req.project);
    setSelectedItems(req.items);
  };

  const handleDelete = async (id, project) => {
    if (!window.confirm(`Are you sure you want to delete "${project}"?`)) return;
    try {
      await deleteDoc(doc(db, "materialRequests", id));
      alert("🗑️ Request deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      alert("❌ Failed to delete request!");
    }
  };

  const handleExportPDF = (req) => {
    const docPdf = new jsPDF();
    docPdf.setFontSize(14);
    docPdf.text(companyInfo?.name || "", 45, 20);
    docPdf.setFontSize(10);
    docPdf.text(companyInfo?.address || "", 45, 26);
    docPdf.text(
      `Phone: ${companyInfo?.phone || ""} | Email: ${companyInfo?.email || ""}`,
      45,
      32
    );
    docPdf.setFontSize(16);
    docPdf.text("MATERIAL REQUEST", 14, 45);
    docPdf.setFontSize(12);
    docPdf.text(`Project: ${req.project}`, 14, 55);
    docPdf.text(
      `Date: ${
        req.createdAt
          ? req.createdAt.toDate().toLocaleDateString("en-IN")
          : "-"
      }`,
      14,
      62
    );
    const tableData = req.items.map((i, idx) => [
      idx + 1,
      i.name,
      i.quantity,
      i.unit,
    ]);
    docPdf.autoTable({
      startY: 70,
      head: [["#", "Item", "Quantity", "Unit"]],
      body: tableData,
      styles: { fontSize: 11 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    docPdf.save(`${req.project.replace(/\s+/g, "_")}_MaterialRequest.pdf`);
  };

  return (
    <div className="p-8 min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      <h2 className="text-2xl font-bold text-blue-700 mb-6 flex items-center gap-2">
        📦 Material Request
      </h2>

      {/* Project Name */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Enter project / site name"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="p-3 border rounded-lg w-full"
        />
      </div>

      {/* Item Input */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-4">
  {/* Item input with datalist */}
{/* Item name input with auto-fill for unit */}
<input
  type="text"
  list="itemList"
  value={selectedItem}
  onChange={(e) => {
    const val = e.target.value;
    setSelectedItem(val);

    // Auto-fill unit if item exists in master list
    const existing = items.find(
      (i) => i.name.toLowerCase() === val.toLowerCase()
    );
    if (existing) {
      setUnit(existing.unit);
    } else {
      setUnit(""); // Clear unit for custom items
    }
  }}
  placeholder="Item name (type or select)"
  className="p-3 border rounded-lg w-full"
/>

<datalist id="itemList">
  {items.map((i) => (
    <option key={i.id} value={i.name} />
  ))}
</datalist>

  {/* Quantity input */}
  <input
    type="number"
    value={quantity}
    onChange={(e) => setQuantity(e.target.value)}
    placeholder="Quantity"
    className="p-3 border rounded-lg w-full"
  />

  {/* ✅ Unit input */}
<select
  value={unit}
  onChange={(e) => setUnit(e.target.value)}
  className="p-3 border rounded-lg w-full"
>
  <option value="">Select Unit</option>
  {units.map((u, i) => (
    <option key={i} value={u}>
      {u}
    </option>
  ))}
</select>

  {/* Add Item button */}
  <button
    onClick={handleAddItem}
    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-3 rounded-lg shadow transition sm:col-span-1"
  >
    ➕ Add Item
  </button>
</div>

      {/* Item Table */}
      {selectedItems.length > 0 && (
        <div className="mb-6 overflow-x-auto">
          <table className="w-full border-collapse rounded-lg overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-blue-100">
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-left">Quantity</th>
                <th className="p-2 text-left">Unit</th>
                <th className="p-2 text-center">Actions</th>
              </tr>
            </thead>
<tbody>
  {selectedItems.map((i, index) =>
    editingItemIndex === index ? (
      <tr key={index} className="border-b bg-yellow-50">
        <td className="p-2">
          <input
            value={i.name}
            onChange={(e) => {
              const updated = [...selectedItems];
              updated[index].name = e.target.value;
              setSelectedItems(updated);
            }}
            className="border p-1 w-full"
          />
        </td>
        <td className="p-2">
          <input
            type="number"
            value={i.quantity}
            onChange={(e) => {
              const updated = [...selectedItems];
              updated[index].quantity = e.target.value;
              setSelectedItems(updated);
            }}
            className="border p-1 w-full"
          />
        </td>
        <td className="p-2">
          <input
            value={i.unit}
            onChange={(e) => {
              const updated = [...selectedItems];
              updated[index].unit = e.target.value;
              setSelectedItems(updated);
            }}
            className="border p-1 w-full"
          />
        </td>
        <td className="p-2 text-center space-x-2">
          <button
            onClick={() => setEditingItemIndex(null)}
            className="bg-green-600 text-white px-2 py-1 rounded"
          >
            ✅ Save
          </button>
          <button
            onClick={() => setEditingItemIndex(null)}
            className="bg-gray-400 text-white px-2 py-1 rounded"
          >
            Cancel
          </button>
        </td>
      </tr>
    ) : (
      <tr key={index} className="border-b hover:bg-blue-50">
        <td className="p-2">{i.name}</td>
        <td className="p-2">{i.quantity}</td>
        <td className="p-2">{i.unit}</td>
        <td className="p-2 text-center space-x-2">
          <button
            onClick={() => setEditingItemIndex(index)}
            className="bg-blue-500 text-white px-2 py-1 rounded"
          >
            ✏️
          </button>
          <button
            onClick={() => handleDeleteItem(index)}
            className="bg-red-500 text-white px-2 py-1 rounded"
          >
            🗑
          </button>
        </td>
      </tr>
    )
  )}
</tbody>
          </table>
        </div>
      )}

      <button
        onClick={handleSubmitRequest}
        disabled={submitting}
        className={`${
          editingId
            ? "bg-orange-500 hover:bg-orange-600"
            : "bg-blue-600 hover:bg-blue-700"
        } text-white px-6 py-3 rounded-lg shadow font-semibold transition`}
      >
        {submitting
          ? "Saving..."
          : editingId
          ? "✏️ Update Material Request"
          : "💾 Save Material Request"}
      </button>

      {/* Saved Requests */}
      <div className="mt-10">
        <h3 className="text-lg font-semibold text-blue-700 mb-3">
          🗂️ Saved Requests
        </h3>

        {requests.length === 0 ? (
          <p className="text-gray-500">No requests saved yet.</p>
        ) : (
          requests.map((req) => (
            <div
              key={req.id}
              className="bg-white border rounded-lg shadow-sm p-4 mb-4"
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-blue-700">📁 {req.project}</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(req)}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded-md text-sm shadow-sm"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(req.id, req.project)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm shadow-sm"
                  >
                    🗑️ Delete
                  </button>
                  <button
                    onClick={() => handleExportPDF(req)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm shadow-sm"
                  >
                    📄 Export PDF
                  </button>
                </div>
              </div>

              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="p-2 text-left">Item</th>
                    <th className="p-2 text-left">Quantity</th>
                    <th className="p-2 text-left">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {req.items.map((item, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{item.name}</td>
                      <td className="p-2">{item.quantity}</td>
                      <td className="p-2">{item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
