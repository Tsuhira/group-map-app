# 複数規定ノード機能 仕様

## 概要
複数のノードを「規定ノード（anchor）」として登録し、
それぞれを起点とするサブツリーを **同一マップ上に同時表示** する。
配置はフォースシミュレーションによる自動レイアウト。

## ノード属性追加

| フィールド | 型 | 必須 | 既定値 | 内容 |
|---|---|---|---|---|
| `anchor` | `boolean` | No | `false` | 規定ノードかどうか |

- 既存データは `anchor` 未指定 = `false` として動作する（後方互換）。

## 起点決定ロジック（buildHierarchy 拡張）

現状:
```
startId = rootNodeId ?? 最初の親なしノード
→ そのノードを根とする単一ツリーを返す
```

拡張後:
```
anchors = nodes.filter(n => n.anchor === true)
if (anchors.length === 0) {
  // 既存と完全に同じ動作
  startId = rootNodeId ?? 最初の親なしノード
  return 単一ツリー
} else {
  // 仮想ルートを立て、各 anchor をその子として配下サブツリーを構築
  return {
    id: "__virtual_root__",
    virtual: true,
    children: anchors.map(a => buildSubtree(a))
  }
}
```

- 仮想ルートはレンダリング時にスキップ（描画しない）
- 仮想ルートとアンカーを結ぶリンクも描画しない

## レイアウト

- 仮想ルートは `fx=0, fy=0` に固定（中心）
- 仮想ルート〜アンカー間のリンクは強制0距離・低strength（または link force から除外）
- アンカー同士には強い反発: `forceManyBody().strength(d => d.data.anchor ? -2400 : -500)`
- 各アンカー配下のサブツリーは通常の link force で連結 → クラスタ化される
- 全体は弱い中心引力でまとまる

## rootNodeId との関係

`rootNodeId` は引き続き「**フォーカス起点**」として機能する：

- anchor 0個（既存動作）: rootNodeId が単一ツリーの根
- anchor 1個以上: rootNodeId は「ズーム時のセンタリング対象」程度の意味に弱まる
  - 「このノードを起点に表示（サブツリーのみ表示）」を選ぶと、
    **anchor を一時的に無視し、rootNodeId 単独ツリーモードに切り替え**
  - 「全体マップ（🌐）」で anchor モードに戻る

## UI

### Sidebar.jsx
- 「規定ノードに登録 / 解除」トグルボタン（チェックボックス）

### ContextMenu.jsx
- 「規定ノードに登録 / 解除」メニュー追加

### Header.jsx
- 既存「全体マップ」ボタンの挙動: anchor がある場合は「アンカーモード」へ戻る

## Firestore / Import-Export
- `anchor` フィールドはoptional。既存データに自動付与しない
- JSONインポート時、未指定なら `false` 扱い

## 既存機能への影響

| 機能 | 影響 |
|---|---|
| 検索・フィルター・ハイライト | なし |
| サイドバー編集 / 追加 / 削除 | フィールド1つ追加のみ |
| ピンレベル表示 / 名前+ピン切替 | なし |
| プロスペクト破線 / active 色分け | なし |
| 自分のノード（緑）/ 他ユーザー（紫） | なし |
| kuma-app SSO | なし |
| 単一起点モード（anchor 0個時） | 完全に既存と同じ |
