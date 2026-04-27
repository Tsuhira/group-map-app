# アプリ基盤・ズーム/パン 仕様

## 概要

アプリ全体のシェル（ヘッダー・サイドパネル・キャンバス・パンくず）と、
SVG キャンバスのズーム・パン操作を実装する。

---

## コンポーネント構成

```
App.jsx
├── Header.jsx         ヘッダー（タイトル・検索バー・フィルター・エクスポート）
├── FilterPanel.jsx    アクティブ状態フィルターパネル
├── Sidebar.jsx        サイドパネル（ノード詳細・編集フォーム）
├── MapCanvas.jsx      SVG キャンバス（D3 放射状ツリー・ズーム/パン）
├── ContextMenu.jsx    右クリックメニュー
└── Breadcrumb.jsx     パンくず（規定ノードの階層パス）
```

---

## MapCanvas

### SVG 構造

```
<svg>                          // フルスクリーン
  <defs>                       // glow フィルター定義
  <g class="zoom-layer">       // d3.zoom が transform を書き込む層
    <g class="links">          // 接続線（<line> 要素）
    <g class="nodes">          // ノード群
  </g>
</svg>
```

### レイアウト

- **放射状（Radial）**: 規定ノードを中心に、子ノードが放射状に広がる
- D3 の `d3.tree().size([2π, maxDepth × LEVEL_RADIUS])` を使用し、極座標 → 直交座標に変換
- 接続線は**直線**（`<line>` 要素）
- レベル間隔: **160px**（`LEVEL_RADIUS = NODE_RX * 2 + MIN_GAP = 70 * 2 + 20`）
- separation 関数: 同一親の兄弟は係数 1.0、異なる親は 1.3、depth で割り正規化

### ズーム / パン

- `d3.zoom()` を使用
- スクロール: ズームイン/アウト（範囲: 0.1x 〜 4x）
- ドラッグ: パン
- ボタン: 全体フィット（Header の Maximize2 アイコン）

### Fit to Screen

- 表示中のノード全体が画面に収まるよう `translate` と `scale` を自動計算
- 中心（ルートノード）を画面中央に配置
- 余白: 上下左右 60px
- 最大スケール: 1.2（小さなツリーが過度に拡大されないよう制限）

---

## Header

- タイトル: 「グループマップ」（モバイルでは非表示）
- 検索バー: ノード名で検索（部分一致）
- フィルターボタン: アクティブ状態フィルターの表示切替
- ラベル切替ボタン: 名前のみ / 名前＋ピンレベル
- エクスポート/インポートボタン: JSON 書き出し / 読み込み
- 全体フィットボタン: Fit to Screen 実行
- 自分のノードへボタン: Firestore モード時、userNodeId が存在する場合のみ表示
- 🐻 バッジ: Firestore モード（kuma-app 連携中）の場合のみ表示

---

## Sidebar

- 初期状態: 非表示
- ノードをクリックで表示（右側から表示、モバイルでは下部から表示）
- 内容: ノード詳細表示 + 編集フォーム（feature/node-edit で実装）

---

## Breadcrumb

- 画面下部に固定表示
- 規定ノードまでの階層パスを表示（例: 全体表示 › 山田 › 鈴木）
- 各階層名をクリック → そのノードを規定に設定
- 「↑ 上の階層へ」ボタン
- 「全体表示」ボタン（ルートノードを規定に設定）

---

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

---

## データモード

| モード | 条件 | データ源 |
|--------|------|---------|
| Firestore | `?kumaToken=` 付きで開いた場合 | Firestore `groupmap` コレクション（REST API） |
| スタンドアロン | 直接アクセス | sampleNodes.js（メモリのみ・エクスポート/インポート可） |
