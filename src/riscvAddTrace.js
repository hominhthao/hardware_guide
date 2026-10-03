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
  const muxSelect = { mux_pc: "pc_four", opa_mux: "rs1_data", opb_mux: "rs2_data", wb_mux: "alu_data" };
  const event = (t, activeNets, activeNodes, caption, more = {}) => ({
    t, phase: "evaluate", activeEdges: [], activeNodes, values: { txByte: null },
    note: caption, extras: {}, activeNets, muxSelect: t >= 2 ? { ...muxSelect } : {},
    unused: [], stateWrites: [], caption, ...more
  });
  const events = [
    event(0, [net("pc", hex(pc))], ["pc", "icache", "plus4", "pc_debug"],
      "The PC value reaches instruction memory, the +4 unit, and the debug register input."),
    event(1, [net("instr", "0x002081B3"), net("rs1_addr", "x1"), net("rs2_addr", "x2"), net("rd_addr", "x3"), net("pc_four", hex(pcFour))],
      ["icache", "regfile", "immgen", "control", "plus4"],
      "The instruction fans out to its readers while PC + 4 is computed."),
    event(2, [
      net("rs1_data", hex(x1)), net("rs2_data", hex(x2)),
      net("pc_sel", "pc_four"), net("opa_sel", "rs1_data"), net("opb_sel", "rs2_data"),
      net("alu_op", "ADD"), net("mem_wren", "0"), net("wb_sel", "alu_data"), net("rd_wren", "1"),
      net("imm", "computed"), net("br_less", "computed"), net("br_equal", "computed")
    ], ["regfile", "control", "immgen", "brc"],
    "The Regfile supplies x1 and x2; control selects the ADD paths.",
    { unused: ["imm", "br_less", "br_equal"] }),
    event(3, [net("operand_a", hex(x1)), net("operand_b", hex(x2))], ["opa_mux", "opb_mux", "alu"],
      "Mux A and Mux B pass the two register values to the ALU."),
    event(4, [net("alu_data", hex(result))], ["alu", "lsu", "wb_mux"],
      "The ALU adds x1 and x2 with 32-bit wraparound."),
    event(5, [net("wb_data", hex(result)), net("pc_next", hex(pcFour))], ["wb_mux", "mux_pc", "regfile", "pc"],
      "Write-back selects ALU data; PC select chooses PC + 4. The LSU does not write."),
    event(6, [], ["regfile", "pc"],
      "At the clock edge, x3 receives the sum and PC receives PC + 4.",
      { phase: "clock-edge", stateWrites: [
        { node: "regfile", field: "x3", value: hex(result) },
        { node: "pc", field: "value", value: hex(pcFour) }
      ] })
  ];
  return {
    designId: design.designId, flowId: design.designId, fidelity: "dependency-order", timeUnit: "level",
    badge: "DEPENDENCY ORDER - not time; state updates at clock edge",
    instruction: "0x002081B3",
    initialState: [
      { node: "pc", field: "value", value: hex(pc) },
      { node: "regfile", field: "x1", value: hex(x1) },
      { node: "regfile", field: "x2", value: hex(x2) },
      { node: "regfile", field: "x3", value: "—" }
    ],
    events
  };
};
