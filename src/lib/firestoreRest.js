const PROJECT = "kuma-6c130";
const DB_PATH = `projects/${PROJECT}/databases/(default)/documents`;
const BASE = `https://firestore.googleapis.com/v1/${DB_PATH}`;
const DEFAULT_COL = "groupmap";
const MAPS_META_COL = "_maps";

function toField(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  return { stringValue: String(val) };
}

function toDoc(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = toField(v);
  return { fields };
}

function fromDoc(doc) {
  const node = {};
  for (const [k, tv] of Object.entries(doc.fields || {})) {
    const type = Object.keys(tv)[0];
    node[k] = tv[type];
  }
  // Always derive id from document path — field value can be null/corrupt
  if (doc.name) node.id = doc.name.split("/").pop();
  return node;
}

function headers(idToken) {
  return { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" };
}

export async function listNodes(idToken, col = DEFAULT_COL) {
  const res = await fetch(`${BASE}/${col}`, { headers: headers(idToken) });
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  const data = await res.json();
  return (data.documents || []).map(fromDoc);
}

export async function setNode(node, idToken, col = DEFAULT_COL) {
  const mask = Object.keys(node).map(k => `updateMask.fieldPaths=${k}`).join("&");
  const res = await fetch(`${BASE}/${col}/${node.id}?${mask}`, {
    method: "PATCH",
    headers: headers(idToken),
    body: JSON.stringify(toDoc(node)),
  });
  if (!res.ok) throw new Error(`set failed: ${res.status}`);
}

export async function deleteNode(nodeId, idToken, col = DEFAULT_COL) {
  const res = await fetch(`${BASE}/${col}/${nodeId}`, {
    method: "DELETE",
    headers: headers(idToken),
  });
  if (!res.ok) throw new Error(`delete failed: ${res.status}`);
}

export async function replaceAll(newNodes, idToken, col = DEFAULT_COL) {
  const existing = await listNodes(idToken, col).catch(() => []);
  await Promise.all(existing.map(n => deleteNode(n.id, idToken, col)));
  await Promise.all(newNodes.map(n => setNode(n, idToken, col)));
}

export async function listMaps(idToken) {
  const res = await fetch(`${BASE}/${MAPS_META_COL}`, { headers: headers(idToken) });
  const userMaps = [];
  if (res.ok) {
    const data = await res.json();
    for (const doc of data.documents || []) {
      const fields = fromDoc(doc);
      const id = doc.name.split("/").pop();
      userMaps.push({ id, name: fields.name || id, createdAt: fields.createdAt || "" });
    }
    userMaps.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return [{ id: DEFAULT_COL, name: "グループマップ" }, ...userMaps];
}

export async function createMap(mapId, name, idToken) {
  const mask = "updateMask.fieldPaths=name&updateMask.fieldPaths=createdAt";
  const res = await fetch(`${BASE}/${MAPS_META_COL}/${mapId}?${mask}`, {
    method: "PATCH",
    headers: headers(idToken),
    body: JSON.stringify(toDoc({ name, createdAt: new Date().toISOString() })),
  });
  if (!res.ok) throw new Error(`createMap failed: ${res.status}`);
}

export async function deleteMap(mapId, idToken) {
  await replaceAll([], idToken, mapId);
  await fetch(`${BASE}/${MAPS_META_COL}/${mapId}`, {
    method: "DELETE",
    headers: headers(idToken),
  });
}
