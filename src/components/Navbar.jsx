import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { onSnapshot } from "firebase/firestore";
import { Sun, Moon, Menu, X } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";
import { getCurrentUserId, userDoc, userSettingDoc } from "../services/userDb";

export default function Navbar({ user, onLogout, darkMode, setDarkMode }) {
  const location = useLocation();
  const [companyName, setCompanyName] = useState("My Company LTD");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currency, setCurrency } = useCurrency();

  useEffect(() => {
    const uid = getCurrentUserId();
    if (!uid) {
      setCompanyName("My Company LTD");
      return undefined;
    }

    const activeRef = userSettingDoc("activeCompany", uid);
    const unsubActive = onSnapshot(activeRef, (activeSnap) => {
      if (!activeSnap.exists()) {
        setCompanyName("My Company LTD");
        return;
      }

      const activeId = activeSnap.data().id;
      if (!activeId) {
        setCompanyName("My Company LTD");
        return;
      }

      const companyRef = userDoc("companies", activeId, uid);
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

  const companyInitials =
    companyName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join("") || "MC";

  const navLinks = [
    { name: "Dashboard", path: "/" },
    { name: "Material Request", path: "/material-request" },
    { name: "Material Receipt", path: "/material-receipt" },
    { name: "Quotation", path: "/quotation" },
    { name: "Invoice", path: "/invoice" },
    { name: "Items", path: "/items" },
    { name: "Suppliers", path: "/suppliers" },
    { name: "Inventory", path: "/inventory" },
    { name: "Projects", path: "/projects" },
    { name: "Project Consumption", path: "/project-consumption" },
    { name: "Company Info", path: "/company" },
  ];

  const firstName = user?.displayName
    ? user.displayName.split(" ")[0]
    : user?.email?.split("@")[0];

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 border-b backdrop-blur-xl transition-all duration-300 ${
        darkMode
          ? "bg-slate-950/85 border-slate-700/70 text-slate-100"
          : "bg-white/80 border-white/70 text-slate-900"
      } shadow-[0_8px_30px_rgba(2,6,23,0.12)]`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="h-10 w-10 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-sky-500 to-indigo-600">
              <span className="font-extrabold text-xs tracking-wide text-white">
                {companyInitials}
              </span>
            </div>
            <Link
              to="/"
              className={`text-lg font-extrabold tracking-tight truncate max-w-[220px] ${
                darkMode ? "text-slate-100" : "text-slate-900"
              }`}
            >
              {companyName}
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 p-1 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 bg-white/40 dark:bg-slate-900/40">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  location.pathname === link.path
                    ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg"
                    : darkMode
                    ? "text-slate-300 hover:bg-slate-800 hover:text-slate-100"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-xl transition-all duration-200 active:scale-95 ${
                darkMode
                  ? "bg-slate-800 hover:bg-slate-700 text-amber-300"
                  : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200"
              }`}
              aria-label="Toggle dark mode"
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <div className="hidden sm:block relative">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={`appearance-none cursor-pointer px-3 py-2 rounded-xl text-sm font-semibold border focus:ring-2 focus:ring-sky-500 outline-none transition-all ${
                  darkMode
                    ? "bg-slate-900 border-slate-700 text-slate-100"
                    : "bg-white border-slate-200 text-slate-900"
                }`}
              >
                <option value="AED">UAE</option>
                <option value="INR">INDIA</option>
              </select>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`lg:hidden p-2.5 rounded-xl transition-colors active:scale-95 ${
                darkMode
                  ? "bg-slate-800 hover:bg-slate-700"
                  : "bg-white border border-slate-200 hover:bg-slate-100"
              }`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>

            {user && (
              <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-300/40 dark:border-slate-700/60">
                <img
                  src={
                    user.photoURL ||
                    "https://ui-avatars.com/api/?name=User&background=ffffff&color=0f172a&bold=true"
                  }
                  alt="User Avatar"
                  className="h-9 w-9 rounded-full ring-2 ring-slate-200 dark:ring-slate-700 object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="text-sm font-semibold truncate max-w-[110px]">
                  {firstName}
                </span>
              </div>
            )}

            <button
              onClick={onLogout}
              className="hidden sm:block bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div
        className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? "max-h-[34rem] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div
          className={`mx-3 mb-3 p-3 rounded-2xl border shadow-xl ${
            darkMode
              ? "bg-slate-900/95 border-slate-700"
              : "bg-white/95 border-slate-200"
          }`}
        >
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                location.pathname === link.path
                  ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white"
                  : darkMode
                  ? "text-slate-200 hover:bg-slate-800"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {link.name}
            </Link>
          ))}

          <button
            onClick={onLogout}
            className="w-full mt-3 text-left px-4 py-3 rounded-xl text-sm font-semibold bg-rose-500/10 text-rose-500 hover:bg-rose-500/15 transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
