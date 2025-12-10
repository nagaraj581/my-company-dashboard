// helpers for Invoice module
// place at: src/pages/invoice/invoiceUtils.js

import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase";

export function formatCurrency(v) {
  return Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function amountToWords(amount) {
  if (amount === null || amount === undefined) return "";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];

  function twoDigitWords(num) {
    if (num < 10) return ones[num];
    if (num >= 10 && num < 20) return teens[num - 10];
    const t = Math.floor(num / 10);
    const o = num % 10;
    return `${tens[t]}${o ? " " + ones[o] : ""}`.trim();
  }

  function threeDigitWords(num) {
    const h = Math.floor(num / 100);
    const rem = num % 100;
    let str = "";
    if (h) str += ones[h] + " Hundred";
    if (rem) str += (str ? " " : "") + twoDigitWords(rem);
    return str.trim();
  }

  const intPart = Math.floor(Number(amount) || 0);
  const paise = Math.round((Number(amount) - intPart) * 100);

  const crore = Math.floor(intPart / 10000000);
  const lakh = Math.floor((intPart % 10000000) / 100000);
  const thousand = Math.floor((intPart % 100000) / 1000);
  const rest = intPart % 1000;

  const parts = [];
  if (crore) parts.push(`${threeDigitWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitWords(thousand)} Thousand`);
  if (rest) parts.push(threeDigitWords(rest));

  const intWords = parts.join(" ").trim() || "Zero";

  let result = `${intWords} Rupee${intPart !== 1 ? "s" : ""}`;
  if (paise) result += ` and ${twoDigitWords(paise)} Paise`;
  result += " Only";
  return result;
}

export async function getNextInvoiceNumber() {
  try {
    const year = new Date().getFullYear();
    const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      return `INV-${year}-001`;
    } else {
      const last = snap.docs[0].data();
      const lastInv = last.invoiceNumber || "";
      const parts = lastInv.split("-");
      const lastYear = parts[1] ? parseInt(parts[1], 10) : null;
      const lastNum = parts[2] || "0";
      let nextNum = 1;
      if (lastYear === year && /^\d+$/.test(lastNum)) {
        nextNum = parseInt(lastNum, 10) + 1;
      }
      return `INV-${year}-${String(nextNum).padStart(3, "0")}`;
    }
  } catch (e) {
    console.error("getNextInvoiceNumber", e);
    const fallback = new Date().getTime() % 1000;
    return `INV-${new Date().getFullYear()}-${String(fallback).padStart(3, "0")}`;
  }
}

export function parseInvoiceDate(input) {
  // input is either a firebase timestamp, Date or yyyy-mm-dd string
  if (!input) return new Date();
  if (input?.seconds && typeof input.toDate === "function") return input.toDate();
  if (input instanceof Date) return input;
  // assume yyyy-mm-dd
  return new Date(`${String(input)}T00:00:00`);
}

export function calcTotals(items, discountType, discountValue) {
  let subtotal = items.reduce((sum, r) => sum + (r.amount || 0), 0);

  let discount = 0;
  if (discountType === "percent") {
    discount = (subtotal * discountValue) / 100;
  } else {
    discount = Number(discountValue || 0);
  }

  let total = subtotal - discount;

  // ---- ROUND OFF ----
  const roundedTotal = Math.round(total);
  const roundOff = roundedTotal - total;

  return {
    subtotal,
    discount,
    total: roundedTotal,
    roundOff
  };
}
