import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ReceiptText,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import BottomNav from "./BottomNav";
import { CurrencySwitcher } from "./CurrencySwitcher";

const navLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/company", label: "Company Info", icon: Building2 },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/items", label: "Items", icon: Package },
  { href: "/suppliers", label: "Suppliers", icon: Users },
  { href: "/projects", label: "Projects", icon: BriefcaseBusiness },
  { href: "/material-receipt", label: "Material Receipt", icon: ReceiptText },
  { href: "/project-consumption", label: "Consumption", icon: ClipboardList },
  { href: "/quotation", label: "Quotation", icon: FileText },
  { href: "/invoice", label: "Invoice", icon: ReceiptText },
];

export default function Layout({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const userName = user?.displayName || user?.email?.split("@")[0] || "User";
  const getInitials = (name) => {
    const names = name.trim().split(/\s+/);
    return names.length === 1
      ? names[0].slice(0, 1).toUpperCase()
      : `${names[0].slice(0, 1)}${names.at(-1).slice(0, 1)}`.toUpperCase();
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[17.5rem] flex-col transform border-r border-white/10 bg-slate-950 text-white shadow-2xl transition-transform duration-300 ease-out md:relative md:translate-x-0 md:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 shrink-0 items-center gap-3 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 via-cyan-400 to-emerald-400 font-black text-slate-950 shadow-lg shadow-sky-500/20">MC</div>
          <div>
            <div className="text-base font-extrabold tracking-tight">MyCompany</div>
            <div className="text-xs font-medium text-slate-400">Operations workspace</div>
          </div>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 space-y-1 overflow-y-auto px-4 py-3">
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              end
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-sky-500 to-cyan-500 font-bold text-white shadow-lg shadow-sky-950/30"
                    : "font-semibold text-slate-400 hover:bg-white/7 hover:text-white"
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <link.icon size={19} aria-hidden="true" className="transition-transform group-hover:scale-110" />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="m-4 mt-1 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-slate-400">
          <span className="font-bold text-slate-200">Tip:</span> Choose a company before creating client documents.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="z-20 flex h-20 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/75 md:px-8">
          <button type="button" aria-label={sidebarOpen ? "Close navigation" : "Open navigation"} className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden" onClick={() => setSidebarOpen((open) => !open)}>
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="hidden min-w-0 md:block">
            <p className="truncate text-sm font-bold text-slate-900 dark:text-white">Manage your business with clarity</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">Inventory, projects, documents, and payments.</p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button type="button" aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"} onClick={() => setDarkMode((current) => !current)} className="hidden rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-amber-300 sm:inline-flex">
              {darkMode ? "☀" : "☾"}
            </button>
            <div className="hidden sm:block"><CurrencySwitcher /></div>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 font-bold text-white">{getInitials(userName)}</div>
              <span className="hidden max-w-36 truncate text-sm font-bold text-slate-700 dark:text-slate-200 lg:inline">{userName}</span>
            </div>
            <button type="button" onClick={onLogout} className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/35 dark:text-rose-300 dark:hover:bg-rose-950/60">
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-8 md:pb-8"><Outlet /></main>
      </div>

      <div className="sm:hidden"><BottomNav darkMode={darkMode} /></div>

      {sidebarOpen && (
        <div aria-hidden="true" className="fixed inset-0 z-20 bg-slate-950/55 backdrop-blur-[1px] md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
