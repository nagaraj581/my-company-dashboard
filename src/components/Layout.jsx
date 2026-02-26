import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import { getCompanyInfo, clearCompanyInfoCache } from "../config/companyInfo";

export default function Layout({ user, onLogout }) {
  const [darkMode, setDarkMode] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    name: "My Company LTD",
    address: "123 Business Street, Udupi, Karnataka",
    phone: "+91 98765 43210",
    email: "info@mycompany.com",
  });
  const location = useLocation();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("darkMode");
      if (stored !== null) {
        setDarkMode(stored === "true");
      } else {
        const prefersDark =
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
        setDarkMode(prefersDark);
      }
    } catch (e) {
      console.error("Dark mode preference error:", e);
    }
  }, []);

  useEffect(() => {
    try {
      const root = document.documentElement;
      if (darkMode) root.classList.add("dark");
      else root.classList.remove("dark");
      localStorage.setItem("darkMode", darkMode ? "true" : "false");
    } catch (e) {
      console.error("Dark mode apply error:", e);
    }
  }, [darkMode]);

  useEffect(() => {
    const loadCompany = async () => {
      clearCompanyInfoCache();
      const info = await getCompanyInfo();
      if (info) setCompanyInfo(info);
    };

    loadCompany();

    const handler = () => loadCompany();
    window.addEventListener("companyChanged", handler);

    return () => window.removeEventListener("companyChanged", handler);
  }, []);

  const hideBottomNav = ["/login", "/company-info"].includes(location.pathname);

  return (
    <div
      className={`min-h-screen flex flex-col ${
        darkMode ? "bg-slate-950 text-slate-100" : "text-slate-900"
      }`}
    >
      <Navbar
        user={user}
        onLogout={onLogout}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <main className="flex-1 pt-20 pb-24 sm:pb-8 px-3 sm:px-6 lg:px-8">
        <div
          className={`max-w-7xl mx-auto rounded-3xl backdrop-blur-xl transition-all duration-300 ${
            darkMode
              ? "bg-slate-900/75 border border-slate-700/60 shadow-2xl shadow-slate-900/50"
              : "bg-white/78 border border-white/70 shadow-[0_30px_80px_-35px_rgba(15,23,42,0.35)]"
          }`}
        >
          <div className="p-6 sm:p-8 md:p-10">
            <Outlet context={{ darkMode, companyInfo }} />
          </div>
        </div>
      </main>

      {!hideBottomNav && <BottomNav darkMode={darkMode} />}

      <footer
        className={`mt-auto py-6 px-4 text-center text-sm font-medium transition-colors ${
          darkMode
            ? "bg-slate-950/70 border-t border-slate-700/50 text-slate-400"
            : "bg-white/45 border-t border-slate-200/60 text-slate-600 backdrop-blur-xl"
        }`}
      >
        <div className="max-w-7xl mx-auto">
          <p className="mb-2">
            © {new Date().getFullYear()} <span className="font-bold bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">{companyInfo.name}</span> • All rights reserved.
          </p>
          <p className={`text-xs ${darkMode ? "text-slate-500" : "text-slate-400"}`}>
            Crafted for modern business operations
          </p>
        </div>
      </footer>
    </div>
  );
}
