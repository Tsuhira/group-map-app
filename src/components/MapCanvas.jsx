import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";

const LEVEL_RADIUS = 180; // 階層ごとの半径間隔
const NODE_RX = 60;
const NODE_RY = 22;

// 極座標 → 直交座標
function radialPoint(angle, r) {
  return [r * Math.cos(angle - Math.PI / 2), r * Math.sin(angle - Math.PI / 2)];
}

export default function MapCanvas({ nodes, rootNodeId, selectedNodeId, layoutDir: _unused, onSelectNode, fitRef }) {
  const svgRef = useRef(null);
  const zoomRef = useRef(null);

  const buildHierarchy = useCallback(() => {
    const map = Object.fromEntries(nodes.map(n => [n.id, { ...n, children: [] }]));
    nodes.forEach(n => {
      if (n.parentId && map[n.parentId]) map[n.parentId].children.push(map[n.id]);
    });
    const startId = rootNodeId ?? nodes.find(n => !n.parentId)?.id;
    return startId ? map[startId] : null;
  }, [nodes, rootNodeId]);

  const fitToScreen = useCallback((svg, g, width, height) => {
    const bounds = g.node().getBBox();
    if (!bounds.width || !bounds.height) return;
    const padding = 60;
    const scale = Math.min(
      (width - padding * 2) / bounds.width,
      (height - padding * 2) / bounds.height,
      1.2
    );
    const tx = width / 2 - (bounds.x + bounds.width / 2) * scale;
    const ty = height / 2 - (bounds.y + bounds.height / 2) * scale;
    svg.transition().duration(400).call(
      zoomRef.current.transform,
      d3.zoomIdentity.translate(tx, ty).scale(scale)
    );
  }, []);

  useEffect(() => {
    const svgEl = svgRef.current;
    const svg = d3.select(svgEl);
    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;

    svg.selectAll("*").remove();

    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", e => g.attr("transform", e.transform));
    zoomRef.current = zoom;
    svg.call(zoom);

    const g = svg.append("g");
    if (fitRef) fitRef.current = () => fitToScreen(svg, g, width, height);

    const data = buildHierarchy();
    if (!data) return;

    const root = d3.hierarchy(data, d => d.children?.length ? d.children : null);
    const maxDepth = root.height || 1;
    const radius = maxDepth * LEVEL_RADIUS;

    d3.tree()
      .size([2 * Math.PI, radius])
      .separation((a, b) => (a.parent === b.parent ? 1 : 2) / a.depth)
      (root);

    // ── 接続線（直線）────────────────────────────────
    g.append("g").attr("class", "links")
      .selectAll("line")
      .data(root.links())
      .join("line")
      .attr("x1", d => radialPoint(d.source.x, d.source.y)[0])
      .attr("y1", d => radialPoint(d.source.x, d.source.y)[1])
      .attr("x2", d => radialPoint(d.target.x, d.target.y)[0])
      .attr("y2", d => radialPoint(d.target.x, d.target.y)[1])
      .attr("stroke", d => d.target.data.active
        ? "rgba(232,213,176,0.3)"
        : "rgba(232,213,176,0.12)"
      )
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", d => d.target.data.active ? null : "5 4");

    // ── ノード ────────────────────────────────────────
    const nodeG = g.append("g").attr("class", "nodes")
      .selectAll("g")
      .data(root.descendants())
      .join("g")
      .attr("transform", d => {
        const [x, y] = radialPoint(d.x, d.y);
        return `translate(${x},${y})`;
      })
      .attr("cursor", "pointer")
      .on("click", (event, d) => {
        event.stopPropagation();
        onSelectNode(d.data.id);
      });

    // 楕円
    nodeG.append("ellipse")
      .attr("rx", NODE_RX)
      .attr("ry", NODE_RY)
      .attr("fill", d => d.data.active ? "#1e4470" : "#1a2a3a")
      .attr("stroke", d => d.data.id === selectedNodeId
        ? "#e8d5b0"
        : "rgba(232,213,176,0.35)"
      )
      .attr("stroke-width", d => d.data.id === selectedNodeId ? 2.5 : 1.5)
      .attr("opacity", d => d.data.active ? 1 : 0.5);

    // ラベル
    nodeG.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "var(--gold)")
      .attr("font-size", "12px")
      .attr("pointer-events", "none")
      .text(d => d.data.name);

    // 空白クリックで選択解除
    svg.on("click", () => onSelectNode(null));

    // 初回フィット（中心を画面中央に）
    const initTx = width / 2;
    const initTy = height / 2;
    svg.call(zoom.transform, d3.zoomIdentity.translate(initTx, initTy));
    setTimeout(() => fitToScreen(svg, g, width, height), 50);

  }, [nodes, rootNodeId, selectedNodeId, buildHierarchy, fitToScreen, onSelectNode, fitRef]);

  return (
    <svg
      ref={svgRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
