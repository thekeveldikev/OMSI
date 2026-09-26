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
  function einzel(name, laut, ersatz) {
    holen(name, function (b) {
      if (!buchOffen || !eingeschaltet()) return;
      var q = ctx.createBufferSource(), g = ctx.createGain();
      q.buffer = b; g.gain.value = laut; q.connect(g); g.connect(summe);
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
    for (var n in puffer) if (puffer[n] && /^amb_/.test(n) && !behalten[n] && !schichten[n]) delete puffer[n];
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
    if (!eingeschaltet() || !bereit()) return false;
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
    if (!eingeschaltet() || !ctx || !P.blaettern || !puffer[P.blaettern]) return false;
    var q = ctx.createBufferSource(), g = ctx.createGain();
    q.buffer = puffer[P.blaettern]; g.gain.value = 0.75; q.connect(g); g.connect(ctx.destination);
    starte(q, jetzt() + 0.01);
    return true;
  };

  // Nach dem ersten Tippen (iPad) nachholen, was noch nicht klingen durfte
  KU.wecken = function () {
    if (!buchOffen || !seitenPlan || ctx || !eingeschaltet()) return;
    if (!bereit()) return;
    if (P.blaettern) holen(P.blaettern);
    abspielen(planFuer(seitenPlan.typ, seitenPlan.schluessel));
  };

  // Ein Einzelgeräusch genau jetzt (z. B. der Hahn kräht, wenn er den Kopf zurücklegt)
  // ersatz: wird aufgerufen, wenn es die Datei nicht gibt (dann klingt z. B. das eingebaute Geräusch)
  KU.spiele = function (name, laut, ersatz) {
    if (!buchOffen || !eingeschaltet() || !bereit()) { if (ersatz) ersatz(); return false; }
    einzel(name, laut == null ? 0.8 : laut, ersatz);
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
    return an;
  };
})();
