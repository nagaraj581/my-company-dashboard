import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getCompanyInfo } from "../config/companyInfo";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { useCurrency } from "../context/CurrencyContext";
import { SkeletonLoader } from "../components/SkeletonLoader";




export default function Quotation() {
  const [items, setItems] = useState([]);
  const [quotationItems, setQuotationItems] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [loadingQuotations, setLoadingQuotations] = useState(true);
  const [selectedItem, setSelectedItem] = useState("");
  const [customName, setCustomName] = useState("");
  const [unit, setUnit] = useState("");
  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [customer, setCustomer] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingQuotation, setEditingQuotation] = useState(null);
  const [hideRates, setHideRates] = useState(false);
  const { currency } = useCurrency();
  const currencySymbol = currency === "AED" ? "AED" : "₹";

  const auth = getAuth();
  const loggedUser = auth.currentUser?.displayName || "User";
  const [preparedBy, setPreparedBy] = useState(loggedUser);


  // ✅ Load items from Firestore
  useEffect(() => {
  if (!currency) return; // 🔑 IMPORTANT GUARD

  const q = query(
    collection(db, "items"),
    where("currency", "==", currency)
  );

  const unsub = onSnapshot(q, (snap) => {
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });

  return () => unsub();
}, [currency]);

  // ... after useState declarations and after fetch items useEffect
useEffect(() => {
  if (!selectedItem || selectedItem === "custom") return;

  const itm = items.find(i => i.id === selectedItem);
  if (itm) {
    setCustomName(itm.name);
    setUnit(itm.unit || "");
    setRate(itm.rate || "");
  }
}, [selectedItem, items]);

  const navigate = useNavigate();



  // ✅ Listen for live quotation updates
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "quotations"), (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setQuotations(list.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
      setLoadingQuotations(false); // 🔑 IMPORTANT
    });
    return () => unsub();
  }, []);

  

  // ✅ Auto-generate next quotation number
  const getNextQuotationNumber = async () => {
    const q = query(
      collection(db, "quotations"),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return `Q-${new Date().getFullYear()}-001`;
    } else {
      const last = snapshot.docs[0].data();
      const lastNum = parseInt(last.quotationNo?.split("-")[2] || "0", 10) + 1;
      return `Q-${new Date().getFullYear()}-${String(lastNum).padStart(3, "0")}`;
    }
  };

  // ✅ Add or update item inside quotation
