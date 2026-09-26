/* Schattentheater hinter dem Laken – live gezeichnet, synchron zu den Strophen.
   Klein-Kevin wächst mit jedem Pfannekuchen, bis der Kopf oben anstößt,
   und am Ende wechselt die Pfanne von Omsi zu Kevin. */
(function () {
  var SCH = window.SCHATTEN = {};
  var lauf = null;

  var DAUER = [9.5, 9.5, 10.5, 9.5, 8.5];

  function glatt(a, b, t) { var u = B.klemme((t - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); }

  SCH.starten = function (verse, fertig) {
    if (lauf) return;
    KLANG.entsperren();
    var strophen = verse.map(function (st) { return st.map(B.ersetzen); });
    var wurzel = B.el("div", "schatten-bildschirm", document.body);
    var cv = B.el("canvas", "schatten-canvas", wurzel);
    var text = B.el("div", "schatten-text", wurzel);
    var zu = B.el("button", "knopf schatten-zu", wurzel, "✕ Schließen");
    var hinweis = B.el("div", "schatten-hinweis", wurzel, "Tippen = nächste Strophe");
    var W, H, ctx;
    function groesse() { W = window.innerWidth; H = window.innerHeight; ctx = B.canvasGroesse(cv, W, H); }
    groesse();
    window.addEventListener("resize", groesse, false);

    lauf = { k: 0, t0: B.jetzt(), id: 0, zeilen: [], ereignisse: {}, laenge: DAUER[0] };
    if (window.KULISSE) KULISSE.leiser(true);

    // Kevins Aufnahme der Strophe (Aufnahmestudio: audio/fortsetzung/schatten-1 … -5).
    // Ist sie länger als die geplante Dauer, läuft das Schattenspiel entsprechend langsamer mit.
    var stimme = null;
    function stimmeStopp() {
      if (!stimme) return;
      try { stimme.pause(); } catch (e) {}
      stimme.onended = stimme.onerror = stimme.onloadedmetadata = null; stimme = null;
    }
    function stimmeLaeuft() { return !!(stimme && stimme.src && !stimme.ended && !stimme.paused); }
    function stimmeStarten(k) {
      stimmeStopp();
      var pfad = ((window.FORTSETZUNG && window.FORTSETZUNG.audioPfad) || "audio/fortsetzung/") + "schatten-" + (k + 1);
      var endungen = [".m4a", ".mp3", ".wav"], v = 0, a = stimme = new Audio();
      function probiere() {
        if (a !== stimme) return;
        if (v >= endungen.length) { stimme = null; return; }
        a.src = pfad + endungen[v++];
        var p = a.play();
        if (p && p["catch"]) p["catch"](function () {});
      }
      a.onloadedmetadata = function () {
        if (a === stimme && lauf && lauf.k === k && a.duration && isFinite(a.duration)) lauf.laenge = Math.max(DAUER[k], a.duration + 0.8);
      };
      a.onerror = probiere;
      probiere();
    }

    function strophe(k) {
      lauf.k = k; lauf.t0 = B.jetzt(); lauf.ereignisse = {}; lauf.laenge = DAUER[k];
      B.leeren(text);
      lauf.zeilen = strophen[k].map(function (z) { var d = B.el("div", "schatten-zeile", text, z); return d; });
      stimmeStarten(k);
    }
    strophe(0);

    function ende() {
      if (!lauf) return;
      stimmeStopp();
      if (window.KULISSE) { var bz = window.BUCH && BUCH.zustand(); KULISSE.leiser(!!(bz && bz.vorlesen)); }
      B.frameStopp(lauf.id); lauf = null;
      window.removeEventListener("resize", groesse, false);
      if (wurzel.parentNode) wurzel.parentNode.removeChild(wurzel);
      if (fertig) fertig();
    }
    B.tippen(zu, function (ev) { ev.stopPropagation(); ende(); });
    B.tippen(wurzel, function () { if (lauf.k < strophen.length - 1) strophe(lauf.k + 1); else ende(); });
    setTimeout(function () { hinweis.style.opacity = "0"; }, 4000);

    // einmalige Ereignisse (Geräusche) je Strophe
    function einmal(name, t, ab, fn) { if (t >= ab && !lauf.ereignisse[name]) { lauf.ereignisse[name] = true; fn(); } }

    function schritt() {
      if (!lauf) return;
      var k = lauf.k, echt = (B.jetzt() - lauf.t0) / 1000;
      if (echt > lauf.laenge + 1.2 && !stimmeLaeuft()) { if (k < strophen.length - 1) { strophe(k + 1); lauf.id = B.frame(schritt); return; } ende(); return; }
      var t = echt * DAUER[k] / lauf.laenge;          // Zeit des Schattenspiels (gedehnt, falls die Aufnahme länger ist)
      // Zeilen nacheinander einblenden
      var n = lauf.zeilen.length;
      lauf.zeilen.forEach(function (z, i) { z.style.opacity = t > 0.6 + i * (DAUER[k] - 2) / n ? "1" : "0"; });
      zeichne(ctx, W, H, k, t, einmal);
      lauf.id = B.frame(schritt);
    }
    lauf.id = B.frame(schritt);
  };

  // ───────────────── Bilder: Silhouetten, Pfanne, Pfannekuchen ─────────────────
  // Die Papierfiguren aus dem Illustrationspaket (schattentheater/*.png), auf ihre
  // Alpha-Bounds zugeschnitten (+6 px Reserve) und auf 880 px Höhe gebracht.
  // Maße in Pixeln der App-Bilder: oben/unten = sichtbare Figur, fussX = Mitte der
  // Sohlen (Bodenanker), hand = Griff- bzw. Fangpunkt der ausgestreckten Hand.
  var FARBE = "rgb(38,24,12)";
  var SPR = {
    klein:  { src: "bilder/schatten/kevin-klein-profil.png", b: 496, h: 880, oben: 5, unten: 876, fussX: 199, hand: [456, 366], weich: 7 },
    gross:  { src: "bilder/schatten/kevin-gross-profil.png", b: 353, h: 880, oben: 4, unten: 876, fussX: 129.5, hand: [320, 377], weich: 7 },
    omsi:   { src: "bilder/schatten/omsi-profil.png", b: 479, h: 880, oben: 5, unten: 876, fussX: 285, hand: [46, 428], weich: 7 },
    // Griff zeigt im Bild nach links: griff = wo die Hand hält, mulde = wo der Pfannekuchen liegt
    pfanne: { src: "bilder/schatten/pfanne-leer.png", b: 720, h: 213, griff: [88, 98], mulde: [530, 24], weich: 4 },
    kuchen: { src: "bilder/extras/pfannekuchen-flug.png", b: 640, h: 416, weich: 3 }
  };
  // Einmal laden und auf einem Hilfscanvas dunkel einfärben (source-in: nur die
  // Alpha-Kontur bleibt), dazu ein weicher Rand wie bei echtem Schatten auf dem Laken.
  function vorbereiten(sp) {
    B.ladeBild(sp.src, function (img) {
      var b = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      if (!b || !h) return;
      var t = document.createElement("canvas"); t.width = b; t.height = h;
      var c = t.getContext("2d");
      c.drawImage(img, 0, 0, b, h);
      c.globalCompositeOperation = "source-in"; c.fillStyle = FARBE; c.fillRect(0, 0, b, h);
      var rand = sp.weich * 2 + 2, o = document.createElement("canvas");
      o.width = b + 2 * rand; o.height = h + 2 * rand;
      var oc = o.getContext("2d");
      oc.shadowColor = FARBE; oc.shadowBlur = sp.weich;
      oc.drawImage(t, rand, rand);
      sp.f = b / sp.b;          // falls die Datei einmal andere Maße hat
      sp.rand = rand / sp.f;    // Rand in Maß-Pixeln
      sp.cv = o;
    });
  }
  for (var spName in SPR) vorbereiten(SPR[spName]);

  // Alle Schatten erst deckend auf eine eigene Ebene, dann gemeinsam halbdurchsichtig
  // aufs Laken: Überschneidungen (Hand + Pfanne, Kind + Omsi) werden so nicht dunkler.
  var ebene = null;
  function ebeneHolen(sx, sy, sw, sh) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var b = Math.max(1, Math.round(sw * dpr)), h = Math.max(1, Math.round(sh * dpr));
    if (!ebene) ebene = { cv: document.createElement("canvas") };
    if (ebene.cv.width !== b || ebene.cv.height !== h || !ebene.ctx) { ebene.cv.width = b; ebene.cv.height = h; ebene.ctx = ebene.cv.getContext("2d"); }
    var lc = ebene.ctx;
    lc.setTransform(1, 0, 0, 1, 0, 0); lc.clearRect(0, 0, b, h);
    lc.setTransform(dpr, 0, 0, dpr, -sx * dpr, -sy * dpr);
    lc.globalAlpha = 1; lc.globalCompositeOperation = "source-over";
    lc.fillStyle = FARBE; lc.strokeStyle = FARBE; lc.shadowColor = FARBE; lc.shadowBlur = 0;
    return lc;
  }

  // Figur mit Bodenanker (Fußmitte) bei (x, gy), sichtbare Höhe h.
  // lift hebt sie an (Wippen/Hüpfen), neig kippt sie um die Füße (Gehen/Atmen).
  // addieren = true: "lighter" – zwei überblendete Figuren ergeben zusammen genau volle Deckung.
  function figur(lc, sp, x, gy, h, lift, neig, alpha, addieren) {
    var st = { sp: sp, x: x, y: gy - lift, s: h / (sp.unten - sp.oben), neig: neig || 0 };
    if (sp.cv && alpha > 0.004) {
      var s = st.s;
      lc.save(); lc.globalAlpha = Math.min(1, alpha); if (addieren) lc.globalCompositeOperation = "lighter";
      lc.translate(st.x, st.y); if (st.neig) lc.rotate(st.neig);
      lc.drawImage(sp.cv, (-sp.fussX - sp.rand) * s, (-sp.unten - sp.rand) * s, sp.cv.width / sp.f * s, sp.cv.height / sp.f * s);
      lc.restore();
    }
    return st;
  }
  // Bildpunkt einer Figur → Bühnenkoordinaten (mit Neigung)
  function punkt(st, p) {
    var dx = (p[0] - st.sp.fussX) * st.s, dy = (p[1] - st.sp.unten) * st.s, c = Math.cos(st.neig), si = Math.sin(st.neig);
    return { x: st.x + dx * c - dy * si, y: st.y + dx * si + dy * c };
  }
  function mischen(a, b, u) { return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }; }

  // Pfanne am Griff. seite: +1 = Pfanne rechts der Hand (Kevin), -1 = links (Omsi, gespiegelt);
  // Werte dazwischen stauchen sie wie ein Kärtchen, das sich dreht. Liefert die Mulde.
  function mulde(griff, laenge, seite, dreh) {
    var sp = SPR.pfanne, s = laenge / sp.b;
    var mx = (sp.mulde[0] - sp.griff[0]) * s * seite, my = (sp.mulde[1] - sp.griff[1]) * s, c = Math.cos(dreh), si = Math.sin(dreh);
    return { x: griff.x + mx * c - my * si, y: griff.y + mx * si + my * c };
  }
  function pfanneBild(lc, griff, laenge, seite, dreh) {
    var sp = SPR.pfanne, s = laenge / sp.b, m = mulde(griff, laenge, seite, dreh);
    if (!sp.cv) { pfanne(lc, m.x, m.y + laenge * 0.1, laenge * 0.27, seite > 0 ? 1 : 0); return m; }
    lc.save(); lc.translate(griff.x, griff.y); lc.rotate(dreh);
    lc.scale(Math.abs(seite) < 0.03 ? (seite < 0 ? -0.03 : 0.03) : seite, 1);
    lc.drawImage(sp.cv, (-sp.griff[0] - sp.rand) * s, (-sp.griff[1] - sp.rand) * s, sp.cv.width / sp.f * s, sp.cv.height / sp.f * s);
    lc.restore();
    return m;
  }

  // Der Pfannekuchen: phase = Drehung um die Querachse (flach ↔ hochkant), dreh = Neigung
  var LIEGT = 1.0;   // in der Pfanne liegend: von der Seite nur ein flacher Buckel
  function kuchen(lc, x, y, r, phase, dreh) {
    var sp = SPR.kuchen;
    if (!sp.cv) { pfannekuchen(lc, x, y, r, phase); return; }
    var s = 2 * r / sp.b, k = Math.max(0.12, Math.abs(Math.cos(phase)));
    lc.save(); lc.translate(x, y); if (dreh) lc.rotate(dreh); lc.scale(s, s * k);
    lc.drawImage(sp.cv, -sp.cv.width / sp.f / 2, -sp.cv.height / sp.f / 2, sp.cv.width / sp.f, sp.cv.height / sp.f);
    lc.restore();
  }

  // ───────────────── Zeichnen ─────────────────
  function zeichne(ctx, W, H, k, t, einmal) {
    var sx = W * 0.1, sy = H * 0.06, sw = W * 0.8, sh = H * 0.62, gy = sy + sh * 0.96;

    // Lampe an/aus
    var licht = 1;
    if (k === 0) licht = glatt(0, 1.4, t) * (t < 0.5 ? 0.6 + 0.4 * Math.random() : 1);
    if (k === 4) licht = 1 - glatt(DAUER[4] - 1.6, DAUER[4], t);
    licht *= 0.96 + 0.04 * Math.sin(t * 13);

    // Raum
    ctx.fillStyle = "#0b1230"; ctx.fillRect(0, 0, W, H);
    // Wäscheaufhänger (Gestell)
    ctx.strokeStyle = "#2b2f45"; ctx.lineWidth = Math.max(4, W * 0.006); ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx - 8, sy - 6); ctx.lineTo(sx - 30, H * 0.98); ctx.moveTo(sx + sw + 8, sy - 6); ctx.lineTo(sx + sw + 30, H * 0.98);
    ctx.moveTo(sx - 20, sy - 6); ctx.lineTo(sx + sw + 20, sy - 6);
    ctx.stroke();
    // Laken, von hinten beleuchtet
    var g = ctx.createRadialGradient(sx + sw * 0.5, sy + sh * 0.55, sh * 0.05, sx + sw * 0.5, sy + sh * 0.55, sw * 0.62);
    g.addColorStop(0, "rgba(255,244,214," + licht + ")"); g.addColorStop(0.55, "rgba(246,221,160," + licht + ")"); g.addColorStop(1, "rgba(180,140,80," + licht + ")");
    ctx.fillStyle = "#1a2142"; ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = g; ctx.fillRect(sx, sy, sw, sh);
    // Falten
    ctx.globalAlpha = 0.07 * licht; ctx.fillStyle = "#6b4a20";
    for (var f = 1; f < 9; f++) ctx.fillRect(sx + sw * f / 9 - 3, sy, 6 + (f % 3) * 3, sh);
    ctx.globalAlpha = 1;
    // Wäscheklammern
    ctx.fillStyle = "#3a3f5c";
    for (var c = 0; c < 6; c++) ctx.fillRect(sx + sw * (c + 0.5) / 6 - 4, sy - 14, 8, 22);

    if (licht < 0.02) return;

    var lc = ebeneHolen(sx, sy, sw, sh);

    // ── Zustand der Figuren ──
    var stufen = [0.36, 0.52, 0.7, 0.93];
    var kx = sx + sw * 0.3, kh = sh * stufen[0], kGeht = 0, kHopp = 0, freude = 0;
    if (k === 0) {
      kx = sx - sw * 0.1 + (sw * 0.4) * glatt(1, 4.2, t); kGeht = t > 1 && t < 4.2 ? t : 0;
      // "… 'nen Pfannekuchen!" – drei kleine Hüpfer vor Vorfreude
      if (t > 4.6 && t < 4.6 + 3 * Math.PI / 5) kHopp = Math.abs(Math.sin((t - 4.6) * 5));
    }
    var flugZeiten = [1.2, 3.8, 6.4], flugDauer = 1.3;
    if (k === 2) {
      var stufe = 0;
      for (var i = 0; i < 3; i++) {
        stufe += glatt(flugZeiten[i] + flugDauer, flugZeiten[i] + flugDauer + 0.6, t);
        var nachFang = t - flugZeiten[i] - flugDauer;
        if (nachFang > 0 && nachFang < 0.45) freude = Math.sin(nachFang / 0.45 * Math.PI);   // Hüpfer beim Fangen
      }
      var ganz = Math.floor(stufe), rest = stufe - ganz;
      kh = sh * (stufen[Math.min(3, ganz)] + (ganz < 3 ? (stufen[ganz + 1] - stufen[ganz]) * rest : 0));
      if (ganz >= 3) einmal("stopp", t, flugZeiten[2] + flugDauer + 0.6, function () { KLANG.plopp(); });
    }
    if (k >= 3) kh = sh * stufen[3];
    var wackler = 0;
    if (k === 2 && t > flugZeiten[2] + flugDauer + 0.6 && t < flugZeiten[2] + flugDauer + 1.4) wackler = Math.sin(t * 40) * sh * 0.008;

    var ox = sx + sw * 0.72, oh = sh * 0.62, omsiDa = k >= 1;
    if (k === 1) ox = sx + sw * 1.15 - sw * 0.43 * glatt(0, 2.6, t);
    var oGeht = k === 1 && t < 2.6 ? t : 0;

    // ── Figuren: Wippen und Neigen beim Gehen, sonst ganz leises Atmen ──
    var bilderDa = !!(SPR.klein.cv && SPR.gross.cv && SPR.omsi.cv);
    var kLift = kh * ((kGeht ? Math.abs(Math.sin(kGeht * 7)) * 0.035 : 0) + kHopp * 0.07 + freude * 0.05);
    var kNeig = (kGeht ? Math.sin(kGeht * 7) * 0.05 : 0) + Math.sin(t * 1.6) * 0.006 - kHopp * 0.025;
    // Wachstum: beim letzten großen Schritt blendet das Kind in den erwachsenen Kevin über
    var gross = k >= 3 ? 1 : glatt(0.72, 0.9, kh / sh);
    var kFig = figur(lc, SPR.klein, kx, gy + wackler, kh, kLift, kNeig, bilderDa ? 1 - gross : 0, true);
    var gFig = figur(lc, SPR.gross, kx, gy + wackler, kh, kLift, kNeig, bilderDa ? gross : 0, true);
    var kHand = mischen(punkt(kFig, SPR.klein.hand), punkt(gFig, SPR.gross.hand), gross);

    var oLift = oGeht ? Math.abs(Math.sin(oGeht * 6)) * oh * 0.022 : 0;
    var oNeig = (oGeht ? Math.sin(oGeht * 6) * 0.035 : 0) + Math.sin(t * 1.3 + 1) * 0.005;
    var oFig = figur(lc, SPR.omsi, ox, gy, oh, oLift, oNeig, bilderDa && omsiDa ? 1 : 0);
    var oHand = punkt(oFig, SPR.omsi.hand);

    // Pfanne: Omsi hält sie, in Strophe 5 wandert sie zu Kevin (und dreht sich dabei um)
    var pfanneBei = 0; // 0 = Omsi, 1 = Kevin
    if (k === 4) pfanneBei = glatt(0.8, 2.8, t);
    // Größe nach der Hand, die sie hält (beim großen Kevin etwas größer, sonst wirkt sie wie Spielzeug)
    var groesse = 1 + (kh * 0.3 / (oh * 0.36) - 1) * pfanneBei;
    var pfLaenge = oh * 0.36 * groesse, r = oh * 0.085 * groesse;
    var pf = mischen(oHand, kHand, pfanneBei);
    pf.y -= Math.sin(pfanneBei * Math.PI) * sh * 0.12;
    var pfSeite = -Math.cos(pfanneBei * Math.PI);
    var pfDreh = oNeig * (1 - pfanneBei) + kNeig * pfanneBei - Math.sin(pfanneBei * Math.PI) * 0.35;
    var omsiMulde = mulde(oHand, pfLaenge, -1, oNeig), kevinMulde = mulde(kHand, pfLaenge, 1, kNeig);
    var fangHand = { x: kHand.x, y: kHand.y - r * 0.3 };

    if (!bilderDa) {   // Ersatz, falls die Bilder (noch) nicht geladen sind: die alten gezeichneten Figuren
      kind(lc, kx, gy + wackler - kLift, kh, kGeht, kHopp * 0.5, pfanneBei > 0.95 ? pf : null);
      if (omsiDa) omsi(lc, ox, gy - oLift, oh, oGeht, pfanneBei < 0.05 ? pf : null);
    }
    var pfMulde = null;
    if (omsiDa || k === 4) pfMulde = pfanneBild(lc, pf, pfLaenge, pfSeite, pfDreh);

    // ── Pfannekuchen ──
    function flug(t0, dauer, von, nach, hoehe, flips, name) {
      if (t < t0 || t > t0 + dauer) return false;
      var u = (t - t0) / dauer;
      einmal(name + "hopp", t, t0, KLANG.hopp);
      var x = von.x + (nach.x - von.x) * u, y = von.y + (nach.y - von.y) * u - Math.sin(u * Math.PI) * hoehe;
      kuchen(lc, x, y, r, u * Math.PI * 2 * flips, Math.sin(u * Math.PI) * 0.3 * (nach.x < von.x ? -1 : 1));
      return true;
    }
    if (k === 1) {
      if (!flug(3.6, 1.8, omsiMulde, omsiMulde, sh * 0.45, 2, "a") && pfMulde) kuchen(lc, pfMulde.x, pfMulde.y, r, LIEGT, pfDreh);
      einmal("plopp1", t, 5.4, KLANG.plopp);
    }
    if (k === 2) {
      for (var j = 0; j < 3; j++) flug(flugZeiten[j], flugDauer, omsiMulde, fangHand, sh * 0.35, 1.5, "f" + j);
    }
    if (k === 3) {
      var takt = 1.7, nr = Math.floor(t / takt);
      var hin = nr % 2 === 0;
      flug(nr * takt, takt * 0.8, hin ? omsiMulde : fangHand, hin ? fangHand : omsiMulde, sh * 0.3, 1.5, "j" + nr);
      // Sonne und Mond ziehen vorbei: die Jahre vergehen
      var himmelU = (t % 1.7) / 1.7, istSonne = nr % 2 === 0;
      var hx = sx + sw * (0.05 + 0.9 * himmelU), hy = sy + sh * 0.14 - Math.sin(himmelU * Math.PI) * sh * 0.07;
      lc.save(); lc.shadowBlur = 7;
      if (istSonne) {
        lc.beginPath(); lc.arc(hx, hy, sh * 0.045, 0, Math.PI * 2); lc.fill();
        lc.lineWidth = 4; lc.lineCap = "round";
        for (var s = 0; s < 8; s++) { var a = s * Math.PI / 4 + t; lc.beginPath(); lc.moveTo(hx + Math.cos(a) * sh * 0.06, hy + Math.sin(a) * sh * 0.06); lc.lineTo(hx + Math.cos(a) * sh * 0.085, hy + Math.sin(a) * sh * 0.085); lc.stroke(); }
      } else {
        lc.beginPath(); lc.arc(hx, hy, sh * 0.045, 0.5, Math.PI * 2 - 0.5); lc.arc(hx + sh * 0.02, hy, sh * 0.035, Math.PI * 2 - 0.9, 0.9, true); lc.fill();
      }
      lc.restore();
    }
    if (k === 4) {
      if (!flug(3.6, 2.2, kevinMulde, kevinMulde, sh * 0.62, 3, "g")) {
        if (pfanneBei > 0.95 && pfMulde) kuchen(lc, pfMulde.x, pfMulde.y, r, LIEGT, pfDreh);
      }
      einmal("tusch", t, 5.9, KLANG.tusch);
    }

    // Schattenebene gemeinsam aufs Laken
    ctx.save();
    ctx.globalAlpha = 0.9 * licht;
    ctx.drawImage(ebene.cv, sx, sy, sw, sh);
    ctx.restore();
  }

  // ───────────── Ersatzfiguren (gezeichnet), nur falls die Bilder fehlen ─────────────
  function kind(ctx, x, gy, h, geht, arm, pfanneHand) {
    var bob = geht ? Math.abs(Math.sin(geht * 7)) * h * 0.03 : 0;
    var schritt = geht ? Math.sin(geht * 7) * h * 0.1 : 0;
    var y = gy - bob;
    ctx.lineCap = "round";
    // Beine
    ctx.lineWidth = h * 0.085;
    ctx.beginPath(); ctx.moveTo(x - h * 0.04, y - h * 0.44); ctx.lineTo(x - h * 0.05 + schritt, gy - h * 0.02);
    ctx.moveTo(x + h * 0.04, y - h * 0.44); ctx.lineTo(x + h * 0.05 - schritt, gy - h * 0.02); ctx.stroke();
    // Schuhe
    ctx.beginPath(); ctx.ellipse(x - h * 0.02 + schritt, gy - h * 0.02, h * 0.06, h * 0.03, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + h * 0.08 - schritt, gy - h * 0.02, h * 0.06, h * 0.03, 0, 0, Math.PI * 2); ctx.fill();
    // Körper
    rundRechteck(ctx, x - h * 0.13, y - h * 0.8, h * 0.26, h * 0.4, h * 0.07); ctx.fill();
    // Arme
    ctx.lineWidth = h * 0.065;
    ctx.beginPath(); ctx.moveTo(x - h * 0.1, y - h * 0.74); ctx.lineTo(x - h * 0.16, y - h * 0.5 + arm * h * 0.05); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + h * 0.1, y - h * 0.74);
    if (pfanneHand) ctx.lineTo(pfanneHand.x - h * 0.05, pfanneHand.y + h * 0.02);
    else ctx.lineTo(x + h * 0.2, y - h * 0.58 + arm * h * 0.08);
    ctx.stroke();
    // Kopf (Profil nach rechts) + Nase
    ctx.beginPath(); ctx.arc(x, y - h * 0.9, h * 0.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + h * 0.1, y - h * 0.93); ctx.lineTo(x + h * 0.16, y - h * 0.88); ctx.lineTo(x + h * 0.1, y - h * 0.85); ctx.fill();
    // Strubbelhaare
    for (var i = 0; i < 6; i++) {
      var a = Math.PI * (1.05 + i * 0.16);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a - 0.2) * h * 0.11, y - h * 0.9 + Math.sin(a - 0.2) * h * 0.11);
      ctx.lineTo(x + Math.cos(a) * h * 0.2, y - h * 0.9 + Math.sin(a) * h * 0.2);
      ctx.lineTo(x + Math.cos(a + 0.2) * h * 0.11, y - h * 0.9 + Math.sin(a + 0.2) * h * 0.11);
      ctx.fill();
    }
  }

  function omsi(ctx, x, gy, h, geht, pfanneHand) {
    var bob = geht ? Math.abs(Math.sin(geht * 6)) * h * 0.025 : 0;
    var schritt = geht ? Math.sin(geht * 6) * h * 0.06 : 0;
    var y = gy - bob;
    ctx.lineCap = "round";
    ctx.lineWidth = h * 0.07;
    ctx.beginPath(); ctx.moveTo(x - h * 0.05, y - h * 0.35); ctx.lineTo(x - h * 0.06 + schritt, gy - h * 0.02);
    ctx.moveTo(x + h * 0.05, y - h * 0.35); ctx.lineTo(x + h * 0.06 - schritt, gy - h * 0.02); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x - h * 0.1 + schritt, gy - h * 0.02, h * 0.06, h * 0.025, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x - h * 0.02 - schritt, gy - h * 0.02, h * 0.06, h * 0.025, 0, 0, Math.PI * 2); ctx.fill();
    // Strickjacke: A-Form
    ctx.beginPath();
    ctx.moveTo(x - h * 0.12, y - h * 0.78); ctx.quadraticCurveTo(x - h * 0.2, y - h * 0.5, x - h * 0.2, y - h * 0.3);
    ctx.lineTo(x + h * 0.19, y - h * 0.3); ctx.quadraticCurveTo(x + h * 0.19, y - h * 0.5, x + h * 0.12, y - h * 0.78);
    ctx.closePath(); ctx.fill();
    // Arm zur Pfanne (nach links, zu Kevin)
    ctx.lineWidth = h * 0.06;
    ctx.beginPath(); ctx.moveTo(x - h * 0.1, y - h * 0.72);
    if (pfanneHand) ctx.lineTo(pfanneHand.x, pfanneHand.y); else ctx.lineTo(x - h * 0.2, y - h * 0.45);
    ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + h * 0.1, y - h * 0.72); ctx.lineTo(x + h * 0.16, y - h * 0.46); ctx.stroke();
    // Kopf (Profil nach links) + Nase
    ctx.beginPath(); ctx.arc(x, y - h * 0.88, h * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - h * 0.09, y - h * 0.91); ctx.lineTo(x - h * 0.15, y - h * 0.86); ctx.lineTo(x - h * 0.09, y - h * 0.83); ctx.fill();
    // kurze, verstrubbelte Haare
    for (var i = 0; i < 9; i++) {
      var a = Math.PI * (0.95 + i * 0.13);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a - 0.14) * h * 0.1, y - h * 0.88 + Math.sin(a - 0.14) * h * 0.1);
      ctx.lineTo(x + Math.cos(a) * h * 0.16, y - h * 0.88 + Math.sin(a) * h * 0.16);
      ctx.lineTo(x + Math.cos(a + 0.14) * h * 0.1, y - h * 0.88 + Math.sin(a + 0.14) * h * 0.1);
      ctx.fill();
    }
  }

  function pfanne(ctx, x, y, r, kevinHaelt) {
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = r * 0.16;
    var richtung = kevinHaelt > 0.5 ? -1 : 1;
    ctx.beginPath(); ctx.moveTo(x + richtung * r * 0.9, y); ctx.lineTo(x + richtung * r * 2.1, y + r * 0.05); ctx.stroke();
  }

  function pfannekuchen(ctx, x, y, r, phase) {
    ctx.beginPath(); ctx.ellipse(x, y, r, Math.max(r * 0.12, r * Math.abs(Math.cos(phase)) * 0.9), 0, 0, Math.PI * 2); ctx.fill();
  }

  function rundRechteck(ctx, x, y, b, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + b - r, y); ctx.quadraticCurveTo(x + b, y, x + b, y + r);
    ctx.lineTo(x + b, y + h - r); ctx.quadraticCurveTo(x + b, y + h, x + b - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
})();
