/* CyFocus — runs in <head> before first paint: marks JS as available, applies the saved theme
   (no flash of the wrong theme) and skips the preloader after the first visit. Kept external so the
   site can use a strict Content-Security-Policy with no inline scripts. */
(function (d) {
  var h = d.documentElement;
  h.className = h.className.replace('no-js', 'js');
  try {
    var t = localStorage.getItem('cyf-theme');
    if (t === 'light' || t === 'dark') h.setAttribute('data-theme', t);
  } catch (e) { /* storage unavailable */ }
  try {
    if (sessionStorage.getItem('cyf-pre') || window.matchMedia('(prefers-reduced-motion: reduce)').matches) h.classList.add('no-preload');
  } catch (e) { h.classList.add('no-preload'); }
})(document);
