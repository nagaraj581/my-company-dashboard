// src/pages/company/UPIManager.jsx
import React, { useEffect, useState } from "react";
import {
  getUpis,
  addUpi,
  updateUpi,
  deleteUpi,
  setCompanyDefaultUpi,
} from "../../services/companyUpiService";
import { generateUPIQRDataUrl } from "../../services/upiService";
import { clearCompanyInfoCache } from "../../config/companyInfo";

/**
 * UPIManager
 * Props:
 *   - companyId (string) required
 *   - onClose (optional) callback when manager closed or default changed
 */
export default function UPIManager({ companyId, onClose }) {
  const [upis, setUpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ upiId: "", name: "", bank: "", qrBase64: "" });
  const [generating, setGenerating] = useState(false);
  const [defaultUpiId, setDefaultUpiId] = useState(null);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const list = await getUpis(companyId);
      setUpis(list);
      // read current default from company doc (optional)
      const compRef = await fetch(`/__/firebase/init.json`).catch(() => null); // noop for fallback
      setLoading(false);
    })();
  }, [companyId]);

  function openNew() {
    setEditing(null);
    setForm({ upiId: "", name: "", bank: "", qrBase64: "" });
  }

  async function openEdit(u) {
    setEditing(u.id);
    setForm({
      upiId: u.upiId || "",
      name: u.name || "",
      bank: u.bank || "",
      qrBase64: u.qrBase64 || "",
    });
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleGenerateQr() {
    if (!form.upiId) return alert("Enter UPI ID first");
    try {
      setGenerating(true);
      const dataUrl = await generateUPIQRDataUrl(form.upiId, form.name || "");
      setForm((f) => ({ ...f, qrBase64: dataUrl }));
    } catch (err) {
      console.error(err);
      alert("QR generation failed: " + err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    if (!form.upiId.trim()) return alert("UPI ID is required");
    try {
      if (editing) {
        await updateUpi(companyId, editing, {
          upiId: form.upiId.trim(),
          name: form.name.trim(),
          bank: form.bank.trim(),
          qrBase64: form.qrBase64 || "",
        });
        alert("Updated");
      } else {
        const newId = await addUpi(companyId, {
          upiId: form.upiId.trim(),
          name: form.name.trim(),
          bank: form.bank.trim(),
          qrBase64: form.qrBase64 || "",
        });
        alert("Added");
      }

      const list = await getUpis(companyId);
      setUpis(list);
      setEditing(null);
      setForm({ upiId: "", name: "", bank: "", qrBase64: "" });
    } catch (err) {
      console.error(err);
      alert("Save failed: " + err.message);
    }
  }

  async function handleDelete(upiDocId) {
    if (!window.confirm("Delete this UPI entry?")) return;
    try {
      await deleteUpi(companyId, upiDocId);
      setUpis((s) => s.filter((u) => u.id !== upiDocId));
    } catch (err) {
      console.error(err);
      alert("Delete failed: " + err.message);
    }
  }

  async function handleSetDefault(upiDocId) {
    try {
      await setCompanyDefaultUpi(companyId, upiDocId);
      setDefaultUpiId(upiDocId);
      clearCompanyInfoCache(); // refresh company data across app
      alert("Default UPI set");
      if (onClose) onClose(); // let parent know
    } catch (err) {
      console.error(err);
      alert("Failed to set default: " + err.message);
    }
  }

  return (
    <div className="p-6 bg-white rounded shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">UPI Manager</h3>
        <div>
          <button onClick={openNew} className="px-3 py-1 bg-blue-600 text-white rounded">➕ New UPI</button>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {loading ? (
          <div>Loading...</div>
        ) : upis.length === 0 ? (
          <div className="text-sm text-gray-600">No UPI IDs added yet.</div>
        ) : (
          upis.map((u) => (
            <div key={u.id} className="p-3 border rounded flex items-center justify-between">
              <div>
                <div className="font-semibold">{u.name || u.upiId}</div>
                <div className="text-sm text-gray-600">{u.upiId} • {u.bank}</div>
              </div>

              <div className="flex items-center gap-2">
                {u.qrBase64 && <img src={u.qrBase64} alt="qr" className="w-16 h-16 object-contain border" />}
                <button onClick={() => openEdit(u)} className="px-3 py-1 border rounded text-sm">Edit</button>
                <button onClick={() => handleDelete(u.id)} className="px-3 py-1 border rounded text-sm text-red-600">Delete</button>
                <button onClick={() => handleSetDefault(u.id)} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">Set Default</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form */}
      <div className="border-t pt-4">
        <h4 className="font-semibold mb-2">{editing ? "Edit UPI" : "New UPI"}</h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input name="upiId" value={form.upiId} onChange={handleChange} placeholder="UPI ID (eg: nagaraj@ybl)" className="p-2 border rounded" />
          <input name="name" value={form.name} onChange={handleChange} placeholder="Beneficiary Name" className="p-2 border rounded" />
          <input name="bank" value={form.bank} onChange={handleChange} placeholder="Bank (optional)" className="p-2 border rounded" />
        </div>

        <div className="flex items-center gap-3 mt-3">
          <button onClick={handleGenerateQr} disabled={generating} className="px-3 py-2 bg-sky-600 text-white rounded">
            {generating ? "Generating..." : "Generate QR"}
          </button>

          {form.qrBase64 ? (
            <div className="flex items-center gap-2">
              <img src={form.qrBase64} alt="qr preview" className="w-24 h-24 object-contain border" />
              <button onClick={() => setForm(f => ({...f, qrBase64: ""}))} className="px-3 py-1 border rounded text-sm">Remove</button>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No QR generated yet.</div>
          )}
        </div>

        <div className="flex gap-3 justify-end mt-4">
          <button onClick={() => { setEditing(null); setForm({ upiId: "", name: "", bank: "", qrBase64: "" }); }} className="px-3 py-2 border rounded">Reset</button>
          <button onClick={handleSave} className="px-3 py-2 bg-green-600 text-white rounded">Save UPI</button>
        </div>
      </div>
    </div>
  );
}
