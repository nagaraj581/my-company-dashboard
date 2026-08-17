import { useEffect, useState } from "react";
import {
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { Edit3, Plus, Save, Trash2, X } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { getCurrentUserId, userCollection, userDoc } from "../services/userDb";
import { SkeletonLoader } from "../components/SkeletonLoader";

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  gstOrVat: "",
};

export default function Suppliers() {
  const { currency } = useCurrency();
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      setSuppliers([]);
      setLoading(false);
      return undefined;
    }

    const suppliersQuery = query(
      userCollection("suppliers", userId),
      where("currency", "==", currency),
    );

    const unsub = onSnapshot(suppliersQuery, (snapshot) => {
      const list = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setSuppliers(list);
      setLoading(false);
    });

    return () => unsub();
  }, [currency]);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingSupplier(null);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) return alert("Supplier name is required");

    const userId = getCurrentUserId();
    if (!userId) return alert("You must be signed in");

    const payload = {
      name,
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      gstOrVat: form.gstOrVat.trim(),
      currency,
      updatedAt: serverTimestamp(),
    };

    try {
      setIsSaving(true);

      if (editingSupplier) {
        await updateDoc(userDoc("suppliers", editingSupplier.id, userId), payload);
      } else {
        await addDoc(userCollection("suppliers", userId), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }

      resetForm();
    } catch (error) {
      console.error("Unable to save supplier:", error);
      alert(`Unable to save supplier: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      gstOrVat: supplier.gstOrVat || "",
    });
  };

  const handleDelete = async (supplier) => {
    if (!window.confirm(`Delete supplier "${supplier.name}"?`)) return;

    const userId = getCurrentUserId();
    if (!userId) return alert("You must be signed in");

    try {
      await deleteDoc(userDoc("suppliers", supplier.id, userId));
    } catch (error) {
      console.error("Unable to delete supplier:", error);
      alert(`Unable to delete supplier: ${error.message}`);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-transparent mb-2">
          Suppliers
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Manage supplier details for material receipts and purchases.
        </p>
      </div>

      <div className="bg-white/90 dark:bg-slate-900/75 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
            {editingSupplier ? "Edit Supplier" : "Add Supplier"}
          </h3>
          {editingSupplier && (
            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <X size={16} />
              Cancel
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Supplier name"
            className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
          />
          <input
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="Phone"
            className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
          />
          <input
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="Email"
            className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
          />
          <input
            value={form.gstOrVat}
            onChange={(e) => handleChange("gstOrVat", e.target.value)}
            placeholder="GST / VAT"
            className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
          />
          <input
            value={form.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="Address"
            className="px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 outline-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-sky-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:from-emerald-600 hover:to-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {editingSupplier ? <Save size={18} /> : <Plus size={18} />}
          {isSaving ? "Saving..." : editingSupplier ? "Update Supplier" : "Add Supplier"}
        </button>
      </div>

      <div className="bg-white/90 dark:bg-slate-900/75 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-6">
            <SkeletonLoader rows={5} />
          </div>
        ) : suppliers.length === 0 ? (
          <div className="py-16 px-4 text-center text-slate-500 dark:text-slate-400">
            No suppliers yet. Add your first supplier to use it in Material Receipt.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-emerald-600 to-sky-600 text-white">
                  <th className="px-6 py-4 text-left text-sm font-semibold">Supplier</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Phone</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold">GST / VAT</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 dark:text-white">
                        {supplier.name}
                      </div>
                      {supplier.address && (
                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {supplier.address}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {supplier.phone || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {supplier.email || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">
                      {supplier.gstOrVat || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600"
                        >
                          <Edit3 size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(supplier)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-3 py-2 text-xs font-semibold text-white hover:bg-red-600"
                        >
                          <Trash2 size={14} />
                          Delete
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
    </div>
  );
}
