/* AWW2K26 entry gate — full-screen choice before anything heavy loads.
 * Enter 3D: WebGL check, then dynamic import('./runtime.js') immediately on
 * click (no scroll trigger). Existing circle preloader shows real progress;
 * a watchdog turns any stall into an error panel with a Quick-view fallback.
 * Quick view: static page only — no three.js, no models. Choice persists in
 * sessionStorage; ?mode=3d|quick overrides (also used by Switch links). */
(function entryGate() {
  'use strict';
  var MODE_KEY = 'aww2k26-mode';
  var WATCHDOG_MS = 90000;

  var gate = document.getElementById('entry-gate');
  var btn3d = document.getElementById('gate-3d');
  var btnQuick = document.getElementById('gate-quick');
  var gateError = document.getElementById('gate-error');
  var switchLink = document.getElementById('switch-3d');
  var loading = document.getElementById('loading');
  var play = document.getElementById('reference-play');

  function getMode() {
    try {
      var q = new URLSearchParams(location.search).get('mode');
      if (q === '3d' || q === 'quick') return q;
      var s = sessionStorage.getItem(MODE_KEY);
      if (s === '3d' || s === 'quick') return s;
    } catch (e) {}
    return null;
  }
  function setMode(m) {
    try { sessionStorage.setItem(MODE_KEY, m); } catch (e) {}
  }
  function setStatus(msg) {
    var el = document.getElementById('load-status');
    if (el) el.textContent = msg;
  }
  function webglOK() {
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) { return false; }
  }

  /* Pre-boot chrome: menu + anchor nav work with or without the 3D runtime.
   * The runtime skips its own copies when window.__CHROME_WIRED is set. */
  function wireChrome() {
    if (window.__CHROME_WIRED) return;
    window.__CHROME_WIRED = true;
    var menu = document.getElementById('reference-menu');
    var nav = document.getElementById('reference-navigation');
    if (menu && nav) menu.addEventListener('click', function () {
      nav.hidden = !nav.hidden;
      menu.setAttribute('aria-expanded', String(!nav.hidden));
    });
    var links = document.querySelectorAll('[data-section-go]');
    for (var i = 0; i < links.length; i++) (function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var map = { Intro: 'section-intro', Disassembly: 'section-disassembly', Particles: 'section-particles', Presentation: 'section-presentation', Straps: 'section-straps', Images: 'section-images', Colors: 'section-colors', Parts: 'section-parts', Footer: 'section-footer' };
        var el = document.getElementById(map[b.dataset.sectionGo] || '');
        if (el && (el.offsetHeight || el.getClientRects().length)) {
          if (el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          // Quick view hides the scroll spacers: jump to the static overlay.
          var ov = document.querySelector('.overlay[data-scene="' + b.dataset.sectionGo + '"]');
          if (ov && ov.scrollIntoView) ov.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        if (nav) nav.hidden = true;
        if (menu) menu.setAttribute('aria-expanded', 'false');
      });
    })(links[i]);
  }

  function showGate() { if (gate) gate.hidden = false; }
  function hideGate() { if (gate) gate.hidden = true; }
  function showLoading(msg) {
    if (loading) {
      loading.classList.remove('is-complete');
      loading.setAttribute('aria-hidden', 'false');
      loading.setAttribute('aria-busy', 'true');
    }
    // Escape hatch is visible for the whole load — no timer needed to offer it.
    var bail = document.getElementById('loading-quick');
    if (bail) {
      bail.hidden = false;
      if (!bail.dataset.wired) {
        bail.dataset.wired = '1';
        bail.addEventListener('click', function () { setMode('quick'); location.reload(); });
      }
    }
    setStatus(msg);
  }
  function completeLoading() {
    if (loading) {
      loading.classList.add('is-complete');
      loading.setAttribute('aria-hidden', 'true');
      loading.setAttribute('aria-busy', 'false');
    }
  }
  function disablePlay(reason) {
    if (play) { play.disabled = true; play.title = reason; }
  }
  function enablePlay() {
    if (play) { play.disabled = false; play.removeAttribute('title'); }
  }

  var watchdog = 0;
  function clearWatchdog() {
    if (watchdog) { clearTimeout(watchdog); watchdog = 0; }
  }
  function fail(msg) {
    clearWatchdog();
    completeLoading();
    document.body.dataset.boot3d = 'failed';
    showGate();
    if (gateError) {
      gateError.hidden = false;
      gateError.innerHTML = '';
      var p = document.createElement('p');
      p.textContent = msg;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'gate-fallback';
      b.textContent = 'Switch to Quick view';
      b.addEventListener('click', function () { setMode('quick'); enterQuick(); });
      gateError.appendChild(p);
      gateError.appendChild(b);
    }
  }

  function enter3D() {
    document.body.dataset.mode = '3d';
    hideGate();
    if (gateError) gateError.hidden = true;
    if (!webglOK()) { fail('WebGL is unavailable in this browser, so the 3D experience cannot start.'); return; }
    showLoading('Now loading · 3D experience');
    document.body.dataset.boot3d = 'loading';
    disablePlay('3D is loading — Play unlocks when it is ready.');
    clearWatchdog();
    watchdog = setTimeout(function () {
      watchdog = 0;
      if (!document.body.classList.contains('watch-ready')) {
        fail('Loading is taking too long — the connection may be too slow for the ~18MB download.');
      }
    }, WATCHDOG_MS);
    // Resolve the watchdog the moment the runtime signals readiness.
    var obs = new MutationObserver(function () {
      if (document.body.classList.contains('watch-ready')) {
        clearWatchdog();
        enablePlay();
        obs.disconnect();
      }
    });
    if (document.body) obs.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    // Dynamic preload + import: three.js and models download only on this path.
    var link = document.createElement('link');
    link.rel = 'modulepreload';
    link.href = 'reference-scroll/runtime.js';
    document.head.appendChild(link);
    import('./runtime.js').catch(function (err) {
      if (window.console && console.error) console.error(err);
      fail('The 3D experience could not load.');
    });
  }

  function enterQuick() {
    document.body.dataset.mode = 'quick';
    clearWatchdog();
    completeLoading();
    hideGate();
    disablePlay('Play is available in the 3D experience.');
    if (switchLink) switchLink.hidden = false;
  }

  wireChrome();
  var small = false;
  try { small = matchMedia('(max-width: 767px)').matches; } catch (e) {}
  if (btn3d) btn3d.classList.toggle('is-suggested', !small);
  if (btnQuick) btnQuick.classList.toggle('is-suggested', small);
  if (btn3d) btn3d.addEventListener('click', function () { setMode('3d'); enter3D(); });
  if (btnQuick) btnQuick.addEventListener('click', function () { setMode('quick'); enterQuick(); });
  if (switchLink) switchLink.addEventListener('click', function () { setMode('3d'); location.reload(); });

  var initial = getMode();
  if (initial === '3d') enter3D();
  else if (initial === 'quick') enterQuick();
  else showGate();
})();
