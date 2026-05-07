# ノード形状システム仕様

## 概要
ノードに `shape` 属性を追加し、形状を切り替えられるようにする。
DIA / EME はSVGで描画したダイヤモンド型、それ以外は既存の楕円。

## ノード属性追加

| フィールド | 型 | 必須 | 既定値 | 内容 |
|---|---|---|---|---|
| `shape` | `"DIA" \| "EME" \| "ELP"` | No | `"ELP"` | ノードの描画形状 |

- 省略・未知の値は `"ELP"`（既存の楕円）として扱う。
- 既存データ・既存JSONインポートは無変更で動作する（後方互換）。

## 形状定義

### DIA（規定ノード向け、大）
- バウンディング: rx=64, ry=50（衝突検出用の楕円）
- SVG: 5角形クラウン + パビリオン + クラウン/パビリオンのカッティング線
- 塗り: 白〜水色の縦グラデーション
- 枠: `#3a6f96` 2px
- 内部に名前 + "DIA" サブテキスト

### EME（中）
- バウンディング: rx=46, ry=36
- SVG: DIAと同じ構造で小さめ
- 塗り: 白緑〜深緑の縦グラデーション
- 枠: `#1f5a18` 1.8px
- 内部に名前 + "EME" サブテキスト

### ELP（既存・既定）
- 現状の `<ellipse rx=70 ry=28>` のまま
- 既存の active/inactive、自分/他ユーザー、プロスペクト破線などの色分けロジックを維持

## レンダリング切替（MapCanvas.jsx）

```js
const SHAPE_RX = { DIA: 64, EME: 46, ELP: 70 };
const SHAPE_RY = { DIA: 50, EME: 36, ELP: 28 };

function nodeRxFn(d) {
  const shape = d.data?.shape ?? "ELP";
  if (shape === "ELP") return d.data?.active ? 70 : 28; // 既存ロジック
  return SHAPE_RX[shape];
}
function nodeRyFn(d) {
  const shape = d.data?.shape ?? "ELP";
  if (shape === "ELP") return d.data?.active ? (show2Line(d) ? 36 : 28) : 28;
  return SHAPE_RY[shape];
}
```

衝突検出 (`forceEllipseCollide`) と エッジクリア (`forceEdgeClear`) は
新しい `nodeRxFn`/`nodeRyFn` をそのまま使えば全形状に対応する。

## 編集UI（Sidebar.jsx）
- 編集フォームに「形状」セレクトを追加: 楕円 / DIA / EME
- 既定は楕円
