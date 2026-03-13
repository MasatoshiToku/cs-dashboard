import { MetaData } from '@/lib/types';

interface DashboardHeaderProps {
  meta: MetaData;
}

export function DashboardHeader({ meta }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-[1600px] items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-900">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
          </div>
          <span className="text-[13px] font-semibold text-gray-900">CS Dashboard</span>
        </div>
        <div className="flex items-center gap-4">
          {meta.errorMessage && (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-red-500">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              {meta.errorMessage}
            </span>
          )}
          {meta.lastSyncAt && (
            <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {meta.lastSyncAt}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
