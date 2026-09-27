/* Alle Geräusche werden live erzeugt (Web Audio) – keine Tondateien nötig.
   Blättern, Brutzeln, Puff, Hopp, Orgel (Bach, Toccata d-Moll – gemeinfrei),
   Katze auf den Tasten, Spieluhr "Zum Geburtstag viel Glück" (gemeinfrei) ... */
(function () {
  var K = window.KLANG = {};
  var ctx = null, haupt = null, hall = null, rauschen = null;

  function an() { return B.E.toene !== false; }

  // iOS 17+: als "Wiedergabe" anmelden. Sonst gilt die Seite wegen Web Audio als "ambient" – dann schaltet der
  // Stummmodus ALLES stumm, auch Musik und Vorlesestimme. Das Mikrofon (Torte) schaltet kurz auf Aufnahme um.
  K.sitzung = function (art) {
    try { if (navigator.audioSession && navigator.audioSession.type !== art) navigator.audioSession.type = art; } catch (e) {}
  };
  K.sitzung("playback");

  K.entsperren = function () {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      haupt = ctx.createGain(); haupt.gain.value = 0.8; haupt.connect(ctx.destination);
      // Hall (künstlicher Raum)
      hall = ctx.createConvolver();
      var len = Math.round(ctx.sampleRate * 2.2), imp = ctx.createBuffer(2, len, ctx.sampleRate);
      for (var k = 0; k < 2; k++) {
        var d = imp.getChannelData(k);
        for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
      hall.buffer = imp;
      var hallGain = ctx.createGain(); hallGain.gain.value = 0.35;
      hall.connect(hallGain); hallGain.connect(haupt);
      // Rausch-Puffer
      var n = ctx.sampleRate * 2;
      rauschen = ctx.createBuffer(1, n, ctx.sampleRate);
      var r = rauschen.getChannelData(0);
      for (var j = 0; j < n; j++) r[j] = Math.random() * 2 - 1;
      // iOS: stillen Puffer abspielen, um Audio freizuschalten
      var s = ctx.createBufferSource(); s.buffer = ctx.createBuffer(1, 1, 22050); s.connect(ctx.destination);
      if (s.start) s.start(0); else s.noteOn(0);
    }
    if (ctx.state === "suspended" && ctx.resume) ctx.resume();
    if (window.KULISSE) KULISSE.wecken();
  };
  K.kontext = function () { return ctx; };

  // Regen vor dem Küchenfenster: gefiltertes Rauschen in Schleife, sehr leise unter der Musik (laut 0 = aus)
  var regenKnoten = null;
  K.regen = function (laut) {
    if (!ctx) return;
    var t = ctx.currentTime;
    if (!laut || !an()) {
      if (regenKnoten) {
        var r = regenKnoten; regenKnoten = null;
        r.g.gain.cancelScheduledValues(t); r.g.gain.setValueAtTime(Math.max(0.0001, r.g.gain.value), t); r.g.gain.linearRampToValueAtTime(0.0001, t + 1.2);
        setTimeout(function () { try { r.src.stop(); r.src.disconnect(); r.g.disconnect(); } catch (e) {} }, 1400);
      }
      return;
    }
    if (!regenKnoten) {
      var src = ctx.createBufferSource(); src.buffer = rauschen; src.loop = true;
      var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 650;
      var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 5200;
      var g = ctx.createGain(); g.gain.value = 0.0001;
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(haupt);
      start(src, t); regenKnoten = { src: src, g: g };
    }
    regenKnoten.g.gain.cancelScheduledValues(t); regenKnoten.g.gain.setValueAtTime(Math.max(0.0001, regenKnoten.g.gain.value), t);
    regenKnoten.g.gain.linearRampToValueAtTime(laut, t + 1.8);
  };
  // Wind (Gewitter, Nebel, Schneetreiben): tiefes Rauschen, das in Böen an- und abschwillt (laut 0 = aus)
  var windKnoten = null;
  K.wind = function (laut) {
    if (!ctx) return;
    var t = ctx.currentTime;
    if (!laut || !an()) {
      if (windKnoten) {
        var w = windKnoten; windKnoten = null;
        w.g.gain.cancelScheduledValues(t); w.g.gain.setValueAtTime(Math.max(0.0001, w.g.gain.value), t); w.g.gain.linearRampToValueAtTime(0.0001, t + 1.5);
        setTimeout(function () { try { w.src.stop(); w.lfo.stop(); w.src.disconnect(); w.g.disconnect(); w.lfo.disconnect(); } catch (e) {} }, 1700);
      }
      return;
    }
    if (!windKnoten) {
      var src = ctx.createBufferSource(); src.buffer = rauschen; src.loop = true;
      var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 420; bp.Q.value = 0.7;
      var g = ctx.createGain(); g.gain.value = 0.0001;
      var lfo = ctx.createOscillator(); lfo.frequency.value = 0.13;          // Böen
      var lfoTiefe = ctx.createGain(); lfoTiefe.gain.value = 180; lfo.connect(lfoTiefe); lfoTiefe.connect(bp.frequency);
      src.connect(bp); bp.connect(g); g.connect(haupt);
      start(src, t); start(lfo, t); windKnoten = { src: src, g: g, lfo: lfo };
    }
    windKnoten.g.gain.cancelScheduledValues(t); windKnoten.g.gain.setValueAtTime(Math.max(0.0001, windKnoten.g.gain.value), t);
    windKnoten.g.gain.linearRampToValueAtTime(laut, t + 2);
  };
  // Laub raschelt (Windstoß im Herbst): ein paar kurze, trockene Knister-Bündel
  K.rascheln = function (laut) {
    if (!ctx || !an()) return;
    var t = t0(), l = laut || 0.3;
    for (var i = 0; i < 5; i++) {
      var r = rausch(t + i * 0.09 + Math.random() * 0.05, 0.18, "highpass", 2400 + Math.random() * 1600, 0.7);
      huelle(r.g, t + i * 0.09, 0.01, 0.03, 0.12, l * (0.5 + Math.random() * 0.5));
    }
  };
  // Donner: Krachen, dann langes, tiefes Grollen
  K.donner = function (staerke) {
    if (!ctx || !an()) return;
    var t = t0(), s = staerke || 1;
    var src = ctx.createBufferSource(); src.buffer = rauschen; src.loop = true;
    var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(1100, t); lp.frequency.exponentialRampToValueAtTime(110, t + 2.6);
    var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.42 * s, t + 0.07);
    g.gain.exponentialRampToValueAtTime(0.14 * s, t + 0.55);
    g.gain.linearRampToValueAtTime(0.22 * s, t + 1.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
    src.connect(lp); lp.connect(g); g.connect(haupt); g.connect(hall);
    start(src, t, t + 4);
  };

  // Hintergrund/Sperre: Klangmaschine anhalten (als "Wiedergabe" liefe sie sonst weiter), danach wieder an
  document.addEventListener("visibilitychange", function () {
    if (!ctx) return;
    try {
      var p = null;
      if (document.hidden) { if (ctx.state === "running" && ctx.suspend) p = ctx.suspend(); }
      else if (ctx.resume) p = ctx.resume();            // immer: ein laufendes suspend() meldet noch "running"
      if (p && p["catch"]) p["catch"](function () {});
    } catch (e) {}
  }, false);

  function t0() { return ctx.currentTime + 0.02; }
  function start(node, t, ende) { if (node.start) node.start(t); else node.noteOn(t); if (ende) { if (node.stop) node.stop(ende); else node.noteOff(ende); } }

  function rausch(t, dauer, filterTyp, freq, q, laut, mitHall) {
    var src = ctx.createBufferSource(); src.buffer = rauschen; src.loop = true;
    var f = ctx.createBiquadFilter(); f.type = filterTyp || "bandpass"; f.frequency.value = freq || 1000; f.Q.value = q || 1;
    var g = ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(haupt); if (mitHall) g.connect(hall);
    start(src, t, t + dauer + 0.1);
    return { g: g, f: f, laut: laut || 0.5 };
  }
  function ton(t, freq, dauer, typ, laut, mitHall, ziel) {
    var o = ctx.createOscillator(); o.type = typ || "sine"; o.frequency.setValueAtTime(freq, t);
    var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    o.connect(g); g.connect(ziel || haupt); if (mitHall) g.connect(hall);
    start(o, t, t + dauer + 0.2);
    return { o: o, g: g };
  }
  function huelle(g, t, a, halten, r, laut) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(laut, t + a);
    g.gain.setValueAtTime(laut, t + a + halten);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + halten + r);
  }
  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  // ── Geräusche ──
  K.blaettern = function () {
    if (!ctx || !an()) return;
    var t = t0(), r = rausch(t, 0.5, "bandpass", 900, 0.9);
    r.f.frequency.setValueAtTime(700, t); r.f.frequency.exponentialRampToValueAtTime(3800, t + 0.32);
    huelle(r.g, t, 0.05, 0.12, 0.25, 0.35);
  };

  K.brutzeln = function (dauer) {
    if (!ctx || !an()) return;
    dauer = dauer || 2.6;
    var t = t0(), r = rausch(t, dauer, "highpass", 2600, 0.7);
    r.g.gain.setValueAtTime(0.0001, t);
    r.g.gain.exponentialRampToValueAtTime(0.09, t + 0.3);
    // Knistern: viele kleine Spitzen
    for (var i = 0; i < dauer * 38; i++) {
      var z = t + 0.3 + Math.random() * (dauer - 0.6);
      r.g.gain.setValueAtTime(0.09, z);
      r.g.gain.linearRampToValueAtTime(0.09 + Math.random() * 0.22, z + 0.004);
      r.g.gain.linearRampToValueAtTime(0.09, z + 0.02);
    }
    r.g.gain.setValueAtTime(0.09, t + dauer - 0.3);
    r.g.gain.exponentialRampToValueAtTime(0.0001, t + dauer);
  };

  K.puff = function () {
    if (!ctx || !an()) return;
    var t = t0(), r = rausch(t, 1.2, "lowpass", 900, 0.5, 0, true);
    r.f.frequency.setValueAtTime(2400, t); r.f.frequency.exponentialRampToValueAtTime(300, t + 1);
    huelle(r.g, t, 0.01, 0.05, 1.0, 0.9);
    var b = ton(t, 110, 0.4, "sine"); b.o.frequency.exponentialRampToValueAtTime(45, t + 0.35); huelle(b.g, t, 0.005, 0.02, 0.35, 0.7);
  };

  K.hopp = function () {
    if (!ctx || !an()) return;
    var t = t0(), a = ton(t, 260, 0.35, "triangle");
    a.o.frequency.exponentialRampToValueAtTime(980, t + 0.22);
    huelle(a.g, t, 0.01, 0.08, 0.2, 0.35);
    var r = rausch(t, 0.4, "bandpass", 1500, 1.2);
    r.f.frequency.exponentialRampToValueAtTime(4000, t + 0.25); huelle(r.g, t, 0.02, 0.05, 0.2, 0.18);
  };

  K.plopp = function () {
    if (!ctx || !an()) return;
    var t = t0(), a = ton(t, 520, 0.2, "sine");
    a.o.frequency.exponentialRampToValueAtTime(140, t + 0.12);
    huelle(a.g, t, 0.003, 0.02, 0.14, 0.6);
  };

  K.tusch = function () {
    if (!ctx || !an()) return;
    var t = t0(), akk = [60, 64, 67, 72];
    [0, 0.16, 0.32].forEach(function (d, k) {
      akk.forEach(function (n) {
        var x = ton(t + d, midi(n), 0.6, "sawtooth", 0, true);
        huelle(x.g, t + d, 0.01, k === 2 ? 0.55 : 0.07, k === 2 ? 0.7 : 0.08, 0.05);
      });
    });
  };

  K.knarzen = function () {
    if (!ctx || !an()) return;
    var t = t0(), o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(70, t);
    o.frequency.linearRampToValueAtTime(115, t + 0.5); o.frequency.linearRampToValueAtTime(80, t + 0.9);
    var f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 850; f.Q.value = 6;
    var g = ctx.createGain(); g.gain.value = 0;
    o.connect(f); f.connect(g); g.connect(haupt); g.connect(hall);
    for (var i = 0; i < 26; i++) {
      var z = t + i * 0.035 + Math.random() * 0.01;
      g.gain.setValueAtTime(0.0, z); g.gain.linearRampToValueAtTime(0.25 + Math.random() * 0.2, z + 0.006); g.gain.linearRampToValueAtTime(0, z + 0.03);
    }
    start(o, t, t + 1.1);
  };

  K.schlurfen = function () {
    if (!ctx || !an()) return;
    var t = t0();
    for (var i = 0; i < 3; i++) {
      var r = rausch(t + i * 0.55, 0.5, "lowpass", 1100, 0.6);
      huelle(r.g, t + i * 0.55, 0.08, 0.12, 0.2, 0.25);
    }
  };

  K.vogel = function () {
    if (!ctx || !an()) return;
    var t = t0();
    for (var i = 0; i < 6; i++) {
      var z = t + i * 0.16 + (i > 2 ? 0.25 : 0), a = ton(z, 2600, 0.12, "sine", 0, true);
      a.o.frequency.setValueAtTime(2400 + Math.random() * 400, z);
      a.o.frequency.exponentialRampToValueAtTime(4200 + Math.random() * 600, z + 0.07);
      a.o.frequency.exponentialRampToValueAtTime(3000, z + 0.11);
      huelle(a.g, z, 0.01, 0.04, 0.06, 0.12);
    }
  };

  K.gackern = function () {
    if (!ctx || !an()) return;
    var t = t0();
    [0, 0.2, 0.36, 0.6].forEach(function (d, i) {
      var a = ton(t + d, 520, 0.18, "sawtooth");
      a.o.frequency.setValueAtTime(i === 3 ? 700 : 520, t + d);
      a.o.frequency.exponentialRampToValueAtTime(i === 3 ? 380 : 440, t + d + (i === 3 ? 0.3 : 0.1));
      var f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1400; f.Q.value = 3;
      a.o.disconnect(); a.o.connect(f); f.connect(a.g);
      huelle(a.g, t + d, 0.01, i === 3 ? 0.2 : 0.05, 0.08, 0.3);
    });
  };

  // Hahnenschrei, synthetisch: "Ki – ke – ri – kiiiii"
  K.kikeriki = function () {
    if (!ctx || !an()) return;
    var t = t0();
    var silben = [[0.13, 640, 760], [0.12, 700, 820], [0.14, 820, 900], [0.75, 980, 620]];
    var z = t;
    silben.forEach(function (s, i) {
      var o = ctx.createOscillator(); o.type = "sawtooth";
      o.frequency.setValueAtTime(s[1], z); o.frequency.linearRampToValueAtTime(s[2], z + s[0]);
      var vib = ctx.createOscillator(); vib.frequency.value = 28; var vg = ctx.createGain(); vg.gain.value = 18;
      vib.connect(vg); vg.connect(o.frequency);
      var f1 = ctx.createBiquadFilter(); f1.type = "bandpass"; f1.frequency.value = 1300; f1.Q.value = 4;
      var f2 = ctx.createBiquadFilter(); f2.type = "bandpass"; f2.frequency.value = 2900; f2.Q.value = 6;
      var g = ctx.createGain(); g.gain.value = 0;
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(haupt); g.connect(hall);
      huelle(g, z, 0.02, s[0] * 0.7, s[0] * 0.3 + 0.05, i === 3 ? 0.5 : 0.4);
      start(o, z, z + s[0] + 0.2); start(vib, z, z + s[0] + 0.2);
      z += s[0] + 0.05;
    });
  };

  // Orgelpfeife: Summe von Obertönen (wie Register)
  // ── Orgel: alle Orgeltöne laufen über einen eigenen Kanal, der beim Umblättern in 0,3 s ausblendet –
  //    so überlappen sich Orgelstücke nie, auch wenn schnell geblättert wird.
  var orgelKanal = null, kirchenhall = null;
  function orgelBus() {
    if (orgelKanal) return orgelKanal;
    orgelKanal = ctx.createGain(); orgelKanal.gain.value = 1;
    // eigener, längerer Kirchenhall (3,4 s), etwas dunkler als der normale Raum
    if (!kirchenhall) {
      kirchenhall = ctx.createConvolver();
      var len = Math.round(ctx.sampleRate * 3.4), imp = ctx.createBuffer(2, len, ctx.sampleRate);
      for (var k = 0; k < 2; k++) {
        var d = imp.getChannelData(k), tief = 0;
        for (var i = 0; i < len; i++) { tief = tief * 0.6 + (Math.random() * 2 - 1) * 0.4; d[i] = tief * Math.pow(1 - i / len, 2.2); }
      }
      kirchenhall.buffer = imp;
      var hg = ctx.createGain(); hg.gain.value = 0.55; kirchenhall.connect(hg); hg.connect(haupt);
    }
    orgelKanal.connect(haupt); orgelKanal.connect(kirchenhall);
    return orgelKanal;
  }
  // alle laufenden Orgel-/Tastentöne weich beenden
  K.orgelStille = function (dauer) {
    if (!ctx || !orgelKanal) return;
    var alt = orgelKanal, t = ctx.currentTime, d = dauer || 0.3;
    orgelKanal = null;
    alt.gain.cancelScheduledValues(t); alt.gain.setValueAtTime(alt.gain.value, t); alt.gain.linearRampToValueAtTime(0.0001, t + d);
    setTimeout(function () { try { alt.disconnect(); } catch (e) {} }, (d + 0.2) * 1000);
  };
  // Pfeifen-Register (Fußlagen 8', 4', 2 2/3', 2', 1 3/5', 1') mit leichter Schwebung,
  // kurzem "Anblasen" (Chiff) und zartem Tremulanten
  function orgelton(t, n, dauer, laut) {
    var bus = orgelBus(), f = midi(n), L = laut || 0.07;
    var teile = [[1, 1, 0], [2, 0.6, 1.5], [3, 0.28, -1], [4, 0.3, 0.8], [5, 0.1, 0], [8, 0.12, -0.6]];
    var trem = ctx.createOscillator(), tg = ctx.createGain();
    trem.frequency.value = 5.2; tg.gain.value = L * 0.06; trem.connect(tg);
    var summe = ctx.createGain(); summe.gain.value = 1; summe.connect(bus);
    tg.connect(summe.gain);
    start(trem, t, t + dauer + 0.5);
    teile.forEach(function (p) {
      var o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(f * p[0], t); o.detune.value = p[2] * 2;
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      o.connect(g); g.connect(summe);
      huelle(g, t, 0.035, Math.max(0.01, dauer - 0.04), 0.35, L * p[1]);
      start(o, t, t + dauer + 0.5);
    });
    // Anblasgeräusch der Pfeife
    var r = ctx.createBufferSource(); r.buffer = rauschen;
    var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = Math.min(9000, f * 4); bp.Q.value = 2;
    var rg = ctx.createGain(); rg.gain.setValueAtTime(0.0001, t);
    r.connect(bp); bp.connect(rg); rg.connect(bus);
    rg.gain.exponentialRampToValueAtTime(L * 0.25, t + 0.015); rg.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    start(r, t, t + 0.12);
  }
  K.orgel = function () {
    if (!ctx || !an()) return;
    K.orgelStille(0.15);
    var t = t0();
    // Bach, Toccata d-Moll BWV 565 – Anfang (gemeinfrei)
    function phrase(start, okt) {
      var z = start, o = okt * 12;
      [[81, 0.09], [79, 0.09], [81, 0.9]].forEach(function (p) { orgelton(z, p[0] + o, p[1], 0.06); orgelton(z, p[0] + o - 12, p[1], 0.06); z += p[1]; });
      z += 0.25;
      [[79, 0.1], [77, 0.1], [76, 0.1], [74, 0.1], [73, 0.55], [74, 1.1]].forEach(function (p) { orgelton(z, p[0] + o, p[1], 0.06); orgelton(z, p[0] + o - 12, p[1], 0.06); z += p[1]; });
      return z + 0.35;
    }
    var z = phrase(t, 0);
    z = phrase(z, -1);
    // tiefer Orgelpunkt + Akkord
    orgelton(z, 38, 3.2, 0.09); orgelton(z, 50, 3.2, 0.06);
    [61, 64, 67, 70].forEach(function (n, i) { orgelton(z + i * 0.12, n, 1.5 - i * 0.12, 0.045); });
    [62, 65, 69, 74].forEach(function (n) { orgelton(z + 1.6, n, 1.6, 0.05); });
  };

  // Die Katze spaziert über die Tasten
  K.katzenorgel = function () {
    if (!ctx || !an()) return;
    K.orgelStille(0.15);
    var t = t0(), n = 48, z = t;
    for (var i = 0; i < 14; i++) { n += [1, 2, 3, 1, 4][i % 5]; orgelton(z, n, 0.2, 0.05); z += 0.2 + Math.random() * 0.08; }
    z += 0.3;
    for (var j = 0; j < 8; j++) { n -= [2, 3, 1, 4][j % 4]; orgelton(z, n, 0.17, 0.05); z += 0.18; }
    orgelton(z + 0.1, n - 12, 0.9, 0.06);
  };

  // Spieluhr – über einen eigenen Kanal, damit sie beim Verlassen/Neustarten verstummen kann (K.spieluhrStille)
  var spieluhrKanaele = [];
  K.spieluhr = function (melodie, tempo) {
    if (!ctx || !an()) return 0;
    var t = t0(), s = tempo || 0.42;
    var z = t;
    var kanal = ctx.createGain(); kanal.gain.value = 1; kanal.connect(haupt);
    var hallAnteil = ctx.createGain(); hallAnteil.gain.value = 0.6; kanal.connect(hallAnteil); hallAnteil.connect(hall);
    spieluhrKanaele.push(kanal);
    setTimeout(function () {                             // nach dem Stück den Kanal wieder abbauen
      var i = spieluhrKanaele.indexOf(kanal);
      if (i >= 0) { spieluhrKanaele.splice(i, 1); try { kanal.disconnect(); } catch (e) {} }
    }, (melodie.reduce(function (a, p) { return a + p[1]; }, 0) * s + 3) * 1000);
    melodie.forEach(function (p) {
      if (p[0] > 0) {
        var f = midi(p[0]);
        var a = ton(z, f, 1.6, "sine", 0, false, kanal); huelle(a.g, z, 0.004, 0.02, 1.4, 0.22);
        var b = ton(z, f * 4.02, 0.4, "sine", 0, false, kanal); huelle(b.g, z, 0.002, 0.01, 0.35, 0.05);
        var c2 = ton(z, f * 2, 0.8, "triangle", 0, false, kanal); huelle(c2.g, z, 0.003, 0.01, 0.7, 0.05);
      }
      z += p[1] * s;
    });
    return (z - t) * 1000;
  };
  K.spieluhrStille = function (dauer) {
    if (!ctx) return;
    var t = ctx.currentTime, d = dauer || 0.3;
    spieluhrKanaele.forEach(function (k) {
      k.gain.cancelScheduledValues(t); k.gain.setValueAtTime(k.gain.value, t); k.gain.linearRampToValueAtTime(0.0001, t + d);
      setTimeout(function () { try { k.disconnect(); } catch (e) {} }, d * 1000 + 100);
    });
    spieluhrKanaele = [];
  };
  // "Zum Geburtstag viel Glück" (Melodie gemeinfrei), [Midi-Note, Schläge]
  K.GEBURTSTAG = [[67, 0.75], [67, 0.25], [69, 1], [67, 1], [72, 1], [71, 2],
                  [67, 0.75], [67, 0.25], [69, 1], [67, 1], [74, 1], [72, 2],
                  [67, 0.75], [67, 0.25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2],
                  [77, 0.75], [77, 0.25], [76, 1], [72, 1], [74, 1], [72, 3]];

  K.pusten = function () {
    if (!ctx || !an()) return;
    var t = t0(), r = rausch(t, 0.9, "bandpass", 700, 0.6);
    r.f.frequency.exponentialRampToValueAtTime(2200, t + 0.6); huelle(r.g, t, 0.05, 0.2, 0.5, 0.4);
  };

  K.stempel = function () {
    if (!ctx || !an()) return;
    var t = t0(), a = ton(t, 90, 0.3, "sine"); huelle(a.g, t, 0.002, 0.02, 0.25, 0.9);
    var r = rausch(t, 0.2, "lowpass", 1800, 0.5); huelle(r.g, t, 0.002, 0.01, 0.12, 0.5);
  };

  K.tippen = function () {
    if (!ctx || !an()) return;
    var t = t0(), r = rausch(t, 0.05, "highpass", 3000, 0.8); huelle(r.g, t, 0.001, 0.005, 0.03, 0.25);
  };

  K.wasser = function () {
    if (!ctx || !an()) return;
    var t = t0();
    for (var i = 0; i < 14; i++) {
      var z = t + Math.random() * 2.2, a = ton(z, 600 + Math.random() * 900, 0.1, "sine", 0, true);
      a.o.frequency.exponentialRampToValueAtTime(1500 + Math.random() * 1000, z + 0.06);
      huelle(a.g, z, 0.005, 0.01, 0.07, 0.05);
    }
    var r = rausch(t, 2.5, "lowpass", 700, 0.3); huelle(r.g, t, 0.3, 1.6, 0.5, 0.06);
  };

  // Milch zischt in den Eimer: "zsch – zsch – zsch"
  K.spritzen = function () {
    if (!ctx || !an()) return;
    var t = t0();
    for (var i = 0; i < 6; i++) {
      var z = t + i * 0.32 + Math.random() * 0.05, r = rausch(z, 0.25, "bandpass", 3200 + Math.random() * 800, 1.4);
      r.f.frequency.exponentialRampToValueAtTime(1800, z + 0.18); huelle(r.g, z, 0.01, 0.06, 0.12, 0.22);
    }
  };

  K.mampf = function () {
    if (!ctx || !an()) return;
    var t = t0();
    for (var i = 0; i < 3; i++) { var r = rausch(t + i * 0.28, 0.15, "bandpass", 500, 1.5); huelle(r.g, t + i * 0.28, 0.01, 0.05, 0.08, 0.3); }
  };

  // ein einzelner Orgel-/Keyboardton (z. B. die Pfote der Katze auf einer Taste); n = MIDI-Nummer
  K.taste = function (n, dauer, laut) {
    if (!ctx || !an()) return;
    orgelton(t0(), n, dauer || 0.35, laut || 0.045);
  };
  K.abspielen = function (name) { if (K[name] && typeof K[name] === "function") K[name](); };

  // Eingebaute Computerstimme (Vorlese-Notlösung)
  K.sprechen = function (text, fertig) {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) { if (fertig) fertig(); return; }
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE"; u.rate = 0.88; u.pitch = 1.0;
    var stimmen = window.speechSynthesis.getVoices() || [];
    for (var i = 0; i < stimmen.length; i++) if (/^de/i.test(stimmen[i].lang)) { u.voice = stimmen[i]; break; }
    u.onend = function () { if (fertig) fertig(); };
    window.speechSynthesis.speak(u);
  };
  K.stumm = function () { if (window.speechSynthesis) window.speechSynthesis.cancel(); };
})();
