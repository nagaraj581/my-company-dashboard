import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";

export default function Layout({ user, onLogout }) {
  const [darkMode, setDarkMode] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    name: "My Company LTD",
    address: "123 Business Street, Udupi, Karnataka",
    phone: "+91 98765 43210",
    email: "info@mycompany.com",
  });
  const location = useLocation();

  // ✅ Load dark mode preference
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

  // ✅ Apply dark mode theme
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

  // ✅ Live company info from Firestore
  useEffect(() => {
    const ref = doc(db, "company", "config");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setCompanyInfo({
            name: String(data.name || "My Company LTD").replace(/"/g, ""),
            address: String(
              data.address || "123 Business Street, Udupi, Karnataka"
            ).replace(/"/g, ""),
            phone: String(data.phone || "+91 98765 43210").replace(/"/g, ""),
            email: String(data.email || "info@mycompany.com").replace(/"/g, ""),
          });
        }
      },
      (err) => console.error("Error loading company info:", err)
    );
    return () => unsub();
  }, []);

  // ✅ Hide bottom nav for specific routes
  const hideBottomNav = ["/login", "/company-info"].includes(location.pathname);

  return (
    <div
      className={`min-h-screen flex flex-col ${
        darkMode ? "bg-gray-900 text-gray-100" : "bg-blue-50 text-gray-900"
      }`}
    >
      {/* Top Navbar */}
      <Navbar
        user={user}
        onLogout={onLogout}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      {/* ✅ Full-width content area */}
<main className="flex-1 pt-16 pb-20 sm:pb-0 px-0">
<div
  className={`w-full ${
    darkMode ? "bg-gray-800" : "bg-white"
  } rounded-none sm:rounded-2xl shadow-lg p-4 sm:p-8`}
>
  <Outlet context={{ darkMode, companyInfo }} />
</div>
      </main>

      {/* Bottom Navigation (mobile) */}
      {!hideBottomNav && <BottomNav darkMode={darkMode} />}

      {/* Footer */}
      <footer
        className={`text-center py-6 mt-auto text-sm ${
          darkMode
            ? "bg-gray-800 text-gray-400"
            : "bg-gray-100 text-gray-600 border-t border-gray-200"
        }`}
      >
        © {new Date().getFullYear()} {companyInfo.name} — All rights reserved.
      </footer>
    </div>
  );
}
