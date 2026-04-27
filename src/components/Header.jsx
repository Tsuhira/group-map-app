import { Maximize2, Tag, Tags, Search, SlidersHorizontal } from "lucide-react";

export default function Header({
  labelMode, onLabelModeToggle, onFitScreen,
  searchQuery, onSearchChange, searchCount, searchIndex, onSearchNav,
  filterActive, onFilterToggle,
}) {
  return (
    <header style={s.header}>
      <span style={s.title}>グループマップ</span>

      <div style={s.search}>
        <Search size={13} color="var(--gold-dim)" style={{ flexShrink: 0 }} />
        <input
          style={s.searchInput}
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="ノード名を検索…"
        />
        {searchQuery && (
          <>
            <span style={s.count}>{searchCount}件</span>
            <button style={s.navBtn} onClick={() => onSearchNav(-1)} title="前へ">↑</button>
            <button style={s.navBtn} onClick={() => onSearchNav(1)} title="次へ">↓</button>
            <button style={s.clearBtn} onClick={() => onSearchChange("")}>✕</button>
          </>
        )}
      </div>

      <div style={s.controls}>
        {filterActive !== "all" && (
          <span style={s.badge}>フィルター適用中</span>
        )}
        <button style={s.btn} onClick={onFilterToggle} title="フィルター">
          <SlidersHorizontal size={15} />
        </button>
        <button style={s.btn} onClick={onFitScreen} title="全体フィット">
          <Maximize2 size={15} />
        </button>
        <button style={s.btn} onClick={onLabelModeToggle} title="ラベル表示切替">
          {labelMode === "name" ? <Tag size={15} /> : <Tags size={15} />}
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
    gap: "12px",
    padding: "8px 16px",
    background: "rgba(13,31,53,0.95)",
    borderBottom: "1px solid var(--gold-line)",
    flexShrink: 0,
    backdropFilter: "blur(8px)",
    zIndex: 10,
  },
  title: {
    fontSize: "15px",
    fontWeight: "700",
    color: "var(--gold)",
    letterSpacing: "0.08em",
    whiteSpace: "nowrap",
  },
  search: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--gold-line)",
    borderRadius: "8px",
    padding: "5px 10px",
    minWidth: 0,
  },
  searchInput: {
    flex: 1,
    background: "none",
    border: "none",
    outline: "none",
    color: "var(--gold)",
    fontSize: "13px",
    minWidth: 0,
  },
  count: {
    fontSize: "11px",
    color: "var(--gold-dim)",
    whiteSpace: "nowrap",
  },
  navBtn: {
    background: "none",
    border: "none",
    color: "var(--gold-dim)",
    fontSize: "13px",
    cursor: "pointer",
    padding: "0 2px",
    lineHeight: 1,
  },
  clearBtn: {
    background: "none",
    border: "none",
    color: "var(--gold-dim)",
    fontSize: "12px",
    cursor: "pointer",
    padding: "0 2px",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flexShrink: 0,
  },
  badge: {
    fontSize: "10px",
    color: "#fbbf24",
    background: "rgba(251,191,36,0.1)",
    border: "1px solid rgba(251,191,36,0.3)",
    borderRadius: "10px",
    padding: "2px 8px",
    whiteSpace: "nowrap",
  },
  btn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "5px 10px",
    background: "rgba(232,213,176,0.06)",
    border: "1px solid var(--gold-line)",
    borderRadius: "8px",
    color: "var(--gold-dim)",
    fontSize: "13px",
    cursor: "pointer",
  },
  btnLabel: { fontSize: "12px" },
};
