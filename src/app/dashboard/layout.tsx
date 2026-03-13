import type { ReactNode } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardNav } from "@/components/dashboard-nav";
import { fetchDashboardData } from "@/lib/sheets-client";

export const revalidate = 3600;

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const data = await fetchDashboardData();

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader meta={data.meta} />
      <div className="container mx-auto px-4 py-6">
        <DashboardNav />
        <main className="mt-6">{children}</main>
      </div>
    </div>
  );
}
