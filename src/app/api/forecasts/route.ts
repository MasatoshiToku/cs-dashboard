import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { batchUpdateForecasts, appendForecastRow, deleteForecastRows } from '@/lib/sheets-writer';
import { cleanEnv } from '@/lib/sheets-client';
import { FORECAST_CATEGORIES } from '@/lib/constants';
import type { ForecastCategory, ForecastFrequency } from '@/lib/types';

const SPREADSHEET_ID = cleanEnv(process.env.GOOGLE_SPREADSHEET_ID);
const VALID_FREQUENCIES: ForecastFrequency[] = ['regular', 'one-time'];
const YEAR_MONTH_REGEX = /^\d{4}\/\d{2}$/;

function validateForecastData(data: Record<string, unknown>): string | null {
  if (data.yearMonth !== undefined) {
    if (typeof data.yearMonth !== 'string' || !YEAR_MONTH_REGEX.test(data.yearMonth)) {
      return 'yearMonth must be in YYYY/MM format';
    }
  }

  if (data.forecastCount !== undefined) {
    const count = Number(data.forecastCount);
    if (!Number.isInteger(count) || count < 0) {
      return 'forecastCount must be a non-negative integer';
    }
  }

  if (data.category !== undefined) {
    if (!FORECAST_CATEGORIES.includes(data.category as ForecastCategory)) {
      return `category must be one of: ${FORECAST_CATEGORIES.join(', ')}`;
    }
  }

  if (data.frequency !== undefined) {
    if (!VALID_FREQUENCIES.includes(data.frequency as ForecastFrequency)) {
      return `frequency must be one of: ${VALID_FREQUENCIES.join(', ')}`;
    }
  }

  if (data.deadlineDay !== undefined && data.deadlineDay !== null) {
    const day = Number(data.deadlineDay);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      return 'deadlineDay must be 1-31 or null';
    }
  }

  if (data.assignDeadlineDay !== undefined && data.assignDeadlineDay !== null) {
    const day = Number(data.assignDeadlineDay);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      return 'assignDeadlineDay must be 1-31 or null';
    }
  }

  if (data.intervalMonths !== undefined && data.intervalMonths !== null) {
    const interval = Number(data.intervalMonths);
    if (!Number.isInteger(interval) || interval < 1) {
      return 'intervalMonths must be a positive integer or null';
    }
  }

  // frequency が 'regular' の場合、intervalMonths は必須
  if (data.frequency === 'regular' && (data.intervalMonths === undefined || data.intervalMonths === null)) {
    return 'intervalMonths is required when frequency is regular';
  }

  if (data.startMonth !== undefined && data.startMonth !== null) {
    if (typeof data.startMonth !== 'string' || !/^\d{4}\/\d{2}$/.test(data.startMonth)) {
      return 'startMonth must be in YYYY/MM format';
    }
  }

  return null;
}

// POST: update or append forecast rows
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (action !== 'update' && action !== 'append') {
      return NextResponse.json(
        { error: 'action must be "update" or "append"' },
        { status: 400 }
      );
    }

    if (action === 'update') {
      if (!Array.isArray(data) || data.length === 0) {
        return NextResponse.json(
          { error: 'data must be a non-empty array for update action' },
          { status: 400 }
        );
      }

      const updates: { range: string; values: (string | number | null)[][] }[] = [];

      for (const item of data) {
        const validationError = validateForecastData(item);
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 });
        }

        if (!item.range || !item.values) {
          return NextResponse.json(
            { error: 'Each update item must have range and values' },
            { status: 400 }
          );
        }

        updates.push({ range: item.range, values: item.values });
      }

      await batchUpdateForecasts(SPREADSHEET_ID, updates);
    } else {
      // append
      const validationError = validateForecastData(data);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }

      const values = [
        data.vcName || '',
        data.yearMonth || '',
        data.forecastCount ?? 0,
        data.notes || '',
        data.category || '新規VC',
        data.frequency || 'one-time',
        data.deadlineDay ?? null,
        data.assignDeadlineDay ?? null,
        data.intervalMonths ?? null,
        data.startMonth ?? null,
      ];

      await appendForecastRow(SPREADSHEET_ID, values);
    }

    revalidatePath('/dashboard/forecast');
    revalidatePath('/dashboard/vc-progress');

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Forecast API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: delete forecast rows
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { rowIndices, sheetId } = body;

    if (!Array.isArray(rowIndices) || rowIndices.length === 0) {
      return NextResponse.json(
        { error: 'rowIndices must be a non-empty array' },
        { status: 400 }
      );
    }

    if (typeof sheetId !== 'number') {
      return NextResponse.json(
        { error: 'sheetId must be a number' },
        { status: 400 }
      );
    }

    for (const idx of rowIndices) {
      if (!Number.isInteger(idx) || idx < 0) {
        return NextResponse.json(
          { error: 'rowIndices must contain non-negative integers' },
          { status: 400 }
        );
      }
    }

    await deleteForecastRows(SPREADSHEET_ID, sheetId, rowIndices);

    revalidatePath('/dashboard/forecast');
    revalidatePath('/dashboard/vc-progress');

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Forecast DELETE API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
