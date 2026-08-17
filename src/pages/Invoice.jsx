// src/pages/Invoice.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDoc,
  getDocs,
  Timestamp,
  query,
  where,
} from "firebase/firestore";

import { clearCompanyInfoCache, getCompanyInfo } from "../config/companyInfo";
import { useUnits } from "../hooks/useUnits";
import { useCurrency } from "../context/CurrencyContext";
import { useSearchParams, useLocation } from "react-router-dom";

import {
  formatCurrency,
  amountToWords,
  getNextInvoiceNumber,
  parseInvoiceDate,
  calcTotals,
} from "./invoice/invoiceUtils";

import { exportPdf } from "./invoice/InvoicePDF";
import { renderInvoiceHtml } from "./invoice/InvoicePrint";
import { getCurrentUserId, userCollection, userDoc } from "../services/userDb";

export default function InvoicePage() {
  const { currency } = useCurrency();
  const units = useUnits();

  // company config loaded from Firestore
  const [companyInfo, setCompanyInfo] = useState({});
  const [companyUpi, setCompanyUpi] = useState(null);

  const [params] = useSearchParams();
  const fromQuote = params.get("fromQuote");

  const location = useLocation();
  const [invoiceTitle, setInvoiceTitle] = useState("INVOICE");

  // item master (local saved items)
  const [savedItems, setSavedItems] = useState([]);
  const [form, setForm] = useState({ item: "", quantity: "", unit: "", rate: "" });
  const [rows, setRows] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);

  // invoice customer info
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  // discount + terms
  const [discountType, setDiscountType] = useState("amount");
  const [discountValue, setDiscountValue] = useState("");
  const [terms, setTerms] = useState("");
  const [amountReceived, setAmountReceived] = useState("");


  // saved invoices
  const [savedInvoices, setSavedInvoices] = useState([]);
  const [loadedInvoiceId, setLoadedInvoiceId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [saving, setSaving] = useState(false);
  const [showQr, setShowQr] = useState(true);


  // ------------------ load company + items + invoices ------------------
  useEffect(() => {
    let unsubItems = null;
    let unsubInvoices = null;

    (async () => {
      // Ensure cached company info is fresh each time the page opens
      clearCompanyInfoCache();
      const info = await getCompanyInfo();
      setCompanyInfo(info || {});
      setCompanyUpi(info?.activeUpi || null);

      // live items listener (currency-filtered)
      const itemsQuery = query(userCollection("items"), where("currency", "==", currency));
      unsubItems = onSnapshot(itemsQuery, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setSavedItems(list);
      });

      // live invoices listener (currency-filtered, newest first)
      const invoicesQuery = query(
        userCollection("invoices"),
        where("currency", "==", currency)
      );
      unsubInvoices = onSnapshot(invoicesQuery, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) =>
          (a.createdAt?.seconds || 0) < (b.createdAt?.seconds || 0) ? 1 : -1
        );
        setSavedInvoices(list);
      });

      // load local terms fallback
      const localTerms = localStorage.getItem("invoice_terms");
      if (localTerms) setTerms(localTerms);
      else if (info?.terms) setTerms(info.terms || "");
    })();

    return () => {
      if (unsubItems) unsubItems();
      if (unsubInvoices) unsubInvoices();
    };
  }, [currency]);

  // If active company or companyUpi changes the UI can react (debug optional)
  useEffect(() => {
    // you can enable these logs while debugging
    // console.log("companyInfo", companyInfo);
    // console.log("companyUpi", companyUpi);
  }, [companyInfo, companyUpi]);

  // If navigated from a quotation id (query param) - load quotation (optional)
  useEffect(() => {
    if (!fromQuote) return;
    (async () => {
      try {
        const qRef = userDoc("quotations", fromQuote);
        const snap = await getDoc(qRef);
        if (snap.exists()) {
          const q = snap.data();
          setCustomerName(q.customerName || "");
          setCustomerAddress(q.customerAddress || "");
          // convert quote items to invoice rows
          if (Array.isArray(q.items)) {
            setRows(
              q.items.map((it) => ({
                item: it.name,
                quantity: Number(it.quantity || 0),
                unit: it.unit,
                rate: Number(it.rate || 0),
                amount: Number(it.amount || it.quantity * it.rate || 0),
              }))
            );
          }
          // auto invoice number handled when saving; optional generate function if you have one
        }
      } catch (e) {
        console.error("Failed to load quote:", e);
      }
    })();
  }, [fromQuote, currency]);

  // If navigation state passes a quotation object
  useEffect(() => {
    if (!location.state?.quotation) return;
    const q = location.state.quotation;
    setCustomerName(q.customer || "");
    setCustomerAddress("");
    if (Array.isArray(q.items)) {
      const formattedItems = q.items.map((item) => ({
        item: item.name,
        quantity: Number(item.quantity),
        unit: item.unit,
        rate: Number(item.rate),
        amount: Number(item.amount),
      }));
      setRows(formattedItems);
    }
  }, [location.state]);

  // totals (memoized)
  const totals = useMemo(() => calcTotals(rows, discountType, discountValue), [
    rows,
    discountType,
    discountValue,
  ]);

  const filteredInvoices = useMemo(() => {
    if (!searchTerm) {
      return savedInvoices;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return savedInvoices.filter(
      (inv) =>
        inv.invoiceNumber?.toLowerCase().includes(lowercasedTerm) ||
        inv.customerName?.toLowerCase().includes(lowercasedTerm)
    );
  }, [savedInvoices, searchTerm]);
  /* ---------------------- Handle Form Changes ---------------------- */
  function handleChange(e) {
    const { name, value } = e.target;

    if (name === "item") {
      const found = savedItems.find(
        (it) => it.name?.toLowerCase() === value.toLowerCase()
      );

      if (found) {
        setForm({
          item: value,
          unit: found.unit,
          rate: found.rate,
          quantity: form.quantity || "",
        });
        return;
      }
    }

    setForm((f) => ({ ...f, [name]: value }));
  }

  /* ---------------------- Add / Update Row ---------------------- */
  function addOrUpdateRow() {
    const { item, quantity, unit, rate } = form;
    const q = Number(quantity);
    const r = Number(rate);

    if (!item.trim()) return alert("Enter item name");
    if (!unit) return alert("Select unit");
    if (isNaN(q) || q <= 0) return alert("Quantity must be > 0");
    if (isNaN(r) || r < 0) return alert("Invalid rate");

    const newRow = {
      item: item.trim(),
      quantity: q,
      unit,
      rate: r,
      amount: Number((q * r).toFixed(2)),
    };

    if (editingIndex !== null) {
      const copy = [...rows];
      copy[editingIndex] = newRow;
      setRows(copy);
      setEditingIndex(null);
    } else {
      setRows((old) => [...old, newRow]);
    }

    setForm({ item: "", quantity: "", unit: "", rate: "" });
  }

  /* ---------------------- Edit Row ---------------------- */
  function editRow(i) {
    const r = rows[i];
    setEditingIndex(i);
    setForm({
      item: r.item,
      quantity: String(r.quantity),
      unit: r.unit,
      rate: String(r.rate),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------------------- Delete Row ---------------------- */
  function deleteRow(i) {
    if (!window.confirm("Delete this item?")) return;
    setRows((old) => old.filter((_, idx) => idx !== i));
  }

  /* ---------------------- Save Invoice ---------------------- */
  async function saveInvoice() {
    if (!customerName.trim()) return alert("Enter customer name");
    if (rows.length === 0) return alert("Add at least one item");

    setSaving(true);
    try {
      const payload = {
  customerName,
  customerAddress,
  invoiceDate: new Date(invoiceDate),
  items: rows,
  subtotal: totals.subtotal,
  discountValue: Number(discountValue || 0),
  discountType,
  totalAmount: totals.total,
  terms,
  invoiceTitle,
  amountReceived: Number(amountReceived || 0),
};


      if (loadedInvoiceId) {
        payload.updatedAt = Timestamp.now();
        await updateDoc(userDoc("invoices", loadedInvoiceId), payload);
        alert("Invoice updated");
      } else {
        const invNo = await getNextInvoiceNumber(savedInvoices);
        payload.invoiceNumber = invNo;
        payload.createdAt = Timestamp.now();

        const ref = await addDoc(userCollection("invoices"), payload);
        setLoadedInvoiceId(ref.id);
        alert(`Invoice ${invNo} saved`);
      }

      // save terms locally
      localStorage.setItem("invoice_terms", terms || "");
    } catch (err) {
      console.error("Save invoice error:", err);
      alert("❌ Save failed");
    } finally {
      setSaving(false);
    }
  }

  /* ---------------------- Load Invoice ---------------------- */
  function loadInvoice(inv) {
    setLoadedInvoiceId(inv.id);
    setCustomerName(inv.customerName || "");
    setCustomerAddress(inv.customerAddress || "");
    setInvoiceTitle(inv.invoiceTitle || "INVOICE");
    setAmountReceived(inv.amountReceived || "");


    const d = parseInvoiceDate(inv.invoiceDate);
    setInvoiceDate(d.toISOString().slice(0, 10));

    const items = (inv.items || []).map((it) => {
      const q = Number(it.quantity || 0);
      const r = Number(it.rate || 0);
      return {
        ...it,
        quantity: q,
        rate: r,
        amount: Number(it.amount ?? q * r),
      };
    });

    setRows(items);

    setDiscountValue(inv.discountValue ?? "");
    setDiscountType(inv.discountType || "amount");
    setTerms(inv.terms ?? "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------------------- Delete Invoice ---------------------- */
  async function deleteInvoice(inv) {
    if (!window.confirm(`Delete invoice ${inv.invoiceNumber}?`)) return;

    await deleteDoc(userDoc("invoices", inv.id));

    if (loadedInvoiceId === inv.id) {
      newInvoice();
    }
  }

  /* ---------------------- Start New Invoice (reset) ---------------------- */
  function newInvoice() {
    if (!window.confirm("Start new invoice? Unsaved changes will be lost.")) return;

    setLoadedInvoiceId(null);
    setCustomerName("");
    setCustomerAddress("");
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setRows([]);
    setDiscountValue("");
    setDiscountType("amount");
    setEditingIndex(null);
    setForm({ item: "", quantity: "", unit: "", rate: "" });
  }

  /* ---------------------- Print Preview ---------------------- */
function openPrintView(inv = null, autoPrint = false) {
  // Build unified invoice object (same structure PDF expects)
  const payload = inv
    ? {
        ...inv,
        companyInfo,
        companyUpi,
        showQr,
        amountReceived,
        totalAmount: inv.totalAmount,
        invoiceTitle: inv.invoiceTitle || invoiceTitle,
      }
    : {
        invoiceNumber: loadedInvoiceId
          ? savedInvoices.find((s) => s.id === loadedInvoiceId)?.invoiceNumber
          : "Draft",
        invoiceDate,
        customerName,
        customerAddress,
        items: rows,
        discountType,
        discountValue,
        terms,
        companyInfo,
        companyUpi,
        showQr,
        amountReceived,
        totalAmount: totals.total,
        invoiceTitle,
      };

  // Generate HTML using the structured payload
  const html = renderInvoiceHtml(payload);

  // Open new window & show preview
  const w = window.open("", "_blank", "width=900,height=900");
  w.document.write(html);
  w.document.close();

  if (autoPrint) w.print();
}


  /* ---------------------- PDF Export ---------------------- */
  function exportCurrentPdf() {
    const inv = loadedInvoiceId
      ? savedInvoices.find((s) => s.id === loadedInvoiceId)
      : null;

    const payload = inv
  ? {
      ...inv,
      companyInfo,
      showQr,
      amountReceived: inv.amountReceived || 0,
    }
  : {
      invoiceNumber: "Draft",
      invoiceDate,
      customerName,
      customerAddress,
      items: rows,
      discountType,
      discountValue,
      terms,
      companyInfo,
      invoiceTitle,
      showQr,
      amountReceived: Number(amountReceived || 0),
    };

    // pass companyUpi explicitly so PDF generator can use it
   exportPdf({
  ...payload,
  companyUpi: companyUpi || null,
  showQr: showQr
});


  }

  /* ---------------------- Save terms locally (small helper) ---------------------- */
  function saveTermsLocally() {
    localStorage.setItem("invoice_terms", terms || "");
    setCompanyInfo((c) => ({ ...(c || {}), terms }));
    alert("✅ Terms saved locally. (You can add server-side persistence later.)");
  }

  /* ---------------------- UI (return) ---------------------- */
  return (
    <div className="p-8 min-h-screen bg-gray-50">
      {/* Document Title input */}
      <div className="mb-3">
        <input
          className="p-3 border rounded w-full md:w-64 font-semibold text-lg"
          placeholder="Document Title (e.g., Invoice, Cash Memo, Labour Bill)"
          value={invoiceTitle}
          onChange={(e) => setInvoiceTitle(e.target.value)}
        />
      </div>

      {/* Header / Company Info (C4 card) */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow border border-gray-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-1">{companyInfo?.name}</h2>
            <div className="text-sm text-slate-600">{companyInfo?.address}</div>
            <div className="text-sm text-slate-600">
              Phone: {companyInfo?.phone} {companyInfo?.email ? `| Email: ${companyInfo.email}` : ""}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-slate-600">
              Invoice No:{" "}
              <strong>
                {loadedInvoiceId ? (savedInvoices.find((s) => s.id === loadedInvoiceId)?.invoiceNumber) : "Draft"}
              </strong>
            </div>
            <div className="text-sm text-slate-600">Date: <strong>{invoiceDate}</strong></div>
          </div>
        </div>
      </div>

      {/* Editor card (C4) */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="p-3 border rounded"
            placeholder="Customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <input
            className="p-3 border rounded"
            placeholder="Customer address"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
          />
          <input
            className="p-3 border rounded"
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />
        </div>
      </div>

      {/* Add item row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center mb-4">
        <input
          list="itemList"
          name="item"
          value={form.item}
          onChange={handleChange}
          placeholder="Type or select item name"
          className="p-3 border rounded md:col-span-2"
        />
        <datalist id="itemList">
          {savedItems.map((it, index) => (
            <option key={index} value={it.name} />
          ))}
        </datalist>

        <input
          name="quantity"
          value={form.quantity}
          onChange={handleChange}
          placeholder="Quantity"
          className="p-3 border rounded"
        />

        <select
          name="unit"
          value={form.unit}
          onChange={handleChange}
          className="p-3 border rounded w-full"
        >
          <option value="">Select Unit</option>
          {units.map((u, i) => <option key={i} value={u}>{u}</option>)}
        </select>

        <input
          name="rate"
          type="number"
          value={form.rate}
          onChange={handleChange}
          placeholder="Rate"
          className="p-3 border rounded"
        />

        <div className="md:col-span-5 text-right">
          <button
            onClick={addOrUpdateRow}
            className="bg-green-600 text-white px-5 py-3 rounded shadow mt-3"
          >
            {editingIndex !== null ? "Update" : "➕ Add"}
          </button>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto border border-gray-200">
        <table className="w-full">
          <thead className="bg-sky-600 text-white">
            <tr>
              <th className="p-3 text-left">#</th>
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-right">Qty</th>
              <th className="p-3 text-center">Unit</th>
              <th className="p-3 text-right">Rate</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-3">{i + 1}</td>
                <td className="p-3">{r.item}</td>
                <td className="p-3 text-right">{r.quantity}</td>
                <td className="p-3 text-center">{r.unit}</td>
                <td className="p-3 text-right">{formatCurrency(r.rate)}</td>
                <td className="p-3 text-right font-semibold">{formatCurrency(r.amount)}</td>
                <td className="p-3 text-center">
                  <button onClick={() => editRow(i)} className="bg-yellow-400 px-2 py-1 rounded mr-2">✏️</button>
                  <button onClick={() => deleteRow(i)} className="bg-red-500 px-2 py-1 rounded text-white">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Discount & Terms */}
      <div className="mt-4 flex flex-col md:flex-row gap-4 items-start">
        <div className="flex items-center gap-3">
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value)}
            className="p-3 border rounded"
          >
            <option value="amount">Discount (₹)</option>
            <option value="percent">Discount (%)</option>
          </select>

          <input
            className="p-3 border rounded w-44"
            type="number"
            placeholder="Enter discount"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
          />
        </div>

        <div className="mt-4">
  <label className="flex items-center gap-2">
    <input 
      type="checkbox" 
      checked={showQr}
      onChange={(e) => setShowQr(e.target.checked)}
    />
    <span>Show QR Code on this invoice</span>
  </label>
</div>


        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700">Terms & Conditions (editable)</label>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            className="mt-1 p-3 border rounded w-full"
            rows={3}
          />
          <div className="mt-2">
            <button onClick={saveTermsLocally} className="bg-indigo-600 text-white px-4 py-2 rounded">Save Terms</button>
          </div>
        </div>
      </div>

      {/* Summary (B3 box) */}
      <div className="mt-6 flex items-start justify-end gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 w-72 text-right">
          <div className="flex justify-between"><span>Subtotal</span><span>₹ {formatCurrency(totals.subtotal)}</span></div>
          <div className="flex justify-between mt-2"><span>Discount</span><span>₹ {formatCurrency(totals.discount)}</span></div>
          <div className="border-t mt-3 pt-2 flex justify-between font-semibold text-lg"><span>Total</span><span>₹ {formatCurrency(totals.total)}</span></div>
        <div className="flex justify-between mt-2">
  <span>Amount Received</span>
  <input
    type="number"
    min="0"
    className="border p-1 w-32 text-right rounded"
    placeholder="0.00"
    value={amountReceived}
    onChange={(e) => setAmountReceived(e.target.value)}
  />
</div>

{amountReceived > 0 && (
  <div className="flex justify-between mt-2 font-semibold text-red-700">
    <span>Balance Due</span>
    <span>₹ {(totals.total - Number(amountReceived)).toLocaleString("en-IN")}</span>
  </div>
)}

        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-3 items-center">
        <button onClick={newInvoice} className="bg-gray-800 text-white px-4 py-2 rounded">＋ New Invoice</button>

        <button onClick={saveInvoice} disabled={saving} className="bg-blue-600 text-white px-5 py-3 rounded">💾 Save Invoice</button>

        <button onClick={() => openPrintView(null)} className="bg-gray-700 text-white px-5 py-3 rounded">👁️ Preview</button>

        <button onClick={() => openPrintView(null, true)} className="bg-gray-600 text-white px-5 py-3 rounded">🖨 Print</button>

        <button onClick={exportCurrentPdf} className="bg-green-600 text-white px-5 py-3 rounded">📄 Export PDF</button>

        {loadedInvoiceId && (
          <button onClick={() => deleteInvoice(savedInvoices.find((s) => s.id === loadedInvoiceId))} className="bg-red-600 text-white px-4 py-2 rounded ml-2">🗑️ Delete Invoice</button>
        )}
      </div>

      {/* Saved invoices list */}
      <div className="mt-10">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">Saved Invoices</h3>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search by Invoice No or Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-3 border rounded w-full md:w-1/2"
          />
        </div>
        {filteredInvoices.length === 0 ? (
          <p className="text-gray-500">{searchTerm ? "No invoices match your search." : "No invoices yet."}</p>
        ) : (
          filteredInvoices.map((inv) => (
            <div key={inv.id} className="bg-white border rounded p-4 mb-3 flex justify-between items-center">
              <div>
                <div className="font-semibold">{inv.invoiceNumber}</div>
                <div className="text-sm text-gray-600">{inv.customerName} • ₹ {formatCurrency(inv.totalAmount)}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => loadInvoice(inv)} className="bg-blue-500 text-white px-3 py-1 rounded">Open</button>
                <button onClick={() => openPrintView(inv)} className="bg-gray-700 text-white px-3 py-1 rounded">Print</button>
<button
  onClick={() =>
    exportPdf({
      ...inv,
      companyInfo,
      companyUpi,
      showQr,
      amountReceived: inv.amountReceived || 0,
    })
  }
  className="bg-green-600 text-white px-3 py-1 rounded"
>
  PDF
</button>
                <button onClick={() => deleteInvoice(inv)} className="bg-red-500 text-white px-3 py-1 rounded">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}