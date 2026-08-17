import { useCallback, useEffect, useState } from "react";
import { getCountFromServer, getDocs, query, where } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  FileText,
  Package,
  PackageCheck,
  ReceiptText,
  TrendingDown,
  Users,
  Warehouse,
} from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { getCurrentUserId, userCollection } from "../services/userDb";
import { useOnFocus } from "./useOnFocus";

const emptyMetrics = {
  items: 0,
  projects: 0,
  suppliers: 0,
  receipts: 0,
  lowStock: [],
  stockIn: 0,
  stockOut: 0,
};

export default function Dashboard() {
  const { currency } = useCurrency();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) {
      setMetrics(emptyMetrics);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [
        itemsSnapshot, // needed for low stock calculation
        movementSnapshot, // needed for stock in/out and map
        projectsCount,
        suppliersCount,
        receiptsCount,
      ] = await Promise.all([
        getDocs(
          query(userCollection("items", userId), where("currency", "==", currency))
        ),
        getDocs(
          query(userCollection("stockMovements", userId), where("currency", "==", currency))
        ),
        getCountFromServer(
          query(userCollection("projects", userId), where("currency", "==", currency))
        ),
        getCountFromServer(
          query(userCollection("suppliers", userId), where("currency", "==", currency))
        ),
        getCountFromServer(
          query(userCollection("materialReceipts", userId), where("currency", "==", currency))
        ),
      ]);

      const items = itemsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      const stockMap = {};
      let stockIn = 0;
      let stockOut = 0;

      movementSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.itemId) return;

        if (!stockMap[data.itemId]) stockMap[data.itemId] = 0;

        if (data.type === "IN") {
          stockMap[data.itemId] += Number(data.quantity);
          stockIn += Number(data.quantity);
        } else if (data.type === "OUT") {
          stockMap[data.itemId] -= Number(data.quantity);
          stockOut += Number(data.quantity);
        }
      });

      const lowStock = items
        .filter((item) => {
          const currentStock = stockMap[item.id] || 0;
          const minStock = item.minStock || 0;
          return currentStock <= minStock;
        })
        .map((item) => ({
          ...item,
          currentStock: stockMap[item.id] || 0,
        }));

      setMetrics({
        items: items.length,
        projects: projectsCount.data().count,
        suppliers: suppliersCount.data().count,
        receipts: receiptsCount.data().count,
        lowStock,
        stockIn,
        stockOut,
      });
    } catch (error) {
      console.error("Unable to load dashboard:", error);
    } finally {
      setLoading(false);
    }
  }, [currency]);

  // Reload data when currency changes
  useEffect(() => {
    loadDashboard();
  }, [currency]);

  // Reload data when the user navigates to this page
  useOnFocus(loadDashboard);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/75">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="bg-gradient-to-br from-sky-600 via-cyan-600 to-emerald-600 p-7 text-white md:p-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
              <Warehouse size={16} />
              {currency} Workspace
            </div>
            <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight md:text-5xl">
              Operations dashboard
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-medium text-sky-50 md:text-base">
              Stock, purchasing, projects, quotations, and invoices in one daily view.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/material-receipt"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-sky-700 shadow-lg transition hover:bg-sky-50"
              >
                New GRN
                <ArrowRight size={17} />
              </Link>
              <Link
                to="/invoice"
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/15 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/25"
              >
                New Invoice
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-slate-200/70 dark:bg-slate-700/70">
            <MetricTile loading={loading} label="Items" value={metrics.items} color="text-sky-600" icon={<Package size={20} />} />
            <MetricTile loading={loading} label="Suppliers" value={metrics.suppliers} color="text-emerald-600" icon={<Users size={20} />} />
            <MetricTile loading={loading} label="Projects" value={metrics.projects} color="text-violet-600" icon={<Building2 size={20} />} />
            <MetricTile loading={loading} label="GRNs" value={metrics.receipts} color="text-amber-600" icon={<ReceiptText size={20} />} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/75">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Low Stock Alert
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {loading ? "Checking inventory..." : `${metrics.lowStock.length} items need attention`}
              </p>
            </div>
            <div className="rounded-xl bg-red-50 p-3 text-red-600 dark:bg-red-950/40 dark:text-red-300">
              <TrendingDown size={22} />
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : metrics.lowStock.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-sm font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300">
              All inventory levels are healthy.
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.lowStock.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/70 px-4 py-3 dark:border-red-900/60 dark:bg-red-950/25"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900 dark:text-white">
                      {item.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Minimum: {item.minStock || 0} {item.unit}
                    </div>
                  </div>
                  <div className="text-right text-sm font-bold text-red-600 dark:text-red-300">
                    {item.currentStock} {item.unit}
                  </div>
                </div>
              ))}
              <button
                onClick={() => navigate("/inventory")}
                className="inline-flex items-center gap-2 text-sm font-bold text-sky-600 dark:text-sky-400"
              >
                View inventory
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <FlowCard title="Stock In" value={loading ? '...' : metrics.stockIn} accent="bg-emerald-500" href="/material-receipt" icon={<PackageCheck size={22} />} />
          <FlowCard title="Stock Out" value={loading ? '...' : metrics.stockOut} accent="bg-rose-500" href="/project-consumption" icon={<ClipboardList size={22} />} />
          <FlowCard title="Quotations" value="Create" accent="bg-violet-500" href="/quotation" icon={<FileText size={22} />} />
          <FlowCard title="Invoices" value="Create" accent="bg-amber-500" href="/invoice" icon={<ReceiptText size={22} />} />
        </section>
      </div>
    </div>
  );
}

function MetricTile({ label, value, color, icon, loading }) {
  return (
    <div className="bg-white/95 p-5 dark:bg-slate-900">
      <div className={`mb-3 inline-flex rounded-xl bg-slate-100 p-2 ${color} dark:bg-slate-800`}>
        {icon}
      </div>
      <div className="text-3xl font-extrabold text-slate-950 dark:text-white">
        {loading ? <Skeleton className="w-16 h-8" /> : value}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </div>
    </div>
  );
}

function FlowCard({ title, value, accent, href, icon }) {
  return (
    <Link
      to={href}
      className="group rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-700/70 dark:bg-slate-900/75"
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`rounded-xl ${accent} p-3 text-white shadow-lg`}>
          {icon}
        </div>
        <ArrowRight size={18} className="text-slate-400 transition group-hover:translate-x-1" />
      </div>
      <div className="mt-5 text-2xl font-extrabold text-slate-950 dark:text-white">
        {value}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
        {title}
      </div>
    </Link>
  );
}

function Skeleton({ className }) {
  return <div className={`bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse ${className}`} />;
}
