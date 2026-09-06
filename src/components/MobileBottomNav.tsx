import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavItem } from "./Sidebar";

interface MobileBottomNavProps {
  items: NavItem[];
}

export function MobileBottomNav({ items }: MobileBottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-semibold transition-colors ${
              isActive ? "text-teal-800 font-extrabold" : "text-slate-500"
            }`}
          >
            <Icon
              className={`w-5 h-5 mb-0.5 ${
                isActive ? "text-teal-700" : "text-slate-400"
              }`}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
