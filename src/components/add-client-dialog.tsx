'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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

interface NewClientData {
  vcName: string;
  category: ForecastCategory;
  frequency: ForecastFrequency;
  intervalMonths: number | null;
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
  const [forecastCount, setForecastCount] = useState('');
  const [error, setError] = useState('');

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
    setForecastCount('');
    setError('');
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
    setError('');

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

    const trimmedName = vcName.trim();
    if (!trimmedName) {
      setError(mode === 'lookup' ? 'クライアントを選択してください' : 'クライアント名を入力してください');
      return;
    }

    if (existingVcNames.includes(trimmedName)) {
      setError('同名のクライアントが既に存在します');
      return;
    }

    const intMonths = intervalMonths ? Number(intervalMonths) : null;

    if (frequency === 'regular' && (intMonths === null || intMonths < 1 || intMonths > 12)) {
      setError('間隔は1〜12ヶ月の範囲で入力してください');
      return;
    }

    // 予定件数必須
    if (!forecastCount || forecastCount.trim() === '') {
      setError('予定件数を入力してください');
      return;
    }
    const fcNum = Number(forecastCount);
    if (isNaN(fcNum) || fcNum < 0) {
      setError('予定件数は0以上の数値を入力してください');
      return;
    }

    onAdd({
      vcName: trimmedName,
      category,
      frequency,
      intervalMonths: frequency === 'regular' ? intMonths : null,
      deadlineDay: null,
      assignDeadlineDay: null,
      forecastCount: fcNum,
    });

    handleOpenChange(false);
  }, [vcName, mode, category, frequency, intervalMonths, forecastCount, existingVcNames, onAdd, handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>クライアント追加</DialogTitle>
          <DialogDescription>
            予測データに追加するクライアントを選択します
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* モード切替 */}
            <div className="flex gap-2 mb-2">
              <Button
                type="button"
                variant={mode === 'lookup' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setMode('lookup'); setVcName(''); setError(''); }}
              >
                既存クライアント
              </Button>
              <Button
                type="button"
                variant={mode === 'new' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setMode('new'); setVcName(''); setError(''); }}
              >
                新規登録
              </Button>
            </div>

            {/* クライアント名 */}
            {mode === 'lookup' ? (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">
                  クライアント <span className="text-destructive">*</span>
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
                <Label htmlFor="vcName" className="text-right">
                  クライアント名 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="vcName"
                  value={vcName}
                  onChange={(e) => { setVcName(e.target.value); setError(''); }}
                  className="col-span-3"
                  placeholder="新規クライアント名を入力"
                  autoFocus
                />
              </div>
            )}

            {/* カテゴリ */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                カテゴリ <span className="text-destructive">*</span>
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
              <Label htmlFor="frequency" className="text-right">
                頻度 <span className="text-destructive">*</span>
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
                <Label className="text-right">
                  間隔（月数） <span className="text-destructive">*</span>
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

            {/* 予定件数 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="forecastCount" className="text-right">
                予定件数 <span className="text-destructive">*</span>
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

            {/* エラー */}
            {error && (
              <p className="text-sm text-destructive text-center">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit">追加</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
