import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { PackageCheck, Plus, Save, Trash2, UserPlus, X } from "lucide-react";

import { addStockMovement } from "../services/stockService";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { useCurrency } from "../context/CurrencyContext";
import { getCurrentUserId, userCollection } from "../services/userDb";

const emptySupplierForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  gstOrVat: "",
};

const emptyRow = { itemId: "", itemName: "", unit: "", quantity: "" };

const getSupplierInitials = (name) => {
  const words = name
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "GRN";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase().padEnd(2, "X");

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
};

const getReceiptYear = (dateValue) => {
  const parsed = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date().getFullYear() : parsed.getFullYear();
};

export default function MaterialReceipt() {
  const { currency } = useCurrency();
  const [items, setItems] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [rows, setRows] = useState([emptyRow]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierForm, setSupplierForm] = useState(emptySupplierForm);
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const [isSavingReceipt, setIsSavingReceipt] = useState(false);
  const [receipts, setReceipts] = useState([]);
  const [showReceiptDetailsModal, setShowReceiptDetailsModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [loadingReceipts, setLoadingReceipts] = useState(true);

  const [form, setForm] = useState({
    supplierId: "",
    supplierName: "",
    grnNumber: "",
    grnPrefix: "",
    grnYear: new Date().getFullYear(),
    grnSequence: 0,
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

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
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setItems(list);
    });

    return () => unsub();
  }, [currency]);

 


  

  const generateGrnNumber = useCallback(
    async ({ supplierId, supplierName, date }) => {
      if (!supplierId || !supplierName) {
        return {
          grnNumber: "",
          grnPrefix: "",
          grnYear: getReceiptYear(date),
          grnSequence: 0,
        };
      }

      const userId = getCurrentUserId();
      if (!userId) throw new Error("You must be signed in");

      const grnPrefix = getSupplierInitials(supplierName);
      const grnYear = getReceiptYear(date);
      const receiptsSnapshot = await getDocs(
        query(
          userCollection("materialReceipts", userId),
          where("supplierId", "==", supplierId),
          where("currency", "==", currency),
        ),
      );

      let highestSequence = 0;

      receiptsSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const existingYear =
          data.grnYear || (data.date ? getReceiptYear(data.date) : null);

        if (Number(existingYear) !== grnYear) return;

        if (data.grnPrefix === grnPrefix && Number(data.grnSequence) > highestSequence) {
          highestSequence = Number(data.grnSequence);
          return;
        }

        const match = String(data.grnNumber || "").match(
          new RegExp(`^${grnPrefix}-${grnYear}-(\\d+)$`, "i"),
        );
        if (match) {
          highestSequence = Math.max(highestSequence, Number(match[1]));
        }
      });

      const grnSequence = highestSequence + 1;
      const grnNumber = `${grnPrefix}-${grnYear}-${String(grnSequence).padStart(3, "0")}`;

      return {
        grnNumber,
        grnPrefix,
        grnYear,
        grnSequence,
      };
    },
    [currency],
  );

  useEffect(() => {
    let cancelled = false;

    const updateGeneratedGrn = async () => {
      if (!form.supplierId || !form.supplierName) {
        setForm((current) => ({
          ...current,
          grnNumber: "",
          grnPrefix: "",
          grnYear: getReceiptYear(current.date),
          grnSequence: 0,
        }));
        return;
      }

      try {
        const generated = await generateGrnNumber({
          supplierId: form.supplierId,
          supplierName: form.supplierName,
          date: form.date,
        });

        if (!cancelled) {
          setForm((current) => ({ ...current, ...generated }));
        }
      } catch (error) {
        console.error("Unable to generate GRN number:", error);
      }
    };

    updateGeneratedGrn();

    return () => {
      cancelled = true;
    };
  }, [form.supplierId, form.supplierName, form.date, generateGrnNumber]);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      setSuppliers([]);
      return undefined;
    }

    const suppliersQuery = query(
      userCollection("suppliers", userId),
      where("currency", "==", currency),
    );

    const unsub = onSnapshot(suppliersQuery, (snapshot) => {
      const list = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setSuppliers(list);
    });

    return () => unsub();
  }, [currency]);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      setReceipts([]);
      setLoadingReceipts(false);
      return undefined;
    }

    setLoadingReceipts(true);
    const receiptsQuery = query(
      userCollection("materialReceipts", userId),
      where("currency", "==", currency),
    );

    const unsub = onSnapshot(receiptsQuery, (snapshot) => {
      const list = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setReceipts(list);
      setLoadingReceipts(false);
    });

    return () => unsub();
  }, [currency]);

  const handleSupplierSelect = (supplierId) => {
    const selected = suppliers.find((supplier) => supplier.id === supplierId);
    setForm((current) => ({
      ...current,
      supplierId,
      supplierName: selected?.name || "",
      grnNumber: "",
      grnPrefix: "",
      grnSequence: 0,
    }));
  };

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

  const handleSaveSupplier = async () => {
    const name = supplierForm.name.trim();
    if (!name) return alert("Supplier name is required");

    const userId = getCurrentUserId();
    if (!userId) return alert("You must be signed in");

    try {
      setIsSavingSupplier(true);
      const supplierRef = await addDoc(userCollection("suppliers", userId), {
        name,
        phone: supplierForm.phone.trim(),
        email: supplierForm.email.trim(),
        address: supplierForm.address.trim(),
        gstOrVat: supplierForm.gstOrVat.trim(),
        currency,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setForm((current) => ({
        ...current,
        supplierId: supplierRef.id,
        supplierName: name,
        grnNumber: "",
        grnPrefix: "",
        grnSequence: 0,
      }));
      setSupplierForm(emptySupplierForm);
      setShowSupplierModal(false);
    } catch (error) {
      console.error("Unable to save supplier:", error);
      alert(`Unable to save supplier: ${error.message}`);
    } finally {
      setIsSavingSupplier(false);
    }
  };

  const handleSave = async () => {
    const userId = getCurrentUserId();
    if (!userId) return alert("You must be signed in");

    const supplierName = form.supplierName.trim();
    const generated = await generateGrnNumber({
      supplierId: form.supplierId,
      supplierName,
      date: form.date,
    });
    const grnNumber = generated.grnNumber;
    const grnSearch = grnNumber.toLowerCase();

    if (!form.supplierId || !supplierName) return alert("Select a supplier");
    if (!grnNumber) return alert("Unable to generate GRN Number");

    const validRows = rows.filter((row) => row.itemId && Number(row.quantity) > 0);

    if (validRows.length === 0) return alert("Add at least one valid item");

    const existingNormalized = await getDocs(
      query(
        userCollection("materialReceipts", userId),
        where("grnSearch", "==", grnSearch),
        where("currency", "==", currency),
      ),
    );

    const existingLegacy = await getDocs(
      query(
        userCollection("materialReceipts", userId),
        where("grnNumber", "==", grnNumber),
        where("currency", "==", currency),
      ),
    );

    if (!existingNormalized.empty || !existingLegacy.empty) {
      return alert("GRN Number already exists");
    }

    try {
      setIsSavingReceipt(true);
      const receiptRef = await addDoc(userCollection("materialReceipts", userId), {
        supplierId: form.supplierId,
        supplierName,
        supplier: supplierName,
        grnNumber,
        grnSearch,
        grnPrefix: generated.grnPrefix,
        grnYear: generated.grnYear,
        grnSequence: generated.grnSequence,
        date: form.date,
        currency,
        items: validRows,
        notes: form.notes.trim(),
        createdAt: serverTimestamp(),
      });

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

      alert("Receipt saved successfully");
      setForm({
        supplierId: "",
        supplierName: "",
        grnNumber: "",
        grnPrefix: "",
        grnYear: new Date().getFullYear(),
        grnSequence: 0,
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setRows([emptyRow]);
    } catch (error) {
      console.error(error);
      alert("Failed to save receipt");
    } finally {
      setIsSavingReceipt(false);
    }
  };

  const handleViewReceipt = (receipt) => {
    setSelectedReceipt(receipt);
    setShowReceiptDetailsModal(true);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-2 flex items-center gap-2">
          <PackageCheck className="text-blue-600" size={30} />
          Material Receipt (GRN)
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Record received materials and update inventory stock.
        </p>
      </div>

      <div className="bg-white/90 dark:bg-slate-900/75 border border-slate-200/80 dark:border-slate-700/70 p-6 rounded-2xl shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex gap-2">
            <select
              value={form.supplierId}
              onChange={(e) => handleSupplierSelect(e.target.value)}
              className="min-w-0 flex-1 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
            >
              <option value="">Select Supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowSupplierModal(true)}
              title="Add supplier"
              className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <UserPlus size={18} />
            </button>
          </div>

          <input
            placeholder="Auto GRN Number"
            value={form.grnNumber}
            readOnly
            className="px-4 py-3 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 outline-none"
          />

          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
          />
        </div>

        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-[1.5fr_0.8fr_1fr_auto] gap-3 items-center">
              <select
                value={row.itemId}
                onChange={(e) => handleRowChange(index, "itemId", e.target.value)}
                className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
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
                className="px-4 py-3 rounded-lg border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
              />

              <input
                type="number"
                min="0"
                step="any"
                placeholder="Quantity"
                value={row.quantity}
                onChange={(e) => handleRowChange(index, "quantity", e.target.value)}
                className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
              />

              <button
                onClick={() => removeRow(index)}
                disabled={rows.length === 1}
                title="Remove row"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-red-500 px-4 font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={16} />
                Remove
              </button>
            </div>
          ))}
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
          className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none min-h-24"
        />

        <button
          onClick={handleSave}
          disabled={isSavingReceipt}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={18} />
          {isSavingReceipt ? "Saving..." : "Save Receipt"}
        </button>
      </div>

      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-20">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Add Supplier
              </h3>
              <button
                onClick={() => setShowSupplierModal(false)}
                title="Close"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                value={supplierForm.name}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, name: e.target.value })
                }
                placeholder="Supplier name"
                className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
              />
              <input
                value={supplierForm.phone}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, phone: e.target.value })
                }
                placeholder="Phone"
                className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
              />
              <input
                value={supplierForm.email}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, email: e.target.value })
                }
                placeholder="Email"
                className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
              />
              <input
                value={supplierForm.gstOrVat}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, gstOrVat: e.target.value })
                }
                placeholder="GST / VAT"
                className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
              />
              <textarea
                value={supplierForm.address}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, address: e.target.value })
                }
                placeholder="Address"
                className="md:col-span-2 px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none min-h-24"
              />
            </div>

            <button
              onClick={handleSaveSupplier}
              disabled={isSavingSupplier}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserPlus size={18} />
              {isSavingSupplier ? "Saving..." : "Add Supplier"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Saved Receipts</h3>
        {loadingReceipts ? (
          <SkeletonLoader rows={3} variant="card" />
        ) : receipts.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 py-12 text-center dark:border-slate-600 dark:bg-slate-800">
            <p className="text-lg text-slate-500 dark:text-slate-400">
              No receipts yet. Create your first GRN!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {receipts.map((r) => (
              <div
                key={r.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {r.grnNumber}
                    </h4>
                    <p className="mt-1 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold">Supplier:</span> {r.supplierName}
                    </p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {r.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {r.items?.length || 0} items
                    </div>
                    <button
                      onClick={() => handleViewReceipt(r)}
                      className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-600"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showReceiptDetailsModal && selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-20">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {selectedReceipt.grnNumber}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {selectedReceipt.supplierName} &bull; {selectedReceipt.date}
                </p>
              </div>
              <button
                onClick={() => setShowReceiptDetailsModal(false)}
                title="Close"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600 dark:text-slate-300">Item Name</th>
                      <th className="px-4 py-2 text-center font-semibold text-slate-600 dark:text-slate-300">Quantity</th>
                      <th className="px-4 py-2 text-center font-semibold text-slate-600 dark:text-slate-300">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {selectedReceipt.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{item.itemName}</td>
                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">{item.quantity}</td>
                        <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">{item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedReceipt.notes && (
                <div>
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300">Notes:</h4>
                  <p className="mt-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {selectedReceipt.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
