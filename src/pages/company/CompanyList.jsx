// src/pages/company/CompanyList.jsx
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  getCompanies,
  saveCompany,
  deleteCompany,
  getActiveCompanyId,
  setActiveCompanyId,
  getCompany,
} from "../../services/companyService";
import { clearCompanyInfoCache } from "../../config/companyInfo"; // call this after changing active company
import {
  DEFAULT_DOCUMENT_STYLE_ID,
  DOCUMENT_STYLE_OPTIONS,
  getDocumentStyle,
} from "../../config/documentStyles";
import { generateUPIQR } from "../../services/upiService";

export default function CompanyList() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);

  // modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    gst: "",
    terms: "Goods once sold cannot be returned.",
    upiId: "",
    upiName: "",
    qrBase64: "",
    documentStyle: DEFAULT_DOCUMENT_STYLE_ID,
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await getCompanies();
      const a = await getActiveCompanyId();
      setCompanies(list);
      setActiveId(a);
      setLoading(false);
    })();
  }, []);

  function openNew() {
    setEditing(null);
    setForm({
      name: "",
      address: "",
      phone: "",
      email: "",
      gst: "",
      terms: "Goods once sold cannot be returned.",
      upiId: "",
      upiName: "",
      qrBase64: "",
      documentStyle: DEFAULT_DOCUMENT_STYLE_ID,
    });
    setShowModal(true);
  }

  async function openEdit(id) {
    const c = await getCompany(id);
    setEditing(id);
    setForm({
      name: c.name || "",
      address: c.address || "",
      phone: c.phone || "",
      email: c.email || "",
      gst: c.gst || "",
      terms: c.terms || "Goods once sold cannot be returned.",
      upiId: c.upiId || "",
      upiName: c.upiName || "",
      qrBase64: c.qrBase64 || "",
      documentStyle: c.documentStyle || DEFAULT_DOCUMENT_STYLE_ID,
    });
    setShowModal(true);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSave() {
    // basic validation
    if (!form.name.trim()) return alert("Company name required");
    try {
      await saveCompany(editing, {
        name: form.name,
        address: form.address,
        phone: form.phone,
        email: form.email,
        gst: form.gst,
        terms: form.terms,
        upiId: form.upiId,
        upiName: form.upiName,
        qrBase64: form.qrBase64,
        documentStyle: form.documentStyle || DEFAULT_DOCUMENT_STYLE_ID,
      });

      // refresh list
      const list = await getCompanies();
      setCompanies(list);
      clearCompanyInfoCache();
      setShowModal(false);
      setEditing(null);
      alert("Saved");
    } catch (err) {
      console.error(err);
      alert("Save failed: " + err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this company?")) return;
    try {
      await deleteCompany(id);
      setCompanies((s) => s.filter((c) => c.id !== id));
      if (activeId === id) {
        // clear active if deleted
        await setActiveCompanyId(null);
        setActiveId(null);
        clearCompanyInfoCache();
      }
    } catch (err) {
      console.error(err);
      alert("Delete failed: " + err.message);
    }
  }

  async function handleSetActive(id) {
    if (!id) return;
    try {
      await setActiveCompanyId(id);
      setActiveId(id);
      clearCompanyInfoCache(); // important so other pages load fresh data
      alert("Active company changed");
    } catch (err) {
      console.error(err);
      alert("Failed to set active: " + err.message);
    }
  }
  async function handleGenerateQR() {
  if (!form.upiId || !form.upiName) {
    alert("Enter UPI ID and Beneficiary Name first.");
    return;
  }
  try {
    const qr = await generateUPIQR(form.upiId, form.upiName);
    setForm((f) => ({ ...f, qrBase64: qr }));
  } catch (err) {
    console.error("QR generation error:", err);
    alert("Failed to generate QR");
  }
}

  const modal =
    showModal && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-24 pb-6">
            <div className="bg-white rounded-lg w-full max-w-2xl p-6 shadow-lg max-h-[calc(100vh-7rem)] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">
                {editing ? "Edit Company" : "New Company"}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Company Name"
                  className="p-3 border rounded"
                />
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Phone"
                  className="p-3 border rounded"
                />
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Email"
                  className="p-3 border rounded"
                />
                <input
                  name="gst"
                  value={form.gst}
                  onChange={handleChange}
                  placeholder="GST (optional)"
                  className="p-3 border rounded"
                />

                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Address"
                  rows={4}
                  className="p-3 border rounded md:col-span-2"
                />
                <input
                  name="upiId"
                  value={form.upiId}
                  onChange={handleChange}
                  placeholder="Default UPI ID (optional)"
                  className="p-3 border rounded"
                />
                <input
                  name="upiName"
                  value={form.upiName}
                  onChange={handleChange}
                  placeholder="UPI Beneficiary Name (optional)"
                  className="p-3 border rounded"
                />
                <select
                  name="documentStyle"
                  value={form.documentStyle}
                  onChange={handleChange}
                  className="p-3 border rounded md:col-span-2"
                >
                  {DOCUMENT_STYLE_OPTIONS.map((style) => (
                    <option key={style.id} value={style.id}>
                      Document Style: {style.name}
                    </option>
                  ))}
                </select>
                <div className="md:col-span-2 border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">UPI QR Code</span>
                    <button
                      type="button"
                      onClick={handleGenerateQR}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
                    >
                      Generate QR
                    </button>
                  </div>

                  {form.qrBase64 ? (
                    <div className="flex items-center gap-4">
                      <img
                        src={form.qrBase64}
                        alt="UPI QR"
                        className="w-28 h-28 border rounded"
                      />
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, qrBase64: "" }))}
                        className="text-red-600 underline text-sm"
                      >
                        Remove QR
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No QR generated yet.</p>
                  )}
                </div>

                <textarea
                  name="terms"
                  value={form.terms}
                  onChange={handleChange}
                  placeholder="Terms & Conditions"
                  rows={3}
                  className="p-3 border rounded md:col-span-2"
                />
              </div>

              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Save
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;


  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Company Management</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={openNew}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            ➕ New Company
          </button>
        </div>
      </div>

      <div className="bg-white border rounded shadow p-4">
        {loading ? (
          <div>Loading companies...</div>
        ) : companies.length === 0 ? (
          <div>No companies yet. Create one.</div>
        ) : (
          <div className="space-y-3">
            {companies.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 border rounded"
              >
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-sm text-gray-600">{c.address}</div>
                  <div className="text-xs text-gray-500">
                    Document style: {getDocumentStyle(c.documentStyle).name}
                  </div>
                  <div className="text-sm text-gray-600">{c.phone} • {c.email}</div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 mr-4">
                    <input
                      type="radio"
                      checked={activeId === c.id}
                      onChange={() => handleSetActive(c.id)}
                    />
                    <span className="text-sm">Active</span>
                  </label>

                  <button
                    onClick={() => openEdit(c.id)}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(c.id)}
                    className="px-3 py-1 border rounded text-sm text-red-600"
                  >
                    Delete
                  </button>

                  {/* quick preview: link to sample invoice you uploaded (local path) */}
                  <a
                    href="/mnt/data/INV-2025-001.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-sm text-slate-600 underline"
                    title="Open sample invoice (local file)"
                  >
                    Preview sample invoice
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal}
    </div>
  );
}
