'use client';

import React, { useReducer, useCallback, useMemo, useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ForecastCell } from './forecast-cell';
import { ForecastToolbar } from './forecast-toolbar';
import { AddClientDialog } from './add-client-dialog';
import { ForecastRowExtended, ForecastCategory, ForecastFrequency } from '@/lib/types';
import { FORECAST_CATEGORIES, FORECAST_CATEGORY_COLORS } from '@/lib/constants';
import { cn } from '@/lib/utils';

// --- Types ---

interface GridState {
  rows: ForecastRowExtended[];
  changes: Map<string, Partial<ForecastRowExtended>>;  // key: vcName|yearMonth
  added: ForecastRowExtended[];
  deletedKeys: Set<string>;  // key: vcName|yearMonth
}

type GridAction =
  | { type: 'UPDATE_CELL'; vcName: string; yearMonth: string; field: keyof ForecastRowExtended; value: string | number | null }
  | { type: 'ADD_CLIENT'; rows: ForecastRowExtended[] }
  | { type: 'DELETE_ROW'; vcName: string; yearMonth: string }
  | { type: 'DISCARD' }
  | { type: 'SAVE_SUCCESS'; newRows: ForecastRowExtended[] };

function makeKey(vcName: string, yearMonth: string): string {
  return `${vcName}|${yearMonth}`;
}

function gridReducer(state: GridState, action: GridAction): GridState {
  switch (action.type) {
    case 'UPDATE_CELL': {
      const key = makeKey(action.vcName, action.yearMonth);
      const existing = state.changes.get(key) ?? {};
      const newChanges = new Map(state.changes);
      newChanges.set(key, { ...existing, [action.field]: action.value });

      // added にも反映
      const addedIdx = state.added.findIndex(
        r => r.vcName === action.vcName && r.yearMonth === action.yearMonth
      );
      if (addedIdx >= 0) {
        const newAdded = [...state.added];
        newAdded[addedIdx] = { ...newAdded[addedIdx], [action.field]: action.value };
        return { ...state, changes: newChanges, added: newAdded };
      }

      return { ...state, changes: newChanges };
    }
    case 'ADD_CLIENT': {
      return {
        ...state,
        added: [...state.added, ...action.rows],
      };
    }
    case 'DELETE_ROW': {
      const key = makeKey(action.vcName, action.yearMonth);
      const newDeleted = new Set(state.deletedKeys);
      newDeleted.add(key);
      // changes からも除去
      const newChanges = new Map(state.changes);
      newChanges.delete(key);
      // added からも除去
      const newAdded = state.added.filter(
        r => makeKey(r.vcName, r.yearMonth) !== key
      );
      return { ...state, deletedKeys: newDeleted, changes: newChanges, added: newAdded };
    }
    case 'DISCARD': {
      return {
        rows: state.rows,
        changes: new Map<string, Partial<ForecastRowExtended>>(),
        added: [],
        deletedKeys: new Set<string>(),
      };
    }
    case 'SAVE_SUCCESS': {
      return {
        rows: action.newRows,
        changes: new Map<string, Partial<ForecastRowExtended>>(),
        added: [],
        deletedKeys: new Set<string>(),
      };
    }
    default:
      return state;
  }
}

// --- Component ---

interface ForecastGridProps {
  initialForecasts: ForecastRowExtended[];
  sheetId: number;  // forecasts シートの gid
  knownVcNames: string[];  // issues + forecasts から取得した全VC名（ルックアップ候補）
  existingVcProfiles: Record<string, ForecastRowExtended>;  // forecasts にある VC のプロファイル
}

