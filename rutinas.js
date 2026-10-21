/* =========================================================
   Fitness sin Dramas — Creación de rutinas (Domingo, 20/10/2026)
   - Una sola pauta por ejercicio: nº de series, reps y RIR (sin editar serie a serie).
   - «Notas» de Domingo en vez de la descripción automática (si no hay nota, el cliente no ve nada).
   - Vídeo de ejemplo por ejercicio que el cliente ve dentro de la app.
   - Arrastrar ejercicios manteniendo pulsado (ratón o dedo), dentro del día y entre días.
   Se carga después de experiencia.js.
   ========================================================= */

/* ---------- 1 · ejercicios nuevos: sin descripción automática y marcados como «v2» ---------- */
filaEjercicio = (function(orig){
  return function(){
    return orig.apply(this, arguments)
      .replace('<div class="ex-item">', '<div class="ex-item" data-v2="1">')
      .replace(/(<div class="ex-desc"[^>]*>)[\s\S]*?(<\/div>)/, '$1$2');
  };
})(filaEjercicio);
descDe = function(){ return ''; };
restaurarDesc = function(btn){ const it = btn && btn.closest('.ex-item'); const d = it && it.querySelector('.ex-desc'); if (d) { d.textContent = ''; delete d.dataset.propia; d.classList.remove('propia'); } };
descBlur = function(el){ if (!el.textContent.replace(/\s+/g, ' ').trim()) el.textContent = ''; programarGuardado(); };
pickExercise = (function(orig){
  return function(el){
    const it = pickerTarget && pickerTarget.closest('.ex-item');
    const nota = it && it.querySelector('.ex-desc') ? it.querySelector('.ex-desc').textContent : null;
    orig(el);
    if (it && nota != null) { const d = it.querySelector('.ex-desc'); if (d) d.textContent = /^Sin descripción/.test(nota) ? '' : nota; }   // cambiar de ejercicio conserva la nota
  };
})(pickExercise);
/* ---------- 2 · paso al nuevo sistema de los planes ya hechos (una vez por ejercicio) ----------
   - Se borran todas las descripciones (pasan a ser notas vacías).
   - Si todas las series tienen las mismas reps y RIR, se quedan; si son distintas, se vacían
     y Domingo las pone a mano. */
function ruMigrar(root){
  if (!root) return false;
  let cambio = false;
  Array.prototype.forEach.call(root.querySelectorAll('.ex-item:not([data-v2])'), function(it){
    const d = it.querySelector('.ex-desc'); if (d) { d.textContent = ''; delete d.dataset.propia; d.classList.remove('propia'); }
    const p = enPesos(it), f = it.querySelectorAll('.rx-field');
    if (p.length && f.length >= 3) {
      const r0 = p[0].dataset.reps || '', i0 = p[0].dataset.rir != null ? p[0].dataset.rir : '';
      const iguales = p.every(function(x){ return (x.dataset.reps || '') === r0 && (x.dataset.rir != null ? x.dataset.rir : '') === i0; });
      const reps = iguales ? r0 : '', rir = iguales ? i0 : '';
      p.forEach(function(x){ x.dataset.reps = reps; x.dataset.rir = rir; x.setAttribute('data-reps', reps); x.setAttribute('data-rir', rir); });
      f[0].value = p.length; f[0].setAttribute('value', p.length);
      f[1].value = reps; f[1].setAttribute('value', reps);
      f[2].value = rir; f[2].setAttribute('value', rir); enRirPoner(f[2], rir);
    }
    it.setAttribute('data-v2', '1');
    cambio = true;
  });
  return cambio;
}
cargarPlan = (function(orig){
  return function(k){
    orig(k);
    if (ruMigrar(contEnt())) { enTodoSync(); programarGuardado(); }
    ruPintar();
  };
})(cargarPlan);
enPrepararEdicion = (function(orig){
  return function(){ ruMigrar(contEnt()); orig(); ruPintar(); };
})(enPrepararEdicion);

