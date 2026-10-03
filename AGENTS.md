# HardwareFlow – Plan cho Codex

> Cách dùng: đặt file này ở root repo (hoặc tách phần 1 thành `AGENTS.md`). Mỗi lần chỉ đưa cho Codex **một phase**, dùng prompt có sẵn ở cuối mỗi phase. Chỉ sang phase sau khi phase trước pass hết Acceptance Criteria.

---

## 1. Context & Luật bắt buộc (dán vào AGENTS.md)

**HardwareFlow** là interactive hardware spec & dataflow visualizer: dùng ảnh block diagram gốc trong spec làm nền, phủ lớp SVG overlay để cho thấy data di chuyển qua block/signal nào, theo thứ tự nào.

**Stack:** HTML + CSS + Vanilla JS (ES modules) + SVG. Không React, backend, database, build step, HDL parser, OCR, AI. Chạy local bằng `index.html` (nếu ES modules bị chặn bởi `file://` thì dùng `python -m http.server`, ghi rõ trong README).

**Thứ tự ưu tiên:** Hardware correctness > Dataflow correctness > Visualization clarity > Interaction > UI aesthetics.

**Luật cứng:**
1. Không redraw diagram nếu đã có ảnh gốc; luôn overlay lên ảnh.
2. Tách 3 tầng dữ liệu: **geometry** (path nằm đâu trên ảnh), **flow** (node/edge/signal/thứ tự), **trace** (sự kiện theo thời gian). Animation chỉ là **renderer của trace**, không chứa logic phần cứng.
3. SVG overlay dùng cùng `viewBox` với kích thước tự nhiên của ảnh (để zoom/pan không lệch).
4. Mọi thứ "conceptual" phải được gắn nhãn rõ trên UI. Không mô tả 0xA5 như thể cả byte đi ra MOSI cùng lúc.
5. Mỗi flow phải có `specRef` (tài liệu, section, trang, tên register/signal). Thiếu thì hiện cảnh báo "unverified".
6. Mọi `localStorage` phải bọc try/catch và có export/import JSON.
7. Không đổi hành vi/phạm vi ngoài phase đang làm. Không thêm dependency.
8. Sau mỗi thay đổi: chạy được bằng `index.html`, không lỗi console, cập nhật README + CHANGELOG.

**UI:** kiểu EDA/debug tool, gần như một viewport duy nhất. Diagram 70–80%, control/status 20–30%, không scroll giữa control và diagram.

---

## 2. Kiến trúc mục tiêu

```text
hardwareflow/
├─ index.html
├─ README.md / CHANGELOG.md / AGENTS.md
├─ assets/
│   └─ spi-block-diagram.png
├─ data/
│   ├─ diagrams/spi.geometry.json     # tầng 1
│   ├─ flows/spi-tx.flow.json         # tầng 2
│   └─ traces/                        # tầng 3 (sinh ra hoặc import)
├─ src/
│   ├─ main.js                # khởi động, nối module
│   ├─ state.js               # state tập trung + subscribe
│   ├─ model/
│   │   ├─ geometry.js        # load/validate/merge calibration
│   │   ├─ flow.js            # load/validate flow
│   │   └─ trace.js           # kiểu Trace, player (play/pause/step/seek)
│   ├─ generators/
│   │   └─ spiTx.js           # sinh trace SPI từ (data, mode, bitOrder)
│   ├─ render/
│   │   ├─ overlay.js         # vẽ path, trạng thái, marker từ trace
│   │   └─ viewport.js        # zoom/pan
│   ├─ editor/pathEditor.js   # Edit Paths mode
│   ├─ ui/controls.js, ui/status.js, ui/waveform.js
│   └─ io/storage.js          # localStorage + export/import JSON
└─ styles/main.css
```

### Schema (v1)

**geometry** – chỉ hình học:
```json
{
  "diagramId": "spi",
  "image": "assets/spi-block-diagram.png",
  "viewBox": [0, 0, 1200, 800],
  "paths": {
    "reg_to_shifter": { "points": [[410,300],[410,380]], "kind": "polyline" },
    "shifter_to_port": { "points": [[410,420],[410,500]] },
    "port_to_mosi":    { "points": [[410,540],[700,540]] }
  },
  "nodes": { "dataReg": {"bbox":[360,260,460,300]}, "shifter": {}, "portCtl": {}, "mosi": {} }
}
```

