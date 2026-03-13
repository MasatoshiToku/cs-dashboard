'use client';

import React, { useReducer, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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

  // --- スクロールコンテナ ref ---
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // --- 月の計算（過去24ヶ月 + 今月 + 未来23ヶ月 = 合計48ヶ月） ---
  const months = useMemo(() => {
    const today = new Date();
    const result: string[] = [];

    // 過去24ヶ月 + 今月 + 未来23ヶ月 = 合計48ヶ月
    for (let i = -24; i <= 23; i++) {
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

  // --- 初期スクロール位置を今月に設定 ---
  useEffect(() => {
    requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const monthIndex = months.indexOf(currentMonth);

      if (monthIndex >= 0) {
        // クライアント列(180px) + 月カラム(100px) × monthIndex - 左に3ヶ月分見えるようオフセット
        const scrollTo = 180 + monthIndex * 100 - 300;
        container.scrollLeft = Math.max(0, scrollTo);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回のみ

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
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-md text-sm">
          {saveError}
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className="border rounded-lg overflow-x-auto"
      >
        <Table style={{ minWidth: `${180 + months.length * 100 + 60}px` }}>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-20 w-[180px] min-w-[180px]">
                クライアント
              </TableHead>
              {months.map((m, i) => {
                const [year, month] = m.split('/');
                const prevYear = i > 0 ? months[i - 1].split('/')[0] : '';
                const showYear = year !== prevYear;
                return (
                  <TableHead
                    key={m}
                    className={cn(
                      "text-center w-[100px] min-w-[100px] whitespace-nowrap",
                      m === currentMonth && "bg-blue-50"
                    )}
                  >
                    {showYear && <div className="text-xs text-muted-foreground">{year}</div>}
                    {month}月
                  </TableHead>
                );
              })}
              <TableHead className="w-[60px]" />
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
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleCategory(category)}
                  >
                    <TableCell
                      className="sticky left-0 z-10 bg-background font-semibold"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: FORECAST_CATEGORY_COLORS[category] }}
                        />
                        <span>{isCollapsed ? '▶' : '▼'} {category}</span>
                        <span className="text-muted-foreground font-normal text-xs">
                          ({categoryRows.length}件)
                        </span>
                      </span>
                    </TableCell>
                    {months.map(month => (
                      <TableCell key={month} className="bg-background" />
                    ))}
                    <TableCell className="bg-background" />
                  </TableRow>

                  {/* クライアント行 */}
                  {!isCollapsed && categoryRows.map(({ vcName, months: monthData }) => (
                    <TableRow key={vcName}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {vcName}
                      </TableCell>
                      {months.map(month => {
                        const row = monthData[month];
                        const isAutoFilled = filledRowsData.virtualKeys.has(makeKey(vcName, month));
                        return (
                          <TableCell
                            key={month}
                            className={cn(
                              "p-0",
                              isAutoFilled && "bg-muted/20",
                              month === currentMonth && "bg-blue-50"
                            )}
                          >
                            <ForecastCell
                              value={row?.forecastCount ?? null}
                              type="number"
                              onChange={(val) => handleCellChange(vcName, month, val)}
                              placeholder="-"
                              className={`text-center ${isAutoFilled ? 'italic text-muted-foreground' : ''}`}
                            />
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            // そのVCの表示月分を全削除
                            for (const month of months) {
                              if (monthData[month]) {
                                handleDeleteRow(vcName, month);
                              }
                            }
                          }}
                        >
                          ×
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* 小計行 */}
                  {!isCollapsed && categoryRows.length > 0 && (
                    <TableRow className="bg-muted/30">
                      <TableCell className="sticky left-0 bg-muted/30 z-10 text-sm font-medium text-muted-foreground">
                        小計
                      </TableCell>
                      {months.map(month => (
                        <TableCell
                          key={month}
                          className={cn(
                            "text-center text-sm font-medium",
                            month === currentMonth && "bg-blue-50"
                          )}
                        >
                          {categorySubtotals[category]?.[month] || '-'}
                        </TableCell>
                      ))}
                      <TableCell />
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}

            {/* 合計行 */}
            <TableRow className="bg-muted/50 font-bold">
              <TableCell className="sticky left-0 bg-muted/50 z-10">
                合計
              </TableCell>
              {months.map(month => (
                <TableCell
                  key={month}
                  className={cn(
                    "text-center",
                    month === currentMonth && "bg-blue-50"
                  )}
                >
                  {grandTotals[month] || '-'}
                </TableCell>
              ))}
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
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
