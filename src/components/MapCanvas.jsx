import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";

const NODE_RX = 70;
const NODE_RY = 28;
const NODE_MARGIN_X = 60;
const NODE_MARGIN_Y = 80;

export default function MapCanvas({ nodes, rootNodeId, selectedNodeId, layoutDir, onSelectNode, fitRef }) {
  const svgRef = useRef(null);
  const zoomRef = useRef(null);
  const gRef = useRef(null);

  const buildTree = useCallback(() => {
    const nodeMap = Object.fromEntries(nodes.map(n => [n.id, { ...n, children: [] }]));
    let root = null;
    nodes.forEach(n => {
      if (n.parentId && nodeMap[n.parentId]) {
        nodeMap[n.parentId].children.push(nodeMap[n.id]);
      }
    });
    // 規定ノードを起点にする
    const startId = rootNodeId || nodes.find(n => !n.parentId)?.id;
    root = startId ? nodeMap[startId] : null;
    return root;
  }, [nodes, rootNodeId]);

  const fitToScreen = useCallback((svg, g, width, height) => {
    const bounds = g.node().getBBox();
    if (!bounds.width || !bounds.height) return;
    const padding = 40;
    const scale = Math.min(
      (width - padding * 2) / bounds.width,
      (height - padding * 2) / bounds.height,
      1.5
    );
    const tx = (width - bounds.width * scale) / 2 - bounds.x * scale;
    const ty = (height - bounds.height * scale) / 2 - bounds.y * scale;
    svg.call(
      zoomRef.current.transform,
      d3.zoomIdentity.translate(tx, ty).scale(scale)
    );
  }, []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg.selectAll("*").remove();

    // ズーム設定
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    zoomRef.current = zoom;
    svg.call(zoom);
    svg.on("dblclick.zoom", null); // デフォルトのダブルクリックズームを無効化

    const g = svg.append("g").attr("class", "zoom-layer");
    gRef.current = g;
    if (fitRef) fitRef.current = () => fitToScreen(svg, g, width, height);

    const treeData = buildTree();
    if (!treeData) return;

    const root = d3.hierarchy(treeData, d => d.children?.length ? d.children : null);

    // ツリーレイアウト
    const isLR = layoutDir === "LR";
    const nodeW = NODE_RX * 2 + NODE_MARGIN_X;
    const nodeH = NODE_RY * 2 + NODE_MARGIN_Y;
    const treeLayout = d3.tree().nodeSize(
      isLR ? [nodeH, nodeW] : [nodeW, nodeH]
    );
    treeLayout(root);

    // 接続線
    const linkGen = isLR
      ? d3.linkHorizontal().x(d => d.y).y(d => d.x)
      : d3.linkVertical().x(d => d.x).y(d => d.y);

    g.append("g").attr("class", "links")
      .selectAll("path")
      .data(root.links())
      .join("path")
      .attr("d", linkGen)
      .attr("fill", "none")
      .attr("stroke", d => d.target.data.active ? "rgba(232,213,176,0.3)" : "rgba(232,213,176,0.12)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", d => d.target.data.active ? null : "5 4");

    // ノード
    const nodeG = g.append("g").attr("class", "nodes")
      .selectAll("g")
      .data(root.descendants())
      .join("g")
      .attr("transform", d => isLR
        ? `translate(${d.y},${d.x})`
        : `translate(${d.x},${d.y})`
      )
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
        ? "#fff"
        : "rgba(232,213,176,0.4)"
      )
      .attr("stroke-width", d => d.data.id === selectedNodeId ? 2.5 : 1.5)
      .attr("opacity", d => d.data.active ? 1 : 0.5);

    // ノード名
    nodeG.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("fill", "var(--gold)")
      .attr("font-size", "13px")
      .attr("font-weight", d => d.data.id === selectedNodeId ? "700" : "400")
      .attr("pointer-events", "none")
      .text(d => d.data.name);

    // 空白クリックで選択解除
    svg.on("click", () => onSelectNode(null));

    // 初回フィット
    setTimeout(() => fitToScreen(svg, g, width, height), 50);
  }, [nodes, rootNodeId, selectedNodeId, layoutDir, buildTree, fitToScreen, onSelectNode]);

  return (
    <svg
      ref={svgRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
