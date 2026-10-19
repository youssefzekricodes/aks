/** Google Analytics 4 (gtag.js) measurement ID. */
export const GA_MEASUREMENT_ID = "G-VKW0NDFH8R";

/**
 * Google's gtag snippet, loaded on the public site only: not on the admin, the
 * sign-in pages or local development, so staff visits don't skew the statistics.
 * Page changes inside the site are counted by GA4 itself (enhanced measurement,
 * "page changes based on browser history events", on by default).
 */
export const gtagSnippet = `(function () {
  if (/^(localhost|127\\.0\\.0\\.1|\\[::1\\])$/.test(location.hostname)) return;
  if (/^\\/(admin|auth|meta-callback)(\\/|$)/.test(location.pathname)) return;
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", "${GA_MEASUREMENT_ID}");
  var script = document.createElement("script");
  script.async = true;
  script.src = "https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}";
  document.head.appendChild(script);
})();`;
