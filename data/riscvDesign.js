window.HF = window.HF || {};
const riscvNodes = [
  ["mux_pc", "PC select mux", "mux", false], ["pc", "PC", "register", true],
  ["plus4", "+4", "comb", false], ["icache", "I$", "memory", true],
  ["regfile", "Regfile", "register", true], ["immgen", "ImmGen", "comb", false],
  ["brc", "BRC", "comb", false], ["opa_mux", "Mux A", "mux", false],
  ["opb_mux", "Mux B", "mux", false], ["alu", "ALU", "comb", false],
  ["lsu", "LSU", "memory", true], ["control", "ControlUnit", "comb", false],
  ["wb_mux", "Write-back mux", "mux", false], ["pc_debug", "o_pc_debug register", "register", true],
  ["insn_vld_reg", "o_insn_vld register", "register", true], ["io", "I/O", "output", false]
];
const netRows = [
  ["pc_next", "mux_pc", ["pc"], "data"],
  ["pc", "pc", ["icache", "plus4", "opa_mux", "pc_debug"], "data"],
  ["instr", "icache", ["regfile", "immgen", "control"], "data"],
  ["rs1_addr", "icache", ["regfile"], "data", "ours"],
  ["rs2_addr", "icache", ["regfile"], "data", "ours"],
  ["rd_addr", "icache", ["regfile"], "data", "ours"],
  ["pc_four", "plus4", ["mux_pc", "wb_mux"], "data"],
  ["rs1_data", "regfile", ["opa_mux", "brc"], "data"],
  ["rs2_data", "regfile", ["opb_mux", "brc", "lsu"], "data"],
  ["operand_a", "opa_mux", ["alu"], "data"],
  ["operand_b", "opb_mux", ["alu"], "data"],
  ["alu_data", "alu", ["wb_mux", "lsu", "mux_pc"], "data"],
  ["ld_data", "lsu", ["wb_mux"], "data"],
  ["wb_data", "wb_mux", ["regfile"], "data"],
  ["imm", "immgen", ["opb_mux"], "data", "ours"],
  ["pc_sel", "control", ["mux_pc"], "control"],
  ["rd_wren", "control", ["regfile"], "control"],
  ["insn_vld", "control", ["insn_vld_reg"], "control"],
  ["br_un", "control", ["brc"], "control"],
  ["br_less", "brc", ["control"], "control"],
  ["br_equal", "brc", ["control"], "control"],
  ["opa_sel", "control", ["opa_mux"], "control"],
  ["opb_sel", "control", ["opb_mux"], "control"],
  ["alu_op", "control", ["alu"], "control"],
  ["mem_wren", "control", ["lsu"], "control"],
  ["wb_sel", "control", ["wb_mux"], "control"],
  ["o_pc_debug", "pc_debug", ["io"], "data"],
  ["o_insn_vld", "insn_vld_reg", ["io"], "data"],
  ["io_link", "lsu", ["io"], "data", "ours"]
];
const riscvNodeRefs = {"mux_pc": ["rv-fig1"], "pc": ["rv-fig1"], "plus4": ["rv-fig1"], "icache": ["rv-regmem", "rv-special"], "regfile": ["rv-regmem"], "immgen": ["rv-fig1"], "brc": ["rv-brc"], "opa_mux": ["rv-fig1"], "opb_mux": ["rv-fig1"], "alu": ["rv-alu"], "lsu": ["rv-lsu", "rv-map", "rv-special"], "control": ["rv-fig1", "rv-insnvld", "rv-alu"], "wb_mux": ["rv-fig1"], "pc_debug": ["rv-fig1", "rv-ports"], "insn_vld_reg": ["rv-fig1", "rv-ports"], "io": ["rv-ports"]};
HF.riscvDesign = {
  designId: "riscv-sc",
  diagramId: "riscv-sc",
  specRef: { doc: { title: "Milestone 2 - Design of a Single Cycle RISC-V Processor", author: "Hai Cao", rev: "2.0.0" }, refs: [
    { id: 'rv-fig1', section: 'Figure 1', page: 3, figure: 'Figure 1', note: 'ref.rv-fig1.note' },
    { id: 'rv-ports', section: '§2.1', page: 4, note: 'ref.rv-ports.note' },
    { id: 'rv-alu', section: '§3.1', page: 5, note: 'ref.rv-alu.note' },
    { id: 'rv-brc', section: '§3.2', page: 6, note: 'ref.rv-brc.note' },
    { id: 'rv-regmem', section: '§4.1.1', page: 6, note: 'ref.rv-regmem.note' },
    { id: 'rv-lsu', section: '§4.2', page: 8, figure: 'Figure 3', note: 'ref.rv-lsu.note' },
    { id: 'rv-map', section: 'Table 1', page: 9, note: 'ref.rv-map.note' },
    { id: 'rv-special', section: '§4.2.4', page: 9, note: 'ref.rv-special.note' },
    { id: 'rv-insnvld', section: '§5', page: 10, note: 'ref.rv-insnvld.note' },
  ] },
  nodes: riscvNodes.map(([id, label, type, clocked]) => ({ id, label, type, clocked, geometryNodeId: id, specRefIds: riscvNodeRefs[id] })),
  nets: netRows.map(([id, from, to, role, labelSource = "diagram"]) => ({ id, label: id, from, to, role, labelSource })),
  muxes: [
    { id: "mux_pc", inputs: ["pc_four", "alu_data"], selectNet: "pc_sel", outputNet: "pc_next" },
    { id: "opa_mux", inputs: ["pc", "rs1_data"], selectNet: "opa_sel", outputNet: "operand_a" },
    { id: "opb_mux", inputs: ["rs2_data", "imm"], selectNet: "opb_sel", outputNet: "operand_b" },
    { id: "wb_mux", inputs: ["pc_four", "alu_data", "ld_data"], selectNet: "wb_sel", outputNet: "wb_data" }
  ]
};
