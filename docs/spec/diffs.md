# 実装差分ガイド

各ファイルの改修ポイント。完全コピペ用ではなく、適用箇所と意図のメモ。

---

## 1. `src/components/MapCanvas.jsx`

### A. defs に DIA / EME のシンボルを追加

`<defs>` を組み立てている箇所（`glowFilter` の直後）に追加：

```js
// DIA gradient
defs.append("linearGradient").attr("id", "dia-grad")
  .attr("x1", 0).attr("y1", -1).attr("x2", 0).attr("y2", 1)
  .selectAll("stop").data([
    { offset: "0%",  color: "#ffffff" },
    { offset: "45%", color: "#dff1ff" },
    { offset: "100%", color: "#9ec9e8" },
  ]).join("stop").attr("offset", d => d.offset).attr("stop-color", d => d.color);

// EME gradient
defs.append("linearGradient").attr("id", "eme-grad")
  .attr("x1", 0).attr("y1", -1).attr("x2", 0).attr("y2", 1)
  .selectAll("stop").data([
    { offset: "0%",  color: "#d6f5c7" },
    { offset: "50%", color: "#7ed95a" },
    { offset: "100%", color: "#3a8a2a" },
  ]).join("stop").attr("offset", d => d.offset).attr("stop-color", d => d.color);

// DIA shape symbol
const dia = defs.append("g").attr("id", "dia-shape");
dia.append("path")
  .attr("d", "M -60,-12 L -36,-40 L 36,-40 L 60,-12 L 0,50 Z")
  .attr("fill", "url(#dia-grad)").attr("stroke", "#3a6f96")
  .attr("stroke-width", 2).attr("stroke-linejoin", "round");
// table + crown facets + pavilion facets …（U29 Map Mock.html を参照）

// EME shape symbol
// （構造は同じで一回り小さい。stroke は #1f5a18）
```

実装はモック (`U29 Map Mock.html`) の `<defs>` ブロックをそのまま移植。

### B. 形状サイズ関数を拡張

```js
const SHAPE_RX = { DIA: 64, EME: 46 };
const SHAPE_RY = { DIA: 50, EME: 36 };

const nodeRxFn = n => {
  const s = n.data?.shape;
  if (s === "DIA" || s === "EME") return SHAPE_RX[s];
  return n.data?.active ? NODE_RX : NODE_RY; // 既存
};
const nodeRyFn = n => {
  const s = n.data?.shape;
  if (s === "DIA" || s === "EME") return SHAPE_RY[s];
  return n.data?.active ? (show2Line(n) ? NODE_RY_2LINE : NODE_RY) : NODE_RY; // 既存
};
```

### C. ノード描画切替

`nodeG.append("ellipse")` の前で shape 判定し、`<ellipse>` か `<use href="#dia-shape">` / `<use href="#eme-shape">` を出し分ける：

```js
const isDia = d => d.data?.shape === "DIA";
const isEme = d => d.data?.shape === "EME";
const isEllipse = d => !isDia(d) && !isEme(d);

nodeG.filter(isDia).append("use").attr("class", "node-shape").attr("href", "#dia-shape");
nodeG.filter(isEme).append("use").attr("class", "node-shape").attr("href", "#eme-shape");

nodeG.filter(isEllipse).append("ellipse")
  .attr("class", "node-ellipse")
  // ... 既存の ellipse 描画ロジックそのまま
```

DIA/EME 用のテキスト色は濃色（既存テキスト色のままだと白系背景で見えない）：

```js
nodeG.filter(d => isDia(d) || isEme(d))
  .append("text")
  .attr("text-anchor", "middle").attr("dy", "-0.1em")
  .attr("fill", d => isDia(d) ? "#1a3a5a" : "#0e3318")
  .attr("font-size", "12px").attr("font-weight", 600)
  .text(d => d.data.name);
```

ハイライト/選択ストロークは `node-ellipse` 限定の effect なので、DIA/EME には別途 selection 用のラッパー矩形か、`<use>` を `filter="url(#glow)"` で対応。

### D. buildHierarchy を multi-anchor 対応に

```js
const buildHierarchy = useCallback(() => {
  const map = Object.fromEntries(nodes.map(n => [n.id, { ...n, children: [] }]));
  const visible = (n) => { /* 既存ロジック */ };

  const anchors = nodes.filter(n => n.anchor && visible(map[n.id]));

  // 親子関係構築（既存ロジック）
  nodes.forEach(n => {
    if (!visible(n) || !n.parentId) return;
    let parent = map[n.parentId];
    while (parent && !visible(parent)) {
      parent = parent.parentId ? map[parent.parentId] : null;
    }
    if (parent) parent.children.push(map[n.id]);
  });

  // anchor が 0個 or rootNodeId が「ズーム単独モード」のとき: 既存挙動
  if (anchors.length === 0 || rootNodeId) {
    const startId = rootNodeId ?? nodes.find(n => !n.parentId)?.id;
    return startId ? map[startId] : null;
  }

  // anchor 複数: 仮想ルート
  return {
    id: "__virtual_root__",
    virtual: true,
    name: "",
    children: anchors.map(a => map[a.id]),
  };
}, [nodes, rootNodeId, filterActive, filterStatuses]);
```

仮想ルートは描画時にスキップ：

```js
const visibleSimNodes = simNodes.filter(n => !n.data.virtual);
// 仮想ルートを含むリンクも除外
const visibleSimLinks = simLinks.filter(l => {
  const s = typeof l.source === "object" ? l.source : nodeById.get(l.source);
  return !s?.data?.virtual;
});
```

### E. 反発力をアンカー強化

```js
.force("charge", d3.forceManyBody().strength(d => d.data.anchor ? -2400 : -800))
```

---

## 2. `src/components/Sidebar.jsx`

編集フォームに2フィールド追加：

```jsx
{/* 形状 */}
<label>形状</label>
<select value={form.shape ?? "ELP"} onChange={e => setForm({...form, shape: e.target.value})}>
  <option value="ELP">楕円（既定）</option>
  <option value="DIA">DIA（ダイヤ・大）</option>
  <option value="EME">EME（ダイヤ・小）</option>
</select>

{/* 規定ノード */}
<label>
  <input type="checkbox"
         checked={!!form.anchor}
         onChange={e => setForm({...form, anchor: e.target.checked})} />
  規定ノードとして登録
</label>
```

保存時、既定値はそのままサーバへ送らない（または明示送信）どちらでもOK。

---

## 3. `src/components/ContextMenu.jsx`

メニュー項目追加：

```jsx
<button onClick={onToggleAnchor}>
  {node.anchor ? "規定ノードを解除" : "規定ノードに登録"}
</button>
```

App.jsx 側で onToggleAnchor を実装：

```js
const handleToggleAnchor = useCallback(async (id) => {
  const n = nodes.find(x => x.id === id);
  if (!n) return;
  await updateNode({ ...n, anchor: !n.anchor });
}, [nodes, updateNode]);
```

---

## 4. `src/data/sampleNodes.js`

サンプルにDIA/EME/anchorを追加して動作確認：

```js
{ id: "1", name: "山田 太郎", shape: "DIA", anchor: true, parentId: null, ... },
{ id: "2", name: "鈴木 花子", shape: "EME", parentId: "1", ... },
// 残りはshape未指定で既存の楕円ノードのまま
```

---

## 5. インポート/エクスポート（App.jsx の validateImport）

特に変更不要。`shape` / `anchor` は optional なので既存のJSONも読める。