**flow** – ý nghĩa, tham chiếu geometry bằng id:
```json
{
  "flowId": "spi-tx",
  "diagramId": "spi",
  "fidelity": "conceptual",
  "specRef": { "doc": "<tên spec>", "section": "<x.y>", "page": 0, "signals": ["SPIDR","MOSI"] },
  "edges": [
    { "id": "e1", "from": "dataReg",  "to": "shifter", "pathId": "reg_to_shifter", "signal": "SPIDR->shift_in" },
    { "id": "e2", "from": "shifter",  "to": "portCtl", "pathId": "shifter_to_port", "signal": "shift_out" },
    { "id": "e3", "from": "portCtl",  "to": "mosi",    "pathId": "port_to_mosi",    "signal": "MOSI" }
  ],
  "order": ["e1", "e2", "e3"]
}
```

**trace** – sự kiện theo thời gian (nguồn duy nhất cho animation):
```json
{
  "flowId": "spi-tx",
  "fidelity": "conceptual",
  "timeUnit": "step",
  "events": [
    { "t": 0, "activeEdges": ["e1"], "values": { "SPIDR": "0xA5" }, "note": "Load TX data" },
    { "t": 1, "activeEdges": ["e2"], "values": { "shifter": "10100101" } },
    { "t": 2, "activeEdges": ["e3"], "values": { "MOSI": "—" } }
  ]
}
```
Từ v0.4 `fidelity` = `"bit-level"`, v0.5 = `"cycle-approx"`/`"cycle-accurate"` tùy mức kiểm chứng; thêm `signals: { SCLK: [...], MOSI: [...] }`.

---

## 3. Các phase

### Phase 0 – Refactor nền (không đổi hành vi)
**Mục tiêu:** tách code hiện tại thành 3 tầng + trace player, giữ nguyên giao diện/hành vi.

**Tasks**
- Tách geometry ra JSON; flow ra JSON; viết `trace.js` (player: `play/pause/step/reset/seek`, phát event theo `t`).
- `overlay.js` chỉ nhận `(geometry, flow, currentEvent)` và render; không biết gì về SPI.
- Calibration người dùng (localStorage) merge đè lên default geometry như cũ.
- Sinh trace SPI TX conceptual từ `generators/spiTx.js` (3 event như schema trên).

**Acceptance**
- Hành vi giống bản cũ: inactive / completed / active, một red marker chạy dọc path.
- Không còn tọa độ hardcode trong logic animation.
- Đổi tên path trong flow mà không đụng code render vẫn chạy.
- Edit Paths mode còn hoạt động và lưu đúng vào geometry layer.

**Prompt cho Codex**
```text
Đọc AGENTS.md và HARDWAREFLOW_PLAN.md (mục 1, 2, Phase 0). Thực hiện Phase 0: refactor project hiện tại thành 3 tầng geometry/flow/trace và một trace player, KHÔNG đổi hành vi hay giao diện. Animation phải được render hoàn toàn từ trace. Giữ nguyên Edit Paths mode và localStorage calibration. Cuối cùng liệt kê file đã đổi và cách tôi kiểm tra từng Acceptance criterion. Không làm gì ngoài Phase 0.
```

---

### Phase 1 – v0.3: TX input + Run + compact workspace
**Tasks**
- Layout một viewport: header mỏng; diagram 70–80% bên trái; panel phải (TX Data, Run, Step, Reset, Speed, Status).
- Input TX Data nhận hex `0x00–0xFF` (có validation, hiện binary `10100101` bên dưới).
- `Run` chạy liên tục toàn bộ flow bằng **một** red marker; path hiện tại sáng mạnh, path đã qua highlight nhẹ, path chưa tới inactive. `Step` chạy từng event; `Reset` về đầu.
- Badge cố định trên UI: **"CONCEPTUAL – not cycle-accurate"**; tooltip giải thích byte chưa được truyền một phát qua MOSI.
- Status hiển thị: event hiện tại, edge active, `note`, `specRef`.
- Responsive: ≥1280×720 vẫn không scroll.

**Acceptance**
- Nhập `0xA5` → Run → marker đi Data Reg → Shifter → Port Control → MOSI mà không cần bấm Step.
- Giá trị sai (`0x1FF`, `zz`) bị chặn, báo lỗi rõ.
- Không cần scroll để thấy cả control và diagram ở 1280×720.
- Badge "conceptual" luôn hiển thị.

