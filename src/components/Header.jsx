import { Maximize2, Tag, Tags } from "lucide-react";

export default function Header({ labelMode, onLabelModeToggle, onFitScreen }) {
  return (
    <header style={s.header}>
      <span style={s.title}>グループマップ</span>
      <div style={s.controls}>
        <button style={s.btn} onClick={onFitScreen} title="全体フィット">
          <Maximize2 size={16} />
        </button>
        <button style={s.btn} onClick={onLabelModeToggle} title="ラベル表示切替">
          {labelMode === "name" ? <Tag size={16} /> : <Tags size={16} />}
          <span style={s.btnLabel}>
            {labelMode === "name" ? "名前のみ" : "名前+ピン"}
          </span>
        </button>
      </div>
    </header>
  );
}

const s = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    background: "rgba(13,31,53,0.95)",
    borderBottom: "1px solid var(--gold-line)",
    flexShrink: 0,
    backdropFilter: "blur(8px)",
    zIndex: 10,
  },
  title: {
    fontSize: "16px",
    fontWeight: "700",
    color: "var(--gold)",
    letterSpacing: "0.08em",
  },
  controls: {
    display: "flex",
    gap: "8px",
  },
  btn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    background: "rgba(232,213,176,0.06)",
    border: "1px solid var(--gold-line)",
    borderRadius: "8px",
    color: "var(--gold-dim)",
    fontSize: "13px",
    transition: "var(--transition)",
  },
  btnLabel: {
    fontSize: "12px",
  },
};
