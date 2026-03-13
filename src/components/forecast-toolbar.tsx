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
  hasUnsavedChanges,
  isSaving,
  onSave,
  onDiscard,
  onAddClient,
}: ForecastToolbarProps) {
  return (
    <div className="space-y-4">
      {/* 未保存警告バナー */}
      {hasUnsavedChanges && (
        <div className="animate-in flex items-center justify-between gap-4 rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50/90 via-amber-50/50 to-orange-50/30 px-5 py-3 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-3 text-sm font-medium text-amber-800">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200/60">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse" />
            </div>
            未保存の変更があります
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDiscard}
              disabled={isSaving}
              className="h-8 rounded-lg text-amber-700 hover:text-amber-900 hover:bg-amber-100/60"
            >
              破棄
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="h-8 rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                  保存中
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  保存
                </span>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ツールバー */}
      <div className="flex items-center justify-between">
        <Select
          value={selectedCategory}
          onValueChange={(v) => onCategoryChange(v as ForecastCategory | 'all')}
        >
          <SelectTrigger className="w-[200px] h-9 rounded-xl border-gray-200 bg-white shadow-sm text-sm">
            <SelectValue placeholder="カテゴリ" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">すべてのカテゴリ</SelectItem>
            {FORECAST_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                <span className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: FORECAST_CATEGORY_COLORS[cat] }} />
                  <span>{cat}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={onAddClient}
          className="h-9 rounded-xl border-gray-200 shadow-sm hover:shadow hover:bg-gray-50 transition-all duration-200 text-sm font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 text-gray-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          クライアント追加
        </Button>
      </div>
    </div>
  );
}
