// game.js — state, mechanics, input, audio and the loop for Gobble's Great Escape.
// Gobble runs 7 farm legs to the Wild Woods while Farmer Hank, Biscuit and Cook
// Marge chase him. Feather Burst sheds a decoy; Gobble Stun freezes Hank.
(function () {
  'use strict';
  var R = window.GOBBLE_RENDER;
  var LEGS = R.LEGS, UPGRADES = R.UPGRADES;

  var EVENTS = [
    { name: 'HARVEST FESTIVAL', desc: 'flock cheers, bonus corn', cornMul: 2, hankMul: 1 },
    { name: 'FEED-TIME RUSH', desc: 'Hank runs double speed', cornMul: 1, hankMul: 2 },
    { name: 'RAIN SHOWER', desc: 'slippery, corn x2', cornMul: 2, hankMul: 1 },
    { name: 'FOGGY DAWN', desc: 'knife glints shine', cornMul: 1, hankMul: 1 }
  ];

  function freshState() {
    return {
      screen: 'title', leg: 0, legsCleared: 0, score: 0, bestScore: 0,
      corn: 120, legCorn: 0, distance: 0, lives: 3, combo: 1, bestCombo: 1,
      farmerDist: 62, burst: 2, burstMax: 2, gobble: 100, gobbleReady: true,
      event: 'HARVEST FESTIVAL', eventIdx: 0, upgrades: [], saves: [null, null, null],
      legScores: [], grade: 'B', feats: ['First flap'], caughtReason: '',
      maple: false, muted: false, paused: false, runT: 0, legLen: 900,
      hits: 0, stuns: 0, bursts: 0
    };
  }

  var st = freshState();
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var startT = Date.now();
  var shotMode = null;

  // ---------- audio: tiny WebAudio synth, no files ----------
  var AC = null;
  function audio() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
    return AC;
  }
  function beep(freq, dur, type, vol, slide) {
    if (st.muted) return;
    var ac = audio(); if (!ac) return;
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, ac.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, ac.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.12, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + dur);
  }
  var SFX = {
    gobble: function () { beep(300, 0.12, 'square', 0.14, 180); setTimeout(function () { beep(340, 0.12, 'square', 0.14, 200); }, 110); },
    coin: function () { beep(880, 0.09, 'sine', 0.1, 1320); },
    burst: function () { beep(220, 0.25, 'sawtooth', 0.12, 880); },
    hit: function () { beep(160, 0.2, 'sawtooth', 0.16, 60); },
    stun: function () { beep(520, 0.15, 'triangle', 0.12, 780); },
    step: function () { beep(140, 0.05, 'triangle', 0.05); },
    cheer: function () { [523, 659, 784].forEach(function (f, i) { setTimeout(function () { beep(f, 0.18, 'triangle', 0.12); }, i * 90); }); }
  };
  var themeTimer = null;
  function startTheme() {
    if (themeTimer || st.muted) return;
    var notes = [523, 587, 659, 784, 659, 587, 523, 440], i = 0;
    themeTimer = setInterval(function () {
      if (st.screen !== 'title' && st.screen !== 'map' && st.screen !== 'shop') return;
      beep(notes[i % notes.length], 0.22, 'triangle', 0.05); i++;
    }, 260);
  }

  // ---------- mechanics ----------
  function gradeFor(score, hits) {
    if (hits === 0 && score >= 2400) return 'S';
    if (score >= 1600) return 'A';
    if (score >= 900) return 'B';
    return 'C';
  }
  function collectCorn(n, kind) {
    var gain = n * (EVENTS[st.eventIdx].cornMul || 1);
    st.corn += gain; st.legCorn += gain;
    st.combo = Math.min(5, st.combo + (kind === 'gold' ? 2 : 1));
    st.bestCombo = Math.max(st.bestCombo, st.combo);
    st.score += gain * 10 * st.combo;
    SFX.coin();
  }
  function featherBurst() {
    if (st.burst <= 0 || st.screen !== 'play') return false;
    st.burst--; st.bursts++;
    st.farmerDist = Math.min(100, st.farmerDist + 34);
    st.score += 150;
    SFX.burst();
    return true;
  }
  function gobbleStun() {
    if (!st.gobbleReady || st.screen !== 'play') return false;
    st.gobbleReady = false; st.gobble = 0; st.stuns++;
    st.farmerDist = Math.min(100, st.farmerDist + 22);
    SFX.stun();
    return true;
  }
  function hitHazard(kind) {
    if (st.screen !== 'play' && st.screen !== 'barn') return false;
    st.hits++; st.combo = 1;
    var resist = st.upgrades.indexOf(7) !== -1 && kind === 'oven';
    if (resist) { SFX.hit(); return 'resisted'; }
    st.lives--;
    SFX.hit();
    if (st.lives <= 0) {
      st.caughtReason = kind === 'oven' ? 'the oven got you' : kind === 'knife' ? 'the carving knife caught you' : 'a trap snapped shut';
      st.screen = 'caught';
      return 'caught';
    }
    return 'hit';
  }
  function finishLeg() {
    var ev = EVENTS[st.eventIdx];
    st.legScores[st.leg] = st.score;
    st.grade = gradeFor(st.score, st.hits);
    st.bestScore = Math.max(st.bestScore, st.score);
    if (st.grade === 'S') st.feats.push('Flawless feathers');
    if (st.bursts > 0) st.feats.push('Burst master');
    if (st.leg === 2) { st.maple = true; st.feats.push("Auntie Maple's blessing"); }
    st.legsCleared = Math.max(st.legsCleared, st.leg + 1);
    st.screen = 'results';
    SFX.cheer();
    return { grade: st.grade, score: st.score, corn: st.legCorn, bestCombo: st.bestCombo };
  }
  function startLeg(n) {
    st.leg = n; st.legCorn = 0; st.hits = 0; st.bursts = 0; st.stuns = 0;
    st.score = 0; st.distance = 0; st.runT = 0; st.combo = 1; st.lives = 3;
    st.farmerDist = 62; st.burst = st.burstMax; st.gobble = 100; st.gobbleReady = true;
    st.eventIdx = n % EVENTS.length; st.event = EVENTS[st.eventIdx].name;
    st.screen = n === 3 ? 'barn' : 'play';
    return true;
  }
  function buyUpgrade(i) {
    if (i < 0 || i >= UPGRADES.length) return false;
    if (st.upgrades.indexOf(i) !== -1) return false;
    var price = UPGRADES[i][2];
    if (st.corn < price) return false;
    st.corn -= price; st.upgrades.push(i);
    if (i === 2) st.burstMax++;
    if (i === 5) st.lives = Math.min(4, st.lives + 1);
    SFX.coin();
    return true;
  }
  function saveSlot(i) {
    if (i < 0 || i > 2) return false;
    st.saves[i] = { corn: st.corn, legsCleared: st.legsCleared, upgrades: st.upgrades.slice(), bestScore: st.bestScore, legScores: st.legScores.slice(), maple: st.maple };
    try { localStorage.setItem('gobble-save-' + i, JSON.stringify(st.saves[i])); } catch (e) {}
    return true;
  }
  function loadSlot(i) {
    var data = null;
    try { data = JSON.parse(localStorage.getItem('gobble-save-' + i)); } catch (e) {}
    if (!data && st.saves[i]) data = st.saves[i];
    if (!data) return false;
    st.corn = data.corn; st.legsCleared = data.legsCleared; st.upgrades = data.upgrades.slice();
    st.bestScore = data.bestScore; st.legScores = data.legScores.slice(); st.maple = !!data.maple;
    st.saves[i] = data;
    return true;
  }
  function show(screen) { st.screen = screen; return st.screen; }
  function forceCaught() {
    st.lives = 0; st.caughtReason = 'Hank grabbed you at the fence';
    st.screen = 'caught'; return true;
  }
  function escapeLeg7() {
    st.leg = 6; st.score = Math.max(st.score, 3200); st.grade = gradeFor(st.score, st.hits);
    st.legsCleared = 7; st.feats.push('Seven fences cleared');
    st.screen = 'escaped'; SFX.cheer(); return true;
  }
  function restart() { var keep = { corn: st.corn, upgrades: st.upgrades, saves: st.saves, bestScore: st.bestScore }; st = freshState(); st.corn = keep.corn; st.upgrades = keep.upgrades; st.saves = keep.saves; st.bestScore = keep.bestScore; st.screen = 'title'; return true; }
  function tick(dt) {
    if (st.screen === 'play' || st.screen === 'barn') {
      st.runT += dt; st.distance += dt * 14 * (st.upgrades.indexOf(0) !== -1 ? 1.25 : 1);
      st.score += dt * 6;
      st.farmerDist = Math.max(8, st.farmerDist - dt * 2.2 * (EVENTS[st.eventIdx].hankMul || 1) * (st.upgrades.indexOf(6) !== -1 ? 0.7 : 1));
      if (!st.gobbleReady) { st.gobble = Math.min(100, st.gobble + dt * 40); if (st.gobble >= 100) st.gobbleReady = true; }
      if (st.farmerDist <= 8) { st.lives = 0; st.caughtReason = 'Hank caught up with you'; st.screen = 'caught'; }
      if (st.distance >= st.legLen) finishLeg();
      if (Math.floor(st.runT * 2) !== Math.floor((st.runT - dt) * 2)) SFX.step();
    }
  }

  // ---------- input: keyboard + mouse ----------
  function pressKey(code) {
    if (code === 'Enter') {
      if (st.screen === 'title') { st.screen = 'map'; startTheme(); }
      else if (st.screen === 'map') startLeg(st.legsCleared);
      else if (st.screen === 'results') { st.screen = 'map'; }
      else if (st.screen === 'caught' || st.screen === 'escaped') restart();
      return true;
    }
    if (code === 'Space') { if (st.screen === 'play' || st.screen === 'barn') return gobbleStun(); return false; }
    if (code === 'ShiftLeft' || code === 'ShiftRight') return featherBurst();
    if (code === 'KeyP') { st.paused = !st.paused; return true; }
    if (code === 'KeyM') { st.muted = !st.muted; return true; }
    if (code === 'KeyS') { st.screen = 'shop'; return true; }
    if (code === 'Escape') { st.screen = 'map'; return true; }
    if (code === 'ArrowRight' || code === 'KeyD') { if (st.screen === 'play' || st.screen === 'barn') { st.distance += 12; collectCorn(1, 'corn'); } return true; }
    if (code === 'ArrowUp' || code === 'KeyW') { if (st.screen === 'play' || st.screen === 'barn') { st.score += 25; } return true; }
    return false;
  }
  document.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown') e.preventDefault();
    pressKey(e.code);
  });
  canvas.addEventListener('click', function (e) {
    var r = canvas.getBoundingClientRect();
    var x = (e.clientX - r.left) * 1280 / r.width, y = (e.clientY - r.top) * 720 / r.height;
    clickAt(x, y);
  });
  function clickAt(x, y) {
    if (st.screen === 'title') { st.screen = 'map'; return 'map'; }
    if (st.screen === 'map') {
      if (y > 600 && x > 800) { st.screen = 'shop'; return 'shop'; }
      startLeg(Math.min(6, st.legsCleared)); return 'play';
    }
    if (st.screen === 'shop') {
      for (var i = 0; i < 8; i++) {
        var cx = 40 + (i % 4) * 310, cy = 130 + Math.floor(i / 4) * 170;
        if (x >= cx && x <= cx + 290 && y >= cy && y <= cy + 150) return buyUpgrade(i) ? 'bought-' + i : 'cannot-' + i;
      }
      if (y > 616) { st.screen = 'map'; return 'map'; }
      return 'shop';
    }
    if (st.screen === 'play' || st.screen === 'barn') {
      if (y < 56) return 'hud';
      if (x > 1000) return featherBurst() ? 'burst' : 'no-burst';
      collectCorn(1, 'corn'); return 'corn';
    }
    if (st.screen === 'results') { st.screen = 'map'; return 'map'; }
    if (st.screen === 'caught') { restart(); return 'title'; }
    if (st.screen === 'escaped') { restart(); return 'title'; }
    return st.screen;
  }

  // ---------- ?shot= staging hook: fixed seed, frozen action moment ----------
  function applyShot() {
    var q = new URLSearchParams(window.location.search);
    var shot = q.get('shot');
    if (!shot) return;
    shotMode = shot;
    document.body.classList.add('shot');
    st.corn = 240; st.score = 1840; st.legCorn = 96; st.bestCombo = 4; st.combo = 3;
    st.distance = 512; st.lives = 3; st.farmerDist = 34; st.burst = 2; st.gobble = 80;
    st.legScores = [1240, 1840, 0, 0, 0, 0, 0]; st.legsCleared = 2; st.grade = 'A';
    st.feats = ['First flap', 'Burst master', 'Corn hoarder'];
    st.upgrades = [0]; st.saves = [{ corn: 240, legsCleared: 2, upgrades: [0], bestScore: 1840, legScores: [1240, 1840], maple: false }, null, null];
    if (shot === 'play') { st.leg = 1; st.event = 'HARVEST FESTIVAL'; st.eventIdx = 0; st.screen = 'play'; }
    else if (shot === 'title') { st.screen = 'title'; }
    else if (shot === 'barn') { st.leg = 3; st.event = 'FEED-TIME RUSH'; st.eventIdx = 1; st.screen = 'barn'; }
    else if (shot === 'shop') { st.screen = 'shop'; }
    // one frozen render at a fixed action instant
    R.paint(ctx, st, 0.42, 20261127);
    document.title = 'Gobble shot:' + shot;
  }

  // ---------- loop ----------
  var last = Date.now();
  function frame() {
    var now = Date.now();
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (shotMode) { requestAnimationFrame(frame); return; }
    if (!st.paused) tick(dt);
    var t = (now - startT) / 1000;
    R.paint(ctx, st, t, 1337);
    requestAnimationFrame(frame);
  }

  // ---------- playtest API (also used by the in-game buttons) ----------
  window.GOBBLE = {
    state: function () { return JSON.parse(JSON.stringify(st)); },
    show: show, startLeg: startLeg, finishLeg: finishLeg, buyUpgrade: buyUpgrade,
    saveSlot: saveSlot, loadSlot: loadSlot, hitHazard: hitHazard, forceCaught: forceCaught,
    escapeLeg7: escapeLeg7, restart: restart, pressKey: pressKey, clickAt: clickAt,
    collectCorn: collectCorn, featherBurst: featherBurst, gobbleStun: gobbleStun,
    tick: tick, upgrades: function () { return UPGRADES.map(function (u) { return u[0]; }); },
    legs: function () { return LEGS.map(function (l) { return l.name; }); },
    shot: function () { return shotMode; }
  };

  applyShot();
  if (!shotMode) { startTheme(); requestAnimationFrame(frame); }
})();
