import { ReactNode } from "react";
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS } from "@/lib/tms-types";
import {
  LayoutDashboard, Truck, Users, MapPin, ClipboardList, Send, Briefcase,
  Scale, Receipt, BarChart3, AlertTriangle, LogOut, Settings, Menu,
  Building2, UserCog, Route as RouteIcon, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  module: string;
  group?: string;
}

const NAV: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, module: "dashboard" },

  { label: "Flottes", to: "/flottes", icon: Building2, module: "flotte", group: "Ressources" },
  { label: "Véhicules", to: "/vehicules", icon: Truck, module: "vehicules", group: "Ressources" },
  { label: "Chauffeurs", to: "/chauffeurs", icon: Users, module: "chauffeurs", group: "Ressources" },
  { label: "Prestataires", to: "/prestataires", icon: Briefcase, module: "prestataires", group: "Ressources" },

  { label: "Plannings", to: "/plannings", icon: ClipboardList, module: "planning", group: "Opérations" },
  { label: "Mises à disposition", to: "/mises-a-disposition", icon: Send, module: "mises-a-disposition", group: "Opérations" },
  { label: "Missions", to: "/missions", icon: RouteIcon, module: "missions", group: "Opérations" },
  { label: "Mes missions", to: "/mes-missions", icon: RouteIcon, module: "mes-missions", group: "Opérations" },

  { label: "Suivi GPS", to: "/suivi-gps", icon: MapPin, module: "suivi-gps", group: "Terrain" },
  { label: "Pont bascule", to: "/pont-bascule", icon: Scale, module: "pont-bascule", group: "Terrain" },
  { label: "Incidents", to: "/incidents", icon: AlertTriangle, module: "incidents", group: "Terrain" },

  { label: "Factures", to: "/factures", icon: Receipt, module: "factures", group: "Finance & Reporting" },
  { label: "Reporting & KPI", to: "/reporting", icon: BarChart3, module: "reporting", group: "Finance & Reporting" },

  { label: "Utilisateurs", to: "/utilisateurs", icon: UserCog, module: "utilisateurs", group: "Administration" },
];

export function AppLayout() {
  const { user, roles, signOut, canAccess } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const visible = NAV.filter((n) => canAccess(n.module));
  const grouped: Record<string, NavItem[]> = {};
  visible.forEach((n) => {
    const g = n.group || "Principal";
    grouped[g] ??= [];
    grouped[g].push(n);
  });

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}>
        <div className="flex h-14 items-center justify-between gap-2 border-b border-sidebar-border px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Truck className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-bold">TMS</p>
                <p className="text-[10px] text-sidebar-foreground/70">Transport Mgmt</p>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="mb-4">
              {!collapsed && (
                <p className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {group}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-base",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm-soft"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          {!collapsed && (
            <div className="mb-2 rounded-md bg-sidebar-accent/50 p-2">
              <p className="truncate text-xs font-medium">{user?.email}</p>
              <p className="mt-0.5 truncate text-[10px] text-sidebar-foreground/60">
                {roles.map((r) => ROLE_LABELS[r]).join(", ") || "Aucun rôle"}
              </p>
            </div>
          )}
          <button
            onClick={() => { signOut(); navigate("/auth"); }}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="border-b border-border bg-card px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
