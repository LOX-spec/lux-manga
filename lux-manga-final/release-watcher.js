(() => {
  const current = '__LUX_BUILD_VERSION__';
  let pending = false, checking = false, reloading = false;
  function busy() {
    return !!document.querySelector('dialog[open],#sample-reader,.novel-admin') ||
      document.activeElement?.matches('input,textarea,[contenteditable="true"]') ||
      (typeof syncing !== 'undefined' && syncing.size > 0) ||
      (typeof siteAuditRunning !== 'undefined' && siteAuditRunning.size > 0) ||
      (typeof luxDownloads !== 'undefined' && luxDownloads.size > 0);
  }
  async function apply() {
    if (!pending || reloading || busy()) return;
    if (typeof save === 'function' && typeof db !== 'undefined' && db && !await save()) return;
    reloading = true;
    try {
      const registration = await navigator.serviceWorker?.getRegistration();
      await registration?.update();
      registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    } catch {}
    location.reload();
  }
  async function check() {
    if (checking || !navigator.onLine || document.hidden) return;
    checking = true;
    try {
      const response = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!response.ok) return;
      const data = await response.json();
      if (data.build && data.build !== current) pending = true;
      await apply();
    } catch {} finally { checking = false; }
  }
  setInterval(check, 30000);
  window.addEventListener('online', check);
  document.addEventListener('visibilitychange', check);
  document.addEventListener('focusout', () => { if (pending) void apply(); });
  navigator.serviceWorker?.addEventListener('controllerchange', () => { pending = true; void apply(); });
  void check();
})();
