# CS業務管理ダッシュボード

Backlog課題データをGoogle Spreadsheet経由で可視化するBIダッシュボード。

## セットアップ

### 前提条件
- Node.js 18+
- GCP Service Account（Sheets API読み取り権限）
- データソースのGoogle Spreadsheet

### インストール

```bash
npm install
cp .env.example .env.local
# .env.local に環境変数を設定
npm run dev
```

### Vercelデプロイ

```bash
vercel --prod
```

環境変数はVercelダッシュボードで設定。

## ビュー

| パス | 説明 |
|------|------|
| `/dashboard/deadline` | 期日アラート（デフォルト） |
| `/dashboard/vc-progress` | VC別進捗 |
| `/dashboard/status` | ステータス内訳 |

## On-demand Revalidation

GAS同期完了後にキャッシュ更新:
```bash
curl -X POST "https://your-domain.vercel.app/api/revalidate?secret=YOUR_SECRET"
```

## テスト

```bash
npm run test
```
