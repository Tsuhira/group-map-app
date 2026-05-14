import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import Header from "./components/Header";
import MapCanvas from "./components/MapCanvas";
import Breadcrumb from "./components/Breadcrumb";
import Sidebar, { ROOT_SENTINEL } from "./components/Sidebar";
import ContextMenu from "./components/ContextMenu";
import FilterPanel from "./components/FilterPanel";
import { useAuth } from "./hooks/useAuth";
import { useNodes } from "./hooks/useNodes";
import JapanMapOverlay from "./components/JapanMapOverlay";
import * as fs from "./lib/firestoreRest";

function exportNodes(nodes) {
  const json = JSON.stringify({ version: 1, nodes }, null, 2);
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([json], { type: "application/json" })),
    download: `group-map-${new Date().toISOString().slice(0, 10)}.json`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

function validateImport(parsed) {
  if (!parsed?.nodes || !Array.isArray(parsed.nodes)) return "nodes配列がありません";
  for (const n of parsed.nodes) {
    if (typeof n.id !== "string" || !n.id) return "idが不正なノードがあります";
    if (typeof n.name !== "string") return "nameが不正なノードがあります";
  }
  return null;
}

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [currentMapId, setCurrentMapId] = useState("groupmap");
  const [maps, setMaps] = useState([{ id: "groupmap", name: "グループマップ" }]);
  const { nodes, mode, addNode, updateNode, deleteNode, replaceAll } = useNodes(user, authLoading, currentMapId);

  useEffect(() => {
    if (!user) return;
    fs.listMaps(user.idToken).then(setMaps).catch(() => {});
  }, [user]);

  const [rootNodeId, setRootNodeId] = useState(localStorage.getItem("rootNodeId") || null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [labelMode, setLabelMode] = useState("name");
  const [addingForId, setAddingForId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);
  const [filterActive, setFilterActive] = useState("active");
  const [filterStatuses, setFilterStatuses] = useState(new Set(["ABO", "PC"]));
  const [filterBirthYear, setFilterBirthYear] = useState(null);
  const [showFilter, setShowFilter] = useState(false);
  const [showJapanMap, setShowJapanMap] = useState(false);
  const fitRef = useRef(null);
  const headerRef = useRef(null);
  const importInputRef = useRef(null);

  // rootNodeId を nodes に合わせてバリデーション（無効になった時だけリセット）
  useEffect(() => {
    if (!nodes || nodes.length === 0) return;
    if (rootNodeId && nodes.some(n => n.id === rootNodeId)) return; // 有効なら何もしない
    const rootNodes = nodes.filter(n => !n.parentId);
    const newId = rootNodes.length === 1 ? rootNodes[0].id : null;
    setRootNodeId(newId);
    if (newId) localStorage.setItem("rootNodeId", newId);
    else localStorage.removeItem("rootNodeId");
  }, [nodes]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedNode = nodes?.find(n => n.id === selectedNodeId) ?? null;
  const contextNode = contextMenu ? nodes?.find(n => n.id === contextMenu.nodeId) : null;
  const contextHasChildren = contextNode ? nodes?.some(n => n.parentId === contextNode.id) : false;

  // ログインユーザーに紐付いたノード
  const userNodeId = user && nodes
    ? (nodes.find(n => n.userId === user.uid)?.id ?? null)
    : null;

  // ツリーの真のルート（全体マップの起点）
  const trueRootId = nodes?.find(n => !n.parentId)?.id ?? null;

  const searchMatchIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || !nodes) return [];
    return nodes.filter(n => n.name.toLowerCase().includes(q)).map(n => n.id);
  }, [nodes, searchQuery]);

  const birthYearMatchIds = useMemo(() => {
    if (filterBirthYear == null || !nodes) return [];
    return nodes.filter(n => {
      if (!n.birthYear || !n.birthDate) return false;
      const year = parseInt(n.birthYear);
      const month = parseInt(n.birthDate.slice(0, 2));
      const sy = month >= 4 ? year : year - 1;
      return sy === filterBirthYear;
    }).map(n => n.id);
  }, [nodes, filterBirthYear]);

  const focusNodeId = searchMatchIds.length > 0
    ? searchMatchIds[((searchIndex % searchMatchIds.length) + searchMatchIds.length) % searchMatchIds.length]
    : null;

  const highlightIds = useMemo(
    () => new Set([...searchMatchIds, ...birthYearMatchIds]),
    [searchMatchIds, birthYearMatchIds]
  );

  useEffect(() => { setSearchIndex(0); }, [searchQuery]);

  const handleSearchNav = useCallback((dir) => {
    setSearchIndex(i => {
      const len = searchMatchIds.length;
      if (!len) return 0;
      return ((i + dir) % len + len) % len;
    });
  }, [searchMatchIds.length]);

  const handleSetRoot = useCallback((id) => {
    setRootNodeId(id);
    localStorage.setItem("rootNodeId", id);
    setSelectedNodeId(null);
  }, []);

  const handleGoToGlobalMap = useCallback(() => {
    setRootNodeId(null);
    localStorage.removeItem("rootNodeId");
    setSelectedNodeId(null);
  }, []);

  const handleSwitchMap = useCallback((mapId) => {
    setCurrentMapId(mapId);
    setRootNodeId(null);
    localStorage.removeItem("rootNodeId");
    setSelectedNodeId(null);
    setAddingForId(null);
  }, []);

  const handleCreateMap = useCallback(async (name) => {
    const mapId = `map_${Date.now()}`;
    await fs.createMap(mapId, name.trim(), user.idToken);
    const newMap = { id: mapId, name: name.trim() };
    setMaps(prev => [...prev, newMap]);
    handleSwitchMap(mapId);
  }, [user, handleSwitchMap]);

  const handleAddNode = useCallback(async (nodeData) => {
    await addNode(nodeData);
    setAddingForId(null);
    setSelectedNodeId(nodeData.parentId);
  }, [addNode]);

  const handleUpdateNode = useCallback(async (nodeData) => {
    await updateNode(nodeData);
  }, [updateNode]);

  const handleAddRoot = useCallback(() => {
    setRootNodeId(null);
    localStorage.removeItem("rootNodeId");
    setAddingForId(ROOT_SENTINEL);
    setSelectedNodeId(null);
  }, []);

  const handleDeleteNode = useCallback(async (nodeId) => {
    const target = nodes?.find(n => n.id === nodeId);
    await deleteNode(nodeId);
    setSelectedNodeId(target?.parentId ?? null);
    if (nodeId === rootNodeId) {
      const dataRoot = nodes?.find(n => !n.parentId && n.id !== nodeId);
      setRootNodeId(dataRoot?.id ?? null);
    }
  }, [nodes, rootNodeId, deleteNode]);

  const handleAddChild = useCallback((parentId) => {
    setAddingForId(parentId);
    setSelectedNodeId(null);
  }, []);

  const handleSidebarClose = useCallback(() => {
    setSelectedNodeId(null);
    setAddingForId(null);
  }, []);

  const handleContextMenu = useCallback((nodeId, x, y) => {
    setContextMenu({ nodeId, x, y });
  }, []);

  const handleFitScreen = useCallback(() => fitRef.current?.(), []);

  const handleExport = useCallback(() => nodes && exportNodes(nodes), [nodes]);

  const handleImport = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = async (ev) => {
      let parsed;
      try {
        parsed = JSON.parse(ev.target.result);
      } catch {
        alert("JSONの解析に失敗しました（不正なJSON形式）");
        return;
      }
      const err = validateImport(parsed);
      if (err) { alert(`インポートエラー: ${err}`); return; }
      try {
        const newNodes = parsed.nodes;
        const rootNodes = newNodes.filter(n => !n.parentId);
        const newRootId = rootNodes.length === 1 ? rootNodes[0].id : null;
        await replaceAll(newNodes);
        setRootNodeId(newRootId);
        if (newRootId) localStorage.setItem("rootNodeId", newRootId);
        else localStorage.removeItem("rootNodeId");
        setSelectedNodeId(null);
        setAddingForId(null);
      } catch (e) {
        alert(`インポートエラー: ${e.message}`);
      }
    };
    reader.readAsText(file);
  }, [replaceAll]);

  if (authLoading || nodes === null) {
    return (
      <div style={s.loading}>
        <span style={s.loadingText}>読み込み中…</span>
      </div>
    );
  }

  return (
    <div style={s.app}>
      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleImport}
      />
      <div ref={headerRef} style={s.headerWrap}>
        <Header
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchCount={searchMatchIds.length}
          searchIndex={searchIndex}
          onSearchNav={handleSearchNav}
          isFilterActive={filterActive !== "all" || filterBirthYear !== null}
          onFilterToggle={() => setShowFilter(v => !v)}
          onExport={handleExport}
          onImport={() => importInputRef.current?.click()}
          mode={mode}
          userNodeId={userNodeId}
          onGoToMyNode={() => userNodeId && handleSetRoot(userNodeId)}
          hasGlobalMap={!!trueRootId}
          onGoToGlobalMap={handleGoToGlobalMap}
          maps={maps}
          currentMapId={currentMapId}
          onSwitchMap={handleSwitchMap}
          onCreateMap={handleCreateMap}
        />
        {showFilter && (
          <FilterPanel
            filterActive={filterActive}
            onFilterActiveChange={setFilterActive}
            filterStatuses={filterStatuses}
            onFilterStatusesChange={status => setFilterStatuses(prev => {
              const next = new Set(prev);
              if (next.has(status)) next.delete(status); else next.add(status);
              return next;
            })}
            filterBirthYear={filterBirthYear}
            onFilterBirthYearChange={setFilterBirthYear}
            labelMode={labelMode}
            onLabelModeToggle={() => setLabelMode(m => m === "name" ? "name+rank" : "name")}
            onReset={() => { setFilterActive("all"); setFilterStatuses(new Set()); setFilterBirthYear(null); }}
            onClose={() => setShowFilter(false)}
          />
        )}
      </div>
      <div style={s.main}>
        {nodes.length === 0 && !addingForId && (
          <div style={s.emptyState}>
            <p style={s.emptyText}>ノードがありません</p>
            <button style={s.emptyBtn} onClick={() => setAddingForId(ROOT_SENTINEL)}>
              ＋ 最初のノードを作成
            </button>
          </div>
        )}
        <MapCanvas
          nodes={nodes}
          rootNodeId={rootNodeId}
          selectedNodeId={selectedNodeId}
          labelMode={labelMode}
          highlightIds={highlightIds}
          focusNodeId={focusNodeId}
          filterActive={filterActive}
          filterStatuses={filterStatuses}
          onSelectNode={setSelectedNodeId}
          onContextMenu={handleContextMenu}
          fitRef={fitRef}
          currentUserUid={user?.uid}
          onOpenJapanMap={() => setShowJapanMap(true)}
        />
        {showJapanMap && (
          <JapanMapOverlay nodes={nodes} onClose={() => setShowJapanMap(false)} />
        )}
        <Sidebar
          node={selectedNode}
          addingForId={addingForId}
          nodes={nodes}
          rootNodeId={rootNodeId}
          user={user}
          userNodeId={userNodeId}
          onClose={handleSidebarClose}
          onUpdate={handleUpdateNode}
          onAdd={handleAddNode}
          onDelete={handleDeleteNode}
          onAddChild={handleAddChild}
          onAddRoot={handleAddRoot}
          onSetRoot={handleSetRoot}
        />
      </div>
      <Breadcrumb
        nodes={nodes}
        rootNodeId={rootNodeId}
        onSetRoot={handleSetRoot}
      />
      {contextMenu && contextNode && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          node={contextNode}
          hasChildren={contextHasChildren}
          onEdit={() => setSelectedNodeId(contextNode.id)}
          onAddChild={() => handleAddChild(contextNode.id)}
          onAddRoot={handleAddRoot}
          onSetRoot={() => handleSetRoot(contextNode.id)}
          onDelete={() => {
            if (!window.confirm(`「${contextNode.name}」を削除しますか？`)) return;
            handleDeleteNode(contextNode.id);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

const s = {
  app: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
  },
  headerWrap: {
    position: "relative",
    flexShrink: 0,
    zIndex: 10,
  },
  main: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  emptyState: {
    position: "absolute",
    inset: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    pointerEvents: "none",
    zIndex: 5,
  },
  emptyText: {
    color: "var(--gold-dim)",
    fontSize: 14,
    margin: 0,
  },
  emptyBtn: {
    pointerEvents: "auto",
    padding: "10px 20px",
    background: "rgba(110,231,183,0.10)",
    border: "1px solid rgba(110,231,183,0.4)",
    borderRadius: 10,
    color: "#6ee7b7",
    fontSize: 14,
    cursor: "pointer",
  },
  loading: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--bg)",
  },
  loadingText: {
    color: "var(--gold-dim)",
    fontSize: 14,
  },
};
