import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import Header from "./components/Header";
import MapCanvas from "./components/MapCanvas";
import Breadcrumb from "./components/Breadcrumb";
import Sidebar from "./components/Sidebar";
import ContextMenu from "./components/ContextMenu";
import FilterPanel from "./components/FilterPanel";
import { sampleNodes } from "./data/sampleNodes";

export default function App() {
  const [nodes, setNodes] = useState(sampleNodes);
  const [rootNodeId, setRootNodeId] = useState(() => {
    const stored = localStorage.getItem("rootNodeId");
    const dataRootId = sampleNodes.find(n => !n.parentId)?.id ?? null;
    return sampleNodes.some(n => n.id === stored) ? stored : dataRootId;
  });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [labelMode, setLabelMode] = useState("name");
  const [addingForId, setAddingForId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchIndex, setSearchIndex] = useState(0);
  const [filterActive, setFilterActive] = useState("all");
  const [showFilter, setShowFilter] = useState(false);
  const fitRef = useRef(null);
  const headerRef = useRef(null);

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;
  const contextNode = contextMenu ? nodes.find(n => n.id === contextMenu.nodeId) : null;
  const contextHasChildren = contextNode ? nodes.some(n => n.parentId === contextNode.id) : false;

  const searchMatchIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return nodes.filter(n => n.name.toLowerCase().includes(q)).map(n => n.id);
  }, [nodes, searchQuery]);

  const focusNodeId = searchMatchIds.length > 0
    ? searchMatchIds[((searchIndex % searchMatchIds.length) + searchMatchIds.length) % searchMatchIds.length]
    : null;

  const highlightIds = useMemo(() => new Set(searchMatchIds), [searchMatchIds]);

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

  const handleAddNode = useCallback((nodeData) => {
    setNodes(prev => [...prev, nodeData]);
    setAddingForId(null);
    setSelectedNodeId(nodeData.parentId);
  }, []);

  const handleUpdateNode = useCallback((nodeData) => {
    setNodes(prev => prev.map(n => n.id === nodeData.id ? nodeData : n));
  }, []);

  const handleDeleteNode = useCallback((nodeId) => {
    const target = nodes.find(n => n.id === nodeId);
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setSelectedNodeId(target?.parentId ?? null);
    if (nodeId === rootNodeId) {
      setRootNodeId(nodes.find(n => !n.parentId && n.id !== nodeId)?.id ?? null);
    }
  }, [nodes, rootNodeId]);

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

  return (
    <div style={s.app}>
      <div ref={headerRef} style={s.headerWrap}>
        <Header
          labelMode={labelMode}
          onLabelModeToggle={() => setLabelMode(m => m === "name" ? "name+rank" : "name")}
          onFitScreen={handleFitScreen}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchCount={searchMatchIds.length}
          searchIndex={searchIndex}
          onSearchNav={handleSearchNav}
          filterActive={filterActive}
          onFilterToggle={() => setShowFilter(v => !v)}
        />
        {showFilter && (
          <FilterPanel
            filterActive={filterActive}
            onFilterActiveChange={setFilterActive}
            onReset={() => setFilterActive("all")}
            onClose={() => setShowFilter(false)}
          />
        )}
      </div>
      <div style={s.main}>
        <MapCanvas
          nodes={nodes}
          rootNodeId={rootNodeId}
          selectedNodeId={selectedNodeId}
          labelMode={labelMode}
          highlightIds={highlightIds}
          focusNodeId={focusNodeId}
          filterActive={filterActive}
          onSelectNode={setSelectedNodeId}
          onContextMenu={handleContextMenu}
          fitRef={fitRef}
        />
        <Sidebar
          node={selectedNode}
          addingForId={addingForId}
          nodes={nodes}
          rootNodeId={rootNodeId}
          onClose={handleSidebarClose}
          onUpdate={handleUpdateNode}
          onAdd={handleAddNode}
          onDelete={handleDeleteNode}
          onAddChild={handleAddChild}
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
};
