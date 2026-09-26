/* Bonus-Spiel "Pfannkuchen wenden" (Karte in Omsis Küche).
   Teig in die Pfanne – die Unterseite bräunt ganz langsam: hell → goldgelb → braun → knusprig.
   Tippen (irgendwo oder auf "Wenden!"): im goldenen Fenster fliegt der Pfannkuchen hoch, dreht
   sich und landet; zu früh bleibt er liegen ("Noch ein bisschen …"), zu spät ist er "etwas
   knusprig – macht nichts!". Nach drei Pfannkuchen: Stapel mit Marmelade und Papierkonfetti.
   Ruhiges Tempo, große Tippfläche, nie gemein. Bewusst ES5 (alte iPads). */
(function () {
  var SP = window.SPIEL = {};
  var z = null;   // das laufende Spiel

  // Backzeit in Sekunden: bis 3,5 s hell, dann 2,8 s goldgelb, dann braun, ab 9,5 s knusprig
  var ZEIT = { gold: 3.5, braun: 6.3, knusprig: 9.5, ende: 12.5 };
  var DAUER = { teig: 1.8, flug: 1.5, lob: 2.4, rutschen: 1.0, schluss: 1.3, marmelade: 0.55 };
  var ANZAHL = 3;
  var FLACH = 0.55;   // so flach liegt ein Pfannkuchen in der Pfanne (Blickwinkel von schräg oben)
  var VERSATZ = [0, 0.05, -0.04, 0.02];   // die Pfannkuchen liegen nicht ganz genau übereinander
  var STUFEN = [
    { name: "hell", farbe: [243, 226, 170], hinweis: "Er bäckt … warte, bis er unten goldgelb ist." },
    { name: "goldgelb", farbe: [233, 180, 60], hinweis: "Goldgelb! Jetzt tippen und wenden." },
    { name: "braun", farbe: [168, 102, 42], hinweis: "Tipp einfach auf „Wenden!“" },
    { name: "knusprig", farbe: [92, 54, 22], hinweis: "Tipp einfach auf „Wenden!“" }
  ];
  var LOB = ["Goldgelb! Wie bei {OMA}!", "Wunderbar goldgelb!", "Goldgelb – genau richtig!"];

  // Der gemalte Papier-Pfannkuchen – einmal als roher Teig (Oberseite) und in vier Bräunungsstufen
  var KUCHEN = { src: "bilder/extras/pfannekuchen-flug.png", roh: null, seiten: null };
  function toenen(img, farbe) {
    var b = img.naturalWidth || img.width, h = img.naturalHeight || img.height, c = document.createElement("canvas");
    c.width = b; c.height = h;
    var x = c.getContext("2d");
    x.drawImage(img, 0, 0, b, h);
    if (farbe) { x.globalCompositeOperation = "source-atop"; x.fillStyle = farbe; x.fillRect(0, 0, b, h); }
    return c;
  }
  B.ladeBild(KUCHEN.src, function (img) {
    try {
      KUCHEN.roh = toenen(img, "rgba(250,241,212,0.8)");
      KUCHEN.seiten = [toenen(img, "rgba(250,236,192,0.6)"), toenen(img, null),
                       toenen(img, "rgba(118,56,14,0.52)"), toenen(img, "rgba(58,28,10,0.74)")];
    } catch (e) { KUCHEN.roh = KUCHEN.seiten = null; }
  });

  // ── kleine Rechenhelfer ──
  function klemme(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function sanft(p) { p = klemme(p); return p * p * (3 - 2 * p); }
  function raus(p) { p = klemme(p); return 1 - (1 - p) * (1 - p); }
  function mix(a, b, p) { return a + (b - a) * p; }
  // Bräunung 0 (hell) … 1 (goldgelb) … 2 (braun) … 3 (knusprig) – stetig, im goldenen Fenster fast still
  function braeune(t) {
    if (t <= ZEIT.gold) return 0.8 * t / ZEIT.gold;
    if (t <= ZEIT.braun) return 0.8 + 0.4 * (t - ZEIT.gold) / (ZEIT.braun - ZEIT.gold);
    if (t <= ZEIT.knusprig) return 1.2 + 0.8 * (t - ZEIT.braun) / (ZEIT.knusprig - ZEIT.braun);
    return Math.min(3, 2 + (t - ZEIT.knusprig) / (ZEIT.ende - ZEIT.knusprig));
  }
  function stufeBei(t) { return t < ZEIT.gold ? 0 : (t <= ZEIT.braun ? 1 : (t <= ZEIT.knusprig ? 2 : 3)); }
  function farbeBei(s) {
    var i = Math.min(2, Math.floor(s)), f = klemme(s - i), a = STUFEN[i].farbe, b = STUFEN[i + 1].farbe;
    return "rgb(" + Math.round(mix(a[0], b[0], f)) + "," + Math.round(mix(a[1], b[1], f)) + "," + Math.round(mix(a[2], b[2], f)) + ")";
  }
  function zufallsFolge(seed) { var x = seed || 1; return function () { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }

  // Pfannkuchen zeichnen: r = halbe Breite, k = wie flach (negativ = Unterseite oben, gespiegelt),
  // roh = rohe Oberseite zeigen, s = Bräunung der Unterseite, dreh = Neigung
  function kuchen(c, x, y, r, k, roh, s, dreh) {
    var ak = Math.max(0.1, Math.abs(k)), sk = k < 0 ? -ak : ak;
    c.save(); c.translate(x, y); if (dreh) c.rotate(dreh);
    if (!KUCHEN.seiten) {   // Ersatz ohne Bild: Seidenpapier-Scheibe
      c.beginPath(); c.ellipse(0, 0, r, r * 0.65 * ak, 0, 0, Math.PI * 2);
      c.fillStyle = roh ? PAPIER.muster(c, "creme") : farbeBei(s); c.fill();
      c.restore(); return;
    }
    var bild = KUCHEN.seiten[0], b = bild.width, h = bild.height, m = 2 * r / b;
    c.scale(m, m * sk);
    if (roh) c.drawImage(KUCHEN.roh, -b / 2, -h / 2, b, h);
    else {
      var i = Math.min(3, Math.floor(s)), f = s - i;
      c.drawImage(KUCHEN.seiten[i], -b / 2, -h / 2, b, h);
      if (i < 3 && f > 0.02) { c.globalAlpha = f; c.drawImage(KUCHEN.seiten[i + 1], -b / 2, -h / 2, b, h); }
    }
    c.restore();
  }

  // 5-zackiger Papierstern
  function sternpfad(c, x, y, r, dreh) {
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var a = dreh + i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
      if (i === 0) c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    c.closePath();
  }

  SP.starten = function (ziel, zurueck) {
    KLANG.entsperren();
    SP.stoppen();
    var seite = B.el("div", "spiel-bildschirm", ziel);
    PAPIER.hinterlegen(seite, "creme", { kachel: 320, seed: 4 });
    var cv = B.el("canvas", "spiel-canvas", seite);
    var kopf = B.el("div", "spiel-kopf", seite);
    var titel = B.el("div", "spiel-titel", kopf, "Pfannkuchen wenden");
    PAPIER.schriftFuellen(titel, "rot", { akzent: "orange" });
    var hinweis = B.el("div", "spiel-hinweis", kopf, "");
    var zaehler = B.el("div", "spiel-zaehler", seite, "");
    var zurueckKnopf = B.el("button", "knopf spiel-zurueck", seite, "⌂ Zur Küche");

    // unten: Bräunungs-Leiste (der Kreis zeigt, wie die Unterseite gerade aussieht) + großer Knopf
    var fuss = B.el("div", "spiel-fuss", seite);
    var skala = B.el("div", "spiel-skala", fuss);
    B.el("div", "spiel-skala-titel", skala, "So sieht er unten aus:");
    var bahn = B.el("div", "spiel-bahn", skala);
    var leiste = B.el("div", "spiel-leiste", bahn);
    var grenzen = [0, ZEIT.gold, ZEIT.braun, ZEIT.knusprig, ZEIT.ende], felder = [];
    STUFEN.forEach(function (st, i) {
      var f = B.el("div", "spiel-stufe stufe-" + i + (i >= 2 ? " dunkel" : ""), leiste, i === 1 ? "★ " + st.name : st.name);
      f.style.width = (100 * (grenzen[i + 1] - grenzen[i]) / ZEIT.ende) + "%";
      PAPIER.hinterlegen(f, ["creme", "gold", "braun", "#5c3616"][i], { kachel: 160, seed: 11 + i });
      felder.push(f);
    });
    var zeiger = B.el("div", "spiel-zeiger", bahn);
    var wendenKnopf = B.el("button", "knopf gross spiel-wenden", fuss, "Wenden!");
    var ende = B.el("div", "spiel-ende", seite);

    var W = 0, H = 0, ctx = null, G = null;

    function aufbauen() {
      W = seite.clientWidth; H = seite.clientHeight;
      if (!W || !H) return;
      ctx = B.canvasGroesse(cv, W, H);
      var hoch = H > W * 1.05;
      var oben = kopf.offsetTop + kopf.offsetHeight + 6, unten = fuss.offsetTop - 6;
      var platz = Math.max(H * 0.35, unten - oben);
      var R = hoch ? Math.min(W * 0.27, platz * 0.3) : Math.min(W * 0.2, platz * 0.42);
      var cx = hoch ? W * 0.5 : W * 0.42, cy = unten - R * 0.98;   // darunter: Wand, Flammen, Brenner
      G = { oben: oben, unten: unten, hoch: hoch,
            P: { cx: cx, cy: cy, R: R, ry: R * 0.36, d: R * 0.17 },
            T: hoch ? { x: W * 0.8, y: oben + platz * 0.22, R: R * 0.46 }
                    : { x: Math.min(W * 0.8, cx + R * 2.3), y: cy + R * 0.3, R: R * 0.56 },
            E: null };
      // Schlussbild: der Stapel groß in der Mitte zwischen Überschrift und Knöpfen
      var eOben = oben + H * 0.03, eUnten = H * 0.94 - 90, eR = Math.min(W * (hoch ? 0.3 : 0.22), (eUnten - eOben) * 0.42);
      G.E = { x: W / 2, y: (eOben + eUnten) / 2 + eR * 0.22, R: eR };
      lob.style.top = (oben + (hoch ? platz * 0.3 : 4)) + "px";
    }

    // ── Pfanne über Papierflammen ──
    function pfanneZeichnen(c, pf, uhr, alpha) {
      var R = pf.R, ry = pf.ry, d = pf.d, cx = pf.cx + pf.dx, cy = pf.cy + pf.dy;
      var fussY = pf.cy + d + ry + R * 0.26;   // Brenner (bewegt sich nicht mit)
      c.save(); c.globalAlpha = alpha;
      c.beginPath(); c.ellipse(pf.cx, fussY + R * 0.03, R * 0.8, R * 0.09, 0, 0, Math.PI * 2);
      c.fillStyle = PAPIER.muster(c, "grau"); c.fill();
      for (var i = 0; i < 7; i++) {
        var fx = pf.cx + (i - 3) * R * 0.21, wackel = Math.sin(uhr * (4.2 + i * 0.7) + i * 1.9);
        var fh = R * (0.4 + (i % 2) * 0.07 + 0.05 * wackel);
        PAPIER.flammenpfad(c, fx, fussY, R * 0.18, fh, wackel * R * 0.035);
        c.fillStyle = PAPIER.muster(c, "orange", { akzent: "rot" }); c.fill();
        PAPIER.flammenpfad(c, fx, fussY, R * 0.09, fh * 0.55, wackel * R * 0.02);
        c.fillStyle = PAPIER.muster(c, "gelb"); c.fill();
      }
      // Stiel nach links hinten (Metall, dann Holzgriff)
      c.save(); c.translate(cx - R * 0.94, cy + ry * 0.05); c.rotate(0.36);
      var L = R * 0.72, th = R * 0.11;
      c.fillStyle = PAPIER.muster(c, "schwarz"); c.fillRect(-L * 0.4, -th * 0.35, L * 0.4 + R * 0.05, th * 0.7);
      c.beginPath(); c.moveTo(-L * 0.36, -th / 2); c.lineTo(-L + th / 2, -th / 2); c.arc(-L + th / 2, 0, th / 2, -Math.PI / 2, Math.PI / 2, true);
      c.lineTo(-L * 0.36, th / 2); c.closePath(); c.fillStyle = PAPIER.muster(c, "braun", { akzent: "ocker" }); c.fill();
      c.restore();
      // Wand vorne
      c.beginPath();
      c.ellipse(cx, cy + d, R * 0.92, ry * 0.92, 0, 0, Math.PI);
      c.lineTo(cx - R, cy);
      c.ellipse(cx, cy, R, ry, 0, Math.PI, 0, true);
      c.closePath(); c.fillStyle = PAPIER.muster(c, "schwarz"); c.fill();
      c.fillStyle = "rgba(0,0,0,0.25)"; c.fill();
      // Rand und Boden
      c.beginPath(); c.ellipse(cx, cy, R, ry, 0, 0, Math.PI * 2); c.fillStyle = PAPIER.muster(c, "schwarz", { akzent: "grau" }); c.fill();
      c.lineWidth = Math.max(1.5, R * 0.012); c.strokeStyle = "rgba(255,255,255,0.22)"; c.stroke();
      c.beginPath(); c.ellipse(cx, cy + ry * 0.06, R * 0.9, ry * 0.84, 0, 0, Math.PI * 2);
      c.fillStyle = PAPIER.muster(c, "schwarz"); c.fill();
      c.fillStyle = "rgba(0,0,0,0.3)"; c.fill();
      c.restore();
    }

    // ── Teller mit dem Stapel ──
    function tellerZeichnen(c, T, stapel) {
      c.beginPath(); c.ellipse(T.x, T.y + T.R * 0.06, T.R, T.R * 0.36, 0, 0, Math.PI * 2);
      c.fillStyle = PAPIER.muster(c, "weiss"); c.fill();
      c.lineWidth = T.R * 0.07; c.strokeStyle = PAPIER.muster(c, "blau"); c.stroke();
      c.beginPath(); c.ellipse(T.x, T.y + T.R * 0.06, T.R * 0.7, T.R * 0.24, 0, 0, Math.PI * 2);
      c.lineWidth = Math.max(1.5, T.R * 0.02); c.strokeStyle = "rgba(27,47,110,0.28)"; c.stroke();
      var r = T.R * 0.78, tp = T.R * 0.1;
      stapel.forEach(function (k, i) {
        var y = T.y - i * tp - tp * 0.3, x = T.x + VERSATZ[i % 4] * r;
        c.beginPath(); c.ellipse(x, y + tp * 0.55, r * 0.97, r * FLACH * 0.64, 0, 0, Math.PI * 2);
        c.fillStyle = PAPIER.muster(c, "ocker", { akzent: "braun" }); c.fill();
        kuchen(c, x, y, r, -FLACH, false, k.s, 0);
      });
    }
    function stapelOben(T, n) { return { x: T.x + VERSATZ[n % 4] * T.R * 0.78, y: T.y - n * T.R * 0.1 - T.R * 0.03, r: T.R * 0.78 }; }

    // Marmelade plumpst auf den fertigen Stapel
    function marmelade(c, T, tm) {
      if (tm < 0) return;
      var o = stapelOben(T, z.stapel.length - 1), r = o.r;
      if (tm < DAUER.marmelade) {   // fällt
        var p = tm / DAUER.marmelade, fy = mix(o.y - T.R * 1.6, o.y, p * p);
        c.beginPath(); c.ellipse(o.x, fy, r * 0.16, r * 0.2, 0, 0, Math.PI * 2);
        c.fillStyle = PAPIER.muster(c, "rot", { akzent: "rosa" }); c.fill();
        return;
      }
      var q = tm - DAUER.marmelade, gr = q < 0.3 ? 0.35 + 0.75 * raus(q / 0.3) : 1.1 - 0.1 * klemme((q - 0.3) / 0.2);
      var tropf = raus(q / 1.2);
      c.save(); c.fillStyle = PAPIER.muster(c, "rot", { akzent: "rosa" });
      [-0.55, -0.15, 0.4].forEach(function (a, i) {   // Nasen über den vorderen Rand
        var w = Math.PI / 2 + a, tx = o.x + Math.cos(w) * r * 0.5 * gr, ty = o.y + Math.sin(w) * r * FLACH * 0.65 * 0.5 * gr;
        c.beginPath(); c.ellipse(tx, ty + r * 0.05 * tropf * (1 + i % 2), r * 0.07, r * (0.06 + 0.09 * tropf * (1 + i % 2)), 0, 0, Math.PI * 2); c.fill();
      });
      PAPIER.risspfad(c, o.x, o.y - r * 0.02, r * 0.55 * gr, r * FLACH * 0.65 * 0.6 * gr, 15, 7); c.fill();
      c.beginPath(); c.ellipse(o.x - r * 0.15, o.y - r * 0.07, r * 0.12 * gr, r * 0.035 * gr, -0.2, 0, Math.PI * 2);
      c.fillStyle = "rgba(255,255,255,0.45)"; c.fill();
      c.restore();
    }

    // Schöpfkelle gießt den Teig ein
    function kelle(c, P, p, mitte) {
      var a = p < 0.12 ? p / 0.12 : (p > 0.8 ? klemme((1 - p) / 0.2) : 1);
      var kx = P.cx + P.R * 0.12, ky = P.cy - P.R * 0.98, kipp = 0.15 + 0.75 * sanft(p / 0.3);
      var lippeX = kx - Math.cos(kipp) * P.R * 0.2, lippeY = ky + Math.sin(kipp) * P.R * 0.2;
      c.save(); c.globalAlpha = a;
      if (p > 0.18 && p < 0.78) {   // Teigstrahl
        var b = P.R * 0.05 * Math.sin(klemme((p - 0.18) / 0.6) * Math.PI);
        c.beginPath(); c.moveTo(lippeX - b, lippeY); c.lineTo(lippeX + b * 0.6, lippeY);
        c.quadraticCurveTo(mitte.x + b * 0.4, mitte.y - P.R * 0.3, mitte.x + b, mitte.y);
        c.lineTo(mitte.x - b, mitte.y); c.quadraticCurveTo(mitte.x - b, mitte.y - P.R * 0.3, lippeX - b, lippeY);
        c.fillStyle = PAPIER.muster(c, "creme"); c.fill();
      }
      c.beginPath(); c.moveTo(kx + P.R * 0.14, ky - P.R * 0.04); c.lineTo(kx + P.R * 0.75, ky - P.R * 0.6);
      c.lineWidth = P.R * 0.05; c.lineCap = "round"; c.strokeStyle = PAPIER.muster(c, "grau"); c.stroke();
      c.translate(kx, ky); c.rotate(-kipp);
      c.beginPath(); c.ellipse(0, 0, P.R * 0.2, P.R * 0.14, 0, 0, Math.PI); c.closePath();
      c.fillStyle = PAPIER.muster(c, "grau", { akzent: "weiss" }); c.fill();
      if (p < 0.55) { c.beginPath(); c.ellipse(0, 0, P.R * 0.19, P.R * 0.045, 0, 0, Math.PI * 2); c.fillStyle = PAPIER.muster(c, "creme"); c.fill(); }
      c.restore();
    }

    // Bläschen im Teig (werden mehr, je länger er bäckt – wie echt)
    function blasen(c, x, y, r, t, seed) {
      var zf = zufallsFolge(seed * 97 + 5), n = Math.min(14, Math.floor(t * 2.6));
      c.save();
      for (var i = 0; i < 14; i++) {
        var a = zf() * Math.PI * 2, d = Math.sqrt(zf()) * r * 0.7, br = r * (0.022 + zf() * 0.03);
        if (i >= n) continue;
        var bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d * 0.65 * FLACH;
        c.beginPath(); c.ellipse(bx, by, br, br * FLACH, 0, 0, Math.PI * 2);
        c.fillStyle = "rgba(196,160,96,0.38)"; c.fill();
        c.lineWidth = 1.2; c.strokeStyle = "rgba(140,98,50,0.35)"; c.stroke();
      }
      c.restore();
    }

    // zarte Papier-Rauchwölkchen, wenn es knusprig wird
    function rauch(c, x, y, r, staerke, uhr) {
      if (staerke <= 0) return;
      c.save();
      for (var i = 0; i < 3; i++) {
        var ph = (uhr * 0.35 + i / 3) % 1, rx = x + (i - 1) * r * 0.55 + Math.sin(ph * 6 + i) * r * 0.08, ry = y - ph * r * 1.3;
        c.globalAlpha = 0.4 * staerke * Math.sin(ph * Math.PI);
        PAPIER.risspfad(c, rx, ry, r * (0.1 + ph * 0.12), r * (0.08 + ph * 0.09), 9, i + 2);
        c.fillStyle = PAPIER.muster(c, "grau", { akzent: "weiss" }); c.fill();
      }
      c.restore();
    }

    function zeichnen() {
      if (!ctx || !G) return;
      var c = ctx, P = G.P, ph = z.phase, t = z.uhr - z.seit;
      c.clearRect(0, 0, W, H);
      var pf = { cx: P.cx, cy: P.cy, R: P.R, ry: P.ry, d: P.d, dx: 0, dy: 0 };
      if (ph === "flug" && t < 0.3) pf.dy = -P.R * 0.1 * Math.sin(t / 0.3 * Math.PI);          // Schwung
      if (ph === "gelandet" && t < 0.35) pf.dy = P.R * 0.05 * Math.sin(t / 0.35 * Math.PI);    // federt
      var fq = (z.uhr - z.fruehSeit) / 0.5, hopser = 0;
      if (fq >= 0 && fq < 1) { pf.dx = Math.sin(fq * Math.PI * 4) * P.R * 0.025 * (1 - fq); hopser = -P.R * 0.1 * Math.sin(fq * Math.PI); }
      var pfAlpha = ph === "schluss" ? Math.max(0, 1 - t / 0.8) : 1;
      if (pfAlpha > 0) pfanneZeichnen(c, pf, z.uhr, pfAlpha);

      var T = G.T;
      if (ph === "schluss") { var q = sanft(t / DAUER.schluss); T = { x: mix(G.T.x, G.E.x, q), y: mix(G.T.y, G.E.y, q), R: mix(G.T.R, G.E.R, q) }; }
      tellerZeichnen(c, T, z.stapel);
      if (ph === "schluss") marmelade(c, T, t - DAUER.schluss);

      var r = P.R * 0.7, mx = pf.cx + pf.dx, my = pf.cy + pf.dy + P.ry * 0.06, seed = z.runde * 3 + z.stapel.length + 1;
      if (ph === "teig") {
        var p = t / DAUER.teig, g = raus((p - 0.2) / 0.65);
        if (g > 0) kuchen(c, mx, my, r * (0.12 + 0.88 * g), FLACH, true, 0, 0);
        kelle(c, P, p, { x: mx, y: my });
      } else if (ph === "backen") {
        var s = braeune(t);
        kuchen(c, mx, my + hopser, r * 1.06, FLACH, false, s, 0);   // Rand zeigt die Farbe der Unterseite
        kuchen(c, mx, my + hopser, r, FLACH, true, 0, 0);
        blasen(c, mx, my + hopser, r, t, seed);
        rauch(c, mx, my - P.R * 0.1, r, klemme((s - 2.2) / 0.6), z.uhr);
      } else if (ph === "flug") {
        var f = t / DAUER.flug, hoehe = Math.max(P.R * 0.6, Math.min(P.R * 1.5, P.cy - G.oben - P.R * 0.35));
        var fy = my - hoehe * 4 * f * (1 - f), phase = Math.PI * sanft(f), k = Math.cos(Math.acos(FLACH) + phase);
        var gr = 1 + 0.14 * Math.sin(f * Math.PI);
        if (k >= 0) kuchen(c, mx + Math.sin(f * Math.PI) * P.R * 0.05, fy, r * gr, k, true, 0, Math.sin(f * Math.PI) * 0.22);
        else kuchen(c, mx + Math.sin(f * Math.PI) * P.R * 0.05, fy, r * gr, k, false, z.wurf.s, Math.sin(f * Math.PI) * 0.22);
      } else if (ph === "gelandet") {
        var quetsch = t < 0.3 ? 1 - 0.18 * Math.sin(t / 0.3 * Math.PI) : 1;
        kuchen(c, mx, my, r * (2 - quetsch), -FLACH * quetsch, false, z.wurf.s, 0);
        if (z.wurf.stufe === 1) sterne(c, mx, my, t);
        else rauch(c, mx, my - P.R * 0.1, r, z.wurf.stufe === 3 ? 0.6 * (1 - klemme(t / DAUER.lob)) : 0, z.uhr);
      } else if (ph === "rutschen") {
        var u = sanft(t / DAUER.rutschen), o = stapelOben(G.T, z.stapel.length);
        kuchen(c, mix(mx, o.x, u), mix(my, o.y, u) - Math.sin(u * Math.PI) * P.R * 0.55, mix(r, o.r, u), -FLACH, false, z.wurf.s, Math.sin(u * Math.PI) * 0.15);
      }
      konfettiZeichnen(c);
    }

    function sterne(c, x, y, t) {
      if (t > 1.4) return;
      c.save();
      for (var i = 0; i < 9; i++) {
        var a = -Math.PI / 2 + (i - 4) * 0.36, weit = G.P.R * (0.45 + raus(t / 1.2) * 0.75);
        c.globalAlpha = 1 - klemme((t - 0.7) / 0.7);
        sternpfad(c, x + Math.cos(a) * weit * 1.2, y + Math.sin(a) * weit * 0.75, G.P.R * (0.05 + (i % 3) * 0.015), t * 2 + i);
        c.fillStyle = PAPIER.muster(c, i % 2 ? "gelb" : "orange"); c.fill();
      }
      c.restore();
    }

    // Konfetti aus Seidenpapier (wie beim Geburtstagsfinale)
    function konfettiLos() {
      var o = stapelOben(G.E, z.stapel.length - 1), farben = ["rot", "blau", "gelb", "gruen", "orange", "rosa", "lila", "hellblau"];
      z.konfetti = [];
      for (var i = 0; i < 150; i++) z.konfetti.push({ x: o.x + B.zufall(-60, 60), y: o.y - G.E.R * 0.3, vx: B.zufall(-420, 420), vy: B.zufall(-760, -260),
        rot: B.zufall(0, 6), vr: B.zufall(-7, 7), g: B.zufall(8, 17), f: farben[i % farben.length], seed: i + 1 });
    }
    function konfettiWeiter(dt) {
      z.konfetti.forEach(function (k) {
        k.vy += 700 * dt; k.vx *= 0.99; k.vy = Math.min(k.vy, 150 + (k.seed % 5) * 20);
        k.x += k.vx * dt + Math.sin(k.rot) * 1.1; k.y += k.vy * dt; k.rot += k.vr * dt;
        if (k.y > H + 30) { k.y = -20; k.x = B.zufall(0, W); k.vy = B.zufall(60, 150); k.vx = B.zufall(-40, 40); }
      });
    }
    function konfettiZeichnen(c) {
      z.konfetti.forEach(function (k) {
        c.save(); c.translate(k.x, k.y); c.rotate(k.rot); c.scale(1, Math.abs(Math.cos(k.rot * 1.3)) + 0.2);
        PAPIER.risspfad(c, 0, 0, k.g, k.g * 0.6, 7, k.seed); c.fillStyle = PAPIER.muster(c, k.f); c.fill(); c.restore();
      });
    }

    // ── Meldungen ──
    var lob = B.el("div", "spiel-lob", seite, "");
    var lobTimer = 0;
    function lobZeigen(text, art) {
      var neu = B.el("div", "spiel-lob " + art, null, text);
      neu.style.top = lob.style.top;
      seite.replaceChild(neu, lob); lob = neu;   // neues Element: die Einklebe-Bewegung startet frisch
      clearTimeout(lobTimer);
      lobTimer = setTimeout(function () { neu.className = "spiel-lob " + art + " weg"; }, art === "frueh" ? 1500 : DAUER.lob * 1000 + 400);
    }
    function lobWeg() { clearTimeout(lobTimer); lob.className = lob.className.replace(/ weg$/, "") + " weg"; }

    // ── Ablauf ──
    function phaseSetzen(p) { z.phase = p; z.seit = z.uhr; }
    function neuerTeig() { phaseSetzen("teig"); z.wurf = null; z.brutzelnAb = z.uhr + 0.5; lobWeg(); }

    function wenden() {
      if (!z) return;
      var t = z.uhr - z.seit;
      if (z.phase === "teig" || (z.phase === "backen" && t < ZEIT.gold)) {
        if (z.uhr - z.fruehSeit < 0.6) return;
        z.fruehSeit = z.uhr;
        KLANG.plopp();
        lobZeigen("Noch ein bisschen …", "frueh");
        return;
      }
      if (z.phase !== "backen") return;
      z.wurf = { t: t, s: braeune(t), stufe: stufeBei(t) };
      lobWeg();
      KLANG.hopp();
      phaseSetzen("flug");
    }

    function gelandet() {
      KLANG.plopp();
      var w = z.wurf;
      if (w.stufe === 1) { lobZeigen(B.ersetzen(LOB[z.goldZahl % LOB.length]), "gut"); z.goldZahl++; setTimeout(function () { if (z) KLANG.spieluhr([[72, 0.5], [76, 0.5], [79, 0.5], [84, 1.5]], 0.2); }, 300); }
      else if (w.stufe === 2) lobZeigen("Etwas knusprig – macht nichts!", "knusprig");
      else lobZeigen("Extra knusprig – schmeckt trotzdem!", "knusprig");
    }

    function zusammenfassung() {
      var g = 0;
      z.stapel.forEach(function (k) { if (k.stufe === 1) g++; });
      if (g === 3) return B.ersetzen("Alle drei goldgelb – wie bei {OMA}!");
      if (g === 2) return "Zwei goldgelbe und ein knuspriger – alle lecker!";
      if (g === 1) return "Ein goldgelber und zwei knusprige – alle lecker!";
      return "Drei schön knusprige – mit Marmelade ein Gedicht!";
    }

    function feiern() {
      KLANG.plopp();
      setTimeout(function () { if (z) KLANG.tusch(); }, 250);
      konfettiLos();
      B.leeren(ende);
      var oben = B.el("div", "spiel-ende-kopf", ende);
      var t = B.el("div", "spiel-ende-titel", oben, "Die leckersten Pfannkuchen der Welt!");
      PAPIER.schriftFuellen(t, "rot", { akzent: "orange" });
      B.el("div", "spiel-ende-unter", oben, zusammenfassung());
      var knoepfe = B.el("div", "spiel-ende-knoepfe", ende);
      var nochmal = B.el("button", "knopf gross", knoepfe, "↺ Nochmal");
      var kueche = B.el("button", "knopf gross", knoepfe, "⌂ Zur Küche");
      B.tippen(nochmal, function (ev) { ev.stopPropagation(); KLANG.entsperren(); KLANG.plopp(); vonVorn(); });
      B.tippen(kueche, function (ev) { ev.stopPropagation(); SP.stoppen(); zurueck(); });
      ende.className = "spiel-ende sichtbar";
      seite.className = "spiel-bildschirm ist-fertig";
    }

    function vonVorn() {
      z.stapel = []; z.konfetti = []; z.goldZahl = 0; z.runde++;
      ende.className = "spiel-ende"; B.leeren(ende);
      seite.className = "spiel-bildschirm";
      neuerTeig();
      anzeigen();
    }

    function weiter(dt) {
      z.uhr += dt;
      var t = z.uhr - z.seit, ph = z.phase;
      if (ph === "teig") { if (t >= DAUER.teig) phaseSetzen("backen"); }
      else if (ph === "flug") { if (t >= DAUER.flug) { phaseSetzen("gelandet"); gelandet(); } }
      else if (ph === "gelandet") { if (t >= DAUER.lob) phaseSetzen("rutschen"); }
      else if (ph === "rutschen") {
        if (t >= DAUER.rutschen) {
          z.stapel.push(z.wurf); KLANG.plopp();
          if (z.stapel.length >= ANZAHL) { phaseSetzen("schluss"); z.gefeiert = false; } else neuerTeig();
        }
      } else if (ph === "schluss") {
        if (!z.gefeiert && t >= DAUER.schluss + DAUER.marmelade) { z.gefeiert = true; feiern(); }
      }
      // es brutzelt, solange ein Pfannkuchen in der Pfanne liegt
      ph = z.phase;
      if ((ph === "teig" || ph === "backen" || ph === "flug" || ph === "gelandet") && z.uhr >= z.brutzelnAb) {
        KLANG.brutzeln(2.4); z.brutzelnAb = z.uhr + 2.0;
      }
      if (z.konfetti.length) konfettiWeiter(dt);
      anzeigen();
    }

    // Texte, Leiste und Knopf nur anfassen, wenn sich etwas ändert
    function anzeigen() {
      var ph = z.phase, t = z.uhr - z.seit, a = z.anz, stufe = -1, text = "";
      if (ph === "teig") text = "Der Teig kommt in die Pfanne …";
      else if (ph === "backen") { stufe = stufeBei(t); text = STUFEN[stufe].hinweis; }
      else if (ph === "flug") text = "Hui – hoch damit!";
      else if (ph === "gelandet" || ph === "rutschen") text = "Ab auf den Teller!";
      if (text !== a.text) { hinweis.textContent = text; a.text = text; }
      var tb = ph === "backen" ? t : (ph !== "teig" && z.wurf ? z.wurf.t : 0);   // nach dem Wenden bleibt der Kreis stehen
      var pos = Math.round(1000 * Math.min(1, tb / ZEIT.ende));
      if (pos !== a.pos) {
        a.pos = pos;
        zeiger.style.left = (pos / 10) + "%";
        zeiger.style.backgroundColor = farbeBei(braeune(tb));
      }
      var klasse = "knopf gross spiel-wenden" + (stufe === 1 ? " golden" : "") + (ph === "teig" || ph === "backen" ? "" : " ruht");
      if (klasse !== a.knopf) { wendenKnopf.className = klasse; a.knopf = klasse; }
      var an = stufe === 1 ? 1 : 0;
      if (an !== a.gold) { felder[1].className = "spiel-stufe stufe-1" + (an ? " an" : ""); a.gold = an; }
      var nr = Math.min(ANZAHL, z.stapel.length + 1), zt = "Pfannkuchen " + nr + " von " + ANZAHL;
      if (zt !== a.zaehler) { zaehler.textContent = zt; a.zaehler = zt; }
    }

    function schritt() {
      if (!z) return;
      if (!seite.parentNode) { SP.stoppen(); return; }   // Bildschirm ist schon weg
      var jetzt = B.jetzt(), dt = Math.min(0.1, Math.max(0, (jetzt - z.zuletzt) / 1000));   // nach Pausen nicht springen
      z.zuletzt = jetzt;
      weiter(dt);
      zeichnen();
      z.id = B.frame(schritt);
    }

    B.tippen(seite, function () { KLANG.entsperren(); wenden(); });
    B.tippen(zurueckKnopf, function (ev) { ev.stopPropagation(); SP.stoppen(); zurueck(); });

    z = { uhr: 0, seit: 0, phase: "teig", stapel: [], konfetti: [], wurf: null, fruehSeit: -10, brutzelnAb: 0.5,
          goldZahl: 0, runde: 0, anz: {}, zuletzt: B.jetzt(), id: 0, gefeiert: false };
    aufbauen();
    neuerTeig();
    anzeigen();
    zeichnen();
    z.groesse = function () { if (z) { aufbauen(); zeichnen(); } };
    window.addEventListener("resize", z.groesse, false);
    // zum Nachprüfen (Konsole): Zustand lesen, Zeit vorspulen, tippen
    SP.test = {
      zustand: function () { return z ? { phase: z.phase, t: +(z.uhr - z.seit).toFixed(2), stapel: z.stapel.map(function (k) { return STUFEN[k.stufe].name; }), hinweis: hinweis.textContent, lob: lob.textContent } : null; },
      vorspulen: function (sek) { while (z && sek > 0) { var d = Math.min(0.05, sek); weiter(d); sek -= d; } if (z) zeichnen(); return SP.test.zustand(); },
      tippen: function () { wenden(); return SP.test.zustand(); }
    };
    z.id = B.frame(schritt);
  };

  SP.stoppen = function () {
    if (!z) return;
    B.frameStopp(z.id);
    window.removeEventListener("resize", z.groesse, false);
    z = null;
  };
})();
