// src/pages/invoice/invoiceUtils.js
// Helpers for Invoice module

import { getDocs, query, orderBy, limit } from "firebase/firestore";
import { userCollection } from "../../services/userDb";

/* =========================================================
   CURRENCY
========================================================= */

export function getCurrencySymbol(currency) {
  if (currency === "AED") return "AED";
  if (currency === "INR") return "Rs";

  return "";
}

export function formatCurrency(value, currency = "INR") {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "";
  }

  const symbol = getCurrencySymbol(currency);

  return `${symbol} ${numericValue.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/* =========================================================
   AMOUNT TO WORDS
========================================================= */

export function amountToWords(amount) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return "Zero";
  }

  // Invoice amount in words uses whole currency units.
  const value = Math.floor(Math.abs(numericAmount));

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

  function inWords(n) {
    if (n === 0) {
      return "";
    }

    if (n < 20) {
      return ones[n];
    }

    if (n < 100) {
      return (
        tens[Math.floor(n / 10)] +
        (n % 10 ? ` ${ones[n % 10]}` : "")
      );
    }

    if (n < 1000) {
      return (
        `${ones[Math.floor(n / 100)]} Hundred` +
        (n % 100 ? ` and ${inWords(n % 100)}` : "")
      );
    }

    if (n < 100000) {
      return (
        `${inWords(Math.floor(n / 1000))} Thousand` +
        (n % 1000 ? ` ${inWords(n % 1000)}` : "")
      );
    }

    if (n < 10000000) {
      return (
        `${inWords(Math.floor(n / 100000))} Lakh` +
        (n % 100000 ? ` ${inWords(n % 100000)}` : "")
      );
    }

    return (
      `${inWords(Math.floor(n / 10000000))} Crore` +
      (n % 10000000 ? ` ${inWords(n % 10000000)}` : "")
    );
  }

  return inWords(value).trim() || "Zero";
}

/* =========================================================
   CURRENCY WORDS
========================================================= */

export function getCurrencyWords(currency = "INR") {
  if (currency === "AED") {
    return "Dirhams Only";
  }

  return "Rupees Only";
}

/* =========================================================
   NEXT INVOICE NUMBER
========================================================= */

export async function getNextInvoiceNumber() {
  try {
    const year = new Date().getFullYear();

    const q = query(
      userCollection("invoices"),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const snap = await getDocs(q);

    // No previous invoice
    if (snap.empty) {
      return `INV-${year}-001`;
    }

    const last = snap.docs[0].data() || {};
    const lastInv = String(last.invoiceNumber || "");

    const parts = lastInv.split("-");

    const lastYear =
      parts[1] && /^\d+$/.test(parts[1])
        ? parseInt(parts[1], 10)
        : null;

    const lastNum =
      parts[2] && /^\d+$/.test(parts[2])
        ? parseInt(parts[2], 10)
        : 0;

    let nextNum = 1;

    if (lastYear === year) {
      nextNum = lastNum + 1;
    }

    return `INV-${year}-${String(nextNum).padStart(3, "0")}`;
  } catch (error) {
    console.error("getNextInvoiceNumber:", error);

    // Safe fallback if Firestore query fails
    const fallback =
      Math.floor(Date.now() % 1000);

    return `INV-${new Date().getFullYear()}-${String(
      fallback
    ).padStart(3, "0")}`;
  }
}

/* =========================================================
   INVOICE DATE
========================================================= */

export function parseInvoiceDate(input) {
  if (!input) {
    return new Date();
  }

  // Firebase Timestamp
  if (
    input &&
    typeof input.toDate === "function"
  ) {
    return input.toDate();
  }

  // JavaScript Date
  if (input instanceof Date) {
    if (!Number.isNaN(input.getTime())) {
      return input;
    }

    return new Date();
  }

  // Firestore timestamp-like object
  if (
    input &&
    typeof input.seconds === "number"
  ) {
    return new Date(input.seconds * 1000);
  }

  const value = String(input).trim();

  if (!value) {
    return new Date();
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(`${value}T00:00:00`);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // General date parsing
  const parsed = new Date(value);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  return new Date();
}

/* =========================================================
   SAFE NUMBER
========================================================= */

function toNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

/* =========================================================
   CALCULATE TOTALS
========================================================= */

export function calcTotals(
  items = [],
  discountType = "amount",
  discountValue = 0
) {
  /* -----------------------------------------
     SUBTOTAL
  ----------------------------------------- */

  const subtotal = items.reduce((sum, item) => {
    const amount = toNumber(item?.amount);

    return sum + amount;
  }, 0);

  /* -----------------------------------------
     DISCOUNT
  ----------------------------------------- */

  const numericDiscountValue = toNumber(discountValue);

  let discount = 0;

  if (discountType === "percent") {
    discount =
      (subtotal * numericDiscountValue) / 100;
  } else {
    discount = numericDiscountValue;
  }

  // Never allow discount to exceed subtotal.
  discount = Math.min(
    Math.max(discount, 0),
    subtotal
  );

  /* -----------------------------------------
     TOTAL BEFORE ROUNDING
  ----------------------------------------- */

  const totalBeforeRound = subtotal - discount;

  /* -----------------------------------------
     ROUND OFF

     Example:
     839.60 -> 840.00
     Round Off = +0.40

     840.40 -> 840.00
     Round Off = -0.40
  ----------------------------------------- */

  const roundedTotal = Math.round(totalBeforeRound);

  const roundOff =
    roundedTotal - totalBeforeRound;

  const total = Math.max(0, roundedTotal);

  return {
    subtotal,
    discount,
    total,
    roundOff,
  };
}

/* =========================================================
   PAYMENT / BALANCE HELPERS
========================================================= */

export function calculateBalanceDue(
  total,
  amountReceived = 0
) {
  const invoiceTotal = toNumber(total);
  const received = toNumber(amountReceived);

  return Math.max(
    0,
    invoiceTotal - received
  );
}

export function calculateAmountReceived(
  amountReceived
) {
  return Math.max(
    0,
    toNumber(amountReceived)
  );
}

/* =========================================================
   AMOUNT IN WORDS FOR INVOICE
========================================================= */

export function getAmountInWords(
  amount,
  currency = "INR"
) {
  return `${amountToWords(amount)} ${getCurrencyWords(
    currency
  )}`;
}

/* =========================================================
   EXPORT DEFAULT
========================================================= */

export default {
  getCurrencySymbol,
  formatCurrency,
  amountToWords,
  getCurrencyWords,
  getNextInvoiceNumber,
  parseInvoiceDate,
  calcTotals,
  calculateBalanceDue,
  calculateAmountReceived,
  getAmountInWords,
};
