# Specification status

## RESOLVED

- **I$ and LSU memory timing:** Model reads are asynchronous; writes need a clock edge (`rv-regmem`, `rv-special`). The ADD story remains dependency ordered, not a timing simulation.
- **x0:** Regfile reads from x0 return zero (`rv-regmem`). The current scenario writes x3.
- **Instruction valid:** `o_insn_vld` is mandatory and is 1 for a valid instruction (`rv-insnvld`); Figure 1 draws its output register (`rv-fig1`).
- **Memory map:** The 2 KiB region is `0x0000_0000`–`0x0000_07FF` (`rv-map`).

## PARTIAL

- **`alu_op`:** Four-bit width and the list of ALU operations are documented; numeric encodings are not (`rv-alu`). ADD remains a symbolic choice.
- **Control signals:** The datapath shows selections, but numeric encodings for `pc_sel`, `opa_sel`, `opb_sel`, and `wb_sel` are unspecified (`rv-fig1`).

## OPEN

- **`br_un`:** The name suggests unsigned, but its table says 1 means signed. Ask the course TA or author (`rv-brc`). ADD does not use this signal.
- **SPI Shift/Sample clocks:** Figure 1-1 draws both lines from the lower Phase + Polarity block. The text does not establish whether the upper, SCK-in slave block also feeds them (`spi-fig11`).
- **Image permission:** Confirm the course figure and vendor figure licences or obtain permission before public release.
- **Diagram labels:** `imm`, `rs1_addr`, `rs2_addr`, `rd_addr`, and `io_link` are HardwareFlow labels for unlabeled connections. Confirm the exact scope of the `instr` bus (`rv-fig1`).
- **Same-name stubs:** Disconnected drawn stubs with the same label are grouped into one logical net; review calibration against the original figure (`rv-fig1`).
