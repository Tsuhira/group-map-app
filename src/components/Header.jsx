import { Maximize2, Tag, Tags, Search, SlidersHorizontal, Download, Upload, UserCircle2 } from "lucide-react";
import { useBreakpoint } from "../hooks/useBreakpoint";

export default function Header({
  labelMode, onLabelModeToggle, onFitScreen,
  searchQuery, onSearchChange, searchCount, searchIndex, onSearchNav,
  filterActive, onFilterToggle,
  onExport, onImport,
  mode, userNodeId, onGoToMyNode,
}) {
  const { isMobile, isTablet } = useBreakpoint();

  return (
    <header style={{ ...s.header, padding: isMobile ? "6px 10px" : "8px 16px" }}>
      {!isMobile && <span style={s.title}>グループマップ</span>}

      {/* 検索バー */}
      <div style={{ ...s.search, minWidth: isMobile ? 0 : 120 }}>
        <Search size={13} color="var(--gold-dim)" style={{ flexShrink: 0 }} />
        <input
          style={s.searchInput}
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={isMobile ? "検索…" : "ノード名を検索…"}
        />
        {searchQuery && (
          <>
            <span style={s.count}>{searchCount}件</span>
            <button style={s.navBtn} onClick={() => onSearchNav(-1)}>↑</button>
            <button style={s.navBtn} onClick={() => onSearchNav(1)}>↓</button>
            <button style={s.clearBtn} onClick={() => onSearchChange("")}>✕</button>
          </>
        )}
      </div>

      {/* コントロール */}
      <div style={s.controls}>
        {mode === "firestore" && (
          <span style={s.modeBadge} title="くまさん王国と同期中">🐻</span>
        )}
        {userNodeId && (
          <IconBtn icon={<UserCircle2 size={15} />} onClick={onGoToMyNode} title="自分のノードへ" />
        )}
        {filterActive !== "all" && (
          <span style={s.badge}>{isMobile ? "●" : "フィルター適用中"}</span>
        )}
        <IconBtn icon={<SlidersHorizontal size={15} />} label={isTablet ? null : "フィルター"} onClick={onFilterToggle} title="フィルター" />
        <IconBtn icon={<Maximize2 size={15} />} onClick={onFitScreen} title="全体フィット" />
        <IconBtn
          icon={labelMode === "name" ? <Tag size={15} /> : <Tags size={15} />}
          label={isTablet ? null : (labelMode === "name" ? "名前のみ" : "名前+ピン")}
          onClick={onLabelModeToggle}
          title="ラベル表示切替"
        />
        <IconBtn icon={<Download size={15} />} onClick={onExport} title="エクスポート" />
        <IconBtn icon={<Upload size={15} />} onClick={onImport} title="インポート" />
      </div>
    </header>
  );
}

function IconBtn({ icon, label, onClick, title }) {
  return (
    <button style={{ ...s.btn, padding: label ? "6px 10px" : "6px 8px" }} onClick={onClick} title={title}>
      {icon}
      {label && <span style={s.btnLabel}>{label}</span>}
    </button>
  );
}

const s = {
  header: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(13,31,53,0.95)",
    borderBottom: "1px solid var(--gold-line)",
    flexShrink: 0,
    backdropFilter: "blur(8px)",
    zIndex: 10,
    minHeight: 48,
    paddingTop: "env(safe-area-inset-top, 0px)",
    paddingLeft: "env(safe-area-inset-left, 0px)",
    paddingRight: "env(safe-area-inset-right, 0px)",
  },
  title: {
    fontSize: "15px",
    fontWeight: "700",
    color: "var(--gold)",
    letterSpacing: "0.08em",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  search: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "5px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid var(--gold-line)",
    borderRadius: "8px",
    padding: "6px 10px",
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
    minWidth: 24,
    minHeight: 24,
  },
  clearBtn: {
    background: "none",
    border: "none",
    color: "var(--gold-dim)",
    fontSize: "12px",
    cursor: "pointer",
    padding: "0 2px",
    minWidth: 24,
    minHeight: 24,
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flexShrink: 0,
  },
  modeBadge: {
    fontSize: "14px",
    lineHeight: 1,
    padding: "0 2px",
  },
  badge: {
    fontSize: "10px",
    color: "#fbbf24",
    background: "rgba(251,191,36,0.1)",
    border: "1px solid rgba(251,191,36,0.3)",
    borderRadius: "10px",
    padding: "2px 6px",
    whiteSpace: "nowrap",
  },
  btn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    background: "rgba(232,213,176,0.06)",
    border: "1px solid var(--gold-line)",
    borderRadius: "8px",
    color: "var(--gold-dim)",
    fontSize: "13px",
    cursor: "pointer",
    minHeight: 36,
  },
  btnLabel: { fontSize: "12px" },
};
