/* CyFocus — contact form: validates, then opens the visitor's email app or WhatsApp with the message pre-filled. */
(function () {
  'use strict';

  var form = document.getElementById('contact-form');
  if (!form) return;

  var EMAIL = 'info@cyfocus.in';
  var WHATSAPP = '917010640835';
  var success = document.getElementById('form-success');
  var btnLabel = form.querySelector('[data-btn-label]');
  var btnIcon = form.querySelector('[data-btn-icon] use');
  var msgCount = document.getElementById('msg-count');
  var el = form.elements;
  var attempted = false;
  var lastLink = '';
  var lastText = '';

  /* Prefill from the URL, e.g. contact.html?service=cloud or ?service=cloud:aws-ec2&channel=whatsapp */
  var params = new URLSearchParams(location.search);
  var svc = params.get('service');
  if (svc) {
    var match = Array.prototype.some.call(el.service.options, function (o) { return o.value === svc; });
    if (match) el.service.value = svc;
  }
  if (params.get('channel') === 'whatsapp') document.getElementById('ch-wa').checked = true;

  function channel() { return document.getElementById('ch-wa').checked ? 'whatsapp' : 'email'; }
  function syncButton() {
    var wa = channel() === 'whatsapp';
    if (btnLabel) btnLabel.textContent = wa ? 'Continue to WhatsApp' : 'Continue to Email';
    if (btnIcon) btnIcon.setAttribute('href', wa ? '#i-chat' : '#i-send');
  }
  Array.prototype.forEach.call(form.querySelectorAll('input[name="channel"]'), function (r) {
    r.addEventListener('change', syncButton);
  });
  syncButton();

  function updateCount() {
    if (msgCount) msgCount.textContent = el.message.value.length + ' / ' + el.message.maxLength;
  }
  el.message.addEventListener('input', updateCount);
  updateCount();

  var rules = {
    name: function (v) { return v.trim().length >= 2 ? '' : 'Please enter your name.'; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.'; },
    phone: function (v) {
      if (!v.trim()) return '';
      var digits = v.replace(/[\s\-().+]/g, '');
      return /^\d{10,15}$/.test(digits) ? '' : 'Please enter a valid WhatsApp number (10–15 digits).';
    },
    service: function (v) { return v ? '' : 'Please choose the service you need.'; },
    message: function (v) { return v.trim().length >= 10 ? '' : 'Please add a few more details (at least 10 characters).'; },
    consent: function (v, input) { return input.checked ? '' : 'Please confirm so we can reply to you.'; }
  };

  function errorEl(name) { return form.querySelector('[data-error="' + name + '"]'); }

  function check(name) {
    var input = el[name];
    var msg = rules[name](input.value, input);
    var field = input.closest('.field') || input.closest('.check');
    var err = errorEl(name);
    if (field) field.classList.toggle('invalid', !!msg);
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) err.textContent = msg;
    return !msg;
  }

  Object.keys(rules).forEach(function (name) {
    var input = el[name];
    input.addEventListener(name === 'consent' || name === 'service' ? 'change' : 'blur', function () {
      if (attempted || input.value) check(name);
    });
    input.addEventListener('input', function () { if (attempted) check(name); });
  });

  function serviceLabel() {
    var opt = el.service.options[el.service.selectedIndex];
    if (!opt || !opt.value) return '';
    var group = opt.parentNode && opt.parentNode.tagName === 'OPTGROUP' ? opt.parentNode.label : '';
    return group && opt.text.indexOf(group) === -1 ? group + ' — ' + opt.text : opt.text;
  }

  function buildText() {
    var lines = [
      'Hello CyFocus team,',
      '',
      el.message.value.trim(),
      '',
      '— ' + el.name.value.trim(),
      'Email: ' + el.email.value.trim()
    ];
    if (el.phone.value.trim()) lines.push('WhatsApp: ' + el.phone.value.trim());
    lines.push('Service: ' + serviceLabel());
    lines.push('', 'Sent from the cyfocus.in contact form');
    return lines.join('\n');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    attempted = true;
    var firstBad = null;
    Object.keys(rules).forEach(function (name) {
      if (!check(name) && !firstBad) firstBad = el[name];
    });
    if (firstBad) {
      firstBad.focus();
      if (window.CyF) window.CyF.toast('Please fix the highlighted fields.', 'alert');
      return;
    }

    lastText = buildText();
    var wa = channel() === 'whatsapp';
    if (wa) {
      lastLink = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(lastText);
      window.open(lastLink, '_blank', 'noopener');
    } else {
      var subject = 'Enquiry: ' + serviceLabel() + ' — ' + el.name.value.trim();
      lastLink = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(lastText);
      window.location.href = lastLink;
    }

    /* Built with DOM nodes (no innerHTML) so the page works under the Trusted Types CSP. */
    var text = success.querySelector('[data-success-text]');
    var strong = function (s) { var b = document.createElement('strong'); b.textContent = s; return b; };
    text.replaceChildren(
      wa ? 'WhatsApp should now be open with your message ready to send to ' : 'Your email app should now be open with your message addressed to ',
      strong(wa ? '+91 70106 40835' : EMAIL),
      '. Just press ', strong('Send'), '.'
    );
    var again = success.querySelector('[data-open-again]');
    again.setAttribute('href', lastLink);
    if (wa) { again.setAttribute('target', '_blank'); again.setAttribute('rel', 'noopener'); }
    else { again.removeAttribute('target'); again.removeAttribute('rel'); }

    form.hidden = true;
    success.classList.add('show');
    success.focus({ preventScroll: true });
    success.scrollIntoView({ block: 'center', behavior: window.CyF && window.CyF.reduceMotion ? 'auto' : 'smooth' });
  });

  success.querySelector('[data-copy-msg]').addEventListener('click', function () {
    if (window.CyF) window.CyF.copy(lastText, 'Message copied');
  });
  success.querySelector('[data-reset]').addEventListener('click', function () {
    form.reset();
    attempted = false;
    Array.prototype.forEach.call(form.querySelectorAll('.invalid'), function (f) { f.classList.remove('invalid'); });
    Array.prototype.forEach.call(form.querySelectorAll('[data-error]'), function (f) { f.textContent = ''; });
    syncButton();
    updateCount();
    success.classList.remove('show');
    form.hidden = false;
    el.name.focus();
  });
})();
