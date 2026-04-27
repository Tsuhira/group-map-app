import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";

const NODE_RX = 70;
const NODE_RY = 28;
const NODE_RY_2LINE = 36;
const MIN_GAP = 20; // 輪郭間の最小隙間(px)

// 放射方向が水平になる位置（円の左右端）でも重ならないための最低値
// = 2×rx + MIN_GAP = 160px
const LEVEL_RADIUS = NODE_RX * 2 + MIN_GAP;

function radialPoint(angle, r) {
  return [r * Math.cos(angle - Math.PI / 2), r * Math.sin(angle - Math.PI / 2)];
}

export default function MapCanvas({
  nodes, rootNodeId, selectedNodeId, labelMode,
  highlightIds, focusNodeId, filterActive,
  onSelectNode, onContextMenu, fitRef,
  currentUserUid,
}) {
  const svgRef = useRef(null);
  const zoomRef = useRef(null);
  const nodePositionsRef = useRef({});

  const buildHierarchy = useCallback(() => {
    const map = Object.fromEntries(nodes.map(n => [n.id, { ...n, children: [] }]));
    const startId = rootNodeId ?? nodes.find(n => !n.parentId)?.id;

    const visible = (n) => {
      if (!n || n.id === startId) return true;
      if (filterActive === "active") return n.active;
      if (filterActive === "inactive") return !n.active;
      return true;
    };

    nodes.forEach(n => {
      if (!visible(n) || !n.parentId) return;
      let parent = map[n.parentId];
      while (parent && !visible(parent)) {
        parent = parent.parentId ? map[parent.parentId] : null;
      }
      if (parent) parent.children.push(map[n.id]);
    });

    return startId ? map[startId] : null;
  }, [nodes, rootNodeId, filterActive]);

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
    if (!focusNodeId || !zoomRef.current || !svgRef.current) return;
    const pos = nodePositionsRef.current[focusNodeId];
    if (!pos) return;
    const svgEl = svgRef.current;
    d3.select(svgEl).transition().duration(400).call(
      zoomRef.current.transform,
      d3.zoomIdentity.translate(svgEl.clientWidth / 2 - pos.x, svgEl.clientHeight / 2 - pos.y)
    );
  }, [focusNodeId]);

  useEffect(() => {
    const svgEl = svgRef.current;
    const svg = d3.select(svgEl);
    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;

    svg.selectAll("*").remove();

    const defs = svg.append("defs");
    const glowFilter = defs.append("filter")
      .attr("id", "glow")
      .attr("x", "-40%").attr("y", "-40%")
      .attr("width", "180%").attr("height", "180%");
    glowFilter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "blur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

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

    // separation: 弧長 = angle × r = (2×rx + gap) となるよう逆算
    // LEVEL_RADIUS = 2×rx + gap なので factor/depth に整理できる
    d3.tree()
      .size([2 * Math.PI, maxDepth * LEVEL_RADIUS])
      .separation((a, b) => {
        const factor = a.parent === b.parent ? 1 : 1.3;
        return factor / a.depth;
      })
      (root);

    // ノード位置を保存
    nodePositionsRef.current = {};
    root.descendants().forEach(d => {
      const [x, y] = radialPoint(d.x, d.y);
      nodePositionsRef.current[d.data.id] = { x, y };
    });

    const show2Line = d => labelMode === "name+rank" && !!d.data.pinLevel;
    const nodeRy = d => show2Line(d) ? NODE_RY_2LINE : NODE_RY;
    // 非アクティブは円: rx=ry=NODE_RY
    const nodeRx = d => d.data.active ? NODE_RX : NODE_RY;

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

    nodeG.transition().duration(300).style("opacity", 1);

    nodeG.append("ellipse")
      .attr("rx", nodeRx)
      .attr("ry", d => d.data.active ? nodeRy(d) : NODE_RY)
      .attr("fill", d => {
        if (!d.data.active) return "#1a2a3a";
        if (currentUserUid && d.data.userId === currentUserUid) return "#0e3d2f";
        if (d.data.userId) return "#2a1a45";
        return "#1e4470";
      })
      .attr("stroke", d => {
        if (highlightIds?.has(d.data.id)) return "#fbbf24";
        if (d.data.id === selectedNodeId) return "#ffffff";
        if (currentUserUid && d.data.userId === currentUserUid) return "#6ee7b7";
        if (d.data.userId) return "#a78bfa";
        return "rgba(232,213,176,0.35)";
      })
      .attr("stroke-width", d => {
        if (highlightIds?.has(d.data.id)) return 2.5;
        if (d.data.id === selectedNodeId) return 2;
        if (d.data.userId) return 2;
        return 1.5;
      })
      .attr("filter", d => d.data.id === selectedNodeId ? "url(#glow)" : null)
      .attr("opacity", d => d.data.active ? 1 : 0.5);

    nodeG.filter(d => d.data.active)
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("dy", d => show2Line(d) ? "-0.55em" : "0")
      .attr("fill", "var(--gold)")
      .attr("font-size", "12px")
      .attr("pointer-events", "none")
      .text(d => d.data.name);

    nodeG.filter(d => show2Line(d))
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("dy", "0.85em")
      .attr("fill", "var(--gold-dim)")
      .attr("font-size", "10px")
      .attr("pointer-events", "none")
      .text(d => d.data.pinLevel);

    // 📌 アイコン（ノードの実際のサイズに合わせて配置）
    nodeG.filter(d => d.data.id === rootNodeId)
      .append("text")
      .attr("x", d => -nodeRx(d) + 2)
      .attr("y", d => -(d.data.active ? nodeRy(d) : NODE_RY) + 2)

      .attr("dominant-baseline", "hanging")
      .attr("font-size", "11px")
      .attr("pointer-events", "none")
      .text("📌");

    svg.on("click", () => onSelectNode(null))
       .on("contextmenu", e => e.preventDefault());

    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2));
    setTimeout(() => fitToScreen(svg, g, width, height), 50);

  }, [nodes, rootNodeId, selectedNodeId, labelMode, highlightIds, filterActive,
      buildHierarchy, fitToScreen, onSelectNode, onContextMenu, fitRef, currentUserUid]);

  return (
    <svg
      ref={svgRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
