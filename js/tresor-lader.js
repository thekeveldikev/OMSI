/* Startet die veröffentlichte Fassung: Service Worker (entschlüsselt) → Geheimwort
   (aus dem Einrichtungs-Link #schluessel=… oder einmal eingeben) → App laden.
   Braucht iOS 11.3 oder neuer. */
(function () {
  var INFO = window.TRESOR_INFO;
  var SKRIPTE = INFO.skripte;
  var app = document.getElementById("app");

  function bildschirm(html, art) {
    app.innerHTML = '<div class="tresor' + (art ? " " + art : "") + '"><div class="tresor-karte">' + html + "</div></div>";
  }
  function b64zuPuffer(s) { var bin = atob(s), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function pufferZuB64(buf) { var a = new Uint8Array(buf), s = ""; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }

  if (!("serviceWorker" in navigator) || !window.crypto || !crypto.subtle || !window.Promise) {
    bildschirm("<h1>Oh je!</h1><p>Dieses iPad ist leider zu alt für das Geschenk (nötig: iOS 11.3 oder neuer).</p>");
    return;
  }

  // Geheimwort → Schlüssel (PBKDF2) → prüfen. Groß-/Kleinschreibung und Leerzeichen sind egal
  // (die Werkzeuge leiten den Schlüssel ebenso aus dem kleingeschriebenen Wort ab).
  function normal(wort) { return String(wort || "").replace(/^\s+|\s+$/g, "").toLowerCase(); }
  function ableiten(wort) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(normal(wort)), { name: "PBKDF2" }, false, ["deriveKey"]).then(function (basis) {
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64zuPuffer(INFO.salz), iterations: INFO.runden, hash: "SHA-256" },
        basis, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
    }).then(function (k) {
      var p = b64zuPuffer(INFO.pruefung);
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: p.slice(0, 12) }, k, p.slice(12)).then(function () {
        return crypto.subtle.exportKey("raw", k);
      });
    }).then(pufferZuB64);
  }

  // Passt ein gespeicherter Schlüssel noch? Nach einem neuen Geheimwort nicht mehr → dann neu fragen
  function pruefen(roh) {
    return crypto.subtle.importKey("raw", b64zuPuffer(roh), { name: "AES-GCM" }, false, ["decrypt"]).then(function (k) {
      var p = b64zuPuffer(INFO.pruefung);
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: p.slice(0, 12) }, k, p.slice(12));
    });
  }

  function schluesselAnWorker(roh) {
    return navigator.serviceWorker.ready.then(function (reg) {
      var ziel = navigator.serviceWorker.controller || reg.active;
      return new Promise(function (ok) {
        var kanal = new MessageChannel();
        kanal.port1.onmessage = function () { ok(); };
        ziel.postMessage({ schluessel: roh }, [kanal.port2]);
        setTimeout(ok, 3000);
      });
    });
  }

  // ───────────── Ladeanzeige im Stil des Buchs ─────────────
  // Codex' Papier-Pfannkuchen fliegt aus der Collage-Pfanne und wird gewendet. Feuer und Ladebalken werden
  // live gezeichnet – aus gerissenem, bemaltem Seidenpapier wie der Rauch im Buch (die App-Skripte sind hier
  // noch nicht geladen, deshalb ist alles Nötige in dieser Datei). Bilder in lader/: bewusst unverschlüsselt,
  // weil sie VOR dem Entsperren gebraucht werden – nichts Privates.
  var LADE = window.LADEANZEIGE = {};
  function zufallsFolge(seed) { var x = seed || 1; return function () { x = (x * 16807) % 2147483647; return (x - 1) / 2147483646; }; }
  var papierCache = {};
  function papier(farbe, seed) {                      // kleines Blatt bemaltes Seidenpapier (wie js/papier.js)
    var key = farbe + seed;
    if (papierCache[key]) return papierCache[key];
    var z = zufallsFolge(seed * 131 + farbe.length * 7), g = 128, cv = document.createElement("canvas");
    cv.width = cv.height = g;
    var c = cv.getContext("2d");
    c.fillStyle = farbe; c.fillRect(0, 0, g, g);
    c.lineCap = "round";
    var w = z() * Math.PI;
    for (var i = 0; i < 70; i++) {
      var hell = z() < 0.5, x = z() * g * 1.3 - g * 0.15, y = z() * g * 1.3 - g * 0.15, l = g * (0.2 + z() * 0.5), ww = w + (z() - 0.5) * 0.7;
      c.strokeStyle = hell ? "rgba(255,248,220," + (0.08 + z() * 0.22) + ")" : "rgba(90,20,0," + (0.05 + z() * 0.16) + ")";
      c.lineWidth = 1 + z() * z() * 12;
      c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(ww) * l * 0.5 + (z() - 0.5) * 20, y + Math.sin(ww) * l * 0.5, x + Math.cos(ww) * l, y + Math.sin(ww) * l); c.stroke();
    }
    for (i = 0; i < 380; i++) { c.fillStyle = z() < 0.5 ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)"; c.fillRect(z() * g, z() * g, 1, 1); }
    papierCache[key] = cv;
    return cv;
  }
  function muster(c, farbe, seed) {
    var key = "m" + farbe + seed;
    if (!c.__m) c.__m = {};
    if (!c.__m[key]) c.__m[key] = c.createPattern(papier(farbe, seed), "repeat");
    return c.__m[key];
  }
  function leinwand(cv) {
    var d = Math.min(window.devicePixelRatio || 1, 2), b = cv.clientWidth || parseInt(cv.getAttribute("width"), 10), h = cv.clientHeight || parseInt(cv.getAttribute("height"), 10);
    cv.width = Math.round(b * d); cv.height = Math.round(h * d);
    var c = cv.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0);
    return { c: c, b: b, h: h };
  }
  var raf = window.requestAnimationFrame || function (f) { return setTimeout(function () { f(Date.now()); }, 16); };

  // Feuer aus gerissenem Papier: jede Farbschicht ist EINE zusammenhängende Flammenmasse (rot hinten, orange,
  // gelb, heller Kern vorn), deren Oberkante in unterschiedlich hohe, spitze Zacken ausläuft, die ineinanderfließen.
  // Gezeichnet wie Stop-Motion (gut 8 Bilder/s): die Zacken atmen, wandern und neigen sich, die Papierkante reißt
  // bei jedem Bild ein wenig anders; ab und zu löst sich oben ein Flämmchen, Papierfunken steigen auf.
  LADE.feuer = function (cv) {
    var L = leinwand(cv), c = L.c, B0 = L.b, H0 = L.h, basis = H0 - 14, mitte = B0 / 2, breit = B0 * 0.33;
    var LAGEN = [{ w: 1.0, sockel: 26, zacken: 5, h: [40, 82], farbe: "#c8301a", unten: "#f07818", oben: "#8e1a0c" },
                 { w: 0.8, sockel: 21, zacken: 4, h: [30, 62], farbe: "#e8601a", unten: "#f7a41f", oben: "#d23c18" },
                 { w: 0.58, sockel: 15, zacken: 4, h: [18, 42], farbe: "#f39a1e", unten: "#fbd24a", oben: "#ee7a16" },
                 { w: 0.32, sockel: 9, zacken: 2, h: [9, 22], farbe: "#f7c832", unten: "#fff6c2", oben: "#f6b82a" }];
    LAGEN.forEach(function (lg) {
      lg.sp = [];
      for (var k = 0; k < lg.zacken; k++) lg.sp.push({ x: -0.85 + 1.7 * (k + 0.5) / lg.zacken + (Math.random() - 0.5) * 0.12,
        h: lg.h[0] + Math.random() * (lg.h[1] - lg.h[0]), b: 0.3 + Math.random() * 0.16, neig: 0 });
    });
    var funken = [], lose = [];
    function umriss(lg) {                                    // Oberkante: Sockel + Vereinigung spitzer Zacken, zum Rand hin niedriger
      var W = breit * lg.w, pkt = [], x;
      for (x = -W; x <= W + 0.1; x += 3) {
        var xr = x / W, huelle = Math.pow(Math.max(0, Math.cos(xr * Math.PI / 2)), 0.55), oben = lg.sockel * huelle, schief = 0;
        lg.sp.forEach(function (z) {
          var d = Math.abs(xr - z.x) / z.b;
          if (d < 1) { var hz = z.h * Math.pow(1 - d, 1.7) * (0.35 + 0.65 * huelle); if (hz > oben) { oben = hz; schief = z.neig; } }
        });
        pkt.push([x + schief * oben + (Math.random() - 0.5) * 1.6, oben + (Math.random() - 0.5) * 1.4]);
      }
      // keine "Pfütze": unten läuft das Feuer schmal zusammen (wie aus dem Brenner), oben fächert es auf
      function eng(px, hoehe) { return mitte + px * (0.32 + 0.68 * Math.min(1, hoehe / (lg.h[1] * 0.55))); }
      c.beginPath(); c.moveTo(eng(-W * 0.9, 0), basis);
      for (var i = 0; i < pkt.length; i++) c.lineTo(eng(pkt[i][0], pkt[i][1]), basis - pkt[i][1]);
      c.lineTo(eng(W * 0.9, 0), basis);
      c.closePath();
    }
    function bild() {
      if (!document.body.contains(cv)) return;
      c.clearRect(0, 0, B0, H0);
      var g = c.createRadialGradient(mitte, basis - 34, 4, mitte, basis - 34, breit * 1.2);   // warmer Schein im Feuer
      g.addColorStop(0, "rgba(255,170,50,0.4)"); g.addColorStop(1, "rgba(255,170,50,0)");
      c.fillStyle = g; c.fillRect(0, 0, B0, H0);
      LAGEN.forEach(function (lg, n) {
        lg.sp.forEach(function (z) {                         // atmen, wandern, neigen – halb vom alten Wert
          z.h = z.h * 0.5 + (lg.h[0] + Math.random() * (lg.h[1] - lg.h[0])) * 0.5;
          z.x = Math.max(-0.9, Math.min(0.9, z.x + (Math.random() - 0.5) * 0.08));
          z.neig = z.neig * 0.5 + (Math.random() - 0.5) * 0.35;
        });
        if (n === 0 && Math.random() < 0.3) {               // ein Flämmchen löst sich von der höchsten Spitze
          var top = lg.sp.reduce(function (a, b) { return b.h > a.h ? b : a; });
          lose.push({ x: mitte + top.x * breit, y: basis - top.h - 6, g: 5 + Math.random() * 4, leben: 2 });
        }
        umriss(lg);
        c.fillStyle = muster(c, lg.farbe, n + 1); c.fill();
        var ver = c.createLinearGradient(0, basis, 0, basis - lg.h[1]);
        ver.addColorStop(0, lg.unten); ver.addColorStop(1, lg.oben);
        c.save(); c.globalAlpha = 0.5; c.fillStyle = ver; c.fill(); c.restore();
      });
      var fuss = c.createLinearGradient(0, basis - 30, 0, basis + 2);                     // unten weich auslaufen, keine harte Kante
      fuss.addColorStop(0, "rgba(0,0,0,0)"); fuss.addColorStop(1, "rgba(0,0,0,1)");
      c.save(); c.globalCompositeOperation = "destination-out"; c.fillStyle = fuss; c.fillRect(0, basis - 30, B0, H0 - basis + 30); c.restore();
      lose.forEach(function (f) {                            // lose Flämmchen: kleine Papierspitze, steigt und verlischt
        f.leben--; f.y -= 9;
        c.save(); c.globalAlpha = 0.9; c.translate(f.x, f.y);
        c.beginPath(); c.moveTo(-f.g * 0.5, 0); c.quadraticCurveTo(-f.g * 0.5, -f.g, 0, -f.g * 1.8); c.quadraticCurveTo(f.g * 0.5, -f.g, f.g * 0.5, 0);
        c.quadraticCurveTo(0, f.g * 0.4, -f.g * 0.5, 0); c.closePath();
        c.fillStyle = muster(c, "#e8601a", 2); c.fill(); c.restore();
      });
      lose = lose.filter(function (f) { return f.leben > 0; });
      if (Math.random() < 0.35) funken.push({ x: mitte + (Math.random() - 0.5) * breit * 1.4, y: basis - 45 - Math.random() * 20, dreh: Math.random() * 6, leben: 5 + Math.floor(Math.random() * 4) });
      funken.forEach(function (f) {                          // Papierfunken, ebenfalls stufig
        f.leben--; f.y -= 7 + Math.random() * 5; f.x += (Math.random() - 0.5) * 6; f.dreh += 0.9;
        c.save(); c.globalAlpha = Math.min(1, f.leben / 3); c.translate(f.x, f.y); c.rotate(f.dreh);
        c.beginPath(); c.moveTo(-2.8, -1.2); c.lineTo(1.8, -2.4); c.lineTo(3, 1.4); c.lineTo(-1.2, 2.4); c.closePath();
        c.fillStyle = muster(c, "#f7c832", 9); c.fill(); c.restore();
      });
      funken = funken.filter(function (f) { return f.leben > 0; });
      setTimeout(bild, 115 + Math.random() * 30);
    }
    bild();
  };

  // Ladebalken: gerissener Papierstreifen mit zwei Klebestreifen; goldenes Papier füllt ihn von links
  LADE.balken = function (cv) {
    var L = leinwand(cv), c = L.c, B0 = L.b, H0 = L.h, ziel = 0.08, jetzt = 0.08, zuletzt = 0;
    var x0 = 18, x1 = B0 - 18, y0 = H0 / 2 - 11, y1 = H0 / 2 + 11, kanteO = [], kanteU = [], z = zufallsFolge(77);
    for (var i = 0; i <= 40; i++) { kanteO.push((z() - 0.5) * 2.4); kanteU.push((z() - 0.5) * 2.4); }
    function streifen(xa, xb, ya, yb, zacken) {
      var n = 40, i;
      c.beginPath();
      for (i = 0; i <= n; i++) { var x = xa + (xb - xa) * i / n; c[i ? "lineTo" : "moveTo"](x, ya + kanteO[i]); }
      for (i = 0; i <= 6; i++) c.lineTo(xb + (zacken ? (i % 2 ? 2.5 : -1.5) : (i % 2 ? 1 : -1)), ya + (yb - ya) * i / 6);   // gerissenes Ende
      for (i = n; i >= 0; i--) { var x2 = xa + (xb - xa) * i / n; c.lineTo(x2, yb + kanteU[i]); }
      c.closePath();
    }
    function klebe(x, dreh) {
      c.save(); c.translate(x, H0 / 2 - 9); c.rotate(dreh);
      c.fillStyle = "rgba(236,226,190,0.85)"; c.fillRect(-15, -6, 30, 12);
      c.fillStyle = "rgba(255,255,255,0.28)"; c.fillRect(-15, -6, 30, 2.5); c.restore();
    }
    LADE.setzen = function (anteil) { ziel = Math.max(ziel, Math.min(1, anteil)); };
    function bild(zeit) {
      if (!document.body.contains(cv)) return;
      var dt = zuletzt ? Math.min(0.05, (zeit - zuletzt) / 1000) : 0.016; zuletzt = zeit;
      jetzt += (ziel - jetzt) * Math.min(1, dt * 5);
      c.clearRect(0, 0, B0, H0);
      c.save(); c.translate(1.5, 2.5); streifen(x0, x1, y0, y1, false); c.fillStyle = "rgba(90,60,30,0.18)"; c.fill(); c.restore();   // Schatten
      streifen(x0, x1, y0, y1, false); c.fillStyle = muster(c, "#efdcb0", 3); c.fill();                                                // Papierbahn
      c.lineWidth = 1; c.strokeStyle = "rgba(140,100,50,0.35)"; c.stroke();
      var xe = x0 + (x1 - x0) * jetzt;
      streifen(x0, xe, y0 + 2.5, y1 - 2.5, true); c.fillStyle = muster(c, "#e59a1c", 5); c.fill();                                          // goldenes Papier
      c.fillStyle = "rgba(255,240,190,0.35)"; c.fillRect(x0 + 2, y0 + 3, Math.max(0, xe - x0 - 6), 2);
      klebe(x0 + 4, -0.35); klebe(x1 - 4, 0.3);
      raf(bild);
    }
    raf(bild);
  };

  LADE.zeigen = function (ziel) {
    ziel.innerHTML = '<div class="tresor tresor-laden"><div class="lade-herd" aria-hidden="true"><canvas class="lade-feuer" width="260" height="150"></canvas>' +
      '<img class="lade-pfanne" src="lader/pfanne.png" alt=""><div class="lade-wurf"><img class="lade-kuchen" src="lader/pfannkuchen.png" alt=""></div></div>' +
      '<p class="lade-text" role="status">Die Pfanne wird heiß …</p><canvas class="lade-balken" width="320" height="56" aria-hidden="true"></canvas></div>';
    LADE.feuer(ziel.querySelector(".lade-feuer"));
    LADE.balken(ziel.querySelector(".lade-balken"));
    var text = ziel.querySelector(".lade-text");
    return function (anteil) {
      LADE.setzen(0.08 + 0.92 * anteil);
      var t = anteil < 0.35 ? "Die Pfanne wird heiß …" : (anteil < 0.75 ? "Der Teig kommt hinein …" : "Gleich wird gewendet …");
      if (text.textContent !== t) text.textContent = t;
    };
  };

  var appGeladen = false;
  function appLaden() {
    if (appGeladen) return;
    appGeladen = true;
    // Offline-Speicher als "dauerhaft" erbitten: iOS gewährt das Home-Bildschirm-Apps und löscht die
    // gespeicherten Buchseiten, Aufnahmen und Bilder dann nicht mehr bei Platzmangel/Nichtbenutzung
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist()["catch"](function () {}); } catch (e) {}
    var fortschritt = LADE.zeigen(app);
    var i = 0;
    (function naechstes() {
      fortschritt(i / SKRIPTE.length);
      if (i >= SKRIPTE.length) return;
      var s = document.createElement("script");
      s.src = SKRIPTE[i++];
      s.onload = naechstes;
      s.onerror = function () {
        bildschirm("<img class='tresor-hoppla-bild' src='lader/hoppla.png' alt=''><h1>Hoppla</h1><p>Da hat etwas nicht geladen. Bitte einmal mit Internet öffnen.</p><button onclick='location.reload()'>Nochmal</button>", "tresor-hoppla");
      };
      document.body.appendChild(s);
    })();
  }

  // Geheimtür (Codex) nur, wenn in den Küchen-Einstellungen eingeschaltet – standardmäßig das ruhige Papier
  function tuerAn() { try { return !!(JSON.parse(localStorage.getItem("omsi.kueche.zauber") || "{}") || {}).hgTuer; } catch (e) { return false; } }
  function sperre(fehler) {
    bildschirm('<div class="tresor-schild">ZUGANG NUR FÜR 007<br><small>Genehmigung durch M</small></div>' +
      '<p>Bitte das Geheimwort eingeben:</p><input id="wort" type="password" autocomplete="off" autocapitalize="off">' +
      '<button id="auf">Öffnen</button>' + (fehler ? '<p class="tresor-fehler">Das war nicht das Geheimwort.</p>' : ""), tuerAn() ? "tresor-tuer" : "");
    var feld = document.getElementById("wort");
    var gesendet = false;                                   // Enter doppelt gedrückt → trotzdem nur EIN Ladevorgang
    function los() {
      if (gesendet) return;
      gesendet = true;
      document.getElementById("auf").disabled = true;
      ableiten(feld.value).then(function (roh) {
        try { localStorage.setItem("omsi.schluessel", roh); } catch (e) {}
        return schluesselAnWorker(roh).then(appLaden);
      })["catch"](function () { sperre(true); });
    }
    document.getElementById("auf").onclick = los;
    feld.onkeydown = function (e) { if (e.key === "Enter") los(); };
    feld.focus();
  }

  // Einrichtungs-Link geöffnet, während die Seite schon offen ist → neu starten
  window.addEventListener("hashchange", function () { if (/schluessel=/.test(location.hash)) location.reload(); });

  // Ohne Internet schlägt das (Neu-)Registrieren fehl, weil sw.js nicht geladen werden kann – der schon
  // installierte Worker hat aber alles gespeichert und übernimmt einfach weiter (sonst ginge offline nichts)
  navigator.serviceWorker.register("sw.js")["catch"](function (fehler) {
    if (navigator.serviceWorker.controller) return null;
    throw fehler;
  }).then(function () { return navigator.serviceWorker.ready; }).then(function () {
    // Beim allerersten Besuch steuert der Worker die Seite noch nicht → einmal neu laden
    if (!navigator.serviceWorker.controller) {
      if (!sessionStorage.getItem("omsi.neu")) { sessionStorage.setItem("omsi.neu", "1"); location.reload(); return; }
    }
    var m = /[#&]schluessel=([^&]+)/.exec(location.hash);
    if (m) {
      var wort = decodeURIComponent(m[1]);
      history.replaceState(null, "", location.pathname + location.search);   // Geheimwort nicht in der Adresszeile lassen
      return ableiten(wort).then(function (roh) {
        try { localStorage.setItem("omsi.schluessel", roh); } catch (e) {}
        return schluesselAnWorker(roh).then(appLaden);
      })["catch"](function () { sperre(true); });
    }
    var gemerkt = null;
    try { gemerkt = localStorage.getItem("omsi.schluessel"); } catch (e) {}
    if (gemerkt) return pruefen(gemerkt).then(function () { return schluesselAnWorker(gemerkt).then(appLaden); }, function () {
      try { localStorage.removeItem("omsi.schluessel"); } catch (e) {}
      sperre(false);
    });
    sperre(false);
  })["catch"](function (e) {
    bildschirm("<img class='tresor-hoppla-bild' src='lader/hoppla.png' alt=''><h1>Hoppla</h1><p>Der Offline-Speicher ließ sich nicht starten (" + (e && e.message) + ").</p>", "tresor-hoppla");
  });
})();
