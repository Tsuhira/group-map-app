# グループマップアプリ 実装リファレンス

> 実装を変更するたびに更新する。詳細な仕様は各 docs/spec/ ファイルを参照。

## テックスタック

| 項目 | 内容 |
|------|------|
| フロントエンド | React 19 + Vite |
| ツリー描画 | D3.js（放射状レイアウト） |
| ホスティング | GitHub Pages（GitHub Actions で自動デプロイ） |
| データ保存 | Firestore REST API（kuma-app 経由）/ sampleNodes（スタンドアロン） |
| 認証 | Firebase Auth REST API（kuma-app SSO、SDK 不使用） |
| UI アイコン | lucide-react |

## 実装済み機能

| 機能 | 状態 |
|------|------|
| アプリ基盤・ズーム/パン | ✅ 完了 |
| ノード描画・線スタイル | ✅ 完了 |
| ノード追加・編集・削除 | ✅ 完了 |
| 規定ノード選択・サブツリー表示 | ✅ 完了 |
| 検索・アクティブフィルター | ✅ 完了 |
| Firestore 永続化・KUMA 連携 | ✅ 完了 |
| JSON エクスポート/インポート | ✅ 完了 |
| PWA レスポンシブ対応 | ✅ 完了 |
| 性別フィールド・文字色色分け | ✅ 完了 |
| 誕生年/月日分割入力 | ✅ 完了 |
| 動物占い自動表示 | ✅ 完了 |
| 誕生年度フィルター | ✅ 完了 |
| PNG/SVG・CSV 書き出し | ❌ 未実装 |

## コンポーネント構成

```
App.jsx
├── Header.jsx          ヘッダー（検索・フィルター・ラベル切替・エクスポート/インポート）
├── FilterPanel.jsx     アクティブ状態フィルターパネル
├── MapCanvas.jsx       SVG キャンバス（D3 放射状ツリー・ズーム/パン）
├── Sidebar.jsx         サイドパネル（ノード詳細・編集・追加フォーム）
├── ContextMenu.jsx     右クリックメニュー
└── Breadcrumb.jsx      パンくず（規定ノードの階層パス）

hooks/
├── useAuth.js          Firebase Auth REST API でのトークン交換
├── useNodes.js         ノード状態管理（Firestore / standalone 切替）
└── useBreakpoint.js    レスポンシブ分岐（isMobile / isTablet）

lib/
└── firestoreRest.js    Firestore REST API ラッパー（list / set / delete / replaceAll）
```

## 状態管理（App.jsx）

```ts
nodes: Node[]           // 全ノードデータ（useNodes から取得）
rootNodeId: string      // 規定ノードの id（localStorage に保存）
selectedNodeId: string  // 選択中ノードの id
addingForId: string     // 追加フォームの親ノード id（"__root__" = ルート追加）
labelMode: 'name' | 'name+rank'
searchQuery: string
searchIndex: number
filterActive: 'all' | 'active' | 'inactive'
showFilter: boolean
contextMenu: { nodeId, x, y } | null
```

## データモード

| モード | 条件 | データ源 |
|--------|------|---------|
| Firestore | `?kumaToken=` 付きで開いた場合 | Firestore `groupmap` コレクション（REST API） |
| スタンドアロン | 直接アクセス | sampleNodes.js（メモリのみ・エクスポート/インポート可） |
