import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Sun, Moon } from "lucide-react";

export default function Navbar({ user, onLogout, darkMode, setDarkMode }) {
  const location = useLocation();
  const [companyName, setCompanyName] = useState("My Company LTD");

useEffect(() => {
  // 1) Listen to activeCompany (settings/activeCompany)
  const activeRef = doc(db, "settings", "activeCompany");
  const unsubActive = onSnapshot(activeRef, async (activeSnap) => {
    if (!activeSnap.exists()) {
      setCompanyName("My Company LTD");
      return;
    }

    const activeId = activeSnap.data().id;
    if (!activeId) {
      setCompanyName("My Company LTD");
      return;
    }

    // 2) Now listen to the actual company document
    const companyRef = doc(db, "companies", activeId);
    const unsubCompany = onSnapshot(companyRef, (companySnap) => {
      if (companySnap.exists()) {
        const data = companySnap.data();
        setCompanyName(data.name || "My Company LTD");
      }
    });

    return () => unsubCompany();
  });

  return () => unsubActive();
}, []);

  // ✅ Dynamic initials (e.g., "Sharada Furnitures" → "SF")
  const companyInitials = companyName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "MC";

  const navLinks = [
    { name: "Dashboard", path: "/" },
    { name: "Material Request", path: "/material-request" },
    { name: "Quotation", path: "/quotation" },
    { name: "Invoice", path: "/invoice" },
    { name: "Items", path: "/items" },
    { name: "Company Info", path: "/company" }
  ];

  const firstName = user?.displayName
    ? user.displayName.split(" ")[0]
    : user?.email?.split("@")[0];

  return (
    <nav
      className={`${
        darkMode ? "bg-gray-800 text-white" : "bg-blue-700 text-white"
      } shadow-lg fixed top-0 left-0 w-full z-50`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between h-auto sm:h-16 py-2 sm:py-0">
        
        {/* ✅ Left: Logo + Company Name */}
        <div className="flex items-center gap-3 mb-2 sm:mb-0">
          <div
            className={`h-10 w-10 rounded-full flex items-center justify-center shadow-sm ${
              darkMode ? "bg-gray-700" : "bg-white"
            }`}
          >
            <span
              className={`font-bold text-lg ${
                darkMode ? "text-gray-100" : "text-blue-700"
              }`}
            >
              {companyInitials}
            </span>
          </div>

          <Link
            to="/"
            className="text-lg sm:text-xl font-bold tracking-wide hidden sm:block"
          >
            {companyName}
          </Link>
        </div>

        {/* ✅ Middle: Navigation Links */}
        <div className="hidden lg:flex flex-wrap justify-center gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                location.pathname === link.path
                  ? `${
                      darkMode ? "bg-gray-700" : "bg-white/30"
                    } shadow-sm`
                  : `hover:${darkMode ? "bg-gray-700" : "bg-white/20"}`
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* ✅ Right: Dark Mode Toggle + User Info + Logout */}
        <div className="flex items-center gap-3 mt-2 sm:mt-0">
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-lg transition ${
              darkMode
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-white/20 hover:bg-white/30"
            }`}
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* User Info */}
          {user && (
            <div className="flex items-center gap-2">
              <img
                src={
                  user.photoURL ||
                  "https://ui-avatars.com/api/?name=User&background=ffffff&color=0f172a&bold=true"
                }
                alt="User Avatar"
                className="h-8 w-8 rounded-full border border-gray-200"
                referrerPolicy="no-referrer"
              />
              <span className="hidden sm:inline text-sm font-medium truncate max-w-[100px]">
                {firstName}
              </span>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={onLogout}
            className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg shadow transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
