import {
  LayoutDashboard, Users, Building2, TrendingUp, Truck,
  FileText, BarChart3, Bot, Settings, PanelLeftClose, PanelLeft,
  PlusCircle,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";

const navItems = [
  { title: "Dashboard",          url: "/dashboard",          icon: LayoutDashboard },
  { title: "New Engagement",     url: "/new-engagement",     icon: PlusCircle },
  { title: "Contacts",           url: "/contacts",           icon: Users },
  { title: "Companies",          url: "/companies",          icon: Building2 },
  { title: "Sales Pipeline",     url: "/sales-pipeline",     icon: TrendingUp },
  { title: "Delivery Pipeline",  url: "/delivery-pipeline",  icon: Truck },
  { title: "Invoices",           url: "/invoices",           icon: FileText },
  { title: "Reports",            url: "/reports",            icon: BarChart3 },
  { title: "Agent Log",          url: "/agent-log",          icon: Bot },
  { title: "Settings",           url: "/settings",           icon: Settings },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-200 shrink-0",
        collapsed ? "w-[60px]" : "w-[220px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-semibold text-sidebar-foreground truncate">SM Advisors</div>
            <div className="text-xs text-sidebar-muted truncate">CRM + BD Agent</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-sidebar-accent text-sidebar-muted shrink-0"
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map((item) => {
          const active =
            item.url === "/dashboard"
              ? location.pathname === item.url
              : location.pathname.startsWith(item.url);
          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.title}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
