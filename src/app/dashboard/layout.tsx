import type { ReactNode } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardNav } from "@/components/dashboard-nav";
import { fetchDashboardData } from "@/lib/sheets-client";

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const data = await fetchDashboardData();

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader meta={data.meta} />
      <div className="container mx-auto px-4 py-6 max-w-[1600px]">
        <DashboardNav />
        <main className="mt-6">{children}</main>
      </div>
    </div>
  );
}
