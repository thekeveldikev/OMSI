/* Ein verlässlicher Rückweg über allen Unterseiten und Bonusfenstern. */
(function () {
  var R = window.RUECKWEG = {}, knopf = null, beobachter = null, taste = null;
  var farben = { original:'#244e85', fortsetzung:'#ad412b', akte:'#9d6d23', rezept:'#477743', radio:'#206757', makingof:'#335b61', finale:'#ae3e35', spiel:'#b57517', brief:'#285a8b', schatten:'#30314d' };
  R.zeigen = function (name, zurueck) {
    if (beobachter) { beobachter.disconnect(); beobachter = null; }
    if (taste) { document.removeEventListener('keydown', taste, false); taste = null; }
    if (knopf && knopf.parentNode) knopf.parentNode.removeChild(knopf);
    knopf = null; document.body.removeAttribute('data-rueckweg');
    if (name === 'kueche' || name === 'start') return;
    document.body.setAttribute('data-rueckweg', name);
    knopf = document.createElement('button'); knopf.type = 'button'; knopf.className = 'rk-zurueck';
    knopf.setAttribute('aria-label', 'Zurück zur Küche');
    var ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 156 52'); svg.setAttribute('aria-hidden','true');
    function pfad(d,fill,opacity) { var p=document.createElementNS(ns,'path'); p.setAttribute('d',d);p.setAttribute('fill',fill);if(opacity)p.setAttribute('opacity',opacity);svg.appendChild(p); }
    pfad('M4 4 L46 1 85 4 151 2 155 21 152 48 113 50 64 48 3 51 1 26Z','#f8edce');
    pfad('M4 42 L38 46 84 43 151 45 152 48 65 48 3 51Z','#d4bc87');
    pfad('M14 27 L30 11 34 15 31 22 49 21 50 31 31 31 34 39 28 40Z',farben[name] || '#315b6c');
    pfad('M14 27 L30 11 26 26 48 24 48 27 25 29Z','#fff','.2');
    pfad('M7 7 L60 4 148 6 103 9 37 8Z','#fff','.4');
    knopf.appendChild(svg);
    var text = document.createElement('span'); text.textContent = 'Zur Küche'; knopf.appendChild(text);
    knopf.addEventListener('click', function () {
      if (zurueck) { zurueck(); return; }
      // Theater hat eine eigene Aufräumroutine am vorhandenen Schließen-Knopf.
      var theater = document.querySelector('.schatten-zu'); if (theater) theater.click();
      APP.zeige('kueche');
    }, false);
    document.body.appendChild(knopf);
    taste = function (ev) {
      var ziel = ev.target;
      if (ev.keyCode !== 27 || ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey) return;
      if (ziel && (/INPUT|TEXTAREA|SELECT/.test(ziel.tagName) || ziel.isContentEditable)) return;
      // Offene Bonusfenster schließen selbst zuerst; erst danach führt Escape zur Küche.
      if (document.querySelector('[role="dialog"], [aria-modal="true"], .schatten-zu')) return;
      ev.preventDefault(); knopf.click();
    };
    document.addEventListener('keydown', taste, false);
    // Bonusdialoge besitzen einen Fokusfang. Der Rückweg gehört dann zum Dialog.
    var Observer = window.MutationObserver || window.WebKitMutationObserver;
    if (name === 'makingof' && Observer) {
      beobachter = new Observer(function () {
        var dialog = document.querySelector('.mo-modal'), ziel = dialog || document.body;
        if (knopf && knopf.parentNode !== ziel) ziel.appendChild(knopf);
      });
      beobachter.observe(document.body, {childList:true});
    }
  };
  R.rezeptExtras = function (karte) {
    var zeilen = karte.querySelectorAll('.rezept-zutaten .rezept-zeile');
    for (var i=0;i<zeilen.length;i++) (function (z) {
      z.setAttribute('role','button'); z.setAttribute('tabindex','0'); z.setAttribute('aria-pressed','false');
      z.className += ' rk-zutat'; z.title = 'Zutat bereit? Zum Abhaken antippen.';
      function an() { var fertig=z.getAttribute('aria-pressed')!=='true';z.setAttribute('aria-pressed',fertig?'true':'false'); }
      z.addEventListener('click',an,false);
      z.addEventListener('keydown',function(e){if(e.keyCode===13||e.keyCode===32){e.preventDefault();an();}},false);
    })(zeilen[i]);
  };
})();
