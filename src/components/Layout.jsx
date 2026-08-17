import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  Users,
  Building2,
  ReceiptText,
  FileText,
  Warehouse,
  ClipboardList,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { CurrencySwitcher } from "./CurrencySwitcher";

const navLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/items", label: "Items", icon: Package },
  { href: "/suppliers", label: "Suppliers", icon: Users },
  { href: "/projects", label: "Projects", icon: Building2 },
  { href: "/material-receipt", label: "Material Receipt", icon: ReceiptText },
  { href: "/project-consumption", label: "Consumption", icon: ClipboardList },
  { href: "/quotation", label: "Quotation", icon: FileText },
  { href: "/invoice", label: "Invoice", icon: ReceiptText },
];

export default function Layout({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getInitials = (name) => {
    if (!name) return "?";
    const names = name.split(" ");
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-slate-900 text-white transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center justify-center bg-slate-950 text-2xl font-bold">
          MyCompany
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-2.5 transition-colors ${
                  isActive
                    ? "bg-sky-600 text-white"
                    : "hover:bg-slate-800 text-slate-300"
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <link.icon size={20} />
              <span className="font-semibold">{link.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 shadow-sm backdrop-blur-md dark:border-slate-800/60 dark:bg-slate-900/80 md:px-8">
          <button
            className="text-slate-600 dark:text-slate-300 md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex-1"></div> {/* Spacer */}
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-end">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 font-bold text-white">
                {getInitials(user.displayName)}
              </div>
              <span className="hidden sm:inline font-semibold text-slate-700 dark:text-slate-200">
                Welcome, {user.displayName || "User"}
              </span>
            </div>
            <CurrencySwitcher />
            <button
              onClick={onLogout}
              className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/60"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}