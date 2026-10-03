window.HF = window.HF || {};
HF.createTracePlayer = function createTracePlayer({ onChange, durationForEvent }) {
  let trace = null;
  let index = -1;
  let progress = 0;
  let status = "ready";
  let speed = 1;
  let frameId = null;
  let lastTime = null;
  let manualSeek = false;
  const emit = () => onChange(trace?.events[index] ?? null, progress, { status, index, trace, speed, manualSeek });
  const stopFrame = () => { if (frameId !== null) cancelAnimationFrame(frameId); frameId = null; lastTime = null; };
  function tick(now) {
    if (status !== "running" || !trace) return;
    if (lastTime !== null) {
      const duration = durationForEvent(trace.events[index], index);
      progress += Math.min(50, now - lastTime) * speed / duration;
      if (progress >= 1) {
        progress = 1;
        if (index === trace.events.length - 2) {
          index = trace.events.length - 1;
          status = "done";
          stopFrame(); emit(); return;
        }
        index += 1;
        progress = 0;
      }
      emit();
    }
    lastTime = now;
    frameId = requestAnimationFrame(tick);
  }
  return {
    get state() { return { trace, index, progress, status, speed }; },
    load(nextTrace) { stopFrame(); trace = nextTrace; index = -1; progress = 0; status = "ready"; manualSeek = false; emit(); },
    play() {
      if (!trace || !trace.events.length) return;
      if (status === "running") return;
      if (status === "ready" || status === "done") { index = 0; progress = 0; }
      status = "running"; manualSeek = false; lastTime = null; emit(); frameId = requestAnimationFrame(tick);
    },
    pause() { if (status !== "running") return; stopFrame(); status = "paused"; emit(); },
    step() { if (!trace || status === "running") return; this.seek(Math.min(trace.events.length - 1, index + 1)); },
    previous() { if (!trace || status === "running") return; this.seek(index <= 0 ? -1 : index - 1); },
    reset() { stopFrame(); index = -1; progress = 0; status = "ready"; manualSeek = false; emit(); },
    replay() { if (!trace) return; this.reset(); this.play(); },
    seek(nextIndex) {
      if (!trace || status === "running") return;
      stopFrame(); index = Math.max(-1, Math.min(nextIndex, trace.events.length - 1));
      progress = index === trace.events.length - 1 ? 1 : 0;
      status = index < 0 ? "ready" : index === trace.events.length - 1 ? "done" : "paused";
      manualSeek = true;
      emit();
    },
    setSpeed(value) { if (Number.isFinite(value) && value > 0) speed = value; emit(); },
    refresh() { emit(); }
  };
};
