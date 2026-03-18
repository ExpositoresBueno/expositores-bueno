document.addEventListener("click", function (e) {
  const link = e.target.closest("a[href]");
  if (!link) return;

  const url = link.href;

  if (url.includes("wa.me") || url.includes("api.whatsapp.com")) {
    const now = Date.now();
    const lastEventAt = window.__googleAdsConversionLastEventAt || 0;

    if (now - lastEventAt < 1200) return;
    window.__googleAdsConversionLastEventAt = now;

    if (typeof gtag === "function") {
      gtag("event", "conversion", {
        send_to: "AW-327475264/CONVERSAO_WHATSAPP",
      });
    }
  }
});
