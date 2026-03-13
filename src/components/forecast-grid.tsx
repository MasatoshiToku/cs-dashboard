'use client';

import React, { useReducer, useCallback, useMemo, useState } from 'react';
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
}

export function ForecastGrid({ initialForecasts, sheetId }: ForecastGridProps) {
  const initialState: GridState = {
    rows: initialForecasts,
    changes: new Map<string, Partial<ForecastRowExtended>>(),
    added: [],
    deletedKeys: new Set<string>(),
  };
  const [state, dispatch] = useReducer(gridReducer, initialState);

  const [selectedCategory, setSelectedCategory] = useState<ForecastCategory | 'all'>('all');
  const [monthOffset, setMonthOffset] = useState(0);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<ForecastCategory>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // --- 月の計算 ---
  const months = useMemo(() => {
    const today = new Date();
    const startMonth = today.getMonth() + monthOffset; // 0-indexed
    const startYear = today.getFullYear() + Math.floor(startMonth / 12);
    const adjustedMonth = ((startMonth % 12) + 12) % 12;

    const result: string[] = [];
    for (let i = 0; i < 12; i++) {
      const m = adjustedMonth + i;
      const y = startYear + Math.floor(m / 12);
      const mm = ((m % 12) + 12) % 12 + 1;
      result.push(`${y}/${String(mm).padStart(2, '0')}`);
    }
    return result;
  }, [monthOffset]);

  const monthRange = `${months[0]} - ${months[months.length - 1]}`;

  // --- 全行（元データ + 追加 - 削除） ---
  const allRows = useMemo(() => {
    const base = [...state.rows, ...state.added];
    return base.filter(r => !state.deletedKeys.has(makeKey(r.vcName, r.yearMonth)));
  }, [state.rows, state.added, state.deletedKeys]);

  // --- 繰り返しクライアントの月補完 ---
  const autoFilledKeys = useMemo(() => new Set<string>(), []);

  const filledRows = useMemo(() => {
    const filtered = allRows;

    // VC名ごとにグループ化して、frequencyを確認
    const vcMap = new Map<string, ForecastRowExtended[]>();
    for (const row of filtered) {
      const list = vcMap.get(row.vcName) ?? [];
      list.push(row);
      vcMap.set(row.vcName, list);
    }

    const result = [...filtered];
    autoFilledKeys.clear();

    for (const [vcName, rows] of Array.from(vcMap.entries())) {
      const template = rows[0]; // カテゴリ等の情報を引き継ぐ
      if (!template) continue;

      const existingMonths = new Set(rows.map(r => r.yearMonth));

      if (template.frequency === 'monthly') {
        // 表示中の全月に行を補完
        for (const month of months) {
          const key = makeKey(vcName, month);
          if (!existingMonths.has(month) && !state.deletedKeys.has(key)) {
            result.push({
              ...template,
              vcName,
              yearMonth: month,
              forecastCount: 0,
              notes: '',
            });
            autoFilledKeys.add(key);
          }
        }
      } else if (template.frequency === 'quarterly') {
        // 四半期月（1,4,7,10月）のみ補完
        for (const month of months) {
          const monthNum = parseInt(month.split('/')[1], 10);
          const key = makeKey(vcName, month);
          if ([1, 4, 7, 10].includes(monthNum) && !existingMonths.has(month) && !state.deletedKeys.has(key)) {
            result.push({
              ...template,
              vcName,
              yearMonth: month,
              forecastCount: 0,
              notes: '',
            });
            autoFilledKeys.add(key);
          }
        }
      }
      // 'one-time' は補完なし
    }

    return result;
  }, [allRows, state.deletedKeys, months, autoFilledKeys]);

  // 変更適用済みの行
  const effectiveRows = useMemo(() => {
    return filledRows.map(row => {
      const key = makeKey(row.vcName, row.yearMonth);
      const changes = state.changes.get(key);
      if (changes) {
        return { ...row, ...changes } as ForecastRowExtended;
      }
      return row;
    });
  }, [filledRows, state.changes]);

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
    // 自動補完行を編集した場合、added に追加して保存対象にする
    if (autoFilledKeys.has(key)) {
      // filledRows からテンプレート行を取得
      const templateRow = filledRows.find(r => r.vcName === vcName && r.yearMonth === yearMonth);
      if (templateRow) {
        dispatch({
          type: 'ADD_CLIENT',
          rows: [{
            ...templateRow,
            forecastCount: typeof value === 'number' ? value : 0,
          }],
        });
        autoFilledKeys.delete(key); // added に移動したので autoFilled ではなくなる
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
  }, [autoFilledKeys, filledRows]);

  const handleDeleteRow = useCallback((vcName: string, yearMonth: string) => {
    dispatch({ type: 'DELETE_ROW', vcName, yearMonth });
  }, []);

  const handleAddClient = useCallback((data: { vcName: string; category: ForecastCategory; frequency: ForecastFrequency; deadlineDay: number | null; assignDeadlineDay: number | null }) => {
    // 表示中の全月分の行を追加
    const newRows: ForecastRowExtended[] = months.map(month => ({
      vcName: data.vcName,
      yearMonth: month,
      forecastCount: 0,
      notes: '',
      category: data.category,
      frequency: data.frequency,
      deadlineDay: data.deadlineDay,
      assignDeadlineDay: data.assignDeadlineDay,
    }));
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
            range: `forecasts!A${sheetRow}:H${sheetRow}`,
            values: [[
              row.vcName,
              row.yearMonth,
              row.forecastCount,
              row.notes ?? '',
              row.category,
              row.frequency,
              row.deadlineDay ?? '',
              row.assignDeadlineDay ?? '',
            ]],
          });
        }
      }

      // バッチ更新
      if (updates.length > 0) {
        const res = await fetch('/api/forecasts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update', data: { updates } }),
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
              values: [
                row.vcName,
                row.yearMonth,
                row.forecastCount,
                row.notes ?? '',
                row.category,
                row.frequency,
                row.deadlineDay ?? '',
                row.assignDeadlineDay ?? '',
              ],
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
        displayStartMonth={months[0]}
        onNavigateMonths={(dir) => setMonthOffset(prev => prev + (dir === 'prev' ? -3 : 3))}
        monthRange={monthRange}
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

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-background z-10 min-w-[180px]">
                クライアント
              </TableHead>
              {months.map(m => (
                <TableHead key={m} className="text-center min-w-[80px]">
                  {m.replace(/^\d{4}\//, '')}月
                </TableHead>
              ))}
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
                      colSpan={months.length + 2}
                      className="font-semibold"
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
                  </TableRow>

                  {/* クライアント行 */}
                  {!isCollapsed && categoryRows.map(({ vcName, months: monthData }) => (
                    <TableRow key={vcName}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {vcName}
                      </TableCell>
                      {months.map(month => {
                        const row = monthData[month];
                        const isAutoFilled = autoFilledKeys.has(makeKey(vcName, month));
                        return (
                          <TableCell key={month} className={`p-0 ${isAutoFilled ? 'bg-muted/20' : ''}`}>
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
                        <TableCell key={month} className="text-center text-sm font-medium">
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
                <TableCell key={month} className="text-center">
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
      />
    </div>
  );
}
