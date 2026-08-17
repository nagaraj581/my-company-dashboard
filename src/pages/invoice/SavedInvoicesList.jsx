// src/pages/invoice/SavedInvoicesList.jsx
import React from "react";
import { SkeletonInvoiceList } from "../../components/SkeletonLoader";
import { formatCurrency } from "./invoiceUtils";
import { DEFAULT_DOCUMENT_STYLE_ID } from "../../config/documentStyles";

export function SavedInvoicesList({
  loadingInvoices,
  savedInvoices,
  loadInvoice,
  openPrintView,
  exportPdf,
  deleteInvoice,
  companyInfo,
  companyUpi,
  showQr,
  currency,
}) {
  return (
    <div className="mt-10 bg-white/90 dark:bg-slate-900/75 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-5">
      <h3 className="text-lg font-semibold text-slate-800 mb-3">Saved Invoices</h3>
      {loadingInvoices ? (
        <SkeletonInvoiceList rows={3} />
      ) : savedInvoices.length === 0 ? (
        <p className="text-gray-500">No invoices for this currency yet.</p>
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
                    documentStyle: inv.documentStyle || DEFAULT_DOCUMENT_STYLE_ID,
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
  );
}