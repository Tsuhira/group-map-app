# Firestore 永続化・KUMA KINGDOM 連携 仕様

## Firestore データ構造

```
users/{uid}/groupmap/nodes/{nodeId}
```

各ノードを独立したドキュメントとして保存。
リアルタイム同期（`onSnapshot`）で複数端末から同時編集可。

### ノードドキュメント

```json
{
  "id": "uuid-xxx",
  "name": "山田太郎",
  "parentId": "uuid-yyy",
  "rank": "platinum",
  "active": true,
  "joinDate": "2022-04-01",
  "note": "備考テキスト",
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

---

## KUMA KINGDOM 連携（SSO）

- KUMA KINGDOM のアプリハブから `?kumaToken=...` 付きで遷移
- `signInWithCustomToken()` でサインイン
- サインイン後、Firestore からそのユーザーのノードデータを読み込む
- 未ログインの場合は `localStorage` にデータを保存（ローカルのみ）

### kuma-app 側への登録

| 項目 | 値 |
|------|-----|
| appId | `groupmap` |
| アプリ名 | グループマップ |
| URL | https://tsuhira.github.io/group-map-app/ |

`functions/index.js` の `ALLOWED_APP_IDS` に `"groupmap"` を追加する。

---

## Firestore セキュリティルール

```
match /users/{userId}/groupmap/nodes/{nodeId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## オフライン対応

- Firestore の `enableIndexedDbPersistence()` を有効化
- オフライン時はローカルキャッシュから読み書き
- オンライン復帰時に自動同期
