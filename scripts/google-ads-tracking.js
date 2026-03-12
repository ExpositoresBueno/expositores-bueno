(() => {
  const GOOGLE_ADS_ID = 'AW-SEU_ID';
  const GOOGLE_ADS_LABEL = 'SEU_LABEL';
  const DEDUPE_WINDOW_MS = 800;

  const isWhatsAppUrl = (rawUrl) => {
    if (!rawUrl) return false;

    try {
      const parsed = new URL(rawUrl, window.location.origin);
      const host = parsed.hostname.replace(/^www\./, '');
      return host === 'wa.me' || host === 'api.whatsapp.com';
    } catch {
      return false;
    }
  };

  const shouldTrackNow = (urlKey) => {
    const now = Date.now();
    const last = window.__googleAdsWhatsAppLastEvent || { time: 0, key: '' };
    if (last.key === urlKey && now - last.time < DEDUPE_WINDOW_MS) return false;

    window.__googleAdsWhatsAppLastEvent = { time: now, key: urlKey };
    return true;
  };

  const sendConversion = (urlKey) => {
    if (!shouldTrackNow(urlKey)) return;
    if (typeof window.gtag !== 'function') return;

    window.gtag('event', 'conversion', {
      send_to: `${GOOGLE_ADS_ID}/${GOOGLE_ADS_LABEL}`,
    });
  };

  const handleDocumentClick = (event) => {
    const anchor = event.target.closest('a[href]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!isWhatsAppUrl(href)) return;

    sendConversion(`click:${href}`);
  };

  const bindWindowOpenTracking = () => {
    if (window.__googleAdsWindowOpenPatched) return;

    const nativeOpen = window.open;
    window.open = function patchedOpen(url, ...rest) {
      if (isWhatsAppUrl(url)) {
        sendConversion(`open:${String(url)}`);
      }
      return nativeOpen.call(this, url, ...rest);
    };

    window.__googleAdsWindowOpenPatched = true;
  };

  if (!window.__googleAdsWhatsAppTrackingBound) {
    document.addEventListener('click', handleDocumentClick, true);
    bindWindowOpenTracking();
    window.__googleAdsWhatsAppTrackingBound = true;
  }
})();
