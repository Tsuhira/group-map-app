import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";

const NODE_RX = 70;
const NODE_RY = 28;
const NODE_RY_2LINE = 36;
const MIN_GAP = 18;
const LEVEL_R = 150;

const SHAPE_RX = { DIA: 64, EME: 46 };
const SHAPE_RY = { DIA: 50, EME: 36 };

// Ellipse boundary radius in the direction (dx, dy)
function ellipseR(dx, dy, rx, ry) {
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return rx;
  const c = dx / len, s = dy / len;
  return (rx * ry) / Math.sqrt((ry * c) ** 2 + (rx * s) ** 2);
}

// Custom force: ellipse-aware collision (no overlap)
function forceEllipseCollide(nodeRxFn, nodeRyFn, gap) {
  let ns;
  function force(alpha) {
    for (let i = 0; i < ns.length - 1; i++) {
      const a = ns[i];
      for (let j = i + 1; j < ns.length; j++) {
        const b = ns[j];
        const dx = (b.x - a.x) || 1e-6;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const minD =
          ellipseR(dx, dy, nodeRxFn(a), nodeRyFn(a)) +
          ellipseR(-dx, -dy, nodeRxFn(b), nodeRyFn(b)) +
          gap;
        if (d < minD) {
          const k = ((minD - d) / d) * alpha * 0.5;
          const mx = dx * k, my = dy * k;
          if (a.fx == null) { a.vx -= mx; a.vy -= my; }
          if (b.fx == null) { b.vx += mx; b.vy += my; }
        }
      }
    }
  }
  force.initialize = n => { ns = n; };
  return force;
}

// Custom force: radial band — free within ±band px of target radius, then springs back
function forceRadialBand(radiusFn, strength, band) {
  let ns;
  function force(alpha) {
    for (const n of ns) {
      if (n.fx != null) continue;
      const r = Math.hypot(n.x, n.y) || 1e-6;
      const excess = Math.abs(r - radiusFn(n)) - band;
      if (excess <= 0) continue;
      const k = Math.sign(r - radiusFn(n)) * excess * strength * alpha / r;
      n.vx -= n.x * k;
      n.vy -= n.y * k;
    }
  }
  force.initialize = n => { ns = n; };
  return force;
}

// Custom force: push nodes away from edges they're not connected to
function forceEdgeClear(simLinks, nodeRxFn, nodeRyFn, gap) {
  let ns;
  function force(alpha) {
    const str = alpha * 0.4;
    for (const link of simLinks) {
      const src = link.source, tgt = link.target;
      if (typeof src !== "object" || typeof tgt !== "object") continue;
      const ex = tgt.x - src.x, ey = tgt.y - src.y;
      const eLen2 = ex * ex + ey * ey;
      if (eLen2 < 1) continue;
      for (const n of ns) {
        if (n === src || n === tgt) continue;
        const px = n.x - src.x, py = n.y - src.y;
        let tp = (px * ex + py * ey) / eLen2;
        tp = Math.max(0, Math.min(1, tp));
        const cx = src.x + tp * ex, cy = src.y + tp * ey;
        const dx = n.x - cx, dy = n.y - cy;
        const dist = Math.hypot(dx, dy) || 1e-6;
        const clear = ellipseR(dx, dy, nodeRxFn(n), nodeRyFn(n)) + gap;
        if (dist < clear) {
          const k = ((clear - dist) / dist) * str;
          if (n.fx == null) { n.vx += dx * k; n.vy += dy * k; }
          // Also nudge edge endpoints away (half strength, weighted by proximity)
          if (src.fx == null) { src.vx -= 0.5 * (1 - tp) * dx * k; src.vy -= 0.5 * (1 - tp) * dy * k; }
          if (tgt.fx == null) { tgt.vx -= 0.5 * tp * dx * k; tgt.vy -= 0.5 * tp * dy * k; }
        }
      }
    }
  }
  force.initialize = n => { ns = n; };
  return force;
}