export function ForecastGrid({ initialForecasts, sheetId, knownVcNames, existingVcProfiles }: ForecastGridProps) {
  const initialState: GridState = {
    rows: initialForecasts,
    changes: new Map<string, Partial<ForecastRowExtended>>(),
    added: [],
    deletedKeys: new Set<string>(),
  };
  const [state, dispatch] = useReducer(gridReducer, initialState);

  const [selectedCategory, setSelectedCategory] = useState<ForecastCategory | 'all'>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<ForecastCategory>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // --- 今月（ハイライト用） ---
  const currentMonth = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}`;
  }, []);


  // --- 月の計算（過去24ヶ月 + 今月 + 未来23ヶ月 = 合計48ヶ月） ---
  const months = useMemo(() => {
    const today = new Date();
    const result: string[] = [];

    // 過去60ヶ月 + 今月 + 未来59ヶ月 = 120ヶ月（10年間）
    for (let i = -60; i <= 59; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const ym = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      result.push(ym);
    }

    // データに存在するがこの範囲外の月も追加
    const monthSet = new Set(result);
    for (const row of [...state.rows, ...state.added]) {
      if (!monthSet.has(row.yearMonth)) {
        result.push(row.yearMonth);
      }
    }

    return result.sort();
  }, [state.rows, state.added]);

  // --- 初期スクロール位置を今月に設定（scrollIntoView方式） ---
  useEffect(() => {
    const el = document.getElementById('current-month');
    if (el) {
      const timer = setTimeout(() => {
        el.scrollIntoView({ inline: 'center', block: 'nearest' });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [months]);

  // --- 全行（元データ + 追加 - 削除） ---
  const allRows = useMemo(() => {
    const base = [...state.rows, ...state.added];
    return base.filter(r => !state.deletedKeys.has(makeKey(r.vcName, r.yearMonth)));
  }, [state.rows, state.added, state.deletedKeys]);

  // --- 繰り返しクライアントのバーチャル行 ---
  const filledRowsData = useMemo(() => {
    const filtered = allRows;

    // VC名ごとにグループ化して、frequencyを確認
    const vcMap = new Map<string, ForecastRowExtended[]>();
    for (const row of filtered) {
      const list = vcMap.get(row.vcName) ?? [];
      list.push(row);
      vcMap.set(row.vcName, list);
    }

    const result = [...filtered];
    const virtualKeys = new Set<string>();

    for (const [vcName, rows] of Array.from(vcMap.entries())) {
      const template = rows[0]; // カテゴリ等の情報を引き継ぐ
      if (!template || template.frequency !== 'regular' || !template.intervalMonths) continue;

      const existingMonths = new Set(rows.map(r => r.yearMonth));
      const interval = template.intervalMonths;

      // startMonth を起点に interval 間隔で表示月を計算（未設定なら最古の既存月）
      const sortedMonths = Array.from(existingMonths).sort();
      const startYM = template.startMonth || sortedMonths[0] || months[0];
      const [startY, startM] = startYM.split('/').map(Number);

      // 表示月範囲内で該当する月を計算
      for (const month of months) {
        if (existingMonths.has(month)) continue;
        if (state.deletedKeys.has(makeKey(vcName, month))) continue;

        const [y, m] = month.split('/').map(Number);
        const totalMonthsDiff = (y - startY) * 12 + (m - startM);

        if (totalMonthsDiff >= 0 && totalMonthsDiff % interval === 0) {
          const key = makeKey(vcName, month);
          virtualKeys.add(key);
          result.push({
            ...template,
            vcName,
            yearMonth: month,
            forecastCount: template.forecastCount,
            notes: '',
          });
        }
      }
      // 'one-time' は補完なし
    }

    return { rows: result, virtualKeys };
  }, [allRows, state.deletedKeys, months]);

  // 変更適用済みの行
  const effectiveRows = useMemo(() => {
    return filledRowsData.rows.map(row => {
      const key = makeKey(row.vcName, row.yearMonth);
      const changes = state.changes.get(key);
      if (changes) {
        return { ...row, ...changes } as ForecastRowExtended;
      }
      return row;
    });
  }, [filledRowsData.rows, state.changes]);

  // --- カテゴリ別グループ ---
  const groupedByCategory = useMemo(() => {
    const groups: Record<string, { vcName: string; months: Record<string, ForecastRowExtended> }[]> = {};

    for (const cat of FORECAST_CATEGORIES) {
      groups[cat] = [];
    }

    // VC名でグループ化
    const vcMap = new Map<string, ForecastRowExtended[]>();
    for (const row of effectiveRows) {
      const list = vcMap.get(row.vcName) ?? [];
      list.push(row);
      vcMap.set(row.vcName, list);
    }

    // カテゴリに振り分け
    for (const [vcName, rows] of Array.from(vcMap.entries())) {
      // カテゴリは最初の行から取得（同一VCは同一カテゴリの想定）
      const category = rows[0]?.category ?? '新規VC';
      const monthMap: Record<string, ForecastRowExtended> = {};
      for (const row of rows) {
        monthMap[row.yearMonth] = row;
      }
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({ vcName, months: monthMap });
    }

    // VC名でソート
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => a.vcName.localeCompare(b.vcName, 'ja'));
    }

    return groups;
  }, [effectiveRows]);

  // --- カテゴリ小計 ---
  const categorySubtotals = useMemo(() => {
    const totals: Record<string, Record<string, number>> = {};
    for (const cat of FORECAST_CATEGORIES) {
      totals[cat] = {};
      for (const month of months) {
        const catRows = effectiveRows.filter(r => r.category === cat && r.yearMonth === month);
        totals[cat][month] = catRows.reduce((sum, r) => sum + r.forecastCount, 0);
      }
    }
    return totals;
  }, [effectiveRows, months]);

  // --- 全体合計 ---
  const grandTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const month of months) {
      const monthRows = effectiveRows.filter(r => r.yearMonth === month);
      totals[month] = monthRows.reduce((sum, r) => sum + r.forecastCount, 0);
    }
    return totals;
  }, [effectiveRows, months]);

  // --- ハンドラー ---
  const hasUnsavedChanges = state.changes.size > 0 || state.added.length > 0 || state.deletedKeys.size > 0;

  const existingVcNames = useMemo(() => {
    return Array.from(new Set(allRows.map(r => r.vcName)));
  }, [allRows]);

  const toggleCategory = useCallback((cat: ForecastCategory) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  const handleCellChange = useCallback((vcName: string, yearMonth: string, value: string | number | null) => {
    const key = makeKey(vcName, yearMonth);
    // バーチャル行を編集した場合、added に追加して保存対象にする
    if (filledRowsData.virtualKeys.has(key)) {
      // filledRowsData.rows からテンプレート行を取得
      const templateRow = filledRowsData.rows.find(r => r.vcName === vcName && r.yearMonth === yearMonth);
      if (templateRow) {
        dispatch({
          type: 'ADD_CLIENT',
          rows: [{
            ...templateRow,
            forecastCount: typeof value === 'number' ? value : 0,
          }],
        });
        return;
      }
    }
    dispatch({
      type: 'UPDATE_CELL',
      vcName,
      yearMonth,
      field: 'forecastCount',
      value: typeof value === 'number' ? value : 0,
    });
  }, [filledRowsData]);

  const handleDeleteRow = useCallback((vcName: string, yearMonth: string) => {
    dispatch({ type: 'DELETE_ROW', vcName, yearMonth });
  }, []);

  const handleAddClient = useCallback((data: { vcName: string; category: ForecastCategory; frequency: ForecastFrequency; intervalMonths: number | null; startMonth: string | null; deadlineDay: number | null; assignDeadlineDay: number | null; forecastCount: number }) => {
    // regular: 最初の月のみ実行を追加（バーチャル行が残りを表示）
    // one-time: 最初の月のみ
    const newRows: ForecastRowExtended[] = [{
      vcName: data.vcName,
      yearMonth: months[0],
      forecastCount: data.forecastCount,
      notes: '',
      category: data.category,
      frequency: data.frequency,
      intervalMonths: data.intervalMonths,
      startMonth: data.startMonth,
      deadlineDay: data.deadlineDay,
      assignDeadlineDay: data.assignDeadlineDay,
    }];
    dispatch({ type: 'ADD_CLIENT', rows: newRows });
  }, [months]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // 変更を集約
      const updates: { range: string; values: (string | number | null)[][] }[] = [];

      // 既存行の更新: 元のrows内での位置を特定してrange指定
      for (const [key, changes] of Array.from(state.changes.entries())) {
        const [vcName, yearMonth] = key.split('|');
        const rowIdx = state.rows.findIndex((r: ForecastRowExtended) => r.vcName === vcName && r.yearMonth === yearMonth);
        if (rowIdx >= 0) {
          const row = { ...state.rows[rowIdx], ...changes };
          const sheetRow = rowIdx + 2; // A2始まりなので+2
          updates.push({
            range: `forecasts!A${sheetRow}:J${sheetRow}`,
            values: [[
              row.vcName,
              row.yearMonth,
              row.forecastCount,
              row.notes ?? '',
              row.category,
              row.frequency,
              row.deadlineDay ?? '',
              row.assignDeadlineDay ?? '',
              row.intervalMonths ?? '',
              row.startMonth ?? '',
            ]],
          });
        }
      }

      // バッチ更新
      if (updates.length > 0) {
        const res = await fetch('/api/forecasts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', data: updates }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '更新に失敗しました');
        }
      }

      // 新規行の追加
      for (const row of state.added) {
        const res = await fetch('/api/forecasts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'append',
            data: {
              vcName: row.vcName,
              yearMonth: row.yearMonth,
              forecastCount: row.forecastCount,
              notes: row.notes ?? '',
              category: row.category,
              frequency: row.frequency,
              deadlineDay: row.deadlineDay ?? null,
              assignDeadlineDay: row.assignDeadlineDay ?? null,
              intervalMonths: row.intervalMonths ?? null,
              startMonth: row.startMonth ?? null,
            },
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || '追加に失敗しました');
        }
      }

      // 削除
      if (state.deletedKeys.size > 0) {
        const rowIndices: number[] = [];
        for (const key of Array.from(state.deletedKeys)) {
          const [vcName, yearMonth] = key.split('|');
          const idx = state.rows.findIndex((r: ForecastRowExtended) => r.vcName === vcName && r.yearMonth === yearMonth);
          if (idx >= 0) {
            rowIndices.push(idx + 1); // 0-based でヘッダー含むので+1
          }
        }
        if (rowIndices.length > 0) {
          const res = await fetch('/api/forecasts', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rowIndices, sheetId }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || '削除に失敗しました');
          }
        }
      }

      // 成功: ページリロードで最新データ取得
      window.location.reload();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  }, [state, sheetId]);

  const handleDiscard = useCallback(() => {
    dispatch({ type: 'DISCARD' });
  }, []);

  // --- フィルタされたカテゴリ ---
  const visibleCategories = selectedCategory === 'all'
    ? FORECAST_CATEGORIES
    : FORECAST_CATEGORIES.filter(c => c === selectedCategory);

  return (
    <div className="space-y-4">
      <ForecastToolbar
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onAddClient={() => setShowAddDialog(true)}
      />

      {saveError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {saveError}
        </div>
      )}

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-muted/20 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
          <Table style={{ minWidth: `${200 + months.length * 100 + 60}px` }}>
            <TableHeader>
              <TableRow className="bg-muted/40 border-b-2">
                <TableHead className="sticky left-0 z-20 bg-muted/40 w-[200px] min-w-[200px] font-semibold text-foreground">
                  クライアント
                </TableHead>
                {months.map((m, i) => {
                  const [year, month] = m.split('/');
                  const prevYear = i > 0 ? months[i - 1].split('/')[0] : '';
                  const showYear = year !== prevYear;
                  return (
                    <TableHead
                      key={m}
                      id={m === currentMonth ? 'current-month' : undefined}
                      className={cn(
                        "text-center w-[100px] min-w-[100px] whitespace-nowrap font-medium",
                        m === currentMonth && "bg-blue-100/70 text-blue-900 font-semibold"
                      )}
                    >
                      {showYear && <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{year}</div>}
                      <div>{month}月</div>
                    </TableHead>
                  );
                })}
                <TableHead className="w-[50px] bg-muted/40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleCategories.map(category => {
                const categoryRows = groupedByCategory[category] ?? [];
                if (categoryRows.length === 0 && selectedCategory === 'all') return null;
                const isCollapsed = collapsedCategories.has(category);

                return (
                  <React.Fragment key={category}>
                    {/* カテゴリヘッダー */}
                    <TableRow className="group hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => toggleCategory(category)}>
                      <TableCell className="sticky left-0 z-10 bg-white font-semibold py-2.5 border-l-4" style={{ borderLeftColor: FORECAST_CATEGORY_COLORS[category] }}>
                        <span className="flex items-center gap-2.5">
                          <span className="text-xs text-muted-foreground transition-transform duration-200" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                            ▼
                          </span>
                          <span className="font-semibold">{category}</span>
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {categoryRows.length}
                          </span>
                        </span>
                      </TableCell>
                      {months.map(month => (
                        <TableCell key={month} className={cn("bg-white", month === currentMonth && "bg-blue-50/50")} />
                      ))}
                      <TableCell className="bg-white" />
                    </TableRow>

                    {/* クライアント行 */}
                    {!isCollapsed && categoryRows.map(({ vcName, months: monthData }) => (
                      <TableRow key={vcName} className="group hover:bg-muted/20 transition-colors">
                        <TableCell className="sticky left-0 z-10 bg-white group-hover:bg-muted/20 transition-colors font-medium text-sm">
                          <span className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: FORECAST_CATEGORY_COLORS[category] }} />
                            {vcName}
                          </span>
                        </TableCell>
                        {months.map(month => {
                          const row = monthData[month];
                          const isVirtual = filledRowsData.virtualKeys.has(makeKey(vcName, month));
                          return (
                            <TableCell
                              key={month}
                              className={cn(
                                "p-0 transition-colors",
                                month === currentMonth && "bg-blue-50/50",
                                isVirtual && "bg-muted/10"
                              )}
                            >
                              <ForecastCell
                                value={row?.forecastCount ?? null}
                                type="number"
                                onChange={(val) => handleCellChange(vcName, month, val)}
                                placeholder="-"
                                className={cn(
                                  "text-center",
                                  isVirtual && "text-muted-foreground/60 italic"
                                )}
                              />
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded-md hover:bg-destructive/10 hover:text-destructive inline-flex items-center justify-center text-muted-foreground"
                            onClick={() => {
                              // そのVCの表示月分を全削除
                              for (const month of months) {
                                if (monthData[month]) {
                                  handleDeleteRow(vcName, month);
                                }
                              }
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* 小計行 */}
                    {!isCollapsed && categoryRows.length > 0 && (
                      <TableRow className="border-t border-dashed">
                        <TableCell className="sticky left-0 z-10 bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider py-1.5">
                          小計
                        </TableCell>
                        {months.map(month => (
                          <TableCell
                            key={month}
                            className={cn(
                              "text-center text-xs font-semibold text-muted-foreground bg-muted/20 py-1.5",
                              month === currentMonth && "bg-blue-100/30 text-blue-800"
                            )}
                          >
                            {categorySubtotals[category]?.[month] || <span className="text-muted-foreground/30">-</span>}
                          </TableCell>
                        ))}
                        <TableCell className="bg-muted/20" />
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}

              {/* 合計行 */}
              <TableRow className="border-t-2 bg-muted/30">
                <TableCell className="sticky left-0 z-10 bg-muted/30 font-bold text-sm">
                  合計
                </TableCell>
                {months.map(month => (
                  <TableCell
                    key={month}
                    className={cn(
                      "text-center font-bold text-sm",
                      month === currentMonth && "bg-blue-100/50 text-blue-900"
                    )}
                  >
                    {grandTotals[month] || <span className="text-muted-foreground/30">-</span>}
                  </TableCell>
                ))}
                <TableCell className="bg-muted/30" />
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>

      <AddClientDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddClient}
        existingVcNames={existingVcNames}
        knownVcNames={knownVcNames}
        existingVcProfiles={existingVcProfiles}
      />
    </div>
  );
}
