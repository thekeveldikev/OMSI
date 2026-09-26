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
  function schalten(an, laut) {
    if (B.E.toene === false || !window.KLANG) return;
    KLANG.entsperren();
    var c = KLANG.kontext();
    if (!c) return;
    var dauer = an ? 0.38 : 0.16, n = Math.ceil(c.sampleRate * dauer);
    var buffer = c.createBuffer(1, n, c.sampleRate), d = buffer.getChannelData(0);
    for (var i = 0; i < n; i++) {
      var t = i / c.sampleRate;
      var h = Math.min(1, t / 0.006) * Math.pow(1 - i / n, 2);
      d[i] = ((Math.random() * 2 - 1) * h * (an ? 0.12 : 0.09) +
        (t < 0.025 ? Math.sin(t * 1900) * Math.exp(-t * 220) * 0.22 : 0)) * (laut == null ? 1 : laut);
    }
    var q = c.createBufferSource(), f = c.createBiquadFilter();
    q.buffer = buffer; f.type = 'bandpass'; f.frequency.value = an ? 1800 : 900; f.Q.value = 0.6;
    q.connect(f); f.connect(c.destination);
    q.onended = function () { q.disconnect(); f.disconnect(); };
    q.start(0);
  }

  function schubladenKlang(auf, laut) {
    if (B.E.toene === false || !laut) return;
    var c = KLANG.kontext(); if (!c) return;
    var dauer = auf ? 0.58 : 0.48, n = Math.ceil(c.sampleRate * dauer);
    var p = c.createBuffer(1, n, c.sampleRate), d = p.getChannelData(0);
    var weich = 0;
    for (var i = 0; i < n; i++) {
      var t = i / c.sampleRate, h = Math.pow(Math.sin(Math.PI * i / n), 1.8);
      // Filz auf Holz: ruhiges, weiches Reiben statt sägendem Rattern.
      weich = weich * 0.91 + (Math.random() * 2 - 1) * 0.09;
      var v = weich * h * (0.72 + 0.28 * Math.sin(t * 25)) * 0.10;
      var anschlag = t - (dauer - 0.105);
      if (anschlag >= 0) {
        var huelle = Math.min(1, anschlag / 0.009) * Math.exp(-anschlag * 47);
        v += (Math.sin(anschlag * 2 * Math.PI * 330) + Math.sin(anschlag * 2 * Math.PI * 570) * 0.32 +
          Math.sin(anschlag * 2 * Math.PI * 870) * 0.14) * huelle * (auf ? 0.065 : 0.08);
      }
      d[i] = v * laut;
    }
    var q = c.createBufferSource(), f = c.createBiquadFilter();
    q.buffer = p; f.type = 'lowpass'; f.frequency.value = auf ? 1100 : 900;
    q.connect(f); f.connect(c.destination);
    q.onended = function () { q.disconnect(); f.disconnect(); }; q.start(0);
  }

  R.starten = function (wurzel, zurueck) {
    R.stoppen();
    var D = window.RADIO_DATEN;
    if (!D) return;
    var weg = false, spielt = false, wartet = false, defekt = false, version = 0;
    var pos = Math.max(0, zahl(B.erinnern('radio.position.v1', 0), 0));
    var dauer = D.dauer || 0, gemerkt = 0, frame = null, bereit = false;
    var laut = B.klemme(zahl(B.erinnern('radio.laut', 75), 75), 0, 100);
    var quelle = null, gain = null, analyse = null, wellen = null, ctx = null;
    var nacht = B.erinnern('radio.abend', false) === true;
    var wieder = B.erinnern('radio.wiederholen', false) === true, schlummer = 0, letzteSekunde = -1;
    var stellen = B.erinnern('radio.stellen', []);
    if (!Array.isArray(stellen)) stellen = [];
    stellen = stellen.filter(function (s) { return typeof s === 'number' && isFinite(s) && s >= 0 && s < dauer; }).slice(0, 6);
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
    B.el('p', 'radio-sender', intro, D.sender);
    var titel = B.el('h1', 'radio-titel', intro, D.titel);
    PAPIER.schriftFuellen(titel, 'blau', { akzent: 'tiefblau' });
    B.el('p', 'radio-geschichte', intro, D.beschreibung);

    var buehne = B.el('div', 'radio-buehne', inhalt);
    var bild = B.el('img', 'radio-bild', buehne);
    bild.src = D.bild; bild.alt = 'Ein dunkelgrünes Küchenradio aus bemaltem Papier'; bild.draggable = false;
    var speaker = B.el('div', 'radio-lautsprecher', buehne);
    speaker.setAttribute('aria-hidden', 'true');
    var speakerBild = B.el('img', '', speaker); speakerBild.src = D.bild; speakerBild.alt = ''; speakerBild.draggable = false;
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
    var dreh = B.el('button', 'radio-druck radio-druck-an', buehne, '▶');
    dreh.type = 'button'; dreh.setAttribute('aria-label', 'Radio einschalten');
    var neuDreh = B.el('button', 'radio-druck radio-druck-neu', buehne, '↺');
    neuDreh.type = 'button'; neuDreh.setAttribute('aria-label', 'Aufnahme von vorn hören');
    PAPIER.hinterlegen(dreh, 'gelb', { seed: 51 }); PAPIER.hinterlegen(neuDreh, 'ocker', { seed: 52 });
    B.el('span', 'radio-druck-text radio-druck-text-an', buehne, 'HÖREN / PAUSE');
    B.el('span', 'radio-druck-text radio-druck-text-neu', buehne, 'VON VORN');
    var regler = B.el('div', 'radio-lautstaerke', buehne);
    regler.setAttribute('role', 'slider'); regler.tabIndex = 0;
    regler.setAttribute('aria-label', 'Lautstärke'); regler.setAttribute('aria-valuemin', '0'); regler.setAttribute('aria-valuemax', '100');
    var rad = B.el('span', 'radio-laut-rad', regler);
    PAPIER.hinterlegen(rad, 'gelb', { seed: 54 }); B.el('i', 'radio-laut-marke', rad);
    var lautText = B.el('span', 'radio-laut-text', buehne);
    var lautZahl = B.el('span', 'radio-laut-zahl', regler); lautZahl.setAttribute('aria-hidden', 'true');
    B.el('span', 'radio-drehen-hinweis', buehne, 'Lautstärke');

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
    var schublade = B.el('div', 'radio-schublade', inhalt);
    var fach = B.el('div', 'radio-extrafach', schublade); fach.id = 'radio-extrafach'; fach.style.display = 'none';
    fach.setAttribute('aria-hidden', 'true');
    var innen = B.el('div', 'radio-schublade-innen', fach);
    PAPIER.hinterlegen(innen, 'creme', { seed: 63, kachel: 240 });
    var fachTaste = B.el('button', 'radio-fach-taste', schublade);
    var front = B.el('img', 'radio-schubladenbild', fachTaste); front.src = D.schublade; front.alt = ''; front.draggable = false;
    var fachText = B.el('span', 'radio-fach-text', fachTaste, 'Das kleine Extrafach');
    var fachHinweis = B.el('span', 'radio-fach-hinweis', fachTaste, 'Am Griff öffnen ↓');
    fachTaste.type = 'button'; fachTaste.setAttribute('data-radio', 'extras'); fachTaste.setAttribute('aria-expanded', 'false');
    fachTaste.setAttribute('aria-controls', 'radio-extrafach');
    var fachOffen = false, fachTimer = null, fachFrame = null;
    B.tippen(fachTaste, function () {
      fachOffen = !fachOffen; clearTimeout(fachTimer); B.frameStopp(fachFrame);
      audioVerbinden(); schubladenKlang(fachOffen, laut / 100);
      fachTaste.setAttribute('aria-expanded', String(fachOffen)); fach.setAttribute('aria-hidden', String(!fachOffen));
      fachHinweis.textContent = fachOffen ? 'Am Griff schließen ↑' : 'Am Griff öffnen ↓';
      schublade.className = 'radio-schublade' + (fachOffen ? ' offen' : '');
      var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (still) { fach.style.display = fachOffen ? 'block' : 'none'; fach.style.maxHeight = 'none'; return; }
      if (fachOffen) {
        fach.style.display = 'block'; fach.style.maxHeight = '0px';
        void fach.offsetHeight;
        fachFrame = B.frame(function () { fach.style.maxHeight = fach.scrollHeight + 'px'; });
        fachTimer = setTimeout(function () { if (!weg && fachOffen) fach.style.maxHeight = 'none'; }, 440);
      } else {
        fach.style.maxHeight = fach.scrollHeight + 'px'; void fach.offsetHeight;
        fachFrame = B.frame(function () { fach.style.maxHeight = '0px'; });
        fachTimer = setTimeout(function () { if (!weg && !fachOffen) fach.style.display = 'none'; }, 440);
      }
    });
    var bonusZeile = B.el('div', 'radio-bonuszeile', innen);
    var objektTitel = { back: 'Zurück', forward: 'Weiter', repeat: 'Noch einmal', night: 'Abendlicht', bookmark: 'Lieblingsstelle', mute: 'Der Ton' };
    var objektHinweis = { back: '10 Sekunden', forward: '10 Sekunden', repeat: 'Immer wieder', night: 'An / aus', bookmark: 'Hier merken', mute: 'An / aus' };
    function bonus(name, text, fn) {
      var b = B.el('button', 'radio-bonus radio-objekt radio-objekt-' + name, bonusZeile); b.type = 'button'; b.setAttribute('data-radio', name);
      b.setAttribute('aria-label', objektTitel[name] + ': ' + text);
      var icon = B.el('span', 'radio-objekt-bild', b); icon.setAttribute('aria-hidden', 'true'); icon.style.backgroundImage = 'url("' + D.symbole + '")';
      var zettel = B.el('span', 'radio-objekt-zettel', b);
      PAPIER.hinterlegen(zettel, 'weiss', { seed: 81 + bonusZeile.children.length, kachel: 130 });
      B.el('span', 'radio-objekt-titel', zettel, name === 'bookmark' ? 'Lieblings\u00adstelle' : objektTitel[name]);
      B.el('span', 'radio-objekt-hinweis', zettel, objektHinweis[name]);
      var marke = B.el('span', 'radio-objekt-marke', b, 'an'); marke.setAttribute('aria-hidden', 'true');
      B.tippen(b, fn); return b;
    }
    bonus('back', '↶ 10 Sekunden', function () { springen(pos - 10); });
    bonus('forward', '10 Sekunden ↷', function () { springen(pos + 10); });
    var wiederTaste = bonus('repeat', '↻ Noch mal & noch mal', function () {
      wieder = !wieder; a.loop = wieder; B.merken('radio.wiederholen', wieder); wiederTaste.setAttribute('aria-pressed', String(wieder));
    });
    wiederTaste.setAttribute('aria-pressed', String(wieder));
    var nachtTaste = bonus('night', '☾ Abendlicht', function () {
      nacht = !nacht; B.merken('radio.abend', nacht); nachtTaste.setAttribute('aria-pressed', String(nacht)); anzeigen();
    });
    nachtTaste.setAttribute('aria-pressed', String(nacht));
    bonus('bookmark', '♡ Diese Stelle merken', function () {
      var t = Math.floor(pos);
      if (stellen.some(function (s) { return Math.abs(s - t) < 2; })) { anzeigen('Diese Lieblingsstelle ist schon gemerkt.'); return; }
      if (stellen.length >= 6) { anzeigen('Sechs Lieblingsstellen sind gemerkt. Du kannst unten eine freimachen.'); return; }
      stellen.push(t); stellen.sort(function (a, b) { return a - b; }); B.merken('radio.stellen', stellen); lieblingsstellen();
      anzeigen('Lieblingsstelle bei ' + zeit(t) + ' gemerkt.');
    });
    var stummTaste = bonus('mute', '♪ Ton aus / an', function () {
      if (laut) { B.merken('radio.vorStumm', laut); lautSetzen(0); }
      else lautSetzen(B.klemme(zahl(B.erinnern('radio.vorStumm', 75), 75), 5, 100));
    });
    var timerZeile = B.el('div', 'radio-schlummer', innen);
    B.el('div', 'radio-schlaf-titel', timerZeile, 'Wann soll das Radio schlafen?');
    var timerWahl = B.el('div', 'radio-schlaf-karten', timerZeile);
    timerWahl.setAttribute('data-radio', 'sleep'); timerWahl.setAttribute('role', 'radiogroup'); timerWahl.setAttribute('aria-label', 'Schlummer-Timer');
    var timerTasten = [], minuten = [0, 5, 10, 15];
    function timerWaehlen(n) {
      schlummer = n ? Date.now() + n * 60000 : 0; letzteSekunde = -1;
      timerTasten.forEach(function (b, i) { b.setAttribute('aria-checked', String(minuten[i] === n)); b.tabIndex = minuten[i] === n ? 0 : -1; });
    }
    minuten.forEach(function (n, index) {
      var b = B.el('button', 'radio-schlaf-karte', timerWahl); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('data-minuten', String(n));
      b.setAttribute('aria-label', n ? 'In ' + n + ' Minuten ausschalten' : 'Kein Schlummer-Timer');
      PAPIER.hinterlegen(b, n ? 'ocker' : 'weiss', { seed: 90 + index, kachel: 100 });
      B.el('span', 'radio-schlaf-zahl', b, n ? String(n) : 'Aus'); B.el('span', 'radio-schlaf-einheit', b, n ? 'Minuten' : 'Ganz in Ruhe');
      var stern = B.el('span', 'radio-schlaf-stern', b, '✦'); stern.setAttribute('aria-hidden', 'true');
      timerTasten.push(b); B.tippen(b, function () { timerWaehlen(n); });
      b.addEventListener('keydown', function (ev) {
        var ziel = index;
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') ziel = (index + 1) % 4;
        else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') ziel = (index + 3) % 4;
        else if (ev.key === 'Home') ziel = 0;
        else if (ev.key === 'End') ziel = 3;
        else return;
        ev.preventDefault(); timerWaehlen(minuten[ziel]); timerTasten[ziel].focus();
      });
    });
    timerWaehlen(0);
    var timerInfo = B.el('span', 'radio-timer-info', timerZeile);
    var lieblinge = B.el('div', 'radio-lieblinge', innen);
    function lieblingsstellen() {
      B.leeren(lieblinge);
      B.el('p', '', lieblinge, stellen.length ? 'Deine Lieblingsstellen' : 'Ein Lachen festhalten? Merke dir eine Lieblingsstelle.');
      stellen.forEach(function (t, index) {
        var chip = B.el('span', 'radio-merke', lieblinge);
        var sprung = B.el('button', 'radio-merke-sprung', chip, '♡ ' + zeit(t)); sprung.type = 'button';
        sprung.setAttribute('aria-label', 'Zur Lieblingsstelle bei ' + zeit(t)); B.tippen(sprung, function () { springen(t); });
        var wegTaste = B.el('button', 'radio-merke-loeschen', chip, '×'); wegTaste.type = 'button';
        wegTaste.setAttribute('aria-label', 'Lieblingsstelle bei ' + zeit(t) + ' entfernen');
        B.tippen(wegTaste, function () { stellen.splice(index, 1); B.merken('radio.stellen', stellen); lieblingsstellen(); });
      });
    }
    lieblingsstellen();
    var a = B.el('audio', 'radio-audio', seite);
    a.preload = 'metadata'; a.setAttribute('playsinline', ''); a.src = D.audio;
    a.loop = wieder;

    // Ein eigener Gain regelt auch auf iPads; HTMLAudio.volume allein reicht dort nicht.
    function audioVerbinden() {
      KLANG.entsperren(); ctx = KLANG.kontext();
      // Safari unterbricht den Kontext bei Sperrbildschirm/Tabwechsel gesondert.
      // Wieder direkt im Tipp-Ereignis wecken, ohne das HTML-play() zu verzögern.
      if (ctx && ctx.state === 'interrupted' && ctx.resume) {
        var weiter = ctx.resume();
        if (weiter && weiter['catch']) weiter['catch'](function () {
          if (!weg) anzeigen('Bitte zum Weiterhören noch einmal einschalten.');
        });
      }
      if (!gain && ctx && ctx.createMediaElementSource) {
        gain = ctx.createGain(); gain.gain.value = laut / 100;
        analyse = ctx.createAnalyser(); analyse.fftSize = 256; wellen = new Uint8Array(analyse.fftSize);
        quelle = ctx.createMediaElementSource(a);
        quelle.connect(gain); gain.connect(analyse); analyse.connect(ctx.destination);
        a.volume = 1;
      }
      if (!gain) a.volume = laut / 100;
    }
    function lautSetzen(wert) {
      laut = Math.round(B.klemme(wert, 0, 100)); B.merken('radio.laut', laut);
      regler.setAttribute('aria-valuenow', String(laut)); regler.setAttribute('aria-valuetext', laut ? laut + ' Prozent' : 'Stumm');
      lautText.textContent = 'leise · laut';
      lautZahl.textContent = laut ? String(laut) : '–';
      stummTaste.setAttribute('aria-pressed', String(laut === 0));
      stummTaste.querySelector('.radio-objekt-marke').textContent = 'aus';
      B.transform(rad, 'rotate(' + (-135 + laut * 2.7) + 'deg)');
      if (gain) {
        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(laut / 100, ctx.currentTime + 0.04);
      } else a.volume = laut / 100;
    }
    lautSetzen(laut);
    regler.addEventListener('keydown', function (ev) {
      var k = ev.key, wert = laut;
      if (k === 'ArrowUp' || k === 'ArrowRight') wert += 5;
      else if (k === 'ArrowDown' || k === 'ArrowLeft') wert -= 5;
      else if (k === 'Home') wert = 0;
      else if (k === 'End') wert = 100;
      else return;
      ev.preventDefault(); lautSetzen(wert);
    });
    var dreht = false, letzterWinkel = 0, drehWert = laut, zeiger = null;
    function winkel(ev) {
      var punkt = ev.touches ? ev.touches[0] : ev, box = regler.getBoundingClientRect();
      return Math.atan2(punkt.clientX - box.left - box.width / 2, box.top + box.height / 2 - punkt.clientY) * 180 / Math.PI;
    }
    function drehStart(ev) {
      if (ev.button != null && ev.button !== 0) return;
      ev.preventDefault(); dreht = true; drehWert = laut; letzterWinkel = winkel(ev);
      zeiger = ev.pointerId; regler.focus();
      if (regler.setPointerCapture && zeiger != null) regler.setPointerCapture(zeiger);
    }
    function drehBewegen(ev) {
      if (!dreht || (ev.pointerId != null && zeiger !== ev.pointerId)) return;
      if (ev.cancelable) ev.preventDefault();
      var w = winkel(ev), delta = w - letzterWinkel;
      if (delta > 180) delta -= 360; if (delta < -180) delta += 360;
      letzterWinkel = w; drehWert = B.klemme(drehWert + delta / 2.7, 0, 100); lautSetzen(drehWert);
    }
    function drehEnde() { dreht = false; zeiger = null; }
    var eingaben = window.PointerEvent ? [['pointerdown', drehStart, regler], ['pointermove', drehBewegen, window], ['pointerup', drehEnde, window], ['pointercancel', drehEnde, window]] :
      [['mousedown', drehStart, regler], ['mousemove', drehBewegen, window], ['mouseup', drehEnde, window], ['touchstart', drehStart, regler], ['touchmove', drehBewegen, window], ['touchend', drehEnde, window], ['touchcancel', drehEnde, window]];
    eingaben.forEach(function (e) { e[2].addEventListener(e[0], e[1], { passive: false }); });
    function springen(t) {
      pos = B.klemme(t, 0, Math.max(0, dauer - 0.05));
      if (bereit) a.currentTime = pos; B.merken('radio.position.v1', pos); zeitanzeige();
      if (!spielt) anzeigen();
    }

    function speichern() {
      if (bereit && !a.ended) pos = zahl(a.currentTime, pos);
      B.merken('radio.position.v1', pos);
    }
    function anzeigen(text) {
      seite.className = 'radio-seite' + (spielt && !wartet ? ' spielt' : '') + (wartet ? ' wartet' : '') + (nacht ? ' abend' : '');
      dreh.textContent = spielt ? 'Ⅱ' : '▶';
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
      if (klang) schalten(false, laut / 100);
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
      audioVerbinden(); schalten(true, laut / 100);
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
    a.addEventListener('playing', function () { if (!weg && !a.paused) { spielt = true; wartet = false; anzeigen(); } });
    a.addEventListener('waiting', function () { if (!weg && spielt && !a.paused) { wartet = true; anzeigen(); } });
    a.addEventListener('pause', function () {
      if (weg || a.ended || defekt || !spielt) return;
      spielt = false; wartet = false; speichern(); anzeigen();
    });
    a.addEventListener('ended', function () {
      if (weg) return;
      spielt = false; wartet = false; pos = 0; B.merken('radio.position.v1', 0);
      schalten(false, laut / 100); anzeigen('Zu Ende gehört. Noch einmal zurück nach damals?');
    });
    a.addEventListener('error', fehlgeschlagen);
    function versteckt() { if (document.hidden) { if (spielt) pause(false); else speichern(); } }
    function verlassen() { if (spielt) pause(false); else speichern(); }
    document.addEventListener('visibilitychange', versteckt);
    window.addEventListener('pagehide', verlassen);
    var weniger = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    var druck = 0;
    function bewegen() {
      if (weg) return;
      if (schlummer) {
        var rest = Math.max(0, Math.ceil((schlummer - Date.now()) / 1000));
        if (rest !== letzteSekunde) { timerInfo.textContent = 'Noch ' + zeit(rest); letzteSekunde = rest; }
        if (!rest) { timerWaehlen(0); timerInfo.textContent = ''; pause(true); anzeigen('Schlummer-Radio aus. Deine Stelle ist gemerkt.'); }
      } else if (timerInfo.textContent) timerInfo.textContent = '';
      if (!weniger || !weniger.matches) {
        var e = D.pegel || [], idx = Math.floor(a.currentTime * (D.pegelHz || 10));
        var amplitude = spielt && !wartet ? (e[idx] || 0) / 255 * laut / 100 : 0;
        if (analyse && spielt && !wartet) {
          analyse.getByteTimeDomainData(wellen);
          var summe = 0;
          for (var k = 0; k < wellen.length; k++) { var sample = (wellen[k] - 128) / 128; summe += sample * sample; }
          amplitude = Math.min(1, Math.sqrt(summe / wellen.length) * 5.5);
        }
        druck += (amplitude - druck) * (amplitude > druck ? 0.6 : 0.16);
        B.transform(speaker, 'perspective(600px) scale(' + (1 + druck * 0.065).toFixed(4) + ')');
        speaker.style.boxShadow = '0 ' + (druck * 5).toFixed(1) + 'px ' + (druck * 16).toFixed(1) + 'px rgba(8,23,17,' + (druck * 0.5).toFixed(2) + ')';
        for (var j = 0; j < balken.length; j++) {
          var wert = 0.14 + amplitude * (0.35 + 0.65 * Math.abs(Math.sin(a.currentTime * 7 + j * 1.3)));
          B.transform(balken[j], 'scaleY(' + wert.toFixed(3) + ')');
        }
      } else {
        B.transform(speaker, 'none'); speaker.style.boxShadow = 'none';
        for (var l = 0; l < balken.length; l++) B.transform(balken[l], 'scaleY(.14)');
      }
      frame = B.frame(bewegen);
    }
    aktiv = function () {
      speichern(); weg = true; version++;
      if (!a.paused) schalten(false, laut / 100);
      a.pause(); a.removeAttribute('src'); a.load();
      if (quelle) quelle.disconnect(); if (gain) gain.disconnect(); if (analyse) analyse.disconnect();
      eingaben.forEach(function (e) { e[2].removeEventListener(e[0], e[1], false); });
      clearTimeout(fachTimer); B.frameStopp(fachFrame);
      B.frameStopp(frame);
      document.removeEventListener('visibilitychange', versteckt);
      window.removeEventListener('pagehide', verlassen);
    };
    anzeigen(); bewegen();
  };
  R.stoppen = function () { if (aktiv) { aktiv(); aktiv = null; } };
})();
