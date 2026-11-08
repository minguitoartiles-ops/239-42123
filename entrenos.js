/* =========================================================
   Fitnessindramas — Pestaña «Entrenamientos» de Domingo (21/10/2026)
   Se carga después de area.js (usa plResumen, plFoto, plAplicar).
   ========================================================= */
/* #163 lista a la izquierda y, al tocar un cliente, su entreno a la derecha (en el móvil, debajo de la fila):
   resumen de cada día, tonelaje movido esta semana (y la anterior) y «Abrir entreno» */
/* 8/11 · Pesos movidos por semana (pedido por Domingo): una fila de columnas «Sem 1 · Sem 2 · …» (plegables); al tocar una, cada
   ejercicio muestra el peso de cada serie de esa semana (sin multiplicar). Salen del registro de pesos del cliente; la semana en curso, de su plan. */
function entSemanasHtml(t, d){
  const reg = (d.registro && d.registro.ej) || {}, cur = d.semanaRef || '';
  const dias = Array.prototype.map.call(t.querySelectorAll('.sesion-card'), function(c, i){
    return { tit: ((c.querySelector('.sesion-title') || {}).textContent || 'Día ' + (i + 1)).trim(),
      ej: Array.prototype.filter.call(c.querySelectorAll('.ex-item'), function(it){ return !it.dataset.cardio; }).map(function(it){
        let act = []; try { act = enLeerSeries(it).map(function(x){ return x[0]; }); } catch(e){}
        return { n: enNombreEj(it), act: act };
      }) };
  });
  const pesosDe = function(e, sem){
    if (sem === cur && e.act.length) return e.act;
    const w = (reg[e.n] || []).filter(function(x){ return x.sem === sem; })[0];
    return w && w.s ? w.s.map(function(x){ return x[0]; }) : [];
  };
  const sems = {};
  Object.keys(reg).forEach(function(n){ reg[n].forEach(function(w){ if (w.s && w.s.length) sems[w.sem] = 1; }); });
  if (cur && dias.some(function(x){ return x.ej.some(function(e){ return e.act.length; }); })) sems[cur] = 1;
  const lista = Object.keys(sems).sort(); if (!lista.length) return '';
  const chips = lista.map(function(sem, i){
    return '<button type="button" class="fe-sem-b' + (sem === cur ? ' act' : '') + '" data-w="' + esc(sem) + '" aria-expanded="false" onclick="entSemVer(this)">Sem ' + (i + 1) + '<small>' + esc(mjFecha(sem).slice(0, 5)) + '</small></button>';
  }).join('');
  const paneles = lista.map(function(sem){
    return '<div class="fe-wk" data-w="' + esc(sem) + '" hidden>' + dias.map(function(x){
      return '<div class="fe-wk-dia"><b>' + esc(x.tit) + '</b>' + (x.ej.map(function(e){
        const p = pesosDe(e, sem);
        return '<div class="fe-wk-ej"><span>' + esc(e.n) + '</span><span class="fe-wk-p">' + (p.length ? p.map(fmtNum).join(' · ') + ' kg' : '—') + '</span></div>';
      }).join('') || '<div class="fe-wk-ej"><span>Sin ejercicios</span></div>') + '</div>';
    }).join('') + '</div>';
  }).join('');
  return '<div class="fe-sems"><div class="fe-sems-t">📅 Pesos por semana <small>toca una semana</small></div><div class="fe-sem-fila">' + chips + '</div>' + paneles + '</div>';
}
function entSemVer(b){
  const box = b.closest('.fe-sems'); if (!box) return;
  const abre = !b.classList.contains('sel');
  box.querySelectorAll('.fe-sem-b').forEach(function(x){ x.classList.remove('sel'); x.setAttribute('aria-expanded', 'false'); });
  box.querySelectorAll('.fe-wk').forEach(function(x){ x.hidden = true; });
  if (abre) { b.classList.add('sel'); b.setAttribute('aria-expanded', 'true'); const w = box.querySelector('.fe-wk[data-w="' + b.getAttribute('data-w') + '"]'); if (w) w.hidden = false; }
}
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
    // 8/11 · peso movido en cada sesión (pedido por Domingo): con las repeticiones hechas, o las del plan si no las apunta
    let tonS = 0; try { tonS = Math.round(tonelajeDe(c)) || 0; } catch(e){}
    return '<div class="fe-dia"><b>' + esc(((c.querySelector('.sesion-title') || {}).textContent || 'Día ' + (i + 1)).trim()) + (c.classList.contains('hecha') ? ' ✓' : '') + '</b>'
      + (tonS > 0 ? '<span class="fe-ton">🏋️ ' + fmtMil(tonS) + ' kg movidos</span>' : '') + (ej.length ? ej.join('') : '<span class="fe-ej">Sin ejercicios</span>') + '</div>';
  });
  const ton = typeof mjTonelajeCliente === 'function' ? mjTonelajeCliente(k) : null;
  const reg = (d.registro && d.registro.ton) || [], ant = reg.length ? reg[reg.length - 1].kg : null;
  const hechas = t.querySelectorAll('.sesion-card.hecha').length, tot = t.querySelectorAll('.sesion-card').length;
  const rd = typeof rutDatos === 'function' ? rutDatos(k) : null;
  return '<div class="ent-prev-stats"><div><small>Tonelaje esta semana</small><b>' + (ton ? fmtMil(Math.round(ton)) + ' kg' : '—') + '</b>'
    + (ant ? '<span>' + (ton ? (ton >= ant ? '▲ ' : '▼ ') : '') + 'semana anterior ' + fmtMil(ant) + ' kg</span>' : '<span>' + (ton ? 'primera semana con pesos' : 'sin pesos registrados') + '</span>') + '</div>'
    + '<div><small>Sesiones esta semana</small><b>' + hechas + ' / ' + tot + '</b>' + (rd ? '<span>Con esta rutina: ' + esc(rd.txt) + '</span>' : '') + '</div></div>'
    + entSemanasHtml(t, d)
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
