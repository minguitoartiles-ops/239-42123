/* =========================================================
   Fitness sin Dramas — Pestaña «Entrenamientos» de Domingo (21/10/2026)
   Se carga después de area.js (usa plResumen, plFoto, plAplicar).
   ========================================================= */
/* #163 lista a la izquierda y, al tocar un cliente, su entreno a la derecha (en el móvil, debajo de la fila):
   resumen de cada día, tonelaje movido esta semana (y la anterior) y «Abrir entreno» */
function entResumenHtml(k){
  const d = clientesData[k]; if (!d) return '';
  const t = document.createElement('div'); t.innerHTML = (PLANES[k] && PLANES[k].ent) || '';
  const ses = Array.prototype.map.call(t.querySelectorAll('.sesion-card'), function(c, i){
    const ej = Array.prototype.map.call(c.querySelectorAll('.ex-item'), function(it){
      const pz = enPesos(it), r0 = pz.map(function(x){ return mjNum(x.dataset.rir); }).filter(function(x){ return x != null; });
      const cd = typeof cdTexto === 'function' && it.dataset.cardio ? cdTexto(it) : '';
      return '<span class="fe-ej">' + esc(enNombreEj(it)) + ' <small>' + (cd ? esc(cd) : pz.length + '×' + esc(pz[0] ? pz[0].dataset.reps || '' : '')) + '</small>'
        + (!cd && r0.length ? '<b class="sr-badge ' + enRir(Math.min.apply(null, r0)) + '">RIR ' + Math.min.apply(null, r0) + '</b>' : '') + '</span>';
    });
    return '<div class="fe-dia"><b>' + esc(((c.querySelector('.sesion-title') || {}).textContent || 'Día ' + (i + 1)).trim()) + (c.classList.contains('hecha') ? ' ✓' : '') + '</b>' + (ej.length ? ej.join('') : '<span class="fe-ej">Sin ejercicios</span>') + '</div>';
  });
  const ton = typeof mjTonelajeCliente === 'function' ? mjTonelajeCliente(k) : null;
  const reg = (d.registro && d.registro.ton) || [], ant = reg.length ? reg[reg.length - 1].kg : null;
  const hechas = t.querySelectorAll('.sesion-card.hecha').length, tot = t.querySelectorAll('.sesion-card').length;
  const rd = typeof rutDatos === 'function' ? rutDatos(k) : null;
  return '<div class="ent-prev-stats"><div><small>Tonelaje esta semana</small><b>' + (ton ? fmtMil(Math.round(ton)) + ' kg' : '—') + '</b>'
    + (ant ? '<span>' + (ton ? (ton >= ant ? '▲ ' : '▼ ') : '') + 'semana anterior ' + fmtMil(ant) + ' kg</span>' : '<span>' + (ton ? 'primera semana con pesos' : 'sin pesos registrados') + '</span>') + '</div>'
    + '<div><small>Sesiones esta semana</small><b>' + hechas + ' / ' + tot + '</b>' + (rd ? '<span>Con esta rutina: ' + esc(rd.txt) + '</span>' : '') + '</div></div>'
    + '<div class="fe-card ent-prev-card">' + (ses.length ? ses.join('') : '<div class="picker-empty">Todavía no tiene sesiones.</div>') + '</div>';
}
plResumen = (function(orig){
  return function(k){
    if (!coachActivo || coachActivo.rol === 'dietista') return orig.apply(this, arguments);
    if (!k || !clientesData[k]) return '<div class="pl-prev-vacio"><span aria-hidden="true">👈</span><b>Elige un cliente</b><span>Verás aquí su entreno y el tonelaje de la semana.</span></div>';
    const d = clientesData[k];
    return '<div class="pl-prev-h">' + plFoto(k) + '<div><b>' + esc(d.nombre) + '</b><span>' + esc(d.objetivo || '') + (d.semana ? ' · semana ' + esc(d.semana) : '') + '</span></div></div>'
      + entResumenHtml(k) + '<button type="button" class="btn-primary pl-abrir" onclick="enAbrirPlanDesdeTab(\'' + k + '\')">' + (PLANES[k] && PLANES[k].ent && PLANES[k].ent.indexOf('sesion-card') > -1 ? 'Abrir entreno ›' : 'Crear plan ›') + '</button>';
  };
})(plResumen);
enPintarPlanes = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    if (!coachActivo || coachActivo.rol === 'dietista') return r;
    const cont = document.getElementById('planesPro'), lista = cont && cont.querySelector('.planes-lista'); if (!lista) return r;
    lista.classList.add('ent-lista');
    lista.querySelectorAll('.plan-fila').forEach(function(f){
      const m = (f.getAttribute('onclick') || '').match(/'([^']+)'/); if (!m) return;
      const k = m[1]; f.dataset.k = k;
      f.setAttribute('onclick', "plElegir('" + k + "')");
      f.setAttribute('ondblclick', "enAbrirPlanDesdeTab('" + k + "')");
      f.insertAdjacentHTML('afterbegin', plFoto(k));
      const rd = typeof rutDatos === 'function' ? rutDatos(k) : null;
      if (rd) { const s = f.querySelector('.plan-fila-sub'); if (s) s.insertAdjacentHTML('beforeend', ' · <span class="rut-tag ' + rd.nivel + '">🏋️ ' + esc(rd.corto) + '</span>'); }
      const cta = f.querySelector('.plan-fila-cta'); if (cta) cta.textContent = 'Ver entreno';
    });
    const busca = document.createElement('div'); busca.className = 'pl-busca';
    busca.innerHTML = '<input type="search" id="plBuscar" placeholder="Buscar cliente…" aria-label="Buscar cliente" autocomplete="off" value="' + esc(plBusca) + '" oninput="plFiltrar(this.value)"><div id="plVacio" class="picker-empty" hidden>Ningún cliente coincide con la búsqueda.</div>';
    const split = document.createElement('div'); split.className = 'pl-split ent-split';
    const izq = document.createElement('div'); izq.className = 'pl-izq';
    lista.parentNode.insertBefore(split, lista);
    izq.appendChild(busca); izq.appendChild(lista); split.appendChild(izq);
    const der = document.createElement('div'); der.className = 'pl-der'; der.id = 'plPrev'; split.appendChild(der);
    if (plSel && !clientesData[plSel]) plSel = null;
    if (!plSel && typeof escActivo === 'function' && escActivo()) { const f = lista.querySelector('.plan-fila'); if (f) plSel = f.dataset.k; }
    plAplicar();
    return r;
  };
})(enPintarPlanes);

