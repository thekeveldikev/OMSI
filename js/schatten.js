/* Schattentheater hinter dem Laken – live gezeichnet, synchron zu den Strophen.
   Auftakt: Der Raum wird dunkel, die Taschenlampe klickt an und schwenkt von der Wand aufs Laken.
   Klein-Kevin kommt als riesiger, weicher Schatten nah an der Lampe herein und wird auf dem Laken
   klein und scharf; Omsi bringt die Pfanne; mit jedem Pfannekuchen wächst er, bis der Kopf oben
   anstößt; die Jahre ziehen über das Haus; am Ende wechselt die Pfanne von Omsi zu Kevin.
   Finale: Verbeugung, Licht aus bis auf ein Glimmen, „Ende“ in Schattenschrift.
   Vorn sitzen Omsi und die Katze als Publikum (von hinten) und reagieren.

   Aufbau je Bild: Raum (vorgerendert) → Licht auf dem Laken minus Schatten → Lichteffekte → Staub
   → Publikum. Schatten entstehen auf einer eigenen Ebene (nur die Deckkraft zählt) und werden aus
   dem Licht ausgestanzt – ein Schatten zeigt so einfach das unbeleuchtete Tuch, Überschneidungen
   werden nie dunkler. Alles Teure (Raum, Laken, Unschärfe-Stufen, Publikum, Stabfiguren) wird
   einmal vorgerendert; je Bild bleiben nur drawImage-Aufrufe.

   Testhilfe (das Vorschaufenster pausiert requestAnimationFrame oft):
   SCHATTEN.test.zeit(sekunden, strophe) hält an und zeichnet genau dieses Bild
   (strophe -1 = Auftakt, 0–4 = Strophen, 5 = Finale; sekunden = Zeit des Schattenspiels),
   SCHATTEN.test.messen(strophe, bilder) misst die Zeichenzeit, SCHATTEN.test.weiter() läuft weiter. */
