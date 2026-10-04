window.HF = window.HF || {};
(() => {
  const el = (id) => document.getElementById(id);
  const t = (key, params) => HF.i18n.t(key, params);
  const active = () => activeDiagram === 'riscv' ? HF.riscvController : HF.spiController;
  const move = (selector, target) => { const node = document.querySelector(selector); if (node) el(target).append(node); };
  move('#spec-mode-switch', 'settings-developer');
  move('.diagram-tools > div', 'settings-view');
  el('spec-mode-switch').hidden = false;
  el('settings-view').firstElementChild.hidden = false;
  move('#riscv-flow-panel .story-options', 'settings-view');
  const pacingButtons = el('settings-view').querySelector('.story-options .segmented:last-child');
  el('settings-playback').append(pacingButtons);
  move('#riscv-flow-panel .trail-toggle', 'settings-view');
  move('#riscv-flow-panel .debug-toggle', 'settings-developer');
  move('#riscv-flow-panel .playback-options', 'settings-playback');
  move('.workspace-sidebar > .flow-panel .playback-options', 'settings-playback');
  const spiPacing = document.createElement('div'); spiPacing.className = 'segmented spi-pacing';
  for (const mode of ['guided', 'auto']) {
    const button = document.createElement('button'); button.type = 'button'; button.dataset.pacing = mode;
    button.classList.toggle('is-selected', mode === 'guided');
    button.addEventListener('click', () => {
      HF.spiController.player.setPacing(mode, mode === 'auto' ? 1800 : 0);
      spiPacing.querySelectorAll('button').forEach((item) => item.classList.toggle('is-selected', item.dataset.pacing === mode));
    });
    spiPacing.append(button);
  }
  el('settings-playback').prepend(spiPacing);
  el('settings-view').append(el('riscv-dim').parentElement, el('dim-toggle').parentElement);
  const settings = el('settings-drawer');
  document.body.append(settings);
  const setSettings = (open) => { settings.hidden = !open; el('settings-button').setAttribute('aria-expanded', String(open)); };
  el('settings-button').addEventListener('click', () => setSettings(settings.hidden));
  el('settings-close').addEventListener('click', () => setSettings(false));
  document.addEventListener('pointerdown', (event) => { if (!settings.hidden && !settings.contains(event.target) && !el('settings-button').contains(event.target)) setSettings(false); });
  el('language-toggle').addEventListener('click', () => HF.i18n.setLanguage(HF.i18n.getLanguage() === 'vi' ? 'en' : 'vi'));
  el('popup-toggle').addEventListener('change', () => active().player.refresh());
  const languageButtons = document.createElement('div'); languageButtons.className = 'language-choices';
  for (const code of ['vi', 'en']) { const button = document.createElement('button'); button.type = 'button'; button.textContent = code.toUpperCase(); button.dataset.language = code; button.addEventListener('click', () => HF.i18n.setLanguage(code)); languageButtons.append(button); }
  el('settings-language').append(languageButtons);
  const themeStylesheet = el('light-theme-stylesheet');
  const themeButtons = [...el('settings-theme').querySelectorAll('[data-theme-choice]')];
  const syncThemeButtons = () => themeButtons.forEach((button) => {
    const selected = button.dataset.themeChoice === document.documentElement.dataset.theme;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  themeButtons.forEach((button) => button.addEventListener('click', () => {
    const theme = button.dataset.themeChoice;
    document.documentElement.dataset.theme = theme;
    themeStylesheet.media = theme === 'light' ? 'all' : 'not all';
    try { localStorage.setItem('hardwareflow.theme.v1', theme); } catch { /* Keep the session choice. */ }
    syncThemeButtons();
  }));
  syncThemeButtons();
  const makeDetails = (panel, timeline, kind) => {
    const content = panel.querySelector('.workspace-side-content');
    const details = document.createElement('details'); details.className = 'all-steps'; details.innerHTML = `<summary></summary>`; details.append(timeline); content.append(details);
    const progress = document.createElement('div'); progress.className = 'compact-progress'; progress.innerHTML = `<strong class="progress-count"></strong><div class="progress-dots"></div>`;
    const current = document.createElement('strong'); current.className = 'compact-current';
    const controls = panel.querySelector('.step-controls'); controls.after(progress, current);
    panel.dataset.kind = kind;
    return { progress, current, details };
  };
  const riscvUi = makeDetails(el('riscv-flow-panel'), el('riscv-timeline'), 'riscv');
  const spiUi = makeDetails(document.querySelector('.workspace-sidebar > .flow-panel'), el('stage-timeline'), 'spi');
  const spiSpecChip = document.createElement('button'); spiSpecChip.type = 'button'; spiSpecChip.id = 'spi-spec-chip'; spiSpecChip.className = 'unverified';
  spiUi.current.after(spiSpecChip);
  const sourcePanel = document.createElement('section'); sourcePanel.id = 'source-panel'; sourcePanel.className = 'source-panel'; sourcePanel.hidden = true;
  const sourceHeading = document.createElement('strong');
  const sourceClose = document.createElement('button'); sourceClose.type = 'button'; sourceClose.textContent = '×';
  const sourceList = document.createElement('div'); sourceList.className = 'source-list';
  sourcePanel.append(sourceHeading, sourceClose, sourceList); document.body.append(sourcePanel);
  const sourceChips = { spi: spiSpecChip, riscv: el('riscv-spec-ref') };
  let shownSource = null;
  const closeSources = () => { sourcePanel.hidden = true; shownSource = null; };
  sourceClose.addEventListener('click', closeSources);
  const renderSources = (kind, event) => {
    const flow = kind === 'riscv' ? HF.riscvDesign : HF.flow;
    const source = HF.resolveSources(flow, event);
    const chip = sourceChips[kind];
    chip.textContent = source.verified ? t('ui.source', { name: HF.sourceShortName(source.doc) }) : t('ui.unverified');
    chip.classList.toggle('unverified', !source.verified);
    chip.title = source.verified ? source.doc.title : t('ui.unverifiedTip');
    const spiStatus = el('spec-ref-value');
    if (kind === 'spi') { spiStatus.textContent = chip.textContent; spiStatus.classList.toggle('unverified', !source.verified); }
    if (shownSource !== kind) return;
    sourceHeading.textContent = t('ui.sourceTitle');
    sourceClose.setAttribute('aria-label', t('ui.sourceClose'));
    sourceList.replaceChildren();
    if (!source.verified) { const line = document.createElement('p'); line.textContent = t('ui.unverified'); sourceList.append(line); return; }
    source.refs.forEach((ref) => {
      const row = document.createElement('p');
      const location = document.createElement('strong'); location.textContent = `${ref.section}, p.${ref.page}${ref.figure && ref.figure !== ref.section ? ` · ${ref.figure}` : ''}`;
      const note = document.createElement('span'); note.textContent = ` ${t(ref.note)}`;
      row.append(location, note); sourceList.append(row);
    });
  };
  for (const [kind, chip] of Object.entries(sourceChips)) {
    chip.setAttribute('role', 'button'); chip.tabIndex = 0;
    chip.addEventListener('click', () => { shownSource = shownSource === kind ? null : kind; sourcePanel.hidden = !shownSource; if (shownSource) { const state = (kind === 'riscv' ? HF.riscvController : HF.spiController).player.state; renderSources(kind, state.trace?.events[state.index] ?? null); } });
    chip.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); chip.click(); } });
  }
  const valuesDetails = document.createElement('details'); valuesDetails.className = 'edit-values'; valuesDetails.innerHTML = '<summary></summary>';
  valuesDetails.append(el('riscv-flow-panel').querySelector('.scenario-grid'), el('riscv-flow-panel').querySelector('.input-help'), el('instruction-label'));
  el('riscv-preset').after(valuesDetails);
  const spiValues = document.createElement('details'); spiValues.className = 'edit-values'; spiValues.innerHTML = '<summary></summary>';
  const spiInput = el('tx-input'); spiValues.append(spiInput, el('input-help'));
  document.querySelector('label[for="tx-input"]').after(spiValues);
  el('riscv-step').hidden = true; el('step-button').hidden = true;
  el('riscv-run').title = t('ui.shortcuts'); el('run-button').title = t('ui.shortcuts');
  const settingsOptions = () => {
    const riscv = activeDiagram === 'riscv';
    el('settings-drawer').classList.toggle('settings-riscv', riscv);
    el('settings-drawer').classList.toggle('settings-spi', !riscv);
  };
  const translateStatic = () => {
    document.documentElement.lang = HF.i18n.getLanguage();
    document.querySelectorAll('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
    el('language-toggle').textContent = HF.i18n.getLanguage() === 'vi' ? 'VI | EN' : 'EN | VI';
    document.querySelectorAll('[data-language]').forEach((button) => button.classList.toggle('is-selected', button.dataset.language === HF.i18n.getLanguage()));
    el('fit-button').textContent = t('ui.overview'); el('focus-button').textContent = t('ui.follow');
    el('view-flow-mode').textContent = t('ui.viewFlow'); el('edit-paths-mode').textContent = t('ui.editPaths');
    el('riscv-story').textContent = t('ui.story'); el('riscv-full').textContent = t('ui.full');
    el('riscv-guided').textContent = t('ui.guided'); el('riscv-auto').textContent = t('ui.auto');
    spiPacing.querySelectorAll('button').forEach((button) => { button.textContent = t(`ui.${button.dataset.pacing}`); });
    el('riscv-full-trail').parentElement.lastChild.textContent = ` ${t('ui.trail')}`;
    el('riscv-debug').parentElement.lastChild.textContent = ` ${t('ui.debug')}`;
    el('riscv-dim').parentElement.lastChild.textContent = ` ${t('ui.spotlight')}`;
    el('dim-toggle').parentElement.lastChild.textContent = ` ${t('ui.spotlight')}`;
    for (const id of ['riscv-speed','speed-select']) el(id).parentElement.firstChild.textContent = `${t('ui.speed')} `;
    document.querySelector('label[for="riscv-preset"]').textContent = t('ui.scenario');
    document.querySelector('label[for="tx-input"]').textContent = t('ui.txData');
    document.querySelectorAll('.edit-values summary').forEach((node) => node.textContent = t('ui.editValues'));
    document.querySelectorAll('.all-steps summary').forEach((node) => node.textContent = t('ui.allSteps'));
    el('riscv-flow-panel').querySelector('.state-heading .info-label').textContent = t('ui.state');
    sourceClose.setAttribute('aria-label', t('ui.sourceClose'));
    el('spi-fidelity-badge').textContent = t('ui.conceptual');
    el('spec-summary').textContent = t(activeDiagram === 'riscv' ? (document.getElementById('net-editor-panel').hidden ? 'ui.draftNets' : 'ui.adjustNets') : (document.getElementById('editor-panel').hidden ? 'ui.calibrated' : 'ui.adjustRoutes'));
    el('spi-diagram-button').textContent = t('ui.spiDiagram'); el('riscv-diagram-button').textContent = t('ui.riscvDiagram');
    el('riscv-flow-panel').querySelector('.eyebrow').textContent = t('ui.singleCycle');
    document.querySelector('.workspace-sidebar > .flow-panel .eyebrow').textContent = t('ui.transmit');
    el('input-help').textContent = t('ui.txHelp');
    valuesDetails.querySelector('.input-help').textContent = t('ui.u32Help');
    document.querySelectorAll('.flow-status .status-row .info-label').forEach((label) => {
      const key = ({ Status: 'ui.status', Step: 'ui.stepLabel', 'Current Stage': 'ui.currentStage', Data: 'ui.data', Binary: 'ui.binary', 'Spec ref': 'ui.specRef', Description: 'ui.description', Destination: 'ui.destination' })[label.dataset.original ?? label.textContent];
      if (!label.dataset.original) label.dataset.original = label.textContent;
      if (key) label.textContent = t(key);
    });
    el('keyboard-help').textContent = t('ui.shortcuts');
    el('riscv-run').title = t('ui.shortcuts'); el('run-button').title = t('ui.shortcuts');
    el('flow-popup-close').setAttribute('aria-label', t('ui.close'));
    el('settings-close').setAttribute('aria-label', t('ui.close'));
    el('missing-image').querySelector('strong').textContent = t('ui.missingImage');
    el('missing-image').querySelector('span').firstChild.textContent = `${t('ui.missingImageHelp')} `;
    if (!el('tx-error').hidden) el('tx-error').textContent = t('ui.invalidByte');
    if (!el('riscv-error').hidden) el('riscv-error').textContent = t('ui.invalidU32');
    el('riscv-previous').textContent = t('ui.back'); el('previous-button').textContent = t('ui.back');
    el('riscv-reset').textContent = t('ui.reset'); el('reset-button').textContent = t('ui.reset');
    el('riscv-flow-panel').querySelector('h2').textContent = t('ui.addTitle');
    document.querySelector('.workspace-sidebar > .flow-panel h2').textContent = t('ui.spiTitle');
    el('instruction-label').firstChild.textContent = `${t('ui.instruction', { value: '' }).trim()} `;
    const labelText = (selector, key) => {
      const node = document.querySelector(selector);
      const textNode = [...(node?.childNodes ?? [])].find((child) => child.nodeType === Node.TEXT_NODE);
      if (textNode) textNode.textContent = `${t(key)} `;
    };
    const textIds = {
      'net-delete-point': 'ui.deletePoint', 'net-add-segment': 'ui.addSegment', 'net-delete-segment': 'ui.deleteSegment',
      'net-save': 'ui.saveNet', 'net-reset': 'ui.resetCalibration', 'net-export': 'ui.exportJson',
      'undo-point-button': 'ui.undoPoint', 'clear-path-button': 'ui.clearPath', 'save-path-button': 'ui.savePath',
      'reset-calibration-button': 'ui.resetCalibration', 'export-calibration-button': 'ui.exportJson', 'save-bounds-button': 'ui.saveBounds'
    };
    Object.entries(textIds).forEach(([id, key]) => { el(id).textContent = t(key); });
    for (const [selector, key] of [
      ['#net-editor-panel .eyebrow', 'ui.calibrationNets'], ['#net-editor-panel h2', 'ui.editNets'],
      ['#net-editor-panel .editor-help', 'ui.netEditorHelp'], ['#editor-panel .eyebrow', 'ui.calibrationRoutes'],
      ['#editor-panel h2', 'ui.editTxPaths'], ['#editor-panel .editor-help', 'ui.pathEditorHelp'],
      ['#editor-panel .bounds-editor summary', 'ui.blockBounds']
    ]) document.querySelector(selector).textContent = t(key);
    for (const [selector, key] of [
      ['#net-editor-panel .path-picker:has(#net-select)', 'ui.net'], ['#net-editor-panel .path-picker:has(#segment-select)', 'ui.segment'],
      ['#net-editor-panel .import-calibration', 'ui.importJson'], ['#editor-panel .path-picker', 'ui.selectedPath'],
      ['#editor-panel .import-calibration', 'ui.importJson'], ['#editor-panel .bounds-editor label:has(#bounds-select)', 'ui.block'],
      ['.edit-values .scenario-grid label:has(#riscv-pc)', 'ui.initialPc']
    ]) labelText(selector, key);
    for (const [selector, key] of [
      ['#diagram-switch', 'ui.diagram'], ['#spec-mode-switch', 'ui.specMode'], ['#spec-view', 'ui.workspace'],
      ['.workspace-sidebar', 'ui.controls'], ['#riscv-timeline', 'ui.dependencyLevels'], ['#stage-timeline', 'ui.txStages'],
      ['#language-toggle', 'ui.languageToggle'], ['.story-options .segmented', 'ui.presentation'], ['#settings-theme', 'ui.theme']
    ]) document.querySelector(selector)?.setAttribute('aria-label', t(key));
    pacingButtons.setAttribute('aria-label', t('ui.pacing'));
    spiPacing.setAttribute('aria-label', t('ui.pacing'));
    settingsOptions();
  };
  function update(kind, event, meta) {
    const ui = kind === 'riscv' ? riscvUi : spiUi;
    const buttons = ui.progress.querySelector('.progress-dots');
    const events = meta.trace?.events ?? [];
    if (buttons.childElementCount !== events.length) {
      buttons.replaceChildren(); events.forEach((item, index) => {
        const dot = document.createElement('button'); dot.type = 'button'; dot.className = 'progress-dot'; dot.dataset.index = String(index);
        dot.addEventListener('click', () => active().player.seek(index)); buttons.append(dot);
      });
    }
    ui.progress.querySelector('.progress-count').textContent = t('ui.step', { n: event ? meta.index + 1 : 0, total: events.length });
    [...buttons.children].forEach((button, index) => { button.classList.toggle('is-current', !!event && index === meta.index); button.classList.toggle('is-passed', index < meta.index); button.disabled = meta.status === 'running'; button.title = t(events[index]?.captionKey ?? events[index]?.note ?? ''); });
    ui.current.textContent = event ? t(event.captionKey ?? event.note, event.popup?.params) : '';
    renderSources(kind, event);
    if (kind === 'spi') el('spi-preconditions').hidden = !!event;
  }
  HF.updateProgressUI = update;
  HF.translateUI = translateStatic;
  HF.i18n.subscribe(() => {
    translateStatic();
    HF.refreshSpiEditorStatus?.(); HF.riscvController.refreshEditorStatus?.();
    HF.spiController.renderer.renderTimeline((index) => HF.spiController.player.seek(index));
    HF.riscvController.renderer.renderTimeline((index) => HF.riscvController.player.seek(index), HF.riscvController.player.state.trace);
    HF.spiController.player.refresh(); HF.riscvController.player.refresh();
  });
  const onDiagram = () => { settingsOptions(); setSettings(false); closeSources(); };
  el('riscv-diagram-button').addEventListener('click', onDiagram);
  el('spi-diagram-button').addEventListener('click', onDiagram);
  translateStatic();
  HF.spiController.player.setPacing('guided');
  HF.spiController.player.refresh(); HF.riscvController.player.refresh();
})();
