import { sheets_v4 } from '@googleapis/sheets';
import { GoogleAuth } from 'google-auth-library';
import type { DashboardData, IssueRow, ForecastRowExtended, ForecastCategory, ForecastFrequency, MetaData } from './types';
import { ISSUES_HEADERS } from './constants';

/** Strip trailing whitespace and spurious literal \n from env var values. */
function cleanEnv(value: string | undefined): string {
  return (value || '').replace(/\\n$/g, '').trim();
}

function getCredentials() {
  const rawKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').trim();
  return {
    client_email: cleanEnv(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
    private_key: rawKey.replace(/\\n/g, '\n'),
  };
}

export function getReadAuth(): GoogleAuth {
  return new GoogleAuth({
    credentials: getCredentials(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
}

export function getWriteAuth(): GoogleAuth {
  return new GoogleAuth({
    credentials: getCredentials(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function getSheetsClient(auth: GoogleAuth): sheets_v4.Sheets {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new sheets_v4.Sheets({ auth: auth as any });
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const spreadsheetId = cleanEnv(process.env.GOOGLE_SPREADSHEET_ID);
  const auth = getReadAuth();
  const sheetsClient = getSheetsClient(auth);

  const response = await sheetsClient.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: ['issues!A2:V', 'forecasts!A2:I', '_META!A:B'],
  });

  const [issuesData, forecastsData, metaData] = response.data.valueRanges || [];

  const issues = parseIssues(issuesData?.values || []);
  const forecasts = parseForecasts(forecastsData?.values || []);
  const meta = parseMeta(metaData?.values || []);

  return { issues, forecasts, meta };
}

function parseIssues(rows: string[][]): IssueRow[] {
  return rows.map(row => {
    const obj: Record<string, string> = {};
    ISSUES_HEADERS.forEach((header, i) => {
      obj[header] = row[i] || '';
    });
    return obj as unknown as IssueRow;
  });
}

function parseForecasts(rows: string[][]): ForecastRowExtended[] {
  return rows.map(row => ({
    vcName: row[0] || '',
    yearMonth: row[1] || '',
    forecastCount: Number(row[2]) || 0,
    notes: row[3] || '',
    category: (row[4] as ForecastCategory) || '新規VC',
    frequency: (row[5] as ForecastFrequency) || 'one-time',
    deadlineDay: row[6] ? Number(row[6]) : null,
    assignDeadlineDay: row[7] ? Number(row[7]) : null,
    intervalMonths: row[8] ? Number(row[8]) : null,
  }));
}

function parseMeta(rows: string[][]): MetaData {
  const map: Record<string, string> = {};
  rows.forEach(row => {
    if (row[0]) map[row[0]] = row[1] || '';
  });
  return {
    lastSyncAt: map['last_sync_at'] || '',
    issueCount: Number(map['issue_count']) || 0,
    errorMessage: map['error_message'] || '',
  };
}