(function () {
  var SCH = window.SCHATTEN = {};
  var lauf = null;
  var abschluss = null;
  SCH.stoppen = function () { if (abschluss) abschluss(false, true); };
  SCH.bereit = function () { return TEILE_GELADEN && TEILE_OFFEN === 0; };
  SCH.dateien = function () {
    var d = ["daten/schatten.js", "js/schatten.js"];
    Object.keys(window.SCHATTEN_TEILE || {}).forEach(function (n) { d.push("bilder/schatten/" + n + ".png"); });
    for (var i = 1; i <= 5; i++) d.push("audio/fortsetzung/schatten-" + i + ".m4a");
    return d;
  };
  SCH.zustand = function () {
    return lauf ? { strophe: lauf.k, pausiert: lauf.pause, zeit: ((lauf.pause ? lauf.pauseZeit : B.jetzt()) - lauf.t0) / 1000, fehlendeBilder: TEILE_FEHLER.slice() } : null;
  };

  var DAUER = [9.5, 9.5, 10.5, 9.5, 8.5];
  var AUFTAKT = 2.6;   // Sekunden vor der ersten Strophe: Raum dunkelt ab, Lampe klickt an
  var FINALE = 8.2;    // Sekunden nach der letzten Strophe: Verbeugung, Licht aus, „Ende“

  var uhr = 0;         // durchlaufende Zeit für ruhige Nebenbewegungen (Atmen, Staub, Flackern)
  var SKALA = 1;       // Pixel je Bildschirmpunkt der Leinwand (Retina 2; auf langsamen Geräten weniger)
  var QUALI = null;    // einmal ermittelte, gerätegerechte Stufe (gilt für weitere Vorstellungen)
  var RUHIG = false;   // prefers-reduced-motion: kein Flackern, kein Wogen, kein Zittern

  function glatt(a, b, t) { var u = B.klemme((t - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); }
  function ruhigAbfragen() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }

  SCH.test = { zeit: function () { return "Erst SCHATTEN.starten(…) aufrufen"; } };

  SCH.starten = function (verse, fertig) {
    if (lauf) return;
    SCH.stoppen();
    cutoutsLaden();
    KLANG.entsperren();
    RUHIG = ruhigAbfragen();
    var strophen = verse.map(function (st) { return st.map(B.ersetzen); });
    var n = strophen.length;
    var wurzel = B.el("div", "schatten-bildschirm", document.body);
    var fokusVorher = document.activeElement, geschlossen = false, entfernt = false, ausTimer = 0, hinweisTimer = 0, bereitGemeldet = false;
    wurzel.setAttribute("role", "dialog"); wurzel.setAttribute("aria-modal", "true"); wurzel.setAttribute("aria-label", "Das Schattentheater");
    var cv = B.el("canvas", "schatten-canvas", wurzel);
    var text = B.el("div", "schatten-text", wurzel);
    var zu = B.knopf(B.el("button", "knopf schatten-zu", wurzel), "kreuz", "Schließen");
    var hinweis = B.el("div", "schatten-hinweis", wurzel, "Tippen = nächste Strophe");
    var bedienung = B.el("div", "schatten-bedienung", wurzel);
    var pause = B.knopf(B.el("button", "knopf schatten-pause", bedienung), "pause", "Pause");
    var nochmal = B.knopf(B.el("button", "knopf schatten-nochmal", bedienung), "wieder", "Noch einmal");
    pause.setAttribute("aria-pressed", "false");
    zu.focus();
    var W, H, ctx, skala = QUALI || Math.min(window.devicePixelRatio || 1, 2);
    function groesse() {
      W = window.innerWidth; H = window.innerHeight; SKALA = skala;
      cv.width = Math.round(W * skala); cv.height = Math.round(H * skala);
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx = cv.getContext("2d");
      text.style.top = Math.round(lage(W, H).textOben) + "px";   // Verse direkt unter Laken und Publikum
      if (lauf && (lauf.pause || lauf.test)) bild(lauf.k, lauf.zeitBild || 0);
    }
    groesse();
    window.addEventListener("resize", groesse, false);

    // k = -1: Auftakt, 0 … n-1: Strophen, n: Finale
    lauf = { k: -1, t0: B.jetzt(), start: B.jetzt(), id: 0, zeilen: [], ereignisse: {}, laenge: AUFTAKT, test: false, pause: false, pauseZeit: 0, takte: [], bilder: 0, letztes: 0 };
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
        var p = lauf && !lauf.pause ? a.play() : null;
        if (p && p["catch"]) p["catch"](function () {});
      }
      a.onloadedmetadata = function () {
        if (a === stimme && lauf && lauf.k === k && a.duration && isFinite(a.duration)) lauf.laenge = Math.max(DAUER[k], a.duration + 0.8);
      };
      a.onerror = probiere;
      probiere();
    }

    function zeilenFuer(k) {
      B.leeren(text);
      lauf.zeilen = strophen[k].map(function (z) { var d = B.el("div", "schatten-zeile", text, z); return d; });
    }
    function strophe(k) {
      lauf.k = k; lauf.t0 = B.jetzt(); lauf.ereignisse = {}; lauf.laenge = DAUER[k];
      zeilenFuer(k);
      stimmeStarten(k);
      if (lauf.pause) lauf.pauseZeit = lauf.t0;
    }
    function finale() {
      stimmeStopp();
      lauf.k = n; lauf.t0 = B.jetzt(); lauf.ereignisse = {}; lauf.laenge = FINALE;
      lauf.zeilen.forEach(function (z) { z.style.opacity = "0"; });
    }

    function ende(sanft, still) {
      if (entfernt) return;
      if (!geschlossen) {
        geschlossen = true;
        stimmeStopp();
        if (window.KULISSE) { var bz = window.BUCH && BUCH.zustand(); KULISSE.leiser(!!(bz && bz.vorlesen)); }
        if (lauf) B.frameStopp(lauf.id); lauf = null;
        window.removeEventListener("resize", groesse, false);
        document.removeEventListener("keydown", tastatur, true);
        document.removeEventListener("visibilitychange", sichtbar, false);
      }
      clearTimeout(ausTimer);
      clearTimeout(hinweisTimer);
      function weg() {
        if (entfernt) return;
        entfernt = true; abschluss = null;
        if (wurzel.parentNode) wurzel.parentNode.removeChild(wurzel);
        if (!lauf) buehneFreigeben();   // große Zwischenbilder freigeben (Canvas-Speicher auf dem iPad)
        if (!still && fokusVorher && document.documentElement.contains(fokusVorher)) fokusVorher.focus();
        if (!still && fertig) fertig();
      }
      // am natürlichen Ende sanft ausblenden, beim Schließen sofort weg
      if (sanft) { wurzel.className += " schatten-weg"; ausTimer = setTimeout(weg, 950); } else weg();
    }
    abschluss = ende;
    function pausieren() {
      if (!lauf) return;
      if (!lauf.pause) {
        lauf.pause = true; lauf.pauseZeit = B.jetzt(); B.frameStopp(lauf.id);
        if (stimme) stimme.pause();
      } else {
        var delta = B.jetzt() - lauf.pauseZeit;
        lauf.t0 += delta; lauf.start += delta; lauf.pause = false; lauf.letztes = 0;
        if (stimme) { var p = stimme.play(); if (p && p["catch"]) p["catch"](function () {}); }
        lauf.id = B.frame(schritt);
      }
      if (lauf.pause) B.knopf(pause, "abspielen", "Weiter"); else B.knopf(pause, "pause", "Pause");
      pause.setAttribute("aria-pressed", lauf.pause ? "true" : "false");
    }
    function weiter() {
      if (!lauf || !SCH.bereit()) return;
      if (lauf.k < n - 1) strophe(lauf.k + 1); else if (lauf.k === n - 1) finale(); else { ende(); return; }
      if (lauf.pause) { lauf.pauseZeit = lauf.t0; bild(lauf.k, 0); }
    }
    function sichtbar() { if (document.hidden && lauf && !lauf.pause) pausieren(); }
    function tastatur(ev) {
      // Buch-Tastenkürzel dürfen unter dem geöffneten Theater nicht mitlaufen.
      if ([9,27,32,37,39].indexOf(ev.keyCode) >= 0) ev.stopPropagation();
      if (ev.keyCode === 27) { ev.preventDefault(); ev.stopPropagation(); ende(); }
      else if (ev.keyCode === 32 && ev.target.tagName !== "BUTTON") { ev.preventDefault(); pausieren(); }
      else if (ev.keyCode === 39) { ev.preventDefault(); weiter(); }
      else if (ev.keyCode === 9) {
        var knoepfe = [zu, pause, nochmal], i = knoepfe.indexOf(document.activeElement);
        ev.preventDefault(); knoepfe[(i + (ev.shiftKey ? 2 : 1)) % 3].focus();
      }
    }
    document.addEventListener("keydown", tastatur, true);
    document.addEventListener("visibilitychange", sichtbar, false);
    B.tippen(pause, function (ev) { ev.stopPropagation(); pausieren(); });
    B.tippen(nochmal, function (ev) {
      ev.stopPropagation(); if (!lauf) return;
      stimmeStopp(); B.frameStopp(lauf.id); lauf.k = -1; lauf.t0 = lauf.start = B.jetzt();
      lauf.ereignisse = {}; lauf.test = false; lauf.pause = false; lauf.laenge = AUFTAKT;
      lauf.zeilen = []; B.leeren(text); B.knopf(pause, "pause", "Pause"); pause.setAttribute("aria-pressed", "false");
      lauf.id = B.frame(schritt);
    });
    B.tippen(zu, function (ev) { ev.stopPropagation(); ende(); });
    B.tippen(wurzel, function () {
      weiter();
    });

    // einmalige Ereignisse (Geräusche) je Abschnitt
    function einmal(name, t, ab, fn) { if (t >= ab && !lauf.ereignisse[name]) { lauf.ereignisse[name] = true; if (!lauf.test) fn(); } }

    // ein Bild: k = Abschnitt, t = Zeit des Schattenspiels in diesem Abschnitt
    function bild(k, t) {
      lauf.zeitBild = t;
      if (k >= 0 && k < n) {
        var nz = lauf.zeilen.length, d = DAUER[k] || DAUER[DAUER.length - 1];
        lauf.zeilen.forEach(function (z, i) { z.style.opacity = t > 0.6 + i * (d - 2) / nz ? "1" : "0"; });
      }
      zeichne(ctx, W, H, k < 0 ? -1 : (k >= n ? 5 : Math.min(k, 4)), t, einmal);
    }

    // Qualitätsautomatik: schafft das Gerät keine ~50 Bilder je Sekunde, rechnet die Leinwand mit
    // weniger Pixeln (2 → 1,5 → 1,25). Gemessen wird während des Auftakts, solange es dunkel ist.
    function takt(jetzt) {
      if (lauf.takte && !document.hidden && lauf.letztes) {
        var d = jetzt - lauf.letztes;
        if (lauf.bilder++ > 6 && d < 250) lauf.takte.push(d);
        if (lauf.takte.length >= 30) {
          var s = lauf.takte.slice().sort(function (a, b) { return a - b; }), mitte = s[15];
          lauf.takte = [];
          if (mitte > 19 && skala > 1.3) { skala = QUALI = skala > 1.6 ? 1.5 : 1.25; lauf.bilder = 0; groesse(); }
          else lauf.takte = null;
        }
      }
      lauf.letztes = jetzt;
    }

    function schritt() {
      if (!lauf || lauf.test || lauf.pause) return;
      if (!SCH.bereit()) {
        hinweis.textContent = "Die Bühne wird vorbereitet …";
        lauf.t0 = lauf.start = B.jetzt(); bild(-1, 0); lauf.id = B.frame(schritt); return;
      }
      if (!bereitGemeldet) {
        bereitGemeldet = true; hinweis.textContent = "Tippen = nächste Strophe";
        hinweisTimer = setTimeout(function () { hinweis.style.opacity = "0"; }, 4000);
      }
      var jetzt = B.jetzt(), k = lauf.k, echt = (jetzt - lauf.t0) / 1000;
      uhr = (jetzt - lauf.start) / 1000;
      takt(jetzt);
      if (k < 0) {
        if (echt >= AUFTAKT) { strophe(0); lauf.id = B.frame(schritt); return; }
        bild(k, echt);
      } else if (k >= n) {
        if (echt >= FINALE) { ende(true); return; }
        bild(k, echt);
      } else {
        if (echt > lauf.laenge + 1.2 && !stimmeLaeuft()) { if (k < n - 1) strophe(k + 1); else finale(); lauf.id = B.frame(schritt); return; }
        var t = echt * DAUER[k] / lauf.laenge;          // Zeit des Schattenspiels (gedehnt, falls die Aufnahme länger ist)
        bild(k, t);
      }
      lauf.id = B.frame(schritt);
    }
    lauf.id = B.frame(schritt);

    // Testhilfe: Einzelbilder vorspulen, Zeichenzeit messen
    function testAbschnitt(k) {
      k = k === undefined ? lauf.k : (k < 0 ? -1 : Math.min(k, n));
      if (k !== lauf.k) {
        lauf.k = k;
        if (k >= 0 && k < n) zeilenFuer(k); else lauf.zeilen.forEach(function (z) { z.style.opacity = "0"; });
      }
      return k;
    }
    SCH.test = {
      zeit: function (sek, k) {
        if (!lauf) return "Schattentheater läuft nicht";
        lauf.test = true; B.frameStopp(lauf.id); stimmeStopp();
        k = testAbschnitt(k);
        lauf.ereignisse = {};
        uhr = 20 + sek + (k + 1) * 11;
        var a = B.jetzt(); bild(k, sek);
        return Math.round((B.jetzt() - a) * 100) / 100;
      },
      messen: function (k, bilder) {
        if (!lauf) return "Schattentheater läuft nicht";
        lauf.test = true; B.frameStopp(lauf.id); stimmeStopp();
        k = testAbschnitt(k); bilder = bilder || 60;
        var d = k < 0 ? AUFTAKT : (k >= n ? FINALE : (DAUER[k] || 9.5) + 0.9), summe = 0, max = 0;
        bild(k, 0);   // Vorrat anlegen (zählt nicht)
        for (var i = 0; i < bilder; i++) {
          lauf.ereignisse = {}; uhr = 20 + i / 60;
          var a = B.jetzt(); bild(k, d * i / bilder); var z = B.jetzt() - a;
          summe += z; if (z > max) max = z;
        }
        return { mittel: Math.round(summe / bilder * 100) / 100, max: Math.round(max * 100) / 100, bilder: bilder };
      },
      weiter: function () { if (lauf && lauf.test) { lauf.test = false; lauf.t0 = B.jetzt(); lauf.id = B.frame(schritt); } }
    };
  };

  // ───────────────── Bühne: Maße (für Hoch- und Querformat) ─────────────────
  function zufall(saat) { var s = saat >>> 0 || 1; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  function lage(W, H) {
    var L = { W: W, H: H, hoch: H > W };
    if (!L.hoch) { L.sx = W * 0.1; L.sw = W * 0.8; L.sy = H * 0.085; L.sh = H * 0.58; }
    else { L.sw = W * 0.9; L.sx = W * 0.05; L.sy = H * 0.085; L.sh = Math.min(H * 0.48, L.sw / 1.4); }
    L.eck = L.sh * 0.06;                          // die Ecken des Lakens hängen tiefer
    L.gy = L.sy + L.sh * 0.94;                    // Fußlinie der Schattenfiguren
    L.mitte = L.sx + L.sw / 2;
    L.A = Math.min(L.sh, L.sw * 0.62);            // Maß für Abstände (hochkant enger)
    L.kX = L.mitte - 0.4 * L.A; L.oX = L.mitte + 0.4 * L.A;
    L.lampe = { x: L.mitte, y: L.gy - L.sh * 0.24 };   // Lampe hinter dem Laken: Zentrum der Schattenprojektion
    L.ex = L.sx - L.sw * 0.03; L.ey = L.sy - L.sh * 0.04; L.ew = L.sw * 1.06; L.eh = L.sh * 1.16;
    // Publikum: Omsi und die Katze von hinten
    L.u = Math.min(W * 1.15, H * 1.45);
    var kb = L.u * 0.125;
    L.omsiX = L.hoch ? W * 0.17 : W * 0.105;
    L.omsiY = L.hoch ? L.gy + H * 0.012 : L.gy - H * 0.085;            // Oberkante der Haare
    L.katzeX = L.omsiX + L.u * 0.098;
    L.textOben = L.hoch ? L.omsiY + kb * 1.45 + H * 0.02 : L.sy + L.sh + L.eck + H * 0.02;
    // Wäscheklammern, Saum und Falten: fest (Saat), damit das Tuch bei jeder Größe gleich hängt
    var zf = zufall(15), nk = L.hoch ? 5 : 6, i;
    L.klammern = []; for (i = 0; i < nk; i++) L.klammern.push(L.sx + L.sw * (i + 0.5) / nk);
    L.saum = [];
    for (i = 0; i <= 8; i++) { var u = i / 8, r = Math.pow(Math.abs(u - 0.5) * 2, 3); L.saum.push({ x: L.sx + L.sw * u, y: L.sy + L.sh + L.eck * r + L.sh * (zf() - 0.5) * 0.02 }); }
    L.falten = []; for (i = 0; i < 12; i++) L.falten.push({ u: 0.03 + 0.94 * zf(), b: 0.02 + zf() * 0.06, hell: zf() < 0.45, a: 0.5 + zf() * 0.5 });
    return L;
  }

  // Umriss des Lakens (Klammern oben, Seiten leicht nach außen, geschwungener Saum)
  function lakenPfad(x, L, weiter) {
    var k = L.klammern, y0 = L.sy, s = L.saum, n = s.length, px = L.sx, i;
    if (!weiter) x.beginPath();
    x.moveTo(L.sx, y0);
    for (i = 0; i < k.length; i++) { x.quadraticCurveTo((px + k[i]) / 2, y0 + L.sh * 0.013, k[i], y0); px = k[i]; }   // hängt zwischen den Klammern durch
    x.quadraticCurveTo((px + L.sx + L.sw) / 2, y0 + L.sh * 0.013, L.sx + L.sw, y0);
    x.quadraticCurveTo(L.sx + L.sw * 1.012, L.sy + L.sh * 0.55, s[n - 1].x, s[n - 1].y);
    for (i = n - 2; i >= 1; i--) x.quadraticCurveTo(s[i].x, s[i].y, (s[i].x + s[i - 1].x) / 2, (s[i].y + s[i - 1].y) / 2);
    x.lineTo(s[0].x, s[0].y);
    x.quadraticCurveTo(L.sx - L.sw * 0.012, L.sy + L.sh * 0.55, L.sx, y0);
    x.closePath();
  }

  // ───────────────── Vorrat je Bildschirmgröße ─────────────────
  var buehne = null, BUEHNE = null;
  function leinwand(b, h) { var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(b)); c.height = Math.max(1, Math.round(h)); return c; }

  function buehneHolen(W, H) {
    var dpr = SKALA;
    if (buehne && buehne.W === W && buehne.H === H && buehne.dpr === dpr) return buehne;
    buehneFreigeben();
    var L = lage(W, H); L.dpr = dpr;
    glanzHolen();
    L.hinter = hinterBauen(L);
    L.hell = hellBauen(L);
    L.warm = warmBauen(L);
    L.S = ebeneNeu(L); L.Lt = ebeneNeu(L);
    L.pub = publikumBauen(L);
    buehne = BUEHNE = L;
    return L;
  }
  function buehneFreigeben() {
    if (!buehne) return;
    var b = buehne, p = b.pub;
    [b.hinter, b.hell, b.warm, b.S.cv, b.Lt.cv, p.kopf.dunkel, p.kopf.rand, p.rumpf.dunkel, p.rumpf.rand, p.katze.dunkel, p.katze.rand].forEach(function (c) { if (c) { c.width = 1; c.height = 1; } });
    buehne = BUEHNE = null;
  }
  function ebeneNeu(L) { var c = leinwand(L.ew * L.dpr, L.eh * L.dpr); return { cv: c, x: c.getContext("2d") }; }
  function ebeneBereit(e, L) {
    var x = e.x;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
    x.clearRect(0, 0, e.cv.width, e.cv.height);
    x.setTransform(L.dpr, 0, 0, L.dpr, -L.ex * L.dpr, -L.ey * L.dpr);
    return x;
  }

  // Raum: Wand und Boden in Papier-Collage wie die Buchbilder, Wäscheständer, unbeleuchtetes Laken, Vignette
  function hinterBauen(L) {
    var W = L.W, H = L.H, c = leinwand(W * L.dpr, H * L.dpr), x = c.getContext("2d"), zf = zufall(7);
    x.setTransform(L.dpr, 0, 0, L.dpr, 0, 0);
    var wand = (L.sy + L.sh * 0.92) / H, g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0b1330"); g.addColorStop(wand, "#111b3e"); g.addColorStop(Math.min(1, wand + 0.012), "#0c1432"); g.addColorStop(1, "#050917");
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    var gr = Math.max(W, H);
    for (var i = 0; i < 460; i++) {
      var px = zf() * W, py = zf() * H, r = (0.008 + zf() * 0.03) * gr, unten = py > wand * H;
      x.fillStyle = "hsla(" + Math.round(219 + zf() * 14) + "," + Math.round(32 + zf() * 26) + "%," + Math.round((unten ? 7 : 11) + zf() * (unten ? 8 : 12)) + "%," + (0.22 + zf() * 0.3).toFixed(2) + ")";
      x.beginPath();
      var ecken = 4 + Math.floor(zf() * 3), w0 = zf() * 6.28;
      for (var e = 0; e < ecken; e++) { var w = w0 + e * 6.283 / ecken, rr = r * (0.55 + zf() * 0.6); x.lineTo(px + Math.cos(w) * rr, py + Math.sin(w) * rr * 0.7); }
      x.closePath(); x.fill();
    }
    gestell(x, L);
    lakenDunkel(x, L, zf);
    var v = x.createRadialGradient(W / 2, H * 0.42, Math.min(W, H) * 0.28, W / 2, H * 0.45, gr * 0.8);
    v.addColorStop(0, "rgba(2,4,12,0)"); v.addColorStop(1, "rgba(2,4,12,0.75)");
    x.fillStyle = v; x.fillRect(0, 0, W, H);
    return c;
  }

  // Wäscheaufhänger: Stange oben, gekreuzte Beine an den Seiten (wie auf der Buchseite)
  function gestell(x, L) {
    var x0 = L.sx - L.sw * 0.035, x1 = L.sx + L.sw * 1.035, y0 = L.sy - 2, boden = L.sy + L.sh + L.eck + L.sh * 0.1;
    var lw = Math.max(3, L.H * 0.0065);
    x.lineCap = "round"; x.lineJoin = "round";
    function pfad(d) {
      x.beginPath();
      x.moveTo(x0 - L.sw * 0.02, boden + d); x.lineTo(x0, y0 + L.sh * 0.06 + d); x.quadraticCurveTo(x0, y0 + d, x0 + L.sw * 0.03, y0 + d);
      x.lineTo(x1 - L.sw * 0.03, y0 + d); x.quadraticCurveTo(x1, y0 + d, x1, y0 + L.sh * 0.06 + d); x.lineTo(x1 + L.sw * 0.02, boden + d);
      x.moveTo(x0 + L.sw * 0.004, y0 + L.sh * 0.24 + d); x.lineTo(x0 + L.sw * 0.07, boden + d);
      x.moveTo(x1 - L.sw * 0.004, y0 + L.sh * 0.24 + d); x.lineTo(x1 - L.sw * 0.07, boden + d);
    }
    x.strokeStyle = "#2c3657"; x.lineWidth = lw * 1.5; pfad(0); x.stroke();
    x.strokeStyle = "#65729a"; x.lineWidth = lw * 0.45; pfad(-lw * 0.35); x.stroke();
    x.fillStyle = "#151b30";
    [x0 - L.sw * 0.02, x0 + L.sw * 0.07, x1 - L.sw * 0.07, x1 + L.sw * 0.02].forEach(function (fx) { x.beginPath(); x.ellipse(fx, boden, lw * 1.6, lw * 0.8, 0, 0, Math.PI * 2); x.fill(); });
  }

  // Falten: breite, weiche Bahnen von oben nach unten, dazu kurze Zugfalten an jeder Klammer
  function faltenMalen(x, L, dunkel, hell, staerke) {
    var sw = L.sw, sh = L.sh;
    L.falten.forEach(function (f) {
      var bx = L.sx + sw * f.u, bb = sw * f.b, farbe = f.hell ? hell : dunkel, g = x.createLinearGradient(bx - bb, 0, bx + bb, 0);
      g.addColorStop(0, farbe + "0)"); g.addColorStop(0.5, farbe + (f.a * staerke * (f.hell ? 1.2 : 1)).toFixed(3) + ")"); g.addColorStop(1, farbe + "0)");
      x.fillStyle = g; x.fillRect(bx - bb, L.sy, bb * 2, sh * 1.2);
    });
    x.lineCap = "round";
    L.klammern.forEach(function (k) {
      for (var s = -1; s <= 1; s += 2) {
        var g2 = x.createLinearGradient(k, L.sy, k + s * sw * 0.05, L.sy + sh * 0.3);
        g2.addColorStop(0, dunkel + (staerke * 0.75).toFixed(3) + ")"); g2.addColorStop(1, dunkel + "0)");
        x.strokeStyle = g2; x.lineWidth = sw * 0.012;
        x.beginPath(); x.moveTo(k, L.sy + 2); x.quadraticCurveTo(k + s * sw * 0.01, L.sy + sh * 0.09, k + s * sw * 0.035, L.sy + sh * 0.22); x.stroke();
      }
    });
  }
  // feine Papier-Striche im Stoff (wie die Collage-Struktur der Buchbilder)
  function flecken(x, L, farben, anzahl, zf) {
    x.lineCap = "round";
    for (var i = 0; i < anzahl; i++) {
      var px = L.sx + zf() * L.sw, py = L.sy + zf() * L.sh * 1.06, l = (0.006 + zf() * 0.02) * L.sw, w = -0.7 + zf() * 0.6;
      x.strokeStyle = farben[i % farben.length]; x.lineWidth = 1 + zf() * 2.5;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(w) * l, py + Math.sin(w) * l); x.stroke();
    }
  }
  // doppelte Stofflagen oben (über die Stange gelegt) und am Saum lassen weniger Licht durch
  function lagenMalen(x, L, farbe, kante) {
    x.fillStyle = farbe; x.fillRect(L.ex, L.sy - 2, L.ew, L.sh * 0.035);
    x.strokeStyle = kante; x.lineWidth = Math.max(1, L.sh * 0.004);
    x.beginPath(); x.moveTo(L.ex, L.sy + L.sh * 0.035); x.lineTo(L.ex + L.ew, L.sy + L.sh * 0.035); x.stroke();
    var s = L.saum; x.strokeStyle = farbe; x.lineWidth = L.sh * 0.05;
    x.beginPath(); x.moveTo(s[0].x, s[0].y);
    for (var i = 1; i < s.length - 1; i++) x.quadraticCurveTo(s[i].x, s[i].y, (s[i].x + s[i + 1].x) / 2, (s[i].y + s[i + 1].y) / 2);
    x.lineTo(s[s.length - 1].x, s[s.length - 1].y); x.stroke();
  }

  function lakenDunkel(x, L, zf) {
    x.save(); lakenPfad(x, L); x.clip();
    var g = x.createLinearGradient(0, L.sy, 0, L.sy + L.sh * 1.06);
    g.addColorStop(0, "#2a3356"); g.addColorStop(1, "#1b2343");
    x.fillStyle = g; x.fillRect(L.ex, L.ey, L.ew, L.eh);
    faltenMalen(x, L, "rgba(6,9,24,", "rgba(84,100,146,", 0.28);
    flecken(x, L, ["rgba(90,106,150,0.14)", "rgba(10,14,32,0.18)"], 420, zf);
    lagenMalen(x, L, "rgba(10,14,32,0.3)", "rgba(110,125,170,0.25)");
    x.restore();
  }

  // Das beleuchtete Laken (volle Helligkeit); wird je Bild mit der Lichtstärke aufgetragen
  function hellBauen(L) {
    var c = leinwand(L.ew * L.dpr, L.eh * L.dpr), x = c.getContext("2d"), zf = zufall(23);
    x.setTransform(L.dpr, 0, 0, L.dpr, -L.ex * L.dpr, -L.ey * L.dpr);
    lakenPfad(x, L); x.clip();
    var r = Math.max(L.sw, L.sh) * 0.72, g = x.createRadialGradient(L.mitte, L.sy + L.sh * 0.48, 0, L.mitte, L.sy + L.sh * 0.48, r);
    g.addColorStop(0, "rgb(255,250,236)"); g.addColorStop(0.3, "rgb(253,240,206)"); g.addColorStop(0.62, "rgb(244,213,150)"); g.addColorStop(1, "rgb(212,158,90)");
    x.fillStyle = g; x.fillRect(L.ex, L.ey, L.ew, L.eh);
    // die Seiten biegen sich weg und bekommen weniger Licht
    [[L.sx, 1], [L.sx + L.sw, -1]].forEach(function (s) {
      var sg = x.createLinearGradient(s[0], 0, s[0] + s[1] * L.sw * 0.07, 0);
      sg.addColorStop(0, "rgba(130,80,25,0.28)"); sg.addColorStop(1, "rgba(130,80,25,0)");
      x.fillStyle = sg; x.fillRect(L.ex, L.ey, L.ew, L.eh);
    });
    faltenMalen(x, L, "rgba(140,90,35,", "rgba(255,253,240,", 0.13);
    // Schatten der Ständerbeine hinter dem Tuch (die Lampe steht dahinter)
    x.save(); x.shadowColor = "rgba(90,58,22,0.6)"; x.shadowBlur = 5 * L.dpr;
    x.strokeStyle = "rgba(110,72,28,0.2)"; x.lineWidth = Math.max(2, L.sw * 0.005);
    x.beginPath();
    x.moveTo(L.sx + L.sw * 0.012, L.sy + L.sh * 0.25); x.lineTo(L.sx + L.sw * 0.075, L.sy + L.sh * 1.1);
    x.moveTo(L.sx + L.sw * 0.988, L.sy + L.sh * 0.25); x.lineTo(L.sx + L.sw * 0.925, L.sy + L.sh * 1.1);
    x.stroke(); x.restore();
    flecken(x, L, ["rgba(255,255,246,0.13)", "rgba(200,150,80,0.08)", "rgba(255,238,196,0.12)"], 900, zf);
    lagenMalen(x, L, "rgba(150,100,40,0.16)", "rgba(255,248,225,0.5)");
    return c;
  }

  // Das Tuch im Schatten bei brennender Lampe: nicht kalt-blau, sondern warm-dunkel (Streulicht im Stoff)
  function warmBauen(L) {
    var c = leinwand(L.ew * L.dpr, L.eh * L.dpr), x = c.getContext("2d");
    x.setTransform(L.dpr, 0, 0, L.dpr, -L.ex * L.dpr, -L.ey * L.dpr);
    lakenPfad(x, L); x.clip();
    var r = Math.max(L.sw, L.sh) * 0.72, g = x.createRadialGradient(L.mitte, L.sy + L.sh * 0.48, 0, L.mitte, L.sy + L.sh * 0.48, r);
    g.addColorStop(0, "rgb(62,46,33)"); g.addColorStop(1, "rgb(40,28,20)");
    x.fillStyle = g; x.fillRect(L.ex, L.ey, L.ew, L.eh);
    faltenMalen(x, L, "rgba(20,12,6,", "rgba(110,84,60,", 0.25);
    return c;
  }

  // Lichter, die sich nicht mit der Bildschirmgröße ändern (werden skaliert gezeichnet)
  var GLANZ = null;
  function kreisVerlauf(g, stufen) {
    var c = leinwand(g, g), x = c.getContext("2d"), r = x.createRadialGradient(g / 2, g / 2, 0, g / 2, g / 2, g / 2);
    stufen.forEach(function (s) { r.addColorStop(s[0], s[1]); });
    x.fillStyle = r; x.fillRect(0, 0, g, g); return c;
  }
  function bahnVerlauf(rgb) {
    var c = leinwand(64, 4), x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, "rgba(" + rgb + ",0)"); g.addColorStop(0.5, "rgba(" + rgb + ",1)"); g.addColorStop(1, "rgba(" + rgb + ",0)");
    x.fillStyle = g; x.fillRect(0, 0, 64, 4); return c;
  }
  function glanzHolen() {
    if (GLANZ) return GLANZ;
    GLANZ = {
      fleck: kreisVerlauf(256, [[0, "rgba(255,246,222,1)"], [0.35, "rgba(255,232,186,0.62)"], [0.7, "rgba(255,214,150,0.2)"], [1, "rgba(255,200,130,0)"]]),
      hof: kreisVerlauf(128, [[0, "rgba(255,196,120,0.6)"], [0.45, "rgba(240,168,96,0.24)"], [1, "rgba(220,150,90,0)"]]),
      staub: kreisVerlauf(32, [[0, "rgba(255,249,228,1)"], [0.3, "rgba(255,236,190,0.6)"], [1, "rgba(255,220,160,0)"]]),
      rauch: kreisVerlauf(64, [[0, "rgba(38,24,12,1)"], [0.5, "rgba(38,24,12,0.55)"], [1, "rgba(38,24,12,0)"]]),
      dunkel: bahnVerlauf("120,76,28"), hell: bahnVerlauf("255,252,238"),
      funkel: funkelBauen(128), flamme: flammeBauen()
    };
    return GLANZ;
  }
  function funkelBauen(g) {   // kleiner Lichtglanz: Kern und vier schlanke Strahlen
    var c = leinwand(g, g), x = c.getContext("2d"), m = g / 2;
    var r = x.createRadialGradient(m, m, 0, m, m, m * 0.4);
    r.addColorStop(0, "rgba(255,253,244,1)"); r.addColorStop(1, "rgba(255,230,170,0)");
    x.fillStyle = r; x.fillRect(0, 0, g, g);
    for (var i = 0; i < 8; i++) {
      var l = i % 2 ? m * 0.55 : m * 0.98, b = i % 2 ? g * 0.018 : g * 0.028;
      var s = x.createLinearGradient(0, 0, l, 0); s.addColorStop(0, "rgba(255,248,225,0.95)"); s.addColorStop(1, "rgba(255,230,170,0)");
      x.save(); x.translate(m, m); x.rotate(i * Math.PI / 4); x.fillStyle = s;
      x.beginPath(); x.moveTo(0, -b); x.lineTo(l, 0); x.lineTo(0, b); x.closePath(); x.fill(); x.restore();
    }
    return c;
  }
  function flammeBauen() {
    var c = leinwand(48, 80), x = c.getContext("2d"), r = x.createRadialGradient(24, 52, 2, 24, 46, 32);
    r.addColorStop(0, "rgba(255,251,228,1)"); r.addColorStop(0.35, "rgba(255,206,112,0.95)"); r.addColorStop(1, "rgba(255,140,40,0)");
    x.fillStyle = r;
    x.beginPath(); x.moveTo(24, 3); x.bezierCurveTo(35, 26, 43, 44, 37, 59); x.bezierCurveTo(31, 73, 17, 73, 11, 59); x.bezierCurveTo(5, 44, 13, 26, 24, 3); x.fill();
    return c;
  }

  // ───────────────── Bilder: Silhouetten, Pfanne, Pfannekuchen ─────────────────
  // Die Papierfiguren aus dem Illustrationspaket, auf ihre Alpha-Bounds zugeschnitten und auf
  // 880 px Höhe gebracht. Maße in Pixeln der App-Bilder: oben/unten = sichtbare Figur, fussX = Mitte
  // der Sohlen (Bodenanker), hand = Griff- bzw. Fangpunkt der ausgestreckten Hand, blick = +1 schaut nach rechts.
  var FARBE = "rgb(38,24,12)";
  var SPR = {
    klein:  { src: "bilder/schatten/kevin-klein-profil.png", b: 496, h: 880, oben: 5, unten: 876, fussX: 199, hand: [456, 366], weich: 7, blick: 1 },
    gross:  { src: "bilder/schatten/kevin-gross-profil.png", b: 353, h: 880, oben: 4, unten: 876, fussX: 129.5, hand: [320, 377], weich: 7, blick: 1 },
    omsi:   { src: "bilder/schatten/omsi-profil.png", b: 479, h: 880, oben: 5, unten: 876, fussX: 285, hand: [46, 428], weich: 7, blick: -1 },
    // Griff zeigt im Bild nach links: griff = wo die Hand hält, mulde = wo der Pfannekuchen liegt
    pfanne: { src: "bilder/schatten/pfanne-leer.png", b: 720, h: 213, griff: [88, 98], mulde: [530, 24], weich: 4 },
    kuchen: { src: "bilder/extras/pfannekuchen-flug.png", b: 640, h: 416, weich: 3 }
  };
  // Die neue Papierausstattung benutzt dieselben Bühnenkoordinaten und dieselbe
  // Choreografie. Vollständige PNGs bleiben unverändert; Registrierung aus anker.json.
  var TEILE = {}, TEILE_GELADEN = false, TEILE_OFFEN = 0, TEILE_FEHLER = [];
  function cutoutsLaden() {
    if (TEILE_GELADEN) return;
    TEILE_GELADEN = true;
    var daten = window.SCHATTEN_TEILE || {}, namen = Object.keys(daten);
    TEILE_OFFEN = namen.length;
    namen.forEach(function (name) {
      var m = daten[name], sp = TEILE[name] = { b: m.imageSize[0], h: m.imageSize[1], f: 0.5, meta: m, blick: name.indexOf("omsi") === 0 ? -1 : 1 };
      if (m.fuss) { sp.fussX = m.fuss[0]; sp.unten = m.fuss[1]; sp.oben = m.kopfOben[1]; sp.hand = m.hand; }
      B.ladeBild("bilder/schatten/" + name + ".png", function (img) {
        var t = leinwand(sp.b / 2, sp.h / 2), x = t.getContext("2d");
        x.drawImage(img, 0, 0, t.width, t.height);
        if (name.indexOf("publikum-") === 0) {
          if (name === "publikum-omsi-schultern") {
            var fade = x.createLinearGradient(0, 280, 0, 384);
            fade.addColorStop(0, "rgba(0,0,0,1)"); fade.addColorStop(1, "rgba(0,0,0,0)");
            x.globalCompositeOperation = "destination-in"; x.fillStyle = fade; x.fillRect(0, 0, t.width, t.height);
          }
          sp.farbig = t; sp.dunkel = leinwand(t.width, t.height);
          var dc = sp.dunkel.getContext("2d"); dc.drawImage(t, 0, 0);
          dc.globalCompositeOperation = "source-in"; dc.fillStyle = "#15110e"; dc.fillRect(0, 0, t.width, t.height);
        } else {
          x.globalCompositeOperation = "source-in"; x.fillStyle = FARBE; x.fillRect(0, 0, t.width, t.height);
          spriteFertig(sp, t, 2);
        }
        TEILE_OFFEN--;
        if (!TEILE_OFFEN) cutoutsVerbinden();
      }, function () { TEILE_FEHLER.push(name); TEILE_OFFEN--; if (!TEILE_OFFEN) cutoutsVerbinden(); });
    });
  }
  function cutoutsVerbinden() {
    var k = TEILE["kevin-klein-koerper"];
    if (k && k.scharf && TEILE["kevin-klein-arm"].scharf && TEILE["kevin-klein-kopf"].scharf) {
      k.rig = "kevin-klein"; SPR.klein = k;
    }
    ["omsi", "kevin-gross"].forEach(function (n) {
      var b = TEILE[n + "-koerper-ohne-arm"], a = TEILE[n + "-arm-pfanne"];
      if (b && b.scharf && a && a.scharf) b.rig = n;
    });
    PROP = {}; // eventuell schon erzeugte Ersatzrequisiten neu aufbauen
  }
  function gelenkPunkt(p, g, w) {
    var dx = p[0] - g[0], dy = p[1] - g[1], c = Math.cos(w), s = Math.sin(w);
    return [g[0] + dx * c - dy * s, g[1] + dx * s + dy * c];
  }
  function gelenkteil(lc, sp, basis, winkel, s, a, ohnePfanne) {
    if (!sp || !sp.scharf) return;
    var g = sp.meta.gelenk;
    lc.save(); lc.translate(g[0] - basis.fussX, g[1] - basis.unten); lc.rotate(winkel || 0);
    if (ohnePfanne) {
      lc.beginPath();
      if (basis.rig === "omsi") lc.rect(sp.hand[0] - 24 - g[0], -g[1], sp.b, sp.h);
      else lc.rect(-g[0], -g[1], sp.hand[0] + 24, sp.h);
      lc.clip();
    }
    sprite(lc, sp, g[0], g[1], s, a); lc.restore();
  }
  function pose(f, name) {
    var sp = TEILE[name];
    if (sp && sp.scharf) {
      sp.oben = name.indexOf("kevin-klein") === 0 ? 103 : (name.indexOf("omsi") === 0 ? 53 : 48);
      f.sp = sp; f.pose = true;
    }
  }
  function ausschnitt(x, name, box, dx, dy, w, h) {
    var sp = TEILE[name];
    if (!sp || !sp.vorlage) return;
    x.drawImage(sp.vorlage, box[0] * .5, box[1] * .5, (box[2] - box[0]) * .5, (box[3] - box[1]) * .5, dx, dy, w, h);
  }
  // Nur die Papiermotive ausschneiden: Claudes bewegliche Stäbe/Fäden bleiben dran.
  var REQUISIT = {
    blase: ["denkblase", [78,41,947,866]], haus: ["haus", [199,134,817,716]],
    sonne: ["sonne", [165,9,857,682]], mond: ["mond", [294,88,742,700]],
    stern: ["stern-1", [31,205,481,602]], stern2: ["stern-2", [79,282,438,617]], stern3: ["stern-3", [156,341,359,532]],
    fledermaus: ["fledermaus-oben", [69,179,955,810]], fledermaus2: ["fledermaus-unten", [69,179,955,810]],
    herz: ["herz", [143,70,880,716]], kerze: ["kerze", [444,118,592,827]],
    stapel: ["pfannekuchenstapel", [144,51,880,790]]
  };
  function papierProp(name) {
    var r = REQUISIT[name];
    if (!r || !TEILE["requisit-" + r[0]] || !TEILE["requisit-" + r[0]].vorlage) return null;
    var box = r[1], h = 300, w = h * (box[2] - box[0]) / (box[3] - box[1]), ax = w / 2, ay = h;
    if (name.indexOf("stern") === 0) ay = 0;
    if (name === "blase") { ax = w * .52; ay = h * .82; }
    if (name.indexOf("fledermaus") === 0) { ax = (512 - box[0]) * h / (box[3] - box[1]); ay = (420 - box[1]) * h / (box[3] - box[1]); }
    if (name === "haus" && TEILE["requisit-strassenschild"].vorlage) {
      return propBauen(540, 300, [140,292], function (x) {
        ausschnitt(x, "requisit-haus", box, 0, 24, 280, 268);
        ausschnitt(x, "requisit-strassenschild", [69,204,955,610], 280, 174, 255, 117);
        var adr = B.ersetzen("{ADRESSE}"); x.font = "600 22px " + SCHRIFT_RUND;
        var f = Math.min(22, 22 * 222 / Math.max(1, x.measureText(adr).width));
        x.font = "600 " + f + "px " + SCHRIFT_RUND; x.textAlign = "center"; x.textBaseline = "middle";
        x.fillText(adr, 407, 232); x.fillRect(405, 291, 4, 9);
      });
    }
    return propBauen(w, h, [ax,ay], function (x) {
      ausschnitt(x, "requisit-" + r[0], box, 0, 0, w, h);
      if (name.indexOf("fledermaus") === 0) x.clearRect((502-box[0])*h/(box[3]-box[1]), (626-box[1])*h/(box[3]-box[1]), 22*h/(box[3]-box[1]), h);
      if (name === "herz") {
        x.textAlign = "center"; x.textBaseline = "middle"; x.font = "700 46px " + SCHRIFT_BUCH;
        x.fillText(String((B.E && B.E.alter) || ""), (512-box[0])*h/(box[3]-box[1]), (394-box[1])*h/(box[3]-box[1]));
      }
    });
  }
  // Einmal laden und auf einem Hilfscanvas dunkel einfärben (source-in: nur die Alpha-Kontur bleibt)
  function vorbereiten(sp) {
    B.ladeBild(sp.src, function (img) {
      var b = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      if (!b || !h) return;
      sp.f = b / sp.b;          // falls die Datei einmal andere Maße hat
      var t = leinwand(b, h), c = t.getContext("2d");
      c.drawImage(img, 0, 0, b, h);
      c.globalCompositeOperation = "source-in"; c.fillStyle = FARBE; c.fillRect(0, 0, b, h);
      spriteFertig(sp, t, sp.weich);
    });
  }
  for (var spName in SPR) vorbereiten(SPR[spName]);

  // Aus einer eingefärbten Vorlage: scharfe Stufe mit weichem Rand wie bei echtem Schatten auf dem Laken
  function spriteFertig(sp, t, weich) {
    var f = sp.f || 1, rand = Math.ceil(weich * 2 + 2), o = leinwand(t.width + 2 * rand, t.height + 2 * rand), oc = o.getContext("2d");
    oc.shadowColor = FARBE; oc.shadowBlur = weich;
    oc.drawImage(t, rand, rand);
    sp.f = f; sp.vorlage = t; sp.cv = o;
    sp.scharf = { cv: o, f: f, rand: rand / f };
  }
  // Unschärfe-Stufen durch fortgesetztes Halbieren (sauber gemittelt, auf jedem Gerät gleich):
  // Stufe 0 = halbe Auflösung, noch scharf (für kleine Figuren); Stufe i = etwa 1,5·2^i Bildpixel weich.
  function kette(sp) {
    if (sp.kette) return sp.kette;
    var t = sp.vorlage, f = sp.f || 1, P = Math.ceil(Math.max(t.width, t.height) * 0.11);
    var bw = Math.ceil((t.width + 2 * P) / 64) * 64, bh = Math.ceil((t.height + 2 * P) / 64) * 64;
    var c = leinwand(bw, bh); c.getContext("2d").drawImage(t, P, P);
    var liste = [];
    for (var i = 1; i <= 6; i++) {
      var nc = leinwand(bw >> i, bh >> i);
      nc.getContext("2d").drawImage(c, 0, 0, c.width, c.height, 0, 0, nc.width, nc.height);
      liste.push({ cv: nc, f: f / Math.pow(2, i), rand: P / f });
      c = nc;
    }
    sp.kette = liste;
    return liste;
  }

  // Tiefe: Figur zwischen Laken (z = 0, scharf) und Lampe (z → 1, groß, weich, blass)
  var TIEFE = { z: 0, m: 1 };
  function tiefeAn(lc, L, z) {
    TIEFE.z = z > 0.0005 ? z : 0; TIEFE.m = 1 / (1 - TIEFE.z);
    if (TIEFE.z) { lc.translate(L.lampe.x, L.lampe.y); lc.scale(TIEFE.m, TIEFE.m); lc.translate(-L.lampe.x, -L.lampe.y); }
  }
  function tiefeAus() { TIEFE.z = 0; TIEFE.m = 1; }

  // Eine Figur (Bild) zeichnen; Anker (ax, ay) liegt im Ursprung, s = Maßstab Bildpixel → Bühne
  function sprite(lc, sp, ax, ay, s, alpha) {
    if (!sp.scharf) return false;
    var z = TIEFE.z, m = TIEFE.m, dpr = BUEHNE ? BUEHNE.dpr : 1, a = alpha * (1 - 0.5 * z);
    if (a <= 0.004) return true;
    var weich = z ? (BUEHNE ? BUEHNE.sh : 500) * 0.055 * z / (1 - z) : 0;      // Halbschatten auf dem Laken (px)
    var bpx = weich / Math.max(1e-6, s * m);                                     // … in Bildpixeln
    var lam = bpx > 1.5 ? Math.min(5, Math.log(bpx / 1.5) / Math.LN2) : 0;
    if (lam < 0.02) { stufeMalen(lc, s * m * dpr < 0.55 ? kette(sp)[0] : sp.scharf, ax, ay, a); return true; }
    var K = kette(sp), i = Math.floor(lam), u = lam - i;
    var st0 = i === 0 ? sp.scharf : K[i], st1 = K[Math.min(5, i + 1)];
    if (u < 0.02 || i >= 5) stufeMalen(lc, st0, ax, ay, a);
    else { stufeMalen(lc, st0, ax, ay, a * (1 - u)); stufeMalen(lc, st1, ax, ay, a * u); }   // "lighter": genaue Überblendung
    return true;
  }
  function stufeMalen(lc, st, ax, ay, a) {
    lc.globalAlpha = a > 1 ? 1 : a;
    lc.drawImage(st.cv, -ax - st.rand, -ay - st.rand, st.cv.width / st.f, st.cv.height / st.f);
  }

  // Figur mit Bodenanker (Fußmitte). f: sp, x, gy, h, lift (Heben), neig (Kippen um die Füße),
  // flip (Umdrehen: läuft durch 0 wie ein gedrehtes Kärtchen), sq (> 0 gestaucht, < 0 gestreckt), alpha
  function figur(lc, f) {
    var sp = f.sp, s = f.h / (sp.unten - sp.oben), sq = f.sq || 0, fx = f.flip;
    if (Math.abs(fx) < 0.04) fx = fx < 0 ? -0.04 : 0.04;
    var st = { f: f, sx: s * (1 + sq * 0.5) * fx, sy: s * (1 - sq) }, a = f.alpha === undefined ? 1 : f.alpha;
    if (a > 0.004) {
      lc.save();
      lc.translate(f.x, f.gy - f.lift); if (f.neig) lc.rotate(f.neig);
      if (sp.scharf) {
        lc.scale(st.sx, st.sy); sprite(lc, sp, sp.fussX, sp.unten, s, a);
        if (sp.rig) {
          if (sp.rig === "kevin-klein") gelenkteil(lc, TEILE["kevin-klein-kopf"], sp, f.kopfWinkel || 0, s, a);
          gelenkteil(lc, TEILE[sp.rig + (sp.rig === "kevin-klein" ? "-arm" : "-arm-pfanne")], sp, f.armWinkel || 0, s, a, f.ohnePfanne);
        }
      }
      else { lc.globalAlpha = a; lc.scale(fx, 1); if (sp === SPR.omsi) omsiErsatz(lc, 0, 0, f.h); else kindErsatz(lc, 0, 0, f.h); }
      lc.restore();
    }
    return st;
  }
  // Bildpunkt einer Figur → Bühnenkoordinaten (mit Neigung, Spiegelung und Stauchung)
  function punkt(st, p) {
    if (st.f.sp.rig && p === st.f.sp.hand && st.f.armWinkel) p = gelenkPunkt(p, st.f.sp.meta.gelenk, st.f.armWinkel);
    var f = st.f, sp = f.sp, dx = (p[0] - sp.fussX) * st.sx, dy = (p[1] - sp.unten) * st.sy, n = f.neig || 0, c = Math.cos(n), si = Math.sin(n);
    return { x: f.x + dx * c - dy * si, y: f.gy - f.lift + dx * si + dy * c };
  }
  function mischen(a, b, u) { return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }; }

  // Pfanne am Griff. seite: +1 = Pfanne rechts der Hand (Kevin), -1 = links (Omsi, gespiegelt);
  // Werte dazwischen stauchen sie wie ein Kärtchen, das sich dreht. Liefert die Mulde.
  function mulde(griff, laenge, seite, dreh) {
    var sp = SPR.pfanne, s = laenge / sp.b;
    var mx = (sp.mulde[0] - sp.griff[0]) * s * seite, my = (sp.mulde[1] - sp.griff[1]) * s, c = Math.cos(dreh), si = Math.sin(dreh);
    return { x: griff.x + mx * c - my * si, y: griff.y + mx * si + my * c };
  }
  function pfanneZeichnen(lc, griff, laenge, seite, dreh) {
    var sp = SPR.pfanne, s = laenge / sp.b, m = mulde(griff, laenge, seite, dreh);
    if (!sp.scharf) { pfanneErsatz(lc, m.x, m.y + laenge * 0.1, laenge * 0.27, seite > 0 ? 1 : 0); return m; }
    lc.save(); lc.translate(griff.x, griff.y); lc.rotate(dreh);
    lc.scale(s * (Math.abs(seite) < 0.03 ? (seite < 0 ? -0.03 : 0.03) : seite), s);
    sprite(lc, sp, sp.griff[0], sp.griff[1], s, 1);
    lc.restore();
    return m;
  }

  // Der Pfannekuchen: phase = Drehung um die Querachse (flach ↔ hochkant), dreh = Neigung, sq = Plopp beim Landen
  var LIEGT = 1.0;   // in der Pfanne liegend: von der Seite nur ein flacher Buckel
  function kuchen(lc, x, y, r, phase, dreh, sq) {
    var sp = SPR.kuchen;
    if (r <= 0.3) return;
    if (!sp.scharf) { lc.globalAlpha = 1; pfannekuchenErsatz(lc, x, y, r, phase); return; }
    var s = 2 * r / sp.b, k = Math.max(0.12, Math.abs(Math.cos(phase))), q = sq || 0;
    lc.save(); lc.translate(x, y); if (dreh) lc.rotate(dreh); lc.scale(s * (1 + q * 0.5), s * k * (1 - q));
    sprite(lc, sp, sp.b / 2, sp.h / 2, s, 1);
    lc.restore();
  }
  function bahn(t, t0, dauer, von, nach, hoehe) {
    if (t < t0 || t > t0 + dauer) return null;
    var u = (t - t0) / dauer;
    return { u: u, x: von.x + (nach.x - von.x) * u, y: von.y + (nach.y - von.y) * u - Math.sin(u * Math.PI) * hoehe };
  }
  function flugKuchen(lc, t, t0, dauer, von, nach, hoehe, flips, r) {
    var p = bahn(t, t0, dauer, von, nach, hoehe);
    if (p) kuchen(lc, p.x, p.y, r, LIEGT + p.u * Math.PI * 2 * flips, Math.sin(p.u * Math.PI) * 0.3 * (nach.x < von.x ? -1 : 1), 0);
    return p;
  }
  function hoeheBis(L, von, wunsch) { return Math.max(L.sh * 0.1, Math.min(wunsch, von.y - (L.sy + L.sh * 0.1))); }

  // ───────────────── Stabfiguren: Papier an Stäbchen, einmal gezeichnet ─────────────────
  var PROP = {};
  function prop(name) { if (!PROP[name]) PROP[name] = papierProp(name) || (PROP_MALEN[name] || PROP_MALEN.stern)(); return PROP[name]; }
  function propBauen(b, h, anker, malen) {
    var t = leinwand(b, h), x = t.getContext("2d");
    x.fillStyle = FARBE; x.strokeStyle = FARBE; x.lineCap = "round"; x.lineJoin = "round";
    malen(x);
    var sp = { b: b, h: h, f: 1, anker: anker };
    spriteFertig(sp, t, Math.max(1.5, h * 0.008));
    return sp;
  }
  function kreis(x, cx, cy, r) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
  function aus(x) { x.globalCompositeOperation = "destination-out"; }   // Ausschnitt: da scheint das Licht durch
  function ein(x) { x.globalCompositeOperation = "source-over"; }
  var SCHRIFT_RUND = "Futura, 'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif";
  var SCHRIFT_BUCH = "Georgia, 'Times New Roman', serif";

  var PROP_MALEN = {
    // Denkblase: ein Stapel Pfannekuchen mit Dampf (ausgeschnitten), Bläschen führen zum Kopf
    blase: function () {
      return propBauen(330, 305, [175, 222], function (x) {
        x.beginPath(); x.ellipse(175, 128, 120, 72, 0, 0, Math.PI * 2); x.fill();
        [[72, 116, 44], [112, 74, 48], [172, 60, 52], [232, 72, 47], [276, 114, 42], [262, 166, 42], [205, 191, 44], [140, 192, 44], [86, 166, 40]].forEach(function (k) { kreis(x, k[0], k[1], k[2]); });
        kreis(x, 66, 230, 17); kreis(x, 42, 262, 12); kreis(x, 22, 288, 8);
        aus(x);
        rundRechteck(x, 118, 120, 114, 54, 22); x.fill();
        x.lineWidth = 7;
        for (var i = 0; i < 3; i++) { x.beginPath(); x.moveTo(148 + i * 27, 108); x.bezierCurveTo(138 + i * 27, 94, 160 + i * 27, 82, 150 + i * 27, 64); x.stroke(); }
        ein(x);
        x.lineWidth = 4.5;
        for (var j = 1; j < 3; j++) { x.beginPath(); x.moveTo(112, 120 + j * 18); x.quadraticCurveTo(175, 128 + j * 18, 238, 120 + j * 18); x.stroke(); }
      });
    },
    // Omsis Haus: Fenster und Hausnummer ausgeschnitten, daneben das Straßenschild.
    // Die Adresse kommt zur Laufzeit aus den (verschlüsselten) Einstellungen, nie aus diesem Code.
    haus: function () {
      var adr = B.ersetzen("{ADRESSE}"), m = adr.match(/^(.*?)\s*(\d+\s*[a-zA-Z]?)\s*(?:,.*)?$/);
      var schild = m ? (m[1] + " " + m[2]) : adr, nr = m ? m[2] : "";
      var schrift = "600 30px " + SCHRIFT_RUND, mess = leinwand(4, 4).getContext("2d"); mess.font = schrift;
      var sb = schild ? Math.ceil(mess.measureText(schild).width) + 30 : 0, b = schild ? 228 + sb + 6 : 240;
      return propBauen(b, 270, [125, 262], function (x) {
        x.fillRect(40, 122, 170, 140);
        x.beginPath(); x.moveTo(20, 130); x.lineTo(125, 36); x.lineTo(230, 130); x.closePath(); x.fill();
        x.fillRect(166, 52, 26, 60); x.fillRect(161, 46, 36, 11);
        kreis(x, 26, 250, 17); kreis(x, 12, 257, 11); kreis(x, 40, 254, 12);
        if (schild) { x.fillRect(228 + sb / 2 - 4, 180, 8, 82); rundRechteck(x, 228, 134, sb, 50, 6); x.fill(); }
        aus(x);
        [[58, 148], [152, 148]].forEach(function (f) { for (var i = 0; i < 4; i++) x.fillRect(f[0] + (i % 2) * 21, f[1] + Math.floor(i / 2) * 21, 18, 18); });
        x.fillRect(107, 194, 36, 68);
        x.textAlign = "center"; x.textBaseline = "middle";
        if (nr) { x.font = "700 42px " + SCHRIFT_BUCH; x.fillText(nr, 125, 101); }
        if (schild) { x.lineWidth = 2.5; x.strokeRect(234, 140, sb - 12, 38); x.font = schrift; x.fillText(schild, 228 + sb / 2, 160); }
        ein(x);
        x.fillRect(112, 199, 26, 63);   // Türblatt bleibt dunkel, nur der Rahmen leuchtet
        aus(x); kreis(x, 125, 216, 5); ein(x);
      });
    },
    sonne: function () {
      return propBauen(220, 220, [110, 158], function (x) {
        kreis(x, 110, 110, 48);
        for (var i = 0; i < 12; i++) {
          var w = i * Math.PI / 6 + 0.26, l = i % 2 ? 78 : 97;
          x.beginPath(); x.moveTo(110 + Math.cos(w - 0.13) * 52, 110 + Math.sin(w - 0.13) * 52);
          x.lineTo(110 + Math.cos(w) * l, 110 + Math.sin(w) * l);
          x.lineTo(110 + Math.cos(w + 0.13) * 52, 110 + Math.sin(w + 0.13) * 52); x.closePath(); x.fill();
        }
        aus(x); kreis(x, 94, 100, 6); kreis(x, 126, 100, 6);
        x.lineWidth = 5.5; x.beginPath(); x.arc(110, 110, 22, 0.2 * Math.PI, 0.8 * Math.PI); x.stroke(); ein(x);
      });
    },
    mond: function () {
      return propBauen(170, 180, [82, 150], function (x) {
        kreis(x, 85, 88, 64); aus(x); kreis(x, 118, 70, 58);
        x.lineWidth = 4.5; x.beginPath(); x.arc(44, 86, 8, 0.15 * Math.PI, 0.85 * Math.PI); x.stroke(); ein(x);
      });
    },
    stern: function () {
      return propBauen(100, 104, [50, 6], function (x) {
        x.beginPath();
        for (var i = 0; i < 10; i++) { var w = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 18 : 44; x.lineTo(50 + Math.cos(w) * r, 56 + Math.sin(w) * r); }
        x.closePath(); x.fill(); x.fillRect(48, 3, 4, 12);
      });
    },
    fledermaus: function () { return fledermausMalen(true); },
    fledermaus2: function () { return fledermausMalen(false); },
    // Herz mit ausgeschnittenem Alter (aus den Einstellungen)
    herz: function () {
      var alter = String((B.E && B.E.alter) || "");
      return propBauen(190, 175, [95, 166], function (x) {
        x.beginPath(); x.moveTo(95, 166);
        x.bezierCurveTo(20, 112, 4, 70, 18, 42); x.bezierCurveTo(32, 12, 78, 8, 95, 44);
        x.bezierCurveTo(112, 8, 158, 12, 172, 42); x.bezierCurveTo(186, 70, 170, 112, 95, 166); x.fill();
        if (alter) { aus(x); x.font = "700 54px " + SCHRIFT_BUCH; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(alter, 95, 84); ein(x); }
      });
    },
    kerze: function () {
      return propBauen(46, 130, [23, 128], function (x) {
        rundRechteck(x, 10, 40, 26, 90, 4); x.fill();
        x.beginPath(); x.moveTo(10, 50); x.quadraticCurveTo(7, 64, 12, 67); x.quadraticCurveTo(17, 60, 16, 46); x.fill();
        x.lineWidth = 3; x.beginPath(); x.moveTo(23, 42); x.quadraticCurveTo(21, 34, 24, 26); x.stroke();
        aus(x); x.lineWidth = 2.5;
        for (var i = 0; i < 3; i++) { x.beginPath(); x.moveTo(13, 72 + i * 20); x.lineTo(33, 64 + i * 20); x.stroke(); }
        ein(x);
      });
    },
    // „Ende“ in Schattenschrift mit Schwung darunter (dort sitzt das Stäbchen)
    ende: function () {
      var schrift = "italic 700 150px 'Iowan Old Style', Palatino, 'Palatino Linotype', 'Book Antiqua', Georgia, serif";
      var mess = leinwand(4, 4).getContext("2d"); mess.font = schrift;
      var b = Math.ceil(mess.measureText("Ende").width) + 70;
      return propBauen(b, 250, [b / 2, 226], function (x) {
        x.font = schrift; x.textAlign = "center"; x.textBaseline = "alphabetic"; x.fillText("Ende", b / 2, 168);
        x.lineWidth = 7; x.beginPath(); x.moveTo(26, 206); x.bezierCurveTo(b * 0.3, 236, b * 0.7, 236, b - 30, 198); x.stroke();
        x.lineWidth = 5; x.beginPath(); x.moveTo(b - 30, 198); x.quadraticCurveTo(b - 12, 184, b - 26, 176); x.stroke();
        kreis(x, 26, 206, 6);
      });
    }
  };
  function fledermausMalen(oben) {
    return propBauen(240, 130, [120, 30], function (x) {
      x.beginPath(); x.ellipse(120, 66, 14, 24, 0, 0, Math.PI * 2); x.fill();
      kreis(x, 120, 42, 12);
      x.beginPath(); x.moveTo(111, 36); x.lineTo(107, 19); x.lineTo(117, 31); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(129, 36); x.lineTo(133, 19); x.lineTo(123, 31); x.closePath(); x.fill();
      [-1, 1].forEach(function (s) {
        x.beginPath(); x.moveTo(120 + s * 8, 52);
        if (oben) {
          x.quadraticCurveTo(120 + s * 50, 8, 120 + s * 112, 16); x.quadraticCurveTo(120 + s * 98, 40, 120 + s * 92, 56);
          x.quadraticCurveTo(120 + s * 76, 46, 120 + s * 64, 60); x.quadraticCurveTo(120 + s * 48, 50, 120 + s * 36, 68); x.quadraticCurveTo(120 + s * 24, 62, 120 + s * 10, 76);
        } else {
          x.quadraticCurveTo(120 + s * 60, 52, 120 + s * 110, 98); x.quadraticCurveTo(120 + s * 88, 96, 120 + s * 80, 112);
          x.quadraticCurveTo(120 + s * 66, 96, 120 + s * 52, 106); x.quadraticCurveTo(120 + s * 40, 90, 120 + s * 28, 98); x.quadraticCurveTo(120 + s * 20, 82, 120 + s * 10, 80);
        }
        x.closePath(); x.fill();
      });
      aus(x); kreis(x, 116, 42, 2.4); kreis(x, 124, 42, 2.4); ein(x);
    });
  }

  // Stabfigur mit Anker (x, y) zeichnen, Höhe in Bühnenpixeln; stab = Neigung des Stäbchens oder null
  function stabfigur(lc, L, sp, x, y, hoehe, dreh, alpha, stab) {
    if (alpha <= 0.004 || hoehe <= 0.5) return;
    var s = hoehe / sp.h;
    lc.save(); lc.translate(x, y); if (dreh) lc.rotate(dreh); lc.scale(s, s);
    sprite(lc, sp, sp.anker[0], sp.anker[1], s, alpha);
    lc.restore();
    if (stab !== null && stab !== undefined) {   // das Stäbchen führt von unten zur Figur (sichtbar bis zum Saum)
      var unten = L.sy + L.sh * 1.3;
      lc.globalAlpha = Math.min(1, alpha * (1 - 0.7 * TIEFE.z)); lc.lineWidth = Math.max(1.4, L.sh * 0.0055) * (1 + 4 * TIEFE.z); lc.lineCap = "round";
      lc.beginPath(); lc.moveTo(x, y - hoehe * 0.02); lc.lineTo(x + Math.tan(stab) * (unten - y), unten); lc.stroke();
    }
  }
  // Faden von oben (Sterne, Fledermaus hängen daran)
  function faden(lc, L, x, y, alpha) {
    lc.globalAlpha = alpha; lc.lineWidth = Math.max(0.8, L.sh * 0.0022);
    lc.beginPath(); lc.moveTo(x, y); lc.lineTo(x + (y - L.sy) * 0.02, L.sy - 10); lc.stroke();
  }

  // ───────────────── Bewegungs-Bausteine ─────────────────
  function feder(t, t0, w, d) {   // elastisches Nachfedern 0 → 1 (mit Überschwingen)
    if (t <= t0) return 0;
    var u = t - t0;
    if (RUHIG) return glatt(0, 0.35, u);
    return 1 - Math.exp(-d * u) * Math.cos(w * u);
  }
  function zurueck(u) { if (RUHIG || u <= 0 || u >= 1) return u; var c = 1.7; u -= 1; return u * u * ((c + 1) * u + c) + 1; }   // hochschnellen mit kleinem Überschwingen
  function huepfer(t, t0, dauer) {   // Hüpfer mit Ausholen: lift 0..1, sq > 0 gestaucht, < 0 gestreckt
    var u = (t - t0) / dauer;
    if (u <= 0 || u >= 1) return { lift: 0, sq: 0 };
    if (u < 0.22) return { lift: 0, sq: 0.09 * Math.sin(u / 0.22 * Math.PI) };
    if (u < 0.8) { var f = (u - 0.22) / 0.58; return { lift: 4 * f * (1 - f), sq: -0.05 * Math.sin(f * Math.PI) }; }
    return { lift: 0, sq: 0.07 * Math.sin((u - 0.8) / 0.2 * Math.PI) };
  }
  function hops(f, t, t0, dauer, hoehe) { var h = huepfer(t, t0, dauer); f.lift += h.lift * hoehe * f.h * (RUHIG ? 0.6 : 1); f.sq += h.sq; }
  function richtung(t, start, wenden) {   // Umdrehen: scaleX läuft durch 0
    var r = start;
    for (var i = 0; i < wenden.length; i++) {
      var a = wenden[i][0], d = wenden[i][1];
      if (t >= a + d) r = -r;
      else if (t > a) return r * Math.cos(glatt(a, a + d, t) * Math.PI);
      else break;
    }
    return r;
  }
  function vor(f, w) { f.neig += w * (f.flip >= 0 ? 1 : -1) * (f.sp.blick || 1); }   // in Blickrichtung neigen
  function gehen(f, phase, stark) {   // ein Schritt: Wippen, Neigen, Stauchen/Strecken
    if (RUHIG) stark *= 0.5;
    f.lift += Math.abs(Math.sin(phase)) * 0.032 * f.h * stark;
    f.neig += Math.sin(phase) * 0.035 * stark;
    f.sq += Math.cos(2 * phase) * 0.014 * stark;
  }
  function atmen(f, p) { if (!RUHIG) { f.sq += Math.sin(uhr * 1.7 + p) * 0.006; f.neig += Math.sin(uhr * 1.1 + p) * 0.005; } }
  function zittern(f, t, t0, dauer) {   // kleines Zittern vor Freude
    if (RUHIG || t < t0 || t > t0 + dauer) return;
    f.neig += Math.sin((t - t0) * 60) * 0.02 * Math.sin((t - t0) / dauer * Math.PI);
  }
  function neu(sp, x, h, L) { return { sp: sp, x: x, gy: L.gy, h: h, lift: 0, neig: 0, flip: 1, sq: 0, alpha: 1 }; }
  function wurfDreh(t, ts) {   // Pfanne: ausholen (runter) – hopp (hoch)
    var aus = glatt(ts - 0.45, ts - 0.1, t) * (1 - glatt(ts - 0.1, ts + 0.02, t));
    var wurf = t > ts - 0.1 && t < ts + 0.3 ? Math.sin((t - ts + 0.1) / 0.4 * Math.PI) : 0;
    return -0.22 * aus + 0.4 * wurf;
  }
  function aufblenden(t) { return 0.5 + 0.5 * glatt(0, 0.7, t); }             // nach dem Strophenwechsel
  function abblenden(t, d) { return 1 - 0.5 * glatt(d - 0.15, d + 0.55, t); }  // vor dem Strophenwechsel
  function wogenUm(t, d, anfang) { return Math.max(anfang ? 1 - glatt(0, 0.9, t) : 0, glatt(d - 0.3, d + 0.5, t)); }

  // Omsi mit Pfanne (und Pfannekuchen darin)
  function omsiMalen(lc, o, pf) {
    var rig = TEILE["omsi-koerper-ohne-arm"];
    if (pf && !o.pose && rig && rig.rig) {
      o.sp = rig; o.armWinkel = pf.dreh || 0;
      var rs = figur(lc, o), rh = punkt(rs, rig.hand);
      var rm = punkt(rs, gelenkPunkt([130,675], rig.meta.gelenk, o.armWinkel));
      var rd = o.neig + o.armWinkel;
      if (pf.kuchen > .01) kuchen(lc, rm.x, rm.y, o.h * .085 * pf.kuchen, LIEGT, rd, pf.sq || 0);
      return { st: rs, hand: rh, mulde: rm, dreh: rd };
    }
    var st = figur(lc, o), hand = punkt(st, o.sp.hand), r = { st: st, hand: hand };
    if (pf) {
      var laenge = o.h * 0.36;
      hand = { x: hand.x, y: hand.y + (pf.dy || 0) };
      r.dreh = o.neig + (pf.dreh || 0);
      r.mulde = pfanneZeichnen(lc, hand, laenge, -o.flip, r.dreh);
      if (pf.kuchen > 0.01) kuchen(lc, r.mulde.x, r.mulde.y, o.h * 0.085 * pf.kuchen, LIEGT, r.dreh, pf.sq || 0);
    }
    return r;
  }
  // nach jedem Wurf ploppt ein neuer Pfannekuchen in die Pfanne
  function nachschub(t, wuerfe) {
    var k = 1;
    for (var i = 0; i < wuerfe.length; i++) if (t >= wuerfe[i][0]) k = glatt(wuerfe[i][0] + 0.25, wuerfe[i][0] + 0.45, t);
    return k;
  }

  // ───────────────── Die Szenen ─────────────────
  // Jede Szene zeichnet ihre Schatten in lc und setzt im Zustand Z Licht, Wogen, Effekte und Publikum.

  function szeneAuftakt(lc, L, a, Z, einmal) {
    Z.raum = 0.17 * (1 - glatt(0.05, 1.0, a));             // der Raum dunkelt ab
    einmal("klick", a, 1.05, function () { klang("klick"); });
    var an = a < 1.05 ? 0 : 1;
    if (!RUHIG && a > 1.13 && a < 1.21) an = 0.25;          // kurzes Wackeln im Kontakt
    var sw = L.sw, sh = L.sh, u = glatt(1.05, 1.6, a), v = 1 - u;
    // der Lichtfleck huscht erst über die Wand oben rechts …
    var p0 = { x: L.sx + sw * 1.05, y: L.sy + sh * 0.02 }, pc = { x: L.sx + sw * 0.98, y: L.sy - sh * 0.18 }, p1 = { x: L.sx + sw * 0.82, y: L.sy - sh * 0.05 };
    var wx = v * v * p0.x + 2 * u * v * pc.x + u * u * p1.x, wy = v * v * p0.y + 2 * u * v * pc.y + u * u * p1.y;
    var wand = an * (1 - glatt(1.45, 1.7, a));
    if (wand > 0.01) Z.wandSpot = { x: wx, y: wy, r: Math.min(L.W, L.H) * 0.15, a: wand, tx: L.mitte + sw * 0.12, ty: L.sy + sh * 0.62 };
    // … dann trifft die Lampe das Laken von hinten: der Fleck gleitet im Bogen in die Mitte und wird zum vollen Leuchten
    var w = glatt(1.4, 2.4, a), fleck = an * glatt(1.35, 1.55, a) * (1 - 0.75 * glatt(2.1, 2.6, a));
    if (fleck > 0.01) Z.spot = { x: L.sx + sw * (0.8 - 0.3 * w), y: L.sy + sh * (0.12 + 0.36 * w - 0.12 * Math.sin(w * Math.PI)), r: sh * (0.32 + 0.53 * w), a: fleck * 0.95 };
    Z.licht = an * 0.85 * glatt(1.9, 2.6, a);
    Z.pub.blick = wand > 0.1 ? wx : null;
    vorwaermen();   // Unschärfe-Stufen anlegen, solange es dunkel ist (verhindert späteres Ruckeln)
  }

  // Strophe 1: "Die Lampe an, das Laken hell – ein kleiner Schatten, flink und schnell …"
  function szene1(lc, L, t, Z, einmal) {
    var D = DAUER[0], sh = L.sh, A = L.A;
    Z.licht = (0.85 + 0.15 * glatt(0, 0.8, t)) * abblenden(t, D);
    Z.wogen = wogenUm(t, D, false);
    vorwaermen();
    var f = neu(SPR.klein, L.kX, sh * 0.36, L);
    // nah an der Lampe: riesig, weich und blass – er kommt aufs Laken zu und wird klein und scharf
    var nah = glatt(0.9, 3.0, t), xa = L.mitte - 0.02 * A, x1 = L.mitte - 0.12 * A;
    var z = 0.64 * (1 - nah);
    f.alpha = glatt(0.8, 1.5, t);
    f.x = xa + (x1 - xa) * nah;
    f.flip = richtung(t, 1, [[3.0, 0.25], [4.2, 0.25], [7.7, 0.28]]);
    if (t < 3.0) gehen(f, t * 6.5, 1);
    // flink und schnell: umdrehen, zum Platz flitzen, abbremsen, zurückdrehen
    var weg = glatt(3.2, 3.85, t);
    if (t >= 3.0) f.x = x1 + (L.kX - x1) * weg;
    if (t > 3.2 && t < 3.85) { gehen(f, (t - 3.2) * 17, 1.3); vor(f, 0.1 * Math.sin(weg * Math.PI)); }
    if (t >= 3.85 && t < 4.8) { var br = t - 3.85; vor(f, -0.12 * Math.exp(-br * 5) * Math.cos(br * 13)); }
    // der Wunsch: verträumt nach oben schauen
    vor(f, -0.05 * glatt(4.4, 4.9, t) * (1 - glatt(6.05, 6.3, t)));
    // "'nen Pfannekuchen!" – drei Hüpfer vor Vorfreude
    hops(f, t, 6.3, 0.42, 0.13); hops(f, t, 6.75, 0.42, 0.13); hops(f, t, 7.2, 0.42, 0.13);
    zittern(f, t, 6.3, 1.4);
    // "Und du auch?" – zum Publikum drehen und neugierig vorbeugen
    vor(f, 0.11 * glatt(7.95, 8.35, t));
    if (t > 8.3 && t < 9.0) f.lift += Math.max(0, Math.sin((t - 8.3) * 9)) * 0.02 * f.h;
    atmen(f, 0);
    f.kopfWinkel = -0.12 * glatt(4.4, 4.9, t) * (1 - glatt(6.05, 6.3, t));
    f.armWinkel = -0.08 * glatt(4.4, 5.0, t);
    if (t > 6.3 && t < 7.7 && f.lift > f.h * .02) pose(f, "kevin-klein-sprung");
    if (t > 8.05) { pose(f, "kevin-klein-vorn"); f.flip = 1; }
    lc.save(); tiefeAn(lc, L, z); figur(lc, f); lc.restore(); tiefeAus();
    // Denkblase am Stäbchen: ein Stapel Pfannekuchen
    var da = t < 8.7 ? glatt(4.45, 5.2, t) : 1 - glatt(8.7, 9.4, t);
    if (da > 0.001 && t > 4.45) {
      var hoch = t < 8.7 ? zurueck(da) : da, bh = sh * 0.36, bs = bh / 305;
      var ax = L.kX + A * 0.1 + 153 * bs, ay = L.gy - sh * 0.4 - 66 * bs;
      ay += (1 - hoch) * sh * 0.9 + Math.sin(uhr * 1.6) * sh * 0.008 - f.lift * 0.3;
      stabfigur(lc, L, prop("blase"), ax, ay, bh, Math.sin(uhr * 1.2) * 0.03, 1, 0.05);
      einmal("blubb", t, 4.55, function () { klang("blubb"); });
    }
    Z.pub.blick = f.alpha > 0.2 ? f.x : null;
  }

  // Strophe 2: "Da kommt ein zweiter Schatten her, mit Pfanne, rund und schwarz und schwer …"
  function szene2(lc, L, t, Z, einmal) {
    var D = DAUER[1], sh = L.sh, A = L.A;
    Z.licht = aufblenden(t) * abblenden(t, D); Z.wogen = wogenUm(t, D, true);
    // das Kind richtet sich vom Publikum auf und dreht sich zur Pfanne um
    var k = neu(SPR.klein, L.kX, sh * 0.36, L);
    k.flip = richtung(t, -1, [[0.55, 0.28]]);
    vor(k, 0.11 * (1 - glatt(0.1, 0.5, t)));
    hops(k, t, 1.3, 0.4, 0.07); zittern(k, t, 1.3, 0.7);          // huch – ein riesiger Schatten!
    vor(k, -0.06 * glatt(1.3, 1.6, t) * (1 - glatt(2.2, 2.8, t)));
    hops(k, t, 6.2, 0.42, 0.15); hops(k, t, 6.66, 0.42, 0.12); zittern(k, t, 6.2, 1.2);   // Juhu!
    atmen(k, 0);
    if (t > 6.2 && t < 7.3 && k.lift > k.h * .02) pose(k, "kevin-klein-sprung");
    figur(lc, k);
    // Omsi kommt aus der Tiefe: groß und weich, dann scharf an ihrem Platz
    var nah = glatt(0.5, 2.5, t), o = neu(SPR.omsi, L.oX + 0.1 * A * (1 - nah), sh * 0.62, L);
    o.alpha = glatt(0.4, 1.0, t);
    if (t < 2.55) gehen(o, t * 5.5, 0.7);
    einmal("schlurf", t, 0.5, function () { KLANG.schlurfen(); });
    // "rund und schwarz und schwer": Pfanne stolz anheben, sie wiegt schwer
    var heb = glatt(2.7, 3.2, t) * (1 - glatt(3.9, 4.35, t));
    var schwer = t > 2.7 && t < 4.4 ? Math.sin((t - 2.7) * 10) * Math.exp(-(t - 2.7) * 2.5) * 0.07 : 0;
    o.neig += 0.035 * heb;
    einmal("brutzeln", t, 2.8, function () { KLANG.brutzeln(1.6); });
    var land = t > 6.5 ? Math.exp(-(t - 6.5) * 6) * Math.sin((t - 6.5) * 20) : 0;
    if (t > 6.7 && t < 7.5) o.lift += Math.max(0, Math.sin((t - 6.7) * 8)) * 0.012 * o.h;   // zufrieden
    atmen(o, 1);
    var fliegt = t >= 4.9 && t <= 6.5;
    lc.save(); tiefeAn(lc, L, 0.5 * (1 - nah));
    var om = omsiMalen(lc, o, { dreh: 0.26 * heb + schwer + wurfDreh(t, 4.9), dy: land * sh * 0.018, kuchen: fliegt ? 0 : 1, sq: t > 6.5 ? 0.45 * Math.exp(-(t - 6.5) * 7) : 0 });
    lc.restore(); tiefeAus();
    Z.pub.blick = t < 2.6 ? o.x : null;
    if (fliegt) {
      var p = flugKuchen(lc, t, 4.9, 1.6, om.mulde, om.mulde, hoeheBis(L, om.mulde, sh * 0.5), 2, o.h * 0.085);
      if (p) Z.pub.blick = p.x;
    }
    einmal("hopp", t, 4.9, KLANG.hopp); einmal("plopp", t, 6.5, KLANG.plopp);
  }

  // Strophe 3: "Klein-Kevin futtert, isst und lacht und wächst dabei – ganz über Nacht …"
  var WUCHS = [[3.5, 0.47], [5.75, 0.54], [6.35, 0.61], [6.95, 0.68]];
  var WUERFE3 = [[0.8, 1.1], [4.9, 0.8], [5.5, 0.8], [6.1, 0.8]];
  function kindGroesse(t) {   // Anteil der Lakenhöhe
    var h = 0.36, vorher = 0.36;
    for (var i = 0; i < WUCHS.length; i++) { h += (WUCHS[i][1] - vorher) * feder(t, WUCHS[i][0], 17, 5.5); vorher = WUCHS[i][1]; }
    // der letzte große Schub bis unter die Decke – der Kopf stößt an und federt zurück
    h += (0.957 - 0.68) * glatt(7.3, 8.5, t);
    if (t > 8.5) { var u = t - 8.5; h -= 0.027 * (1 - (RUHIG ? Math.max(0, 1 - u * 4) : Math.exp(-u * 7) * Math.cos(u * 22))); }
    return h;
  }
  function szene3(lc, L, t, Z, einmal) {
    var D = DAUER[2], sh = L.sh, A = L.A, i;
    Z.licht = aufblenden(t) * abblenden(t, D); Z.wogen = wogenUm(t, D, true);
    // vor Freude einmal um sich selbst – in dem Augenblick, in dem er schmal wie ein Kärtchen ist,
    // wird aus Klein-Kevin der große Kevin (so sieht man keinen Bildwechsel)
    var anteil = kindGroesse(t), g = t < 7.825 ? 0 : 1;
    var k = neu(SPR.klein, L.kX, sh * anteil, L);
    k.flip = richtung(t, 1, [[7.7, 0.25], [7.95, 0.25]]);
    if (t > 1.95 && t < 2.45) k.lift += Math.max(0, Math.sin((t - 1.95) * 19)) * 0.012 * k.h;   // kauen
    zittern(k, t, 2.45, 0.5); hops(k, t, 2.5, 0.4, 0.06);                                         // und lacht
    for (i = 0; i < WUERFE3.length; i++) { var tc = WUERFE3[i][0] + WUERFE3[i][1]; if (t > tc && t < tc + 0.5) k.sq += 0.05 * Math.exp(-(t - tc) * 10); }
    if (t > 7.3 && t < 8.5) k.sq -= 0.03 * Math.sin(glatt(7.3, 8.5, t) * Math.PI);                // strecken
    if (t > 8.5) { k.sq += 0.06 * Math.exp(-(t - 8.5) * 8); Z.wogen = Math.max(Z.wogen, 0.9 * Math.exp(-(t - 8.5) * 2.5)); }   // Stopp!
    atmen(k, 0);
    k.alpha = 1 - g;
    var stK = figur(lc, k);
    var gk = { sp: SPR.gross, x: k.x, gy: k.gy, h: k.h, lift: k.lift, neig: k.neig, flip: k.flip, sq: k.sq, alpha: g }, stG = figur(lc, gk);
    var hand = mischen(punkt(stK, SPR.klein.hand), punkt(stG, stG.f.sp.hand), g);
    // Omsi wirft
    var o = neu(SPR.omsi, L.oX, sh * 0.62, L), dreh = 0;
    for (i = 0; i < WUERFE3.length; i++) dreh += wurfDreh(t, WUERFE3[i][0]);
    atmen(o, 1);
    if (t > 8.55 && t < 9.4) o.lift += Math.max(0, Math.sin((t - 8.55) * 9)) * 0.01 * o.h;
    var r = o.h * 0.085, om = omsiMalen(lc, o, { dreh: dreh, kuchen: t < WUERFE3[0][0] ? 1 : nachschub(t, WUERFE3) });
    var fang = { x: hand.x, y: hand.y - r * 0.3 };
    Z.pub.blick = k.x;
    for (i = 0; i < WUERFE3.length; i++) {
      var w = WUERFE3[i], p = flugKuchen(lc, t, w[0], w[1], om.mulde, fang, hoeheBis(L, om.mulde, sh * (i ? 0.26 : 0.36)), 1.5, r);
      if (p) Z.pub.blick = p.x;
      var tf = w[0] + w[1];
      if (i === 0 && t > tf && t < 2.4) kuchen(lc, fang.x, fang.y, r * (1 - Math.floor((t - tf) / 0.5 * 3) / 3), 0.5, 0, 0);   // drei Bissen
      if (i > 0 && t > tf && t < tf + 0.15) kuchen(lc, fang.x, fang.y, r * (1 - (t - tf) / 0.15), 0.5, 0, 0);                  // ein Happs
    }
    // "ganz über Nacht": der Mond zieht schnell vorbei, während er wächst
    var mu = (t - 2.8) / 1.6;
    if (mu > 0 && mu < 1) {
      Z.nacht = Math.sin(mu * Math.PI) * 0.8;
      stabfigur(lc, L, prop("mond"), L.sx + L.sw * (0.12 + 0.76 * mu), L.sy + sh * (0.4 - 0.2 * Math.sin(mu * Math.PI)), sh * 0.16, -0.2 + 0.4 * mu, glatt(0, 0.12, mu) * (1 - glatt(0.88, 1, mu)), 0.08 - 0.16 * mu);
    }
    einmal("hopp", t, 0.8, KLANG.hopp); einmal("mampf", t, 1.95, KLANG.mampf);
    for (i = 1; i < WUERFE3.length; i++) einmal("flapp" + i, t, WUERFE3[i][0], function () { klang("flapp"); });
    for (i = 0; i < WUCHS.length; i++) einmal("wachs" + i, t, WUCHS[i][0], (function (j) { return function () { klang("wachsen", j); }; })(i));
    einmal("schub", t, 7.3, function () { klang("schub"); });
    einmal("stopp", t, 8.5, function () { KLANG.stempel(); });
  }

  // Strophe 4: "Die Jahre ziehen schnell vorbei …" – Sonne und Mond, das Haus, Pfannekuchen für zwei
  var WUERFE4 = [[1.0, 0.9], [2.75, 0.9], [2.87, 0.9], [4.5, 0.9], [7.7, 1.0]];
  function szene4(lc, L, t, Z, einmal) {
    var D = DAUER[3], sh = L.sh, A = L.A, i, j;
    Z.licht = aufblenden(t) * abblenden(t, D); Z.wogen = wogenUm(t, D, true);
    // Tag und Nacht: Sonne und Mond ziehen abwechselnd im Bogen übers Laken
    var TAG = 1.75, nacht = 0;
    for (j = 0; j < 5; j++) {
      var u = (t - 0.5 - j * TAG) / TAG;
      if (u <= 0 || u >= 1) continue;
      // kleiner Bogen über dem Haus, zwischen den beiden (dort verdeckt er niemanden)
      var sb = Math.sin(u * Math.PI), hx = L.mitte + A * (-0.3 + 0.6 * u), hy = L.sy + sh * (0.38 - 0.28 * sb), al = glatt(0, 0.12, u) * (1 - glatt(0.88, 1, u));
      if (j % 2) { nacht = sb; stabfigur(lc, L, prop("mond"), hx, hy, sh * 0.16, -0.25 + 0.5 * u, al, 0.12 - 0.24 * u); }
      else stabfigur(lc, L, prop("sonne"), hx, hy, sh * 0.19, Math.sin(uhr * 1.3) * 0.12, al, 0.12 - 0.24 * u);
    }
    for (j = 0; j < 5; j++) einmal("tag" + j, t, 0.5 + j * TAG, (function (n) { return function () { klang("spieluhr", n); }; })([79, 74, 81, 76, 84][j]));
    Z.nacht = nacht * 0.85; Z.licht *= 1 - 0.1 * nacht;
    // nachts hängen Sterne an Fäden herab
    if (nacht > 0.01) {
      var ab = glatt(0, 0.7, nacht);
      [[0.06, 0.2], [0.9, 0.1], [0.97, 0.3]].forEach(function (s, n) {
        var x = L.sx + L.sw * s[0], y = L.sy + sh * (s[1] * ab - 0.12 * (1 - ab));
        faden(lc, L, x, y, 1);
        stabfigur(lc, L, prop(n ? "stern" + (n + 1) : "stern"), x, y, sh * (0.07 + n * 0.012), Math.sin(uhr * 1.4 + n * 2) * 0.25, 1, null);
      });
    }
    // Omsis Haus steht in der Mitte (Nur eines blieb, ganz wie es war …)
    var hausDa = t < 8.9 ? zurueck(glatt(0.2, 1.0, t)) : 1 - glatt(8.9, 9.7, t), hh = sh * 0.3, hs = hh / 270;
    if (hausDa > 0.001) {
      var hx0 = L.mitte - 0.1 * A, hy0 = L.gy + sh * 0.006 + (1 - hausDa) * sh * 0.5;
      stabfigur(lc, L, prop("haus"), hx0, hy0, hh, 0, 1, 0);
      var kx = hx0 + (179 - 125) * hs, ky = hy0 - (262 - 46) * hs;   // Rauch aus dem Schornstein
      for (i = 0; i < 3; i++) {
        var q = (uhr * 0.28 + i / 3) % 1, rr = sh * (0.012 + 0.026 * q);
        lc.globalAlpha = (1 - q) * 0.55 * Math.min(1, hausDa) * glatt(0, 0.15, q);
        lc.drawImage(GLANZ.rauch, kx + q * sh * 0.05 + Math.sin(q * 6 + i) * sh * 0.01 - rr, ky - q * sh * 0.17 - rr, rr * 2, rr * 2);
      }
    }
    // Kevin (groß) und Omsi
    var kv = neu(SPR.gross, L.kX, sh * 0.93, L), o = neu(SPR.omsi, L.oX, sh * 0.62, L), dreh = 0;
    for (i = 0; i < WUERFE4.length; i++) {
      var tf = WUERFE4[i][0] + WUERFE4[i][1];
      if (t > tf && t < tf + 0.5) kv.lift += Math.max(0, Math.sin((t - tf) * 14)) * 0.006 * kv.h;   // happs
      if (i !== 2) dreh += wurfDreh(t, WUERFE4[i][0]);
    }
    // Fledermaus in der zweiten Nacht – Omsi erschrickt (auf Kommando, wie immer)
    var fu = (t - 5.9) / 1.5, fx = null;
    if (fu > 0 && fu < 1) {
      fx = L.sx + L.sw * (1.06 - 1.12 * fu);
      var tauch = Math.exp(-Math.pow((fu - 0.3) / 0.12, 2));   // stößt über Omsis Kopf kurz herab
      var fy = L.sy + sh * (0.1 + 0.09 * tauch + 0.02 * Math.sin(fu * 11)), oben = Math.sin(uhr * 40) > 0 || RUHIG;
      faden(lc, L, fx, fy, 1);
      stabfigur(lc, L, prop(oben ? "fledermaus" : "fledermaus2"), fx, fy, sh * 0.12, Math.sin(fu * 11) * 0.12, 1, null);
    }
    hops(o, t, 6.2, 0.45, 0.08); zittern(o, t, 6.2, 0.9); vor(o, -0.08 * glatt(6.2, 6.35, t) * (1 - glatt(6.7, 7.2, t)));
    atmen(kv, 0); atmen(o, 1);
    if (t > 6.2 && t < 6.95) pose(o, "omsi-erschrocken");
    var stK = figur(lc, kv), fang = punkt(stK, stK.f.sp.hand);
    var r = o.h * 0.085, om = omsiMalen(lc, o, { dreh: dreh, kuchen: t < WUERFE4[0][0] ? 1 : nachschub(t, WUERFE4) });
    Z.pub.blick = fx;
    for (i = 0; i < WUERFE4.length; i++) {
      var w = WUERFE4[i], p = flugKuchen(lc, t, w[0], w[1], i === 2 ? { x: om.mulde.x - r * 0.4, y: om.mulde.y - r * 0.5 } : om.mulde, fang, hoeheBis(L, om.mulde, sh * (i === 2 ? 0.34 : 0.28)), 1.5, r);
      if (p && fx === null) Z.pub.blick = p.x;
      var tf2 = w[0] + w[1];
      if (t > tf2 && t < tf2 + 0.2) kuchen(lc, fang.x, fang.y, r * (1 - (t - tf2) / 0.2), 0.5, 0, 0);
      if (i !== 2) einmal("flapp" + i, t, w[0], function () { klang("flapp"); });
    }
    einmal("mampf", t, 3.72, KLANG.mampf);
  }

  // Strophe 5: "Und heute – schau! – ist es so weit: Die Pfanne wechselt. Seid bereit!"
  // Geburtstagskerze im Pfannekuchen; die Flamme ist Licht (wird nach dem Laken aufgetragen)
  function kerzeMalen(lc, L, m, r, dreh, t, t0, Z, alpha) {
    if (t <= t0) return;
    var kz = feder(t, t0, 14, 6), kh = L.sh * 0.11 * kz, bx = m.x + Math.sin(dreh) * r * 0.15, by = m.y - Math.cos(dreh) * r * 0.15;
    stabfigur(lc, L, prop("kerze"), bx, by, kh, dreh, 1, null);
    var s = kh / 130, fx = bx + Math.cos(dreh) * s - Math.sin(dreh) * (-114 * s), fy = by + Math.sin(dreh) * s + Math.cos(dreh) * (-114 * s);
    alpha *= glatt(L.sx + L.sw * 0.02, L.sx + L.sw * 0.08, fx) * (1 - glatt(L.sx + L.sw * 0.92, L.sx + L.sw * 0.98, fx));   // Licht nur auf dem Laken
    if (alpha > 0.01 && kz > 0.3) Z.effekte.push({ art: "flamme", x: fx, y: fy, h: L.sh * 0.045 * Math.min(1, kz), a: alpha });
  }
  function szene5(lc, L, t, Z, einmal) {
    var sh = L.sh, A = L.A;
    Z.licht = aufblenden(t); Z.wogen = 1 - glatt(0, 0.9, t);
    var kv = neu(SPR.gross, L.kX, sh * 0.93, L), o = neu(SPR.omsi, L.oX, sh * 0.62, L);
    // Omsi tritt feierlich näher, nach der Übergabe wieder zurück
    var naeher = glatt(1.2, 2.4, t) * (1 - glatt(5.5, 6.4, t));
    o.x -= 0.1 * A * naeher;
    if ((t > 1.2 && t < 2.4) || (t > 5.5 && t < 6.4)) gehen(o, t * 6, 0.5);
    kv.sq -= 0.02 * glatt(2.4, 2.8, t) * (1 - glatt(3.4, 3.9, t));   // Kevin macht sich bereit
    zittern(o, t, 5.3, 0.6);
    hops(o, t, 7.9, 0.45, 0.08); zittern(o, t, 7.9, 0.8);            // Freude am Ende
    vor(kv, -0.04 * glatt(7.9, 8.3, t));                              // stolz
    atmen(kv, 0); atmen(o, 1);
    var kevinRig = TEILE["kevin-gross-koerper-ohne-arm"], omsiRig = TEILE["omsi-koerper-ohne-arm"];
    var gelenke = kevinRig && kevinRig.rig && omsiRig && omsiRig.rig, mitArm = gelenke && t >= 5.3;
    if (gelenke) {
      kv.sp = kevinRig; kv.ohnePfanne = !mitArm;
      o.sp = omsiRig; o.ohnePfanne = true;
    }
    if (mitArm) {
      kv.armWinkel = -0.16 * glatt(5.25, 5.5, t) * (1 - glatt(5.5, 5.75, t)) - wurfDreh(t, 5.95) - .1 * glatt(7.9, 8.3, t);
      if (t > 8.0) pose(kv, "kevin-gross-jubel");
    }
    var stK = figur(lc, kv), kHand = punkt(stK, stK.f.sp.hand);
    var stO = figur(lc, o), oHand = punkt(stO, o.sp.hand);
    // die Übergabe: die Pfanne schwebt im Bogen hinüber und dreht sich dabei um
    var pb = glatt(3.9, 5.3, t), oL = gelenke ? o.h / 1416 * 172 * 720 / 442 : o.h * .36;
    var kL = gelenke ? kv.h / 1430 * 141 * 720 / 442 : kv.h * .3, laenge = oL + (kL - oL) * pb;
    var pf = mischen(oHand, kHand, pb); pf.y -= Math.sin(pb * Math.PI) * sh * 0.14;
    var kDreh = kv.neig - 0.16 * glatt(5.25, 5.5, t) * (1 - glatt(5.5, 5.75, t)) - wurfDreh(t, 5.95) - 0.1 * glatt(7.9, 8.3, t);
    var land = t > 7.35 ? Math.exp(-(t - 7.35) * 6) * Math.sin((t - 7.35) * 20) : 0;
    var dreh = o.neig * (1 - pb) + kDreh * pb - Math.sin(pb * Math.PI) * 0.3;
    if (gelenke && !mitArm) dreh += -.154 + .299 * pb;
    pf.y += land * sh * 0.018 * pb;
    var m = mitArm ? punkt(stK, kv.pose ? [897,710] : gelenkPunkt([887,602], kevinRig.meta.gelenk, kv.armWinkel)) : pfanneZeichnen(lc, pf, laenge, -Math.cos(pb * Math.PI), dreh), r = o.h * 0.085 * laenge / oL;
    // "Seid bereit!": hoch mit dem Pfannekuchen – dreifacher Salto – und die Kerze kommt
    var fliegt = t >= 5.95 && t <= 7.35;
    if (!fliegt) kuchen(lc, m.x, m.y, r, LIEGT, dreh, t > 7.35 ? 0.45 * Math.exp(-(t - 7.35) * 7) : 0);
    else { var p = flugKuchen(lc, t, 5.95, 1.4, m, m, hoeheBis(L, m, sh * 0.46), 3, r); if (p) Z.pub.blick = p.x; }
    if (!fliegt) Z.pub.blick = pf.x;
    kerzeMalen(lc, L, m, r, dreh, t, 7.55, Z, 1);
    // der feierliche Moment: ein kleiner Lichtglanz über der Pfanne
    if (pb > 0.3 && pb < 0.85) Z.effekte.push({ art: "funkel", x: (pf.x + m.x) / 2, y: (pf.y + m.y) / 2 - sh * 0.03, r: sh * 0.17 * Math.sin((pb - 0.3) / 0.55 * Math.PI), a: 1, dreh: uhr * 0.8 });
    einmal("glitzer", t, 4.45, function () { klang("glitzer"); });
    einmal("hopp", t, 5.95, KLANG.hopp); einmal("plopp", t, 7.35, KLANG.plopp);
    einmal("pling", t, 7.55, function () { klang("spieluhr", 88); });
    einmal("tusch", t, 7.8, KLANG.tusch);
  }

  // Finale: Verbeugung, Herz, Abgang, Licht aus bis auf ein Glimmen, „Ende“, dunkel
  function szeneFinale(lc, L, f, Z, einmal) {
    var sh = L.sh, A = L.A;
    var gedimmt = glatt(2.4, 3.6, f), weg = glatt(6.5, 7.0, f);
    Z.licht = (1 - 0.9 * gedimmt) * (1 - weg);
    Z.spot = { x: L.mitte, y: L.sy + sh * 0.44, r: sh * 0.62, a: 0.72 * glatt(2.5, 3.6, f) * (1 - weg) };
    Z.warm = Z.spot.a * 0.45;   // das Glimmen ist warm: auch „Ende“ bleibt ein warmer Schatten
    Z.wogen = RUHIG ? 0 : Math.sin(glatt(2.3, 4.3, f) * Math.PI) * 0.9;   // der Vorhang: das Tuch schwingt
    Z.schwarz = glatt(7.0, 8.0, f);
    einmal("verbeugung", f, 0.5, function () { KLANG.spieluhr([[72, 0.5], [76, 0.5], [79, 0.5], [84, 1.5]], 0.24); });
    einmal("klick", f, 6.5, function () { klang("klick"); });
    // Verbeugung, dann drehen sich beide um und gehen zu den Seiten ab
    var bow = glatt(0.3, 0.85, f) * (1 - glatt(1.35, 1.95, f));
    var kv = neu(SPR.gross, L.kX, sh * 0.93, L), o = neu(SPR.omsi, L.oX, sh * 0.62, L);
    vor(kv, 0.13 * bow - 0.04 * (1 - glatt(0, 0.4, f))); vor(o, 0.12 * bow); kv.sq += 0.05 * bow; o.sq += 0.05 * bow;   // (stolze Haltung aus Strophe 5 löst sich)
    kv.flip = richtung(f, 1, [[2.0, 0.3]]); o.flip = richtung(f, 1, [[2.05, 0.3]]);
    var ab = glatt(2.3, 3.9, f);
    kv.x -= ab * (L.kX - L.sx + 0.35 * sh); o.x += ab * (L.sx + L.sw - L.oX + 0.3 * sh);
    if (f > 2.3 && f < 3.9) { gehen(kv, f * 6.5, 0.8); gehen(o, f * 6.5 + 1, 0.7); }
    atmen(kv, 0); atmen(o, 1);
    if (bow > .5) {
      pose(kv, "kevin-gross-verbeugung"); pose(o, "omsi-verbeugung");
      kv.neig *= .2; o.neig *= .2;
    }
    var stK = figur(lc, kv), kHand = punkt(stK, stK.f.sp.hand);
    figur(lc, o);
    // Kevins Pfanne mit Pfannekuchen und Kerze bleibt waagerecht
    var kL = kv.h * 0.3, dreh = kv.neig * 0.15 - 0.1 * (1 - glatt(0, 0.5, f)), m = pfanneZeichnen(lc, kHand, kL, kv.flip, dreh), r = 0.085 * kL / 0.36;
    kuchen(lc, m.x, m.y, r, LIEGT, dreh, 0);
    kerzeMalen(lc, L, m, r, dreh, 9, 0, Z, (1 - glatt(2.8, 3.6, f)) * (1 - weg));
    // ein Herz steigt zwischen beiden auf und schlägt sanft
    var herz = f < 3.0 ? glatt(1.0, 1.9, f) : 1 - glatt(3.0, 3.7, f);
    if (herz > 0.001) {
      var hoch = f < 3.0 ? zurueck(herz) : herz, schlag = RUHIG ? 0 : Math.max(0, Math.sin(f * 7)) * 0.06;
      stabfigur(lc, L, prop("herz"), L.mitte + 0.06 * A, L.sy + sh * 0.3 + (1 - hoch) * sh * 0.95, sh * 0.2 * (1 + schlag), 0, 1, 0.06);
      if (TEILE["requisit-pfannekuchenstapel"] && TEILE["requisit-pfannekuchenstapel"].vorlage)
        stabfigur(lc, L, prop("stapel"), L.mitte + .04 * A, L.gy + (1 - hoch) * sh * .5, sh * .19, 0, 1, 0);
    }
    // „Ende“ in Schattenschrift: kommt groß und weich von der Lampe und wird scharf
    if (f > 3.3) {
      var ez = glatt(3.5, 5.0, f);
      lc.save(); tiefeAn(lc, L, 0.5 * (1 - ez));
      stabfigur(lc, L, prop("ende"), L.mitte, L.sy + sh * 0.6, sh * 0.34, RUHIG ? 0 : Math.sin(uhr * 0.9) * 0.02, glatt(3.3, 3.9, f), 0);
      lc.restore(); tiefeAus();
    }
    Z.pub.blick = f < 2.3 ? L.mitte : null;
  }

  var SZENEN = [szeneAuftakt, szene1, szene2, szene3, szene4, szene5, szeneFinale];

  // Unschärfe-Stufen und Stabfiguren vorab anlegen – je Aufruf nur ein Stück, damit nichts ruckelt
  function vorwaermen() {
    var s = ["klein", "omsi", "pfanne", "kuchen", "gross"], p = ["blase", "haus", "sonne", "mond", "stern", "fledermaus", "fledermaus2", "herz", "kerze", "ende"], i;
    for (i = 0; i < s.length; i++) if (SPR[s[i]].vorlage && !SPR[s[i]].kette) { kette(SPR[s[i]]); return; }
    for (i = 0; i < p.length; i++) if (!PROP[p[i]]) { prop(p[i]); return; }
    if (!PROP.ende.kette) kette(PROP.ende);
  }

  // ───────────────── Publikum: Omsi und die Katze von hinten ─────────────────
  var SILH = "#05070f", RIM = "rgb(255,214,150)";
  var REAKTION = [   // [Abschnitt, ab Zeit, Art, Dauer]
    [-1, 1.15, "ohrL", 0.6], [-1, 1.2, "staun", 1.3],
    [0, 7.9, "ohrL", 0.6], [0, 8.2, "nick", 1.3],
    [1, 0.6, "ohrR", 0.6], [1, 6.5, "ohrL", 0.6], [1, 6.6, "lach", 1.1],
    [2, 2.05, "ohrR", 0.5], [2, 8.5, "ohrL", 0.7], [2, 8.6, "lach", 1.3],
    [3, 6.0, "ohrR", 0.6], [3, 6.35, "lach", 1.2],
    [4, 0.9, "staun", 2.6], [4, 4.3, "spitz", 1.6], [4, 7.35, "ohrL", 0.6], [4, 7.8, "lach", 1.5], [4, 7.8, "schwanz", 2.2],
    [5, 0.4, "nick", 1.4], [5, 1.3, "lach", 1.0], [5, 0.3, "schwanz", 5.5]
  ];
  function zucken(u) { return Math.max(0, Math.sin(u * Math.PI * 4)) * (1 - u); }
  function reaktionen(k, t, Z) {
    var p = Z.pub;
    for (var i = 0; i < REAKTION.length; i++) {
      var r = REAKTION[i];
      if (r[0] !== k) continue;
      var u = (t - r[1]) / r[3];
      if (u < 0 || u > 1) continue;
      var hull = Math.sin(u * Math.PI);
      if (r[2] === "nick") p.nick += Math.max(0, Math.sin(u * Math.PI * 4)) * hull;
      else if (r[2] === "lach") p.lach += Math.abs(Math.sin(u * Math.PI * 5)) * hull;
      else if (r[2] === "staun") p.staun += glatt(0, 0.2, u) * (1 - glatt(0.8, 1, u));
      else if (r[2] === "ohrL") p.ohrL += zucken(u);
      else if (r[2] === "ohrR") p.ohrR += zucken(u);
      else if (r[2] === "spitz") p.spitz += hull;
      else if (r[2] === "schwanz") p.schwanz += hull;
    }
    var z = uhr % 7.3;
    if (z < 0.6) p.ohrR += zucken(z / 0.6) * 0.7;   // ab und zu zuckt ein Ohr einfach so
    if (RUHIG) { p.lach *= 0.5; p.ohrL *= 0.5; p.ohrR *= 0.5; p.schwanz *= 0.5; }
  }

  function publikumBauen(L) {
    var d = L.dpr, kb = L.u * 0.125, cb = L.u * 0.064, P = { kb: kb, cb: cb };
    P.kopfM = { x: L.omsiX, y: L.omsiY + kb * 0.78 };
    P.hals = { x: L.omsiX, y: P.kopfM.y + kb * 0.5 };
    P.kx = L.katzeX; P.ky = P.kopfM.y + kb * 0.42;
    var unten = L.H - P.hals.y + 6, kdx = P.kx - P.hals.x, kdy = P.ky - P.hals.y, links = kb * 1.75, rechts = Math.max(kb * 1.75, kdx + cb * 1.1);
    P.kopf = doppelt(d, kb * 1.9, kb * 1.95, kb * 0.95, kb * 0.95, kb, function (x, rand) { omsiKopf(x, kb, rand); });
    P.rumpf = doppelt(d, links + rechts, unten + kb * 0.35, links, kb * 0.35, kb, function (x) { schultern(x, kb, unten); katzenKoerper(x, kdx, kdy, cb, unten); });
    // der Körper verliert sich nach unten im Dunkeln (hochkant sonst eine große schwarze Fläche hinter den Versen)
    var ganz = unten + kb * 0.35, a = (kb * 0.35 + kb * 0.9) / ganz, b = (kb * 0.35 + kb * 2.4) / ganz;
    // (das Randlicht ist innen gefüllt: es muss enden, bevor der dunkle Körper durchsichtig wird)
    [P.rumpf.dunkel, P.rumpf.rand].forEach(function (c, i) {
      var x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 0, c.height), a0 = i ? a * 0.55 : a, b0 = i ? a * 0.95 : b;
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(Math.min(0.98, a0), "rgba(0,0,0,1)"); g.addColorStop(Math.min(1, Math.max(a0 + 0.01, b0)), "rgba(0,0,0,0)");
      x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "destination-in"; x.shadowBlur = 0; x.shadowColor = "rgba(0,0,0,0)";
      x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    });
    P.katze = doppelt(d, cb * 2.4, cb * 1.5, cb * 1.2, cb * 0.62, kb, function (x) { katzenKopf(x, cb); });
    return P;
  }
  // Silhouette zweimal: dunkel und als warmes Randlicht (weich verwischt) – das leuchtende Laken
  // steht vor den beiden, also glühen die Haarspitzen und Ohren am Rand
  function doppelt(d, b, h, ox, oy, kb, malen) {
    var r = { b: b, h: h, ox: ox, oy: oy };
    r.dunkel = leinwand(b * d, h * d); var x = r.dunkel.getContext("2d");
    x.setTransform(d, 0, 0, d, ox * d, oy * d); x.fillStyle = SILH; x.strokeStyle = SILH; malen(x, false);
    r.rand = leinwand(b * d, h * d); var y = r.rand.getContext("2d");
    y.setTransform(d, 0, 0, d, ox * d, oy * d); y.fillStyle = RIM; y.strokeStyle = RIM; y.shadowColor = RIM; y.shadowBlur = Math.max(3, kb * 0.07) * d; malen(y, true);
    return r;
  }
  function omsiKopf(x, kb, rand) {
    var zf = zufall(79), rx = kb * 0.4, ry = kb * 0.45;
    x.beginPath(); x.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(0, -ry * 0.12, rx * 1.1, ry * 0.98, 0, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(-rx * 1.03, ry * 0.18, kb * 0.065, kb * 0.1, 0.25, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(rx * 1.03, ry * 0.18, kb * 0.065, kb * 0.1, -0.25, 0, Math.PI * 2); x.fill();
    if (!rand) x.fillRect(-kb * 0.17, ry * 0.4, kb * 0.34, kb * 0.62);   // Hals (ohne Randlicht: liegt im Schatten der Haare)
    // kurze, gezackte Haare: Büschel rundherum, oben länger und wild
    for (var i = 0; i < 38; i++) {
      var w = Math.PI * (0.84 + 1.32 * i / 37) + (zf() - 0.5) * 0.08, oben = Math.max(0, -Math.sin(w));
      var len = kb * (0.07 + 0.13 * oben + zf() * 0.09), kn = (zf() - 0.5) * 0.9;
      var bx1 = Math.cos(w - 0.11) * rx * 1.02, by1 = Math.sin(w - 0.11) * ry * 0.95 - ry * 0.1;
      var bx2 = Math.cos(w + 0.11) * rx * 1.02, by2 = Math.sin(w + 0.11) * ry * 0.95 - ry * 0.1;
      var tx = Math.cos(w + kn * 0.35) * (rx * 1.05 + len), ty = Math.sin(w + kn * 0.35) * (ry * 0.98 + len) - ry * 0.1;
      x.beginPath(); x.moveTo(bx1, by1); x.quadraticCurveTo((bx1 + tx) / 2 + kn * kb * 0.03, (by1 + ty) / 2, tx, ty); x.lineTo(bx2, by2); x.closePath(); x.fill();
    }
  }
  function schultern(x, kb, unten) {
    var u7 = Math.max(unten * 0.7, kb * 0.9);
    x.beginPath();
    x.moveTo(-kb * 0.2, -kb * 0.14);
    x.bezierCurveTo(-kb * 0.4, 0, -kb * 1.0, kb * 0.05, -kb * 1.3, kb * 0.5);
    x.bezierCurveTo(-kb * 1.5, kb * 0.85, -kb * 1.6, u7, -kb * 1.64, unten);
    x.lineTo(kb * 1.64, unten);
    x.bezierCurveTo(kb * 1.6, u7, kb * 1.5, kb * 0.85, kb * 1.3, kb * 0.5);
    x.bezierCurveTo(kb * 1.0, kb * 0.05, kb * 0.4, 0, kb * 0.2, -kb * 0.14);
    x.closePath(); x.fill();
  }
  function katzenKoerper(x, dx, dy, cb, unten) {
    x.beginPath(); x.moveTo(dx - cb * 0.32, dy + cb * 0.2);
    x.bezierCurveTo(dx - cb * 0.75, dy + cb * 0.6, dx - cb * 0.7, dy + cb * 1.4, dx - cb * 0.62, unten);
    x.lineTo(dx + cb * 0.66, unten);
    x.bezierCurveTo(dx + cb * 0.78, dy + cb * 1.4, dx + cb * 0.8, dy + cb * 0.6, dx + cb * 0.32, dy + cb * 0.2);
    x.closePath(); x.fill();
  }
  function katzenKopf(x, cb) {
    var rx = cb * 0.5, ry = cb * 0.42, s, i;
    x.beginPath(); x.moveTo(-rx, ry * 0.05);
    x.bezierCurveTo(-rx * 0.98, -ry * 1.15, rx * 0.98, -ry * 1.15, rx, ry * 0.05);
    x.bezierCurveTo(rx * 1.06, ry * 0.75, rx * 0.55, ry * 1.08, 0, ry * 1.05);
    x.bezierCurveTo(-rx * 0.55, ry * 1.08, -rx * 1.06, ry * 0.75, -rx, ry * 0.05);
    x.closePath(); x.fill();
    for (s = -1; s <= 1; s += 2) for (i = 0; i < 3; i++) {   // Wangenbüschel
      var yy = ry * (0.25 + i * 0.22);
      x.beginPath(); x.moveTo(s * rx * 0.9, yy - ry * 0.12); x.lineTo(s * rx * (1.22 - i * 0.05), yy + ry * 0.05); x.lineTo(s * rx * 0.88, yy + ry * 0.12); x.closePath(); x.fill();
    }
    x.lineWidth = Math.max(0.7, cb * 0.013); x.lineCap = "round";
    for (s = -1; s <= 1; s += 2) for (i = 0; i < 3; i++) {   // Schnurrhaare
      x.beginPath(); x.moveTo(s * rx * 0.85, ry * (0.45 + i * 0.12)); x.quadraticCurveTo(s * rx * 1.4, ry * (0.3 + i * 0.2), s * rx * 1.9, ry * (0.2 + i * 0.3)); x.stroke();
    }
  }
  function ohr(ctx, cb, s, winkel, spitz, gross) {   // s = -1 links, +1 rechts
    ctx.save(); ctx.translate(s * cb * 0.27, -cb * 0.26); ctx.rotate(s * winkel); ctx.scale(gross, gross * (1 + spitz * 0.12));
    ctx.beginPath(); ctx.moveTo(-s * cb * 0.2, cb * 0.08); ctx.quadraticCurveTo(s * cb * 0.02, -cb * 0.3, s * cb * 0.1, -cb * 0.46);
    ctx.quadraticCurveTo(s * cb * 0.2, -cb * 0.2, s * cb * 0.2, cb * 0.1); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function schwanzMalen(ctx, P, w) {   // wedelt von der Wurzel zur Spitze immer stärker
    var cb = P.cb, bx = P.kx + cb * 0.5, by = P.ky + cb * 1.25;
    function p(dx, dy, a) { var c = Math.cos(a), s = Math.sin(a); return [bx + dx * c - dy * s, by + dx * s + dy * c]; }
    var a = p(cb * 0.45, cb * 0.35, w * 0.4), b = p(cb * 0.95, cb * 0.28, w * 0.8), e = p(cb * 0.92, -cb * 0.24, w * 1.25);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.bezierCurveTo(a[0], a[1], b[0], b[1], e[0], e[1]); ctx.stroke();
  }
  function stueck(ctx, spr, rand) { ctx.drawImage(rand ? spr.rand : spr.dunkel, -spr.ox, -spr.oy, spr.b, spr.h); }

  function publikum(ctx, L, Z, licht) {
    if (papierPublikum(ctx, L, Z, licht)) return;
    var P = L.pub, p = Z.pub, cb = P.cb, kb = P.kb;
    var rimA = Math.min(1, 0.12 + licht * 0.85) * (1 - Z.schwarz);
    var dy = (RUHIG ? 0 : Math.sin(uhr * 1.25) * kb * 0.012) - p.lach * kb * 0.06 + p.staun * kb * 0.03;
    var nick = p.nick * kb * 0.07 + p.staun * kb * 0.03, kopfNeig = RUHIG ? 0 : Math.sin(uhr * 0.45) * 0.02;
    var blickW = p.blick === null || p.blick === undefined ? 0.03 : B.klemme((p.blick - P.kx) / (L.W * 0.45), -1, 1) * 0.17;
    var katzeNeig = blickW + (RUHIG ? 0 : Math.sin(uhr * 0.7) * 0.02);
    var ohrL = 0.1 + p.ohrL * 0.45 - p.spitz * 0.12, ohrR = 0.1 + p.ohrR * 0.45 - p.spitz * 0.12;
    var wedel = (RUHIG ? 0 : Math.sin(uhr * 1.1) * 0.08) + Math.sin(uhr * 7.5) * 0.4 * p.schwanz;
    // zwei Durchgänge: erst alles Randlicht, dann alle dunklen Formen darüber
    for (var gang = 0; gang < 2; gang++) {
      var rand = gang === 0;
      if (rand) { if (rimA < 0.01) continue; ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = rimA; ctx.fillStyle = RIM; ctx.strokeStyle = RIM; }
      else { ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; ctx.fillStyle = SILH; ctx.strokeStyle = SILH; }
      var hoch = rand ? -kb * 0.02 : 0;   // das Licht kommt von vorn oben: oben breiterer Rand
      ctx.save(); ctx.translate(P.hals.x, P.hals.y + dy + hoch); stueck(ctx, P.rumpf, rand); ctx.restore();
      // Katze: Kopf folgt dem, was gerade fliegt; Ohren zucken
      ctx.save(); ctx.translate(P.kx, P.ky + dy + hoch + cb * 0.3); ctx.rotate(katzeNeig); ctx.translate(0, -cb * 0.3);
      if (rand) { ohr(ctx, cb, -1, ohrL, p.spitz, 1.14); ohr(ctx, cb, 1, ohrR, p.spitz, 1.14); }
      else { ohr(ctx, cb, -1, ohrL, p.spitz, 1); ohr(ctx, cb, 1, ohrR, p.spitz, 1); }
      stueck(ctx, P.katze, rand);
      ctx.restore();
      ctx.lineCap = "round"; ctx.lineWidth = cb * (rand ? 0.2 : 0.13);
      ctx.save(); ctx.translate(0, dy); schwanzMalen(ctx, P, wedel); ctx.restore();
      // Omsis Kopf: nicken heißt von hinten gesehen: etwas tiefer und kürzer
      ctx.save(); ctx.translate(P.hals.x, P.hals.y + dy + hoch + nick); ctx.rotate(kopfNeig); ctx.scale(1, 1 - p.nick * 0.06);
      ctx.translate(0, P.kopfM.y - P.hals.y); stueck(ctx, P.kopf, rand); ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  function papierPublikum(ctx, L, Z, licht) {
    var namen = ["omsi-schultern", "omsi-kopf", "katze-koerper", "katze-schwanz", "katze-ohr-links", "katze-ohr-rechts"], i;
    for (i = 0; i < namen.length; i++) if (!TEILE["publikum-" + namen[i]] || !TEILE["publikum-" + namen[i]].farbig) return false;
    var P = L.pub, p = Z.pub, kb = P.kb, s = kb * 1.5 / 389, ks = P.cb * 1.7 / 331;
    var dy = (RUHIG ? 0 : Math.sin(uhr * 1.25) * kb * .012) - p.lach * kb * .06 + p.staun * kb * .03;
    var rand = Math.min(1, .12 + licht * .85) * (1 - Z.schwarz);
    // Querformat: genug Platz neben den Versen, auch wenn die Katze wedelt.
    ctx.save();
    if (!L.hoch) { ctx.translate(0, L.omsiY); ctx.scale(.82, .82); ctx.translate(0, -L.omsiY); }
    function teil(name, ox, oy, winkel) {
      var sp = TEILE["publikum-" + name], g = sp.meta.gelenk;
      ctx.save();
      if (winkel) { ctx.translate(g[0] - ox, g[1] - oy); ctx.rotate(winkel); ctx.translate(ox - g[0], oy - g[1]); }
      ctx.globalAlpha = 1; ctx.drawImage(sp.dunkel, -ox, -oy, sp.b, sp.h);
      ctx.globalAlpha = rand; ctx.drawImage(sp.farbig, -ox, -oy, sp.b, sp.h);
      ctx.restore();
    }
    ctx.save(); ctx.globalCompositeOperation = "source-over";
    ctx.translate(P.hals.x, P.hals.y + dy); ctx.scale(s, s);
    teil("omsi-schultern", 510, 465, 0);
    ctx.translate(0, p.nick * 18 + p.staun * 8); ctx.scale(1, 1 - p.nick * .06);
    teil("omsi-kopf", 510, 465, (RUHIG ? 0 : Math.sin(uhr * .45) * .02)); ctx.restore();
    var blick = p.blick === null || p.blick === undefined ? 0 : B.klemme((p.blick - P.kx) / (L.W * .45), -1, 1) * .055;
    ctx.save(); ctx.translate(P.kx, P.ky + dy + P.cb * 1.4); ctx.scale(ks, ks); ctx.rotate(blick);
    teil("katze-koerper", 1220, 768, 0);
    teil("katze-schwanz", 1220, 768, (RUHIG ? 0 : Math.sin(uhr * 1.1) * .08 + Math.sin(uhr * 7.5) * .25 * p.schwanz));
    teil("katze-ohr-links", 1220, 768, -p.ohrL * .45 + p.spitz * .12);
    teil("katze-ohr-rechts", 1220, 768, p.ohrR * .45 - p.spitz * .12);
    ctx.restore(); ctx.globalAlpha = 1;
    ctx.restore();
    return true;
  }

  // ───────────────── Ein Bild zusammensetzen ─────────────────
  function flackern(z) {   // zartes Lampenflackern: leises Wabern und ab und zu ein kleines Absacken
    var f = 0.985 + 0.015 * Math.sin(z * 9.1) * Math.sin(z * 2.3 + 1.1), tauch = Math.sin(z * 0.73) * Math.sin(z * 1.37 + 2);
    if (tauch > 0.8) f -= (tauch - 0.8) * 0.2;
    return f;
  }

  function zeichne(ctx, W, H, k, t, einmal) {
    var L = buehneHolen(W, H), dpr = L.dpr;
    var Z = { licht: 0, spot: null, wandSpot: null, wogen: 0, nacht: 0, schwarz: 0, raum: 0, effekte: [],
              pub: { nick: 0, lach: 0, staun: 0, ohrL: 0, ohrR: 0, spitz: 0, schwanz: 0, blick: null } };
    // 1) Schatten auf ihre Ebene (nur die Deckkraft zählt; "lighter" = Überschneidungen werden nicht dunkler)
    var lc = ebeneBereit(L.S, L);
    lc.globalCompositeOperation = "lighter"; lc.fillStyle = FARBE; lc.strokeStyle = FARBE;
    SZENEN[k + 1](lc, L, t, Z, einmal);
    tiefeAus();
    reaktionen(k, t, Z);
    var licht = Z.licht * (RUHIG ? 1 : flackern(uhr));
    // 2) Raum
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(L.hinter, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // 3) Lichthof an der Wand und Licht auf dem Boden unter dem Laken
    var hof = Math.max(licht, Z.spot ? Z.spot.a * 0.6 : 0);
    if (hof > 0.01) {
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = hof * 0.5; ctx.drawImage(GLANZ.hof, L.sx - L.sw * 0.14, L.sy - L.sh * 0.22, L.sw * 1.28, L.sh * 1.44);
      ctx.globalAlpha = hof * 0.6; ctx.drawImage(GLANZ.hof, L.mitte - L.sw * 0.62, L.sy + L.sh * 0.86, L.sw * 1.24, L.sh * 0.5);
    }
    // 4) das Laken: Licht minus Schatten
    lakenLicht(ctx, L, licht, Z);
    // 5) Taschenlampe beim Auftakt: Strahl und Fleck an der Wand
    if (Z.wandSpot) wandLicht(ctx, L, Z.wandSpot);
    // 6) Wäscheklammern, Stange glänzt warm
    klammern(ctx, L, Math.max(licht, Z.spot ? Z.spot.a * 0.5 : 0));
    // 7) Lichteffekte (Glanz bei der Übergabe, Kerzenflamme)
    effekte(ctx, L, Z.effekte);
    // 8) Staubkörnchen im Licht
    staub(ctx, L, licht);
    // 9) Publikum
    publikum(ctx, L, Z, Math.max(licht, Z.spot ? Z.spot.a * 0.6 : 0));
    // 10) Raumlicht am Anfang, Schwarzblende am Ende
    if (Z.raum > 0.001) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Z.raum; ctx.fillStyle = "rgb(46,58,98)"; ctx.fillRect(0, 0, W, H); }
    if (Z.schwarz > 0.001) { ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = Z.schwarz; ctx.fillStyle = "#02040b"; ctx.fillRect(0, 0, W, H); }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  // Licht auf dem Laken (Tuch atmet, Saum schwingt), Schatten ausstanzen, aufs Bild
  function lakenLicht(ctx, L, licht, Z) {
    var e = L.Lt, x = e.x, cw = e.cv.width, ch = e.cv.height, i;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = "source-over"; x.globalAlpha = 1; x.clearRect(0, 0, cw, ch);
    var saum = RUHIG ? 0 : 0.003 + Z.wogen * 0.009;   // der Saum schwingt (Anteil der Höhe)
    if (licht > 0.003) {
      x.globalAlpha = Math.min(1, licht);
      if (saum > 0) {
        var N = 40, sb = cw / N;
        for (i = 0; i < N; i++) {
          var x0 = Math.floor(i * sb), b = Math.floor((i + 1) * sb) - x0;
          var d = saum * Math.sin(i / N * 5.3 + uhr * 1.1) * (0.6 + 0.4 * Math.sin(i * 0.9 - uhr * 0.7));
          if (b > 0) x.drawImage(L.hell, x0, 0, b, ch, x0, 0, b, ch * (1 + d));
        }
      } else x.drawImage(L.hell, 0, 0);
    }
    x.globalAlpha = 1;
    x.setTransform(L.dpr, 0, 0, L.dpr, -L.ex * L.dpr, -L.ey * L.dpr);
    if (Z.spot && Z.spot.a > 0.003) {   // Lichtfleck der Lampe (Auftakt, Finale)
      x.save(); lakenPfad(x, L); x.clip();
      x.globalCompositeOperation = "lighter"; x.globalAlpha = Math.min(1, Z.spot.a);
      x.drawImage(GLANZ.fleck, Z.spot.x - Z.spot.r, Z.spot.y - Z.spot.r, Z.spot.r * 2, Z.spot.r * 2);
      x.restore();
    }
    if (!RUHIG && (licht > 0.02 || Z.spot)) {   // breite, weiche Stoffwellen wandern langsam: das Tuch atmet
      x.globalCompositeOperation = "source-atop";
      for (i = 0; i < 4; i++) {
        var bx = L.sx + L.sw * (0.1 + 0.8 * (0.5 + 0.5 * Math.sin(uhr * (0.13 + i * 0.05) + i * 1.7))), bb = L.sw * (0.08 + 0.03 * i);
        x.globalAlpha = (0.05 + Z.wogen * 0.1) * (i % 2 ? 1.1 : 0.9);
        x.drawImage(i % 2 ? GLANZ.hell : GLANZ.dunkel, bx - bb / 2, L.sy, bb, L.sh * 1.12);
      }
    }
    if (Z.nacht > 0.01) { x.globalCompositeOperation = "source-atop"; x.globalAlpha = Z.nacht * 0.24; x.fillStyle = "#4b62b6"; x.fillRect(L.ex, L.ey, L.ew, L.eh); }
    // Schatten ausstanzen – leicht gewellt wie auf bewegtem Stoff (oben an den Klammern fest)
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = "destination-out"; x.globalAlpha = 0.93;
    schattenStreifen(x, L, cw, ch, RUHIG ? 0 : (0.6 + Z.wogen * 3.5) * L.dpr);
    x.globalCompositeOperation = "source-over"; x.globalAlpha = 1;
    // darunter das warm-dunkle Tuch: dort, wo Schatten ist, scheint es durch (bei wenig Licht bleibt es blau)
    var warm = Math.min(1, licht + (Z.warm || 0));
    ctx.globalCompositeOperation = "source-over";
    if (warm > 0.02) { ctx.globalAlpha = warm * 0.85; ctx.drawImage(L.warm, L.ex, L.ey, L.ew, L.eh); }
    ctx.globalAlpha = 1;
    ctx.drawImage(e.cv, L.ex, L.ey, L.ew, L.eh);
  }

  // Schattenebene streifenweise auftragen (seitlich leicht versetzt = gewellter Stoff, oben fest)
  function schattenStreifen(x, L, cw, ch, amp) {
    if (amp <= 0) { x.drawImage(L.S.cv, 0, 0); return; }
    var M = 18, hb = ch / M;
    for (var i = 0; i < M; i++) {
      var y0 = Math.floor(i * hb), hh = Math.floor((i + 1) * hb) - y0;
      if (hh > 0) x.drawImage(L.S.cv, 0, y0, cw, hh, amp * (i / M) * Math.sin(i * 0.8 + uhr * 1.9), y0, cw, hh);
    }
  }

  // Taschenlampe im Auftakt: sichtbarer Strahl mit Staub und Lichtfleck an der Wand – nur außerhalb des Lakens
  function wandLicht(ctx, L, w) {
    ctx.save();
    // nur die Wand über und neben dem Laken (achsparallele Rechtecke: viel billiger als der Laken-Umriss)
    ctx.beginPath(); ctx.rect(0, 0, L.W, L.sy); ctx.rect(L.sx + L.sw * 1.014, L.sy, L.W, L.H); ctx.rect(0, L.sy, L.sx - L.sw * 0.014, L.H); ctx.clip();
    ctx.globalCompositeOperation = "lighter";
    var dx = w.x - w.tx, dy = w.y - w.ty, l = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / l, ny = dx / l;
    var g = ctx.createLinearGradient(w.tx, w.ty, w.x, w.y);
    g.addColorStop(0, "rgba(255,236,196,0)"); g.addColorStop(0.45, "rgba(255,236,196,0.07)"); g.addColorStop(1, "rgba(255,236,196,0.17)");
    ctx.fillStyle = g;
    for (var k = 0; k < 3; k++) {   // drei Keile übereinander: weiche Ränder statt einer harten Kante
      var bs = w.r * (0.45 + k * 0.2), bq = w.r * (0.04 + k * 0.03);
      ctx.globalAlpha = w.a * 0.45;
      ctx.beginPath(); ctx.moveTo(w.tx + nx * bq, w.ty + ny * bq); ctx.lineTo(w.x + nx * bs, w.y + ny * bs);
      ctx.lineTo(w.x - nx * bs, w.y - ny * bs); ctx.lineTo(w.tx - nx * bq, w.ty - ny * bq); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = w.a * 0.8; ctx.drawImage(GLANZ.fleck, w.x - w.r, w.y - w.r * 0.85, w.r * 2, w.r * 1.7);
    for (var i = 0; i < 18; i++) {   // Staub im Strahl
      var s = (i * 0.618 + uhr * 0.04) % 1, q = Math.sin(i * 12.99) * 0.8, f = 0.3 + 0.7 * s;
      var px = w.tx + dx * f + nx * q * w.r * 0.7 * f + Math.sin(uhr * 0.8 + i) * 3, py = w.ty + dy * f + ny * q * w.r * 0.7 * f + Math.cos(uhr * 0.6 + i * 2) * 3;
      var rr = 1.2 + (i % 3) * 0.7;
      ctx.globalAlpha = w.a * (0.3 + 0.6 * Math.max(0, Math.sin(uhr * 2 + i * 1.7)));
      ctx.drawImage(GLANZ.staub, px - rr * 2, py - rr * 2, rr * 4, rr * 4);
    }
    ctx.restore();
  }

  function klammern(ctx, L, licht) {
    var kb = Math.max(5, L.sw * 0.011), kh = L.sh * 0.07;
    if (licht > 0.02) {   // die Stange fängt warmes Licht
      ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = licht * 0.3; ctx.strokeStyle = "#ffcf7a"; ctx.lineWidth = Math.max(1.5, L.H * 0.0025);
      ctx.beginPath(); ctx.moveTo(L.sx, L.sy - 3); ctx.lineTo(L.sx + L.sw, L.sy - 3); ctx.stroke();
    }
    for (var i = 0; i < L.klammern.length; i++) {
      var x = L.klammern[i] - kb / 2, y = L.sy - kh * 0.55;
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
      ctx.fillStyle = "#3a2918"; ctx.fillRect(x, y, kb, kh);
      ctx.fillStyle = "#1c130b"; ctx.fillRect(x + kb * 0.42, y + kh * 0.08, kb * 0.16, kh * 0.84);
      if (licht > 0.02) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = licht * 0.45; ctx.fillStyle = "#c98a40"; ctx.fillRect(x, y, kb, kh * 0.12); }
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  function effekte(ctx, L, liste) {
    if (!liste.length) return;
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < liste.length; i++) {
      var e = liste[i];
      if (e.art === "funkel" && e.r > 0.5) {
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.dreh || 0); ctx.globalAlpha = Math.min(1, e.a);
        ctx.drawImage(GLANZ.funkel, -e.r, -e.r, e.r * 2, e.r * 2); ctx.restore();
      } else if (e.art === "flamme") {
        var fl = RUHIG ? 1 : 1 + 0.08 * Math.sin(uhr * 17) * Math.sin(uhr * 7.3), h = e.h * fl, b = h * 0.6;
        ctx.globalAlpha = e.a * 0.5; ctx.drawImage(GLANZ.hof, e.x - h * 1.6, e.y - h * 1.7, h * 3.2, h * 3.2);
        ctx.globalAlpha = e.a; ctx.drawImage(GLANZ.flamme, e.x - b / 2 + (RUHIG ? 0 : Math.sin(uhr * 11) * h * 0.03), e.y - h * 0.62, b, h);
      }
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  // Staubkörnchen tanzen langsam im Licht vor dem Laken
  var STAUB = null;
  function staub(ctx, L, licht) {
    if (licht < 0.05) return;
    if (!STAUB) { var zf = zufall(99); STAUB = []; for (var j = 0; j < 26; j++) STAUB.push({ u: zf(), v: zf(), s: 0.5 + zf(), p: zf() * 6.28, g: 0.8 + zf() * 1.6 }); }
    var anz = RUHIG ? 10 : STAUB.length, tt = RUHIG ? uhr * 0.3 : uhr, gr = L.H / 800;
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < anz; i++) {
      var d = STAUB[i], v = (d.v - tt * 0.012 * d.s) % 1;
      if (v < 0) v += 1;
      var x = L.sx + L.sw * (d.u + 0.025 * Math.sin(tt * 0.5 * d.s + d.p)), y = L.sy + L.sh * (0.04 + v * 0.95) + L.sh * 0.01 * Math.sin(tt * 0.9 + d.p);
      var fun = 0.35 + 0.65 * Math.max(0, Math.sin(tt * 1.3 * d.s + d.p));
      var mx = (x - L.mitte) / (L.sw * 0.6), my = (y - (L.sy + L.sh * 0.5)) / (L.sh * 0.7), nah = Math.max(0, 1 - mx * mx - my * my);
      ctx.globalAlpha = licht * fun * (0.2 + 0.5 * nah) * Math.min(1, v * 8, (1 - v) * 8) * 0.8;
      var r = d.g * gr * 1.3;
      ctx.drawImage(GLANZ.staub, x - r * 2, y - r * 2, r * 4, r * 4);
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  // ───────────────── eigene kleine Klänge (Web Audio über KLANG.kontext) ─────────────────
  function klang(art, wert) {
    if (!lauf || lauf.test || (B.E && B.E.toene === false)) return;
    var ac = window.KLANG && KLANG.kontext ? KLANG.kontext() : null;
    if (!ac) return;
    try {
      var t = ac.currentTime + 0.02, ziel = ac.createGain(); ziel.gain.value = 1; ziel.connect(ac.destination);
      if (art === "klick") { knack(ac, ziel, t, 0.55, 2400); knack(ac, ziel, t + 0.075, 0.35, 1500); }   // Taschenlampen-Schalter
      else if (art === "blubb") { for (var i = 0; i < 3; i++) ton(ac, ziel, t + i * 0.1, 360 + i * 60, 900 + i * 120, 0.09, 0.05); }
      else if (art === "wachsen") { var f = 280 * Math.pow(1.12, wert || 0); ton(ac, ziel, t, f, f * 1.9, 0.42, 0.045); ton(ac, ziel, t, f * 2, f * 3.8, 0.42, 0.012); }
      else if (art === "schub") { ton(ac, ziel, t, 240, 760, 1.1, 0.05); ton(ac, ziel, t, 480, 1520, 1.1, 0.012); }
      else if (art === "flapp") rauschStoss(ac, ziel, t, 0.14, 1400, 350, 0.16);
      else if (art === "glitzer") { [1568, 2093, 2637, 3136, 3951].forEach(function (fq, j) { ton(ac, ziel, t + j * 0.07, fq, 0, 0.8, 0.028); }); }
      else if (art === "spieluhr") { var fr = 440 * Math.pow(2, (wert - 69) / 12); ton(ac, ziel, t, fr, 0, 1.5, 0.045); ton(ac, ziel, t, fr * 4.02, 0, 0.35, 0.01); }
    } catch (e) {}
  }
  function starte(n, t, ende) { if (n.start) n.start(t); else n.noteOn(t); if (ende) { if (n.stop) n.stop(ende); else n.noteOff(ende); } }
  function ton(ac, ziel, t, f1, f2, dauer, laut) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(f1, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dauer * 0.85);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(laut, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
    o.connect(g); g.connect(ziel); starte(o, t, t + dauer + 0.05);
  }
  function rauschPuffer(ac, dauer, abfall) {
    var n = Math.max(1, Math.round(ac.sampleRate * dauer)), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, abfall);
    return b;
  }
  function knack(ac, ziel, t, laut, freq) {
    var q = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    q.buffer = rauschPuffer(ac, 0.025, 6); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = 1.4; g.gain.value = laut;
    q.connect(f); f.connect(g); g.connect(ziel); starte(q, t);
  }
  function rauschStoss(ac, ziel, t, dauer, f1, f2, laut) {
    var q = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    q.buffer = rauschPuffer(ac, dauer, 1.5); f.type = "lowpass"; f.frequency.setValueAtTime(f1, t); f.frequency.exponentialRampToValueAtTime(f2, t + dauer); g.gain.value = laut;
    q.connect(f); f.connect(g); g.connect(ziel); starte(q, t);
  }

  // ───────────── Ersatzfiguren (gezeichnet), nur falls die Bilder fehlen ─────────────
  function kindErsatz(ctx, x, gy, h) {
    var y = gy;
    ctx.lineCap = "round"; ctx.lineWidth = h * 0.085;
    ctx.beginPath(); ctx.moveTo(x - h * 0.04, y - h * 0.44); ctx.lineTo(x - h * 0.05, gy - h * 0.02);
    ctx.moveTo(x + h * 0.04, y - h * 0.44); ctx.lineTo(x + h * 0.05, gy - h * 0.02); ctx.stroke();
    rundRechteck(ctx, x - h * 0.13, y - h * 0.8, h * 0.26, h * 0.4, h * 0.07); ctx.fill();
    ctx.lineWidth = h * 0.065;
    ctx.beginPath(); ctx.moveTo(x + h * 0.1, y - h * 0.74); ctx.lineTo(x + h * 0.2, y - h * 0.58); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y - h * 0.9, h * 0.12, 0, Math.PI * 2); ctx.fill();
  }
  function omsiErsatz(ctx, x, gy, h) {
    var y = gy;
    ctx.lineCap = "round"; ctx.lineWidth = h * 0.07;
    ctx.beginPath(); ctx.moveTo(x - h * 0.05, y - h * 0.35); ctx.lineTo(x - h * 0.06, gy - h * 0.02);
    ctx.moveTo(x + h * 0.05, y - h * 0.35); ctx.lineTo(x + h * 0.06, gy - h * 0.02); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - h * 0.12, y - h * 0.78); ctx.quadraticCurveTo(x - h * 0.2, y - h * 0.5, x - h * 0.2, y - h * 0.3);
    ctx.lineTo(x + h * 0.19, y - h * 0.3); ctx.quadraticCurveTo(x + h * 0.19, y - h * 0.5, x + h * 0.12, y - h * 0.78);
    ctx.closePath(); ctx.fill();
    ctx.lineWidth = h * 0.06; ctx.beginPath(); ctx.moveTo(x - h * 0.1, y - h * 0.72); ctx.lineTo(x - h * 0.2, y - h * 0.45); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y - h * 0.88, h * 0.11, 0, Math.PI * 2); ctx.fill();
  }
  function pfanneErsatz(ctx, x, y, r, kevinHaelt) {
    ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = r * 0.16;
    var richtung = kevinHaelt > 0.5 ? -1 : 1;
    ctx.beginPath(); ctx.moveTo(x + richtung * r * 0.9, y); ctx.lineTo(x + richtung * r * 2.1, y + r * 0.05); ctx.stroke();
  }
  function pfannekuchenErsatz(ctx, x, y, r, phase) {
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
