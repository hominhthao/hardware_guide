window.HF = window.HF || {};
HF.generateSpiTxTrace = function generateSpiTxTrace(txByte, flow = HF.flow) {
  if (!Number.isInteger(txByte) || txByte < 0 || txByte > 255) throw new RangeError("TX byte must be 0–255");
  const hexValue = `0x${txByte.toString(16).padStart(2, "0").toUpperCase()}`;
  const binaryValue = txByte.toString(2).padStart(8, "0");
  const events = flow.nodes.map((node, index) => ({
    t: index,
    activeEdges: index < flow.order.length ? [flow.order[index]] : [],
    activeNodes: [node.id],
    values: { txByte, hexValue, binaryValue },
    note: `spi.${index + 1}.title`,
    sources: [["spi-cr1", "spi-pins", "spi-sr", "spi-dr"], ["spi-master"], ["spi-pins"], ["spi-pins"]][index],
    captionKey: `spi.${index + 1}.title`,
    popup: { anchor: { kind: "node", id: node.id }, titleKey: `spi.${index + 1}.title`, bodyKey: `spi.${index + 1}.body`, whyKey: index === 0 ? "spi.1.why" : undefined, params: { hexValue, binaryValue } },
    extras: {}
  }));
  return { flowId: flow.flowId, fidelity: flow.fidelity, timeUnit: "step", events };
};
