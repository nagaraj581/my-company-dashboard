// src/pages/invoice/InvoiceItemsTable.jsx
import React from "react";
import { formatCurrency } from "./invoiceUtils";

export function InvoiceItemsTable({ rows, editRow, deleteRow, currency }) {
  if (rows.length === 0) {
    return null;
  }

  return (
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
              <td className="p-3 text-right">{formatCurrency(r.rate, currency)}</td>
              <td className="p-3 text-right font-semibold">{formatCurrency(r.amount, currency)}</td>
              <td className="p-3 text-center">
                <button onClick={() => editRow(i)} className="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-lg mr-2 transition-all">✏️</button>
                <button onClick={() => deleteRow(i)} className="bg-red-500 hover:bg-red-600 px-2.5 py-1.5 rounded-lg text-white transition-all">🗑️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}