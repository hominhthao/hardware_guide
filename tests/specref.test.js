const result = document.getElementById('results');
const report = (label, pass) => { const p = document.createElement('p'); p.className = pass ? 'pass' : 'fail'; p.textContent = `${pass ? 'PASS' : 'FAIL'} — ${label}`; result.append(p); };
for (const [name, design, trace] of [
  ['SPI', HF.flow, HF.generateSpiTxTrace(0xA5)],
  ['RISC-V', HF.riscvDesign, HF.generateRiscvTrace(HF.riscvDesign, { x1: 5, x2: 7, pc: 0 })]
]) {
  const refs = design.specRef.refs;
  const ids = new Set(refs.map((ref) => ref.id));
  report(`${name}: unique refs and complete document`, ids.size === refs.length && !!design.specRef.doc.title && !!design.specRef.doc.rev);
  report(`${name}: every node and event ref resolves`, design.nodes.every((node) => (node.specRefIds ?? []).every((id) => ids.has(id))) && trace.events.every((event) => (event.sources ?? []).every((id) => ids.has(id))));
  report(`${name}: section, page, bilingual short note`, refs.every((ref) => !!ref.section && Number.isInteger(ref.page) && ref.page > 0 &&
    !!HF.messages.en[ref.note] && !!HF.messages.vi[ref.note] && HF.messages.en[ref.note].trim().split(/\s+/).length <= 24));
  const focus = new Set(trace.events.flatMap((event) => event.focusNodes ?? event.activeNodes ?? []));
  report(`${name}: every focused node sourced or explicitly unverified`, design.nodes.filter((node) => focus.has(node.id)).every((node) => node.specRefIds?.length || node.unverified === true));
  report(`${name}: every step sourced`, trace.events.every((event) => HF.resolveSources(design, event).verified));
}
report('flow without refs remains unverified', !HF.resolveSources({ specRef: { doc: { title: 'Example' }, refs: [] } }, { sources: [] }).verified);
