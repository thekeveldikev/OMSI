/* Service Worker der veröffentlichten Fassung ("Tresor").
   Alles unter daten/, bilder/, audio/ liegt im Netz nur VERSCHLÜSSELT (…​.enc).
   Dieser Worker holt die verschlüsselte Datei, entschlüsselt sie auf dem iPad
   und reicht sie an die App weiter – als wäre nichts gewesen. Alles, was einmal
   geladen wurde, bleibt im Speicher (offline lesbar).
   Wird von Werkzeuge/veroeffentlichen.py als sw.js ins Veröffentlichungs-Verzeichnis kopiert. */
var VERSION = "omsi-20260927-161553";
var GESCHUETZT = /\/(daten|bilder|audio)\//;
var OEFFENTLICH = /\/bilder\/extras\/icon-[^/]+\.png$/;
var schluesselPromise = null;

var TYPEN = { js: "application/javascript; charset=utf-8", json: "application/json", jpg: "image/jpeg", jpeg: "image/jpeg",
  png: "image/png", webp: "image/webp", m4a: "audio/mp4", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", css: "text/css" };

// ── Schlüssel im Gerät aufbewahren (IndexedDB, damit er einen Neustart des Workers übersteht) ──
function db() {
  return new Promise(function (ok, fehler) {
    var r = indexedDB.open("omsi-tresor", 1);
    r.onupgradeneeded = function () { r.result.createObjectStore("s"); };
    r.onsuccess = function () { ok(r.result); };
    r.onerror = function () { fehler(r.error); };
  });
}
function merke(roh) {
  return db().then(function (d) { return new Promise(function (ok) { var t = d.transaction("s", "readwrite"); t.objectStore("s").put(roh, "schluessel"); t.oncomplete = ok; }); });
}
function lies() {
  return db().then(function (d) { return new Promise(function (ok) { var r = d.transaction("s").objectStore("s").get("schluessel"); r.onsuccess = function () { ok(r.result || null); }; r.onerror = function () { ok(null); }; }); });
}
function b64(s) { var bin = atob(s), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a.buffer; }
function schluessel() {
  if (!schluesselPromise) schluesselPromise = lies().then(function (roh) {
    if (!roh) { schluesselPromise = null; return null; }
    return crypto.subtle.importKey("raw", b64(roh), { name: "AES-GCM" }, false, ["decrypt"]);
  });
  return schluesselPromise;
}

self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (namen) {
    return Promise.all(namen.filter(function (n) { return n !== VERSION; }).map(function (n) { return caches["delete"](n); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("message", function (e) {
  if (!e.data || !e.data.schluessel) return;
  schluesselPromise = null;
  merke(e.data.schluessel).then(function () { if (e.ports && e.ports[0]) e.ports[0].postMessage("ok"); });
});

// verschlüsselte Datei: erst aus dem Speicher, sonst aus dem Netz (und merken)
function holeVerschluesselt(url) {
  return caches.open(VERSION).then(function (c) {
    return c.match(url).then(function (treffer) {
      if (treffer) return treffer;
      return fetch(url).then(function (antwort) {
        if (antwort.ok) c.put(url, antwort.clone());
        return antwort;
      });
    });
  });
}

function entschluesselt(anfrage) {
  var url = new URL(anfrage.url);
  var endung = (url.pathname.split(".").pop() || "").toLowerCase();
  return schluessel().then(function (k) {
    if (!k) return new Response("gesperrt", { status: 403 });
    var encUrl = url.origin + url.pathname + ".enc";
    function auf(antwort) {
      if (!antwort.ok) throw new Error("nicht da");
      return antwort.arrayBuffer().then(function (buf) {
        return crypto.subtle.decrypt({ name: "AES-GCM", iv: buf.slice(0, 12) }, k, buf.slice(12));
      });
    }
    return holeVerschluesselt(encUrl).then(function (antwort) {
      if (!antwort.ok) return new Response("nicht da", { status: 404 });
      // passt die gespeicherte Fassung nicht (mehr) zum Schlüssel – z. B. nach neuem Geheimwort –, einmal frisch aus dem Netz
      return auf(antwort)["catch"](function () {
        return caches.open(VERSION).then(function (c) { return c["delete"](encUrl); })
          .then(function () { return holeVerschluesselt(encUrl); }).then(auf);
      }).then(function (klar) {
        var typ = TYPEN[endung] || "application/octet-stream", ganz = klar.byteLength;
        var bereich = anfrage.headers.get("range");
        var m = /^bytes=(\d*)-(\d*)$/.exec(bereich || '');
        if (m && (m[1] || m[2])) {   // Safari spielt Ton nur mit "Teilstücken" (206) zuverlässig ab
          var von = m[1] ? parseInt(m[1], 10) : Math.max(0, ganz - parseInt(m[2], 10));
          var bis = m[1] && m[2] ? Math.min(parseInt(m[2], 10), ganz - 1) : ganz - 1;
          if (von > bis || von >= ganz) return new Response(null, { status: 416, headers: {
            "Content-Range": "bytes */" + ganz, "Content-Length": "0", "Accept-Ranges": "bytes" } });
          return new Response(klar.slice(von, bis + 1), { status: 206, headers: {
            "Content-Type": typ, "Content-Range": "bytes " + von + "-" + bis + "/" + ganz,
            "Content-Length": String(bis - von + 1), "Accept-Ranges": "bytes" } });
        }
        return new Response(klar, { status: 200, headers: { "Content-Type": typ, "Content-Length": String(ganz), "Accept-Ranges": "bytes" } });
      });
    });
  })["catch"](function () { return new Response("Fehler", { status: 500 }); });
}

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  if (GESCHUETZT.test(url.pathname) && !OEFFENTLICH.test(url.pathname) && !/\.enc$/.test(url.pathname)) {
    e.respondWith(entschluesselt(e.request));
    return;
  }
  // Programm-Dateien: Netz zuerst (damit Änderungen ankommen), sonst Speicher. Gibt es schon eine gespeicherte
  // Fassung, wird bei schwachem WLAN höchstens 4 s aufs Netz gewartet (sonst hinge der Start).
  e.respondWith(caches.match(e.request).then(function (gespeichert) {
    var netz = fetch(e.request).then(function (antwort) {
      if (antwort && antwort.ok) { var kopie = antwort.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, kopie); }); }
      return antwort;
    });
    if (!gespeichert) return netz["catch"](function () { return caches.match(e.request); });
    return Promise.race([netz.then(function (a) { return a && a.ok ? a : gespeichert; }, function () { return gespeichert; }),
                         new Promise(function (ok) { setTimeout(function () { ok(gespeichert); }, 4000); })]);
  }));
});
