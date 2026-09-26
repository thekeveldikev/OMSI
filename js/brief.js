/* Eigenständiger Briefbildschirm; der persönliche Inhalt bleibt bis zur Lieferung leer. */
(function () {
  var R = window.BRIEF = {}, zustand = null;
  R.starten = function (wurzel, zurueck) {
    R.stoppen();
    var s = zustand = {}, text = window.BRIEF_TEXT || {};
    var root = B.el('main', 'brief-seite', wurzel);
    root.setAttribute('aria-label', 'Ein Brief für dich');
    var leiste = B.el('div', 'brief-leiste', root);
    var back = B.el('button', 'brief-zurueck', leiste, '⌂ Zur Küche'); back.type = 'button';
    B.tippen(back, zurueck);
    B.el('h1', 'brief-titel', leiste, 'Ein Brief für dich');
    var papier = B.el('article', 'brief-papier', root);
    var img = B.el('img', 'brief-papierbild', papier);
    img.src = 'bilder/menue-v2/briefpapier-v1.png'; img.alt = ''; img.setAttribute('aria-hidden', 'true');
    var inhalt = B.el('div', 'brief-inhalt', papier);
    if (text.anrede) B.el('p', 'brief-anrede', inhalt, text.anrede);
    (text.absaetze || []).forEach(function (absatz) { B.el('p', '', inhalt, absatz); });
    if (text.unterschrift) B.el('p', 'brief-unterschrift', inhalt, text.unterschrift);
    if (!inhalt.childNodes.length) papier.setAttribute('aria-label', 'Unbeschriebenes Briefpapier. Der persönliche Brief folgt später.');
    s.resize = function () {
      if (!inhalt.childNodes.length) papier.style.maxWidth = Math.min(820, (root.clientHeight - leiste.offsetHeight - 32) / 1.5) + 'px';
      var breite = papier.clientWidth;
      papier.style.minHeight = breite * 1.5 + 'px';
      inhalt.style.fontSize = Math.max(17, Math.min(25, breite * .033)) + 'px';
    };
    s.key = function (ev) { if (ev.keyCode === 27) { ev.preventDefault(); zurueck(); } };
    window.addEventListener('resize', s.resize, false);
    document.addEventListener('keydown', s.key, false);
    s.resize();
    back.focus();
  };
  R.stoppen = function () {
    if (!zustand) return;
    window.removeEventListener('resize', zustand.resize, false);
    document.removeEventListener('keydown', zustand.key, false);
    zustand = null;
  };
  R.aktiv = function () { return !!zustand; };
})();
