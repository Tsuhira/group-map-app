import { useEffect } from "react";

export default function ContextMenu({ x, y, node, hasChildren, onEdit, onAddChild, onSetRoot, onDelete, onClose }) {
  useEffect(() => {
    const close = () => onClose();
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
    };
  }, [onClose]);

  const wrap = (fn) => (e) => { e.stopPropagation(); fn(); onClose(); };

  return (
    <div style={{ ...s.menu, left: x, top: y }} onClick={e => e.stopPropagation()}>
      <button style={s.item} onClick={wrap(onAddChild)}>＋ 子ノードを追加</button>
      <button style={s.item} onClick={wrap(onSetRoot)}>📌 規定ノードに設定</button>
      <button style={s.item} onClick={wrap(onEdit)}>編集</button>
      <div style={s.divider} />
      <button
        style={{ ...s.item, ...s.danger, opacity: hasChildren ? 0.4 : 1 }}
        disabled={hasChildren}
        title={hasChildren ? "子ノードがあるため削除できません" : ""}
        onClick={hasChildren ? undefined : wrap(onDelete)}>
        {hasChildren ? "削除（子あり・不可）" : "削除"}
      </button>
    </div>
  );
}

const s = {
  menu: {
    position: "fixed",
    zIndex: 100,
    background: "rgba(13,31,53,0.97)",
    border: "1px solid var(--gold-line)",
    borderRadius: 8,
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    overflow: "hidden",
    minWidth: 176,
  },
  item: {
    display: "block",
    width: "100%",
    padding: "10px 14px",
    background: "none",
    border: "none",
    color: "var(--gold)",
    fontSize: 13,
    cursor: "pointer",
    textAlign: "left",
  },
  divider: {
    height: 1,
    background: "var(--gold-line)",
    margin: "2px 0",
  },
  danger: { color: "#f87171" },
};
