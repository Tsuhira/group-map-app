# エクスポート・インポート 仕様

## JSON エクスポート（実装済み）

- ヘッダーのダウンロードアイコンボタンをクリック
- 全ノードデータを JSON 配列として書き出す
- ファイル名: `groupmap-{YYYY-MM-DD}.json`
- ファイル内容: `Node[]`（`id`, `name`, `parentId`, `pinLevel`, `active`, `joinDate`, `note`, `userId`）

---

## JSON インポート（実装済み）

- ヘッダーのアップロードアイコンボタンをクリック
- JSON ファイルを選択 → パース → **上書きインポート**（既存データを全削除してインポート）
- Firestore モード: Firestore のデータも全置換（`replaceAll` → 既存ドキュメント削除 + 新規一括書き込み）
- スタンドアロンモード: メモリ上のデータを置換（リロードで元に戻る）

---

## PNG / SVG・CSV 書き出し（未実装）

将来対応として検討中。
- PNG: `canvas` に SVG を描画して `toDataURL()` でダウンロード
- SVG: SVG ソースをそのままダウンロード
- CSV: `id,name,parentId,pinLevel,active,joinDate,note` 形式での書き出し/読み込み
