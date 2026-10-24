/* Mechanizm makiet (nie jest częścią projektu aplikacji).
   Stany widoku deklaruje <meta name="mock-states" content="id=Etykieta | id2=Etykieta 2">.
   Pierwszy stan jest domyślny. Adres: #stan albo #stan~dark / #stan~light.
     data-only="a b"        element widoczny tylko w stanach a, b
     data-except="a b"      element ukryty w stanach a, b
     data-on="a b:kl1 kl2; c:kl3"   klasy dodawane w podanych stanach
   Motyw: przełącznik Light / Dark w nawigacji (input[name="theme"]), przyrostek
   adresu albo setMockTheme('light' | 'dark'). Ustawia data-theme na <html>, tak
   jak zrobi to aplikacja. Dopóki nic nie wybrano, motyw wynika z systemu.
   W ramce (strona przeglądu) przełącznik stanów jest ukryty. */
(function () {
  var root = document.documentElement;
  var meta = document.querySelector('meta[name="mock-states"]');
  var states = (meta ? meta.content : '').split('|').map(function (s) {
    var p = s.split('='); return { id: p[0].trim(), label: (p[1] || p[0]).trim() };
  }).filter(function (s) { return s.id; });
  var fallback = states.length ? states[0].id : '';
  var inFrame = window.self !== window.top;
  var current = { state: fallback, theme: 'auto' };
  var darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function resolved() { return current.theme === 'auto' ? (darkQuery && darkQuery.matches ? 'dark' : 'light') : current.theme; }

  function list(v) { return (v || '').trim().split(/\s+/); }
  function fromHash() {
    var parts = decodeURIComponent(location.hash.slice(1)).split('~');
    var st = parts[0] && states.some(function (s) { return s.id === parts[0]; }) ? parts[0] : fallback;
    var th = parts[1] === 'dark' || parts[1] === 'light' ? parts[1] : 'auto';
    return { state: st, theme: th };
  }
  function writeHash() {
    try { history.replaceState(null, '', '#' + current.state + (current.theme !== 'auto' ? '~' + current.theme : '')); } catch (e) { /* adres bez zmian */ }
  }

  function applyTheme() {
    if (current.theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', current.theme);
    var r = resolved();
    document.querySelectorAll('input[name="theme"]').forEach(function (i) { i.checked = i.value === r; });
    document.querySelectorAll('.mock-switcher [data-theme-link]').forEach(function (a) { a.setAttribute('aria-current', String(a.getAttribute('data-theme-link') === r)); });
  }

  function applyState() {
    var st = current.state;
    root.setAttribute('data-state', st);
    document.querySelectorAll('[data-only]').forEach(function (el) { el.hidden = list(el.getAttribute('data-only')).indexOf(st) < 0; });
    document.querySelectorAll('[data-except]').forEach(function (el) { el.hidden = list(el.getAttribute('data-except')).indexOf(st) >= 0; });
    document.querySelectorAll('[data-on]').forEach(function (el) {
      el.getAttribute('data-on').split(';').forEach(function (rule) {
        var parts = rule.split(':'); if (parts.length < 2) return;
        var on = list(parts[0]).indexOf(st) >= 0;
        list(parts[1]).forEach(function (c) { if (c) el.classList.toggle(c, on); });
      });
    });
    var label = document.querySelector('.mock-switcher__current');
    if (label) {
      var cur = states.filter(function (s) { return s.id === st; })[0];
      label.textContent = cur ? cur.label : st;
      document.querySelectorAll('.mock-switcher [data-state-link]').forEach(function (a) { a.setAttribute('aria-current', String(a.getAttribute('data-state-link') === st)); });
    }
  }

  /* API dla testów i strony przeglądu */
  window.setMockState = function (id) { current.state = id; applyState(); };
  window.setMockTheme = function (t) { current.theme = t; applyTheme(); };

  if (!inFrame && states.length) {
    var css = document.createElement('style');
    css.textContent =
      '.mock-switcher{position:fixed;z-index:2000;top:10px;right:10px;font:500 13px/1.3 system-ui,sans-serif;color:#18201c}' +
      '@media (min-width:960px){.mock-switcher{top:auto;bottom:16px;right:16px}}' +
      '.mock-switcher summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:999px;background:#18201c;color:#fff;box-shadow:0 4px 16px rgb(0 0 0 / .25);border:1px solid rgb(255 255 255 / .15)}' +
      '.mock-switcher summary::-webkit-details-marker{display:none}' +
      '.mock-switcher summary::before{content:"";width:8px;height:8px;border-radius:50%;background:#a7e3d6}' +
      '.mock-switcher nav{position:absolute;right:0;top:calc(100% + 6px);min-width:230px;max-height:70vh;overflow:auto;padding:6px;border-radius:12px;background:#fff;border:1px solid #e1e4de;box-shadow:0 12px 32px rgb(0 0 0 / .25);display:grid;gap:2px}' +
      '@media (min-width:960px){.mock-switcher nav{top:auto;bottom:calc(100% + 6px)}}' +
      '.mock-switcher a{display:block;padding:7px 10px;border-radius:8px;color:inherit;text-decoration:none}' +
      '.mock-switcher a:hover{background:#eef0ec}.mock-switcher a[aria-current="true"]{background:#e1efeb;color:#115e59;font-weight:600}' +
      '.mock-switcher p{margin:6px 10px 4px;font-size:11px;color:#5f6963}' +
      '.mock-switcher__long{display:none}@media (min-width:600px){.mock-switcher__long{display:inline}.mock-switcher__short{display:none}}';
    document.head.appendChild(css);
    var box = document.createElement('details');
    box.className = 'mock-switcher';
    box.innerHTML = '<summary><span class="mock-switcher__short">Stany</span><span class="mock-switcher__long">Stan: <span class="mock-switcher__current"></span></span></summary>' +
      '<nav aria-label="Stany makiety">' +
      (states.length > 1 ? '<p>Stany makiety</p>' + states.map(function (s) { return '<a href="#' + s.id + '" data-state-link="' + s.id + '">' + s.label + '</a>'; }).join('') : '') +
      '<p>Motyw</p><a href="#" data-theme-link="light">Jasny</a><a href="#" data-theme-link="dark">Ciemny</a></nav>';
    document.body.appendChild(box);
    box.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a) return;
      e.preventDefault(); box.open = false;
      if (a.hasAttribute('data-state-link')) window.setMockState(a.getAttribute('data-state-link'));
      if (a.hasAttribute('data-theme-link')) window.setMockTheme(a.getAttribute('data-theme-link'));
      writeHash();
    });
  }

  document.addEventListener('change', function (e) {
    if (e.target.matches('input[name="theme"]')) { window.setMockTheme(e.target.value); if (!inFrame) writeHash(); }
  });
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('a[href="#"]')) e.preventDefault();
    if (t.closest('.js-filters')) { document.querySelectorAll('.filters, .js-backdrop').forEach(function (el) { el.classList.toggle('is-open'); }); }
    if (t.closest('.js-nav')) { document.querySelectorAll('.app > .sidebar, .js-backdrop').forEach(function (el) { el.classList.add('is-open'); }); }
    if (t.closest('.js-close')) { document.querySelectorAll('.filters, .app > .sidebar, .js-backdrop').forEach(function (el) { el.classList.remove('is-open'); }); }
  });
  document.addEventListener('submit', function (e) { e.preventDefault(); });
  window.addEventListener('hashchange', function () { current = fromHash(); applyState(); applyTheme(); });
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', function () { if (current.theme === 'auto') applyTheme(); });

  current = fromHash();
  applyState();
  applyTheme();
})();
