/* Die App: Startbild (das Haus) → Omsis Küche → Bücher, Schattentheater,
   Geheimakte, Rezept und Geburtstagstorte. */
(function () {
  var APP = window.APP = {};
  var wurzel = null, aktuell = null;

  // Hinterlegte deutsche Texte übernehmen (daten/text_de.js).
  function texteUebernehmen() {
    var T = window.TEXT_DE || {};
    if (!window.ORIGINAL) return;
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
    if (window.SCHATTEN) SCHATTEN.stoppen();
    if (window.AKTE) AKTE.stoppen();
    if (window.BRIEF) BRIEF.stoppen();
    if (window.MENUE_KUECHE) MENUE_KUECHE.stoppen();
    if (window.KUECHE_LEBEN) KUECHE_LEBEN.aus();
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
    if (window.RUECKWEG) RUECKWEG.zeigen(name);
    if (window.MUSIK) MUSIK.bereich(name);          // Menümusik / eigene Musik / Stille – weich überblendet
    if (window.FALZ) FALZ.zeigen(name);            // Schild "Falz an/aus" in Büchern und Making-of
    if (window.KULISSE && KULISSE.raum && name !== "kueche") KULISSE.raum(name);   // Raumklang (Küche: nach dem Aufbau, s. u.)
    if (name === "start") return zeigeStart();
    if (name === "kueche") return zeigeKueche();
    if (name === "schatten") return SCHATTEN.starten(schattenVerse(), function () { APP.zeige("kueche"); });
    if (name === "brief") return BRIEF.starten(wurzel, function () { APP.zeige("kueche"); });
    if (name === "radio") return RADIO.starten(wurzel, function () { APP.zeige("kueche"); });
    if (name === "original") return BUCH.oeffnen(wurzel, "original", function () { APP.zeige("kueche"); });
    if (name === "fortsetzung") return BUCH.oeffnen(wurzel, "fortsetzung", function () { APP.zeige("kueche"); });
    if (name === "finale") return FINALE.starten(wurzel, function () { APP.zeige("kueche"); });
    if (name === "akte") return window.AKTE ? AKTE.starten(wurzel) : zeigeAkte();
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
    var geoeffnet = false;
    B.tippen(s, function () {
      if (geoeffnet) return;                               // mehrfach angetippt → trotzdem nur einmal in die Küche
      geoeffnet = true;
      KLANG.entsperren();
      KLANG.knarzen();
      setTimeout(KLANG.vogel, 500);
      hinweis.style.opacity = "0";
      s.className = "start rein";
      setTimeout(function () { if (aktuell === "start") APP.zeige("kueche"); }, 1300);
    });
  }

  // ───────────────────── Omsis Küche (Menü) ─────────────────────
  function zeigeKueche() {
    if (window.MENUE_KUECHE && window.MENUE_DATEN) {
      var neueKueche = MENUE_KUECHE.starten(wurzel, { offline: allesVorladen });
      var fussleiste = wurzel.querySelector(".mk-fuss");
      if (fussleiste && window.MUSIK) MUSIK.schalter(fussleiste);    // "Musik aus/an" neben "Bewegung anhalten"
      if (window.KULISSE && KULISSE.raum) KULISSE.raum("kueche", wurzel);   // Küchenklang + Vogel/Pfannkuchen im Takt
      if (window.KUECHE_LEBEN) KUECHE_LEBEN.an(wurzel);                     // Fenster nach Tages-/Jahreszeit, Antippen
      return neueKueche;
    }
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
      { ziel: "radio", titel: "Das Pfannkuchenbuchradio", unter: "Omsi liest vor. Und wir lachen zusammen.", farbe: "gruen", bild: "bilder/radio/radio-waldgruen.png" },
      { ziel: "makingof", titel: "Bevor der Pfannekuchen fliegt", unter: "Das Atelierbuch – Bilder, Entwürfe und kleine Geheimnisse", farbe: "blau", bild: "bilder/making-of/01_titel_atelier.jpg", symbol: "karte" },
      { ziel: "original", titel: "Das Pfannkuchenbuch", unter: "Das Buch von damals – jetzt lebendig", farbe: "gelb", bild: B.pfad(window.ORIGINAL.bildPfad, 1), hoch: true },
      { ziel: "fortsetzung", titel: B.ersetzen(window.FORTSETZUNG.titel), unter: "Die streng geheime Fortsetzung", farbe: "rot", bild: window.FORTSETZUNG.bildPfad + window.FORTSETZUNG.seiten[0].bild.datei, symbol: "pfanne" },
      { ziel: "schatten", titel: "Das Schattentheater", unter: "Laken, Lampe, Vorhang auf!", farbe: "tiefblau", symbol: "laken" },
      { ziel: "akte", titel: B.ersetzen("Geheimakte {OMA}"), unter: "Zugang nur für 007", farbe: "ocker", bild: "bilder/extras/geheimakte-omsi.jpg", bildArt: "akte", symbol: "akte" },
      { ziel: "finale", titel: "Die Geburtstagstorte", unter: B.ersetzen("{ALTER} Kerzen – puste sie aus!"), farbe: "rosa", bild: "bilder/extras/geburtstagsturm-ohne-kerzen.png", bildArt: "turm", symbol: "torte" },
      { ziel: "rezept", titel: B.ersetzen("{OMA}s Rezept"), unter: "Die leckersten Pfannekuchen der Welt", farbe: "gruen", symbol: "karte" },
      { ziel: "spiel", titel: "Pfannkuchen wenden", unter: "Wer schafft drei goldgelbe?", farbe: "orange", symbol: "wenden" }
    ];
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
        APP.zeige(kd.ziel);
      });
    });
    var fuss = B.el("div", "kueche-fuss", menue);
    var neu = B.knopf(B.el("button", "knopf klein", fuss), "nochmal", "Zurück zum Gartentor");
    B.tippen(neu, function () { APP.zeige("start"); });
    if (window.location.protocol === "https:" && navigator.serviceWorker) {
      var offline = B.knopf(B.el("button", "knopf klein", fuss), "laden", "Alles fürs Offline-Lesen speichern");
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
    var zurueck = B.knopf(B.el("button", "knopf akte-zurueck", seite), "haus", "Zur Küche");
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
      if (aktuell !== "akte" || !document.body.contains(dossier)) { window.removeEventListener("resize", einpassen, false); return; }
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
    var zurueck = B.knopf(B.el("button", "knopf akte-zurueck", seite), "haus", "Zur Küche");
    B.tippen(zurueck, function () { APP.zeige("kueche"); });
    var drucken = B.knopf(B.el("button", "knopf rezept-drucken", seite), "drucker", "Drucken");
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
    if (window.RUECKWEG) RUECKWEG.rezeptExtras(karte);
    fuss.style.webkitAnimationDelay = fuss.style.animationDelay = (0.5 + nr * 0.18) + "s";
    // Schrift so groß wie möglich, ohne dass etwas in die gemalten Zutaten läuft
    function einpassen() {
      if (aktuell !== "rezept" || !document.body.contains(karte)) { window.removeEventListener("resize", einpassen, false); return; }
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

  // ───────────────────── Radio-Extrafach: die Seite fährt mit ─────────────────────
  // Das Fach klappt NACH OBEN auf und schiebt die Schubladenfront nach unten aus dem Bild. Darum fährt die Seite
  // mit: beim Öffnen nach unten – die Front bleibt fast stehen, der Inhalt erscheint darüber –, beim Schließen
  // zurück an die alte Stelle. Jedes Bild richtet sich nach der TATSÄCHLICHEN Höhe des Fachs (nicht nach der Uhr),
  // so bleibt es auch auf einem ruckelnden iPad im Gleichtakt. Ein Finger hält die Fahrt sofort an.
  // radio.js (Codex) bleibt unberührt: gehört wird auf .radio-fach-taste und ihr aria-expanded.
  var fahrt = { nr: 0, vorher: null };
  function seiteFahren(seite, von, nach, fach, h0, h1) {
    var meine = ++fahrt.nr, t0 = B.jetzt();
    if (h0 === h1) { seite.scrollTop = nach; return; }
    B.frame(function schritt() {
      if (meine !== fahrt.nr || !document.body.contains(seite)) return;
      var p = (fach.offsetHeight - h0) / (h1 - h0);       // wie weit ist die Schublade wirklich?
      if (B.jetzt() - t0 > 1200) p = 1;                    // Sicherheitsnetz, falls keine Bewegung kommt
      p = Math.max(0, Math.min(1, p));
      seite.scrollTop = Math.round(von + (nach - von) * p);
      if (p < 1) B.frame(schritt);
    });
  }
  function schubladeMitfahren(ev) {
    var taste = ev.target && ev.target.closest ? ev.target.closest(".radio-fach-taste") : null;
    var seite = taste && taste.closest(".radio-seite");
    var fach = taste && taste.parentNode.querySelector(".radio-extrafach");
    if (!seite || !fach) return;
    var offen = taste.getAttribute("aria-expanded") === "true";
    fahrt.nr++;                                          // eine noch laufende Fahrt endet hier (auch ohne Finger, z. B. Tastatur)
    var sicht = seite.clientHeight, rand = 18, start = seite.scrollTop, ziel;
    var voll = fach.scrollHeight, jetzt = fach.offsetHeight, front = taste.offsetHeight;
    var fachOben = fach.getBoundingClientRect().top - seite.getBoundingClientRect().top + start;
    if (offen) {
      fahrt.vorher = start;
      // passt alles ins Bild: Front unten mit etwas Luft; sonst den Anfang des Inhalts zeigen
      ziel = voll + front + 2 * rand <= sicht ? fachOben + voll + front + rand - sicht : fachOben - rand;
      ziel = Math.max(0, Math.min(ziel, seite.scrollHeight - jetzt + voll - sicht));
      if (ziel <= start) return;                          // ist schon zu sehen
      seiteFahren(seite, start, ziel, fach, jetzt, voll);
    } else {
      ziel = fahrt.vorher === null ? start : fahrt.vorher;
      ziel = Math.max(fachOben + front + rand - sicht, Math.min(ziel, fachOben - rand));   // Front bleibt im Bild
      ziel = Math.max(0, Math.min(ziel, seite.scrollHeight - jetzt - sicht));
      fahrt.vorher = null;
      if (ziel >= start) return;
      seiteFahren(seite, start, ziel, fach, jetzt, 0);
    }
  }
  document.addEventListener("click", schubladeMitfahren, false);   // nach dem Radio-Klick (dann ist der neue Zustand gesetzt)
  ["touchstart", "wheel", "mousedown"].forEach(function (art) {
    document.addEventListener(art, function () { fahrt.nr++; }, true);   // Finger/Rad übernimmt
  });

  // ───────────────────── Offline-Speichern (iPad, wenn gehostet) ─────────────────────
  function alleDateien() {
    // Veröffentlichte Fassung: das Veröffentlichen-Werkzeug hat die genaue Liste mitgegeben
    if (window.TRESOR_INFO && window.TRESOR_INFO.dateien) return window.TRESOR_INFO.dateien.slice();
    var d = ["index.html", "css/app.css", "js/basis.js", "js/papier.js", "js/klang.js", "js/klangkulisse.js", "js/effekte.js", "js/buch.js", "js/schatten.js", "js/finale.js", "js/spiel.js", "js/kueche-leben.js", "js/app.js",
             "daten/einstellungen.js", "daten/textfelder.js", "daten/original.js", "daten/text_de.js", "daten/fortsetzung.js", "daten/ebenen.js", "daten/extras.js", "daten/klang.js",
             "bilder/extras/haus.jpg", "bilder/extras/omsi.jpg",
             "bilder/extras/kueche-willkommen.jpg", "bilder/extras/geheimakte-omsi.jpg", "bilder/extras/rezeptkarte-rahmen.png",
             "bilder/extras/geburtstagsturm-ohne-kerzen.png", "bilder/extras/pfannekuchen-flug.png",
             "bilder/schatten/omsi-profil.png", "bilder/schatten/kevin-klein-profil.png", "bilder/schatten/kevin-gross-profil.png", "bilder/schatten/pfanne-leer.png"];
    var endungen = [".m4a", ".mp3", ".wav"];
    d.push("css/radio.css", "js/radio.js", "daten/radio.js", "bilder/radio/radio-waldgruen.png", "audio/radio/erinnerung.m4a");
    d.push("bilder/radio/extrafach-front.png");
    d.push("bilder/radio/extrafach-symbole.png");
    window.ORIGINAL.doppelseiten.forEach(function (ds) {
      ds.forEach(function (n) {
        var s = window.ORIGINAL.seiten[n] || {};
        d.push(s.bild || B.pfad(window.ORIGINAL.bildPfad, n));
        if (!s.bild && window.ORIGINAL.bildPfadDe) d.push(B.pfad(window.ORIGINAL.bildPfadDe, n));
        endungen.forEach(function (e) { d.push(B.pfad(window.ORIGINAL.audioPfad, n) + e); });
        ((window.ORIGINAL_TEILE || {})[n] || []).concat((window.ORIGINAL_FIGUREN || {})[n] || []).forEach(function (t) { d.push(t.bild); d.push(t.loch); });
      });
    });
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
      ["original", "fortsetzung", "raeume"].forEach(function (typ) {
        for (var s in K[typ] || {}) {
          var p = K[typ][s];
          (p.hg || []).concat(p.ev || [], p.oft || []).forEach(function (e) { klaenge[e[0]] = 1; });
        }
      });
      for (var n in klaenge) d.push(K.ordner + n + K.endung);
    }
    if (window.MAKINGOF && window.MAKING_OF) d = d.concat(MAKINGOF.dateien());
    if (window.MENUE_KUECHE && window.MENUE_DATEN) d = d.concat(MENUE_KUECHE.dateien());
    if (window.SCHATTEN) d = d.concat(SCHATTEN.dateien());
    if (window.MUSIK) d = d.concat(MUSIK.dateien(), ["js/musik.js", "js/falz.js"]);
    if (window.SPIEL && SPIEL.dateien) d = d.concat(SPIEL.dateien());
    return d;
  }
  // Zählt, welche Dateien NICHT im Offline-Speicher gelandet sind (verschlüsselte liegen dort als .enc)
  function speicherPruefen(liste, fertig) {
    if (!window.caches || !window.TRESOR_INFO || !window.Promise) { fertig(0); return; }
    var geschuetzt = /^(daten|bilder|audio)\//, oeffentlich = /^bilder\/extras\/icon-[^\/]+\.png$/;   // wie sw-tresor.js
    Promise.all(liste.map(function (d) {
      var url = new URL(d + (geschuetzt.test(d) && !oeffentlich.test(d) ? ".enc" : ""), location.href).href;
      return caches.match(url).then(function (r) { return r ? 0 : 1; }, function () { return 1; });
    })).then(function (n) { fertig(n.reduce(function (a, b) { return a + b; }, 0)); }, function () { fertig(0); });
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
        if (knopf) B.knopf(knopf, "laden", Math.round(100 * fertig / liste.length) + " %");
        if (fertig === liste.length) {
          speicherPruefen(liste, function (fehlend) {                // wirklich im Offline-Speicher? (voller Speicher meldet sonst nichts)
            var alles = !fehler && !fehlend;
            if (knopf) B.knopf(knopf, alles ? "haken" : "laden", alles ? "Alles gespeichert – geht jetzt auch ohne Internet"
                                                                    : "Noch nicht alles gespeichert – bitte später mit WLAN nochmal");
            if (fertigMeldung) fertigMeldung(fehler + fehlend);
          });
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
        if (window.location.protocol === "https:" && !lokal) navigator.serviceWorker.register("sw.js")["catch"](function () {});   // offline: der vorhandene Worker bleibt
        else if (!window.TRESOR_INFO && navigator.serviceWorker.getRegistrations) navigator.serviceWorker.getRegistrations().then(function (liste) {   // (verschlüsselte Fassung braucht ihren Worker immer)
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
    // Teil 2 ("Ein Pfannkuchen für Omsi") in der neuen Küche anschließen (dort noch als "vorbereitet" eingetragen)
    if (window.MENUE_KUECHE && MENUE_KUECHE.verbinden) MENUE_KUECHE.verbinden("fortsetzung", function () { APP.zeige("fortsetzung"); });
    APP.zeige(ziel ? ziel[1] : "start");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", los, false); else los();
})();
