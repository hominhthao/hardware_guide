## v0.3.7 — Phase V: Spec grounding and corrections

- Added saved Light/Dark theme choices in Settings; softened the dark palette and kept explanations readable in both themes.
- Switched the workspace to a light reading theme with darker description text, a wider font, and clearer source panels and popups; fixed narrow-screen stacking and popup title wrapping.
- Added document and section/page references for RISC-V and SPI nodes and trace steps, with bilingual notes and a clickable source panel.
- Corrected ADD control, I$ and LSU explanations, and clock-edge output-register display.
- Added SPI master-mode preconditions and SPTEF write protocol explanations.
- Added local PDF ignore rules, specification status notes, and reference tests.

# Changelog

## v0.3.6 — Phase A.3 explanations and readability

- Added geometry-anchored explanatory popups for all ten ADD and four conceptual SPI steps, with close and Pop-ups setting, collision-aware placement, and reading-based Auto holds.
- Added Vietnamese and English dictionaries, saved language selection, trace text keys, and immediate retranslation without restarting playback.
- Strengthened active net contrast with screen-constant casing/core strokes, directional dashes, an 8 px pulse head and a soft-cutout Spotlight; expanded camera padding and reserved popup room.
- Reduced the default panel to scenario, playback, progress, state and collapsed steps; moved playback, view and developer controls into Settings.
- Added browser-openable popup and i18n tests and updated camera tests.

## v0.3.5 — Phase A.2 choreography and camera

- Archived the former Abstract view in `legacy/` because it used unverified blocks not present in the spec diagram; the app now opens directly on the original SPI diagram.
- Added source → wire → arrival choreography to both diagrams, with directed net draw-on and source name chips.
- Added a shared viewBox camera with Follow, Overview, manual wheel and drag controls, and pure camera bounds tests.
- Split the operand-select and operand-transfer story into separate steps, bringing ADD to ten steps; enlarged captions, chips, pills, and timeline text.

## v0.3.4 — Phase A.1 story mode

- Split the ADD walkthrough into nine paced presentation steps while preserving the dependency levels and clock-edge writes.
- Added generic focus rendering, Story/Full views, recent-step trail, guided and auto pacing, a fixed caption and control strip, and value-pill collision avoidance.
- Kept the net topology, saved calibration, SPI playback, and local-file loading unchanged.

## v0.3.3 — Phase A net graph and RISC-V ADD

- Added a second diagram using the supplied RISC-V single-cycle processor image at its measured 2792 × 1278 pixel size.
- Added separate net geometry, design topology, ADD scenario trace, and seven dependency levels with multi-sink pulses, mux selections, unused results, captions, and clock-edge state writes.
- Extended the generic renderer to draw net graphs while preserving SPI's conceptual playback and existing calibration.
- Added RISC-V net debugging, path calibration, browser storage, JSON transfer, four-scenario browser tests, and open hardware questions in `NOTES.md`.

## v0.3.2 — Phase 0 trace refactor

- Separated calibrated image geometry from semantic flow data.
- Added a four-event conceptual trace generator, SPI-agnostic trace player, and trace-driven renderer while preserving the v0.3.1 screen and controls.
- Added browser-openable trace contract checks and empty spec reference placeholders.
- Preserved existing path and bounds calibration keys and JSON import/export.

## v0.3.1 — Phase 1.5

- Consolidated Spec view controls into a 52px topbar and removed the diagram card header.
- Added shared viewBox Fit and Focus flow views, background dimming, path states, a larger value marker, block outlines, and a four-stage timeline.
- Added pause/resume, replay, playback speeds, shortcuts, stage seeking, and calibration editing for block bounds with JSON export/import.
- Preserved the original path calibration key and Abstract View.
