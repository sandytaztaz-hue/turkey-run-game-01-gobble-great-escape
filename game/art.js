// art.js — drawn canvas art for Gobble's Great Escape.
// Every figure is painted MID-ACTION: sprinting, lunging, leaping, scattering,
// tripping, stirring, grabbing. No standing poses anywhere in this file.
(function () {
  'use strict';

  // Seeded random so staged shots are reproducible.
  function makeRng(seed) {
    var s = seed >>> 0 || 1;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function ell(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
  function circ(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function poly(ctx, pts) {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath(); ctx.fill();
  }
  function line(ctx, x1, y1, x2, y2, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }
  function pill(ctx, x, y, w, h, r, col) {
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
  }
  function txt(ctx, s, x, y, size, col, align, weight, font) {
    ctx.fillStyle = col; ctx.font = (weight || 'bold') + ' ' + size + 'px ' + (font || 'Trebuchet MS, Verdana, sans-serif');
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(s, x, y);
  }
  function txtStroke(ctx, s, x, y, size, col, stroke, align, weight) {
    ctx.font = (weight || 'bold') + ' ' + size + 'px Trebuchet MS, Verdana, sans-serif';
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = Math.max(3, size / 6); ctx.strokeStyle = stroke; ctx.strokeText(s, x, y);
    ctx.fillStyle = col; ctx.fillText(s, x, y);
  }

  // ---- motion helpers: the visual language of ACTION ----
  // Speed lines trailing behind a fast mover.
  function speedLines(ctx, x, y, n, len, col, rng) {
    ctx.save(); ctx.globalAlpha = 0.85;
    for (var i = 0; i < n; i++) {
      var yy = y - 26 + rng() * 52, ll = len * (0.5 + rng() * 0.7), xx = x - rng() * 30;
      line(ctx, xx, yy, xx - ll, yy + (rng() - 0.5) * 8, 3, col);
    }
    ctx.restore();
  }
  // Dust puffs kicked up by running feet.
  function dustPuff(ctx, x, y, s, rng) {
    ctx.save(); ctx.globalAlpha = 0.75; ctx.fillStyle = '#d9c39a';
    for (var i = 0; i < 5; i++) {
      var dx = (rng() - 0.5) * 26 * s, dy = -rng() * 12 * s, r = (5 + rng() * 9) * s;
      circ(ctx, x + dx, y + dy, r);
    }
    ctx.fillStyle = '#b89a6a';
    ctx.restore();
  }
  // Loose feathers flying off a bird mid-sprint.
  function flyingFeathers(ctx, x, y, n, rng, cols) {
    for (var i = 0; i < n; i++) {
      var fx = x - rng() * 70 - 8, fy = y - 30 + rng() * 46, a = rng() * Math.PI;
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(a);
      ctx.fillStyle = cols[i % cols.length];
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  // Skid marks on dirt where feet just dug in.
  function skidMarks(ctx, x, y, n, rng) {
    ctx.save(); ctx.globalAlpha = 0.55; ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (var i = 0; i < n; i++) {
      var sx = x - i * 26 - rng() * 8, sy = y + (rng() - 0.5) * 10;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx - 18 - rng() * 10, sy + (rng() - 0.5) * 6); ctx.stroke();
    }
    ctx.restore();
  }

  // ---- sky: filled, never an empty wash ----
  function paintSky(ctx, W, H, skyH, palette, rng, t) {
    var g = ctx.createLinearGradient(0, 0, 0, skyH + 40);
    g.addColorStop(0, palette.skyTop); g.addColorStop(1, palette.skyBot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, skyH + 40);
    // sun with rays (below the HUD bar)
    ctx.save(); ctx.translate(palette.sunX, 82); ctx.fillStyle = palette.sun;
    ctx.globalAlpha = 0.35;
    for (var i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      poly(ctx, [[-4, -58], [4, -58], [7, -30], [-7, -30]]);
    }
    ctx.globalAlpha = 1; circ(ctx, 0, 0, 26); ctx.fillStyle = '#fff3c4'; circ(ctx, 0, 0, 18);
    ctx.restore();
    // clouds at two depths (below the HUD bar)
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    for (var c = 0; c < 5; c++) {
      var cx = 40 + rng() * (W - 160), cy = 62 + rng() * (skyH - 56), cs = 0.7 + rng() * 0.7;
      ell(ctx, cx, cy, 34 * cs, 13 * cs); ell(ctx, cx + 24 * cs, cy + 4, 26 * cs, 11 * cs); ell(ctx, cx - 26 * cs, cy + 5, 22 * cs, 10 * cs);
    }
    // birds in V-formation + singles, all mid-flap
    ctx.strokeStyle = '#3a2c1c'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    for (var b = 0; b < 7; b++) {
      var bx = 90 + rng() * (W - 200), by = 64 + rng() * (skyH - 40), flap = Math.sin(t * 6 + b * 2) * 5;
      ctx.beginPath(); ctx.moveTo(bx - 9, by + flap); ctx.quadraticCurveTo(bx - 3, by - 4, bx, by);
      ctx.quadraticCurveTo(bx + 3, by - 4, bx + 9, by + flap); ctx.stroke();
    }
    // hot-air balloon drifting
    ctx.save(); ctx.translate(W - 150, 76 + Math.sin(t * 0.8) * 3);
    ctx.fillStyle = '#e4572e'; ell(ctx, 0, 0, 26, 30);
    ctx.fillStyle = '#f6c453'; ell(ctx, -9, 0, 10, 30); ell(ctx, 9, 0, 10, 30);
    ctx.fillStyle = '#7a4a21'; pill(ctx, -8, 30, 16, 12, 3, '#7a4a21');
    line(ctx, -14, 26, -7, 30, 2, '#5a3a1a'); line(ctx, 14, 26, 7, 30, 2, '#5a3a1a');
    ctx.restore();
    // kite with a fluttering tail
    ctx.save(); ctx.translate(180, 70 + Math.sin(t * 2) * 4); ctx.rotate(0.5);
    ctx.fillStyle = '#2e86de'; poly(ctx, [[0, -14], [12, 0], [0, 14], [-12, 0]]);
    ctx.fillStyle = '#f6c453'; poly(ctx, [[0, -14], [12, 0], [0, 0]]);
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 14); ctx.quadraticCurveTo(10, 30, -4, 44); ctx.stroke();
    ctx.fillStyle = '#e4572e'; circ(ctx, 6, 30, 3); circ(ctx, -2, 40, 3);
    ctx.restore();
    // distant treeline along the bottom edge of the sky band
    ctx.fillStyle = palette.trees;
    for (var tx = 0; tx < W; tx += 26) {
      var th = 16 + rng() * 22;
      poly(ctx, [[tx, skyH + 8], [tx + 13, skyH + 8 - th], [tx + 26, skyH + 8]]);
    }
  }

  // ---- ground: textured everywhere, never a flat band ----
  function paintGround(ctx, W, H, groundY, palette, rng, t) {
    var g = ctx.createLinearGradient(0, groundY, 0, H);
    g.addColorStop(0, palette.groundTop); g.addColorStop(1, palette.groundBot);
    ctx.fillStyle = g; ctx.fillRect(0, groundY, W, H - groundY);
    // dirt patches
    for (var i = 0; i < 26; i++) {
      ctx.fillStyle = i % 3 === 0 ? 'rgba(122,90,52,0.5)' : 'rgba(90,140,60,0.45)';
      ell(ctx, rng() * W, groundY + 8 + rng() * (H - groundY - 14), 18 + rng() * 42, 7 + rng() * 10);
    }
    // grass tufts
    ctx.strokeStyle = palette.grass; ctx.lineWidth = 2.5;
    for (var k = 0; k < 90; k++) {
      var gx = rng() * W, gy = groundY + 6 + rng() * (H - groundY - 8);
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx - 4, gy - 9 - rng() * 6);
      ctx.moveTo(gx + 3, gy); ctx.lineTo(gx + 5, gy - 10 - rng() * 6);
      ctx.moveTo(gx, gy); ctx.lineTo(gx, gy - 12 - rng() * 5); ctx.stroke();
    }
    // wildflowers + fallen leaves + stones + scattered kernels
    for (var f = 0; f < 34; f++) {
      var fx = rng() * W, fy = groundY + 8 + rng() * (H - groundY - 12);
      ctx.fillStyle = ['#ff5d8f', '#ffd23f', '#ffffff', '#ff8c42'][f % 4];
      circ(ctx, fx, fy, 3); ctx.fillStyle = '#2e7d32'; circ(ctx, fx + 4, fy + 3, 2);
    }
    for (var l = 0; l < 26; l++) {
      ctx.fillStyle = ['#d35400', '#e67e22', '#f1c40f'][l % 3];
      ctx.save(); ctx.translate(rng() * W, groundY + 10 + rng() * (H - groundY - 14)); ctx.rotate(rng() * 3);
      ell(ctx, 0, 0, 7, 3.5); ctx.restore();
    }
    for (var s = 0; s < 16; s++) { ctx.fillStyle = '#8d8d8d'; circ(ctx, rng() * W, groundY + 8 + rng() * (H - groundY - 10), 2 + rng() * 3); }
  }

  // ---- CHARACTERS, all mid-action ----

  // Gobble SPRINTING: leaning hard forward, one leg bent under, one stretched
  // back, wings tucked, tail streaming, feathers flying, dust at his feet.
  function drawTurkeySprint(ctx, x, y, s, t, rng, burst) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.16); ctx.scale(s, s);
    speedLines(ctx, -30, 0, 5, 46, 'rgba(255,255,255,0.8)', rng);
    // tail feathers streaming behind
    ctx.fillStyle = '#8d5a2b';
    for (var i = -2; i <= 2; i++) {
      ctx.save(); ctx.translate(-34, -6 + i * 7); ctx.rotate(-0.5 + i * 0.16);
      ell(ctx, -12, 0, 16, 5); ctx.restore();
    }
    ctx.fillStyle = '#c98a3d';
    for (var j = -1; j <= 1; j++) { ctx.save(); ctx.translate(-36, j * 8); ctx.rotate(-0.5 + j * 0.2); ell(ctx, -10, 0, 12, 4); ctx.restore(); }
    // legs in running stride: one bent under, one stretched back
    var stride = Math.sin(t * 14);
    ctx.strokeStyle = '#e8a13c'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4, 22); ctx.lineTo(-16 + stride * 6, 40); ctx.lineTo(-26 + stride * 8, 34); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, 22); ctx.lineTo(22 - stride * 6, 38); ctx.lineTo(34 - stride * 8, 44); ctx.stroke();
    ctx.fillStyle = '#e8a13c';
    poly(ctx, [[-30 + stride * 8, 32], [-18 + stride * 8, 30], [-22 + stride * 8, 40]]);
    poly(ctx, [[30 - stride * 8, 42], [40 - stride * 8, 40], [36 - stride * 8, 50]]);
    // body leaning forward
    ctx.fillStyle = '#6b4423'; ell(ctx, 0, 0, 34, 26);
    ctx.fillStyle = '#8d5a2b'; ell(ctx, 4, -4, 28, 20);
    // wing tucked back, mid-flap blur
    ctx.fillStyle = '#5a3a1a'; ctx.save(); ctx.translate(-6, -2); ctx.rotate(0.5 + Math.sin(t * 14) * 0.12);
    ell(ctx, -14, 0, 20, 9); ctx.restore();
    ctx.fillStyle = '#a06a35'; ell(ctx, 14, -12, 12, 8);
    // neck stretched forward + head
    ctx.fillStyle = '#8d5a2b'; ctx.save(); ctx.translate(30, -18); ctx.rotate(0.9); ell(ctx, 0, 0, 8, 16); ctx.restore();
    ctx.fillStyle = '#7a4a21'; circ(ctx, 40, -34, 13);
    // wattle flapping + beak open mid-gobble
    ctx.fillStyle = '#d92038'; poly(ctx, [[46, -28], [52, -20], [44, -18]]);
    ctx.fillStyle = '#f6c453'; poly(ctx, [[50, -36], [64, -31], [50, -28]]);
    ctx.fillStyle = '#fff'; circ(ctx, 43, -38, 4); ctx.fillStyle = '#1a1a1a'; circ(ctx, 44, -38, 2);
    // comb swept back by speed
    ctx.fillStyle = '#d92038'; ell(ctx, 34, -46, 7, 4); ell(ctx, 28, -47, 6, 3.5);
    ctx.restore();
    dustPuff(ctx, x - 30, y + 46 * s, s, rng);
    dustPuff(ctx, x + 30, y + 48 * s, s, rng);
    flyingFeathers(ctx, x - 20, y - 10, 6, rng, ['#8d5a2b', '#c98a3d', '#fff3e0']);
    if (burst) drawFeatherBurst(ctx, x + 90, y - 60, 1.1, t, rng);
  }

  // Farmer Hank LUNGING: driving leg forward, arm reaching with fingers spread,
  // other arm pumping back, hat sliding off, sweat drop flying, motion lines.
  function drawFarmerLunge(ctx, x, y, s, t, rng) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    speedLines(ctx, -30, -10, 4, 40, 'rgba(255,255,255,0.75)', rng);
    var pump = Math.sin(t * 12);
    // back leg pushing off the ground
    ctx.strokeStyle = '#3d2b1f'; ctx.lineWidth = 13; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(-34, 34); ctx.lineTo(-48, 30); ctx.stroke();
    // front leg driving forward
    ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(30, 30); ctx.lineTo(46, 36); ctx.stroke();
    ctx.fillStyle = '#5a3a1a';
    poly(ctx, [[-54, 26], [-40, 24], [-44, 36], [-56, 36]]);
    poly(ctx, [[40, 32], [54, 30], [58, 40], [44, 42]]);
    // torso leaning forward, overalls + plaid shirt
    ctx.fillStyle = '#c0392b'; ctx.save(); ctx.translate(0, -22); ctx.rotate(0.28);
    pill(ctx, -20, -26, 40, 52, 10, '#c0392b'); ctx.restore();
    ctx.fillStyle = '#2e5fa3'; pill(ctx, -16, -30, 32, 40, 8, '#2e5fa3');
    ctx.fillStyle = '#f6c453'; circ(ctx, -8, -14, 3); circ(ctx, 8, -14, 3);
    // reaching arm, fingers spread, grabbing at the turkey
    ctx.strokeStyle = '#e8b88a'; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(16, -38); ctx.lineTo(44, -52); ctx.lineTo(62, -58); ctx.stroke();
    ctx.fillStyle = '#e8b88a';
    for (var f = 0; f < 4; f++) { line(ctx, 62, -58, 70 + f * 2, -66 + f * 5, 3, '#e8b88a'); }
    circ(ctx, 62, -58, 6);
    // pumping arm swung back
    ctx.beginPath(); ctx.moveTo(-16, -38); ctx.lineTo(-38, -18 + pump * 4); ctx.lineTo(-48, -2 + pump * 5); ctx.stroke();
    circ(ctx, -48, -2 + pump * 5, 6);
    // head, shouting, hat sliding off
    ctx.fillStyle = '#e8b88a'; circ(ctx, 6, -62, 15);
    ctx.fillStyle = '#fff'; circ(ctx, 12, -66, 3.5); ctx.fillStyle = '#1a1a1a'; circ(ctx, 13, -66, 1.8);
    ctx.fillStyle = '#7a4a21'; poly(ctx, [[-8, -72], [4, -76], [2, -68]]);
    ctx.fillStyle = '#5a1f1f'; ell(ctx, 18, -52, 7, 4); // open shouting mouth
    ctx.fillStyle = '#fff'; ell(ctx, 18, -54, 5, 2);
    // straw hat tilted, sliding off the back of his head
    ctx.save(); ctx.translate(-6, -80); ctx.rotate(-0.55 + Math.sin(t * 9) * 0.05);
    ctx.fillStyle = '#e8c96a'; ell(ctx, 0, 0, 22, 6); ctx.fillStyle = '#d9a83c'; ell(ctx, 0, -4, 12, 7);
    ctx.fillStyle = '#c0392b'; pill(ctx, -12, -6, 24, 4, 2, '#c0392b'); ctx.restore();
    // sweat drop flying off his forehead
    ctx.fillStyle = '#9fd8ff'; ctx.save(); ctx.translate(26, -78); ctx.rotate(0.6);
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.quadraticCurveTo(6, 2, 0, 6); ctx.quadraticCurveTo(-6, 2, 0, -7); ctx.fill(); ctx.restore();
    ctx.restore();
    dustPuff(ctx, x - 46 * s, y + 34 * s, s, rng);
  }

  // Biscuit LEAPING mid-air: all four legs tucked/stretched, ears flying back,
  // mouth open mid-bark, motion arc under him.
  function drawDogLeap(ctx, x, y, s, t, rng) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.12); ctx.scale(s, s);
    // motion arc showing he just left the ground
    ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.arc(0, 26, 52, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // legs: front stretched forward, back tucked
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(22, 6); ctx.lineTo(44, -2); ctx.lineTo(56, 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16, 10); ctx.lineTo(36, 12); ctx.lineTo(50, 8); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-18, 8); ctx.lineTo(-34, 18); ctx.lineTo(-44, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-24, 10); ctx.lineTo(-38, 24); ctx.lineTo(-48, 18); ctx.stroke();
    // body stretched mid-leap
    ctx.fillStyle = '#a06a35'; ell(ctx, 0, 0, 34, 15);
    ctx.fillStyle = '#c98a3d'; ell(ctx, -8, -6, 22, 10);
    // tail up and wagging
    ctx.strokeStyle = '#a06a35'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(-32, -6); ctx.quadraticCurveTo(-48, -26, -40, -34 + Math.sin(t * 16) * 5); ctx.stroke();
    // head + ears flying back + open barking mouth
    ctx.fillStyle = '#a06a35'; circ(ctx, 34, -12, 13);
    ctx.fillStyle = '#6b4423'; ell(ctx, 26, -22, 5, 10); ell(ctx, 30, -24, 5, 10);
    ctx.fillStyle = '#e8b88a'; poly(ctx, [[44, -10], [58, -4], [44, -2]]);
    ctx.fillStyle = '#5a1f1f'; ell(ctx, 50, -3, 6, 4);
    ctx.fillStyle = '#d92038'; ell(ctx, 50, -1, 4, 2);
    ctx.fillStyle = '#1a1a1a'; circ(ctx, 38, -16, 2);
    // bark burst
    ctx.fillStyle = '#fff'; txt(ctx, 'WOOF!', 62, -26, 15, '#fff', 'left', 'bold');
    ctx.restore();
  }

  // A chicken SCATTERING: wings UP and flapping, feet off the ground, feathers in the air.
  function drawChickenScatter(ctx, x, y, s, t, rng, col, dir) {
    ctx.save(); ctx.translate(x, y); ctx.scale((dir || 1) * s, s);
    var flap = Math.sin(t * 18 + x) * 0.5;
    // feet off the ground, kicking
    ctx.strokeStyle = '#f6c453'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4, 14); ctx.lineTo(-12, 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, 14); ctx.lineTo(14, 24); ctx.stroke();
    ctx.fillStyle = col || '#f5f0e6'; ell(ctx, 0, 0, 20, 15);
    // wings UP, flapping hard
    ctx.fillStyle = col || '#f5f0e6';
    ctx.save(); ctx.translate(-4, -8); ctx.rotate(-1.1 + flap); ell(ctx, -12, 0, 16, 6); ctx.restore();
    ctx.save(); ctx.translate(4, -8); ctx.rotate(1.0 - flap); ell(ctx, 12, 0, 16, 6); ctx.restore();
    ctx.fillStyle = '#d92038'; ell(ctx, 16, -12, 5, 3); // comb flopping
    ctx.fillStyle = '#fff'; circ(ctx, 14, -14, 8);
    ctx.fillStyle = '#f6c453'; poly(ctx, [[20, -14], [30, -11], [20, -9]]);
    ctx.fillStyle = '#1a1a1a'; circ(ctx, 16, -16, 2);
    ctx.fillStyle = '#d92038'; poly(ctx, [[18, -8], [22, -4], [16, -4]]);
    ctx.restore();
    flyingFeathers(ctx, x, y - 8, 3, rng, ['#ffffff', '#f6c453']);
    dustPuff(ctx, x, y + 26 * s, 0.7 * s, rng);
  }

  // Henrietta pointing at a card with one wing raised.
  function drawHenriettaPoint(ctx, x, y, s, t, rng) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    var bob = Math.sin(t * 5) * 2;
    ctx.translate(0, bob);
    ctx.fillStyle = '#f5f0e6'; ell(ctx, 0, 0, 24, 18);
    ctx.fillStyle = '#e8e0cc'; ell(ctx, -6, -4, 16, 11);
    ctx.fillStyle = '#fff'; circ(ctx, 16, -16, 9);
    ctx.fillStyle = '#d92038'; ell(ctx, 16, -26, 6, 4);
    ctx.fillStyle = '#f6c453'; poly(ctx, [[24, -16], [34, -13], [24, -10]]);
    ctx.fillStyle = '#1a1a1a'; circ(ctx, 18, -18, 2.2);
    // pointing wing stretched out
    ctx.strokeStyle = '#e8e0cc'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(38, -14); ctx.stroke();
    ctx.fillStyle = '#e8e0cc'; ell(ctx, 40, -15, 8, 4);
    ctx.strokeStyle = '#f6c453'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-6, 16); ctx.lineTo(-10, 28); ctx.moveTo(6, 16); ctx.lineTo(10, 28); ctx.stroke();
    ctx.restore();
  }

  // Gus honking with wings up.
  function drawGusHonk(ctx, x, y, s, t, rng) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    var flap = Math.sin(t * 10) * 0.25;
    ctx.fillStyle = '#ffffff'; ell(ctx, 0, 0, 26, 17);
    ctx.save(); ctx.translate(-6, -6); ctx.rotate(-1.2 + flap); ell(ctx, -14, 0, 17, 6); ctx.restore();
    ctx.save(); ctx.translate(6, -6); ctx.rotate(1.2 - flap); ell(ctx, 14, 0, 17, 6); ctx.restore();
    ctx.fillStyle = '#fff'; circ(ctx, 20, -18, 9);
    ctx.fillStyle = '#f6a83c'; poly(ctx, [[28, -18], [40, -14], [28, -10]]);
    ctx.fillStyle = '#1a1a1a'; circ(ctx, 22, -20, 2.2);
    // honk burst
    ctx.fillStyle = '#ffe9a8'; poly(ctx, [[40, -16], [58, -22], [58, -8]]);
    txt(ctx, 'HONK!', 60, -12, 14, '#7a4a21', 'left', 'bold');
    ctx.strokeStyle = '#f6a83c'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-8, 16); ctx.lineTo(-12, 28); ctx.moveTo(8, 16); ctx.lineTo(12, 28); ctx.stroke();
    ctx.restore();
  }

  // Daffodil PEEKING from behind the fence: half-hidden, head + one wing out, eyes wide.
  function drawDuckPeek(ctx, x, y, s, t, rng) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // fence post she hides behind
    ctx.fillStyle = '#8a5a2b'; pill(ctx, -34, -70, 14, 110, 4, '#8a5a2b');
    ctx.fillStyle = '#a06a35'; pill(ctx, -40, -30, 26, 8, 3, '#a06a35');
    // body half-hidden behind the post
    ctx.fillStyle = '#e8d27a'; ell(ctx, 6, 0, 18, 14);
    ctx.fillStyle = '#fff3c4'; ell(ctx, 10, -4, 12, 9);
    // head poking out, eyes wide, beak open in a warning quack
    ctx.fillStyle = '#e8d27a'; circ(ctx, 20, -18, 11);
    ctx.fillStyle = '#fff'; circ(ctx, 24, -22, 5); ctx.fillStyle = '#1a1a1a'; circ(ctx, 25, -22, 3);
    ctx.fillStyle = '#f6a83c'; poly(ctx, [[30, -18], [44, -14], [30, -10]]);
    ctx.fillStyle = '#5a1f1f'; ell(ctx, 38, -13, 4, 2.5);
    // one wing out, waving
    ctx.fillStyle = '#d9b84a'; ctx.save(); ctx.translate(0, -6); ctx.rotate(-0.7 + Math.sin(t * 8) * 0.2); ell(ctx, -12, 0, 13, 5); ctx.restore();
    ctx.restore();
  }

  // Percy TRIPPING over a pumpkin: tipped forward, front legs tangled, dust where his snout nearly hit.
  function drawPigTrip(ctx, x, y, s, t, rng) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.22); ctx.scale(s, s);
    // pumpkin under his front legs
    ctx.fillStyle = '#e67e22'; circ(ctx, 26, 22, 20); ctx.fillStyle = '#d35400';
    ell(ctx, 14, 22, 5, 16); ell(ctx, 38, 22, 5, 16);
    ctx.fillStyle = '#2e7d32'; line(ctx, 26, 4, 30, -6, 4, '#2e7d32');
    // body tipped forward
    ctx.fillStyle = '#f2a0b5'; ell(ctx, 0, 0, 30, 20);
    ctx.fillStyle = '#e88aa5'; ell(ctx, -24, -8, 10, 8);
    // front legs tangled on the pumpkin
    ctx.strokeStyle = '#f2a0b5'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(18, 10); ctx.lineTo(26, 26); ctx.lineTo(18, 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(24, 12); ctx.lineTo(34, 24); ctx.stroke();
    // back legs kicking up behind
    ctx.beginPath(); ctx.moveTo(-20, 12); ctx.lineTo(-34, 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-12, 14); ctx.lineTo(-22, 30); ctx.stroke();
    // head down near the dirt, startled
    ctx.fillStyle = '#f2a0b5'; circ(ctx, 34, -6, 12);
    ctx.fillStyle = '#e88aa5'; ell(ctx, 44, -2, 8, 6);
    ctx.fillStyle = '#fff'; circ(ctx, 36, -12, 4.5); ctx.fillStyle = '#1a1a1a'; circ(ctx, 37, -12, 2.5);
    ctx.fillStyle = '#d92038'; poly(ctx, [[28, -16], [32, -24], [36, -16]]);
    // curly tail spinning
    ctx.strokeStyle = '#e88aa5'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(-32, -10, 6, 0, Math.PI * 1.8); ctx.stroke();
    ctx.restore();
    dustPuff(ctx, x + 44 * s, y + 18 * s, s, rng);
    txt(ctx, 'OINK!', x + 52 * s, y - 26 * s, 14, '#fff', 'left', 'bold');
  }

  // The carving knife MID-FLIGHT: spinning with a motion trail and glint lines.
  function drawKnifeFlying(ctx, x, y, s, t, rng) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.7 + Math.sin(t * 20) * 0.25); ctx.scale(s, s);
    // motion trail
    ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.arc(0, 0, 46, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    // blade
    ctx.fillStyle = '#e8eef2'; poly(ctx, [[-8, -34], [8, -34], [14, 6], [0, 14], [-14, 6]]);
    ctx.fillStyle = '#b8c4cc'; poly(ctx, [[-8, -34], [0, -34], [0, 14], [-14, 6]]);
    // glint lines
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
    line(ctx, -4, -28, 4, -20, 2.5, '#fff'); line(ctx, -2, -12, 6, -4, 2.5, '#fff');
    // handle
    ctx.fillStyle = '#5a2d12'; pill(ctx, -7, 12, 14, 26, 6, '#5a2d12');
    ctx.fillStyle = '#c9a227'; circ(ctx, 0, 20, 2.5); circ(ctx, 0, 30, 2.5);
    ctx.restore();
    // sparkle glints around the spin
    ctx.fillStyle = '#fff';
    for (var i = 0; i < 3; i++) {
      var gx = x + (rng() - 0.5) * 90, gy = y + (rng() - 0.5) * 70;
      poly(ctx, [[gx, gy - 7], [gx + 2, gy], [gx, gy + 7], [gx - 2, gy]]);
    }
  }

  // The Feather Burst decoy EXPLODING mid-air: feathers radiating from a
  // dissolving ghost turkey, shockwave ring.
  function drawFeatherBurst(ctx, x, y, s, t, rng) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // shockwave ring
    ctx.save(); ctx.globalAlpha = 0.7; ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0, 0, 34 + Math.sin(t * 8) * 4, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    // ghost turkey dissolving (pale, breaking apart)
    ctx.save(); ctx.globalAlpha = 0.45;
    ctx.fillStyle = '#fff3e0'; ell(ctx, 0, 0, 22, 16);
    ctx.fillStyle = '#fff3e0'; circ(ctx, 20, -14, 8);
    ctx.restore();
    // feathers radiating outward
    var cols = ['#8d5a2b', '#c98a3d', '#fff3e0', '#f6c453'];
    for (var i = 0; i < 14; i++) {
      var a = (i / 14) * Math.PI * 2 + Math.sin(t * 6 + i) * 0.15;
      var d = 30 + (i % 4) * 9;
      ctx.save(); ctx.translate(Math.cos(a) * d, Math.sin(a) * d); ctx.rotate(a + 1.2);
      ctx.fillStyle = cols[i % 4]; ell(ctx, 0, 0, 10, 4.5); ctx.restore();
    }
    txtStroke(ctx, 'POOF!', 0, -52, 16, '#fff', '#7a4a21', 'center', 'bold');
    ctx.restore();
  }

  // A hay bale ROLLING: tipped on its side, motion lines, dust trailing, feathers sticking out.
  function drawHayRoll(ctx, x, y, s, t, rng) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.3 + Math.sin(t * 7) * 0.06); ctx.scale(s, s);
    speedLines(ctx, -34, 0, 4, 34, 'rgba(255,255,255,0.7)', rng);
    ctx.fillStyle = '#d9a83c'; circ(ctx, 0, 0, 26);
    ctx.fillStyle = '#e8c96a'; circ(ctx, 0, 0, 18);
    ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke();
    // chicken feathers sticking out of the bale
    ctx.fillStyle = '#fff'; ell(ctx, -8, -26, 8, 3.5); ell(ctx, 8, -25, 8, 3.5);
    ctx.fillStyle = '#f6c453'; ell(ctx, 0, -28, 6, 3);
    ctx.restore();
    dustPuff(ctx, x - 30 * s, y + 22 * s, 0.8 * s, rng);
  }

  // The trap SNAPPING shut: jaws half-closed with a motion blur arc, dust puff, mouse mid-leap away.
  function drawTrapSnap(ctx, x, y, s, t, rng) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // base
    ctx.fillStyle = '#7a4a21'; pill(ctx, -26, 8, 52, 10, 3, '#7a4a21');
    // jaws half-closed, motion blur arc
    ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = '#c0c0c0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 8, 26, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); ctx.restore();
    ctx.strokeStyle = '#9aa0a6'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-24, 8); ctx.lineTo(-14, -16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(24, 8); ctx.lineTo(14, -18); ctx.stroke();
    ctx.fillStyle = '#9aa0a6';
    for (var i = 0; i < 4; i++) { poly(ctx, [[-22 + i * 3, -14 - i], [-18 + i * 3, -14 - i], [-20 + i * 3, -6 - i]]); }
    // cheese bait flying off
    ctx.fillStyle = '#f6c453'; poly(ctx, [[-4, -26], [8, -30], [4, -18]]);
    // mouse mid-leap away
    ctx.fillStyle = '#9a9a9a'; ell(ctx, 44, -14, 12, 7);
    ctx.fillStyle = '#9a9a9a'; circ(ctx, 54, -20, 6);
    ctx.fillStyle = '#e8a0b5'; circ(ctx, 52, -26, 3); circ(ctx, 58, -26, 3);
    ctx.strokeStyle = '#9a9a9a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(32, -12); ctx.quadraticCurveTo(22, -4, 26, 4); ctx.stroke();
    ctx.restore();
    dustPuff(ctx, x, y + 16 * s, 0.7 * s, rng);
  }

  // Marge STIRRING the pot: arm mid-stir, spoon circling, steam curling, knife held up.
  function drawMargeStir(ctx, x, y, s, t, rng) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    // apron dress + body leaning over the pot
    ctx.fillStyle = '#5a6b8a'; ell(ctx, 0, 0, 26, 34);
    ctx.fillStyle = '#f5f0e6'; pill(ctx, -18, -20, 36, 44, 8, '#f5f0e6');
    ctx.fillStyle = '#e4572e'; poly(ctx, [[-18, -8], [18, -8], [14, 20], [-14, 20]]);
    // head with hair bun + headscarf flapping
    ctx.fillStyle = '#e8b88a'; circ(ctx, 0, -48, 14);
    ctx.fillStyle = '#8a8a8a'; circ(ctx, -4, -58, 8); circ(ctx, 6, -58, 8);
    ctx.fillStyle = '#e4572e'; poly(ctx, [[-14, -56], [14, -56], [10, -46], [-10, -46]]);
    ctx.fillStyle = '#fff'; circ(ctx, 5, -50, 3); ctx.fillStyle = '#1a1a1a'; circ(ctx, 6, -50, 1.6);
    ctx.fillStyle = '#d92038'; ell(ctx, 6, -40, 5, 2.5);
    // stirring arm: spoon circling in the pot
    var sw = t * 9;
    ctx.strokeStyle = '#e8b88a'; ctx.lineWidth = 8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(16, -22); ctx.lineTo(34, 2 + Math.sin(sw) * 4); ctx.stroke();
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 4;
    line(ctx, 34, 2 + Math.sin(sw) * 4, 44 + Math.cos(sw) * 8, 14 + Math.sin(sw) * 8, 4, '#8a5a2b');
    ctx.fillStyle = '#8a5a2b'; ell(ctx, 44 + Math.cos(sw) * 8, 14 + Math.sin(sw) * 8, 6, 4);
    // other hand holding the carving knife UP
    ctx.strokeStyle = '#e8b88a'; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(-16, -22); ctx.lineTo(-36, -40); ctx.stroke();
    ctx.save(); ctx.translate(-40, -52); ctx.rotate(0.5);
    ctx.fillStyle = '#e8eef2'; poly(ctx, [[-4, -20], [4, -20], [6, 2], [0, 6], [-6, 2]]);
    ctx.fillStyle = '#5a2d12'; pill(ctx, -4, 6, 8, 14, 3, '#5a2d12');
    ctx.restore();
    // pot + steam curls rising
    ctx.fillStyle = '#3a3a3a'; ell(ctx, 44, 26, 22, 12);
    ctx.fillStyle = '#d35400'; ell(ctx, 44, 20, 18, 6);
    ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    for (var i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(36 + i * 9, 14);
      ctx.bezierCurveTo(30 + i * 9, -2, 50 + i * 9, -8, 40 + i * 9, -22 - Math.sin(t * 3 + i) * 3);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  // A knife QUIVERING stuck in the barn wall: blade in wood, handle vibrating.
  function drawKnifeQuiver(ctx, x, y, s, t, rng) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(0.35 + Math.sin(t * 22) * 0.03); ctx.scale(s, s);
    ctx.fillStyle = '#e8eef2'; poly(ctx, [[-6, -26], [6, -26], [8, 6], [0, 12], [-8, 6]]);
    ctx.fillStyle = '#5a2d12'; pill(ctx, -6, 10, 12, 22, 5, '#5a2d12');
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    line(ctx, -22, 8, -12, 8, 2, '#fff'); line(ctx, 12, 16, 22, 16, 2, '#fff'); line(ctx, -20, 20, -12, 20, 2, '#fff');
    ctx.restore();
  }

  // Corn kernels POPPING in the air: a spray arcing up, some frozen mid-bounce.
  function drawCornPop(ctx, x, y, s, t, rng) {
    for (var i = 0; i < 8; i++) {
      var a = -Math.PI / 2 + (rng() - 0.5) * 2.2, d = 14 + rng() * 42;
      var kx = x + Math.cos(a) * d, ky = y + Math.sin(a) * d * 0.8 - Math.abs(Math.sin(t * 5 + i)) * 8;
      ctx.save(); ctx.translate(kx, ky); ctx.rotate(rng() * 3);
      ctx.fillStyle = i % 3 === 0 ? '#fff3c4' : '#f6c453';
      ell(ctx, 0, 0, 6, 4); ctx.restore();
    }
  }

  // A pickup kernel / item, drawn chunky and readable.
  function drawPickup(ctx, kind, x, y, s, t) {
    ctx.save(); ctx.translate(x, y + Math.sin(t * 4 + x) * 2); ctx.scale(s, s);
    if (kind === 'corn') { ctx.fillStyle = '#f6c453'; ell(ctx, 0, 0, 8, 6); ctx.fillStyle = '#fff3c4'; ell(ctx, -2, -2, 4, 3); }
    else if (kind === 'gold') { ctx.fillStyle = '#ffd700'; ell(ctx, 0, 0, 10, 7); ctx.fillStyle = '#fff'; ell(ctx, -3, -3, 4, 3); }
    else if (kind === 'apple') { ctx.fillStyle = '#d92038'; circ(ctx, 0, 0, 8); ctx.fillStyle = '#2e7d32'; line(ctx, 0, -8, 3, -13, 2, '#2e7d32'); }
    else if (kind === 'berry') { ctx.fillStyle = '#7b2d8b'; circ(ctx, -4, 0, 5); circ(ctx, 4, -2, 5); circ(ctx, 0, 4, 5); }
    else if (kind === 'acorn') { ctx.fillStyle = '#8a5a2b'; ell(ctx, 0, 2, 6, 7); ctx.fillStyle = '#5a3a1a'; ell(ctx, 0, -4, 7, 4); }
    else if (kind === 'seed') { ctx.fillStyle = '#e8e0cc'; ell(ctx, 0, 0, 5, 8); }
    else if (kind === 'feather') { ctx.fillStyle = '#fff'; ell(ctx, 0, 0, 9, 4); ctx.fillStyle = '#c98a3d'; ell(ctx, 0, 0, 5, 2); }
    else if (kind === 'clover') { ctx.fillStyle = '#2e9e4f'; circ(ctx, -4, -3, 4); circ(ctx, 4, -3, 4); circ(ctx, -4, 4, 4); circ(ctx, 4, 4, 4); }
    else { ctx.fillStyle = '#f6c453'; ell(ctx, 0, 0, 8, 6); }
    ctx.restore();
  }

  // Scarecrow with arms flapping in the wind (mid-flutter, not still).
  function drawScarecrow(ctx, x, y, s, t, rng) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    var fl = Math.sin(t * 6) * 0.12;
    ctx.fillStyle = '#7a4a21'; line(ctx, 0, 0, 0, 70, 8, '#7a4a21');
    ctx.strokeStyle = '#7a4a21'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(-30, 8); ctx.lineTo(30, -2); ctx.stroke();
    ctx.fillStyle = '#2e86de'; poly(ctx, [[-26, -6], [26, -12], [20, 22], [-20, 26]]);
    ctx.fillStyle = '#f6c453'; ell(ctx, -32, -4 + fl * 20, 6, 4); ell(ctx, 32, 0 - fl * 20, 6, 4);
    ctx.fillStyle = '#e8b88a'; circ(ctx, 0, -22, 12);
    ctx.fillStyle = '#e8c96a'; ell(ctx, 0, -32, 16, 5);
    ctx.fillStyle = '#5a2d12'; circ(ctx, -4, -24, 2); circ(ctx, 4, -24, 2);
    ctx.strokeStyle = '#5a2d12'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6, -16); ctx.lineTo(6, -16); ctx.stroke();
    ctx.fillStyle = '#d9a83c'; poly(ctx, [[-4, -12], [4, -12], [0, -4]]);
    ctx.restore();
  }

  // Fence rail with a chicken perched, flapping to keep balance.
  function drawFence(ctx, x, y, w, s, t, rng) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#8a5a2b';
    for (var i = 0; i <= 4; i++) pill(ctx, i * (w / 4) - 5, -34, 10, 68, 3, '#8a5a2b');
    pill(ctx, -6, -30, w + 12, 8, 3, '#a06a35'); pill(ctx, -6, -4, w + 12, 8, 3, '#a06a35');
    ctx.restore();
  }

  window.GOBBLE_ART = {
    makeRng: makeRng, clamp: clamp, lerp: lerp, ell: ell, circ: circ, poly: poly,
    line: line, pill: pill, txt: txt, txtStroke: txtStroke,
    speedLines: speedLines, dustPuff: dustPuff, flyingFeathers: flyingFeathers, skidMarks: skidMarks,
    paintSky: paintSky, paintGround: paintGround,
    drawTurkeySprint: drawTurkeySprint, drawFarmerLunge: drawFarmerLunge, drawDogLeap: drawDogLeap,
    drawChickenScatter: drawChickenScatter, drawHenriettaPoint: drawHenriettaPoint, drawGusHonk: drawGusHonk,
    drawDuckPeek: drawDuckPeek, drawPigTrip: drawPigTrip, drawKnifeFlying: drawKnifeFlying,
    drawFeatherBurst: drawFeatherBurst, drawHayRoll: drawHayRoll, drawTrapSnap: drawTrapSnap,
    drawMargeStir: drawMargeStir, drawKnifeQuiver: drawKnifeQuiver, drawCornPop: drawCornPop,
    drawPickup: drawPickup, drawScarecrow: drawScarecrow, drawFence: drawFence
  };
})();
