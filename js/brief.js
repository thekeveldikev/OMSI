/* Briefbildschirm: Kevins Brief auf dem Briefpapier. Ist er länger als ein Blatt, fließt er über mehrere Bögen
   (CSS-Spalten, eine Spalte je Bogen). Unten blättern Mosaik-Pfeile weiter und zurück: Das obere Blatt gleitet
   raschelnd vom Tisch, darunter liegt schon das nächste. Wischen und die Pfeiltasten gehen auch. */
(function () {
  var R = window.BRIEF = {}, zustand = null;
  var ORDNER = 'bilder/menue-v2/', LUECKE = 80, DAUER = 640;

  function stil(el, name, wert) {
    el.style[name] = wert;
    el.style['webkit' + name.charAt(0).toUpperCase() + name.slice(1)] = wert;
  }
  function bild(eltern, cls, datei) {
    var img = B.el('img', cls, eltern);
    img.src = ORDNER + datei; img.alt = ''; img.draggable = false; img.setAttribute('aria-hidden', 'true');
    return img;
  }

  // Anrede, Zeilen ('' = Leerzeile), Gruß, Unterschrift und Name – alles als Text, nie als HTML
  function textAufbauen(fluss, text) {
    var pause = false, letzte = null;
    if (text.anrede) letzte = B.el('p', 'brief-anrede', fluss, text.anrede);
    (text.absaetze || []).forEach(function (absatz) {
      if (!absatz) { pause = !!letzte; return; }
      letzte = B.el('p', pause ? 'brief-nach-pause' : '', fluss, absatz);
      pause = false;
    });
    if (text.gruss || text.unterschrift || text.name) {
      var schluss = B.el('div', 'brief-schluss', fluss);
      if (text.gruss) letzte = B.el('p', 'brief-gruss', schluss, text.gruss);
      if (text.unterschrift) letzte = B.el('p', 'brief-unterschrift', schluss, text.unterschrift);
      if (text.name) { letzte = B.el('p', 'brief-name', schluss, text.name); bild(letzte, 'brief-herz', 'brief-herz.png'); }
    }
    return letzte && B.el('span', 'brief-ende', letzte);     // Merkpunkt: hier endet der Brief (Seitenzahl)
  }

  function pfeil(nav, art, name, richtung) {
    var k = B.el('button', 'brief-pfeil brief-pfeil-' + art, nav);
    k.type = 'button'; k.title = name; k.setAttribute('aria-label', name);
    bild(k, '', 'brief-pfeil-' + art + '.png');
    B.tippen(k, function () { blaettern(richtung); });
    return k;
  }

  // Pfeile und Seitenzahl eines Blatts (auch der Kopien beim Blättern) auf Seite "seite" einstellen
  function navSetzen(blatt, seite, zahl) {
    var z = blatt.querySelector('.brief-pfeil-zurueck'), w = blatt.querySelector('.brief-pfeil-weiter');
    z.disabled = seite <= 0; w.disabled = seite >= zahl - 1;
    blatt.querySelector('.brief-seitenzahl').textContent = (seite + 1) + ' / ' + zahl;
    blatt.querySelector('.brief-nav').style.display = zahl > 1 ? '' : 'none';
  }

  function messen(s, groesse) {
    s.fluss.style.fontSize = groesse + 'px';
    var f = s.fluss.getBoundingClientRect(), e = s.ende.getBoundingClientRect();
    s.zahl = Math.max(1, Math.floor((e.left - f.left + 2) / s.schritt) + 1);
    s.fuellung = (e.bottom - f.top) / s.fenster.clientHeight;
    return s.zahl;
  }

  function setzen(s) {
    for (var runde = 0; runde < 3; runde++) {                // eine Bildlaufleiste kann die Breite noch ändern
      var breite = s.stapel.clientWidth;
      s.stapel.style.height = breite * 1.5 + 'px';
      if (!s.ende) return;
      var fw = s.fenster.clientWidth, fh = s.fenster.clientHeight;
      s.fluss.style.width = fw + 'px'; s.fluss.style.height = fh + 'px';
      stil(s.fluss, 'columnWidth', fw + 'px'); stil(s.fluss, 'columnGap', LUECKE + 'px');
      s.schritt = fw + LUECKE;
      stil(s.fluss, 'transform', 'none');
      // Groß und gut lesbar; bleibt auf dem letzten Blatt nur ein kleiner Rest, darf die Schrift minimal kleiner werden
      var basis = B.klemme(breite * .03, 17, 24), groesse = basis, zahl = messen(s, basis);
      if (zahl > 1 && s.fuellung < .3) {
        for (var t = .985; t > .925; t -= .015) if (messen(s, basis * t) < zahl) { groesse = basis * t; break; }
        if (groesse === basis) messen(s, basis);
      }
      s.nav.style.fontSize = Math.max(14, groesse * .8) + 'px';
      if (s.stapel.clientWidth === breite) break;
    }
    s.seite = Math.min(s.seite, s.zahl - 1);
    zeigen(s);
  }

  function zeigen(s) {
    stil(s.fluss, 'transform', 'translateX(' + (-s.seite * s.schritt) + 'px)');
    navSetzen(s.papier, s.seite, s.zahl);
    s.anzeige.setAttribute('aria-label', 'Seite ' + (s.seite + 1) + ' von ' + s.zahl);
    var rest = s.zahl - 1 - s.seite;
    s.unterlagen[0].style.opacity = rest >= 1 ? '1' : '0';
    s.unterlagen[1].style.opacity = rest >= 2 ? '1' : '0';
    s.papier.className = 'brief-papier' + (rest === 0 ? ' am-ende' : '');
    // Auf dem ersten Blatt stupst der Weiter-Pfeil nach ein paar Sekunden zweimal an
    var w = s.papier.querySelector('.brief-pfeil-weiter');
    w.className = 'brief-pfeil brief-pfeil-weiter';
    if (s.seite === 0 && rest > 0) { w.getBoundingClientRect(); w.className += ' schubs'; }
  }

  function kopie(s, seite) {
    var k = s.papier.cloneNode(true);
    k.className = 'brief-papier brief-kopie'; k.setAttribute('aria-hidden', 'true');
    var fl = k.querySelector('.brief-fluss');
    fl.className = 'brief-fluss';
    stil(fl, 'transform', 'translateX(' + (-seite * s.schritt) + 'px)');
    navSetzen(k, seite, s.zahl);
    var knoepfe = k.querySelectorAll('button');
    for (var i = 0; i < knoepfe.length; i++) { knoepfe[i].tabIndex = -1; knoepfe[i].className = knoepfe[i].className.replace(' schubs', ''); }
    s.stapel.appendChild(k);
    return k;
  }

  function abschliessen(s) {
    var l = s.lauf;
    if (!l) return;
    s.lauf = null; clearTimeout(l.timer);
    if (l.fertig) l.fertig();
    if (l.el.parentNode) l.el.parentNode.removeChild(l.el);
  }

  function rascheln(richtung) {
    if (window.KLANG) KLANG.entsperren();
    // Nur der raschelnde Teil des echten Umblätterns (die Datei beginnt mit einer knappen halben Sekunde Stille)
    if (window.KULISSE && KULISSE.schnipsel) KULISSE.schnipsel('ev_blaettern', richtung > 0 ? .85 : .7, .42, .8);
    else if (window.KLANG) KLANG.blaettern();
  }

  // Wer unten den Pfeil angetippt hat, liest danach oben weiter
  function nachOben(s) {
    var root = s.root, von = root.scrollTop, start = B.jetzt();
    if (von < 4) return;
    (function schritt() {
      if (zustand !== s) return;
      var t = Math.min(1, (B.jetzt() - start) / 520), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      root.scrollTop = von * (1 - e);
      if (t < 1) B.frame(schritt);
    })();
  }

  function blaettern(richtung) {
    var s = zustand;
    if (!s || !s.ende) return;
    abschliessen(s);
    var ziel = s.seite + richtung;
    if (ziel < 0 || ziel >= s.zahl) return;
    rascheln(richtung);
    var blatt;
    if (richtung > 0) {                                      // oberes Blatt gleitet weg, das nächste liegt schon da
      blatt = kopie(s, s.seite);
      s.seite = ziel; zeigen(s);
      blatt.getBoundingClientRect();
      blatt.className += ' brief-geht brief-weg';
      s.lauf = { el: blatt };
    } else {                                                 // das vorige Blatt kommt zurück auf den Stapel
      blatt = kopie(s, ziel);
      blatt.className += ' brief-kommt brief-weg';
      blatt.getBoundingClientRect();
      blatt.className = blatt.className.replace(' brief-weg', '');
      s.seite = ziel;
      s.lauf = { el: blatt, fertig: function () { zeigen(s); } };
    }
    s.lauf.timer = setTimeout(function () { abschliessen(s); }, DAUER + 80);
    setTimeout(function () { nachOben(s); }, 120);
  }

  R.starten = function (wurzel, zurueck) {
    R.stoppen();
    var s = zustand = { seite: 0, zahl: 1, schritt: 1 }, text = window.BRIEF_TEXT || {};
    var root = s.root = B.el('main', 'brief-seite', wurzel);
    root.setAttribute('aria-label', 'Ein Brief für dich');
    var leiste = B.el('div', 'brief-leiste', root);
    var back = B.el('button', 'brief-zurueck', leiste, '⌂ Zur Küche'); back.type = 'button';
    B.tippen(back, zurueck);
    B.el('h1', 'brief-titel', leiste, 'Ein Brief für dich');
    var stapel = s.stapel = B.el('div', 'brief-stapel', root);
    bild(stapel, 'brief-tisch', 'briefpapier-v1.png');
    s.unterlagen = [bild(stapel, 'brief-unterlage brief-unterlage-2', 'briefblatt-v1.png'),
                    bild(stapel, 'brief-unterlage brief-unterlage-1', 'briefblatt-v1.png')].reverse();
    var papier = s.papier = B.el('article', 'brief-papier', stapel);
    bild(papier, 'brief-papierbild', 'briefblatt-v1.png');
    s.fenster = B.el('div', 'brief-fenster', papier);
    s.fluss = B.el('div', 'brief-fluss brief-inhalt', s.fenster);
    s.ende = textAufbauen(s.fluss, text);
    s.nav = B.el('nav', 'brief-nav', papier);
    s.nav.setAttribute('aria-label', 'Briefseiten');
    pfeil(s.nav, 'zurueck', 'Zurückblättern', -1);
    s.anzeige = B.el('span', 'brief-seitenzahl', s.nav);
    s.anzeige.setAttribute('aria-live', 'polite');
    pfeil(s.nav, 'weiter', 'Weiterblättern', 1);
    if (!s.ende) {
      papier.setAttribute('aria-label', 'Unbeschriebenes Briefpapier. Der persönliche Brief folgt später.');
      s.nav.style.display = 'none';
    }
    s.resize = function () {
      abschliessen(s);
      if (!s.ende) stapel.style.maxWidth = Math.min(820, (root.clientHeight - leiste.offsetHeight - 32) / 1.5) + 'px';
      setzen(s);
    };
    s.key = function (ev) {
      var ziel = ev.target;
      if (ziel && (/INPUT|TEXTAREA|SELECT/.test(ziel.tagName) || ziel.isContentEditable)) return;
      if (ev.keyCode === 27) { ev.preventDefault(); zurueck(); }
      else if (ev.keyCode === 39 || ev.keyCode === 37) { ev.preventDefault(); blaettern(ev.keyCode === 39 ? 1 : -1); }
    };
    // Wischen nach links/rechts blättert; senkrechtes Scrollen bleibt unberührt
    stapel.addEventListener('touchstart', function (ev) {
      var t = ev.touches[0];
      s.wisch = ev.touches.length === 1 ? { x: t.clientX, y: t.clientY, zeit: B.jetzt() } : null;
    }, false);
    stapel.addEventListener('touchend', function (ev) {
      var w = s.wisch, t = ev.changedTouches[0];
      s.wisch = null;
      if (!w || !t || B.jetzt() - w.zeit > 900) return;
      var dx = t.clientX - w.x, dy = t.clientY - w.y;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.6) blaettern(dx < 0 ? 1 : -1);
    }, false);
    window.addEventListener('resize', s.resize, false);
    document.addEventListener('keydown', s.key, false);
    s.resize();
    papier.className += ' brief-ankunft';
    back.focus();
  };
  R.stoppen = function () {
    if (!zustand) return;
    abschliessen(zustand);
    window.removeEventListener('resize', zustand.resize, false);
    document.removeEventListener('keydown', zustand.key, false);
    zustand = null;
  };
  R.aktiv = function () { return !!zustand; };
  R.blaettern = blaettern;
  R.seite = function () { return zustand ? { seite: zustand.seite, zahl: zustand.zahl } : null; };
})();
