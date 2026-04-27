const PROJECT = "kuma-6c130";
const DB_PATH = `projects/${PROJECT}/databases/(default)/documents`;
const COL = "groupmap";
const BASE = `https://firestore.googleapis.com/v1/${DB_PATH}`;

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
  return node;
}

function headers(idToken) {
  return { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" };
}

export async function listNodes(idToken) {
  const res = await fetch(`${BASE}/${COL}`, { headers: headers(idToken) });
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  const data = await res.json();
  return (data.documents || []).map(fromDoc);
}

export async function setNode(node, idToken) {
  const mask = Object.keys(node).map(k => `updateMask.fieldPaths=${k}`).join("&");
  const res = await fetch(`${BASE}/${COL}/${node.id}?${mask}`, {
    method: "PATCH",
    headers: headers(idToken),
    body: JSON.stringify(toDoc(node)),
  });
  if (!res.ok) throw new Error(`set failed: ${res.status}`);
}

export async function deleteNode(nodeId, idToken) {
  const res = await fetch(`${BASE}/${COL}/${nodeId}`, {
    method: "DELETE",
    headers: headers(idToken),
  });
  if (!res.ok) throw new Error(`delete failed: ${res.status}`);
}

export async function replaceAll(newNodes, idToken) {
  const existing = await listNodes(idToken).catch(() => []);
  const writes = [
    ...existing.map(n => ({ delete: `${DB_PATH}/${COL}/${n.id}` })),
    ...newNodes.map(n => ({
      update: { name: `${DB_PATH}/${COL}/${n.id}`, ...toDoc(n) },
    })),
  ];
  if (writes.length === 0) return;
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:batchWrite`,
    { method: "POST", headers: headers(idToken), body: JSON.stringify({ writes }) }
  );
  if (!res.ok) throw new Error(`batchWrite failed: ${res.status}`);
}
