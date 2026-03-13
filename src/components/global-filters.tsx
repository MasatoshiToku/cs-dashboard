"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

interface GlobalFiltersProps {
  vcNames: string[];
  assignees: string[];
  yearMonths: string[];
}

export function GlobalFilters({
  vcNames,
  assignees,
  yearMonths,
}: GlobalFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  const resetAll = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const selectClass =
    "rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        className={selectClass}
        value={searchParams.get("vcName") ?? ""}
        onChange={(e) => updateParam("vcName", e.target.value)}
      >
        <option value="">VC名: すべて</option>
        {vcNames.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={searchParams.get("assignee") ?? ""}
        onChange={(e) => updateParam("assignee", e.target.value)}
      >
        <option value="">担当者: すべて</option>
        {assignees.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={searchParams.get("yearMonth") ?? ""}
        onChange={(e) => updateParam("yearMonth", e.target.value)}
      >
        <option value="">月: すべて</option>
        {yearMonths.map((ym) => (
          <option key={ym} value={ym}>
            {ym}
          </option>
        ))}
      </select>

      <button
        type="button"
        className="rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        onClick={resetAll}
      >
        リセット
      </button>
    </div>
  );
}
