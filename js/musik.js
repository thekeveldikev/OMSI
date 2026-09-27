/* Musik der App: Menümusik (zwei Stücke im Wechsel) und eigene Stücke für
   "Pfannkuchen wenden", "Geheimakte Omsi" und das Making-of.

   Wo was läuft (Bereich = Name aus APP.zeige):
     start, kueche, rezept, brief  → Menümusik (läuft beim Wechsel zwischen ihnen einfach weiter)
     spiel / akte / makingof       → eigenes Stück, weich überblendet – und zurück wieder in die Menümusik
     alles andere (Bücher, Torte, Schattentheater, Radio) → still, sanft ausgeblendet

   Technik: zwei Abspieler (<audio>) für echte Überblendungen, Lautstärke über Web Audio (GainNode),
   weil das iPad audio.volume ignoriert. iOS spielt Ton erst nach dem ersten Antippen – deshalb
   beginnt die Musik mit der ersten Berührung (auf dem Startbild: dem Tipp aufs Gartentor).
   Bewusst ES5. */
(function () {
  var M = window.MUSIK = {};
  var ORDNER = "audio/musik/";

  // laut: Wiedergabepegel, eingemessen auf gleiche Lautheit (EBU R128): Menü −19 LUFS, Spiel −20,
  //       Akte und Making-of −21 (dort wird gelesen). stille: Sekunden Stille am Dateiende.
  var STUECKE = {
    menue1:   { datei: "menuemusik_1.mp3",        laut: 0.50, stille: 3.2 },
    menue2:   { datei: "menuemusik_2.mp3",        laut: 0.46, stille: 2.3 },
    wenden:   { datei: "pfannkuchenwenden_1.mp3", laut: 0.56, stille: 3.9, schleife: 2.5 },
    akte:     { datei: "geheimakte_1.mp3",        laut: 0.68, stille: 1.0, schleife: 4.5 },
    makingof: { datei: "makingoff_1.mp3",         laut: 0.95, stille: 2.0, schleife: 3.5 }
  };
  var BEREICHE = { start: "menue", kueche: "menue", rezept: "menue", brief: "menue",
                   spiel: "wenden", akte: "akte", makingof: "makingof" };
  var PAUSE_ZWISCHEN_MENUESTUECKEN = 3.5;     // "nach kurzer Pause" (inkl. Stille am Dateiende)
  var KURZ_WEG = 25;                          // so kurz weg (s) → Menümusik läuft an derselben Stelle weiter
  var ZWEITE_BEI_RUECKKEHR = 0.35;            // Chance, dass bei der Rückkehr gleich das zweite Stück kommt

  var an = B.erinnern("musik.an", true) !== false;
  var wunsch = null;                          // "menue" | "wenden" | "akte" | "makingof" | null
  var aktiv = null;                           // { sp, stueck }
  var spieler = [], bus = null, pauseTimer = null;
  var entsperrt = false, ersterStart = true, versteckt = false;
  var menuePos = { menue1: 0, menue2: 0 }, letztesMenue = "menue1", wegSeit = 0;

  function jetzt() { return B.jetzt() / 1000; }
  function istMenue(st) { return st === "menue1" || st === "menue2"; }

  // ───────── Abspieler ─────────
  function spielerHolen(i) {
    if (spieler[i]) return spieler[i];
    var el = new Audio();
    el.preload = "auto";
    var sp = spieler[i] = { el: el, nr: i, gain: null, direkt: false, stueck: null, rampe: null, stoppTimer: null, volTimer: null };
    el.addEventListener("ended", function () { if (aktiv && aktiv.sp === sp) stueckZuEnde(); }, false);
    return sp;
  }
  function verkabeln(sp) {                     // Web-Audio-Weg einmal pro Abspieler aufbauen
    if (sp.gain || sp.direkt) return;
    var ctx = window.KLANG && KLANG.kontext();
    if (!ctx || !ctx.createMediaElementSource) { sp.direkt = true; return; }
    try {
      if (!bus) { bus = ctx.createGain(); bus.gain.value = 1; bus.connect(ctx.destination); }
      var quelle = ctx.createMediaElementSource(sp.el);
      sp.gain = ctx.createGain(); sp.gain.gain.value = 0;
      quelle.connect(sp.gain); sp.gain.connect(bus);
      sp.el.volume = 1;
    } catch (e) { sp.direkt = true; }
  }

  // Pegel weich verändern: gleichmäßig empfundene Kurve (sin/cos), in 12 Teilstücken vorausgeplant.
  // Den aktuellen Wert rechnen wir selbst aus (ältere Safaris melden bei laufenden Rampen falsche Werte).
  function kurve(auf, p) { return auf ? Math.sin(p * Math.PI / 2) : 1 - Math.cos(p * Math.PI / 2); }
  function pegelJetzt(sp) {
    var r = sp.rampe;
    if (!r) return 0;
    var t = sp.gain ? KLANG.kontext().currentTime : jetzt();
    if (t >= r.t1) return r.bis;
    if (t <= r.t0) return r.von;
    return r.von + (r.bis - r.von) * kurve(r.bis > r.von, (t - r.t0) / (r.t1 - r.t0));
  }
  function pegel(sp, ziel, dauer) {
    var von = pegelJetzt(sp);
    if (sp.gain) {
      var g = sp.gain.gain, t = KLANG.kontext().currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(von, t);
      if (dauer <= 0.02) g.linearRampToValueAtTime(ziel, t + 0.02);
      else for (var i = 1; i <= 12; i++) g.linearRampToValueAtTime(von + (ziel - von) * kurve(ziel > von, i / 12), t + dauer * i / 12);
      sp.rampe = { von: von, bis: ziel, t0: t, t1: t + Math.max(dauer, 0.02) };
    } else {                                   // ohne Web Audio (ältere Browser am PC): audio.volume in kleinen Schritten
      var t0 = jetzt();
      sp.rampe = { von: von, bis: ziel, t0: t0, t1: t0 + Math.max(dauer, 0.02) };
      clearInterval(sp.volTimer);
      sp.volTimer = setInterval(function () {
        var v = pegelJetzt(sp);
        try { sp.el.volume = B.klemme(v * busWert(), 0, 1); } catch (e) {}
        if (jetzt() >= sp.rampe.t1) clearInterval(sp.volTimer);
      }, 40);
    }
  }
  function busWert() { return duck.wert; }

  function einmal(el, name, fn) {
    function h() { el.removeEventListener(name, h, false); fn(); }
    el.addEventListener(name, h, false);
  }
  function spielen(sp, stueck, ab, einblenden) {
    var S = STUECKE[stueck];
    clearTimeout(sp.stoppTimer);
    verkabeln(sp);
    // schnell hin und zurück: dasselbe Stück klingt noch aus → nicht springen, einfach wieder hochblenden
    var klingtNoch = sp.stueck === stueck && !sp.el.paused && pegelJetzt(sp) > 0.01;
    if (sp.stueck !== stueck) { sp.el.src = ORDNER + S.datei; sp.stueck = stueck; }
    if (!klingtNoch) pegel(sp, 0, 0);
    var weiter = sp.el.play();
    if (weiter && weiter["catch"]) weiter["catch"](function () { sp.blockiert = true; });
    function los() {
      if (!aktiv || aktiv.sp !== sp || aktiv.stueck !== stueck) return;   // inzwischen etwas anderes gewünscht
      if (!klingtNoch && Math.abs((sp.el.currentTime || 0) - (ab || 0)) > 0.4) { try { sp.el.currentTime = ab || 0; } catch (e) {} }
      pegel(sp, S.laut, einblenden);
    }
    if (sp.el.readyState >= 1) los(); else einmal(sp.el, "loadedmetadata", los);
  }
  function ausblenden(sp, dauer) {
    if (!sp) return;
    pegel(sp, 0, dauer);
    clearTimeout(sp.stoppTimer);
    sp.stoppTimer = setTimeout(function () { try { sp.el.pause(); } catch (e) {} }, dauer * 1000 + 120);
  }
  function freierSpieler() {
    var a = spielerHolen(0), b = spielerHolen(1);
    if (aktiv && aktiv.sp === a) return b;
    if (aktiv && aktiv.sp === b) return a;
    return pegelJetzt(a) <= pegelJetzt(b) ? a : b;
  }

  // ───────── Ablauf ─────────
  function stueckZuEnde() {
    var sp = aktiv.sp, st = aktiv.stueck, S = STUECKE[st];
    clearTimeout(pauseTimer);
    if (istMenue(st)) {                        // Menü: 1 → kurze Pause → 2 → kurze Pause → 1 …
      menuePos[st] = 0;
      var naechstes = st === "menue1" ? "menue2" : "menue1";
      aktiv = { sp: sp, stueck: naechstes, wartet: true };
      letztesMenue = naechstes;
      pauseTimer = setTimeout(function () {
        if (aktiv && aktiv.sp === sp && aktiv.wartet) { aktiv.wartet = false; spielen(sp, naechstes, 0, 0.5); }
      }, Math.max(0.6, PAUSE_ZWISCHEN_MENUESTUECKEN - S.stille) * 1000);
    } else {                                   // eigene Stücke: nach einer Atempause von vorn
      aktiv.wartet = true;
      pauseTimer = setTimeout(function () {
        if (aktiv && aktiv.sp === sp && aktiv.wartet) { aktiv.wartet = false; spielen(sp, st, 0, 0.4); }
      }, (S.schleife || 3) * 1000);
    }
  }

  function menueStueckWaehlen() {
    if (ersterStart) return { stueck: "menue1", ab: 0 };
    var weg = jetzt() - wegSeit;
    if (weg < KURZ_WEG && menuePos[letztesMenue] > 0) return { stueck: letztesMenue, ab: menuePos[letztesMenue] };
    if (letztesMenue !== "menue2" && Math.random() < ZWEITE_BEI_RUECKKEHR) return { stueck: "menue2", ab: 0 };
    if (letztesMenue === "menue2" && menuePos.menue2 > 0) return { stueck: "menue2", ab: menuePos.menue2 };   // das zweite zu Ende hören
    return { stueck: "menue1", ab: menuePos.menue1 > 3 ? menuePos.menue1 : 0 };                              // das erste bleibt die Hauptmusik
  }

  function positionMerken() {
    if (!aktiv || aktiv.wartet || !istMenue(aktiv.stueck)) return;
    var t = aktiv.sp.el.currentTime || 0, dauer = aktiv.sp.el.duration || 0;
    menuePos[aktiv.stueck] = dauer && t > dauer - STUECKE[aktiv.stueck].stille - 6 ? 0 : t;   // kurz vor Schluss: nächstes Mal von vorn
    letztesMenue = aktiv.stueck;
  }

  // Den gewünschten Zustand herstellen (wird bei jedem Wechsel aufgerufen)
  function abstimmen() {
    clearTimeout(pauseTimer);
    if (!entsperrt) return;                    // wartet auf die erste Berührung
    if (!an || versteckt || !wunsch) {
      if (aktiv) { positionMerken(); ausblenden(aktiv.sp, versteckt ? 0.25 : (wunsch ? 1.2 : 2.4)); aktiv = null; }
      return;
    }
    var ziel, ab = 0, rein;
    if (wunsch === "menue") {
      if (aktiv && istMenue(aktiv.stueck)) {   // läuft schon (oder wartet in der Pause) – nichts tun
        if (aktiv.wartet) stueckZuEndeFortsetzen();
        return;
      }
      var w = menueStueckWaehlen();
      ziel = w.stueck; ab = w.ab; rein = ersterStart ? 3.2 : 2.6;
      letztesMenue = ziel;
    } else {
      if (aktiv && aktiv.stueck === wunsch) { if (aktiv.wartet) stueckZuEndeFortsetzen(); return; }
      ziel = wunsch; rein = 1.8;
    }
    ersterStart = false;
    var alt = aktiv;
    if (alt) { positionMerken(); ausblenden(alt.sp, istMenue(alt.stueck) ? 1.6 : 2.0); }
    var sp = freierSpieler();
    aktiv = { sp: sp, stueck: ziel };
    spielen(sp, ziel, ab, rein);
  }
  function stueckZuEndeFortsetzen() {          // nach Unterbrechung in der Pause zwischen zwei Stücken
    var a = aktiv;
    pauseTimer = setTimeout(function () {
      if (aktiv === a && a.wartet) { a.wartet = false; spielen(a.sp, a.stueck, 0, 0.5); }
    }, 1500);
  }

  // ───────── Lautstärke kurz absenken (z. B. Spieluhr/Tusch im Spiel) ─────────
  var duck = { wert: 1, timer: null };
  M.ducken = function (faktor, dauer) {
    faktor = faktor == null ? 0.35 : faktor; dauer = dauer || 2;
    clearTimeout(duck.timer);
    function setzen(v, zeit) {
      duck.wert = v;
      if (bus) {
        var t = KLANG.kontext().currentTime, g = bus.gain;
        g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(v, t + zeit);
      } else spieler.forEach(function (sp) { if (sp && sp.direkt) pegel(sp, pegelJetzt(sp), 0.05); });
    }
    setzen(faktor, 0.25);
    duck.timer = setTimeout(function () { setzen(1, 1.2); }, dauer * 1000);
  };

  // ───────── Öffentliche Schnittstelle ─────────
  // Bei jedem Bildschirmwechsel (APP.zeige) aufrufen
  M.bereich = function (name) {
    var neu = BEREICHE[name] || null;
    if (neu === wunsch) return;               // z. B. Küche → Rezept: Musik läuft einfach weiter
    if (wunsch === "menue") { positionMerken(); wegSeit = jetzt(); }
    wunsch = neu;
    abstimmen();
  };

  // Erste Berührung schaltet Ton frei (iOS). Läuft bei jedem Tippen mit, kostet fast nichts.
  var STILLE = (function () {                 // 0,1 s Stille als WAV – schaltet den zweiten Abspieler frei
    var n = 800, kopf = [82, 73, 70, 70], b = [];
    function zahl(v, bytes) { for (var i = 0; i < bytes; i++) b.push((v >> (8 * i)) & 255); }
    b = kopf.slice(); zahl(36 + n, 4); b.push(87, 65, 86, 69, 102, 109, 116, 32); zahl(16, 4); zahl(1, 2); zahl(1, 2);
    zahl(8000, 4); zahl(8000, 4); zahl(1, 2); zahl(8, 2); b.push(100, 97, 116, 97); zahl(n, 4);
    for (var i = 0; i < n; i++) b.push(128);
    var s = ""; for (var j = 0; j < b.length; j++) s += String.fromCharCode(b[j]);
    return "data:audio/wav;base64," + window.btoa(s);
  })();
  function wecken() {
    if (!window.KLANG) return;
    KLANG.entsperren();
    var ctx = KLANG.kontext();
    if (ctx && ctx.state !== "running" && ctx.resume) { try { ctx.resume(); } catch (e) {} }
    if (!entsperrt) {
      entsperrt = true;
      var a = spielerHolen(0), b = spielerHolen(1);
      verkabeln(a); verkabeln(b);
      abstimmen();                            // spielt (falls gewünscht) direkt in dieser Berührung los
      [a, b].forEach(function (sp) {          // den unbenutzten Abspieler still freischalten
        if (sp.el.src) return;
        sp.el.src = STILLE; sp.stueck = null;
        var p = sp.el.play(); if (p && p["catch"]) p["catch"](function () {});
      });
      return;
    }
    // hing etwas (z. B. nach Sperrbildschirm)? Dann jetzt – in der Berührung – weiterspielen
    if (aktiv && !aktiv.wartet && aktiv.sp.el.paused && an && !versteckt && wunsch) spielen(aktiv.sp, aktiv.stueck, aktiv.sp.el.currentTime, 0.8);
  }
  ["touchend", "click", "keydown"].forEach(function (ev) { document.addEventListener(ev, wecken, true); });

  // App im Hintergrund / Bildschirm gesperrt: sofort anhalten, danach weich weiter
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      versteckt = true;
      clearTimeout(pauseTimer);
      if (aktiv) { positionMerken(); aktiv.pos = aktiv.sp.el.currentTime; }
      spieler.forEach(function (sp) { if (sp) { pegel(sp, 0, 0); try { sp.el.pause(); } catch (e) {} } });
    } else {
      versteckt = false;
      if (aktiv && an && wunsch) {
        var ctx = window.KLANG && KLANG.kontext();
        if (ctx && ctx.state !== "running" && ctx.resume) { try { ctx.resume(); } catch (e) {} }
        if (aktiv.wartet) stueckZuEndeFortsetzen(); else spielen(aktiv.sp, aktiv.stueck, aktiv.pos || aktiv.sp.el.currentTime, 1.4);
      } else abstimmen();
    }
  }, false);

  M.istAn = function () { return an; };
  M.umschalten = function () {
    an = !an; B.merken("musik.an", an);
    if (!an && aktiv) { positionMerken(); wegSeit = jetzt(); ausblenden(aktiv.sp, 0.9); aktiv = null; }
    else abstimmen();
    return an;
  };
  // kleiner Schalter "Musik aus/an" (in der Fußzeile der Küche)
  M.schalter = function (eltern) {
    var k = B.el("button", "musik-schalter", eltern);
    k.type = "button";
    function zeigen() {
      B.knopf(k, "note", an ? "Musik aus" : "Musik an");
      k.setAttribute("aria-pressed", an ? "false" : "true");
    }
    zeigen();
    B.tippen(k, function (ev) { ev.stopPropagation(); wecken(); M.umschalten(); zeigen(); });
    return k;
  };
  M.dateien = function () {
    var d = [];
    for (var k in STUECKE) d.push(ORDNER + STUECKE[k].datei);
    return d;
  };
  // für Tests: ans Ende des laufenden Stücks springen (rest = Sekunden bis zum Schluss)
  M.vorspulen = function (rest) {
    if (aktiv && !aktiv.wartet && aktiv.sp.el.duration) aktiv.sp.el.currentTime = Math.max(0, aktiv.sp.el.duration - (rest || 5));
  };
  // für Tests: tatsächlicher Ausgangspegel der Musik (RMS, 0…1)
  var messer = null, messDaten = null;
  M.messen = function () {
    if (!bus) return null;
    if (!messer) { messer = KLANG.kontext().createAnalyser(); messer.fftSize = 2048; bus.connect(messer); messDaten = new Uint8Array(messer.fftSize); }
    messer.getByteTimeDomainData(messDaten);                  // (die Float-Variante gibt es erst ab iOS 14.1)
    var q = 0; for (var i = 0; i < messDaten.length; i++) { var v = (messDaten[i] - 128) / 128; q += v * v; }
    return Math.round(Math.sqrt(q / messDaten.length) * 1000) / 1000;
  };
  M.zustand = function () {
    return { an: an, wunsch: wunsch, entsperrt: entsperrt, stueck: aktiv && aktiv.stueck, wartet: !!(aktiv && aktiv.wartet), pos: menuePos, letztes: letztesMenue,
             spieler: spieler.map(function (sp) { return sp && { stueck: sp.stueck, pegel: Math.round(pegelJetzt(sp) * 100) / 100, pause: sp.el.paused, zeit: Math.round(sp.el.currentTime * 10) / 10 }; }) };
  };
})();
