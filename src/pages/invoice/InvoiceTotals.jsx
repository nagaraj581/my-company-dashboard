// src/pages/invoice/InvoiceTotals.jsx
import React from "react";
import { formatCurrency } from "./invoiceUtils";

export function InvoiceTotals({
  totals,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  showQr,
  setShowQr,
  terms,
  setTerms,
  saveTermsLocally,
  amountReceived,
  setAmountReceived,
  currency,
}) {
  return (
    <>
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

      {/* Summary */}
      <div className="mt-6 flex items-start justify-end gap-4">
        <div className="bg-white/90 dark:bg-slate-900/75 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-5 w-80 text-right shadow-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal, currency)}</span></div>
          <div className="flex justify-between mt-2"><span>Discount</span><span>{formatCurrency(totals.discount, currency)}</span></div>
          <div className="border-t mt-3 pt-2 flex justify-between font-semibold text-lg"><span>Total</span><span>{formatCurrency(totals.total, currency)}</span></div>
          <div className="flex justify-between mt-2">
            <span>Amount Received</span>
            <input type="number" min="0" className="border border-slate-200 dark:border-slate-700 p-2 w-32 text-right rounded-lg bg-white dark:bg-slate-900/70" placeholder="0.00" value={amountReceived} onChange={(e) => setAmountReceived(e.target.value)} />
          </div>
          {amountReceived > 0 && (
            <div className="flex justify-between mt-2 font-semibold text-red-700">
              <span>Balance Due</span>
              <span>{formatCurrency(totals.total - Number(amountReceived), currency)}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}