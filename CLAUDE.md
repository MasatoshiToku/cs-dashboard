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
3ビュー: /dashboard/deadline | /dashboard/vc-progress | /dashboard/status
  ↓
Vercel (hnd1 Tokyo, Basic Auth middleware)
```

## ディレクトリ構成

- `src/lib/` - データ層（types, constants, sheets-client, data-aggregator, utils）
- `src/components/` - UIコンポーネント
- `src/components/ui/` - shadcn/ui コンポーネント
- `src/app/dashboard/` - 3ビュー（deadline, vc-progress, status）
- `src/middleware.ts` - Basic Auth (Edge Runtime)
- `src/app/api/revalidate/` - On-demand ISR

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

## 注意事項

- Server Componentで2,597行を集計、Client Componentには集計結果のみ渡す
- Recharts v2はReact 18向け。React 19/Next.js 15へのアップグレード時はRecharts v3に移行必要
- shadcn/ui v2はTailwind v3対応。Tailwind v4移行時はshadcn最新版に更新必要