const handleAddItem = () => {
  const itm = items.find(i => i.id === selectedItem);

  const itemName =
    selectedItem === "custom"
      ? customName.trim()
      : itm?.name;

  const itemUnit =
    selectedItem === "custom"
      ? unit.trim()
      : itm?.unit || "";

  if (!itemName || !quantity || !itemUnit)
    return alert("Please enter all fields");

  // ⭐ FIX: Allow editable rate
  let cleanRate;
  if (selectedItem === "custom") {
    cleanRate = Number(String(rate).replace(/[^0-9.]/g, "")) || 0;
  } else {
    cleanRate =
      rate !== "" && !isNaN(rate)
        ? Number(rate)
        : Number(itm?.rate || 0);
  }

  const cleanQty = Number(quantity);

  const newItem = {
    name: itemName,
    unit: itemUnit,
    quantity: cleanQty,
    rate: cleanRate,
    amount: cleanQty * cleanRate,
  };

  if (editingIndex !== null) {
    const updated = [...quotationItems];
    updated[editingIndex] = newItem;
    setQuotationItems(updated);
    setEditingIndex(null);
  } else {
    setQuotationItems([...quotationItems, newItem]);
  }

  // Reset fields
  setSelectedItem("");
  setCustomName("");
  setUnit("");
  setQuantity("");
  setRate("");
};

  // ✅ Edit individual item
  const handleEditItem = (index) => {
    const item = quotationItems[index];
    setEditingIndex(index);
    setSelectedItem("custom");
    setCustomName(item.name);
    setUnit(item.unit);
    setQuantity(item.quantity);
    setRate(item.rate);
  };

  // ✅ Delete individual item
  const handleDeleteItem = (index) => {
    if (window.confirm("Delete this item?")) {
      setQuotationItems(quotationItems.filter((_, i) => i !== index));
    }
  };

  // ✅ Save or Update Quotation
  const handleSaveQuotation = async () => {
    if (!customer.trim()) return alert("Enter customer name");
    if (quotationItems.length === 0) return alert("Add at least one item");

    setSaving(true);
    const total = quotationItems.reduce((sum, i) => sum + i.amount, 0);

    try {
      if (editingQuotation) {
        // 🔹 Update existing quotation
        const ref = doc(db, "quotations", editingQuotation.id);
        await updateDoc(ref, {
          customer,
          items: quotationItems,
          total,
          preparedBy,
        });
        alert("✅ Quotation updated!");
      } else {
        // 🔹 Add new quotation with unique number
        const quotationNo = await getNextQuotationNumber();
        await addDoc(collection(db, "quotations"), {
          quotationNo,
          customer,
          items: quotationItems,
          total,
          currency,
          preparedBy,
          createdAt: Timestamp.now(),
        });
        alert(`✅ Quotation ${quotationNo} saved!`);
      }

      setCustomer("");
      setQuotationItems([]);
      setEditingQuotation(null);
    } catch (e) {
      alert("❌ " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // ✅ Edit entire saved quotation
  const handleEditQuotation = (quotation) => {
    setCustomer(quotation.customer);
    setQuotationItems(quotation.items);
    setEditingQuotation(quotation);
  };

  // ✅ Delete saved quotation
  const handleDeleteQuotation = async (id) => {
    if (window.confirm("Are you sure you want to delete this quotation?")) {
      await deleteDoc(doc(db, "quotations", id));
      alert("🗑️ Quotation deleted");
    }
  };

// ✅ FINAL — CLEAN, ERROR-FREE PDF EXPORT
// ✅ Helper functions for currency
function getCurrencySymbol(curr) {
  return curr === "AED" ? "AED" : "Rs";
}

function getCurrencyWords(curr) {
  return curr === "AED" ? "Dirhams Only" : "Rupees Only";
}

const handleExportPDF = async (q, preview = false) => {
    const companyInfo = await getCompanyInfo();
  const doc = new jsPDF("p", "pt", "a4");

  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 40;
  const right = 40;

  /* ------------------------------- HEADER ------------------------------- */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text("QUOTATION", left, 60);

  doc.setDrawColor(30, 80, 130);
  doc.setLineWidth(1.2);
  doc.line(left, 75, pageWidth - right, 75);

  /* --------------------------- COMPANY INFO ----------------------------- */
  let y = 100;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(companyInfo.name || "", left, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  const addr = doc.splitTextToSize(companyInfo.address || "", 260);
  y += 16;
  doc.text(addr, left, y);
  y += addr.length * 12;

  const contact =
    `Phone: ${companyInfo.phone}` +
    (companyInfo.email ? ` | Email: ${companyInfo.email}` : "");

  y += 14;
  doc.text(contact, left, y);

  /* ------------------------ QUOTATION META RIGHT ------------------------ */
  const metaX = pageWidth - right;
  const dateStr =
    q.createdAt?.toDate().toLocaleDateString("en-IN") ||
    new Date().toLocaleDateString("en-IN");

  doc.text(`Quotation No: ${q.quotationNo}`, metaX, 100, { align: "right" });
  doc.text(`Date: ${dateStr}`, metaX, 118, { align: "right" });

  /* ---------------------------- CUSTOMER --------------------------- */
  y += 30;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Customer:", left, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text(String(q.customer || ""), left + 75, y);

  /* ------------------------------ TABLE ------------------------------ */
  const tableStart = y + 25;

  const hide = hideRates;

  const head = hide
    ? [["#", "Item", "Qty", "Unit", "Amount"]]
    : [["#", "Item", "Qty", "Unit", "Rate", "Amount"]];

  const body = q.items.map((i, idx) => {
    const amount = Number(i.amount || i.quantity * i.rate);

    return hide
      ? [
          idx + 1,
          i.name,
          i.quantity,
          i.unit,
          amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
        ]
      : [
          idx + 1,
          i.name,
          i.quantity,
          i.unit,
          Number(i.rate).toLocaleString("en-IN", { minimumFractionDigits: 2 }),
          amount.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
        ];
  });

  autoTable(doc, {
    startY: tableStart,
    head,
    body,
    theme: "grid",
    margin: { left, right },
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 6,
    },
    headStyles: {
      fillColor: [30, 80, 130],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: hide
      ? {
          0: { cellWidth: 25, halign: "center" },
          1: { cellWidth: "auto", halign: "left" },
          2: { cellWidth: 50, halign: "center" },
          3: { cellWidth: 50, halign: "center" },
          4: { cellWidth: 80, halign: "right" },
        }
      : {
          0: { cellWidth: 25, halign: "center" },
          1: { cellWidth: "auto", halign: "left" },
          2: { cellWidth: 50, halign: "center" },
          3: { cellWidth: 50, halign: "center" },
          4: { cellWidth: 70, halign: "right" },
          5: { cellWidth: 90, halign: "right" },
        },
  });

  const finalY = doc.lastAutoTable.finalY + 20;

  /* ----------------------------- TOTAL ------------------------------ */
  const total = q.items.reduce((s, i) => s + i.amount, 0);

  const totalXLabel = pageWidth - right - 200;
  const totalXValue = pageWidth - right;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);

  doc.text("Total:", totalXLabel, finalY);
  doc.text(
    `${getCurrencySymbol(q.currency || currency)} ${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    totalXValue,
    finalY,
    { align: "right" }
  );

  /* ------------------------- AMOUNT IN WORDS ------------------------- */
  const words = numberToWords(total);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Amount in words: ${words} ${getCurrencyWords(q.currency || currency)}`, left, finalY + 40);

  /* ----------------------------- SIGNATURE ---------------------------- */
  const sigY = finalY + 100;

  const user = q.preparedBy || loggedUser;

  doc.line(left, sigY, left + 180, sigY);
  doc.text(`Prepared By: ${user}`, left, sigY + 15);

  doc.line(pageWidth - right - 180, sigY, pageWidth - right, sigY);
  doc.text("Authorized Signature", pageWidth - right - 140, sigY + 15);

  /* ------------------------------ FOOTER ------------------------------ */
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.text(
    "Thank you for your business!",
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 40,
    { align: "center" }
  );

  /* ------------------------------- SAVE ------------------------------ */
if (preview) {
  const blobUrl = doc.output("bloburl");
  window.open(blobUrl, "_blank");
} else {
  doc.save(`${q.quotationNo}.pdf`);
}};

// ✅ Helper: Convert numbers to words (Indian format)
function numberToWords(num) {
  if (!num) return "Zero";
  num = Math.floor(num);

  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];

  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100)
      return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
    if (n < 1000)
      return (
        a[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " and " + inWords(n % 100) : "")
      );
    if (n < 100000)
      return (
        inWords(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + inWords(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        inWords(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + inWords(n % 100000) : "")
      );
    return (
      inWords(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 ? " " + inWords(n % 10000000) : "")
    );
  }

  return inWords(num) || "Zero";
}

// ✅ Helper: Convert numbers to words (Indian format)
function numberToWordsInIndianFormat(num) {
  if (num === 0) return "Zero";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function twoDigits(n) {
    return n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  }

  function threeDigits(n) {
    let str = "";
    if (n > 99) {
      str += ones[Math.floor(n / 100)] + " Hundred";
      n = n % 100;
      if (n) str += " and ";
    }
    if (n) str += twoDigits(n);
    return str.trim();
  }

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num / 100000) % 100);
  const thousand = Math.floor((num / 1000) % 100);
  const hundred = Math.floor(num % 1000);

  let words = "";
  if (crore) words += threeDigits(crore) + " Crore ";
  if (lakh) words += threeDigits(lakh) + " Lakh ";
  if (thousand) words += threeDigits(thousand) + " Thousand ";
  if (hundred) words += threeDigits(hundred);

  return words.trim().replace(/\s+/g, " ");
}

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent mb-2 flex items-center gap-2">
          📑 Quotation
        </h2>
        <p className="text-slate-600 dark:text-slate-400">Create professional quotations for your clients</p>
      </div>

      {/* Customer Input */}
      <div className="bg-white/90 dark:bg-slate-900/75 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Customer Name</label>
            <input
              type="text"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Enter customer or client name"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">💱 Currency</label>
            <div className="px-4 py-3 rounded-lg bg-blue-50 dark:bg-slate-700 border border-sky-200 dark:border-slate-600 font-semibold text-sky-700 dark:text-sky-400">
              {currency}
            </div>
          </div>
        </div>
      </div>

      {/* Add Item Section */}
      <div className="bg-white/90 dark:bg-slate-900/75 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Add Items to Quotation</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Item Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Item</label>
            <select
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 transition-all"
            >
              <option value="">Select Item</option>
              <option value="custom">➕ Custom Item</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Item Name */}
          {selectedItem === "custom" && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Item Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter custom item"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 transition-all"
              />
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Qty</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 transition-all"
            />
          </div>

          {/* Unit */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Unit</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. Nos, Kgs"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 transition-all"
            />
          </div>

          {/* Rate */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Rate</label>
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 transition-all"
            />
          </div>

          {/* Add Button */}
          <button
            onClick={handleAddItem}
            className={`self-end w-full ${
              editingIndex !== null
                ? "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700"
                : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
            } text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-3`}
          >
            {editingIndex !== null ? "✏️ Update Item" : "➕ Add Item"}
          </button>
        </div>
      </div>

      {/* Items Table */}
      {quotationItems.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-sky-600 to-indigo-600 text-white">
                  <th className="px-6 py-4 text-left text-sm font-semibold">Item</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Qty</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Unit</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold">Rate</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold">Amount</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {quotationItems.map((i, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-800 dark:text-white">{i.name}</td>
                    <td className="px-6 py-4 text-sm text-center text-slate-600 dark:text-slate-300">{i.quantity}</td>
                    <td className="px-6 py-4 text-sm text-center text-slate-600 dark:text-slate-300">{i.unit}</td>
                    <td className="px-6 py-4 text-sm text-right text-slate-800 dark:text-white">{currencySymbol} {i.rate.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-right font-semibold text-sky-600 dark:text-sky-400">
                      {currencySymbol} {i.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEditItem(idx)}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteItem(idx)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-700 dark:to-slate-800 border-t border-slate-200 dark:border-slate-600 px-6 py-6">
            <div className="flex justify-end items-center">
              <div className="space-y-2 text-right">
                <div className="flex justify-between gap-8">
                  <span className="text-sm text-slate-600 dark:text-slate-300">Subtotal:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{currencySymbol} {quotationItems.reduce((sum, i) => sum + i.amount, 0).toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t-2 border-sky-200 dark:border-slate-600 flex justify-between gap-8">
                  <span className="text-lg font-bold text-sky-600 dark:text-sky-400">Total:</span>
                  <span className="text-2xl font-bold text-sky-600 dark:text-sky-400">{currencySymbol} {quotationItems.reduce((sum, i) => sum + i.amount, 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Quotation Section */}
      <div className="bg-white/90 dark:bg-slate-900/75 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Save Quotation</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Store and manage your quotation</p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hideRates}
              onChange={(e) => setHideRates(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Hide rates in PDF</span>
          </label>
        </div>

        <button
  onClick={() =>
    handleExportPDF(
      {
        quotationNo: "Preview",
        customer,
        items: quotationItems,
        currency,
        preparedBy,
        createdAt: Timestamp.now(),
      },
      true
    )
  }
  disabled={quotationItems.length === 0}
  className="w-full mb-3 bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg shadow font-semibold"
>
  👁 Preview PDF
</button>

        <div className="space-y-2 mb-3">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Prepared By
          </label>
          <input
            type="text"
            value={preparedBy}
            onChange={(e) => setPreparedBy(e.target.value)}
            placeholder="Enter person name"
            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-sky-500 transition-all"
          />
        </div>

        <button
          onClick={handleSaveQuotation}
          disabled={saving}
          className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 disabled:opacity-50 text-white px-6 py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 font-semibold text-lg"
        >
          {saving
            ? "💾 Saving..."
            : editingQuotation
            ? "💾 Update Quotation"
            : "💾 Save Quotation"}
        </button>
      </div>

      {/* Saved Quotations */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-white">🗂️ Saved Quotations</h3>

        {loadingQuotations ? (
          <SkeletonLoader rows={3} variant="card" />
        ) : quotations.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
            <p className="text-slate-500 dark:text-slate-400 text-lg">📭 No quotations yet. Create your first quotation!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {quotations.map((q) => (
              <div
                key={q.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-6 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-sky-600 dark:text-sky-400">
                      🧾 {q.quotationNo || "-"}
                    </h4>
                    <p className="text-slate-700 dark:text-slate-300 mt-1">
                      <span className="font-semibold">Client:</span> {q.customer}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {q.createdAt
                        ? q.createdAt.toDate().toLocaleDateString("en-IN")
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                    <button
  onClick={() => {
    setQuotationItems(q.items);
    setCustomer(q.customer);
    setPreparedBy(q.preparedBy || loggedUser);
    setEditingQuotation(q);   // ✅ THIS makes it edit mode
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
  className="bg-slate-500 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
>
  📂 Open
</button>

                    <button
  onClick={() => handleExportPDF(q, true)}
  className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
>
  👁 Preview
</button>

<button
  onClick={() => handleExportPDF(q)}
  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
>
  ⬇ Download
</button>
                    <button
                      onClick={() => {
                        if (window.confirm("Delete this quotation?")) {
                          deleteDoc(doc(db, "quotations", q.id));
                        }
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

