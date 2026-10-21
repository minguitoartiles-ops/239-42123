/* =========================================================
   Fitnessindramas — #121 Creador de rutinas compacto en el ordenador (21/10/2026)
   Para Domingo en el ordenador, editando el entrenamiento de un cliente:
   - Los días salen en columnas, uno al lado del otro, todos abiertos.
   - Cada ejercicio ocupa una línea: nombre · series × reps · RIR (con su color).
   - Al tocar un ejercicio se abre su editor (tabla serie a serie, notas, vídeo…) sin plegar nada más.
   - Botón «Vista detallada / Vista compacta» para cambiar; se recuerda.
   Lo que se añade aquí es solo visual: no se guarda en el plan ni cuenta como cambio.
   ========================================================= */
const RU_VISTA_KEY = 'fsd_ru_vista';
function ruCompactaPref(){ try { return localStorage.getItem(RU_VISTA_KEY) !== 'detallada'; } catch(e){ return true; } }
function ruCompactaOn(){
  return !!(typeof escActivo === 'function' && escActivo() && coachEditing && isCoachView() && vistaActual === 'entreno' && ruCompactaPref());
}
function ruPlegableOn(){ return !!(coachEditing && isCoachView() && vistaActual === 'entreno'); }
function ruResumen(it){
  const p = typeof enPesos === 'function' ? enPesos(it) : [];
  if (!p.length) return '<span class="ru-res-v">sin series</span>';
  const reps = p.map(function(x){ return (x.dataset.reps || '').trim() || '—'; });
  const rir = p.map(function(x){ return (x.dataset.rir || '').trim(); });
  const igual = function(l){ return l.every(function(v){ return v === l[0]; }); };
  const txtReps = igual(reps) ? p.length + ' × ' + reps[0] : p.length + ' · ' + reps.join('/');
  let txtRir = '';
  if (rir.some(Boolean)) {
    const v = igual(rir) ? rir[0] : rir.filter(Boolean).join('/');
    const min = Math.min.apply(null, rir.filter(Boolean).map(Number).filter(function(n){ return !isNaN(n); }));
    txtRir = '<b class="sr-badge ' + (typeof enRir === 'function' && isFinite(min) ? enRir(min) : '') + '">RIR ' + esc(v) + '</b>';
  }
  const tec = it.querySelector('.ex-tec-badge, .tec-badge');
  return '<span class="ru-res-v">' + esc(txtReps) + '</span>' + txtRir + (tec ? '<span class="ru-res-t">' + esc(tec.textContent.trim().slice(0, 14)) + '</span>' : '');
}
function ruValores(it){
  const p = typeof enPesos === 'function' ? enPesos(it) : [];
  const reps = p.map(function(x){ return (x.dataset.reps || '').trim(); });
  const rir = p.map(function(x){ return (x.dataset.rir || '').trim(); });
  const igual = function(l){ return l.length && l.every(function(v){ return v === l[0]; }); };
  return { n: p.length, reps: igual(reps) ? reps[0] : null, rir: igual(rir) ? rir[0] : null, repsTxt: reps.join('/'), rirTxt: rir.filter(Boolean).join('/') };
}
function ruPintarCompacta(){
  const root = document.documentElement, on = ruCompactaOn(), pl = ruPlegableOn();
  root.classList.toggle('ru-compacto', on);
  root.classList.toggle('ru-plegable', pl);
  ruBotonVista();
  if (!pl) return;
  const cont = document.getElementById('sesionesCont'); if (!cont) return;
  ruCabeceras(cont, on);
  const act = document.activeElement;
  Array.prototype.forEach.call(cont.querySelectorAll('.ex-item'), function(it){
    let b = it.querySelector(':scope > .ru-res');
    if (b && b.tagName === 'BUTTON') { b.remove(); b = null; }
    if (!b) {
      b = document.createElement('div'); b.className = 'ru-res';
      const fila = it.querySelector('.ex-table-row');
      it.insertBefore(b, fila ? fila.nextSibling : it.firstChild);
    }
    if (act && b.contains(act)) return;                 // no repintar mientras se escribe en él
    const v = ruValores(it), foco = it.classList.contains('ru-foco');
    const rirN = v.rir != null && v.rir !== '' ? Number(v.rir) : NaN;
    const cls = typeof enRir === 'function' && !isNaN(rirN) ? enRir(rirN) : '';
    /* botón «Cambiar» junto al nombre (el nombre pliega y despliega) */
    const fila = it.querySelector('.ex-table-row');
    if (fila && !fila.querySelector('.ru-cambiar')) {
      const c = document.createElement('button'); c.type = 'button'; c.className = 'ru-cambiar'; c.textContent = 'Cambiar';
      c.setAttribute('aria-label', 'Cambiar el ejercicio');
      const nom = fila.querySelector('.ex-name-cell'); fila.insertBefore(c, nom ? nom.nextSibling : null);
    }
    const nomc = it.querySelector('.ex-name-cell'); if (nomc) { nomc.setAttribute('role', 'button'); nomc.setAttribute('aria-expanded', foco ? 'true' : 'false'); }
    b.innerHTML = foco ? ''
      : '<span class="ru-q" title="Cambia aquí series, reps y RIR de todas las series">'
      + '<input class="ru-q-s" inputmode="numeric" aria-label="Series" value="' + (ruNuevos.has(it) && !v.repsTxt.replace(/\//g, '') && !v.rirTxt ? '' : v.n) + '" placeholder="—">'
      + '<span class="ru-q-x">×</span>'
      + '<input class="ru-q-r" inputmode="numeric" aria-label="Repeticiones" value="' + esc(v.reps != null ? v.reps : v.repsTxt) + '" size="' + Math.max(2, String(v.reps != null ? v.reps : v.repsTxt).length) + '" placeholder="—" title="' + (v.reps == null ? 'Reps distintas por serie: escribe un número para ponerlo en todas' : '') + '">'
      + '<span class="ru-q-l">RIR</span>'
      + '<input class="ru-q-i ' + cls + '" inputmode="numeric" aria-label="RIR" value="' + esc(v.rir != null ? v.rir : v.rirTxt) + '" size="' + Math.max(2, String(v.rir != null ? v.rir : v.rirTxt).length) + '" placeholder="—">'
      + '</span><span class="ru-desp" aria-hidden="true">▾</span>';
  });
}
/* cambiar series, reps o RIR desde la línea compacta: se aplica a todas las series */
function ruAplicarRapido(inp){
  const it = inp.closest('.ex-item'); if (!it) return;
  if (inp.classList.contains('ru-q-s')) ruNuevos.delete(it);
  const f = it.querySelectorAll('.rx-field'); if (f.length < 3) return;
  const i = inp.classList.contains('ru-q-s') ? 0 : (inp.classList.contains('ru-q-r') ? 1 : 2);
  if (/\//.test(inp.value || '')) return;                // «8/6/6»: se cambia serie a serie en el editor
  const v = String(inp.value || '').replace(/[^0-9]/g, '');
  if (v === '' && i === 0) return;
  f[i].value = v; f[i].setAttribute('value', v); onPautaChange(f[i]);
  try { if (typeof enUndoRegistrar === 'function') enUndoRegistrar(); } catch(e){}
  try { programarGuardado(); } catch(e){}
}
document.addEventListener('change', function(e){
  const t = e.target; if (!t.closest || !t.closest('#sesionesCont .ru-q')) return;
  ruAplicarRapido(t); setTimeout(ruPintarCompacta, 0);
}, true);
document.addEventListener('keydown', function(e){
  const t = e.target; if (!t.closest || !t.closest('#sesionesCont .ru-q')) return;
  if (e.key === 'Enter') { e.preventDefault(); t.blur(); }
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    e.preventDefault(); const n = (parseInt(t.value, 10) || 0) + (e.key === 'ArrowUp' ? 1 : -1);
    t.value = Math.max(t.classList.contains('ru-q-s') ? 1 : 0, n); ruAplicarRapido(t);
  }
}, true);
document.addEventListener('focusin', function(e){ const t = e.target; if (t.closest && t.closest('#sesionesCont .ru-q')) setTimeout(function(){ try { t.select(); } catch(x){} }, 0); }, true);
document.addEventListener('keydown', function(e){
  if (e.key === 'Escape' && document.documentElement.classList.contains('ru-plegable') && document.querySelector('#sesionesCont .ex-item.ru-foco') && !document.querySelector('.show > .fsd-sheet, .fsd-sheet.show') && !(document.activeElement && document.activeElement.isContentEditable)) { ruQuitarFoco(); ruPintarCompacta(); }
});
function ruBotonVista(){
  const acts = document.querySelector('#view-entreno .en-herr') || null;
  let b = document.getElementById('ruVistaBtn');
  const visible = typeof escActivo === 'function' && escActivo() && coachEditing && isCoachView() && vistaActual === 'entreno';
  if (!b) {
    const ref = document.querySelector('#view-entreno .en-herr, #view-entreno .h-title');
    if (!ref) return;
    b = document.createElement('button'); b.type = 'button'; b.id = 'ruVistaBtn'; b.className = 'btn-eq ru-vista-btn';
    b.onclick = function(){ try { localStorage.setItem(RU_VISTA_KEY, ruCompactaPref() ? 'detallada' : 'compacta'); } catch(e){} ruQuitarFoco(); ruPintarCompacta(); };
    ref.parentNode.insertBefore(b, ref.nextSibling);
  }
  b.hidden = !visible;
  b.textContent = ruCompactaPref() ? '☰ Vista detallada' : '▦ Vista compacta (días en columnas)';
}
function ruQuitarFoco(){ Array.prototype.forEach.call(document.querySelectorAll('#sesionesCont .ex-item.ru-foco'), function(x){ x.classList.remove('ru-foco'); }); }
function ruFoco(it){
  const ya = it.classList.contains('ru-foco');
  ruQuitarFoco();
  if (!ya) it.classList.add('ru-foco');
  ruPintarCompacta();
}
/* el nombre del ejercicio lo pliega o despliega; «Cambiar» abre la lista para elegir otro */
function ruToggleEj(it){ it.classList.toggle('ru-foco'); ruPintarCompacta(); }
document.addEventListener('click', function(e){
  if (!document.documentElement.classList.contains('ru-plegable') || !e.target.closest) return;
  const cam = e.target.closest('#sesionesCont .ru-cambiar');
  if (cam) { e.preventDefault(); e.stopPropagation(); const n = cam.closest('.ex-item').querySelector('.ex-name-cell'); if (n) openExercisePicker(n); return; }
  const nom = e.target.closest('#sesionesCont .ex-name-cell');
  if (nom) { e.preventDefault(); e.stopPropagation(); ruToggleEj(nom.closest('.ex-item')); return; }
  const it = e.target.closest('#sesionesCont .ex-item:not(.ru-foco)');
  if (it && (e.target === it || e.target.classList.contains('ru-res') || e.target.classList.contains('ru-desp') || e.target.classList.contains('ex-table-row'))) { ruToggleEj(it); return; }
  /* días: tocar la cabecera (también el nombre) los abre o cierra; el lápiz ✎ cambia el nombre */
  const ren = e.target.closest('#sesionesCont .ru-ren');
  if (ren) { e.preventDefault(); e.stopPropagation(); ruRenombrar(ren.closest('.sesion-card')); return; }
  const tit = e.target.closest('#sesionesCont .sesion-title');
  if (tit && !tit.classList.contains('ru-renombrando')) { e.preventDefault(); e.stopPropagation(); toggleSesion(tit.closest('.sesion-head')); }
}, true);
document.addEventListener('mousedown', function(e){
  if (!document.documentElement.classList.contains('ru-plegable') || !e.target.closest) return;
  const tit = e.target.closest('#sesionesCont .sesion-title');
  if (tit && !tit.classList.contains('ru-renombrando')) e.preventDefault();      // sin cursor de escritura al plegar
}, true);
function ruRenombrar(card){
  const t = card && card.querySelector('.sesion-title'); if (!t) return;
  t.classList.add('ru-renombrando'); t.setAttribute('contenteditable', 'true'); t.focus();
  try { const r = document.createRange(); r.selectNodeContents(t); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); } catch(e){}
  t.addEventListener('blur', function fin(){ t.classList.remove('ru-renombrando'); t.removeEventListener('blur', fin); }, { once: true });
}
function ruCabeceras(cont, compacta){
  Array.prototype.forEach.call(cont.querySelectorAll('.sesion-card'), function(c){
    const head = c.querySelector('.sesion-head'), tit = c.querySelector('.sesion-title');
    if (tit && !c.querySelector('.ru-ren')) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'ru-ren'; b.textContent = '✎';
      b.setAttribute('aria-label', 'Cambiar el nombre del día'); b.title = 'Cambiar el nombre';
      tit.parentNode.insertBefore(b, tit.nextSibling);
    }
    if (head) head.setAttribute('aria-expanded', c.classList.contains('open') ? 'true' : 'false');
    /* en la vista compacta los días empiezan abiertos (después se pliegan a mano) */
    if (compacta && !ruVistos.has(c)) { ruVistos.add(c); const body = c.querySelector('.sesion-body'); if (body && body.style.display !== 'block' && head) toggleSesion(head); }
  });
}
const ruVistos = new WeakSet(), ruNuevos = new WeakSet();
/* al escribir en la tabla serie a serie se actualiza el resumen */
let ruT = null;
document.addEventListener('input', function(e){
  if (!document.documentElement.classList.contains('ru-plegable') || !e.target.closest || !e.target.closest('#sesionesCont')) return;
  clearTimeout(ruT); ruT = setTimeout(ruPintarCompacta, 120);
}, true);
document.addEventListener('change', function(e){
  if (!document.documentElement.classList.contains('ru-plegable') || !e.target.closest || !e.target.closest('#sesionesCont')) return;
  clearTimeout(ruT); ruT = setTimeout(ruPintarCompacta, 60);
}, true);
/* cualquier repintado del plan o cambio de pantalla vuelve a aplicar la vista */
['editarPlan', 'goTo', 'enTodoSync', 'enPrepararEdicion', 'cargarPlan', 'enDeshacer', 'pickExercise', 'escLayout'].forEach(function(n){
  if (typeof window[n] !== 'function') return;
  const o = window[n];
  window[n] = function(){ const r = o.apply(this, arguments); setTimeout(ruPintarCompacta, 0); return r; };
});
/* «Añadir ejercicio» añade una fila vacía (sin abrir la lista); se elige con «Cambiar» */
if (typeof addEjercicio === 'function') addEjercicio = (function(orig){
  return function(btn){
    if (!document.documentElement.classList.contains('ru-plegable') || !btn || !btn.closest || !btn.closest('#sesionesCont')) return orig.apply(this, arguments);
    enInsertarEjercicios(btn, [{ n: '', m: 'pecho', pauta: [1, '', ''] }]);   // sin series, reps ni RIR por defecto
    const it = btn.previousElementSibling;
    if (it && it.classList.contains('ex-item')) { ruNuevos.add(it); enPesos(it).forEach(function(x){ x.dataset.reps = ''; x.dataset.rir = ''; x.removeAttribute('data-rir'); x.setAttribute('data-reps', ''); }); }
    try { if (typeof enUndoRegistrar === 'function') enUndoRegistrar(); } catch(e){}
    setTimeout(function(){ ruPintarCompacta(); const c = it && it.querySelector('.ru-cambiar'); if (c) c.focus(); }, 0);
  };
})(addEjercicio);
/* al guardar, fuera los ejercicios que se quedaron sin elegir */
editarPlan = (function(orig){
  return function(){
    if (coachEditing && isCoachView() && vistaActual === 'entreno') {
      const vac = Array.prototype.filter.call(document.querySelectorAll('#sesionesCont .ex-item'), function(it){ return !enNombreEj(it); });
      if (vac.length) { vac.forEach(function(it){ it.remove(); }); toast(vac.length === 1 ? 'Se ha quitado un ejercicio sin elegir' : 'Se han quitado ' + vac.length + ' ejercicios sin elegir'); }
    }
    return orig.apply(this, arguments);
  };
})(editarPlan);
/* nada de esto se guarda ni cuenta como cambio */
function ruLimpiarHtml(h){
  const t = document.createElement('template'); t.innerHTML = String(h || '');
  t.content.querySelectorAll('.ru-res, .ru-cambiar, .ru-ren').forEach(function(x){ x.remove(); });
  t.content.querySelectorAll('.ex-name-cell[role], .ex-name-cell[aria-expanded]').forEach(function(x){ x.removeAttribute('role'); x.removeAttribute('aria-expanded'); });
  t.content.querySelectorAll('.sesion-title.ru-renombrando').forEach(function(x){ x.classList.remove('ru-renombrando'); });
  t.content.querySelectorAll('.ru-foco').forEach(function(x){ x.classList.remove('ru-foco'); });
  return t.innerHTML;                                  // sin sacar el contenido del <template> (no se carga nada)
}
guardarPlan = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const p = clienteActual && PLANES[clienteActual]; if (p && p.ent) p.ent = ruLimpiarHtml(p.ent);
    return r;
  };
})(guardarPlan);
if (typeof enUndoFoto === 'function') enUndoFoto = (function(orig){
  return function(){ const r = orig.apply(this, arguments); if (r && r.huella) r.huella = ruLimpiarHtml(r.huella); return r; };
})(enUndoFoto);
window.addEventListener('resize', function(){ ruPintarCompacta(); });
/* añadir o quitar series en el editor también actualiza la línea resumen */
document.addEventListener('click', function(e){
  if (!document.documentElement.classList.contains('ru-plegable') || !e.target.closest || !e.target.closest('#sesionesCont .ex-item.ru-foco')) return;
  clearTimeout(ruT); ruT = setTimeout(ruPintarCompacta, 80);
});
