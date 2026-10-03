const design = HF.riscvDesign;
const geometry = HF.riscvGeometry;
const results = document.getElementById("results");
const nodeIds = new Set(design.nodes.map((node) => node.id));
const netIds = new Set(design.nets.map((net) => net.id));
const geometryNodeIds = new Set(geometry.nodes.map((node) => node.id));
const geometryNetIds = new Set(geometry.nets.map((net) => net.id));
const levels = [
  ["pc"],
  ["instr", "rs1_addr", "rs2_addr", "rd_addr", "pc_four"],
  ["rs1_data", "rs2_data", "pc_sel", "opa_sel", "opb_sel", "alu_op", "mem_wren", "wb_sel", "rd_wren", "imm", "br_less", "br_equal"],
  ["operand_a", "operand_b"], ["alu_data"], ["wb_data", "pc_next"], []
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
  report(section, "seven levels in dependency order, then clock edge", trace.events.length === 7 &&
    trace.events.every((event, index) => event.t === index && event.phase === (index === 6 ? "clock-edge" : "evaluate") &&
      JSON.stringify(event.activeNets.map((net) => net.id)) === JSON.stringify(levels[index])));
  report(section, "all trace node and net IDs resolve in design and geometry", trace.events.every((event) =>
    event.activeNodes.every((id) => nodeIds.has(id) && geometryNodeIds.has(id)) &&
    event.activeNets.every((net) => netIds.has(net.id) && geometryNetIds.has(net.id)) &&
    event.unused.every((id) => netIds.has(id) && geometryNetIds.has(id))));
  report(section, "all design references resolve in geometry", design.nodes.every((node) => geometryNodeIds.has(node.geometryNodeId)) &&
    design.nets.every((net) => geometryNetIds.has(net.id) && nodeIds.has(net.from) && net.to.every((id) => nodeIds.has(id))) &&
    design.muxes.every((mux) => nodeIds.has(mux.id) && netIds.has(mux.selectNet) && netIds.has(mux.outputNet) && mux.inputs.every((id) => netIds.has(id))));
  const muxesCorrect = trace.events.every((event) => design.muxes.every((mux) => {
    const chosen = event.muxSelect[mux.id];
    if (!chosen) return true;
    if (!mux.inputs.includes(chosen)) return false;
    if (!event.activeNets.some((net) => net.id === mux.outputNet)) return true;
    return trace.events.slice(0, event.t + 1).some((earlier) => earlier.activeNets.some((net) => net.id === chosen));
  }));
  report(section, "mux outputs use only the selected input", muxesCorrect);
  report(section, "computed but unused results are marked", ["imm", "br_less", "br_equal"].every((id) => trace.events[2].unused.includes(id)));
  report(section, "state writes occur only on the clock edge", trace.events.slice(0, -1).every((event) => event.stateWrites.length === 0) &&
    trace.events.at(-1).stateWrites.length === 2);
  const writes = new Map(trace.events.at(-1).stateWrites.map((write) => [`${write.node}.${write.field}`, write.value]));
  report(section, "x3 and PC final values are correct", writes.get("regfile.x3") === `0x${result.toString(16).toUpperCase()}` && writes.get("pc.value") === "0x4");
}
