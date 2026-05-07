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
| DIA/EME ダイヤモンド形状ノード | ✅ 完了 |
| マルチアンカー（複数起点同時表示） | ✅ 完了 |
| マルチマップ（Firebase 複数マップ切替） | ✅ 完了 |
| PNG/SVG・CSV 書き出し | ❌ 未実装 |

## コンポーネント構成

```
App.jsx
├── Header.jsx          ヘッダー（検索・フィルター・ラベル切替・エクスポート・マップ切替ポップオーバー）
├── FilterPanel.jsx     アクティブ状態フィルターパネル
├── MapCanvas.jsx       SVG キャンバス（D3 放射状ツリー・ズーム/パン）
├── Sidebar.jsx         サイドパネル（ノード詳細・編集・追加フォーム）
├── ContextMenu.jsx     右クリックメニュー
├── Breadcrumb.jsx      パンくず（規定ノードの階層パス）
└── JapanMapOverlay.jsx 出身地マップオーバーレイ

hooks/
├── useAuth.js          Firebase Auth REST API でのトークン交換
├── useNodes.js         ノード状態管理（currentMapId でコレクション切替・Firestore / standalone 切替）
└── useBreakpoint.js    レスポンシブ分岐（isMobile / isTablet）

lib/
├── firestoreRest.js    Firestore REST API ラッパー（list / set / delete / replaceAll / listMaps / createMap）
├── animalFortune.js    動物占い算出
└── prefectures.js      都道府県リスト
```

## 状態管理（App.jsx）

```ts
nodes: Node[]           // 全ノードデータ（useNodes から取得）
currentMapId: string    // 現在表示中のマップ ID（既定: "groupmap"）
maps: Map[]             // Firebase 上のマップ一覧 { id, name }
rootNodeId: string      // 規定ノードの id（localStorage に保存）
selectedNodeId: string  // 選択中ノードの id
addingForId: string     // 追加フォームの親ノード id（"__root__" = ルート追加）
labelMode: 'name' | 'name+rank'
searchQuery: string
searchIndex: number
filterActive: 'all' | 'active' | 'inactive'
filterStatuses: Set<string>
filterBirthYear: number | null
showFilter: boolean
showJapanMap: boolean
contextMenu: { nodeId, x, y } | null
```

## ノード属性

| フィールド | 型 | 内容 |
|---|---|---|
| `id` | string | UUID |
| `name` | string | 表示名 |
| `parentId` | string \| null | 親ノード ID |
| `active` | boolean | アクティブ状態 |
| `status` | `"ABO" \| "PC" \| "プロスペクト" \| ""` | ステータス |
| `gender` | string | 性別 |
| `pinLevel` | string | ピンレベル |
| `birthYear` | string | 誕生年 |
| `birthDate` | string | 誕生月日（`MM-DD`） |
| `hometown` | string | 出身都道府県 |
| `note` | string | 備考 |
| `userId` | string \| null | 紐付き Firebase UID |
| `shape` | `"ELP" \| "DIA" \| "EME"` | ノード形状（省略時 ELP） |
| `anchor` | boolean | マルチアンカー登録フラグ（省略時 false） |

## データモード

| モード | 条件 | データ源 |
|--------|------|---------|
| Firestore | `?kumaToken=` 付きで開いた場合 | Firestore `{currentMapId}` コレクション（REST API） |
| スタンドアロン | 直接アクセス | sampleNodes.js（メモリのみ・エクスポート/インポート可） |

## Firestore コレクション構造

```
groupmap/{nodeId}         メインのグループマップ（kuma-app が書き込む・自動同期）
_maps/{mapId}             ユーザー作成マップのメタデータ { name, createdAt }
{mapId}/{nodeId}          ユーザー作成マップのノード（groupmap と同構造）
```

## ノード形状システム（→ docs/spec/node-shapes.md）

| shape | 外形 | バウンディング | 用途 |
|---|---|---|---|
| `ELP` | 楕円 | rx=70, ry=28 | 既定・一般メンバー |
| `DIA` | ダイヤモンド（大） | rx=64, ry=50 | 高ピン・規定ノード向け |
| `EME` | ダイヤモンド（小） | rx=46, ry=36 | 中間ピン向け |

## マルチアンカー（→ docs/spec/multi-anchor.md）

`anchor: true` のノードが 1 つ以上ある場合、仮想ルート（`__virtual_root__`）を起点に
各アンカーのサブツリーを同一キャンバス上に並べて表示する。
`rootNodeId` が指定されているとき（サブツリー単独表示モード）は通常の単一ツリー動作に戻る。
