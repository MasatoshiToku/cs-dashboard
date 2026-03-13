'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ForecastCategory, ForecastFrequency, ForecastRowExtended } from '@/lib/types';
import { FORECAST_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface NewClientData {
  vcName: string;
  category: ForecastCategory;
  frequency: ForecastFrequency;
  intervalMonths: number | null;
  startMonth: string | null;
  deadlineDay: number | null;
  assignDeadlineDay: number | null;
  forecastCount: number;
}

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: NewClientData) => void;
  existingVcNames: string[];  // 重複チェック用（既にforecastに登録済み）
  knownVcNames: string[];  // ルックアップ候補（issues等から取得した全VC名）
  existingVcProfiles: Record<string, ForecastRowExtended>;  // 既存VCの設定値（自動入力用）
}

const FREQUENCY_OPTIONS: { value: ForecastFrequency; label: string }[] = [
  { value: 'one-time', label: 'スポット（単発）' },
  { value: 'regular', label: '定期' },
];

export function AddClientDialog({
  open,
  onOpenChange,
  onAdd,
  existingVcNames,
  knownVcNames,
  existingVcProfiles,
}: AddClientDialogProps) {
  const [mode, setMode] = useState<'lookup' | 'new'>('lookup');
  const [vcName, setVcName] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [category, setCategory] = useState<ForecastCategory>('新規VC');
  const [frequency, setFrequency] = useState<ForecastFrequency>('regular');
  const [intervalMonths, setIntervalMonths] = useState('1');
  const [startMonth, setStartMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [forecastCount, setForecastCount] = useState('');

  // ルックアップ候補: まだforecastに未登録のVC名のみ表示
  const availableVcNames = useMemo(() => {
    return knownVcNames.filter(name => !existingVcNames.includes(name));
  }, [knownVcNames, existingVcNames]);

  const resetForm = useCallback(() => {
    setMode('lookup');
    setVcName('');
    setPopoverOpen(false);
    setCategory('新規VC');
    setFrequency('regular');
    setIntervalMonths('1');
    setStartMonth(`${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}`);
    setForecastCount('');
  }, []);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  }, [onOpenChange, resetForm]);

  // ルックアップでVC選択時: プロファイル自動入力
  const handleSelectVc = useCallback((name: string) => {
    setVcName(name);
    setPopoverOpen(false);

    // 既存プロファイルがあれば自動入力
    const profile = existingVcProfiles[name];
    if (profile) {
      setCategory(profile.category);
      setFrequency(profile.frequency);
      setIntervalMonths(profile.intervalMonths ? String(profile.intervalMonths) : '');
    }
  }, [existingVcProfiles]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    const errors: string[] = [];

    const trimmedName = vcName.trim();
    if (!trimmedName) {
      errors.push('クライアント名');
    }

    if (existingVcNames.includes(trimmedName)) {
      alert('同名のクライアントが既に存在します');
      return;
    }

    if (frequency === 'regular') {
      if (!intervalMonths || intervalMonths.trim() === '') {
        errors.push('間隔（月数）');
      }
    }

    if (!forecastCount || forecastCount.trim() === '') {
      errors.push('予定件数');
    }

    if (errors.length > 0) {
      alert(`以下の項目を入力してください:\n${errors.map(e => `・${e}`).join('\n')}`);
      return;
    }

    // 数値バリデーション（空チェック通過後）
    if (frequency === 'regular') {
      const intMonths = Number(intervalMonths);
      if (isNaN(intMonths) || intMonths < 1 || intMonths > 12) {
        alert('間隔は1〜12ヶ月の範囲で入力してください');
        return;
      }
      if (!/^\d{4}\/\d{2}$/.test(startMonth)) {
        alert('初回年月はYYYY/MM形式で入力してください');
        return;
      }
    }

    const fcNum = Number(forecastCount);
    if (isNaN(fcNum) || fcNum < 0) {
      alert('予定件数は0以上の数値を入力してください');
      return;
    }

    onAdd({
      vcName: trimmedName,
      category,
      frequency,
      intervalMonths: frequency === 'regular' ? Number(intervalMonths) : null,
      startMonth: frequency === 'regular' ? startMonth : null,
      deadlineDay: null,
      assignDeadlineDay: null,
      forecastCount: fcNum,
    });

    handleOpenChange(false);
  }, [vcName, category, frequency, intervalMonths, startMonth, forecastCount, existingVcNames, onAdd, handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] rounded-2xl p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 bg-gradient-to-b from-gray-50/80 to-white border-b border-gray-100">
          <DialogTitle className="text-lg font-semibold text-gray-900">クライアント追加</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 mt-1">
            予測データに追加するクライアントを選択します
          </DialogDescription>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 space-y-5">
            {/* セグメントコントロール */}
            <div className="flex rounded-xl bg-gray-100/80 p-1 gap-1">
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  mode === 'lookup'
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
                onClick={() => { setMode('lookup'); setVcName(''); }}
              >
                既存クライアント
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  mode === 'new'
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                )}
                onClick={() => { setMode('new'); setVcName(''); }}
              >
                新規登録
              </button>
            </div>

            {/* クライアント名 */}
            {mode === 'lookup' ? (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  クライアント
                </Label>
                <div className="col-span-3">
                  <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={popoverOpen}
                        className="w-full justify-between font-normal"
                      >
                        {vcName || 'クライアントを検索...'}
                        <span className="ml-2 h-4 w-4 shrink-0 opacity-50">▼</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="検索..." />
                        <CommandList className="max-h-[200px] overflow-y-auto">
                          <CommandEmpty>見つかりません</CommandEmpty>
                          <CommandGroup>
                            {availableVcNames.map((name) => (
                              <CommandItem
                                key={name}
                                value={name}
                                onSelect={() => handleSelectVc(name)}
                              >
                                <span className={vcName === name ? 'font-semibold' : ''}>
                                  {name}
                                </span>
                                {existingVcProfiles[name] && (
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    {existingVcProfiles[name].category}
                                  </span>
                                )}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="vcName" className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  クライアント名
                </Label>
                <Input
                  id="vcName"
                  value={vcName}
                  onChange={(e) => setVcName(e.target.value)}
                  className="col-span-3"
                  placeholder="新規クライアント名を入力"
                  autoFocus
                />
              </div>
            )}

            {/* カテゴリ */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                カテゴリ
              </Label>
              <div className="col-span-3">
                <Select value={category} onValueChange={(v) => setCategory(v as ForecastCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORECAST_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 頻度 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="frequency" className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                頻度
              </Label>
              <div className="col-span-3">
                <Select value={frequency} onValueChange={(v) => setFrequency(v as ForecastFrequency)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 間隔（月数） - 定期の場合のみ表示 */}
            {frequency === 'regular' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                  間隔（月数）
                </Label>
                <Input
                  type="number"
                  value={intervalMonths}
                  onChange={(e) => setIntervalMonths(e.target.value)}
                  className="col-span-3"
                  placeholder="例: 1（毎月）, 3（四半期）, 12（年次）"
                  min={1}
                  max={12}
                />
              </div>
            )}

            {/* 初回年月 - 定期の場合のみ表示 */}
            {frequency === 'regular' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide">初回年月</Label>
                <Input
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="col-span-3"
                  placeholder="例: 2025/04"
                />
              </div>
            )}

            {/* 予定件数 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="forecastCount" className="text-right text-xs font-medium text-gray-500 uppercase tracking-wide">
                予定件数
              </Label>
              <Input
                id="forecastCount"
                type="number"
                value={forecastCount}
                onChange={(e) => setForecastCount(e.target.value)}
                className="col-span-3"
                placeholder="月あたりの予定件数"
                min={0}
              />
            </div>
          </div>
          <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} className="rounded-lg text-gray-500 hover:text-gray-700">
              キャンセル
            </Button>
            <Button type="submit" className="rounded-lg shadow-sm">
              追加
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
