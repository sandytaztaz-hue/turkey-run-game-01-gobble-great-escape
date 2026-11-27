// render.js — screen painters for Gobble's Great Escape.
// Every screen fills the frame: world ~75%+, sky <=15% and filled, one slim HUD bar.
(function () {
  'use strict';
  var A = window.GOBBLE_ART;
  var W = 1280, H = 720;

  var LEGS = [
    { name: 'Barnyard Breakout', sub: 'Dawn at the coop', skyTop: '#ffd9a0', skyBot: '#ffe9c4', sun: '#ffdf6b', sunX: 1080, trees: '#7a9a4d', groundTop: '#8a9a4d', groundBot: '#6b7a35', grass: '#4d6b2f' },
    { name: 'Cornfield Maze', sub: 'Tall amber corn', skyTop: '#ffb347', skyBot: '#ffd98a', sun: '#ffdf6b', sunX: 180, trees: '#8a6b2f', groundTop: '#b8860b', groundBot: '#8a5a1a', grass: '#c98a3d' },
    { name: 'Pumpkin Patch Dash', sub: 'Giant pumpkins', skyTop: '#ff9a5a', skyBot: '#ffc98a', sun: '#ffdf6b', sunX: 1080, trees: '#6b7a35', groundTop: '#a05a2c', groundBot: '#7a3a1a', grass: '#5a7a2f' },
    { name: 'The Old Barn', sub: 'The oven is hot', skyTop: '#e8a35a', skyBot: '#f2c98a', sun: '#ffcf4d', sunX: 640, trees: '#5a4a2f', groundTop: '#8a6b3d', groundBot: '#6b4a25', grass: '#7a8a3d' },
    { name: 'Orchard Sprint', sub: 'Apples falling', skyTop: '#9fd8ff', skyBot: '#d8f0ff', sun: '#ffdf6b', sunX: 220, trees: '#2e7d32', groundTop: '#7a9a4d', groundBot: '#5a7a35', grass: '#3d6b2f' },
    { name: 'Creek Crossing', sub: 'Fog on the water', skyTop: '#b8d0d8', skyBot: '#e8f0f0', sun: '#fff3c4', sunX: 1080, trees: '#5a7a6b', groundTop: '#7a8a6b', groundBot: '#4d6b5a', grass: '#3d5a4d' },
    { name: 'Golden Gate', sub: 'Sunset road home', skyTop: '#ff7a4d', skyBot: '#ffc46b', sun: '#ff9a3c', sunX: 640, trees: '#4d3a5a', groundTop: '#c98a3d', groundBot: '#8a5a2b', grass: '#8a6b2f' }
  ];

  var CAST = [
    ['Gobble', 'the turkey', '"Not today, Hank!"'],
    ['Farmer Hank', 'the chaser', '"Come back here, dinner!"'],
    ['Biscuit', 'the farm dog', '"WOOF! Almost had him!"'],
    ['Cook Marge', 'the oven keeper', '"The oven\'s already hot, birdie."'],
    ['Henrietta', 'the hen', '"Flap like you mean it!"'],
    ['Gus', 'the goose', '"HONK! Knife!"'],
    ['Daffodil', 'the duck', '"Logs, dear, hop the logs!"'],
    ['Percy', 'the pig', '"Oops. I\'m in the way again."'],
    ['Auntie Maple', 'hidden elder', '"The woods remember the fast ones."']
  ];

  function darkPill(ctx, x, y, w, h) { A.pill(ctx, x, y, w, h, 10, 'rgba(30,20,10,0.78)'); }
  function label(ctx, s, x, y, size, col) { A.txt(ctx, s, x, y, size, col || '#fff', 'left', 'bold'); }

  // ONE slim HUD bar (~56px) at the top only. Left: score/distance/corn/combo/
  // hearts/leg. Right: two small rows — Hank proximity, then burst + gobble.
  function paintHud(ctx, st, t) {
    darkPill(ctx, 12, 10, W - 24, 46);
    label(ctx, 'SCORE ' + st.score, 28, 40, 18); 
    label(ctx, 'DIST ' + Math.floor(st.distance) + 'm', 190, 40, 18);
    label(ctx, 'CORN ' + st.corn, 330, 40, 18, '#ffd23f');
    label(ctx, 'COMBO x' + st.combo, 460, 40, 18, '#ff8c42');
    // hearts
    var x = 580;
    for (var i = 0; i < 3; i++) {
      ctx.fillStyle = i < st.lives ? '#ff3b5c' : 'rgba(255,255,255,0.25)';
      ctx.beginPath(); ctx.arc(x + 10, 32, 9, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 24, 32, 9, 0, Math.PI * 2); ctx.fill();
      A.poly(ctx, [[x + 2, 36], [x + 32, 36], [x + 17, 50]]);
      x += 40;
    }
    label(ctx, 'LEG ' + (st.leg + 1) + '/7', 716, 40, 17, '#9fd8ff');
    // right block: HANK meter on the top row, burst/gobble on the bottom row
    var bx = 880;
    label(ctx, 'HANK', bx, 30, 12, '#ffb3b3');
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; A.pill(ctx, bx + 46, 20, 110, 11, 5, 'rgba(255,255,255,0.25)');
    ctx.fillStyle = st.farmerDist < 30 ? '#ff3b5c' : '#ff8c42';
    A.pill(ctx, bx + 46, 20, Math.max(8, 110 * (1 - st.farmerDist / 100)), 11, 5, st.farmerDist < 30 ? '#ff3b5c' : '#ff8c42');
    label(ctx, st.farmerDist < 30 ? 'CLOSE!' : 'BEHIND', bx + 164, 30, 12, '#ffb3b3');
    A.txt(ctx, 'FEATHER ' + st.burst + 'x    GOBBLE ' + Math.floor(st.gobble) + '%', 1252, 48, 13, '#ffe9a8', 'right', 'bold');
  }

  // Corn rows in depth through the whole middle of the frame: baselines from
  // just under the sky down to the ground, foreground rows large, back rows small.
  function paintCornRows(ctx, rng, t, groundY) {
    var rows = [
      { y: 170, tall: 62, step: 46, col: '#b8860b' },
      { y: 260, tall: 56, step: 46, col: '#c98a3d' },
      { y: 350, tall: 50, step: 46, col: '#d9a83c' },
      { y: 440, tall: 44, step: 46, col: '#c98a3d' }
    ];
    for (var row = 0; row < rows.length; row++) {
      var r = rows[row];
      for (var x = -20; x < W + 40; x += r.step) {
        var sway = Math.sin(t * 2 + x * 0.05 + row) * 3;
        ctx.fillStyle = r.col;
        ctx.beginPath(); ctx.moveTo(x + sway, r.y);
        ctx.quadraticCurveTo(x + 4 + sway, r.y - r.tall, x + 8 + sway, r.y - r.tall - 10);
        ctx.quadraticCurveTo(x + 13 + sway, r.y - r.tall, x + 17 + sway, r.y);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f6c453';
        A.ell(ctx, x + 8 + sway, r.y - r.tall * 0.55, 3.5, 8);
      }
    }
  }

  function paintPickups(ctx, st, rng, t, groundY) {
    var kinds = ['corn', 'corn', 'corn', 'gold', 'apple', 'berry', 'acorn', 'seed', 'feather', 'clover', 'corn', 'corn'];
    for (var i = 0; i < 30; i++) {
      var px = 40 + (i * 41) % (W - 80), py = groundY + 30 + ((i * 97) % 480);
      if (i % 5 === 0) py = groundY - 40 - (i % 3) * 40; // some high in the corn rows
      A.drawPickup(ctx, kinds[i % kinds.length], px, py, 1, t);
    }
  }

  function speech(ctx, s, x, y, w) {
    darkPill(ctx, x, y, w, 34);
    A.poly(ctx, [[x + 18, y + 32], [x + 30, y + 32], [x + 22, y + 44]]);
    A.txt(ctx, s, x + 12, y + 22, 13, '#fff', 'left', 'bold');
  }

  // ---- PLAY: leg scene, every figure mid-action ----
  function paintPlay(ctx, st, t, rng) {
    var leg = LEGS[st.leg], skyH = 104, groundY = 470;
    A.paintSky(ctx, W, H, skyH, leg, rng, t);
    // midground: barn, trees, fences spread through the frame
    ctx.fillStyle = '#a03a2a'; A.pill(ctx, 60, 150, 150, 120, 6, '#a03a2a');
    ctx.fillStyle = '#7a2a1a'; A.poly(ctx, [[50, 152], [135, 96], [220, 152]]);
    ctx.fillStyle = '#f6c453'; A.pill(ctx, 120, 190, 34, 44, 4, '#f6c453');
    ctx.fillStyle = '#5a3a1a'; A.pill(ctx, 122, 192, 14, 20, 2, '#5a3a1a'); A.pill(ctx, 138, 192, 14, 20, 2, '#5a3a1a');
    A.drawFence(ctx, 900, 300, 300, 1, t, rng);
    A.drawScarecrow(ctx, 1120, 240, 1.1, t, rng);
    paintCornRows(ctx, rng, t, groundY);
    A.paintGround(ctx, W, H, groundY, leg, rng, t);
    A.skidMarks(ctx, 700, 640, 6, rng);
    A.skidMarks(ctx, 420, 600, 5, rng);

    // hazards, all in motion: knife flying, hay rolling, trap snapping, fence, pitchfork, wheelbarrow
    A.drawKnifeFlying(ctx, 1020, 300, 1.15, t, rng);
    A.drawHayRoll(ctx, 180, 620, 1, t, rng);
    A.drawTrapSnap(ctx, 1080, 620, 1, t, rng);
    A.drawFence(ctx, 60, 420, 220, 0.9, t, rng);
    // pitchfork stuck quivering in a hay pile
    ctx.save(); ctx.translate(880, 560); ctx.rotate(0.4 + Math.sin(t * 18) * 0.02);
    A.line(ctx, 0, 0, 0, -70, 5, '#8a5a2b');
    ctx.fillStyle = '#c0c0c0'; A.poly(ctx, [[-12, -70], [-6, -96], [-2, -70]]); A.poly(ctx, [[-2, -70], [2, -98], [6, -70]]); A.poly(ctx, [[6, -70], [12, -96], [14, -70]]);
    ctx.restore();
    // wheelbarrow tipping over, pumpkins spilling out and rolling
    ctx.save(); ctx.translate(420, 600); ctx.rotate(-0.35);
    ctx.fillStyle = '#7a4a21'; A.poly(ctx, [[-50, -10], [50, -10], [38, 22], [-38, 22]]);
    ctx.fillStyle = '#3a3a3a'; A.circ(ctx, 30, 26, 12); ctx.fillStyle = '#8a8a8a'; A.circ(ctx, 30, 26, 5);
    ctx.restore();
    ctx.fillStyle = '#e67e22'; A.circ(ctx, 480, 640, 16); A.circ(ctx, 520, 650, 13);

    // the chase, left to right: Hank lunging, Biscuit leaping, Gobble sprinting with burst
    A.drawFarmerLunge(ctx, 300, 560, 1.15, t, rng);
    speech(ctx, '"Come back here, dinner!"', 180, 430, 250);
    A.drawDogLeap(ctx, 470, 520, 1.05, t, rng);
    A.drawTurkeySprint(ctx, 640, 540, 1.25, t, rng, true); // burst drawn by the turkey itself
    speech(ctx, '"Not today, Hank!"', 520, 350, 190);
    // wooden sign with the burst word, in the field
    A.pill(ctx, 830, 560, 150, 44, 6, '#8a5a2b'); A.pill(ctx, 836, 565, 138, 34, 4, '#c98a3d');
    A.txt(ctx, 'FEATHER BURST!', 905, 588, 15, '#fff', 'center', 'bold');
    // corn popping as Gobble runs through it
    A.drawCornPop(ctx, 700, 600, 1, t, rng);
    A.drawCornPop(ctx, 940, 640, 1, t, rng);
    // flock scattering through the scene, wings up
    A.drawChickenScatter(ctx, 240, 380, 1, t, rng, '#f5f0e6', -1);
    A.drawChickenScatter(ctx, 1150, 420, 1, t, rng, '#e8d27a', 1);
    A.drawChickenScatter(ctx, 980, 180, 0.9, t, rng, '#fff', 1);
    A.drawGusHonk(ctx, 1060, 250, 1, t, rng);
    A.drawDuckPeek(ctx, 90, 330, 1, t, rng);
    A.drawPigTrip(ctx, 340, 660, 1.05, t, rng);
    A.drawHenriettaPoint(ctx, 1220, 330, 0.95, t, rng);
    speech(ctx, '"Flap like you mean it!"', 1010, 300, 200);
    // event banner on the fence + route strip along the bottom
    A.pill(ctx, 950, 130, 260, 40, 6, '#8a5a2b'); A.pill(ctx, 956, 135, 248, 30, 4, '#2e7d32');
    A.txt(ctx, 'HARVEST FESTIVAL — bonus corn!', 1080, 155, 14, '#fff', 'center', 'bold');
    paintPickups(ctx, st, rng, t, groundY);
    // route strip: all 7 legs, current highlighted
    darkPill(ctx, 330, 668, 620, 38);
    for (var li = 0; li < 7; li++) {
      var rx = 350 + li * 86;
      ctx.fillStyle = li < st.leg ? '#2e9e4f' : li === st.leg ? '#ffd23f' : 'rgba(255,255,255,0.3)';
      A.circ(ctx, rx, 687, 11);
      A.txt(ctx, String(li + 1), rx, 691, 12, li === st.leg ? '#1a1a1a' : '#fff', 'center', 'bold');
      if (li < 6) A.line(ctx, rx + 12, 687, rx + 74, 687, 3, 'rgba(255,255,255,0.5)');
    }
    paintHud(ctx, st, t);
  }

  // ---- BARN (leg 4): Marge stirring, Hank grabbing, chicken flapping off the table ----
  function paintBarn(ctx, st, t, rng) {
    var leg = LEGS[3];
    // barn interior fills the frame: plank walls covered with hanging things
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    for (var px = 0; px < W; px += 64) ctx.fillRect(px, 0, 4, H);
    // hanging utensils at angles, as if shaken by the chase
    var utens = ['#c0c0c0', '#e8c96a', '#8a5a2b', '#c0c0c0', '#d9a83c'];
    for (var u = 0; u < 14; u++) {
      var ux = 40 + u * 88, tilt = (rng() - 0.5) * 0.5;
      ctx.save(); ctx.translate(ux, 120); ctx.rotate(tilt);
      ctx.fillStyle = utens[u % 5]; A.pill(ctx, -6, 0, 12, 44, 4, utens[u % 5]);
      A.circ(ctx, 0, 52, 12); ctx.restore();
    }
    // sacks, barrels, lantern, cobwebs, window with a yard view
    ctx.fillStyle = '#d9c9a0'; A.pill(ctx, 40, 560, 90, 90, 10, '#d9c9a0'); A.pill(ctx, 140, 580, 80, 70, 10, '#c9b98a');
    ctx.fillStyle = '#6b4423'; A.pill(ctx, 1060, 540, 70, 110, 8, '#6b4423'); A.pill(ctx, 1140, 560, 60, 90, 8, '#7a5230');
    ctx.fillStyle = '#ffd23f'; A.circ(ctx, 640, 110, 16); ctx.fillStyle = '#7a4a21'; A.pill(ctx, 632, 96, 16, 30, 4, '#7a4a21');
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(70, 60); ctx.moveTo(70, 0); ctx.lineTo(0, 60); ctx.stroke();
    ctx.fillStyle = '#9fd8ff'; A.pill(ctx, 980, 90, 180, 130, 8, '#9fd8ff');
    ctx.fillStyle = '#7a9a4d'; A.pill(ctx, 980, 170, 180, 50, 4, '#7a9a4d');
    ctx.fillStyle = '#ffd23f'; A.circ(ctx, 1030, 120, 16);
    // floor with hay + straw
    ctx.fillStyle = '#a08050'; ctx.fillRect(0, 560, W, 160);
    ctx.fillStyle = '#d9a83c';
    for (var s2 = 0; s2 < 40; s2++) A.line(ctx, rng() * W, 570 + rng() * 130, rng() * W + 20, 575 + rng() * 130, 2, '#d9a83c');
    // oven glowing, fire flickering, embers floating, heat shimmer
    var fl = Math.sin(t * 11) * 6;
    ctx.fillStyle = '#3a3a3a'; A.pill(ctx, 180, 300, 260, 260, 12, '#3a3a3a');
    ctx.fillStyle = '#ff7a2a'; A.pill(ctx, 220, 380, 180, 130, 10, '#ff7a2a');
    ctx.fillStyle = '#ffd23f'; A.poly(ctx, [[250, 500], [280 + fl, 420], [310, 500]]);
    ctx.fillStyle = '#ff5d2a'; A.poly(ctx, [[280, 500], [305 - fl, 430], [330, 500]]);
    ctx.fillStyle = '#fff3c4'; A.poly(ctx, [[295, 500], [310, 450], [325, 500]]);
    ctx.save(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffb347'; ctx.lineWidth = 3;
    for (var w2 = 0; w2 < 4; w2++) {
      ctx.beginPath(); ctx.moveTo(240 + w2 * 40, 360);
      ctx.bezierCurveTo(230 + w2 * 40, 300, 260 + w2 * 40, 280, 245 + w2 * 40, 230); ctx.stroke();
    }
    ctx.restore();
    for (var e = 0; e < 10; e++) {
      ctx.fillStyle = '#ff8c42'; A.circ(ctx, 240 + rng() * 140, 360 - ((t * 40 + e * 23) % 140), 3);
    }
    ctx.fillStyle = 'rgba(255,140,60,0.25)'; A.ell(ctx, 310, 570, 220, 26);
    // second stove + chimney
    ctx.fillStyle = '#4a4a4a'; A.pill(ctx, 480, 380, 120, 180, 8, '#4a4a4a');
    ctx.fillStyle = '#ff7a2a'; A.pill(ctx, 500, 420, 80, 60, 6, '#ff7a2a');
    // Marge stirring at the table, knife raised — big, centre-frame
    A.drawMargeStir(ctx, 700, 420, 1.3, t, rng);
    // hay bale stacks + sack pile fill the left floor
    A.drawHayRoll(ctx, 90, 600, 1.1, t, rng);
    ctx.fillStyle = '#d9c9a0'; A.pill(ctx, 30, 500, 80, 70, 10, '#d9c9a0');
    ctx.fillStyle = '#c9b98a'; A.pill(ctx, 100, 520, 70, 50, 10, '#c9b98a');
    speech(ctx, '"The oven\'s already hot, birdie!"', 620, 250, 300);
    // table with a chicken FLAPPING off it + pot lid spinning in the air
    ctx.fillStyle = '#7a4a21'; A.pill(ctx, 820, 520, 300, 22, 6, '#7a4a21');
    ctx.fillStyle = '#5a3a1a'; A.pill(ctx, 840, 542, 14, 90, 4, '#5a3a1a'); A.pill(ctx, 1080, 542, 14, 90, 4, '#5a3a1a');
    A.drawChickenScatter(ctx, 900, 480, 1.1, t, rng, '#f5f0e6', 1);
    ctx.save(); ctx.translate(1020, 420 + Math.sin(t * 7) * 8); ctx.rotate(t * 5);
    ctx.fillStyle = '#c0c0c0'; A.circ(ctx, 0, 0, 22); ctx.fillStyle = '#8a8a8a'; A.circ(ctx, 0, 0, 8); ctx.restore();
    // Hank grabbing at the chicken, Biscuit leaping after Gobble
    A.drawFarmerLunge(ctx, 560, 560, 1.05, t, rng);
    A.drawDogLeap(ctx, 1120, 560, 0.9, t, rng);
    // Gobble sprinting past a hay bale
    A.drawHayRoll(ctx, 160, 640, 0.95, t, rng);
    A.drawTurkeySprint(ctx, 830, 630, 1.1, t, rng, false);
    A.drawCornPop(ctx, 1040, 640, 1, t, rng);
    // knife quivering in the wall + a second knife spinning over the table
    A.drawKnifeQuiver(ctx, 1220, 240, 1.1, t, rng);
    A.drawKnifeFlying(ctx, 860, 300, 0.9, t, rng);
    // mouse watching from a sack, birds in the rafters
    ctx.fillStyle = '#9a9a9a'; A.ell(ctx, 90, 540, 12, 7); A.circ(ctx, 100, 534, 6);
    ctx.strokeStyle = '#3a2c1c'; ctx.lineWidth = 2;
    for (var b2 = 0; b2 < 4; b2++) { var bx2 = 300 + b2 * 40; ctx.beginPath(); ctx.moveTo(bx2 - 8, 60); ctx.quadraticCurveTo(bx2, 54, bx2 + 8, 60); ctx.stroke(); }
    // corn pickups across the floor
    for (var c2 = 0; c2 < 12; c2++) A.drawPickup(ctx, c2 % 3 ? 'corn' : 'gold', 60 + c2 * 100, 660 + (c2 % 2) * 30, 1, t);
    // event sign on the wall
    A.pill(ctx, 480, 90, 320, 44, 6, '#8a5a2b'); A.pill(ctx, 486, 95, 308, 34, 4, '#c0392b');
    A.txt(ctx, 'FEED-TIME RUSH — Hank runs double speed!', 640, 118, 14, '#fff', 'center', 'bold');
    paintHud(ctx, st, t);
  }

  // ---- TITLE: the flock MID-RUN in a chase line, not a portrait row ----
  function paintTitle(ctx, st, t, rng) {
    var leg = LEGS[0], skyH = 100, groundY = 430;
    A.paintSky(ctx, W, H, skyH, leg, rng, t);
    ctx.fillStyle = '#a03a2a'; A.pill(ctx, 80, 170, 130, 100, 6, '#a03a2a');
    ctx.fillStyle = '#7a2a1a'; A.poly(ctx, [[70, 172], [145, 120], [220, 172]]);
    A.drawFence(ctx, 700, 300, 420, 1, t, rng);
    paintCornRows(ctx, rng, t, groundY);
    A.drawChickenScatter(ctx, 320, 320, 0.95, t, rng, '#fff', 1);
    A.drawChickenScatter(ctx, 1050, 300, 0.95, t, rng, '#f5f0e6', -1);
    A.paintGround(ctx, W, H, groundY, leg, rng, t);
    A.skidMarks(ctx, 500, 620, 8, rng);
    // the chase line across the middle: Gobble sprinting, Hank lunging, Biscuit leaping,
    // chickens scattering, Marge running from the barn door with knife raised, Percy tripping
    A.drawTurkeySprint(ctx, 620, 560, 1.3, t, rng, false);
    A.drawFarmerLunge(ctx, 380, 570, 1.15, t, rng);
    A.drawDogLeap(ctx, 500, 520, 1, t, rng);
    A.drawChickenScatter(ctx, 820, 540, 1, t, rng, '#f5f0e6', 1);
    A.drawChickenScatter(ctx, 940, 500, 0.95, t, rng, '#e8d27a', -1);
    A.drawGusHonk(ctx, 1060, 520, 1, t, rng);
    A.drawPigTrip(ctx, 180, 640, 1, t, rng);
    A.drawDuckPeek(ctx, 640, 340, 0.95, t, rng);
    // Marge running from the barn door, knife raised, apron flapping
    ctx.save(); ctx.translate(380, 310); ctx.rotate(0.15);
    ctx.fillStyle = '#5a6b8a'; A.ell(ctx, 0, 0, 22, 30);
    ctx.fillStyle = '#f5f0e6'; A.pill(ctx, -14, -16, 28, 36, 6, '#f5f0e6');
    ctx.fillStyle = '#e8b88a'; A.circ(ctx, 4, -40, 12);
    ctx.fillStyle = '#e4572e'; A.poly(ctx, [[-8, -50], [16, -50], [12, -42], [-4, -42]]);
    ctx.strokeStyle = '#e8b88a'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(14, -14); ctx.lineTo(34, -38); ctx.stroke();
    ctx.save(); ctx.translate(38, -48); ctx.rotate(0.6);
    ctx.fillStyle = '#e8eef2'; A.poly(ctx, [[-3, -16], [3, -16], [5, 2], [0, 5], [-5, 2]]);
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(-10, 22); ctx.lineTo(-26, 44); ctx.moveTo(10, 22); ctx.lineTo(26, 42); ctx.stroke();
    ctx.restore();
    // big title above the action
    A.txtStroke(ctx, "GOBBLE'S GREAT ESCAPE", 640, 130, 64, '#ffd23f', '#5a2d12', 'center', 'bold');
    A.txtStroke(ctx, 'Seven fences to freedom — outrun Thanksgiving!', 640, 168, 22, '#fff', '#5a2d12', 'center', 'bold');
    // legs on a wooden signpost, saves on a fence board, controls on a plank
    A.pill(ctx, 24, 190, 300, 250, 10, '#8a5a2b'); A.pill(ctx, 32, 198, 284, 234, 6, '#c98a3d');
    A.txt(ctx, 'THE 7 LEGS', 174, 224, 16, '#fff', 'center', 'bold');
    for (var li = 0; li < 7; li++) {
      A.txt(ctx, (li + 1) + '. ' + LEGS[li].name, 48, 250 + li * 26, 15, li === 0 ? '#ffd23f' : '#fff', 'left', 'bold');
    }
    darkPill(ctx, 960, 190, 296, 150);
    A.txt(ctx, 'SAVE SLOTS', 1108, 216, 15, '#ffd23f', 'center', 'bold');
    for (var si = 0; si < 3; si++) {
      A.txt(ctx, 'SLOT ' + (si + 1) + ' — ' + (st.saves[si] ? 'Leg ' + st.saves[si].legsCleared + '  ' + st.saves[si].corn + ' corn' : 'EMPTY'), 976, 244 + si * 30, 14, '#fff', 'left', 'bold');
    }
    darkPill(ctx, 960, 352, 296, 88);
    A.txt(ctx, 'ARROWS / WASD run + jump', 976, 380, 14, '#fff', 'left', 'bold');
    A.txt(ctx, 'SPACE gobble   SHIFT feather burst', 976, 404, 14, '#fff', 'left', 'bold');
    A.txt(ctx, 'P pause   M mute   CLICK the buttons', 976, 428, 14, '#fff', 'left', 'bold');
    A.txtStroke(ctx, 'PRESS ENTER TO RUN', 640, 700, 26, '#fff', '#5a2d12', 'center', 'bold');
    // cast strip along the bottom: names + quotes, mid-run poses behind the text
    darkPill(ctx, 24, 452, 1232, 40);
    A.txt(ctx, 'Gobble "Not today, Hank!"   Hank "Come back here, dinner!"   Henrietta "Flap like you mean it!"   Gus "HONK! Knife!"', 640, 478, 14, '#ffe9a8', 'center', 'bold');
  }

  // ---- MAP: farm route with all 7 fences + the whole flock ----
  function paintMap(ctx, st, t, rng) {
    var leg = LEGS[st.leg];
    A.paintSky(ctx, W, H, 96, leg, rng, t);
    A.paintGround(ctx, W, H, 380, leg, rng, t);
    A.txtStroke(ctx, 'THE FARM — SEVEN FENCES TO FREEDOM', 640, 60, 34, '#ffd23f', '#5a2d12', 'center', 'bold');
    // winding route with fences
    ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(90, 620);
    ctx.bezierCurveTo(300, 420, 500, 620, 700, 460);
    ctx.bezierCurveTo(900, 320, 1050, 520, 1190, 360); ctx.stroke();
    for (var li = 0; li < 7; li++) {
      var fx = 110 + li * 175, fy = li % 2 ? 520 : 430;
      if (li === 3) fy = 480; if (li === 6) fy = 380;
      A.drawFence(ctx, fx - 40, fy, 80, 0.8, t, rng);
      ctx.fillStyle = li < st.legsCleared ? '#2e9e4f' : li === st.legsCleared ? '#ffd23f' : 'rgba(255,255,255,0.35)';
      A.circ(ctx, fx, fy - 30, 18);
      A.txt(ctx, String(li + 1), fx, fy - 25, 15, li === st.legsCleared ? '#1a1a1a' : '#fff', 'center', 'bold');
      A.txt(ctx, LEGS[li].name, fx, fy + 56, 13, '#fff', 'center', 'bold');
      A.txt(ctx, li < st.legsCleared ? 'CLEARED' : li === st.legsCleared ? 'NEXT — CLICK TO RUN' : 'LOCKED', fx, fy + 74, 11, '#ffe9a8', 'center', 'bold');
    }
    // flock members with quotes, spread across the map
    var spots = [[200, 180], [460, 150], [720, 200], [980, 150], [1150, 260], [120, 300], [600, 300], [880, 300]];
    for (var ci = 0; ci < 8; ci++) {
      var sx = spots[ci][0], sy = spots[ci][1];
      if (ci === 0) A.drawTurkeySprint(ctx, sx, sy, 0.7, t, rng, false);
      else if (ci === 1) A.drawFarmerLunge(ctx, sx, sy, 0.6, t, rng);
      else if (ci === 2) A.drawDogLeap(ctx, sx, sy, 0.6, t, rng);
      else if (ci === 3) A.drawMargeStir(ctx, sx, sy, 0.6, t, rng);
      else if (ci === 4) A.drawHenriettaPoint(ctx, sx, sy, 0.8, t, rng);
      else if (ci === 5) A.drawGusHonk(ctx, sx, sy, 0.8, t, rng);
      else if (ci === 6) A.drawDuckPeek(ctx, sx, sy, 0.8, t, rng);
      else A.drawPigTrip(ctx, sx, sy, 0.6, t, rng);
      darkPill(ctx, sx - 90, sy + 44, 180, 30);
      A.txt(ctx, CAST[ci][0] + ' ' + CAST[ci][2], sx, sy + 64, 11, '#fff', 'center', 'bold');
    }
    // run log + saves strip
    darkPill(ctx, 24, 640, 760, 56);
    A.txt(ctx, 'CORN ' + st.corn + '   BEST ' + st.bestScore + '   LEGS CLEARED ' + st.legsCleared + '/7   ' + (st.maple ? 'Auntie Maple\'s blessing!' : 'Find Auntie Maple on leg 3'), 40, 674, 15, '#fff', 'left', 'bold');
    darkPill(ctx, 800, 640, 456, 56);
    A.txt(ctx, '[SHOP] buy upgrades    [SAVE] slot 1    [ENTER] run leg ' + (st.legsCleared + 1), 816, 674, 15, '#ffd23f', 'left', 'bold');
  }

  var UPGRADES = [
    ['Wing Boots', '+speed when sprinting', 40], ['Corn Magnet', 'pickups fly to you', 50],
    ['Feather Pouch', '+1 Feather Burst charge', 60], ['Gobble Horn', 'longer Hank stun', 55],
    ['Sturdy Legs', 'survive one extra hit', 70], ['Lucky Clover', '+1 life', 90],
    ['Quiet Steps', 'Hank runs slower', 65], ['Warm Scarf', 'oven heat resist', 45]
  ];

  // ---- SHOP: 8 upgrades + flock mid-gesture + route map + saves ----
  function paintShop(ctx, st, t, rng) {
    var leg = LEGS[1];
    A.paintSky(ctx, W, H, 90, leg, rng, t);
    A.paintGround(ctx, W, H, 420, leg, rng, t);
    A.txtStroke(ctx, 'FARM SHOP — SPEND YOUR CORN', 640, 60, 34, '#ffd23f', '#5a2d12', 'center', 'bold');
    darkPill(ctx, 460, 76, 360, 40);
    A.txt(ctx, 'CORN BALANCE: ' + st.corn, 640, 104, 20, '#ffd23f', 'center', 'bold');
    // 8 upgrade cards in a row of 4 x 2
    for (var i = 0; i < 8; i++) {
      var cx = 40 + (i % 4) * 310, cy = 130 + Math.floor(i / 4) * 170;
      var owned = st.upgrades.indexOf(i) !== -1;
      A.pill(ctx, cx, cy, 290, 150, 12, owned ? '#2e7d32' : '#8a5a2b');
      A.pill(ctx, cx + 6, cy + 6, 278, 138, 8, owned ? '#3a9e4f' : '#c98a3d');
      A.txt(ctx, UPGRADES[i][0], cx + 145, cy + 34, 18, '#fff', 'center', 'bold');
      A.txt(ctx, UPGRADES[i][1], cx + 145, cy + 62, 13, '#ffe9a8', 'center', 'bold');
      // little drawn icon per card
      ctx.save(); ctx.translate(cx + 40, cy + 100);
      if (i === 0) { ctx.fillStyle = '#5a2d12'; A.pill(ctx, -16, -8, 32, 16, 6, '#5a2d12'); }
      else if (i === 1) { ctx.fillStyle = '#d92038'; A.circ(ctx, 0, 0, 10); ctx.fillStyle = '#fff'; A.circ(ctx, 0, 0, 4); }
      else if (i === 2) { ctx.fillStyle = '#fff'; A.ell(ctx, 0, 0, 14, 6); }
      else if (i === 3) { ctx.fillStyle = '#ffd23f'; A.poly(ctx, [[-12, 8], [12, 8], [0, -12]]); }
      else if (i === 4) { ctx.strokeStyle = '#5a2d12'; ctx.lineWidth = 5; A.line(ctx, -10, 10, 10, -10, 5, '#5a2d12'); }
      else if (i === 5) { ctx.fillStyle = '#2e9e4f'; A.circ(ctx, -5, -3, 6); A.circ(ctx, 5, -3, 6); A.circ(ctx, -5, 5, 6); A.circ(ctx, 5, 5, 6); }
      else if (i === 6) { ctx.fillStyle = '#e8e0cc'; A.ell(ctx, 0, 0, 12, 6); }
      else { ctx.fillStyle = '#d92038'; A.pill(ctx, -14, -6, 28, 14, 6, '#d92038'); }
      ctx.restore();
      A.txt(ctx, owned ? 'OWNED' : UPGRADES[i][2] + ' corn — CLICK TO BUY', cx + 145, cy + 128, 14, owned ? '#fff' : '#ffd23f', 'center', 'bold');
    }
    // flock advice, mid-gesture: Henrietta pointing at the Wing Boots card, Gus honking, Percy nodding
    darkPill(ctx, 24, 480, 600, 120);
    A.drawHenriettaPoint(ctx, 70, 528, 0.8, t, rng);
    A.txt(ctx, 'Henrietta: "Wing Boots first — speed saves feathers!"', 140, 520, 15, '#fff', 'left', 'bold');
    A.drawGusHonk(ctx, 70, 582, 0.7, t, rng);
    A.txt(ctx, 'Gus: "HONK! The knife is coming — buy the horn!"', 140, 560, 15, '#fff', 'left', 'bold');
    A.drawPigTrip(ctx, 540, 580, 0.5, t, rng);
    A.txt(ctx, 'Percy nods along, mid-nod.', 140, 590, 13, '#ffe9a8', 'left', 'bold');
    // Marge mid-counting coins, coins mid-toss
    darkPill(ctx, 640, 480, 616, 120);
    A.drawMargeStir(ctx, 700, 540, 0.8, t, rng);
    A.txt(ctx, 'Marge counts your corn — coins mid-toss!', 760, 520, 15, '#fff', 'left', 'bold');
    for (var co = 0; co < 5; co++) {
      ctx.fillStyle = '#ffd23f'; A.circ(ctx, 900 + co * 34, 532 - Math.abs(Math.sin(t * 4 + co)) * 14, 9);
      ctx.fillStyle = '#fff3c4'; A.circ(ctx, 898 + co * 34, 530 - Math.abs(Math.sin(t * 4 + co)) * 14, 3);
    }
    A.txt(ctx, 'Every coin honest. Every feather earned.', 760, 560, 13, '#ffe9a8', 'left', 'bold');
    A.txt(ctx, 'SAVE SLOTS: ' + st.saves.map(function (s, i) { return (i + 1) + ':' + (s ? s.corn + 'c' : 'empty'); }).join('  '), 760, 586, 13, '#fff', 'left', 'bold');
    // route map strip
    darkPill(ctx, 24, 616, 1232, 80);
    for (var li2 = 0; li2 < 7; li2++) {
      var rx2 = 90 + li2 * 170;
      ctx.fillStyle = li2 < st.legsCleared ? '#2e9e4f' : li2 === st.legsCleared ? '#ffd23f' : 'rgba(255,255,255,0.3)';
      A.circ(ctx, rx2, 648, 12);
      A.txt(ctx, (li2 + 1) + ' ' + LEGS[li2].name, rx2, 678, 12, '#fff', 'center', 'bold');
      if (li2 < 6) A.line(ctx, rx2 + 14, 648, rx2 + 156, 648, 3, 'rgba(255,255,255,0.5)');
    }
    A.txt(ctx, '[BACK TO MAP]   [RUN NEXT LEG]', 640, 640, 13, '#ffd23f', 'center', 'bold');
  }

  // ---- RESULTS: flock cheering mid-jump, Gobble mid-victory-flap, confetti falling ----
  function paintResults(ctx, st, t, rng) {
    var leg = LEGS[st.leg];
    A.paintSky(ctx, W, H, 110, leg, rng, t);
    A.paintGround(ctx, W, H, 430, leg, rng, t);
    // confetti + feathers falling
    for (var i = 0; i < 40; i++) {
      var fx = (i * 37 + t * 30) % W, fy = (i * 53 + t * 90) % 420;
      ctx.fillStyle = ['#ff5d8f', '#ffd23f', '#2e9e4f', '#2e86de', '#fff'][i % 5];
      ctx.save(); ctx.translate(fx, fy); ctx.rotate(i + t); A.pill(ctx, -5, -3, 10, 6, 2, ctx.fillStyle); ctx.restore();
    }
    A.txtStroke(ctx, 'LEG ' + (st.leg + 1) + ' CLEAR — ' + st.grade + ' GRADE!', 640, 90, 44, '#ffd23f', '#5a2d12', 'center', 'bold');
    // cheering flock mid-jump
    A.drawChickenScatter(ctx, 180, 380, 1.1, t, rng, '#f5f0e6', 1);
    A.drawChickenScatter(ctx, 1100, 380, 1.1, t, rng, '#e8d27a', -1);
    A.drawGusHonk(ctx, 300, 400, 1, t, rng);
    A.drawHenriettaPoint(ctx, 980, 400, 1, t, rng);
    A.drawTurkeySprint(ctx, 640, 400, 1.2, t, rng, false);
    A.txt(ctx, '"Not today, Hank!"', 640, 320, 16, '#fff', 'center', 'bold');
    // results panel + per-leg bar chart
    darkPill(ctx, 340, 470, 600, 210);
    A.txt(ctx, 'SCORE ' + st.score + '    CORN +' + st.legCorn + '    BEST COMBO x' + st.bestCombo, 640, 506, 18, '#fff', 'center', 'bold');
    A.txt(ctx, 'GRADE ' + st.grade + ' — ' + (st.grade === 'S' ? 'Flawless escape!' : st.grade === 'A' ? 'Fast feathers!' : st.grade === 'B' ? 'A close one!' : 'Made it — barely!'), 640, 536, 16, '#ffd23f', 'center', 'bold');
    var max = 1; for (var k = 0; k < st.legScores.length; k++) max = Math.max(max, st.legScores[k]);
    for (var b = 0; b < st.legScores.length; b++) {
      var bx = 380 + b * 78, bh = Math.max(6, 70 * st.legScores[b] / max);
      ctx.fillStyle = b === st.leg ? '#ffd23f' : '#2e9e4f';
      A.pill(ctx, bx, 620 - bh, 54, bh, 4, ctx.fillStyle);
      A.txt(ctx, 'L' + (b + 1), bx + 27, 640, 12, '#fff', 'center', 'bold');
    }
    A.txt(ctx, 'FEATS: ' + st.feats.join('  •  '), 640, 668, 13, '#ffe9a8', 'center', 'bold');
    A.txtStroke(ctx, '[NEXT LEG]   [SHOP]   [MAP]', 640, 706, 18, '#fff', '#5a2d12', 'center', 'bold');
  }

  // ---- CAUGHT: Hank mid-grab with the turkey in his arms, Marge mid-reach, oven door mid-swing ----
  function paintCaught(ctx, st, t, rng) {
    var leg = LEGS[3];
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#3a3a3a'; A.pill(ctx, 880, 240, 320, 340, 12, '#3a3a3a');
    ctx.fillStyle = '#ff7a2a'; A.pill(ctx, 920, 330, 240, 160, 10, '#ff7a2a');
    ctx.fillStyle = '#ffd23f'; A.poly(ctx, [[960, 480], [990, 400], [1020, 480]]);
    // oven door mid-swing
    ctx.save(); ctx.translate(920, 330); ctx.rotate(0.5 + Math.sin(t * 3) * 0.08);
    ctx.fillStyle = '#2a2a2a'; A.pill(ctx, 0, 0, 120, 150, 8, '#2a2a2a'); ctx.restore();
    A.txtStroke(ctx, 'ON THE MENU…', 640, 110, 56, '#ff8c42', '#3a1a10', 'center', 'bold');
    A.txt(ctx, 'Hank got you on leg ' + (st.leg + 1) + ' — ' + st.caughtReason, 640, 150, 20, '#fff', 'center', 'bold');
    // Hank mid-grab, turkey tucked under his arm, Marge mid-reach
    A.drawFarmerLunge(ctx, 480, 480, 1.3, t, rng);
    ctx.save(); ctx.translate(540, 400); ctx.rotate(0.4);
    ctx.fillStyle = '#6b4423'; A.ell(ctx, 0, 0, 26, 18);
    ctx.fillStyle = '#8d5a2b'; A.circ(ctx, 22, -10, 10);
    ctx.restore();
    A.drawMargeStir(ctx, 760, 460, 1.2, t, rng);
    A.drawDogLeap(ctx, 300, 560, 0.9, t, rng);
    darkPill(ctx, 340, 600, 600, 80);
    A.txt(ctx, 'TOTAL SCORE ' + st.score + '   CORN ' + st.corn + '   LEGS ' + st.legsCleared + '/7', 640, 632, 18, '#fff', 'center', 'bold');
    A.txt(ctx, '[RETRY LEG]   [BACK TO MAP]   [RESTART]', 640, 662, 16, '#ffd23f', 'center', 'bold');
  }

  // ---- ESCAPED: Gobble mid-leap through the golden gate, flock mid-cheer ----
  function paintEscaped(ctx, st, t, rng) {
    var leg = LEGS[6];
    A.paintSky(ctx, W, H, 120, leg, rng, t);
    A.paintGround(ctx, W, H, 430, leg, rng, t);
    // golden gate
    ctx.fillStyle = '#ffd23f'; A.pill(ctx, 480, 180, 30, 260, 6, '#ffd23f'); A.pill(ctx, 770, 180, 30, 260, 6, '#ffd23f');
    ctx.fillStyle = '#ff9a3c'; A.pill(ctx, 460, 170, 360, 26, 10, '#ff9a3c');
    A.txt(ctx, 'WILD WOODS', 640, 194, 20, '#fff', 'center', 'bold');
    ctx.fillStyle = '#2e7d32';
    for (var tx = 0; tx < W; tx += 40) A.poly(ctx, [[tx, 440], [tx + 20, 330], [tx + 40, 440]]);
    A.txtStroke(ctx, 'FREE! The Wild Woods welcome you.', 640, 110, 44, '#ffd23f', '#5a2d12', 'center', 'bold');
    A.txt(ctx, 'Gobble outran all seven fences — Thanksgiving can wait!', 640, 150, 19, '#fff', 'center', 'bold');
    A.drawTurkeySprint(ctx, 640, 380, 1.4, t, rng, true);
    A.drawChickenScatter(ctx, 240, 520, 1.1, t, rng, '#f5f0e6', 1);
    A.drawChickenScatter(ctx, 1040, 520, 1.1, t, rng, '#e8d27a', -1);
    A.drawGusHonk(ctx, 360, 540, 1, t, rng);
    A.drawHenriettaPoint(ctx, 920, 540, 1, t, rng);
    A.drawDuckPeek(ctx, 120, 480, 0.9, t, rng);
    A.drawPigTrip(ctx, 1160, 600, 0.9, t, rng);
    darkPill(ctx, 340, 600, 600, 90);
    A.txt(ctx, 'FINAL SCORE ' + st.score + '   GRADE ' + st.grade + '   CORN ' + st.corn, 640, 634, 18, '#fff', 'center', 'bold');
    A.txt(ctx, 'FEATS: ' + st.feats.join('  •  '), 640, 664, 14, '#ffe9a8', 'center', 'bold');
    A.txtStroke(ctx, '[PLAY AGAIN]   [MAP]', 640, 712, 18, '#fff', '#5a2d12', 'center', 'bold');
  }

  function paint(ctx, st, t, seed) {
    var rng = A.makeRng(seed == null ? 1337 : seed);
    ctx.clearRect(0, 0, W, H);
    if (st.screen === 'title') paintTitle(ctx, st, t, rng);
    else if (st.screen === 'map') paintMap(ctx, st, t, rng);
    else if (st.screen === 'shop') paintShop(ctx, st, t, rng);
    else if (st.screen === 'play') paintPlay(ctx, st, t, rng);
    else if (st.screen === 'barn') paintBarn(ctx, st, t, rng);
    else if (st.screen === 'results') paintResults(ctx, st, t, rng);
    else if (st.screen === 'caught') paintCaught(ctx, st, t, rng);
    else if (st.screen === 'escaped') paintEscaped(ctx, st, t, rng);
    else paintTitle(ctx, st, t, rng);
  }

  window.GOBBLE_RENDER = { paint: paint, paintHud: paintHud, LEGS: LEGS, CAST: CAST, UPGRADES: UPGRADES, W: W, H: H };
})();
