/**
 * Test script: Google Sheets Service Account write permission
 *
 * Appends a test row to the "forecasts" sheet, then deletes it.
 * Uses readwrite scope (https://www.googleapis.com/auth/spreadsheets).
 *
 * Usage:
 *   npx tsx scripts/test-sa-write.ts
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';

function cleanEnv(value: string | undefined): string {
  return (value || '').replace(/\\n$/g, '').trim();
}

async function main() {
  const email = cleanEnv(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  const rawKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').trim();
  const privateKey = rawKey.replace(/\\n/g, '\n');
  const spreadsheetId = cleanEnv(process.env.GOOGLE_SPREADSHEET_ID);

  if (!email || !privateKey || !spreadsheetId) {
    console.error('ERROR: Missing required env vars.');
    console.error(`  GOOGLE_SERVICE_ACCOUNT_EMAIL: ${email ? 'SET' : 'MISSING'}`);
    console.error(`  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: ${privateKey ? 'SET' : 'MISSING'}`);
    console.error(`  GOOGLE_SPREADSHEET_ID: ${spreadsheetId ? 'SET' : 'MISSING'}`);
    process.exit(1);
  }

  console.log(`Service Account: ${email}`);
  console.log(`Spreadsheet ID: ${spreadsheetId}`);
  console.log('Scope: https://www.googleapis.com/auth/spreadsheets (readwrite)');
  console.log('');

  const auth = new GoogleAuth({
    credentials: {
      client_email: email,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sheetsClient = new sheets_v4.Sheets({ auth: auth as any });
  const sheetName = 'forecasts';
  const testRow = ['TEST_VC', '2099/01', '0', 'SA write test'];

  // Step 1: Append test row
  console.log(`[1/3] Appending test row to "${sheetName}" sheet...`);
  try {
    const appendRes = await sheetsClient.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A:D`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [testRow],
      },
    });

    const updatedRange = appendRes.data.updates?.updatedRange || '';
    console.log(`  SUCCESS: Row appended at ${updatedRange}`);

    // Step 2: Verify the row was written
    console.log('[2/3] Verifying written data...');
    const readRes = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: updatedRange,
    });
    const writtenValues = readRes.data.values?.[0] || [];
    console.log(`  Read back: ${JSON.stringify(writtenValues)}`);

    const match = writtenValues.every((v, i) => v === testRow[i]);
    if (match) {
      console.log('  VERIFIED: Written data matches expected values.');
    } else {
      console.warn('  WARNING: Written data does not match expected values.');
    }

    // Step 3: Delete the test row
    console.log('[3/3] Deleting test row...');
    // Extract row number from range like "forecasts!A5:D5"
    const rowMatch = updatedRange.match(/(\d+)/);
    if (!rowMatch) {
      console.error('  ERROR: Could not parse row number from updated range.');
      process.exit(1);
    }
    const rowNumber = parseInt(rowMatch[0], 10);

    // Get sheet ID (gid) for the forecasts sheet
    const sheetMeta = await sheetsClient.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties',
    });
    const forecastSheet = sheetMeta.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    );
    const sheetId = forecastSheet?.properties?.sheetId;

    if (sheetId === undefined) {
      console.error(`  ERROR: Could not find sheet ID for "${sheetName}".`);
      process.exit(1);
    }

    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowNumber - 1, // 0-based
                endIndex: rowNumber,
              },
            },
          },
        ],
      },
    });
    console.log(`  SUCCESS: Row ${rowNumber} deleted.`);

    console.log('');
    console.log('=== TEST PASSED: Service Account has write permission ===');
  } catch (err: unknown) {
    console.error('');
    console.error('=== TEST FAILED ===');
    if (err instanceof Error) {
      console.error(`Error: ${err.message}`);
      if ('response' in err) {
        const resp = (err as { response?: { data?: unknown } }).response;
        console.error('Response data:', JSON.stringify(resp?.data, null, 2));
      }
    } else {
      console.error(err);
    }
    process.exit(1);
  }
}

main();
