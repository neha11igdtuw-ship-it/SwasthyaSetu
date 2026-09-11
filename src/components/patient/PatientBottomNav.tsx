import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Mic,
  Calendar,
  FileText,
  Share2,
  AlertOctagon,
} from "lucide-react";

export function PatientBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/patient/dashboard", icon: LayoutDashboard },
    { label: "Voice AI", href: "/patient/voice-assistant", icon: Mic },
    { label: "Appts", href: "/patient/appointments", icon: Calendar },
    { label: "Records", href: "/patient/records", icon: FileText },
    { label: "Referrals", href: "/patient/referrals", icon: Share2 },
    { label: "Emergency", href: "/patient/emergency-help", icon: AlertOctagon },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-2 py-1.5 flex items-center justify-around shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
              isActive ? "text-teal-800 font-extrabold" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <Icon
              className={`w-5 h-5 mb-0.5 ${
                isActive ? "text-teal-700" : "text-slate-400 dark:text-slate-500"
              }`}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
