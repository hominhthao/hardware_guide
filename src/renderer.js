window.HF = window.HF || {};
HF.createSpecRenderer = function createSpecRenderer({ geometry, flow, inputElement, onSelectPath, onSelectPoint, onSelectNet, onSelectNetPoint, netUI }) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.getElementById("spec-overlay");
  const container = document.getElementById("diagram-overlay-container");
  const pathElements = new Map();
  const blockElements = new Map();
  const netSegments = new Map();
  const netById = new Map((flow.nets ?? []).map((net) => [net.id, net]));
  let debugNets = false;
  const edgeById = new Map((flow.edges ?? []).map((edge) => [edge.id, edge]));
  const nodeById = new Map(flow.nodes.map((node) => [node.id, node]));
  let imageSize = null;
  let zoomMode = "fit";
  let zoomFrame = null;
  let followEnabled = false;
  let followedIndex = -2;
  let dragging = null;
  let markerGroup, markerTrail, markerDot, markerLabel;
  let editState = { editing: false, selectedPathId: null, pointsDraft: null, selectedPointIndex: null };
  let lastRender = { event: null, progress: 0, meta: { status: "ready", index: -1 }, options: {} };
  let lastStateKey = "";
  const translate = (key, params) => HF.i18n?.t(key, params) ?? key;
  const popup = document.getElementById("flow-popup");
  let dismissedPopupIndex = null;
  popup.querySelector("#flow-popup-close").addEventListener("click", () => { dismissedPopupIndex = lastRender.meta.index; popup.hidden = true; document.getElementById("popup-leader").hidden = true; });
  const makeSvg = (tag, className) => {
    const element = document.createElementNS(NS, tag);
    if (className) element.setAttribute("class", className);
    return element;
  };
  const pathById = (id) => geometry.paths.find((path) => path.id === id);
  const nodeGeometry = (id) => geometry.nodes.find((node) => node.id === id);
  const scalePoint = ({ x, y }) => ({ x: x * imageSize.width / geometry.viewBox.width, y: y * imageSize.height / geometry.viewBox.height });
  const scaleBox = (box) => ({ ...scalePoint(box), width: box.width * imageSize.width / geometry.viewBox.width, height: box.height * imageSize.height / geometry.viewBox.height });
  const pathData = (points) => {
    const [first, ...rest] = points.map(scalePoint);
    return `M ${first.x} ${first.y} ${rest.map(({ x, y }) => `L ${x} ${y}`).join(" ")}`;
  };
  function appendSpotlight() {
    const mask = makeSvg("mask"); mask.id = "hf-spotlight-mask";
    mask.setAttribute("maskUnits", "userSpaceOnUse");
    const base = makeSvg("rect"); base.setAttribute("width", imageSize.width); base.setAttribute("height", imageSize.height); base.setAttribute("fill", "white"); mask.append(base);
    const cutouts = makeSvg("g", "spotlight-cutouts"); cutouts.setAttribute("filter", "url(#hf-spotlight-soft)"); mask.append(cutouts);
    const defs = makeSvg("defs");
    const soft = makeSvg("filter"); soft.id = "hf-spotlight-soft";
    for (const [key, value] of Object.entries({ x: "-30%", y: "-30%", width: "160%", height: "160%" })) soft.setAttribute(key, value);
    const blur = makeSvg("feGaussianBlur"); blur.setAttribute("stdDeviation", "12"); soft.append(blur);
    defs.append(soft, mask); svg.append(defs);
    const shade = makeSvg("rect", "spotlight-shade"); shade.setAttribute("width", imageSize.width); shade.setAttribute("height", imageSize.height);
    shade.setAttribute("mask", "url(#hf-spotlight-mask)"); svg.append(shade);
    container.classList.add("has-spotlight");
  }
  function viewBoxValues(mode) {
    if (!imageSize) return [0, 0, geometry.viewBox.width, geometry.viewBox.height];
    if (mode === "fit") return [0, 0, imageSize.width, imageSize.height];
    const box = geometry.viewport[mode];
    return [box.x, box.y, imageSize.width - box.x - box.right, imageSize.height - box.y - box.bottom];
  }
  function updateMarkerSize() {
    if (!markerDot || !imageSize) return;
    const matrix = svg.getScreenCTM();
    if (!matrix) return;
    const xScale = Math.hypot(matrix.a, matrix.b);
    const yScale = Math.hypot(matrix.c, matrix.d);
    if (!xScale || !yScale) return;
    markerDot.setAttribute("r", 10 / Math.min(xScale, yScale));
    markerLabel.setAttribute("font-size", 13 / yScale);
  }
  function renderStatic(nextEditState = editState) {
    if (!imageSize) return;
    if (geometry.presentation === "net-graph") { renderNetStatic(nextEditState); return; }
    editState = nextEditState;
    container.classList.remove("is-net-graph", "is-net-debug");
    svg.removeAttribute("hidden");
    svg.setAttribute("viewBox", viewBoxValues(zoomMode).join(" "));
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.replaceChildren(); pathElements.clear(); blockElements.clear();
    const image = makeSvg("image", "spec-image");
    image.setAttribute("href", geometry.image);
    image.setAttribute("width", imageSize.width); image.setAttribute("height", imageSize.height);
    svg.append(image);
    appendSpotlight();
    const defs = makeSvg("defs"); const arrow = makeSvg("marker");
    for (const [key, value] of Object.entries({ id: "spec-arrow", viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "9", markerHeight: "9", orient: "auto" })) arrow.setAttribute(key, value);
    const arrowShape = makeSvg("path"); arrowShape.setAttribute("d", "M 1 1 L 9 5 L 1 9 Z"); arrowShape.setAttribute("fill", "#ff8e5d");
    arrow.append(arrowShape); defs.append(arrow); svg.append(defs);
    const blockLayer = makeSvg("g", "block-overlay");
    flow.nodes.forEach((node) => {
      const geometryNode = nodeGeometry(node.geometryNodeId);
      if (!geometryNode) return;
      const box = scaleBox(geometryNode.box);
      const group = makeSvg("g", "spec-block"); group.dataset.nodeId = node.id;
      const rect = makeSvg("rect");
      for (const [key, value] of Object.entries({ x: box.x, y: box.y, width: box.width, height: box.height })) rect.setAttribute(key, value);
      const label = makeSvg("text"); label.setAttribute("x", box.x + 6); label.setAttribute("y", Math.max(22, box.y - 8)); label.textContent = node.label;
      group.append(rect, label); blockLayer.append(group); blockElements.set(node.id, group);
    });
    svg.append(blockLayer);
    geometry.paths.forEach((pathGeometry) => {
      const edge = flow.edges.find((item) => item.pathId === pathGeometry.id);
      const path = makeSvg("path", "spec-path");
      const points = editState.editing && pathGeometry.id === editState.selectedPathId ? editState.pointsDraft ?? pathGeometry.points : pathGeometry.points;
      path.setAttribute("d", pathData(points)); path.dataset.pathId = pathGeometry.id;
      const title = makeSvg("title"); title.textContent = edge?.label ?? pathGeometry.id; path.append(title);
      if (editState.editing) {
        if (pathGeometry.id === editState.selectedPathId) path.classList.add("is-selected");
        path.addEventListener("click", (event) => { event.stopPropagation(); onSelectPath(pathGeometry.id); });
      }
      svg.append(path); pathElements.set(pathGeometry.id, path);
    });
    if (editState.editing) {
      const points = editState.pointsDraft ?? pathById(editState.selectedPathId)?.points ?? [];
      points.forEach((point, index) => {
        const screen = scalePoint(point);
        const control = makeSvg("circle", "control-point");
        if (index === editState.selectedPointIndex) control.classList.add("is-selected");
        control.setAttribute("cx", screen.x); control.setAttribute("cy", screen.y); control.setAttribute("r", "9");
        control.addEventListener("click", (event) => { event.stopPropagation(); onSelectPoint(index); });
        svg.append(control);
      });
    }
    markerGroup = makeSvg("g", "marker-group"); markerGroup.setAttribute("visibility", "hidden");
    markerTrail = makeSvg("path", "marker-trail"); markerDot = makeSvg("circle", "data-marker"); markerLabel = makeSvg("text", "marker-label");
    markerGroup.append(markerTrail, markerDot, markerLabel); svg.append(markerGroup);
    svg.append(makeSvg("g", "node-chip-layer"));
    updateMarkerSize();
    render(lastRender.event, lastRender.progress, lastRender.meta, lastRender.options);
  }
  function durationForEvent(event, index) {
    return 1700;
  }
  const phaseFor = (progress) => progress < 400 / 1700 ? "source" : progress < 1300 / 1700 ? "wire" : "arrival";
  const wireFraction = (progress) => Math.max(0, Math.min(1, (progress - 400 / 1700) / (900 / 1700)));
  function renderNodeChips(ids) {
    const layer = svg.querySelector(".node-chip-layer");
    if (!layer || !imageSize) return;
    layer.replaceChildren();
    const matrix = svg.getScreenCTM(); if (!matrix) return;
    const xScale = Math.hypot(matrix.a, matrix.b), yScale = Math.hypot(matrix.c, matrix.d);
    const occupied = [];
    ids.forEach((id) => {
      const node = nodeById.get(id), box = nodeGeometry(node?.geometryNodeId)?.box;
      if (!node || !box) return;
      const screen = scaleBox(box);
      const width = Math.max(86, node.label.length * 8 + 20) / xScale, height = 25 / yScale;
      let x = screen.x + screen.width / 2 - width / 2, y = screen.y - height - 7 / yScale;
      while (occupied.some((item) => x < item.x + item.width && x + width > item.x && y < item.y + item.height && y + height > item.y)) y += height + 3 / yScale;
      occupied.push({ x, y, width, height });
      const chip = makeSvg("g", "node-name-chip"), rect = makeSvg("rect"), label = makeSvg("text");
      for (const [key, value] of Object.entries({ x, y, width, height, rx: 5 })) rect.setAttribute(key, value);
      label.setAttribute("x", x + 9 / xScale); label.setAttribute("y", y + 17 / yScale);
      label.setAttribute("font-size", 14 / yScale); label.textContent = node.label;
      chip.append(rect, label); layer.append(chip);
    });
  }
  function markerAt(point, previous, value, nearEnd) {
    markerDot.setAttribute("cx", point.x); markerDot.setAttribute("cy", point.y);
    markerTrail.setAttribute("d", `M ${previous.x} ${previous.y} L ${point.x} ${point.y}`);
    const matrix = svg.getScreenCTM(); const factor = matrix ? Math.hypot(matrix.a, matrix.b) : 1;
    markerLabel.setAttribute("x", point.x + (nearEnd ? -58 : 16) / factor);
    markerLabel.setAttribute("y", point.y + (nearEnd ? 27 : -14) / factor);
    markerLabel.textContent = value ?? "";
    markerGroup.setAttribute("visibility", "visible");
  }
  function popupAnchor(anchor) {
    if (!anchor || !imageSize) return null;
    if (anchor.kind === "node") {
      const box = nodeGeometry(nodeById.get(anchor.id)?.geometryNodeId)?.box;
      if (!box) return null;
      const scaled = scaleBox(box);
      return { x: scaled.x + scaled.width, y: scaled.y + scaled.height / 2 };
    }
    const net = geometry.nets?.find((item) => item.id === anchor.id);
    const path = geometry.paths?.find((item) => item.id === anchor.id);
    const segments = net?.segments ?? (path ? [{ points: path.points }] : []);
    const longest = segments.map((item) => ({ points: item.points, length: item.points.slice(1).reduce((n, point, i) => n + Math.hypot(point.x - item.points[i].x, point.y - item.points[i].y), 0) })).sort((a, b) => b.length - a.length)[0];
    if (!longest) return null;
    let remaining = longest.length / 2;
    for (let i = 1; i < longest.points.length; i++) {
      const a = longest.points[i - 1], b = longest.points[i];
      const length = Math.hypot(b.x - a.x, b.y - a.y);
      if (remaining <= length) return scalePoint({ x: a.x + (b.x - a.x) * remaining / length, y: a.y + (b.y - a.y) * remaining / length });
      remaining -= length;
    }
    return scalePoint(longest.points.at(-1));
  }
  function renderPopup(event, progress, meta, options = {}) {
    if (dismissedPopupIndex !== meta.index) dismissedPopupIndex = null;
    const show = !!event?.popup && progress >= 1 && document.getElementById("popup-toggle")?.checked !== false && options.popups !== false && dismissedPopupIndex !== meta.index && !editState.editing;
    popup.hidden = !show;
    const leader = document.getElementById("popup-leader"); leader.hidden = true;
    if (!show) return;
    const data = event.popup, params = data.params ?? {};
    popup.querySelector("#flow-popup-title").textContent = translate(data.titleKey, params);
    popup.querySelector("#flow-popup-body").textContent = translate(data.bodyKey, params);
    const why = popup.querySelector("#flow-popup-why"); why.hidden = !data.whyKey; why.textContent = data.whyKey ? translate(data.whyKey, params) : "";
    const sourceLine = popup.querySelector("#flow-popup-spec");
    const sourceRefs = HF.resolveSources(flow, event).refs;
    sourceLine.hidden = !sourceRefs.length;
    sourceLine.textContent = sourceRefs.length ? translate("ui.specLine", { refs: sourceRefs.map((ref) => `${ref.section} p.${ref.page}`).join(" · ") }) : "";
    const chips = popup.querySelector("#flow-popup-values"); chips.replaceChildren();
    Object.entries(params).filter(([key]) => key !== "binaryValue").slice(0, 3).forEach(([key, value]) => {
      const chip = document.createElement("span"); chip.textContent = `${key} ${value}`; chips.append(chip);
    });
    const point = popupAnchor(data.anchor); if (!point) { popup.hidden = true; return; }
    const matrix = svg.getScreenCTM(), screen = svg.createSVGPoint(); screen.x = point.x; screen.y = point.y;
    const mapped = screen.matrixTransform(matrix), frame = container.getBoundingClientRect();
    const anchor = { x: mapped.x - frame.left, y: mapped.y - frame.top };
    const avoid = [];
    const ids = event.focusNodes ?? event.activeNodes ?? [];
    ids.forEach((id) => {
      const box = nodeGeometry(nodeById.get(id)?.geometryNodeId)?.box; if (!box) return;
      const scaled = scaleBox(box), p = svg.createSVGPoint(); p.x = scaled.x; p.y = scaled.y;
      const a = p.matrixTransform(matrix), xScale = Math.hypot(matrix.a, matrix.b), yScale = Math.hypot(matrix.c, matrix.d);
      avoid.push({ x: a.x - frame.left - 8, y: a.y - frame.top - 8, width: scaled.width * xScale + 16, height: scaled.height * yScale + 16, weight: 100 });
    });
    container.querySelectorAll(".net-pill").forEach((pill) => { const r = pill.getBoundingClientRect(); avoid.push({ x: r.left - frame.left - 5, y: r.top - frame.top - 5, width: r.width + 10, height: r.height + 10, weight: 100 }); });
    const focus = event.focusNets ?? [];
    focus.forEach((id) => (netSegments.get(id) ?? []).forEach(({ path }) => {
      const length = path.getTotalLength();
      for (let n = 0; n <= 8; n++) { const p = path.getPointAtLength(length * n / 8).matrixTransform(matrix); avoid.push({ x: p.x - frame.left - 16, y: p.y - frame.top - 16, width: 32, height: 32 }); }
    }));
    const title = popup.querySelector("#flow-popup-title");
    title.title = title.textContent;
    const measure = document.createElement("canvas").getContext("2d");
    measure.font = getComputedStyle(title).font;
    const desiredWidth = Math.min(frame.width - 24, Math.max(330, Math.ceil(measure.measureText(title.textContent).width + 66)));
    const overlap = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    let width = desiredWidth, height, target, score = Infinity;
    for (let trial = desiredWidth; trial >= 250; trial -= 20) {
      title.style.whiteSpace = trial + 2 < desiredWidth ? "normal" : "nowrap";
      popup.style.width = `${trial}px`; popup.style.left = "0px"; popup.style.top = "0px";
      const trialHeight = popup.offsetHeight;
      const candidate = HF.placePopup(anchor, avoid, { width: frame.width, height: frame.height }, { width: trial, height: trialHeight });
      const rect = { x: candidate.x, y: candidate.y, width: trial, height: trialHeight };
      const candidateScore = avoid.reduce((total, item) => total + overlap(rect, item) * (item.weight ?? 1), 0);
      if (candidateScore < score) { width = trial; height = trialHeight; target = candidate; score = candidateScore; }
      if (score < 1) break;
    }
    popup.style.width = `${width}px`;
    title.style.whiteSpace = width + 2 < desiredWidth ? "normal" : "nowrap";
    popup.style.left = `${target.x}px`; popup.style.top = `${target.y}px`;
    popup.dataset.side = target.side;
    const tail = popup.querySelector("#flow-popup-tail");
    tail.hidden = target.fallback;
    tail.style.left = `${Math.max(12, Math.min(width - 12, anchor.x - target.x))}px`;
    tail.style.top = `${Math.max(12, Math.min(height - 12, anchor.y - target.y))}px`;
    if (target.fallback) {
      leader.hidden = false; leader.setAttribute("viewBox", `0 0 ${frame.width} ${frame.height}`);
      const line = leader.querySelector("line"); line.setAttribute("x1", anchor.x); line.setAttribute("y1", anchor.y);
      line.setAttribute("x2", Math.max(target.x, Math.min(target.x + width, anchor.x)));
      line.setAttribute("y2", Math.max(target.y, Math.min(target.y + height, anchor.y)));
    }
  }
  function render(event, progress, meta, options = {}) {
    if (geometry.presentation === "net-graph") { renderNets(event, progress, meta, options); return; }
    lastRender = { event, progress, meta, options };
    followEvent(event, meta);
    const activeEdgeId = event?.activeEdges?.[0];
    const activeIndex = activeEdgeId ? flow.order.indexOf(activeEdgeId) : -1;
    const terminal = !!event && !activeEdgeId && meta.index === meta.trace?.events.length - 1;
    if (imageSize && !editState.editing) {
      const phase = phaseFor(progress), travel = wireFraction(progress);
      container.classList.toggle("is-dimmed", !!event && options.dim !== false);
      flow.order.forEach((edgeId, index) => {
        const edge = edgeById.get(edgeId), path = pathElements.get(edge?.pathId);
        if (!path) return;
        const current = index === activeIndex && phase !== "source";
        const recent = terminal ? index === flow.order.length - 1 : index === activeIndex - 1;
        path.classList.toggle("is-active", current);
        path.classList.toggle("is-completed", recent);
        path.classList.toggle("is-old", !!event && index < activeIndex - 1);
        path.style.opacity = !event || current || recent ? "" : "0";
        if (current) {
          const length = path.getTotalLength();
          path.setAttribute("stroke-dasharray", `${length} ${length}`);
          path.setAttribute("stroke-dashoffset", String((1 - travel) * length));
        } else { path.removeAttribute("stroke-dasharray"); path.removeAttribute("stroke-dashoffset"); }
        path.removeAttribute("marker-end");
      });
      const edge = edgeById.get(activeEdgeId);
      const sourceId = edge?.from ?? event?.activeNodes?.[0];
      const sinkId = edge?.to ?? event?.activeNodes?.[0];
      const lit = phase === "arrival" ? sinkId : sourceId;
      flow.nodes.forEach((node) => {
        const group = blockElements.get(node.id); if (!group) return;
        group.classList.toggle("is-current", !!event && node.id === lit);
        group.classList.toggle("is-passed", false);
      });
      renderNodeChips(event && phase === "source" ? [sourceId] : []);
      const spotlightNodes = phase === "source" ? [sourceId] : phase === "arrival" ? [sourceId, sinkId] : [sourceId];
      renderSpotlight(event, phase, travel, new Set(spotlightNodes.filter(Boolean)), new Set([edge?.pathId].filter(Boolean)), options);
      const path = pathElements.get(edge?.pathId ?? edgeById.get(flow.order.at(-1))?.pathId);
      if (event && path && (phase !== "source" || terminal)) {
        const length = path.getTotalLength();
        const fraction = terminal ? 1 : travel;
        const point = path.getPointAtLength(length * fraction);
        const previous = path.getPointAtLength(length * Math.max(0, fraction - .1));
        markerAt(point, previous, event.values?.hexValue, terminal || activeIndex === flow.order.length - 1);
      } else if (markerGroup) markerGroup.setAttribute("visibility", "hidden");
    }
    const currentNodeId = terminal ? event?.activeNodes?.[0] : progress >= .98 ? edgeById.get(activeEdgeId)?.to : event?.activeNodes?.[0];
    const stageIndex = Math.max(0, flow.nodes.findIndex((node) => node.id === currentNodeId));
    const node = nodeById.get(currentNodeId);
    const shownValues = event?.values ?? options.inputValue;
    document.getElementById("status-value").textContent = imageSize ? translate(`ui.${meta.status === "waiting" ? "waiting" : meta.status}`) : translate("ui.unavailable");
    document.getElementById("step-value").textContent = `${event ? stageIndex + 1 : 0} / ${flow.nodes.length}`;
    document.getElementById("path-value").textContent = node?.label ?? "—";
    document.getElementById("data-value").textContent = shownValues?.hexValue ?? "—";
    document.getElementById("binary-value").textContent = shownValues?.binaryValue ?? "—";
    document.getElementById("description-value").textContent = event ? translate(meta.trace?.events[stageIndex]?.note ?? event.note, event.popup?.params) : translate(flow.readyNoteKey ?? "");
    document.getElementById("destination-row").hidden = !terminal;
    document.getElementById("destination-value").textContent = flow.nodes.at(-1)?.label ?? "—";
    const runButton = document.getElementById("run-button");
    runButton.textContent = translate(({ running: "ui.pause", done: "ui.replay", paused: "ui.resume", waiting: "ui.next" }[meta.status] ?? "ui.run"));
    runButton.disabled = !imageSize || !options.inputValid;
    document.getElementById("step-button").disabled = !imageSize || !options.inputValid || meta.status === "running" || terminal;
    document.getElementById("previous-button").disabled = meta.status === "running" || meta.index <= 0;
    document.getElementById("reset-button").disabled = meta.status === "ready";
    inputElement.disabled = meta.status === "running";
    document.querySelectorAll(".timeline-stage").forEach((button, index) => {
      button.classList.toggle("is-current", !!event && index === stageIndex);
      button.classList.toggle("is-passed", terminal || (!!event && index < stageIndex));
      button.disabled = meta.status === "running" || !imageSize || !options.inputValid;
      button.querySelector(".stage-symbol").textContent = terminal || (!!event && index < stageIndex) ? "✓" : String(index + 1);
    });
    HF.updateProgressUI?.("spi", event, meta);
    renderPopup(event, progress, meta, options);
  }
  function renderTimeline(onSeek, trace) {
    if (geometry.presentation === "net-graph") { renderNetTimeline(onSeek, trace); return; }
    const list = document.getElementById("stage-timeline"); list.replaceChildren();
    flow.nodes.forEach((node, index) => {
      const item = document.createElement("li"); const button = document.createElement("button");
      button.type = "button"; button.className = "timeline-stage";
      const symbol = document.createElement("span"); symbol.className = "stage-symbol"; symbol.textContent = String(index + 1);
      const name = document.createElement("span"); name.className = "stage-name"; name.textContent = translate(node.labelKey ?? node.label);
      button.append(symbol, name); button.addEventListener("click", () => onSeek(index)); item.append(button); list.append(item);
    });
  }
  function animateViewBox(target, instant = false) {
    if (!imageSize) return;
    if (zoomFrame !== null) cancelAnimationFrame(zoomFrame);
    zoomFrame = null;
    const from = (svg.getAttribute("viewBox") || viewBoxValues("fit").join(" ")).split(/\s+/).map(Number);
    const to = [target.x, target.y, target.width, target.height];
    if (instant || window.matchMedia("(prefers-reduced-motion: reduce)").matches || from.every((value, index) => Math.abs(value - to[index]) < .01)) {
      svg.setAttribute("viewBox", to.join(" ")); updateMarkerSize(); return;
    }
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, Math.max(0, (now - start) / 500));
      const eased = t * t * (3 - 2 * t);
      svg.setAttribute("viewBox", from.map((value, i) => value + (to[i] - value) * eased).join(" "));
      updateMarkerSize();
      if (geometry.presentation === "net-graph") renderNets(lastRender.event, lastRender.progress, lastRender.meta, lastRender.options);
      if (t < 1) zoomFrame = requestAnimationFrame(frame); else zoomFrame = null;
    }
    zoomFrame = requestAnimationFrame(frame);
  }
  function focusView(event) {
    if (!imageSize || !event) return null;
    const focusNetIds = event.focusNets ?? (event.activeEdges ?? []).map((id) => edgeById.get(id)?.pathId).filter(Boolean);
    const focusNodeIds = event.focusNodes ?? event.activeNodes ?? [];
    const nodeBoxes = focusNodeIds.map((id) => nodeGeometry(nodeById.get(id)?.geometryNodeId)?.box).filter(Boolean);
    const boxes = nodeBoxes.map((box) => { const scaled = scaleBox(box); return { x: scaled.x - 16, y: Math.max(0, scaled.y - 34), width: scaled.width + 32, height: scaled.height + 50 }; });
    const pointNearFocus = (point) => nodeBoxes.some((box) => point.x >= box.x - 35 && point.x <= box.x + box.width + 35 && point.y >= box.y - 35 && point.y <= box.y + box.height + 35);
    focusNetIds.forEach((id) => {
      const path = geometry.paths?.find((item) => item.id === id);
      const net = geometry.nets?.find((item) => item.id === id);
      const segments = path ? [{ points: path.points, from: "source" }] : net?.segments ?? [];
      segments.filter((segment) => !event.focusNodes || segment.to?.startsWith("j") || pointNearFocus(segment.points.at(-1))).forEach((segment) => {
        segment.points.forEach((point) => { const scaled = scalePoint(point); boxes.push({ x: scaled.x - 22, y: scaled.y - 30, width: 44, height: 60 }); });
      });
    });
    const area = svg.getBoundingClientRect();
    const midX = boxes.length ? (Math.min(...boxes.map((box) => box.x)) + Math.max(...boxes.map((box) => box.x + box.width))) / 2 : imageSize.width / 2;
    return HF.computeCameraViewBox({ imageWidth: imageSize.width, imageHeight: imageSize.height,
      viewportWidth: area.width || 1, viewportHeight: area.height || 1, focusBoxes: boxes,
      padding: .18, popupSide: event.popup ? (midX < imageSize.width / 2 ? "right" : "left") : "auto" });
  }
  function followEvent(event, meta) {
    if (!followEnabled || editState.editing || meta.index === followedIndex) return;
    followedIndex = meta.index;
    const view = focusView(event);
    if (view) animateViewBox(view);
  }
  function setFollow(value) {
    followEnabled = !!value && !editState.editing;
    if (!followEnabled && zoomFrame !== null) { cancelAnimationFrame(zoomFrame); zoomFrame = null; }
    followedIndex = -2;
    const button = document.getElementById("focus-button");
    button.classList.toggle("is-selected", followEnabled);
    button.setAttribute("aria-pressed", String(followEnabled));
    if (followEnabled) followEvent(lastRender.event, lastRender.meta);
  }
  function setZoom(mode) {
    if (!imageSize) return;
    if (mode === "fit") { setFollow(false); zoomMode = "fit"; animateViewBox({ x: 0, y: 0, width: imageSize.width, height: imageSize.height }); }
    else if (mode === "focus") setFollow(true);
  }
  function currentViewBox() { return svg.getAttribute("viewBox").split(/\s+/).map(Number); }
  function manualView(next) {
    if (zoomFrame !== null) cancelAnimationFrame(zoomFrame);
    zoomFrame = null; setFollow(false);
    const width = Math.max(imageSize.width * .3, Math.min(imageSize.width, next[2]));
    const height = Math.max(imageSize.height * .3, Math.min(imageSize.height, next[3]));
    const x = Math.max(0, Math.min(imageSize.width - width, next[0]));
    const y = Math.max(0, Math.min(imageSize.height - height, next[1]));
    svg.setAttribute("viewBox", [x, y, width, height].join(" "));
    updateMarkerSize();
    if (geometry.presentation === "net-graph") renderNets(lastRender.event, lastRender.progress, lastRender.meta, lastRender.options);
  }
  svg.addEventListener("wheel", (event) => {
    if (!imageSize || editState.editing || container.classList.contains("is-net-graph") !== (geometry.presentation === "net-graph")) return;
    event.preventDefault();
    const [x, y, width, height] = currentViewBox();
    const factor = event.deltaY < 0 ? .9 : 1.1;
    const rect = svg.getBoundingClientRect();
    const mx = (event.clientX - rect.left) / rect.width, my = (event.clientY - rect.top) / rect.height;
    const nextW = width * factor, nextH = height * factor;
    manualView([x + (width - nextW) * mx, y + (height - nextH) * my, nextW, nextH]);
  }, { passive: false });
  svg.addEventListener("pointerdown", (event) => {
    if (!imageSize || editState.editing || event.button !== 0 || container.classList.contains("is-net-graph") !== (geometry.presentation === "net-graph")) return;
    dragging = { x: event.clientX, y: event.clientY, view: currentViewBox() };
    svg.setPointerCapture(event.pointerId);
  });
  svg.addEventListener("pointermove", (event) => {
    if (!dragging || !imageSize) return;
    const area = svg.getBoundingClientRect();
    const [x, y, width, height] = dragging.view;
    manualView([x - (event.clientX - dragging.x) * width / area.width, y - (event.clientY - dragging.y) * height / area.height, width, height]);
  });
  svg.addEventListener("pointerup", () => { dragging = null; });
  svg.addEventListener("pointercancel", () => { dragging = null; });
  function clientToReference(event) {
    if (!imageSize) return null;
    const point = svg.createSVGPoint(); point.x = event.clientX; point.y = event.clientY;
    const local = point.matrixTransform(svg.getScreenCTM().inverse());
    if (local.x < 0 || local.x > imageSize.width || local.y < 0 || local.y > imageSize.height) return null;
    return { x: Math.round(local.x * geometry.viewBox.width / imageSize.width), y: Math.round(local.y * geometry.viewBox.height / imageSize.height) };
  }
  function renderNetStatic(nextEditState = editState) {
    editState = nextEditState;
    svg.removeAttribute("hidden");
    svg.setAttribute("viewBox", viewBoxValues(zoomMode).join(" "));
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.replaceChildren(); netSegments.clear(); blockElements.clear();
    container.classList.add("is-net-graph");
    const image = makeSvg("image", "spec-image");
    image.setAttribute("href", geometry.image);
    image.setAttribute("width", imageSize.width); image.setAttribute("height", imageSize.height);
    svg.append(image);
    appendSpotlight();
    const blockLayer = makeSvg("g", "block-overlay");
    flow.nodes.forEach((node) => {
      const geometryNode = nodeGeometry(node.geometryNodeId);
      if (!geometryNode) return;
      const box = scaleBox(geometryNode.box);
      const group = makeSvg("g", "spec-block net-block"); group.dataset.nodeId = node.id;
      const rect = makeSvg("rect");
      for (const [key, value] of Object.entries({ x: box.x, y: box.y, width: box.width, height: box.height })) rect.setAttribute(key, value);
      const label = makeSvg("text"); label.setAttribute("x", box.x + 6); label.setAttribute("y", Math.max(22, box.y - 8)); label.textContent = node.label;
      group.append(rect, label); blockLayer.append(group); blockElements.set(node.id, group);
    });
    svg.append(blockLayer);
    geometry.nets.forEach((netGeometry) => {
      const visibleNet = editState.editing && editState.selectedNetId === netGeometry.id && editState.draftNet ? editState.draftNet : netGeometry;
      const group = makeSvg("g", "net-group"); group.dataset.netId = netGeometry.id;
      const items = [];
      visibleNet.segments.forEach((segment) => {
        if (!Array.isArray(segment.points) || segment.points.length < 2) return;
        const segmentGroup = makeSvg("g", "net-segment"); segmentGroup.dataset.segmentId = segment.id;
        const path = makeSvg("path", "net-base");
        const draft = editState.editing && editState.selectedNetId === netGeometry.id && editState.selectedSegmentId === segment.id ? editState.pointsDraft : null;
        path.setAttribute("d", pathData(draft ?? segment.points));
        const casing = makeSvg("path", "net-casing"); casing.setAttribute("d", path.getAttribute("d"));
        const fill = makeSvg("path", "net-fill"); fill.setAttribute("d", path.getAttribute("d"));
        const inner = makeSvg("path", "net-inner"); inner.setAttribute("d", path.getAttribute("d"));
        const direction = makeSvg("path", "net-direction"); direction.setAttribute("d", path.getAttribute("d"));
        const pulse = makeSvg("circle", "net-pulse"); pulse.setAttribute("r", "13"); pulse.setAttribute("visibility", "hidden");
        segmentGroup.append(path, casing, fill, inner, direction, pulse);
        if (editState.editing) {
          segmentGroup.classList.toggle("is-selected", netGeometry.id === editState.selectedNetId && segment.id === editState.selectedSegmentId);
          path.addEventListener("click", (event) => { event.stopPropagation(); onSelectNet(netGeometry.id, segment.id); });
        }
        group.append(segmentGroup); items.push({ segment, path, casing, fill, inner, direction, pulse, group: segmentGroup });
      });
      netSegments.set(netGeometry.id, items);
      visibleNet.junctions.forEach((junction) => {
        const circle = makeSvg("circle", "net-junction"); const point = scalePoint(junction);
        circle.setAttribute("cx", point.x); circle.setAttribute("cy", point.y); circle.setAttribute("r", "7");
        group.append(circle);
      });
      const label = makeSvg("text", "net-debug-label");
      const first = items[0]?.path;
      if (first) { const point = first.getPointAtLength(first.getTotalLength() * .5); label.setAttribute("x", point.x); label.setAttribute("y", point.y - 10); }
      label.textContent = netById.get(netGeometry.id)?.label ?? netGeometry.id; group.append(label);
      svg.append(group);
    });
    if (editState.editing) {
      const netGeometry = editState.draftNet ?? geometry.nets.find((net) => net.id === editState.selectedNetId);
      const segment = netGeometry?.segments.find((item) => item.id === editState.selectedSegmentId);
      (editState.pointsDraft ?? segment?.points ?? []).forEach((point, index) => {
        const screen = scalePoint(point);
        const control = makeSvg("circle", "control-point");
        if (index === editState.selectedPointIndex) control.classList.add("is-selected");
        control.setAttribute("cx", screen.x); control.setAttribute("cy", screen.y); control.setAttribute("r", "10");
        control.addEventListener("click", (event) => { event.stopPropagation(); onSelectNetPoint(index); });
        svg.append(control);
      });
    }
    const pillLayer = makeSvg("g", "net-pill-layer"); svg.append(pillLayer);
    svg.append(makeSvg("g", "mux-selection-layer"));
    svg.append(makeSvg("g", "node-chip-layer"));
    renderNets(lastRender.event, lastRender.progress, lastRender.meta, lastRender.options);
  }
  function renderNetTimeline(onSeek, trace) {
    if (!netUI?.timeline || !trace) return;
    netUI.timeline.replaceChildren();
    trace.events.forEach((event, index) => {
      const button = document.createElement("button"); button.type = "button";
      button.className = "net-timeline-step"; button.dataset.level = String(index + 1);
      button.textContent = `${index + 1} · ${translate(event.captionKey ?? event.caption, event.popup?.params)}`;
      button.addEventListener("click", () => onSeek(index)); netUI.timeline.append(button);
    });
  }
  function renderSpotlight(event, phase, travel, focusNodes, focusNets, options) {
    const shade = svg.querySelector(".spotlight-shade"), cutouts = svg.querySelector(".spotlight-cutouts");
    if (!shade || !cutouts) return;
    shade.setAttribute("visibility", event && options.dim !== false ? "visible" : "hidden");
    cutouts.replaceChildren();
    if (!event || options.dim === false) return;
    const matrix = svg.getScreenCTM(); const scale = matrix ? Math.max(.01, Math.hypot(matrix.a, matrix.b)) : 1;
    svg.querySelector("#hf-spotlight-soft feGaussianBlur")?.setAttribute("stdDeviation", String(9 / scale));
    focusNodes.forEach((id) => {
      const box = nodeGeometry(nodeById.get(id)?.geometryNodeId)?.box; if (!box) return;
      const b = scaleBox(box), pad = 24 / scale;
      const rect = makeSvg("rect"); rect.setAttribute("x", b.x - pad); rect.setAttribute("y", b.y - pad);
      rect.setAttribute("width", b.width + 2 * pad); rect.setAttribute("height", b.height + 2 * pad);
      rect.setAttribute("rx", 18 / scale); rect.setAttribute("fill", "black"); cutouts.append(rect);
    });
    if (phase === "source") return;
    focusNets.forEach((id) => (netSegments.get(id) ?? (pathElements.get(id) ? [{ path: pathElements.get(id) }] : [])).forEach(({ path }) => {
      const length = path.getTotalLength();
      const cut = makeSvg("path"); cut.setAttribute("d", path.getAttribute("d")); cut.setAttribute("fill", "none");
      cut.setAttribute("stroke", "black"); cut.setAttribute("stroke-width", 48 / scale); cut.setAttribute("stroke-linecap", "round");
      cut.setAttribute("stroke-linejoin", "round"); cut.setAttribute("stroke-dasharray", `${length} ${length}`);
      cut.setAttribute("stroke-dashoffset", String((1 - (phase === "arrival" ? 1 : travel)) * length)); cutouts.append(cut);
    }));
  }
  function renderNets(event, progress, meta, options = {}) {
    lastRender = { event, progress, meta, options };
    followEvent(event, meta);
    if (!netUI) return;
    const trace = meta.trace;
    const story = options.presentation !== "full" && Array.isArray(event?.focusNets);
    const focusNets = story ? new Set(event.focusNets) : new Set(event?.activeNets?.map((net) => net.id) ?? []);
    const focusNodes = story ? new Set(event.focusNodes ?? []) : new Set(event?.activeNodes ?? []);
    const active = new Map((event?.activeNets ?? []).map((item) => [item.id, item]));
    const phase = phaseFor(progress), travel = wireFraction(progress);
    const sourceNodes = new Set([...focusNets].map((id) => netById.get(id)?.from).filter(Boolean));
    if (!sourceNodes.size && !event?.stateWrites?.length) focusNodes.forEach((id) => sourceNodes.add(id));
    const arrivalNodes = new Set([...focusNodes].filter((id) => !sourceNodes.has(id)));
    if (event?.stateWrites?.length) event.stateWrites.forEach((write) => arrivalNodes.add(write.node));
    const unused = new Set(event?.unused ?? []);
    const selected = event?.muxSelect ?? {};
    const selectedInputs = new Map(), unselectedInputs = new Map(), selectors = new Set();
    (flow.muxes ?? []).forEach((mux) => {
      if (!selected[mux.id]) return;
      selectors.add(mux.selectNet);
      mux.inputs.forEach((netId) => {
        const target = netId === selected[mux.id] ? selectedInputs : unselectedInputs;
        if (!target.has(netId)) target.set(netId, new Set());
        target.get(netId).add(mux.id);
      });
    });
    const history = trace?.events.slice(0, Math.max(0, meta.index)) ?? [];
    const previous = new Set(history.at(-1)?.focusNets ?? history.at(-1)?.activeNets?.map((net) => net.id) ?? []);
    const older = new Set(history.slice(0, -1).flatMap((item) => item.focusNets ?? item.activeNets?.map((net) => net.id) ?? []));
    if (imageSize && !editState.editing) {
      container.classList.toggle("is-dimmed", !!event && options.dim !== false);
      container.classList.toggle("is-story", story);
      const pillLayer = svg.querySelector(".net-pill-layer"); pillLayer?.replaceChildren();
      const selectionLayer = svg.querySelector(".mux-selection-layer"); selectionLayer?.replaceChildren();
      const matrix = svg.getScreenCTM();
      const xScale = matrix ? Math.hypot(matrix.a, matrix.b) : 1;
      const yScale = matrix ? Math.hypot(matrix.c, matrix.d) : 1;
      const containerBox = container.getBoundingClientRect();
      const placed = [];
      let pillCount = 0;
      const focalBoxes = [...focusNodes].map((id) => nodeGeometry(nodeById.get(id)?.geometryNodeId)?.box).filter(Boolean);
      const pointInFocus = (point) => focalBoxes.some((box) => point.x >= box.x - 35 && point.x <= box.x + box.width + 35 && point.y >= box.y - 35 && point.y <= box.y + box.height + 35);
      geometry.nets.forEach((netGeometry) => {
        const netGroup = [...svg.querySelectorAll(".net-group")].find((group) => group.dataset.netId === netGeometry.id);
        const net = netById.get(netGeometry.id);
        const signal = active.get(netGeometry.id);
        const isFocus = !!signal && focusNets.has(netGeometry.id) && !(story && unused.has(netGeometry.id));
        const isSecondary = !!signal && !isFocus;
        const isHiddenControl = story && isSecondary && net?.role === "control";
        const isHiddenUnused = story && unused.has(netGeometry.id) && !options.revealUnused;
        netGroup?.classList.toggle("has-active", isFocus);
        netGroup?.classList.toggle("is-secondary", isSecondary);
        netGroup?.classList.toggle("is-hidden-control", isHiddenControl);
        netGroup?.classList.toggle("is-hidden-unused", isHiddenUnused);
        netGroup?.classList.toggle("is-recent", !!(previous.has(netGeometry.id) || (options.keepFullTrail && older.has(netGeometry.id))) && !isFocus);
        netGroup?.classList.toggle("is-old", older.has(netGeometry.id) && !previous.has(netGeometry.id) && !isFocus && !options.keepFullTrail);
        if (netGroup) netGroup.style.opacity = story && !debugNets ?
          (isFocus ? (phase === "source" ? "0" : "1") : previous.has(netGeometry.id) || (options.keepFullTrail && older.has(netGeometry.id)) ? ".5" : options.revealUnused && unused.has(netGeometry.id) ? ".25" : "0") : "";
        const title = netGroup?.querySelector("title") ?? makeSvg("title");
        title.textContent = signal ? `${net?.label ?? netGeometry.id} = ${signal.value}` : (net?.label ?? netGeometry.id);
        if (netGroup && !title.parentNode) netGroup.append(title);
        if (netGroup) netGroup.onclick = editState.editing ? null : () => { netUI.detail.textContent = title.textContent; };
        const items = netSegments.get(netGeometry.id) ?? [];
        const itemByTo = new Map(items.map((item) => [item.segment.to, item]));
        const distanceCache = new Map([["source", 0]]);
        function distanceTo(name, seen = new Set()) {
          if (distanceCache.has(name)) return distanceCache.get(name);
          if (seen.has(name)) return 0;
          seen.add(name);
          const predecessor = itemByTo.get(name);
          const distance = predecessor ? distanceTo(predecessor.segment.from, seen) + predecessor.path.getTotalLength() : 0;
          distanceCache.set(name, distance); return distance;
        }
        const lengths = items.map((item) => ({ item, start: distanceTo(item.segment.from), length: item.path.getTotalLength() }));
        const total = Math.max(1, ...lengths.map(({ start, length }) => start + length));
        items.forEach(({ path, casing, fill, inner, direction, pulse, group, segment }, index) => {
          const isSelect = selectors.has(netGeometry.id) && (!story || isFocus);
          const isUnselected = unselectedInputs.get(netGeometry.id)?.has(segment.to);
          const isSelected = selectedInputs.get(netGeometry.id)?.has(segment.to);
          const end = segment.points.at(-1);
          const branchFocused = !story || pointInFocus(end) || segment.to.startsWith("j");
          const pulseThis = (isFocus || (!story && isSelect)) && branchFocused && !isUnselected;
          group.classList.toggle("is-active-net", pulseThis);
          group.classList.toggle("is-control-net", net?.role === "control");
          group.classList.toggle("is-unused-net", unused.has(netGeometry.id));
          group.classList.toggle("is-unselected-input", !!isUnselected);
          group.classList.toggle("is-selected-input", !!isSelected && (!story || pulseThis));
          group.classList.toggle("is-select-wire", isSelect);
          group.classList.toggle("is-secondary-segment", isFocus && !branchFocused);
          const own = lengths[index];
          const fraction = pulseThis ? Math.max(0, Math.min(1, (travel * total - own.start) / Math.max(1, own.length))) : 0;
          for (const layer of [casing, fill, inner, direction]) {
            layer.style.strokeDasharray = layer === direction ? "8 17" : `${own.length} ${own.length}`;
            layer.style.strokeDashoffset = layer === direction ? String(-travel * 48) : String((1 - fraction) * own.length);
            layer.setAttribute("visibility", fraction > 0 ? "visible" : "hidden");
          }
          if (fraction > 0) {
            const count = Math.max(2, Math.ceil(own.length * fraction / 12));
            const points = Array.from({ length: count + 1 }, (_, n) => path.getPointAtLength(own.length * fraction * n / count));
            direction.setAttribute("d", `M ${points[0].x} ${points[0].y} ${points.slice(1).map((point) => `L ${point.x} ${point.y}`).join(" ")}`);
          }
          if (phase === "wire" && fraction > 0 && fraction < 1) {
            const point = path.getPointAtLength(own.length * fraction);
            pulse.setAttribute("cx", point.x); pulse.setAttribute("cy", point.y);
            pulse.setAttribute("r", String(8 / Math.max(.01, xScale)));
            pulse.setAttribute("visibility", "visible");
          } else pulse.setAttribute("visibility", "hidden");
        });
        if (phase !== "arrival" || !signal || !items.length || !pillLayer || isHiddenControl || isHiddenUnused || (story && (!isFocus || pillCount >= 3))) return;
        const candidate = items.reduce((best, item) => item.path.getTotalLength() > best.path.getTotalLength() ? item : best, items[0]);
        const midpoint = candidate.path.getPointAtLength(candidate.path.getTotalLength() * .5);
        const screen = midpoint.matrixTransform(matrix);
        const labelText = `${net?.label ?? netGeometry.id} = ${signal.value}`;
        const widthPx = Math.max(94, labelText.length * 8 + 20), heightPx = 27;
        const offsets = [[14, 17], [14, -37], [-widthPx - 14, 17], [-widthPx - 14, -37], [18, 47], [18, -66]];
        const ownSamples = Array.from({ length: 9 }, (_, i) => candidate.path.getPointAtLength(candidate.path.getTotalLength() * i / 8).matrixTransform(matrix));
        let target = null;
        for (const [dx, dy] of offsets) {
          const rect = { x: screen.x + dx, y: screen.y + dy, w: widthPx, h: heightPx };
          if (rect.x < containerBox.left + 4 || rect.x + rect.w > containerBox.right - 4 || rect.y < containerBox.top + 44 || rect.y + rect.h > containerBox.bottom - 20) continue;
          if (placed.some((other) => rect.x < other.x + other.w + 5 && rect.x + rect.w + 5 > other.x && rect.y < other.y + other.h + 4 && rect.y + rect.h + 4 > other.y)) continue;
          if (ownSamples.some((point) => point.x >= rect.x - 3 && point.x <= rect.x + rect.w + 3 && point.y >= rect.y - 3 && point.y <= rect.y + rect.h + 3)) continue;
          target = rect; break;
        }
        if (!target) return;
        placed.push(target); pillCount += 1;
        const anchor = svg.createSVGPoint(); anchor.x = target.x; anchor.y = target.y;
        const local = anchor.matrixTransform(matrix.inverse());
        const pill = makeSvg("g", `net-pill ${net?.role === "control" ? "is-control" : ""} ${unused.has(netGeometry.id) ? "is-unused" : ""}`);
        const rect = makeSvg("rect");
        for (const [key, value] of Object.entries({ x: local.x, y: local.y, width: widthPx / xScale, height: heightPx / yScale, rx: 5 })) rect.setAttribute(key, value);
        const label = makeSvg("text"); label.setAttribute("x", local.x + 8 / xScale); label.setAttribute("y", local.y + 16 / yScale);
        label.setAttribute("font-size", 14 / yScale); label.textContent = labelText;
        pill.append(rect, label); pillLayer.append(pill);
        if (!story && unused.has(netGeometry.id)) {
          const hint = makeSvg("text", "net-unused-hint"); hint.setAttribute("x", local.x); hint.setAttribute("y", local.y + 37 / yScale);
          hint.setAttribute("font-size", 10 / yScale); hint.textContent = translate("ui.unusedHint"); pillLayer.append(hint);
        }
      });
      renderSpotlight(event, phase, travel, focusNodes, focusNets, options);
      if (selectionLayer && phase !== "source") {
        selectedInputs.forEach((muxIds, netId) => {
          (netSegments.get(netId) ?? []).forEach(({ segment, path }) => {
            if (!muxIds.has(segment.to) || (story && !focusNodes.has(segment.to))) return;
            const point = path.getPointAtLength(path.getTotalLength());
            const marker = makeSvg("circle", "mux-selected-port");
            marker.setAttribute("cx", point.x); marker.setAttribute("cy", point.y);
            marker.setAttribute("r", 8 / Math.max(.01, xScale)); selectionLayer.append(marker);
          });
        });
      }
      flow.nodes.forEach((node) => {
        const group = blockElements.get(node.id); if (!group) return;
        const current = phase === "arrival" ? arrivalNodes.has(node.id) : sourceNodes.has(node.id);
        group.classList.toggle("is-current", !!event && current);
        group.classList.toggle("is-passed", !story && !!event && !current && meta.index > 0 && trace?.events.slice(0, meta.index).some((earlier) => (earlier.focusNodes ?? earlier.activeNodes).includes(node.id)));
      });
      renderNodeChips(event && phase === "source" ? [...sourceNodes] : []);
    }
    netUI.badge.textContent = translate(trace?.badgeKey ?? flow.badgeKey ?? "ui.dependency");
    netUI.status.textContent = imageSize ? translate(`ui.${meta.status}`) : translate("ui.unavailable");
    netUI.level.textContent = `${event ? meta.index + 1 : 0} / ${trace?.events.length ?? 0}`;
    netUI.run.textContent = translate(({ running: "ui.pause", waiting: "ui.next", done: "ui.replay", paused: meta.pacing === "guided" ? "ui.next" : "ui.resume" }[meta.status] ?? "ui.run"));
    netUI.run.disabled = !imageSize || !options.inputValid;
    netUI.step.disabled = !imageSize || !options.inputValid || meta.status === "running" || meta.status === "done";
    netUI.previous.disabled = meta.status === "running" || meta.index <= 0;
    netUI.reset.disabled = meta.status === "ready";
    (netUI.inputs ?? []).forEach((input) => { input.disabled = meta.status === "running"; });
    [...netUI.timeline.children].forEach((button, index) => {
      button.classList.toggle("is-current", !!event && index === meta.index);
      button.classList.toggle("is-passed", !!event && index < meta.index);
      button.disabled = meta.status === "running" || !imageSize || !options.inputValid;
    });
    const currentStep = netUI.timeline.children[meta.index];
    if (currentStep) {
      const listBox = netUI.timeline.getBoundingClientRect(), stepBox = currentStep.getBoundingClientRect();
      if (stepBox.top < listBox.top) netUI.timeline.scrollTop -= listBox.top - stepBox.top;
      else if (stepBox.bottom > listBox.bottom) netUI.timeline.scrollTop += stepBox.bottom - listBox.bottom;
    }
    const state = new Map((trace?.initialState ?? []).map((item) => [`${item.node}.${item.field}`, { ...item }]));
    if (trace && meta.index >= 0) trace.events.slice(0, meta.index + 1).forEach((item) => item.stateWrites?.forEach((write) => state.set(`${write.node}.${write.field}`, write)));
    const changed = new Set(event?.phase === "clock-edge" ? (event.stateWrites ?? []).map((item) => `${item.node}.${item.field}`) : []);
    const stateKey = `${meta.index}:${[...state].map(([key, item]) => `${key}=${item.value}`).join("|")}`;
    if (stateKey !== lastStateKey) {
      lastStateKey = stateKey;
      netUI.state.replaceChildren();
      state.forEach((item, key) => {
        const row = document.createElement("div"); row.className = "state-row";
        row.classList.toggle("is-written", changed.has(key));
        const label = document.createElement("span"); label.textContent = item.fieldLabel ?? (item.field === "value" ? (flow.nodes.find((node) => node.id === item.node)?.label ?? item.node) : item.field);
        const value = document.createElement("strong"); value.textContent = item.value;
        if (item.sourceKey) { const marker = document.createElement("small"); marker.textContent = translate(item.sourceKey); label.append(" ", marker); }
        row.append(label, value); netUI.state.append(row);
      });
    }
    if (netUI.caption) {
      netUI.caption.hidden = !event; netUI.caption.textContent = event ? translate(event.captionKey ?? event.caption, event.popup?.params) : "";
      netUI.stepMeta.textContent = translate("ui.step", { n: event ? meta.index + 1 : 0, total: trace?.events.length ?? 0 });
      const parallelPrevious = !!event && meta.index > 0 && event.dependencyLevel === trace.events[meta.index - 1].dependencyLevel;
      const parallelNext = !!event && meta.index < trace.events.length - 1 && event.dependencyLevel === trace.events[meta.index + 1].dependencyLevel;
      const parallel = parallelPrevious || parallelNext;
      netUI.parallel.hidden = !parallel;
      netUI.parallel.textContent = parallel ? translate("ui.parallel", { n: parallelPrevious ? meta.index : meta.index + 2 }) : "";
      netUI.detail.textContent = event ? translate(event.detailKey ?? event.detail, event.popup?.params) : "";
      const controls = new Map();
      trace?.events.slice(0, meta.index + 1).forEach((item) => item.activeNets.filter((net) => net.role === "control" && !item.unused.includes(net.id)).forEach((net) => controls.set(net.id, net)));
      netUI.controls.replaceChildren();
      controls.forEach((net) => {
        const chip = document.createElement("span"); chip.className = "net-control-chip";
        chip.classList.toggle("is-relevant", active.has(net.id));
        chip.textContent = `${netById.get(net.id)?.label ?? net.id} = ${net.displayKey ? translate(net.displayKey) : net.value}`; netUI.controls.append(chip);
      });
      netUI.unused.hidden = !story || !unused.size;
      netUI.unusedButton.textContent = translate("ui.unused", { n: unused.size });
      netUI.unusedList.hidden = !options.revealUnused;
      netUI.unusedList.textContent = [...unused].map((id) => netById.get(id)?.label ?? id).join(" · ");
      netUI.nextPrompt.hidden = meta.status !== "waiting";
      netUI.footer.hidden = !!editState.editing;
    }
    HF.updateProgressUI?.("riscv", event, meta);
    renderPopup(event, progress, meta, options);
  }

  return {
    render, renderStatic, renderTimeline, setZoom, setFollow, updateMarkerSize, durationForEvent, clientToReference,
    cameraTarget: focusView,
    snapCamera(event) {
      const target = focusView(event);
      if (target) {
        animateViewBox(target, true);
        if (geometry.presentation === "net-graph") renderNets(lastRender.event, lastRender.progress, lastRender.meta, lastRender.options);
      }
    },
    setDebug(value) { debugNets = !!value; container.classList.toggle("is-net-debug", debugNets); if (geometry.presentation === "net-graph") renderNets(lastRender.event, lastRender.progress, lastRender.meta, lastRender.options); },
    setImageSize(size, renderNow = true) { imageSize = size; if (size && renderNow) renderStatic(); else if (!size && renderNow) svg.setAttribute("hidden", ""); },
    get imageSize() { return imageSize; }
  };
};
