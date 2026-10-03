window.HF = window.HF || {};
HF.i18n = (() => {
  const storageKey = 'hardwareflow.language.v1';
  let language;
  try { language = localStorage.getItem(storageKey); } catch { /* Storage may be blocked on file URLs. */ }
  if (language !== 'vi' && language !== 'en') language = navigator.language?.toLowerCase().startsWith('vi') ? 'vi' : 'en';
  const listeners = new Set();
  function t(key, params = {}) {
    const template = HF.messages?.[language]?.[key] ?? HF.messages?.en?.[key] ?? key;
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name) => String(params[name] ?? `{${name}}`));
  }
  function setLanguage(next) {
    if (next !== 'vi' && next !== 'en' || next === language) return;
    language = next;
    try { localStorage.setItem(storageKey, language); } catch { /* Session choice still works. */ }
    listeners.forEach((listener) => listener(language));
  }
  return { t, setLanguage, getLanguage: () => language, subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); } };
})();
