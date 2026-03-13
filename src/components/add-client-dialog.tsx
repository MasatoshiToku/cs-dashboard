'use client';

import React, { useState, useCallback } from 'react';
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
import { ForecastCategory, ForecastFrequency } from '@/lib/types';
import { FORECAST_CATEGORIES } from '@/lib/constants';

interface NewClientData {
  vcName: string;
  category: ForecastCategory;
  frequency: ForecastFrequency;
  deadlineDay: number | null;
  assignDeadlineDay: number | null;
}

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (data: NewClientData) => void;
  existingVcNames: string[];  // 重複チェック用
}

const FREQUENCY_OPTIONS: { value: ForecastFrequency; label: string }[] = [
  { value: 'one-time', label: 'スポット（単発）' },
  { value: 'monthly', label: '月次（毎月自動生成）' },
  { value: 'quarterly', label: '四半期（3ヶ月毎に自動生成）' },
];

export function AddClientDialog({
  open,
  onOpenChange,
  onAdd,
  existingVcNames,
}: AddClientDialogProps) {
  const [vcName, setVcName] = useState('');
  const [category, setCategory] = useState<ForecastCategory>('新規VC');
  const [frequency, setFrequency] = useState<ForecastFrequency>('one-time');
  const [deadlineDay, setDeadlineDay] = useState('');
  const [assignDeadlineDay, setAssignDeadlineDay] = useState('');
  const [error, setError] = useState('');

  const resetForm = useCallback(() => {
    setVcName('');
    setCategory('新規VC');
    setFrequency('one-time');
    setDeadlineDay('');
    setAssignDeadlineDay('');
    setError('');
  }, []);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  }, [onOpenChange, resetForm]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = vcName.trim();
    if (!trimmedName) {
      setError('クライアント名を入力してください');
      return;
    }

    if (existingVcNames.includes(trimmedName)) {
      setError('同名のクライアントが既に存在します');
      return;
    }

    const dlDay = deadlineDay ? Number(deadlineDay) : null;
    const asDlDay = assignDeadlineDay ? Number(assignDeadlineDay) : null;

    if (dlDay !== null && (dlDay < 1 || dlDay > 31)) {
      setError('期日は1-31の範囲で入力してください');
      return;
    }
    if (asDlDay !== null && (asDlDay < 1 || asDlDay > 31)) {
      setError('アサイン期日は1-31の範囲で入力してください');
      return;
    }

    onAdd({
      vcName: trimmedName,
      category,
      frequency,
      deadlineDay: dlDay,
      assignDeadlineDay: asDlDay,
    });

    handleOpenChange(false);
  }, [vcName, category, frequency, deadlineDay, assignDeadlineDay, existingVcNames, onAdd, handleOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>クライアント追加</DialogTitle>
          <DialogDescription>
            新しいクライアントの予測データを追加します
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* クライアント名 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="vcName" className="text-right">
                クライアント名
              </Label>
              <Input
                id="vcName"
                value={vcName}
                onChange={(e) => { setVcName(e.target.value); setError(''); }}
                className="col-span-3"
                placeholder="例: UTEC"
                autoFocus
              />
            </div>

            {/* カテゴリ */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
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
              <Label htmlFor="frequency" className="text-right">
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

            {/* 期日 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="deadlineDay" className="text-right">
                期日(日)
              </Label>
              <Input
                id="deadlineDay"
                type="number"
                value={deadlineDay}
                onChange={(e) => setDeadlineDay(e.target.value)}
                className="col-span-3"
                placeholder="例: 15"
                min={1}
                max={31}
              />
            </div>

            {/* アサイン期日 */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="assignDeadlineDay" className="text-right">
                アサイン期日(日)
              </Label>
              <Input
                id="assignDeadlineDay"
                type="number"
                value={assignDeadlineDay}
                onChange={(e) => setAssignDeadlineDay(e.target.value)}
                className="col-span-3"
                placeholder="例: 10"
                min={1}
                max={31}
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
