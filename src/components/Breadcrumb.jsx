import { ChevronRight } from "lucide-react";

function getAncestors(nodes, nodeId) {
  const map = Object.fromEntries(nodes.map(n => [n.id, n]));
  const path = [];
  let cur = map[nodeId];
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? map[cur.parentId] : null;
  }
  return path;
}

export default function Breadcrumb({ nodes, rootNodeId, onSetRoot }) {
  const dataRoot = nodes.find(n => !n.parentId);
  if (!rootNodeId || !dataRoot) return null;

  const ancestors = getAncestors(nodes, rootNodeId);
  const isAtDataRoot = rootNodeId === dataRoot.id;

  return (
    <div style={s.bar}>
      {!isAtDataRoot && (
        <>
          <button style={s.link} onClick={() => onSetRoot(dataRoot.id)}>
            全体表示
          </button>
          <ChevronRight size={12} color="var(--gold-dim)" />
        </>
      )}
      {ancestors.map((n, i) => (
        <span key={n.id} style={s.crumb}>
          {i > 0 && <ChevronRight size={12} color="var(--gold-dim)" />}
          {i < ancestors.length - 1 ? (
            <button style={s.link} onClick={() => onSetRoot(n.id)}>{n.name}</button>
          ) : (
            <span style={s.current}>{n.name}</span>
          )}
        </span>
      ))}
      {!isAtDataRoot && (
        <button style={{ ...s.link, marginLeft: "12px" }} onClick={() => {
          const cur = nodes.find(n => n.id === rootNodeId);
          if (cur?.parentId) onSetRoot(cur.parentId);
          else onSetRoot(dataRoot.id);
        }}>
          ↑ 上の階層へ
        </button>
      )}
    </div>
  );
}

const s = {
  bar: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "8px 16px",
    background: "rgba(13,31,53,0.92)",
    borderTop: "1px solid var(--gold-line)",
    flexShrink: 0,
    fontSize: "12px",
    flexWrap: "wrap",
  },
  crumb: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  link: {
    background: "none",
    border: "none",
    color: "var(--gold-dim)",
    fontSize: "12px",
    padding: "2px 4px",
    borderRadius: "4px",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  },
  current: {
    color: "var(--gold)",
    fontWeight: "700",
    padding: "2px 4px",
  },
};
