/* Basis-Helfer. Bewusst ES5 (kein let/const/=>), damit auch alte iPads
   (iOS 9/10/12) alles verstehen. */
(function () {
  var B = window.B = {};
  var E = B.E = window.EINSTELLUNGEN || {};

  B.$ = function (sel, root) { return (root || document).querySelector(sel); };
  B.el = function (tag, cls, eltern, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    if (eltern) eltern.appendChild(e);
    return e;
  };
  B.leeren = function (e) { while (e && e.firstChild) e.removeChild(e.firstChild); };
  B.zufall = function (a, b) { return a + Math.random() * (b - a); };
  B.ganz = function (a, b) { return Math.floor(B.zufall(a, b + 1)); };
  B.klemme = function (v, a, b) { return v < a ? a : (v > b ? b : v); };

  var ZAHLWORT = { 70: "Siebzig", 75: "Fünfundsiebzig", 78: "Achtundsiebzig", 79: "Neunundsiebzig",
                   80: "Achtzig", 81: "Einundachtzig", 85: "Fünfundachtzig", 90: "Neunzig" };

  // {HELD} {OMA} ... in Texten ersetzen
  B.ersetzen = function (s) {
    if (s === undefined || s === null) return "";
    var alter = E.alter || 79;
    return String(s)
      .replace(/\{HELD\}/g, E.held || "Kevin")
      .replace(/\{OMA\}/g, E.oma || "Omsi")
      .replace(/\{ADRESSE\}/g, E.adresse || "")
      .replace(/\{ABSENDER\}/g, E.absender || "Dein 007")
      .replace(/\{ALTER_WORT\}/g, ZAHLWORT[alter] || String(alter))
      .replace(/\{ALTER\}/g, String(alter));
  };

  B.jetzt = function () { return (window.performance && performance.now) ? performance.now() : Date.now(); };

  var raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame ||
            function (f) { return setTimeout(function () { f(B.jetzt()); }, 16); };
  var caf = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || clearTimeout;
  B.frame = function (f) { return raf(f); };
  B.frameStopp = function (id) { caf(id); };

  // Tippen/Klicken einheitlich (Klick reicht auf iOS, wenn das Element "cursor:pointer" hat)
  B.tippen = function (el, fn) {
    el.addEventListener("click", function (ev) { fn(ev); }, false);
  };

  // Bild laden mit Erfolg/Fehler (funktioniert auch unter file://)
  B.ladeBild = function (src, ok, fehler) {
    var img = new Image();
    img.onload = function () { if (ok) ok(img); };
    img.onerror = function () { if (fehler) fehler(img); };
    img.src = src;
    return img;
  };

  // Nummer mit führender Null in Pfad einsetzen: "seite-%02d.jpeg"
  B.pfad = function (muster, nr) {
    return muster.replace("%02d", (nr < 10 ? "0" : "") + nr);
  };

  // kleiner Speicher (per Gerät), mit Fehlerschutz (privater Modus etc.)
  B.merken = function (k, v) { try { window.localStorage.setItem("omsi." + k, JSON.stringify(v)); } catch (e) {} };
  B.erinnern = function (k, standard) {
    try { var v = window.localStorage.getItem("omsi." + k); return v === null ? standard : JSON.parse(v); }
    catch (e) { return standard; }
  };

  // CSS-Transform mit -webkit-Präfix setzen (alte iOS-Versionen)
  B.transform = function (el, t) { el.style.webkitTransform = t; el.style.transform = t; };
  B.transition = function (el, t) { el.style.webkitTransition = t; el.style.transition = t; };

  // Warten, bis eine CSS-Transition fertig ist (mit Sicherheits-Timeout)
  B.nachTransition = function (el, ms, fn) {
    var fertig = false;
    function ende() {
      if (fertig) return; fertig = true;
      el.removeEventListener("transitionend", ende); el.removeEventListener("webkitTransitionEnd", ende);
      fn();
    }
    el.addEventListener("transitionend", ende); el.addEventListener("webkitTransitionEnd", ende);
    setTimeout(ende, ms + 120);
  };

  B.hoch = function () { return window.innerHeight > window.innerWidth; };

  // Canvas scharf auf Retina-Displays
  B.canvasGroesse = function (cv, w, h) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    cv.style.width = w + "px"; cv.style.height = h + "px";
    var ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  };
})();
