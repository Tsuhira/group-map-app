import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";

const LEVEL_RADIUS = 180;
const NODE_RX = 70;
const NODE_RY = 28;
const NODE_RY_2LINE = 36;

function radialPoint(angle, r) {
  return [r * Math.cos(angle - Math.PI / 2), r * Math.sin(angle - Math.PI / 2)];
}

export default function MapCanvas({ nodes, rootNodeId, selectedNodeId, labelMode, onSelectNode, onContextMenu, fitRef }) {
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

    const defs = svg.append("defs");

    // 選択状態のグロー
    const glowFilter = defs.append("filter")
      .attr("id", "glow")
      .attr("x", "-40%").attr("y", "-40%")
      .attr("width", "180%").attr("height", "180%");
    glowFilter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "blur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // 非アクティブのグレースケール
    defs.append("filter")
      .attr("id", "grayscale")
      .append("feColorMatrix")
      .attr("type", "saturate")
      .attr("values", "0.15");

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

    const show2Line = d => labelMode === "name+rank" && !!d.data.pinLevel;
    const nodeRy = d => show2Line(d) ? NODE_RY_2LINE : NODE_RY;

    // 接続線
    g.append("g").attr("class", "links")
      .selectAll("line")
      .data(root.links())
      .join("line")
      .attr("x1", d => radialPoint(d.source.x, d.source.y)[0])
      .attr("y1", d => radialPoint(d.source.x, d.source.y)[1])
      .attr("x2", d => radialPoint(d.target.x, d.target.y)[0])
      .attr("y2", d => radialPoint(d.target.x, d.target.y)[1])
      .attr("stroke", d => d.target.data.active
        ? "rgba(255,255,255,0.25)"
        : "rgba(255,255,255,0.08)"
      )
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", d => d.target.data.active ? null : "5 4");

    // ノードグループ
    const nodeG = g.append("g").attr("class", "nodes")
      .selectAll("g")
      .data(root.descendants())
      .join("g")
      .attr("transform", d => {
        const [x, y] = radialPoint(d.x, d.y);
        return `translate(${x},${y})`;
      })
      .attr("cursor", "pointer")
      .style("opacity", 0)
      .on("click", (event, d) => {
        event.stopPropagation();
        onSelectNode(d.data.id);
      })
      .on("contextmenu", (event, d) => {
        event.preventDefault();
        event.stopPropagation();
        onContextMenu?.(d.data.id, event.clientX, event.clientY);
      })
      .on("mouseenter", function () {
        d3.select(this).select("ellipse")
          .transition().duration(120)
          .attr("transform", "scale(1.05)");
      })
      .on("mouseleave", function () {
        d3.select(this).select("ellipse")
          .transition().duration(120)
          .attr("transform", "scale(1)");
      });

    // フェードイン
    nodeG.transition().duration(300).style("opacity", 1);

    // 楕円
    nodeG.append("ellipse")
      .attr("rx", NODE_RX)
      .attr("ry", nodeRy)
      .attr("fill", d => d.data.active ? "#1e4470" : "#1a2a3a")
      .attr("stroke", d => d.data.id === selectedNodeId ? "#ffffff" : "rgba(232,213,176,0.35)")
      .attr("stroke-width", d => d.data.id === selectedNodeId ? 2 : 1.5)
      .attr("filter", d => {
        if (d.data.id === selectedNodeId) return "url(#glow)";
        if (!d.data.active) return "url(#grayscale)";
        return null;
      })
      .attr("opacity", d => d.data.active ? 1 : 0.45);

    // ノード名
    nodeG.append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("dy", d => show2Line(d) ? "-0.55em" : "0")
      .attr("fill", d => d.data.active ? "var(--gold)" : "var(--gold-dim)")
      .attr("font-size", "12px")
      .attr("pointer-events", "none")
      .text(d => d.data.name);

    // ピンレベル（2行目）
    nodeG.filter(d => show2Line(d))
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("dy", "0.85em")
      .attr("fill", "var(--gold-dim)")
      .attr("font-size", "10px")
      .attr("pointer-events", "none")
      .text(d => d.data.pinLevel);

    // 規定ノードの📌アイコン
    nodeG.filter(d => d.data.id === rootNodeId)
      .append("text")
      .attr("x", -NODE_RX + 2)
      .attr("y", d => -nodeRy(d) + 2)
      .attr("dominant-baseline", "hanging")
      .attr("font-size", "11px")
      .attr("pointer-events", "none")
      .text("📌");

    svg.on("click", () => onSelectNode(null))
       .on("contextmenu", e => e.preventDefault());

    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2));
    setTimeout(() => fitToScreen(svg, g, width, height), 50);

  }, [nodes, rootNodeId, selectedNodeId, labelMode, buildHierarchy, fitToScreen, onSelectNode, onContextMenu, fitRef]);

  return (
    <svg
      ref={svgRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
