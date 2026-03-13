/**
 * 参照スプレッドシート「入力先管理」からデータを読み取り、
 * cs-dashboard の forecasts シートにバッチ書き込みするスクリプト
 *
 * 使い方:
 *   cd /Users/tokumasatoshi/Documents/Cursor/cs-dashboard
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/import-forecasts.ts [--dry-run]
 *
 * --dry-run: 実際には書き込まず、変換結果のみ表示
 */

import { GoogleAuth } from 'google-auth-library';
import { sheets_v4 } from '@googleapis/sheets';
import * as fs from 'fs';

// ==================== 定数 ====================

const CSV_FILE = '/tmp/ref_sheet_rows.jsonl';

/** 年月ヘッダーの開始列インデックス（0-based） */
const MONTH_COL_START = 7;

/** カテゴリマッピング: 参照スプレッドシートの列A値 → forecasts のカテゴリ */
type ForecastCategory =
  | '新規VC'
  | 'SU'
  | '継続月次'
  | '継続四半期'
  | 'データマネジメント'
  | 'トランザクション'
  | 'LP投資管理';

// ==================== CSV パーサー ====================

/**
 * 簡易CSVパーサー（クオート内改行対応）
 * gviz CSV は RFC4180 準拠
 */
function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

// ==================== データ構造 ====================

interface RawRow {
  lineNumber: number;
  categoryHint: string;  // 列A
  vcName: string;        // 列B
  details: string;       // 列C
  deadline: string;      // 列D
  assignDeadline: string; // 列E
  totalCount: string;    // 列F
  monthlyValues: string[]; // 列H以降の月別数値
}

interface ForecastEntry {
  vcName: string;
  yearMonth: string;
  forecastCount: number;
  notes: string;
  category: ForecastCategory;
  frequency: 'regular' | 'one-time';
  deadlineDay: string;
  assignDeadlineDay: string;
  intervalMonths: string;
  startMonth: string;
}

// ==================== カテゴリ判定 ====================

/**
 * 行のカテゴリを判定する
 * 参照スプレッドシートの構造に基づく
 */
function determineCategory(
  row: RawRow,
  currentSection: string,
): ForecastCategory {
  const hint = row.categoryHint.trim();

  // セクションヘッダーの明示的なカテゴリ
  if (hint.includes('新規') || hint.includes('初回')) return '新規VC';
  if (hint === 'SU' || hint.includes('SU入力')) return 'SU';
  if (hint.includes('データマネジメント')) return 'データマネジメント';
  if (hint.includes('エンタープライズ')) return 'データマネジメント';
  if (hint.includes('トランザクション')) return 'トランザクション';
  if (hint.includes('LP')) return 'LP投資管理';

  // 継続の種類
  if (hint.includes('継続：毎月') || hint.includes('アサイン日ベース') || hint.includes('グレー')) return '継続月次';
  if (hint.includes('継続：四半期')) return '継続四半期';
  if (hint.includes('黄色') || hint.includes('完全予測')) return '継続月次';

  // セクションコンテキストからの判定
  if (currentSection === '新規VC') return '新規VC';
  if (currentSection === 'SU') return 'SU';
  if (currentSection === '継続月次') return '継続月次';
  if (currentSection === '継続四半期') return '継続四半期';
  if (currentSection === 'データマネジメント') return 'データマネジメント';
  if (currentSection === 'トランザクション') return 'トランザクション';
  if (currentSection === 'LP投資管理') return 'LP投資管理';

  return '新規VC'; // デフォルト
}

/**
 * 頻度を判定する
 */
function determineFrequency(
  category: ForecastCategory,
  row: RawRow,
): 'regular' | 'one-time' {
  // 新規VCは基本的にone-time
  if (category === '新規VC') return 'one-time';
  // 継続・DM・トランザクション・LPは regular
  return 'regular';
}

