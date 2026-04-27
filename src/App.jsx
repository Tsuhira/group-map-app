import { useState, useRef, useCallback } from "react";
import Header from "./components/Header";
import MapCanvas from "./components/MapCanvas";
import Breadcrumb from "./components/Breadcrumb";
import { sampleNodes } from "./data/sampleNodes";

export default function App() {
  const [nodes] = useState(sampleNodes);
  const [rootNodeId, setRootNodeId] = useState(
    sampleNodes.find(n => !n.parentId)?.id ?? null
  );
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [layoutDir, setLayoutDir] = useState("TB");
  const fitRef = useRef(null);

  const handleLayoutToggle = () =>
    setLayoutDir(d => (d === "TB" ? "LR" : "TB"));

  const handleFitScreen = useCallback(() => {
    fitRef.current?.();
  }, []);

  return (
    <div style={s.app}>
      <Header
        layoutDir={layoutDir}
        onLayoutToggle={handleLayoutToggle}
        onFitScreen={handleFitScreen}
      />
      <div style={s.main}>
        <MapCanvas
          nodes={nodes}
          rootNodeId={rootNodeId}
          selectedNodeId={selectedNodeId}
          layoutDir={layoutDir}
          onSelectNode={setSelectedNodeId}
          fitRef={fitRef}
        />
      </div>
      <Breadcrumb
        nodes={nodes}
        rootNodeId={rootNodeId}
        onSetRoot={id => { setRootNodeId(id); setSelectedNodeId(null); }}
      />
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
  main: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
};
