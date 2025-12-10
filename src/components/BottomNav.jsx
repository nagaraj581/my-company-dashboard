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
      className={`fixed bottom-0 left-0 right-0 ${
        darkMode ? "bg-gray-900 border-t border-gray-700" : "bg-white border-t border-gray-200"
      } shadow-lg flex justify-around py-2 sm:hidden z-50`}
    >
      {links.map(({ name, icon: Icon, path }) => {
        const isActive = location.pathname === path;
        return (
          <Link
            key={path}
            to={path}
            className={`flex flex-col items-center text-xs font-medium transition ${
              isActive
                ? "text-blue-600"
                : darkMode
                ? "text-gray-400 hover:text-gray-200"
                : "text-gray-600 hover:text-blue-600"
            }`}
          >
            <Icon size={20} />
            <span>{name}</span>
          </Link>
        );
      })}
    </div>
  );
}
