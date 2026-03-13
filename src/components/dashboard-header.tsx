import { MetaData } from '@/lib/types';

interface DashboardHeaderProps {
  meta: MetaData;
}

export function DashboardHeader({ meta }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/90 backdrop-blur-xl supports-[backdrop-filter]:bg-white/70">
      <div className="container mx-auto flex h-14 max-w-[1600px] items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
          </div>
          <span className="text-sm font-semibold text-gray-900 tracking-tight">CS Dashboard</span>
        </div>
        <div className="flex items-center gap-5">
          {meta.errorMessage && (
            <div className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
              <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
              {meta.errorMessage}
            </div>
          )}
          {meta.lastSyncAt && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              同期 {meta.lastSyncAt}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
