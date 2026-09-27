/* Startet die veröffentlichte Fassung: Service Worker (entschlüsselt) → Geheimwort
   (aus dem Einrichtungs-Link #schluessel=… oder einmal eingeben) → App laden.
   Braucht iOS 11.3 oder neuer. */
(function () {
  var INFO = window.TRESOR_INFO;
  var SKRIPTE = INFO.skripte;
  var app = document.getElementById("app");

  function bildschirm(html) {
    app.innerHTML = '<div class="tresor"><div class="tresor-karte">' + html + "</div></div>";
  }
  function b64zuPuffer(s) { var bin = atob(s), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; }
  function pufferZuB64(buf) { var a = new Uint8Array(buf), s = ""; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }

  if (!("serviceWorker" in navigator) || !window.crypto || !crypto.subtle || !window.Promise) {
    bildschirm("<h1>Oh je!</h1><p>Dieses iPad ist leider zu alt für das Geschenk (nötig: iOS 11.3 oder neuer).</p>");
    return;
  }

  // Geheimwort → Schlüssel (PBKDF2) → prüfen
  function ableiten(wort) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(wort), { name: "PBKDF2" }, false, ["deriveKey"]).then(function (basis) {
      return crypto.subtle.deriveKey({ name: "PBKDF2", salt: b64zuPuffer(INFO.salz), iterations: INFO.runden, hash: "SHA-256" },
        basis, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
    }).then(function (k) {
      var p = b64zuPuffer(INFO.pruefung);
      return crypto.subtle.decrypt({ name: "AES-GCM", iv: p.slice(0, 12) }, k, p.slice(12)).then(function () {
        return crypto.subtle.exportKey("raw", k);
      });
    }).then(pufferZuB64);
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

  // Ladeanzeige im Stil des Buchs: Codex' Papier-Pfannkuchen fliegt aus der Collage-Pfanne und wird gewendet
  // (Bilder in lader/ – bewusst unverschlüsselt, weil sie VOR dem Entsperren gebraucht werden; nichts Privates)
  function appLaden() {
    var flammen = "";
    for (var f = 0; f < 5; f++) flammen += '<img class="lade-flamme lade-flamme-' + f + '" src="lader/flamme.png" alt="">';
    app.innerHTML = '<div class="tresor tresor-laden"><div class="lade-herd" aria-hidden="true">' + flammen +
      '<img class="lade-pfanne" src="lader/pfanne.png" alt=""><div class="lade-wurf"><img class="lade-kuchen" src="lader/pfannkuchen.png" alt=""></div></div>' +
      '<p class="lade-text" role="status">Die Pfanne wird heiß …</p><div class="lade-streifen"><i></i></div></div>';
    var text = app.querySelector(".lade-text"), balken = app.querySelector(".lade-streifen i");
    var i = 0;
    (function naechstes() {
      var anteil = i / SKRIPTE.length;
      balken.style.width = Math.round(8 + 92 * anteil) + "%";
      var t = anteil < 0.35 ? "Die Pfanne wird heiß …" : (anteil < 0.75 ? "Der Teig kommt hinein …" : "Gleich wird gewendet …");
      if (text.textContent !== t) text.textContent = t;
      if (i >= SKRIPTE.length) return;
      var s = document.createElement("script");
      s.src = SKRIPTE[i++];
      s.onload = naechstes;
      s.onerror = function () {
        bildschirm("<h1>Hoppla</h1><p>Da hat etwas nicht geladen. Bitte einmal mit Internet öffnen.</p><button onclick='location.reload()'>Nochmal</button>");
      };
      document.body.appendChild(s);
    })();
  }

  function sperre(fehler) {
    bildschirm('<div class="tresor-schild">ZUGANG NUR FÜR 007<br><small>Genehmigung durch M</small></div>' +
      '<p>Bitte das Geheimwort eingeben:</p><input id="wort" type="password" autocomplete="off" autocapitalize="off">' +
      '<button id="auf">Öffnen</button>' + (fehler ? '<p class="tresor-fehler">Das war nicht das Geheimwort.</p>' : ""));
    var feld = document.getElementById("wort");
    function los() {
      document.getElementById("auf").disabled = true;
      ableiten(feld.value.trim()).then(function (roh) {
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

  navigator.serviceWorker.register("sw.js").then(function () { return navigator.serviceWorker.ready; }).then(function () {
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
    if (gemerkt) return schluesselAnWorker(gemerkt).then(appLaden);
    sperre(false);
  })["catch"](function (e) {
    bildschirm("<h1>Hoppla</h1><p>Der Offline-Speicher ließ sich nicht starten (" + (e && e.message) + ").</p>");
  });
})();
