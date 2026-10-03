window.HF = window.HF || {};
HF.geometry = {
  id: "spi-spec",
  image: "assets/spi_block_diagram.png",
  // Reference coordinates preserve the v0.3.1 calibration keys and values.
  viewBox: { width: 1502, height: 1283 },
  viewport: {
    fit: { x: 22, y: 26, right: 53, bottom: 35 },
    focus: { x: 190, y: 390, right: 30, bottom: 35 }
  },
  paths: [
    { id: "tx-data-register-to-shifter", points: [{ x: 528, y: 1041 }, { x: 707, y: 1041 }] },
    { id: "tx-shifter-to-port", points: [{ x: 962, y: 1167 }, { x: 1135, y: 1167 }] },
    { id: "tx-port-to-mosi", points: [{ x: 1256, y: 485 }, { x: 1382, y: 485 }] }
  ],
  nodes: [
    { id: "data-register", box: { x: 214, y: 1039, width: 313, height: 54 } },
    { id: "shifter", box: { x: 577, y: 889, width: 428, height: 303 } },
    { id: "port", box: { x: 1118, y: 181, width: 115, height: 1032 } },
    { id: "mosi", box: { x: 1364, y: 467, width: 49, height: 48 } }
  ]
};
