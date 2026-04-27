# Firestore 永続化・KUMA KINGDOM 連携 仕様

## Firestore データ構造

```
groupmap/{nodeId}
```

全ユーザー共通のフラットなコレクション。各ノードを独立したドキュメントとして保存。
リアルタイム同期は行わない（操作ごとに REST API を呼び出し、ローカル状態を即時更新）。

### ノードドキュメント（Firestore 型付きフィールド形式）

```json
{
  "fields": {
    "id":        { "stringValue": "uuid-xxx" },
    "name":      { "stringValue": "山田太郎" },
    "parentId":  { "stringValue": "uuid-yyy" },
    "pinLevel":  { "stringValue": "" },
    "active":    { "booleanValue": true },
    "joinDate":  { "stringValue": "2022-04-01" },
    "note":      { "stringValue": "" },
    "userId":    { "nullValue": null }
  }
}
```

`parentId` がルートの場合は `{ "nullValue": null }`。

---

## KUMA KINGDOM 連携（SSO）

- KUMA KINGDOM のアプリハブから `?kumaToken=...` 付きで遷移
- Firebase Auth **REST API** でサインイン（SDK は使用しない）
- サインイン後、Firestore REST API からデータを読み込む
- `?kumaToken=` は遷移直後に `history.replaceState` で URL から除去する
- kumaToken がない場合はスタンドアロンモード（sampleNodes）

### kuma-app 側への登録

| 項目 | 値 |
|------|-----|
| appId | `"group-map"` |
| アプリ名 | グループマップ |
| 絵文字 | 🗺️ |
| URL | https://tsuhira.github.io/group-map-app/ |

`functions/index.js` の `ALLOWED_APP_IDS` に `"group-map"` を追加済み。

---

## 認証（Firebase Auth REST API）

Firebase SDK を使わず REST API で直接カスタムトークンを交換する。

```
POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={API_KEY}
Body: { token: kumaToken, returnSecureToken: true }
Response: { localId, idToken, refreshToken, expiresIn }
```

取得した `idToken` を Firestore REST API のリクエストヘッダーに使用する。

---

## Firestore REST API

ベース URL: `https://firestore.googleapis.com/v1/projects/kuma-6c130/databases/(default)/documents`

| 操作 | メソッド | パス |
|------|---------|------|
| 一覧取得 | GET | `/groupmap` |
| 作成/更新 | PATCH | `/groupmap/{nodeId}?updateMask.fieldPaths=id&...` |
| 削除 | DELETE | `/groupmap/{nodeId}` |
| 一括置換 | batchWrite | POST `/documents:batchWrite` |

全リクエストに `Authorization: Bearer {idToken}` ヘッダーを付与する。

---

## Firestore セキュリティルール

```
match /groupmap/{nodeId} {
  allow read, write: if request.auth != null;
}
```

全認証ユーザーが読み書き可能（認証なし＝アクセス不可）。

---

## オフライン対応

オフライン対応は実装しない。
- オフライン時は API コールが失敗するが、ローカル状態は維持される（次回オンライン時に手動で操作が必要）
