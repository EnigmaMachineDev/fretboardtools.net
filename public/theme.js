/*
 * Light / dark theme, loaded as a plain blocking <script> in <head> so the
 * right palette is in place before the first paint (no flash of the wrong
 * theme). The preference is "system" (follow the OS, the default), "light" or
 * "dark", kept in localStorage; the resolved theme is written to
 * <html data-theme="light|dark">, which the stylesheet keys its colors off.
 *
 * window.siteTheme = { get(), set(pref), resolved(), subscribe(fn) } is the
 * only API — toggles call set() and re-render on subscribe().
 */
(function () {
  var KEY = 'theme';
  var PREFS = ['system', 'light', 'dark'];
  var media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var listeners = [];

  function read() {
    try {
      var v = window.localStorage.getItem(KEY);
      return PREFS.indexOf(v) >= 0 ? v : 'system';
    } catch (e) {
      return 'system';
    }
  }

  var pref = read();

  function resolved() {
    if (pref === 'light' || pref === 'dark') return pref;
    return media && media.matches ? 'dark' : 'light';
  }

  function apply() {
    var root = document.documentElement;
    var theme = resolved();
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-theme-pref', pref);
    root.style.colorScheme = theme;
    for (var i = 0; i < listeners.length; i++) listeners[i](pref, theme);
  }

  function onSystemChange() {
    if (pref === 'system') apply();
  }
  if (media) {
    if (media.addEventListener) media.addEventListener('change', onSystemChange);
    else if (media.addListener) media.addListener(onSystemChange);
  }

  window.siteTheme = {
    get: function () {
      return pref;
    },
    resolved: resolved,
    set: function (next) {
      if (PREFS.indexOf(next) < 0) return;
      pref = next;
      try {
        if (next === 'system') window.localStorage.removeItem(KEY);
        else window.localStorage.setItem(KEY, next);
      } catch (e) {
        /* storage blocked: the choice lasts for this page only */
      }
      apply();
    },
    subscribe: function (fn) {
      listeners.push(fn);
      return function () {
        listeners = listeners.filter(function (l) {
          return l !== fn;
        });
      };
    },
  };

  apply();
})();
