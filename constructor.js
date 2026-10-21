/* =========================================================
   Fitness sin Dramas — #121 Creador de rutinas compacto en el ordenador (21/10/2026)
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
function ruPintarCompacta(){
  const root = document.documentElement, on = ruCompactaOn();
  root.classList.toggle('ru-compacto', on);
  ruBotonVista();
  if (!on) return;
  const cont = document.getElementById('sesionesCont'); if (!cont) return;
  Array.prototype.forEach.call(cont.querySelectorAll('.ex-item'), function(it){
    let b = it.querySelector(':scope > .ru-res');
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.className = 'ru-res';
      b.setAttribute('aria-label', 'Editar el ejercicio');
      const fila = it.querySelector('.ex-table-row');
      it.insertBefore(b, fila ? fila.nextSibling : it.firstChild);
    }
    b.innerHTML = ruResumen(it) + '<span class="ru-res-e" aria-hidden="true">' + (it.classList.contains('ru-foco') ? '▴' : '✎') + '</span>';
  });
}
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
/* tocar la línea del ejercicio abre o cierra su editor */
document.addEventListener('click', function(e){
  if (!document.documentElement.classList.contains('ru-compacto')) return;
  const b = e.target.closest && e.target.closest('#sesionesCont .ru-res'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  ruFoco(b.closest('.ex-item'));
}, true);
/* al escribir en la tabla serie a serie se actualiza el resumen */
let ruT = null;
document.addEventListener('input', function(e){
  if (!document.documentElement.classList.contains('ru-compacto') || !e.target.closest || !e.target.closest('#sesionesCont')) return;
  clearTimeout(ruT); ruT = setTimeout(ruPintarCompacta, 120);
}, true);
document.addEventListener('change', function(e){
  if (!document.documentElement.classList.contains('ru-compacto') || !e.target.closest || !e.target.closest('#sesionesCont')) return;
  clearTimeout(ruT); ruT = setTimeout(ruPintarCompacta, 60);
}, true);
/* cualquier repintado del plan o cambio de pantalla vuelve a aplicar la vista */
['editarPlan', 'goTo', 'enTodoSync', 'enPrepararEdicion', 'cargarPlan', 'enDeshacer', 'pickExercise', 'escLayout'].forEach(function(n){
  if (typeof window[n] !== 'function') return;
  const o = window[n];
  window[n] = function(){ const r = o.apply(this, arguments); setTimeout(ruPintarCompacta, 0); return r; };
});
/* un ejercicio nuevo se abre solo para rellenarlo */
if (typeof addEjercicio === 'function') addEjercicio = (function(orig){
  return function(btn){
    const r = orig.apply(this, arguments);
    setTimeout(function(){
      if (!document.documentElement.classList.contains('ru-compacto')) return;
      const body = btn && btn.closest && btn.closest('.sesion-body'); const its = body ? body.querySelectorAll('.ex-item') : [];
      if (its.length) { ruQuitarFoco(); its[its.length - 1].classList.add('ru-foco'); ruPintarCompacta(); }
    }, 0);
    return r;
  };
})(addEjercicio);
/* nada de esto se guarda ni cuenta como cambio */
function ruLimpiarHtml(h){ return String(h || '').replace(/<button type="button" class="ru-res"[\s\S]*?<\/button>/g, '').replace(/ ru-foco/g, ''); }
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
