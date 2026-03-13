"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard/deadline", label: "Deadline" },
  { href: "/dashboard/vc-progress", label: "VC Progress" },
  { href: "/dashboard/status", label: "Status" },
  { href: "/dashboard/forecast", label: "Forecast" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-4">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === item.href
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
