window.HF = window.HF || {};
HF.placePopup = function placePopup(anchorPoint, avoidRects, viewport, popupSize) {
  const pad = 12, gap = 18;
  const w = popupSize.width, h = popupSize.height;
  const bounds = { x: viewport.x ?? 0, y: viewport.y ?? 0, width: viewport.width, height: viewport.height };
  const right = bounds.x + bounds.width, bottom = bounds.y + bounds.height;
  const overlap = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) *
    Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const candidates = [
    { side: 'right', x: anchorPoint.x + gap, y: anchorPoint.y - h / 2 },
    { side: 'left', x: anchorPoint.x - w - gap, y: anchorPoint.y - h / 2 },
    { side: 'above', x: anchorPoint.x - w / 2, y: anchorPoint.y - h - gap },
    { side: 'below', x: anchorPoint.x - w / 2, y: anchorPoint.y + gap }
  ];
  const scored = candidates.map((item) => {
    const rect = { x: item.x, y: item.y, width: w, height: h };
    const overflow = Math.max(0, bounds.x + pad - rect.x) * h + Math.max(0, rect.x + w - right + pad) * h +
      Math.max(0, bounds.y + pad - rect.y) * w + Math.max(0, rect.y + h - bottom + pad) * w;
    return { ...item, score: overflow * 10 + avoidRects.reduce((sum, other) => sum + overlap(rect, other) * (other.weight ?? 1), 0), overflow };
  }).sort((a, b) => a.score - b.score);
  if (scored[0].score < 1) return { x: scored[0].x, y: scored[0].y, side: scored[0].side, fallback: false };
  const corners = [
    { x: bounds.x + pad, y: bounds.y + pad }, { x: right - w - pad, y: bounds.y + pad },
    { x: bounds.x + pad, y: bottom - h - pad }, { x: right - w - pad, y: bottom - h - pad }
  ].map((item) => ({ ...item, score: avoidRects.reduce((sum, other) => sum + overlap({ ...item, width: w, height: h }, other) * (other.weight ?? 1), 0) }));
  corners.sort((a, b) => a.score - b.score);
  const best = corners[0];
  return { x: Math.max(bounds.x + pad, Math.min(right - w - pad, best.x)), y: Math.max(bounds.y + pad, Math.min(bottom - h - pad, best.y)), side: 'corner', fallback: true };
};
HF.popupWordCount = function popupWordCount(popup, t) {
  if (!popup) return 0;
  return [popup.titleKey, popup.bodyKey, popup.whyKey].filter(Boolean).map((key) => t(key, popup.params ?? {})).join(' ').trim().split(/\s+/u).filter(Boolean).length;
};
HF.popupHoldMs = function popupHoldMs(popup, t) {
  return popup ? Math.max(1800, 1500 + 350 * HF.popupWordCount(popup, t)) : 1800;
};
