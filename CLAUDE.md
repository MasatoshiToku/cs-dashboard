# CS Dashboard - CLAUDE.md

CS業務管理ダッシュボード。Backlog課題データをGoogle Spreadsheet経由で可視化するBIツール。

## 技術スタック

- Next.js 14 (App Router) + TypeScript + React 18
- Recharts v2 (チャート)
- shadcn/ui v2 + TailwindCSS v3
- @googleapis/sheets + google-auth-library (データ取得)
- Vitest (テスト)
- Vercel (hnd1 Tokyo)

## アーキテクチャ

```
Google Spreadsheet (3シート: issues/forecasts/_META)
  ↓ @googleapis/sheets batchGet (Service Account)
Next.js Server Components (ISR revalidate:3600)
  ↓
4ビュー: /dashboard/deadline | /dashboard/vc-progress | /dashboard/status | /dashboard/forecast
  ↓
Vercel (hnd1 Tokyo, Basic Auth middleware)
```

## ページ一覧

| パス | 概要 |
|------|------|
| `/dashboard/deadline` | 締切管理 |
| `/dashboard/vc-progress` | VC進捗管理 |
| `/dashboard/status` | ステータス管理 |
| `/dashboard/forecast` | 予測件数管理（カテゴリ別グリッド、Click-to-edit、月ナビゲーション） |

## ディレクトリ構成

- `src/lib/` - データ層（types, constants, sheets-client, data-aggregator, utils）
- `src/components/` - UIコンポーネント
- `src/components/ui/` - shadcn/ui コンポーネント
- `src/app/dashboard/` - 4ビュー（deadline, vc-progress, status, forecast）
- `src/middleware.ts` - Basic Auth (Edge Runtime)
- `src/app/api/revalidate/` - On-demand ISR
- `src/app/api/forecasts/` - 予測データCRUD API

## データモデル

### issues シート
Backlog課題データ（GAS同期）

### forecasts シート（A-H列）

| 列 | フィールド | 説明 |
|----|-----------|------|
| A | vcName | VC名 |
| B | yearMonth | 対象年月 |
| C | forecastCount | 予測件数 |
| D | notes | メモ |
| E | category | カテゴリ（ダッシュボード管理用拡張列） |
| F | frequency | 頻度（ダッシュボード管理用拡張列） |
| G | deadlineDay | 締切日（ダッシュボード管理用拡張列） |
| H | assignDeadlineDay | アサイン締切日（ダッシュボード管理用拡張列） |

### _META シート
メタデータ管理

## API Routes

| メソッド | パス | 概要 |
|---------|------|------|
| `GET` | `/api/revalidate` | On-demand ISR |
| `POST` | `/api/forecasts` | 予測データの更新(update)/追加(append) |
| `DELETE` | `/api/forecasts` | 予測データの行削除 |

## Sheets API 認証

SA (`cs-dashboard-reader@...`) に Editor 権限を付与済み。

| 用途 | 関数 | スコープ |
|------|------|---------|
| 読み取り | `getReadAuth()` | readonly scope |
| 書き込み | `getWriteAuth()` | readwrite scope |

## コマンド

```bash
npm run dev      # 開発サーバー (localhost:3000)
npm run build    # プロダクションビルド
npm run test     # Vitest ユニットテスト
npm run start    # プロダクションサーバー
```

## 環境変数

`.env.example` 参照。Vercel環境変数で設定:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - GCP Service Account
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` - 改行は `\\n` エスケープ（コード側で自動変換）
- `GOOGLE_SPREADSHEET_ID` - データソースのスプレッドシートID
- `BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD` - Basic認証
- `REVALIDATION_SECRET` - On-demand ISR用シークレット

## データフロー

1. GAS `cs-dashboard-sync` が毎朝7:00にBacklog→Spreadsheet同期
2. ダッシュボードはISR(1h)でSpreadsheetから読み取り
3. GAS同期完了後に `/api/revalidate?secret=xxx` で即時更新可能
4. forecast ページからの編集は `POST/DELETE /api/forecasts` → Spreadsheet直接書き込み

## 注意事項

- Server Componentで2,597行を集計、Client Componentには集計結果のみ渡す
- Recharts v2はReact 18向け。React 19/Next.js 15へのアップグレード時はRecharts v3に移行必要
- shadcn/ui v2はTailwind v3対応。Tailwind v4移行時はshadcn最新版に更新必要
