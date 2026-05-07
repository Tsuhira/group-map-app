import { useState, useEffect, useRef } from "react";
import { Search, SlidersHorizontal, Download, Upload, UserCircle2 } from "lucide-react";
import { useBreakpoint } from "../hooks/useBreakpoint";

export default function Header({
  searchQuery, onSearchChange, searchCount, searchIndex, onSearchNav,
  isFilterActive, onFilterToggle,
  onExport, onImport,
  mode, userNodeId, onGoToMyNode,
  hasGlobalMap, onGoToGlobalMap,
  maps, currentMapId, onSwitchMap, onCreateMap,
}) {
  const { isMobile, isTablet } = useBreakpoint();
  const [showUploadPopover, setShowUploadPopover] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!showUploadPopover) return;
    const close = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowUploadPopover(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showUploadPopover]);

  const currentMapName = maps?.find(m => m.id === currentMapId)?.name ?? currentMapId;
  const isNonDefaultMap = currentMapId !== "groupmap";

  const handleUploadClick = () => {
    if (mode === "firestore") {
      setShowUploadPopover(v => !v);
    } else {
      onImport();
    }
  };

  return (
    <header style={{ ...s.header, padding: isMobile ? "6px 10px" : "8px 16px" }}>
      {!isMobile && <span style={s.title}>グループマップ</span>}

      {/* 現在のマップ名（非デフォルト時のみ） */}
      {mode === "firestore" && isNonDefaultMap && (
        <span style={s.mapBadge} title={currentMapName}>
          {currentMapName.length > 10 ? currentMapName.slice(0, 10) + "…" : currentMapName}
        </span>
      )}

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
        {hasGlobalMap && (
          <button style={s.btn} onClick={onGoToGlobalMap} title="全体マップ">
            <span style={{ fontSize: "14px", lineHeight: 1 }}>🌐</span>
          </button>
        )}
        {userNodeId && (
          <IconBtn icon={<UserCircle2 size={15} />} onClick={onGoToMyNode} title="自分のノードへ" />
        )}
        <IconBtn
          icon={<SlidersHorizontal size={15} />}
          label={isTablet ? null : "フィルター"}
          onClick={onFilterToggle}
          title="フィルター"
          active={isFilterActive}
        />
        <IconBtn icon={<Download size={15} />} onClick={onExport} title="エクスポート" />

        {/* Upload ボタン＋ポップオーバー */}
        <div style={{ position: "relative" }} ref={popoverRef}>
          <IconBtn icon={<Upload size={15} />} onClick={handleUploadClick} title="読み込み" />
          {showUploadPopover && (
            <UploadPopover
              maps={maps}
              currentMapId={currentMapId}
              onLocalImport={() => { onImport(); setShowUploadPopover(false); }}
              onSwitchMap={(id) => { onSwitchMap(id); setShowUploadPopover(false); }}
              onCreateMap={async (name) => { await onCreateMap(name); setShowUploadPopover(false); }}
            />
          )}
        </div>
      </div>
    </header>
  );
}

function UploadPopover({ maps, currentMapId, onLocalImport, onSwitchMap, onCreateMap }) {
  const [creating, setCreating] = useState(false);
  const [newMapName, setNewMapName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!newMapName.trim()) return;
    setSaving(true);
    try {
      await onCreateMap(newMapName);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={p.popover}>
      <button style={p.item} onClick={onLocalImport}>
        📂 ローカルから読み込み
      </button>

      <div style={p.divider} />

      {maps?.map(m => (
        <button
          key={m.id}
          style={{ ...p.item, ...(m.id === currentMapId ? p.activeItem : {}) }}
          onClick={() => m.id !== currentMapId && onSwitchMap(m.id)}
          disabled={m.id === currentMapId}
        >
          <span style={{ flex: 1 }}>☁️ {m.name}</span>
          {m.id === currentMapId && <span style={p.activeBadge}>現在</span>}
        </button>
      ))}

      <div style={p.divider} />

      {!creating ? (
        <button style={{ ...p.item, color: "#6ee7b7" }} onClick={() => setCreating(true)}>
          ＋ 新しいマップを作成
        </button>
      ) : (
        <div style={p.createRow}>
          <input
            style={p.input}
            value={newMapName}
            onChange={e => setNewMapName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreate()}
            placeholder="マップ名…"
            autoFocus
          />
          <button
            style={{ ...p.createBtn, opacity: (!newMapName.trim() || saving) ? 0.5 : 1 }}
            onClick={handleCreate}
            disabled={!newMapName.trim() || saving}
          >
            {saving ? "…" : "作成"}
          </button>
        </div>
      )}
    </div>
  );
}

