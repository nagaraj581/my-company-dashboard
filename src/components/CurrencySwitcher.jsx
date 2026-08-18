import { DollarSign, IndianRupee } from "lucide-react";
import { useCurrency } from "../context/useCurrency";

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
      <button
        onClick={() => setCurrency("INR")}
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
          currency === "INR"
            ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
      >
        <IndianRupee size={16} />
        INR
      </button>
      <button
        onClick={() => setCurrency("AED")}
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
          currency === "AED"
            ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white"
            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        }`}
      >
        <DollarSign size={16} />
        AED
      </button>
    </div>
  );
}
