const design = HF.riscvDesign;
const geometry = HF.riscvGeometry;
const results = document.getElementById("results");
const nodeIds = new Set(design.nodes.map((node) => node.id));
const netIds = new Set(design.nets.map((net) => net.id));
const geometryNodeIds = new Set(geometry.nodes.map((node) => node.id));
const geometryNetIds = new Set(geometry.nets.map((net) => net.id));
const levels = [1, 2, 3, 3, 4, 5, 6, 6, 7];
const focus = [
  ["pc"], ["instr", "rs1_addr", "rs2_addr"], ["rs1_data", "rs2_data"], [],
  ["opa_sel", "opb_sel", "operand_a"], ["alu_op", "alu_data"],
  ["wb_sel", "alu_data", "wb_data"], ["pc_sel", "pc_four", "pc_next"], []
];
function report(section, label, passed) {
  const row = document.createElement("p"); row.className = passed ? "pass" : "fail";
  row.textContent = `${passed ? "PASS" : "FAIL"} — ${label}`; section.append(row);
}
for (const [x1, x2, result] of [[5, 7, 12], [0, 0, 0], [0xFFFFFFFF, 1, 0], [0x7FFFFFFF, 1, 0x80000000]]) {
  const section = document.createElement("section");
  const title = document.createElement("h2"); title.textContent = `ADD x3, x1, x2 — x1=${x1}, x2=${x2}`;
  section.append(title); results.append(section);
  let trace;
  try { trace = HF.generateRiscvTrace(design, { x1, x2, pc: 0 }); }
  catch (error) { report(section, `generator: ${error.message}`, false); continue; }
  report(section, "nine story steps and true dependency levels", trace.events.length === 9 &&
    trace.events.every((event, index) => event.t === index && event.dependencyLevel === levels[index] &&
      event.phase === (index === 8 ? "clock-edge" : "evaluate")));
  report(section, "focus sets follow the story and contain at most three nets", trace.events.every((event, index) =>
    JSON.stringify(event.focusNets) === JSON.stringify(focus[index]) && event.focusNets.length <= 3 &&
    event.focusNets.every((id) => event.activeNets.some((net) => net.id === id))));
  report(section, "all trace and focus IDs resolve", trace.events.every((event) =>
    event.activeNodes.concat(event.focusNodes).every((id) => nodeIds.has(id) && geometryNodeIds.has(id)) &&
    event.activeNets.every((net) => netIds.has(net.id) && geometryNetIds.has(net.id)) &&
    event.focusNets.concat(event.unused).every((id) => netIds.has(id) && geometryNetIds.has(id))));
  report(section, "all design references resolve in geometry", design.nodes.every((node) => geometryNodeIds.has(node.geometryNodeId)) &&
    design.nets.every((net) => geometryNetIds.has(net.id) && nodeIds.has(net.from) && net.to.every((id) => nodeIds.has(id))) &&
    design.muxes.every((mux) => nodeIds.has(mux.id) && netIds.has(mux.selectNet) && netIds.has(mux.outputNet) && mux.inputs.every((id) => netIds.has(id))));
  report(section, "control wires focus only where used", trace.events.every((event, index) =>
    (index === 4 || index === 5 || index === 6 || index === 7) ||
    event.focusNets.every((id) => design.nets.find((net) => net.id === id).role !== "control")));
  report(section, "control decode has no focused wire", trace.events[3].focusNets.length === 0 &&
    trace.events[3].focusNodes.length === 1 && trace.events[3].activeNets.filter((net) => net.role === "control").length === 7);
  report(section, "same-level steps are marked by dependencyLevel", trace.events[2].dependencyLevel === trace.events[3].dependencyLevel &&
    trace.events[6].dependencyLevel === trace.events[7].dependencyLevel);
  report(section, "unused results are listed for step 3", ["imm", "br_less", "br_equal"].every((id) => trace.events[2].unused.includes(id)));
  report(section, "state writes occur only on the clock edge", trace.events.slice(0, -1).every((event) => event.stateWrites.length === 0) &&
    trace.events.at(-1).stateWrites.length === 2);
  const writes = new Map(trace.events.at(-1).stateWrites.map((write) => [`${write.node}.${write.field}`, write.value]));
  report(section, "x3 and PC final values are correct", writes.get("regfile.x3") === `0x${result.toString(16).toUpperCase()}` && writes.get("pc.value") === "0x4");
}
