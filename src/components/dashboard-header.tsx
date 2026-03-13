import type { MetaData } from "@/lib/types";

export function DashboardHeader({ meta }: { meta?: MetaData }) {
  return (
    <header className="border-b">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <h1 className="text-lg font-semibold">CS業務管理ダッシュボード</h1>
        {meta && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {meta.lastSyncAt && (
              <span>最終同期: {meta.lastSyncAt}</span>
            )}
            {meta.errorMessage && (
              <span className="text-destructive">{meta.errorMessage}</span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
