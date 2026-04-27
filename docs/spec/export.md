# エクスポート 仕様

## PNG / SVG 書き出し

- ヘッダーの「書き出し」ボタン → メニュー
- 現在の表示（規定ノード以下のサブツリー）を書き出す
- PNG: `canvas` に SVG を描画して `toDataURL()` でダウンロード
- SVG: SVG ソースをそのままダウンロード
- ファイル名: `groupmap-{YYYY-MM-DD}.{ext}`

---

## CSV インポート / エクスポート

### エクスポート形式

```csv
id,name,parentId,rank,active,joinDate,note
uuid-xxx,山田太郎,,platinum,true,2022-04-01,
uuid-yyy,鈴木花子,uuid-xxx,gold,true,2023-01-15,備考
```

- 全ノードを書き出す（規定ノードのフィルターは無視）

### インポート

- CSV ファイルを選択 → パース → プレビュー表示
- 「上書きインポート」: 既存データを全削除してインポート
- 「追加インポート」: 既存データに追加（id 重複はスキップ）
- バリデーション:
  - 必須カラムチェック（id, name, parentId, rank）
  - 存在しない parentId は null 扱い（ルート扱い）
  - rank が定義外の場合は `partner` にフォールバック