/* ---------- 3 · cada ejercicio con sus etiquetas, notas y vídeo ---------- */
function ruPintar(){
  const cont = contEnt(); if (!cont) return;
  const ed = enEditando();
  Array.prototype.forEach.call(cont.querySelectorAll('.ex-item'), function(it){
    const d = it.querySelector('.ex-desc');
    if (d) {
      if (/^Sin descripción/.test(d.textContent.trim())) d.textContent = '';
      d.setAttribute('data-ph', 'Notas para el cliente (opcional)');
      if (ed) d.setAttribute('contenteditable', 'true'); else d.removeAttribute('contenteditable');
    }
    if (ed && !it.querySelector('.ru-asa')) {
      const a = document.createElement('span'); a.className = 'ru-asa'; a.setAttribute('aria-hidden', 'true'); a.title = 'Mantén pulsado y arrastra para moverlo'; a.textContent = '⠿';
      const row = it.querySelector('.ex-table-row'); if (row) row.insertBefore(a, row.firstChild);
    }
    const fs = it.querySelectorAll('.ex-table-row > span:not(.ex-name-cell):not(.ru-asa)');
    ['ru-se', 'ru-re', 'ru-ri'].forEach(function(c, i){ if (fs[i]) fs[i].classList.add('ru-f', c); });
    if (ed && vistaActual === 'entreno') ruPanelSeries(it); else if (!ed) { const ss = it.querySelector('.ru-ss'); if (ss) { const c = ss.nextSibling; if (c && c.nodeType === 8) c.remove(); ss.remove(); } }
    const b = it.querySelector('.ex-link-btn');
    if (b) b.textContent = it.dataset.video ? '🎬 Vídeo de ejemplo ✓ · cambiar' : '🎬 Añadir vídeo de ejemplo';
    const v = it.querySelector('.ex-video');
    if (v) {
      v.textContent = '▶ Ver vídeo de ejemplo';
      if (it.dataset.video) { v.href = it.dataset.video; v.classList.add('on'); v.style.display = ''; } else { v.removeAttribute('href'); v.classList.remove('on'); }
    }
  });
}
enTodoSync = (function(orig){ return function(){ orig(); ruPintar(); }; })(enTodoSync);
editarPlan = (function(orig){ return function(){ orig(); ruPintar(); Array.prototype.forEach.call(contEnt().querySelectorAll('.ru-video'), function(x){ x.remove(); }); }; })(editarPlan);

