/* CyFocus — runs in <head> before first paint: upgrades to HTTPS, drops /index.html from the
   address bar, refuses to be framed by other
   sites, marks JS as available, applies the saved theme (no flash of the wrong theme) and skips the
   preloader after the first visit. Kept external so the site can use a strict Content-Security-Policy
   with no inline scripts. */
(function (w, d) {
  /* GitHub Pages can't send HSTS, so make sure visitors who arrive over plain HTTP end up on HTTPS. */
  if (w.location.protocol === 'http:' && /(^|\.)cyfocus\.in$/.test(w.location.hostname)) {
    w.location.replace('https://cyfocus.in' + w.location.pathname + w.location.search + w.location.hash);
    return;
  }
  /* GitHub Pages can't redirect /index.html to /, so tidy the address bar instead (same page, no reload). */
  if (/\/index\.html$/.test(w.location.pathname) && w.history.replaceState) {
    w.history.replaceState(null, '', w.location.pathname.replace(/index\.html$/, '') + w.location.search + w.location.hash);
  }
  var h = d.documentElement;
  /* Clickjacking defence: a meta CSP can't use frame-ancestors and GitHub Pages can't send
     X-Frame-Options. If another site frames us (reading top.location throws cross-origin), hide the
     page (style.css: html.is-framed) so there is nothing to trick a click on, then try to break out. */
  if (w.top !== w.self) {
    try { void w.top.location.href; } catch (e) {
      h.classList.add('is-framed');
      try { w.top.location = w.self.location.href; } catch (e2) { /* browsers may block this without a click */ }
    }
  }
  h.className = h.className.replace('no-js', 'js');
  try {
    var t = localStorage.getItem('cyf-theme');
    if (t === 'light' || t === 'dark') h.setAttribute('data-theme', t);
  } catch (e) { /* storage unavailable */ }
  try {
    if (sessionStorage.getItem('cyf-pre') || w.matchMedia('(prefers-reduced-motion: reduce)').matches) h.classList.add('no-preload');
  } catch (e) { h.classList.add('no-preload'); }
})(window, document);
