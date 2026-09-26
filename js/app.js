/* Die App: Startbild (das Haus) → Omsis Küche → Bücher, Schattentheater,
   Geheimakte, Rezept, Geburtstagstorte (+ Text-Werkstatt im Entwurfsmodus). */
(function () {
  var APP = window.APP = {};
  var wurzel = null, aktuell = null;

  // Eigene deutsche Texte aus der Text-Werkstatt übernehmen (daten/text_de.js)
  function texteUebernehmen() {
    var T = window.TEXT_DE || {};
    if (!window.ORIGINAL) return;
    // Im Entwurfsmodus: was gerade in der Text-Werkstatt steht, sofort mit anzeigen
    if (B.E.entwurf !== false) {
      var w = B.erinnern("werkstatt", null);
      if (w) { var neuT = {}; for (var k in T) neuT[k] = T[k]; for (var k2 in w) if (w[k2] && w[k2].join("")) neuT[k2] = w[k2]; T = neuT; }
    }
    for (var nr in T) {
      if (!window.ORIGINAL.seiten[nr]) continue;
      var alt = window.ORIGINAL.seiten[nr].de || [], neu = T[nr] || [];
      var gemischt = [];
      for (var i = 0; i < Math.max(alt.length, neu.length); i++) gemischt.push(neu[i] ? neu[i] : (alt[i] || ""));
      window.ORIGINAL.seiten[nr].de = gemischt;
    }
  }

  APP.meldung = function (text) {
    var m = B.el("div", "meldung", document.body, text);
    setTimeout(function () { m.className = "meldung weg"; }, 3600);
    setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 4400);
  };

  function aufraeumen() {
    if (window.RADIO) RADIO.stoppen();
    if (window.MAKINGOF) MAKINGOF.stoppen();
    if (window.BUCH) BUCH.schliessen();
    if (window.FINALE) FINALE.stoppen();
    if (window.SPIEL) SPIEL.stoppen();
    if (window.EFFEKTE) EFFEKTE.stoppen();
    B.leeren(wurzel);
    window.scrollTo(0, 0);
  }

  APP.zeige = function (name) {
    aufraeumen();
    aktuell = name;
    B.merken("bildschirm", name);
    if (name === "start") return zeigeStart();
    if (name === "kueche") return zeigeKueche();
    if (name === "radio") return RADIO.starten(wurzel, function () { APP.zeige("kueche"); });
    if (name === "original") return BUCH.oeffnen(wurzel, "original", function () { APP.zeige("kueche"); });
    if (name === "fortsetzung") return BUCH.oeffnen(wurzel, "fortsetzung", function () { APP.zeige("kueche"); });
    if (name === "finale") return FINALE.starten(wurzel, function () { APP.zeige("kueche"); });
    if (name === "akte") return zeigeAkte();
    if (name === "rezept") return zeigeRezept();
    if (name === "makingof") return MAKINGOF.starten(wurzel, function () { APP.zeige("kueche"); });
    if (name === "spiel") return SPIEL.starten(wurzel, function () { APP.zeige("kueche"); });
  };

  // ───────────────────── Startbild: das Haus ─────────────────────
  function zeigeStart() {
    var s = B.el("div", "start", wurzel);
    s.style.backgroundImage = "url(\"bilder/extras/haus.jpg\")";
    var titel = B.el("div", "start-titel", s);
    var t1 = B.el("div", "start-fuer", titel, B.ersetzen("Für {OMA}"));
    PAPIER.schriftFuellen(t1, "rot", { akzent: "orange" });
    B.el("div", "start-anlass", titel, B.ersetzen("zum {ALTER}. Geburtstag"));
    var schild = B.el("div", "start-schild", s);
    B.el("div", "", schild, B.ersetzen("{ADRESSE}"));
    var tor = B.el("div", "start-tor", s);
    B.el("div", "start-tor-ring", tor);
    var hinweis = B.el("div", "start-hinweis", s, "Tippe auf das Gartentor");
    B.tippen(s, function () {
      KLANG.entsperren();
      KLANG.knarzen();
      setTimeout(KLANG.vogel, 500);
      hinweis.style.opacity = "0";
      s.className = "start rein";
      setTimeout(function () { APP.zeige("kueche"); }, 1300);
    });
  }

  // ───────────────────── Omsis Küche (Menü) ─────────────────────
  function zeigeKueche() {
    var k = B.el("div", "kueche mit-willkommen", wurzel);
    PAPIER.hinterlegen(k, "creme", { kachel: 320 });
    // Willkommensbild: Omsi am Frühstückstisch winkt von links; Überschrift und Karten liegen
    // im hellen freien Bereich rechts daneben (hochkant: Bild als Kopf, Karten darunter).
    var bild = B.el("div", "kueche-bild", k);
    B.ladeBild("bilder/extras/kueche-willkommen.jpg", function () {
      bild.style.backgroundImage = "url(\"bilder/extras/kueche-willkommen.jpg\")"; bild.className = "kueche-bild da";
    });
    var menue = B.el("div", "kueche-menue", k);
    var kopf = B.el("div", "kueche-kopf", menue);
    var h = B.el("h1", "kueche-titel", kopf, B.ersetzen("{OMA}s Küche"));
    PAPIER.schriftFuellen(h, "blau", { akzent: "tiefblau" });
    B.el("div", "kueche-unter", kopf, "Such dir etwas aus – überall darf getippt werden.");
    var raster = B.el("div", "karten", menue);

    var karten = [
      { ziel: "radio", titel: "Das Radio von damals", unter: "Omsi liest vor. Und wir lachen zusammen.", farbe: "orange", bild: "bilder/radio/radio-papier.png" },
      { ziel: "makingof", titel: "Bevor der Pfannekuchen fliegt", unter: "Das Atelierbuch – Bilder, Entwürfe und kleine Geheimnisse", farbe: "blau", bild: "bilder/making-of/01_titel_atelier.jpg", symbol: "karte" },
      { ziel: "original", titel: "Das Pfannkuchenbuch", unter: "Das Buch von damals – jetzt lebendig", farbe: "gelb", bild: B.pfad(window.ORIGINAL.bildPfad, 1), hoch: true },
      { ziel: "fortsetzung", titel: B.ersetzen(window.FORTSETZUNG.titel), unter: "Die streng geheime Fortsetzung", farbe: "rot", bild: window.FORTSETZUNG.bildPfad + window.FORTSETZUNG.seiten[0].bild.datei, symbol: "pfanne" },
      { ziel: "schatten", titel: "Das Schattentheater", unter: "Laken, Lampe, Vorhang auf!", farbe: "tiefblau", symbol: "laken" },
      { ziel: "akte", titel: B.ersetzen("Geheimakte {OMA}"), unter: "Zugang nur für 007", farbe: "ocker", bild: "bilder/extras/geheimakte-omsi.jpg", bildArt: "akte", symbol: "akte" },
      { ziel: "finale", titel: "Die Geburtstagstorte", unter: B.ersetzen("{ALTER} Kerzen – puste sie aus!"), farbe: "rosa", bild: "bilder/extras/geburtstagsturm-ohne-kerzen.png", bildArt: "turm", symbol: "torte" },
      { ziel: "rezept", titel: B.ersetzen("{OMA}s Rezept"), unter: "Die leckersten Pfannekuchen der Welt", farbe: "gruen", symbol: "karte" },
      { ziel: "spiel", titel: "Pfannkuchen wenden", unter: "Wer schafft drei goldgelbe?", farbe: "orange", symbol: "wenden" }
    ];
    if (B.E.entwurf !== false) karten.push({ ziel: "werkstatt", titel: "Text-Werkstatt", unter: "Nur für Kevin: deutschen Text eintippen", farbe: "grau", symbol: "karte" });
    if (B.E.entwurf !== false) karten.push({ ziel: "studio", titel: "Aufnahmestudio", unter: "Nur für Kevin: Seiten einsprechen", farbe: "grau", symbol: "mikro" });
    if (karten.length > 6) menue.className = "kueche-menue viele";   // quer etwas kompakter, damit alles ohne Scrollen passt

    karten.forEach(function (kd, i) {
      var karte = B.el("div", "karte-menue", raster);
      var rahmen = B.el("div", "karte-rahmen", karte);
      PAPIER.hinterlegen(rahmen, kd.farbe, { seed: i + 3 });
      var bildflaeche = B.el("div", "karte-bild", rahmen);
      if (kd.ziel === "original") {
        miniUmschlag(bildflaeche);
      } else if (kd.bild) {
        B.ladeBild(kd.bild, function () {
          bildflaeche.style.backgroundImage = "url(\"" + kd.bild + "\")";
          bildflaeche.className = "karte-bild mit-foto" + (kd.hoch ? " hochformat" : "") + (kd.bildArt ? " bild-" + kd.bildArt : "");
        }, function () { symbolZeichnen(bildflaeche, kd.symbol || "pfanne"); });
      } else symbolZeichnen(bildflaeche, kd.symbol);
      B.el("div", "karte-titel-m", karte, kd.titel);
      B.el("div", "karte-unter", karte, kd.unter);
      B.tippen(karte, function () {
        KLANG.entsperren(); KLANG.plopp();
        if (kd.ziel === "schatten") { SCHATTEN.starten(schattenVerse(), function () {}); return; }
        if (kd.ziel === "werkstatt") { window.location.href = "werkstatt.html"; return; }
        if (kd.ziel === "studio") { window.location.href = "studio.html"; return; }
        APP.zeige(kd.ziel);
      });
    });
    var fuss = B.el("div", "kueche-fuss", menue);
    var neu = B.el("button", "knopf klein", fuss, "↺ Zurück zum Gartentor");
    B.tippen(neu, function () { APP.zeige("start"); });
    if (window.location.protocol === "https:" && navigator.serviceWorker) {
      var offline = B.el("button", "knopf klein", fuss, "⬇ Alles fürs Offline-Lesen speichern");
      B.tippen(offline, function () { allesVorladen(offline); });
    }
  }

  // Der Umschlag des Originals – mit deutschem Titel statt "Pancakes, Pancakes!"
  function miniUmschlag(flaeche) {
    var O = window.ORIGINAL, tf = O.seiten[1].titelFeld;
    var mini = B.el("div", "mini-seite", flaeche);
    mini.style.backgroundImage = "url(\"" + B.pfad(O.bildPfadDe || O.bildPfad, 1) + "\")";
    setTimeout(function () {
      var h = flaeche.clientHeight, b = Math.round(h * O.seitenVerhaeltnis);
      mini.style.width = b + "px"; mini.style.height = h + "px"; mini.style.marginLeft = (-b / 2) + "px";
      if (!tf) return;
      var t = B.el("div", "titelfeld-de", mini);
      t.style.left = tf.x * 100 + "%"; t.style.top = tf.y * 100 + "%"; t.style.width = tf.b * 100 + "%"; t.style.height = tf.h * 100 + "%";
      t.style.fontSize = (h * 0.052) + "px";
      tf.text.split("\n").forEach(function (z) { var zz = B.el("div", "", t, z); PAPIER.schriftFuellen(zz, "blau", { akzent: "tiefblau" }); });
    }, 0);
  }

  function schattenVerse() {
    var s = window.FORTSETZUNG.seiten.filter(function (x) { return x.art === "schattentheater"; })[0];
    return s ? s.schattenVerse : [];
  }

  // kleine Seidenpapier-Symbole für die Menükarten
  function symbolZeichnen(flaeche, art) {
    var cv = B.el("canvas", "karte-symbol", flaeche);
    var w = 220, h = 150, c = B.canvasGroesse(cv, w, h);
    cv.style.width = "100%"; cv.style.height = "100%";
    var P = PAPIER;
    if (art === "pfanne") {
      c.beginPath(); c.ellipse(100, 95, 62, 22, 0, 0, Math.PI * 2); c.fillStyle = P.muster(c, "schwarz"); c.fill();
      c.fillRect(158, 90, 55, 10);
      c.beginPath(); c.ellipse(100, 52, 48, 16, -0.2, 0, Math.PI * 2); c.fillStyle = P.muster(c, "gold", { akzent: "braun" }); c.fill();
      [70, 95, 120].forEach(function (x, i) { P.flammenpfad(c, x, 140, 24, 32 + i * 4, 0); c.fillStyle = P.muster(c, "orange"); c.fill(); });
    } else if (art === "laken") {
      c.fillStyle = P.muster(c, "tiefblau"); c.fillRect(0, 0, w, h);
      var g = c.createRadialGradient(110, 70, 5, 110, 70, 100); g.addColorStop(0, "#fff3d2"); g.addColorStop(1, "#d9b57a");
      c.fillStyle = g; c.fillRect(30, 18, 160, 100);
      c.fillStyle = "rgba(40,25,10,0.85)";
      c.beginPath(); c.arc(80, 62, 10, 0, 7); c.fill(); c.fillRect(72, 72, 16, 30);
      c.beginPath(); c.arc(140, 58, 11, 0, 7); c.fill(); c.fillRect(131, 69, 18, 34);
      c.beginPath(); c.ellipse(110, 40, 12, 4, 0, 0, 7); c.fill();
    } else if (art === "akte") {
      c.fillStyle = P.muster(c, "ocker"); c.fillRect(30, 30, 160, 105); c.fillRect(30, 20, 60, 14);
      c.fillStyle = P.muster(c, "weiss"); c.fillRect(45, 42, 130, 80);
      c.save(); c.translate(110, 84); c.rotate(-0.18); c.strokeStyle = "#c4281c"; c.lineWidth = 4; c.strokeRect(-52, -16, 104, 32);
      c.fillStyle = "#c4281c"; c.font = "bold 22px Futura, Arial, sans-serif"; c.textAlign = "center"; c.fillText("007", 0, 8); c.restore();
    } else if (art === "torte") {
      for (var i = 4; i >= 0; i--) { c.beginPath(); c.ellipse(110, 80 + i * 12, 70, 20, 0, 0, Math.PI * 2); c.fillStyle = P.muster(c, i % 2 ? "gold" : "ocker", { akzent: "braun" }); c.fill(); }
      c.beginPath(); c.ellipse(110, 76, 62, 16, 0, 0, Math.PI * 2); c.fillStyle = P.muster(c, "rot"); c.fill();
      for (var k = 0; k < 9; k++) { var x = 60 + k * 12.5, y = 70 + Math.sin(k) * 6; c.fillStyle = P.muster(c, ["blau", "gelb", "gruen"][k % 3]); c.fillRect(x, y - 24, 5, 24); P.flammenpfad(c, x + 2.5, y - 25, 7, 12, 0); c.fillStyle = P.muster(c, "orange"); c.fill(); }
    } else if (art === "wenden") {
      // Pfanne über Flammen, darüber der gemalte Pfannkuchen im Flug (wie im Spiel)
      [80, 104, 128].forEach(function (x, i) { P.flammenpfad(c, x, 148, 22, 36 + i % 2 * 6, 0); c.fillStyle = P.muster(c, "orange"); c.fill(); });
      c.fillStyle = P.muster(c, "schwarz");
      c.save(); c.translate(52, 102); c.rotate(0.35); c.fillRect(-44, -5, 48, 10); c.restore();
      c.beginPath(); c.ellipse(104, 104, 56, 18, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "rgba(58,42,30,0.55)"; c.lineWidth = 3; c.lineCap = "round";
      c.beginPath(); c.arc(104, 96, 62, Math.PI * 1.12, Math.PI * 1.38); c.stroke();
      c.beginPath(); c.arc(104, 96, 62, Math.PI * 1.62, Math.PI * 1.88); c.stroke();
      B.ladeBild("bilder/extras/pfannekuchen-flug.png", function (img) {
        c.save(); c.translate(106, 44); c.rotate(-0.25); c.drawImage(img, -44, -22, 88, 44); c.restore();
      }, function () { c.beginPath(); c.ellipse(106, 44, 44, 16, -0.25, 0, Math.PI * 2); c.fillStyle = P.muster(c, "gold", { akzent: "braun" }); c.fill(); });
    } else if (art === "mikro") {
      c.beginPath(); c.moveTo(110, 108); c.lineTo(110, 134); c.moveTo(84, 136); c.lineTo(136, 136);
      c.strokeStyle = P.muster(c, "schwarz"); c.lineWidth = 7; c.stroke();
      c.beginPath(); c.arc(110, 78, 34, 0, Math.PI); c.lineWidth = 6; c.stroke();
      c.beginPath(); c.ellipse(110, 58, 22, 40, 0, 0, Math.PI * 2); c.fillStyle = P.muster(c, "rot", { akzent: "orange" }); c.fill();
      c.fillStyle = "rgba(0,0,0,0.22)"; for (var r2 = 0; r2 < 5; r2++) c.fillRect(94, 36 + r2 * 10, 32, 3);
    } else {
      c.save(); c.translate(110, 75); c.rotate(0.05);
      c.fillStyle = "#fffdf6"; c.fillRect(-80, -52, 160, 104);
      c.strokeStyle = "#9ab8e0"; c.lineWidth = 1.5; for (var l = 0; l < 6; l++) { c.beginPath(); c.moveTo(-72, -28 + l * 15); c.lineTo(72, -28 + l * 15); c.stroke(); }
      c.strokeStyle = "#d9534f"; c.beginPath(); c.moveTo(-72, -40); c.lineTo(72, -40); c.stroke();
      c.fillStyle = "#1b3a8a"; c.font = "italic 16px Noteworthy, 'Segoe Print', cursive"; c.fillText("Pfannekuchen", -60, -46 + 2);
      c.restore();
    }
  }

  // ───────────────────── Geheimakte M ─────────────────────
  // Das gemalte Dossier (Foto, Lupe, Sonnenbrille, Stempel) ist die Bühne; die Texte werden
  // als HTML auf das leere Blatt getippt. Hochkant liegt das Blatt unter dem Bild.
  function zeigeAkte() {
    var A = window.EXTRAS.akte;
    var seite = B.el("div", "akte-bildschirm", wurzel);
    PAPIER.hinterlegen(seite, "tiefblau", { kachel: 300 });
    var zurueck = B.el("button", "knopf akte-zurueck", seite, "⌂ Zur Küche");
    B.tippen(zurueck, function () { APP.zeige("kueche"); });
    var dossier = B.el("div", "akte-dossier", seite);
    dossier.style.backgroundImage = "url(\"bilder/extras/geheimakte-omsi.jpg\")";
    var blatt = B.el("div", "akte-blatt-text", dossier);
    B.el("div", "akte-kopf", blatt, B.ersetzen(A.kopf));
    B.el("div", "akte-unter", blatt, B.ersetzen(A.unter));
    var liste = B.el("div", "akte-felder", blatt);
    var zeilen = A.felder.map(function (f) {
      var z = B.el("div", "akte-zeile", liste);
      B.el("span", "akte-name", z, f[0] + ":");
      var wert = B.el("span", "akte-wert", z, "");
      return { el: wert, text: B.ersetzen(f[1]) };
    });
    var unterschrift = B.el("div", "akte-unterschrift", blatt, B.ersetzen(A.unterschrift));
    var stempel = B.el("div", "akte-stempel", dossier, B.ersetzen(A.stempel));
    // Schrift so groß wie möglich, ohne übers Blatt zu laufen (mit dem vollen Text gemessen)
    function einpassen() {
      if (aktuell !== "akte" || !dossier.parentNode) { window.removeEventListener("resize", einpassen, false); return; }
      var vorher = zeilen.map(function (z) { return z.el.textContent; });
      zeilen.forEach(function (z) { z.el.textContent = z.text; });
      var bildH = dossier.clientWidth * 0.75, quer = window.innerWidth > window.innerHeight * 1.25;   // wie die CSS-Regel
      dossier.style.fontSize = (bildH / 34) + "px";   // Stempel und Unterschrift wachsen mit dem Bild
      var f = quer ? Math.max(12, bildH * 0.026) : Math.max(16, Math.min(22, window.innerHeight * 0.019));
      blatt.style.fontSize = f + "px";
      while (quer && f > 11 && blatt.scrollHeight > blatt.clientHeight + 1) { f -= 0.5; blatt.style.fontSize = f + "px"; }
      zeilen.forEach(function (z, i) { z.el.textContent = vorher[i]; });
    }
    einpassen();
    window.addEventListener("resize", einpassen, false);
    // Schreibmaschine
    var i = 0, j = 0;
    function tippe() {
      if (aktuell !== "akte") return;
      if (i >= zeilen.length) {
        setTimeout(function () { stempel.className = "akte-stempel knall"; KLANG.stempel(); unterschrift.className = "akte-unterschrift da"; }, 500);
        return;
      }
      var z = zeilen[i];
      j += 2; z.el.textContent = z.text.slice(0, j);
      if (j % 4 === 0) KLANG.tippen();
      if (j >= z.text.length) { i++; j = 0; setTimeout(tippe, 260); } else setTimeout(tippe, 38);
    }
    KLANG.entsperren();
    setTimeout(tippe, 700);
  }

  // ───────────────────── Omsis Rezept ─────────────────────
  // Rezeptkarte im gemalten Zutatenrahmen (Schüssel, Eier, Mehl, Milch, Butter, Marmelade).
  // Darunter helles Papier; der Text steht in der freien Mitte: Zutaten links, Zubereitung rechts.
  function zeigeRezept() {
    var R = window.EXTRAS.rezept;
    var seite = B.el("div", "rezept-bildschirm", wurzel);
    PAPIER.hinterlegen(seite, "gruen", { kachel: 300, seed: 5 });
    var zurueck = B.el("button", "knopf akte-zurueck", seite, "⌂ Zur Küche");
    B.tippen(zurueck, function () { APP.zeige("kueche"); });
    var drucken = B.el("button", "knopf rezept-drucken", seite, "🖨 Drucken");
    B.tippen(drucken, function () { window.print(); });
    var karte = B.el("div", "rezeptkarte mit-rahmen", seite);
    PAPIER.hinterlegen(karte, "creme", { kachel: 260, seed: 9 });
    var rahmen = B.el("img", "rezept-rahmen", karte);
    rahmen.alt = ""; rahmen.src = "bilder/extras/rezeptkarte-rahmen.png";
    var titel = B.el("div", "rezept-titel", karte, B.ersetzen(R.titel));
    // an der ersten Leerzeile teilen: davor die Zutaten, danach die Zubereitung (sonst in der Mitte)
    var trenn = R.zeilen.indexOf("");
    if (trenn < 0) trenn = Math.ceil(R.zeilen.length / 2);
    var spalten = [B.el("div", "rezept-spalte rezept-zutaten", karte), B.el("div", "rezept-spalte rezept-schritte", karte)];
    var nr = 0;
    R.zeilen.forEach(function (z, i) {
      if (i === trenn && z === "") return;
      var zeile = B.el("div", z ? "rezept-zeile" : "rezept-luecke", spalten[i < trenn ? 0 : 1], B.ersetzen(z));
      zeile.style.webkitAnimationDelay = zeile.style.animationDelay = (0.3 + nr++ * 0.18) + "s";
    });
    var fuss = B.el("div", "rezept-fuss", karte, B.ersetzen(R.fussnote));
    fuss.style.webkitAnimationDelay = fuss.style.animationDelay = (0.5 + nr * 0.18) + "s";
    // Schrift so groß wie möglich, ohne dass etwas in die gemalten Zutaten läuft
    function einpassen() {
      if (aktuell !== "rezept" || !karte.parentNode) { window.removeEventListener("resize", einpassen, false); return; }
      var f = karte.clientHeight / 27;
      function passt() {
        for (var s = 0; s < spalten.length; s++) if (spalten[s].scrollHeight > spalten[s].clientHeight + 1) return false;
        return titel.scrollWidth <= titel.clientWidth + 1 && fuss.scrollWidth <= fuss.clientWidth + 1;
      }
      karte.style.fontSize = f + "px";
      while (f > 10 && !passt()) { f -= 0.5; karte.style.fontSize = f + "px"; }
    }
    einpassen();
    window.addEventListener("resize", einpassen, false);
    if (B.E.entwurf !== false && R.hinweis) B.el("div", "rezept-hinweis", seite, R.hinweis);
  }

  // ───────────────────── Offline-Speichern (iPad, wenn gehostet) ─────────────────────
  function alleDateien() {
    // Veröffentlichte Fassung: das Veröffentlichen-Werkzeug hat die genaue Liste mitgegeben
    if (window.TRESOR_INFO && window.TRESOR_INFO.dateien) return window.TRESOR_INFO.dateien.slice();
    var d = ["index.html", "css/app.css", "js/basis.js", "js/papier.js", "js/klang.js", "js/klangkulisse.js", "js/effekte.js", "js/buch.js", "js/schatten.js", "js/finale.js", "js/spiel.js", "js/app.js",
             "daten/einstellungen.js", "daten/textfelder.js", "daten/original.js", "daten/text_de.js", "daten/fortsetzung.js", "daten/ebenen.js", "daten/extras.js", "daten/klang.js",
             "bilder/extras/haus.jpg", "bilder/extras/omsi.jpg",
             "bilder/extras/kueche-willkommen.jpg", "bilder/extras/geheimakte-omsi.jpg", "bilder/extras/rezeptkarte-rahmen.png",
             "bilder/extras/geburtstagsturm-ohne-kerzen.png", "bilder/extras/pfannekuchen-flug.png",
             "bilder/schatten/omsi-profil.png", "bilder/schatten/kevin-klein-profil.png", "bilder/schatten/kevin-gross-profil.png", "bilder/schatten/pfanne-leer.png"];
    var endungen = [".m4a", ".mp3", ".wav"];
    d.push("css/radio.css", "js/radio.js", "daten/radio.js", "bilder/radio/radio-papier.png", "audio/radio/erinnerung.m4a");
    window.ORIGINAL.doppelseiten.forEach(function (ds) {
      ds.forEach(function (n) {
        var s = window.ORIGINAL.seiten[n] || {};
        d.push(s.bild || B.pfad(window.ORIGINAL.bildPfad, n));
        if (!s.bild && window.ORIGINAL.bildPfadDe) d.push(B.pfad(window.ORIGINAL.bildPfadDe, n));
        endungen.forEach(function (e) { d.push(B.pfad(window.ORIGINAL.audioPfad, n) + e); });
        ((window.ORIGINAL_TEILE || {})[n] || []).concat((window.ORIGINAL_FIGUREN || {})[n] || []).forEach(function (t) { d.push(t.bild); d.push(t.loch); });
      });
    });
    d.push("daten/verteilung.js");
    d.push("daten/original_teile.js");
    d.push("daten/original_figuren.js");
    d.push("daten/original_augen.js");
    d.push("daten/vorlese_zeiten.js");
    ["ipad-01", "ipad-02", "ipad-03", "pfannkuchen-01", "pfannkuchen-02", "drehpfeil-01", "drehpfeil-02"].forEach(function (n) {
      d.push("bilder/extras/hochkant/" + n + ".png");            // Hochkant-Hinweis (Stop-Motion)
    });
    window.FORTSETZUNG.seiten.forEach(function (s) {
      d.push(window.FORTSETZUNG.bildPfad + s.bild.datei);
      endungen.forEach(function (e) { d.push(window.FORTSETZUNG.audioPfad + s.id + e); });
    });
    var E = window.EBENEN || {};
    for (var k in E) { if (E[k].hintergrund) d.push(E[k].hintergrund); (E[k].teile || []).forEach(function (t) { d.push(t.bild); if (t.bild2) d.push(t.bild2); }); }
    var K = window.KLANGPLAN, klaenge = {};
    if (K) {
      if (K.blaettern) klaenge[K.blaettern] = 1;
      ["original", "fortsetzung"].forEach(function (typ) {
        for (var s in K[typ] || {}) {
          var p = K[typ][s];
          (p.hg || []).concat(p.ev || [], p.oft || []).forEach(function (e) { klaenge[e[0]] = 1; });
        }
      });
      for (var n in klaenge) d.push(K.ordner + n + K.endung);
    }
    if (window.MAKINGOF && window.MAKING_OF) d = d.concat(MAKINGOF.dateien());
    return d;
  }
  // Lädt alles einmal durch – der Service Worker merkt es sich, danach geht es ohne Internet.
  // Immer nur 4 Dateien gleichzeitig, damit das iPad nebenher flüssig bleibt.
  function allesVorladen(knopf, fertigMeldung) {
    var liste = alleDateien(), fertig = 0, naechste = 0, fehler = 0;
    if (knopf) knopf.disabled = true;
    function eine() {
      if (naechste >= liste.length) return;
      var x = new XMLHttpRequest();
      x.open("GET", liste[naechste++], true);
      x.onloadend = function () {
        fertig++;
        if (x.status !== 200 && x.status !== 206) fehler++;
        if (knopf) knopf.textContent = "⬇ " + Math.round(100 * fertig / liste.length) + " %";
        if (fertig === liste.length) {
          if (knopf) knopf.textContent = "✓ Alles gespeichert – geht jetzt auch ohne Internet";
          if (fertigMeldung) fertigMeldung(fehler);
        } else eine();
      };
      x.send();
    }
    for (var i = 0; i < 4; i++) eine();
  }

  // ───────────────────── Start ─────────────────────
  function los() {
    texteUebernehmen();
    wurzel = document.getElementById("app");
    // Offline-Speicher nur auf der echten Internet-Adresse (fürs iPad). Auf dem PC
    // (localhost) würde er beim Basteln alte Dateien zeigen – dort wird er abgemeldet.
    var lokal = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
    if (navigator.serviceWorker) {
      try {
        if (window.location.protocol === "https:" && !lokal) navigator.serviceWorker.register("sw.js");
        else if (navigator.serviceWorker.getRegistrations) navigator.serviceWorker.getRegistrations().then(function (liste) {
          liste.forEach(function (r) { r.unregister(); });
          if (window.caches) caches.keys().then(function (k) { k.forEach(function (n) { caches["delete"](n); }); });
        });
      } catch (e) {}
    }
    // Veröffentlichte Fassung: einmal je neuer Fassung still im Hintergrund alles offline speichern
    var stand = window.TRESOR_INFO && window.TRESOR_INFO.stand;
    if (stand && B.erinnern("offline.stand", "") !== stand) setTimeout(function () {
      allesVorladen(null, function (fehler) { if (!fehler) B.merken("offline.stand", stand); });
    }, 6000);
    var ziel = /[?&]zeige=(\w+)/.exec(window.location.search);
    var seiteParam = /[?&]seite=([\w-]+)/.exec(window.location.search);
    if (seiteParam) {
      var nrS = /^\d+$/.test(seiteParam[1]) ? parseInt(seiteParam[1], 10) : seiteParam[1];   // auch "kuh-l"
      window.ORIGINAL.doppelseiten.forEach(function (ds, i) { if (ds.indexOf(nrS) >= 0) B.merken("seite.original", i); });
    }
    APP.zeige(ziel ? ziel[1] : "start");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", los, false); else los();
})();
