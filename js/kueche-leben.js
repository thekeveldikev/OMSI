/* Lebendige Küche – das Fenster lebt mit Tages- und Jahreszeit, Dinge in der Küche antworten aufs Antippen.
   Hängt sich von außen an Codex' Küchenbühne (menue.js bleibt dafür unberührt): .mk-buehne, .mk-dekor,
   .mk-himmel, .mk-sonne, .mk-vogel und die Klasse mk-ruhig ("Bewegung anhalten").
   Alles aus Seidenpapier (PAPIER), Klänge aus der Klangkulisse (echte Aufnahmen). ES5 für ältere iPads.
   Zum Ausprobieren: index.html?zeit=nacht|morgen|tag|abend&jahr=winter|fruehling|sommer|herbst */
(function () {
  var KL = window.KUECHE_LEBEN = {};
  var z = null;
  var FENSTER = [0, 0, 276, 461];                        // wie .mk-himmel (18 % × 45 % der Bühne 1536×1024)

  function param(n) { var m = new RegExp("[?&]" + n + "=(\\w+)").exec(window.location.search); return m ? m[1] : null; }
  KL.tageszeit = function () {
    var p = param("zeit"); if (p) return p;
    var d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    return h < 5.5 ? "nacht" : h < 8.5 ? "morgen" : h < 17.5 ? "tag" : h < 21 ? "abend" : "nacht";
  };
  KL.jahreszeit = function () {
    var p = param("jahr"); if (p) return p;
    var m = new Date().getMonth();
    return m <= 1 || m === 11 ? "winter" : m <= 4 ? "fruehling" : m <= 7 ? "sommer" : "herbst";
  };

  // Wetter vor dem Fenster: wechselt alle 3 Stunden, passend zur Jahreszeit (für alle gleich, kein Zufall beim Neuladen)
  function zufallAus(n) { var x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); }
  var WETTER_TAFEL = {
    fruehling: [["klar", 0.5], ["regen", 0.25], ["regenbogen", 0.12], ["nebel", 0.08], ["sturm", 0.05]],
    sommer:    [["klar", 0.6], ["sturm", 0.15], ["regen", 0.12], ["regenbogen", 0.08], ["nebel", 0.05]],
    herbst:    [["klar", 0.45], ["regen", 0.25], ["sturm", 0.15], ["nebel", 0.15]],
    winter:    [["klar", 0.7], ["nebel", 0.15], ["sturm", 0.15]]
  };
  KL.wetter = function (zeit, jahr) {
    var p = param("wetter"), w = "klar";
    if (p) w = p;
    else {
      var d = new Date(), tag = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
      var r = zufallAus(d.getFullYear() * 10000 + tag * 10 + Math.floor(d.getHours() / 3)), summe = 0, tafel = WETTER_TAFEL[jahr] || [["klar", 1]];
      for (var i = 0; i < tafel.length; i++) { summe += tafel[i][1]; if (r < summe) { w = tafel[i][0]; break; } }
    }
    if (w === "regenbogen" && zeit === "nacht") w = "klar";
    return w;
  };

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
    c.beginPath(); c.ellipse ? c.ellipse(x, y, g * 0.32, g * 0.24, -0.4, 0, Math.PI * 2) : c.arc(x, y, g * 0.28, 0, Math.PI * 2);
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

  // ───────── Das Fenster: Himmel nach Tageszeit, Wetter nach Jahreszeit ─────────
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
    var himmel = s.dekor.querySelector(".mk-himmel"), sonne = s.dekor.querySelector(".mk-sonne");
    if (!himmel) return;
    var cv = document.createElement("canvas"); cv.className = "kl-fenster"; cv.setAttribute("aria-hidden", "true");
    var basis = s.dekor.querySelector(".mk-basis");
    s.dekor.insertBefore(cv, basis || null);             // über Himmel, Sonne und Wolke – unter dem Küchenbild
    s.fenster = { cv: cv, c: cv.getContext("2d"), sonne: sonne, wolke: s.dekor.querySelector(".mk-wolke"), vogel: s.dekor.querySelector(".mk-vogel"),
                  teilchen: [], schmetterling: null, sterne: [], schnuppe: null, gluehen: [], blinzeln: 0, naechstesBlinzeln: 3, kauzRuf: 0, kopf: 0, w: 0, h: 0 };
    var f = s.fenster;
    // Sterne nur in den freien Scheiben (Bühnenpixel; Fensterkreuz und Blätter decken den Rest)
    [[112, 18], [168, 34], [140, 64], [186, 10], [108, 112], [180, 196], [126, 228], [152, 104], [186, 132], [58, 30]].forEach(function (p, i) {
      f.sterne.push({ x: p[0], y: p[1], g: 3 + Math.random() * 3, an: Math.random(), seed: i });
    });
    tageszeitAnwenden(s);
  }
  var W0 = 276;
  function regenNeu(irgendwo) {
    return { x: Math.random() * 330 - 20, y: irgendwo ? Math.random() * 470 : -20 - Math.random() * 40, l: 9 + Math.random() * 8, v: 300 + Math.random() * 90, farbe: Math.random() < 0.7 ? "hellblau" : "weiss" };
  }
  function tropfenNeu() {                                // Tropfen auf der Scheibe (nur wo Glas ist, der Rest liegt hinter Rahmen/Blättern)
    return { x: 8 + Math.random() * 186, y: 8 + Math.random() * 300, g: 2.2 + Math.random() * 3.4, seed: Math.floor(Math.random() * 90),
             rinnt: false, start: 0, schritt: 0, alter: 0 };
  }
  // Lichtstimmung für die ganze Küche (über dem Bild, unter den Schildern): morgens warm, abends golden,
  // nachts bläulich mit warmem Lampenschein, bei Regen grauer; der Blitz erhellt kurz alles
  function lichtAnwenden(s) {
    var t = s.licht, l = s.lampe; if (!t) return;
    var farbe = { morgen: "#fff0e2", abend: "#ffe1c2", nacht: "#c9d1ef" }[s.zeit] || "";
    if (s.wetter === "regen" || s.wetter === "nebel") farbe = s.zeit === "nacht" ? "#bcc5e6" : s.zeit === "tag" ? "#e9ecf0" : farbe;
    if (s.wetter === "sturm") farbe = s.zeit === "nacht" ? "#b3bcdf" : "#dde1e9";
    t.style.backgroundColor = farbe || "transparent"; t.style.display = farbe ? "" : "none";
    l.style.display = s.zeit === "nacht" || s.zeit === "abend" ? "" : "none";
    l.style.opacity = s.zeit === "nacht" ? "1" : "0.55";
  }
  function tageszeitAnwenden(s) {
    var f = s.fenster; if (!f) return;
    s.zeit = KL.tageszeit(); s.jahr = KL.jahreszeit();
    // Sonne: morgens/abends tief (Codex' Papiersonne wird nur verschoben), nachts weg
    if (f.sonne) {
      f.sonne.style.visibility = s.zeit === "nacht" ? "hidden" : "";
      B.transform(f.sonne, s.zeit === "morgen" ? "translate(-30%,150%)" : s.zeit === "abend" ? "translate(40%,210%) scale(1.15)" : "none");
    }
    if (f.wolke) f.wolke.style.opacity = s.zeit === "nacht" ? "0.25" : "";
    if (f.vogel) f.vogel.style.visibility = s.zeit === "nacht" ? "hidden" : "";   // nachts schläft das Rotkehlchen
    s.wetter = KL.wetter(s.zeit, s.jahr);
    var nass = s.wetter === "regen" || s.wetter === "sturm";
    if (f.sonne && nass) f.sonne.style.visibility = "hidden";
    if (f.wolke && nass) f.wolke.style.opacity = "";
    f.regen = []; f.scheibe = []; f.wolken = []; f.blitz = null; f.naechsterBlitz = 3 + Math.random() * 4; f.nebel = [];
    if (nass) {
      var viele = s.wetter === "sturm" ? (s.jahr === "winter" ? 0 : 70) : 42;          // Winter-Sturm: Schneegestöber statt Regen
      for (var r = 0; r < viele; r++) f.regen.push(regenNeu(true));
      if (s.jahr !== "winter") for (var q = 0; q < (s.wetter === "sturm" ? 22 : 14); q++) f.scheibe.push(tropfenNeu());
      for (var w = 0; w < 3; w++) f.wolken.push({ x: w * 110 - 40, y: 20 + w * 34, g: 46 + w * 8, seed: 60 + w });
    }
    if (s.wetter === "regenbogen") for (var q2 = 0; q2 < 6; q2++) f.scheibe.push(tropfenNeu());   // die letzten Tropfen trocknen noch
    if (s.wetter === "nebel") for (var n2 = 0; n2 < 4; n2++) f.nebel.push({ x: Math.random() * W0, y: 150 + n2 * 70, g: 120 + Math.random() * 60, v: 5 + Math.random() * 5, seed: 70 + n2 });
    lichtAnwenden(s);
    if (window.KLANG && KLANG.regen) KLANG.regen(0);
    s.regenKlang = false;
    var n = s.jahr === "winter" ? 30 : s.jahr === "herbst" ? 10 : s.jahr === "fruehling" ? 9 : 0;
    f.teilchen = [];
    for (var i = 0; i < n; i++) f.teilchen.push(teilchenNeu(s.jahr, FENSTER[2], FENSTER[3], true));
  }
  function fensterMalen(s, dt, uhr) {
    var f = s.fenster, cv = f.cv, c = f.c;
    var r = cv.getBoundingClientRect(); if (!r.width) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var bw = Math.round(r.width * dpr), bh = Math.round(r.height * dpr);
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; c.__muster = null; }
    var k = bw / FENSTER[2];                              // Bühnenpixel → Leinwandpixel
    var W = FENSTER[2], H = FENSTER[3];
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, bw, bh); c.setTransform(k, 0, 0, k, 0, 0);
    // Himmel: morgens Rosa/Orange von unten, abends Orange/Lila, nachts tiefblaues Papier
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
      if (f.schnuppe || Math.random() < dt / 40) schnuppeMalen(c, f, dt);           // ab und zu eine Sternschnuppe
      if (s.jahr === "sommer" && s.wetter === "klar") gluehwuermchen(c, f, dt);
    } else if (s.zeit === "morgen" || s.zeit === "abend") {
      // Papierlagen wie ein Sonnenauf-/-untergang: oben kühl, zum Horizont hin warm und hell
      var abend = s.zeit === "abend";
      var lagen = abend ? [["lila", 0.3, 0.5, 0.5, 1.0], ["rosa", 0.5, 0.74, 0.46, 3], ["orange", 0.66, 0.93, 0.32, 5], ["gelb", 0.6, 1.04, 0.16, 8]]
                        : [["rosa", 0.26, 0.5, 0.5, 1.0], ["orange", 0.42, 0.9, 0.3, 5], ["gelb", 0.5, 1.02, 0.17, 8]];
      lagen.forEach(function (l) {
        c.fillStyle = PAPIER.muster(c, l[0]); c.globalAlpha = l[1];
        if (l[4] === 1.0) c.fillRect(0, 0, W, H);
        else { PAPIER.risspfad(c, W * 0.5, H * l[2], W * 0.98, H * l[3], 15, l[4]); c.fill(); }
      });
    }
    wetterHimmel(s, c, f, dt, W, H);
    // Wetter der Jahreszeit
    var art = s.jahr, wind = s.wetter === "sturm" ? 70 : s.wetter === "regen" ? 12 : 0;
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
    if (s.zeit === "nacht") kauzMalen(c, f, dt);
    wetterVorn(s, c, f, dt, W, H);
    c.globalAlpha = 1;
  }

  // ───────── Wetter: Regen, Sturm mit Blitz, Nebel, Regenbogen ─────────
  function wetterHimmel(s, c, f, dt, W, H) {
    var nacht = s.zeit === "nacht";
    if (s.wetter === "regen" || s.wetter === "sturm") {
      c.fillStyle = PAPIER.muster(c, "grau"); c.globalAlpha = s.wetter === "sturm" ? (nacht ? 0.4 : 0.62) : (nacht ? 0.3 : 0.48); c.fillRect(0, 0, W, H);
      if (s.wetter === "sturm") { c.fillStyle = PAPIER.muster(c, "tiefblau"); c.globalAlpha = nacht ? 0.35 : 0.22; c.fillRect(0, 0, W, H); }
      f.wolken.forEach(function (w) {                      // dicke graue Papierwolken ziehen vorbei
        w.x += dt * (s.wetter === "sturm" ? 26 : 8); if (w.x > W + 80) w.x = -90;
        PAPIER.risspfad(c, w.x, w.y, w.g, w.g * 0.42, 13, w.seed); fuellen(c, "grau", nacht ? 0.8 : 0.9);
        PAPIER.risspfad(c, w.x + w.g * 0.35, w.y - w.g * 0.18, w.g * 0.55, w.g * 0.3, 11, w.seed + 5); fuellen(c, nacht ? "tiefblau" : "weiss", nacht ? 0.35 : 0.3);
      });
    } else if (s.wetter === "regenbogen") {               // Papier-Regenbogen: sechs gerissene Bögen
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
  function wetterVorn(s, c, f, dt, W, H) {
    var sturm = s.wetter === "sturm";
    // Regen als schräge Papierschnüre
    if (f.regen.length) {
      var schraeg = sturm ? 0.42 : 0.14;
      f.regen.forEach(function (t, i) {
        if (dt) { t.y += t.v * dt; t.x -= t.v * schraeg * dt; if (t.y > H + 20 || t.x < -30) f.regen[i] = regenNeu(false); }
        c.save(); c.translate(t.x, t.y); c.rotate(schraeg);
        c.beginPath(); c.moveTo(-0.7, -t.l / 2); c.lineTo(0.9, -t.l / 2 + 1); c.lineTo(0.6, t.l / 2); c.lineTo(-0.9, t.l / 2 - 1); c.closePath();
        fuellen(c, t.farbe, 0.75); c.restore();
      });
    }
    // Nebel: helle Papierbänder treiben langsam vorbei
    f.nebel.forEach(function (n) {
      n.x += n.v * dt; if (n.x - n.g > W) n.x = -n.g;
      PAPIER.risspfad(c, n.x, n.y, n.g, 26, 15, n.seed); fuellen(c, "weiss", 0.42);
      PAPIER.risspfad(c, n.x + n.g * 0.6, n.y + 14, n.g * 0.7, 18, 13, n.seed + 3); fuellen(c, "creme", 0.3);
    });
    // Blitz (nur bei Sturm): gezackter Papierstreifen, das Fenster blitzt auf, die Küche wird kurz hell, dann grollt es
    if (sturm && s.jahr !== "winter") {                 // (Wintersturm: nur Schneegestöber, kein Gewitter)
      f.naechsterBlitz -= dt;
      if (!f.blitz && f.naechsterBlitz <= 0) blitzLos(s, f);
      if (f.blitz) {
        var b = f.blitz; b.t += dt;
        var hell = b.t < 0.09 ? 1 : b.t < 0.16 ? 0.25 : b.t < 0.24 ? 0.85 : Math.max(0, 1 - (b.t - 0.24) / 0.35);
        if (hell > 0.02) {
          c.fillStyle = PAPIER.muster(c, "weiss"); c.globalAlpha = hell * 0.55; c.fillRect(0, 0, W, H);
          c.beginPath(); b.punkte.forEach(function (p, i) { if (i === 0) c.moveTo(p[0] - 2.6, p[1]); else c.lineTo(p[0] - 2.6, p[1]); });
          for (var j = b.punkte.length - 1; j >= 0; j--) c.lineTo(b.punkte[j][0] + 2.6, b.punkte[j][1] + 1);
          c.closePath(); fuellen(c, "gelb", hell); c.globalAlpha = hell; c.strokeStyle = "rgba(255,252,235,.9)"; c.lineWidth = 1; c.stroke();
        }
        if (s.blitzLicht) s.blitzLicht.style.opacity = String((hell * 0.3).toFixed(3));
        if (b.t > 0.7) { f.blitz = null; if (s.blitzLicht) s.blitzLicht.style.opacity = "0"; f.naechsterBlitz = 7 + Math.random() * 9; }
      }
    }
    // Tropfen an der Scheibe: sitzen, manche rinnen ruckweise hinunter und ziehen eine Spur
    f.scheibe.forEach(function (d, i) {
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
    // Regenklang (leise unter der Musik), sobald Ton freigegeben ist
    if ((s.wetter === "regen" || s.wetter === "sturm") && !s.regenKlang && window.KLANG && KLANG.kontext && KLANG.kontext() && KLANG.regen) {
      s.regenKlang = true; KLANG.regen(s.wetter === "sturm" ? 0.06 : 0.035);
    }
  }
  function blitzLos(s, f) {
    var x = 110 + Math.random() * 90, y = -5, punkte = [[x, y]];
    while (y < 150 + Math.random() * 60) { y += 18 + Math.random() * 16; x += (Math.random() - 0.5) * 34; punkte.push([x, y]); }
    f.blitz = { t: 0, punkte: punkte };
    if (window.KLANG && KLANG.donner && !document.hidden) setTimeout(function () { if (z === s) KLANG.donner(0.8 + Math.random() * 0.4); }, 700 + Math.random() * 1100);
  }

  // ───────── Nachts: Waldkauz, Sternschnuppe, Glühwürmchen ─────────
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
  function sternschnuppe(f) { if (!f.schnuppe) f.schnuppe = { t: 0, x: 120 + Math.random() * 60, y: 12 + Math.random() * 30 }; }
  function schnuppeMalen(c, f, dt) {
    if (!f.schnuppe) sternschnuppe(f);
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
    if (s.zeit === "nacht") {                             // nachts sitzt der Kauz auf dem Ast (das Rotkehlchen schläft)
      if ((x - KAUZ[0]) * (x - KAUZ[0]) + (y - KAUZ[1] + 20) * (y - KAUZ[1] + 20) < 34 * 34) return "kauz";
    }
    var v = s.zeit !== "nacht" && s.dekor.querySelector(".mk-vogel");
    if (v) {
      // menue.js setzt translate((fussX−81)·mass, (fussY−105,3)·mass): daraus die Füße; der Körper sitzt ~62 Bühnenpixel darüber
      var tr = /translate\(\s*([-\d.e]+)px\s*,\s*([-\d.e]+)px/.exec(v.style.transform || v.style.webkitTransform || "");
      var mass = s.buehne.getBoundingClientRect().width / 1536;
      if (tr && mass) {
        var fx = parseFloat(tr[1]) / mass + 81, fy = parseFloat(tr[2]) / mass + 105.3;
        var vx = fx + 1, vy = fy - 62;
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
    var n = s.zaehler[zone];
    if (zone === "katze") {
      if (s.zeit === "nacht") {                           // nachts ist die Katze müde: Schnurren und Papier-"Zzz"
        klang("f_ev_schnurren", 0.45, 0, 3);
        funken(s, x + 20, y - 50, "zzz", ["hellblau", "weiss", "hellblau"], 3);
      } else {
        if (n % 3 === 0) klang("f_ev_miau", 0.5); else klang("f_ev_schnurren", 0.5, 0, 2.6);
        funken(s, x, y - 40, "herz", ["rot", "rosa", "rot"], 3);
      }
    } else if (zone === "omsi") {
      klang("f_ev_glitzer", 0.22);                         // leise – die Menümusik läuft ja
      funken(s, x, y - 30, "herz", ["rot", "rosa", "orange", "rot"], 5);
    } else if (zone === "kauz") {
      klang("f_ev_kauz", 0.45);
      if (s.fenster) { s.fenster.kauzRuf = 1.4; s.fenster.blinzeln = 0.25; }
      funken(s, x, y - 40, "note", ["ocker", "braun", "creme"], 2);
    } else if (zone === "vogel") {
      klang("f_ev_rotkehlchen", 0.45, 0.634, 1.7);
      funken(s, x, y - 20, "note", ["blau", "tiefblau", "gruen"], 3);
    } else if (zone === "tasse") {
      klang("f_ev_untertasse", 0.5);
      funken(s, x, y - 50, "dampf", ["weiss", "creme"], 4);
    } else if (zone === "schuessel") {
      klang("f_ev_schneebesen", 0.5, 0, 1.6);
      funken(s, x, y - 30, "dampf", ["creme", "weiss", "gelb"], 5);
    } else if (zone === "eier") {
      klang(n % 2 ? "f_ev_ei" : "f_ev_eierkarton", 0.5);
      funken(s, x, y - 20, "stern", ["gelb", "gold"], 3);
    } else if (zone === "kellen") {
      klang("f_ev_besteck", 0.45);
      funken(s, x, y - 20, "stern", ["gelb", "weiss"], 2);
    } else if (zone === "blumen") {
      klang("f_ev_glitzer", 0.35);
      funken(s, x, y, "blatt", ["gelb", "orange", "gelb"], 4);
    } else if (zone === "fenster") {
      if (s.zeit === "nacht") {                           // nachts: eine Sternschnuppe – wünsch dir was!
        if (s.fenster) sternschnuppe(s.fenster);
        klang("f_ev_glitzer", 0.2);
        funken(s, x, y, "stern", ["gelb", "creme"], 4);
      } else {
        klang("ev_voegel", 0.4, 0, 2.5);
        var f = s.fenster;                                // Windstoß: ein paar Blätter/Flocken/Blüten mehr
        if (f && f.teilchen.length && f.teilchen.length < 34) for (var i = 0; i < 6; i++) { var t = teilchenNeu(s.jahr, FENSTER[2], FENSTER[3], false); t.vx += 30; f.teilchen.push(t); }
        if (f && s.jahr === "sommer" && !f.schmetterling) f.schmetterling = { x: -20, y: FENSTER[3] * 0.4, t: 0, farbe: "gelb" };
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
    var r = cv.getBoundingClientRect(); if (!r.width) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), bw = Math.round(r.width * dpr), bh = Math.round(r.height * dpr);
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; c.__muster = null; }
    if (!s.funken.length && s.funkenLeer) return;         // nichts unterwegs: Leinwand bleibt leer, keine Arbeit
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

  // ───────── Lauf ─────────
  KL.an = function (wurzel) {
    KL.aus();
    var buehne = wurzel && wurzel.querySelector(".mk-buehne"), dekor = buehne && buehne.querySelector(".mk-dekor");
    if (!buehne || !dekor || !window.PAPIER) return;
    var s = z = { wurzel: wurzel, buehne: buehne, dekor: dekor, seite: wurzel.querySelector(".mk-seite") || wurzel,
                  funken: [], zuletzt: {}, zaehler: {}, letzt: 0, stundeGeprueft: 0 };
    fensterBauen(s);
    // Jahreszeiten-Küche (Codex liefert messgleiche Bilder, daten/menue.js → jahreszeiten: { herbst: 'kueche-herbst.png', … }):
    // erst tauschen, wenn das Bild wirklich geladen ist – sonst bleibt kueche.png
    var jzBild = window.MENUE_DATEN && MENUE_DATEN.jahreszeiten && MENUE_DATEN.jahreszeiten[s.jahr], grund = dekor.querySelector(".mk-basis");
    if (jzBild && grund) { var probe = new Image(); probe.onload = function () { if (z === s) grund.src = probe.src; }; probe.src = MENUE_DATEN.ordner + jzBild; }
    s.licht = B.el("div", "kl-licht", dekor); s.lampe = B.el("div", "kl-lampe", dekor); s.blitzLicht = B.el("div", "kl-blitzlicht", dekor);
    [s.licht, s.lampe, s.blitzLicht].forEach(function (e) { e.setAttribute("aria-hidden", "true"); });
    lichtAnwenden(s);
    s.funkenCv = document.createElement("canvas"); s.funkenCv.className = "kl-funken"; s.funkenCv.setAttribute("aria-hidden", "true");
    dekor.appendChild(s.funkenCv); s.funkenC = s.funkenCv.getContext("2d");
    s.tippen = function (ev) {
      if (z !== s || (ev.target && ev.target.closest && ev.target.closest("button, a, input"))) return;
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
      if (jetzt - s.stundeGeprueft > 60000) {             // Tageszeit wechselt, während die Küche offen ist
        s.stundeGeprueft = jetzt;
        var zt = KL.tageszeit(), jz = KL.jahreszeit();
        if (s.fenster && (zt !== s.zeit || jz !== s.jahr || KL.wetter(zt, jz) !== s.wetter)) tageszeitAnwenden(s);
      }
      var still = ruhig();
      if (!still && jetzt - s.letzt < 45) { s.frame = B.frame(s.schritt); return; }   // ~22 Bilder/s genügen für Papier
      if (s.fenster) fensterMalen(s, still ? 0 : dt, jetzt);
      funkenMalen(s, still ? 0.05 : dt);
      s.letzt = jetzt;
      if (still) s.timer = setTimeout(function () { s.letzt = 0; s.schritt(); }, 600);
      else s.frame = B.frame(s.schritt);
    };
    s.schritt();
  };
  KL.aus = function () {
    if (!z) return;
    var s = z; z = null;
    B.frameStopp(s.frame); clearTimeout(s.timer);
    if (window.KLANG && KLANG.regen) KLANG.regen(0);
    if (s.fenster && s.fenster.vogel) s.fenster.vogel.style.visibility = "";
    s.buehne.removeEventListener("click", s.tippen, false);
  };
  KL.zustand = function () { return z; };
  KL.zoneBei = function (x, y) { return z ? zoneBei(x, y, z) : null; };   // für Tests
})();
