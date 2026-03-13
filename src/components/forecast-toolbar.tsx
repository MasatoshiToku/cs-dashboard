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
      {hasUnsavedChanges && (
        <div className="animate-fade-in-up flex items-center justify-between rounded-xl border border-amber-200/50 bg-amber-50/50 px-5 py-3">
          <div className="flex items-center gap-3 text-[13px] font-medium text-amber-700">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            未保存の変更
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onDiscard} disabled={isSaving}
              className="h-7 rounded-lg text-[12px] text-amber-600 hover:text-amber-800 hover:bg-amber-100/50">
              破棄
            </Button>
            <Button size="sm" onClick={onSave} disabled={isSaving}
              className="h-7 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[12px] shadow-sm">
              {isSaving ? (
                <span className="flex items-center gap-1.5">
                  <span className="animate-spin h-3 w-3 border-[1.5px] border-white border-t-transparent rounded-full" />
                  保存中
                </span>
              ) : '保存'}
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <Select
          value={selectedCategory}
          onValueChange={(v) => onCategoryChange(v as ForecastCategory | 'all')}
        >
          <SelectTrigger className="w-[180px] h-8 rounded-lg border-gray-200 bg-white text-[12px] shadow-sm">
            <SelectValue placeholder="カテゴリ" />
          </SelectTrigger>
          <SelectContent className="rounded-lg text-[12px]">
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
          className="h-8 rounded-lg border-gray-200 text-[12px] shadow-sm hover:shadow hover:bg-white transition-all duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 text-gray-400"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          クライアント追加
        </Button>
      </div>
    </div>
  );
}
