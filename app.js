// Edit this object to display another architecture. Connections refer to block IDs.
const architecture = {
  name: "SPI TX Dataflow",
  blocks: [
    { id: "cpu", label: "CPU", type: "processor" },
    { id: "a2h", label: "A2H Bus", type: "bus" },
    { id: "spi", label: "SPI Controller", type: "controller" },
    { id: "tx_fifo", label: "TX FIFO", type: "fifo" },
    { id: "shift_register", label: "Shift Register", type: "register" },
    { id: "mosi", label: "MOSI", type: "signal" }
  ],
  connections: [
    { from: "cpu", to: "a2h" },
    { from: "a2h", to: "spi" },
    { from: "spi", to: "tx_fifo" },
    { from: "tx_fifo", to: "shift_register" },
    { from: "shift_register", to: "mosi" }
  ]
};

const SVG_NS = "http://www.w3.org/2000/svg";
const blockElements = new Map();
function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function renderBlocks(data) {
  const list = document.getElementById("blocks");
  list.replaceChildren();
  blockElements.clear();

  data.blocks.forEach((block, index) => {
    const item = makeElement("li", "block", "");
    item.dataset.type = block.type;
    item.dataset.blockId = block.id;

    const top = makeElement("div", "block-top", "");
    top.append(
      makeElement("span", "block-index", String(index + 1).padStart(2, "0")),
      makeElement("span", "block-icon", "")
    );

    const details = makeElement("div", "block-details", "");
    details.append(
      makeElement("div", "block-label", block.label),
      makeElement("div", "block-type", block.type)
    );
    item.append(top, details);
    list.append(item);
    blockElements.set(block.id, item);
  });
}

function renderConnections(data) {
  const svg = document.getElementById("connections");
  const diagram = document.getElementById("diagram");
  svg.setAttribute("viewBox", `0 0 ${diagram.clientWidth} ${diagram.clientHeight}`);
  svg.replaceChildren();

  const defs = document.createElementNS(SVG_NS, "defs");
  const marker = document.createElementNS(SVG_NS, "marker");
  marker.setAttribute("id", "arrowhead");
  marker.setAttribute("viewBox", "0 0 8 8");
  marker.setAttribute("refX", "7");
  marker.setAttribute("refY", "4");
  marker.setAttribute("markerWidth", "8");
  marker.setAttribute("markerHeight", "8");
  marker.setAttribute("orient", "auto-start-reverse");
  const arrow = document.createElementNS(SVG_NS, "path");
  arrow.setAttribute("d", "M 1 1 L 7 4 L 1 7");
  arrow.setAttribute("fill", "none");
  arrow.setAttribute("stroke", "#99bdc9");
  arrow.setAttribute("stroke-width", "1.2");
  marker.append(arrow);
  defs.append(marker);
  svg.append(defs);

  data.connections.forEach(({ from, to }) => {
    const source = blockElements.get(from);
    const target = blockElements.get(to);
    if (!source || !target) return;

    const diagramRect = diagram.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const sourceLeft = sourceRect.left - diagramRect.left;
    const targetLeft = targetRect.left - diagramRect.left;
    const sourceTop = sourceRect.top - diagramRect.top;
    const targetTop = targetRect.top - diagramRect.top;
    const sourceCenter = sourceLeft + sourceRect.width / 2;
    const targetCenter = targetLeft + targetRect.width / 2;
    const forward = sourceCenter < targetCenter;
    const adjacent = Math.abs(targetCenter - sourceCenter) <= sourceRect.width + 100;
    const path = document.createElementNS(SVG_NS, "path");
    const y = sourceTop + sourceRect.height / 2;

    if (adjacent) {
      const startX = forward ? sourceLeft + sourceRect.width + 8 : sourceLeft - 8;
      const endX = forward ? targetLeft - 12 : targetLeft + targetRect.width + 12;
      path.setAttribute("d", `M ${startX} ${y} L ${endX} ${y}`);
    } else {
      // Route longer connections over the cards so intermediate blocks stay readable.
      const routeY = Math.max(20, sourceTop - 28);
      const startX = sourceCenter;
      const endX = targetCenter;
      path.setAttribute("d", `M ${startX} ${sourceTop - 8} L ${startX} ${routeY} L ${endX} ${routeY} L ${endX} ${targetTop - 12}`);
    }

    path.setAttribute("class", "connection-path");
    path.setAttribute("marker-end", "url(#arrowhead)");
    svg.append(path);
  });
}

