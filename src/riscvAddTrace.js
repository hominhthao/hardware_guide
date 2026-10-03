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
      "The PC sends the current address to instruction memory.", { detail: "The same PC value also reaches the +4 unit and debug output." }),
    event(1, 2, [net("instr", "0x002081B3"), net("rs1_addr", "x1"), net("rs2_addr", "x2"), net("rd_addr", "x3"), net("pc_four", hex(pcFour))],
      ["icache", "regfile", "immgen", "control", "plus4"], ["instr", "rs1_addr", "rs2_addr"], ["icache", "regfile"],
      "The instruction names the registers to read and write.", { detail: "The instruction also reaches the decoder and immediate generator; PC + 4 is computed in parallel." }),
    event(2, 3, [net("rs1_data", hex(x1)), net("rs2_data", hex(x2)), net("imm", "computed"), net("br_less", "computed"), net("br_equal", "computed")],
      ["regfile", "brc", "immgen"], ["rs1_data", "rs2_data"], ["regfile", "opa_mux", "opb_mux"],
      "The register file supplies the two values for ADD.", { detail: "Branch and immediate results are computed but not used by ADD.", unused: ["imm", "br_less", "br_equal"] }),
    event(3, 3, [net("pc_sel", "pc_four"), net("opa_sel", "rs1_data"), net("opb_sel", "rs2_data"), net("alu_op", "ADD"),
      net("mem_wren", "0"), net("wb_sel", "alu_data"), net("rd_wren", "1")], ["control"], [], ["control"],
      "The control unit decodes ADD and chooses its routes.", { detail: "In hardware this happens at the same time as the register read in step 3.", muxSelect: choice }),
    event(4, 4, [net("opa_sel", "rs1_data"), net("opb_sel", "rs2_data"), net("operand_a", hex(x1)), net("operand_b", hex(x2))],
      ["control", "opa_mux", "opb_mux"], ["opa_sel", "opb_sel", "operand_a"], ["opa_mux", "opb_mux"],
      "The operand muxes pass x1 and x2 toward the ALU.", { detail: "Both select signals act here; the second operand continues on the neighboring path.", muxSelect: choice }),
    event(5, 5, [net("alu_op", "ADD"), net("alu_data", hex(result))], ["control", "alu"], ["alu_op", "alu_data"], ["alu"],
      "The ALU adds the two values with 32-bit wraparound.", { muxSelect: choice }),
    event(6, 6, [net("wb_sel", "alu_data"), net("alu_data", hex(result)), net("wb_data", hex(result)), net("mem_wren", "0")],
      ["control", "alu", "wb_mux", "regfile", "lsu"], ["wb_sel", "alu_data", "wb_data"], ["wb_mux", "regfile"],
      "Write-back routes the ALU result to register x3.", { detail: "LSU idle: it receives the ALU address but does not write because mem_wren is 0.", muxSelect: choice }),
    event(7, 6, [net("pc_sel", "pc_four"), net("pc_four", hex(pcFour)), net("pc_next", hex(pcFour))],
      ["control", "plus4", "mux_pc", "pc"], ["pc_sel", "pc_four", "pc_next"], ["mux_pc"],
      "The PC mux chooses PC + 4 as the next address.", { detail: "In hardware this happens at the same time as write-back in step 7.", muxSelect: choice }),
    event(8, 7, [], ["regfile", "pc"], [], [],
      "At the clock edge, x3 and PC take their new values.", { phase: "clock-edge", detail: "The new x3 is the sum; the new PC is PC + 4.", stateWrites: [
        { node: "regfile", field: "x3", value: hex(result) }, { node: "pc", field: "value", value: hex(pcFour) }
      ] })
  ];
  return {
    designId: design.designId, flowId: design.designId, fidelity: "dependency-order", timeUnit: "step",
    badge: "DEPENDENCY ORDER - parallel work is shown one step at a time; state updates at clock edge",
    instruction: "0x002081B3",
    initialState: [
      { node: "pc", field: "value", value: hex(pc) },
      { node: "regfile", field: "x1", value: hex(x1) },
      { node: "regfile", field: "x2", value: hex(x2) },
      { node: "regfile", field: "x3", value: "—" }
    ], events
  };
};
