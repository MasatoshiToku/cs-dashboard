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
    <div className="space-y-3">
      {/* 未保存警告バナー — アニメーション付き */}
      {hasUnsavedChanges && (
        <div className="animate-in slide-in-from-top-2 duration-300 flex items-center justify-between gap-4 rounded-lg border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            未保存の変更があります
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDiscard}
              disabled={isSaving}
              className="text-amber-700 hover:text-amber-900 hover:bg-amber-100/50 h-8"
            >
              破棄
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={isSaving}
              className="bg-amber-600 hover:bg-amber-700 text-white h-8 shadow-sm"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                  保存中...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  変更を保存
                </span>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ツールバー本体 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* カテゴリフィルタ */}
          <Select
            value={selectedCategory}
            onValueChange={(v) => onCategoryChange(v as ForecastCategory | 'all')}
          >
            <SelectTrigger className="w-[200px] h-9 rounded-lg border-muted-foreground/20 bg-white shadow-sm">
              <SelectValue placeholder="カテゴリ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべてのカテゴリ</SelectItem>
              {FORECAST_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: FORECAST_CATEGORY_COLORS[cat] }}
                    />
                    {cat}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {/* クライアント追加ボタン */}
          <Button
            variant="outline"
            onClick={onAddClient}
            className="h-9 rounded-lg shadow-sm hover:shadow transition-shadow"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            クライアント追加
          </Button>
        </div>
      </div>
    </div>
  );
}
