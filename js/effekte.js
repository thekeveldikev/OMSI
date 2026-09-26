/* Kleine Animationen ÜBER den Bildern, alle aus Seidenpapier-Schnipseln:
   Flammen, Rauch, Dampf, Mehlstaub, Vögel, Wasser, Noten, Sterne, Kerzen ...
   Koordinaten kommen relativ (0..1) und werden auf ein Rechteck umgerechnet. */
(function () {
  var F = window.EFFEKTE = {};
  var laufend = null;
  // Auslöser: manche Effekte zeigen sich nur kurz, wenn etwas passiert (z. B. Schallwellen beim Krähen)
  var ausgeloest = {};
  F.ausloesen = function (name) { ausgeloest[name] = B.jetzt(); };
  function seitAusloesung(name) { return ausgeloest[name] ? (B.jetzt() - ausgeloest[name]) / 1000 : Infinity; }

  // auftraege: [{eff: {typ, x, y, ...}, rechteck: {x, y, b, h} in CSS-Pixeln, bild: <img>?}]
  F.starten = function (canvas, auftraege, bild) {
    F.stoppen();
    ausgeloest = {};
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = canvas.width / dpr, H = canvas.height / dpr;
    var aktive = [];
    auftraege.forEach(function (a) {
      var fx = ERZEUGER[a.eff.typ];
      if (fx) aktive.push(fx(a.eff, a.rechteck, ctx, a.bild || bild));
    });
    if (!aktive.length) { ctx.clearRect(0, 0, W, H); return; }
    var t0 = B.jetzt(), letzte = t0;
    var zustand = { stop: false, id: 0 };
    function schritt() {
      if (zustand.stop) return;
      var jetzt = B.jetzt(), dt = Math.min(0.05, (jetzt - letzte) / 1000), t = (jetzt - t0) / 1000;
      letzte = jetzt;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < aktive.length; i++) aktive[i](ctx, t, dt);
      zustand.id = B.frame(schritt);
    }
    zustand.id = B.frame(schritt);
    laufend = { zustand: zustand, ctx: ctx, W: W, H: H };
  };

  F.stoppen = function () {
    if (!laufend) return;
    laufend.zustand.stop = true;
    B.frameStopp(laufend.zustand.id);
    laufend.ctx.clearRect(0, 0, laufend.W, laufend.H);
    laufend = null;
  };

  function px(r, x, y) { return { x: r.x + x * r.b, y: r.y + y * r.h }; }
  var Z = B.zufall;

  // ── Partikel-Grundgerüst ──
  function teilchenSystem(neu, rate, maxAnzahl, zeichne) {
    var liste = [], puffer = 0;
    return function (ctx, t, dt) {
      puffer += rate * dt;
      while (puffer > 1 && liste.length < maxAnzahl) { liste.push(neu(t)); puffer -= 1; }
      for (var i = liste.length - 1; i >= 0; i--) {
        var p = liste[i];
        p.alter += dt;
        if (p.alter > p.leben) { liste.splice(i, 1); continue; }
        zeichne(ctx, p, dt, t);
      }
    };
  }

  var ERZEUGER = {
    // Papierflammen, die flackern (über gemaltem Feuer)
    flammen: function (e, r) {
      var n = e.anzahl || 6, basis = px(r, e.x, e.y), breite = (e.breite || 0.3) * r.b;
      var fl = [];
      for (var i = 0; i < n; i++) fl.push({ x: basis.x - breite / 2 + breite * (i + 0.5) / n + Z(-6, 6), ph: Z(0, 6), s: Z(0.7, 1.2) });
      var hoehe = Math.min(r.h * 0.13, breite / n * 2.4);
      return function (ctx, t) {
        ctx.save();
        fl.forEach(function (f) {
          var fl1 = 0.75 + 0.25 * Math.sin(t * 9 + f.ph) + 0.1 * Math.sin(t * 23 + f.ph * 2);
          var h = hoehe * f.s * fl1, b = hoehe * 0.55 * f.s, neig = Math.sin(t * 5 + f.ph) * b * 0.4;
          ctx.globalAlpha = 0.9;
          PAPIER.flammenpfad(ctx, f.x, basis.y, b, h, neig); ctx.fillStyle = PAPIER.muster(ctx, "rot"); ctx.fill();
          PAPIER.flammenpfad(ctx, f.x, basis.y, b * 0.66, h * 0.72, neig * 0.8); ctx.fillStyle = PAPIER.muster(ctx, "orange"); ctx.fill();
          PAPIER.flammenpfad(ctx, f.x, basis.y, b * 0.34, h * 0.45, neig * 0.6); ctx.fillStyle = PAPIER.muster(ctx, "gelb"); ctx.fill();
        });
        ctx.restore();
      };
    },

    // Rauch aus dem Schornstein. e.links: zieht nach links; e.groesse: Faktor; e.sichtbar: [[x,y],…] –
    // nur innerhalb dieser Fläche zu sehen (so steigt er z. B. HINTER der Dachkante hervor)
    rauch: function (e, r) {
      var q = px(r, e.x, e.y), s = r.h * 0.05 * (e.groesse || 1), richtung = e.links ? -1 : 1;
      var teile = teilchenSystem(function () { return { x: q.x + Z(-s * 0.15, s * 0.15), y: q.y, vx: richtung * Z(4, 14) * (e.groesse || 1), vy: Z(-26, -16) * (e.groesse || 1),
                                                       r: s * Z(0.35, 0.55), alter: 0, leben: Z(3, 4.5), seed: B.ganz(1, 999) }; },
        e.rate || 1.4, 12, function (ctx, p, dt) {
          p.x += p.vx * dt; p.y += p.vy * dt; p.r += s * 0.38 * dt;
          var a = p.alter / p.leben;
          ctx.save(); ctx.globalAlpha = 0.55 * Math.min(1, a * 5) * (1 - a);
          PAPIER.risspfad(ctx, p.x, p.y, p.r * 1.2, p.r, 10, p.seed);
          ctx.fillStyle = PAPIER.muster(ctx, "#b8c4d6"); ctx.fill(); ctx.restore();
        });
      if (!e.sichtbar) return teile;
      return function (ctx, t, dt) {
        ctx.save(); ctx.beginPath();
        e.sichtbar.forEach(function (pt, i) { var z = px(r, pt[0], pt[1]); if (i) ctx.lineTo(z.x, z.y); else ctx.moveTo(z.x, z.y); });
        ctx.closePath(); ctx.clip();
        teile(ctx, t, dt);
        ctx.restore();
      };
    },

    // Schlafen: kleine Papier-"Z", die aus dem Kissen aufsteigen und verblassen
    zzz: function (e, r) {
      var q = px(r, e.x, e.y), s = r.h * 0.022, richtung = e.links ? -1 : 1;
      return teilchenSystem(function () { return { x: q.x, y: q.y, alter: 0, leben: 4.2, ph: Z(0, 6), g: Z(0.8, 1.25) }; },
        e.rate || 0.55, 5, function (ctx, p, dt, t) {
          var a = p.alter / p.leben, k = s * p.g * (0.55 + a * 0.9);
          var x = p.x + richtung * a * s * 5 + Math.sin(t * 1.6 + p.ph) * s * 0.6, y = p.y - a * s * 7;
          ctx.save(); ctx.translate(x, y); ctx.rotate(-0.25 * richtung + Math.sin(t + p.ph) * 0.12);
          ctx.globalAlpha = Math.sin(Math.PI * a) * 0.9;
          ctx.strokeStyle = PAPIER.muster(ctx, e.farbe || "tiefblau"); ctx.lineWidth = k * 0.28; ctx.lineJoin = "round"; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(-k * 0.5, -k * 0.5); ctx.lineTo(k * 0.5, -k * 0.5); ctx.lineTo(-k * 0.5, k * 0.5); ctx.lineTo(k * 0.5, k * 0.5); ctx.stroke();
          ctx.restore();
        });
    },

    dampf: function (e, r) {
      var q = px(r, e.x, e.y), s = r.h * 0.03;
      return teilchenSystem(function () { return { x: q.x + Z(-s * 2, s * 2), y: q.y, alter: 0, leben: Z(2, 3), ph: Z(0, 6), r: s * Z(0.5, 1) }; },
        2.2, 10, function (ctx, p, dt, t) {
          p.y -= s * 1.6 * dt * 10;
          var x = p.x + Math.sin(t * 2 + p.ph) * s;
          ctx.save(); ctx.globalAlpha = 0.45 * Math.sin(Math.PI * p.alter / p.leben);
          ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.lineWidth = p.r; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(x, p.y); ctx.quadraticCurveTo(x + s * 1.5, p.y - s * 2, x, p.y - s * 4); ctx.stroke();
          ctx.restore();
        });
    },

    mehlstaub: function (e, r) {
      var q = px(r, e.x, e.y), breite = (e.breite || 0.3) * r.b, stark = !!e.stark;
      var sys = teilchenSystem(function () {
        return { x: q.x + Z(-breite / 2, breite / 2), y: q.y + Z(-breite / 4, breite / 4), vx: Z(-10, 10), vy: Z(-12, 4), r: Z(1, 3.5), alter: 0, leben: Z(2, 4) };
      }, stark ? 30 : 10, stark ? 120 : 40, function (ctx, p, dt) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 3 * dt;
        ctx.globalAlpha = 0.7 * (1 - p.alter / p.leben);
        ctx.fillStyle = "#fffdf6"; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });
      if (!stark) return sys;
      // einmaliger großer Puff am Anfang
      var wolke = [];
      for (var i = 0; i < 26; i++) wolke.push({ a: Z(0, Math.PI * 2), v: Z(40, 160), r: Z(10, 34), seed: B.ganz(1, 999) });
      return function (ctx, t, dt) {
        if (t < 2.2) {
          ctx.save();
          wolke.forEach(function (w) {
            var d = w.v * (1 - Math.exp(-t * 2.2));
            ctx.globalAlpha = 0.85 * Math.max(0, 1 - t / 2.2);
            PAPIER.risspfad(ctx, q.x + Math.cos(w.a) * d, q.y + Math.sin(w.a) * d * 0.7, w.r * (1 + t), w.r * 0.8 * (1 + t), 9, w.seed);
            ctx.fillStyle = PAPIER.muster(ctx, "weiss"); ctx.fill();
          });
          ctx.restore();
        }
        sys(ctx, t, dt);
      };
    },

    spreu: function (e, r) {
      var q = px(r, e.x, e.y), breite = (e.breite || 0.4) * r.b;
      return teilchenSystem(function () { return { x: q.x + Z(-breite / 2, breite / 2), y: q.y, vx: Z(-20, 20), vy: Z(-60, -30), rot: Z(0, 6), vr: Z(-4, 4), alter: 0, leben: Z(1.5, 2.5), f: Math.random() < 0.5 ? "ocker" : "gelb" }; },
        8, 30, function (ctx, p, dt) {
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 50 * dt; p.rot += p.vr * dt;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = 1 - p.alter / p.leben;
          ctx.fillStyle = PAPIER.muster(ctx, p.f); ctx.fillRect(-4, -1.5, 8, 3); ctx.restore();
        });
    },

    koerner: function (e, r) {
      var q = px(r, e.x, e.y);
      return teilchenSystem(function () { return { x: q.x, y: q.y, vx: Z(10, 45), vy: Z(-20, 10), alter: 0, leben: 1.6 }; },
        9, 20, function (ctx, p, dt) {
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt;
          ctx.save(); ctx.globalAlpha = 1 - p.alter / p.leben; ctx.fillStyle = PAPIER.muster(ctx, "gold");
          ctx.beginPath(); ctx.ellipse ? ctx.ellipse(p.x, p.y, 3, 2, p.vx, 0, Math.PI * 2) : ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        });
    },

    wasser: function (e, r) {
      var q = px(r, e.x, e.y), breite = (e.breite || 0.2) * r.b;
      return teilchenSystem(function () { return { x: q.x + Z(-breite / 2, breite / 2), y: q.y, vx: Z(-25, 25), vy: Z(-70, -20), alter: 0, leben: Z(0.7, 1.3), f: Math.random() < 0.6 ? "hellblau" : "weiss" }; },
        22, 40, function (ctx, p, dt) {
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 160 * dt;
          ctx.save(); ctx.globalAlpha = 0.9 * (1 - p.alter / p.leben); ctx.fillStyle = PAPIER.muster(ctx, p.f);
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        });
    },

    voegel: function (e, r) {
      var anzahl = e.anzahl || 2, y0 = r.y + (e.y || 0.3) * r.h, s = r.h * 0.03;
      var v = [];
      for (var i = 0; i < anzahl; i++) v.push({ x: r.x - Z(20, 300), y: y0 + Z(-r.h * 0.08, r.h * 0.08), vx: Z(40, 70), ph: Z(0, 6) });
      return function (ctx, t, dt) {
        v.forEach(function (b) {
          b.x += b.vx * dt; if (b.x > r.x + r.b * 2.1) b.x = r.x - Z(40, 200);
          var y = b.y + Math.sin(t * 2 + b.ph) * s, schlag = Math.sin(t * 12 + b.ph);
          ctx.save(); ctx.translate(b.x, y);
          ctx.fillStyle = PAPIER.muster(ctx, "braun");
          ctx.beginPath(); ctx.ellipse ? ctx.ellipse(0, 0, s, s * 0.45, 0, 0, Math.PI * 2) : ctx.arc(0, 0, s * 0.6, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-s * 0.3, 0); ctx.lineTo(s * 0.2, -s * 1.3 * schlag); ctx.lineTo(s * 0.5, 0); ctx.closePath(); ctx.fill();
          ctx.fillStyle = PAPIER.muster(ctx, "orange"); ctx.beginPath(); ctx.moveTo(s, -s * 0.1); ctx.lineTo(s * 1.4, 0); ctx.lineTo(s, s * 0.12); ctx.fill();
          ctx.restore();
        });
      };
    },

    sonnenschein: function (e, r) {
      var q = px(r, e.x, e.y), rad = (e.r || 0.2) * r.b;
      return function (ctx, t) {
        var puls = 0.5 + 0.5 * Math.sin(t * 1.3);
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        var g = ctx.createRadialGradient(q.x, q.y, rad * 0.2, q.x, q.y, rad * (1.2 + puls * 0.15));
        g.addColorStop(0, "rgba(255,220,120," + (0.16 + puls * 0.08) + ")"); g.addColorStop(1, "rgba(255,220,120,0)");
        ctx.fillStyle = g; ctx.fillRect(q.x - rad * 1.5, q.y - rad * 1.5, rad * 3, rad * 3);
        ctx.restore();
      };
    },

    herzen: function (e, r) {
      var q = px(r, e.x, e.y), s = r.h * 0.022;
      return teilchenSystem(function () { return { x: q.x + Z(-s * 6, s * 6), y: q.y, alter: 0, leben: 2.6, ph: Z(0, 6), g: Z(0.7, 1.3) }; },
        1.4, 6, function (ctx, p, dt, t) {
          p.y -= 22 * dt;
          var x = p.x + Math.sin(t * 2 + p.ph) * 8, k = s * p.g;
          ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * p.alter / p.leben); ctx.translate(x, p.y);
          ctx.fillStyle = PAPIER.muster(ctx, "rot");
          ctx.beginPath(); ctx.moveTo(0, k * 0.9);
          ctx.bezierCurveTo(-k * 1.6, -k * 0.2, -k * 0.7, -k * 1.3, 0, -k * 0.45);
          ctx.bezierCurveTo(k * 0.7, -k * 1.3, k * 1.6, -k * 0.2, 0, k * 0.9); ctx.fill(); ctx.restore();
        });
    },

    noten: function (e, r) {
      var q = px(r, e.x, e.y), s = r.h * 0.03, farben = ["rot", "gelb", "blau", "gruen", "orange", "lila"];
      return teilchenSystem(function () { return { x: q.x + Z(-s * 5, s * 5), y: q.y + Z(-s, s), vx: Z(-15, 15), alter: 0, leben: 3, f: farben[B.ganz(0, 5)], rot: Z(-0.4, 0.4), doppel: Math.random() < 0.4 }; },
        2.2, 10, function (ctx, p, dt, t) {
          p.y -= 26 * dt; p.x += p.vx * dt;
          ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * p.alter / p.leben); ctx.translate(p.x, p.y); ctx.rotate(p.rot + Math.sin(t * 3) * 0.15);
          ctx.fillStyle = PAPIER.muster(ctx, p.f);
          ctx.beginPath(); ctx.ellipse ? ctx.ellipse(0, 0, s * 0.55, s * 0.4, -0.4, 0, Math.PI * 2) : ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2); ctx.fill();
          ctx.fillRect(s * 0.4, -s * 1.8, s * 0.16, s * 1.8);
          if (p.doppel) { ctx.fillRect(s * 0.4, -s * 1.8, s * 1.3, s * 0.3); ctx.beginPath(); ctx.ellipse ? ctx.ellipse(s * 1.3, 0, s * 0.55, s * 0.4, -0.4, 0, Math.PI * 2) : 0; ctx.fill(); ctx.fillRect(s * 1.7, -s * 1.8, s * 0.16, s * 1.8); }
          else { ctx.beginPath(); ctx.moveTo(s * 0.56, -s * 1.8); ctx.quadraticCurveTo(s * 1.2, -s * 1.3, s * 1.0, -s * 0.7); ctx.lineTo(s * 0.56, -s * 1.3); ctx.fill(); }
          ctx.restore();
        });
    },

    sterne: function (e, r) {
      var q = px(r, e.x, e.y), s = r.h * 0.03, farben = ["gelb", "orange", "rot", "gold"];
      return teilchenSystem(function () { var a = Z(0, Math.PI * 2), d = Z(s * 2, s * 8); return { x: q.x + Math.cos(a) * d, y: q.y + Math.sin(a) * d * 0.7, alter: 0, leben: 1.4, f: farben[B.ganz(0, 3)], g: Z(0.6, 1.2) }; },
        4, 10, function (ctx, p) {
          var k = s * p.g * Math.sin(Math.PI * p.alter / p.leben);
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.alter * 2); ctx.fillStyle = PAPIER.muster(ctx, p.f);
          ctx.beginPath();
          for (var i = 0; i < 10; i++) { var a = i * Math.PI / 5, rr = i % 2 ? k * 0.45 : k; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
          ctx.closePath(); ctx.fill(); ctx.restore();
        });
    },

    kerze: function (e, r) {
      var q = px(r, e.x, e.y), h = r.h * (e.hoehe || 0.045);
      return function (ctx, t) {
        var f = 0.85 + 0.15 * Math.sin(t * 13) + 0.06 * Math.sin(t * 31);
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        var g = ctx.createRadialGradient(q.x, q.y - h * 0.5, 1, q.x, q.y - h * 0.5, h * 2.2 * (0.95 + 0.05 * f));
        g.addColorStop(0, "rgba(255,200,90," + (0.3 + 0.06 * f).toFixed(3) + ")"); g.addColorStop(1, "rgba(255,200,90,0)");
        ctx.fillStyle = g; ctx.fillRect(q.x - h * 2.5, q.y - h * 3, h * 5, h * 5); ctx.restore();
        if (e.nurLicht) return;
        PAPIER.flammenpfad(ctx, q.x, q.y, h * 0.5, h * f, Math.sin(t * 4) * h * 0.12); ctx.fillStyle = PAPIER.muster(ctx, "orange"); ctx.fill();
        PAPIER.flammenpfad(ctx, q.x, q.y, h * 0.26, h * 0.6 * f, 0); ctx.fillStyle = PAPIER.muster(ctx, "gelb"); ctx.fill();
      };
    },

    gluehbirne: function (e, r) {
      var q = px(r, e.x, e.y), rad = r.h * 0.3;
      return function (ctx, t) {
        var flacker = Math.random() < 0.03 ? 0.3 : 1, puls = (0.8 + 0.2 * Math.sin(t * 3)) * flacker;
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        var g = ctx.createRadialGradient(q.x, q.y, 2, q.x, q.y, rad);
        g.addColorStop(0, "rgba(255,230,150," + 0.3 * puls + ")"); g.addColorStop(1, "rgba(255,230,150,0)");
        ctx.fillStyle = g; ctx.fillRect(q.x - rad, q.y - rad, rad * 2, rad * 2); ctx.restore();
      };
    },

    kuehlschranklicht: function (e, r) {
      var q = px(r, e.x, e.y), rad = r.h * 0.35;
      return function (ctx, t) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        var g = ctx.createRadialGradient(q.x, q.y, 4, q.x, q.y, rad);
        g.addColorStop(0, "rgba(255,240,170," + (0.18 + 0.05 * Math.sin(t * 2)) + ")"); g.addColorStop(1, "rgba(255,240,170,0)");
        ctx.fillStyle = g; ctx.fillRect(q.x - rad, q.y - rad, rad * 2, rad * 2); ctx.restore();
      };
    },

    ruehren: function (e, r) {
      var mx = r.x + e.ex * r.b, my = r.y + e.ey * r.h, rx = e.erx * r.b, ry = e.ery * r.h;
      var schlieren = [];
      for (var i = 0; i < 7; i++) schlieren.push({ k: 0.25 + 0.1 * i, ph: i * 2.3, laenge: B.zufall(0.7, 1.4), hell: i % 2 === 0 });
      return function (ctx, t) {
        ctx.save();
        ctx.beginPath(); ctx.ellipse(mx, my, rx * 0.97, ry * 0.9, 0, 0, Math.PI * 2); ctx.clip();
        ctx.lineCap = "round";
        schlieren.forEach(function (sl) {
          var a0 = sl.ph + t * (e.tempo || 2.2) * (1.15 - sl.k * 0.5), n = 14;
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = sl.hell ? "rgba(255,252,225,0.9)" : "rgba(214,160,40,0.55)";
          ctx.lineWidth = Math.max(1.5, ry * (sl.hell ? 0.09 : 0.06));
          ctx.beginPath();
          for (var j = 0; j <= n; j++) {
            var a = a0 + sl.laenge * j / n, k = sl.k * (1 + 0.08 * Math.sin(j * 0.9 + t));
            var x = mx + Math.cos(a) * rx * k, y = my + Math.sin(a) * ry * k;
            if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.stroke();
        });
        ctx.restore();
      };
    },

    vogelsingt: function (e, r) { return ERZEUGER.noten({ x: e.x, y: e.y }, r); },

    // Schmetterlinge aus Seidenpapier, die über die Seite gaukeln
    schmetterlinge: function (e, r) {
      var n = e.anzahl || 3, s = r.h * 0.022, farben = ["gelb", "rot", "blau", "orange", "rosa", "lila"];
      var f = [];
      for (var i = 0; i < n; i++) f.push({ ph: Z(0, 6), sp: Z(0.18, 0.32), f1: farben[B.ganz(0, 5)], f2: farben[B.ganz(0, 5)], hoehe: (e.y || 0.5) + Z(-0.12, 0.12) });
      return function (ctx, t) {
        f.forEach(function (b) {
          var u = (t * b.sp + b.ph) % 1.4 - 0.2;
          var x = r.x + u * r.b, y = r.y + (b.hoehe + Math.sin(t * 1.7 + b.ph) * 0.06 + Math.sin(t * 5 + b.ph) * 0.01) * r.h;
          var schlag = Math.abs(Math.sin(t * 11 + b.ph));
          ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2 + b.ph) * 0.3);
          ctx.fillStyle = PAPIER.muster(ctx, b.f1);
          ctx.beginPath(); ctx.ellipse(-s * 0.55 * schlag, -s * 0.3, s * 0.7 * schlag + 0.5, s * 0.55, -0.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(s * 0.55 * schlag, -s * 0.3, s * 0.7 * schlag + 0.5, s * 0.55, 0.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = PAPIER.muster(ctx, b.f2);
          ctx.beginPath(); ctx.ellipse(-s * 0.4 * schlag, s * 0.35, s * 0.45 * schlag + 0.5, s * 0.35, 0.4, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.ellipse(s * 0.4 * schlag, s * 0.35, s * 0.45 * schlag + 0.5, s * 0.35, -0.4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#2a2622"; ctx.fillRect(-s * 0.08, -s * 0.6, s * 0.16, s * 1.2);
          ctx.restore();
        });
      };
    },

    // Glitzern (z. B. auf Marmeladengläsern, Sonne, Pfanne)
    funkeln: function (e, r) {
      var q = px(r, e.x, e.y), weite = (e.breite || 0.2) * r.b, s = r.h * 0.016;
      return teilchenSystem(function () { return { x: q.x + Z(-weite / 2, weite / 2), y: q.y + Z(-weite / 3, weite / 3), alter: 0, leben: Z(0.6, 1.2), g: Z(0.6, 1.3) }; },
        e.rate || 5, 12, function (ctx, p) {
          var k = s * p.g * Math.sin(Math.PI * p.alter / p.leben);
          ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = 0.95; ctx.fillStyle = "#fffbe8";
          ctx.beginPath(); ctx.moveTo(0, -k * 2); ctx.lineTo(k * 0.35, -k * 0.35); ctx.lineTo(k * 2, 0); ctx.lineTo(k * 0.35, k * 0.35);
          ctx.lineTo(0, k * 2); ctx.lineTo(-k * 0.35, k * 0.35); ctx.lineTo(-k * 2, 0); ctx.lineTo(-k * 0.35, -k * 0.35); ctx.closePath(); ctx.fill(); ctx.restore();
        });
    },

    // Schallbögen (Kikeriki!)
    // Schallwellen. Mit e.ausloeser nur, solange der Ton läuft (EFFEKTE.ausloesen(name)), sonst dauernd.
    schall: function (e, r) {
      var q = px(r, e.x, e.y), s = r.h * 0.05, winkel = e.winkel || -0.4;
      return function (ctx, t) {
        var zeit = t, blende = 1;
        if (e.ausloeser) {
          zeit = seitAusloesung(e.ausloeser);
          var dauer = e.dauer || 2.4;
          if (zeit > dauer) return;
          blende = Math.min(1, zeit / 0.15, (dauer - zeit) / 0.5);
        }
        ctx.save(); ctx.lineCap = "round";
        for (var i = 0; i < 3; i++) {
          var phase = zeit * 0.9 - i * 0.28;
          if (e.ausloeser && phase < 0) continue;
          var u = e.ausloeser ? phase % 1 : ((t * 0.8 + i / 3) % 1);
          ctx.globalAlpha = 0.9 * (1 - u) * blende; ctx.strokeStyle = PAPIER.muster(ctx, ["rot", "orange", "gelb"][i]); ctx.lineWidth = s * 0.18;
          ctx.beginPath(); ctx.arc(q.x, q.y, s * (0.6 + u * 2.2), winkel - 0.6, winkel + 0.6); ctx.stroke();
        }
        ctx.restore();
      };
    },

    // eine Fliege, die um etwas herumbrummt
    fliege: function (e, r) {
      var q = px(r, e.x, e.y), rad = r.h * 0.05;
      return function (ctx, t) {
        var x = q.x + Math.cos(t * 2.3) * rad + Math.sin(t * 7.1) * rad * 0.3, y = q.y + Math.sin(t * 3.1) * rad * 0.6 + Math.cos(t * 5.3) * rad * 0.2;
        ctx.save(); ctx.translate(x, y);
        ctx.fillStyle = "rgba(220,235,255,0.7)"; var fl = Math.abs(Math.sin(t * 40)) * 3 + 2;
        ctx.beginPath(); ctx.ellipse(-2, -3, fl, 2, -0.6, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(2, -3, fl, 2, 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#1e1b18"; ctx.beginPath(); ctx.ellipse(0, 0, 3.2, 2.2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      };
    },

    // Funken über dem Feuer
    funken: function (e, r) {
      var q = px(r, e.x, e.y), breite = (e.breite || 0.2) * r.b;
      return teilchenSystem(function () { return { x: q.x + Z(-breite / 2, breite / 2), y: q.y, vx: Z(-15, 15), vy: Z(-70, -35), alter: 0, leben: Z(0.6, 1.3), f: Math.random() < 0.5 ? "gelb" : "orange" }; },
        e.rate || 10, 26, function (ctx, p, dt, t) {
          p.x += (p.vx + Math.sin(t * 9 + p.leben * 10) * 20) * dt; p.y += p.vy * dt;
          ctx.save(); ctx.globalAlpha = 1 - p.alter / p.leben; ctx.fillStyle = PAPIER.muster(ctx, p.f);
          ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3); ctx.restore();
        });
    },

    // schwebender Staub im Lichtschein (Keller, Mühle)
    staub: function (e, r) {
      var q = px(r, e.x, e.y), weite = (e.breite || 0.4) * r.b;
      if (e.hoehe) weite = Math.max(weite, e.hoehe * r.h);
      var teile = [];
      for (var i = 0; i < 26; i++) teile.push({ x: Z(-0.5, 0.5), y: Z(-0.5, 0.5), ph: Z(0, 6), g: Z(1, 2.6) });
      return function (ctx, t) {
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        teile.forEach(function (p) {
          var x = q.x + (p.x + Math.sin(t * 0.3 + p.ph) * 0.08) * weite, y = q.y + (p.y + Math.cos(t * 0.23 + p.ph) * 0.08 - ((t * 0.02 + p.ph) % 1) * 0.1) * weite;
          ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 1.5 + p.ph); ctx.fillStyle = "#ffe9a8";
          ctx.beginPath(); ctx.arc(x, y, p.g, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
      };
    },

    // Spritzer (Sahne, Milch)
    spritzer: function (e, r) {
      var q = px(r, e.x, e.y);
      return teilchenSystem(function () { return { x: q.x + Z(-8, 8), y: q.y, vx: Z(-40, 40), vy: Z(-90, -40), alter: 0, leben: 0.9 }; },
        e.rate || 7, 16, function (ctx, p, dt) {
          p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt;
          ctx.save(); ctx.globalAlpha = 1 - p.alter / p.leben; ctx.fillStyle = PAPIER.muster(ctx, "creme");
          ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        });
    },

    // fallende Blätter
    blaetter: function (e, r) {
      var q = px(r, e.x, e.y), breite = (e.breite || 0.3) * r.b, s = r.h * 0.018, farben = ["gruen", "hellgruen", "gelb", "orange"];
      return teilchenSystem(function () { return { x: q.x + Z(-breite / 2, breite / 2), y: q.y, alter: 0, leben: Z(3, 5), ph: Z(0, 6), f: farben[B.ganz(0, 3)], dreh: Z(0, 6) }; },
        e.rate || 0.8, 6, function (ctx, p, dt, t) {
          p.y += r.h * 0.06 * dt; p.dreh += dt * 2;
          var x = p.x + Math.sin(t * 1.8 + p.ph) * s * 3;
          ctx.save(); ctx.translate(x, p.y); ctx.rotate(p.dreh); ctx.globalAlpha = Math.min(1, (p.leben - p.alter)); ctx.fillStyle = PAPIER.muster(ctx, p.f);
          ctx.beginPath(); ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.8, 0, 0, s); ctx.quadraticCurveTo(-s * 0.8, 0, 0, -s); ctx.fill(); ctx.restore();
        });
    },

    // Carles EIGENE Pinselstriche bewegen: ein Bildbereich wird zeilenweise sanft verschoben.
    //   art "wind"    – Weizen, Gras, Baumkronen wiegen sich (unten fest, oben am stärksten)
    //   art "flammen" – gemalte Flammen züngeln (schnell, unruhig)
    //   art "wasser"  – Wasser schimmert/fließt (braucht meist eine Maske: nur das Wasser bewegt sich)
    //   art "fallen"  – Wasserfall: Wellen laufen nach unten; gischt: Zahl heller Striche, die mitfallen
    // e: { x, y, b, h (Bereich relativ zur Seite), staerke, tempo, anker: "unten"|"oben", maske, weich }
    // Der bewegte Ausschnitt läuft zu den Rändern hin weich aus (weich = Anteil der kürzeren Seite),
    // darunter liegt das ruhende Bild – so gibt es nirgends eine sichtbare Kante.
    wellen: function (e, r, ctx, bild) {
      var art = e.art || "wind", maskeBild = null;
      var puffer = document.createElement("canvas"), deckel = document.createElement("canvas"), deckelFuer = "";
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      if (e.maske) { maskeBild = new Image(); maskeBild.src = e.maske; }
      function deckelBauen(w, h, dw, dh) {    // Maske (falls da) × weicher Rahmen, einmal je Größe
        deckel.width = w; deckel.height = h;
        var m = deckel.getContext("2d"), f = Math.max(4, (e.weich || 0.14) * Math.min(dw, dh)) * dpr;
        var fx = Math.min(0.45, f / w), fy = Math.min(0.45, f / h);
        function verlauf(x1, y1, a) {
          var g = m.createLinearGradient(0, 0, x1, y1);
          g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(a, "#000"); g.addColorStop(1 - a, "#000"); g.addColorStop(1, "rgba(0,0,0,0)");
          return g;
        }
        if (maskeBild) m.drawImage(maskeBild, 0, 0, w, h); else { m.fillStyle = "#000"; m.fillRect(0, 0, w, h); }
        m.globalCompositeOperation = "destination-in";
        m.fillStyle = verlauf(w, 0, fx); m.fillRect(0, 0, w, h);
        m.globalCompositeOperation = "destination-in";
        m.fillStyle = verlauf(0, h, fy); m.fillRect(0, 0, w, h);
        m.globalCompositeOperation = "source-over";
      }
      // Gischt: helle Striche, die mit dem Wasser ziehen – landen nur dort, wo die Maske Wasser sagt
      var gischt = [], letztesT = null;
      function gischtZeichnen(z, dw, dh, t) {
        var dt = letztesT === null ? 0 : Math.min(0.1, t - letztesT); letztesT = t;
        var zahl = e.gischt === true ? 24 : e.gischt, richtung = e.gischtRichtung || "unten";
        while (gischt.length < zahl) gischt.push({ u: Math.random(), v: Math.random(), tempo: B.zufall(0.35, 0.7), laenge: B.zufall(0.04, 0.1), dicke: B.zufall(1.2, 2.6), hell: B.zufall(0.3, 0.65) });
        z.save(); z.lineCap = "round";
        gischt.forEach(function (g) {
          g.v += g.tempo * dt * (e.tempo || 1);
          if (g.v > 1.1) { g.v = -0.1; g.u = Math.random(); }
          var x, y, x2, y2;
          if (richtung === "rechts") { x = g.v * dw; y = g.u * dh; x2 = x - g.laenge * dw; y2 = y; }
          else { x = g.u * dw + Math.sin(t * 3 + g.u * 20) * 2; y = g.v * dh; x2 = x; y2 = y - g.laenge * dh; }
          z.strokeStyle = "rgba(255,255,255," + g.hell.toFixed(2) + ")"; z.lineWidth = g.dicke;
          z.beginPath(); z.moveTo(x2, y2); z.lineTo(x, y); z.stroke();
        });
        z.restore();
      }
      return function (ctx2, t) {
        if (!bild || !bild.complete || !bild.naturalWidth) return;
        if (maskeBild && !(maskeBild.complete && maskeBild.naturalWidth)) return;
        var iw = bild.naturalWidth, ih = bild.naturalHeight;
        var sx = e.x * iw, sy = e.y * ih, sw = e.b * iw, sh = e.h * ih;
        var dx = r.x + e.x * r.b, dy = r.y + e.y * r.h, dw = e.b * r.b, dh = e.h * r.h;
        var amp = (e.staerke || 0.006) * r.b, randQ = Math.ceil(amp * iw / r.b) + 2, randZ = randQ * r.b / iw;
        var w = Math.ceil(dw * dpr), h = Math.ceil(dh * dpr);
        if (puffer.width !== w || puffer.height !== h) { puffer.width = w; puffer.height = h; }
        if (deckelFuer !== w + "x" + h) { deckelBauen(w, h, dw, dh); deckelFuer = w + "x" + h; }
        var ziel = puffer.getContext("2d");
        ziel.setTransform(1, 0, 0, 1, 0, 0); ziel.clearRect(0, 0, w, h); ziel.setTransform(dpr, 0, 0, dpr, 0, 0);
        var tempo = e.tempo || 1;
        var band = Math.max(2, Math.round(dh / (art === "fallen" ? 140 : art === "wasser" ? 70 : 95)));
        var welle = 2 * Math.PI / (dh * 0.13);          // "fallen": Wellenlänge 13 % der Höhe
        for (var y = 0; y < dh; y += band) {
          var rel = y / dh, gewicht = e.anker === "oben" ? rel : 1 - rel;
          if (art !== "wasser" && art !== "fallen") gewicht = Math.pow(gewicht, e.kurve || 1.4);
          var v, fall = 0;
          if (art === "flammen") v = (Math.sin(t * 7 * tempo + rel * 9) * 0.6 + Math.sin(t * 13 * tempo + rel * 21) * 0.4) * amp * gewicht;
          else if (art === "wasser") v = (Math.sin(t * 3.2 * tempo + y * 0.21) * 0.7 + Math.sin(t * 5.3 * tempo - y * 0.07) * 0.3) * amp;
          else if (art === "fallen") {             // Wellen laufen nach UNTEN durchs Wasser, dazu leichtes Flirren
            fall = (Math.sin(y * welle - t * 5.5 * tempo) * 0.75 + Math.sin(y * welle * 2.3 - t * 8.7 * tempo) * 0.25) * amp * 1.8;
            v = Math.sin(t * 4.1 * tempo + y * 0.23) * amp * 0.35;
          }
          else v = (Math.sin(t * 1.3 * tempo + rel * 5) * 0.65 + Math.sin(t * 0.47 * tempo + rel * 1.7) * 0.35) * amp * gewicht;
          var qy = sy + (y - fall) / dh * sh, qh = band / dh * sh;
          ziel.drawImage(bild, sx - randQ, qy, sw + 2 * randQ, qh + 0.6, -randZ + v, y, dw + 2 * randZ, band + 0.6);
        }
        if (e.gischt) gischtZeichnen(ziel, dw, dh, t);
        ziel.setTransform(1, 0, 0, 1, 0, 0);
        ziel.globalCompositeOperation = "destination-in";
        ziel.drawImage(deckel, 0, 0);
        ziel.globalCompositeOperation = "source-over";
        ctx2.drawImage(puffer, dx, dy, dw, dh);
      };
    },

    // Ein gemaltes Rad dreht sich wirklich: das Speichenfeld (Ellipse) rotiert perspektivisch richtig
    // um die Nabe; was davor liegt (Achse, Nabe) bleibt stehen ("aus"), die Ränder laufen weich aus.
    // e: { cx, cy (Nabe), ex, ey, erx, ery (Ellipse des Speichenfelds), aus: [{ ellipse | rechteck }], dauer (s je Umdrehung), richtung }
    drehrad: function (e, r, ctx, bild) {
      var puffer = document.createElement("canvas"), deckel = document.createElement("canvas"), deckelFuer = "";
      var scheibe = null;                      // e.bild: saubere Speichenscheibe (Werkzeuge/rad_vorbereiten.py)
      if (e.bild) { scheibe = new Image(); scheibe.src = e.bild.pfad; }
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      function form(m, f, versatz) {           // f: Form in Seiten-Pixeln, um "versatz" nach links verschoben (für den Schatten-Trick)
        m.beginPath();
        if (f.rx) { m.save(); m.translate(f.cx * r.b - versatz, f.cy * r.h); m.scale(f.rx * r.b, f.ry * r.h); m.arc(0, 0, 1, 0, Math.PI * 2); m.restore(); }
        else m.rect(f.x * r.b - versatz, f.y * r.h, f.b * r.b, f.h * r.h);
        m.fill();
      }
      function deckelBauen(w, h, bx, by) {
        deckel.width = w; deckel.height = h;
        var m = deckel.getContext("2d"), weit = 10000, weich = (e.weich || 0.012) * r.b * dpr;
        m.setTransform(dpr, 0, 0, dpr, -bx * dpr, -by * dpr);
        // weiche Kanten: die Form weit weg zeichnen und nur ihren unscharfen Schatten hierher werfen
        m.shadowColor = "#000"; m.shadowBlur = weich; m.shadowOffsetX = weit * dpr; m.fillStyle = "#000";
        form(m, { cx: e.ex, cy: e.ey, rx: e.erx, ry: e.ery }, weit);
        m.globalCompositeOperation = "destination-out";
        (e.aus || []).forEach(function (f) { form(m, f, weit); });
        m.globalCompositeOperation = "source-over";
      }
      return function (ctx2, t) {
        if (!bild || !bild.complete || !bild.naturalWidth) return;
        if (scheibe && !(scheibe.complete && scheibe.naturalWidth)) return;
        var rand = 0.03;
        var bx = (e.ex - e.erx - rand) * r.b, by = (e.ey - e.ery - rand) * r.h;
        var bw = (2 * e.erx + 2 * rand) * r.b, bh = (2 * e.ery + 2 * rand) * r.h;
        var w = Math.ceil(bw * dpr), h = Math.ceil(bh * dpr);
        if (puffer.width !== w || puffer.height !== h) { puffer.width = w; puffer.height = h; }
        if (deckelFuer !== w + "x" + h) { deckelBauen(w, h, bx, by); deckelFuer = w + "x" + h; }
        var z = puffer.getContext("2d");
        z.setTransform(1, 0, 0, 1, 0, 0); z.clearRect(0, 0, w, h);
        // Drehung in der Ebene des Rads: Ellipse → Kreis, drehen, zurück
        var k = e.k || (e.erx * r.b) / (e.ery * r.h), wink = (e.richtung || 1) * 2 * Math.PI * t / (e.dauer || 14);
        var c = Math.cos(wink), s = Math.sin(wink), nx = e.cx * r.b - bx, ny = e.cy * r.h - by;
        // M = T(n) · S(k,1) · R · S(1/k,1) · T(-n)
        var a = c, b = s / k, cc = -s * k, d = c;
        z.setTransform(dpr * a, dpr * b, dpr * cc, dpr * d, dpr * (nx - a * nx - cc * ny), dpr * (ny - b * nx - d * ny));
        if (scheibe) z.drawImage(scheibe, e.bild.x * r.b - bx, e.bild.y * r.h - by, e.bild.b * r.b, e.bild.h * r.h);
        else z.drawImage(bild, -bx, -by, r.b, r.h);
        z.setTransform(1, 0, 0, 1, 0, 0);
        z.globalCompositeOperation = "destination-in";
        z.drawImage(deckel, 0, 0);
        z.globalCompositeOperation = "source-over";
        ctx2.drawImage(puffer, r.x + bx, r.y + by, bw, bh);
      };
    },

    // Ein Bildausschnitt schwebt sanft auf und ab (z. B. der fliegende Pfannkuchen im Original)
    schweben: function (e, r, ctx, bild) {
      return function (ctx2, t) {
        if (!bild || !bild.complete) return;
        var sx = e.x * bild.naturalWidth, sy = e.y * bild.naturalHeight, sw = e.b * bild.naturalWidth, sh = e.h * bild.naturalHeight;
        var dx = r.x + e.x * r.b, dy = r.y + e.y * r.h, dw = e.b * r.b, dh = e.h * r.h;
        var hub = Math.sin(t * 1.6) * r.h * 0.018, dreh = Math.sin(t * 1.1) * 0.03;
        ctx2.save();
        ctx2.fillStyle = e.papier || "rgb(247,245,240)"; ctx2.fillRect(dx - 2, dy - 2, dw + 4, dh + 4);
        ctx2.translate(dx + dw / 2, dy + dh / 2 + hub); ctx2.rotate(dreh);
        ctx2.drawImage(bild, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
        ctx2.restore();
      };
    }
  };
  F.TYPEN = Object.keys(ERZEUGER);
})();
