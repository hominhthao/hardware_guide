// Edit this object to display another architecture. Connections refer to block IDs.
const architecture = {
  name: "SPI TX Dataflow",
  blocks: [
    { id: "cpu", label: "CPU", type: "processor" },
    { id: "a2h", label: "A2H Bus", type: "bus" },
    { id: "spi", label: "SPI Controller", type: "controller" },
    { id: "tx_fifo", label: "TX FIFO", type: "fifo" },
    { id: "shift_register", label: "Shift Register", type: "register" },
    { id: "mosi", label: "MOSI", type: "signal" }
  ],
  connections: [
    { from: "cpu", to: "a2h" },
    { from: "a2h", to: "spi" },
    { from: "spi", to: "tx_fifo" },
    { from: "tx_fifo", to: "shift_register" },
    { from: "shift_register", to: "mosi" }
  ]
};

const SVG_NS = "http://www.w3.org/2000/svg";
const blockElements = new Map();
function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function renderBlocks(data) {
  const list = document.getElementById("blocks");
  list.replaceChildren();
  blockElements.clear();

  data.blocks.forEach((block, index) => {
    const item = makeElement("li", "block", "");
    item.dataset.type = block.type;
    item.dataset.blockId = block.id;

    const top = makeElement("div", "block-top", "");
    top.append(
      makeElement("span", "block-index", String(index + 1).padStart(2, "0")),
      makeElement("span", "block-icon", "")
    );

    const details = makeElement("div", "block-details", "");
    details.append(
      makeElement("div", "block-label", block.label),
      makeElement("div", "block-type", block.type)
    );
    item.append(top, details);
    list.append(item);
    blockElements.set(block.id, item);
  });
}

function renderConnections(data) {
  const svg = document.getElementById("connections");
  const diagram = document.getElementById("diagram");
  svg.setAttribute("viewBox", `0 0 ${diagram.clientWidth} ${diagram.clientHeight}`);
  svg.replaceChildren();

  const defs = document.createElementNS(SVG_NS, "defs");
  const marker = document.createElementNS(SVG_NS, "marker");
  marker.setAttribute("id", "arrowhead");
  marker.setAttribute("viewBox", "0 0 8 8");
  marker.setAttribute("refX", "7");
  marker.setAttribute("refY", "4");
  marker.setAttribute("markerWidth", "8");
  marker.setAttribute("markerHeight", "8");
  marker.setAttribute("orient", "auto-start-reverse");
  const arrow = document.createElementNS(SVG_NS, "path");
  arrow.setAttribute("d", "M 1 1 L 7 4 L 1 7");
  arrow.setAttribute("fill", "none");
  arrow.setAttribute("stroke", "#99bdc9");
  arrow.setAttribute("stroke-width", "1.2");
  marker.append(arrow);
  defs.append(marker);
  svg.append(defs);

  data.connections.forEach(({ from, to }) => {
    const source = blockElements.get(from);
    const target = blockElements.get(to);
    if (!source || !target) return;

    const diagramRect = diagram.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const sourceLeft = sourceRect.left - diagramRect.left;
    const targetLeft = targetRect.left - diagramRect.left;
    const sourceTop = sourceRect.top - diagramRect.top;
    const targetTop = targetRect.top - diagramRect.top;
    const sourceCenter = sourceLeft + sourceRect.width / 2;
    const targetCenter = targetLeft + targetRect.width / 2;
    const forward = sourceCenter < targetCenter;
    const adjacent = Math.abs(targetCenter - sourceCenter) <= sourceRect.width + 100;
    const path = document.createElementNS(SVG_NS, "path");
    const y = sourceTop + sourceRect.height / 2;

    if (adjacent) {
      const startX = forward ? sourceLeft + sourceRect.width + 8 : sourceLeft - 8;
      const endX = forward ? targetLeft - 12 : targetLeft + targetRect.width + 12;
      path.setAttribute("d", `M ${startX} ${y} L ${endX} ${y}`);
    } else {
      // Route longer connections over the cards so intermediate blocks stay readable.
      const routeY = Math.max(20, sourceTop - 28);
      const startX = sourceCenter;
      const endX = targetCenter;
      path.setAttribute("d", `M ${startX} ${sourceTop - 8} L ${startX} ${routeY} L ${endX} ${routeY} L ${endX} ${targetTop - 12}`);
    }

    path.setAttribute("class", "connection-path");
    path.setAttribute("marker-end", "url(#arrowhead)");
    svg.append(path);
  });
}

function renderArchitecture(data) {
  document.getElementById("architecture-name").textContent = data.name;
  document.getElementById("diagram-summary").textContent =
    `${data.blocks.length} blocks  ·  ${data.connections.length} connections`;
  renderBlocks(data);
  renderConnections(data);

  const labels = new Map(data.blocks.map(({ id, label }) => [id, label]));
  document.getElementById("connection-description").textContent =
    `Connections: ${data.connections.map(({ from, to }) => `${labels.get(from)} to ${labels.get(to)}`).join(", ")}.`;
}
