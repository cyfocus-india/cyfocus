/* CyFocus — financial calculators (illustrative, runs entirely in the browser). */
(function () {
  'use strict';

  var wrap = document.getElementById('calculators');
  if (!wrap) return;

  var inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
  function money(n) { return inr.format(Math.round(isFinite(n) ? n : 0)); }
  function words(n) {
    n = Math.round(n);
    if (n >= 1e7) return '≈ ₹' + (n / 1e7).toFixed(2) + ' Crore';
    if (n >= 1e5) return '≈ ₹' + (n / 1e5).toFixed(2) + ' Lakh';
    if (n >= 1e3) return '≈ ₹' + (n / 1e3).toFixed(1) + ' Thousand';
    return '';
  }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* Formulas */
  /* Round the headline figures once, then derive the rest from them,
     so the parts shown always add up exactly to the totals shown. */
  function growth(total, invested) {
    var t = Math.round(total), inv = Math.round(invested);
    return { total: t, invested: inv, gains: t - inv, a: inv, b: t - inv };
  }

  var calcs = {
    sip: function (v) {
      var P = v.amount, m = Math.round(v.years * 12);
      // The expected return is an annualised figure (CAGR), so use the equivalent
      // monthly rate rather than rate / 12, which would overstate growth.
      // Each instalment is invested at the start of the month (annuity due).
      var i = Math.pow(1 + v.rate / 100, 1 / 12) - 1;
      var total = i === 0 ? P * m : P * ((Math.pow(1 + i, m) - 1) / i) * (1 + i);
      return growth(total, P * m);
    },
    lump: function (v) {
      return growth(v.amount * Math.pow(1 + v.rate / 100, v.years), v.amount);
    },
    emg: function (v) {
      var target = Math.round(v.expenses * v.months);
      var saved = Math.round(v.savings);
      var gap = Math.max(0, target - saved);
      var monthsToGoal = gap === 0 ? 0 : (v.monthly > 0 ? Math.ceil(gap / v.monthly) : Infinity);
      var have = Math.min(saved, target);
      return { total: target, gap: gap, have: have, eta: monthsToGoal, a: have, b: gap };
    },
    emi: function (v) {
      // Standard reducing-balance EMI: lenders apply the annual rate / 12 each month.
      var L = v.amount, i = v.rate / 1200, m = Math.round(v.years * 12);
      var emi = i === 0 ? L / m : L * i * Math.pow(1 + i, m) / (Math.pow(1 + i, m) - 1);
      var principal = Math.round(L);
      var payable = Math.round(emi * m);
      return { total: Math.round(emi), principal: principal, interest: payable - principal, payable: payable, a: principal, b: payable - principal };
    }
  };

  function eta(months) {
    if (months === 0) return 'Already there';
    if (!isFinite(months)) return 'Add a monthly saving';
    var y = Math.floor(months / 12), mo = months % 12;
    var parts = [];
    if (y) parts.push(y + (y === 1 ? ' year' : ' years'));
    if (mo) parts.push(mo + (mo === 1 ? ' month' : ' months'));
    return parts.join(' ');
  }

  function render(panel) {
    var type = panel.getAttribute('data-calc');
    var values = {};
    $$('.num', panel).forEach(function (n) {
      // Calculate with the value clamped to the field's allowed range, so a
      // half-typed entry (e.g. a 0-year tenure) never produces a nonsense result.
      var min = parseFloat(n.min), max = parseFloat(n.max), v = parseFloat(n.value);
      if (isNaN(v)) v = min;
      values[n.getAttribute('data-key')] = Math.min(max, Math.max(min, v));
    });
    var r = calcs[type](values);
    $$('[data-out]', panel).forEach(function (o) {
      var key = o.getAttribute('data-out');
      if (key === 'words') o.textContent = words(r.total);
      else if (key === 'eta') o.textContent = eta(r.eta);
      else o.textContent = money(r[key]);
    });
    var sum = r.a + r.b;
    var pa = sum > 0 ? (r.a / sum) * 100 : 50;
    var a = panel.querySelector('[data-bar="a"]'), b = panel.querySelector('[data-bar="b"]');
    if (a) a.style.width = pa.toFixed(2) + '%';
    if (b) b.style.width = (100 - pa).toFixed(2) + '%';
  }

  function paint(range) {
    var min = parseFloat(range.min), max = parseFloat(range.max), val = parseFloat(range.value);
    range.style.setProperty('--p', ((val - min) / (max - min) * 100) + '%');
  }

  $$('.calc', wrap).forEach(function (panel) {
    $$('.calc-field', panel).forEach(function (field) {
      var range = field.querySelector('.range');
      var num = field.querySelector('.num');
      range.addEventListener('input', function () {
        num.value = range.value;
        paint(range);
        render(panel);
      });
      num.addEventListener('input', function () {
        var v = parseFloat(num.value);
        if (isNaN(v)) return;
        range.value = Math.min(parseFloat(range.max), Math.max(parseFloat(range.min), v));
        paint(range);
        render(panel);
      });
      num.addEventListener('change', function () {
        var v = parseFloat(num.value);
        var min = parseFloat(num.min), max = parseFloat(num.max);
        if (isNaN(v)) v = parseFloat(range.value);
        v = Math.min(max, Math.max(min, v));
        num.value = v;
        range.value = Math.min(parseFloat(range.max), Math.max(parseFloat(range.min), v));
        paint(range);
        render(panel);
      });
      paint(range);
    });
    render(panel);
  });

  /* Tabs (WAI-ARIA tabs pattern) */
  var tabs = $$('[role="tab"]', wrap);
  function select(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.setAttribute('tabindex', on ? '0' : '-1');
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { select(tab, false); });
    tab.addEventListener('keydown', function (e) {
      var idx = null;
      if (e.key === 'ArrowRight') idx = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') idx = (i - 1 + tabs.length) % tabs.length;
      if (e.key === 'Home') idx = 0;
      if (e.key === 'End') idx = tabs.length - 1;
      if (idx !== null) { e.preventDefault(); select(tabs[idx], true); }
    });
  });
})();
