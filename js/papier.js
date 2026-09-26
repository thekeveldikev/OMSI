/* Seidenpapier-Generator: erzeugt im Browser handbemaltes "Carle-Papier"
   (Grundfarbe + Pinselstriche + Tupfer + Körnung) als Canvas-Muster. */
(function () {
  var P = window.PAPIER = {};
  var cache = {};

  P.FARBEN = {
    blau: "#2c5fb0", hellblau: "#6fb3e3", tiefblau: "#1b2f6e", gelb: "#f5c518", orange: "#f07c16",
    rot: "#d8371c", rosa: "#ea8fa6", gruen: "#4c9b35", hellgruen: "#9cc93b", braun: "#8b5a2b",
    ocker: "#c89232", weiss: "#f4efe3", grau: "#8c9096", lila: "#6c4b9c", schwarz: "#2a2622",
    gold: "#e9b43c", creme: "#f7e9c4"
  };

  function hexZuHsl(hex) {
    hex = hex.replace("#", "");
    var r = parseInt(hex.substr(0, 2), 16) / 255, g = parseInt(hex.substr(2, 2), 16) / 255, b = parseInt(hex.substr(4, 2), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s * 100, l * 100];
  }
  function hsl(h, s, l, a) {
    return "hsla(" + ((h % 360 + 360) % 360).toFixed(0) + "," + Math.max(0, Math.min(100, s)).toFixed(0) + "%," +
      Math.max(0, Math.min(100, l)).toFixed(0) + "%," + (a === undefined ? 1 : a) + ")";
  }
  P.hsl = hsl;
  P.variante = function (farbe, dl, dh, a) {
    var c = hexZuHsl(P.FARBEN[farbe] || farbe);
    return hsl(c[0] + (dh || 0), c[1], c[2] + (dl || 0), a);
  };

  // Pseudo-Zufall mit Startwert, damit ein Papier immer gleich aussieht
  function rng(seed) {
    var x = seed || 1;
    return function () { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; };
  }
  function seedAus(text) { var h = 7; for (var i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 2147483647; return h || 1; }

  // Ein Blatt bemaltes Seidenpapier (Canvas, kachelbar genug für Muster)
  P.blatt = function (farbe, opt) {
    opt = opt || {};
    var groesse = opt.groesse || 256;
    var key = farbe + "|" + groesse + "|" + (opt.seed || 0) + "|" + (opt.akzent || "");
    if (cache[key]) return cache[key];
    var zufall = rng(seedAus(key));
    var cv = document.createElement("canvas");
    cv.width = cv.height = groesse;
    var c = cv.getContext("2d");
    var basis = hexZuHsl(P.FARBEN[farbe] || farbe);
    var akzent = opt.akzent ? hexZuHsl(P.FARBEN[opt.akzent] || opt.akzent) : null;

    c.fillStyle = hsl(basis[0], basis[1], basis[2]);
    c.fillRect(0, 0, groesse, groesse);

    // Hauptrichtung der Pinselstriche
    var winkel = zufall() * Math.PI;
    var i, n = Math.round(groesse * 0.45);
    c.lineCap = "round";
    for (i = 0; i < n; i++) {
      var hell = (zufall() - 0.5) * 34;
      var farbton = basis[0] + (zufall() - 0.5) * 16;
      var nimmAkzent = akzent && zufall() < 0.12;
      var ziel = nimmAkzent ? akzent : [farbton, basis[1], basis[2] + hell];
      c.strokeStyle = hsl(ziel[0], ziel[1] + (zufall() - 0.5) * 10, ziel[2], 0.18 + zufall() * 0.4);
      c.lineWidth = 1 + zufall() * zufall() * 16;
      var x = zufall() * groesse * 1.4 - groesse * 0.2, y = zufall() * groesse * 1.4 - groesse * 0.2;
      var len = groesse * (0.15 + zufall() * 0.55);
      var w = winkel + (zufall() - 0.5) * 0.6;
      var dx = Math.cos(w) * len, dy = Math.sin(w) * len;
      var welle = (zufall() - 0.5) * len * 0.5;
      c.beginPath();
      c.moveTo(x, y);
      c.bezierCurveTo(x + dx * 0.33 - dy * 0.1 + welle, y + dy * 0.33 + dx * 0.1,
                      x + dx * 0.66 + dy * 0.1, y + dy * 0.66 - dx * 0.1 - welle, x + dx, y + dy);
      c.stroke();
    }
    // Tupfer (Schwamm / Teppichstempel)
    for (i = 0; i < groesse * 0.2; i++) {
      c.fillStyle = hsl(basis[0] + (zufall() - 0.5) * 20, basis[1], basis[2] + (zufall() - 0.5) * 40, 0.08 + zufall() * 0.18);
      c.beginPath();
      c.ellipse ? c.ellipse(zufall() * groesse, zufall() * groesse, 1 + zufall() * 6, 1 + zufall() * 3, zufall() * 3, 0, Math.PI * 2)
                : c.arc(zufall() * groesse, zufall() * groesse, 1 + zufall() * 4, 0, Math.PI * 2);
      c.fill();
    }
    // feine Körnung
    for (i = 0; i < groesse * 3; i++) {
      c.fillStyle = zufall() < 0.5 ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.07)";
      c.fillRect(zufall() * groesse, zufall() * groesse, 1, 1);
    }
    cache[key] = cv;
    return cv;
  };

  P.muster = function (ctx, farbe, opt) {
    var key = "m|" + farbe + "|" + JSON.stringify(opt || {});
    if (!ctx.__muster) ctx.__muster = {};
    if (!ctx.__muster[key]) ctx.__muster[key] = ctx.createPattern(P.blatt(farbe, opt), "repeat");
    return ctx.__muster[key];
  };

  var urlCache = {};
  P.url = function (farbe, opt) {
    var key = farbe + "|" + JSON.stringify(opt || {});
    if (!urlCache[key]) urlCache[key] = P.blatt(farbe, opt).toDataURL("image/png");
    return urlCache[key];
  };

  // Element mit Seidenpapier hinterlegen
  P.hinterlegen = function (el, farbe, opt) {
    el.style.backgroundImage = "url(" + P.url(farbe, opt) + ")";
    el.style.backgroundSize = ((opt && opt.kachel) || 256) + "px";
    el.style.backgroundRepeat = "repeat";
    el.style.backgroundPosition = "0 0";
  };

  // Schrift mit Seidenpapier "füllen" (Titel, Geräuschwörter)
  P.schriftFuellen = function (el, farbe, opt) {
    el.style.backgroundImage = "url(" + P.url(farbe, opt) + ")";
    el.style.backgroundSize = "180px";
    el.style.webkitBackgroundClip = "text";
    el.style.backgroundClip = "text";
    el.style.webkitTextFillColor = "transparent";
    el.style.color = "transparent";
  };

  // Unregelmäßiges "gerissenes" Papierstück als Pfad
  P.risspfad = function (ctx, cx, cy, rx, ry, zacken, seed) {
    var z = rng(seed || 3);
    var n = zacken || 11;
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2;
      var f = 0.78 + z() * 0.3;
      var x = cx + Math.cos(a) * rx * f, y = cy + Math.sin(a) * ry * f;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };

  // Tropfenförmige Papierflamme (Spitze oben), h = Höhe, b = Breite
  P.flammenpfad = function (ctx, x, y, b, h, neigung) {
    var n = neigung || 0;
    ctx.beginPath();
    ctx.moveTo(x - b / 2, y);
    ctx.bezierCurveTo(x - b / 2, y - h * 0.45, x - b * 0.1 + n * 0.5, y - h * 0.7, x + n, y - h);
    ctx.bezierCurveTo(x + b * 0.15 + n * 0.5, y - h * 0.65, x + b / 2, y - h * 0.4, x + b / 2, y);
    ctx.closePath();
  };
})();
