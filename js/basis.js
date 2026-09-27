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
    var alter = E.alter || 78;
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

  // ───────────── Eigene Symbole (SVG statt Emoji) ─────────────
  // iOS malt ▶ ⬇ 🕯 🎤 … als bunte Emoji-Kästchen. Deshalb zeichnen wir alle Symbole selbst:
  // runde Striche in der Schriftfarbe (currentColor), damit sie zu jedem Knopf passen.
  // Klasse "f" = zusätzlich gefüllt.
  var IKONEN = {
    abspielen: '<path class="f" d="M8.3 5.4l10.4 6.6-10.4 6.6z"/>',
    stopp:     '<rect class="f" x="6.6" y="6.6" width="10.8" height="10.8" rx="1.6"/>',
    pause:     '<rect class="f" x="6.6" y="5.6" width="3.2" height="12.8" rx="1"/><rect class="f" x="14.2" y="5.6" width="3.2" height="12.8" rx="1"/>',
    haus:      '<path d="M3.8 11.6L12 4.4l8.2 7.2"/><path d="M6.4 9.6v9.6h11.2V9.6"/><path d="M10.2 19.2v-4.8h3.6v4.8"/>',
    note:      '<path d="M14.6 16.2V4.6c1.6 2.2 4.2 2.8 4.2 5.8"/><ellipse class="f" cx="11.4" cy="16.6" rx="3.1" ry="2.4" transform="rotate(-22 11.4 16.6)"/>',
    noten:     '<path d="M8.6 17V6.4l10.2-2.2v10.6"/><path d="M8.6 9.6l10.2-2.2"/><ellipse class="f" cx="6.4" cy="17.2" rx="2.5" ry="1.9" transform="rotate(-22 6.4 17.2)"/><ellipse class="f" cx="16.6" cy="15" rx="2.5" ry="1.9" transform="rotate(-22 16.6 15)"/>',
    nochmal:   '<path d="M5.2 12a6.8 6.8 0 1 0 2-4.8"/><path d="M6.6 3.6v4.2h4.2"/>',
    wieder:    '<path d="M18.8 12a6.8 6.8 0 1 1-2-4.8"/><path d="M17.4 3.6v4.2h-4.2"/>',
    zurueck:   '<path d="M5.4 10.4h8.8a4.6 4.6 0 0 1 0 9.2H11"/><path d="M9 6.8l-3.6 3.6L9 14"/>',
    vor:       '<path d="M18.6 10.4H9.8a4.6 4.6 0 0 0 0 9.2H13"/><path d="M15 6.8l3.6 3.6L15 14"/>',
    laden:     '<path d="M12 4v10.6"/><path d="M7.6 10.4l4.4 4.4 4.4-4.4"/><path d="M5 19.4h14"/>',
    haken:     '<path d="M5 12.6l4.4 4.4L19 7.4"/>',
    drucker:   '<path d="M7.2 8.8V4h9.6v4.8"/><path d="M7.2 16.4H4.6a1.2 1.2 0 0 1-1.2-1.2v-5.2a1.2 1.2 0 0 1 1.2-1.2h14.8a1.2 1.2 0 0 1 1.2 1.2v5.2a1.2 1.2 0 0 1-1.2 1.2h-2.6"/><path d="M7.2 13.4h9.6V20H7.2z"/>',
    mikro:     '<rect x="9" y="3.4" width="6" height="10.6" rx="3"/><path d="M5.8 11.2a6.2 6.2 0 0 0 12.4 0"/><path d="M12 17.4v3.2"/><path d="M8.8 20.6h6.4"/>',
    kerze:     '<rect x="8.8" y="11" width="6.4" height="9.6" rx="1"/><path d="M12 11V9.2"/><path class="f" d="M12 2.8c1.6 1.8 2.3 2.9 2.3 4a2.3 2.3 0 0 1-4.6 0c0-1.1.7-2.2 2.3-4z"/>',
    wind:      '<path d="M3.6 9.2h9.6a2.8 2.8 0 1 0-2.8-2.8"/><path d="M3.6 13h13.2a2.8 2.8 0 1 1-2.8 2.8"/><path d="M3.6 16.8h5.2"/>',
    stern:     '<path class="f" d="M12 3.8l2.5 5.2 5.6.7-4.1 3.9 1 5.6L12 16.5l-5 2.7 1-5.6-4.1-3.9 5.6-.7z"/>',
    kreuz:     '<path d="M6.4 6.4l11.2 11.2"/><path d="M17.6 6.4L6.4 17.6"/>',
    mond:      '<path d="M15.8 4.2a8 8 0 1 0 4.4 12.4 6.6 6.6 0 0 1-4.4-12.4z"/>',
    herz:      '<path d="M12 19.6s-7.6-4.6-7.6-10.2a4.2 4.2 0 0 1 7.6-2.5 4.2 4.2 0 0 1 7.6 2.5c0 5.6-7.6 10.2-7.6 10.2z"/>',
    herzVoll:  '<path class="f" d="M12 19.6s-7.6-4.6-7.6-10.2a4.2 4.2 0 0 1 7.6-2.5 4.2 4.2 0 0 1 7.6 2.5c0 5.6-7.6 10.2-7.6 10.2z"/>',
    funkel:    '<path class="f" d="M12 3.4c.7 4.6 3.8 7.8 8.6 8.6-4.8.8-7.9 4-8.6 8.6-.7-4.6-3.8-7.8-8.6-8.6 4.8-.8 7.9-4 8.6-8.6z"/>',
    runter:    '<path d="M12 4.6v14.4"/><path d="M6.8 13.8L12 19l5.2-5.2"/>',
    hoch:      '<path d="M12 19.4V5"/><path d="M6.8 10.2L12 5l5.2 5.2"/>',
    schraeg:   '<path d="M6.8 17.2L17.2 6.8"/><path d="M8.8 6.8h8.4v8.4"/>',
    lautsprecher: '<path class="f" d="M4.2 9.4h3.4l4.6-4v13.2l-4.6-4H4.2z"/><path d="M15.4 9.2a4 4 0 0 1 0 5.6"/><path d="M17.8 6.6a7.6 7.6 0 0 1 0 10.8"/>',
    stumm:     '<path class="f" d="M4.2 9.4h3.4l4.6-4v13.2l-4.6-4H4.2z"/><path d="M15.6 9.4l5.2 5.2"/><path d="M20.8 9.4l-5.2 5.2"/>'
  };
  // Zeichen → Symbol (auch für Module anderer Autoren: siehe Wächter unten)
  var ZEICHEN = { "▶": "abspielen", "►": "abspielen", "■": "stopp", "⏹": "stopp", "Ⅱ": "pause", "⏸": "pause", "⌂": "haus",
    "♪": "note", "♫": "noten", "♬": "noten", "↺": "nochmal", "↻": "wieder", "↶": "zurueck", "↷": "vor", "⬇": "laden",
    "✓": "haken", "✔": "haken", "🖨": "drucker", "🎤": "mikro", "🕯": "kerze", "🌬": "wind",
    "★": "stern", "⭐": "stern", "✕": "kreuz", "✖": "kreuz", "☾": "mond", "♡": "herz", "♥": "herzVoll", "❤": "herzVoll",
    "✦": "funkel", "↓": "runter", "↑": "hoch", "↗": "schraeg" };
  var zeichenMuster = new RegExp("(" + Object.keys(ZEICHEN).sort(function (a, b) { return b.length - a.length; })
    .map(function (z) { return z.replace(/[\^$\\.*+?()[\]{}|]/g, "\\$&"); }).join("|") + ")[︎️]?");
  var ikonenVorlage = document.createElement("div");

  B.ikon = function (name) {
    ikonenVorlage.innerHTML = '<svg class="ikon ikon-' + name + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
                              (IKONEN[name] || "") + "</svg>";
    return ikonenVorlage.removeChild(ikonenVorlage.firstChild);
  };
  // Knopf-Inhalt setzen: Symbol + Text (statt knopf.textContent = "▶ Vorlesen")
  B.knopf = function (el, ikon, text) {
    B.leeren(el);
    if (ikon) el.appendChild(B.ikon(ikon));
    if (text) B.el("span", "ikon-text", el, text);
    return el;
  };

  // Wächter: ersetzt übrig gebliebene Symbolzeichen in Textknoten durch die gezeichneten Symbole
  // (greift auch bei Radio, Brief, Making-of … ohne deren Dateien anzufassen)
  function textKnotenUmbauen(knoten) {
    var t = knoten.nodeValue, m = zeichenMuster.exec(t);
    if (!m) return;
    var eltern = knoten.parentNode;
    if (!eltern || /^(SCRIPT|STYLE|TEXTAREA|INPUT|OPTION|TITLE)$/i.test(eltern.nodeName) ||
        (eltern.namespaceURI && eltern.namespaceURI.indexOf("svg") >= 0)) return;
    var frag = document.createDocumentFragment();
    while (m) {
      if (m.index > 0) frag.appendChild(document.createTextNode(t.slice(0, m.index)));
      frag.appendChild(B.ikon(ZEICHEN[m[1]]));
      t = t.slice(m.index + m[0].length);
      m = zeichenMuster.exec(t);
    }
    if (t) frag.appendChild(document.createTextNode(t));
    eltern.replaceChild(frag, knoten);
  }
  function durchsuchen(wurzel) {
    if (!wurzel) return;
    if (wurzel.nodeType === 3) { textKnotenUmbauen(wurzel); return; }
    if (wurzel.nodeType !== 1 && wurzel.nodeType !== 11) return;
    if (!zeichenMuster.test(wurzel.textContent || "")) return;
    var gang = document.createTreeWalker(wurzel, 4, null, false), liste = [], k;
    while ((k = gang.nextNode())) liste.push(k);
    liste.forEach(textKnotenUmbauen);
  }
  B.symboleUmbauen = durchsuchen;
  function waechterStarten() {
    durchsuchen(document.body);
    if (!window.MutationObserver) return;
    new MutationObserver(function (aenderungen) {
      aenderungen.forEach(function (a) {
        if (a.type === "characterData") textKnotenUmbauen(a.target);
        else for (var i = 0; i < a.addedNodes.length; i++) durchsuchen(a.addedNodes[i]);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) waechterStarten();
  else document.addEventListener("DOMContentLoaded", waechterStarten);
})();
