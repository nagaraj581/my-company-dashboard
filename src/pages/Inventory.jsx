import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useCurrency } from "../context/CurrencyContext";

export default function Inventory() {
  const { currency } = useCurrency();
  const [items, setItems] = useState([]);
  const [stocks, setStocks] = useState({});
  const [loading, setLoading] = useState(true);

  // Load items (same logic as Items.jsx)
  useEffect(() => {
    const q = query(
      collection(db, "items"),
      where("currency", "==", currency)
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const list = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setItems(list);
      const movementsQuery = query(
        collection(db, "stockMovements"),
        where("currency", "==", currency)
      );

      const movementSnapshot = await getDocs(movementsQuery);

      const stockMap = {};

      movementSnapshot.forEach((doc) => {
        const data = doc.data();
        const { itemId, type, quantity } = data;

        if (!stockMap[itemId]) {
          stockMap[itemId] = 0;
        }

        if (type === "IN") {
          stockMap[itemId] += Number(quantity);
        } else if (type === "OUT") {
          stockMap[itemId] -= Number(quantity);
        }
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

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
        📦 Inventory Overview
      </h2>

      {loading ? (
        <p className="text-gray-500">Loading inventory...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500">No items found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const stock = stocks[item.id] || 0;
            const minStock = item.minStock || 0;
            const status = getStockStatus(stock, minStock);

            return (
              <div
                key={item.id}
                className={`rounded-xl p-6 shadow-md border transition-all ${
                  status === "low"
                    ? "border-red-400 bg-red-50"
                    : status === "warning"
                    ? "border-yellow-400 bg-yellow-50"
                    : "border-green-400 bg-green-50"
                }`}
              >
                <h3 className="text-lg font-semibold">{item.name}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Stock: <span className="font-bold">{stock}</span> {item.unit}
                </p>
                <p className="text-sm text-gray-600">
                  Min Level: {minStock}
                </p>

                <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      status === "low"
                        ? "bg-red-500"
                        : status === "warning"
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        (stock / (minStock || 1)) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>

                <p className="mt-3 text-sm font-medium">
                  {status === "low"
                    ? "⚠ Low Stock"
                    : status === "warning"
                    ? "⚠ Near Minimum"
                    : "✅ Healthy"}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
