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
    <div className="min-h-screen bg-[#fafafa]">
      <DashboardHeader meta={data.meta} />
      <div className="mx-auto max-w-[1600px] px-6 py-8">
        <DashboardNav />
        <main className="mt-8">{children}</main>
      </div>
    </div>
  );
}
