// src/pages/Invoice.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDoc,
  Timestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

import { clearCompanyInfoCache, getCompanyInfo } from "../config/companyInfo";
import { useUnits } from "../hooks/useUnits";
import { useSearchParams, useLocation } from "react-router-dom";
import { useCurrency } from "../context/CurrencyContext";
import { addStockMovement } from "../services/stockService";

import {
  formatCurrency,
  amountToWords,
  getNextInvoiceNumber,
  parseInvoiceDate,
  calcTotals,
} from "./invoice/invoiceUtils";

import { exportPdf } from "./invoice/InvoicePDF";
import { renderInvoiceHtml } from "./invoice/InvoicePrint";

export default function InvoicePage() {
  const units = useUnits();
  const { currency } = useCurrency();

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

  const [saving, setSaving] = useState(false);
  const [showQr, setShowQr] = useState(true);

  // ---- Wood CFT Modal ----
const [showWoodModal, setShowWoodModal] = useState(false);

const [woodName, setWoodName] = useState("");
const [woodLength, setWoodLength] = useState("");   // ft
const [woodWidth, setWoodWidth] = useState("");     // inch
const [woodThickness, setWoodThickness] = useState(""); // inch
const [woodQty, setWoodQty] = useState("");



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
      unsubItems = onSnapshot(
        query(collection(db, "items"), where("currency", "==", currency)),
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setSavedItems(list);
        }
      );

      // live invoices listener (currency-filtered, newest first)
      unsubInvoices = onSnapshot(
        query(collection(db, "invoices"), where("currency", "==", currency)),
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          list.sort((a, b) =>
            (a.createdAt?.seconds || 0) < (b.createdAt?.seconds || 0) ? 1 : -1
          );
          setSavedInvoices(list);
        }
      );

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
        const qRef = doc(db, "quotations", fromQuote);
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
                itemId:
                  savedItems.find(
                    (s) => s.name?.toLowerCase() === it.name?.toLowerCase()
                  )?.id || null,
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
  }, [fromQuote]);

  // If navigation state passes a quotation object
  useEffect(() => {
    if (!location.state?.quotation) return;
    const q = location.state.quotation;
    setCustomerName(q.customer || "");
    setCustomerAddress("");
    if (Array.isArray(q.items)) {
      const formattedItems = q.items.map((item) => ({
        item: item.name,
        itemId:
          savedItems.find(
            (s) => s.name?.toLowerCase() === item.name?.toLowerCase()
          )?.id || null,
        quantity: Number(item.quantity),
        unit: item.unit,
        rate: Number(item.rate),
        amount: Number(item.amount),
      }));
      setRows(formattedItems);
    }
  }, [location.state, savedItems]);

  // totals (memoized)
  const totals = useMemo(() => calcTotals(rows, discountType, discountValue), [
    rows,
    discountType,
    discountValue,
  ]);

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
      itemId: savedItems.find(
        (it) => it.name?.toLowerCase() === item.trim().toLowerCase()
      )?.id || null,
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

  async function removeOldInvoiceStockMovements(invoiceId) {
    const q = query(
      collection(db, "stockMovements"),
      where("referenceType", "==", "INVOICE"),
      where("referenceId", "==", invoiceId)
    );

    const snapshot = await getDocs(q);

    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, "stockMovements", docSnap.id));
    }
  }


  /* ---------------------- Save Invoice ---------------------- */
  async function saveInvoice() {
    if (!customerName.trim()) return alert("Enter customer name");
    if (rows.length === 0) return alert("Add at least one item");

    setSaving(true);
    try {
      const materialRows = rows.filter((r) => r.itemId);

      const movementQuery = query(
        collection(db, "stockMovements"),
        where("currency", "==", currency)
      );
      const movementSnapshot = await getDocs(movementQuery);
      const stockMap = {};
      movementSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data?.itemId) return;
        if (!stockMap[data.itemId]) stockMap[data.itemId] = 0;
        if (data.type === "IN") stockMap[data.itemId] += Number(data.quantity);
        if (data.type === "OUT") stockMap[data.itemId] -= Number(data.quantity);
      });

      // For edits, add back this invoice's existing OUT quantities before validating.
      const currentInvoiceUsageMap = {};
      if (loadedInvoiceId) {
        const currentInvoiceMovementsQuery = query(
          collection(db, "stockMovements"),
          where("referenceType", "==", "INVOICE"),
          where("referenceId", "==", loadedInvoiceId)
        );
        const currentInvoiceMovementsSnapshot = await getDocs(
          currentInvoiceMovementsQuery
        );
        currentInvoiceMovementsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (!data?.itemId || data.type !== "OUT") return;
          currentInvoiceUsageMap[data.itemId] =
            (currentInvoiceUsageMap[data.itemId] || 0) + Number(data.quantity || 0);
        });
      }

      let insufficient = false;
      materialRows.forEach((row) => {
        const currentStock = stockMap[row.itemId] || 0;
        const currentInvoiceQty = currentInvoiceUsageMap[row.itemId] || 0;
        const availableForThisSave = currentStock + currentInvoiceQty;
        if (Number(row.quantity) > availableForThisSave) insufficient = true;
      });

      if (insufficient) {
        const proceed = window.confirm(
          "Some items exceed available stock. Continue anyway?"
        );
        if (!proceed) {
          setSaving(false);
          return;
        }
      }

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
        currency,
      };

      let invoiceId;
      if (loadedInvoiceId) {
        payload.updatedAt = Timestamp.now();
        await updateDoc(doc(db, "invoices", loadedInvoiceId), payload);
        invoiceId = loadedInvoiceId;
        alert("Invoice updated");
      } else {
        const invNo = await getNextInvoiceNumber();
        payload.invoiceNumber = invNo;
        payload.createdAt = Timestamp.now();

        const ref = await addDoc(collection(db, "invoices"), payload);
        setLoadedInvoiceId(ref.id);
        invoiceId = ref.id;
        alert(`Invoice ${invNo} saved`);
      }

      // If updating existing invoice, remove previous stock entries first
      if (loadedInvoiceId) {
        await removeOldInvoiceStockMovements(loadedInvoiceId);
      }

      for (const row of materialRows) {
        await addStockMovement({
          itemId: row.itemId,
          itemName: row.item,
          type: "OUT",
          quantity: row.quantity,
          referenceType: "INVOICE",
          referenceId: invoiceId,
          currency,
          date: invoiceDate,
        });
      }

      localStorage.setItem("invoice_terms", terms || "");
    } catch (err) {
      console.error("Save invoice error:", err);
      alert("Save failed");
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
  async function deleteInvoice(invoiceId) {
    const confirmDelete = window.confirm("Delete this invoice?");
    if (!confirmDelete) return;

    try {
      const q = query(
        collection(db, "stockMovements"),
        where("referenceType", "==", "INVOICE"),
        where("referenceId", "==", invoiceId)
      );
      const snapshot = await getDocs(q);

      for (const docSnap of snapshot.docs) {
        await deleteDoc(doc(db, "stockMovements", docSnap.id));
      }

      await deleteDoc(doc(db, "invoices", invoiceId));

      if (loadedInvoiceId === invoiceId) {
        resetInvoiceForm();
      }

      alert("Invoice deleted successfully");
    } catch (error) {
      console.error(error);
      alert("Delete failed");
    }
  }

  /* ---------------------- Start New Invoice (reset) ---------------------- */
  function resetInvoiceForm() {
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

  function newInvoice() {
    if (!window.confirm("Start new invoice? Unsaved changes will be lost.")) return;
    resetInvoiceForm();
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
    <div className="space-y-6">
      {/* Document Title input */}
      <div className="mb-3">
        <input
          className="p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl w-full md:w-80 font-bold text-lg bg-white/80 dark:bg-slate-900/70 shadow-sm"
          placeholder="Document Title (e.g., Invoice, Cash Memo, Labour Bill)"
          value={invoiceTitle}
          onChange={(e) => setInvoiceTitle(e.target.value)}
        />
      </div>

      {/* Header / Company Info (C4 card) */}
      <div className="bg-white/90 dark:bg-slate-900/75 rounded-2xl p-6 mb-6 shadow-lg border border-slate-200/80 dark:border-slate-700/70">
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
      <div className="bg-white/90 dark:bg-slate-900/75 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-5 mb-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/70"
            placeholder="Customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <input
            className="p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/70"
            placeholder="Customer address"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
          />
          <input
            className="p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/70"
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />
        </div>
      </div>

      {/* Add item row */}
      <div className="bg-white/90 dark:bg-slate-900/75 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-5 gap-3 items-center mb-4 shadow-sm">
        <input
          list="itemList"
          name="item"
          value={form.item}
          onChange={handleChange}
          placeholder="Type or select item name"
          className="p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl md:col-span-2 bg-white dark:bg-slate-900/70"
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
          className="p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/70"
        />

        <select
          name="unit"
          value={form.unit}
          onChange={handleChange}
          className="p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl w-full bg-white dark:bg-slate-900/70"
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
          className="p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/70"
        />

        <div className="md:col-span-5 text-right">
          <button
            onClick={addOrUpdateRow}
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-5 py-3 rounded-xl shadow-lg mt-3 font-semibold transition-all"
          >
            {editingIndex !== null ? "Update" : "➕ Add"}
          </button>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white/90 dark:bg-slate-900/75 rounded-2xl shadow-lg overflow-x-auto border border-slate-200/80 dark:border-slate-700/70">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white">
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
              <tr key={i} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50/70 dark:hover:bg-slate-800/70">
                <td className="p-3">{i + 1}</td>
                <td className="p-3">{r.item}</td>
                <td className="p-3 text-right">{r.quantity}</td>
                <td className="p-3 text-center">{r.unit}</td>
                <td className="p-3 text-right">{formatCurrency(r.rate)}</td>
                <td className="p-3 text-right font-semibold">{formatCurrency(r.amount)}</td>
                <td className="p-3 text-center">
                  <button onClick={() => editRow(i)} className="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-lg mr-2 transition-all">✏️</button>
                  <button onClick={() => deleteRow(i)} className="bg-red-500 hover:bg-red-600 px-2.5 py-1.5 rounded-lg text-white transition-all">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Discount & Terms */}
      <div className="mt-4 bg-white/90 dark:bg-slate-900/75 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-start shadow-sm">
        <div className="flex items-center gap-3">
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value)}
            className="p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/70"
          >
            <option value="amount">Discount</option>
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
            className="mt-1 p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl w-full bg-white dark:bg-slate-900/70"
            rows={3}
          />
          <div className="mt-2">
            <button onClick={saveTermsLocally} className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow">Save Terms</button>
          </div>
        </div>
      </div>

      {/* Summary (B3 box) */}
      <div className="mt-6 flex items-start justify-end gap-4">
        <div className="bg-white/90 dark:bg-slate-900/75 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-5 w-80 text-right shadow-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal, currency)}</span></div>
          <div className="flex justify-between mt-2"><span>Discount</span><span>{formatCurrency(totals.discount, currency)}</span></div>
          <div className="border-t mt-3 pt-2 flex justify-between font-semibold text-lg"><span>Total</span><span>{formatCurrency(totals.total, currency)}</span></div>
        <div className="flex justify-between mt-2">
  <span>Amount Received</span>
  <input
    type="number"
    min="0"
    className="border border-slate-200 dark:border-slate-700 p-2 w-32 text-right rounded-lg bg-white dark:bg-slate-900/70"
    placeholder="0.00"
    value={amountReceived}
    onChange={(e) => setAmountReceived(e.target.value)}
  />
