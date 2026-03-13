import { sheets_v4 } from '@googleapis/sheets';
import { getWriteAuth } from './sheets-client';

async function getWriteSheetsClient(): Promise<sheets_v4.Sheets> {
  const auth = getWriteAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new sheets_v4.Sheets({ auth: auth as any });
}

const RETRY_DELAYS = [500, 1000, 2000];

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      const status = (error as { code?: number }).code;
      if ((status === 500 || status === 503) && attempt < RETRY_DELAYS.length) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

/** Batch update existing rows in the forecasts sheet. */
export async function batchUpdateForecasts(
  spreadsheetId: string,
  updates: { range: string; values: (string | number | null)[][] }[]
): Promise<void> {
  const client = await getWriteSheetsClient();
  await withRetry(() =>
    client.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption: 'RAW',
        data: updates.map(u => ({
          range: u.range,
          values: u.values,
        })),
      },
    })
  );
}

/** Append a new row to the forecasts sheet (A:H). */
export async function appendForecastRow(
  spreadsheetId: string,
  values: (string | number | null)[]
): Promise<void> {
  const client = await getWriteSheetsClient();
  await withRetry(() =>
    client.spreadsheets.values.append({
      spreadsheetId,
      range: 'forecasts!A:I',
      valueInputOption: 'RAW',
      requestBody: {
        values: [values],
      },
    })
  );
}

/** Delete specific rows from the forecasts sheet by 0-based row indices. */
export async function deleteForecastRows(
  spreadsheetId: string,
  sheetId: number,
  rowIndices: number[]
): Promise<void> {
  if (rowIndices.length === 0) return;

  const client = await getWriteSheetsClient();

  // Sort descending to prevent index shifting
  const sorted = [...rowIndices].sort((a, b) => b - a);

  const requests = sorted.map(rowIndex => ({
    deleteDimension: {
      range: {
        sheetId,
        dimension: 'ROWS' as const,
        startIndex: rowIndex,
        endIndex: rowIndex + 1,
      },
    },
  }));

  await withRetry(() =>
    client.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    })
  );
}
