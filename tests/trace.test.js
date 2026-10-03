const geometry = HF.geometry;
const flow = HF.flow;
const results = document.getElementById("results");
const nodeIds = new Set(flow.nodes.map((node) => node.id));
const edgeIds = new Set(flow.edges.map((edge) => edge.id));
const pathIds = new Set(geometry.paths.map((path) => path.id));
const geometryNodeIds = new Set(geometry.nodes.map((node) => node.id));
function report(section, label, passed) {
  const row = document.createElement("p");
  row.className = passed ? "pass" : "fail";
  row.textContent = `${passed ? "PASS" : "FAIL"} — ${label}`;
  section.append(row);
}
for (const byte of [0xA5, 0x00, 0xFF]) {
  const section = document.createElement("section");
  const title = document.createElement("h2");
  title.textContent = `TX ${`0x${byte.toString(16).padStart(2, "0").toUpperCase()}`}`;
  section.append(title); results.append(section);
  let trace;
  try { trace = HF.generateSpiTxTrace(byte, flow); }
  catch (error) { report(section, `generator: ${error.message}`, false); continue; }
  report(section, "four events and conceptual trace metadata", trace.events.length === 4 && trace.flowId === flow.flowId && trace.fidelity === "conceptual" && trace.timeUnit === "step");
  report(section, "activeEdges follow flow.order, then end", trace.events.slice(0, -1).every((event, index) => event.activeEdges.length === 1 && event.activeEdges[0] === flow.order[index]) && trace.events.at(-1).activeEdges.length === 0);
  report(section, "each event carries the TX byte in values", trace.events.every((event) => event.values.txByte === byte && event.values.hexValue === `0x${byte.toString(16).padStart(2, "0").toUpperCase()}` && event.values.binaryValue === byte.toString(2).padStart(8, "0")));
  report(section, "each activeEdge and activeNode exists in flow", trace.events.every((event) => event.activeEdges.every((id) => edgeIds.has(id)) && event.activeNodes.every((id) => nodeIds.has(id))));
  report(section, "each flow path and node resolves in geometry", flow.edges.every((edge) => pathIds.has(edge.pathId) && nodeIds.has(edge.from) && nodeIds.has(edge.to)) && flow.nodes.every((node) => geometryNodeIds.has(node.geometryNodeId)));
  report(section, "event shape includes note and extensible extras", trace.events.every((event, index) => event.t === index && typeof event.note === "string" && event.extras && typeof event.extras === "object"));
}
