import { useEffect, useState } from "react";
import { getDocs, onSnapshot, query, where } from "firebase/firestore";
import { AlertTriangle, CheckCircle2, PackageSearch, Warehouse } from "lucide-react";
import { useCurrency } from "../context/useCurrency";
import { SkeletonLoader } from "../components/SkeletonLoader";
import { getCurrentUserId, userCollection } from "../services/userDb";

export default function Inventory() {
  const { currency } = useCurrency();
  const [items, setItems] = useState([]);
  const [stocks, setStocks] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = getCurrentUserId();
    if (!userId) {
      setItems([]);
      setStocks({});
      setLoading(false);
      return undefined;
    }

    const itemsQuery = query(
      userCollection("items", userId),
      where("currency", "==", currency),
    );

    const unsub = onSnapshot(itemsQuery, async (snapshot) => {
      const list = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

      setItems(list);

      const movementSnapshot = await getDocs(
        query(
          userCollection("stockMovements", userId),
          where("currency", "==", currency),
        ),
      );

      const stockMap = {};
      movementSnapshot.forEach((doc) => {
        const data = doc.data();
        const { itemId, type, quantity } = data;

        if (!stockMap[itemId]) stockMap[itemId] = 0;
        if (type === "IN") stockMap[itemId] += Number(quantity);
        if (type === "OUT") stockMap[itemId] -= Number(quantity);
      });

      setStocks(stockMap);
      setLoading(false);
    });

    return () => unsub();
  }, [currency]);

  const getStockStatus = (stock, minStock = 0) => {
    if (stock <= minStock) return "low";
    if (stock <= minStock + 5) return "warning";
    return "healthy";
  };

  const totalStock = items.reduce((sum, item) => sum + (stocks[item.id] || 0), 0);
  const lowCount = items.filter((item) => getStockStatus(stocks[item.id] || 0, item.minStock || 0) === "low").length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-3xl font-bold bg-gradient-to-r from-emerald-600 to-sky-600 bg-clip-text text-transparent">
            <Warehouse className="text-emerald-600" size={30} />
            Inventory Overview
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Current stock position for {currency}.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:min-w-80">
          <SummaryPill label="Total Stock" value={totalStock} tone="sky" />
          <SummaryPill label="Low Items" value={lowCount} tone="red" />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <SkeletonLoader rows={6} variant="card" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-10 text-center shadow-sm dark:border-slate-700/70 dark:bg-slate-900/75">
          <PackageSearch className="mx-auto mb-3 text-slate-400" size={36} />
          <p className="font-semibold text-slate-600 dark:text-slate-300">No items found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const stock = stocks[item.id] || 0;
            const minStock = item.minStock || 0;
            const status = getStockStatus(stock, minStock);
            const statusConfig = {
              low: {
                shell: "border-red-200 bg-red-50/90 dark:border-red-900/60 dark:bg-red-950/25",
                bar: "bg-red-500",
                text: "text-red-700 dark:text-red-300",
                label: "Low Stock",
                icon: AlertTriangle,
              },
              warning: {
                shell: "border-amber-200 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/25",
                bar: "bg-amber-500",
                text: "text-amber-700 dark:text-amber-300",
                label: "Near Minimum",
                icon: AlertTriangle,
              },
              healthy: {
                shell: "border-emerald-200 bg-emerald-50/90 dark:border-emerald-900/60 dark:bg-emerald-950/25",
                bar: "bg-emerald-500",
                text: "text-emerald-700 dark:text-emerald-300",
                label: "Healthy",
                icon: CheckCircle2,
              },
            }[status];
            const StatusIcon = statusConfig.icon;
            const percent = Math.min((stock / Math.max(minStock, 1)) * 100, 100);

            return (
              <div
                key={item.id}
                className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${statusConfig.shell}`}
              >
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-bold text-slate-950 dark:text-white">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Min level: {minStock} {item.unit}
                    </p>
                  </div>
                  <div className={`rounded-xl bg-white/80 p-2 ${statusConfig.text} dark:bg-slate-900/50`}>
                    <StatusIcon size={20} />
                  </div>
                </div>

                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-3xl font-extrabold text-slate-950 dark:text-white">
                      {stock}
                    </div>
                    <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      {item.unit || "units"}
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${statusConfig.text}`}>
                    {statusConfig.label}
                  </div>
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-slate-800">
                  <div className={`h-full rounded-full ${statusConfig.bar}`} style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SummaryPill({ label, value, tone }) {
  const color =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
      : "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300";

  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${color}`}>
      <div className="text-2xl font-extrabold">{value}</div>
      <div className="text-xs font-bold uppercase">{label}</div>
    </div>
  );
}
