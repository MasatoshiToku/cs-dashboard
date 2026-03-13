'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type CellType = 'text' | 'number' | 'select';

interface ForecastCellProps {
  value: string | number | null;
  type: CellType;
  options?: string[];  // select用の選択肢
  onChange: (value: string | number | null) => void;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
}

function ForecastCellInner({
  value,
  type,
  options,
  onChange,
  className = '',
  placeholder = '',
  readOnly = false,
}: ForecastCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value ?? ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // value が外部から変更された場合に追従
  useEffect(() => {
    if (!isEditing) {
      setEditValue(String(value ?? ''));
    }
  }, [value, isEditing]);

  const handleClick = useCallback(() => {
    if (!readOnly) {
      setIsEditing(true);
    }
  }, [readOnly]);

  const commitEdit = useCallback(() => {
    setIsEditing(false);
    const trimmed = editValue.trim();

    if (type === 'number') {
      if (trimmed === '') {
        onChange(null);
      } else {
        const num = Number(trimmed);
        if (!isNaN(num)) {
          onChange(num);
        }
        // NaN の場合は元の値に戻す
      }
    } else {
      onChange(trimmed || null);
    }
  }, [editValue, type, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      commitEdit();
    } else if (e.key === 'Escape') {
      setEditValue(String(value ?? ''));
      setIsEditing(false);
    } else if (e.key === 'Tab') {
      commitEdit();
      // Tab のデフォルト動作（次のフォーカス移動）は維持
    }
  }, [commitEdit, value]);

  const handleSelectChange = useCallback((newValue: string) => {
    onChange(newValue);
    setIsEditing(false);
  }, [onChange]);

  // 表示用のフォーマット
  const displayValue = value !== null && value !== undefined && value !== ''
    ? String(value)
    : placeholder;

  const isPlaceholder = value === null || value === undefined || value === '';

  if (readOnly) {
    return (
      <div className={cn("px-2 py-1.5 text-[12px] tabular-nums select-none", className)}>
        <span className={cn(isPlaceholder ? "text-gray-300" : "text-gray-700")}>{displayValue}</span>
      </div>
    );
  }

  if (isEditing && type === 'select' && options) {
    return (
      <div className={cn("px-1 py-0.5", className)}>
        <Select value={String(value ?? '')} onValueChange={handleSelectChange}>
          <SelectTrigger className="h-7 text-[12px] ring-2 ring-blue-200 border-blue-200">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={cn("px-0.5 py-0.5", className)}>
        <Input
          ref={inputRef}
          type={type === 'number' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="h-7 text-[12px] text-center tabular-nums border-blue-200 ring-2 ring-blue-100 bg-white rounded-md"
          min={type === 'number' ? 0 : undefined}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "px-2 py-1.5 text-[12px] cursor-pointer rounded transition-all duration-100 tabular-nums text-center",
        "hover:ring-1 hover:ring-gray-300/50",
        className
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      <span className={cn(
        isPlaceholder && "text-gray-300",
        !isPlaceholder && value === 0 && "text-gray-300",
        !isPlaceholder && typeof value === 'number' && value > 0 && "text-gray-700"
      )}>
        {displayValue}
      </span>
    </div>
  );
}

export const ForecastCell = React.memo(ForecastCellInner);
