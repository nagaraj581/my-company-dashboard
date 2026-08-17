// src/pages/invoice/InvoiceCustomer.jsx
import React from "react";

export function InvoiceCustomer({
  customerName,
  setCustomerName,
  customerAddress,
  setCustomerAddress,
  invoiceDate,
  setInvoiceDate,
}) {
  return (
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
  );
}