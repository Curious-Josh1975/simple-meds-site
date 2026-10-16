// JS Legends site script: analytics (GoatCounter) + hero A/B test.
// Paste your GoatCounter site code here (the "CODE" in CODE.goatcounter.com).
// While it is empty, nothing is loaded and nothing is sent anywhere.
const ANALYTICS_CODE = 'jslegends';

(function () {
  var params = new URLSearchParams(location.search);
  var override = params.get('v');
  var isPreview = override === 'a' || override === 'b';
  var queue = [];

  function send(name) {
    window.goatcounter.count({ path: name, title: name, event: true });
  }
  function track(name) {
    if (!ANALYTICS_CODE || isPreview) return;
    if (window.goatcounter && window.goatcounter.count) send(name); else queue.push(name);
  }
  window.jslTrack = track;

  if (ANALYTICS_CODE && !isPreview) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', 'https://' + ANALYTICS_CODE + '.goatcounter.com/count');
    s.onload = function () { queue.splice(0).forEach(send); };
    document.head.appendChild(s);
  }

  // Hero headline A/B test (index.html only).
  var hero = document.getElementById('hero-title');
  if (hero) {
    var v = isPreview ? override : null;
    if (!v) {
      try { v = localStorage.getItem('jsl_hero'); } catch (e) {}
      if (v !== 'a' && v !== 'b') {
        v = Math.random() < 0.5 ? 'a' : 'b';
        try { localStorage.setItem('jsl_hero', v); } catch (e) {}
      }
    }
    hero.textContent = v === 'b'
      ? 'I\u2019ve seen what goes wrong. Now I can help fix it.'
      : 'Built by a nurse, for real life';
    document.querySelectorAll('[data-track="cta-products"]').forEach(function (el) {
      el.setAttribute('data-track', 'cta-products-' + v);
    });
    track('hero-' + v + '-view');
  }

  // Click events on anything with data-track="name".
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-track]');
    if (el) track(el.getAttribute('data-track'));
  });
})();
