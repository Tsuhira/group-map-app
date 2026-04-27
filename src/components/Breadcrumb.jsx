import { ChevronRight } from "lucide-react";
import { useBreakpoint } from "../hooks/useBreakpoint";

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

function truncate(name, maxLen) {
  return name.length > maxLen ? name.slice(0, maxLen - 1) + "…" : name;
}

export default function Breadcrumb({ nodes, rootNodeId, onSetRoot }) {
  const { isMobile } = useBreakpoint();
  const dataRoot = nodes.find(n => !n.parentId);
  if (!rootNodeId || !dataRoot) return null;

  const ancestors = getAncestors(nodes, rootNodeId);
  const isAtDataRoot = rootNodeId === dataRoot.id;
  const maxNameLen = isMobile ? 6 : 12;

  return (
    <div style={{ ...s.bar, padding: isMobile ? "6px 10px" : "8px 16px", fontSize: isMobile ? "11px" : "12px" }}>
      {!isAtDataRoot && (
        <>
          <button style={s.link} onClick={() => onSetRoot(dataRoot.id)}>
            {isMobile ? "全体" : "全体表示"}
          </button>
          <ChevronRight size={10} color="var(--gold-dim)" />
        </>
      )}
      {ancestors.map((n, i) => (
        <span key={n.id} style={s.crumb}>
          {i > 0 && <ChevronRight size={10} color="var(--gold-dim)" />}
          {i < ancestors.length - 1 ? (
            <button style={s.link} onClick={() => onSetRoot(n.id)}>
              {truncate(n.name, maxNameLen)}
            </button>
          ) : (
            <span style={s.current}>{truncate(n.name, maxNameLen)}</span>
          )}
        </span>
      ))}
      {!isAtDataRoot && (
        <button style={{ ...s.link, marginLeft: 8 }} onClick={() => {
          const cur = nodes.find(n => n.id === rootNodeId);
          onSetRoot(cur?.parentId ?? dataRoot.id);
        }}>
          {isMobile ? "↑ 上へ" : "↑ 上の階層へ"}
        </button>
      )}
    </div>
  );
}

const s = {
  bar: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    background: "rgba(13,31,53,0.92)",
    borderTop: "1px solid var(--gold-line)",
    flexShrink: 0,
    flexWrap: "wrap",
    minHeight: 36,
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    paddingLeft: "env(safe-area-inset-left, 0px)",
    paddingRight: "env(safe-area-inset-right, 0px)",
  },
  crumb: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
  },
  link: {
    background: "none",
    border: "none",
    color: "var(--gold-dim)",
    fontSize: "inherit",
    padding: "4px 4px",
    borderRadius: "4px",
    cursor: "pointer",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
    minHeight: 32,
  },
  current: {
    color: "var(--gold)",
    fontWeight: "700",
    padding: "4px 4px",
  },
};