</div>

{amountReceived > 0 && (
  <div className="flex justify-between mt-2 font-semibold text-red-700">
    <span>Balance Due</span>
    <span>{formatCurrency(totals.total - Number(amountReceived), currency)}</span>
  </div>
)}

        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-3 items-center">
        <button onClick={newInvoice} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl font-semibold transition-all">＋ New Invoice</button>

        <button onClick={saveInvoice} disabled={saving} className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white px-5 py-3 rounded-xl font-semibold shadow-lg transition-all">💾 Save Invoice</button>

        <button onClick={() => openPrintView(null)} className="bg-slate-700 hover:bg-slate-800 text-white px-5 py-3 rounded-xl font-semibold transition-all">👁️ Preview</button>

        <button onClick={() => openPrintView(null, true)} className="bg-slate-600 hover:bg-slate-700 text-white px-5 py-3 rounded-xl font-semibold transition-all">🖨 Print</button>

        <button onClick={exportCurrentPdf} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-xl font-semibold transition-all">📄 Export PDF</button>

        {loadedInvoiceId && (
          <button onClick={() => deleteInvoice(loadedInvoiceId)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl ml-2 font-semibold transition-all">🗑️ Delete Invoice</button>
        )}
      </div>

      {/* Saved invoices list */}
      <div className="mt-10 bg-white/90 dark:bg-slate-900/75 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-5">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">Saved Invoices</h3>
        {savedInvoices.length === 0 ? (
          <p className="text-gray-500">No invoices yet</p>
        ) : (
          savedInvoices.map((inv) => (
            <div key={inv.id} className="bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-3 flex justify-between items-center hover:shadow-md transition-all">
              <div>
                <div className="font-semibold">{inv.invoiceNumber}</div>
                <div className="text-sm text-gray-600">{inv.customerName} • {formatCurrency(inv.totalAmount, inv.currency || currency)}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => loadInvoice(inv)} className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">Open</button>
                <button onClick={() => openPrintView(inv)} className="bg-slate-600 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">Print</button>
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
  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
>
  PDF
</button>
                <button onClick={() => deleteInvoice(inv.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


