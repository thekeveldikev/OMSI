/* Der Buch-Leser: Doppelseiten, echtes Umblättern (3D), deutscher Text über
   dem Original, Seidenpapier-Platzhalter, Ebenen-Animation, Vorlesen. */
(function () {
  var BUCH = window.BUCH = {};
  var S = null;           // Zustand des offenen Buchs
  var bildCache = {};     // src -> {ok: bool, img}

  // ───────────────────── Daten → Doppelseiten ─────────────────────
  function doppelseitenOriginal(O) {
    return O.doppelseiten.map(function (ds) {
      if (ds.length === 1) return ds[0] === 1 ? { links: null, rechts: 1 } : { links: ds[0], rechts: null };
      return { links: ds[0], rechts: ds[1] };
    });
  }

  function vorladen(src, fertig) {
    if (bildCache[src]) { if (fertig) fertig(bildCache[src]); return; }
    var eintrag = { ok: null, img: null, warten: [] };
    bildCache[src] = eintrag;
    if (fertig) eintrag.warten.push(fertig);
    eintrag.img = B.ladeBild(src, function () { eintrag.ok = true; eintrag.warten.forEach(function (f) { f(eintrag); }); eintrag.warten = []; },
      function () { eintrag.ok = false; eintrag.warten.forEach(function (f) { f(eintrag); }); eintrag.warten = []; });
  }
  function bildStatus(src) { return bildCache[src] ? bildCache[src].ok : null; }

  function bildQuelleFortsetzung(seite) { return S.daten.bildPfad + seite.bild.datei; }
  function bildQuelleOriginal(nr) {
    var s = S.daten.seiten[nr];
    if (s && s.bild) return s.bild;                                   // Zusatzseiten haben einen eigenen Pfad
    // im Geschenk (nur Deutsch): die Seiten, aus denen das Englische entfernt ist
    return B.pfad(S.sprache !== "en" && S.daten.bildPfadDe ? S.daten.bildPfadDe : S.daten.bildPfad, nr);
  }

  // Welche Seite steht in welcher Hälfte?
  function haelfteInfo(ds, seiteName) {
    if (S.typ === "original") {
      var nr = ds[seiteName];
      return nr ? { typ: "original", nr: nr } : null;
    }
    return { typ: "fortsetzung", seite: ds.seite, haelfte: seiteName };
  }

  // ───────────────────── Text-Bausteine ─────────────────────
  function baueText(ziel, bausteine, seite) {
    bausteine.forEach(function (t, nr) {
      if (typeof t === "string") { B.el("p", "absatz", ziel, B.ersetzen(t)); return; }
      if (t.titel) { var h = B.el("h1", "buchtitel", ziel, B.ersetzen(t.titel)); PAPIER.schriftFuellen(h, seite && seite.dunkel ? "gelb" : "blau", { akzent: "tiefblau" }); return; }
      if (t.klein) { B.el("p", "klein", ziel, B.ersetzen(t.klein)); return; }
      if (t.laut) {
        var l = B.el("div", "laut", ziel, B.ersetzen(t.laut)); PAPIER.schriftFuellen(l, seite && seite.dunkel ? "gelb" : "rot", { akzent: "orange" });
        l.setAttribute("data-block", nr);                  // für den Knall beim Vorlesen (daten/vorlese_zeiten.js)
        return;
      }
      if (t.handschrift) { B.el("div", "handschrift", ziel, B.ersetzen(t.handschrift)); return; }
      if (t.vers) {
        var v = B.el("div", "vers", ziel);
        t.vers.forEach(function (z) { if (z === "") B.el("div", "vers-luecke", v); else B.el("div", "vers-zeile", v, B.ersetzen(z)); });
        return;
      }
      if (t.schild) {
        var s = B.el("div", "schild", ziel);
        B.el("span", "klebe klebe-l", s); B.el("span", "klebe klebe-r", s);
        t.schild.forEach(function (z) { B.el("div", "schild-zeile", s, B.ersetzen(z)); });
        return;
      }
      if (t.karte) {
        var k = B.el("div", "karte" + (t.karte.knick ? " mit-knick" : ""), ziel);
        B.el("div", "karte-titel", k, B.ersetzen(t.karte.titel));
        t.karte.zeilen.forEach(function (z) { B.el("div", "karte-zeile", k, B.ersetzen(z)); });
        if (t.karte.knick) B.el("div", "knick", k);
      }
    });
  }

  function textAlsSprache(bausteine) {
    var teile = [];
    bausteine.forEach(function (t) {
      if (typeof t === "string") teile.push(t);
      else if (t.titel) teile.push(t.titel);
      else if (t.laut) teile.push(t.laut);
      else if (t.handschrift) teile.push(t.handschrift);
      else if (t.vers) teile.push(t.vers.join(" "));
      else if (t.schild) teile.push(t.schild.join(". "));
      else if (t.karte) teile.push(t.karte.titel + ": " + t.karte.zeilen.join(", "));
    });
    return B.ersetzen(teile.join(" "));
  }

  // Schriftgröße so weit verkleinern, bis alles in den Kasten passt
  function einpassen(kasten, start, minimum) {
    var s = start || 1;
    kasten.style.fontSize = s + "em";
    var n = 0;
    while ((kasten.scrollHeight > kasten.clientHeight + 1 || kasten.scrollWidth > kasten.clientWidth + 1) && s > (minimum || 0.3) && n < 60) {
      s -= 0.04; kasten.style.fontSize = s + "em"; n++;
    }
  }

  // ── Abschnitte: Passt der Text nicht in groß, erscheint er in Teilen ──
  // (Schrift bleibt einheitlich groß; "weiter ›" blendet den nächsten Teil ein)
  function kinder(kasten) {
    return [].slice.call(kasten.children).filter(function (k) { return k.className.indexOf("weiter-marke") < 0; });
  }
  function abschnitteBilden(kasten) {
    var teile = kinder(kasten), basis = kasten.__basis || 1;
    kasten.style.fontSize = basis + "em";
    teile.forEach(function (t) { t.style.display = ""; });
    // 1) Erst versuchen, ALLES auf die Seite einzupassen (Schrift darf bis zur
    //    Mindestgröße kleiner werden) – "weiter ›" nur, wenn es wirklich nicht anders geht
    var minimum = kasten.__minimum || basis * (B.E.satzMinimum || 0.78);   // nie doppelt verkleinern
    einpassen(kasten, basis, minimum);
    if (!(kasten.scrollHeight > kasten.clientHeight + 1 || kasten.scrollWidth > kasten.clientWidth + 1)) {
      teile.forEach(function (t) { t.__abschnitt = 0; });
      kasten.__zahl = 1; kasten.__aktuell = 0; kasten.__fest = kasten.style.fontSize;
      return;
    }
    // 2) passt nicht: in der Mindestgröße auf Abschnitte verteilen
    kasten.__basis = minimum; basis = minimum;
    kasten.style.fontSize = basis + "em";
    var zentriert = kasten.className.indexOf("text-kasten") >= 0;
    if (zentriert) { kasten.style.webkitJustifyContent = "flex-start"; kasten.style.justifyContent = "flex-start"; }
    var schrift = parseFloat(window.getComputedStyle(kasten).fontSize) || 16;
    var hoehe = kasten.clientHeight - schrift * 1.6, basis = teile.length ? teile[0].offsetTop : 0;   // Platz für "weiter ›"
    var nr = 0, start = basis, imAbschnitt = 0;
    teile.forEach(function (t) {
      var unten = t.offsetTop + t.offsetHeight;
      if (unten - start > hoehe && imAbschnitt > 0) { nr++; start = t.offsetTop; imAbschnitt = 0; }
      t.__abschnitt = nr; imAbschnitt++;
    });
    if (zentriert) { kasten.style.webkitJustifyContent = ""; kasten.style.justifyContent = ""; }
    kasten.__zahl = nr + 1;
    zeigeAbschnitt(kasten, 0, true);
  }
  function zeigeAbschnitt(kasten, k, ohneBlende) {
    kasten.__aktuell = k;
    kinder(kasten).forEach(function (t) { t.style.display = t.__abschnitt === k ? "" : "none"; });
    var alt = kasten.querySelector(".weiter-marke");
    if (alt) kasten.removeChild(alt);
    var basis = kasten.__basis || 1;
    einpassen(kasten, basis, kasten.__minimum ? basis : basis * 0.85);   // ein einzelner langer Absatz darf etwas kleiner werden
    if (k < kasten.__zahl - 1) B.el("span", "weiter-marke", kasten, "weiter ›");
    if (!ohneBlende) {
      kasten.className = kasten.className.replace(/\s*blende/g, "");
      void kasten.offsetWidth;
      kasten.className += " blende";
    }
  }
  // Beim Vorlesen: Abschnitt passend zur Stelle in der Aufnahme zeigen (nach Textmenge)
  function abschnitteNachZeit(wurzel, anteil) {
    var kaesten = [].slice.call(wurzel.querySelectorAll(".satz, .text-kasten")).filter(function (k) { return k.__zahl > 1; });
    if (!kaesten.length) return;
    var teile = [], gesamt = 0;
    kaesten.forEach(function (k) {
      for (var a = 0; a < k.__zahl; a++) {
        var laenge = kinder(k).filter(function (t) { return t.__abschnitt === a; }).reduce(function (n, t) { return n + (t.textContent || "").length; }, 0);
        teile.push({ k: k, a: a, von: gesamt }); gesamt += laenge;
      }
    });
    var ziel = anteil * gesamt, gewaehlt = null;
    teile.forEach(function (t) { if (t.von <= ziel) gewaehlt = t; });
    if (gewaehlt && gewaehlt.k.__aktuell !== gewaehlt.a) zeigeAbschnitt(gewaehlt.k, gewaehlt.a);
  }

  // true = es gab noch einen Abschnitt (also nicht umblättern)
  function abschnittSchritt(richtung) {
    if (!S || S.beschaeftigt) return false;
    var kaesten = [].slice.call(S.dom.buch.querySelectorAll(".seite-links .satz, .seite-links .text-kasten, .seite-rechts .satz, .seite-rechts .text-kasten"));
    if (richtung < 0) kaesten.reverse();
    for (var i = 0; i < kaesten.length; i++) {
      var k = kaesten[i];
      if (!k.__zahl || k.__zahl < 2) continue;
      if (richtung > 0 && k.__aktuell < k.__zahl - 1) { zeigeAbschnitt(k, k.__aktuell + 1); KLANG.tippen(); return true; }
      if (richtung < 0 && k.__aktuell > 0) { zeigeAbschnitt(k, k.__aktuell - 1); KLANG.tippen(); return true; }
    }
    return false;
  }

  // ───────────────────── Eine Buchseite (Hälfte) füllen ─────────────────────
  function fuelleSeite(el, info) {
    B.leeren(el);
    el.className = el.className.replace(/\s*(leer|dunkel|rueckblende)\b/g, "");
    el.style.backgroundImage = ""; el.style.backgroundColor = "";
    if (!info) { el.className += " leer"; return; }

    if (info.typ === "original") {
      var src = bildQuelleOriginal(info.nr);
      var seite = S.daten.seiten[info.nr] || {};
      if (seite.zusatz && bildStatus(src) === false) {
        // Zusatzseite aus der deutschen Ausgabe, Foto noch nicht da → Papier-Platzhalter
        PAPIER.hinterlegen(el, "creme", { kachel: 300 });
        var fleck = B.el("div", "platzhalter-fleck zusatz", el);
        PAPIER.hinterlegen(fleck, info.nr === "kuh-r" ? "ocker" : "braun", { seed: String(info.nr) });
        var hinweis = B.el("div", "platzhalter-text", el);
        B.el("div", "platzhalter-titel", hinweis, "Seite aus der deutschen Ausgabe: " + seite.szene);
        B.el("div", "platzhalter-szene", hinweis, "Foto einsetzen: python Werkzeuge/zusatzseite_aus_foto.py <foto> kuh");
      } else {
        el.style.backgroundImage = "url(\"" + src + "\")";
        el.style.backgroundSize = "100% 100%";
        el.style.backgroundPosition = "0 0";
      }
      if (S.sprache === "en") return;              // nur zum Vergleichen (Einstellung)
      var felder = seite.textfelder || (window.TEXTFELDER && window.TEXTFELDER[info.nr]) || [];
      var texte = seite.de || [];
      // 1) Das Englische ist schon aus den Bildern entfernt (Werkzeuge/text_entfernen.py,
      //    Ordner bilder/original/de) – nur ohne diese Bilder wird notfalls abgedeckt
      if (!S.daten.bildPfadDe) felder.concat(seite.abdecken || []).forEach(function (f) {
        var d = B.el("div", "abdeckung", el);
        d.style.left = (f.x * 100 - 1.2) + "%"; d.style.top = (f.y * 100 - 0.8) + "%";
        d.style.width = (f.b * 100 + 2.4) + "%"; d.style.height = (f.h * 100 + 1.6) + "%";
        d.style.backgroundColor = f.papier || seite.papier || "#f6f4ee";
      });
      // 2) Deutscher Satz – nahe beieinanderliegende Felder werden zu EINEM
      //    durchlaufenden Satzblock (deutscher Text ist länger als englischer)
      //    Die Satzfläche (sx/sy/sb/sh) misst Werkzeuge/textfelder_erkennen.py:
      //    das ganze freie Papier rund um das Feld. Felder mit "anschluss"
      //    laufen im Block des Feldes darüber weiter.
      var bloecke = [];
      felder.forEach(function (f, i) {
        var letzter = bloecke[bloecke.length - 1];
        if ((f.anschluss || seite.zusammenfassen) && letzter) { letzter.felder.push(i); return; }
        var flaeche = f.sx !== undefined
          ? { x: f.sx, y: f.sy, b: f.sb, h: f.sh }
          : { x: f.x - 0.006, y: f.y - 0.004, b: Math.min(f.b + 0.03, 0.97 - f.x), h: Math.max(f.h, f.frei || f.h * 1.3) + 0.006 };
        bloecke.push({ flaeche: flaeche, papier: f.papier, ausrichtung: f.ausrichtung, felder: [i] });
      });
      // Textfluss: der ganze Text der Seite läuft durch mehrere Flächen nacheinander
      // (wie verkettete Textrahmen) – so passt er fast immer ohne "weiter ›"
      if (seite.textfluss) {
        var absaetzeFluss = [];
        bloecke.forEach(function (bl) {
          bl.felder.forEach(function (i) {
            var t = texte[i];
            if (t && t !== "-") absaetzeFluss = absaetzeFluss.concat(B.ersetzen(t).split(/\n\s*\n/).map(function (a) {
              return seite.zeilenZusammenziehen ? a.replace(/\s*\n\s*/g, " ") : a;   // z. B. Aufzählung fortlaufend statt untereinander
            }));
          });
        });
        if (!absaetzeFluss.length) {
          if (B.E.entwurf !== false && texte.join("") !== "-") B.el("div", "fehlt satz-hinweis", el, "Seite " + info.nr + ": deutscher Text fehlt noch");
        } else {
          var flaechen = seite.flussNurFlaechen ? seite.flussFlaechen
            : bloecke.map(function (bl) { return bl.flaeche; }).concat(seite.flussFlaechen || []);
          var kaesten = flaechen.map(function (fl) {
            var k = B.el("div", "satz", el);
            k.style.left = fl.x * 100 + "%"; k.style.top = fl.y * 100 + "%";
            k.style.width = Math.min(fl.b, 0.97 - fl.x) * 100 + "%";
            k.style.height = Math.min(fl.h, 0.975 - fl.y) * 100 + "%";
            return k;
          });
          S.einpassListe.push({ fluss: true, kaesten: kaesten, absaetze: absaetzeFluss, seite: seite, nr: info.nr });
        }
        bloecke = [];
      }
      bloecke.forEach(function (bl, bi) {
        var teile = bl.felder.map(function (i) { return { i: i, text: texte[i] }; }).filter(function (t) { return t.text !== "-"; });
        if (!teile.length) return;                  // absichtlich leer
        var box = B.el("div", "satz", el), fl = bl.flaeche;
        box.__basis = SATZ_GROESSE * (seite.schrift || 1);              // z. B. Impressum etwas kleiner
        box.style.left = fl.x * 100 + "%"; box.style.top = fl.y * 100 + "%";
        box.style.width = Math.min(fl.b, 0.97 - fl.x) * 100 + "%";
        box.style.height = Math.min(fl.h, 0.975 - fl.y) * 100 + "%";
        if (bl.ausrichtung) box.style.textAlign = bl.ausrichtung;
        var ersterAbsatz = true;
        teile.forEach(function (t) {
          if (!t.text) {
            if (B.E.entwurf !== false) B.el("div", "fehlt", box, "Seite " + info.nr + (felder.length > 1 ? ", Feld " + (t.i + 1) : "") + ": deutscher Text fehlt noch");
            return;
          }
          B.ersetzen(t.text).split(/\n\s*\n/).forEach(function (a) {
            // Initiale nur bei "breiten" Buchstaben – ein einzelnes I oder J sähe wie ein Strich aus
            var mitInitiale = ersterAbsatz && bi === 0 && seite.initiale !== false && /^[A-HK-ZÄÖÜ]/.test(a);
            var p = B.el("p", mitInitiale ? "mit-initiale" : "", box);
            if (mitInitiale) {
              var ini = B.el("span", "initiale", p, a.charAt(0));
              PAPIER.schriftFuellen(ini, ["rot", "blau", "gruen", "orange"][(typeof info.nr === "number" ? info.nr : 1) % 4], { akzent: "gelb" });
              p.appendChild(document.createTextNode(a.slice(1)));
            } else p.textContent = a;
            ersterAbsatz = false;
          });
        });
        S.einpassListe.push(box);
      });
      if (seite.titelFeld) {
        var tf = seite.titelFeld, tb = B.el("div", "titelfeld-de", el);
        tb.style.left = tf.x * 100 + "%"; tb.style.top = tf.y * 100 + "%"; tb.style.width = tf.b * 100 + "%"; tb.style.height = tf.h * 100 + "%";
        var innen = B.el("div", "titelfeld-innen", tb);
        B.ersetzen(tf.text).split("\n").forEach(function (z) { var zz = B.el("div", "", innen, z); PAPIER.schriftFuellen(zz, "blau", { akzent: "tiefblau" }); });
        tb.__start = (tf.schrift || 1) * 2.2;
        S.einpassListe.push(tb);
      }
      return;
    }

    // Fortsetzung
    var s = info.seite, haelfte = info.haelfte;
    var textSeite = (s.textPos === "links") ? "links" : "rechts";
    if (s.dunkel) el.className += " dunkel";
    if (s.rueckblende) el.className += " rueckblende";
    var q = bildQuelleFortsetzung(s);
    if (bildStatus(q) === true) {
      el.style.backgroundImage = "url(\"" + q + "\")";
      el.style.backgroundSize = "200% 100%";
      el.style.backgroundPosition = haelfte === "links" ? "0 0" : "100% 0";
    } else {
      PAPIER.hinterlegen(el, s.dunkel ? "tiefblau" : "creme", { kachel: 300 });
      if (haelfte !== textSeite) {
        var farben = ["blau", "rot", "gruen", "gelb", "orange", "lila", "hellblau"];
        var fleck = B.el("div", "platzhalter-fleck", el);
        PAPIER.hinterlegen(fleck, farben[parseInt(s.id.replace(/\D/g, ""), 10) % farben.length], { seed: s.id });
        var hinweis = B.el("div", "platzhalter-text", el);
        B.el("div", "platzhalter-titel", hinweis, "Hier kommt das Bild hin (" + s.bild.datei + ")");
        B.el("div", "platzhalter-szene", hinweis, B.ersetzen(s.bild.szene));
      }
    }
    if (haelfte === textSeite) {
      var kasten = B.el("div", "text-kasten text-" + textSeite + (s.textPos === "unten" ? " text-unten" : "") +
                              (s.art === "titel" ? " ist-titel" : "") + (s.art === "widmung" ? " ist-widmung" : ""), el);
      // eigene Ränder für diese Seite (in % der Buchseite), z. B. wenn ein Bildteil in die Textspalte ragt
      if (s.textRand) ["links", "rechts", "oben", "unten"].forEach(function (k) {
        if (s.textRand[k] != null) kasten.style[{ links: "left", rechts: "right", oben: "top", unten: "bottom" }[k]] = s.textRand[k] + "%";
      });
      baueText(kasten, s.text, s);
      S.einpassListe.push(kasten);
    }
    // Schild direkt auf dem Bild (z. B. an der Tür)
    if (s.schildAufBild && bildStatus(q) === true) {
      var sb = s.schildAufBild, istRechts = sb.x >= 0.5;
      if ((istRechts && haelfte === "rechts") || (!istRechts && haelfte === "links")) {
        var schild = B.el("div", "schild-auf-bild", el);
        schild.style.left = ((istRechts ? sb.x - 0.5 : sb.x) * 200) + "%"; schild.style.top = sb.y * 100 + "%";
        schild.style.width = sb.b * 200 + "%"; schild.style.height = sb.h * 100 + "%";
        sb.zeilen.forEach(function (z) { B.el("div", "", schild, B.ersetzen(z)); });
      }
    }
  }

  function allesEinpassen() {
    var liste = S.einpassListe; S.einpassListe = [];
    liste.forEach(function (k) {
      if (k.fluss) { flussVerteilen(k); return; }
      if (k.className.indexOf("satz") >= 0 || k.className.indexOf("text-kasten") >= 0) abschnitteBilden(k);
      else einpassen(k, k.__start || 1);
    });
  }

  // Textfluss: größte Schrift suchen, bei der ALLE Absätze in die Flächen passen
  function flussVerteilen(auftrag) {
    var kaesten = auftrag.kaesten, absaetze = auftrag.absaetze, seite = auftrag.seite;
    var basis = SATZ_GROESSE * (seite.schrift || 1), minimum = basis * (B.E.satzMinimum || 0.78);
    function ueberlauf(k) { return k.scrollHeight > k.clientHeight + 1 || k.scrollWidth > k.clientWidth + 1; }
    function absatz(i) {
      var a = absaetze[i], p = document.createElement("p");
      if (i === 0 && seite.initiale !== false && /^[A-HK-ZÄÖÜ]/.test(a)) {
        p.className = "mit-initiale";
        var ini = B.el("span", "initiale", p, a.charAt(0));
        PAPIER.schriftFuellen(ini, ["rot", "blau", "gruen", "orange"][(typeof auftrag.nr === "number" ? auftrag.nr : 1) % 4], { akzent: "gelb" });
        p.appendChild(document.createTextNode(a.slice(1)));
      } else p.textContent = a;
      return p;
    }
    function fuellen(s, restInDenLetzten) {
      kaesten.forEach(function (k) { B.leeren(k); k.style.display = ""; k.style.fontSize = s + "em"; k.__basis = s; });
      var i = 0;
      for (var b = 0; b < kaesten.length && i < absaetze.length; b++) {
        var k = kaesten[b];
        while (i < absaetze.length) {
          var p = absatz(i);
          k.appendChild(p);
          if (ueberlauf(k)) { k.removeChild(p); break; }
          i++;
        }
      }
      if (i < absaetze.length && restInDenLetzten) {
        var letzter = kaesten[kaesten.length - 1];
        while (i < absaetze.length) { letzter.appendChild(absatz(i)); i++; }
      }
      kaesten.forEach(function (k) { if (!k.firstChild) k.style.display = "none"; k.__zahl = 1; k.__aktuell = 0; });
      return i >= absaetze.length;
    }
    for (var s = basis; s >= minimum - 0.0001; s -= 0.03) if (fuellen(s)) return;
    // passt selbst in der Mindestgröße nicht: Rest in die letzte Fläche, dort Abschnitte
    fuellen(minimum, true);
    var sichtbar = kaesten.filter(function (k) { return k.firstChild; });
    if (sichtbar.length) { var l = sichtbar[sichtbar.length - 1]; l.__basis = minimum; l.__minimum = minimum; abschnitteBilden(l); }
  }

  // ───────────────────── Ebenen (freigestellte Teile, animiert) ─────────────────────
  function zeigeEbenen() {
    var schicht = S.dom.ebenen;
    B.leeren(schicht); schicht.style.opacity = "0";
    S.taktTeile = {};
    var ds = S.doppelseiten[S.index], irgendwas = false;
    if (S.typ === "fortsetzung") {
      var eb = window.EBENEN && window.EBENEN[ds.seite.id];
      if (eb) {
        if (eb.hintergrund) { var bg = B.el("img", "ebene-hintergrund", schicht); bg.src = eb.hintergrund; }
        (eb.teile || []).forEach(function (t) { ebeneSetzen(schicht, t, 0, 1); });
        irgendwas = true;
      }
      // Blinzeln auch in der Fortsetzung (Augen relativ zur ganzen Doppelseite, nur wenn das Bild da ist)
      if (bildStatus(bildQuelleFortsetzung(ds.seite)) === true) {
        ((window.ORIGINAL_AUGEN || {})[ds.seite.id] || []).forEach(function (auge) {
          lidSetzen(schicht, auge, null, 0, 1, ds.seite.id);
          irgendwas = true;
        });
      }
    } else {
      // Originalseiten: frei liegende Bildteile + Papier-"Loch" darunter
      [["links", 0], ["rechts", 0.5]].forEach(function (p) {
        var nr = ds[p[0]];
        if (!nr) return;
        // von der Bild-KI freigestellte Figuren (Werkzeuge/ebenen_vorbereiten.py, Ordner o05 usw.)
        var ki = window.EBENEN && window.EBENEN["o" + (nr < 10 ? "0" : "") + nr];
        if (ki) {
          if (ki.hintergrund) {
            var hg = B.el("img", "ebene-hintergrund", schicht); hg.src = ki.hintergrund;
            hg.style.left = p[1] * 100 + "%"; hg.style.width = "50%";
          }
          (ki.teile || []).forEach(function (t) { ebeneSetzen(schicht, t, p[1], 0.5); });
          irgendwas = true;
        }
        var cfg = S.daten.seiten[nr] && S.daten.seiten[nr].teile;
        // frei liegende Teile (original_teile.js) + ausgeschnittene Figuren (original_figuren.js)
        var alle = ((window.ORIGINAL_TEILE || {})[nr] || []).concat((window.ORIGINAL_FIGUREN || {})[nr] || []);
        var halterJe = {};
        (cfg && alle.length ? cfg : []).forEach(function (c) {
          var t = alle.filter(function (a) { return a.nr === c.nr; })[0];
          if (!t) return;
          var eintrag = { bild: t.bild, loch: t.loch, x: t.x, y: t.y, b: t.b, h: t.h, anim: c.anim, dauer: c.dauer, verzoegerung: c.verzoegerung,
                          drehpunkt: c.drehpunkt || t.drehpunkt, takt: c.takt, z: 2 };
          var halter = ebeneSetzen(schicht, eintrag, p[1], 0.5);
          halterJe[c.nr] = { halter: halter, teil: t };
          if (c.takt) S.taktTeile[c.nr] = halter;          // bewegt sich nur, wenn der Takt es auslöst
          irgendwas = true;
        });
        // Blinzeln (daten/original_augen.js): Lider sitzen im bewegten Teil, wenn der Kopf sich bewegt
        ((window.ORIGINAL_AUGEN || {})[nr] || []).forEach(function (auge) {
          var tr = auge.traeger && halterJe[auge.traeger];
          if (auge.traeger && !tr) return;                  // Kopf gerade nicht als Teil da → dann auch kein Lid
          lidSetzen(tr ? tr.halter : schicht, auge, tr ? tr.teil : null, p[1], 0.5, nr);
          irgendwas = true;
        });
      });
    }
    if (irgendwas) setTimeout(function () { schicht.style.opacity = "1"; }, 30);
  }

  // Ein Augenlid: Hautfarbe aus dem Bild, schließt sich von oben – jede Figur in ihrem eigenen Rhythmus
  function zufallAus(text) {                            // gleicher Name → gleicher Takt (beide Augen zusammen)
    var h = 7;
    for (var i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 100003;
    return (h % 1000) / 1000;
  }
  function lidSetzen(ziel, auge, teil, versatz, faktor, nr) {
    var x = auge.x - auge.b / 2, y = auge.y - auge.h / 2, links, oben, breite, hoehe;
    if (teil) {
      links = (x - teil.x) / teil.b; oben = (y - teil.y) / teil.h; breite = auge.b / teil.b; hoehe = auge.h / teil.h;
    } else {
      links = versatz + x * faktor; oben = y; breite = auge.b * faktor; hoehe = auge.h;
    }
    var h = B.el("div", "augen-halter", ziel);
    h.style.left = links * 100 + "%"; h.style.top = oben * 100 + "%";
    h.style.width = breite * 100 + "%"; h.style.height = hoehe * 100 + "%";
    B.transform(h, "rotate(" + (auge.winkel || 0) + "deg)");
    var lid = B.el("div", "augenlid", h);
    lid.style.backgroundColor = auge.farbe;
    lid.style.borderBottomColor = auge.rand;
    var z = zufallAus(nr + auge.gruppe), name, dauer;
    if (auge.art === "zwinker") { name = "kf-lid-zwinker"; dauer = 9; }
    else if (auge.art === "zwinker-mit") { name = "kf-lid-mit"; dauer = 9; }
    else { name = z > 0.7 ? "kf-lid-doppelt" : "kf-lid"; dauer = 3.8 + z * 2.8; }
    var wert = name + " " + dauer.toFixed(2) + "s linear " + (-(z * dauer)).toFixed(2) + "s infinite";
    lid.style.webkitAnimation = wert; lid.style.animation = wert;
  }

  var SATZ_GROESSE = 0.9;      // Grundgröße des deutschen Satzes im Original (relativ zur Buchgröße)

  var ANIM_DAUER = { wackeln: 2.4, schweben: 3.2, atmen: 3.5, huepfen: 1.4, drehen: 30, zittern: 0.6, hereinkleben: 0.9, puff: 1.2, pendeln: 2.8,
                     sanftdrehen: 7, steigen: 4.5, paddeln: 3.2, flackern: 0.9, wenden: 4.2, nicken: 3.6,
                     kraehen: 7, picken: 4, drohen: 3.6, gabel: 4.5, kraehen1: 2.6, ohrzucken: 5.5, loeffel: 3.4, winken: 3.4 };
  var ANIM_DREHPUNKT = { nicken: [0.55, 1], flackern: [0.5, 1], wackeln: [0.5, 0.9], paddeln: [0.5, 0.85], wenden: [0.5, 0.5], sanftdrehen: [0.5, 0.5], steigen: [0.5, 0.8] };

  // Ein Teil auf die Ebenen-Schicht setzen (x/y/b/h relativ; versatz/faktor für Seitenhälften)
  function ebeneSetzen(schicht, t, versatz, faktor) {
    if (t.loch) {
      var loch = B.el("img", "ebene-loch", schicht);
      loch.src = t.loch;
      loch.style.left = (versatz + t.x * faktor) * 100 + "%"; loch.style.top = t.y * 100 + "%";
      loch.style.width = t.b * faktor * 100 + "%"; loch.style.height = t.h * 100 + "%";
    }
    var halter = B.el("div", "ebene", schicht);
    halter.style.left = (versatz + t.x * faktor) * 100 + "%"; halter.style.top = t.y * 100 + "%";
    halter.style.width = t.b * faktor * 100 + "%"; halter.style.height = t.h * 100 + "%";
    halter.style.zIndex = t.z || 1;
    var anim = t.anim || "zittern";
    var dp = t.drehpunkt || ANIM_DREHPUNKT[anim] || [0.5, 0.9];
    halter.style.webkitTransformOrigin = halter.style.transformOrigin = (dp[0] * 100) + "% " + (dp[1] * 100) + "%";
    var img = B.el("img", "", halter); img.src = t.bild;
    if (t.bild2) { var img2 = B.el("img", "ebene-bild2", halter); img2.src = t.bild2; img2.style.webkitAnimationDuration = img2.style.animationDuration = (t.blinzelDauer || 4) + "s"; }
    var dauer = t.dauer || ANIM_DAUER[anim] || 3;
    var einmal = (anim === "hereinkleben" || anim === "puff");
    var wert = "kf-" + anim + " " + dauer + "s " + (anim === "drehen" ? "linear" : "ease-in-out") + " " + (t.verzoegerung || 0) + "s " + (einmal ? "1 both" : "infinite");
    if (!t.takt) { halter.style.webkitAnimation = wert; halter.style.animation = wert; }
    return halter;
  }

  // ───────────────────── Takt: Bewegung + Ton + Effekt im selben Augenblick ─────────────────────
  // z. B. der Hahn legt den Kopf zurück, kräht – und nur dann kommen die Schallwellen.
  // Seite: takt: [{ teil, anim, dauer, ton, laut, effekt, erstes (s), alle: [von, bis] (s) }]
  // Umschlag vorn/hinten: das geschlossene Buch liegt mittig (CSS schiebt es um eine halbe Seite)
  function buchKlasse(ds) {
    return "buch" + (ds.links === null ? " nur-rechts" : "") + (ds.rechts === null ? " nur-links" : "");
  }

  function taktStoppen() {
    if (!S) return;
    (S.taktTimer || []).forEach(clearTimeout);
    S.taktTimer = [];
  }
  function taktStarten(ds) {
    taktStoppen();
    if (S.typ !== "original") return;
    var indexBeiStart = S.index;
    [ds.links, ds.rechts].forEach(function (nr) {
      var seite = nr && S.daten.seiten[nr];
      ((seite && seite.takt) || []).forEach(function (tk) {
        function feuern() {
          if (!S || S.index !== indexBeiStart || S.beschaeftigt) return;
          var el = S.taktTeile[tk.teil];
          if (el) {
            var wert = "kf-" + tk.anim + " " + (tk.dauer || 2.5) + "s ease-in-out 0s 1 both";
            el.style.webkitAnimation = el.style.animation = "none";
            void el.offsetWidth;                                  // Animation von vorn beginnen
            el.style.webkitAnimation = wert; el.style.animation = wert;
          }
          if (tk.ton) KULISSE.spiele(tk.ton, tk.laut);
          if (tk.effekt) EFFEKTE.ausloesen(tk.effekt);
          S.taktTimer.push(setTimeout(feuern, B.zufall(tk.alle[0], tk.alle[1]) * 1000));
        }
        S.taktTimer.push(setTimeout(feuern, (tk.erstes || 1) * 1000));
      });
    });
  }

  // ───────────────────── Größe ─────────────────────
  function groesseAnpassen() {
    var buehne = S.dom.buehne, rand = 14;
    var bw = buehne.clientWidth - rand * 2, bh = buehne.clientHeight - rand * 2;
    var verh = 2 * S.daten.seitenVerhaeltnis;
    var w = Math.min(bw, bh * verh), h = w / verh;
    S.w = Math.floor(w); S.h = Math.floor(h);
    var buch = S.dom.buch;
    buch.style.width = S.w + "px"; buch.style.height = S.h + "px";
    buch.style.fontSize = (S.h * 0.028) + "px";
    B.canvasGroesse(S.dom.effekte, S.w, S.h);
  }

  // ───────────────────── Anzeigen einer Doppelseite ─────────────────────
  function zeigeDoppelseite() {
    var ds = S.doppelseiten[S.index];
    S.einpassListe = [];
    fuelleSeite(S.dom.links, haelfteInfo(ds, "links"));
    fuelleSeite(S.dom.rechts, haelfteInfo(ds, "rechts"));
    allesEinpassen();
    seiteBetreten();
  }

  function seiteBetreten() {
    var ds = S.doppelseiten[S.index];
    B.merken("seite." + S.typ, S.index);
    S.dom.zahl.textContent = (S.index + 1) + " / " + S.doppelseiten.length;
    S.dom.pfeilL.style.visibility = S.index > 0 ? "visible" : "hidden";
    S.dom.pfeilR.style.visibility = S.index < S.doppelseiten.length - 1 ? "visible" : "hidden";
    S.dom.buch.className = buchKlasse(ds);
    zeigeEbenen();
    starteEffekte();
    taktStarten(ds);
    // Geräusche: echte Klangkulisse (daten/klang.js) + eingebaute Computer-Töne
    var ohneTon = KULISSE.seite(S.typ, klangSchluessel(S.index), [klangSchluessel(S.index - 1), klangSchluessel(S.index + 1)]);
    var toene = [];
    if (S.typ === "original") {
      [ds.links, ds.rechts].forEach(function (nr) { if (nr && S.daten.seiten[nr] && S.daten.seiten[nr].ton) toene.push(S.daten.seiten[nr].ton); });
    } else if (ds.seite.ton) toene.push(ds.seite.ton);
    if (!ohneTon) toene.forEach(function (t, i) { setTimeout(function () { KLANG.abspielen(t); }, 350 + i * 900); });
    // Nächste Bilder schon laden
    for (var k = 1; k <= 2; k++) {
      var n = S.doppelseiten[S.index + k];
      if (!n) continue;
      if (S.typ === "original") { if (n.links) vorladen(bildQuelleOriginal(n.links)); if (n.rechts) vorladen(bildQuelleOriginal(n.rechts)); }
      else vorladen(bildQuelleFortsetzung(n.seite));
    }
    // Spezialseiten
    if (S.typ === "fortsetzung" && ds.seite.art === "flug") setTimeout(function () { if (S && S.doppelseiten[S.index] === ds) FLUG.starten(); }, 700);
    if (S.vorlesen) vorlesenStarten();
  }

  function klangSchluessel(i) {
    var ds = S.doppelseiten[i];
    if (!ds) return "";
    if (S.typ !== "original") return ds.seite.id;
    return [ds.links, ds.rechts].filter(function (n) { return n !== null && n !== undefined; }).join("+");
  }

  function starteEffekte() {
    var ds = S.doppelseiten[S.index], auftraege = [];
    if (S.typ === "original") {
      [["links", 0], ["rechts", 1]].forEach(function (p) {
        var nr = ds[p[0]];
        if (!nr) return;
        var seite = S.daten.seiten[nr] || {};
        var src = bildQuelleOriginal(nr);
        (seite.effekte || []).forEach(function (e) {
          auftraege.push({ eff: e, rechteck: { x: p[1] * S.w / 2, y: 0, b: S.w / 2, h: S.h }, bild: bildCache[src] && bildCache[src].img });
        });
      });
    } else {
      // Fortsetzung: ein Bild über die ganze Doppelseite – es wird mitgegeben, damit gemalte Flammen,
      // Tücher usw. ("wellen") sich bewegen können
      var fsrc = bildQuelleFortsetzung(ds.seite);
      (ds.seite.effekte || []).forEach(function (e) {
        auftraege.push({ eff: e, rechteck: { x: 0, y: 0, b: S.w, h: S.h }, bild: bildCache[fsrc] && bildCache[fsrc].ok && bildCache[fsrc].img });
      });
    }
    EFFEKTE.starten(S.dom.effekte, auftraege);
  }

  // ───────────────────── Umblättern ─────────────────────
  function umblaettern(richtung) {
    if (!S || S.beschaeftigt) return;
    var neu = S.index + richtung;
    if (neu < 0 || neu >= S.doppelseiten.length) return;
    S.beschaeftigt = true;
    vorlesenStoppen(true);
    taktStoppen();
    FLUG.stoppen();
    EFFEKTE.stoppen();
    S.dom.ebenen.style.opacity = "0";
    if (!KULISSE.blaettern()) KLANG.blaettern();

    var alt = S.doppelseiten[S.index], nd = S.doppelseiten[neu];
    S.dom.buch.className = buchKlasse(nd);              // gleitet beim Auf-/Zuklappen in die Mitte bzw. zur Seite
    var vorwaerts = richtung > 0;
    var blatt = B.el("div", "blatt " + (vorwaerts ? "blatt-rechts" : "blatt-links"), S.dom.buch);
    var vorn = B.el("div", "seite blatt-vorn", blatt), hinten = B.el("div", "seite blatt-hinten", blatt);
    var schattenV = B.el("div", "blatt-schatten", vorn), schattenH = B.el("div", "blatt-schatten", hinten);
    S.einpassListe = [];
    if (vorwaerts) {
      fuelleSeite(vorn, haelfteInfo(alt, "rechts")); fuelleSeite(hinten, haelfteInfo(nd, "links"));
      fuelleSeite(S.dom.rechts, haelfteInfo(nd, "rechts"));
    } else {
      fuelleSeite(vorn, haelfteInfo(alt, "links")); fuelleSeite(hinten, haelfteInfo(nd, "rechts"));
      fuelleSeite(S.dom.links, haelfteInfo(nd, "links"));
    }
    vorn.appendChild(schattenV); hinten.appendChild(schattenH);
    allesEinpassen();
    if (vorwaerts ? !nd.rechts && S.typ === "original" : !nd.links && S.typ === "original") { /* leere Hälfte bleibt leer */ }

    var dauer = 900;
    B.transform(blatt, "rotateY(0deg)");
    // erzwingen, dass der Browser den Startzustand sieht
    void blatt.offsetWidth;
    B.transition(blatt, "-webkit-transform " + dauer + "ms cubic-bezier(.45,.05,.3,1), transform " + dauer + "ms cubic-bezier(.45,.05,.3,1)");
    B.transition(schattenV, "opacity " + dauer + "ms ease-in"); B.transition(schattenH, "opacity " + dauer + "ms ease-out");
    schattenV.style.opacity = "0"; schattenH.style.opacity = "0.5";
    B.frame(function () {
      B.transform(blatt, vorwaerts ? "rotateY(-180deg)" : "rotateY(180deg)");
      schattenV.style.opacity = "0.45"; schattenH.style.opacity = "0";
    });
    B.nachTransition(blatt, dauer, function () {
      S.index = neu;
      S.einpassListe = [];
      if (vorwaerts) fuelleSeite(S.dom.links, haelfteInfo(nd, "links"));
      else fuelleSeite(S.dom.rechts, haelfteInfo(nd, "rechts"));
      allesEinpassen();
      if (blatt.parentNode) blatt.parentNode.removeChild(blatt);
      S.beschaeftigt = false;
      seiteBetreten();
    });
  }
  BUCH.weiter = function () { if (!abschnittSchritt(1)) umblaettern(1); };
  BUCH.zurueck = function () { if (!abschnittSchritt(-1)) umblaettern(-1); };

  // ───────────────────── Vorlesen ─────────────────────
  var audio = null, vorleseLauf = 0;                     // jede Vorlese-Runde hat ihre eigene Nummer
  function vorlesenStoppen(nurAudio) {
    vorleseLauf++;
    if (audio) { try { audio.pause(); } catch (e) {} audio.onended = audio.onerror = null; }
    KLANG.stumm();
    if (S && S.weiterTimer) { clearTimeout(S.weiterTimer); S.weiterTimer = null; }
    if (!nurAudio && S) { KULISSE.leiser(false); S.vorlesen = false; S.dom.vorlesen.className = "knopf vorlesen"; S.dom.vorlesen.textContent = "▶ Vorlesen"; }
  }
  function vorlesenStarten() {
    var ds = S.doppelseiten[S.index], stueck = [];
    if (S.typ === "original") {
      [ds.links, ds.rechts].forEach(function (nr) {
        if (!nr) return;
        var seite = S.daten.seiten[nr] || {};
        stueck.push({ audio: B.pfad(S.daten.audioPfad, nr), text: (seite.de || []).join(" "), seiteEl: nr === ds.links ? S.dom.links : S.dom.rechts });
      });
    } else {
      var zeiten = window.VORLESE_ZEITEN && VORLESE_ZEITEN.fortsetzung && VORLESE_ZEITEN.fortsetzung[ds.seite.id];
      stueck.push({ audio: S.daten.audioPfad + ds.seite.id, text: textAlsSprache(ds.seite.text), seiteEl: S.dom.buch,
                    ereignisse: zeiten && zeiten.ereignisse ? zeiten.ereignisse.slice() : [] });
    }
    var i = 0, indexBeiStart = S.index;
    function naechstes() {
      if (!S || !S.vorlesen || S.index !== indexBeiStart) return;
      if (i >= stueck.length) {
        S.weiterTimer = setTimeout(function () {
          if (!S || !S.vorlesen || S.index !== indexBeiStart) return;
          var ds2 = S.doppelseiten[S.index];
          if (S.typ === "fortsetzung" && ds2.seite.art === "schattentheater") { SCHATTEN.starten(ds2.seite.schattenVerse, function () { if (S && S.vorlesen) BUCH.weiter(); }); return; }
          if (S.index < S.doppelseiten.length - 1) BUCH.weiter(); else vorlesenStoppen();
        }, S.typ === "fortsetzung" && ds.seite.art === "flug" ? 5200 : 1400);
        return;
      }
      var st = stueck[i++];
      if (!audio) audio = new Audio();
      // Kevins Aufnahmen: .m4a (aus dem Aufnahmestudio), sonst .mp3 oder .wav – der Reihe nach probieren
      var endungen = [".m4a", ".mp3", ".wav"], versuch = 0, erledigt = false;
      function keineAufnahme() {
        if (erledigt) return; erledigt = true;
        if (B.E.vorlesenMitComputerstimme && st.text) KLANG.sprechen(st.text, naechstes);
        else setTimeout(naechstes, st.text ? 4000 : 2500);
      }
      function probiere() {
        if (versuch >= endungen.length) { keineAufnahme(); return; }
        audio.src = st.audio + endungen[versuch++];
        var p = audio.play();
        if (p && p["catch"]) p["catch"](function (fehler) { if (fehler && fehler.name === "NotAllowedError") keineAufnahme(); });
      }
      audio.onended = function () { audio.ontimeupdate = null; if (!erledigt) { erledigt = true; naechstes(); } };
      // Geräuschwörter, die Kevin absichtlich nicht spricht (PUFF!, DÖÖÖM!, HOPP!): genau in seiner Pause
      // springt das Wort auf und das Geräusch kommt. Geprüft im feinen 40-ms-Takt UND bei jedem timeupdate
      // (das kommt nur alle ~¼ s, wird aber nie gedrosselt) – was zuerst kommt, gewinnt.
      var offen = (st.ereignisse || []).slice(), meinLauf = vorleseLauf;
      function laute() {
        if (meinLauf !== vorleseLauf || !offen.length || audio.paused) return;
        var t = audio.currentTime || 0;
        offen = offen.filter(function (e) { if (t >= e.zeit - 0.08) { lautKnall(e); return false; } return true; });
      }
      audio.ontimeupdate = function () {
        laute();
        if (audio.duration) abschnitteNachZeit(st.seiteEl, audio.currentTime / audio.duration);
      };
      if (offen.length) (function wache() {
        if (!S || meinLauf !== vorleseLauf || !S.vorlesen || !offen.length) return;
        laute();
        setTimeout(wache, 40);
      })();
      audio.onerror = function () { probiere(); };
      probiere();
    }
    naechstes();
  }

  // Ein Geräuschwort knallt: Wort springt auf, passendes Geräusch dazu
  function lautKnall(e) {
    var el = S && S.dom.buch.querySelector('.laut[data-block="' + e.block + '"]');
    if (el) {
      el.className = el.className.replace(/\s*laut-knall\b/g, "");
      void el.offsetWidth;
      el.className += " laut-knall";
    }
    var w = (e.wort || "").toUpperCase();
    if (/PUFF|PUFF/.test(w)) KLANG.puff();
    else if (/D[ÖO]+M|BUMM|RUMMS/.test(w)) KLANG.orgel();
    else if (/HOPP|HUI/.test(w)) { if (!KULISSE.spiele("ev_wenden", 0.9)) KLANG.hopp(); }
    else KLANG.plopp();
  }

  // ───────────────────── Öffnen / Schließen ─────────────────────
  BUCH.oeffnen = function (ziel, typ, zurKueche) {
    var daten = typ === "original" ? window.ORIGINAL : window.FORTSETZUNG;
    B.leeren(ziel);
    var wurzel = B.el("div", "buch-bildschirm " + typ, ziel);
    var leiste = B.el("div", "leiste", wurzel);
    var kueche = B.el("button", "knopf", leiste, "⌂ Zur Küche");
    B.el("div", "leiste-titel", leiste, B.ersetzen(daten.titel));
    var geraeusche = B.el("button", "knopf geraeusche", leiste, "♪");
    var vorlesen = B.el("button", "knopf vorlesen", leiste, "▶ Vorlesen");
    function geraeuscheZeigen() { geraeusche.className = "knopf geraeusche" + (KULISSE.istAn() ? "" : " aus"); }
    geraeuscheZeigen();
    var buehne = B.el("div", "buehne", wurzel);
    var buch = B.el("div", "buch", buehne);
    var links = B.el("div", "seite seite-links", buch);
    var rechts = B.el("div", "seite seite-rechts", buch);
    B.el("div", "falz", buch);
    var ebenen = B.el("div", "ebenen-schicht", buch);
    var effekte = B.el("canvas", "effekt-schicht", buch);
    var pfeilL = B.el("button", "pfeil pfeil-links", wurzel, "‹");
    var pfeilR = B.el("button", "pfeil pfeil-rechts", wurzel, "›");
    var zahl = B.el("div", "seitenzahl", wurzel);
    var dreh = B.el("div", "dreh-hinweis", wurzel);
    // Hochkant-Hinweis als Papier-Collage mit Stop-Motion (8 Bilder/s); der Satz bleibt echter Text
    var collage = B.el("div", "dreh-collage", dreh);
    var schwenk = B.el("div", "dreh-ipad-schwenk", collage);
    function collageBild(eltern, cls) {
      var i = B.el("img", cls, eltern);
      i.setAttribute("alt", ""); i.setAttribute("aria-hidden", "true");
      return i;
    }
    var hkIpad = collageBild(schwenk, "dreh-ipad-bild");
    var hkPfannkuchen = collageBild(collage, "dreh-pfannkuchen");
    var hkPfeil = collageBild(collage, "dreh-pfeil");
    B.el("div", "dreh-text", dreh, "Bitte das iPad quer halten");

    S = {
      typ: typ, daten: daten, dom: { wurzel: wurzel, buehne: buehne, buch: buch, links: links, rechts: rechts, ebenen: ebenen, effekte: effekte, pfeilL: pfeilL, pfeilR: pfeilR, zahl: zahl, vorlesen: vorlesen },
      doppelseiten: typ === "original" ? doppelseitenOriginal(daten) : daten.seiten.map(function (s) { return { seite: s }; }),
      index: 0, beschaeftigt: false, vorlesen: false, einpassListe: [],
      sprache: B.E.originalSprache === "en" ? "en" : "de"
    };
    S.index = B.klemme(B.erinnern("seite." + typ, 0), 0, S.doppelseiten.length - 1);
    KULISSE.buchAuf(typ);
    hochkantEinrichten(hkIpad, hkPfannkuchen, hkPfeil);

    B.tippen(kueche, function (ev) { ev.stopPropagation(); BUCH.schliessen(); zurKueche(); });
    B.tippen(vorlesen, function (ev) {
      ev.stopPropagation();
      if (S.vorlesen) { vorlesenStoppen(); return; }
      S.vorlesen = true; vorlesen.className = "knopf vorlesen an"; vorlesen.textContent = "■ Vorlesen stoppen";
      KLANG.entsperren(); KULISSE.leiser(true);
      vorlesenStarten();
    });
    B.tippen(geraeusche, function (ev) { ev.stopPropagation(); KLANG.entsperren(); KULISSE.umschalten(); geraeuscheZeigen(); });
    B.tippen(pfeilL, function (ev) { ev.stopPropagation(); BUCH.zurueck(); });
    B.tippen(pfeilR, function (ev) { ev.stopPropagation(); BUCH.weiter(); });

    // Tippen auf die Bühne: links/rechts blättern, Mitte = Spezialaktion
    var wischStart = null, gewischt = false;
    buehne.addEventListener("touchstart", function (ev) { var t = ev.touches[0]; wischStart = { x: t.clientX, y: t.clientY, zeit: B.jetzt() }; gewischt = false; }, false);
    buehne.addEventListener("touchend", function (ev) {
      if (!wischStart) return;
      var t = ev.changedTouches[0], dx = t.clientX - wischStart.x, dy = t.clientY - wischStart.y;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3 && B.jetzt() - wischStart.zeit < 800) { gewischt = true; if (dx < 0) BUCH.weiter(); else BUCH.zurueck(); }
      wischStart = null;
    }, false);
    B.tippen(buehne, function (ev) {
      if (gewischt) { gewischt = false; return; }
      KLANG.entsperren();
      if (FLUG.laeuft()) { FLUG.fangen(ev); return; }
      if (ev.target && ev.target.className === "weiter-marke") { BUCH.weiter(); return; }
      var r = buch.getBoundingClientRect();
      var x = (ev.clientX - r.left) / r.width;
      var ds = S.doppelseiten[S.index];
      var spezial = S.typ === "fortsetzung" && ds.seite.art;
      if (spezial === "schattentheater" && x > 0.2 && x < 0.8) { vorlesenStoppen(); SCHATTEN.starten(ds.seite.schattenVerse, function () {}); return; }
      if (spezial === "widmung" && x > 0.5) { BUCH.schliessen(); APP.zeige("finale"); return; }
      if (spezial === "flug" && x > 0.15 && x < 0.7) { FLUG.starten(); return; }
      if (x > 0.62) BUCH.weiter(); else if (x < 0.38) BUCH.zurueck();
    });

    S.tasten = function (ev) {
      if (ev.keyCode === 39 || ev.keyCode === 32) BUCH.weiter();
      else if (ev.keyCode === 37) BUCH.zurueck();
      else if (ev.keyCode === 27) { BUCH.schliessen(); zurKueche(); }
    };
    document.addEventListener("keydown", S.tasten, false);
    S.groesse = function () { if (!S) return; groesseAnpassen(); zeigeDoppelseite(); hochkantPruefen(); };
    window.addEventListener("resize", S.groesse, false);
    window.addEventListener("orientationchange", S.groesse, false);

    // Bilder der Fortsetzung vorab prüfen (fehlende → Platzhalter)
    var offen = 0;
    function losgehen() { groesseAnpassen(); zeigeDoppelseite(); }
    if (typ === "fortsetzung") {
      daten.seiten.forEach(function (s) { offen++; vorladen(bildQuelleFortsetzung(s), function () { offen--; if (offen === 0) losgehen(); }); });
    } else {
      var ds0 = S.doppelseiten[S.index];
      [ds0.links, ds0.rechts].forEach(function (nr) { if (nr) { offen++; vorladen(bildQuelleOriginal(nr), function () { offen--; if (offen === 0) losgehen(); }); } });
    }
    if (offen === 0) losgehen();
  };

  BUCH.schliessen = function () {
    if (!S) return;
    vorlesenStoppen();
    taktStoppen();
    KULISSE.buchZu();
    FLUG.stoppen();
    EFFEKTE.stoppen();
    document.removeEventListener("keydown", S.tasten, false);
    window.removeEventListener("resize", S.groesse, false);
    window.removeEventListener("orientationchange", S.groesse, false);
    hochkantAus();
    S = null;
  };

  BUCH.zustand = function () { return S; };

  // ───────────────────── Hochkant-Hinweis: Papier-Stop-Motion ─────────────────────
  // Ein gemeinsamer Takt (125 ms) wechselt die Bilder; er läuft nur, solange ein Buch offen ist,
  // das Fenster sichtbar ist und das iPad hochkant gehalten wird.
  var HOCHKANT = {
    ipad: ["bilder/extras/hochkant/ipad-01.png", "bilder/extras/hochkant/ipad-02.png", "bilder/extras/hochkant/ipad-03.png"],
    pfannkuchen: ["bilder/extras/hochkant/pfannkuchen-01.png", "bilder/extras/hochkant/pfannkuchen-02.png"],
    pfeil: ["bilder/extras/hochkant/drehpfeil-01.png", "bilder/extras/hochkant/drehpfeil-02.png"]
  };
  var hk = { timer: null, schritt: 0, bilder: null, sichtbar: null };
  function ruhig() { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); }
  function hochkantEinrichten(ipad, pfannkuchen, pfeil) {
    hochkantAus();
    hk.bilder = { ipad: ipad, pfannkuchen: pfannkuchen, pfeil: pfeil };
    ipad.src = HOCHKANT.ipad[0]; pfannkuchen.src = HOCHKANT.pfannkuchen[0]; pfeil.src = HOCHKANT.pfeil[0];
    [HOCHKANT.ipad, HOCHKANT.pfannkuchen, HOCHKANT.pfeil].forEach(function (liste) {
      liste.forEach(function (src) { var i = new Image(); i.src = src; });    // vorladen – keine leeren Bilder beim Wechsel
    });
    hk.sichtbar = function () { hochkantPruefen(); };
    document.addEventListener("visibilitychange", hk.sichtbar, false);
    hochkantPruefen();
  }
  function papierBildWechseln() {
    if (!hk.bilder) return;
    hk.schritt++;
    hk.bilder.ipad.src = HOCHKANT.ipad[hk.schritt % HOCHKANT.ipad.length];
    hk.bilder.pfannkuchen.src = HOCHKANT.pfannkuchen[hk.schritt % HOCHKANT.pfannkuchen.length];
    hk.bilder.pfeil.src = HOCHKANT.pfeil[hk.schritt % HOCHKANT.pfeil.length];
  }
  function hochkantPruefen() {
    var laufen = !!(S && hk.bilder && B.hoch() && !document.hidden && !ruhig());
    if (laufen && !hk.timer) hk.timer = setInterval(papierBildWechseln, 125);
    if (!laufen && hk.timer) { clearInterval(hk.timer); hk.timer = null; }
  }
  function hochkantAus() {
    if (hk.timer) { clearInterval(hk.timer); hk.timer = null; }
    if (hk.sichtbar) document.removeEventListener("visibilitychange", hk.sichtbar, false);
    hk.sichtbar = null; hk.bilder = null;
  }

  // ───────────────────── Der fliegende Pfannekuchen (Seite "flug") ─────────────────────
  var FLUG = window.FLUG = (function () {
    var z = null, gelandetBild = null;
    // Der gemalte Pfannekuchen (Illustrationen_2026-09-26/animation/pfannekuchen-flug.png,
    // auf die sichtbare Scheibe zugeschnitten). Beim Wenden zeigt er eine etwas dunklere Unterseite.
    var KUCHEN = { src: "bilder/extras/pfannekuchen-flug.png", img: null, unten: null };
    // Die leere Pfanne auf s17 (relativ zur Doppelseite): Mitte der Mulde, halbe Breite des
    // Pfannekuchens darin (in Buchhöhen), Neigung der Pfanne; flach = wie schräg er darin liegt.
    var PFANNE = { x: 0.548, y: 0.38, r: 0.067, dreh: -0.5, flach: 1.0 };
    B.ladeBild(KUCHEN.src, function (img) {
      KUCHEN.img = img;
      try {
        var b = img.naturalWidth || img.width, h = img.naturalHeight || img.height, c = document.createElement("canvas");
        c.width = b; c.height = h;
        var x = c.getContext("2d");
        x.drawImage(img, 0, 0, b, h);
        x.globalCompositeOperation = "source-atop"; x.fillStyle = "rgba(110,55,10,0.3)"; x.fillRect(0, 0, b, h);
        KUCHEN.unten = c;
      } catch (e) {}
    });

    // Um den sichtbaren Mittelpunkt drehen: phase = Wenden (flach ↔ hochkant), dreh = Neigung.
    // Gibt die sichtbare Scheibe zurück – sie ist die Trefferzone, nicht das Bildquadrat.
    function zeichne(ctx, x, y, r, phase, dreh) {
      var c = Math.cos(phase), k = Math.max(0.14, Math.abs(c));
      var bild = c < 0 && KUCHEN.unten ? KUCHEN.unten : KUCHEN.img;
      if (!bild) { gemalt(ctx, x, y, r, phase, dreh); return { x: x, y: y, rx: r, ry: r * k, dreh: dreh }; }
      var b = bild.naturalWidth || bild.width, h = bild.naturalHeight || bild.height, s = 2 * r / b;
      ctx.save(); ctx.translate(x, y); ctx.rotate(dreh); ctx.scale(s, s * k * (c < 0 ? -1 : 1));
      ctx.drawImage(bild, -b / 2, -h / 2, b, h);
      ctx.restore();
      return { x: x, y: y, rx: r, ry: r * k * h / b, dreh: dreh };
    }
    // Ersatz, falls das Bild fehlt: der bisher gezeichnete Papier-Pfannekuchen
    function gemalt(ctx, x, y, r, phase, dreh) {
      var c = Math.cos(phase), ry = r * Math.max(0.14, Math.abs(c));
      ctx.save(); ctx.translate(x, y); ctx.rotate(dreh);
      ctx.beginPath(); ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = PAPIER.muster(ctx, c >= 0 ? "gold" : "ocker", { akzent: "braun" }); ctx.fill();
      ctx.lineWidth = Math.max(2, r * 0.07); ctx.strokeStyle = PAPIER.muster(ctx, "braun"); ctx.globalAlpha = 0.55; ctx.stroke(); ctx.globalAlpha = 1;
      for (var i = 0; i < 6; i++) {
        var a = i * 1.1 + 0.4, d = r * (0.25 + (i % 3) * 0.2);
        ctx.beginPath(); ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d * (ry / r), r * 0.12, r * 0.07 * (ry / r) + 0.5, a, 0, Math.PI * 2);
        ctx.fillStyle = PAPIER.muster(ctx, "braun"); ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    // Gelandet: als Bild in die Pfanne legen (bleibt liegen, auch während die Sterne funkeln)
    function gelandetEntfernen() { if (gelandetBild && gelandetBild.parentNode) gelandetBild.parentNode.removeChild(gelandetBild); gelandetBild = null; }
    function gelandetZeigen(W, H) {
      gelandetEntfernen();
      if (!KUCHEN.img || !S) return false;
      var b = KUCHEN.img.naturalWidth || KUCHEN.img.width, h = KUCHEN.img.naturalHeight || KUCHEN.img.height;
      var breite = 2 * PFANNE.r * H, hoehe = breite * h / b;
      var el = B.el("img", "flug-kuchen", S.dom.buch);
      el.alt = ""; el.src = KUCHEN.src;
      el.style.left = ((PFANNE.x * W - breite / 2) / W * 100) + "%";
      el.style.top = ((PFANNE.y * H - hoehe / 2) / H * 100) + "%";
      el.style.width = (breite / W * 100) + "%";
      B.transform(el, "rotate(" + PFANNE.dreh + "rad) scaleY(" + Math.cos(PFANNE.flach).toFixed(3) + ")");
      gelandetBild = el;
      return true;
    }

    return {
      laeuft: function () { return !!(z && !z.gelandet); },
      starten: function () {
        if (!S || (z && !z.gelandet)) return;
        EFFEKTE.stoppen();
        gelandetEntfernen();
        var cv = S.dom.effekte, ctx = cv.getContext("2d"), W = S.w, H = S.h;
        z = { t0: B.jetzt(), gelandet: false, gefangen: null, id: 0, W: W, H: H, jetzt: null };
        KLANG.hopp();
        var start = { x: PFANNE.x * W, y: PFANNE.y * H }, gipfel = 0.07 * H, rP = PFANNE.r * H;
        var dauerHoch = 1.5, dauerRunter = 1.9, dauer = dauerHoch + dauerRunter;
        function landen(gefangen) {
          z.gelandet = true;
          ctx.clearRect(0, 0, W, H);
          KLANG.plopp(); setTimeout(KLANG.tusch, 150);
          var mitBild = gelandetZeigen(W, H);
          if (!mitBild) zeichne(ctx, start.x, start.y, rP, PFANNE.flach, PFANNE.dreh);
          var anzeige = B.el("div", "flug-meldung", S.dom.buch, gefangen ? "Gefangen! Genau in der Pfanne!" : "… genau in der Pfanne!");
          anzeige.style.left = "22%"; anzeige.style.right = "36%"; anzeige.style.top = "7%";   // über der Pfanne, im freien Raum
          setTimeout(function () { if (anzeige.parentNode) anzeige.parentNode.removeChild(anzeige); }, 2600);
          if (mitBild) EFFEKTE.starten(S.dom.effekte, [{ eff: { typ: "sterne", x: PFANNE.x, y: PFANNE.y - 0.02 }, rechteck: { x: 0, y: 0, b: W, h: H } }]);
        }
        function schritt() {
          if (!z) return;
          var jetzt = B.jetzt(), t = (jetzt - z.t0) / 1000, g = z.gefangen;
          ctx.clearRect(0, 0, W, H);
          if (g) {
            // gefangen: im kurzen Bogen zurück in die Pfanne gleiten
            var u = Math.min(1, (jetzt - g.zeit) / 380), e = u * u * (3 - 2 * u);
            if (u >= 1) { landen(true); return; }
            zeichne(ctx, g.x + (start.x - g.x) * e, g.y + (start.y - g.y) * e - Math.sin(e * Math.PI) * H * 0.03,
                    g.r + (rP - g.r) * e, g.phase + (g.phaseZiel - g.phase) * e, g.dreh + (PFANNE.dreh - g.dreh) * e);
            z.id = B.frame(schritt);
            return;
          }
          if (t >= dauer) { landen(false); return; }
          var p = t / dauer, bogen = Math.sin(p * Math.PI), y;
          if (t < dauerHoch) { var v = t / dauerHoch; y = start.y - (start.y - gipfel) * (1 - (1 - v) * (1 - v)); }
          else { var d = (t - dauerHoch) / dauerRunter; y = gipfel + (start.y - gipfel) * d * d; }
          // im Bogen nach links oben (an der Lampe vorbei) und zurück; dreimal wenden, flach landen
          var x = start.x - bogen * W * 0.12 + Math.sin(t * 2.2) * W * 0.012 * bogen;
          var r = rP * (1 + 0.3 * bogen), phase = PFANNE.flach + p * Math.PI * 6;
          var dreh = PFANNE.dreh * (1 - bogen) + Math.sin(t * 2) * 0.3 * bogen;
          z.scheibe = zeichne(ctx, x, y, r, phase, dreh);
          z.jetzt = { x: x, y: y, r: r, phase: phase, dreh: dreh };
          z.id = B.frame(schritt);
        }
        z.id = B.frame(schritt);
      },
      // Fangen: zählt, wenn der Finger die sichtbare Scheibe trifft (großzügig). Ohne Tipp-Position
      // (z. B. per Taste) wird immer gefangen.
      fangen: function (ev) {
        if (!z || z.gelandet || z.gefangen) return false;
        var e = ev || window.event, sch = z.scheibe;
        if (e && typeof e.clientX === "number" && sch && S) {
          var rect = S.dom.effekte.getBoundingClientRect();
          if (rect.width && rect.height) {
            var px = (e.clientX - rect.left) * z.W / rect.width - sch.x, py = (e.clientY - rect.top) * z.H / rect.height - sch.y;
            var c = Math.cos(-sch.dreh), si = Math.sin(-sch.dreh), qx = px * c - py * si, qy = px * si + py * c;
            var ax = sch.rx * 1.35 + 24, ay = Math.max(sch.ry, sch.rx * 0.4) * 1.35 + 24;
            if ((qx * qx) / (ax * ax) + (qy * qy) / (ay * ay) > 1) return false;
          }
        }
        var j = z.jetzt || { x: PFANNE.x * z.W, y: PFANNE.y * z.H, r: PFANNE.r * z.H, phase: PFANNE.flach, dreh: PFANNE.dreh };
        // auf die nächste flache Lage (gleiche Seite oben wie in der Pfanne) hin drehen
        var ziel = PFANNE.flach + Math.round((j.phase - PFANNE.flach) / (2 * Math.PI)) * 2 * Math.PI;
        z.gefangen = { zeit: B.jetzt(), x: j.x, y: j.y, r: j.r, phase: j.phase, phaseZiel: ziel, dreh: j.dreh };
        return true;
      },
      stoppen: function () { gelandetEntfernen(); if (z) { B.frameStopp(z.id); z = null; } }
    };
  })();
})();
