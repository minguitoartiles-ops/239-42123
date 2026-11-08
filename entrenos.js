/* =========================================================
   Fitnessindramas — Pestaña «Entrenamientos» de Domingo (21/10/2026)
   Se carga después de area.js (usa plResumen, plFoto, plAplicar).
   ========================================================= */
/* #163 lista a la izquierda y, al tocar un cliente, su entreno a la derecha (en el móvil, debajo de la fila):
   resumen de cada día, tonelaje movido esta semana (y la anterior) y «Abrir entreno» */
/* 8/11 · Resumen del entrenamiento por semanas (pedido por Domingo): arriba las semanas (Sem 1 · Sem 2 · …; sale marcada la
   actual) y, debajo, cada día con sus ejercicios. De cada ejercicio, en una sola fila: series × repeticiones pautadas, RIR y el
   peso de cada serie esa semana con las repeticiones hechas («25 kg × 8»). Cada día lleva el peso total movido esa semana.
   Las semanas pasadas salen del registro de pesos del cliente; la actual, de su plan. */
function entResumenSemanas(t, d){
  const reg = (d.registro && d.registro.ej) || {}, cur = d.semanaRef || '';
  const dias = Array.prototype.map.call(t.querySelectorAll('.sesion-card'), function(c, i){
    return { tit: ((c.querySelector('.sesion-title') || {}).textContent || 'Día ' + (i + 1)).trim(), hecha: c.classList.contains('hecha'),
      ej: Array.prototype.map.call(c.querySelectorAll('.ex-item'), function(it){
        const pz = enPesos(it), r0 = pz.map(function(x){ return mjNum(x.dataset.rir); }).filter(function(x){ return x != null; });
        const cd = typeof cdTexto === 'function' && it.dataset.cardio ? cdTexto(it) : '';
        let act = []; if (!cd) { try { act = enLeerSeries(it); } catch(e){} }
        return { n: enNombreEj(it), cd: cd, series: pz.length, reps: pz[0] ? pz[0].dataset.reps || '' : '', rir: r0.length ? Math.min.apply(null, r0) : null, act: act };
      }) };
  });
  const sems = {};
  Object.keys(reg).forEach(function(n){ reg[n].forEach(function(w){ if (w.s && w.s.length) sems[w.sem] = 1; }); });
  const lista = Object.keys(sems).filter(function(x){ return x !== cur; }).sort();
  lista.push(cur || 'actual');                                   // la semana en curso siempre, aunque aún no tenga pesos
  const seriesDe = function(e, sem){
    if (sem === cur || sem === 'actual') return e.act;
    const w = (reg[e.n] || []).filter(function(x){ return x.sem === sem; })[0];
    return w && w.s ? w.s : [];
  };
  const chips = lista.length < 2 ? '' : '<div class="fe-sem-fila" role="tablist">' + lista.map(function(sem, i){
    const ultima = i === lista.length - 1;
    return '<button type="button" role="tab" class="fe-sem-b' + (ultima ? ' sel' : '') + '" aria-selected="' + ultima + '" data-w="' + esc(sem) + '" onclick="entSemVer(this)">Sem ' + (i + 1)
      + '<small>' + (ultima ? 'esta' : esc(mjFecha(sem).slice(0, 5))) + '</small></button>';
  }).join('') + '</div>';
  const paneles = lista.map(function(sem, i){
    const ultima = i === lista.length - 1;
    return '<div class="fe-wk' + (ultima ? ' sel' : '') + '" data-w="' + esc(sem) + '"' + (ultima ? '' : ' hidden') + '>' + (dias.length ? dias.map(function(x){
      let kg = 0;
      const filas = x.ej.map(function(e){
        if (e.cd) return '<div class="fe-ej2"><div class="fe-ej2-t"><span>' + esc(e.n) + '</span></div><div class="fe-ej2-d"><small>' + esc(e.cd) + '</small></div></div>';
        const s = seriesDe(e, sem);
        s.forEach(function(z){ if (z[0] > 0 && z[1] != null) kg += z[0] * z[1]; });
        const pauta = e.series + '×' + e.reps;
        return '<div class="fe-ej2"><div class="fe-ej2-t"><span>' + esc(e.n) + ' <small>' + esc(pauta) + '</small></span>'
          + (e.rir != null ? '<b class="sr-badge ' + enRir(e.rir) + '">RIR ' + e.rir + '</b>' : '') + '</div>'
          + '<div class="fe-ej2-d">' + (s.length ? s.map(function(z){ return '<span class="fe-s">' + fmtNum(z[0]) + ' kg × ' + (z[1] != null ? z[1] : '?') + '</span>'; }).join('') : '<small>Sin pesos apuntados</small>') + '</div></div>';
      }).join('');
      return '<div class="fe-dia"><b>' + esc(x.tit) + (ultima && x.hecha ? ' ✓' : '') + '</b>'
        + (kg > 0 ? '<span class="fe-ton">🏋️ ' + fmtMil(Math.round(kg)) + ' kg movidos</span>' : '')
        + (filas || '<span class="fe-ej">Sin ejercicios</span>') + '</div>';
    }).join('') : '<div class="picker-empty">Todavía no tiene sesiones.</div>') + '</div>';
  }).join('');
  return chips + paneles;
}
function entSemVer(b){
  const box = b.closest('.ent-prev-card'); if (!box) return;
  box.querySelectorAll('.fe-sem-b').forEach(function(x){ const si = x === b; x.classList.toggle('sel', si); x.setAttribute('aria-selected', String(si)); });
  box.querySelectorAll('.fe-wk').forEach(function(x){ const si = x.getAttribute('data-w') === b.getAttribute('data-w'); x.hidden = !si; x.classList.toggle('sel', si); });
}
function entResumenHtml(k){
  const d = clientesData[k]; if (!d) return '';
  const t = document.createElement('div'); t.innerHTML = (PLANES[k] && PLANES[k].ent) || '';
  const ton = typeof mjTonelajeCliente === 'function' ? mjTonelajeCliente(k) : null;
  const reg = (d.registro && d.registro.ton) || [], ant = reg.length ? reg[reg.length - 1].kg : null;
  const hechas = t.querySelectorAll('.sesion-card.hecha').length, tot = t.querySelectorAll('.sesion-card').length;
  const rd = typeof rutDatos === 'function' ? rutDatos(k) : null;
  return '<div class="ent-prev-stats"><div><small>Tonelaje esta semana</small><b>' + (ton ? fmtMil(Math.round(ton)) + ' kg' : '—') + '</b>'
    + (ant ? '<span>' + (ton ? (ton >= ant ? '▲ ' : '▼ ') : '') + 'semana anterior ' + fmtMil(ant) + ' kg</span>' : '<span>' + (ton ? 'primera semana con pesos' : 'sin pesos registrados') + '</span>') + '</div>'
    + '<div><small>Sesiones esta semana</small><b>' + hechas + ' / ' + tot + '</b>' + (rd ? '<span>Con esta rutina: ' + esc(rd.txt) + '</span>' : '') + '</div></div>'
    + '<div class="fe-card ent-prev-card">' + entResumenSemanas(t, d) + '</div>';
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
  /* 27/10 · limpieza: un filtro con 0 no se muestra; si solo queda «Todos», fuera la fila */
  const op = [['todos', 'Todos'], ['revisar', '⚠️ Toca revisar'], ['vacio', 'Sin plan'], ['ok', 'Al día']].filter(function(o){ return o[0] === 'todos' || n(o[0]) > 0; });
  if (!op.some(function(o){ return o[0] === entFiltro; })) entFiltro = 'todos';
  bx.hidden = op.length < 2;
  bx.innerHTML = op.map(function(o){
    return '<button type="button" role="tab" aria-selected="' + (entFiltro === o[0]) + '" class="' + (entFiltro === o[0] ? 'sel' : '') + '" onclick="entFiltrar(\'' + o[0] + '\')">' + o[1] + ' <b>' + n(o[0]) + '</b></button>';
  }).join('');
  filas.forEach(function(f){ f.classList.toggle('ent-fuera', entFiltro !== 'todos' && !f.classList.contains(entFiltro)); });
}
fsdTras('enPintarPlanes', function(){ entPintarFiltros(); });
