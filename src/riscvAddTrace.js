window.HF = window.HF || {};
HF.generateRiscvTrace = function generateRiscvTrace(design, scenario) {
  const u32 = (value, name) => {
    if (!Number.isInteger(value) || value < 0 || value > 0xFFFFFFFF) throw new RangeError(`${name} must be an unsigned 32-bit integer`);
    return value >>> 0;
  };
  const x1 = u32(scenario.x1, "x1");
  const x2 = u32(scenario.x2, "x2");
  const pc = u32(scenario.pc, "PC");
  const result = (x1 + x2) >>> 0;
  const pcFour = (pc + 4) >>> 0;
  const hex = (value) => `0x${value.toString(16).toUpperCase()}`;
  const net = (id, value) => ({ id, value: String(value), role: design.nets.find((item) => item.id === id).role });
  const choice = { mux_pc: "pc_four", opa_mux: "rs1_data", opb_mux: "rs2_data", wb_mux: "alu_data" };
  const event = (t, dependencyLevel, activeNets, activeNodes, focusNets, focusNodes, caption, more = {}) => ({
    t, dependencyLevel, phase: "evaluate", activeEdges: [], activeNodes, values: {}, note: caption, extras: {},
    activeNets, focusNets, focusNodes, muxSelect: {}, unused: [], stateWrites: [], caption, detail: "", ...more
  });
  const events = [
    event(0, 1, [net("pc", hex(pc))], ["pc", "icache", "plus4", "pc_debug"], ["pc"], ["pc", "icache"],
      "add.1.title", { detail: "add.1.detail" }),
    event(1, 2, [net("instr", "0x002081B3"), net("rs1_addr", "x1"), net("rs2_addr", "x2"), net("rd_addr", "x3"), net("pc_four", hex(pcFour))],
      ["icache", "regfile", "immgen", "control", "plus4"], ["instr", "rs1_addr", "rs2_addr"], ["icache", "regfile"],
      "add.2.title", { detail: "add.2.detail" }),
    event(2, 3, [net("rs1_data", hex(x1)), net("rs2_data", hex(x2)), net("imm", "computed"), net("br_less", "computed"), net("br_equal", "computed")],
      ["regfile", "brc", "immgen"], ["rs1_data", "rs2_data"], ["regfile", "opa_mux", "opb_mux"],
      "add.3.title", { detail: "add.3.detail", unused: ["imm", "br_less", "br_equal"] }),
    event(3, 3, [net("pc_sel", "pc_four"), net("opa_sel", "rs1_data"), net("opb_sel", "rs2_data"), net("alu_op", "ADD"),
      net("mem_wren", "0"), net("wb_sel", "alu_data"), net("rd_wren", "1")], ["control"], [], ["control"],
      "add.4.title", { detail: "add.4.detail", muxSelect: choice }),
    event(4, 4, [net("opa_sel", "rs1_data"), net("opb_sel", "rs2_data")],
      ["control", "opa_mux", "opb_mux"], ["opa_sel", "opb_sel"], ["control", "opa_mux", "opb_mux"],
      "add.5.title", { detail: "add.5.detail", muxSelect: choice }),
    event(5, 4, [net("operand_a", hex(x1)), net("operand_b", hex(x2))],
      ["opa_mux", "opb_mux", "alu"], ["operand_a", "operand_b"], ["opa_mux", "opb_mux", "alu"],
      "add.6.title", { detail: "add.6.detail", muxSelect: choice }),
    event(6, 5, [net("alu_op", "ADD"), net("alu_data", hex(result))], ["control", "alu"], ["alu_op", "alu_data"], ["alu"],
      "add.7.title", { muxSelect: choice }),
    event(7, 6, [net("wb_sel", "alu_data"), net("alu_data", hex(result)), net("wb_data", hex(result)), net("mem_wren", "0")],
      ["control", "alu", "wb_mux", "regfile", "lsu"], ["wb_sel", "alu_data", "wb_data"], ["wb_mux", "regfile"],
      "add.8.title", { detail: "add.8.detail", muxSelect: choice }),
    event(8, 6, [net("pc_sel", "pc_four"), net("pc_four", hex(pcFour)), net("pc_next", hex(pcFour))],
      ["control", "plus4", "mux_pc", "pc"], ["pc_sel", "pc_four", "pc_next"], ["mux_pc"],
      "add.9.title", { detail: "add.9.detail", muxSelect: choice }),
    event(9, 7, [], ["regfile", "pc"], [], [],
      "add.10.title", { phase: "clock-edge", detail: "add.10.detail", stateWrites: [
        { node: "regfile", field: "x3", value: hex(result) }, { node: "pc", field: "value", value: hex(pcFour) }
      ] })
  ];
  events.forEach((item, index) => {
    const key = `add.${index + 1}`;
    item.captionKey = `${key}.title`;
    item.detailKey = `${key}.detail`;
    item.popup = {
      anchor: index === 9 ? { kind: "node", id: "pc" } : item.focusNets.length ? { kind: "net", id: item.focusNets[0] } : { kind: "node", id: item.focusNodes[0] },
      titleKey: `${key}.title`, bodyKey: `${key}.body`, whyKey: [0, 1, 2, 3, 7].includes(index) ? `${key}.why` : undefined,
      params: { x1: hex(x1), x2: hex(x2), sum: hex(result), pc4: hex(pcFour) }
    };
    item.caption = item.captionKey;
    item.detail = item.detailKey;
    item.note = item.captionKey;
  });
  return {
    designId: design.designId, flowId: design.designId, fidelity: "dependency-order", timeUnit: "step",
    badgeKey: "ui.dependency",
    instruction: "0x002081B3",
    initialState: [
      { node: "pc", field: "value", value: hex(pc) },
      { node: "regfile", field: "x1", value: hex(x1) },
      { node: "regfile", field: "x2", value: hex(x2) },
      { node: "regfile", field: "x3", value: "—" }
    ], events
  };
};
