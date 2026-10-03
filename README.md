# HardwareFlow v0.3.2

HardwareFlow is a local hardware architecture and dataflow visualizer. Open `index.html` in a modern browser; no server, dependencies, or build step are needed.

## Views

- **Abstract View:** The v0.1 high-level CPU → A2H Bus → SPI Controller → TX FIFO → Shift Register → MOSI diagram remains available.
- **Spec Overlay View:** Shows the original SPI specification diagram directly in SVG, with calibrated signal routes layered over it. The current walkthrough is **SPI TX Dataflow**: SPI Data Register → Shifter → Port Control Logic → MOSI.

The views switch without reloading. On desktop, the specification diagram and controls share one compact workspace. The diagram remains the main focus and fits within the available panel while preserving its aspect ratio.

## TX data and controls

Enter an 8-bit value as `0x00`–`0xFF` or exactly eight binary digits, then press **Run**. The input is normalized to a numeric value, uppercase hex, and eight-bit binary representation. For example, `0xA5` becomes `165`, `0xA5`, and `10100101`. Invalid values are rejected before animation starts.

**Run** follows the three calibrated TX routes through four displayed stages. The button becomes **Pause** during playback and **Replay** when done. **Step**, **Previous**, and the stage timeline seek while paused; **Reset** returns to Ready. Speed choices are 0.5×, 1×, and 2×. Space runs or pauses, Right Arrow steps, Left Arrow goes back, and R resets. Shortcuts are ignored while typing or selecting a control.

The diagram starts in **Focus flow** view; **Fit** shows the full source image. Both views use a shared SVG viewBox for the image, paths, block outlines, and marker. The background dims during playback by default and can be restored with **Dim background**. The panel displays an **Unverified** spec reference warning because this source has no confirmed `specRef`.

This is a **conceptual dataflow visualization**, not a cycle-accurate SPI simulator. The byte label identifies the TX value being traced; it does not mean all eight bits appear on MOSI at once.

## Trace architecture

The Spec view uses three separate data layers, loaded by ordinary deferred `<script>` tags so `file://` works without a server:

- `data/geometry.js` contains only the image, reference viewBox, path points, node bounds, and viewport crops. Saved path and bound calibration overrides this layer, using the existing localStorage keys.
- `data/flow.js` names nodes and edges, gives their order and labels, and links them to geometry by ID. It contains no coordinates.
- `src/spiTxTrace.js` generates a four-event conceptual trace for the TX byte. Each event carries active edge and node IDs, the TX value, a note, and an `extras` object reserved for future detail.

`src/player.js` consumes a trace and reports the current event plus progress through it. `src/renderer.js` draws the image overlay and timeline from that event, geometry, and flow. The player and renderer have no SPI stage or path IDs. `app.js` connects controls, calibration storage, the Abstract View, and these layers. Open `tests/trace.test.html` directly in a browser to check trace IDs, values, order, and geometry references.

### How to fill `specRef`

In `data/flow.js`, replace the empty `specRef` fields only after checking the source specification: set `doc` to its title, `section` to the exact section, `page` to a positive page number, and `signals` to the documented register or signal names. The panel stays **Unverified** until every field is present. Current placeholders are deliberately blank.

## Add the original diagram

Save the original PNG from the hardware specification at:

```text
hardware-flow/assets/spi_block_diagram.png
```

The included original PNG is 1462 × 1272 pixels. The app reads its natural dimensions when it loads. The SVG image, paths, and marker share one `viewBox` based on those dimensions, so they scale together without distorting the image. If the PNG is absent, the page shows a missing-image message and hides the routes.

## Calibrate TX paths

The default route points in `geometry.paths` in `data/geometry.js` use a 1502 × 1283 reference coordinate system retained for saved calibration compatibility. They are calibrated against the included 1462 × 1272 PNG. The app scales those points to the loaded PNG's actual dimensions. The three routes follow the visible register-to-shifter bus, shifter `data out` line, and port-to-MOSI connection. If the PNG is replaced with a differently cropped export, fine-tune them in **Spec Overlay View → Edit Paths**.

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
