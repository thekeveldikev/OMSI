/* Klangkulisse: echte Geräusche je Doppelseite (Plan: daten/klang.js).
   – Hintergründe laufen in Schleife (nahtlos: die Enden der Dateien überlappen sich)
     und blenden beim Umblättern in 2,5 s weich ineinander über.
   – Einzelgeräusche kommen passend zum Bild, manche kehren von Zeit zu Zeit wieder.
   – Beim Vorlesen wird alles leiser, beim Zuklappen des Buchs klingt es sanft aus.
   Nutzt das AudioContext von klang.js (das auf dem iPad erst nach dem ersten Tippen startet). */
(function () {
  var P = window.KLANGPLAN || null;
  var KU = window.KULISSE = {};
  var UEBERBLENDUNG = 2.5, NAHT = 1.5, LEISE_BEIM_VORLESEN = 0.32;
  var ctx = null, summe = null;
  var puffer = {}, laden = {};          // name → AudioBuffer (false = fehlt)
  var schichten = {};                   // laufende Hintergründe: name → { g, quellen, naechster, puffer, aus }
  var klaenge = [];                     // laufende Einzelgeräusche (zum Ausblenden)
  var timer = [], pumpe = null;
  var buchOffen = null, seitenPlan = null, leiser = false;
  var raumOffen = null, kueche = null;  // Räume außerhalb der Bücher (Startbild, Küche, Rezept …): Plan in KLANGPLAN.raeume

  function eingeschaltet() { return !!P && B.E.toene !== false && B.erinnern("kulisse", true) !== false; }

  function bereit() {
    if (ctx) return true;
    ctx = KLANG.kontext ? KLANG.kontext() : null;
    if (!ctx) return false;
    summe = ctx.createGain(); summe.gain.value = leiser ? LEISE_BEIM_VORLESEN : 1; summe.connect(ctx.destination);
    pumpe = setInterval(function () { for (var n in schichten) nachlegen(schichten[n]); }, 700);
    return true;
  }
  function jetzt() { return ctx.currentTime; }
  function starte(q, t) { if (q.start) q.start(t); else q.noteOn(t); }
  function halte(q, t) { try { if (q.stop) q.stop(t); else q.noteOff(t); } catch (e) {} }
  function rampe(param, ziel, dauer) {
    var t = jetzt();
    param.cancelScheduledValues(t);
    param.setValueAtTime(Math.max(0.0001, param.value), t);
    param.linearRampToValueAtTime(Math.max(0.0001, ziel), t + dauer);
  }

  // Datei laden und entpacken (einmal je Name)
  var fehltWarten = {};
  function holen(name, fertig, fehlt) {
    if (puffer[name]) { if (fertig) fertig(puffer[name]); return; }
    if (puffer[name] === false) { if (fehlt) fehlt(); return; }
    if (fehlt) (fehltWarten[name] = fehltWarten[name] || []).push(fehlt);
    if (laden[name]) { if (fertig) laden[name].push(fertig); return; }
    laden[name] = fertig ? [fertig] : [];
    function fehl() {
      puffer[name] = false; delete laden[name];
      var w = fehltWarten[name] || []; delete fehltWarten[name];
      w.forEach(function (f) { f(); });
    }
    var x = new XMLHttpRequest();
    x.open("GET", P.ordner + name + P.endung, true);
    x.responseType = "arraybuffer";
    x.onload = function () {
      if (x.status && x.status !== 200) { fehl(); return; }
      try {
        var p = ctx.decodeAudioData(x.response, function (b) {
          puffer[name] = b; delete fehltWarten[name];
          var w = laden[name] || []; delete laden[name];
          w.forEach(function (f) { f(b); });
        }, fehl);
        if (p && p["catch"]) p["catch"](function () {});
      } catch (e) { fehl(); }
    };
    x.onerror = fehl;
    x.send();
  }

  // ── Hintergründe ──
  function nachlegen(s) {
    if (!s.puffer || s.aus) return;
    var schritt = Math.max(4, s.puffer.duration - NAHT);
    while (s.naechster < jetzt() + 2.5) {
      var q = ctx.createBufferSource();
      q.buffer = s.puffer; q.connect(s.g);
      starte(q, s.naechster);
      s.quellen.push({ q: q, ende: s.naechster + s.puffer.duration });
      s.naechster += schritt;
    }
    s.quellen = s.quellen.filter(function (e) { return e.ende > jetzt(); });
  }
  function schichtAn(name, laut, einsatz) {
    var s = schichten[name];
    if (s) { s.laut = laut; if (s.puffer) rampe(s.g.gain, laut, UEBERBLENDUNG); return; }
    s = schichten[name] = { name: name, g: ctx.createGain(), quellen: [], naechster: 0, puffer: null, aus: false, laut: laut };
    s.g.gain.value = 0.0001; s.g.connect(summe);
    holen(name, function (b) {
      if (s.aus) return;
      s.puffer = b;
      var t = jetzt() + 0.05 + (einsatz || 0);
      s.naechster = t;
      s.g.gain.cancelScheduledValues(jetzt());
      s.g.gain.setValueAtTime(0.0001, t);
      s.g.gain.linearRampToValueAtTime(s.laut, t + UEBERBLENDUNG);
      nachlegen(s);
    });
  }
  function schichtAus(name, dauer) {
    var s = schichten[name];
    if (!s) return;
    delete schichten[name];
    s.aus = true;
    var ende = jetzt() + dauer;
    rampe(s.g.gain, 0.0001, dauer);
    s.quellen.forEach(function (e) { halte(e.q, ende + 0.1); });
    setTimeout(function () { try { s.g.disconnect(); } catch (e) {} }, (dauer + 0.3) * 1000);
  }

  // ── Einzelgeräusche ──
  function einzel(name, laut, ersatz, direkt) {
    holen(name, function (b) {
      if (!(buchOffen || raumOffen) || !eingeschaltet()) return;
      var q = ctx.createBufferSource(), g = ctx.createGain();
      q.buffer = b; g.gain.value = laut; q.connect(g); g.connect(direkt ? ctx.destination : summe);
      starte(q, jetzt() + 0.02);
      var k = { q: q, g: g, ende: jetzt() + b.duration + 0.1 };
      klaenge.push(k);
      klaenge = klaenge.filter(function (e) { return e.ende > jetzt(); });
    }, ersatz);
  }
  function einzelAus(dauer) {
    klaenge.forEach(function (k) { if (k.ende > jetzt()) { rampe(k.g.gain, 0.0001, dauer); halte(k.q, jetzt() + dauer + 0.05); } });
    klaenge = [];
  }
  // nur ein Stück einer Aufnahme (z. B. ein einzelnes Zwitschern), weich ein- und ausgeblendet
  function schnipsel(name, laut, ab, dauer) {
    if (!(buchOffen || raumOffen) || !eingeschaltet() || !bereit()) return;
    holen(name, function (b) {
      if (!(buchOffen || raumOffen) || !eingeschaltet()) return;
      var q = ctx.createBufferSource(), g = ctx.createGain(), t = jetzt() + 0.02, d = Math.min(dauer, b.duration - ab);
      q.buffer = b; q.connect(g); g.connect(summe);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(laut, t + 0.02);
      g.gain.setValueAtTime(laut, t + Math.max(0.03, d - 0.08)); g.gain.linearRampToValueAtTime(0.0001, t + d);
      if (q.start) q.start(t, ab, d + 0.02); else q.noteGrainOn(t, ab, d + 0.02);
      klaenge.push({ q: q, g: g, ende: t + d + 0.1 });
    });
  }
  // kleine gebaute Geräusche: Flügelschlag (gefiltertes Rauschen in schnellen Stößen) und leises Aufsetzen
  var rauschPuffer = null;
  function rauschen() {
    if (rauschPuffer) return rauschPuffer;
    var n = Math.round(ctx.sampleRate * 0.6), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return (rauschPuffer = b);
  }
  function stoesse(zahl, abstand, dauer, freq, q, laut) {
    if (!(buchOffen || raumOffen) || !eingeschaltet() || !bereit()) return;
    var t = jetzt() + 0.02, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = rauschen(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
    src.connect(f); f.connect(g); g.connect(summe);
    g.gain.setValueAtTime(0.0001, t);
    for (var i = 0; i < zahl; i++) {
      var a = t + i * abstand * B.zufall(0.9, 1.1), l = laut * (1 - i * 0.12);
      g.gain.linearRampToValueAtTime(l, a + dauer * 0.3);
      g.gain.linearRampToValueAtTime(0.0001, a + dauer);
    }
    if (src.start) src.start(t, B.zufall(0, 0.2), zahl * abstand + dauer + 0.05); else src.noteOn(t);
  }
  function flattern(laut) { stoesse(4, 0.058, 0.045, B.zufall(1500, 2100), 0.9, laut); }
  function tapsen(laut) { stoesse(1, 0.02, 0.03, B.zufall(2600, 3400), 2.5, laut); }

  function spaeter(f, s) { timer.push(setTimeout(f, s * 1000)); }
  function timerWeg() { timer.forEach(clearTimeout); timer = []; }

  function planFuer(typ, schluessel) { return P && P[typ] ? P[typ][schluessel] || null : null; }

  function abspielen(plan) {
    timerWeg();
    einzelAus(0.8);
    var soll = {};
    (plan && plan.hg || []).forEach(function (h) { soll[h[0]] = true; schichtAn(h[0], h[1], h[2] || 0); });
    for (var n in schichten) if (!soll[n]) schichtAus(n, UEBERBLENDUNG);
    (plan && plan.ev || []).forEach(function (e) { spaeter(function () { einzel(e[0], e[2] == null ? 0.8 : e[2]); }, e[1]); });
    (plan && plan.oft || []).forEach(function (o) {
      (function wieder(erstesMal) {
        spaeter(function () { einzel(o[0], o[3] == null ? 0.5 : o[3]); wieder(false); }, B.zufall(o[1], o[2]) + (erstesMal ? 2 : 0));
      })(true);
    });
  }

  // Nur behalten, was gerade läuft oder gleich gebraucht wird (Speicher auf älteren iPads)
  function aufraeumen(behalten) {
    for (var n in puffer) if (puffer[n] && /^(f_)?amb_/.test(n) && !behalten[n] && !schichten[n]) delete puffer[n];
  }

  // ───────────── Schnittstelle für buch.js ─────────────
  KU.buchAuf = function (typ) {
    buchOffen = typ;
    if (eingeschaltet() && bereit() && P.blaettern) holen(P.blaettern);
  };

  // Doppelseite betreten. Liefert true, wenn die eingebauten Computer-Töne entfallen sollen.
  KU.seite = function (typ, schluessel, nachbarn) {
    var plan = planFuer(typ, schluessel);
    seitenPlan = { typ: typ, schluessel: schluessel, nachbarn: nachbarn || [] };
    if (P && !eingeschaltet()) return true;             // "Geräusche aus": auch die eingebauten Töne schweigen
    if (!bereit()) return false;
    abspielen(plan);
    // Hintergründe der Nachbarseiten schon mal laden, Rest freigeben
    var behalten = {};
    [schluessel].concat(nachbarn || []).forEach(function (k) {
      var p = planFuer(typ, k);
      (p && p.hg || []).forEach(function (h) { behalten[h[0]] = true; });
    });
    aufraeumen(behalten);
    spaeter(function () { for (var n in behalten) holen(n); }, 3);
    return !!(plan && plan.ohneTon);
  };

  KU.buchZu = function () {
    buchOffen = null; seitenPlan = null;
    if (!ctx) return;
    timerWeg();
    einzelAus(1.0);
    for (var n in schichten) schichtAus(n, 1.4);
    KU.leiser(false);
  };

  // Während Kevin vorliest: Geräusche zurücknehmen
  KU.leiser = function (ja) {
    leiser = !!ja;
    if (summe) rampe(summe.gain, leiser ? LEISE_BEIM_VORLESEN : 1, leiser ? 0.5 : 1.6);
  };

  // Echtes Umblättern; false → buch.js nimmt das eingebaute
  KU.blaettern = function () {
    if (P && !eingeschaltet()) return true;             // Geräusche aus → auch kein eingebautes Blättern
    if (!ctx || !P.blaettern || !puffer[P.blaettern]) return false;
    var q = ctx.createBufferSource(), g = ctx.createGain();
    q.buffer = puffer[P.blaettern]; g.gain.value = 0.75; q.connect(g); g.connect(ctx.destination);
    starte(q, jetzt() + 0.01);
    return true;
  };

  // Nach dem ersten Tippen (iPad) nachholen, was noch nicht klingen durfte
  KU.wecken = function () {
    if (raumOffen && !buchOffen && !ctx && eingeschaltet()) { if (bereit()) abspielen(raumPlan(raumOffen)); return; }
    if (!buchOffen || !seitenPlan || ctx || !eingeschaltet()) return;
    if (!bereit()) return;
    if (P.blaettern) holen(P.blaettern);
    abspielen(planFuer(seitenPlan.typ, seitenPlan.schluessel));
  };

  // Ein Einzelgeräusch genau jetzt (z. B. der Hahn kräht, wenn er den Kopf zurücklegt)
  // ersatz: wird aufgerufen, wenn es die Datei nicht gibt (dann klingt z. B. das eingebaute Geräusch)
  // direkt: am Vorlese-Dämpfer vorbei (Geräuschwörter wie PUFF! gehören zur Geschichte und bleiben laut)
  KU.spiele = function (name, laut, ersatz, direkt) {
    if (P && !eingeschaltet()) return true;             // Geräusche aus: still – nicht den Ersatzklang nehmen
    if (!(buchOffen || raumOffen) || !bereit()) { if (ersatz) ersatz(); return false; }
    einzel(name, laut == null ? 0.8 : laut, ersatz, direkt);
    return true;
  };

  // Zum Nachsehen beim Basteln: was läuft gerade?
  KU.zustand = function () {
    var h = [];
    for (var n in schichten) h.push({ name: n, laut: +schichten[n].g.gain.value.toFixed(3), quellen: schichten[n].quellen.length, geladen: !!schichten[n].puffer });
    return { hintergruende: h, einzel: klaenge.length, gesamt: summe ? +summe.gain.value.toFixed(3) : null, zeit: ctx ? +jetzt().toFixed(2) : null };
  };

  KU.istAn = function () { return eingeschaltet(); };
  KU.umschalten = function () {
    var an = !(B.erinnern("kulisse", true) !== false);
    B.merken("kulisse", an);
    if (!an) { timerWeg(); einzelAus(0.6); for (var n in schichten) schichtAus(n, 0.8); }
    else if (buchOffen && seitenPlan && bereit()) abspielen(planFuer(seitenPlan.typ, seitenPlan.schluessel));
    else if (raumOffen && bereit()) abspielen(raumPlan(raumOffen));
    return an;
  };

  // ───────────── Räume außerhalb der Bücher ─────────────
  // Unter der Musik: leise Raumklänge (Pläne in KLANGPLAN.raeume); in der Küche zusätzlich
  // Geräusche genau zu den Animationen (Vogel hüpft, Pfannkuchen hüpft in der Pfanne).
  function raumPlan(name) {
    if (!P || !P.raeume) return null;
    if (name === "kueche" && P.raeume.kuecheNacht && window.KUECHE_LEBEN && KUECHE_LEBEN.tageszeit() === "nacht") return P.raeume.kuecheNacht;
    return P.raeume[name] || null;
  }
  KU.raum = function (name, wurzel) {
    kuecheLos();
    var plan = raumPlan(name);
    raumOffen = plan ? name : null;
    if (!plan) {                                     // Bücher, Torte, Theater, Radio: Raumklang sanft weg
      if (!buchOffen && ctx) { timerWeg(); einzelAus(1.0); for (var n in schichten) schichtAus(n, 1.8); }
      return;
    }
    if (name === "kueche" && wurzel) kuecheVerbinden(wurzel);
    if (!eingeschaltet() || !bereit()) return;        // iPad: kommt mit dem ersten Tippen (KU.wecken)
    abspielen(plan);
  };
  KU.schnipsel = function (name, laut, ab, dauer) { if (bereit()) schnipsel(name, laut, ab, dauer); };

  var protokoll = [];                                // für Tests: was in der Küche zuletzt erklang
  function merke(was) { protokoll.push(Math.round(Date.now() / 100) / 10 + " " + was); if (protokoll.length > 30) protokoll.shift(); }
  KU.protokoll = function () { return protokoll.slice(); };
  function kuecheLos() {
    if (!kueche) return;
    if (kueche.beob) kueche.beob.disconnect();
    kueche.weg.forEach(function (f) { f(); });
    kueche.timer.forEach(clearTimeout);
    kueche = null;
  }
  function kuecheVerbinden(wurzel) {
    var K = kueche = { timer: [], weg: [], sprung: 0, letztesLied: -99 };
    var seite = wurzel.querySelector(".mk-seite") || wurzel;
    function ruhig() { return kueche !== K || document.hidden || /\bmk-ruhig\b/.test(seite.className); }
    function spaeter(fn, ms) {                      // Timer merken, nach Ablauf wieder aus der Liste nehmen
      var id = setTimeout(function () { var j = K.timer.indexOf(id); if (j >= 0) K.timer.splice(j, 1); fn(); }, ms);
      K.timer.push(id);
    }
    function vogelSchlaeft() { return !!(window.KUECHE_LEBEN && KUECHE_LEBEN.vogelWeg && KUECHE_LEBEN.vogelWeg()); }   // Nacht/Regen/Gewitter: Rotkehlchen weg
    // Der Vogel: Flügelschlag beim Absprung, leises Tapsen beim Landen, manchmal ein Zwitschern
    var vogel = wurzel.querySelector(".mk-vogel");
    if (vogel && window.MutationObserver) {
      var alt = vogel.getAttribute("data-frame") || "0";
      K.beob = new MutationObserver(function () {
        var neu = vogel.getAttribute("data-frame");
        if (neu === alt) return;
        if (!ruhig() && !vogelSchlaeft()) {
          if (neu === "2") {
            K.sprung++;
            flattern(B.zufall(0.1, 0.14)); merke("Vogel springt");
            var t = Date.now() / 1000;
            if (t - K.letztesLied > 7 && Math.random() < 0.4) {       // kurzes "Tschilp" (Rotkehlchen)
              K.letztesLied = t;
              merke("Vogel tschilpt");
              if (Math.random() < 0.5) schnipsel("f_ev_rotkehlchen", 0.32, 0, 0.2); else schnipsel("f_ev_rotkehlchen", 0.3, 0.285, 0.28);
            }
          } else if (neu === "0" && alt === "3") { tapsen(0.07); merke("Vogel landet"); }
        }
        alt = neu;
      });
      K.beob.observe(vogel, { attributes: true, attributeFilter: ["data-frame"] });
    }
    // ab und zu singt er richtig (die lange Strophe), wenn er gerade still sitzt
    (function singen() {
      spaeter(function () {
        if (kueche !== K) return;
        if (!ruhig() && !vogelSchlaeft() && vogel && vogel.getAttribute("data-frame") === "0") { schnipsel("f_ev_rotkehlchen", 0.26, 0.634, 1.7); K.letztesLied = Date.now() / 1000; merke("Vogel singt"); }
        singen();
      }, B.zufall(18, 32) * 1000);
    })();
    // Der Pfannkuchen hüpft alle 9 s (CSS mk-pfanne: 77 % Schwung, 93 % Landung) – Wusch, Plopp, kurz mehr Brutzeln
    var pf = wurzel.querySelector(".mk-pfannkuchen");
    if (pf) {
      var runde = function () {
        [[6.75, function () { KU.spiele("ev_wenden", 0.26); merke("Pfannkuchen hoch"); }],
         [8.3, function () { KU.spiele("f_ev_plopp", 0.2); merke("Pfannkuchen landet"); var s = schichten.f_amb_brutzeln;
                             if (s) { rampe(s.g.gain, s.laut * 2.2, 0.15); spaeter(function () { if (schichten.f_amb_brutzeln === s) rampe(s.g.gain, s.laut, 1.8); }, 400); } }]
        ].forEach(function (e) { spaeter(function () { if (!ruhig()) e[1](); }, e[0] * 1000); });
      };
      ["animationstart", "webkitAnimationStart", "animationiteration", "webkitAnimationIteration"].forEach(function (ev) {
        pf.addEventListener(ev, runde, false);
        K.weg.push(function () { pf.removeEventListener(ev, runde, false); });
      });
    }
  }
})();