function renderArchitecture(data) {
  document.getElementById("architecture-name").textContent = data.name;
  document.getElementById("diagram-summary").textContent =
    `${data.blocks.length} blocks  ·  ${data.connections.length} connections`;
  renderBlocks(data);
  renderConnections(data);

  const labels = new Map(data.blocks.map(({ id, label }) => [id, label]));
  document.getElementById("connection-description").textContent =
    `Connections: ${data.connections.map(({ from, to }) => `${labels.get(from)} to ${labels.get(to)}`).join(", ")}.`;
}


const geometry = JSON.parse(JSON.stringify(HF.geometry));
const flow = HF.flow;
const CALIBRATION_KEY = "hardwareflow.spi.tx.paths.v1";
const BOUNDS_KEY = "hardwareflow.spi.tx.bounds.v1";
const pathOverrides = new Map();
const boundsOverrides = new Map();
const pathDrafts = new Map();
let selectedPathId = geometry.paths[0].id;
let selectedPointIndex = null;
let editingPaths = false;
let dimEnabled = true;
let currentInputValue = null;
let activeDiagram = "spi";

const renderer = HF.createSpecRenderer({
  geometry, flow, inputElement: document.getElementById("tx-input"),
  onSelectPath: (id) => selectEditorPath(id),
  onSelectPoint: (index) => {
    selectedPointIndex = index;
    renderEditorOverlay();
    updateEditorStatus(`Point ${index + 1} selected. Click its new position on the diagram.`);
  }
});
const player = HF.createTracePlayer({
  durationForEvent: (event, index) => renderer.durationForEvent(event, index),
  onChange: (event, progress, meta) => { if (activeDiagram === "spi") renderer.render(event, progress, meta, { dim: dimEnabled, inputValid: !!currentInputValue, inputValue: currentInputValue }); }
});
HF.spiController = { renderer, player };

