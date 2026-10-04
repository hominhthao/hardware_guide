window.HF = window.HF || {};
HF.flow = {
  flowId: "spi-tx",
  diagramId: "spi-spec",
  fidelity: "conceptual",
  readyNoteKey: "ui.spiReady",
  specRef: { doc: { title: "SPI Block Guide", publisher: "Motorola/Freescale", docId: "S12SPIV4/D", rev: "V04.01" }, refs: [
    { id: 'spi-fig11', section: 'Figure 1-1', page: 13, figure: 'Figure 1-1', note: 'ref.spi-fig11.note' },
    { id: 'spi-pins', section: '§2.2.1; Table 3-3', page: 15, note: 'ref.spi-pins.note' },
    { id: 'spi-cr1', section: '§3.1.1', page: 16, note: 'ref.spi-cr1.note' },
    { id: 'spi-sr', section: '§3.1.4', page: 21, note: 'ref.spi-sr.note' },
    { id: 'spi-dr', section: '§3.1.5', page: 22, note: 'ref.spi-dr.note' },
    { id: 'spi-general', section: '§4.1', page: 24, note: 'ref.spi-general.note' },
    { id: 'spi-master', section: '§4.2', page: 24, note: 'ref.spi-master.note' },
    { id: 'spi-formats', section: '§4.4', page: 26, note: 'ref.spi-formats.note' },
  ] },
  preconditions: { titleKey: "spi.preconditions.title", bodyKey: "spi.preconditions.body", sources: ["spi-cr1", "spi-pins"] },
  nodes: [
    { id: "data-register", label: "SPI Data Register", geometryNodeId: "data-register", specRefIds: ["spi-dr", "spi-sr"] },
    { id: "shifter", label: "Shifter", geometryNodeId: "shifter", specRefIds: ["spi-general", "spi-formats"] },
    { id: "port", label: "Port Control Logic", geometryNodeId: "port", specRefIds: ["spi-pins"] },
    { id: "mosi", label: "MOSI", geometryNodeId: "mosi", specRefIds: ["spi-pins"] }
  ],
  edges: [
    { id: "register-to-shifter", from: "data-register", to: "shifter", pathId: "tx-data-register-to-shifter", signal: "parallel-tx-data", label: "SPI Data Register → Shifter" },
    { id: "shifter-to-port", from: "shifter", to: "port", pathId: "tx-shifter-to-port", signal: "serial-output", label: "Shifter → Port Control Logic" },
    { id: "port-to-mosi", from: "port", to: "mosi", pathId: "tx-port-to-mosi", signal: "tx-output", label: "Port Control Logic → MOSI" }
  ],
  order: ["register-to-shifter", "shifter-to-port", "port-to-mosi"]
};
// The conceptual edges are also single-sink nets. The legacy edge IDs stay in the trace.
HF.flow.nets = HF.flow.edges.map((edge) => ({
  id: edge.pathId, from: edge.from, to: [edge.to], role: "data", label: edge.label, labelSource: "diagram"
}));
HF.spiDesign = {
  designId: HF.flow.flowId, diagramId: HF.flow.diagramId,
  specRef: HF.flow.specRef, nodes: HF.flow.nodes, nets: HF.flow.nets,
  muxes: []
};