/* Mejora 7 (21/10) · filtro rápido: Todos · Toca revisar · Sin plan · Al día */
let entFiltro = 'todos';
function entFiltrar(f){ entFiltro = f; entPintarFiltros(); }
function entPintarFiltros(){
  const cont = document.getElementById('planesPro'); if (!cont || !coachActivo || coachActivo.rol === 'dietista') return;
  const filas = Array.prototype.slice.call(cont.querySelectorAll('.plan-fila'));
  const n = function(c){ return filas.filter(function(f){ return c === 'todos' || f.classList.contains(c); }).length; };
  let bx = document.getElementById('entFiltros');
  if (!bx) { bx = document.createElement('div'); bx.id = 'entFiltros'; bx.className = 'ent-filtros'; bx.setAttribute('role', 'tablist'); const b = cont.querySelector('.pl-busca'); if (b) b.parentNode.insertBefore(bx, b.nextSibling); }
  bx.innerHTML = [['todos', 'Todos'], ['revisar', '⚠️ Toca revisar'], ['vacio', 'Sin plan'], ['ok', 'Al día']].map(function(o){
    return '<button type="button" role="tab" aria-selected="' + (entFiltro === o[0]) + '" class="' + (entFiltro === o[0] ? 'sel' : '') + '" onclick="entFiltrar(\'' + o[0] + '\')">' + o[1] + ' <b>' + n(o[0]) + '</b></button>';
  }).join('');
  filas.forEach(function(f){ f.classList.toggle('ent-fuera', entFiltro !== 'todos' && !f.classList.contains(entFiltro)); });
}
enPintarPlanes = (function(orig){ return function(){ const r = orig.apply(this, arguments); entPintarFiltros(); return r; }; })(enPintarPlanes);
