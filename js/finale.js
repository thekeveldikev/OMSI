/* Das Geburtstagsfinale: ein Pfannekuchen-Turm mit ALLEN Kerzen
   ("Im Computer passen alle drauf!"). Pusten ins Mikrofon – oder antippen.
   Danach: Konfetti aus Seidenpapier, Spieluhr, Omsi-Bild. */
(function () {
  var FIN = window.FINALE = {};
  var z = null;

  // Der gemalte Turm ohne Kerzen (Illustrationen_2026-09-26/extras/geburtstagsturm-ohne-kerzen.png),
  // auf die Alpha-Bounds zugeschnitten: Ausschnitt ab (62, 242) des 1448×1086-Originals.
  // oben = Oberseite des obersten Pfannekuchens als Ellipse in Bildpixeln (Mitte, Radien, Neigung) –
  // darauf stehen die echten, einzeln auspustbaren Kerzen.
  var TURM = { src: "bilder/extras/geburtstagsturm-ohne-kerzen.png", b: 1324, h: 737,
               oben: { x: 665, y: 126, rx: 422, ry: 114, dreh: -0.035 }, img: null };
  B.ladeBild(TURM.src, function (img) { TURM.img = img; });

  FIN.starten = function (ziel, zurueck) {
    KLANG.entsperren();
    B.leeren(ziel);
    var wurzel = B.el("div", "finale-bildschirm", ziel);
    PAPIER.hinterlegen(wurzel, "creme", { kachel: 320 });
    var cv = B.el("canvas", "finale-canvas", wurzel);
    var kopf = B.el("div", "finale-kopf", wurzel);
    var titel = B.el("div", "finale-titel", kopf, B.ersetzen("{ALTER} Kerzen für {OMA}!"));
    PAPIER.schriftFuellen(titel, "rot", { akzent: "orange" });
    B.el("div", "finale-unter", kopf, "Im Buch passten sie nicht drauf. Hier schon.");
    var leiste = B.el("div", "finale-leiste", wurzel);
    var mikro = B.knopf(B.el("button", "knopf gross", leiste), "mikro", "Kerzen auspusten");
    B.el("div", "finale-oder", leiste, "… oder die Kerzen antippen");
    var zurueckKnopf = B.knopf(B.el("button", "knopf finale-zurueck", wurzel), "haus", "Zur Küche");
    var ende = B.el("div", "finale-ende", wurzel);

    var W, H, ctx, kerzen = [], rauch = [], konfetti = [], fertigSeit = 0;
    var alter = B.E.alter || 79;

    function aufbauen() {
      W = wurzel.clientWidth; H = wurzel.clientHeight;
      ctx = B.canvasGroesse(cv, W, H);
      var alt = {};
      kerzen.forEach(function (k) { alt[k.nr] = k; });
      kerzen = [];
      // Platz zwischen Überschrift und Knopfleiste: Kerzenspitzen bis Tellerrand passen hinein
      var O = TURM.oben;
      var kopfUnten = kopf.offsetTop + kopf.offsetHeight + 6, leisteOben = leiste.offsetTop - 6;
      var platz = Math.max(H * 0.4, leisteOben - kopfUnten);
      var lageH = Math.min(H * 0.045, W * 0.03), kerzenH = lageH * 2.9;
      var s = Math.min(Math.min(W * 0.31, H * 0.475) / O.rx, (platz - kerzenH) / (TURM.h - O.y + O.ry * 0.84));
      var rx = O.rx * s, ry = O.ry * s;
      var luft = Math.max(0, platz - kerzenH - (TURM.h - O.y + O.ry * 0.84) * s);
      var cx = W / 2, obenY = kopfUnten + luft * 0.5 + kerzenH + ry * 0.84;
      lageH = Math.min(lageH, rx * 0.16);
      z.turm = { cx: cx, rx: rx, ry: ry, dreh: O.dreh, obenY: obenY, lagen: 7, lageH: lageH,
                 bild: { x: cx - O.x * s, y: obenY - O.y * s, b: TURM.b * s, h: TURM.h * s } };
      // Kerzen in Ringen auf der Oberseite verteilen: alter − 1 auf die Ringe, dazu die große in der Mitte
      // (zusammen genau "alter" Kerzen – vorher kam die Mitte noch obendrauf).
      var ringKerzen = Math.max(0, alter - 1), cd = Math.cos(O.dreh), sd = Math.sin(O.dreh);
      var ringe = [0.18, 0.4, 0.62, 0.84], gewicht = ringe.reduce(function (a, r) { return a + r; }, 0), n = 0;
      function neu(nr, ex, ey, eigen) {
        var vorher = alt[nr] || {};
        var k = { nr: nr, x: cx + ex * cd - ey * sd, y: obenY + ex * sd + ey * cd, an: vorher.an !== undefined ? vorher.an : true,
                  ph: vorher.ph !== undefined ? vorher.ph : Math.random() * 6, hf: vorher.hf || eigen.hf || 1.5 + Math.random() * 0.4,
                  farbe: eigen.farbe, mitte: !!eigen.mitte };
        k.h = lageH * k.hf;
        kerzen.push(k);
      }
      ringe.forEach(function (r, i) {
        var anzahl = i === ringe.length - 1 ? ringKerzen - n : Math.min(ringKerzen - n, Math.round(ringKerzen * r / gewicht));
        for (var j = 0; j < anzahl; j++) {
          var a = (j / anzahl) * Math.PI * 2 + i * 0.4;
          neu(n + j, Math.cos(a) * rx * r, Math.sin(a) * ry * r, { farbe: ["rot", "blau", "gelb", "gruen", "rosa", "hellblau"][(n + j) % 6] });
        }
        n += anzahl;
      });
      if (alter >= 1) neu(n, 0, 0, { farbe: "rot", hf: 2.2, mitte: true });
      kerzen.sort(function (a, b) { return a.y - b.y; });
    }
    // zum Nachprüfen (Anzahl soll genau dem Alter entsprechen)
    FIN.kerzenDaten = function () { return kerzen.map(function (k) { return { x: k.x, y: k.y, h: k.h, an: k.an, mitte: k.mitte }; }); };

    function turm() {
      var T = z.turm;
      if (TURM.img) { ctx.drawImage(TURM.img, T.bild.x, T.bild.y, T.bild.b, T.bild.h); return; }
      // Ersatz, solange das Bild fehlt: der gezeichnete Turm
      // Teller
      ctx.beginPath(); ctx.ellipse(T.cx, T.obenY + T.lagen * T.lageH + T.ry * 0.5, T.rx * 1.25, T.ry * 1.3, 0, 0, Math.PI * 2);
      ctx.fillStyle = PAPIER.muster(ctx, "weiss"); ctx.fill();
      ctx.lineWidth = T.ry * 0.18; ctx.strokeStyle = PAPIER.muster(ctx, "blau"); ctx.stroke();
      // Lagen von unten nach oben
      for (var i = T.lagen - 1; i >= 0; i--) {
        var y = T.obenY + i * T.lageH, versatz = Math.sin(i * 2.3) * T.rx * 0.03;
        ctx.beginPath();
        ctx.ellipse(T.cx + versatz, y + T.lageH * 0.6, T.rx * (1 - i * 0.004), T.ry, 0, 0, Math.PI);
        ctx.lineTo(T.cx + versatz - T.rx, y);
        ctx.ellipse(T.cx + versatz, y, T.rx, T.ry, 0, Math.PI, 0, false);
        ctx.closePath();
        ctx.fillStyle = PAPIER.muster(ctx, i % 2 ? "gold" : "ocker", { akzent: "braun" }); ctx.fill();
      }
      // Oberseite mit Marmelade
      ctx.beginPath(); ctx.ellipse(T.cx, T.obenY, T.rx, T.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = PAPIER.muster(ctx, "gold", { akzent: "braun" }); ctx.fill();
      ctx.beginPath(); ctx.ellipse(T.cx, T.obenY, T.rx * 0.9, T.ry * 0.88, 0, 0, Math.PI * 2);
      ctx.fillStyle = PAPIER.muster(ctx, "rot", { akzent: "rosa" }); ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
      // Marmeladen-Nasen am Rand
      for (var d = 0; d < 9; d++) {
        var a = 0.15 + d * 0.33, x = T.cx + Math.cos(a) * T.rx * 0.88, yy = T.obenY + Math.sin(a) * T.ry * 0.88;
        ctx.beginPath(); ctx.ellipse(x, yy + T.lageH * 0.35, T.rx * 0.035, T.lageH * (0.5 + (d % 3) * 0.25), 0, 0, Math.PI * 2);
        ctx.fillStyle = PAPIER.muster(ctx, "rot"); ctx.fill();
      }
    }

    function kerzeZeichnen(k, t) {
      var b = z.turm.lageH * 0.28;
      ctx.fillStyle = PAPIER.muster(ctx, k.farbe); ctx.fillRect(k.x - b / 2, k.y - k.h, b, k.h);
      ctx.fillStyle = "rgba(255,255,255,0.35)"; for (var s = 0; s < 3; s++) ctx.fillRect(k.x - b / 2, k.y - k.h + s * k.h / 3 + 2, b, 2);
      ctx.strokeStyle = "#3a2c20"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(k.x, k.y - k.h); ctx.lineTo(k.x, k.y - k.h - b * 0.8); ctx.stroke();
      if (!k.an) return;
      var f = 0.85 + 0.15 * Math.sin(t * 12 + k.ph) + 0.05 * Math.sin(t * 29 + k.ph), fh = b * 3.2 * f;
      PAPIER.flammenpfad(ctx, k.x, k.y - k.h - b * 0.3, b * 1.3, fh, Math.sin(t * 4 + k.ph) * b * 0.4);
      ctx.fillStyle = PAPIER.muster(ctx, "orange"); ctx.fill();
      PAPIER.flammenpfad(ctx, k.x, k.y - k.h - b * 0.3, b * 0.6, fh * 0.6, 0);
      ctx.fillStyle = PAPIER.muster(ctx, "gelb"); ctx.fill();
    }

    function ausblasen(k) {
      if (!k.an) return;
      k.an = false;
      rauch.push({ x: k.x, y: k.y - k.h - 4, t: 0 });
    }

    function schritt() {
      if (!z) return;
      var t = (B.jetzt() - z.t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      // warmes Kerzenlicht
      var brennend = kerzen.filter(function (k) { return k.an; }).length;
      var T = z.turm;
      if (brennend) {
        ctx.save(); ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = "rgba(255,236,200," + (0.15 * brennend / kerzen.length) + ")"; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
      turm();
      kerzen.forEach(function (k) { kerzeZeichnen(k, t); });
      if (brennend) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        var g = ctx.createRadialGradient(T.cx, T.obenY - T.lageH * 2, 10, T.cx, T.obenY - T.lageH * 2, T.rx * 1.5);
        g.addColorStop(0, "rgba(255,190,90," + 0.25 * brennend / kerzen.length + ")"); g.addColorStop(1, "rgba(255,190,90,0)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
      }
      // Rauchfäden
      for (var i = rauch.length - 1; i >= 0; i--) {
        var r = rauch[i]; r.t += 0.016;
        if (r.t > 1.8) { rauch.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = 0.5 * (1 - r.t / 1.8); ctx.strokeStyle = "#8a8f99"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(r.x, r.y);
        for (var s = 1; s < 8; s++) ctx.lineTo(r.x + Math.sin(s * 0.9 + r.t * 5) * 5, r.y - s * r.t * 9);
        ctx.stroke(); ctx.restore();
      }
      // Pusten übers Mikrofon
      if (z.mikroPegel !== undefined) {
        var pegel = z.mikroPegel();
        if (pegel > 0.12) {
          var anzahl = Math.ceil((pegel - 0.1) * 6);
          var an = kerzen.filter(function (k) { return k.an; });
          for (var a = 0; a < anzahl && an.length; a++) ausblasen(an.splice(Math.floor(Math.random() * an.length), 1)[0]);
          if (!z.pustGeraeusch || B.jetzt() - z.pustGeraeusch > 900) { z.pustGeraeusch = B.jetzt(); }
        }
      }
      // Alle aus → Feier
      if (!brennend && !fertigSeit) feiern();
      if (fertigSeit) konfettiZeichnen();
      z.id = B.frame(schritt);
    }

    function feiern() {
      fertigSeit = B.jetzt();
      mikroAus();
      var farben = ["rot", "blau", "gelb", "gruen", "orange", "rosa", "lila", "hellblau"];
      for (var i = 0; i < 180; i++) konfetti.push({ x: W / 2 + B.zufall(-60, 60), y: H * 0.45, vx: B.zufall(-420, 420), vy: B.zufall(-720, -220), rot: B.zufall(0, 6), vr: B.zufall(-8, 8), g: B.zufall(8, 18), f: farben[i % farben.length], seed: i + 1 });
      KLANG.tusch();
      setTimeout(function () { KLANG.spieluhr(KLANG.GEBURTSTAG, 0.45); }, 900);
      B.leeren(ende);
      ende.className = "finale-ende sichtbar";
      var bild = B.el("div", "finale-bild", ende);
      bild.style.backgroundImage = "url(\"bilder/extras/omsi.jpg\")";
      var gruss = B.el("div", "finale-gruss", ende, B.ersetzen("Alles Liebe zum {ALTER}. Geburtstag, {OMA}!"));
      PAPIER.schriftFuellen(gruss, "blau", { akzent: "tiefblau" });
      B.el("div", "finale-absender", ende, B.ersetzen("{ABSENDER}"));
      var nochmal = B.knopf(B.el("button", "knopf", ende), "kerze", "Nochmal anzünden");
      B.tippen(nochmal, function (ev) { ev.stopPropagation(); kerzen.forEach(function (k) { k.an = true; }); fertigSeit = 0; konfetti = []; ende.className = "finale-ende"; });
    }

    function konfettiZeichnen() {
      var dt = 0.016;
      konfetti.forEach(function (c) {
        c.vy += 700 * dt; c.vx *= 0.99; c.vy = Math.min(c.vy, 160 + (c.seed % 5) * 20);
        c.x += c.vx * dt + Math.sin(c.rot) * 1.2; c.y += c.vy * dt; c.rot += c.vr * dt;
        if (c.y > H + 30) { c.y = -20; c.x = B.zufall(0, W); c.vy = B.zufall(60, 160); c.vx = B.zufall(-40, 40); }
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.scale(1, Math.abs(Math.cos(c.rot * 1.3)) + 0.2);
        PAPIER.risspfad(ctx, 0, 0, c.g, c.g * 0.6, 7, c.seed); ctx.fillStyle = PAPIER.muster(ctx, c.f); ctx.fill(); ctx.restore();
      });
    }

    // Mikrofon
    var strom = null;
    function mikroAn() {
      var AC = window.AudioContext || window.webkitAudioContext;
      var gum = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
      if (!gum || !AC) { APP.meldung("Das Mikrofon geht hier leider nicht – einfach die Kerzen antippen!"); return; }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (s) {
        strom = s;
        var actx = new AC(), quelle = actx.createMediaStreamSource(s), an = actx.createAnalyser();
        an.fftSize = 1024; quelle.connect(an);
        var puffer = new Uint8Array(an.fftSize);
        z.mikroPegel = function () {
          an.getByteTimeDomainData(puffer);
          var summe = 0;
          for (var i = 0; i < puffer.length; i++) { var v = (puffer[i] - 128) / 128; summe += v * v; }
          return Math.sqrt(summe / puffer.length) * 3;
        };
        z.mikroCtx = actx;
        B.knopf(mikro, "wind", "Jetzt kräftig pusten!");
      })["catch"](function () { APP.meldung("Kein Mikrofon erlaubt – einfach die Kerzen antippen!"); });
    }
    function mikroAus() {
      if (strom) { strom.getTracks().forEach(function (tr) { tr.stop(); }); strom = null; }
      if (z && z.mikroCtx && z.mikroCtx.close) z.mikroCtx.close();
      if (z) { delete z.mikroPegel; z.mikroCtx = null; }
      B.knopf(mikro, "mikro", "Kerzen auspusten");
    }

    B.tippen(mikro, function (ev) { ev.stopPropagation(); KLANG.entsperren(); mikroAn(); });
    B.tippen(cv, function (ev) {
      var r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, getroffen = 0;
      var radius = Math.max(40, z.turm.rx * 0.35);
      kerzen.forEach(function (k) { if (k.an && Math.abs(k.x - x) < radius && Math.abs(k.y - k.h - y) < radius) { ausblasen(k); getroffen++; } });
      if (getroffen) KLANG.pusten();
    });
    B.tippen(zurueckKnopf, function (ev) { ev.stopPropagation(); FIN.stoppen(); zurueck(); });

    z = { t0: B.jetzt(), id: 0 };
    aufbauen();
    z.groesse = function () { if (z) aufbauen(); };
    window.addEventListener("resize", z.groesse, false);
    z.mikroAus = mikroAus;
    z.id = B.frame(schritt);
  };

  FIN.stoppen = function () {
    if (!z) return;
    B.frameStopp(z.id);
    if (z.mikroAus) z.mikroAus();
    window.removeEventListener("resize", z.groesse, false);
    z = null;
  };
})();