/* vídeo: YouTube, Vimeo, Instagram, Google Drive o cualquier enlace */
function ruEmbed(u){
  u = String(u || '');
  const y = ytId(u); if (y) return 'https://www.youtube-nocookie.com/embed/' + y + '?rel=0&playsinline=1';
  let m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/); if (m) return 'https://player.vimeo.com/video/' + m[1];
  m = u.match(/instagram\.com\/(?:[^/]+\/)?(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/); if (m) return 'https://www.instagram.com/' + (m[1] === 'reels' ? 'reel' : m[1]) + '/' + m[2] + '/embed';
  m = u.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/); if (m) return 'https://drive.google.com/file/d/' + m[1] + '/preview';
  return null;
}
guardarVideo = function(){
  if (!vmTarget) return;
  let u = document.getElementById('vmUrl').value.trim();
  const err = document.getElementById('vmError');
  if (!u) { err.textContent = 'Pega un enlace o pulsa Quitar.'; return; }
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  if (!/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(u)) { err.textContent = 'Ese enlace no parece válido.'; return; }
  vmTarget.dataset.video = u; vmTarget.setAttribute('data-video', u);
  pintarVideo(vmTarget); cerrarVideoModal(); ruPintar(); programarGuardado();
  toast(ruEmbed(u) ? 'Vídeo añadido: el cliente lo verá dentro de la app' : 'Enlace añadido: al cliente se le abrirá aparte');
};
quitarVideo = (function(orig){ return function(){ orig(); ruPintar(); programarGuardado(); }; })(quitarVideo);
(function(){
  const vm = document.getElementById('videoModal'); if (!vm) return;
  const e = vm.querySelector('.picker-eyebrow'); if (e) e.textContent = 'Vídeo de ejemplo';
  const i = document.getElementById('vmUrl'); if (i) i.placeholder = 'Enlace de YouTube, Instagram, Vimeo o Drive';
})();
document.addEventListener('click', function(e){
  const a = e.target.closest && e.target.closest('#sesionesCont .ex-video.on');
  if (!a || enEditando()) return;
  const it = a.closest('.ex-item'), src = ruEmbed(it.dataset.video);
  if (!src) return;                                   // otros enlaces: se abren aparte
  e.preventDefault();
  let w = it.querySelector('.ru-video');
  if (w) { w.remove(); a.textContent = '▶ Ver vídeo de ejemplo'; return; }
  w = document.createElement('div'); w.className = 'ru-video' + (/instagram/.test(src) ? ' ig' : '');
  w.innerHTML = '<iframe src="' + esc(src) + '" title="Vídeo de ejemplo" loading="lazy" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>';
  a.closest('.ex-video-row').insertAdjacentElement('afterend', w);
  a.textContent = '✕ Cerrar vídeo';
});
/* la huella de «Deshacer» no cuenta el vídeo abierto ni el asa */
enUndoFoto = (function(orig){
  return function(v){
    const r = orig(v);
    if (r && r.huella) r.huella = r.huella.replace(/<div class="ru-ss[\s\S]*?<!--\/ru-ss-->/g, '').replace(/<div class="ru-video[\s\S]*?<\/div>/g, '').replace(/<span class="ru-asa"[^>]*>⠿<\/span>/g, '');
    return r;
  };
})(enUndoFoto);
/* al guardar, no se guarda el vídeo abierto */
guardarPlan = (function(orig){
  return function(){
    const vs = Array.prototype.map.call(contEnt().querySelectorAll('.ru-video, .ru-ss'), function(x){ const p = x.parentNode, n = x.nextSibling; x.remove(); return [x, p, n]; });
    const r = orig.apply(this, arguments);
    vs.forEach(function(v){ v[1].insertBefore(v[0], v[2]); });
    return r;
  };
})(guardarPlan);