export default function MapCanvas({
  nodes, rootNodeId, selectedNodeId, labelMode,
  highlightIds, focusNodeId, filterActive, filterStatuses,
  onSelectNode, onContextMenu, fitRef,
  currentUserUid, onOpenJapanMap,
}) {
  const svgRef = useRef(null);
  const zoomRef = useRef(null);
  const nodePositionsRef = useRef({});
  const simulationRef = useRef(null);

  // Refs to keep current visual-only props accessible in main effect without re-running it
  const selectedNodeIdRef = useRef(selectedNodeId);
  const highlightIdsRef = useRef(highlightIds);
  useEffect(() => { selectedNodeIdRef.current = selectedNodeId; }, [selectedNodeId]);
  useEffect(() => { highlightIdsRef.current = highlightIds; }, [highlightIds]);

  const buildHierarchy = useCallback(() => {
    const map = Object.fromEntries(nodes.map(n => [n.id, { ...n, children: [] }]));
    const startId = rootNodeId ?? nodes.find(n => !n.parentId)?.id;
    const visible = (n) => {
      if (!n || n.id === startId) return true;
      if (filterActive === "active" && !n.active) return false;
      if (filterActive === "inactive" && n.active) return false;
      if (filterStatuses?.size > 0 && !filterStatuses.has(n.status || "")) return false;
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

    const roots = nodes.filter(n => !n.parentId && visible(map[n.id]));

    // rootNodeId 指定中 or ルートが1つ: 既存挙動
    if (roots.length <= 1 || rootNodeId) {
      return startId ? map[startId] : null;
    }

    // ルートが複数: 仮想ルートを立て各ルートを子として配置
    return {
      id: "__virtual_root__",
      virtual: true,
      name: "",
      children: roots.map(r => map[r.id]),
    };
  }, [nodes, rootNodeId, filterActive, filterStatuses]);

  const fitToScreen = useCallback((svg, g) => {
    const svgEl = svg.node();
    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;
    const bounds = g.node().getBBox();
    if (!bounds.width || !bounds.height) return;
    const padding = width < 1000 ? 10 : 40;
    const scale = Math.min(
      (width - padding * 2) / bounds.width,
      (height - padding * 2) / bounds.height
    );
    const tx = width / 2 - (bounds.x + bounds.width / 2) * scale;
    const ty = height / 2 - (bounds.y + bounds.height / 2) * scale;
    svg.transition().duration(400).call(
      zoomRef.current.transform,
      d3.zoomIdentity.translate(tx, ty).scale(scale)
    );
  }, []);

  // Focus on search result
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

  // Visual-only update: selection & highlight strokes (no simulation restart)
  useEffect(() => {
    if (!svgRef.current) return;
    d3.select(svgRef.current)
      .select(".nodes")
      .selectAll("g")
      .select(".node-border")
      .attr("stroke", d => {
        if (highlightIds?.has(d.id)) return "#fbbf24";
        if (d.id === selectedNodeId) return "#ffffff";
        if (currentUserUid && d.data.userId === currentUserUid) return "#6ee7b7";
        if (d.data.userId) return "#a78bfa";
        const shape = d.data?.shape;
        if (shape === "DIA" || shape === "EME") return "none";
        return "rgba(232,213,176,0.35)";
      })
      .attr("stroke-width", d => {
        if (highlightIds?.has(d.id)) return 2.5;
        if (d.id === selectedNodeId) return 2;
        if (d.data.userId) return 2;
        return 1.5;
      })
      .attr("filter", d => {
        const shape = d.data?.shape;
        if (shape === "DIA" || shape === "EME") return null;
        return d.id === selectedNodeId ? "url(#glow)" : null;
      })
      .attr("stroke-dasharray", d => d.data.status === "プロスペクト" ? "6 4" : null);
  }, [selectedNodeId, highlightIds, currentUserUid]);

  // Main effect: SVG setup + force simulation
  useEffect(() => {
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current = null;
    }

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

    const diaGrad = defs.append("linearGradient")
      .attr("id", "dia-grad").attr("x1", 0).attr("y1", -1).attr("x2", 0).attr("y2", 1);
    diaGrad.append("stop").attr("offset", "0%").attr("stop-color", "#ffffff");
    diaGrad.append("stop").attr("offset", "45%").attr("stop-color", "#dff1ff");
    diaGrad.append("stop").attr("offset", "100%").attr("stop-color", "#9ec9e8");

    const emeGrad = defs.append("linearGradient")
      .attr("id", "eme-grad").attr("x1", 0).attr("y1", -1).attr("x2", 0).attr("y2", 1);
    emeGrad.append("stop").attr("offset", "0%").attr("stop-color", "#d6f5c7");
    emeGrad.append("stop").attr("offset", "50%").attr("stop-color", "#7ed95a");
    emeGrad.append("stop").attr("offset", "100%").attr("stop-color", "#3a8a2a");

    const diaShape = defs.append("g").attr("id", "dia-shape");
    diaShape.append("path")
      .attr("d", "M -60,-12 L -36,-40 L 36,-40 L 60,-12 L 0,50 Z")
      .attr("fill", "url(#dia-grad)").attr("stroke", "#3a6f96")
      .attr("stroke-width", 2).attr("stroke-linejoin", "round");
    for (const [[x1,y1],[x2,y2],sw,op] of [
      [[-60,-12],[60,-12],1.4,1], [[-36,-40],[-20,-12],1.2,1],
      [[-12,-40],[-12,-12],1.2,1], [[12,-40],[12,-12],1.2,1],
      [[36,-40],[20,-12],1.2,1], [[-60,-12],[-22,6],1.2,1],
      [[-22,6],[0,50],1.2,1], [[22,6],[0,50],1.2,1],
      [[60,-12],[22,6],1.2,1], [[-22,6],[22,6],1.2,1],
      [[-20,-12],[-22,6],1,1], [[20,-12],[22,6],1,1],
      [[-12,-12],[-22,6],0.9,0.7], [[12,-12],[22,6],0.9,0.7],
      [[0,-12],[0,6],0.9,0.7],
    ]) {
      const l = diaShape.append("line")
        .attr("x1",x1).attr("y1",y1).attr("x2",x2).attr("y2",y2)
        .attr("stroke","#3a6f96").attr("stroke-width",sw);
      if (op < 1) l.attr("opacity", op);
    }

    const emeShape = defs.append("g").attr("id", "eme-shape");
    emeShape.append("path")
      .attr("d", "M -42,-8 L -25,-28 L 25,-28 L 42,-8 L 0,36 Z")
      .attr("fill", "url(#eme-grad)").attr("stroke", "#1f5a18")
      .attr("stroke-width", 1.8).attr("stroke-linejoin", "round");
    for (const [[x1,y1],[x2,y2],sw,op] of [
      [[-42,-8],[42,-8],1.2,1], [[-25,-28],[-14,-8],1,1],
      [[-8,-28],[-8,-8],1,1], [[8,-28],[8,-8],1,1],
      [[25,-28],[14,-8],1,1], [[-42,-8],[-14,6],1,1],
      [[-14,6],[0,36],1,1], [[14,6],[0,36],1,1],
      [[42,-8],[14,6],1,1], [[-14,6],[14,6],1,1],
      [[-14,-8],[-14,6],0.8,0.7], [[14,-8],[14,6],0.8,0.7],
      [[0,-8],[0,6],0.8,0.7],
    ]) {
      const l = emeShape.append("line")
        .attr("x1",x1).attr("y1",y1).attr("x2",x2).attr("y2",y2)
        .attr("stroke","#1f5a18").attr("stroke-width",sw);
      if (op < 1) l.attr("opacity", op);
    }

    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", e => g.attr("transform", e.transform));
    zoomRef.current = zoom;
    svg.call(zoom);

    const g = svg.append("g");
    if (fitRef) fitRef.current = () => fitToScreen(svg, g);

    const data = buildHierarchy();
    if (!data) return;

    const root = d3.hierarchy(data, d => d.children?.length ? d.children : null);

    // Compute effective level radius: ensure each depth circle has enough arc for its nodes
    const depthCounts = new Map();
    root.each(d => depthCounts.set(d.depth, (depthCounts.get(d.depth) || 0) + 1));
    const minArc = NODE_RX * 2 + MIN_GAP;
    let effectiveLevelR = LEVEL_R;
    depthCounts.forEach((count, depth) => {
      if (depth === 0) return;
      const needed = (count * minArc) / (2 * Math.PI * depth);
      if (needed > effectiveLevelR) effectiveLevelR = Math.ceil(needed);
    });

    // Use radial tree for initial angle distribution (proportional to leaf count)
    d3.tree().size([2 * Math.PI, (root.height || 1) * effectiveLevelR])(root);

    const show2Line = n => labelMode === "name+rank" && !!n.data?.pinLevel;
    const nodeRxFn = n => {
      const s = n.data?.shape;
      if (s === "DIA" || s === "EME") return SHAPE_RX[s];
      return n.data?.active ? NODE_RX : NODE_RY;
    };
    const nodeRyFn = n => {
      const s = n.data?.shape;
      if (s === "DIA" || s === "EME") return SHAPE_RY[s];
      return n.data?.active ? (show2Line(n) ? NODE_RY_2LINE : NODE_RY) : NODE_RY;
    };

    // Build simulation nodes (initial positions from tree layout)
    const simNodes = root.descendants().map(d => ({
      id: d.data.id,
      data: d.data,
      depth: d.depth,
      x: d.y * Math.cos(d.x - Math.PI / 2),
      y: d.y * Math.sin(d.x - Math.PI / 2),
    }));
    // Store tree-assigned positions as angular attraction targets
    simNodes.forEach(n => { n.tx = n.x; n.ty = n.y; });

    const simLinks = root.links().map(l => ({
      source: l.source.data.id,
      target: l.target.data.id,
    }));

    const nodeById = new Map(simNodes.map(n => [n.id, n]));

    // 仮想ルートは原点固定（描画しない）、通常時は rootNodeId を固定
    const virtualRootSim = simNodes.find(n => n.data.virtual);
    if (virtualRootSim) {
      virtualRootSim.fx = 0; virtualRootSim.fy = 0;
    } else {
      const rootSim = nodeById.get(rootNodeId ?? simNodes[0]?.id);
      if (rootSim) { rootSim.fx = 0; rootSim.fy = 0; }
    }

    // 仮想ルートとそこへのリンクは描画から除外
    const visibleSimNodes = simNodes.filter(n => !n.data.virtual);
    const visibleSimLinks = simLinks.filter(l => l.source !== "__virtual_root__");

    const curSelectedId = selectedNodeIdRef.current;
    const curHighlightIds = highlightIdsRef.current;

    // Render links (positions updated each tick)
    const linkSel = g.append("g").attr("class", "links")
      .selectAll("line")
      .data(visibleSimLinks)
      .join("line")
      .attr("stroke", "rgba(255,255,255,0.25)")
      .attr("stroke-width", d => {
        const srcId = typeof d.source === "object" ? d.source.id : d.source;
        const tgtId = typeof d.target === "object" ? d.target.id : d.target;
        const src = nodeById.get(srcId);
        const tgt = nodeById.get(tgtId);
        return (src?.data.status === "ABO" && tgt?.data.status === "ABO") ? 3 : 1.5;
      })
      .attr("stroke-dasharray", d => {
        const id = typeof d.target === "object" ? d.target.id : d.target;
        const tgt = nodeById.get(id);
        return tgt?.data.status === "プロスペクト" ? "6 4" : null;
      });

    // Render node groups（仮想ルートは除外）
    const nodeG = g.append("g").attr("class", "nodes")
      .selectAll("g")
      .data(visibleSimNodes, d => d.id)
      .join("g")
      .attr("cursor", "pointer")
      .style("opacity", 0)
      .on("click", (event, d) => { event.stopPropagation(); onSelectNode(d.data.id); })
      .on("contextmenu", (event, d) => {
        event.preventDefault();
        event.stopPropagation();
        onContextMenu?.(d.data.id, event.clientX, event.clientY);
      })
      .on("mouseenter", function () {
        d3.select(this).select(".node-shape, .node-ellipse").transition().duration(120).attr("transform", "scale(1.05)");
      })
      .on("mouseleave", function () {
        d3.select(this).select(".node-shape, .node-ellipse").transition().duration(120).attr("transform", "scale(1)");
      });

    nodeG.transition().duration(300).style("opacity", 1);

    // ELP (既存の楕円)
    nodeG.filter(d => !d.data.shape || d.data.shape === "ELP")
      .append("ellipse")
      .attr("class", "node-border node-ellipse")
      .attr("rx", nodeRxFn)
      .attr("ry", nodeRyFn)
      .attr("fill", d => {
        if (!d.data.active) return "#1a2a3a";
        if (currentUserUid && d.data.userId === currentUserUid) return "#0e3d2f";
        if (d.data.userId) return "#2a1a45";
        return "#1e4470";
      })
      .attr("stroke", d => {
        if (curHighlightIds?.has(d.id)) return "#fbbf24";
        if (d.id === curSelectedId) return "#ffffff";
        if (currentUserUid && d.data.userId === currentUserUid) return "#6ee7b7";
        if (d.data.userId) return "#a78bfa";
        return "rgba(232,213,176,0.35)";
      })
      .attr("stroke-width", d => {
        if (curHighlightIds?.has(d.id)) return 2.5;
        if (d.id === curSelectedId) return 2;
        if (d.data.userId) return 2;
        return 1.5;
      })
      .attr("filter", d => d.id === curSelectedId ? "url(#glow)" : null)
      .attr("stroke-dasharray", d => d.data.status === "プロスペクト" ? "6 4" : null)
      .attr("opacity", d => d.data.active ? 1 : 0.5);

    // DIA shape
    nodeG.filter(d => d.data.shape === "DIA")
      .append("use").attr("class", "node-shape").attr("href", "#dia-shape")
      .attr("filter", "url(#glow)");
    nodeG.filter(d => d.data.shape === "DIA")
      .append("ellipse").attr("class", "node-border")
      .attr("rx", SHAPE_RX.DIA).attr("ry", SHAPE_RY.DIA)
      .attr("fill", "none")
      .attr("stroke", d => {
        if (curHighlightIds?.has(d.id)) return "#fbbf24";
        if (d.id === curSelectedId) return "#ffffff";
        return "none";
      })
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", d => d.data.status === "プロスペクト" ? "6 4" : null);

    // EME shape
    nodeG.filter(d => d.data.shape === "EME")
      .append("use").attr("class", "node-shape").attr("href", "#eme-shape");
    nodeG.filter(d => d.data.shape === "EME")
      .append("ellipse").attr("class", "node-border")
      .attr("rx", SHAPE_RX.EME).attr("ry", SHAPE_RY.EME)
      .attr("fill", "none")
      .attr("stroke", d => {
        if (curHighlightIds?.has(d.id)) return "#fbbf24";
        if (d.id === curSelectedId) return "#ffffff";
        return "none";
      })
      .attr("stroke-width", 2.5)
      .attr("stroke-dasharray", d => d.data.status === "プロスペクト" ? "6 4" : null);

    // ELP テキスト（active のみ）
    nodeG.filter(d => d.data.active && (!d.data.shape || d.data.shape === "ELP"))
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("dy", d => show2Line(d) ? "-0.55em" : "0")
      .attr("fill", d => {
        if (d.data.gender === "男性") return "#93c5fd";
        if (d.data.gender === "女性") return "#fda4af";
        return "var(--gold)";
      })
      .attr("font-size", d => show2Line(d) ? "12px" : "18px")
      .attr("pointer-events", "none")
      .text(d => d.data.name);

    nodeG.filter(d => show2Line(d) && (!d.data.shape || d.data.shape === "ELP"))
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("dy", "0.85em")
      .attr("fill", "var(--gold-dim)")
      .attr("font-size", "10px")
      .attr("pointer-events", "none")
      .text(d => d.data.pinLevel);

    // DIA/EME テキスト（濃色背景に合わせた暗色）
    nodeG.filter(d => d.data.shape === "DIA" || d.data.shape === "EME")
      .append("text")
      .attr("text-anchor", "middle").attr("y", -2)
      .attr("fill", d => d.data.shape === "DIA" ? "#1a3a5a" : "#0e3318")
      .attr("font-size", "12px").attr("font-weight", 600)
      .attr("pointer-events", "none")
      .text(d => d.data.name);

    nodeG.filter(d => d.data.shape === "DIA" || d.data.shape === "EME")
      .append("text")
      .attr("text-anchor", "middle").attr("y", d => d.data.shape === "DIA" ? 14 : 11)
      .attr("fill", d => d.data.shape === "DIA" ? "#1a3a5a" : "#0e3318")
      .attr("font-size", "10px")
      .attr("pointer-events", "none")
      .text(d => d.data.shape);

    nodeG.filter(d => d.data.id === rootNodeId)
      .append("text")
      .attr("x", d => -nodeRxFn(d) + 2)
      .attr("y", d => -nodeRyFn(d) + 2)
      .attr("dominant-baseline", "hanging")
      .attr("font-size", "11px")
      .attr("pointer-events", "none")
      .text("📌");

    svg.on("click", () => onSelectNode(null))
       .on("contextmenu", e => e.preventDefault());

    function ticked() {
      simNodes.forEach(n => { nodePositionsRef.current[n.id] = { x: n.x, y: n.y }; });
      nodeG.attr("transform", d => `translate(${d.x},${d.y})`);
      linkSel
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
    }

    const simulation = d3.forceSimulation(simNodes)
      // Keep forceLink at strength 0 to resolve string IDs → node objects (needed for ticked())
      .force("link", d3.forceLink(visibleSimLinks).id(d => d.id).strength(0))
      // Soft radial band: free within ±40px of target circle, strongly pulled back beyond
      .force("radial", forceRadialBand(d => d.depth * effectiveLevelR, 0.8, 40))
      // Weak attraction to tree-assigned angular position for structural stability
      .force("tx", d3.forceX(d => d.tx).strength(0.15))
      .force("ty", d3.forceY(d => d.ty).strength(0.15))
      // Push nodes away from edges they're not connected to
      .force("edgeClear", forceEdgeClear(visibleSimLinks, nodeRxFn, nodeRyFn, MIN_GAP))
      // Collision only (no charge repulsion)
      .force("collide", forceEllipseCollide(nodeRxFn, nodeRyFn, MIN_GAP))
      .alphaDecay(0.018)
      .on("tick", ticked)
      .on("end", () => fitToScreen(svg, g));

    simulationRef.current = simulation;
    svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2));
    setTimeout(() => fitToScreen(svg, g), 80);

    const ro = new ResizeObserver(() => fitToScreen(svg, g));
    ro.observe(svgEl);

    return () => { simulation.stop(); ro.disconnect(); };
  }, [nodes, rootNodeId, filterActive, filterStatuses, labelMode, buildHierarchy, fitToScreen,
      onSelectNode, onContextMenu, fitRef, currentUserUid]);

  return (
    <>
      <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block" }} />
      {onOpenJapanMap && (
        <button
          onClick={onOpenJapanMap}
          title="出身地マップ"
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(13,31,53,0.92)",
            border: "1px solid var(--gold-line)",
            color: "var(--gold-dim)",
            fontSize: 20,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(6px)",
            zIndex: 5,
          }}
        >
          🗾
        </button>
      )}
    </>
  );
}
