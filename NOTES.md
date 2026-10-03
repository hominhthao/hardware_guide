# Open questions for the RISC-V diagram

These points need the original processor specification or implementation before the animation can claim cycle timing or additional instruction behavior.

1. **I$ clock triangle:** Is instruction read synchronous? The current ADD trace shows dependency order only; it makes no claim about when `instr` becomes available within a cycle.
2. **Control encodings:** The diagram does not give bit encodings for `pc_sel`, `opa_sel`, `opb_sel`, `wb_sel`, or `alu_op`. The trace uses symbolic choices only.
3. **Writes to x0:** The diagram does not state how a write with `rd = x0` is suppressed. This phase handles only `ADD x3, x1, x2`.
4. **LSU with `mem_wren = 0`:** The diagram does not establish whether a read occurs for a non-load instruction. The trace says only that no write occurs.
5. **Names supplied by HardwareFlow:** `imm`, `rs1_addr`, `rs2_addr`, `rd_addr`, and `io_link` are names for connections without matching net labels in the image; each has `labelSource: "ours"` in the design. The exact scope of the `instr` bus and its fields also needs confirmation.
6. **Image source and licence:** The repository contains Figure 1: Single Cycle Processor as `assets/risc_v_block_diagram.png`, copied to `assets/riscv-single-cycle.png` for the app. Its publication source and reuse licence have not been supplied.
7. **Other clock marks:** PC, I$, Regfile, LSU, and the two output registers show triangles. Their exact edge behavior is unverified; the trace applies state writes only to PC and x3 at the described clock edge.
8. **Unconnected same-name stubs:** Some source-image nets reappear by label without a drawn continuous line (for example `pc` near Mux A). The geometry keeps those stubs separate while the design groups them as one logical net. Calibration should be reviewed against the original figure.