**Prompt**
```text
Thực hiện Phase 1 trong HARDWAREFLOW_PLAN.md (v0.3). Dựa trên kiến trúc đã refactor ở Phase 0: làm layout EDA một viewport (diagram 70–80%, panel phải), nhập TX Data hex 8-bit có validation, Run chạy liên tục một red marker qua toàn bộ flow, Step/Reset, badge "CONCEPTUAL" cố định. Không thêm bit-level hay SCLK. Báo cáo theo từng Acceptance criterion.
```

---

### Phase 2 – v0.3.5: Export/Import, zoom/pan, spec reference
**Tasks**
- Export/Import JSON cho geometry (calibration) và flow; import có validate schema, báo lỗi dễ hiểu.
- Zoom (wheel) + pan (kéo) trên viewport; ảnh và overlay dùng chung transform, path không lệch.
- Panel "Spec Reference" hiện `specRef` của flow; flow thiếu `specRef` hiện cảnh báo "unverified".
- Nút "Reset calibration to default".

**Acceptance**
- Export rồi import lại ra đúng y hệt; file hỏng không làm crash app.
- Zoom/pan ở mọi mức không làm lệch path so với ảnh; Edit Paths vẫn click đúng điểm khi đã zoom.
- Cảnh báo "unverified" xuất hiện khi xóa `specRef`.

**Prompt**
```text
Thực hiện Phase 2 trong HARDWAREFLOW_PLAN.md. Thêm export/import JSON có validate, zoom/pan dùng chung một transform cho ảnh và SVG overlay (Edit Paths phải click đúng toạ độ khi đã zoom), và panel Spec Reference với cảnh báo unverified. Đừng đổi schema trace.
```

---

### Phase 3 – v0.4: Bit-level SPI
**Mục tiêu:** từng bit của TX byte được shift ra MOSI, chạy trên trace (đây là phase kiểm chứng engine).

**Tasks**
- Generator tạo trace 8 bước bit; mặc định **MSB first**, nhưng `bitOrder` là tham số (`msb`/`lsb`) vì phụ thuộc cấu hình/spec; ghi rõ trong `specRef` phần xác nhận.
- Ví dụ `0xA5 = 10100101` (MSB first): MOSI = 1,0,1,0,0,1,0,1.
- UI: hiển thị shift register từng bit (ô bit, bit đang ra được highlight, bit đã ra mờ đi), cùng một waveform nhỏ cho MOSI.
- Marker đi qua Shifter → Port → MOSI cho **từng bit**; có tốc độ điều chỉnh.
- `fidelity` đổi thành `bit-level`; badge đổi từ "conceptual" sang "bit-level (no clock timing)".

**Acceptance**
- Với `0xA5`, chuỗi MOSI đúng 1,0,1,0,0,1,0,1; đổi `lsb` thì ra 1,0,1,0,0,1,0,1 đảo thứ tự tương ứng (kiểm tra thêm với `0x01`, `0x80`, `0xFF`, `0x00`).
- Có unit-test thủ công/đơn giản (file `tests/spiTx.test.html` hoặc script) kiểm tra generator.
- Không có logic SPI trong renderer.

**Prompt**
```text
Thực hiện Phase 3 trong HARDWAREFLOW_PLAN.md (v0.4 bit-level). Chỉ sửa generators/spiTx.js (sinh trace bit-level, bitOrder là tham số) và thêm UI shift register + waveform MOSI. Renderer overlay không được chứa logic SPI. Thêm trang test cho generator với các giá trị 0xA5, 0x01, 0x80, 0xFF, 0x00 ở cả msb và lsb. Báo kết quả test.
```

---

### Phase 4 – v0.5: SCLK + CPOL/CPHA
**Tasks**
- Generator nhận `cpol`, `cpha` (4 mode). Trace thêm tín hiệu `SCLK`, `CS`, `MOSI` theo bước thời gian (nửa chu kỳ).
- Quy tắc cần đúng: CPHA=0 → dữ liệu được sample ở **cạnh đầu** của SCLK và bit đầu phải sẵn sàng trước cạnh đó; CPHA=1 → shift ở cạnh đầu, sample ở cạnh sau. CPOL quyết định mức idle của SCLK (cạnh đầu là lên hay xuống).
- Waveform hiển thị SCLK/CS/MOSI, đánh dấu cạnh **shift** và cạnh **sample** bằng ký hiệu khác nhau; có dropdown chọn mode 0–3.
- Cursor trên waveform đồng bộ với marker trên diagram.

**Acceptance**
- Cả 4 mode cho ra mức idle và cạnh sample/shift đúng theo bảng:

