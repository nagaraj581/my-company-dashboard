// src/pages/invoice/InvoiceActions.jsx
import React from "react";

export function InvoiceActions({
  newInvoice,
  saveInvoice,
  saving,
  openPrintView,
  exportCurrentPdf,
  loadedInvoiceId,
  deleteInvoice,
}) {
  return (
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
  );
}