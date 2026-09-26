/* Das Erinnerungsradio. ES5; HTML-Audio bleibt direkt an Safari angebunden.
   Die vorberechnete Hüllkurve bewegt Papierstreifen synchron zur Aufnahme. */
(function () {
  var R = window.RADIO = {}, aktiv = null;
  function zeit(s) {
    s = Math.max(0, Math.floor(s || 0));
    return Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + s % 60;
  }
  function zahl(v, sonst) { return typeof v === 'number' && isFinite(v) ? v : sonst; }

  // Kurzes Senderrauschen und mechanischer Klick, nie unter der ganzen Aufnahme.
  function schalten(an) {
    if (B.E.toene === false || !window.KLANG) return;
    KLANG.entsperren();
    var c = KLANG.kontext();
    if (!c) return;
    var dauer = an ? 0.38 : 0.16, n = Math.ceil(c.sampleRate * dauer);
    var buffer = c.createBuffer(1, n, c.sampleRate), d = buffer.getChannelData(0);
    for (var i = 0; i < n; i++) {
      var t = i / c.sampleRate;
      var h = Math.min(1, t / 0.006) * Math.pow(1 - i / n, 2);
      d[i] = (Math.random() * 2 - 1) * h * (an ? 0.12 : 0.09);
      if (t < 0.025) d[i] += Math.sin(t * 1900) * Math.exp(-t * 220) * 0.22;
    }
    var q = c.createBufferSource(), f = c.createBiquadFilter();
    q.buffer = buffer; f.type = 'bandpass'; f.frequency.value = an ? 1800 : 900; f.Q.value = 0.6;
    q.connect(f); f.connect(c.destination);
    q.onended = function () { q.disconnect(); f.disconnect(); };
    q.start(0);
  }

  R.starten = function (wurzel, zurueck) {
    R.stoppen();
    var D = window.RADIO_DATEN;
    if (!D) return;
    var weg = false, spielt = false, wartet = false, defekt = false, version = 0;
    var pos = Math.max(0, zahl(B.erinnern('radio.position.v1', 0), 0));
    var dauer = D.dauer || 0, gemerkt = 0, frame = null, bereit = false;
    if (pos >= dauer - 0.4) pos = 0;
    var seite = B.el('section', 'radio-seite', wurzel);
    seite.setAttribute('aria-label', D.titel);
    var kopf = B.el('header', 'radio-kopf', seite);
    var heim = B.el('button', 'radio-zurueck', kopf, '‹ Zurück in die Küche');
    heim.type = 'button'; B.tippen(heim, zurueck);
    B.el('span', 'radio-kapitel', kopf, 'Eine Erinnerung zum Anhören');
    var inhalt = B.el('div', 'radio-inhalt', seite);
    var intro = B.el('div', 'radio-intro', inhalt);
    B.el('p', 'radio-datum', intro, D.datum);
    var titel = B.el('h1', 'radio-titel', intro, D.titel);
    PAPIER.schriftFuellen(titel, 'blau', { akzent: 'tiefblau' });
    B.el('p', 'radio-geschichte', intro, D.beschreibung);

    var buehne = B.el('div', 'radio-buehne', inhalt);
    var bild = B.el('img', 'radio-bild', buehne);
    bild.src = D.bild; bild.alt = 'Ein rotes Küchenradio aus buntem, bemaltem Papier'; bild.draggable = false;
    var lampe = B.el('span', 'radio-lampe', buehne); lampe.setAttribute('aria-hidden', 'true');
    var noten = B.el('div', 'radio-noten', buehne); noten.setAttribute('aria-hidden', 'true');
    ['♪', '♫', '♪'].forEach(function (n) { B.el('span', '', noten, n); });
    var pegel = B.el('div', 'radio-pegel', buehne), balken = [];
    pegel.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < 7; i++) {
      var streifen = B.el('i', '', pegel); balken.push(streifen);
      PAPIER.hinterlegen(streifen, i % 2 ? 'orange' : 'gelb', { seed: i + 21 });
    }
    var skala = B.el('div', 'radio-skala', buehne);
    var nadel = B.el('span', 'radio-nadel', skala); nadel.setAttribute('aria-hidden', 'true');
    var suche = B.el('input', 'radio-suche', skala);
    suche.type = 'range'; suche.min = '0'; suche.max = String(dauer); suche.step = '0.1'; suche.value = String(pos);
    suche.setAttribute('aria-label', 'Stelle in der Aufnahme');
    var dreh = B.el('button', 'radio-dreh radio-dreh-an', buehne);
    dreh.type = 'button'; dreh.setAttribute('aria-label', 'Radio einschalten');
    var neuDreh = B.el('button', 'radio-dreh radio-dreh-neu', buehne);
    neuDreh.type = 'button'; neuDreh.setAttribute('aria-label', 'Aufnahme von vorn hören');
    B.el('span', 'radio-dreh-text radio-dreh-text-an', buehne, 'AN / AUS');
    B.el('span', 'radio-dreh-text radio-dreh-text-neu', buehne, 'VON VORN');
    B.el('span', 'radio-sender', buehne, D.sender);

    var bedienung = B.el('div', 'radio-bedienung', inhalt);
    var zeitzeile = B.el('div', 'radio-zeitzeile', bedienung);
    var status = B.el('span', 'radio-status', zeitzeile);
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    var uhr = B.el('span', 'radio-uhr', zeitzeile);
    var knoepfe = B.el('div', 'radio-knoepfe', bedienung);
    var play = B.el('button', 'radio-knopf radio-play', knoepfe);
    play.type = 'button'; play.setAttribute('data-radio', 'play');
    var neu = B.el('button', 'radio-knopf radio-neu', knoepfe, '↺ Von vorn');
    neu.type = 'button'; neu.setAttribute('data-radio', 'restart');
    var hinweis = B.el('p', 'radio-hinweis', bedienung, 'Deine Stelle bleibt gemerkt. Auch wenn du das Radio ausschaltest.');
    B.el('p', 'radio-widmung', inhalt, D.widmung);
    var a = B.el('audio', 'radio-audio', seite);
    a.preload = 'metadata'; a.setAttribute('playsinline', ''); a.src = D.audio;

    function speichern() {
      if (bereit && !a.ended) pos = zahl(a.currentTime, pos);
      B.merken('radio.position.v1', pos);
    }
    function anzeigen(text) {
      seite.className = 'radio-seite' + (spielt && !wartet ? ' spielt' : '') + (wartet ? ' wartet' : '');
      play.textContent = spielt ? 'Ⅱ Pause' : (pos > 0.5 ? '▶ Weiterhören' : '▶ Radio einschalten');
      dreh.setAttribute('aria-label', spielt ? 'Radio pausieren' : 'Radio einschalten');
      play.setAttribute('aria-pressed', spielt ? 'true' : 'false');
      dreh.setAttribute('aria-pressed', spielt ? 'true' : 'false');
      status.textContent = text || (spielt ? (wartet ? 'Einen Moment …' : 'Du hörst die Aufnahme von damals') : (pos > 0.5 ? 'Deine Stelle ist gemerkt' : 'Unser kleiner Sender von damals'));
      zeitanzeige();
    }
    function zeitanzeige() {
      suche.value = String(pos);
      suche.setAttribute('aria-valuetext', zeit(pos) + ' von ' + zeit(dauer));
      nadel.style.left = (dauer ? Math.min(100, 100 * pos / dauer) : 0) + '%';
      uhr.textContent = zeit(pos) + ' / ' + zeit(dauer);
    }
    function pause(klang) {
      version++; a.pause(); spielt = false; wartet = false; speichern();
      if (klang) schalten(false);
      anzeigen();
    }
    function fehlgeschlagen() {
      if (weg) return;
      spielt = false; wartet = false; defekt = true; a.pause();
      anzeigen('Die Aufnahme konnte nicht laden. Bitte noch einmal einschalten.');
    }
    function abspielen() {
      if (weg) return;
      var anfrage = ++version;
      if (defekt) { defekt = false; bereit = false; a.load(); }
      if (a.ended || pos >= dauer - 0.15) { pos = 0; if (bereit) a.currentTime = 0; }
      KLANG.entsperren(); schalten(true);
      spielt = true; wartet = a.readyState < 3; anzeigen();
      // play() innerhalb des Tipp-Ereignisses: Safari braucht die direkte Freigabe.
      var p = a.play();
      if (p && p['catch']) p['catch'](function () {
        if (weg || anfrage !== version) return;
        spielt = false; wartet = false;
        anzeigen('Bitte noch einmal auf Einschalten tippen.');
      });
    }
    function umschalten() { if (spielt) pause(true); else abspielen(); }
    function vonVorn() {
      pos = 0; B.merken('radio.position.v1', 0);
      if (bereit) a.currentTime = 0;
      zeitanzeige(); if (!spielt) abspielen();
    }
    B.tippen(play, umschalten); B.tippen(dreh, umschalten);
    B.tippen(neu, vonVorn); B.tippen(neuDreh, vonVorn);
    suche.addEventListener('input', function () {
      pos = B.klemme(Number(suche.value) || 0, 0, dauer);
      if (bereit) a.currentTime = pos;
      B.merken('radio.position.v1', pos); zeitanzeige();
      if (!spielt) anzeigen();
    });
    suche.addEventListener('change', speichern);
    a.addEventListener('loadedmetadata', function () {
      if (weg) return;
      dauer = zahl(a.duration, D.dauer); suche.max = String(dauer);
      pos = B.klemme(pos, 0, Math.max(0, dauer - 0.05));
      bereit = true;
      try { a.currentTime = pos; } catch (e) {}
      zeitanzeige();
    });
    a.addEventListener('timeupdate', function () {
      if (weg || !bereit) return;
      pos = zahl(a.currentTime, pos); zeitanzeige();
      if (Date.now() - gemerkt > 1000) { speichern(); gemerkt = Date.now(); }
    });
    a.addEventListener('playing', function () { if (!weg) { spielt = true; wartet = false; anzeigen(); } });
    a.addEventListener('waiting', function () { if (!weg && spielt) { wartet = true; anzeigen(); } });
    a.addEventListener('pause', function () {
      if (weg || a.ended || defekt) return;
      spielt = false; wartet = false; speichern(); anzeigen();
    });
    a.addEventListener('ended', function () {
      if (weg) return;
      spielt = false; wartet = false; pos = 0; B.merken('radio.position.v1', 0);
      schalten(false); anzeigen('Zu Ende gehört. Noch einmal zurück nach damals?');
    });
    a.addEventListener('error', fehlgeschlagen);
    function versteckt() { if (document.hidden) { if (spielt) pause(false); else speichern(); } }
    function verlassen() { if (spielt) pause(false); else speichern(); }
    document.addEventListener('visibilitychange', versteckt);
    window.addEventListener('pagehide', verlassen);
    var weniger = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    function bewegen() {
      if (weg) return;
      if (!weniger || !weniger.matches) {
        var e = D.pegel || [], idx = Math.floor(a.currentTime * (D.pegelHz || 10));
        var amplitude = spielt && !wartet ? (e[idx] || 0) / 255 : 0;
        for (var j = 0; j < balken.length; j++) {
          var wert = 0.14 + amplitude * (0.35 + 0.65 * Math.abs(Math.sin(a.currentTime * 7 + j * 1.3)));
          B.transform(balken[j], 'scaleY(' + wert.toFixed(3) + ')');
        }
      }
      frame = B.frame(bewegen);
    }
    aktiv = function () {
      speichern(); weg = true; version++;
      if (!a.paused) schalten(false);
      a.pause(); a.removeAttribute('src'); a.load();
      B.frameStopp(frame);
      document.removeEventListener('visibilitychange', versteckt);
      window.removeEventListener('pagehide', verlassen);
    };
    anzeigen(); bewegen();
  };
  R.stoppen = function () { if (aktiv) { aktiv(); aktiv = null; } };
})();
