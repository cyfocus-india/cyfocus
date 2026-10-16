/* CyFocus — core interactions */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  var SVG_NS = 'http://www.w3.org/2000/svg';

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } }
  };

  /* ---------- Toasts ---------- */
  var toastRegion = $('.toast-region');
  function icon(name) {
    var svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'ico');
    svg.setAttribute('aria-hidden', 'true');
    var use = svg.appendChild(doc.createElementNS(SVG_NS, 'use'));
    use.setAttribute('href', '#i-' + name);
    return svg;
  }
  function toast(message, iconName) {
    if (!toastRegion) return;
    var el = doc.createElement('div');
    el.className = 'toast';
    el.appendChild(icon(iconName || 'check-circle'));
    el.appendChild(doc.createElement('div')).textContent = message;
    toastRegion.appendChild(el);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 320);
    }, 3800);
  }

  /* ---------- Clipboard ---------- */
  function copyText(text, label) {
    function done() { toast((label || 'Copied') + ': ' + (text.length > 60 ? text.slice(0, 57) + '…' : text), 'copy'); }
    function fallback() {
      var ta = doc.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
      doc.body.appendChild(ta);
      ta.select();
      try { doc.execCommand('copy'); done(); } catch (e) { toast('Copy failed — please copy it manually.', 'alert'); }
      ta.remove();
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  window.CyF = { toast: toast, copy: copyText, store: store, reduceMotion: reduceMotion };

  /* ---------- Preloader ---------- */
  var pre = $('.preloader');
  if (pre && !root.classList.contains('no-preload')) {
    var hidePre = function () {
      if (pre.classList.contains('done')) return;
      pre.classList.add('done');
      try { sessionStorage.setItem('cyf-pre', '1'); } catch (e) { /* ignore */ }
    };
    // First visit only. Never hold the page back for long on slow connections (content is ready
    // well before every image has loaded), so cap the wait at 0.9 s.
    if (doc.readyState === 'complete') setTimeout(hidePre, 300);
    else window.addEventListener('load', function () { setTimeout(hidePre, 200); });
    setTimeout(hidePre, 900);
  }

  /* ---------- Theme ---------- */
  var metaTheme = $('meta[name="theme-color"]');
  function applyTheme(theme) {
    root.setAttribute('data-theme', theme);
    if (metaTheme) metaTheme.setAttribute('content', theme === 'light' ? '#F3F3F5' : '#07070A');
    $$('[data-theme-toggle]').forEach(function (btn) {
      btn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
      btn.setAttribute('title', theme === 'light' ? 'Dark theme' : 'Light theme');
    });
  }
  applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  $$('[data-theme-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      store.set('cyf-theme', next);
    });
  });

  /* ---------- Header, progress, back-to-top ---------- */
  var header = $('.site-header');
  var progress = $('.scroll-progress');
  var toTop = $('.to-top');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY;
    var max = root.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    if (progress) progress.style.transform = 'scaleX(' + p + ')';
    if (toTop) {
      toTop.classList.toggle('show', y > 640);
      toTop.style.setProperty('--p', p.toFixed(3));
    }
    if (header) header.classList.toggle('scrolled', y > 12);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Mega menu ---------- */
  $$('.has-mega').forEach(function (wrap) {
    var btn = $('.nav-btn', wrap);
    var timer = null;
    var hoverOpened = false;
    function open() {
      clearTimeout(timer);
      wrap.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
    function close() {
      clearTimeout(timer);
      wrap.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      hoverOpened = false;
    }
    btn.addEventListener('click', function () {
      if (hoverOpened) { hoverOpened = false; return; }
      if (wrap.classList.contains('open')) close(); else open();
    });
    if (finePointer) {
      wrap.addEventListener('mouseenter', function () {
        if (!wrap.classList.contains('open')) hoverOpened = true;
        open();
        setTimeout(function () { hoverOpened = false; }, 400);
      });
      wrap.addEventListener('mouseleave', function () { timer = setTimeout(close, 200); });
    }
    wrap.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && wrap.classList.contains('open')) { close(); btn.focus(); }
      if (e.key === 'ArrowDown' && doc.activeElement === btn) {
        e.preventDefault();
        open();
        var first = $('.mega a', wrap);
        if (first) first.focus();
      }
    });
    wrap.addEventListener('focusout', function (e) {
      if (!wrap.contains(e.relatedTarget)) close();
    });
    doc.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) close();
    });
  });

  /* ---------- Mobile drawer ---------- */
  var drawer = $('#drawer');
  var menuBtn = $('.menu-toggle');
  if (drawer && menuBtn) {
    var focusables = function () {
      return $$('a[href], button:not([disabled]), input, select, textarea', drawer).filter(function (el) {
        return el.offsetParent !== null;
      });
    };
    var openDrawer = function () {
      drawer.classList.add('open');
      drawer.removeAttribute('inert');
      drawer.setAttribute('aria-hidden', 'false');
      menuBtn.setAttribute('aria-expanded', 'true');
      root.classList.add('lock');
      setTimeout(function () {
        var close = $('[data-drawer-close]', drawer);
        if (close) close.focus();
      }, 60);
    };
    var closeDrawer = function (returnFocus) {
      drawer.classList.remove('open');
      drawer.setAttribute('inert', '');
      drawer.setAttribute('aria-hidden', 'true');
      menuBtn.setAttribute('aria-expanded', 'false');
      root.classList.remove('lock');
      if (returnFocus !== false) menuBtn.focus();
    };
    drawer.setAttribute('inert', '');
    drawer.setAttribute('aria-hidden', 'true');
    menuBtn.addEventListener('click', openDrawer);
    $$('[data-drawer-close]', drawer).forEach(function (b) { b.addEventListener('click', function () { closeDrawer(); }); });
    drawer.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { closeDrawer(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    $$('.drawer-nav a, .drawer-foot a', drawer).forEach(function (a) {
      a.addEventListener('click', function () { closeDrawer(false); });
    });
    $$('.d-btn', drawer).forEach(function (b) {
      var sub = doc.getElementById(b.getAttribute('aria-controls'));
      b.addEventListener('click', function () {
        var isOpen = b.getAttribute('aria-expanded') === 'true';
        b.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
        if (sub) sub.classList.toggle('open', !isOpen);
      });
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 992 && drawer.classList.contains('open')) closeDrawer(false);
    });
  }

  /* ---------- Reveal on scroll ---------- */
  $$('[data-stagger]').forEach(function (group) {
    $$('[data-reveal]', group).forEach(function (el, i) {
      if (!/(^|\s)u-i\d(\s|$)/.test(el.getAttribute('class') || '')) el.style.setProperty('--i', String(i % 8));
    });
  });
  var revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealIO.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    revealEls.forEach(function (el) { revealIO.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Counters ---------- */
  function runCounter(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';
    if (reduceMotion) { el.textContent = prefix + target + suffix; return; }
    var start = null, dur = 1700;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - t, 4);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { runCounter(entry.target); countIO.unobserve(entry.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { countIO.observe(el); });
  }

  /* ---------- Spotlight + tilt ---------- */
  if (finePointer) {
    doc.addEventListener('pointermove', function (e) {
      var card = e.target.closest ? e.target.closest('.spot') : null;
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }
  if (finePointer && !reduceMotion) {
    $$('[data-tilt]').forEach(function (el) {
      var max = 5;
      el.addEventListener('pointerenter', function () {
        el.style.transition = 'transform .25s ease-out, border-color .35s, opacity .9s';
        el.style.transitionDelay = '0s';
      });
      el.addEventListener('pointermove', function (e) {
        if (!el.classList.contains('in') && el.hasAttribute('data-reveal')) return;
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateX(' + (-y * max).toFixed(2) + 'deg) rotateY(' + (x * max).toFixed(2) + 'deg) translateY(-4px)';
      });
      el.addEventListener('pointerleave', function () {
        el.style.transition = 'transform .7s cubic-bezier(.22,1,.36,1), border-color .35s, opacity .9s';
        el.style.transform = '';
      });
    });
  }

  /* ---------- Rotating words ---------- */
  $$('[data-rotator]').forEach(function (rot) {
    var items = $$('span', rot);
    if (!items.length) return;
    var i = 0;
    items[0].classList.add('is-active');
    if (reduceMotion || items.length < 2) return;
    setInterval(function () {
      if (doc.hidden) return;
      var cur = items[i];
      i = (i + 1) % items.length;
      var next = items[i];
      cur.classList.remove('is-active');
      cur.classList.add('is-leaving');
      next.classList.remove('is-leaving');
      next.classList.add('is-active');
      setTimeout(function () { cur.classList.remove('is-leaving'); }, 650);
    }, 2400);
  });

  /* ---------- Terminal typewriter ---------- */
  $$('[data-typer]').forEach(function (term) {
    var lines = $$('.t-line:not(.t-prompt)', term);
    var prompt = $('.t-prompt', term);
    if (reduceMotion || !lines.length || !('IntersectionObserver' in window)) return;
    lines.forEach(function (l) { l.style.width = '0ch'; });
    if (prompt) prompt.style.visibility = 'hidden';
    function typeLine(idx) {
      if (idx >= lines.length) { if (prompt) prompt.style.visibility = ''; return; }
      var line = lines[idx];
      var n = line.textContent.length;
      var k = 0;
      var speed = idx === 0 ? 38 : 16;
      var iv = setInterval(function () {
        k++;
        line.style.width = k + 'ch';
        if (k >= n) {
          clearInterval(iv);
          line.style.width = '';
          setTimeout(function () { typeLine(idx + 1); }, idx === 0 ? 380 : 160);
        }
      }, speed);
    }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); setTimeout(function () { typeLine(0); }, 700); }
    }, { threshold: 0.3 });
    io.observe(term);
  });

  /* ---------- FAQ accordion (animated <details>) ---------- */
  $$('.faq details').forEach(function (d) {
    var summary = $('summary', d);
    if (!summary || reduceMotion || !d.animate) return;
    var anim = null;
    summary.addEventListener('click', function (e) {
      e.preventDefault();
      var easing = 'cubic-bezier(.22,1,.36,1)';
      var wasClosing = d.classList.contains('closing');
      var from = d.offsetHeight; // current (possibly mid-animation) height
      if (anim) { anim.cancel(); anim = null; }
      if (d.open && !wasClosing) {
        d.classList.add('closing');
        anim = d.animate({ height: [from + 'px', (summary.offsetHeight + 2) + 'px'] }, { duration: 320, easing: easing });
        anim.onfinish = function () { d.open = false; d.classList.remove('closing'); anim = null; };
      } else {
        // open, or re-open if it was mid-close
        d.classList.remove('closing');
        d.open = true;
        var end = d.offsetHeight;
        anim = d.animate({ height: [from + 'px', end + 'px'] }, { duration: 400, easing: easing });
        anim.onfinish = function () { anim = null; };
      }
    });
  });

  /* ---------- Copy buttons ---------- */
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      copyText(btn.getAttribute('data-copy'), btn.getAttribute('data-copy-label') || 'Copied');
    });
  });

  /* ---------- Map: load the Google embed only when it's about to scroll into view ----------
     Native loading="lazy" starts far too early on phones, pulling ~460 KB from Google on page load. */
  $$('iframe[data-src]').forEach(function (frame) {
    var load = function () { if (!frame.getAttribute('src')) frame.setAttribute('src', frame.getAttribute('data-src')); };
    if (!('IntersectionObserver' in window)) { load(); return; }
    var mapIO = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { mapIO.disconnect(); load(); }
    }, { rootMargin: '300px 0px' });
    mapIO.observe(frame);
  });

  /* ---------- 404: show the address that wasn't found (textContent, so it can never become markup) ---------- */
  var nfPath = $('[data-nf-path]');
  if (nfPath && !/\/404(\.html)?$/.test(location.pathname)) {
    var missing = location.pathname;
    try { missing = decodeURI(missing); } catch (e) { /* keep the encoded form */ }
    $('code', nfPath).textContent = missing.length > 80 ? missing.slice(0, 77) + '…' : missing;
    nfPath.hidden = false;
    // Requests for admin panels, config files, server scripts or path tricks are scanners, not visitors
    var probe = /(^|\/)(\.(env|git|svn|hg|aws|ssh|htpasswd|htaccess|ds_store)|wp-(admin|login|content|includes|config)|xmlrpc|phpmyadmin|pma|adminer|cgi-bin|server-status|actuator|phpunit|etc\/passwd|boaform|hnap1|owa|autodiscover|administrator|admin|login|cpanel|webmail|shell|backup|dump)|\.(php\d?|aspx?|jsp|cgi|sql|bak|old|swp|env|ini|log|ya?ml|tar|gz|tgz|zip|rar|7z)$|\.\.|<|>|%00|\x00/i;
    var nfProbe = $('[data-nf-probe]');
    if (nfProbe && (probe.test(missing) || probe.test(location.search))) nfProbe.hidden = false;
  }

  /* ---------- A word for anyone poking around in DevTools ---------- */
  if (window.console && console.log) {
    console.log('%cStop!', 'color:#FF3B0A;font:700 32px system-ui,sans-serif');
    console.log('%cThis browser console is a tool for developers. If someone told you to paste something here, it is a scam that could give them access to your accounts.', 'font:16px system-ui,sans-serif');
    console.log('%cSecurity researchers: cyfocus.in is a static site with a strict Content-Security-Policy. If you find a real vulnerability, please report it privately to info@cyfocus.in (see https://cyfocus.in/.well-known/security.txt). Unauthorised access to computer systems is an offence under India’s Information Technology Act, 2000 (Sections 43 and 66).', 'font:13px system-ui,sans-serif;color:#9A9AA6');
  }

  /* ---------- Footer year ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Page transitions ---------- */
  if (!reduceMotion) {
    doc.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return;
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin || url.protocol.indexOf('http') !== 0) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      e.preventDefault();
      root.classList.add('is-leaving');
      setTimeout(function () { location.href = url.href; }, 200);
    });
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) root.classList.remove('is-leaving');
    });
  }

  /* ---------- Legal: table-of-contents highlighting ---------- */
  var toc = $('.toc');
  if (toc && 'IntersectionObserver' in window) {
    var tocLinks = $$('a[href^="#"]', toc);
    var tocIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        tocLinks.forEach(function (l) { l.classList.toggle('active', l.getAttribute('href') === '#' + entry.target.id); });
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    tocLinks.forEach(function (l) {
      var sec = doc.getElementById(l.getAttribute('href').slice(1));
      if (sec) tocIO.observe(sec);
    });
  }

  /* ---------- Services catalogue: search + filter ---------- */
  var catalogue = $('#svc-catalogue');
  if (catalogue) {
    var input = $('#svc-search', catalogue);
    var searchWrap = $('.search', catalogue);
    var clearBtn = $('.search .clear', catalogue);
    var chips = $$('.fchip', catalogue);
    var groups = $$('.svc-group', catalogue);
    var countEl = $('#svc-count', catalogue);
    var empty = $('#svc-empty', catalogue);
    var active = 'all';
    var cats = chips.map(function (c) { return c.getAttribute('data-cat'); });

    var cards = $$('.svc-card', catalogue).map(function (card) {
      var h = $('h3', card), p = $('p', card);
      return {
        el: card, h: h, p: p,
        ht: h.textContent, pt: p.textContent,
        hay: (h.textContent + ' ' + p.textContent + ' ' + (card.getAttribute('data-tags') || '')).toLowerCase()
      };
    });

    var escRe = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
    /* Highlight matches with DOM nodes (no innerHTML), so search text can never become markup. */
    var mark = function (node, text, re) {
      var parts = re ? text.split(re) : [text];
      var frag = doc.createDocumentFragment();
      parts.forEach(function (part, i) {
        if (!part) return;
        if (i % 2) frag.appendChild(doc.createElement('mark')).textContent = part;
        else frag.appendChild(doc.createTextNode(part));
      });
      node.replaceChildren(frag);
    };

    var apply = function () {
      var q = input.value.trim().toLowerCase();
      var terms = q.split(/\s+/).filter(Boolean);
      var re = terms.length ? new RegExp('(' + terms.map(escRe).join('|') + ')', 'gi') : null;
      var total = 0;
      groups.forEach(function (g) {
        var cat = g.getAttribute('data-group');
        var inCat = active === 'all' || active === cat;
        var n = 0;
        cards.forEach(function (c) {
          if (!g.contains(c.el)) return;
          var ok = inCat && terms.every(function (t) { return c.hay.indexOf(t) > -1; });
          c.el.hidden = !ok;
          if (ok) {
            n++;
            mark(c.h, c.ht, re);
            mark(c.p, c.pt, re);
          }
        });
        g.hidden = n === 0;
        total += n;
      });
      countEl.textContent = total + (total === 1 ? ' service' : ' services');
      empty.classList.toggle('show', total === 0);
      searchWrap.classList.toggle('has-value', q.length > 0);
    };

    var setCat = function (cat, updateHash) {
      if (cats.indexOf(cat) === -1) cat = 'all';
      active = cat;
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-cat') === cat ? 'true' : 'false'); });
      apply();
      if (updateHash && history.replaceState) {
        history.replaceState(null, '', cat === 'all' ? location.pathname + location.search : '#' + cat);
      }
    };

    chips.forEach(function (c) {
      c.addEventListener('click', function () {
        setCat(c.getAttribute('data-cat'), true);
        c.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });
    input.addEventListener('input', apply);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; apply(); }
    });
    clearBtn.addEventListener('click', function () { input.value = ''; apply(); input.focus(); });

    var params = new URLSearchParams(location.search);
    if (params.get('q')) input.value = params.get('q');
    var initial = location.hash.slice(1);
    setCat(initial || 'all', false);
    if (initial && cats.indexOf(initial) > -1) {
      setTimeout(function () { catalogue.scrollIntoView({ block: 'start' }); }, 50);
    }
    window.addEventListener('hashchange', function () { setCat(location.hash.slice(1) || 'all', false); });
  }
})();
