window.HF = window.HF || {};
HF.generateSpiTxTrace = function generateSpiTxTrace(txByte, flow = HF.flow) {
  if (!Number.isInteger(txByte) || txByte < 0 || txByte > 255) throw new RangeError("TX byte must be 0–255");
  const hexValue = `0x${txByte.toString(16).padStart(2, "0").toUpperCase()}`;
  const binaryValue = txByte.toString(2).padStart(8, "0");
  const notes = [
    "Data is loaded into the SPI Data Register.",
    "Data enters the Shifter.",
    "Data reaches Port Control Logic.",
    "Data reaches the MOSI output; serial bit timing is not modeled."
  ];
  const events = flow.nodes.map((node, index) => ({
    t: index,
    activeEdges: index < flow.order.length ? [flow.order[index]] : [],
    activeNodes: [node.id],
    values: { txByte, hexValue, binaryValue },
    note: notes[index] ?? "",
    extras: {}
  }));
  return { flowId: flow.flowId, fidelity: flow.fidelity, timeUnit: "step", events };
};
