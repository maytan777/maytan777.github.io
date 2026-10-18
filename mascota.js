// Mascota del sitio: un robotito-monito de perfil que camina por todo el sitio
// (arriba, abajo, izquierda, derecha y en diagonal), girando para mirar hacia
// donde va. Recuerda su posición entre páginas con sessionStorage.
(function () {
  'use strict';
  if (document.getElementById('mascota')) return;
  if (!document.body) return;

  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var KEY = 'mascota-robot-v1';
  var SPEED = 82;    // px por segundo
  var PAD_X = 24;    // margen lateral (la colita y el hocico sobresalen)
  var PAD_Y = 12;    // margen inferior
  var TOP_Y = 72;    // no tapar la barra de navegación

  var frases = [
    '¡Hola! Soy el robotito de MM 👋',
    '¿Ya viste los programas TOP? 📦',
    'Ingeniería + BIM = combinación ganadora 🏗️',
    'Recuerda hidratarte 💧',
    'Dale un vistazo a mis proyectos ✨',
    '¡Mucho ánimo con ese cálculo! 🧮',
    'Descarga los programas en la pestaña Programas ⬇️',
    'Beep boop… 🤖',
    '¿Consultas? Escríbeme por WhatsApp 💬',
    'Descansar también es parte del proceso ☕'
  ];

  var el = document.createElement('div');
  el.className = 'mascota';
  el.id = 'mascota';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = [
    '<p class="mascota-bubble" id="mascota-bubble"></p>',
    '<div class="mascota-flip"><div class="mascota-bot">',
      '<span class="m-shadow"></span>',
      '<span class="m-leg m-leg--far"><span class="m-foot"></span></span>',
      '<span class="m-torso">',
        '<span class="m-tail"><span class="m-tail2"><i></i></span></span>',
        '<span class="m-body"><span class="m-panel"></span></span>',
        '<span class="m-head">',
          '<span class="m-antenna"><i></i></span>',
          '<span class="m-ear"></span>',
          '<span class="m-face"><i class="m-eye"></i></span>',
          '<span class="m-snout"><i></i></span>',
        '</span>',
        '<span class="m-arm"><i></i></span>',
      '</span>',
      '<span class="m-leg m-leg--near"><span class="m-foot"></span></span>',
    '</div></div>'
  ].join('');
  document.body.appendChild(el);

  var bubble = document.getElementById('mascota-bubble');
  var bot = el.querySelector('.mascota-bot');
  var state = { x: PAD_X, y: PAD_Y, tx: null, ty: null, walking: false, dir: 1 };
  var raf = 0;
  var lastTime = 0;
  var lastSave = 0;
  var bubbleTimer = null;
  var loopTimer = null;

  function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }
  function rect() { return bot.getBoundingClientRect(); }
  function bounds() {
    var r = rect();
    var w = r.width || 74;
    var h = r.height || 104;
    return {
      minX: PAD_X,
      maxX: Math.max(PAD_X, window.innerWidth - w - PAD_X),
      minY: PAD_Y,
      maxY: Math.max(PAD_Y, window.innerHeight - h - TOP_Y)
    };
  }
  function setPos(x, y) {
    state.x = x;
    state.y = y;
    // y se mide desde el borde inferior hacia arriba, por eso va en negativo.
    el.style.transform = 'translate(' + x + 'px,' + (-y) + 'px)';
  }
  function setFacing(dir) {
    state.dir = dir < 0 ? -1 : 1;
    el.classList.toggle('is-flipped', state.dir < 0);
  }

  function save() {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({
        x: state.x, y: state.y, tx: state.tx, ty: state.ty,
        walking: state.walking, dir: state.dir
      }));
    } catch (e) { /* modo privado o file:// sin almacenamiento */ }
  }
  function load() {
    try {
      var s = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (!s || typeof s.x !== 'number' || typeof s.y !== 'number') return null;
      return s;
    } catch (e) { return null; }
  }

  function say(text) {
    bubble.textContent = text;
    bubble.classList.remove('at-left', 'at-right', 'below');
    var r = rect();
    if (r.left < 140) bubble.classList.add('at-left');
    else if (r.right > window.innerWidth - 140) bubble.classList.add('at-right');
    if (r.top < 130) bubble.classList.add('below');
    bubble.classList.remove('show');
    void bubble.offsetWidth; // reinicia la transición
    bubble.classList.add('show');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.classList.remove('show'); }, 3600);
  }

  function gesture(cls, ms) {
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms);
  }

  function pickTarget() {
    var b = bounds();
    var tx = state.x;
    var ty = state.y;
    for (var i = 0; i < 14; i++) {
      tx = b.minX + Math.random() * (b.maxX - b.minX);
      ty = b.minY + Math.random() * (b.maxY - b.minY);
      if (Math.sqrt((tx - state.x) * (tx - state.x) + (ty - state.y) * (ty - state.y)) >= 140) break;
    }
    state.tx = tx;
    state.ty = ty;
  }

  function startWalk() {
    if (reduced || state.walking) return;
    if (state.tx === null || state.ty === null) pickTarget();
    else {
      var b = bounds();
      state.tx = clamp(state.tx, b.minX, b.maxX);
      state.ty = clamp(state.ty, b.minY, b.maxY);
    }
    if (Math.abs(state.tx - state.x) > 2) setFacing(state.tx > state.x ? 1 : -1);
    state.walking = true;
    lastTime = 0;
    el.classList.remove('is-idle');
    el.classList.add('is-walking');
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function tick(time) {
    if (!state.walking) { raf = 0; return; }
    if (!lastTime) lastTime = time;
    var dt = Math.min(64, time - lastTime);
    lastTime = time;
    var step = SPEED * (dt / 1000);
    var dx = state.tx - state.x;
    var dy = state.ty - state.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= step || dist < 1.5) {
      setPos(state.tx, state.ty);
      state.walking = false;
      raf = 0;
      lastTime = 0;
      save();
      arrive();
      return;
    }
    setPos(state.x + (dx / dist) * step, state.y + (dy / dist) * step);
    if (time - lastSave > 400) { lastSave = time; save(); }
    raf = requestAnimationFrame(tick);
  }

  function arrive() {
    el.classList.remove('is-walking');
    el.classList.add('is-idle');
    state.tx = null;
    state.ty = null;
    save();
    if (Math.random() < 0.35) say(frases[Math.floor(Math.random() * frases.length)]);
    var g = Math.random();
    if (g < 0.3) gesture('is-waving', 1600);
    else if (g < 0.5) gesture('is-jumping', 700);
    clearTimeout(loopTimer);
    loopTimer = setTimeout(function () {
      pickTarget();
      startWalk();
    }, 1800 + Math.random() * 1600);
  }

  bot.addEventListener('click', function () {
    if (!el.classList.contains('is-jumping')) gesture('is-jumping', 700);
    say(frases[Math.floor(Math.random() * frases.length)]);
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var b = bounds();
      if (state.x > b.maxX || state.x < b.minX || state.y > b.maxY || state.y < b.minY) {
        setPos(clamp(state.x, b.minX, b.maxX), clamp(state.y, b.minY, b.maxY));
      }
      save();
    }, 220);
  });
  window.addEventListener('pagehide', save);

  var saved = load();
  var b0 = bounds();
  if (saved) {
    // Continúa exactamente donde quedó en la página anterior.
    setPos(clamp(saved.x, b0.minX, b0.maxX), clamp(saved.y, b0.minY, b0.maxY));
    setFacing(saved.dir === -1 ? -1 : 1);
    el.classList.add('is-idle');
    if (!reduced && saved.walking && isFinite(saved.tx) && isFinite(saved.ty)) {
      state.tx = clamp(saved.tx, b0.minX, b0.maxX);
      state.ty = clamp(saved.ty, b0.minY, b0.maxY);
      startWalk();
    } else if (!reduced) {
      clearTimeout(loopTimer);
      loopTimer = setTimeout(arrive, 900);
    }
  } else {
    setPos(PAD_X, PAD_Y);
    setFacing(1);
    el.classList.add('is-idle');
    if (!reduced) {
      setTimeout(function () { say(frases[0]); }, 1600);
      clearTimeout(loopTimer);
      loopTimer = setTimeout(function () { pickTarget(); startWalk(); }, 700);
    }
  }
  save();
})();