function IconBtn({ icon, label, onClick, title, active }) {
  return (
    <button
      style={{
        ...s.btn,
        padding: label ? "6px 10px" : "6px 8px",
        ...(active ? s.btnActive : {}),
      }}
      onClick={onClick}
      title={title}
    >
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
  mapBadge: {
    fontSize: "11px",
    color: "#6ee7b7",
    background: "rgba(110,231,183,0.10)",
    border: "1px solid rgba(110,231,183,0.35)",
    borderRadius: "10px",
    padding: "3px 8px",
    whiteSpace: "nowrap",
    flexShrink: 0,
    maxWidth: 120,
    overflow: "hidden",
    textOverflow: "ellipsis",
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
  count: { fontSize: "11px", color: "var(--gold-dim)", whiteSpace: "nowrap" },
  navBtn: {
    background: "none", border: "none", color: "var(--gold-dim)",
    fontSize: "13px", cursor: "pointer", padding: "0 2px",
    lineHeight: 1, minWidth: 24, minHeight: 24,
  },
  clearBtn: {
    background: "none", border: "none", color: "var(--gold-dim)",
    fontSize: "12px", cursor: "pointer", padding: "0 2px",
    minWidth: 24, minHeight: 24,
  },
  controls: { display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 },
  modeBadge: { fontSize: "14px", lineHeight: 1, padding: "0 2px" },
  badge: {
    fontSize: "10px", color: "#fbbf24",
    background: "rgba(251,191,36,0.1)",
    border: "1px solid rgba(251,191,36,0.3)",
    borderRadius: "10px", padding: "2px 6px", whiteSpace: "nowrap",
  },
  btn: {
    display: "flex", alignItems: "center", gap: "5px",
    background: "rgba(232,213,176,0.06)",
    border: "1px solid var(--gold-line)",
    borderRadius: "8px", color: "var(--gold-dim)",
    fontSize: "13px", cursor: "pointer", minHeight: 36,
  },
  btnActive: {
    background: "rgba(251,191,36,0.12)",
    border: "1px solid rgba(251,191,36,0.5)",
    color: "#fbbf24",
  },
  btnLabel: { fontSize: "12px" },
};

const p = {
  popover: {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    minWidth: 200,
    background: "rgba(13,31,53,0.98)",
    border: "1px solid var(--gold-line)",
    borderRadius: 10,
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    zIndex: 200,
    overflow: "hidden",
  },
  item: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "10px 14px",
    background: "none",
    border: "none",
    color: "var(--gold)",
    fontSize: 13,
    cursor: "pointer",
    textAlign: "left",
    gap: 6,
  },
  activeItem: {
    color: "var(--gold-dim)",
    cursor: "default",
    background: "rgba(255,255,255,0.03)",
  },
  activeBadge: {
    fontSize: 10,
    color: "#6ee7b7",
    background: "rgba(110,231,183,0.12)",
    border: "1px solid rgba(110,231,183,0.3)",
    borderRadius: 8,
    padding: "1px 6px",
  },
  divider: { height: 1, background: "var(--gold-line)", margin: "2px 0" },
  createRow: {
    display: "flex",
    gap: 6,
    padding: "8px 10px",
  },
  input: {
    flex: 1,
    padding: "6px 8px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid var(--gold-line)",
    borderRadius: 6,
    color: "var(--gold)",
    fontSize: 12,
    outline: "none",
  },
  createBtn: {
    padding: "6px 10px",
    background: "rgba(110,231,183,0.12)",
    border: "1px solid rgba(110,231,183,0.4)",
    borderRadius: 6,
    color: "#6ee7b7",
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
};
