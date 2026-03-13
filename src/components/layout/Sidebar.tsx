"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Zap,
  FileText,
  Settings,
  LogOut,
  BarChart3,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-context";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/campaigns", label: "Campanhas", icon: Megaphone },
  { href: "/audiences", label: "Públicos", icon: Users },
  { href: "/pixels", label: "Pixels & Eventos", icon: Zap },
  { href: "/optimizations", label: "Otimizações IA", icon: BarChart3, badge: true },
  { href: "/reports", label: "Relatórios", icon: FileText },
  { href: "/chat", label: "Chat IA", icon: MessageSquare, badge: true },
];

async function handleLogout() {
  await fetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { role } = useSession();
  const isAdmin = role === "admin";

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 border-r border-border bg-card flex flex-col transition-[width,transform] duration-300",
        collapsed ? "md:w-16" : "md:w-64",
        "w-64",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center border-b border-border flex-shrink-0",
        collapsed ? "md:justify-center md:px-0 md:py-5 px-4 py-5" : "gap-3 px-4 py-5"
      )}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Megaphone className="w-4 h-4 text-primary-foreground" />
        </div>
        <div className={cn("flex-1 min-w-0", collapsed && "md:hidden")}>
          <p className="font-semibold text-sm truncate">Meta Ads Manager</p>
          <p className="text-xs text-muted-foreground">Powered by AI</p>
        </div>
        {/* Mobile close */}
        <button
          onClick={onMobileClose}
          className="md:hidden ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className={cn("flex-1 py-4 space-y-1 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                collapsed ? "md:justify-center md:px-2 md:py-2.5 px-3 py-2.5" : "px-3 py-2.5",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className={cn(collapsed && "md:hidden")}>{item.label}</span>
              {item.badge && (
                <span className={cn(
                  "text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full",
                  collapsed ? "ml-auto md:hidden" : "ml-auto"
                )}>
                  IA
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn("py-4 border-t border-border space-y-1", collapsed ? "px-2" : "px-3")}>
        {isAdmin && (
          <Link
            href="/settings"
            onClick={onMobileClose}
            title={collapsed ? "Configurações" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors",
              collapsed ? "md:justify-center md:px-2 md:py-2.5 px-3 py-2.5" : "px-3 py-2.5"
            )}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span className={cn(collapsed && "md:hidden")}>Configurações</span>
          </Link>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? "Sair" : undefined}
          className={cn(
            "w-full flex items-center gap-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors",
            collapsed ? "md:justify-center md:px-2 md:py-2.5 px-3 py-2.5" : "px-3 py-2.5"
          )}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <span className={cn(collapsed && "md:hidden")}>Sair</span>
        </button>

        {/* Desktop toggle button */}
        <button
          onClick={onToggle}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "hidden md:flex w-full items-center gap-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors mt-1",
            collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
          )}
        >
          {collapsed
            ? <ChevronRight className="w-4 h-4 flex-shrink-0" />
            : <><ChevronLeft className="w-4 h-4 flex-shrink-0" /><span>Recolher</span></>
          }
        </button>
      </div>
    </aside>
  );
}
