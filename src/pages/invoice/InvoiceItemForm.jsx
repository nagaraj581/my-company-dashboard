// src/pages/invoice/InvoiceItemForm.jsx
import React from "react";

export function InvoiceItemForm({
  form,
  handleChange,
  savedItems,
  invoiceUnits,
  openWoodCalculator,
  addOrUpdateRow,
  editingIndex,
}) {
  return (
    <div className="bg-white/90 dark:bg-slate-900/75 border border-slate-200/80 dark:border-slate-700/70 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-5 gap-3 items-center mb-4 shadow-sm">
      <input
        list="itemList"
        name="item"
        value={form.item}
        onChange={handleChange}
        placeholder="Type or select item name"
        className="p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl md:col-span-2 bg-white dark:bg-slate-900/70"
      />
      <datalist id="itemList">
        {savedItems.map((it, index) => (
          <option key={index} value={it.name} />
        ))}
      </datalist>

      <input
        name="quantity"
        value={form.quantity}
        onChange={handleChange}
        placeholder="Quantity"
        className="p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/70"
      />

      <select
        name="unit"
        value={form.unit}
        onChange={handleChange}
        className="p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl w-full bg-white dark:bg-slate-900/70"
      >
        <option value="">Select Unit</option>
        {invoiceUnits.map((u) => <option key={u} value={u}>{u}</option>)}
      </select>

      <input
        name="rate"
        type="number"
        value={form.rate}
        onChange={handleChange}
        placeholder="Rate"
        className="p-3.5 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900/70"
      />

      <div className="md:col-span-5 text-right">
        <button
          type="button"
          onClick={openWoodCalculator}
          className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-3 rounded-xl shadow-lg mt-3 mr-3 font-semibold transition-all"
        >
          Wood CFT
        </button>
        <button
          onClick={addOrUpdateRow}
          className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-5 py-3 rounded-xl shadow-lg mt-3 font-semibold transition-all"
        >
          {editingIndex !== null ? "Update" : "➕ Add"}
        </button>
      </div>
    </div>
  );
}