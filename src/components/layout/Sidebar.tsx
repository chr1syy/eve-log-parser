"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Crosshair,
  LayoutDashboard,
  Upload,
  Database,
  Sword,
  ShieldAlert,
  Zap,
  Users,
} from "lucide-react";

const navItems = [
  { label: "Logs", href: "/upload", icon: Upload },
  { label: "Fleet", href: "/fleet", icon: Users, badge: "beta" },
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Raw Data", href: "/kills", icon: Database },
  { label: "Damage Out", href: "/damage-dealt", icon: Sword },
  { label: "Damage In", href: "/damage-taken", icon: ShieldAlert },
  { label: "Cap Pressure", href: "/cap-pressure", icon: Zap },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-void border-r border-border flex flex-col z-sticky">
      {/* Logo area */}
      <div className="h-16 flex items-center px-4 border-b border-border flex-shrink-0">
        <Crosshair className="w-5 h-5 text-cyan-glow mr-3 flex-shrink-0" />
        <div className="font-ui font-bold text-base uppercase tracking-widest leading-tight">
          <span className="text-text-primary">EVE </span>
          <span className="relative text-cyan-glow">
            LOG
            <span
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-glow"
              aria-hidden="true"
            />
          </span>
          <span className="text-text-primary"> PARSER</span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon, badge }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm font-ui font-500 transition-all duration-150 ${
                isActive
                  ? "border-l-2 border-cyan-glow bg-cyan-ghost text-cyan-glow"
                  : "border-l-2 border-transparent text-text-secondary hover:text-text-primary hover:bg-elevated"
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="uppercase tracking-wider">{label}</span>
              {badge && (
                <span className="ml-auto text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-cyan-glow/40 text-cyan-glow/70">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer area intentionally left empty; version is shown in footer by tag */}
      <div className="px-4 py-3 border-t border-border flex-shrink-0" />
    </aside>
  );
}
