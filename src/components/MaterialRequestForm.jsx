import { useEffect, useMemo, useState } from "react";
import {
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
  query,
} from "firebase/firestore";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { getCompanyInfo } from "../config/companyInfo";
import {
  DEFAULT_DOCUMENT_STYLE_ID,
  getDocumentStyle,
} from "../config/documentStyles";
import { useUnits } from "../hooks/useUnits";
import { SkeletonLoader } from "./SkeletonLoader";
import { getCurrentUserId, userCollection, userDoc } from "../services/userDb";


export default function MaterialRequestForm() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [quantity, setQuantity] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [projectName, setProjectName] = useState("");
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [editingItemDraft, setEditingItemDraft] = useState(null);
  const [unit, setUnit] = useState("");
  const [showWoodModal, setShowWoodModal] = useState(false);
  const [woodForm, setWoodForm] = useState({
    name: "",
    length: "",
    width: "",
    thickness: "",
    pieces: "",
  });
  const [lastWoodName, setLastWoodName] = useState("");
  const units = useUnits();

  const selectedItemsTotal = useMemo(() => {
    if (selectedItems.length === 0) return null;

    const normalizedUnits = selectedItems.map((item) =>
      String(item.unit || "").trim().toLowerCase()
    );
    const firstUnit = normalizedUnits[0];
    const hasOneUnit = firstUnit && normalizedUnits.every((u) => u === firstUnit);
    if (!hasOneUnit) return null;

    let total = 0;
    for (const item of selectedItems) {
      const quantityValue = Number(item.quantity);
      if (!Number.isFinite(quantityValue)) return null;
      total += quantityValue;
    }

    return {
      unit: selectedItems[0].unit,
      quantity: Number(total.toFixed(3)),
    };
  }, [selectedItems]);




  // Fetch master items
  useEffect(() => {
    const fetchItems = async () => {
      const userId = getCurrentUserId();
      if (!userId) {
        setItems([]);
        return;
      }

      const querySnapshot = await getDocs(
        userCollection("items", userId)
      );
      setItems(querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchItems();
  }, []);

  // Live updates for material requests
  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      setRequests([]);
      setLoadingRequests(false);
      return undefined;
    }

    const requestsQuery = query(
      userCollection("materialRequests", userId)
    );
    const unsub = onSnapshot(requestsQuery, (snapshot) => {
      const reqs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRequests(reqs.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
      setLoadingRequests(false); // 🔑 IMPORTANT
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

  const woodCft = useMemo(() => {
    const length = Number(woodForm.length);
    const width = Number(woodForm.width);
    const thickness = Number(woodForm.thickness);
    const pieces = Number(woodForm.pieces);

    if (length <= 0 || width <= 0 || thickness <= 0 || pieces <= 0) return 0;
    return Number(((length * width * thickness * pieces) / 144).toFixed(3));
  }, [woodForm]);

  const resetWoodForm = () => {
    setWoodForm({
      name: lastWoodName,
      length: "",
      width: "",
      thickness: "",
      pieces: "",
    });
  };

  const formatWoodSize = (value) => {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) return value;

    const superscriptDigits = {
      0: "⁰",
      1: "¹",
      2: "²",
      3: "³",
      4: "⁴",
      5: "⁵",
      6: "⁶",
      7: "⁷",
      8: "⁸",
      9: "⁹",
    };
    const subscriptDigits = {
      0: "₀",
      1: "₁",
      2: "₂",
      3: "₃",
      4: "₄",
      5: "₅",
      6: "₆",
      7: "₇",
      8: "₈",
      9: "₉",
    };
    const toStyledDigits = (number, digits) =>
      String(number)
        .split("")
        .map((digit) => digits[digit] || digit)
        .join("");
    const toFraction = (numerator, denominator) =>
      `${toStyledDigits(numerator, superscriptDigits)}⁄${toStyledDigits(
        denominator,
        subscriptDigits
      )}`;

    const whole = Math.trunc(numberValue);
    const decimal = Math.abs(numberValue - whole);
    const denominator = 16;
    let numerator = Math.round(decimal * denominator);

    if (numerator === 0) return String(whole);
    if (numerator === denominator) return String(whole + Math.sign(numberValue || 1));

    const gcd = (a, b) => (b ? gcd(b, a % b) : a);
    const divisor = gcd(numerator, denominator);
    numerator = numerator / divisor;
    const reducedDenominator = denominator / divisor;
    const fraction = toFraction(numerator, reducedDenominator);

    return whole === 0 ? fraction : `${whole} ${fraction}`;
  };

  const handleAddWoodItem = () => {
    if (!woodForm.name.trim()) return alert("Enter wood item name");
    if (woodCft <= 0) return alert("Enter valid wood dimensions");

    const baseName = woodForm.name.trim();
    const sizeLabel = `${formatWoodSize(woodForm.length)} ft x ${formatWoodSize(
      woodForm.width
    )} in x ${formatWoodSize(woodForm.thickness)} in x ${woodForm.pieces} pcs`;
    const existingItem = items.find(
      (i) => i.name.toLowerCase() === baseName.toLowerCase()
    );

    setSelectedItems((current) => [
      ...current,
      {
        id: existingItem?.id || Date.now().toString(),
        name: `${baseName} (${sizeLabel})`,
        unit: "cft",
        quantity: woodCft,
        woodMeasurement: {
          itemName: baseName,
          length: Number(woodForm.length),
          width: Number(woodForm.width),
          thickness: Number(woodForm.thickness),
          pieces: Number(woodForm.pieces),
        },
      },
    ]);

    setLastWoodName(baseName);
    setWoodForm({
      name: baseName,
      length: "",
      width: "",
      thickness: "",
      pieces: "",
    });
    setShowWoodModal(false);
  };

  const openWoodCalculator = () => {
    setWoodForm((current) => ({
      ...current,
      name: current.name || selectedItem.trim() || lastWoodName,
    }));
    setShowWoodModal(true);
  };

  // Edit an individual item inline
  const handleEditItem = (index) => {
    setEditingItemIndex(index);
    setEditingItemDraft({ ...selectedItems[index] });
  };
  const handleDeleteItem = (index) => {
    if (!window.confirm("Delete this item?")) return;
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleSaveItem = (index, updatedItem) => {
    const updatedItems = [...selectedItems];
    updatedItems[index] = updatedItem;
    setSelectedItems(updatedItems);
    setEditingItemIndex(null);
    setEditingItemDraft(null);
  };

  // Save or update the full request
  const handleSubmitRequest = async () => {
    if (!projectName.trim()) return alert("Enter project/site name");
    if (selectedItems.length === 0) return alert("Add at least one item");
    const userId = getCurrentUserId();
    if (!userId) return alert("You must be signed in");

    setSubmitting(true);
    try {
      const existingRequest = editingId
        ? requests.find((req) => req.id === editingId)
        : null;
      const documentStyle = editingId
        ? existingRequest?.documentStyle || DEFAULT_DOCUMENT_STYLE_ID
        : companyInfo?.documentStyle || DEFAULT_DOCUMENT_STYLE_ID;

      if (editingId) {
        await updateDoc(userDoc("materialRequests", editingId, userId), {
          project: projectName.trim(),
          items: selectedItems,
          documentStyle,
        });
        alert("✅ Request updated successfully!");
      } else {
        await addDoc(userCollection("materialRequests", userId), {
          project: projectName.trim(),
          items: selectedItems,
          documentStyle,
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
      await deleteDoc(userDoc("materialRequests", id));
      alert("🗑️ Request deleted successfully!");
    } catch (err) {
      console.error("Delete error:", err);
      alert("❌ Failed to delete request!");
    }
  };

  const formatPdfText = (value) => {
    const superscriptMap = {
      "⁰": "0",
      "¹": "1",
      "²": "2",
      "³": "3",
      "⁴": "4",
      "⁵": "5",
      "⁶": "6",
      "⁷": "7",
      "⁸": "8",
      "⁹": "9",
    };
    const subscriptMap = {
      "₀": "0",
      "₁": "1",
      "₂": "2",
      "₃": "3",
      "₄": "4",
      "₅": "5",
      "₆": "6",
      "₇": "7",
      "₈": "8",
      "₉": "9",
    };

    return String(value ?? "")
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (char) => superscriptMap[char] || char)
      .replace(/[₀₁₂₃₄₅₆₇₈₉]/g, (char) => subscriptMap[char] || char)
      .replace(/⁄/g, "/");
  };

  const getSameUnitTotal = (requestItems) => {
    if (!Array.isArray(requestItems) || requestItems.length === 0) return null;

    const normalizedUnits = requestItems.map((item) =>
      String(item.unit || "").trim().toLowerCase()
    );
    const firstUnit = normalizedUnits[0];
    if (!firstUnit || !normalizedUnits.every((unitName) => unitName === firstUnit)) {
      return null;
    }

    let total = 0;
    for (const item of requestItems) {
      const quantityValue = Number(item.quantity);
      if (!Number.isFinite(quantityValue)) return null;
      total += quantityValue;
    }

    return {
      quantity: Number(total.toFixed(3)),
      unit: requestItems[0].unit,
    };
  };

  const handleExportPDF = (req, preview = false) => {
    const docPdf = new jsPDF();
    const docStyle = getDocumentStyle(
      req.documentStyle || DEFAULT_DOCUMENT_STYLE_ID
    );

    const leftX = 14;
    const companyX = 45;
    const addressLines = docPdf.splitTextToSize(companyInfo?.address || "", 120);
    const contactLine = `Phone: ${companyInfo?.phone || ""} | Email: ${
      companyInfo?.email || ""
    }`;

    docPdf.setTextColor(...docStyle.text);
    docPdf.setFontSize(14);
    docPdf.text(companyInfo?.name || "", companyX, 20);
    docPdf.setFontSize(10);
    docPdf.text(addressLines, companyX, 26);
    const contactY = 26 + addressLines.length * 5;
    docPdf.text(contactLine, companyX, contactY);

    const titleY = Math.max(45, contactY + 13);
    docPdf.setTextColor(...docStyle.primary);
    docPdf.setFontSize(16);
    docPdf.text("MATERIAL REQUEST", leftX, titleY);
    docPdf.setDrawColor(...docStyle.primary);
    docPdf.line(leftX, titleY + 3, 196, titleY + 3);

    const projectY = titleY + 10;
    docPdf.setTextColor(...docStyle.text);
    docPdf.setFontSize(12);
    docPdf.text(`Project: ${req.project}`, leftX, projectY);
    docPdf.text(
      `Date: ${
        req.createdAt
          ? req.createdAt.toDate().toLocaleDateString("en-IN")
          : "-"
      }`,
      leftX,
      projectY + 7
    );
    const tableData = req.items.map((i, idx) => [
      idx + 1,
      formatPdfText(i.name),
      i.quantity,
      i.unit,
    ]);
    const requestTotal = getSameUnitTotal(req.items);
    if (requestTotal) {
      tableData.push(["", "Total", requestTotal.quantity, requestTotal.unit]);
    }
    docPdf.autoTable({
      startY: projectY + 17,
      head: [["#", "Item", "Quantity", "Unit"]],
      body: tableData,
      styles: { fontSize: 11 },
      headStyles: { fillColor: docStyle.primary },
      alternateRowStyles: { fillColor: docStyle.tableStripe },
    });
    if (preview) {
      const pdfBlob = docPdf.output("blob");
      const blobUrl = URL.createObjectURL(pdfBlob);
      const previewWindow = window.open(blobUrl, "_blank");
      if (!previewWindow) {
        URL.revokeObjectURL(blobUrl);
        alert("Popup blocked. Please allow popups to preview the PDF.");
        return;
      }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return;
    }

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
  <button
    type="button"
    onClick={openWoodCalculator}
    className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-4 py-3 rounded-lg shadow transition sm:col-span-1"
  >
    Wood CFT
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
            value={editingItemDraft?.name ?? ""}
            onChange={(e) => {
              setEditingItemDraft((prev) => ({
                ...(prev || {}),
                name: e.target.value,
              }));
            }}
            className="border p-1 w-full"
          />
        </td>
        <td className="p-2">
          <input
            type="number"
            value={editingItemDraft?.quantity ?? ""}
            onChange={(e) => {
              setEditingItemDraft((prev) => ({
                ...(prev || {}),
                quantity: e.target.value,
              }));
            }}
            className="border p-1 w-full"
          />
        </td>
        <td className="p-2">
          <input
            value={editingItemDraft?.unit ?? ""}
            onChange={(e) => {
              setEditingItemDraft((prev) => ({
                ...(prev || {}),
                unit: e.target.value,
              }));
            }}
            className="border p-1 w-full"
          />
        </td>
        <td className="p-2 text-center space-x-2">
          <button
            onClick={() => handleSaveItem(index, editingItemDraft || i)}
            className="bg-green-600 text-white px-2 py-1 rounded"
          >
            ✅ Save
          </button>
          <button
            onClick={() => {
              setEditingItemIndex(null);
              setEditingItemDraft(null);
            }}
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
            onClick={() => handleEditItem(index)}
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
            {selectedItemsTotal && (
              <tfoot>
                <tr className="border-t-2 border-amber-300 bg-amber-100 font-bold text-amber-950">
                  <td className="p-2 text-right">Total</td>
                  <td className="p-2">{selectedItemsTotal.quantity}</td>
                  <td className="p-2">{selectedItemsTotal.unit}</td>
                  <td className="p-2" />
                </tr>
              </tfoot>
            )}
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

      {showWoodModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-20">
          <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Wood CFT Calculator
                </h3>
                <p className="text-sm text-slate-500">
                  Formula: length in ft x width in inch x thickness in inch x pieces / 144
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWoodModal(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Wood item name
                </label>
                <input
                  list="woodRequestItemList"
                  value={woodForm.name}
                  onChange={(e) =>
                    setWoodForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g., Teak wood"
                  className="w-full rounded-lg border border-slate-200 p-3"
                />
                <datalist id="woodRequestItemList">
                  {items.map((i) => (
                    <option key={i.id || i.name} value={i.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Length (ft)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={woodForm.length}
                  onChange={(e) =>
                    setWoodForm((f) => ({ ...f, length: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Width (inch)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={woodForm.width}
                  onChange={(e) =>
                    setWoodForm((f) => ({ ...f, width: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Thickness (inch)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={woodForm.thickness}
                  onChange={(e) =>
                    setWoodForm((f) => ({ ...f, thickness: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 p-3"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Pieces
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={woodForm.pieces}
                  onChange={(e) =>
                    setWoodForm((f) => ({ ...f, pieces: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 p-3"
                />
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center justify-between text-slate-900">
                <span className="font-semibold">Requested quantity</span>
                <span className="text-2xl font-bold">{woodCft} cft</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={resetWoodForm}
                className="rounded-lg border border-slate-200 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-100"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleAddWoodItem}
                className="rounded-lg bg-amber-600 px-4 py-2.5 font-semibold text-white hover:bg-amber-700"
              >
                Add to Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Requests */}
      <div className="mt-10">
        <h3 className="text-lg font-semibold text-blue-700 mb-3">
          🗂️ Saved Requests
        </h3>

        {loadingRequests ? (
          <SkeletonLoader rows={3} variant="card" />
        ) : requests.length === 0 ? (
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
                    onClick={() => handleExportPDF(req, true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-md text-sm shadow-sm"
                  >
                    👁 Preview PDF
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
