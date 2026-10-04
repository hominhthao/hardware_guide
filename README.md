# HardwareFlow v0.3.7

HardwareFlow is a local hardware architecture and dataflow visualizer. Open `index.html` in a modern browser; no server, dependencies, or build step are needed.

**Public demo:** [Open HardwareFlow](https://hominhthao.github.io/hardware_guide/). GitHub Pages publishes the `main` branch from the repository root; later pushes to `main` update the same link.

## Views

- **SPI TX:** Shows the original SPI specification diagram directly in SVG, with calibrated signal routes layered over it. The walkthrough is SPI Data Register → Shifter → Port Control Logic → MOSI.
- **RISC-V single-cycle:** Overlays Figure 1: Single Cycle Processor with a ten-step dependency walkthrough of `ADD x3, x1, x2`. The diagram switcher changes the image, scenario inputs, trace, and controls without reloading.

The views switch without reloading. On desktop, the specification diagram and controls share one compact workspace. The diagram remains the main focus and fits within the available panel while preserving its aspect ratio.
The light reading theme uses dark text on pale panels, larger explanation text, and a single-column layout on narrow screens.

## TX data and controls

Enter an 8-bit value as `0x00`–`0xFF` or exactly eight binary digits, then press **Run**. The input is normalized to a numeric value, uppercase hex, and eight-bit binary representation. For example, `0xA5` becomes `165`, `0xA5`, and `10100101`. Invalid values are rejected before animation starts.

**Run** follows the three calibrated TX routes through four displayed stages. Guided playback is the default: **Next** advances after each explanation. Auto playback, 0.5×/1×/2× speed, presentation mode, camera, Spotlight, Pop-ups, trail and developer tools live in **Settings**. Back and Reset stay in the compact panel. The progress dots and expanded **All steps** list seek while paused. Space or Right Arrow advances, Left Arrow goes back, and R resets. Shortcuts are ignored while typing or selecting a control.

The initial view is **Overview**, showing the full source image. **Follow** moves the camera to the current step; the image, paths, block outlines, and marker share one SVG viewBox. Wheel zoom or dragging turns Follow off until you enable it again. Follow is disabled while editing paths. **Spotlight** is on by default and dims nonfocus regions. The source chip opens section, page, and note references for the current step; steps without refs remain **Unverified**.

This is a **conceptual dataflow visualization**, not a cycle-accurate SPI simulator. The byte label identifies the TX value being traced; it does not mean all eight bits appear on MOSI at once.

## Trace architecture

The app separates geometry, design/flow, scenario input, and trace. Ordinary deferred `<script>` tags keep `file://` loading available without a server. For SPI:

- `data/geometry.js` contains only the image, reference viewBox, path points, node bounds, and viewport crops. Saved path and bound calibration overrides this layer, using the existing localStorage keys.
- `data/flow.js` names nodes and edges, gives their order and labels, and links them to geometry by ID. It contains no coordinates.
- `src/spiTxTrace.js` generates a four-event conceptual trace for the TX byte. Each event carries active edge and node IDs, the TX value, a note, and an `extras` object reserved for future detail.

`src/player.js` consumes a trace and reports the current event plus progress through it. `src/renderer.js` draws the image overlay, timeline, spotlight and HTML callout from that event, geometry, and flow. The player and renderer have no protocol-specific stage or path IDs. `src/camera.js` computes a focus viewBox from geometry bounds without touching the DOM. `src/popup.js` scores popup placements and computes reading holds. `src/i18n.js` selects the language and substitutes trace parameters into strings from `data/i18n/en.js` and `data/i18n/vi.js`. `src/ui.js` arranges the compact panel and Settings drawer. `app.js` connects SPI controls and calibration storage. The former Abstract view is archived in `legacy/` because it included unverified blocks not present in the spec diagram. Open `tests/trace.test.html`, `tests/camera.test.html`, `tests/popup.test.html`, `tests/i18n.test.html`, and `tests/specref.test.html` directly in a browser.

For the RISC-V diagram, `data/riscvGeometry.js` holds the image, natural 2792 × 1278 viewBox, node bounds, and directed net segments with junctions. `data/riscvDesign.js` holds the hardware topology: nodes, multi-sink nets, mux inputs and selects, clocked marks, and a grounded `specRef`. It has no coordinates. A scenario consists of x1, x2, and initial PC; `src/riscvAddTrace.js` turns it into ten story events containing net values, selected mux inputs, unused results, captions, and clock-edge state writes. The trace is the only source for rendered values and state changes. `src/riscvApp.js` wires the scenario controls and calibration editor to the same player and renderer used by SPI. SPI edges are also represented as single-sink nets; their existing paths and calibration keys remain intact.

The ten RISC-V story steps describe **dependency order**, not elapsed time. Steps 3–4, 5–6, and 8–9 share dependency levels because those operations are parallel in hardware. Step 10 is a clock edge: x3, PC, and two figure-derived output registers change there. The story does not model elapsed time within the cycle. The default instruction word is the read-only `0x002081B3`; input arithmetic wraps to 32 bits. The controls accept unsigned 32-bit decimal or hexadecimal values. Open `tests/riscv-add.test.html` directly to check four ADD scenarios, graph references, focus sets, and state writes.

**Story** is the default presentation: the source block glows for about 0.4 seconds, focused wires draw for about 0.9 seconds, then arrival blocks and values appear for about 0.4 seconds at 1× speed. Other overlay routes are hidden. The strip below the diagram holds the caption, control values, and a revealable list of computed but unused results. **Full** shows all active nets and values. **Guided** waits after each step for Next or Space; **Auto** holds each popup for `max(1.8 s, 1.5 s + 0.35 s × word count)` after arrival at 1× speed. The speed selector scales this hold. A popup can be closed for its current step, or all popups can be switched off in Settings. **Previous** and timeline clicks restore earlier steps. **Keep full trail** retains older completed routes; by default only the previous step remains prominent. The language choice persists in browser storage when available; presentation choices stay in memory for the current page session.

In the RISC-V diagram, **Debug: show all nets** labels every route. **Edit Paths** selects a net and segment, then lets you add, move, or delete points and segments. Click near an existing junction to snap; hold Shift while placing a point to lock it horizontally or vertically to its neighbor. **Save Net** stores overrides under `hardwareflow.riscv.nets.v1`, separate from SPI calibration. Export and import JSON transfer these overrides. The draft node bounds and routes can also be refined in `data/riscvGeometry.js`. The original image remains at `assets/risc_v_block_diagram.png`; the app loads its copy at `assets/riscv-single-cycle.png`.

### Specification references

`data/flow.js` and `data/riscvDesign.js` contain a document identity and short section/page references. Nodes carry `specRefIds`; trace events carry `sources`. `src/sources.js` resolves those IDs, and the source chip and step popup show the citations. An event with no valid refs displays **Unverified**. Reference notes are translated in both language files. Local PDFs are described in `docs/specs/README.md` and ignored by Git.

## Add the original diagram

Save the original PNG from the hardware specification at:

```text
hardware-flow/assets/spi_block_diagram.png
```

The included original PNG is 1462 × 1272 pixels. The app reads its natural dimensions when it loads. The SVG image, paths, and marker share one `viewBox` based on those dimensions, so they scale together without distorting the image. If the PNG is absent, the page shows a missing-image message and hides the routes.

## Calibrate TX paths

The default route points in `geometry.paths` in `data/geometry.js` use a 1502 × 1283 reference coordinate system retained for saved calibration compatibility. They are calibrated against the included 1462 × 1272 PNG. The app scales those points to the loaded PNG's actual dimensions. The three routes follow the visible register-to-shifter bus, shifter `data out` line, and port-to-MOSI connection. If the PNG is replaced with a differently cropped export, fine-tune them in **SPI TX → Settings → Developer tools → Edit Paths**.

In Edit Paths, choose a route, click a control point, then click its new position on the diagram. Click elsewhere to add a point. **Clear Path** lets you rebuild a route by clicking along the visible line; **Undo Point** removes the last point. **Save Path** stores your correction in this browser's `localStorage`, overriding the defaults on reload. **Reset Calibration** removes all saved path and block-bound corrections and restores the defaults in `data/geometry.js`. Block bounds can be edited in the expandable bounds editor. **Export JSON** and **Import JSON** transfer path and bound calibration.

The on-screen editor uses the 1502 × 1283 reference coordinate system. To edit defaults in code, convert a point on the saved PNG with:

```text
x = PNG pixel x / PNG pixel width  × 1502
y = PNG pixel y / PNG pixel height × 1283
```

## Roadmap

- **v0.4:** Per-stage signal and bit values
- **v0.5:** Clock and cycle visualization
- **v0.6:** Multiple flows: SPI TX, SPI RX, clock generation, interrupt/status
- **Future:** User-defined spec diagrams, hierarchical hardware views, optional HDL-assisted architecture extraction
