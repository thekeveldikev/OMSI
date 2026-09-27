/* Lebendige Küche – "Küchenzauber": Himmel, Jahreszeit, Wetter und Licht rund um Omsis Küche, Nachtgäste und kleine
   Antworten beim Antippen. ALLES ist wählbar und standardmäßig aus (außer den Antworten beim Antippen); je Gruppe gilt
   immer nur eine Wahl, damit sich nichts beißt. Die Wahl steht im Blatt "Einstellungen" (Fußleiste der Küche).
   Hängt sich von außen an Codex' Küchenbühne: .mk-buehne, .mk-dekor, .mk-himmel, .mk-sonne, .mk-wolke, .mk-basis,
   .mk-vogel, .mk-fuss (+ .mk-bewegung) und die Klasse mk-ruhig. Papier: PAPIER; Klänge: Klangkulisse + KLANG. ES5.
   Zum Ausprobieren (überschreibt die Einstellungen): ?zeit=nacht|morgen|tag|abend&jahr=…&wetter=regen|sturm|nebel|regenbogen */
(function () {
  var KL = window.KUECHE_LEBEN = {};
  var z = null;
  var FENSTER = [0, 0, 276, 461];                        // wie .mk-himmel (18 % × 45 % der Bühne 1536×1024)

  // ───────── Einstellungen ─────────
  var STANDARD = { zeit: "aus", jahr: "aus", wetter: "aus", fest: "aus", licht: false, nachtKueche: true, kauz: false, schnuppen: false, gluehen: false, antippen: true };
  function einst() {
    var e = B.erinnern("kueche.zauber", null) || {}, o = {};
    for (var k in STANDARD) o[k] = Object.prototype.hasOwnProperty.call(e, k) ? e[k] : STANDARD[k];
    return o;
  }
  KL.einstellungen = einst;
  KL.setzen = function (k, v) {
    var e = einst(); e[k] = v;
    if (k === "zeit" && v === "nacht" && e.wetter === "regenbogen") e.wetter = "aus";   // Regenbogen gibt es nur bei Tag
    B.merken("kueche.zauber", e);
    if (z) neuAnwenden(z);
  };
  KL.allesAus = function () { B.merken("kueche.zauber", STANDARD); if (z) neuAnwenden(z); };

  function param(n) { var m = new RegExp("[?&]" + n + "=(\\w+)").exec(window.location.search); return m ? m[1] : null; }
  function uhrZeit() {
    var d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    return h < 5.5 ? "nacht" : h < 8.5 ? "morgen" : h < 17.5 ? "tag" : h < 21 ? "abend" : "nacht";
  }
  function kalenderJahr() {
    var m = new Date().getMonth();
    return m <= 1 || m === 11 ? "winter" : m <= 4 ? "fruehling" : m <= 7 ? "sommer" : "herbst";
  }
  // wirksame Werte (null = Effekt aus)
  KL.tageszeit = function () { var p = param("zeit"); if (p) return p; var e = einst().zeit; return e === "aus" ? null : e === "uhr" ? uhrZeit() : e; };
  KL.jahreszeit = function () { var p = param("jahr"); if (p) return p; var e = einst().jahr; return e === "aus" ? null : e === "kalender" ? kalenderJahr() : e; };
  // Wetter "wechselnd": alle 3 Stunden neu, passend zur Jahreszeit (für alle gleich, kein Zufall beim Neuladen)
  function zufallAus(n) { var x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }
  var WETTER_TAFEL = {
    fruehling: [["klar", 0.5], ["regen", 0.25], ["regenbogen", 0.12], ["nebel", 0.08], ["sturm", 0.05]],
    sommer:    [["klar", 0.6], ["sturm", 0.15], ["regen", 0.12], ["regenbogen", 0.08], ["nebel", 0.05]],
    herbst:    [["klar", 0.45], ["regen", 0.25], ["sturm", 0.15], ["nebel", 0.15]],
    winter:    [["klar", 0.7], ["nebel", 0.15], ["sturm", 0.15]]
  };
  KL.wetter = function (zeit, jahr) {
    var e = param("wetter") || einst().wetter, w = "klar";
    if (e === "wechselnd") {
      var d = new Date(), tag = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
      var r = zufallAus(d.getFullYear() * 10000 + tag * 10 + Math.floor(d.getHours() / 3)), summe = 0, tafel = WETTER_TAFEL[jahr || kalenderJahr()];
      for (var i = 0; i < tafel.length; i++) { summe += tafel[i][1]; if (r < summe) { w = tafel[i][0]; break; } }
    } else if (e !== "aus") w = e;
    if (w === "regenbogen" && zeit === "nacht") w = "klar";
    return w;
  };


  // ───────── Jahreszeiten-Küche & Feste (Bilder von Codex, maßgleich zu kueche.png) ─────────
  // Welches Küchenbild? Nachts (wenn gewünscht) schläft die Küche · sonst ein Anlass · sonst die Jahreszeit · sonst das Original.
  // Die Bilder liegen als JPEG + Fenstermaske in bilder/menue-v2/jahreszeiten/ (Werkzeuge/jahreszeiten_bilder.py).
  function adventsBeginn(jahr) {                         // 1. Advent = 4. Sonntag vor Weihnachten
    var heiligabend = new Date(jahr, 11, 24), vierter = new Date(jahr, 11, 24 - heiligabend.getDay());
    return new Date(vierter.getFullYear(), vierter.getMonth(), vierter.getDate() - 21);
  }
  function festNachDatum() {
    var d = new Date(), m = d.getMonth(), t = d.getDate();
    if ((m === 11 && t === 31) || (m === 0 && t === 1)) return "silvester";
    var gb = B.E && B.E.geburtstag;                      // optional in daten/einstellungen.js: geburtstag: "MM-TT"
    if (gb && ("0" + (m + 1)).slice(-2) + "-" + ("0" + t).slice(-2) === gb) return "geburtstag";
    var heute = new Date(d.getFullYear(), m, t);
    if (heute >= adventsBeginn(d.getFullYear()) && heute <= new Date(d.getFullYear(), 11, 26)) return "advent";
    return null;
  }
  function adventKerzen() {                              // wie viele Kerzen brennen: im Advent nach Sonntagen, sonst alle vier
    var d = new Date(), heute = new Date(d.getFullYear(), d.getMonth(), d.getDate()), b = adventsBeginn(d.getFullYear());
    if (heute >= b && heute < new Date(d.getFullYear(), 11, 25)) return Math.min(4, Math.floor((heute - b) / 864e5 / 7) + 1);
    return 4;
  }
  KL.fest = function () { var p = param("fest"); if (p) return p === "aus" ? null : p; var e = einst().fest; return e === "aus" ? null : e === "kalender" ? festNachDatum() : e; };
  function kuechenBild(s) {
    if (s.zeit === "nacht" && s.einst.nachtKueche) return "nacht";
    return s.fest || s.jahr || null;
  }
  function bildQuelle(n) { return MENUE_DATEN.ordner + (n ? "jahreszeiten/kueche-" + n + ".jpg" : "kueche.png"); }
  function maskeQuelle(n) { return MENUE_DATEN.ordner + "jahreszeiten/maske-" + n + ".png"; }
  function bildSetzen(el, n) {
    el.src = bildQuelle(n);
    var m = n ? "url(" + maskeQuelle(n) + ")" : "none";   // nur die Fensterscheiben durchsichtig (Himmel, Vogel, Kauz dahinter)
    el.style.webkitMaskImage = m; el.style.maskImage = m;
    el.style.webkitMaskSize = el.style.maskSize = "100% 100%";
    el.style.webkitMaskRepeat = el.style.maskRepeat = "no-repeat";
  }
  function bildWechseln(s, n, sofort) {
    if (s.bildAktiv === n || !window.MENUE_DATEN) return;
    s.bildAktiv = n;
    var basis = s.dekor.querySelector(".mk-basis"); if (!basis) return;
    var quellen = [bildQuelle(n)]; if (n) quellen.push(maskeQuelle(n));
    var offen = quellen.length;
    function geladen() {
      if (--offen > 0 || z !== s || s.bildAktiv !== n) return;
      s.bildSichtbar = n; s.schmuck = null; lichtAnwenden(s);
      var sc = s.schmuckCv;                                // Kerzen, Glanz & Co. blenden mit dem neuen Bild ein
      if (sc) { sc.style.webkitTransition = sc.style.transition = "none"; sc.style.opacity = sofort ? "1" : "0"; void sc.offsetWidth;
                sc.style.webkitTransition = sc.style.transition = "opacity 1.8s ease-in-out"; sc.style.opacity = "1"; }
      if (sofort) { bildSetzen(basis, n); return; }
      // Überblenden: das neue Bild legt sich weich darüber, dazu ein Wirbel aus passendem Papier
      var neu = document.createElement("img"); neu.className = "mk-basis kl-basis-neu"; neu.alt = ""; neu.setAttribute("aria-hidden", "true");
      bildSetzen(neu, n); basis.parentNode.insertBefore(neu, basis.nextSibling);
      B.frame(function () { B.frame(function () { neu.className += " da"; }); });
      wirbel(s, n);
      setTimeout(function () {
        if (z === s && s.bildAktiv === n) bildSetzen(basis, n);
        setTimeout(function () { if (neu.parentNode) neu.parentNode.removeChild(neu); }, 80);
      }, 1950);
    }
    quellen.forEach(function (q) { var i = new Image(); i.onload = i.onerror = geladen; i.src = q; });
  }
  var WIRBEL = {
    fruehling: [["dampf", ["rosa", "weiss", "rosa"]], ["blatt", ["hellgruen", "gruen"]]], sommer: [["blatt", ["gelb", "orange", "gelb"]], ["dampf", ["rot"]]],
    herbst: [["blatt", ["orange", "rot", "braun", "gelb", "ocker"]]], winter: [["dampf", ["weiss", "creme", "weiss"]], ["stern", ["gelb", "creme"]]],
    nacht: [["stern", ["gelb", "creme"]], ["dampf", ["tiefblau", "blau"]]], advent: [["stern", ["gold", "rot", "gelb"]], ["blatt", ["gruen"]]],
    geburtstag: [["dampf", ["rot", "gelb", "blau", "gruen", "rosa", "orange"]]], silvester: [["stern", ["gold", "gelb", "weiss", "blau"]]], standard: [["dampf", ["creme", "weiss", "ocker"]]]
  };
  function wirbel(s, n) {
    var arten = WIRBEL[n || "standard"] || WIRBEL.standard;
    for (var i = 0; i < 46; i++) {
      var a = arten[i % arten.length], farben = a[1];
      s.funken.push({ x: -60 - Math.random() * 120, y: 60 + Math.random() * 900, vx: 760 + Math.random() * 420, vy: (Math.random() - 0.5) * 220,
                      g: a[0] === "dampf" ? 7 + Math.random() * 9 : 10 + Math.random() * 8, t: -i * 0.028, dauer: 2.1 + Math.random() * 0.5,
                      art: a[0], farbe: farben[i % farben.length], dreh: Math.random() * 6.3, seed: Math.floor(Math.random() * 99) });
    }
    s.funkenLeer = false;
    if (!s.klangBereit) return;
    if (KLANG.blaettern) KLANG.blaettern();
    if (n === "fruehling") klang("ev_voegel", 0.3, 0, 2.2);
    else if (n === "herbst" && KLANG.rascheln) KLANG.rascheln(0.35);
    else if (n === "geburtstag" && KLANG.tusch) KLANG.tusch();
    else if (n === "silvester" && KLANG.feuerwerk) KLANG.feuerwerk(0.35);
    else if (n) klang("f_ev_glitzer", 0.2);
  }

  // Was in jedem Bild lebt (Bühnenkoordinaten, vermessen an Codex' Bildern)
  var SCHMUCK = {
    fruehling:  { zonen: [["osterkorb", [60, 745, 64, 72]], ["kresse", [152, 850, 55, 45]]], tier: "schmetterling" },
    sommer:     { zonen: [["erdbeeren", [95, 850, 100, 85]], ["limonade", [1445, 612, 45, 40]]], tier: "biene" },
    herbst:     { zonen: [["kuerbis", [1345, 35, 52, 36]], ["aepfel", [95, 815, 100, 65]]], tier: "laub" },
    // Kerzen: Dochtspitzen laut Codex (27.09.), der Kranz steht vorn links neben dem Rezeptheft
    winter:     { zonen: [["kranz", [110, 850, 112, 72]]], kerzen: [[51, 811], [118, 798], [190, 815], [90, 851]], dampf: [492, 606],
                  glanz: [[42, 962], [150, 972], [205, 900], [1470, 470], [1500, 540], [60, 330]] },
    advent:     { zonen: [["kranz", [115, 845, 115, 72]]], kerzen: [[73, 813], [155, 814], [212, 790], [120, 845]],
                  glanz: [[860, 30], [1040, 20], [1180, 30], [1320, 20], [1480, 40], [1510, 170], [1525, 320], [1515, 470]] },
    geburtstag: { zonen: [["ballons", [1488, 250, 55, 220]], ["geschenke", [1478, 610, 55, 45]]], torte: true, tier: "konfetti" },
    silvester:  { zonen: [["knallbonbons", [1460, 955, 80, 45]], ["klee", [55, 905, 50, 65]]], feuerwerk: true,
                  glanz: [[540, 900], [700, 870], [1020, 860], [1100, 840], [1250, 880]] },
    nacht:      { zonen: [["omsi", [495, 445, 150, 115]], ["omsi", [470, 590, 180, 70]], ["katze", [790, 590, 95, 60]]], schlaf: true }
  };
  var TORTE = [[1277, 393], [1302, 403], [1322, 390], [1346, 380], [1360, 410], [1382, 393]];
  function flamme(c, x, y, st, gross) {                  // Kerzenflamme aus Papier mit warmem Schein, flackert ruckweise
    var h = gross * st.h, n = st.n;
    var g = c.createRadialGradient(x, y - h * 0.5, 1, x, y - h * 0.5, h * 1.9);
    g.addColorStop(0, "rgba(255,200,110,0.42)"); g.addColorStop(1, "rgba(255,170,70,0)");
    c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(x, y - h * 0.5, h * 1.9, 0, 6.283); c.fill();
    PAPIER.flammenpfad(c, x, y, gross * 0.42, h, n); c.fillStyle = PAPIER.muster(c, "orange", { akzent: "rot" }); c.fill();
    PAPIER.flammenpfad(c, x, y, gross * 0.22, h * 0.58, n * 0.5); c.fillStyle = PAPIER.muster(c, "gelb"); c.fill();
  }
  function schmuckMalen(s, dt) {
    var cv = s.schmuckCv, c = s.schmuckC, sm = SCHMUCK[s.bildSichtbar];
    var st = s.schmuck || (s.schmuck = { flammen: [], tiere: [], glanz: [], takt: 0, zzz: 2, tierPause: 4 });
    if (!sm) { if (!s.schmuckLeer) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); s.schmuckLeer = true; } return; }
    var r = cv.getBoundingClientRect(); if (!r.width) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), bw = Math.round(r.width * dpr), bh = Math.round(r.height * dpr);
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; c.__muster = null; }
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, bw, bh); s.schmuckLeer = false;
    var k = bw / 1536; c.setTransform(k, 0, 0, k, 0, 0);
    st.takt -= dt;
    var neuTakt = st.takt <= 0; if (neuTakt) st.takt = 0.11 + Math.random() * 0.05;      // Stop-Motion: ~8 Bilder/s
    function flackern(i) { var f = st.flammen[i] || (st.flammen[i] = { h: 1, n: 0 }); if (neuTakt) { f.h = 0.85 + Math.random() * 0.3; f.n = (Math.random() - 0.5) * 3; } return f; }
    if (sm.kerzen) { var anz = s.kerzenZahl; for (var i = 0; i < anz; i++) flamme(c, sm.kerzen[i][0], sm.kerzen[i][1] - 1, flackern(i), 24); }
    if (sm.torte) TORTE.forEach(function (p, i) { flamme(c, p[0], p[1] - 3, flackern(10 + i), 13); });
    if (sm.dampf && neuTakt && Math.random() < 0.35) dampfWoelkchen(s, sm.dampf);
    if (sm.glanz) {                                       // Strohsterne, Kugeln, Sterne blitzen kurz auf
      if (Math.random() < dt * 1.3) { var gp = sm.glanz[Math.floor(Math.random() * sm.glanz.length)]; st.glanz.push({ x: gp[0], y: gp[1], t: 0 }); }
      st.glanz = st.glanz.filter(function (gl) {
        gl.t += dt; var a = Math.sin(Math.min(1, gl.t / 0.7) * Math.PI);
        c.save(); c.translate(gl.x, gl.y); c.rotate(gl.t * 1.5);
        stern(c, 0, 0, 7 + a * 4, 4); fuellen(c, "weiss", a * 0.95); stern(c, 0, 0, 3 + a * 2, 4); fuellen(c, "gelb", a);
        c.restore(); return gl.t < 0.7;
      });
    }
    if (sm.schlaf && (st.zzz -= dt) <= 0) {               // die schlafende Omsi (und die Katze) träumen vor sich hin
      st.zzz = 2.6 + Math.random() * 2.2;
      if (Math.random() < 0.65) funken(s, 520, 330, "zzz", ["hellblau", "weiss", "hellblau"], 2); else funken(s, 770, 520, "zzz", ["weiss", "hellblau"], 1);
    }
    if (sm.tier) tierMalen(s, c, st, sm.tier, dt);
    c.globalAlpha = 1;
  }
  function dampfWoelkchen(s, p) {
    s.funken.push({ x: p[0] + (Math.random() - 0.5) * 12, y: p[1], vx: (Math.random() - 0.5) * 10, vy: -(22 + Math.random() * 14), g: 6 + Math.random() * 4,
                    t: 0, dauer: 2.2, art: "dampf", farbe: "weiss", dreh: 0, seed: Math.floor(Math.random() * 99) });
    s.funkenLeer = false;
  }
  function tierMalen(s, c, st, art, dt) {
    st.tierPause -= dt;
    if (!st.tiere.length && st.tierPause <= 0) {
      st.tierPause = art === "konfetti" ? 1.2 : art === "laub" ? 5 + Math.random() * 6 : 22 + Math.random() * 20;
      if (art === "schmetterling") st.tiere.push({ art: art, x: -30, y: 300 + Math.random() * 200, t: 0, farbe: Math.random() < 0.5 ? "gelb" : "rosa" });
      else if (art === "biene") st.tiere.push({ art: art, x: 150, y: 330, t: 0 });
      else if (art === "laub") st.tiere.push({ art: art, x: 700 + Math.random() * 120, y: 120, t: 0, farbe: ["orange", "rot", "gelb", "ocker"][Math.floor(Math.random() * 4)], dreh: 0 });
      else if (art === "konfetti") for (var i = 0; i < 4; i++) st.tiere.push({ art: art, x: 780 + Math.random() * 640, y: 80, t: -i * 0.3, farbe: ["rot", "gelb", "blau", "gruen", "rosa"][Math.floor(Math.random() * 5)], dreh: Math.random() * 6 });
    }
    st.tiere = st.tiere.filter(function (t) {
      t.t += dt; if (t.t < 0) return true;
      c.save();
      if (t.art === "schmetterling") {                     // flattert quer durch die Küche
        t.x += 70 * dt; var y = t.y + Math.sin(t.t * 1.7) * 60 - Math.sin(t.t * 0.6) * 40, auf = Math.floor(t.t * 8) % 2 ? 1 : 0.3;
        c.translate(t.x, y); c.rotate(Math.sin(t.t * 3) * 0.25); c.scale(auf * 1.6, 1.6);
        PAPIER.risspfad(c, -7, -4, 7, 6, 9, 2); fuellen(c, t.farbe, 1); PAPIER.risspfad(c, 7, -4, 7, 6, 9, 3); fuellen(c, t.farbe, 1);
        PAPIER.risspfad(c, -5, 5, 5, 4, 7, 4); fuellen(c, "orange", 0.9); PAPIER.risspfad(c, 5, 5, 5, 4, 7, 5); fuellen(c, "orange", 0.9);
        c.restore(); c.fillStyle = "#3a2a1e"; return t.x < 1600;
      }
      if (t.art === "biene") {                             // summt in Schleifen um die Blumen am Fenster
        t.x = 150 + Math.sin(t.t * 0.9) * 95 + Math.sin(t.t * 2.3) * 20; var by = 330 + Math.sin(t.t * 1.4) * 60;
        var fl = Math.floor(t.t * 12) % 2;
        c.translate(t.x, by); c.scale(1.5, 1.5);
        PAPIER.risspfad(c, 0, 0, 7, 5, 8, 11); fuellen(c, "gelb", 1);
        c.fillStyle = "#2b2118"; c.globalAlpha = 1; c.fillRect(-2.5, -4.5, 1.8, 9); c.fillRect(1.5, -4.5, 1.8, 9);
        PAPIER.risspfad(c, -1, -6 - fl, 4, 3, 7, 12); fuellen(c, "weiss", 0.85); PAPIER.risspfad(c, 3, -6 + fl, 4, 3, 7, 13); fuellen(c, "weiss", 0.85);
        t.xs = t.x; t.ys = by; c.restore(); return t.t < 28;
      }
      if (t.art === "laub" || t.art === "konfetti") {      // ein Blatt / Konfetti segelt langsam herab
        t.y += (t.art === "laub" ? 34 : 46) * dt; t.x += Math.sin(t.t * 2 + t.dreh) * 30 * dt; t.dreh += dt * 2;
        c.translate(t.x, t.y); c.rotate(t.dreh);
        if (t.art === "laub") { blatt(c, 0, 0, 11); fuellen(c, t.farbe, 1); } else { PAPIER.risspfad(c, 0, 0, 5, 3.5, 6, 7); fuellen(c, t.farbe, 1); }
        c.restore(); return t.y < 900;
      }
      c.restore(); return false;
    });
  }
  // Feuerwerk vor dem Silvesterfenster: Papierfunken, die aufplatzen und sinken
  function feuerwerkMalen(s, c, f, dt) {
    f.feuer = f.feuer || [];
    f.feuerPause = (f.feuerPause || 1) - dt;
    if (f.feuerPause <= 0) {
      f.feuerPause = 1.6 + Math.random() * 2.2;
      var x = 110 + Math.random() * 90, y = 40 + Math.random() * 150, farbe = ["gelb", "rot", "blau", "gruen", "rosa", "gold"][Math.floor(Math.random() * 6)];
      for (var i = 0; i < 14; i++) { var w = i / 14 * 6.283; f.feuer.push({ x: x, y: y, vx: Math.cos(w) * (40 + Math.random() * 20), vy: Math.sin(w) * (40 + Math.random() * 20), t: 0, farbe: farbe }); }
      if (s.klangBereit && KLANG.feuerwerk) KLANG.feuerwerk(0.12);
    }
    f.feuer = f.feuer.filter(function (p) {
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt; p.vx *= 0.97;
      var a = Math.max(0, 1 - p.t / 1.3);
      stern(c, p.x, p.y, 3.2 * (0.6 + a * 0.5), 4); fuellen(c, p.farbe, a);
      return p.t < 1.3;
    });
  }

  // ───────── Papierformen ─────────
  function herz(c, x, y, g) {
    c.beginPath(); c.moveTo(x, y + g * 0.35);
    c.bezierCurveTo(x - g * 0.05, y + g * 0.1, x - g * 0.55, y + g * 0.05, x - g * 0.5, y - g * 0.2);
    c.bezierCurveTo(x - g * 0.45, y - g * 0.5, x - g * 0.08, y - g * 0.5, x, y - g * 0.22);
    c.bezierCurveTo(x + g * 0.08, y - g * 0.5, x + g * 0.45, y - g * 0.5, x + g * 0.5, y - g * 0.2);
    c.bezierCurveTo(x + g * 0.55, y + g * 0.05, x + g * 0.05, y + g * 0.1, x, y + g * 0.35);
    c.closePath();
  }
  function stern(c, x, y, g, zacken) {
    var n = zacken || 5; c.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var r = i % 2 ? g * 0.42 : g, a = -Math.PI / 2 + i * Math.PI / n;
      if (i === 0) c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.closePath();
  }
  function note(c, x, y, g) {                            // Achtelnote: Kopf, Hals, Fähnchen
    c.beginPath(); if (c.ellipse) c.ellipse(x, y, g * 0.32, g * 0.24, -0.4, 0, Math.PI * 2); else c.arc(x, y, g * 0.28, 0, Math.PI * 2);
    c.rect(x + g * 0.22, y - g * 0.95, g * 0.11, g * 0.95);
    c.moveTo(x + g * 0.33, y - g * 0.95); c.quadraticCurveTo(x + g * 0.75, y - g * 0.7, x + g * 0.55, y - g * 0.35);
    c.quadraticCurveTo(x + g * 0.6, y - g * 0.62, x + g * 0.33, y - g * 0.68); c.closePath();
  }
  function blatt(c, x, y, g) {                           // Laubblatt: spitz an beiden Enden, leicht gebogen
    c.beginPath(); c.moveTo(x - g, y);
    c.quadraticCurveTo(x - g * 0.2, y - g * 0.75, x + g, y);
    c.quadraticCurveTo(x - g * 0.2, y + g * 0.65, x - g, y); c.closePath();
  }
  function fuellen(c, farbe, alpha) { c.globalAlpha = alpha; c.fillStyle = PAPIER.muster(c, farbe); c.fill(); }
  function kante(c, alpha) { c.globalAlpha = alpha; c.lineWidth = 1; c.strokeStyle = "rgba(255,250,235,.8)"; c.stroke(); }

  // ───────── Das Fenster ─────────
  var ZUSTAND_FARBEN = { herbst: ["orange", "rot", "ocker", "braun", "gelb"], fruehling: ["rosa", "weiss", "rosa"], winter: ["weiss", "creme", "weiss"] };
  function teilchenNeu(art, w, h, irgendwo) {
    var farben = ZUSTAND_FARBEN[art] || ["gelb"];
    return { x: Math.random() * w, y: irgendwo ? Math.random() * h : -20 - Math.random() * 60,
             vx: (Math.random() - 0.5) * 10 + (art === "fruehling" ? 8 : 0), vy: art === "winter" ? 14 + Math.random() * 14 : 16 + Math.random() * 12,
             g: art === "winter" ? 2.6 + Math.random() * 2.8 : art === "fruehling" ? 5 + Math.random() * 3 : 8 + Math.random() * 5,
             dreh: Math.random() * 6.3, vdreh: (Math.random() - 0.5) * 1.6, phase: Math.random() * 6.3,
             farbe: farben[Math.floor(Math.random() * farben.length)], seed: Math.floor(Math.random() * 999) };
  }
  var mond = null;                                       // Sichel einmal auf eigener Fläche ausschneiden (sonst Loch im Himmel)
  function mondBild(k) {
    var px = Math.ceil(54 * k);
    if (mond && mond.width === px) return mond;
    mond = document.createElement("canvas"); mond.width = mond.height = px;
    var c = mond.getContext("2d"), g = px * 0.41, m = px / 2;
    PAPIER.risspfad(c, m, m, g, g, 19, 4); c.fillStyle = PAPIER.muster(c, "creme"); c.fill();
    c.globalCompositeOperation = "destination-out";
    PAPIER.risspfad(c, m + g * 0.5, m - g * 0.28, g * 0.92, g * 0.92, 19, 9); c.fill();
    return mond;
  }
  function fensterBauen(s) {
    var himmel = s.dekor.querySelector(".mk-himmel");
    if (!himmel) return;
    var cv = document.createElement("canvas"); cv.className = "kl-fenster"; cv.setAttribute("aria-hidden", "true");
    var basis = s.dekor.querySelector(".mk-basis");
    s.dekor.insertBefore(cv, basis || null);             // über Himmel, Sonne und Wolke – unter dem Küchenbild
    s.fenster = { cv: cv, c: cv.getContext("2d"), sonne: s.dekor.querySelector(".mk-sonne"), wolke: s.dekor.querySelector(".mk-wolke"), vogel: s.dekor.querySelector(".mk-vogel"),
                  teilchen: [], schmetterling: null, sterne: [], schnuppe: null, gluehen: [], blinzeln: 0, naechstesBlinzeln: 3, kauzRuf: 0, kopf: 0,
                  regen: [], scheibe: [], wolken: [], nebel: [], blitz: null, naechsterBlitz: 4, leer: false };
    // Sterne nur in den freien Scheiben (Bühnenpixel; Fensterkreuz und Blätter decken den Rest)
    [[112, 18], [168, 34], [140, 64], [186, 10], [108, 112], [180, 196], [126, 228], [152, 104], [186, 132], [58, 30]].forEach(function (p, i) {
      s.fenster.sterne.push({ x: p[0], y: p[1], g: 3 + Math.random() * 3, an: Math.random(), seed: i });
    });
  }
  function regenNeu(irgendwo) {
    return { x: Math.random() * 330 - 20, y: irgendwo ? Math.random() * 470 : -20 - Math.random() * 40, l: 9 + Math.random() * 8, v: 300 + Math.random() * 90, farbe: Math.random() < 0.7 ? "hellblau" : "weiss" };
  }
  function tropfenNeu() {                                // Tropfen auf der Scheibe (nur wo Glas ist, der Rest liegt hinter Rahmen/Blättern)
    return { x: 8 + Math.random() * 186, y: 8 + Math.random() * 300, g: 2.2 + Math.random() * 3.4, seed: Math.floor(Math.random() * 90), rinnt: false, start: 0, schritt: 0, alter: 0 };
  }
  // Licht in der Küche (über dem Bild, unter den Schildern): morgens warm, abends golden, nachts bläulich mit Lampenschein, bei Regen grauer
  function lichtAnwenden(s) {
    var t = s.licht, l = s.lampe; if (!t) return;
    var farbe = "";
    if (s.einst.licht && s.bildSichtbar !== "nacht") {
      farbe = { morgen: "#fff0e2", abend: "#ffe1c2", nacht: "#c9d1ef" }[s.zeit] || "";
      if (s.wetter === "regen" || s.wetter === "nebel") farbe = s.zeit === "nacht" ? "#bcc5e6" : (s.zeit === "morgen" || s.zeit === "abend") ? farbe : "#e9ecf0";
      if (s.wetter === "sturm") farbe = s.zeit === "nacht" ? "#b3bcdf" : "#dde1e9";
    }
    t.style.backgroundColor = farbe || "transparent"; t.style.display = farbe ? "" : "none";
    var lampe = s.einst.licht && s.bildSichtbar !== "nacht" && (s.zeit === "nacht" || s.zeit === "abend");
    l.style.display = lampe ? "" : "none"; l.style.opacity = s.zeit === "nacht" ? "1" : "0.55";
  }
  function neuAnwenden(s) {
    var f = s.fenster;
    s.einst = einst();
    s.zeit = KL.tageszeit(); s.jahr = KL.jahreszeit(); s.wetter = KL.wetter(s.zeit, s.jahr); s.fest = KL.fest();
    s.kerzenZahl = adventKerzen();
    bildWechseln(s, kuechenBild(s), s.bildAktiv === undefined);   // beim Betreten sofort, danach mit Überblendung
    if (!s.zeit && s.fest === "silvester") s.zeit = "nacht";   // Silvester: Nachthimmel mit Feuerwerk im Fenster
    var nacht = s.zeit === "nacht";
    s.kauz = nacht && s.einst.kauz; s.schnuppen = nacht && s.einst.schnuppen;
    s.gluehen = nacht && s.einst.gluehen && s.wetter === "klar" && s.jahr !== "winter";   // nur in milden, klaren Nächten
    var nass = s.wetter === "regen" || s.wetter === "sturm";
    s.schneeStattRegen = nass && s.jahr === "winter";   // im Winter: Schneetreiben statt Regen
    s.vogelWeg = nacht || nass;
    if (f) {
      // Sonne: morgens/abends tief (Codex' Papiersonne wird nur verschoben), nachts und bei Regen weg
      if (f.sonne) {
        f.sonne.style.visibility = nacht || nass ? "hidden" : "";
        B.transform(f.sonne, s.zeit === "morgen" ? "translate(-30%,150%)" : s.zeit === "abend" ? "translate(40%,210%) scale(1.15)" : "none");
      }
      if (f.wolke) f.wolke.style.opacity = nacht && !nass ? "0.25" : "";
      if (f.vogel) f.vogel.style.visibility = nacht || nass ? "hidden" : "";  // nachts schläft das Rotkehlchen, bei Regen/Gewitter sucht es Schutz
      f.regen = []; f.scheibe = []; f.wolken = []; f.nebel = []; f.blitz = null; f.naechsterBlitz = 3 + Math.random() * 4; f.schnuppe = null; f.gluehen = [];
      if (nass) {
        if (!s.schneeStattRegen) {
          for (var r = 0; r < (s.wetter === "sturm" ? 70 : 42); r++) f.regen.push(regenNeu(true));
          for (var q = 0; q < (s.wetter === "sturm" ? 22 : 14); q++) f.scheibe.push(tropfenNeu());
        }
        for (var w = 0; w < 3; w++) f.wolken.push({ x: w * 110 - 40, y: 20 + w * 34, g: 46 + w * 8, seed: 60 + w });
      }
      if (s.wetter === "regenbogen") for (var q2 = 0; q2 < 6; q2++) f.scheibe.push(tropfenNeu());   // die letzten Tropfen trocknen noch
      if (s.wetter === "nebel") for (var n2 = 0; n2 < 4; n2++) f.nebel.push({ x: Math.random() * 276, y: 150 + n2 * 70, g: 120 + Math.random() * 60, v: 5 + Math.random() * 5, seed: 70 + n2 });
      var n = s.jahr === "winter" ? (s.schneeStattRegen ? 48 : 30) : s.jahr === "herbst" ? 10 : s.jahr === "fruehling" ? 9 : 0;
      f.teilchen = [];
      for (var i = 0; i < n; i++) f.teilchen.push(teilchenNeu(s.jahr, FENSTER[2], FENSTER[3], true));
      f.leer = false;
    }
    lichtAnwenden(s);
    klaengeAnwenden(s);
    if (window.KULISSE && KULISSE.raum && s.raumNacht !== nacht) {          // Raumklang: tagsüber Morgenvögel, nachts Nachtkulisse
      if (s.raumNacht !== undefined) KULISSE.raum("kueche", s.wurzel);
      s.raumNacht = nacht;
    }
    if (s.einstBlatt) s.einstBlatt.zeigen();
  }
  // Wetterklänge (leise unter der Musik): Regen und Wind als gefiltertes Rauschen, Donner nach dem Blitz
  function klaengeAnwenden(s) {
    s.klangBereit = false;
    if (!window.KLANG || !KLANG.regen) return;
    KLANG.regen(0); if (KLANG.wind) KLANG.wind(0);
  }
  function klaengeStarten(s) {
    if (s.klangBereit || !window.KLANG || !KLANG.kontext || !KLANG.kontext()) return;
    s.klangBereit = true;
    var regen = (s.wetter === "regen" || s.wetter === "sturm") && !s.schneeStattRegen;
    if (regen) KLANG.regen(s.wetter === "sturm" ? 0.06 : 0.035);
    if (KLANG.wind) KLANG.wind(s.wetter === "sturm" ? 0.05 : s.wetter === "nebel" || s.schneeStattRegen ? 0.016 : 0);
    if (s.wetter === "regenbogen" && !s.bogenGeklungen) { s.bogenGeklungen = true; klang("f_ev_glitzer", 0.2); }
  }
  function aktiv(s) { return !!(s.zeit || s.jahr || s.wetter !== "klar" || (s.bildSichtbar && SCHMUCK[s.bildSichtbar])); }

  function fensterMalen(s, dt) {
    var f = s.fenster, cv = f.cv, c = f.c;
    if (!aktiv(s)) {                                      // alles aus: Fenster bleibt so, wie Codex es gemalt hat
      if (!f.leer) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height); f.leer = true; }
      return;
    }
    var r = cv.getBoundingClientRect(); if (!r.width) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var bw = Math.round(r.width * dpr), bh = Math.round(r.height * dpr);
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; c.__muster = null; }
    var k = bw / FENSTER[2], W = FENSTER[2], H = FENSTER[3];
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, bw, bh); c.setTransform(k, 0, 0, k, 0, 0);
    if (s.zeit === "nacht") {
      c.fillStyle = PAPIER.muster(c, "tiefblau"); c.globalAlpha = 1; c.fillRect(0, 0, W, H);
      c.fillStyle = PAPIER.muster(c, "blau"); c.globalAlpha = 0.35; PAPIER.risspfad(c, W * 0.5, H * 0.95, W * 0.9, H * 0.35, 17, 7); c.fill();
      f.sterne.forEach(function (st) {                    // Sterne funkeln ruckweise (Stop-Motion)
        if (Math.random() < dt * 1.2) st.an = Math.random();
        stern(c, st.x, st.y, st.g * (0.8 + st.an * 0.35)); fuellen(c, st.an > 0.5 ? "gelb" : "creme", 0.55 + st.an * 0.45);
      });
      c.fillStyle = PAPIER.muster(c, "blau"); c.globalAlpha = 0.35;          // Hof um den Mond
      PAPIER.risspfad(c, 150, 158, 33, 33, 21, 6); c.fill();
      c.globalAlpha = 1; c.drawImage(mondBild(k), 150 - 27, 158 - 27, 54, 54);   // Papiermond (Sichel) in der rechten unteren Scheibe
      if (s.schnuppen && (f.schnuppe || Math.random() < dt / 40)) schnuppeMalen(s, c, f, dt);
      if (s.gluehen) gluehwuermchen(c, f, dt);
    } else if (s.zeit === "morgen" || s.zeit === "abend") {
      // Papierlagen wie ein Sonnenauf-/-untergang: oben kühl, zum Horizont hin warm und hell
      var lagen = s.zeit === "abend" ? [["lila", 0.3, 0.5, 0.5, 1.0], ["rosa", 0.5, 0.74, 0.46, 3], ["orange", 0.66, 0.93, 0.32, 5], ["gelb", 0.6, 1.04, 0.16, 8]]
                                     : [["rosa", 0.26, 0.5, 0.5, 1.0], ["orange", 0.42, 0.9, 0.3, 5], ["gelb", 0.5, 1.02, 0.17, 8]];
      lagen.forEach(function (l) {
        c.fillStyle = PAPIER.muster(c, l[0]); c.globalAlpha = l[1];
        if (l[4] === 1.0) c.fillRect(0, 0, W, H);
        else { PAPIER.risspfad(c, W * 0.5, H * l[2], W * 0.98, H * l[3], 15, l[4]); c.fill(); }
      });
    }
    wetterHimmel(s, c, f, dt, W, H);
    // Jahreszeit: Laub, Schnee, Blüten
    var art = s.jahr, wind = s.wetter === "sturm" ? 70 : s.wetter === "regen" ? (s.schneeStattRegen ? 34 : 12) : 0;
    f.teilchen.forEach(function (t, i) {
      if (dt) {
        t.phase += dt * (art === "winter" ? 1.4 : 1.9);
        t.x += (t.vx + wind + Math.sin(t.phase) * (art === "winter" ? 7 : 16)) * dt; t.y += t.vy * (wind > 30 ? 1.6 : 1) * dt; t.dreh += t.vdreh * dt * (1 + Math.sin(t.phase)) * (wind > 30 ? 2.5 : 1);
        if (t.y > H + 20 || t.x < -30 || t.x > W + 30) f.teilchen[i] = teilchenNeu(art, W, H, false);
      }
      c.save(); c.translate(t.x, t.y); c.rotate(t.dreh);
      if (art === "winter") { PAPIER.risspfad(c, 0, 0, t.g, t.g, 7, t.seed); fuellen(c, t.farbe, 0.95); }
      else if (art === "herbst") { blatt(c, 0, 0, t.g); fuellen(c, t.farbe, 1); c.globalAlpha = 0.5; c.strokeStyle = "rgba(90,50,20,.6)"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-t.g * 0.8, 0); c.lineTo(t.g * 0.8, 0); c.stroke(); }
      else if (art === "fruehling") { PAPIER.risspfad(c, 0, 0, t.g, t.g * 0.62, 8, t.seed); fuellen(c, t.farbe, 0.95); }
      c.restore();
    });
    if (art === "sommer" && s.zeit !== "nacht" && (s.wetter === "klar" || s.wetter === "regenbogen")) {   // Sommer: ab und zu ein Papierschmetterling
      var sm = f.schmetterling;
      if (!sm && Math.random() < dt * 0.05) sm = f.schmetterling = { x: -20, y: H * (0.25 + Math.random() * 0.4), t: 0, farbe: Math.random() < 0.5 ? "gelb" : "orange" };
      if (sm) {
        sm.t += dt; sm.x += 34 * dt; var y = sm.y + Math.sin(sm.t * 2.3) * 22;
        var auf = Math.floor(sm.t * 7) % 2 ? 1 : 0.35;    // Flügelschlag ruckweise
        c.save(); c.translate(sm.x, y); c.rotate(Math.sin(sm.t * 3) * 0.2);
        c.save(); c.scale(auf, 1); PAPIER.risspfad(c, -7, -4, 7, 6, 9, 2); fuellen(c, sm.farbe, 1); PAPIER.risspfad(c, 7, -4, 7, 6, 9, 3); fuellen(c, sm.farbe, 1);
        PAPIER.risspfad(c, -5, 5, 5, 4, 7, 4); fuellen(c, "rot", 0.9); PAPIER.risspfad(c, 5, 5, 5, 4, 7, 5); fuellen(c, "rot", 0.9); c.restore();
        c.fillStyle = "#3a2a1e"; c.globalAlpha = 1; c.fillRect(-1, -6, 2, 13);
        c.restore();
        if (sm.x > W + 30) f.schmetterling = null;
      }
    }
    if (s.kauz) kauzMalen(c, f, dt);
    if (s.bildSichtbar === "silvester") feuerwerkMalen(s, c, f, dt);
    wetterVorn(s, c, f, dt, W, H);
    c.globalAlpha = 1;
  }

  // ───────── Wetter: Regen, Gewitter mit Papierblitz, Nebel, Regenbogen ─────────
  function wetterHimmel(s, c, f, dt, W, H) {
    var nacht = s.zeit === "nacht";
    if (s.wetter === "regen" || s.wetter === "sturm") {
      c.fillStyle = PAPIER.muster(c, "grau"); c.globalAlpha = s.wetter === "sturm" ? (nacht ? 0.4 : 0.62) : (nacht ? 0.3 : 0.48); c.fillRect(0, 0, W, H);
      if (s.wetter === "sturm") { c.fillStyle = PAPIER.muster(c, "tiefblau"); c.globalAlpha = nacht ? 0.35 : 0.22; c.fillRect(0, 0, W, H); }
      var hell = f.blitz ? blitzHelligkeit(f.blitz.t) : 0;
      f.wolken.forEach(function (w) {                      // dicke graue Papierwolken; beim Blitz leuchten ihre Ränder auf
        w.x += dt * (s.wetter === "sturm" ? 26 : 8); if (w.x > W + 80) w.x = -90;
        PAPIER.risspfad(c, w.x, w.y, w.g, w.g * 0.42, 13, w.seed); fuellen(c, "grau", nacht ? 0.8 : 0.9);
        PAPIER.risspfad(c, w.x + w.g * 0.35, w.y - w.g * 0.18, w.g * 0.55, w.g * 0.3, 11, w.seed + 5); fuellen(c, nacht ? "tiefblau" : "weiss", nacht ? 0.35 : 0.3);
        if (hell > 0.05) { PAPIER.risspfad(c, w.x - w.g * 0.1, w.y - w.g * 0.12, w.g * 0.8, w.g * 0.26, 13, w.seed + 9); fuellen(c, "weiss", hell * 0.7); }
      });
    } else if (s.wetter === "regenbogen") {               // Papier-Regenbogen: sechs Bögen
      var farben = ["rot", "orange", "gelb", "gruen", "blau", "lila"];
      c.save(); c.globalAlpha = 0.72;
      farben.forEach(function (fa, i) {
        var r0 = 150 - i * 9;
        c.beginPath(); c.arc(170, 250, r0, Math.PI * 1.08, Math.PI * 1.92, false); c.arc(170, 250, r0 - 9, Math.PI * 1.92, Math.PI * 1.08, true); c.closePath();
        c.fillStyle = PAPIER.muster(c, fa); c.fill();
      });
      c.restore();
    }
  }
  // Helligkeit eines Blitzes über die Zeit: zwei, drei Zuckungen (Stop-Motion), dann verglimmen
  function blitzHelligkeit(t) { return t < 0.08 ? 1 : t < 0.14 ? 0.2 : t < 0.22 ? 0.9 : t < 0.27 ? 0.35 : Math.max(0, 0.75 - (t - 0.27) / 0.5); }
  // gezacktes Papierband entlang der Blitzlinie; die Risskante bleibt je Blitz gleich (dasselbe Stück Papier)
  function band(c, pts, breite) {
    c.beginPath();
    for (var i = 0; i < pts.length; i++) c.lineTo(pts[i][0] - breite * pts[i][2], pts[i][1] + breite * 0.25);
    for (var j = pts.length - 1; j >= 0; j--) c.lineTo(pts[j][0] + breite * pts[j][3], pts[j][1] - breite * 0.25);
    c.closePath();
  }
  function blitzMalen(c, b, hell, W, H) {
    c.fillStyle = PAPIER.muster(c, "weiss"); c.globalAlpha = hell * 0.42; c.fillRect(0, 0, W, H);            // nur der Himmel im Fenster blitzt auf
    c.fillStyle = PAPIER.muster(c, "hellblau"); c.globalAlpha = hell * 0.22; c.fillRect(0, 0, W, H);
    var mx = b.mitte[0], my = b.mitte[1];                                                                      // Lichthof aus gerissenen Papierlagen
    PAPIER.risspfad(c, mx, my, 118, 150, 21, 30); fuellen(c, "hellblau", hell * 0.3);
    PAPIER.risspfad(c, mx, my, 86, 118, 19, 31); fuellen(c, "weiss", hell * 0.42);
    PAPIER.risspfad(c, mx, my, 52, 80, 17, 32); fuellen(c, "gelb", hell * 0.3);
    PAPIER.risspfad(c, mx, my, 30, 48, 13, 33); fuellen(c, "weiss", hell * 0.5);
    [b.punkte].concat(b.arme).forEach(function (pts, i) {
      var d = i ? 0.55 : 1;
      band(c, pts, 17 * d); fuellen(c, "hellblau", hell * 0.45);                                              // äußerer Schein
      band(c, pts, 11 * d); fuellen(c, "weiss", hell * 0.55);                                                 // innerer Schein
      band(c, pts, 6.5 * d); fuellen(c, "gelb", hell);                                                        // gelber Papierstreifen
      c.globalAlpha = hell * 0.75; c.lineWidth = 1; c.strokeStyle = "rgba(255,255,240,.95)"; band(c, pts, 6.5 * d); c.stroke();   // helle Risskante
      band(c, pts, 2.4 * d); c.globalAlpha = hell; c.fillStyle = "#fffef6"; c.fill();                         // weißer Kern
    });
  }
  function blitzLos(s, f) {
    function linie(x, y, bisY, schwung) {
      var p = [[x, y, 0.7 + Math.random() * 0.6, 0.7 + Math.random() * 0.6]];
      while (y < bisY) { y += 18 + Math.random() * 18; x += (Math.random() - 0.5) * 34 + schwung; p.push([x, y, 0.7 + Math.random() * 0.6, 0.7 + Math.random() * 0.6]); }
      return p;
    }
    var haupt = linie(120 + Math.random() * 60, -8, 250 + Math.random() * 70, 0), arme = [];
    for (var a = 0; a < 2; a++) {                         // zwei Seitenarme
      var ab = haupt[2 + Math.floor(Math.random() * Math.max(1, haupt.length - 4))] || haupt[1];
      arme.push(linie(ab[0], ab[1], ab[1] + 45 + Math.random() * 45, a ? 10 : -10));
    }
    var mitte = haupt[Math.floor(haupt.length * 0.4)];
    f.blitz = { t: 0, punkte: haupt, arme: arme, mitte: [mitte[0], mitte[1]] };
    if (window.KLANG && KLANG.donner && !document.hidden) setTimeout(function () { if (z === s) KLANG.donner(0.8 + Math.random() * 0.4); }, 700 + Math.random() * 1100);
  }
  function wetterVorn(s, c, f, dt, W, H) {
    var sturm = s.wetter === "sturm";
    if (f.regen.length) {                                 // Regen als schräge Papierschnüre
      var schraeg = sturm ? 0.42 : 0.14;
      f.regen.forEach(function (t, i) {
        if (dt) { t.y += t.v * dt; t.x -= t.v * schraeg * dt; if (t.y > H + 20 || t.x < -30) f.regen[i] = regenNeu(false); }
        c.save(); c.translate(t.x, t.y); c.rotate(schraeg);
        c.beginPath(); c.moveTo(-0.7, -t.l / 2); c.lineTo(0.9, -t.l / 2 + 1); c.lineTo(0.6, t.l / 2); c.lineTo(-0.9, t.l / 2 - 1); c.closePath();
        fuellen(c, t.farbe, 0.75); c.restore();
      });
    }
    f.nebel.forEach(function (n) {                        // Nebel: helle Papierbänder treiben langsam vorbei
      n.x += n.v * dt; if (n.x - n.g > W) n.x = -n.g;
      PAPIER.risspfad(c, n.x, n.y, n.g, 26, 15, n.seed); fuellen(c, "weiss", 0.42);
      PAPIER.risspfad(c, n.x + n.g * 0.6, n.y + 14, n.g * 0.7, 18, 13, n.seed + 3); fuellen(c, "creme", 0.3);
    });
    // Gewitter: ein leuchtender Papierblitz HINTER dem Fenster (die Küche selbst bleibt, wie sie ist)
    if (sturm && !s.schneeStattRegen) {
      f.naechsterBlitz -= dt;
      if (!f.blitz && f.naechsterBlitz <= 0) blitzLos(s, f);
      if (f.blitz) {
        var b = f.blitz; b.t += dt;
        var hell = blitzHelligkeit(b.t);
        if (hell > 0.02) blitzMalen(c, b, hell, W, H);
        if (b.t > 0.8) { f.blitz = null; f.naechsterBlitz = 7 + Math.random() * 9; }
      }
    }
    f.scheibe.forEach(function (d, i) {                   // Tropfen an der Scheibe: sitzen, manche rinnen ruckweise hinunter
      if (dt) {
        d.alter += dt;
        if (!d.rinnt && Math.random() < dt * (sturm ? 0.09 : 0.04)) { d.rinnt = true; d.start = d.y; }
        if (d.rinnt) { d.schritt -= dt; if (d.schritt <= 0) { d.y += 3 + Math.random() * 5; d.x += (Math.random() - 0.5) * 1.5; d.schritt = 0.1 + Math.random() * 0.12; } }
        if (d.y > 330 || (d.rinnt && d.y - d.start > 90) || (s.wetter === "regenbogen" && d.alter > 40)) { f.scheibe[i] = tropfenNeu(); if (s.wetter === "regenbogen") f.scheibe[i].g *= 0.7; }
      }
      if (d.rinnt) { c.globalAlpha = 0.3; c.strokeStyle = "rgba(200,225,250,.9)"; c.lineWidth = d.g * 0.55; c.beginPath(); c.moveTo(d.x, d.start); c.lineTo(d.x, d.y); c.stroke(); }
      PAPIER.risspfad(c, d.x, d.y, d.g, d.g * 1.15, 9, d.seed); fuellen(c, "hellblau", 0.72);
      c.globalAlpha = 0.4; c.strokeStyle = "rgba(40,70,110,.6)"; c.lineWidth = 0.7; c.stroke();
      c.globalAlpha = 0.85; c.fillStyle = "#fffdf5"; c.beginPath(); c.arc(d.x - d.g * 0.3, d.y - d.g * 0.4, d.g * 0.28, 0, 6.283); c.fill();
    });
  }

  // ───────── Nachtgäste: Waldkauz, Sternschnuppen, Glühwürmchen ─────────
  var KAUZ = [160, 250];                                  // Körpermitte; sitzt auf dem Ast, wo tagsüber das Rotkehlchen ruht
  function kauzMalen(c, f, dt) {
    var x = KAUZ[0], y = KAUZ[1];
    if (dt) {
      f.naechstesBlinzeln -= dt; f.blinzeln = Math.max(0, f.blinzeln - dt); f.kauzRuf = Math.max(0, f.kauzRuf - dt);
      if (f.naechstesBlinzeln <= 0) { f.blinzeln = 0.18; f.naechstesBlinzeln = 2.5 + Math.random() * 4.5; }
      if (Math.random() < dt / 6) f.kopf = [-2.5, 0, 2.5][Math.floor(Math.random() * 3)];   // dreht ruckweise den Kopf
    }
    var hx = x + f.kopf, bob = f.kauzRuf > 0 ? Math.round(Math.sin(f.kauzRuf * 14)) * 1.5 : 0, hy = y - 31 + bob;
    PAPIER.risspfad(c, x, y, 19, 27, 15, 21); fuellen(c, "braun", 1);                       // Körper
    PAPIER.risspfad(c, x - 11, y + 2, 8, 21, 9, 22); fuellen(c, "ocker", 0.55);             // Flügel links
    PAPIER.risspfad(c, x + 11, y + 2, 8, 21, 9, 23); fuellen(c, "ocker", 0.45);             // Flügel rechts
    PAPIER.risspfad(c, x + 1, y + 6, 11, 17, 11, 24); fuellen(c, "creme", 0.85);            // Bauch
    c.globalAlpha = 0.7; c.strokeStyle = "#6b4a2b"; c.lineWidth = 1.1;                      // Federzeichnung
    [[-4, 0], [3, 3], [-2, 8], [4, 11], [-4, 15]].forEach(function (p) {
      c.beginPath(); c.moveTo(x + p[0] - 2.2, y + p[1] - 1.5); c.lineTo(x + p[0], y + p[1]); c.lineTo(x + p[0] + 2.2, y + p[1] - 1.5); c.stroke();
    });
    PAPIER.risspfad(c, hx, hy, 18, 16, 15, 25); fuellen(c, "braun", 1);                     // runder Kopf (Waldkauz: ohne Federohren)
    PAPIER.risspfad(c, hx - 7.5, hy + 1, 8, 8, 11, 26); fuellen(c, "ocker", 0.9);           // Gesichtsschleier
    PAPIER.risspfad(c, hx + 7.5, hy + 1, 8, 8, 11, 27); fuellen(c, "ocker", 0.9);
    [-7.5, 7.5].forEach(function (dx) {                                                         // große dunkle Augen
      if (f.blinzeln > 0) { c.globalAlpha = 1; c.strokeStyle = "#2a1a10"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(hx + dx - 3.5, hy + 1); c.quadraticCurveTo(hx + dx, hy + 3, hx + dx + 3.5, hy + 1); c.stroke(); }
      else {
        c.globalAlpha = 1; c.fillStyle = "#2a1a10"; c.beginPath(); c.arc(hx + dx, hy + 1, 4, 0, 6.283); c.fill();
        c.fillStyle = "rgba(255,250,235,.9)"; c.beginPath(); c.arc(hx + dx + 1.3, hy - 0.4, 1.2, 0, 6.283); c.fill();
      }
    });
    c.beginPath(); c.moveTo(hx - 2, hy + 4); c.lineTo(hx + 2, hy + 4); c.lineTo(hx, hy + 8.5); c.closePath(); fuellen(c, "gelb", 1);   // Schnabel
    c.globalAlpha = 1;
  }
  function sternschnuppe(s, f) {
    if (f.schnuppe) return;
    f.schnuppe = { t: 0, x: 120 + Math.random() * 60, y: 12 + Math.random() * 30 };
    if (s.klangBereit) klang("f_ev_glitzer", 0.12);      // ganz leise
  }
  function schnuppeMalen(s, c, f, dt) {
    if (!f.schnuppe) sternschnuppe(s, f);
    var sn = f.schnuppe; sn.t += dt;
    var p = sn.t / 0.9; if (p >= 1) { f.schnuppe = null; return; }
    var x = sn.x + p * 70, y = sn.y + p * 38;
    for (var i = 5; i >= 1; i--) {                        // Schweif aus kleinen Papierfetzen
      PAPIER.risspfad(c, x - i * 7, y - i * 3.8, 3.2 - i * 0.4, 2.2 - i * 0.3, 7, i + 40); fuellen(c, i % 2 ? "creme" : "gelb", (1 - p) * (0.9 - i * 0.14));
    }
    stern(c, x, y, 5.5); fuellen(c, "gelb", 1 - p * 0.6);
  }
  function gluehwuermchen(c, f, dt) {
    if (!f.gluehen.length) for (var i = 0; i < 6; i++) f.gluehen.push({ x: 100 + Math.random() * 90, y: 110 + Math.random() * 130, p: Math.random() * 6.3 });
    f.gluehen.forEach(function (g) {
      g.p += dt * 1.6; g.x += Math.sin(g.p * 0.7) * dt * 8; g.y += Math.cos(g.p * 0.5) * dt * 6;
      var a = Math.max(0, Math.sin(g.p)); if (a < 0.05) return;
      PAPIER.risspfad(c, g.x, g.y, 2.4, 2.4, 6, 50); fuellen(c, "gelb", a);
    });
  }

  // ───────── Antippen: kleine Antworten ─────────
  var ZONEN = [                                          // Bühnenkoordinaten; die Menüknöpfe liegen darüber und gehen vor
    { name: "tasse", e: [490, 690, 52, 58] }, { name: "katze", e: [770, 590, 80, 105] },
    { name: "omsi", e: [455, 380, 135, 140] }, { name: "omsi", e: [430, 610, 170, 80] },
    { name: "schuessel", e: [195, 715, 125, 68] }, { name: "eier", e: [95, 815, 95, 55] },
    { name: "kellen", e: [1150, 470, 58, 72] }, { name: "blumen", e: [100, 330, 100, 90] },
    { name: "fenster", r: FENSTER }
  ];
  function zoneBei(x, y, s) {
    var sm = SCHMUCK[s.bildSichtbar];
    if (sm) for (var q = 0; q < sm.zonen.length; q++) {   // was es nur in diesem Bild gibt (bzw. anders liegt)
      var e = sm.zonen[q][1], ex = (x - e[0]) / e[2], ey = (y - e[1]) / e[3];
      if (ex * ex + ey * ey <= 1) return sm.zonen[q][0];
    }
    if (s.bildSichtbar === "sommer" && s.schmuck && s.schmuck.tiere.length && s.schmuck.tiere[0].xs !== undefined) {
      var bz = s.schmuck.tiere[0]; if ((x - bz.xs) * (x - bz.xs) + (y - bz.ys) * (y - bz.ys) < 30 * 30) return "biene";
    }
    if (s.kauz && (x - KAUZ[0]) * (x - KAUZ[0]) + (y - KAUZ[1] + 20) * (y - KAUZ[1] + 20) < 34 * 34) return "kauz";
    var v = !s.vogelWeg && s.dekor.querySelector(".mk-vogel");
    if (v) {
      // menue.js setzt translate((fussX−81)·mass, (fussY−105,3)·mass): daraus die Füße; der Körper sitzt ~62 Bühnenpixel darüber
      var tr = /translate\(\s*([-\d.e]+)px\s*,\s*([-\d.e]+)px/.exec(v.style.transform || v.style.webkitTransform || "");
      var mass = s.buehne.offsetWidth / 1536;               // Maß wie in menue.js (ohne unsere Breiten-Skalierung)
      if (tr && mass) {
        var vx = parseFloat(tr[1]) / mass + 82, vy = parseFloat(tr[2]) / mass + 105.3 - 62;
        if ((x - vx) * (x - vx) + (y - vy) * (y - vy) < 40 * 40) return "vogel";
      }
    }
    for (var i = 0; i < ZONEN.length; i++) {
      var zo = ZONEN[i];
      if (zo.e) { var dx = (x - zo.e[0]) / zo.e[2], dy = (y - zo.e[1]) / zo.e[3]; if (dx * dx + dy * dy <= 1) return zo.name; }
      else if (x >= zo.r[0] && x <= zo.r[0] + zo.r[2] && y >= zo.r[1] && y <= zo.r[1] + zo.r[3]) return zo.name;
    }
    return null;
  }
  function klang(name, laut, ab, dauer) {
    if (!window.KULISSE) return;
    KLANG.entsperren();
    if (dauer && KULISSE.schnipsel) KULISSE.schnipsel(name, laut, ab || 0, dauer); else KULISSE.spiele(name, laut);
  }
  function reagieren(s, zone, x, y) {
    var jetzt = B.jetzt();
    if (s.zuletzt[zone] && jetzt - s.zuletzt[zone] < 900) return;
    s.zuletzt[zone] = jetzt;
    s.zaehler[zone] = (s.zaehler[zone] || 0) + 1;
    var n = s.zaehler[zone], f = s.fenster, nacht = s.zeit === "nacht";
    if (zone === "osterkorb") {
      klang(n % 2 ? "f_ev_ei" : "f_ev_eierkarton", 0.5); funken(s, x, y - 30, "dampf", ["rosa", "gelb", "hellblau", "hellgruen"], 5);
      if (n % 4 === 0) { funken(s, x, y - 40, "kueken", ["gelb"], 1); if (KLANG.piep) KLANG.piep(); }   // ab und zu schlüpft ein Küken
    } else if (zone === "kresse") {
      klang("f_ev_glitzer", 0.3); funken(s, x, y - 30, "blatt", ["hellgruen", "gruen"], 4);
    } else if (zone === "erdbeeren" || zone === "aepfel" || zone === "plaetzchen") {
      KLANG.entsperren(); if (KLANG.mampf) KLANG.mampf();
      funken(s, x, y - 30, zone === "plaetzchen" ? "stern" : "herz", zone === "erdbeeren" ? ["rot", "rosa"] : zone === "aepfel" ? ["rot", "hellgruen", "gelb"] : ["ocker", "braun", "gold"], 4);
    } else if (zone === "limonade") {
      klang("ev_glas", 0.4); for (var bl = 0; bl < 6; bl++) funken(s, x + (Math.random() - 0.5) * 30, y + 20, "dampf", ["weiss", "hellblau"], 1);
    } else if (zone === "biene") {
      KLANG.entsperren(); if (KLANG.summen) KLANG.summen(); funken(s, x, y - 10, "herz", ["gelb"], 2);
    } else if (zone === "kuerbis") {
      KLANG.entsperren(); if (KLANG.puff) KLANG.puff(); funken(s, x, y, "blatt", ["orange", "rot", "gelb"], 5);
    } else if (zone === "kranz") {
      klang("f_ev_glitzer", 0.3); funken(s, x, y - 60, "stern", ["gelb", "gold", "rot"], 5);
      if (s.bildSichtbar === "advent" && (s.zaehler.kranz || 0) % 3 === 0 && KLANG.mampf) KLANG.mampf();   // ein Herzplätzchen stibitzen
    } else if (zone === "ballons") {
      KLANG.entsperren(); if (KLANG.plopp) KLANG.plopp(); funken(s, x, y, "dampf", ["rot", "gelb", "blau", "gruen", "rosa"], 10);
    } else if (zone === "geschenke") {
      if (KLANG.rascheln) { KLANG.entsperren(); KLANG.rascheln(0.3); } funken(s, x, y - 30, "stern", ["gold", "rot", "blau"], 5);
    } else if (zone === "knallbonbons") {
      KLANG.entsperren(); if (KLANG.feuerwerk) KLANG.feuerwerk(0.45); funken(s, x, y - 20, "stern", ["gold", "gelb", "blau", "rot"], 10);
    } else if (zone === "klee") {
      klang("f_ev_glitzer", 0.3); funken(s, x, y - 30, "herz", ["gruen", "hellgruen"], 4);
    } else if (zone === "omsi" && s.bildSichtbar === "nacht") {   // sie schläft: nur leises Atmen und ein paar "Zzz"
      klang("f_amb_schlafatem", 0.4, 0, 3); funken(s, x + 30, y - 60, "zzz", ["hellblau", "weiss"], 3);
    } else if (zone === "omsi" && s.bildSichtbar === "geburtstag") {
      KLANG.entsperren(); if (KLANG.tusch) KLANG.tusch(); funken(s, x, y - 40, "dampf", ["rot", "gelb", "blau", "gruen", "rosa"], 8); funken(s, x, y - 30, "herz", ["rot", "rosa"], 3);
    } else if (zone === "katze") {
      if (nacht) { klang("f_ev_schnurren", 0.45, 0, 3); funken(s, x + 20, y - 50, "zzz", ["hellblau", "weiss", "hellblau"], 3); }   // müde: "Zzz"
      else { if (n % 3 === 0) klang("f_ev_miau", 0.5); else klang("f_ev_schnurren", 0.5, 0, 2.6); funken(s, x, y - 40, "herz", ["rot", "rosa", "rot"], 3); }
    } else if (zone === "omsi") {
      klang("f_ev_glitzer", 0.22);                         // leise – die Menümusik läuft ja
      funken(s, x, y - 30, "herz", ["rot", "rosa", "orange", "rot"], 5);
    } else if (zone === "kauz") {
      klang("f_ev_kauz", 0.45);
      if (f) { f.kauzRuf = 1.4; f.blinzeln = 0.25; }
      funken(s, x, y - 40, "note", ["ocker", "braun", "creme"], 2);
    } else if (zone === "vogel") {
      klang("f_ev_rotkehlchen", 0.45, 0.634, 1.7);
      funken(s, x, y - 20, "note", ["blau", "tiefblau", "gruen"], 3);
    } else if (zone === "tasse") {
      klang("f_ev_untertasse", 0.5); funken(s, x, y - 50, "dampf", ["weiss", "creme"], 4);
    } else if (zone === "schuessel") {
      klang("f_ev_schneebesen", 0.5, 0, 1.6); funken(s, x, y - 30, "dampf", ["creme", "weiss", "gelb"], 5);
    } else if (zone === "eier") {
      klang(n % 2 ? "f_ev_ei" : "f_ev_eierkarton", 0.5); funken(s, x, y - 20, "stern", ["gelb", "gold"], 3);
    } else if (zone === "kellen") {
      klang("f_ev_besteck", 0.45); funken(s, x, y - 20, "stern", ["gelb", "weiss"], 2);
    } else if (zone === "blumen") {
      klang("f_ev_glitzer", 0.35); funken(s, x, y, "blatt", ["gelb", "orange", "gelb"], 4);
    } else if (zone === "fenster") {                      // das Fenster antwortet passend zu dem, was draußen gerade ist
      if (s.wetter === "sturm" && !s.schneeStattRegen && f) { if (!f.blitz) blitzLos(s, f); }
      else if (s.wetter === "regen" && !s.schneeStattRegen && f) { KLANG.entsperren(); if (KLANG.spritzen) KLANG.spritzen(); for (var q = 0; q < 5; q++) f.scheibe.push(tropfenNeu()); if (f.scheibe.length > 30) f.scheibe.splice(0, f.scheibe.length - 30); }
      else if (s.wetter === "regenbogen") { klang("f_ev_glitzer", 0.25); funken(s, x, y, "stern", ["rot", "gelb", "blau", "gruen"], 4); }
      else if (nacht) {
        if (s.schnuppen && f) sternschnuppe(s, f); else klang("f_ev_glitzer", 0.15);
        funken(s, x, y, "stern", ["gelb", "creme"], 3);
      } else {
        if (s.jahr === "herbst" && KLANG.rascheln) { KLANG.entsperren(); KLANG.rascheln(0.35); } else if (s.wetter !== "nebel") klang("ev_voegel", 0.4, 0, 2.5);
        if (f && f.teilchen.length && f.teilchen.length < 34) for (var i = 0; i < 6; i++) { var t = teilchenNeu(s.jahr, FENSTER[2], FENSTER[3], false); t.vx += 30; f.teilchen.push(t); }
        if (f && s.jahr === "sommer" && !f.schmetterling) f.schmetterling = { x: -20, y: FENSTER[3] * 0.4, t: 0, farbe: "gelb" };
        if (f && s.wetter === "nebel") f.nebel.forEach(function (nb) { nb.x += 40; });
      }
    }
  }
  function funken(s, x, y, art, farben, anzahl) {
    for (var i = 0; i < anzahl; i++) {
      s.funken.push({ x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 30, vy: -(45 + Math.random() * 35),
                      g: art === "dampf" ? 10 + Math.random() * 8 : 11 + Math.random() * 6, t: -i * 0.12, dauer: 1.6 + Math.random() * 0.5,
                      art: art, farbe: farben[i % farben.length], dreh: (Math.random() - 0.5) * 0.6, seed: Math.floor(Math.random() * 99) });
    }
  }
  function funkenMalen(s, dt) {
    var cv = s.funkenCv, c = s.funkenC;
    if (!s.funken.length && s.funkenLeer) return;         // nichts unterwegs: Leinwand bleibt leer, keine Arbeit
    var r = cv.getBoundingClientRect(); if (!r.width) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), bw = Math.round(r.width * dpr), bh = Math.round(r.height * dpr);
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; c.__muster = null; }
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, bw, bh);
    s.funkenLeer = !s.funken.length;
    if (s.funkenLeer) return;
    var k = bw / 1536; c.setTransform(k, 0, 0, k, 0, 0);
    s.funken = s.funken.filter(function (p) {
      p.t += dt; if (p.t < 0) return true;
      p.x += (p.vx + Math.sin(p.t * 4 + p.seed) * 14) * dt; p.y += p.vy * dt; p.vy *= 0.985;
      var a = p.t < 0.15 ? p.t / 0.15 : Math.max(0, 1 - (p.t - p.dauer * 0.55) / (p.dauer * 0.45));
      var g = p.g * (p.t < 0.15 ? 0.6 + p.t / 0.15 * 0.4 : 1) * (p.art === "dampf" ? 1 + p.t * 0.6 : 1);
      c.save(); c.translate(p.x, p.y); c.rotate(p.dreh + Math.sin(p.t * 3) * 0.15);
      if (p.art === "zzz") { c.font = "bold " + Math.round(g * 1.6) + "px Georgia, serif"; c.globalAlpha = Math.min(1, a); c.fillStyle = PAPIER.muster(c, p.farbe); c.fillText("z", 0, 0); c.restore(); return p.t < p.dauer; }
      if (p.art === "kueken") {                           // Papierküken: gelber Ball mit Schnabel und Auge
        PAPIER.risspfad(c, 0, 0, g * 1.3, g * 1.15, 11, 21); fuellen(c, "gelb", Math.min(1, a));
        c.beginPath(); c.moveTo(g * 1.2, -g * 0.1); c.lineTo(g * 1.8, g * 0.1); c.lineTo(g * 1.2, g * 0.3); c.closePath(); fuellen(c, "orange", Math.min(1, a));
        c.globalAlpha = Math.min(1, a); c.fillStyle = "#2a1a10"; c.beginPath(); c.arc(g * 0.6, -g * 0.35, g * 0.16, 0, 6.283); c.fill();
        c.restore(); return p.t < p.dauer;
      }
      if (p.art === "herz") herz(c, 0, 0, g * 1.4); else if (p.art === "note") note(c, 0, 0, g * 1.3);
      else if (p.art === "stern") stern(c, 0, 0, g * 0.8); else if (p.art === "blatt") blatt(c, 0, 0, g * 0.8);
      else PAPIER.risspfad(c, 0, 0, g, g * 0.75, 9, p.seed);
      fuellen(c, p.farbe, Math.min(1, a) * (p.art === "dampf" ? 0.7 : 1));
      if (p.art !== "dampf") kante(c, Math.min(1, a) * 0.4);
      c.restore();
      return p.t < p.dauer;
    });
    c.globalAlpha = 1;
  }

  // ───────── Papiersymbole: zur Laufzeit aus denselben Seidenpapier-Texturen geschnitten wie der Rest der App ─────────
  var papierStil = null;
  function papierSymbole() {
    if (papierStil || !window.PAPIER) return;
    var zz = 11;
    function zufall() { zz = (zz * 9301 + 49297) % 233280; return zz / 233280; }
    function bild(w, h, malen) {
      var cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      var c = cv.getContext("2d"); malen(c, w, h); return cv.toDataURL("image/png");
    }
    // ein gerissenes Stück Papier: Punkte mit kleinen Rissen dazwischen, darunter ein Hauch Schatten, am Rand helle Fasern
    function stueck(c, pts, farbe, riss, ohneSchatten, tinte) {
      var weg = [];
      for (var i = 0; i < pts.length; i++) {
        var a = pts[i], b = pts[(i + 1) % pts.length];
        weg.push(a);
        var n = Math.max(1, Math.round(Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1])) / 7));
        for (var k = 1; k < n; k++) weg.push([a[0] + (b[0] - a[0]) * k / n + (zufall() - 0.5) * riss, a[1] + (b[1] - a[1]) * k / n + (zufall() - 0.5) * riss]);
      }
      function pfad(dx, dy) { c.beginPath(); weg.forEach(function (p, j) { if (j) c.lineTo(p[0] + dx, p[1] + dy); else c.moveTo(p[0] + dx, p[1] + dy); }); c.closePath(); }
      if (!ohneSchatten) { pfad(1.2, 2); c.globalAlpha = tinte ? 0.35 : 0.22; c.fillStyle = "#3a2612"; c.fill(); }
      pfad(0, 0); c.globalAlpha = 1; c.fillStyle = PAPIER.muster(c, farbe); c.fill();
      if (tinte) { c.globalAlpha = 0.7; c.lineWidth = 2.4; c.strokeStyle = tinte; c.stroke(); }          // dunklere Risskante
      else { c.globalAlpha = 0.55; c.lineWidth = 1.4; c.strokeStyle = "rgba(255,250,236,.9)"; c.stroke(); }
      c.globalAlpha = 1;
    }
    function kreis(cx, cy, r, n, schief) { var p = []; for (var i = 0; i < n; i++) { var a = i / n * 6.283 + (schief || 0); p.push([cx + Math.cos(a) * r * (0.9 + zufall() * 0.18), cy + Math.sin(a) * r * (0.9 + zufall() * 0.18)]); } return p; }
    var S = {};
    S.haus = bild(64, 64, function (c) {
      stueck(c, [[16, 30], [49, 29], [50, 56], [15, 57]], "creme", 2.5);                  // Wand
      stueck(c, [[5, 31], [32, 7], [59, 30], [52, 34], [32, 16], [12, 35]], "rot", 2.5);    // Dach
      stueck(c, [[43, 11], [49, 10], [50, 22], [43, 17]], "braun", 1.5);                     // Schornstein
      stueck(c, [[27, 57], [27, 41], [38, 40], [38, 56]], "blau", 2);                        // Tür
      stueck(c, [[41, 34], [47, 34], [47, 40], [41, 40]], "gelb", 1.2);                      // Fenster
    });
    S.pause = bild(64, 64, function (c) {
      stueck(c, [[16, 12], [28, 11], [29, 53], [17, 54]], "ocker", 3);
      stueck(c, [[36, 11], [48, 12], [47, 54], [35, 53]], "ocker", 3);
    });
    S.spiel = bild(64, 64, function (c) { stueck(c, [[17, 10], [54, 32], [16, 55]], "gruen", 3.5); });
    function noteMalen(c, farbe) {
      stueck(c, [[37, 10], [43, 9], [44, 46], [38, 47]], farbe, 1.5);                        // Hals
      stueck(c, [[42, 9], [55, 17], [54, 30], [48, 22], [43, 20]], farbe, 2);                 // Fähnchen
      stueck(c, kreis(30, 47, 10, 11, 0.3), farbe, 2);                                        // Kopf
    }
    S.note = bild(64, 64, function (c) { noteMalen(c, "blau"); });
    S.noteAus = bild(64, 64, function (c) { noteMalen(c, "grau"); stueck(c, [[9, 52], [52, 9], [57, 14], [14, 57]], "rot", 2.5); });
    S.zauber = bild(64, 64, function (c) {
      stueck(c, kreis(25, 23, 14, 12), "gelb", 3);                                           // Sonne
      stueck(c, kreis(20, 44, 11, 10), "weiss", 2.5); stueck(c, kreis(34, 39, 14, 11), "weiss", 2.5); stueck(c, kreis(47, 45, 10, 10), "weiss", 2.5);   // Wolke
      stueck(c, [[11, 46], [55, 45], [54, 54], [12, 55]], "hellblau", 2.5);
    });
    S.offline = bild(64, 64, function (c) {
      stueck(c, [[10, 32], [54, 31], [55, 56], [9, 57]], "ocker", 2.5);
      stueck(c, [[27, 6], [37, 6], [37, 25], [46, 25], [32, 42], [18, 26], [27, 26]], "gruen", 2);
    });
    S.box = bild(48, 48, function (c) { stueck(c, [[7, 8], [40, 6], [42, 40], [8, 42]], "weiss", 3, false, "#8a6a44"); });
    S.boxHaken = bild(48, 48, function (c) {
      stueck(c, [[7, 8], [40, 6], [42, 40], [8, 42]], "weiss", 3, false, "#8a6a44");
      stueck(c, [[9, 24], [16, 19], [22, 29], [39, 4], [46, 9], [23, 41]], "rot", 2.5);       // Häkchen aus rotem Seidenpapier
    });
    function chip(farbe) { return bild(300, 92, function (c) { stueck(c, [[6, 8], [96, 3], [180, 8], [294, 4], [297, 46], [294, 86], [200, 89], [100, 85], [5, 88], [3, 46]], farbe, 4, true); }); }
    S.chip = chip("creme"); S.chipO = chip("orange"); S.chipG = chip("gruen"); S.chipB = chip("blau"); S.chipR = chip("rot");
    var u = function (d) { return "url(" + d + ")"; };
    var css = [
      ".mk-fuss .kl-fk-haus:before{background-image:" + u(S.haus) + "}",
      ".mk-fuss .kl-fk-bewegung:before{background-image:" + u(S.pause) + "}",
      ".mk-fuss .kl-fk-bewegung[aria-pressed=true]:before{background-image:" + u(S.spiel) + "}",
      ".mk-fuss .kl-fk-musik:before{background-image:" + u(S.note) + "}",
      ".mk-fuss .kl-fk-musik[aria-pressed=true]:before{background-image:" + u(S.noteAus) + "}",
      ".mk-fuss .kl-fk-einst:before{background-image:" + u(S.zauber) + "}",
      ".mk-fuss .kl-fk-offline:before{background-image:" + u(S.offline) + "}",
      ".kl-einst .kl-schalter:before{background-image:" + u(S.box) + "}",
      ".kl-einst .kl-schalter[aria-pressed=true]:before{background-image:" + u(S.boxHaken) + "}",
      ".kl-einst .kl-chip{background-image:" + u(S.chip) + "}",
      ".kl-einst .kl-chip[aria-checked=true][data-farbe=orange]{background-image:" + u(S.chipO) + "}",
      ".kl-einst .kl-chip[aria-checked=true][data-farbe=gruen]{background-image:" + u(S.chipG) + "}",
      ".kl-einst .kl-chip[aria-checked=true][data-farbe=blau]{background-image:" + u(S.chipB) + "}",
      ".kl-einst .kl-chip[aria-checked=true][data-farbe=rot]{background-image:" + u(S.chipR) + "}",
      ".kl-einst .kl-chip.kl-fertig{background-image:" + u(S.chipR) + "}"
    ].join("\n");
    papierStil = document.createElement("style"); papierStil.textContent = css;
    document.head.appendChild(papierStil);
  }

  // ───────── Fußleiste: Papierstreifen mit eigenen Symbolen + "Einstellungen" ─────────
  function fussleiste(s) {
    var fuss = s.wurzel.querySelector(".mk-fuss"); if (!fuss) return;
    papierSymbole();
    fuss.className += " kl-fuss";
    [].forEach.call(fuss.querySelectorAll("button"), function (b) {
      if (/Gartentor/.test(b.textContent)) { b.textContent = "Zurück vor’s Haus"; b.className += " kl-fk kl-fk-haus"; }
      else if (/mk-bewegung/.test(b.className)) b.className += " kl-fk kl-fk-bewegung";
      else if (/musik-schalter/.test(b.className)) b.className += " kl-fk kl-fk-musik";
      else if (/Offline/.test(b.textContent)) b.className += " kl-fk kl-fk-offline";
    });
    var e = B.el("button", "kl-fk kl-fk-einst", fuss, "Einstellungen");
    e.type = "button"; e.setAttribute("aria-haspopup", "dialog");
    // Schrift aus dunklem Seidenpapier (wie die Papierbuchstaben im Titel, nur ruhig und gut lesbar)
    [].forEach.call(fuss.querySelectorAll(".kl-fk"), function (b) { PAPIER.schriftFuellen(b, "braun", { akzent: "schwarz" }); b.style.backgroundSize = "120px"; });
    B.tippen(e, function (ev) { ev.stopPropagation(); einstellungenOeffnen(s); });
  }

  // ───────── Das Blatt "Einstellungen" ─────────
  var GRUPPEN = [
    { titel: "Tageszeit im Fenster", schluessel: "zeit", farbe: "orange", wahl: [["aus", "Wie gemalt"], ["uhr", "Mit der Uhr"], ["morgen", "Morgenrot"], ["tag", "Tag"], ["abend", "Abendrot"], ["nacht", "Nacht"]] },
    { titel: "Jahreszeit", schluessel: "jahr", farbe: "gruen", wahl: [["aus", "Aus"], ["kalender", "Mit dem Kalender"], ["fruehling", "Frühling"], ["sommer", "Sommer"], ["herbst", "Herbst"], ["winter", "Winter"]] },
    { titel: "Wetter", schluessel: "wetter", farbe: "blau", wahl: [["aus", "Aus"], ["wechselnd", "Wechselnd"], ["regen", "Regen"], ["sturm", "Gewitter"], ["nebel", "Nebel"], ["regenbogen", "Regenbogen"]] },
    { titel: "Anlass", schluessel: "fest", farbe: "rot", wahl: [["aus", "Keiner"], ["kalender", "Mit dem Kalender"], ["advent", "Advent"], ["geburtstag", "Geburtstag"], ["silvester", "Silvester"]] }
  ];
  var SCHALTER = [
    { titel: "Stimmung", teile: [["licht", "Licht in der Küche"], ["nachtKueche", "Nachts schläft die Küche"]] },
    { titel: "Nachtgäste", teile: [["kauz", "Waldkauz"], ["schnuppen", "Sternschnuppen"], ["gluehen", "Glühwürmchen"]] },
    { titel: "Kleine Überraschungen", teile: [["antippen", "Dinge antworten beim Antippen"]] }
  ];
  function rissKante(el, seed) {                        // gerissener Papierrand per clip-path (mit -webkit-)
    var p = [], zf = seed, i;
    function r() { zf = (zf * 9301 + 49297) % 233280; return zf / 233280; }
    for (i = 0; i <= 16; i++) p.push((i / 16 * 100).toFixed(1) + "% " + (r() * 1.2).toFixed(2) + "%");
    for (i = 0; i <= 24; i++) p.push((100 - r() * 1.1).toFixed(2) + "% " + (i / 24 * 100).toFixed(1) + "%");
    for (i = 16; i >= 0; i--) p.push((i / 16 * 100).toFixed(1) + "% " + (100 - r() * 1.2).toFixed(2) + "%");
    for (i = 24; i >= 0; i--) p.push((r() * 1.1).toFixed(2) + "% " + (i / 24 * 100).toFixed(1) + "%");
    var poly = "polygon(" + p.join(",") + ")";
    el.style.webkitClipPath = poly; el.style.clipPath = poly;
  }
  function einstellungenOeffnen(s) {
    if (s.einstBlatt) return;
    KLANG.entsperren(); if (window.KULISSE) KULISSE.spiele("f_ev_karte_auf", 0.35, KLANG.blaettern);
    var grund = B.el("div", "kl-einst-grund", document.body);
    var huelle = B.el("div", "kl-einst", document.body);
    huelle.setAttribute("role", "dialog"); huelle.setAttribute("aria-label", "Einstellungen");
    var blattEl = B.el("div", "kl-einst-blatt", huelle);
    PAPIER.hinterlegen(blattEl, "creme", { kachel: 320 }); rissKante(blattEl, 7);
    B.el("span", "kl-einst-klebe", huelle);
    B.el("h2", "kl-einst-titel", blattEl, "Einstellungen");
    B.el("p", "kl-einst-unter", blattEl, "Küchenzauber – Himmel, Wetter und Licht rund um Omsis Küche. Alles ist frei wählbar; es gilt immer nur eine Wahl je Reihe.");
    var knoepfe = [], hinweise = {};
    GRUPPEN.forEach(function (g) {
      var box = B.el("div", "kl-gruppe", blattEl);
      B.el("h3", "", box, g.titel);
      var reihe = B.el("div", "kl-chips", box); reihe.setAttribute("role", "radiogroup"); reihe.setAttribute("aria-label", g.titel);
      g.wahl.forEach(function (w) {
        var b = B.el("button", "kl-chip", reihe, w[1]); b.type = "button"; b.setAttribute("role", "radio"); b.setAttribute("data-farbe", g.farbe);
        knoepfe.push({ el: b, k: g.schluessel, v: w[0] });
        B.tippen(b, function (ev) { ev.stopPropagation(); if (b.getAttribute("aria-disabled") === "true") return; KLANG.tippen(); KL.setzen(g.schluessel, w[0]); });
      });
      hinweise[g.schluessel] = B.el("p", "kl-hinweis", box, "");
    });
    SCHALTER.forEach(function (g) {
      var box = B.el("div", "kl-gruppe", blattEl);
      B.el("h3", "", box, g.titel);
      var reihe = B.el("div", "kl-chips", box);
      g.teile.forEach(function (t) {
        var b = B.el("button", "kl-chip kl-schalter", reihe, t[1]); b.type = "button"; b.setAttribute("data-farbe", "rot");
        knoepfe.push({ el: b, k: t[0], schalter: true });
        B.tippen(b, function (ev) { ev.stopPropagation(); KLANG.tippen(); KL.setzen(t[0], !einst()[t[0]]); });
      });
      if (g.titel === "Nachtgäste") hinweise.nacht = B.el("p", "kl-hinweis", box, "");
    });
    var unten = B.el("div", "kl-einst-fuss", blattEl);
    var ausK = B.el("button", "kl-chip kl-alles-aus", unten, "Alles aus"); ausK.type = "button";
    var fertig = B.el("button", "kl-chip kl-fertig", unten, "Fertig"); fertig.type = "button";
    B.tippen(ausK, function (ev) { ev.stopPropagation(); KLANG.tippen(); KL.allesAus(); });
    function zu() {
      if (!s.einstBlatt) return;
      s.einstBlatt = null; document.removeEventListener("keydown", taste, false);
      huelle.className += " weg"; grund.parentNode.removeChild(grund);
      if (KLANG.blaettern) KLANG.blaettern();
      setTimeout(function () { if (huelle.parentNode) huelle.parentNode.removeChild(huelle); }, 320);
    }
    function taste(ev) { if (ev.keyCode === 27) zu(); }
    document.addEventListener("keydown", taste, false);
    B.tippen(fertig, function (ev) { ev.stopPropagation(); zu(); });
    B.tippen(grund, function (ev) { ev.stopPropagation(); zu(); });
    s.einstBlatt = {
      zu: zu,
      zeigen: function () {
        var e = einst();
        knoepfe.forEach(function (k) {
          var an = k.schalter ? !!e[k.k] : e[k.k] === k.v;
          k.el.setAttribute(k.schalter ? "aria-pressed" : "aria-checked", an ? "true" : "false");
          var aus = k.k === "wetter" && k.v === "regenbogen" && e.zeit === "nacht";
          k.el.setAttribute("aria-disabled", aus ? "true" : "false");
        });
        var hw = [];
        if (e.zeit === "nacht") hw.push("Einen Regenbogen gibt es nur bei Tag.");
        if ((e.jahr === "winter" || (e.jahr === "kalender" && kalenderJahr() === "winter")) && (e.wetter === "regen" || e.wetter === "sturm")) hw.push("Im Winter wird daraus Schneetreiben.");
        if (e.wetter === "wechselnd") hw.push("Wechselt alle drei Stunden, passend zur Jahreszeit.");
        hinweise.wetter.textContent = hw.join(" ");
        hinweise.zeit.textContent = e.zeit === "uhr" ? "Morgenrot, Tag, Abendrot und Nacht – wie draußen." : "";
        var fh = [];
        if (e.fest === "kalender") fh.push("Advent ab dem 1. Advent, Silvester am 31.12. und 1.1." + (B.E && B.E.geburtstag ? " Und an Omsis Geburtstag." : ""));
        if (e.fest === "advent" || e.fest === "kalender") fh.push("Am Kranz brennt jeden Adventssonntag eine Kerze mehr.");
        if (e.zeit === "nacht" && e.nachtKueche && (e.fest !== "aus" || e.jahr !== "aus")) fh.push("Nachts schläft die Küche – der Schmuck zeigt sich wieder am Tag.");
        hinweise.fest.textContent = fh.join(" ");
        hinweise.jahr.textContent = (e.jahr === "kalender" ? "Jetzt: " + { fruehling: "Frühling", sommer: "Sommer", herbst: "Herbst", winter: "Winter" }[kalenderJahr()] + ". " : "") +
          (e.jahr !== "aus" ? "Die ganze Küche schmückt sich mit." : "");
        hinweise.nacht.textContent = "Zeigen sich, wenn im Fenster Nacht ist" + (e.gluehen ? " – Glühwürmchen nur in milden, klaren Nächten." : ".");
      }
    };
    s.einstBlatt.zeigen();
    B.frame(function () { B.frame(function () { huelle.className += " da"; }); });
  }

  // ───────── Lauf ─────────
  KL.an = function (wurzel) {
    KL.aus();
    var buehne = wurzel && wurzel.querySelector(".mk-buehne"), dekor = buehne && buehne.querySelector(".mk-dekor");
    if (!buehne || !dekor || !window.PAPIER) return;
    var s = z = { wurzel: wurzel, buehne: buehne, dekor: dekor, seite: wurzel.querySelector(".mk-seite") || wurzel,
                  funken: [], zuletzt: {}, zaehler: {}, letzt: 0, stundeGeprueft: 0, kauzTakt: 40 };
    fensterBauen(s);
    s.licht = B.el("div", "kl-licht", dekor); s.lampe = B.el("div", "kl-lampe", dekor);
    s.licht.setAttribute("aria-hidden", "true"); s.lampe.setAttribute("aria-hidden", "true");
    s.schmuckCv = document.createElement("canvas"); s.schmuckCv.className = "kl-schmuck"; s.schmuckCv.setAttribute("aria-hidden", "true");
    dekor.appendChild(s.schmuckCv); s.schmuckC = s.schmuckCv.getContext("2d");
    s.funkenCv = document.createElement("canvas"); s.funkenCv.className = "kl-funken"; s.funkenCv.setAttribute("aria-hidden", "true");
    dekor.appendChild(s.funkenCv); s.funkenC = s.funkenCv.getContext("2d");
    neuAnwenden(s);
    fussleiste(s);
    // Keine hellen Streifen neben der Küche: im Querformat die Bühne auf volle Breite ziehen (höchstens so viel, wie der
    // Papierstreifen der Fußleiste unten überdecken darf – dort ist nur Tisch). menue.js rechnet weiter mit seinem Maß.
    var fussEl = wurzel.querySelector(".mk-fuss");
    s.breit = function () {
      if (z !== s) return;
      var w = buehne.offsetWidth, h = buehne.offsetHeight, cw = s.seite.clientWidth, fh = fussEl ? fussEl.offsetHeight : 0;
      var f = window.innerHeight > window.innerWidth || !w || !h ? 1 : Math.min(cw / w, 1 + Math.max(0, fh - 8) / h);
      buehne.style.webkitTransformOrigin = buehne.style.transformOrigin = "50% 0";
      B.transform(buehne, f > 1.002 ? "scale(" + f.toFixed(4) + ")" : "");
    };
    s.breit();
    window.addEventListener("resize", s.breit, false);
    s.tippen = function (ev) {
      if (z !== s || !s.einst.antippen || (ev.target && ev.target.closest && ev.target.closest("button, a, input"))) return;
      var br = buehne.getBoundingClientRect(); if (!br.width) return;
      var x = (ev.clientX - br.left) / br.width * 1536, y = (ev.clientY - br.top) / br.height * 1024;
      var zone = zoneBei(x, y, s);
      if (zone) reagieren(s, zone, x, y);
    };
    buehne.addEventListener("click", s.tippen, false);
    function ruhig() { return document.hidden || /\bmk-ruhig\b/.test(s.seite.className); }
    s.schritt = function () {
      if (z !== s) return;
      var jetzt = B.jetzt(), dt = s.letzt ? Math.min(0.1, (jetzt - s.letzt) / 1000) : 0;
      if (jetzt - s.stundeGeprueft > 60000) {             // Uhr/Kalender/Wetter wechseln, während die Küche offen ist
        s.stundeGeprueft = jetzt;
        var zt = KL.tageszeit(), jz = KL.jahreszeit();
        if (zt !== s.zeit || jz !== s.jahr || KL.wetter(zt, jz) !== s.wetter) neuAnwenden(s);
      }
      var still = ruhig();
      if (!still && jetzt - s.letzt < 45) { s.frame = B.frame(s.schritt); return; }   // ~22 Bilder/s genügen für Papier
      if (!still) {
        klaengeStarten(s);                                // sobald der Ton freigegeben ist (erstes Tippen)
        if (s.kauz && dt) {                               // der Kauz ruft ab und zu von selbst
          s.kauzTakt -= dt;
          if (s.kauzTakt <= 0) { s.kauzTakt = 35 + Math.random() * 35; if (s.klangBereit) klang("f_ev_kauz", 0.2); s.fenster.kauzRuf = 1.2; }
        }
      }
      if (s.fenster) fensterMalen(s, still ? 0 : dt);
      schmuckMalen(s, still ? 0 : dt);
      funkenMalen(s, still ? 0.05 : dt);
      s.letzt = jetzt;
      if (still || (!aktiv(s) && !s.funken.length)) s.timer = setTimeout(function () { s.letzt = 0; s.schritt(); }, still ? 600 : 250);
      else s.frame = B.frame(s.schritt);
    };
    s.schritt();
  };
  KL.aus = function () {
    if (!z) return;
    var s = z; z = null;
    B.frameStopp(s.frame); clearTimeout(s.timer);
    if (s.einstBlatt) s.einstBlatt.zu();
    if (window.KLANG) { if (KLANG.regen) KLANG.regen(0); if (KLANG.wind) KLANG.wind(0); }
    if (s.fenster && s.fenster.vogel) s.fenster.vogel.style.visibility = "";
    s.buehne.removeEventListener("click", s.tippen, false);
    window.removeEventListener("resize", s.breit, false);
  };
  KL.vogelWeg = function () { return !!(z && z.vogelWeg); };            // für die Klangkulisse: dann kein Zwitschern
  KL.zustand = function () { return z; };
  KL.zoneBei = function (x, y) { return z ? zoneBei(x, y, z) : null; };   // für Tests
})();
