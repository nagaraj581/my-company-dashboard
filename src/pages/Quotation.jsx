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



export default function Quotation() {
  const [items, setItems] = useState([]);
  const [quotationItems, setQuotationItems] = useState([]);
  const [quotations, setQuotations] = useState([]);
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
    const auth = getAuth();
const loggedUser = auth.currentUser?.displayName || "User";


  // ✅ Load items from Firestore
  useEffect(() => {
    const fetchItems = async () => {
      const querySnapshot = await getDocs(collection(db, "items"));
      setItems(querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchItems();
  }, []);
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
const handleExportPDF = async (q) => {
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
    `Rs. ${total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    totalXValue,
    finalY,
    { align: "right" }
  );

  /* ------------------------- AMOUNT IN WORDS ------------------------- */
  const words = numberToWords(total);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Amount in words: ${words}`, left, finalY + 40);

  /* ----------------------------- SIGNATURE ---------------------------- */
  const sigY = finalY + 100;

  const user = localStorage.getItem("userName") || loggedUser;

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
  doc.save(`${q.quotationNo}.pdf`);
};

// ✅ Helper: Convert numbers to words (Indian format)
function numberToWords(num) {
  if (!num) return "Zero Rupees Only";
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

  return inWords(num) + " Rupees Only";
}

// ✅ Helper: Convert numbers to words (Indian format)
function numberToWordsInIndianFormat(num) {
  if (num === 0) return "Zero Rupees Only";

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

  return (words.trim() + " Rupees Only").replace(/\s+/g, " ");
}

  return (
    <div className="p-8 min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      <h2 className="text-2xl font-bold text-blue-700 mb-6 flex items-center gap-2">
        📑 Quotation
      </h2>

      {/* Customer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <input
          type="text"
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          placeholder="Enter customer / client name"
          className="p-3 border rounded-lg"
        />
      </div>

      {/* Add Item */}
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-4 mb-4">
        <select
          value={selectedItem}
          onChange={(e) => setSelectedItem(e.target.value)}
          className="p-3 border rounded-lg"
        >
          <option value="">Select Item</option>
          <option value="custom">➕ Custom Item</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>

        {selectedItem === "custom" && (
          <input
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Item name"
            className="p-3 border rounded-lg"
          />
        )}

        
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Qty"
          className="p-3 border rounded-lg"
        />
        <input
          type="text"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Unit"
          className="p-3 border rounded-lg"
        />
        <input
          type="number"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="Rate"
          className="p-3 border rounded-lg"
        />
        <button
          onClick={handleAddItem}
          className={`${
            editingIndex !== null
              ? "bg-yellow-600 hover:bg-yellow-700"
              : "bg-green-600 hover:bg-green-700"
          } text-white font-semibold rounded-lg shadow transition px-4 py-2`}
        >
          {editingIndex !== null ? "✏️ Update" : "➕ Add"}
        </button>
      </div>

      {/* Items Table */}
      {quotationItems.length > 0 && (
        <div className="overflow-x-auto mb-6">
          <table className="w-full border-collapse bg-white rounded-lg shadow">
            <thead>
              <tr className="bg-blue-100">
                <th className="p-2">Item</th>
                <th className="p-2">Qty</th>
                <th className="p-2">Unit</th>
                <th className="p-2">Rate</th>
                <th className="p-2">Amount</th>
                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {quotationItems.map((i, idx) => (
                <tr key={idx} className="border-b hover:bg-blue-50">
                  <td className="p-2">{i.name}</td>
                  <td className="p-2">{i.quantity}</td>
                  <td className="p-2">{i.unit}</td>
                  <td className="p-2">₹ {i.rate.toFixed(2)}</td>
                  <td className="p-2 text-right font-semibold">
                    ₹ {i.amount.toFixed(2)}
                  </td>
                  <td className="p-2 text-center">
                    <button
                      onClick={() => handleEditItem(idx)}
                      className="text-yellow-600 hover:underline mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteItem(idx)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-right font-semibold mt-3 text-lg">
            Total: ₹{" "}
            {quotationItems.reduce((sum, i) => sum + i.amount, 0).toFixed(2)}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-wrap gap-3 items-center mb-6">
        <button
          onClick={handleSaveQuotation}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg shadow font-semibold"
        >
          {saving
            ? "Saving..."
            : editingQuotation
            ? "💾 Update Quotation"
            : "💾 Save Quotation"}
        </button>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hideRates}
            onChange={(e) => setHideRates(e.target.checked)}
          />
          Hide rates in PDF
        </label>
      </div>

      {/* Saved Quotations */}
      <div className="mt-10">
        <h3 className="text-lg font-semibold text-blue-700 mb-3">
          🗂️ Saved Quotations
        </h3>

        {quotations.length === 0 ? (
          <p className="text-gray-500">No quotations saved yet.</p>
        ) : (
          quotations.map((q) => (
            <div
              key={q.id}
              className="bg-white border rounded-lg shadow-sm p-4 mb-4"
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-blue-700">
                  🧾 {q.quotationNo || "-"} — {q.customer}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">
                    {q.createdAt
                      ? q.createdAt.toDate().toLocaleDateString("en-IN")
                      : ""}
                  </span>
                  <button
                    onClick={() => handleEditQuotation(q)}
                    className="text-yellow-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteQuotation(q.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => handleExportPDF(q)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm shadow-sm"
                  >
                    📄 Export PDF
                  </button>
<button
  onClick={() =>
    navigate(`/invoice`, {
      state: { quotation: q }   // pass full quotation object
    })
  }
  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-md text-sm shadow-sm"
>
  🔄 Convert to Invoice
</button>

                </div>
                </div>

              

              <table className="w-full border-collapse text-sm mb-2">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="p-2">Item</th>
                    <th className="p-2">Unit</th>
                    <th className="p-2">Qty</th>
                    <th className="p-2">Rate</th>
                    <th className="p-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {q.items.map((item, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{item.name}</td>
                      <td className="p-2">{item.unit}</td>
                      <td className="p-2">{item.quantity}</td>
                      <td className="p-2">{item.rate}</td>
                      <td className="p-2">{item.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="font-semibold text-blue-700">
                Total: ₹ {q.total?.toFixed(2)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
