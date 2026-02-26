import { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useCurrency } from "../context/CurrencyContext";
import { Link, useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { currency } = useCurrency();
  const navigate = useNavigate();
  const [lowStockItems, setLowStockItems] = useState([]);

  useEffect(() => {
    const loadLowStock = async () => {
      // 1) Load items
      const itemsQuery = query(
        collection(db, "items"),
        where("currency", "==", currency)
      );
      const itemsSnapshot = await getDocs(itemsQuery);
      const items = itemsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      // 2) Load stock movements
      const movementQuery = query(
        collection(db, "stockMovements"),
        where("currency", "==", currency)
      );
      const movementSnapshot = await getDocs(movementQuery);

      const stockMap = {};

      movementSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.itemId) return;

        if (!stockMap[data.itemId]) stockMap[data.itemId] = 0;

        if (data.type === "IN") {
          stockMap[data.itemId] += Number(data.quantity);
        } else if (data.type === "OUT") {
          stockMap[data.itemId] -= Number(data.quantity);
        }
      });

      // 3) Find low stock items
      const low = items
        .filter((item) => {
          const currentStock = stockMap[item.id] || 0;
          const minStock = item.minStock || 0;
          return currentStock <= minStock;
        })
        .map((item) => ({
          ...item,
          currentStock: stockMap[item.id] || 0,
        }));

      setLowStockItems(low);
    };

    loadLowStock();
  }, [currency]);

  return (
    <div className="space-y-8">
      {/* Welcome Hero Section */}
      <div className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-700 rounded-3xl p-8 md:p-12 shadow-xl text-white overflow-hidden relative">
        {/* Background pattern */}
        <div className="absolute -right-20 -top-20 w-44 h-44 bg-white/15 rounded-full blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 w-44 h-44 bg-sky-200/20 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2">
            Welcome to Your Dashboard
          </h1>
          <p className="text-lg text-blue-100 mb-6 max-w-2xl">
            Manage invoices, quotations, projects, and inventory from one unified workspace.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/invoice" className="px-6 py-3 bg-white text-blue-600 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all duration-200">
              Create Invoice
            </Link>
            <Link to="/quotation" className="px-6 py-3 bg-white/15 text-white rounded-xl font-semibold border border-white/40 hover:bg-white/25 transition-all duration-200">
              Create Quotation
            </Link>
          </div>
        </div>
      </div>

      <div className="bg-white/90 dark:bg-slate-900/80 rounded-2xl shadow p-6 border border-slate-200/70 dark:border-slate-700/60">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Low Stock Alert</h3>

          {lowStockItems.length > 0 && (
            <span className="bg-red-600 text-white text-xs px-3 py-1 rounded-full">
              {lowStockItems.length}
            </span>
          )}
        </div>

        {lowStockItems.length === 0 ? (
          <p className="text-emerald-600 dark:text-emerald-400 font-medium">All inventory levels are healthy</p>
        ) : (
          <>
            <ul className="space-y-2">
              {lowStockItems.slice(0, 5).map((item) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <span>{item.name}</span>
                  <span className="text-red-600 font-semibold">
                    {item.currentStock} {item.unit}
                  </span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => navigate("/inventory")}
              className="mt-4 text-sky-600 dark:text-sky-400 text-sm font-semibold"
            >
              View Full Inventory {"->"}
            </button>
          </>
        )}
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <FeatureCard
          icon="IN"
          title="Invoicing"
          description="Create and manage professional invoices with automatic numbering"
          href="/invoice"
        />
        <FeatureCard
          icon="QT"
          title="Quotations"
          description="Generate quotations and convert them to invoices instantly"
          href="/quotation"
        />
        <FeatureCard
          icon="IT"
          title="Item Management"
          description="Maintain your product/service catalog with categories"
          href="/items"
        />
        <FeatureCard
          icon="MR"
          title="Material Requests"
          description="Track material and resource requests for projects"
          href="/material-request"
        />
        <FeatureCard
          icon="CO"
          title="Company Info"
          description="Manage multiple companies and their details"
          href="/company"
        />
        <FeatureCard
          icon="CF"
          title="Settings"
          description="Configure your dashboard preferences"
          href="/company"
        />
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description, href }) {
  return (
    <Link to={href} className="group">
      <div className="bg-white/85 dark:bg-slate-900/80 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1.5 border border-slate-200/80 dark:border-slate-700/70">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white font-extrabold text-sm tracking-widest flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">{icon}</div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{description}</p>
        <div className="mt-4 text-sky-600 dark:text-sky-400 font-semibold text-sm group-hover:translate-x-2 transition-transform">
          Explore {"->"}
        </div>
      </div>
    </Link>
  );
}
