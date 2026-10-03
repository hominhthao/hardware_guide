window.HF = window.HF || {};
HF.flow = {
  flowId: "spi-tx",
  diagramId: "spi-spec",
  fidelity: "conceptual",
  readyNote: "Ready to follow the SPI TX dataflow.",
  // TODO: fill only from a verified hardware specification.
  specRef: { doc: "", section: "", page: null, signals: [] },
  nodes: [
    { id: "data-register", label: "SPI Data Register", geometryNodeId: "data-register" },
    { id: "shifter", label: "Shifter", geometryNodeId: "shifter" },
    { id: "port", label: "Port Control Logic", geometryNodeId: "port" },
    { id: "mosi", label: "MOSI", geometryNodeId: "mosi" }
  ],
  edges: [
    { id: "register-to-shifter", from: "data-register", to: "shifter", pathId: "tx-data-register-to-shifter", signal: "parallel-tx-data", label: "SPI Data Register → Shifter" },
    { id: "shifter-to-port", from: "shifter", to: "port", pathId: "tx-shifter-to-port", signal: "serial-output", label: "Shifter → Port Control Logic" },
    { id: "port-to-mosi", from: "port", to: "mosi", pathId: "tx-port-to-mosi", signal: "tx-output", label: "Port Control Logic → MOSI" }
  ],
  order: ["register-to-shifter", "shifter-to-port", "port-to-mosi"]
};
