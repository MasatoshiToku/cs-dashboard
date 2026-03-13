'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ForecastCategory } from '@/lib/types';
import { FORECAST_CATEGORIES, FORECAST_CATEGORY_COLORS } from '@/lib/constants';

interface ForecastToolbarProps {
  // フィルタ
  selectedCategory: ForecastCategory | 'all';
  onCategoryChange: (category: ForecastCategory | 'all') => void;

  // 月ナビゲーション
  displayStartMonth: string;  // "2025/04" 形式
  onNavigateMonths: (direction: 'prev' | 'next') => void;
  monthRange: string;  // "2025/04 - 2026/03" 表示用

  // 保存
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;

  // 追加
  onAddClient: () => void;
}

export function ForecastToolbar({
  selectedCategory,
  onCategoryChange,
  onNavigateMonths,
  monthRange,
  hasUnsavedChanges,
  isSaving,
  onSave,
  onDiscard,
  onAddClient,
}: ForecastToolbarProps) {
  return (
    <div className="space-y-3">
      {/* 未保存警告バナー */}
      {hasUnsavedChanges && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-md text-sm flex items-center justify-between">
          <span>未保存の変更があります</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDiscard}
              disabled={isSaving}
            >
              破棄
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  保存中...
                </span>
              ) : '保存'}
            </Button>
          </div>
        </div>
      )}

      {/* ツールバー本体 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* カテゴリフィルタ */}
          <Select
            value={selectedCategory}
            onValueChange={(v) => onCategoryChange(v as ForecastCategory | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="カテゴリ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべてのカテゴリ</SelectItem>
              {FORECAST_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: FORECAST_CATEGORY_COLORS[cat] }}
                    />
                    {cat}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* 月ナビゲーション */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateMonths('prev')}
            >
              ←
            </Button>
            <span className="text-sm text-muted-foreground min-w-[160px] text-center">
              {monthRange}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateMonths('next')}
            >
              →
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* クライアント追加ボタン */}
          <Button variant="outline" onClick={onAddClient}>
            + クライアント追加
          </Button>

          {/* 保存ボタン（未保存変更がない場合も表示、disabled） */}
          {!hasUnsavedChanges && (
            <Button size="sm" disabled>
              保存済み
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
