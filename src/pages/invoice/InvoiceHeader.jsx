// src/pages/invoice/InvoiceHeader.jsx
import React from "react";

export function InvoiceHeader({ companyInfo, loadedInvoiceId, savedInvoices, invoiceDate }) {
  return (
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
            <strong>{loadedInvoiceId ? savedInvoices.find(s => s.id === loadedInvoiceId)?.invoiceNumber : "Draft"}</strong>
          </div>
          <div className="text-sm text-slate-600">Date: <strong>{invoiceDate}</strong></div>
        </div>
      </div>
    </div>
  );
}