/* ---------- 4 · arrastrar ejercicios (mantener pulsado) ---------- */
(function(){
  const ESPERA_RATON = 220, ESPERA_DEDO = 380, TOL = 9;
  let cand = null, drag = null, raf = 0, ultY = 0, ultX = 0, anularClic = false;
  const NO = 'input,button,select,textarea,a,[contenteditable="true"],.en-pautas,.en-ej-btns,.chip';
  function sc(){ return document.getElementById('content') || document.scrollingElement; }
  function empezar(it, x, y){
    enUndoPendiente && enUndoPendiente();
    const r = it.getBoundingClientRect();
    const g = document.createElement('div'); g.className = 'ru-fantasma';
    g.innerHTML = '<span>⠿</span> ' + esc(enNombreEj(it) || 'Ejercicio');
    document.body.appendChild(g);
    drag = { it: it, g: g, dy: y - r.top, origen: it.parentNode, sig: it.nextSibling, destino: null };
    it.classList.add('ru-arrastrando'); document.documentElement.classList.add('ru-drag');
    if (navigator.vibrate) try { navigator.vibrate(12); } catch(e){}
    mover(x, y);
    raf = requestAnimationFrame(autoScroll);
  }
  // el ejercicio no se mueve mientras se arrastra: una línea marca dónde quedará al soltarlo
  function linea(r, arriba){
    let l = document.getElementById('ruLinea');
    if (!r) { if (l) l.hidden = true; return; }
    if (!l) { l = document.createElement('div'); l.id = 'ruLinea'; l.className = 'ru-linea'; document.body.appendChild(l); }
    l.hidden = false;
    l.style.left = Math.round(r.left) + 'px'; l.style.width = Math.round(r.width) + 'px';
    l.style.top = Math.round(arriba ? r.top - 6 : r.bottom + 2) + 'px';
  }
  function mover(x, y){
    ultX = x; ultY = y;
    drag.g.style.transform = 'translate(' + Math.round(x + 12) + 'px,' + Math.round(y - 18) + 'px)';
    const el = document.elementFromPoint(x, y); if (!el) return;
    Array.prototype.forEach.call(document.querySelectorAll('.ru-soltar'), function(h){ h.classList.remove('ru-soltar'); });
    drag.destino = null;
    const it = el.closest && el.closest('#sesionesCont .ex-item');
    if (it) {
      if (it === drag.it) { drag.ref = null; linea(null); return; }
      const r = it.getBoundingClientRect(), arriba = y < r.top + r.height / 2;
      const ref = arriba ? it : (it.nextElementSibling || null);
      if (ref === drag.it || (arriba && it.previousElementSibling === drag.it) ) { drag.ref = null; linea(null); return; }   // mismo sitio
      drag.ref = { body: it.parentNode, antes: ref };
      linea(r, arriba);
      return;
    }
    const card = el.closest && el.closest('#sesionesCont .sesion-card');
    if (!card) { drag.ref = null; linea(null); return; }
    const body = card.querySelector('.sesion-body'), add = card.querySelector('.add-ej-btn');
    const abierta = body && body.style.display !== 'none' && card.classList.contains('open');
    if (abierta && add && (el.closest('.add-ej-btn') || y > add.getBoundingClientRect().top - 8)) {
      const ult = Array.prototype.filter.call(body.children, function(x){ return x.classList.contains('ex-item'); }).pop();
      if (ult === drag.it) { drag.ref = null; linea(null); return; }
      drag.ref = { body: body, antes: add };
      linea(ult ? ult.getBoundingClientRect() : add.getBoundingClientRect(), !ult);
      return;
    }
    drag.ref = null; linea(null);
    if (!abierta && el.closest('.sesion-head')) { card.querySelector('.sesion-head').classList.add('ru-soltar'); drag.destino = card; }
  }
  function autoScroll(){
    if (!drag) return;
    const s = sc(), h = innerHeight, m = 70;
    let v = 0;
    if (ultY < m + 60) v = -Math.ceil((m + 60 - ultY) / 6); else if (ultY > h - m - 70) v = Math.ceil((ultY - (h - m - 70)) / 6);
    if (v && s) { s.scrollTop += v; mover(ultX, ultY); }
    raf = requestAnimationFrame(autoScroll);
  }
  function soltar(cancelar){
    if (!drag) return;
    cancelAnimationFrame(raf);
    const d = drag; drag = null;
    Array.prototype.forEach.call(document.querySelectorAll('.ru-soltar'), function(h){ h.classList.remove('ru-soltar'); });
    d.g.remove(); d.it.classList.remove('ru-arrastrando'); document.documentElement.classList.remove('ru-drag');
    linea(null);
    if (cancelar) return;
    if (d.ref && !d.destino) d.ref.body.insertBefore(d.it, d.ref.antes);
    if (d.destino) {
      const add = d.destino.querySelector('.add-ej-btn'), body = d.destino.querySelector('.sesion-body');
      if (add) body.insertBefore(d.it, add);
      toast('Movido a ' + ((d.destino.querySelector('.sesion-title') || {}).textContent || 'otro día').trim());
    }
    const movido = d.it.parentNode !== d.origen || d.it.nextSibling !== d.sig;
    if (!movido) return;
    if (typeof enTecSync === 'function') enTecSync();
    recalcEntreno(); recalcTonelaje();
    programarGuardado(); enUndoRegistrar && enUndoRegistrar();
    anularClic = true; setTimeout(function(){ anularClic = false; }, 350);
  }
  function inicio(e, x, y, dedo){
    if (!enEditando() || drag) return;
    const t = e.target;
    const it = t.closest && t.closest('#sesionesCont .ex-item'); if (!it) return;
    const asa = t.closest('.ru-asa');
    if (!asa && t.closest(NO)) return;
    if (asa && !dedo) { e.preventDefault(); empezar(it, x, y); return; }
    cand = { it: it, x: x, y: y, t: setTimeout(function(){ if (cand) { const c = cand; cand = null; empezar(c.it, c.x, c.y); } }, asa ? 120 : (dedo ? ESPERA_DEDO : ESPERA_RATON)) };
  }
  function cancelarCand(){ if (cand) { clearTimeout(cand.t); cand = null; } }
  // ratón
  document.addEventListener('mousedown', function(e){ if (e.button === 0) inicio(e, e.clientX, e.clientY, false); });
  document.addEventListener('mousemove', function(e){
    if (drag) { e.preventDefault(); mover(e.clientX, e.clientY); return; }
    if (cand && Math.hypot(e.clientX - cand.x, e.clientY - cand.y) > TOL) cancelarCand();
  });
  document.addEventListener('mouseup', function(){ cancelarCand(); soltar(false); });
  // dedo
  document.addEventListener('touchstart', function(e){ if (e.touches.length === 1) inicio(e, e.touches[0].clientX, e.touches[0].clientY, true); else { cancelarCand(); soltar(true); } }, { passive: true });
  document.addEventListener('touchmove', function(e){
    const t = e.touches[0];
    if (drag) { e.preventDefault(); mover(t.clientX, t.clientY); return; }
    if (cand && Math.hypot(t.clientX - cand.x, t.clientY - cand.y) > TOL) cancelarCand();
  }, { passive: false });
  document.addEventListener('touchend', function(){ cancelarCand(); soltar(false); });
  document.addEventListener('touchcancel', function(){ cancelarCand(); soltar(true); });
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && drag) soltar(true); });
  document.addEventListener('click', function(e){ if (anularClic) { e.preventDefault(); e.stopPropagation(); anularClic = false; } }, true);
  document.addEventListener('contextmenu', function(e){ if ((drag || cand) && e.target.closest && e.target.closest('#sesionesCont .ex-item')) e.preventDefault(); });
})();

