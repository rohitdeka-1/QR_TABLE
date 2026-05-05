import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ListOrdered, Utensils, QrCode, BarChart3, ChefHat, Settings, LogOut } from "lucide-react";

const NAV = [
  { to: "/admin/orders", label: "Orders", icon: ListOrdered, testid: "nav-orders" },
  { to: "/admin/menu", label: "Menu", icon: Utensils, testid: "nav-menu" },
  { to: "/admin/tables", label: "Tables", icon: QrCode, testid: "nav-tables" },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, testid: "nav-analytics" },
  { to: "/admin/settings", label: "Settings", icon: Settings, testid: "nav-settings" },
];

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[#f4f3ef] flex" data-testid="admin-layout">
      <aside className="w-60 bg-white border-r border-[#eae6df] flex flex-col">
        <div className="p-5 border-b border-[#eae6df] flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#c84b31] flex items-center justify-center text-white">
            <QrCode size={16} />
          </div>
          <span className="font-display text-lg font-semibold">QR</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                data-testid={n.testid}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? "bg-[#2a2626] text-white"
                      : "text-[#2a2626] hover:bg-[#f4f3ef]"
                  }`
                }
              >
                <Icon size={16} />
                {n.label}
              </NavLink>
            );
          })}
          <NavLink
            to="/kitchen"
            data-testid="nav-kitchen"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#2a2626] hover:bg-[#f4f3ef]"
          >
            <ChefHat size={16} />
            Kitchen view
          </NavLink>
        </nav>
        <div className="p-3 border-t border-[#eae6df]">
          <div className="text-xs text-[#5c5656] px-3 py-1">
            {user?.email}
          </div>
          <button
            data-testid="logout-btn"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#5c5656] hover:bg-[#f4f3ef]"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
