import { useState, useEffect } from "react";
import { useBreakpoint } from "../hooks/useBreakpoint";

export const ROOT_SENTINEL = "__root__";

function newDraft(parentId) {
  return {
    id: crypto.randomUUID(),
    name: "",
    parentId: parentId === ROOT_SENTINEL ? null : parentId,
    pinLevel: "",
    active: true,
    joinDate: new Date().toISOString().split("T")[0],
    note: "",
  };
}

export default function Sidebar({ node, addingForId, nodes, rootNodeId, user, onClose, onUpdate, onAdd, onDelete, onAddChild, onSetRoot }) {
  const { isMobile } = useBreakpoint();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setEditMode(false);
    setError("");
  }, [node?.id]);

  useEffect(() => {
    if (addingForId) setForm(newDraft(addingForId));
  }, [addingForId]);

  const isAdding = !!addingForId;
  const isOpen = !!node || isAdding;
  const showForm = isAdding || editMode;

  const parentNode = isAdding
    ? nodes.find(n => n.id === addingForId)
    : nodes.find(n => n.id === node?.parentId);

  const hasChildren = node ? nodes.some(n => n.parentId === node.id) : false;

  const startEdit = () => {
    setForm({ ...node });
    setEditMode(true);
    setError("");
  };

  const validate = (f) => {
    if (!f.name.trim()) return "名前は必須です";
    if (f.joinDate && new Date(f.joinDate) > new Date()) return "入会日は今日以前の日付を入力してください";
    return "";
  };

  const handleSave = () => {
    const err = validate(form);
    if (err) { setError(err); return; }
    const saved = { ...form, name: form.name.trim() };
    if (isAdding) {
      onAdd(saved);
    } else {
      onUpdate(saved);
      setEditMode(false);
    }
    setError("");
  };

  const handleCancel = () => {
    if (isAdding) onClose();
    else { setEditMode(false); setError(""); }
  };

  const handleDelete = () => {
    if (hasChildren) return;
    if (!window.confirm(`「${node.name}」を削除しますか？`)) return;
    onDelete(node.id);
  };

  const panelStyle = isMobile
    ? {
        ...s.panel,
        width: "100%",
        height: "70vh",
        top: "auto",
        bottom: 0,
        right: 0,
        borderLeft: "none",
        borderTop: "1px solid var(--gold-line)",
        transform: isOpen ? "translateY(0)" : "translateY(100%)",
      }
    : {
        ...s.panel,
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
      };

  return (
    <aside style={panelStyle}>
      <button style={s.closeBtn} onClick={onClose}>✕</button>

      {showForm && form ? (
        <div style={s.body}>
          <p style={s.heading}>{isAdding ? "ノードを追加" : "ノードを編集"}</p>
          {error && <div style={s.error}>{error}</div>}
          <Field label="名前 *">
            <input style={s.input} value={form.name} autoFocus
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="名前" />
          </Field>
          <Field label="親ノード">
            <div style={s.readOnly}>{parentNode?.name ?? "（なし・ルートノード）"}</div>
          </Field>
          <Field label="ピンレベル">
            <input style={s.input} value={form.pinLevel}
              onChange={e => setForm(f => ({ ...f, pinLevel: e.target.value }))}
              placeholder="任意" />
          </Field>
          <Field label="アクティブ">
            <button
              style={{ ...s.toggle, ...(form.active ? s.toggleOn : s.toggleOff) }}
              onClick={() => setForm(f => ({ ...f, active: !f.active }))}>
              {form.active ? "有効" : "無効"}
            </button>
          </Field>
          <Field label="入会日">
            <input style={s.input} type="date" value={form.joinDate}
              onChange={e => setForm(f => ({ ...f, joinDate: e.target.value }))} />
          </Field>
          <Field label="備考">
            <textarea style={s.textarea} value={form.note} rows={3}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
          </Field>
          <div style={s.btnRow}>
            <button style={s.savBtn} onClick={handleSave}>保存</button>
            <button style={s.canBtn} onClick={handleCancel}>キャンセル</button>
          </div>
        </div>
      ) : node ? (
        <div style={s.body}>
          <p style={s.name}>{node.name}</p>
          {node.pinLevel && <span style={s.badge}>{node.pinLevel}</span>}
          <dl style={s.dl}>
            <dt style={s.dt}>状態</dt>
            <dd style={{ ...s.dd, color: node.active ? "#6ee7b7" : "var(--gold-dim)" }}>
              {node.active ? "アクティブ" : "非アクティブ"}
            </dd>
            {parentNode && (
              <>
                <dt style={s.dt}>親ノード</dt>
                <dd style={s.dd}>{parentNode.name}</dd>
              </>
            )}
            <dt style={s.dt}>入会日</dt>
            <dd style={s.dd}>{node.joinDate || "—"}</dd>
          </dl>
          {node.note && <p style={s.note}>{node.note}</p>}
          {user && (
            node.userId === user.uid
              ? <div style={s.myNodeBadge}>あなたのノード</div>
              : !node.userId && (
                <button style={s.claimBtn} onClick={() => onUpdate({ ...node, userId: user.uid })}>
                  このノードは自分
                </button>
              )
          )}
          <div style={s.actions}>
            <button style={s.actBtn} onClick={startEdit}>編集</button>
            <button style={s.actBtn} onClick={() => onAddChild(node.id)}>＋ 子ノードを追加</button>
            {node.id !== rootNodeId && (
              <button style={s.actBtn} onClick={() => onSetRoot(node.id)}>📌 規定ノードに設定</button>
            )}
            <button
              style={{ ...s.actBtn, ...s.delBtn, opacity: hasChildren ? 0.4 : 1 }}
              disabled={hasChildren}
              title={hasChildren ? "子ノードがあるため削除できません" : ""}
              onClick={handleDelete}>
              削除
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: "var(--gold-dim)", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

const s = {
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 280,
    height: "100%",
    background: "rgba(13,31,53,0.97)",
    borderLeft: "1px solid var(--gold-line)",
    backdropFilter: "blur(12px)",
    transition: "transform 0.25s ease",
    zIndex: 20,
    overflowY: "auto",
  },
  closeBtn: {
    position: "absolute",
    top: 10,
    right: 12,
    background: "none",
    border: "none",
    color: "var(--gold-dim)",
    fontSize: 16,
    cursor: "pointer",
    padding: "4px 6px",
  },
  body: { padding: "44px 16px 16px" },
  heading: { fontSize: 14, fontWeight: 700, color: "var(--gold)", margin: "0 0 16px" },
  name: { fontSize: 16, fontWeight: 700, color: "var(--gold)", margin: "0 0 8px" },
  badge: {
    display: "inline-block",
    padding: "2px 10px",
    borderRadius: 20,
    background: "rgba(232,213,176,0.10)",
    border: "1px solid var(--gold-line)",
    color: "var(--gold-dim)",
    fontSize: 11,
    marginBottom: 12,
  },
  dl: {
    display: "grid",
    gridTemplateColumns: "auto 1fr",
    gap: "6px 12px",
    marginBottom: 12,
    alignItems: "start",
  },
  dt: { color: "var(--gold-dim)", fontSize: 11, whiteSpace: "nowrap" },
  dd: { color: "var(--gold)", fontSize: 12, margin: 0 },
  note: {
    fontSize: 12,
    color: "var(--gold-dim)",
    background: "rgba(232,213,176,0.04)",
    borderRadius: 6,
    padding: "8px 10px",
    margin: "0 0 12px",
    whiteSpace: "pre-wrap",
  },
  actions: { display: "flex", flexDirection: "column", gap: 8, marginTop: 16 },
  actBtn: {
    padding: "8px 12px",
    background: "rgba(232,213,176,0.06)",
    border: "1px solid var(--gold-line)",
    borderRadius: 8,
    color: "var(--gold)",
    fontSize: 13,
    cursor: "pointer",
    textAlign: "left",
  },
  delBtn: {
    color: "#f87171",
    borderColor: "rgba(248,113,113,0.3)",
    background: "rgba(248,113,113,0.06)",
  },
  error: {
    background: "rgba(248,113,113,0.08)",
    border: "1px solid rgba(248,113,113,0.3)",
    borderRadius: 6,
    padding: "8px 10px",
    color: "#f87171",
    fontSize: 12,
    marginBottom: 12,
  },
  input: {
    width: "100%",
    padding: "8px 10px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--gold-line)",
    borderRadius: 6,
    color: "var(--gold)",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  },
  readOnly: {
    padding: "8px 10px",
    background: "rgba(255,255,255,0.02)",
    borderRadius: 6,
    color: "var(--gold-dim)",
    fontSize: 13,
  },
  textarea: {
    width: "100%",
    padding: "8px 10px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--gold-line)",
    borderRadius: 6,
    color: "var(--gold)",
    fontSize: 13,
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
  },
  toggle: {
    padding: "6px 14px",
    border: "1px solid var(--gold-line)",
    borderRadius: 20,
    fontSize: 12,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  toggleOn: {
    background: "rgba(110,231,183,0.12)",
    border: "1px solid rgba(110,231,183,0.4)",
    color: "#6ee7b7",
  },
  toggleOff: {
    background: "rgba(232,213,176,0.04)",
    color: "var(--gold-dim)",
  },
  btnRow: { display: "flex", gap: 8, marginTop: 8 },
  savBtn: {
    flex: 1,
    padding: "8px",
    background: "rgba(110,231,183,0.12)",
    border: "1px solid rgba(110,231,183,0.4)",
    borderRadius: 8,
    color: "#6ee7b7",
    fontSize: 13,
    cursor: "pointer",
  },
  myNodeBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 20,
    background: "rgba(110,231,183,0.10)",
    border: "1px solid rgba(110,231,183,0.35)",
    color: "#6ee7b7",
    fontSize: 11,
    marginBottom: 12,
  },
  claimBtn: {
    width: "100%",
    padding: "7px 12px",
    marginBottom: 12,
    background: "rgba(110,231,183,0.06)",
    border: "1px solid rgba(110,231,183,0.25)",
    borderRadius: 8,
    color: "#6ee7b7",
    fontSize: 12,
    cursor: "pointer",
    textAlign: "left",
  },
  canBtn: {
    flex: 1,
    padding: "8px",
    background: "rgba(232,213,176,0.06)",
    border: "1px solid var(--gold-line)",
    borderRadius: 8,
    color: "var(--gold-dim)",
    fontSize: 13,
    cursor: "pointer",
  },
};
