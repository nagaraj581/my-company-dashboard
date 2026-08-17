// src/pages/invoice/WoodCalculatorModal.jsx
import React from "react";
import { formatCurrency } from "./invoiceUtils";

export function WoodCalculatorModal({
  showWoodModal,
  setShowWoodModal,
  woodForm,
  setWoodForm,
  savedItems,
  woodCft,
  currency,
  resetWoodForm,
  addWoodCftRow,
}) {
  if (!showWoodModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-20">
      <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              Wood CFT Calculator
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Formula: length in ft x width in inch x thickness in inch x pieces / 144
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowWoodModal(false)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Wood item name
            </label>
            <input
              list="woodItemList"
              value={woodForm.name}
              onChange={(e) =>
                setWoodForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="e.g., Teak wood"
              className="w-full rounded-lg border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
            <datalist id="woodItemList">
              {savedItems.map((it) => (
                <option key={it.id || it.name} value={it.name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Length (ft)
            </label>
            <input type="number" min="0" step="0.01" value={woodForm.length} onChange={(e) => setWoodForm((f) => ({ ...f, length: e.target.value }))} className="w-full rounded-lg border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Width (inch)
            </label>
            <input type="number" min="0" step="0.01" value={woodForm.width} onChange={(e) => setWoodForm((f) => ({ ...f, width: e.target.value }))} className="w-full rounded-lg border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Thickness (inch)
            </label>
            <input type="number" min="0" step="0.01" value={woodForm.thickness} onChange={(e) => setWoodForm((f) => ({ ...f, thickness: e.target.value }))} className="w-full rounded-lg border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Pieces
            </label>
            <input type="number" min="0" step="1" value={woodForm.pieces} onChange={(e) => setWoodForm((f) => ({ ...f, pieces: e.target.value }))} className="w-full rounded-lg border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Rate per CFT
            </label>
            <input type="number" min="0" step="0.01" value={woodForm.rate} onChange={(e) => setWoodForm((f) => ({ ...f, rate: e.target.value }))} className="w-full rounded-lg border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950/30">
          <div className="flex items-center justify-between text-slate-900 dark:text-white">
            <span className="font-semibold">Calculated quantity</span>
            <span className="text-2xl font-bold">{woodCft} cft</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
            <span>Amount</span>
            <span>{formatCurrency(woodCft * Number(woodForm.rate || 0), currency)}</span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={resetWoodForm}
            className="rounded-lg border border-slate-200 px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={addWoodCftRow}
            className="rounded-lg bg-amber-600 px-4 py-2.5 font-semibold text-white hover:bg-amber-700"
          >
            Add to Invoice
          </button>
        </div>
      </div>
    </div>
  );
}