// ==================== メイン処理 ====================

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`=== forecasts インポート開始${isDryRun ? ' (DRY RUN)' : ''} ===`);

  // 1. CSVファイルを読み込み
  if (!fs.existsSync(CSV_FILE)) {
    console.error(`ERROR: CSV ファイルが見つかりません: ${CSV_FILE}`);
    console.error('先にブラウザ経由でデータを取得してください。');
    process.exit(1);
  }

  const rawLines = fs.readFileSync(CSV_FILE, 'utf8').split('\n');
  console.log(`CSV 行数: ${rawLines.length}`);

  // 2. ヘッダー行の解析
  const headerRow = parseCSVRow(rawLines[0]);
  const monthHeaders: string[] = [];
  for (let i = MONTH_COL_START; i < headerRow.length; i++) {
    const month = headerRow[i].trim();
    if (month && /^\d{4}\/\d{1,2}$/.test(month)) {
      // YYYY/M → YYYY/MM に正規化
      const parts = month.split('/');
      const normalized = `${parts[0]}/${parts[1].padStart(2, '0')}`;
      monthHeaders.push(normalized);
    } else {
      monthHeaders.push(''); // 空列
    }
  }
  console.log(`年月ヘッダー: ${monthHeaders.filter(m => m).length}個`);
  console.log(`  最初: ${monthHeaders.find(m => m)}`);
  console.log(`  最後: ${[...monthHeaders].reverse().find(m => m)}`);

  // 3. データ行の解析
  const entries: ForecastEntry[] = [];
  let currentSection = '新規VC';
  const skipPatterns = ['合計', 'VC合計', 'SU', 'VC＋SU合計', 'OP＋DM合計',
    '継続合計', '新規合計', 'LP総計', 'LP継続入力', 'LPトランザクション除く'];
  const sectionEndPatterns = ['合計', '全合計'];

  // 行解析中のマルチライン処理
  // gviz CSVはクオート内改行を含むため、行結合が必要
  const mergedLines: string[] = [];
  let buffer = '';
  for (const line of rawLines) {
    buffer += (buffer ? '\n' : '') + line;
    // クオートの開閉が一致しているか確認
    const quoteCount = (buffer.match(/"/g) || []).length;
    if (quoteCount % 2 === 0) {
      mergedLines.push(buffer);
      buffer = '';
    }
  }
  if (buffer) mergedLines.push(buffer);

  console.log(`マージ後行数: ${mergedLines.length}`);

  for (let lineIdx = 1; lineIdx < mergedLines.length; lineIdx++) {
    const line = mergedLines[lineIdx].trim();
    if (!line) continue;

    const cols = parseCSVRow(line);
    const colA = (cols[0] || '').trim();
    const colB = (cols[1] || '').trim();
    const colF = (cols[5] || '').trim();

    // セクション判定
    if (colA.includes('新規') || colA.includes('初回')) currentSection = '新規VC';
    else if (colA === 'SU' || colA.includes('SU入力')) currentSection = 'SU';
    else if (colA.includes('継続：毎月') || colA.includes('アサイン日ベース')) currentSection = '継続月次';
    else if (colA.includes('グレー')) currentSection = '継続月次';
    else if (colA.includes('黄色') || colA.includes('完全予測')) currentSection = '継続月次';
    else if (colA.includes('データマネジメント')) currentSection = 'データマネジメント';
    else if (colA.includes('エンタープライズ')) currentSection = 'データマネジメント';
    else if (colA.includes('継続：四半期')) currentSection = '継続四半期';
    else if (colA.includes('トランザクション')) currentSection = 'トランザクション';
    else if (colA.includes('LP')) currentSection = 'LP投資管理';

    // スキップ行の判定
    // 合計行をスキップ
    if (colA === '合計' || colA === 'VC合計' || colA === 'VC＋SU合計' ||
        colA === 'OP＋DM合計' || colA === '継続合計' || colA === '新規合計' ||
        colA === 'LP総計' || colA === 'LPトランザクション除く' ||
        colA === '入力代行予定件数' || colA === 'CS全体' || colA === '未来の予測値' ||
        colA === '足りない場合に何名採用が必要か' || colA === '月末に実績' ||
        colA === '週ごとの予測件数') continue;

    // colB が合計行のテキストの場合スキップ
    if (colB === '' && colA === '') continue;
    if (colB.includes('合計') || colB.includes('全合計') || colB.includes('1人件数') ||
        colB.includes('稼働人数') || colB.includes('稼働予測時間') || colB.includes('入力代行') ||
        colB.includes('余剰') || colB.includes('予測入力時間') || colB.includes('#REF!')) continue;

    // ヘッダー行（LP継続入力セクション等）のスキップ
    if (colA === 'LP継続入力' || colA === 'LP新規入力') {
      currentSection = 'LP投資管理';
      if (colB === '決算月' || !colB) continue;
    }
    if (colA === 'ファンド数') {
      currentSection = 'LP投資管理';
      // ファンド数行はVC名が入っている場合データあり、空ならスキップ
      if (!colB) continue;
    }

    // 集計・工数行のスキップ（行155以降のパターン）
    if (colB.includes('件数）') || colB.includes('時間') || colB.includes('入力にかかる') ||
        colB.includes('WC') || colA.includes('時間') || colA.includes('733') ||
        colA.includes('384')) continue;

    // VCプロプランやトランザクションのビークル単位行（ヘッダー的な行）
    if (colA === 'ビークル単位' && !colB) continue;

    // VC名が空の行はスキップ
    if (!colB) continue;

    // VC名のクリーニング
    let vcName = colB
      .replace(/（[^）]*）/g, '') // 全角括弧内のアサイン担当者名を除去
      .replace(/\([^)]*\)/g, '')  // 半角括弧内も除去
      .replace(/（[^）]*$/g, '')  // 閉じ括弧がない全角括弧を除去（例: "SGインキュベート（"）
      .replace(/\([^)]*$/g, '')   // 閉じ括弧がない半角括弧を除去
      .replace(/\s+/g, '')        // 空白除去
      .trim();

    // VC名がまだ空ならスキップ
    if (!vcName) continue;

    const rawRow: RawRow = {
      lineNumber: lineIdx,
      categoryHint: colA,
      vcName: colB,
      details: cols[2] || '',
      deadline: cols[3] || '',
      assignDeadline: cols[4] || '',
      totalCount: colF,
      monthlyValues: cols.slice(MONTH_COL_START),
    };

    const category = determineCategory(rawRow, currentSection);
    const frequency = determineFrequency(category, rawRow);

    // 月別データを処理
    for (let monthIdx = 0; monthIdx < monthHeaders.length; monthIdx++) {
      const yearMonth = monthHeaders[monthIdx];
      if (!yearMonth) continue;

      const rawValue = rawRow.monthlyValues[monthIdx]?.trim() || '';

      // 数値変換
      let forecastCount: number;
      if (!rawValue || rawValue === '') {
        forecastCount = 0; // 空は0件として扱う（0件の月もデータとして入力）
      } else {
        // 「件」「ｈ」等の単位を除去
        const numStr = rawValue.replace(/[件ｈh時間]/g, '').replace(/,/g, '').trim();
        forecastCount = Number(numStr);
        if (isNaN(forecastCount)) {
          forecastCount = 0;
        }
      }

      entries.push({
        vcName,
        yearMonth,
        forecastCount,
        notes: '',
        category,
        frequency,
        deadlineDay: '',
        assignDeadlineDay: '',
        intervalMonths: frequency === 'regular' ? '1' : '',
        startMonth: '',
      });
    }
  }

  console.log(`\n変換結果: ${entries.length}行`);

  // 重複チェック: 同じ vcName + yearMonth のエントリが複数ある場合
  const dupCheck = new Map<string, ForecastEntry[]>();
  for (const entry of entries) {
    const key = `${entry.vcName}|${entry.yearMonth}`;
    if (!dupCheck.has(key)) dupCheck.set(key, []);
    dupCheck.get(key)!.push(entry);
  }
  const dups = Array.from(dupCheck.entries()).filter(([, v]) => v.length > 1);
  if (dups.length > 0) {
    console.log(`\n重複エントリ: ${dups.length}件（同じVC+年月）`);
    // 重複がある場合は合計する（同じVCが異なるセクションに出現する場合）
    // ただしカテゴリが異なる場合はそのまま残す（別カテゴリの作業）
    for (const [key, items] of dups) {
      const categories = Array.from(new Set(items.map((i: ForecastEntry) => i.category)));
      if (categories.length === 1) {
        // 同じカテゴリの重複 → 合計に統合
        console.log(`  ${key}: ${items.length}件 (同カテゴリ: ${categories[0]}) → 合計`);
      }
    }
  }

  // 重複統合（同じ vcName + yearMonth + category は forecastCount を合算）
  const mergedMap = new Map<string, ForecastEntry>();
  for (const entry of entries) {
    const key = `${entry.vcName}|${entry.yearMonth}|${entry.category}`;
    if (mergedMap.has(key)) {
      mergedMap.get(key)!.forecastCount += entry.forecastCount;
    } else {
      mergedMap.set(key, { ...entry });
    }
  }
  const mergedEntries = Array.from(mergedMap.values());
  console.log(`統合後: ${mergedEntries.length}行`);

  // 0件の月を除外する（0件だらけでデータが膨大になるため）
  const nonZeroEntries = mergedEntries.filter(e => e.forecastCount > 0);
  console.log(`0件除外後: ${nonZeroEntries.length}行`);

  // カテゴリ別の集計
  const categoryCounts = new Map<string, number>();
  for (const entry of nonZeroEntries) {
    categoryCounts.set(entry.category, (categoryCounts.get(entry.category) || 0) + 1);
  }
  console.log('\nカテゴリ別行数:');
  for (const [cat, count] of Array.from(categoryCounts.entries()).sort()) {
    console.log(`  ${cat}: ${count}行`);
  }

  // VC名別の集計
  const vcCounts = new Map<string, number>();
  for (const entry of nonZeroEntries) {
    vcCounts.set(entry.vcName, (vcCounts.get(entry.vcName) || 0) + 1);
  }
  console.log(`\nユニークVC数: ${vcCounts.size}`);

  // サンプルデータ表示
  console.log('\nサンプルデータ (最初の10行):');
  for (const entry of nonZeroEntries.slice(0, 10)) {
    console.log(`  ${entry.vcName} | ${entry.yearMonth} | ${entry.forecastCount} | ${entry.category} | ${entry.frequency}`);
  }

  if (isDryRun) {
    console.log('\n=== DRY RUN 完了 ===');
    return;
  }

  // 4. Sheets API で書き込み
  const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').replace(/\\n$/g, '').trim();
  const rawKey = (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').trim();
  const privateKey = rawKey.replace(/\\n/g, '\n');
  const spreadsheetId = (process.env.GOOGLE_SPREADSHEET_ID || '').replace(/\\n$/g, '').trim();

  if (!email || !privateKey || !spreadsheetId) {
    console.error('ERROR: Missing required env vars.');
    process.exit(1);
  }

  const auth = new GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sheetsClient = new sheets_v4.Sheets({ auth: auth as any });

  // 5. 既存データをクリア
  console.log('\n既存 forecasts データをクリア中...');
  await sheetsClient.spreadsheets.values.clear({
    spreadsheetId,
    range: 'forecasts!A2:J',
  });

  // 6. バッチ書き込み
  const rows = nonZeroEntries.map(entry => [
    entry.vcName,
    entry.yearMonth,
    entry.forecastCount,
    entry.notes,
    entry.category,
    entry.frequency,
    entry.deadlineDay,
    entry.assignDeadlineDay,
    entry.intervalMonths,
    entry.startMonth,
  ]);

  console.log(`${rows.length}行を書き込み中...`);

  // Google Sheets API のバッチ更新制限を考慮して分割
  const BATCH_SIZE = 1000;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const startRow = i + 2; // ヘッダー行の次から
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: `forecasts!A${startRow}:J${startRow + batch.length - 1}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: batch,
      },
    });
    console.log(`  バッチ ${Math.floor(i / BATCH_SIZE) + 1}: 行 ${startRow}-${startRow + batch.length - 1}`);
  }

  console.log(`\n=== インポート完了: ${rows.length}行を書き込みました ===`);

  // 確認: 書き込み後のデータを読み取り
  const verifyResp = await sheetsClient.spreadsheets.values.get({
    spreadsheetId,
    range: 'forecasts!A2:J10',
  });
  console.log('\n書き込み確認 (最初の5行):');
  const verifyRows = verifyResp.data.values || [];
  for (const row of verifyRows.slice(0, 5)) {
    console.log(`  ${row.join(' | ')}`);
  }
}

main().catch((err: unknown) => {
  console.error('インポートエラー:', err);
  process.exit(1);
});
