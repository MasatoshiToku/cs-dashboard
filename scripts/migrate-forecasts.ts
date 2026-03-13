/**
 * 既存 forecasts データに E-I 列のデフォルト値を追加するマイグレーションスクリプト
 *
 * 使い方:
 *   set -a && source /Users/tokumasatoshi/Documents/Cursor/ClaudeCode.env && set +a
 *   npx tsx scripts/migrate-forecasts.ts [--dry-run]
 *
 * --dry-run: 実際には書き込まず、変更内容のみ表示
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';

function cleanEnv(value: string | undefined): string {
  return (value || '').replace(/\\n$/g, '').trim();
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  console.log(`マイグレーション開始${isDryRun ? ' (DRY RUN)' : ''}`);

  // 環境変数チェック
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

  // 認証
  const auth = new GoogleAuth({
    credentials: {
      client_email: email,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sheetsClient = new sheets_v4.Sheets({ auth: auth as any });

  // 1. 現在のデータを取得（A-H列）
  const response = await sheetsClient.spreadsheets.values.get({
    spreadsheetId,
    range: 'forecasts!A2:I',
  });

  const rows = response.data.values ?? [];
  console.log(`既存行数: ${rows.length}`);

  if (rows.length === 0) {
    console.log('データがありません。マイグレーション不要。');
    return;
  }

  // 2. E-H 列にデフォルト値を設定（既に値がある場合はスキップ）
  let updatedCount = 0;
  const updatedRows: { row: number; before: string[]; after: string[] }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const hasCategory = row.length > 4 && row[4];
    const hasFrequency = row.length > 5 && row[5];
    const needsUpdate = !hasCategory || !hasFrequency;

    if (needsUpdate) {
      const before = [...row];

      // 配列を9要素に拡張（不足分は空文字で埋める）
      while (row.length < 9) {
        row.push('');
      }

      // デフォルト値を設定（既に値があればスキップ）
      if (!row[4]) row[4] = '新規VC';       // category
      if (!row[5]) row[5] = 'one-time';      // frequency
      // row[6]: deadlineDay - 空のまま（null扱い）
      // row[7]: assignDeadlineDay - 空のまま（null扱い）
      // row[8]: intervalMonths - 空のまま（null扱い）

      updatedRows.push({
        row: i + 2, // 1-indexed + ヘッダー行
        before,
        after: [...row],
      });
      updatedCount++;
    }
  }

  console.log(`更新対象行数: ${updatedCount} / ${rows.length}`);

  if (updatedCount === 0) {
    console.log('全行にE-H列が既に設定されています。マイグレーション不要。');
    return;
  }

  // 変更内容を表示
  for (const { row, before, after } of updatedRows.slice(0, 10)) {
    console.log(`  行${row}: [${before.join(', ')}] → [${after.join(', ')}]`);
  }
  if (updatedRows.length > 10) {
    console.log(`  ... 他 ${updatedRows.length - 10} 行`);
  }

  if (isDryRun) {
    console.log('\nDRY RUN 完了。--dry-run を外して再実行すると書き込みます。');
    return;
  }

  // 3. バッチ更新
  const data = updatedRows.map(({ row, after }) => ({
    range: `forecasts!A${row}:I${row}`,
    values: [after],
  }));

  await sheetsClient.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: {
      valueInputOption: 'RAW',
      data,
    },
  });

  console.log(`\nマイグレーション完了: ${updatedCount} 行を更新しました`);
}

main().catch((err: unknown) => {
  console.error('マイグレーションエラー:', err);
  process.exit(1);
});
