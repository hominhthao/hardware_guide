window.HF = window.HF || {};
HF.createSpecRenderer = function createSpecRenderer({ geometry, flow, inputElement, onSelectPath, onSelectPoint }) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.getElementById("spec-overlay");
  const container = document.getElementById("diagram-overlay-container");
  const pathElements = new Map();
  const blockElements = new Map();
  const edgeById = new Map(flow.edges.map((edge) => [edge.id, edge]));
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
    editState = nextEditState;
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
  function renderTimeline(onSeek) {
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
  return {
    render, renderStatic, renderTimeline, setZoom, updateMarkerSize, durationForEvent, clientToReference,
    setImageSize(size) { imageSize = size; if (size) renderStatic(); else svg.setAttribute("hidden", ""); },
    get imageSize() { return imageSize; }
  };
};