/* ---------- 5 · la pauta se escribe serie a serie (reps y RIR de cada serie, añadir y quitar series) ---------- */
function ruValSerie(p, k){ const v = p.dataset[k]; return v == null ? '' : String(v); }
function ruDistintas(it){
  const p = enPesos(it); if (p.length < 2) return false;
  return p.some(function(x){ return ruValSerie(x, 'reps') !== ruValSerie(p[0], 'reps') || ruValSerie(x, 'rir') !== ruValSerie(p[0], 'rir'); });
}
// la pauta de arriba: el valor si todas las series coinciden; si no, vacía con «varía»
function ruCabecera(it){
  const p = enPesos(it), f = it.querySelectorAll('.rx-field'); if (!p.length || f.length < 3) return;
  [['reps', f[1]], ['rir', f[2]]].forEach(function(x){
    const v0 = ruValSerie(p[0], x[0]), igual = p.every(function(q){ return ruValSerie(q, x[0]) === v0; });
    if (document.activeElement !== x[1]) { x[1].value = igual ? v0 : ''; x[1].setAttribute('value', x[1].value); }
    x[1].placeholder = igual ? '' : 'varía';
    if (x[0] === 'rir') enRirPoner(x[1], igual ? v0 : '');
  });
  if (document.activeElement !== f[0]) { f[0].value = p.length; f[0].setAttribute('value', p.length); }
}
function ruPanelSeries(it){
  const p = enPesos(it);
  let ss = it.querySelector('.ru-ss');
  if (!ss) {
    ss = document.createElement('div'); ss.className = 'ru-ss abierto';
    const row = it.querySelector('.ex-table-row'); row.parentNode.insertBefore(ss, row.nextSibling);
    ss.insertAdjacentHTML('afterend', '<!--/ru-ss-->');
  }
  const enfocado = ss.contains(document.activeElement) ? document.activeElement : null;
  if (enfocado && enfocado.tagName === 'INPUT') return;               // no se repinta mientras se escribe
  // tabla de series: es la forma normal de escribir la pauta (una fila por serie)
  ss.innerHTML = '<div class="ru-ss-cab" aria-hidden="true"><span>Serie</span><span>Reps</span><span>RIR</span><span></span></div>'
    + '<div class="ru-ss-l">' + p.map(function(x, i){
        const r = ruValSerie(x, 'rir');
        return '<div class="ru-ss-f" data-i="' + i + '"><span class="ru-ss-n">Serie ' + (i + 1) + '</span>'
          + '<input type="text" inputmode="numeric" class="ru-ss-reps" value="' + esc(ruValSerie(x, 'reps')) + '" placeholder="—" aria-label="Reps de la serie ' + (i + 1) + '">'
          + '<input type="text" inputmode="numeric" class="ru-ss-rir ' + enRir(r) + '" value="' + esc(r) + '" placeholder="—" aria-label="RIR de la serie ' + (i + 1) + '">'
          + '<button type="button" class="ru-ss-x" tabindex="-1" aria-label="Quitar la serie ' + (i + 1) + '"' + (p.length < 2 ? ' disabled' : '') + '>✕</button></div>';
      }).join('') + '</div><button type="button" class="ru-ss-mas">+ Añadir serie</button>';
  ruCabecera(it);
}
function ruTrasCambio(it){
  enSyncSeries(it); ruCabecera(it);
  recalcTonelaje(); recalcEntreno(); programarGuardado();
}
document.addEventListener('click', function(e){
  const t = e.target; if (!t.closest || !enEditando()) return;
  const it = t.closest('#sesionesCont .ex-item'); if (!it) return;
  if (t.closest('.ru-ss-mas')) {                                     // copia la última serie
    const f = it.querySelectorAll('.rx-field'), n = enPesos(it).length;
    if (n >= 10) { toast('Máximo 10 series'); return; }
    f[0].value = n + 1; onPautaChange(f[0]); ruPanelSeries(it); ruTrasCambio(it);
    const l = it.querySelectorAll('.ru-ss-reps'); if (l.length) l[l.length - 1].focus();
    return;
  }
  const x = t.closest('.ru-ss-x');
  if (x) {
    const p = enPesos(it); if (p.length < 2) return;
    const i = +x.closest('.ru-ss-f').dataset.i;
    p[i].closest('.serie-in').remove();
    const h = it.querySelectorAll('.sr-h'); if (h[i]) h[i].remove();
    enPesos(it).forEach(function(q, k){ const s = q.closest('.serie-in').querySelector('span'); if (s) s.textContent = 'S' + (k + 1); });
    ruPanelSeries(it); ruTrasCambio(it);
  }
});
document.addEventListener('input', function(e){
  const t = e.target; if (!t.classList) return;
  if (t.classList.contains('ru-ss-reps') || t.classList.contains('ru-ss-rir')) {
    const it = t.closest('.ex-item'), i = +t.closest('.ru-ss-f').dataset.i, p = enPesos(it)[i]; if (!p) return;
    const v = t.value.replace(/[^0-9\-]/g, ''); if (v !== t.value) t.value = v;
    t.setAttribute('value', v);
    const k = t.classList.contains('ru-ss-reps') ? 'reps' : 'rir';
    p.dataset[k] = v; p.setAttribute('data-' + k, v);
    if (k === 'rir') enRirPoner(t, v);
    ruTrasCambio(it);
    return;
  }
  // la pauta de arriba (series, reps o RIR) manda: se repinta la lista de series
  if (t.classList.contains('rx-field')) { const it = t.closest('.ex-item'); if (it && enEditando()) setTimeout(function(){ ruPanelSeries(it); }, 0); }
});
document.addEventListener('focusout', function(e){
  const t = e.target; if (!t.closest) return;
  const ss = t.closest('.ru-ss'); if (ss && enEditando()) setTimeout(function(){ if (!ss.contains(document.activeElement)) ruPanelSeries(ss.closest('.ex-item')); }, 0);
});

ruPintar();
