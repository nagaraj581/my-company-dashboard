import { createContext, useEffect, useState } from "react";

const CurrencyContext = createContext();

const STORAGE_KEY = "workingCurrency";
const DEFAULT_CURRENCY = "AED";

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState(null);

  // Load once from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "AED" || saved === "INR") {
      setCurrency(saved);
    } else {
      setCurrency(DEFAULT_CURRENCY);
    }
  }, []);

  // Persist changes
  useEffect(() => {
    if (currency) {
      localStorage.setItem(STORAGE_KEY, currency);
    }
  }, [currency]);

  if (!currency) return null; // prevents overwrite race

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export { CurrencyContext };
