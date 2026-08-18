import { createElement } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Package,
  FileText,
  DollarSign,
  ClipboardList,
} from "lucide-react";

export default function BottomNav({ darkMode }) {
  const location = useLocation();

  const links = [
    { name: "Material", icon: Package, path: "/material-request" },
    { name: "Quotation", icon: FileText, path: "/quotation" },
    { name: "Invoice", icon: DollarSign, path: "/invoice" },
    { name: "Items", icon: ClipboardList, path: "/items" },
  ];

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 sm:hidden z-50 backdrop-blur-xl ${
        darkMode
          ? "bg-slate-950/92 border-t border-slate-700/60"
          : "bg-white/86 border-t border-white/70"
      } shadow-[0_-12px_30px_rgba(15,23,42,0.2)]`}
    >
      <div className="flex justify-around px-2 py-3 max-w-4xl mx-auto">
        {links.map((link) => {
          const { name, path } = link;
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-white bg-gradient-to-r from-sky-500 to-indigo-600 shadow-lg"
                  : darkMode
                  ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  : "text-slate-600 hover:text-sky-600 hover:bg-slate-100"
              }`}
            >
              {createElement(link.icon, {
                size: 20,
                className: isActive ? "text-white" : "",
                "aria-hidden": true,
              })}
              <span className="text-xs font-semibold">{name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
