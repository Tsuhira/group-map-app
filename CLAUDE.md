# GROUP MAP APP 開発ガイド

## 開発方針
- **ドキュメント駆動**: 実装前に `docs/spec/` に仕様書を作成する
- **ブランチ運用**: 機能ごとにブランチを切り、コードレビュー後に main へマージ
- **実装後に更新**: 実装完了後は `docs/impl/overview.md` を更新する

## ブランチ命名規則
```
feature/{機能名}   # 新機能
fix/{内容}         # バグ修正
docs/{内容}        # ドキュメントのみの変更
```

## 開発フロー
1. `docs/spec/{機能名}.md` に仕様書を作成
2. `feature/{機能名}` ブランチで実装
3. コードレビュー（自己レビュー）
4. `--no-ff` で main にマージ
5. `docs/impl/overview.md` を更新

## ドキュメント構成
- `docs/spec/`    : 実装予定・実装中の機能仕様
- `docs/impl/`   : 実装済みの仕様・技術詳細
- `KUMA_INTEGRATION.md` : KUMA KINGDOM 連携情報