| Mode | CPOL | CPHA | SCLK idle | Sample edge | Shift edge |
|------|------|------|-----------|-------------|------------|
| 0 | 0 | 0 | Low  | Rising  | Falling |
| 1 | 0 | 1 | Low  | Falling | Rising  |
| 2 | 1 | 0 | High | Falling | Rising  |
| 3 | 1 | 1 | High | Rising  | Falling |

- Giá trị MOSI tại mỗi cạnh sample khớp đúng chuỗi bit của byte.
- Test generator cho cả 4 mode.

**Prompt**
```text
Thực hiện Phase 4 trong HARDWAREFLOW_PLAN.md (v0.5). Mở rộng generator và trace với SCLK, CS, MOSI và 4 mode CPOL/CPHA theo đúng bảng trong plan. Thêm waveform có đánh dấu cạnh shift/sample, dropdown chọn mode, đồng bộ cursor với marker. Thêm test cho 4 mode. Nếu có chỗ nào mơ hồ về hardware thì ghi vào NOTES.md thay vì tự đoán.
```

---

### Phase 5 – v0.6: RX/MISO + master/slave
**Tasks**
- Thêm flow `spi-rx` (MISO → shifter → data register), trace RX; chọn vai trò master/slave.
- Full-duplex: TX và RX chạy đồng thời trên cùng SCLK; hiển thị hai shift register.
- Hardware correctness: ở master, SCLK là output; ở slave, SCLK là input. Khác biệt này phải thể hiện trong flow/trace.
- Cần thêm path mới trong geometry cho MISO (calibrate bằng Edit Paths).

**Acceptance**
- Nhập TX `0xA5` và RX giả lập `0x3C`: sau 8 clock, data register nhận `0x3C`.
- Đổi master/slave thay đổi hướng SCLK/CS đúng.

**Prompt**
```text
Thực hiện Phase 5 trong HARDWAREFLOW_PLAN.md (v0.6). Thêm flow RX/MISO, full-duplex, vai trò master/slave, theo đúng schema 3 tầng hiện có. Không viết lại renderer. Liệt kê những path geometry mới tôi cần calibrate bằng Edit Paths.
```

---

### Phase 6 – v0.7: Import VCD điều khiển overlay
**Tasks**
- Parser VCD tối giản (`$scope`, `$var`, `$timescale`, `#time`, giá trị 0/1/x/z, vector).
- Mapping JSON: `signal VCD ↔ edge/field trên diagram` (ví dụ `tb.dut.mosi` → edge `e3`; `tb.dut.sclk` → waveform SCLK).
- Chuyển VCD + mapping thành **trace chuẩn** → dùng lại player và renderer hiện có; `fidelity = "simulation"`, badge "FROM VCD".
- UI chọn file VCD, chọn/ chỉnh mapping, báo signal không tìm thấy.

**Acceptance**
- Một file VCD mẫu SPI (đính kèm trong `data/samples/`) chạy ra cùng chuỗi bit với generator.
- Signal thiếu/map sai báo lỗi rõ, không crash.
- Không đổi code renderer (chỉ thêm nguồn trace mới).

**Prompt**
```text
Thực hiện Phase 6 trong HARDWAREFLOW_PLAN.md (v0.7). Viết parser VCD tối giản + mapping JSON chuyển VCD thành trace chuẩn để dùng lại player/renderer hiện có. Thêm một VCD mẫu SPI và test so khớp với generator. Không sửa renderer.
```

---

## 4. Sau này (chưa làm)
Upload diagram của người dùng, nhiều flow trên một diagram, hierarchy SoC → IP → module, protocol preset (APB, AHB, AXI, I2C, UART, DMA), HDL-assisted extraction.

## 5. Quy trình làm việc với Codex (gợi ý)
1. Mỗi phase = một branch/commit riêng; yêu cầu Codex tạo commit sau khi pass.
2. Luôn kết thúc prompt bằng: *"Báo cáo theo từng Acceptance criterion, nêu rõ chỗ nào chưa chắc chắn về hardware."*
3. Nếu Codex đề xuất thêm framework/dependency → từ chối, nhắc lại luật số 7.
4. Với các điểm hardware mơ hồ (bit order, timing, mode), tự đối chiếu lại spec rồi ghi vào `NOTES.md`; đừng để Codex tự suy đoán.
5. Test thủ công nhanh cho mỗi phase: mở `index.html`, console không lỗi, thử `0xA5`, `0x00`, `0xFF`, reload trang để kiểm tra calibration còn đúng.