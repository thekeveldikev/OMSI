/* Die Akte sitzt in beiden Formaten auf dem illustrierten Papier. */
(function () {
  var A = window.AKTE = {}, lauf = null;
  A.starten = function (wurzel) {
    A.stoppen();
    var daten = EXTRAS.akte, s = lauf = { timer:0 };
    var seite = B.el('div','akte-bildschirm ak2',wurzel);
    PAPIER.hinterlegen(seite,'tiefblau',{kachel:300});
    var dossier = B.el('article','akte-dossier ak2-dossier',seite);
    var papier = B.el('div','akte-blatt-text ak2-papier',dossier);
    B.el('h1','akte-kopf',papier,B.ersetzen(daten.kopf));
    B.el('p','akte-unter',papier,B.ersetzen(daten.unter));
    var felder = B.el('dl','akte-felder',papier);
    daten.felder.forEach(function(f){
      var zeile=B.el('div','akte-zeile',felder);
      B.el('dt','akte-name',zeile,B.ersetzen(f[0])+':');
      B.el('dd','akte-wert',zeile,B.ersetzen(f[1]));
    });
    B.el('p','akte-unterschrift da',papier,B.ersetzen(daten.unterschrift));
    var stempel=B.el('button','akte-stempel knall',dossier,B.ersetzen(daten.stempel));
    stempel.type='button';stempel.setAttribute('aria-label','Noch einmal genehmigen und stempeln');
    var status=B.el('span','ak2-status',seite);status.setAttribute('role','status');
    B.tippen(stempel,function(){
      if(s.timer)clearTimeout(s.timer);
      stempel.className='akte-stempel';void stempel.offsetWidth;stempel.className='akte-stempel knall';
      KLANG.entsperren();KLANG.stempel();status.textContent='Von 007 genehmigt.';
      s.timer=setTimeout(function(){status.textContent='';},1800);
    });
    s.resize=function(){
      var hoch=window.innerWidth<900 || window.innerWidth<=window.innerHeight*1.25;
      seite.classList.toggle('ak2-hoch',hoch);
      var breite=hoch?Math.min(seite.clientWidth-24,790):Math.min(seite.clientWidth-28,Math.max(900,(seite.clientHeight-88)/.75));
      dossier.style.width=breite+'px';dossier.style.height=breite*(hoch?(breite<340?1.75:1.5):.75)+'px';
      var f=hoch?Math.min(24,Math.max(14,breite*.029)):Math.min(22,breite*.019);
      papier.style.fontSize=f+'px';
      while(f>10 && (papier.scrollHeight>papier.clientHeight+1 || papier.scrollWidth>papier.clientWidth+1)){f-=.25;papier.style.fontSize=f+'px';}
      stempel.style.fontSize=Math.max(14,breite*.025)+'px';
    };
    window.addEventListener('resize',s.resize,false);s.resize();
  };
  A.stoppen=function(){if(!lauf)return;window.removeEventListener('resize',lauf.resize,false);if(lauf.timer)clearTimeout(lauf.timer);lauf=null;};
})();
