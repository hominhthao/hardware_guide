# Changelog

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
