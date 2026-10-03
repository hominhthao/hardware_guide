const results = document.getElementById('results');
const check = (name, pass) => { const p = document.createElement('p'); p.className = pass ? 'pass' : 'fail'; p.textContent = `${pass ? 'PASS' : 'FAIL'} — ${name}`; results.append(p); };
const viewport = { width: 800, height: 600 }, size = { width: 230, height: 150 };
const overlap = (a, b) => Math.max(0, Math.min(a.x + size.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + size.height, b.y + b.height) - Math.max(a.y, b.y));
const free = HF.placePopup({ x: 250, y: 300 }, [{ x: 100, y: 200, width: 150, height: 200 }], viewport, size);
check('chooses a free position', !free.fallback && !overlap(free, { x: 100, y: 200, w: 150, h: 200 }));
for (const anchor of [{ x: 10, y: 10 }, { x: 790, y: 590 }, { x: 400, y: 300 }]) {
  const p = HF.placePopup(anchor, [], viewport, size);
  check(`stays inside viewport at ${anchor.x},${anchor.y}`, p.x >= 0 && p.y >= 0 && p.x + size.width <= 800 && p.y + size.height <= 600);
}
const blocked = HF.placePopup({ x: 400, y: 300 }, [{ x: 0, y: 0, width: 800, height: 600 }], viewport, size);
check('uses corner fallback when all sides are blocked', blocked.fallback && blocked.x >= 0 && blocked.y >= 0 && blocked.x + size.width <= 800 && blocked.y + size.height <= 600);
check('word count and hold formula', HF.popupHoldMs({ titleKey: 'title', bodyKey: 'body' }, (key) => key === 'title' ? 'Four words in title' : 'Three words here') === 1500 + 350 * 7);
