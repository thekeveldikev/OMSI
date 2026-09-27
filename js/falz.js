/* Buchfalz ein- und ausschalten.
   Die Falz ist nur ein Effekt (Mittellinie + weicher Schatten an den Innenkanten), kein Teil der Bilder.
   Ein kleines Papierschild – im Stil des Rückweg-Schilds – schaltet sie in beiden Büchern und im
   Making-of um; die Wahl gilt überall und wird gemerkt. Bewusst ES5. */
(function () {
  var F = window.FALZ = {};
  var FARBEN = { original: "#244e85", fortsetzung: "#ad412b", makingof: "#335b61" };
  var aus = B.erinnern("falz.aus", false) === true;
  var schild = null, text = null, lauf = null;

  function anwenden() {
    var k = document.body.className.replace(/\s*ohne-falz/g, "");
    document.body.className = aus ? k + " ohne-falz" : k;
    if (schild) {
      schild.setAttribute("aria-pressed", aus ? "false" : "true");
      schild.setAttribute("aria-label", aus ? "Buchfalz ist aus – antippen zum Einschalten" : "Buchfalz ist an – antippen zum Ausschalten");
      text.textContent = aus ? "Falz aus" : "Falz an";
    }
  }

  function pfad(svg, d, attr) {
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d);
    for (var k in attr) p.setAttribute(k, attr[k]);
    svg.appendChild(p);
    return p;
  }
  function bauen(farbe) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "falz-schild";
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 132 46"); svg.setAttribute("aria-hidden", "true");
    // gerissenes Papier wie beim Rückweg-Schild
    pfad(svg, "M4 4 L40 1 74 4 128 2 131 19 129 43 96 45 55 43 3 45 1 23Z", { fill: "#f8edce" });
    pfad(svg, "M4 37 L32 41 72 38 128 40 129 43 56 43 3 45Z", { fill: "#d4bc87" });
    pfad(svg, "M7 7 L52 4 125 6 88 9 32 8Z", { fill: "#fff", opacity: ".4" });
    // aufgeschlagenes Buch aus Papier; die Mittellinie ist die Falz
    pfad(svg, "M26 15 C21 12 16 12 11 13.5 L11 33 C16 32 21 32.5 26 35 Z", { fill: farbe });
    pfad(svg, "M28 15 C33 12 38 12 43 13.5 L43 33 C38 32 33 32.5 28 35 Z", { fill: farbe, opacity: ".82" });
    pfad(svg, "M27 14.5 L27 35.5", { stroke: "#2b2118", "stroke-width": "1.8", "stroke-linecap": "round", "class": "falz-linie" });
    b.appendChild(svg);
    text = B.el("span", "", b, "");
    B.tippen(b, function (ev) {
      ev.stopPropagation();
      aus = !aus; B.merken("falz.aus", aus); anwenden();
      if (window.KLANG) { KLANG.entsperren(); if (KLANG.blaettern) KLANG.blaettern(); else if (KLANG.plopp) KLANG.plopp(); }
    });
    return b;
  }

  // Das Schild sitzt links neben dem ersten Knopf rechts oben (Buch: Geräusche; Making-of: Fundstücke)
  function anker(name) {
    if (name !== "makingof") return document.querySelector(".buch-bildschirm .knopf.geraeusche");
    var bar = document.querySelector(".mo-bar");
    if (!bar) return null;
    var titel = bar.querySelector(".mo-bar-title"), grenze = titel && titel.offsetWidth ? titel.getBoundingClientRect().right : 0;
    var knoepfe = [].slice.call(bar.querySelectorAll(".mo-btn")).filter(function (k) {
      return k.offsetWidth && k.getBoundingClientRect().left > grenze;
    });
    knoepfe.sort(function (a, b) { return a.getBoundingClientRect().left - b.getBoundingClientRect().left; });
    return knoepfe[0] || null;
  }
  function platzieren(name) {
    if (!schild) return;
    var a = anker(name);
    if (!a || !a.offsetWidth) { schild.style.visibility = "hidden"; return; }
    var r = a.getBoundingClientRect();
    schild.style.right = Math.round(window.innerWidth - r.left + 12) + "px";
    schild.style.top = Math.round(r.top + r.height / 2 - 23) + "px";
    // nie über Titel oder Rückweg-Schild schieben
    var links = r.left - 12 - 132, titel = document.querySelector(name === "makingof" ? ".mo-bar-title" : ".leiste-titel");
    var frei = 170;
    if (name === "makingof" && titel && titel.offsetWidth) frei = Math.max(frei, titel.getBoundingClientRect().right + 8);
    schild.style.visibility = links >= frei ? "" : "hidden";
  }

  F.zeigen = function (name) {
    if (lauf) { clearInterval(lauf.takt); window.removeEventListener("resize", lauf.neu, false); window.removeEventListener("orientationchange", lauf.neu, false); lauf = null; }
    if (schild && schild.parentNode) schild.parentNode.removeChild(schild);
    schild = null;
    anwenden();
    if (!FARBEN[name]) return;
    schild = bauen(FARBEN[name]);
    schild.style.visibility = "hidden";
    document.body.appendChild(schild);
    anwenden();
    var neu = function () { platzieren(name); };
    lauf = { neu: neu, takt: setInterval(neu, 800) };          // Leisten bauen sich teils verzögert auf
    window.addEventListener("resize", neu, false);
    window.addEventListener("orientationchange", neu, false);
    setTimeout(neu, 0);
  };
  F.istAus = function () { return aus; };

  if (document.body) anwenden(); else document.addEventListener("DOMContentLoaded", anwenden);
})();
