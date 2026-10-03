window.HF = window.HF || {};
(function initRiscv() {
  const design = HF.riscvDesign;
  const geometry = JSON.parse(JSON.stringify(HF.riscvGeometry));
  const NET_KEY = "hardwareflow.riscv.nets.v1";
  const netOverrides = new Map();
  const netDrafts = new Map();
  let selectedNetId = geometry.nets[0].id;
  let selectedSegmentId = geometry.nets[0].segments[0].id;
  let selectedPointIndex = null;
  let editing = false;
  let dimEnabled = true;
  let scenarioValid = false;
  let imageSize = null;
  let presentation = "story";
  let keepFullTrail = false;
  let revealUnused = false;
  const el = (id) => document.getElementById(id);
  const netUI = {
    run: el("riscv-run"), step: el("riscv-step"), previous: el("riscv-previous"), reset: el("riscv-reset"),
    status: el("riscv-status"), level: el("riscv-level"), timeline: el("riscv-timeline"), state: el("riscv-state"),
    specRef: el("riscv-spec-ref"), badge: el("fidelity-badge"), caption: el("net-caption"),
    footer: el("net-story-footer"), stepMeta: el("net-step-meta"), parallel: el("net-parallel-tag"),
    detail: el("net-detail"), controls: el("net-control-strip"), unused: el("net-unused-strip"),
    unusedButton: el("net-unused-toggle"), unusedList: el("net-unused-list"), nextPrompt: el("riscv-next-prompt"),
    inputs: [el("riscv-x1"), el("riscv-x2"), el("riscv-pc")]
  };
  const renderer = HF.createSpecRenderer({
    geometry, flow: design, inputElement: netUI.inputs[0], netUI,
    onSelectNet: (netId, segmentId) => selectNet(netId, segmentId),
    onSelectNetPoint: (index) => { selectedPointIndex = index; renderEditor(); status(`Point ${index + 1} selected. Click its new position.`); }
  });
  const player = HF.createTracePlayer({
    durationForEvent: (event, index) => renderer.durationForEvent(event, index),
    onChange: (event, progress, meta) => {
      if (activeDiagram === "riscv") renderer.render(event, progress, meta, { dim: dimEnabled, inputValid: scenarioValid, presentation, keepFullTrail, revealUnused });
    }
  });
  const netById = (id) => geometry.nets.find((net) => net.id === id);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const validPoint = (point) => Number.isFinite(point?.x) && Number.isFinite(point?.y) && point.x >= 0 && point.x <= geometry.viewBox.width && point.y >= 0 && point.y <= geometry.viewBox.height;
  const validNet = (net) => net && Array.isArray(net.segments) && net.segments.length > 0 && Array.isArray(net.junctions) &&
    net.segments.every((segment) => typeof segment.id === "string" && Array.isArray(segment.points) && segment.points.length >= 2 && segment.points.every(validPoint)) &&
    net.junctions.every(validPoint);
  function loadSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem(NET_KEY) || "{}");
      geometry.nets.forEach((net, index) => {
        if (validNet(saved[net.id])) { geometry.nets[index] = clone(saved[net.id]); netOverrides.set(net.id, clone(saved[net.id])); }
      });
    } catch { /* Keep the defaults if storage is unavailable. */ }
  }
  function persist() { localStorage.setItem(NET_KEY, JSON.stringify(Object.fromEntries(netOverrides))); }
  function parseU32(text) {
    const input = text.trim();
    if (!/^0x[0-9a-f]{1,8}$/i.test(input) && !/^\d+$/.test(input)) return null;
    const value = Number(input);
    return Number.isInteger(value) && value >= 0 && value <= 0xFFFFFFFF ? value : null;
  }
  function readScenario() {
    const x1 = parseU32(el("riscv-x1").value);
    const x2 = parseU32(el("riscv-x2").value);
    const pc = parseU32(el("riscv-pc").value);
    const valid = x1 !== null && x2 !== null && pc !== null;
    scenarioValid = valid;
    el("riscv-error").hidden = valid;
    el("riscv-error").textContent = valid ? "" : "Enter unsigned 32-bit hex (0x…) or decimal values.";
    [el("riscv-x1"), el("riscv-x2"), el("riscv-pc")].forEach((input) => input.setAttribute("aria-invalid", String(!valid)));
    return valid ? { x1, x2, pc } : null;
  }
  function loadScenario() {
    const scenario = readScenario();
    const trace = scenario ? HF.generateRiscvTrace(design, scenario) : null;
    player.load(trace);
    revealUnused = false; netUI.unusedButton.setAttribute("aria-expanded", "false");
    renderer.renderTimeline((index) => player.seek(index), trace);
    player.refresh();
  }
  function loadImage() {
    const probe = new Image();
    probe.addEventListener("load", () => {
      imageSize = { width: probe.naturalWidth, height: probe.naturalHeight };
      renderer.setImageSize(imageSize, activeDiagram === "riscv");
      if (activeDiagram === "riscv") { el("missing-image").hidden = true; player.refresh(); }
    });
    probe.addEventListener("error", () => {
      imageSize = null; renderer.setImageSize(null, activeDiagram === "riscv");
      if (activeDiagram === "riscv") {
        el("missing-image").hidden = false;
        el("missing-image").querySelector("code").textContent = geometry.image;
        player.reset();
      }
    });
    probe.src = geometry.image;
  }
  function currentDraft() {
    if (!netDrafts.has(selectedNetId)) netDrafts.set(selectedNetId, clone(netById(selectedNetId)));
    return netDrafts.get(selectedNetId);
  }
  function currentSegment() { return currentDraft().segments.find((segment) => segment.id === selectedSegmentId); }
  function status(message) { el("net-editor-status").textContent = message; }
  function populateSegments() {
    const select = el("segment-select"); select.replaceChildren();
    currentDraft().segments.forEach((segment, index) => {
      const option = document.createElement("option"); option.value = segment.id; option.textContent = `Segment ${index + 1}`; select.append(option);
    });
    if (!currentDraft().segments.some((segment) => segment.id === selectedSegmentId)) selectedSegmentId = currentDraft().segments[0]?.id ?? "";
    select.value = selectedSegmentId;
  }
  function renderEditor() {
    renderer.renderStatic({ editing, selectedNetId, selectedSegmentId, draftNet: editing ? currentDraft() : null,
      pointsDraft: editing ? currentSegment()?.points ?? null : null, selectedPointIndex });
    el("net-delete-point").disabled = !currentSegment()?.points.length;
    el("net-delete-segment").disabled = !currentDraft().segments.length;
    el("net-save").disabled = !validNet(currentDraft());
  }
  function selectNet(netId, segmentId) {
    selectedNetId = netId;
    selectedSegmentId = segmentId ?? currentDraft().segments[0]?.id ?? "";
    selectedPointIndex = null;
    el("net-select").value = netId;
    populateSegments(); renderEditor();
    status(`${currentDraft().segments.length} segment(s). Click a point to move it, or click the diagram to add one.`);
  }
  function netDiagramClick(event) {
    if (activeDiagram !== "riscv" || !editing) return;
    const raw = renderer.clientToReference(event); if (!raw) return;
    const segment = currentSegment(); if (!segment) return;
    const points = segment.points;
    const neighbor = selectedPointIndex === null ? points.at(-1) : points[selectedPointIndex - 1] ?? points[selectedPointIndex + 1];
    const point = { ...raw };
    if (event.shiftKey && neighbor) {
      if (Math.abs(point.x - neighbor.x) >= Math.abs(point.y - neighbor.y)) point.y = neighbor.y;
      else point.x = neighbor.x;
    }
    const threshold = 24;
    const closest = geometry.nets.flatMap((net) => net.junctions).reduce((best, junction) => {
      const distance = Math.hypot(junction.x - point.x, junction.y - point.y);
      return distance < best.distance ? { distance, junction } : best;
    }, { distance: Infinity, junction: null });
    if (closest.distance <= threshold) { point.x = closest.junction.x; point.y = closest.junction.y; }
    if (selectedPointIndex === null) points.push(point); else points[selectedPointIndex] = point;
    selectedPointIndex = null; renderEditor();
    status(`Point set to (${point.x}, ${point.y})${closest.distance <= threshold ? " at a junction" : ""}. Save Net to keep it.`);
  }
  function saveNet() {
    const draft = currentDraft();
    if (!validNet(draft)) { status("Each segment needs at least two points inside the image."); return; }
    const index = geometry.nets.findIndex((net) => net.id === selectedNetId);
    geometry.nets[index] = clone(draft); netOverrides.set(selectedNetId, clone(draft));
    try { persist(); status("Net calibration saved in this browser."); }
    catch { status("Net updated for this session; browser storage is unavailable."); }
    renderEditor();
  }
  function resetNets() {
    netOverrides.clear(); netDrafts.clear(); geometry.nets = clone(HF.riscvGeometry.nets);
    selectedPointIndex = null; selectedSegmentId = netById(selectedNetId).segments[0]?.id ?? "";
    try { localStorage.removeItem(NET_KEY); status("Default net routes restored."); }
    catch { status("Defaults restored for this session; storage could not be cleared."); }
    populateSegments(); renderEditor();
  }
  function setEditMode(edit) {
    if (edit && !imageSize) return;
    if (player.state.status === "running") player.reset();
    editing = edit;
    if (edit) renderer.setFollow(false);
    el("focus-button").disabled = edit;
    el("riscv-flow-panel").hidden = edit;
    el("net-editor-panel").hidden = !edit;
    netUI.footer.hidden = edit;
    document.querySelector(".workspace-sidebar > .flow-panel").hidden = true;
    el("editor-panel").hidden = true;
    el("diagram-overlay-container").classList.toggle("is-editing", edit);
    for (const [id, selected] of [["view-flow-mode", !edit], ["edit-paths-mode", edit]]) {
      el(id).classList.toggle("is-selected", selected);
      el(id).setAttribute("aria-pressed", String(selected));
    }
    el("spec-summary").textContent = edit ? "Adjust net segments" : "Draft calibrated nets";
    renderEditor(); if (!edit) player.refresh();
  }
  function show() {
    activeDiagram = "riscv";
    el("spi-diagram-button").classList.remove("is-selected"); el("spi-diagram-button").setAttribute("aria-pressed", "false");
    el("riscv-diagram-button").classList.add("is-selected"); el("riscv-diagram-button").setAttribute("aria-pressed", "true");
    el("fidelity-badge").textContent = player.state.trace?.badge ?? "DEPENDENCY ORDER - not time; state updates at clock edge";
    el("spi-fidelity-badge").hidden = true;
    el("net-caption").hidden = true;
    netUI.footer.hidden = false;
    el("spec-overlay").setAttribute("aria-label", "Original processor diagram with active net graph");
    el("missing-image").querySelector("code").textContent = geometry.image;
    el("missing-image").hidden = !!imageSize;
    el("diagram-overlay-container").classList.toggle("has-image", !!imageSize);
    el("edit-paths-mode").disabled = !imageSize;
    if (imageSize) renderer.renderStatic();
    renderer.setFollow(presentation === "story" && !editing);
    setEditMode(editing); player.refresh();
  }
  function showSpi() {
    if (player.state.status === "running") player.reset();
    activeDiagram = "spi";
    el("riscv-diagram-button").classList.remove("is-selected"); el("riscv-diagram-button").setAttribute("aria-pressed", "false");
    el("spi-diagram-button").classList.add("is-selected"); el("spi-diagram-button").setAttribute("aria-pressed", "true");
    el("riscv-flow-panel").hidden = true; el("net-editor-panel").hidden = true;
    el("net-caption").hidden = true;
    netUI.footer.hidden = true;
    el("spi-fidelity-badge").hidden = false;
    el("spec-overlay").setAttribute("aria-label", "Original SPI specification diagram with transmit dataflow paths");
    el("missing-image").querySelector("code").textContent = HF.geometry.image;
    el("missing-image").hidden = !!rendererSpi.imageSize;
    el("diagram-overlay-container").classList.toggle("has-image", !!rendererSpi.imageSize);
    el("diagram-overlay-container").classList.remove("is-net-graph", "is-net-debug");
    rendererSpi.setFollow(false);
    el("edit-paths-mode").disabled = !rendererSpi.imageSize;
    el("focus-button").disabled = editingPaths;
    document.querySelector(".workspace-sidebar > .flow-panel").hidden = editingPaths;
    el("editor-panel").hidden = !editingPaths;
    setSpecMode(editingPaths); playerSpi.refresh();
  }
  const rendererSpi = HF.spiController.renderer;
  const playerSpi = HF.spiController.player;
  HF.riscvController = { show, showSpi, setEditMode, renderer, player, geometry, design };
  player.setPacing("guided");
  loadSaved();
  [el("riscv-x1"), el("riscv-x2"), el("riscv-pc")].forEach((input) => input.addEventListener("input", () => loadScenario()));
  el("riscv-preset").addEventListener("change", loadScenario);
  netUI.run.addEventListener("click", () => {
    if (!readScenario()) { player.refresh(); return; }
    if (player.state.status === "running") player.pause();
    else if (player.state.status === "done") player.replay();
    else player.play();
  });
  netUI.step.addEventListener("click", () => player.step());
  netUI.previous.addEventListener("click", () => player.previous());
  netUI.reset.addEventListener("click", () => player.reset());
  el("riscv-speed").addEventListener("change", (event) => player.setSpeed(Number(event.target.value)));
  for (const [id, mode] of [["riscv-story", "story"], ["riscv-full", "full"]]) el(id).addEventListener("click", () => {
    presentation = mode;
    renderer.setFollow(mode === "story");
    for (const [buttonId, value] of [["riscv-story", "story"], ["riscv-full", "full"]]) {
      el(buttonId).classList.toggle("is-selected", mode === value); el(buttonId).setAttribute("aria-pressed", String(mode === value));
    }
    player.refresh();
  });
  for (const [id, mode] of [["riscv-guided", "guided"], ["riscv-auto", "auto"]]) el(id).addEventListener("click", () => {
    player.setPacing(mode, mode === "auto" ? 1800 : 0);
    for (const [buttonId, value] of [["riscv-guided", "guided"], ["riscv-auto", "auto"]]) {
      el(buttonId).classList.toggle("is-selected", mode === value); el(buttonId).setAttribute("aria-pressed", String(mode === value));
    }
  });
  el("riscv-full-trail").addEventListener("change", (event) => { keepFullTrail = event.target.checked; player.refresh(); });
  netUI.unusedButton.addEventListener("click", () => { revealUnused = !revealUnused; netUI.unusedButton.setAttribute("aria-expanded", String(revealUnused)); player.refresh(); });
  el("riscv-dim").addEventListener("change", (event) => { dimEnabled = event.target.checked; player.refresh(); });
  el("riscv-debug").addEventListener("change", (event) => renderer.setDebug(event.target.checked));
  el("riscv-diagram-button").addEventListener("click", () => {
    if (activeDiagram === "riscv") return;
    if (playerSpi.state.status === "running") playerSpi.reset();
    show();
  });
  el("spi-diagram-button").addEventListener("click", () => { if (activeDiagram !== "spi") showSpi(); });
  const netSelect = el("net-select");
  design.nets.forEach((net) => { const option = document.createElement("option"); option.value = net.id; option.textContent = net.label; netSelect.append(option); });
  netSelect.value = selectedNetId;
  netSelect.addEventListener("change", () => selectNet(netSelect.value));
  el("segment-select").addEventListener("change", () => { selectedSegmentId = el("segment-select").value; selectedPointIndex = null; renderEditor(); });
  populateSegments();
  el("spec-overlay").addEventListener("click", netDiagramClick);
  el("net-delete-point").addEventListener("click", () => {
    const points = currentSegment()?.points; if (!points?.length) return;
    points.splice(selectedPointIndex ?? points.length - 1, 1); selectedPointIndex = null;
    renderEditor(); status("Point deleted. Save Net to keep this route.");
  });
  el("net-add-segment").addEventListener("click", () => {
    const draft = currentDraft(); const current = currentSegment();
    const start = current?.points.at(-1) ?? { x: 100, y: 100 };
    const id = `${draft.id}-s${Math.max(0, ...draft.segments.map((segment) => Number(segment.id.match(/-s(\d+)$/)?.[1] ?? 0))) + 1}`;
    const from = draft.junctions.some((junction) => junction.id === current?.to) ? current.to : "source";
    const segment = { id, from, to: `sink-${id}`, points: [clone(start), { x: Math.min(start.x + 40, geometry.viewBox.width), y: start.y }] };
    draft.segments.push(segment); selectedSegmentId = id; selectedPointIndex = null;
    populateSegments(); renderEditor(); status("Segment added. Click its points to adjust, then Save Net.");
  });
  el("net-delete-segment").addEventListener("click", () => {
    const draft = currentDraft(); draft.segments = draft.segments.filter((segment) => segment.id !== selectedSegmentId);
    selectedSegmentId = draft.segments[0]?.id ?? ""; selectedPointIndex = null;
    populateSegments(); renderEditor(); status("Segment deleted. Save Net to keep the change.");
  });
  el("net-save").addEventListener("click", saveNet);
  el("net-reset").addEventListener("click", resetNets);
  el("net-export").addEventListener("click", () => {
    const payload = { diagramId: geometry.id, nets: Object.fromEntries(geometry.nets.map((net) => [net.id, net])) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "hardwareflow-riscv-net-calibration.json";
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  el("net-import").addEventListener("change", async (event) => {
    const file = event.target.files[0]; if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (payload.diagramId !== geometry.id || !payload.nets || !geometry.nets.every((net) => validNet(payload.nets[net.id]))) throw Error("Invalid net calibration JSON");
      geometry.nets = geometry.nets.map((net) => clone(payload.nets[net.id]));
      netOverrides.clear(); geometry.nets.forEach((net) => netOverrides.set(net.id, clone(net)));
      netDrafts.clear(); persist(); selectNet(selectedNetId); status("Net calibration imported.");
    } catch { status("Invalid net calibration JSON."); }
    event.target.value = "";
  });
  document.addEventListener("keydown", (event) => {
    if (activeDiagram !== "riscv" || el("spec-view").hidden || editing || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return;
    if (event.code === "Space") { event.preventDefault(); netUI.run.click(); }
    else if (event.key === "ArrowRight") { event.preventDefault(); netUI.step.click(); }
    else if (event.key === "ArrowLeft") { event.preventDefault(); netUI.previous.click(); }
    else if (event.key.toLowerCase() === "r") { event.preventDefault(); netUI.reset.click(); }
  });
  loadScenario(); loadImage();
})();
