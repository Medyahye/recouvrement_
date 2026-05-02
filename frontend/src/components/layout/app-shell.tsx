"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import {
  BotMessageSquare,
  CalendarDays,
  Droplets,
  FileBarChart2,
  LayoutDashboard,
  MapPinned,
  Upload,
  Users,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/import-fab", label: "Import FAB", icon: Upload },
  { href: "/zones", label: "Zones", icon: MapPinned },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/reports", label: "Rapports", icon: FileBarChart2 },
  { href: "/chatbot", label: "Assistant IA", icon: BotMessageSquare },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const today = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-4 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Droplets size={20} />
              </div>
              <div>
                <p className="text-lg font-bold text-blue-700">SNDE</p>
                <p className="text-xs text-slate-500">Recouvrement</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "border border-blue-100 bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="border-b border-blue-900 bg-blue-900 px-5 py-4 text-white md:px-6">
            <div className="flex min-w-0 items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold md:text-xl">
                  Pilotage intelligent du recouvrement
                </p>
              </div>
              <div className="hidden shrink-0 items-center gap-4 text-sm md:flex">
                <div className="flex items-center gap-2 text-blue-50">
                  <CalendarDays size={16} className="text-blue-100" />
                  <span className="font-medium leading-none">{today}</span>
                </div>
                <span className="h-5 w-px bg-blue-700" />
                <span className="font-medium leading-none text-blue-50">Admin</span>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-x-hidden p-5 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
