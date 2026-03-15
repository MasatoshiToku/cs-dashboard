# Handoff - cs-dashboard

Last Updated: 2026-03-15T00:00+09:00

## Current State

CS 業務管理 BI ダッシュボード。Backlog 課題データを GAS 経由で Google Spreadsheet に同期し、Next.js 14 (App Router) + ISR で可視化。4 ビュー構成: 期日アラート、VC 別進捗、ステータス内訳、予測件数管理。Vercel (hnd1 Tokyo) にデプロイ済み。Basic Auth ミドルウェアで認証。Forecast ページは Click-to-edit で Spreadsheet への直接書き込み対応。

## In Progress

- なし（初期作成）

## Blocked / Needs Attention

- なし

## Recent Decisions

| 日付 | 決定 | 理由 | Ref |
|------|------|------|-----|

## Known Issues

- なし

## For New Team Members

- **技術スタック**: Next.js 14 (App Router), React 18, TypeScript, Recharts v2, shadcn/ui v2, TailwindCSS v3, @googleapis/sheets, Vitest
- **ローカル開発**: `npm install` -> `cp .env.example .env.local` -> 環境変数設定 -> `npm run dev`。GCP Service Account に Sheets Editor 権限が必要
- **デプロイ**: `vercel --prod`。環境変数は Vercel ダッシュボードで設定（GOOGLE_SERVICE_ACCOUNT_*, BASIC_AUTH_*, REVALIDATION_SECRET 等）
- **重要な規約**: ISR revalidate:3600。GAS 同期後に `/api/revalidate?secret=xxx` で即時更新可能。Server Component で 2,597 行を集計し Client Component には集計結果のみ渡す。Recharts v2 は React 18 向け（React 19 移行時は v3 に更新必要）
