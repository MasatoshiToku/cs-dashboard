import { MetaData } from '@/lib/types';

interface DashboardHeaderProps {
  meta: MetaData;
}

export function DashboardHeader({ meta }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-lg supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">CS Dashboard</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {meta.errorMessage && (
            <div className="flex items-center gap-1.5 text-destructive">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{meta.errorMessage}</span>
            </div>
          )}
          {meta.lastSyncAt && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>同期: {meta.lastSyncAt}</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
