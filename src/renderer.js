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
  let zoomMode = "focus";
  let zoomFrame = null;
  let markerGroup, markerTrail, markerDot, markerLabel;
  let editState = { editing: false, selectedPathId: null, pointsDraft: null, selectedPointIndex: null };
  let lastRender = { event: null, progress: 0, meta: { status: "ready", index: -1 }, options: {} };
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
  function viewBoxValues(mode) {
    if (!imageSize) return [0, 0, geometry.viewBox.width, geometry.viewBox.height];
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
    updateMarkerSize();
    render(lastRender.event, lastRender.progress, lastRender.meta, lastRender.options);
  }
  function durationForEvent(event, index) {
    if (geometry.presentation === "net-graph") return 1300;
    const edge = edgeById.get(event?.activeEdges?.[0]);
    const path = edge && pathElements.get(edge.pathId);
    if (!path) return 1;
    const travel = Math.max(900, Math.min(1600, path.getTotalLength() / 130 * 1000));
    return travel + (index > 0 ? 420 : 0);
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
  function render(event, progress, meta, options = {}) {
    if (geometry.presentation === "net-graph") { renderNets(event, progress, meta, options); return; }
    lastRender = { event, progress, meta, options };
    const activeEdgeId = event?.activeEdges?.[0];
    const activeIndex = activeEdgeId ? flow.order.indexOf(activeEdgeId) : -1;
    const terminal = !!event && !activeEdgeId && meta.index === meta.trace?.events.length - 1;
    if (imageSize && !editState.editing) {
      container.classList.toggle("is-dimmed", !!event && options.dim !== false);
      flow.order.forEach((edgeId, index) => {
        const edge = edgeById.get(edgeId); const path = pathElements.get(edge?.pathId);
        if (!path) return;
        path.classList.toggle("is-active", index === activeIndex);
        path.classList.toggle("is-completed", terminal || index < activeIndex);
        path.setAttribute("marker-end", index === activeIndex ? "url(#spec-arrow)" : "");
      });
      const arrivalNodeId = progress >= .98 ? edgeById.get(activeEdgeId)?.to : null;
      const currentNodeId = terminal ? event.activeNodes[0] : arrivalNodeId ?? event?.activeNodes?.[0];
      const currentNodeIndex = flow.nodes.findIndex((node) => node.id === currentNodeId);
      flow.nodes.forEach((node, index) => {
        const group = blockElements.get(node.id);
        if (!group) return;
        group.classList.toggle("is-current", !!event && node.id === currentNodeId);
        group.classList.toggle("is-passed", !!event && index < currentNodeIndex);
      });
      if (event) {
        const edge = edgeById.get(activeEdgeId) ?? edgeById.get(flow.order.at(-1));
        const path = pathElements.get(edge?.pathId);
        if (path) {
          let point, previous;
          if (terminal) {
            point = path.getPointAtLength(path.getTotalLength()); previous = path.getPointAtLength(path.getTotalLength());
          } else {
            const duration = durationForEvent(event, activeIndex);
            const bridgePortion = activeIndex > 0 && !meta.manualSeek ? 420 / duration : 0;
            if (bridgePortion && progress < bridgePortion) {
              const beforeEdge = edgeById.get(flow.order[activeIndex - 1]);
              const beforePath = pathElements.get(beforeEdge.pathId);
              const from = beforePath.getPointAtLength(beforePath.getTotalLength()); const to = path.getPointAtLength(0);
              const fraction = progress / bridgePortion;
              const along = (t) => ({ x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t });
              point = along(fraction); previous = along(Math.max(0, fraction - .14));
            } else {
              const fraction = bridgePortion ? (progress - bridgePortion) / (1 - bridgePortion) : progress;
              const length = path.getTotalLength();
              point = path.getPointAtLength(length * fraction); previous = path.getPointAtLength(length * Math.max(0, fraction - .18));
            }
          }
          markerAt(point, previous, event.values?.hexValue, terminal || activeIndex === flow.order.length - 1);
        }
      } else if (markerGroup) markerGroup.setAttribute("visibility", "hidden");
    }
    const currentNodeId = terminal ? event?.activeNodes?.[0] : progress >= .98 ? edgeById.get(activeEdgeId)?.to : event?.activeNodes?.[0];
    const stageIndex = Math.max(0, flow.nodes.findIndex((node) => node.id === currentNodeId));
    const node = nodeById.get(currentNodeId);
    const shownValues = event?.values ?? options.inputValue;
    document.getElementById("status-value").textContent = imageSize ? ({ running: "Running", paused: "Paused", done: "Done" }[meta.status] ?? "Ready") : "Diagram unavailable";
    document.getElementById("step-value").textContent = `${event ? stageIndex + 1 : 0} / ${flow.nodes.length}`;
    document.getElementById("path-value").textContent = node?.label ?? "—";
    document.getElementById("data-value").textContent = shownValues?.hexValue ?? "—";
    document.getElementById("binary-value").textContent = shownValues?.binaryValue ?? "—";
    document.getElementById("description-value").textContent = event ? (meta.trace?.events[stageIndex]?.note ?? event.note) : flow.readyNote;
    const ref = flow.specRef;
    const verified = !!(ref?.doc && ref?.section && Number.isInteger(ref.page) && ref.page > 0 && Array.isArray(ref.signals) && ref.signals.length);
    const refElement = document.getElementById("spec-ref-value");
    refElement.textContent = verified ? `${ref.doc}, ${ref.section}, p. ${ref.page} (${ref.signals.join(", ")})` : "Unverified — no specRef";
    refElement.classList.toggle("unverified", !verified);
    document.getElementById("destination-row").hidden = !terminal;
    document.getElementById("destination-value").textContent = flow.nodes.at(-1)?.label ?? "—";
    const runButton = document.getElementById("run-button");
    runButton.textContent = ({ running: "Pause Ⅱ", done: "Replay ↺", paused: "Resume →" }[meta.status] ?? "Run →");
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
  }
  function renderTimeline(onSeek, trace) {
    if (geometry.presentation === "net-graph") { renderNetTimeline(onSeek, trace); return; }
    const list = document.getElementById("stage-timeline"); list.replaceChildren();
    flow.nodes.forEach((node, index) => {
      const item = document.createElement("li"); const button = document.createElement("button");
      button.type = "button"; button.className = "timeline-stage";
      const symbol = document.createElement("span"); symbol.className = "stage-symbol"; symbol.textContent = String(index + 1);
      const name = document.createElement("span"); name.className = "stage-name"; name.textContent = node.label;
      button.append(symbol, name); button.addEventListener("click", () => onSeek(index)); item.append(button); list.append(item);
    });
  }
  function setZoom(mode) {
    if (!imageSize || zoomMode === mode) return;
    if (zoomFrame !== null) cancelAnimationFrame(zoomFrame);
    const from = svg.getAttribute("viewBox").split(/\s+/).map(Number);
    const to = viewBoxValues(mode); zoomMode = mode; const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / 260); const eased = t * t * (3 - 2 * t);
      svg.setAttribute("viewBox", from.map((value, i) => value + (to[i] - value) * eased).join(" "));
      updateMarkerSize();
      if (t < 1) zoomFrame = requestAnimationFrame(frame); else zoomFrame = null;
    }
    zoomFrame = requestAnimationFrame(frame);
    document.getElementById("fit-button").classList.toggle("is-selected", mode === "fit");
    document.getElementById("focus-button").classList.toggle("is-selected", mode === "focus");
  }
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
        const fill = makeSvg("path", "net-fill"); fill.setAttribute("d", path.getAttribute("d"));
        const pulse = makeSvg("circle", "net-pulse"); pulse.setAttribute("r", "13"); pulse.setAttribute("visibility", "hidden");
        segmentGroup.append(path, fill, pulse);
        if (editState.editing) {
          segmentGroup.classList.toggle("is-selected", netGeometry.id === editState.selectedNetId && segment.id === editState.selectedSegmentId);
          path.addEventListener("click", (event) => { event.stopPropagation(); onSelectNet(netGeometry.id, segment.id); });
        }
        group.append(segmentGroup); items.push({ segment, path, fill, pulse, group: segmentGroup });
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
    renderNets(lastRender.event, lastRender.progress, lastRender.meta, lastRender.options);
  }
  function renderNetTimeline(onSeek, trace) {
    if (!netUI?.timeline || !trace) return;
    netUI.timeline.replaceChildren();
    trace.events.forEach((event, index) => {
      const button = document.createElement("button"); button.type = "button";
      button.className = "net-timeline-step"; button.dataset.level = String(index + 1);
      button.textContent = `L${index + 1} · ${event.caption}`;
      button.addEventListener("click", () => onSeek(index)); netUI.timeline.append(button);
    });
  }
  function renderNets(event, progress, meta, options = {}) {
    lastRender = { event, progress, meta, options };
    if (!netUI) return;
    const trace = meta.trace;
    const active = new Map((event?.activeNets ?? []).map((item) => [item.id, item]));
    const unused = new Set(event?.unused ?? []);
    const selected = event?.muxSelect ?? {};
    const selectedInputs = new Map();
    const unselectedInputs = new Map();
    const selectors = new Set();
    (flow.muxes ?? []).forEach((mux) => {
      if (!selected[mux.id]) return;
      selectors.add(mux.selectNet);
      mux.inputs.forEach((netId) => {
        const target = netId === selected[mux.id] ? selectedInputs : unselectedInputs;
        if (!target.has(netId)) target.set(netId, new Set());
        target.get(netId).add(mux.id);
      });
    });
    if (imageSize && !editState.editing) {
      container.classList.toggle("is-dimmed", !!event && options.dim !== false);
      const pillLayer = svg.querySelector(".net-pill-layer");
      pillLayer?.replaceChildren();
      const matrix = svg.getScreenCTM();
      const xScale = matrix ? Math.hypot(matrix.a, matrix.b) : 1;
      const yScale = matrix ? Math.hypot(matrix.c, matrix.d) : 1;
      const activeSamples = [];
      geometry.nets.forEach((netGeometry) => {
        const netGroup = [...svg.querySelectorAll(".net-group")].find((group) => group.dataset.netId === netGeometry.id);
        netGroup?.classList.toggle("has-active", active.has(netGeometry.id));
        const net = netById.get(netGeometry.id);
        const signal = active.get(netGeometry.id);
        const items = netSegments.get(netGeometry.id) ?? [];
        const itemByTo = new Map(items.map((item) => [item.segment.to, item]));
        const distanceCache = new Map([ ["source", 0] ]);
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
        items.forEach(({ path, fill, pulse, group, segment }, index) => {
          const isSelect = selectors.has(netGeometry.id);
          const isUnselected = unselectedInputs.get(netGeometry.id)?.has(segment.to);
          const isSelected = selectedInputs.get(netGeometry.id)?.has(segment.to);
          group.classList.toggle("is-active-net", !!signal || isSelect);
          group.classList.toggle("is-control-net", net?.role === "control");
          group.classList.toggle("is-unused-net", unused.has(netGeometry.id));
          group.classList.toggle("is-unselected-input", !!isUnselected);
          group.classList.toggle("is-selected-input", !!isSelected);
          group.classList.toggle("is-select-wire", isSelect);
          const own = lengths[index];
          const fraction = (signal || isSelect) ? Math.max(0, Math.min(1, (progress * total - own.start) / Math.max(1, own.length))) : 0;
          fill.setAttribute("stroke-dasharray", `${fraction * own.length} ${own.length + 1}`);
          fill.setAttribute("visibility", fraction > 0 ? "visible" : "hidden");
          if (fraction > 0 && fraction < 1 && !isUnselected) {
            const point = path.getPointAtLength(own.length * fraction);
            pulse.setAttribute("cx", point.x); pulse.setAttribute("cy", point.y);
            pulse.setAttribute("r", String(6 / Math.max(.01, xScale)));
            pulse.setAttribute("visibility", "visible");
          } else pulse.setAttribute("visibility", "hidden");
          if (signal && !isUnselected) {
            for (let sample = 0; sample <= 4; sample++) {
              const point = path.getPointAtLength(own.length * sample / 4);
              activeSamples.push(point.matrixTransform(matrix));
            }
          }
        });
        if (signal && items.length && pillLayer) {
          const index = [...active.keys()].indexOf(netGeometry.id);
          const candidate = items.reduce((best, item) => item.path.getTotalLength() > best.path.getTotalLength() ? item : best, items[0]);
          const point = candidate.path.getPointAtLength(candidate.path.getTotalLength() * .58);
          const labelText = `${net?.label ?? netGeometry.id} = ${signal.value}`;
          const font = 12 / Math.max(.01, yScale);
          const width = (labelText.length * 7 + 16) / Math.max(.01, xScale);
          const height = 22 / Math.max(.01, yScale);
          let x = point.x + 6 / Math.max(.01, xScale);
          let y = point.y - height - ((index % 3) - 1) * 24 / Math.max(.01, yScale);
          if (net?.role === "control" && !unused.has(netGeometry.id)) {
            const controlIds = [...active.keys()].filter((id) => netById.get(id)?.role === "control" && !unused.has(id));
            const controlIndex = controlIds.indexOf(netGeometry.id);
            const containerBox = container.getBoundingClientRect();
            const anchor = svg.createSVGPoint();
            anchor.x = containerBox.left + 15 + (controlIndex % 5) * 185;
            anchor.y = containerBox.bottom - 90 + Math.floor(controlIndex / 5) * 27;
            const local = anchor.matrixTransform(svg.getScreenCTM().inverse());
            x = local.x; y = local.y;
          }
          const pill = makeSvg("g", `net-pill ${net?.role === "control" ? "is-control" : ""} ${unused.has(netGeometry.id) ? "is-unused" : ""}`);
          const rect = makeSvg("rect");
          for (const [key, value] of Object.entries({ x, y, width, height, rx: 5 })) rect.setAttribute(key, value);
          const text = makeSvg("text"); text.setAttribute("x", x + 8 / xScale); text.setAttribute("y", y + 15 / yScale); text.setAttribute("font-size", font); text.textContent = labelText;
          pill.append(rect, text); pillLayer.append(pill);
          if (unused.has(netGeometry.id)) {
            const hint = makeSvg("text", "net-unused-hint"); hint.setAttribute("x", x); hint.setAttribute("y", y + height + 13 / yScale);
            hint.setAttribute("font-size", 10 / yScale); hint.textContent = "computed, not used"; pillLayer.append(hint);
          }
        }
      });
      flow.nodes.forEach((node) => {
        const group = blockElements.get(node.id); if (!group) return;
        const isCurrent = !!event && event.activeNodes.includes(node.id);
        group.classList.toggle("is-current", isCurrent);
        group.classList.toggle("is-passed", !!event && !isCurrent && meta.index > 0 && trace?.events.slice(0, meta.index).some((earlier) => earlier.activeNodes.includes(node.id)));
      });
      if (netUI.caption) {
        netUI.caption.hidden = !event;
        netUI.caption.textContent = event?.caption ?? "";
        const box = container.getBoundingClientRect();
        const w = Math.min(430, box.width * .53), h = 82;
        const candidates = [
          { left: 12, top: 48 }, { left: box.width - w - 12, top: 48 },
          { left: 12, top: box.height - h - 48 }, { left: box.width - w - 12, top: box.height - h - 48 }
        ];
        const count = (candidate) => activeSamples.filter((point) => point.x >= box.left + candidate.left && point.x <= box.left + candidate.left + w && point.y >= box.top + candidate.top && point.y <= box.top + candidate.top + h).length;
        const winner = candidates.reduce((best, candidate) => count(candidate) < count(best) ? candidate : best, candidates[0]);
        netUI.caption.style.left = `${winner.left}px`; netUI.caption.style.top = `${winner.top}px`;
      }
    }
    netUI.badge.textContent = trace?.badge ?? flow.badge ?? "";
    const ref = flow.specRef;
    const verified = !!(ref?.doc && ref?.section && Number.isInteger(ref.page) && ref.page > 0 && Array.isArray(ref.signals) && ref.signals.length);
    netUI.specRef.textContent = verified ? `${ref.doc}, ${ref.section}, p. ${ref.page}` : "Unverified — no specRef";
    netUI.specRef.classList.toggle("unverified", !verified);
    netUI.status.textContent = imageSize ? ({ running: "Running", paused: "Paused", done: "Done" }[meta.status] ?? "Ready") : "Diagram unavailable";
    netUI.level.textContent = `${event ? meta.index + 1 : 0} / ${trace?.events.length ?? 0}`;
    netUI.run.textContent = ({ running: "Pause Ⅱ", done: "Replay ↺", paused: "Resume →" }[meta.status] ?? "Run →");
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
    const state = new Map((trace?.initialState ?? []).map((item) => [`${item.node}.${item.field}`, { ...item }]));
    if (trace && meta.index >= 0) {
      trace.events.slice(0, meta.index + 1).forEach((item) => item.stateWrites?.forEach((write) => state.set(`${write.node}.${write.field}`, write)));
    }
    const changed = new Set(event?.phase === "clock-edge" ? (event.stateWrites ?? []).map((item) => `${item.node}.${item.field}`) : []);
    netUI.state.replaceChildren();
    state.forEach((item, key) => {
      const row = document.createElement("div"); row.className = "state-row";
      row.classList.toggle("is-written", changed.has(key));
      const label = document.createElement("span"); label.textContent = `${flow.nodes.find((node) => node.id === item.node)?.label ?? item.node}.${item.field}`;
      const value = document.createElement("strong"); value.textContent = item.value;
      row.append(label, value); netUI.state.append(row);
    });
  }
  return {
    render, renderStatic, renderTimeline, setZoom, updateMarkerSize, durationForEvent, clientToReference,
    setDebug(value) { debugNets = !!value; container.classList.toggle("is-net-debug", debugNets); if (geometry.presentation === "net-graph") renderNets(lastRender.event, lastRender.progress, lastRender.meta, lastRender.options); },
    setImageSize(size, renderNow = true) { imageSize = size; if (size && renderNow) renderStatic(); else if (!size && renderNow) svg.setAttribute("hidden", ""); },
    get imageSize() { return imageSize; }
  };
};