function copyPoints(points) { return points.map(({ x, y }) => ({ x, y })); }
function syncSpiNets() { geometry.nets.forEach((net) => { const path = geometry.paths.find((item) => item.id === net.id); if (path) net.segments[0].points = path.points; }); }
function pathById(id) { return geometry.paths.find((path) => path.id === id); }
function nodeById(id) { return geometry.nodes.find((node) => node.id === id); }
function validPoints(points) {
  return Array.isArray(points) && points.length >= 2 && points.every((point) =>
    Number.isFinite(point?.x) && Number.isFinite(point?.y) && point.x >= 0 && point.x <= geometry.viewBox.width && point.y >= 0 && point.y <= geometry.viewBox.height);
}
function validBox(box) {
  return box && [box.x, box.y, box.width, box.height].every(Number.isFinite) && box.x >= 0 && box.y >= 0 && box.width > 0 && box.height > 0;
}
function loadSavedCalibration() {
  try {
    const paths = JSON.parse(localStorage.getItem(CALIBRATION_KEY) || "{}");
    geometry.paths.forEach((path) => {
      if (validPoints(paths[path.id])) { path.points = copyPoints(paths[path.id]); pathOverrides.set(path.id, copyPoints(path.points)); }
    });
  } catch { /* file:// or private browsing can deny storage. */ }
  try {
    const bounds = JSON.parse(localStorage.getItem(BOUNDS_KEY) || "{}");
    geometry.nodes.forEach((node) => {
      if (validBox(bounds[node.id])) { node.box = { ...bounds[node.id] }; boundsOverrides.set(node.id, { ...node.box }); }
    });
  } catch { /* Keep defaults when storage is unavailable. */ }
  syncSpiNets();
}
function persistPaths() { localStorage.setItem(CALIBRATION_KEY, JSON.stringify(Object.fromEntries(pathOverrides))); }
function persistBounds() { localStorage.setItem(BOUNDS_KEY, JSON.stringify(Object.fromEntries(boundsOverrides))); }
function parseTxData(text) {
  const input = text.trim(); let txValue;
  if (/^0x[0-9a-f]{1,2}$/i.test(input)) txValue = parseInt(input.slice(2), 16);
  else if (/^[01]{8}$/.test(input)) txValue = parseInt(input, 2);
  else return null;
  return { txValue, hexValue: `0x${txValue.toString(16).padStart(2, "0").toUpperCase()}`, binaryValue: txValue.toString(2).padStart(8, "0") };
}
function updateInputFeedback() {
  const input = document.getElementById("tx-input"); const error = document.getElementById("tx-error");
  currentInputValue = parseTxData(input.value);
  input.setAttribute("aria-invalid", String(!currentInputValue));
  error.hidden = !!currentInputValue;
  error.textContent = currentInputValue ? "" : "Enter 0x00–0xFF or exactly eight binary digits.";
  player.refresh();
  return !!currentInputValue;
}
function loadTraceForInput() {
  currentInputValue = parseTxData(document.getElementById("tx-input").value);
  player.load(currentInputValue ? HF.generateSpiTxTrace(currentInputValue.txValue, flow) : null);
}
function loadSpecImage() {
  const probe = new Image(); const container = document.getElementById("diagram-overlay-container");
  const missing = document.getElementById("missing-image");
  probe.addEventListener("load", () => {
    container.classList.add("has-image"); missing.hidden = true;
    document.getElementById("edit-paths-mode").disabled = false;
    renderer.setImageSize({ width: probe.naturalWidth, height: probe.naturalHeight }, activeDiagram === "spi"); player.refresh();
  });
  probe.addEventListener("error", () => {
    container.classList.remove("has-image"); missing.hidden = false;
    document.getElementById("edit-paths-mode").disabled = true;
    renderer.setImageSize(null, activeDiagram === "spi"); player.reset();
  });
  probe.src = geometry.image;
}
function renderEditorOverlay() {
  renderer.renderStatic({ editing: editingPaths, selectedPathId, pointsDraft: pathDrafts.get(selectedPathId) ?? null, selectedPointIndex });
}
function updateEditorStatus(message) {
  const points = pathDrafts.get(selectedPathId) ?? pathById(selectedPathId).points;
  document.getElementById("undo-point-button").disabled = !points.length;
  document.getElementById("clear-path-button").disabled = !points.length;
  document.getElementById("save-path-button").disabled = points.length < 2;
  document.getElementById("editor-status").textContent = message ?? `${points.length} control points. Select a point to move it, or click to add one.`;
}
function selectEditorPath(id) {
  selectedPathId = id; selectedPointIndex = null;
  document.getElementById("path-select").value = id;
  renderEditorOverlay(); updateEditorStatus();
}
function diagramClickToPoint(event) {
  if (activeDiagram !== "spi" || !editingPaths) return;
  const point = renderer.clientToReference(event); if (!point) return;
  const points = pathDrafts.get(selectedPathId) ?? copyPoints(pathById(selectedPathId).points);
  if (selectedPointIndex === null) points.push(point); else points[selectedPointIndex] = point;
  pathDrafts.set(selectedPathId, points);
  const message = selectedPointIndex === null ? `Added point at (${point.x}, ${point.y}). Save Path to keep this route.` : `Moved point to (${point.x}, ${point.y}). Save Path to keep this route.`;
  selectedPointIndex = null; renderEditorOverlay(); updateEditorStatus(message);
}
function saveSelectedPath() {
  const points = pathDrafts.get(selectedPathId) ?? copyPoints(pathById(selectedPathId).points);
  if (!validPoints(points)) { updateEditorStatus("A path needs at least two points inside the diagram."); return; }
  pathById(selectedPathId).points = copyPoints(points); pathOverrides.set(selectedPathId, copyPoints(points)); syncSpiNets();
  try { persistPaths(); updateEditorStatus("Path saved in this browser. It will survive a reload."); }
  catch { updateEditorStatus("Path updated for this session, but browser storage is unavailable."); }
  renderEditorOverlay();
}
function resetCalibration() {
  pathOverrides.clear(); boundsOverrides.clear(); pathDrafts.clear(); selectedPointIndex = null;
  geometry.paths = JSON.parse(JSON.stringify(HF.geometry.paths)); geometry.nodes = JSON.parse(JSON.stringify(HF.geometry.nodes)); syncSpiNets();
  let message = "Default TX routes and block bounds restored.";
  try { localStorage.removeItem(CALIBRATION_KEY); localStorage.removeItem(BOUNDS_KEY); }
  catch { message = "Defaults restored for this session, but browser storage could not be cleared."; }
  renderEditorOverlay(); updateEditorStatus(message); showBounds();
}
function setSpecMode(edit) {
  if (activeDiagram === "riscv") { HF.riscvController?.setEditMode(edit); return; }
  if (edit && !renderer.imageSize) return;
  if (player.state.status === "running") player.reset();
  editingPaths = edit;
  document.querySelector(".flow-panel").hidden = edit;
  document.getElementById("editor-panel").hidden = !edit;
  document.getElementById("diagram-overlay-container").classList.toggle("is-editing", edit);
  for (const [id, selected] of [["view-flow-mode", !edit], ["edit-paths-mode", edit]]) {
    document.getElementById(id).classList.toggle("is-selected", selected);
    document.getElementById(id).setAttribute("aria-pressed", String(selected));
  }
  document.getElementById("spec-summary").textContent = edit ? "Adjust TX routes" : "Calibrated TX routes";
  renderEditorOverlay();
  if (edit) updateEditorStatus(); else player.refresh();
}
function setVisualizationMode(mode) {
  const showingSpec = mode === "spec";
  if (showingSpec === !document.getElementById("spec-view").hidden) return;
  if (!showingSpec && player.state.status === "running") player.reset();
  if (!showingSpec && HF.riscvController?.player.state.status === "running") HF.riscvController.player.reset();
  document.getElementById("abstract-view").hidden = showingSpec;
  document.getElementById("spec-view").hidden = !showingSpec;
  document.getElementById("spec-mode-switch").hidden = !showingSpec;
  document.getElementById("diagram-switch").hidden = !showingSpec;
  document.body.classList.toggle("spec-active", showingSpec);
  document.getElementById("brand-description").textContent = showingSpec ? "SPI TX Dataflow" : "Hardware architecture visualizer";
  document.getElementById("abstract-mode").classList.toggle("is-selected", !showingSpec);
  document.getElementById("spec-mode").classList.toggle("is-selected", showingSpec);
  document.getElementById("abstract-mode").setAttribute("aria-pressed", String(!showingSpec));
  document.getElementById("spec-mode").setAttribute("aria-pressed", String(showingSpec));
  document.getElementById("flow-key").hidden = showingSpec;
  if (showingSpec) { if (activeDiagram === "riscv") HF.riscvController?.show(); else setSpecMode(editingPaths); }
  else renderConnections(architecture);
}
function showBounds() {
  const node = nodeById(document.getElementById("bounds-select").value); if (!node) return;
  for (const field of ["x", "y", "width", "height"]) document.getElementById(`bounds-${field}`).value = node.box[field];
}
function init() {
  renderArchitecture(architecture);
  new ResizeObserver(() => renderConnections(architecture)).observe(document.getElementById("diagram"));
  new ResizeObserver(() => renderer.updateMarkerSize()).observe(document.getElementById("diagram-overlay-container"));
  loadSavedCalibration();
  renderer.renderTimeline((index) => player.seek(index));
  const pathSelect = document.getElementById("path-select");
  geometry.paths.forEach((path) => {
    const option = document.createElement("option"); option.value = path.id;
    option.textContent = flow.edges.find((edge) => edge.pathId === path.id)?.label ?? path.id; pathSelect.append(option);
  });
  pathSelect.value = selectedPathId; pathSelect.addEventListener("change", () => selectEditorPath(pathSelect.value));
  document.getElementById("spec-overlay").addEventListener("click", diagramClickToPoint);
  document.getElementById("abstract-mode").addEventListener("click", () => setVisualizationMode("abstract"));
  document.getElementById("spec-mode").addEventListener("click", () => setVisualizationMode("spec"));
  document.getElementById("view-flow-mode").addEventListener("click", () => setSpecMode(false));
  document.getElementById("edit-paths-mode").addEventListener("click", () => setSpecMode(true));
  document.getElementById("tx-input").addEventListener("input", () => {
    if (player.state.status !== "ready" && player.state.status !== "running") loadTraceForInput();
    updateInputFeedback();
    if (player.state.status === "ready") loadTraceForInput();
  });
  document.getElementById("run-button").addEventListener("click", () => {
    if (!updateInputFeedback()) return;
    if (player.state.status === "running") player.pause();
    else if (player.state.status === "done") player.replay();
    else player.play();
  });
  document.getElementById("step-button").addEventListener("click", () => player.step());
  document.getElementById("previous-button").addEventListener("click", () => player.previous());
  document.getElementById("reset-button").addEventListener("click", () => player.reset());
  document.getElementById("undo-point-button").addEventListener("click", () => {
    const points = pathDrafts.get(selectedPathId) ?? copyPoints(pathById(selectedPathId).points);
    points.pop(); pathDrafts.set(selectedPathId, points); selectedPointIndex = null;
    renderEditorOverlay(); updateEditorStatus("Last point removed. Save Path to keep this route.");
  });
  document.getElementById("clear-path-button").addEventListener("click", () => {
    pathDrafts.set(selectedPathId, []); selectedPointIndex = null;
    renderEditorOverlay(); updateEditorStatus("Path cleared. Click along the visible connection to rebuild it.");
  });
  document.getElementById("save-path-button").addEventListener("click", saveSelectedPath);
  document.getElementById("reset-calibration-button").addEventListener("click", resetCalibration);
  document.getElementById("export-calibration-button").addEventListener("click", () => {
    const payload = { paths: Object.fromEntries(geometry.paths.map((path) => [path.id, copyPoints(path.points)])),
      bounds: Object.fromEntries(geometry.nodes.map((node) => [node.id, node.box])) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "hardwareflow-spi-calibration.json";
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.getElementById("import-calibration-input").addEventListener("change", async (event) => {
    const file = event.target.files[0]; if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (!payload.paths || !payload.bounds || !geometry.paths.every((path) => validPoints(payload.paths[path.id])) ||
        !geometry.nodes.every((node) => validBox(payload.bounds[node.id]))) throw Error("Invalid calibration JSON");
      geometry.paths.forEach((path) => { path.points = copyPoints(payload.paths[path.id]); pathOverrides.set(path.id, copyPoints(path.points)); });
      geometry.nodes.forEach((node) => { node.box = { ...payload.bounds[node.id] }; boundsOverrides.set(node.id, { ...node.box }); });
      try { persistPaths(); persistBounds(); } catch { /* Keep imported values in this session. */ }
      syncSpiNets(); pathDrafts.clear(); renderEditorOverlay(); updateEditorStatus("Calibration imported."); showBounds();
    } catch { updateEditorStatus("Invalid calibration JSON."); }
    event.target.value = "";
  });
  document.getElementById("fit-button").addEventListener("click", () => (activeDiagram === "riscv" ? HF.riscvController.renderer : renderer).setZoom("fit"));
  document.getElementById("focus-button").addEventListener("click", () => (activeDiagram === "riscv" ? HF.riscvController.renderer : renderer).setZoom("focus"));
  document.getElementById("focus-button").classList.add("is-selected");
  document.getElementById("speed-select").addEventListener("change", (event) => player.setSpeed(Number(event.target.value)));
  document.getElementById("dim-toggle").addEventListener("change", (event) => { dimEnabled = event.target.checked; player.refresh(); });
  const boundsSelect = document.getElementById("bounds-select");
  flow.nodes.forEach((node) => { const option = document.createElement("option"); option.value = node.geometryNodeId; option.textContent = node.label; boundsSelect.append(option); });
  boundsSelect.addEventListener("change", showBounds); showBounds();
  document.getElementById("save-bounds-button").addEventListener("click", () => {
    const box = Object.fromEntries(["x", "y", "width", "height"].map((field) => [field, Number(document.getElementById(`bounds-${field}`).value)]));
    if (!validBox(box)) { updateEditorStatus("Enter valid positive block bounds."); return; }
    const id = boundsSelect.value; nodeById(id).box = box; boundsOverrides.set(id, { ...box });
    try { persistBounds(); updateEditorStatus("Block bounds saved."); }
    catch { updateEditorStatus("Bounds updated for this session; storage is unavailable."); }
    renderEditorOverlay();
  });
  document.addEventListener("keydown", (event) => {
    if (document.getElementById("spec-view").hidden || activeDiagram !== "spi" || editingPaths || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return;
    if (event.code === "Space") { event.preventDefault(); document.getElementById("run-button").click(); }
    else if (event.key === "ArrowRight") { event.preventDefault(); document.getElementById("step-button").click(); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); document.getElementById("previous-button").click(); }
    else if (event.key.toLowerCase() === "r") { event.preventDefault(); document.getElementById("reset-button").click(); }
  });
  document.getElementById("edit-paths-mode").disabled = true;
  updateInputFeedback(); loadTraceForInput(); loadSpecImage();
}
init();
