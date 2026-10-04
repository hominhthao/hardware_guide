window.HF = window.HF || {};
HF.resolveSources = function resolveSources(flow, event) {
  const ids = event?.sources ?? [];
  const refs = ids.map((id) => flow.specRef?.refs?.find((ref) => ref.id === id)).filter(Boolean);
  return { doc: flow.specRef?.doc, refs, verified: ids.length > 0 && refs.length === ids.length };
};
HF.sourceShortName = function sourceShortName(doc) {
  return doc?.docId || doc?.title?.split(/\s[-–]\s/)[0] || "";
};
