/* Eigenständige Küchenbühne. Keine Änderungen an Buch, Theater oder Making-of.
   ES5 und WebKit-Präfixe für ältere iPads; alle Listener werden wieder entfernt. */
(function () {
  var M = window.MENUE_KUECHE = {}, lauf = null, anschluesse = {};
  var dateien = ['kueche.png', 'originalcover.png', 'wolke.png', 'pfannkuchen-v2.png', 'efeu.png', 'titel-papier-v1.png', 'briefpapier-v1.png', 'vogel-v2-0.png', 'vogel-v2-1.png', 'vogel-v2-2.png', 'vogel-v2-3.png'];
  function position(el, box, bezug) {
    var b = bezug || [0, 0, 1536, 1024];
    el.style.left = (box[0] - b[0]) / b[2] * 100 + '%';
    el.style.top = (box[1] - b[1]) / b[3] * 100 + '%';
    el.style.width = box[2] / b[2] * 100 + '%';
    el.style.height = box[3] / b[3] * 100 + '%';
  }
  function bild(parent, name, klasse, box) {
    var img = B.el('img', klasse, parent);
    img.alt = ''; img.draggable = false; img.setAttribute('aria-hidden', 'true');
    img.src = MENUE_DATEN.ordner + name;
    if (box) position(img, box);
    return img;
  }
  function knopf(parent, text, fn, klasse) {
    var b = B.el('button', klasse || '', parent, text);
    b.type = 'button'; B.tippen(b, fn); return b;
  }
  function bereit(p) { return !!(anschluesse[p.id] || p.bereit); }
  function waehlen(p) {
    if (!bereit(p)) { APP.meldung(p.hinweis || 'Das kommt später dazu.'); return; }
    KLANG.entsperren(); KLANG.plopp();
    if (anschluesse[p.id]) { anschluesse[p.id](); return; }
    APP.zeige(p.id);
  }
  function zielKnopf(parent, p, klein) {
    var b = knopf(parent, null, function () { waehlen(p); }, klein ? 'mk-listenziel' : 'mk-ziel mk-ziel-' + p.id);
    b.setAttribute('data-menue', p.id);
    b.setAttribute('aria-label', B.ersetzen(p.titel) + (bereit(p) ? '' : ' – bald'));
    if (!bereit(p)) { b.setAttribute('aria-disabled', 'true'); b.title = p.hinweis; }
    if (!klein) position(b, p.box);
    var label = B.el('span', klein ? '' : 'mk-schild', b, B.ersetzen(!klein && p.schildtext ? p.schildtext : p.titel));
    if (!klein) position(label, p.schild, p.box);
    if (klein && !bereit(p)) B.el('small', '', b, 'Bald');
    return b;
  }
  function lid(parent, box, farbe, rand, winkel, dauer, delay) {
    var holder = B.el('span', 'mk-lidhalter', parent); position(holder, box);
    B.transform(holder, 'rotate(' + winkel + 'deg)');
    var l = B.el('span', 'mk-lid', holder);
    l.style.backgroundColor = farbe; l.style.borderBottomColor = rand;
    l.style.webkitAnimationDuration = l.style.animationDuration = dauer + 's';
    l.style.webkitAnimationDelay = l.style.animationDelay = delay + 's';
  }
  function flamme(parent, x, y, b, h, blau, i) {
    var f = B.el('span', 'mk-flamme' + (blau ? ' mk-gas' : ''), parent);
    position(f, [x, y, b, h]);
    f.style.webkitAnimationDelay = f.style.animationDelay = (-i * .19) + 's';
    f.style.webkitAnimationDuration = f.style.animationDuration = (.72 + (i % 3) * .17) + 's';
  }
  function dampf(parent) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', '0 0 100 150');
    svg.setAttribute('class', 'mk-dampf'); svg.setAttribute('aria-hidden', 'true'); parent.appendChild(svg);
    position(svg, [455, 506, 88, 126]);
    for (var i = 0; i < 3; i++) {
      var p = document.createElementNS(ns, 'path');
      p.setAttribute('d', 'M ' + (27 + i * 22) + ' 145 C ' + (i * 22) + ' 115, ' + (65 + i * 9) + ' 85, ' + (34 + i * 15) + ' 58 S ' + (10 + i * 22) + ' 22, ' + (40 + i * 20) + ' 3');
      p.style.webkitAnimationDelay = p.style.animationDelay = (-i * 1.15) + 's'; svg.appendChild(p);
    }
  }
  M.starten = function (wurzel, optionen) {
    M.stoppen();
    var s = lauf = { root: B.el('main', 'mk-seite', wurzel), frame: 0, letzte: 0, start: B.jetzt(), manuell: !!B.erinnern('menue.ruhe', false), optionen: optionen || {} };
    s.root.setAttribute('aria-label', B.ersetzen(MENUE_DATEN.titel));
    var rahmen = B.el('div', 'mk-rahmen', s.root);
    s.buehne = B.el('div', 'mk-buehne', rahmen);
    var dekor = B.el('div', 'mk-dekor', s.buehne); dekor.setAttribute('aria-hidden', 'true');
    var himmel = B.el('div', 'mk-himmel', dekor);
    PAPIER.hinterlegen(himmel, 'hellblau', { akzent: 'weiss', kachel: 380 });
    bild(dekor, 'wolke.png', 'mk-wolke', [15, 126, 200, 78]);
    var sonne = B.el('span', 'mk-sonne', dekor); position(sonne, [158, 136, 68, 68]);
    PAPIER.hinterlegen(sonne, 'gelb', { akzent: 'gold', kachel: 95 });
    var basis = bild(dekor, 'kueche.png', 'mk-basis');
    basis.onerror = function () { if (lauf === s) { s.root.className += ' mk-bildfehler'; APP.meldung('Das Küchenbild konnte nicht geladen werden. Die Menüliste bleibt erreichbar.'); } };
    var cover = bild(dekor, 'originalcover.png', 'mk-cover', [790, 124, 148, 183]);
    var covertext = B.el('div', 'mk-covertext', dekor, 'Ein Pfannkuchen\nfür Omsi'); position(covertext, [988, 126, 135, 62]);
    var rezept = B.el('div', 'mk-rezepttext', dekor, B.ersetzen('{OMA}s\nRezept')); position(rezept, [273, 775, 160, 78]);
    var skala = B.el('div', 'mk-skala', dekor); position(skala, [1181, 697, 103, 21]);
    for (var q = 0; q < 11; q++) B.el('i', '', skala);
    B.el('b', '', skala);
    // Alle Frames besitzen denselben Fußpunkt (450,585) auf einer 760×720-Fläche.
    // Größe 0,18: der gemeinsame Drehpunkt liegt somit bei (81,105,3) Bühnenpixeln.
    s.vogel = B.el('div', 'mk-vogel', dekor); position(s.vogel, [0, 0, 136.8, 129.6]);
    s.vogelBilder = [];
    for (var v = 0; v < 4; v++) { var vb = bild(s.vogel, 'vogel-v2-' + v + '.png', 'mk-vogelframe'); vb.style.opacity = v === 0 ? '1' : '0'; s.vogelBilder.push(vb); }
    bild(dekor, 'pfannkuchen-v2.png', 'mk-pfannkuchen', [767, 641, 228, 100]);
    bild(dekor, 'efeu.png', 'mk-efeu', [701, -10, 75, 112]);
    dampf(dekor);
    lid(dekor, [404, 389, 39, 25], '#f49a58', '#a95632', -21, 6.3, -1.8);
    lid(dekor, [480, 362, 36, 26], '#f49352', '#a95632', -21, 6.3, -1.8);
    lid(dekor, [733, 545, 26, 26], '#d5d0b9', '#454740', -12, 7.7, -.7);
    lid(dekor, [774, 532, 23, 24], '#c5c5b2', '#454740', -12, 7.7, -.7);
    [[1276,392],[1300,403],[1321,390],[1345,381],[1359,413],[1381,394]].forEach(function (xy, i) { flamme(dekor, xy[0]-5, xy[1]-27, 10, 24, false, i); });
    for (var g = 0; g < 9; g++) flamme(dekor, 715 + g * 23, 849 + Math.sin(g * .7) * 4, 11, 17, true, g);
    var kopf = B.el('h1', 'mk-kopf', s.buehne); position(kopf, [348, 28, 349, 205]);
    var titel = bild(kopf, 'titel-papier-v1.png', 'mk-titelgrafik');
    titel.alt = B.ersetzen(MENUE_DATEN.titel); titel.removeAttribute('aria-hidden');
    var untertitel = B.el('p', 'mk-untertitel', s.buehne, MENUE_DATEN.untertitel); position(untertitel, [477, 235, 231, 32]);
    MENUE_DATEN.punkte.forEach(function (p) { zielKnopf(s.buehne, p, false); });
    var liste = B.el('nav', 'mk-schnell', s.root); liste.setAttribute('aria-label', 'Alle Ziele in Omsis Küche');
    MENUE_DATEN.punkte.forEach(function (p) { zielKnopf(liste, p, true); });
    var fuss = B.el('footer', 'mk-fuss', s.root);
    knopf(fuss, '⌂ Zum Gartentor', function () { APP.zeige('start'); });
    s.pauseKnopf = knopf(fuss, 'Bewegung anhalten', function () { s.manuell = !s.manuell; B.merken('menue.ruhe', s.manuell); bewegung(); }, 'mk-bewegung');
    if (s.optionen.offline && window.location.protocol === 'https:' && navigator.serviceWorker) {
      var offline = knopf(fuss, 'Offline speichern', function () { s.optionen.offline(offline); });
    }
    s.media = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    function einpassen() {
      var hoch = window.innerHeight > window.innerWidth;
      var platz = Math.max(200, s.root.clientHeight - fuss.offsetHeight - 8);
      var breite = hoch ? s.root.clientWidth : Math.min(s.root.clientWidth, platz * 1.5);
      s.buehne.style.width = breite + 'px'; s.buehne.style.height = breite / 1.5 + 'px';
      s.buehne.style.fontSize = breite / 153.6 + 'px';
      s.mass = breite / 1536;
      if (s.ruhe) vogel(s.start);
    }
    function vogelFrame(n) {
      if (s.phase === n) return;
      s.phase = n; s.vogel.setAttribute('data-frame', String(n));
      for (var i = 0; i < 4; i++) s.vogelBilder[i].style.opacity = i === n ? '1' : '0';
    }
    function vogel(zeit) {
      var t = ((zeit - s.start) / 1000) % 10, n = 0, links = t > 5.6;
      // Vermessene Standplätze auf der Oberkante des tatsächlichen Astes.
      var plaetze = [[159, 279], [179, 267], [207, 258]];
      var hops = [[2.2,0,1], [3.2,1,2], [7.0,2,1], [8.0,1,0]];
      var x = plaetze[0][0], y = plaetze[0][1];
      for (var i = 0; i < hops.length; i++) {
        var a = hops[i], p = (t-a[0])/.55;
        var von = plaetze[a[1]], nach = plaetze[a[2]];
        if (p > 1) { x = nach[0]; y = nach[1]; n = 0; }
        else if (p >= -.4 && p < 0) { x = von[0]; y = von[1]; n = 1; }
        else if (p >= 0) {
          x = von[0] + (nach[0] - von[0]) * p;
          y = von[1] + (nach[1] - von[1]) * p - Math.sin(p * Math.PI) * 18;
          n = p < .78 ? 2 : 3;
        }
      }
      B.transform(s.vogel, 'translate(' + ((x - 81)*s.mass) + 'px,' + ((y - 105.3)*s.mass) + 'px) rotate(-22deg) scaleX(' + (links ? -1 : 1) + ')');
      vogelFrame(n);
    }
    function tick(zeit) {
      if (lauf !== s || s.ruhe) return;
      if (zeit - s.letzte > 70) { vogel(zeit); s.letzte = zeit; }
      s.frame = B.frame(tick);
    }
    function bewegung() {
      if (lauf !== s) return;
      s.ruhe = s.manuell || !!(s.media && s.media.matches) || document.hidden;
      s.root.classList.toggle('mk-ruhig', !!s.ruhe);
      s.pauseKnopf.textContent = s.media && s.media.matches ? 'Bewegung reduziert' : s.manuell ? 'Bewegung fortsetzen' : 'Bewegung anhalten';
      s.pauseKnopf.setAttribute('aria-pressed', (s.manuell || !!(s.media && s.media.matches)) ? 'true' : 'false');
      if (s.frame) B.frameStopp(s.frame); s.frame = 0;
      if (!s.ruhe) s.frame = B.frame(tick);
      else vogel(s.start);
    }
    s.resize = einpassen; s.visibility = bewegung;
    window.addEventListener('resize', einpassen, false);
    document.addEventListener('visibilitychange', bewegung, false);
    if (s.media && s.media.addListener) s.media.addListener(bewegung);
    einpassen(); bewegung();
  };
  M.stoppen = function () {
    if (!lauf) return;
    var s = lauf; lauf = null;
    if (s.frame) B.frameStopp(s.frame);
    window.removeEventListener('resize', s.resize, false);
    document.removeEventListener('visibilitychange', s.visibility, false);
    if (s.media && s.media.removeListener) s.media.removeListener(s.visibility);
  };
  M.aktiv = function () { return !!lauf; };
  M.dateien = function () {
    return ['css/menue.css', 'js/menue.js', 'daten/menue.js', 'css/brief.css', 'js/brief.js', 'daten/brief.js', 'css/rueckweg.css', 'js/rueckweg.js', 'css/akte.css', 'js/akte.js', MENUE_DATEN.ordner + 'akte-hochkant-v1.png'].concat(dateien.map(function (f) { return MENUE_DATEN.ordner + f; }));
  };
  // Spätere Fassungen einzeln anschließen, ohne diese Bühne neu zu bauen.
  // Beispiel: MENUE_KUECHE.verbinden('schatten', function () { ... });
  M.verbinden = function (id, fn) {
    if (typeof fn !== 'function') throw new Error('Ein Menüanschluss braucht eine Funktion.');
    anschluesse[id] = fn;
    if (lauf) {
      var knoepfe = lauf.root.querySelectorAll('[data-menue]');
      for (var i = 0; i < knoepfe.length; i++) if (knoepfe[i].getAttribute('data-menue') === id) {
        knoepfe[i].removeAttribute('aria-disabled'); knoepfe[i].removeAttribute('title');
        var small = knoepfe[i].querySelector('small'); if (small) small.parentNode.removeChild(small);
        knoepfe[i].setAttribute('aria-label', knoepfe[i].querySelector('span').textContent);
      }
    }
  };
})();
