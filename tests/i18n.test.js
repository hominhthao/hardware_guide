const results = document.getElementById('results');
const check = (name, pass) => { const p = document.createElement('p'); p.className = pass ? 'pass' : 'fail'; p.textContent = `${pass ? 'PASS' : 'FAIL'} — ${name}`; results.append(p); };
const add = HF.generateRiscvTrace(HF.riscvDesign, { x1: 5, x2: 7, pc: 0 });
const spi = HF.generateSpiTxTrace(0xA5);
const keys = new Set(['ui.dependency', 'ui.conceptual', 'ui.unverified', 'ui.parallel', 'ui.unused', 'ui.settings', 'ui.run', 'ui.pause', 'ui.next', 'ui.back', 'ui.reset', 'ui.overview', 'ui.follow', 'ui.scenario', 'ui.editValues', 'ui.state', 'ui.developer', 'ui.debug', 'ui.editPaths', 'ui.popups', 'ui.spotlight', 'ui.allSteps', 'ui.step']);
for (const key of [...Object.keys(HF.messages.en), ...Object.keys(HF.messages.vi)]) keys.add(key);
for (const event of [...add.events, ...spi.events]) {
  for (const key of [event.captionKey, event.detailKey, event.popup?.titleKey, event.popup?.bodyKey, event.popup?.whyKey]) if (key) keys.add(key);
}
for (const design of [HF.flow, HF.riscvDesign]) for (const item of [...design.nodes, ...(design.nets ?? [])]) if (item.labelKey) keys.add(item.labelKey);
for (const key of keys) {
  check(`${key} exists in both languages`, typeof HF.messages.en[key] === 'string' && typeof HF.messages.vi[key] === 'string');
  const placeholders = (lang) => [...new Set([...HF.messages[lang][key].matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]))].sort().join(',');
  check(`${key} placeholders match`, placeholders('en') === placeholders('vi'));
}
const source = `${HF.generateRiscvTrace.toString()}\n${HF.generateSpiTxTrace.toString()}`;
check('trace generators contain no literal English sentences', !/"[A-Za-z][^"\n]{30,}[.!?]"/.test(source));
const before = HF.i18n.getLanguage(); HF.i18n.setLanguage('vi');
check('Vietnamese substitution', HF.i18n.t('add.3.body', { x1: '0x5', x2: '0x7' }).includes('0x5') && HF.i18n.t('add.3.body', { x1: '0x5', x2: '0x7' }).includes('0x7'));
HF.i18n.setLanguage(before);
