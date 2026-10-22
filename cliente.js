/* =========================================================
   Fitnessindramas — Barra del cliente (21/10/2026)
   - #108 Número de mensajes sin leer en el botón «Chat» del cliente.
   Se carga antes de datos.js.
   ========================================================= */

/* ---------- mensajes del equipo sin leer (por cliente) ---------- */
function clChatSinLeer(k){
  if (!k) return 0;
  const a = leerAvisos(); a.sinLeer = a.sinLeer || {};
  const s = a.sinLeer[claveCliente(k)] || {};
  return s.chat || 0;
}
function clChatSumar(k){
  if (!k) return;
  const a = leerAvisos(); a.sinLeer = a.sinLeer || {};
  const s = a.sinLeer[claveCliente(k)] = a.sinLeer[claveCliente(k)] || {};
  s.chat = (s.chat || 0) + 1;
  guardarAvisos();
}
function clChatLeido(k){
  if (!k) return;
  const a = leerAvisos(); a.sinLeer = a.sinLeer || {};
  const s = a.sinLeer[claveCliente(k)];
  let cambio = false;
  if (s && s.chat) { s.chat = 0; cambio = true; }
  ((a.lista[claveCliente(k)]) || []).forEach(function(x){ if (x.tipo === 'mensajes' && !x.leida) { x.leida = true; cambio = true; } });
  if (cambio) { guardarAvisos(); pintarCampanas(); }
}
function clPintarChat(){
  const b = document.getElementById('tab-chat'); if (!b) return;
  let g = b.querySelector('.tb-badge');
  if (!g) { g = document.createElement('span'); g.className = 'tb-badge hide'; g.setAttribute('aria-live', 'polite'); b.appendChild(g); }
  const k = clienteActual;
  const n = (k && window.fsdSesionCliente && !isCoachView()) ? clChatSinLeer(k) : 0;
  g.textContent = n > 9 ? '9+' : String(n);
  g.classList.toggle('hide', !n);
  b.setAttribute('aria-label', n ? 'Chat, ' + n + (n === 1 ? ' mensaje sin leer' : ' mensajes sin leer') : 'Chat');
}

/* el profesional escribe (texto, foto o nota de voz) → +1 para el cliente */
sendMsg = (function(orig){
  return function(){
    const t = (document.getElementById('chatInput').value || '').trim();
    const k = clienteActual, coach = isCoachView();
    const r = orig.apply(this, arguments);
    if (t && k && coach && clientesData[k]) clChatSumar(k);
    return r;
  };
})(sendMsg);
meterEnChat = (function(orig){
  return function(b){
    const r = orig.apply(this, arguments);
    if (clienteActual && isCoachView() && clientesData[clienteActual]) clChatSumar(clienteActual);
    return r;
  };
})(meterEnChat);

/* el cliente abre el chat → todo leído */
goTo = (function(orig){
  return function(n){
    const r = orig.apply(this, arguments);
    if (n === 'chat' && window.fsdSesionCliente && !isCoachView()) clChatLeido(clienteActual);
    clPintarChat();
    return r;
  };
})(goTo);
pintarCampanas = (function(orig){
  return function(){ const r = orig.apply(this, arguments); clPintarChat(); return r; };
})(pintarCampanas);
window.addEventListener('storage', function(e){
  if (e.key !== AVISOS_KEY) return;
  setTimeout(function(){
    if (window.fsdSesionCliente && !isCoachView() && vistaActual === 'chat' && document.getElementById('app').style.display === 'flex') clChatLeido(clienteActual);
    clPintarChat();
  }, 0);
});
clPintarChat();

/* =========================================================
   #106 Ficha del cliente (profesionales): «Gestión del cliente», «Suscripción» y «Entrenamiento»
   salen plegados al abrir la ficha desde Clientes; se despliegan tocando el título.
   Mientras se trabaja con el mismo cliente (ir al plan y volver) se respeta lo abierto.
   ========================================================= */
const FP_PLEGABLES = { 'gestión del cliente': 'gestion', 'suscripción': 'pago', 'entrenamiento': 'entreno', 'nutrición': 'nutri' };
let fpAbiertos = {}, fpCliente = null, fpUltFiltro = null;
function fpContenido(lbl){
  const r = []; let x = lbl.nextElementSibling;
  /* «Entrenamiento» y «Nutrición» llevan su etiqueta dentro de su bloque: todo lo que sigue es suyo */
  if (lbl.parentNode && (lbl.parentNode.id === 'fichaEntrenoRes' || lbl.parentNode.id === 'fichaNutri')) { while (x) { r.push(x); x = x.nextElementSibling; } return r; }
  while (x && !x.classList.contains('alta-label') && !x.querySelector('.alta-label') && (!x.id || x.id === 'fichaRegistro')
         && !x.classList.contains('stat-row') && !x.classList.contains('tonelaje-card')) { r.push(x); x = x.nextElementSibling; }
  return r;
}
function fpResumen(id, cont){
  try {
    if (id === 'pago') {
      const filas = cont[0] ? cont[0].querySelectorAll('.list-row') : [];
      const val = function(f){ const l = f.firstElementChild ? f.firstElementChild.textContent : ''; return f.textContent.replace(l, '').replace('›', '').trim(); };
      const v = Array.prototype.slice.call(filas, 0, 2).map(val).filter(Boolean);
      return v.length > 1 ? v[0] + ' · hasta ' + v[1] : v.join(' · ');
    }
    if (id === 'entreno') { const t = cont[0] && cont[0].querySelector('.fe-top span'); return t ? t.textContent.trim() : ''; }
    if (id === 'nutri') { const r = nuResumenCliente(clienteActual); return r && r.obj ? fmtMil(Math.round(r.obj.kcal)) + ' kcal · ' + r.comidas.length + (r.comidas.length === 1 ? ' comida' : ' comidas') : 'Plan sin preparar'; }
    if (id === 'gestion') return 'Datos, código, alergias…';
  } catch(e){}
  return '';
}
/* 22/10 · el tonelaje y la actividad física (pasos) van dentro de «Entrenamiento», tras el resumen y el registro de pesos */
function fpMoverBloques(extra){
  const v = document.getElementById('view-coach-cliente'), box = document.getElementById('fichaEntrenoRes'); if (!v || !box) return;
  const ton = (extra || []).filter(function(e){ return e.classList && e.classList.contains('tonelaje-card'); })[0] || v.querySelector('.tonelaje-card');
  const pasos = (extra || []).filter(function(e){ return e.id === 'fichaPasos'; })[0] || document.getElementById('fichaPasos');
  const reg = document.getElementById('fichaRegistro');
  const deseados = [reg, ton, pasos].filter(Boolean), hijos = Array.prototype.slice.call(box.children);
  const enOrden = deseados.every(function(e, i){ return hijos[hijos.length - deseados.length + i] === e; });
  if (!enOrden) deseados.forEach(function(e){ box.appendChild(e); });
}
enPintarEntrenoFicha = (function(orig){
  return function(){
    const b = document.getElementById('fichaEntrenoRes'), guardar = [];
    if (b) ['.tonelaje-card', '#fichaPasos'].forEach(function(s){ const e = b.querySelector(s); if (e) { guardar.push(e); e.remove(); } });
    const r = orig.apply(this, arguments);
    fpMoverBloques(guardar);
    return r;
  };
})(enPintarEntrenoFicha);
function fpAplicar(){
  const v = document.getElementById('view-coach-cliente'); if (!v || !coachActivo) return;
  fpMoverBloques();
  const filtro = typeof enSeccion === 'string' && enSeccion !== 'todo';
  /* al elegir un filtro, su apartado se abre (y después se puede plegar) */
  if (filtro && fpUltFiltro !== enSeccion) { const m = { entreno: 'entreno', nutri: 'nutri', pago: 'pago', datos: 'gestion' }[enSeccion]; if (m) fpAbiertos[m] = true; }
  fpUltFiltro = filtro ? enSeccion : null;
  Array.prototype.forEach.call(v.querySelectorAll('.alta-label'), function(lbl){
    const txt = (lbl.getAttribute('data-fp-txt') || lbl.textContent).trim();
    const id = FP_PLEGABLES[txt.toLowerCase()];
    if (!id) return;
    if (!lbl.hasAttribute('data-fp')) {
      lbl.setAttribute('data-fp', id); lbl.setAttribute('data-fp-txt', txt);
      lbl.setAttribute('role', 'button'); lbl.tabIndex = 0;
      lbl.innerHTML = '<span class="fp-t">' + esc(txt) + '</span><span class="fp-res"></span><span class="fp-chev" aria-hidden="true">›</span>';
      lbl.addEventListener('click', function(){ fpAbiertos[id] = !fpAbiertos[id]; fpAplicar(); });
      lbl.addEventListener('keydown', function(e){ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); lbl.click(); } });
    }
    const abierto = !!fpAbiertos[id];
    const cont = fpContenido(lbl);
    lbl.classList.add('fp-lbl');
    lbl.classList.toggle('fp-abierto', abierto);
    lbl.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    const res = lbl.querySelector('.fp-res'); if (res) res.textContent = abierto ? '' : fpResumen(id, cont);
    cont.forEach(function(x){ x.classList.toggle('fp-oculto', !abierto); });
  });
  /* ordenador: fuera las tarjetas que se quedan sin nada visible */
  Array.prototype.forEach.call(v.querySelectorAll('.esc-grupo'), function(g){
    g.classList.remove('fp-vacio');
    const algo = Array.prototype.some.call(g.children, function(c){
      if (c.hidden || c.classList.contains('sec-oculta') || c.classList.contains('fp-oculto')) return false;
      return getComputedStyle(c).display !== 'none' && (c.offsetHeight > 2 || c.textContent.trim() !== '');
    });
    g.classList.toggle('fp-vacio', !algo);
  });
}
function fpReiniciar(){ fpAbiertos = {}; }
goToCliente = (function(orig){
  return function(k){
    if (k !== fpCliente) { fpReiniciar(); fpCliente = k; }
    const r = orig.apply(this, arguments);
    fpAplicar();
    return r;
  };
})(goToCliente);
backToPanel = (function(orig){ return function(){ fpReiniciar(); fpCliente = null; return orig.apply(this, arguments); }; })(backToPanel);
if (typeof enPintarFicha === 'function') enPintarFicha = (function(orig){ return function(){ const r = orig.apply(this, arguments); fpAplicar(); return r; }; })(enPintarFicha);
if (typeof enAplicarSeccion === 'function') enAplicarSeccion = (function(orig){ return function(){ const r = orig.apply(this, arguments); fpAplicar(); return r; }; })(enAplicarSeccion);
if (typeof pintarSuscripcionFicha === 'function') pintarSuscripcionFicha = (function(orig){ return function(){ const r = orig.apply(this, arguments); fpAplicar(); return r; }; })(pintarSuscripcionFicha);
/* si un aviso lleva a la ficha (alergias, pagos…), se abre ya el apartado que toca */
abrirAviso = (function(orig){
  return function(dest, id){
    const x = ((leerAvisos().lista[dest]) || []).filter(function(y){ return y.id === id; })[0];
    const r = orig.apply(this, arguments);
    if (x && String(dest).indexOf('pro:') === 0 && x.ir && x.ir.cliente) {
      const ab = { alergias: 'gestion', imagen: 'gestion', pago: 'pago', pagos: 'pago', bajas: 'pago' }[x.tipo];
      if (ab) { fpAbiertos[ab] = true; fpAplicar(); }
    }
    return r;
  };
})(abrirAviso);

/* =========================================================
   #115 Seguimientos de un cliente (profesionales): en lista, del más reciente (arriba) al más antiguo
   ========================================================= */
function sgFechaCard(c){
  const m = (c.textContent || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? +(m[3] + m[2] + m[1]) : 0;
}
function sgOrdenarLista(){
  const cont = document.getElementById('seguiList'); if (!cont) return;
  const cards = Array.prototype.slice.call(cont.querySelectorAll(':scope > .segui-card'));
  if (cards.length < 2) return;
  const orden = cards.map(function(c, i){ return { c: c, f: sgFechaCard(c), i: i }; })
    .sort(function(a, b){ return (b.f - a.f) || (a.i - b.i); });
  if (orden.every(function(x, i){ return x.c === cards[i]; })) return;
  const ref = cards[cards.length - 1].nextSibling;
  orden.forEach(function(x){ cont.insertBefore(x.c, ref); });
}
goToSeguimientos = (function(orig){
  return function(){ const r = orig.apply(this, arguments); sgOrdenarLista(); return r; };
})(goToSeguimientos);

/* =========================================================
   #112 Chat: también los mensajes propios llevan la foto (o inicial) de quien escribe,
   a la izquierda de la burbuja, en el último mensaje de cada racha (como los de los demás)
   ========================================================= */
decorarChat = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const list = document.getElementById('chatList'); if (!list) return r;
    const bs = Array.prototype.slice.call(list.querySelectorAll('.bubble'));
    bs.forEach(function(b, i){
      if (!b.classList.contains('msg-mio')) return;
      const sig = bs[i + 1];
      if (sig && sig.classList.contains('msg-mio')) { b.classList.add('sin-av'); return; }
      const a = autorBurbuja(b);
      const av = document.createElement('span');
      av.className = 'msg-av2 msg-av-mio ' + colorAutor(a);
      av.setAttribute('aria-hidden', 'true');
      const url = fotoAutor(a);
      if (url) { av.style.backgroundImage = 'url("' + url + '")'; av.classList.add('con-foto'); }
      else av.textContent = (a.nombre || '?').trim().charAt(0).toUpperCase();
      b.appendChild(av);
    });
    return r;
  };
})(decorarChat);

/* =========================================================
   #116 Pagos (profesionales): tabla por columnas
   Nombre · Tarifa · Fecha de alta · Estado del pago, con los mismos colores de siempre
   ========================================================= */
function pgFilaCls(e){
  return !e.acceso && !e.baja ? 'roj' : ({ vencido: 'roj', gracia: 'nar', vence: 'amb', ok: 'ok', sin: '', baja: 'gris' }[e.cod] || '');
}
pintarPagosPro = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const l = document.querySelector('#pagosPro .pagos-lista'); if (!l) return r;
    const filas = Array.prototype.slice.call(l.querySelectorAll('.pago-fila'));
    if (!filas.length) return r;
    const h = filas.map(function(f){
      const m = (f.getAttribute('onclick') || '').match(/mjAbrirFichaPago\('([^']+)'\)/);
      const k = m && m[1], d = k && clientesData[k]; if (!d) return '';
      const t = d.tarifa, e = estadoPago(d), cls = pgFilaCls(e);
      const tn = t && MJ_TARIFAS[t.tipo] ? MJ_TARIFAS[t.tipo].n : 'Sin tarifa';
      const tp = t && MJ_TARIFAS[t.tipo] && t.precio != null ? mjEuros(t.precio) : '';
      const partes = String(e.txt || '').split(' · ');
      return '<div class="pg-fila pago-fila ' + cls + '" role="row" tabindex="0" onclick="mjAbrirFichaPago(\'' + k + '\')" onkeydown="if(event.key===\'Enter\')this.click()">'
        + '<span class="pg-c pg-nom" role="cell"><b>' + esc(d.nombre) + '</b>' + (t && t.pagos && t.pagos.length ? '<small>' + t.pagos.length + (t.pagos.length === 1 ? ' pago' : ' pagos') + '</small>' : '') + '</span>'
        + '<span class="pg-c pg-tar" role="cell">' + esc(tn) + (tp ? '<small>' + esc(tp) + '</small>' : '') + '</span>'
        + '<span class="pg-c pg-alta" role="cell">' + (d.fechaAlta ? '<span class="pg-f-l">' + mjFecha(d.fechaAlta.slice(0, 10)) + '</span><span class="pg-f-c">' + mjFecha(d.fechaAlta.slice(0, 10)).replace(/\/(\d{2})(\d{2})$/, '/$2') + '</span>' : '—') + '</span>'
        + '<span class="pg-c pg-est" role="cell"><span class="pago-est ' + cls + '">' + esc(partes[0]) + '</span>' + (partes[1] ? '<small>' + esc(partes.slice(1).join(' · ')) + '</small>' : '') + '</span>'
        + '</div>';
    }).join('');
    l.classList.add('pg-tabla'); l.setAttribute('role', 'table');
    l.innerHTML = '<div class="pg-cab" role="row"><span role="columnheader">Nombre</span><span role="columnheader">Tarifa</span><span role="columnheader">Alta</span><span role="columnheader">Estado del pago</span></div>' + h;
    pgSeparar();
    return r;
  };
})(pintarPagosPro);
/* desde Pagos se abre la ficha con «Suscripción» desplegada */
mjAbrirFichaPago = (function(orig){
  return function(k){ const r = orig.apply(this, arguments); fpAbiertos.pago = true; fpAplicar(); return r; };
})(mjAbrirFichaPago);

/* =========================================================
   #118 Pestaña Seguimientos (profesionales): nota más grande, «Ver resumen» como botón
   y filtros Todos · Al día · Pendientes de rellenar · Mejor puntuación · Peor puntuación
   ========================================================= */
let sgFiltro = 'todos';
const SG_FILTROS = [['todos', 'Todos'], ['aldia', 'Al día'], ['pend', 'Pendientes de rellenar'], ['mejor', 'Mejor puntuación'], ['peor', 'Peor puntuación']];
function sgFiltrar(f){ sgFiltro = f; pintarSegsResumen(); }
pintarSegsResumen = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const cont = document.getElementById('segsResumen'); if (!cont) return r;
    const bloques = Array.prototype.slice.call(cont.querySelectorAll(':scope > .sg-bloque'));
    if (!bloques.length) return r;
    const datos = bloques.map(function(bl, i){
      const cab = bl.querySelector('.sg-cab');
      const m = cab && (cab.getAttribute('onclick') || '').match(/abrirSegsCliente\('([^']+)'/);
      const g = bl.querySelector('.sg-glob');
      const p = g ? parseInt(g.textContent, 10) : null;
      const tiene = !!bl.querySelector('.segui-card');
      /* nota grande: número y /100 */
      if (g && !g.classList.contains('sg-nota-g')) {
        g.classList.add('sg-nota-g');
        g.innerHTML = '<b>' + p + '</b><small>/100</small>';
        g.setAttribute('aria-label', 'Puntuación ' + p + ' de 100');
      }
      /* línea de la última semana sin cortar la fecha + botón «Ver resumen» cómodo */
      const lin = bl.querySelector('.sg-linea');
      const k = m && m[1];
      if (lin && k && (SEGUIMIENTOS[k] || [])[0]) {
        const s0 = SEGUIMIENTOS[k][0];
        const wk = bl.querySelector('.segui-week');
        let sem = '';
        if (wk) sem = Array.prototype.filter.call(wk.childNodes, function(n){ return !(n.classList && n.classList.contains('sem-badge')); }).map(function(n){ return n.textContent; }).join('').trim();
        const peso = (bl.querySelector('.segui-peso') || {}).textContent || '';
        const sp = lin.querySelector('span'); if (sp) sp.textContent = (sem || ('Último · ' + fechaCorta(s0.fecha))) + (peso ? ' · ' + peso.trim() : '');
      }
      const v = bl.querySelector('.sg-ver');
      if (v && !v.classList.contains('sg-ver-btn')) v.classList.add('sg-ver-btn');
      return { bl: bl, i: i, p: isNaN(p) ? null : p, pend: bl.classList.contains('pend'), tiene: tiene };
    });
    /* filtros */
    let fil = document.getElementById('sgFiltros');
    if (!fil) {
      fil = document.createElement('div'); fil.id = 'sgFiltros'; fil.className = 'chips sg-filtros'; fil.setAttribute('role', 'tablist');
      const ley = cont.querySelector('.segui-leyenda');
      cont.insertBefore(fil, ley || bloques[0]);
    }
    const n = { todos: datos.length, aldia: datos.filter(function(x){ return !x.pend; }).length, pend: datos.filter(function(x){ return x.pend; }).length };
    fil.innerHTML = SG_FILTROS.map(function(f){
      const c = n[f[0]] != null ? ' <span class="sg-fn">' + n[f[0]] + '</span>' : '';
      return '<button type="button" role="tab" aria-selected="' + (sgFiltro === f[0]) + '" class="chip protein' + (sgFiltro === f[0] ? ' selected' : '') + '" onclick="sgFiltrar(\'' + f[0] + '\')">' + f[1] + c + '</button>';
    }).join('');
    let vis = datos.filter(function(x){
      if (sgFiltro === 'aldia') return !x.pend;
      if (sgFiltro === 'pend') return x.pend;
      if (sgFiltro === 'mejor' || sgFiltro === 'peor') return x.p != null;
      return true;
    });
    if (sgFiltro === 'mejor') vis.sort(function(a, b){ return b.p - a.p || a.i - b.i; });
    if (sgFiltro === 'peor') vis.sort(function(a, b){ return a.p - b.p || a.i - b.i; });
    datos.forEach(function(x){ x.bl.hidden = vis.indexOf(x) < 0; });
    vis.forEach(function(x){ cont.appendChild(x.bl); });
    let vac = document.getElementById('sgVacio');
    if (!vis.length) { if (!vac) { vac = document.createElement('div'); vac.id = 'sgVacio'; vac.className = 'picker-empty'; } vac.textContent = 'No hay clientes en este apartado.'; cont.appendChild(vac); }
    else if (vac) vac.remove();
    return r;
  };
})(pintarSegsResumen);

/* Seguimientos siempre del más reciente al más antiguo (por si una copia restaurada los trae al revés) */
(function(){
  let cambio = false;
  Object.keys(SEGUIMIENTOS || {}).forEach(function(k){
    const l = SEGUIMIENTOS[k]; if (!Array.isArray(l) || l.length < 2) return;
    const ok = l.every(function(r, i){ return i === 0 || !r.fecha || !l[i - 1].fecha || l[i - 1].fecha >= r.fecha; });
    if (!ok) { l.sort(function(a, b){ return (b.fecha || '') > (a.fecha || '') ? 1 : -1; }); cambio = true; }
  });
  if (cambio) try { guardarTodo(); } catch(e){}
})();

/* =========================================================
   #107 Barra del cliente: Hoy · Nutrición · Entreno · Chat · ⚙️ Ajustes
   - Fuera la pestaña «Progreso»: el progreso se ve de un vistazo al final de «Hoy»
     (y «Ver todo mi progreso» abre la pantalla completa, con Volver).
   - «Cerrar sesión» pasa al panel de la foto de perfil, con acceso directo a Ajustes.
   ========================================================= */
(function(){
  const tp = document.getElementById('tab-progreso'); if (tp) tp.hidden = true;
  const ta = document.getElementById('tab-ajustes');
  if (ta) { ta.hidden = false; ta.setAttribute('onclick', 'clIrAjustes()'); }
  let i = tabs.indexOf('progreso'); if (i > -1) tabs.splice(i, 1);
  if (tabs.indexOf('ajustes') < 0) tabs.push('ajustes');
  i = TABS_CLIENTE.indexOf('progreso'); if (i > -1) TABS_CLIENTE.splice(i, 1);
  if (TABS_CLIENTE.indexOf('ajustes') < 0) TABS_CLIENTE.push('ajustes');
})();
function clIrAjustes(){ navHist.length = 0; goTo('ajustes', true); }
goTo = (function(orig){
  return function(n, s){
    const prev = vistaActual, hist = navHist.slice();
    const r = orig.apply(this, arguments);
    /* desde el perfil, «Ajustes» es una subpantalla: Volver regresa al perfil */
    if (!isCoachView() && n === 'ajustes' && prev === 'perfil' && !s) { navHist.length = 0; Array.prototype.push.apply(navHist, hist.concat(['perfil'])); pintarAtras(); }
    if (!isCoachView()) {
      const ta = document.getElementById('tab-ajustes');
      if (ta) ta.classList.toggle('active', n === 'ajustes');
      if (n === 'hoy') clPintarProgresoHoy();
      if (n === 'ajustes') clQuitarSalirAjustes();
      if (n === 'perfil') clPintarPerfil();
    }
    return r;
  };
})(goTo);

/* --- progreso de un vistazo al final de «Hoy» --- */
function clPintarProgresoHoy(){
  const v = document.getElementById('view-hoy'); const k = clienteActual;
  if (!v || !k || !clientesData[k] || isCoachView()) return;
  try { if (typeof pintarProgreso === 'function') pintarProgreso(); } catch(e){}
  let c = document.getElementById('hoyProgreso');
  if (!c) { c = document.createElement('div'); c.id = 'hoyProgreso'; c.className = 'card hoy-prog'; }
  v.appendChild(c);
  const t = function(id){ const e = document.getElementById(id); return e ? e.textContent.trim() : ''; };
  const ms = String(clientesData[k].semana || '').match(/(\d+)\D+(\d+)/);
  const sem = ms ? +ms[1] : (parseInt(t('pgSemNum'), 10) || 0), tot = ms ? +ms[2] : (parseInt(t('pgSemTot'), 10) || 0);
  const pct = tot ? Math.min(100, Math.round(sem / tot * 100)) : 0;
  const n = function(f){ try { return typeof f === 'function' ? f(k) : 0; } catch(e){ return 0; } };
  const re = n(window.exRachaEntreno), rn = n(window.exRachaNutri), rs = n(window.exRachaSegs);
  const L = typeof exLogros === 'function' ? exLogros(k) : null, nl = L ? L.lista.length : 0;
  const mp = t('pgPesoDelta').match(/^[+\-−]?\s*[\d.,]+\s*kg/);
  const peso = mp ? mp[0] : '', segs = t('pgNumSeg');
  c.innerHTML = '<div class="card-head"><b>📈 Tu progreso</b><span>' + (tot ? 'Semana ' + sem + ' de ' + tot : '') + '</span></div>'
    + (tot ? '<div class="hp-barra" role="progressbar" aria-valuemin="0" aria-valuemax="' + tot + '" aria-valuenow="' + sem + '"><i style="width:' + pct + '%"></i></div>' : '')
    + '<div class="hp-datos">'
    + '<div><b>' + esc(peso || '—') + '</b><span>peso desde el inicio</span></div>'
    + '<div><b>' + esc(segs || '0') + '</b><span>seguimientos</span></div>'
    + '<div><b>' + nl + '</b><span>' + (nl === 1 ? 'logro' : 'logros') + '</span></div></div>'
    + '<div class="hp-rachas"><span>🔥 ' + re + ' ' + (re === 1 ? 'semana' : 'semanas') + ' de entrenos</span><span>🥗 ' + rn + ' ' + (rn === 1 ? 'día' : 'días') + ' de nutrición</span><span>📋 ' + rs + ' ' + (rs === 1 ? 'semana' : 'semanas') + ' de seguimiento</span></div>'
    + '<button type="button" class="btn-eq hp-ver" onclick="goTo(\'progreso\')">Ver todo mi progreso ›</button>';
}
if (typeof pintarCliente === 'function') pintarCliente = (function(orig){ return function(){ const r = orig.apply(this, arguments); clPintarProgresoHoy(); return r; }; })(pintarCliente);

/* --- «Cerrar sesión» y acceso a Ajustes en el panel de la foto --- */
function clPintarPerfil(){
  const v = document.getElementById('view-perfil'); if (!v || isCoachView()) return;
  if (!document.getElementById('perfAcciones')) {
    const g = document.createElement('div'); g.id = 'perfAcciones'; g.className = 'list-group';
    g.innerHTML = '<div class="list-row" onclick="goTo(\'ajustes\')"><span>⚙️ Ajustes</span><span class="chev">›</span></div>'
      + '<div class="list-row danger" onclick="confirmarSalidaCliente()"><span>Cerrar sesión</span></div>';
    v.appendChild(g);
    /* la fila antigua «Ajustes y privacidad» queda dentro del nuevo bloque */
    Array.prototype.forEach.call(v.querySelectorAll('.list-group'), function(lg){
      if (lg !== g && lg.children.length === 1 && /Ajustes y privacidad/.test(lg.textContent)) lg.remove();
    });
  }
}
function clQuitarSalirAjustes(){
  const a = document.getElementById('ajustesCliente'); if (!a) return;
  Array.prototype.forEach.call(a.querySelectorAll('.list-group'), function(lg){
    if (lg.children.length === 1 && /Cerrar sesión/.test(lg.textContent)) lg.hidden = true;
  });
}
if (typeof refrescarAjustes === 'function') refrescarAjustes = (function(orig){ return function(){ const r = orig.apply(this, arguments); clQuitarSalirAjustes(); return r; }; })(refrescarAjustes);
clPintarPerfil();
/* atrás del móvil: Ajustes abierto desde el perfil vuelve al perfil */
atrasPorNiveles = (function(orig){
  return function(){
    if (!coachActivo && vistaActual === 'ajustes' && navHist.length) { volverAtras(); return; }
    return orig.apply(this, arguments);
  };
})(atrasPorNiveles);

/* =========================================================
   #124 Plan nutricional (profesionales, editando): volver a tocar un alimento elegido lo deselecciona
   ========================================================= */
pick = (function(orig){
  return function(el){
    if (el && el.classList && el.classList.contains('selected') && isCoachView() && coachEditing && el.closest && el.closest('#comidasCont')) {
      el.classList.remove('selected');
      const mb = el.closest('.meal-block');
      try { if (mb) updateMealSummary(mb); } catch(e){}
      try { calcularPlan(); } catch(e){}
      try { if (typeof exResumenComidas === 'function') exResumenComidas(); } catch(e){}
      try { if (typeof enUndoRegistrar === 'function') enUndoRegistrar(); } catch(e){}
      return;
    }
    return orig.apply(this, arguments);
  };
})(pick);

/* #125 «Últimos movimientos» en su propio apartado dentro de Pagos */
let pgVista = 'clientes';
function pgVer(v){ pgVista = v; pgSeparar(); const bd = document.querySelector('#view-coach-pagos .alta-body'); if (bd) bd.scrollTop = 0; }
function pgSeparar(){
  const cont = document.getElementById('pagosPro'); if (!cont) return;
  const movs = cont.querySelector('.pagos-movs');
  const lbl = Array.prototype.filter.call(cont.querySelectorAll('.alta-label'), function(x){ return /movimientos/i.test(x.textContent); })[0];
  let caja = document.getElementById('pgMovsCaja');
  if (!caja) {
    caja = document.createElement('div'); caja.id = 'pgMovsCaja';
    if (lbl) { lbl.parentNode.insertBefore(caja, lbl); caja.appendChild(lbl); }
    let x = caja.nextSibling;
    while (x && !(x.classList && x.classList.contains('ajx-note'))) { const sig = x.nextSibling; caja.appendChild(x); x = sig; }
    if (lbl) lbl.hidden = true;
  }
  const n = movs ? movs.children.length : 0;
  let seg = document.getElementById('pgSeg');
  if (!seg) {
    seg = document.createElement('div'); seg.id = 'pgSeg'; seg.className = 'pg-seg'; seg.setAttribute('role', 'tablist');
    const ref = cont.querySelector('.pagos-resumen') || cont.firstChild;
    ref.parentNode.insertBefore(seg, ref.nextSibling);
  }
  seg.innerHTML = '<button type="button" role="tab" aria-selected="' + (pgVista === 'clientes') + '" class="' + (pgVista === 'clientes' ? 'on' : '') + '" onclick="pgVer(\'clientes\')">👥 Clientes</button>'
    + '<button type="button" role="tab" aria-selected="' + (pgVista === 'movs') + '" class="' + (pgVista === 'movs' ? 'on' : '') + '" onclick="pgVer(\'movs\')">🧾 Últimos movimientos' + (n ? ' <span class="sg-fn">' + n + '</span>' : '') + '</button>';
  const verMovs = pgVista === 'movs';
  caja.hidden = !verMovs;
  ['.pagos-filtros', '.pagos-lista'].forEach(function(sel){ const e = cont.querySelector(sel); if (e) e.hidden = verMovs; });
  Array.prototype.forEach.call(cont.querySelectorAll(':scope > .picker-empty'), function(e){ if (!caja.contains(e)) e.hidden = verMovs; });
}

/* =========================================================
   #126 Sonidos: «campanita» al llegar un aviso a la campana y «mensaje enviado» al RECIBIR un mensaje del chat.
   Se pueden quitar en Ajustes → Notificaciones (se guarda en este dispositivo).
   ========================================================= */
const SND_KEY = 'fsd_sonidos';
const SND = { campanita: 'sonidos/campanita.mp3', mensaje: 'sonidos/mensaje_enviado.mp3' };
const sndCache = {};
function sndActivos(){ try { return localStorage.getItem(SND_KEY) !== '0'; } catch(e){ return true; } }
function sndSonar(n){
  if (!sndActivos() || !SND[n]) return;
  try {
    let a = sndCache[n];
    if (!a) { a = sndCache[n] = new Audio(SND[n]); a.preload = 'auto'; a.volume = 0.6; }
    a.currentTime = 0;
    const pr = a.play(); if (pr && pr.catch) pr.catch(function(){});   // el navegador puede bloquearlo hasta el primer toque
  } catch(e){}
}
function sndCambiar(el){
  const on = !el.classList.contains('on');
  try { localStorage.setItem(SND_KEY, on ? '1' : '0'); } catch(e){}
  el.classList.toggle('on', on); el.setAttribute('aria-checked', String(on));
  if (on) sndSonar('campanita');
}
crearAviso = (function(orig){
  return function(dest){
    const antes = dest ? noLeidosTodos(dest) : 0;
    const r = orig.apply(this, arguments);
    try { if (dest && dest === destinatarioActual() && noLeidosTodos(dest) > antes) sndSonar(arguments[1] === 'mensajes' ? 'mensaje' : 'campanita'); } catch(e){}
    return r;
  };
})(crearAviso);
/* avisos que llegan desde otra pestaña o ventana */
let sndUlt = null;
function sndContar(){ try { const d = destinatarioActual(); return d ? noLeidosTodos(d) : 0; } catch(e){ return 0; } }
window.addEventListener('storage', function(e){
  if (e.key !== AVISOS_KEY) return;
  setTimeout(function(){
    const n = sndContar();
    if (sndUlt != null && n > sndUlt) {
      let tipo = ''; try { const l = leerAvisos().lista[destinatarioActual()] || []; tipo = (l[0] || {}).tipo; } catch(e2){}
      sndSonar(tipo === 'mensajes' ? 'mensaje' : 'campanita');
    }
    sndUlt = n;
  }, 0);
});
setTimeout(function(){ sndUlt = sndContar(); }, 0);
/* 21/10 14:38: sin sonido al enviar; el sonido de mensaje suena al RECIBIR uno */
htmlAjustesAvisos = (function(orig){
  return function(rol){
    const h = orig.apply(this, arguments);
    if (!h) return h;
    const on = sndActivos();
    return h + '<div class="list-group"><div class="list-row aviso-row"><span class="aviso-l"><span>🔔 Sonidos</span><small>Campanita al llegar un aviso y sonido al recibir un mensaje</small></span>'
      + '<div class="toggle' + (on ? ' on' : '') + '" role="switch" aria-label="Sonidos" aria-checked="' + on + '" onclick="sndCambiar(this)"><div class="toggle-knob"></div></div></div></div>';
  };
})(htmlAjustesAvisos);

/* =========================================================
   #113 Clientes sin pago: tras el periodo de gracia y sin acceso, la ficha se guarda 15 días;
   si sigue sin pagar, el perfil se borra (lo hace la app al abrirla un profesional).
   - Solo cuando la tarifa está vencida (gracia terminada) y el cliente no tiene acceso.
   - No afecta a clientes de baja ni a los que tienen el acceso permitido a mano.
   - 3 días antes se avisa a los profesionales; en la ficha y en Pagos se ve la fecha de borrado.
   ========================================================= */
const PG_RETENCION = 15;
function pgBorrado(d){
  if (!d || !d.tarifa || (typeof mjEsBaja === 'function' && mjEsBaja(d))) return null;
  const e = estadoPago(d);
  if (e.cod !== 'vencido' || e.acceso || !e.finGracia) return null;
  const fecha = mjSumarDias(e.finGracia, PG_RETENCION);
  return { fecha: fecha, dias: mjDias(mjISO(new Date()), fecha) };
}
function pgBorrarCliente(k){
  const d = clientesData[k]; if (!d) return;
  const nombre = d.nombre;
  delete clientesData[k]; delete SEGUIMIENTOS[k]; delete PLANES[k];
  try {
    const a = leerAvisos();
    delete a.lista[claveCliente(k)]; delete (a.pref || {})[claveCliente(k)];
    Object.keys(a.sinLeer || {}).forEach(function(p){ if (a.sinLeer[p]) delete a.sinLeer[p][k]; });
    delete (a.sinLeer || {})[claveCliente(k)];
    guardarAvisos();
  } catch(e){}
  if (clienteActual === k) clienteActual = null;
  return nombre;
}
function pgRevisarBorrados(){
  if (!coachActivo) return;
  let borrados = [];
  Object.keys(clientesData).forEach(function(k){
    const b = pgBorrado(clientesData[k]); if (!b) return;
    if (b.dias <= 0) { borrados.push(pgBorrarCliente(k)); return; }
    if (b.dias <= 3 && typeof tocaAvisar === 'function' && tocaAvisar('borrado|' + k))
      avisarPros('pendientes', clientesData[k].nombre + ': su perfil se borrará el ' + mjFecha(b.fecha), 'Lleva sin pagar desde el ' + mjFecha(clientesData[k].tarifa.hasta) + '. Registra el pago o descarga sus datos antes.', { cliente: k, vista: 'ficha' });
  });
  borrados = borrados.filter(Boolean);
  if (borrados.length) {
    guardarTodo();
    borrados.forEach(function(n){ avisarPros('pendientes', 'Perfil borrado: ' + n, 'Llevaba ' + PG_RETENCION + ' días sin acceso por falta de pago.', null); });
    try { actualizarPanel(); } catch(e){}
    toast(borrados.length === 1 ? 'Se ha borrado el perfil de ' + borrados[0] + ' (15 días sin pagar)' : 'Se han borrado ' + borrados.length + ' perfiles (15 días sin pagar)');
  }
}
entrarAlPanel = (function(orig){ return function(){ const r = orig.apply(this, arguments); try { pgRevisarBorrados(); } catch(e){} return r; }; })(entrarAlPanel);
/* ficha: fecha de borrado y descarga de sus datos */
function pgDescargarCliente(){
  const k = clienteActual; if (!k || !clientesData[k]) return;
  guardarTodo();
  entregarArchivo('fitness-sin-dramas-' + norm(clientesData[k].nombre).replace(/[^a-z0-9]+/g, '-') + '-' + hoyISO() + '.json', {
    app: 'fitness-sin-dramas', tipo: 'cliente', version: APP_VERSION, creada: new Date().toISOString(),
    datos: { cliente: clientesData[k], plan: PLANES[k] || null, seguimientos: SEGUIMIENTOS[k] || [] }
  });
}
pintarSuscripcionFicha = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const d = clientesData[clienteActual], b = pgBorrado(d), box = document.getElementById('fichaPago');
    if (b && box) {
      const lg = box.querySelector('.list-group');
      const n = document.createElement('div'); n.className = 'pg-borrado';
      n.innerHTML = '🗑️ <b>Su perfil se borrará el ' + mjFecha(b.fecha) + '</b> (' + (b.dias === 1 ? 'mañana' : 'en ' + b.dias + ' días') + ') si no paga. <a href="#" class="lnk" onclick="pgDescargarCliente();return false;">Descargar sus datos</a>';
      if (lg) lg.parentNode.insertBefore(n, lg.nextSibling);
    }
    try { fpAplicar(); } catch(e){}
    return r;
  };
})(pintarSuscripcionFicha);
/* Pagos: el estado indica cuándo se borra */
estadoPago = (function(orig){
  return function(d){
    const r = orig.apply(this, arguments);
    if (r && r.cod === 'vencido' && !r.acceso && !(typeof mjEsBaja === 'function' && mjEsBaja(d)) && d && d.tarifa && d.tarifa.acceso !== 'permitido' && r.finGracia) {
      const f = mjSumarDias(r.finGracia, PG_RETENCION), n = mjDias(mjISO(new Date()), f);
      if (n > 0) r.txt += ' · se borra en ' + n + (n === 1 ? ' día' : ' días');
    }
    return r;
  };
})(estadoPago);

/* =========================================================
   #111 Ordenador en multitarea (ventanas a media pantalla) y #122 barra para ajustar los paneles
   - El modo ordenador se activa desde 900 px (antes 1100).
   - Por debajo de 1280 px el menú lateral se queda en iconos para dejar sitio al trabajo.
   - Entre la lista y el panel derecho hay una barra vertical que se arrastra (o con ← →);
     doble clic la deja como estaba. El ancho se recuerda para cada profesional.
   ========================================================= */
const ESC_LISTA_KEY = 'fsd_esc_lista';
function escListaGuardada(){
  try { const o = JSON.parse(localStorage.getItem(ESC_LISTA_KEY) || '{}'); return coachActivo ? o[norm(coachActivo.u)] : null; } catch(e){ return null; }
}
function escListaGuardar(px){
  try { const o = JSON.parse(localStorage.getItem(ESC_LISTA_KEY) || '{}'); if (coachActivo) { if (px) o[norm(coachActivo.u)] = px; else delete o[norm(coachActivo.u)]; } localStorage.setItem(ESC_LISTA_KEY, JSON.stringify(o)); } catch(e){}
}
function escListaLimites(){
  const menu = document.documentElement.classList.contains('esc-mini') ? 72 : 232;
  const libre = window.innerWidth - menu;
  return { min: 260, max: Math.max(300, Math.round(libre - 380)) };   // a la derecha siempre quedan ≥ 380 px
}
function escListaPoner(px){
  const r = document.documentElement.style;
  if (!px) { r.removeProperty('--esc-lista'); return; }
  const l = escListaLimites();
  r.setProperty('--esc-lista', Math.min(l.max, Math.max(l.min, Math.round(px))) + 'px');
}
function escMini(){
  document.documentElement.classList.toggle('esc-mini', escActivo() && window.innerWidth < 1280);
  escListaPoner(escListaGuardada());
  escDivisor();
}
function escDivisor(){
  let d = document.getElementById('escDivisor');
  const root = document.getElementById('screenRoot');
  const on = escActivo() && root && root.classList.contains('esc-dual');
  if (!d) {
    d = document.createElement('div'); d.id = 'escDivisor'; d.className = 'esc-divisor';
    d.setAttribute('role', 'separator'); d.setAttribute('aria-orientation', 'vertical'); d.tabIndex = 0;
    d.title = 'Arrastra para cambiar el ancho de la lista · doble clic: ancho normal';
    d.setAttribute('aria-label', 'Ancho de la lista');
    document.body.appendChild(d);
    let x0 = 0, w0 = 0, arr = false;
    const ancho = function(){ const izq = document.querySelector('.screen.esc-dual > .esc-izq'); return izq ? izq.getBoundingClientRect().width : 360; };
    d.addEventListener('pointerdown', function(e){
      arr = true; x0 = e.clientX; w0 = ancho(); d.setPointerCapture(e.pointerId);
      document.documentElement.classList.add('esc-arrastrando'); e.preventDefault();
    });
    d.addEventListener('pointermove', function(e){ if (arr) escListaPoner(w0 + e.clientX - x0); });
    const fin = function(){ if (!arr) return; arr = false; document.documentElement.classList.remove('esc-arrastrando'); escListaGuardar(Math.round(ancho())); window.dispatchEvent(new Event('resize')); };
    d.addEventListener('pointerup', fin); d.addEventListener('pointercancel', fin);
    d.addEventListener('dblclick', function(){ escListaGuardar(null); escListaPoner(null); window.dispatchEvent(new Event('resize')); });
    d.addEventListener('keydown', function(e){
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); escListaPoner(ancho() + (e.key === 'ArrowRight' ? 24 : -24)); escListaGuardar(Math.round(ancho()));
    });
  }
  d.hidden = !on;
}
if (typeof escLayout === 'function') escLayout = (function(orig){ return function(){ const r = orig.apply(this, arguments); escMini(); return r; }; })(escLayout);
window.addEventListener('resize', function(){ if (!document.documentElement.classList.contains('esc-arrastrando')) escMini(); });
if (typeof entrarAlPanel === 'function') entrarAlPanel = (function(orig){ return function(){ const r = orig.apply(this, arguments); escMini(); return r; }; })(entrarAlPanel);
/* nombres al pasar el ratón por el menú en iconos */
(function(){
  Array.prototype.forEach.call(document.querySelectorAll('#coachTabs .tbi'), function(b){
    if (!b.title) b.title = (b.getAttribute('aria-label') || b.textContent || '').replace(/\d+$/, '').trim();
  });
})();
escMini();

/* 21/10 14:45 · Tarjeta del cliente: el estado del pago ya tiene su etiqueta abajo; fuera el «💳 …» repetido de los motivos */
if (typeof exPintarFiltros === 'function') exPintarFiltros = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    Array.prototype.forEach.call(document.querySelectorAll('#listaClientes .cliente-card'), function(card){
      const a = card.querySelector('.kc-motivos'); if (!a || !card.querySelector('.kc-pago')) return;
      const t = a.textContent.split(' · ').filter(function(x){ return x.indexOf('💳') !== 0; }).join(' · ');
      if (t) a.textContent = t; else a.remove();
    });
    return r;
  };
})(exPintarFiltros);

/* =========================================================
   #131 Ordenador: al abrir un cliente desde cualquier sitio (Pagos, Chats, avisos, Seguimientos…)
   queda marcado en la lista de Clientes de la izquierda y la lista se desplaza hasta él.
   ========================================================= */
function clMarcarEnLista(){
  if (!(typeof escActivo === 'function' && escActivo()) || !clienteActual) return;
  const claves = Object.keys(clientesData), i = claves.indexOf(clienteActual);
  const cards = document.querySelectorAll('#listaClientes .cliente-card');
  let card = cards[i];
  if (!card) return;
  if (!card.offsetParent && typeof exFiltrar === 'function') { exFiltrar('todos'); card = document.querySelectorAll('#listaClientes .cliente-card')[i]; }
  Array.prototype.forEach.call(document.querySelectorAll('#listaClientes .cliente-card.esc-sel'), function(c){ if (c !== card) c.classList.remove('esc-sel'); });
  if (card) {
    card.classList.add('esc-sel');
    const sc = card.closest('.alta-body') || card.parentElement;
    const r = card.getBoundingClientRect(), rs = sc.getBoundingClientRect();
    if (r.top < rs.top + 8 || r.bottom > rs.bottom - 8) card.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}
goToCliente = (function(orig){ return function(){ const r = orig.apply(this, arguments); setTimeout(clMarcarEnLista, 30); return r; }; })(goToCliente);
/* #139 emojis: los del teclado del dispositivo */
if (typeof toggleEmojis === 'function') toggleEmojis = function(){ const i = document.getElementById('chatInput'); if (i) i.focus(); };

/* ---------- #151 Teléfono: el +34 se queda escrito ----------
   Al entrar en cualquier campo de teléfono vacío aparece «+34 » ya escrito (se puede borrar para otro país);
   si se vuelve a teclear +34 no sale duplicado y si se deja solo el prefijo, el campo queda vacío. */
(function(){
  const PRE = '+34 ';
  const esTel = function(t){ return t && t.tagName === 'INPUT' && t.type === 'tel'; };
  document.addEventListener('focusin', function(e){
    const t = e.target; if (!esTel(t) || t.value.trim()) return;
    t.value = PRE;
    try { t.setSelectionRange(PRE.length, PRE.length); } catch(_){}
  });
  document.addEventListener('input', function(e){
    const t = e.target; if (!esTel(t)) return;
    const v = t.value.replace(/^\+34\s*(\+34|0034)\s*/, PRE).replace(/^\+34\s{2,}/, PRE);
    if (v !== t.value) t.value = v;
  });
  document.addEventListener('focusout', function(e){
    const t = e.target; if (esTel(t) && /^\+34\s*$/.test(t.value)) t.value = '';
  });
})();

/* ---------- #143 Hoy sin «HOY TOCA» ----------
   Fuera las tarjetas «Hoy toca» y «Ahora · comida»: las de Entrenamiento (sesiones de la semana y completadas)
   y Plan nutricional (kcal, comidas y macros) ya hacen de acceso directo a la rutina y al plan. */
exPintarHoyToca = function(){ const c = document.getElementById('hoyToca'); if (c) { c.innerHTML = ''; c.hidden = true; } };
exPintarHoyToca();

/* ---------- #145 «Necesitan atención» = riesgo de abandono ----------
   Solo cuenta: puntuación global baja (menos de 55) en los 2 últimos seguimientos seguidos,
   +48 h sin contestarle o 8 semanas o más con la misma rutina.
   Mensajes sin leer y seguimientos nuevos siguen en la tarjeta como información (en gris), pero no lo marcan. */
const AT_BAJA = 55, AT_SEMANAS_BAJAS = 2;
function atBajas(k){
  const l = SEGUIMIENTOS[k] || []; if (l.length < AT_SEMANAS_BAJAS || typeof puntuacionCliente !== 'function') return 0;
  let n = 0;
  for (let i = 0; i < l.length; i++) { const p = puntuacionCliente(k, i); if (p && p.total != null && p.total < AT_BAJA) n++; else break; }
  return n >= AT_SEMANAS_BAJAS ? n : 0;
}
exMotivos = function(k){
  const d = clientesData[k], m = [];
  if (!d || (typeof mjEsBaja === 'function' && mjEsBaja(d))) return m;
  const b = atBajas(k); if (b) m.push('📉 ' + b + ' semanas con puntuación baja');
  const esp = esperaDesde(k); if (esp && horasDesde(esp) >= ESPERA_ROJA_H) m.push('💬 +48 h sin contestar');
  const r = typeof rutDatos === 'function' ? rutDatos(k) : null;
  if (r && r.sem >= RUT_ROJO && !(coachActivo && coachActivo.rol === 'dietista')) m.push('🏋️ ' + r.sem + ' semanas con la misma rutina');
  return m;
};
exPintarFiltros = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const claves = Object.keys(clientesData);
    Array.prototype.forEach.call(document.querySelectorAll('#listaClientes .cliente-card'), function(card, i){
      const k = claves[i]; if (!k) return;
      const inf = [], msg = msgsSinLeer(k), sg = segsSinVer(k);
      if (msg) inf.push('💬 ' + msg + (msg === 1 ? ' mensaje' : ' mensajes'));
      if (sg) inf.push('📋 ' + (sg === 1 ? 'seguimiento nuevo' : sg + ' seguimientos nuevos'));
      let e = card.querySelector('.kc-info');
      if (inf.length) {
        if (!e) { e = document.createElement('div'); e.className = 'kc-info'; const ref = card.querySelector('.kc-motivos') || card.querySelector('.kc-top'); card.insertBefore(e, ref ? ref.nextSibling : null); }
        e.textContent = inf.join(' · ');
      } else if (e) e.remove();
    });
    return r;
  };
})(exPintarFiltros);

/* ---------- #156 «¿Cómo renovar?» ----------
   Cuando la suscripción está a punto de vencer, ha vencido, está en gracia o el acceso está pausado,
   el cliente ve cómo pagar: Bizum o transferencia, con el concepto ya escrito con su nombre y su tarifa. */
/* Los datos de pago ya no van en el código (repositorio público): se configuran en Ajustes → Pagos de clientes
   → «Bizum y transferencia» y se guardan con la configuración de pagos (ver proteccion.js). */
function rnDatos(){ const c = typeof mjCfgPagos === 'function' ? mjCfgPagos() : {}; return { bizum: [c.bizum1, c.bizum2].filter(Boolean), iban: c.iban || '', titular: c.titular || '', banco: c.banco || '' }; }
function rnConcepto(){
  const d = clientesData[clienteActual] || {}, p = String(d.nombre || '').trim().split(/\s+/);
  const t = d.tarifa && MJ_TARIFAS[d.tarifa.tipo] ? MJ_TARIFAS[d.tarifa.tipo].n.toLowerCase() : '';
  return 'Asesoría ' + p.slice(0, 2).join(' ') + (t ? ' ' + t : '');
}
function rnCopiar(btn, txt){
  const fin = function(){ const o = btn.textContent; btn.textContent = 'Copiado ✓'; setTimeout(function(){ btn.textContent = o; }, 1400); };
  try { navigator.clipboard.writeText(txt).then(fin, function(){ toast(txt); }); } catch(e){ toast(txt); }
}
function rnFila(lbl, val, copia){ return '<div class="rn-fila"><span><small>' + esc(lbl) + '</small><b>' + esc(val) + '</b></span><button type="button" class="rn-cp" data-copiar="' + esc(copia || val) + '" onclick="rnCopiar(this, this.dataset.copiar)">Copiar</button></div>'; }
function rnHtml(abierto){
  const c = rnConcepto(), d = rnDatos();
  let h = '', n = 0;
  if (d.bizum.length) h += '<p class="rn-t">' + (++n) + ' · Bizum</p>' + d.bizum.map(function(x){ return rnFila('Número', x, x.replace(/\s/g, '')); }).join('');
  if (d.iban) h += '<p class="rn-t">' + (++n) + ' · Transferencia bancaria</p>' + rnFila('IBAN' + (d.titular || d.banco ? ' · ' + [d.titular, d.banco].filter(Boolean).join(', ') : ''), d.iban, d.iban.replace(/\s/g, ''));
  if (n) h += '<p class="rn-t">Concepto' + (n > 1 ? ' (en los dos casos)' : '') + '</p>' + rnFila('Escríbelo así', c);
  else h += '<p class="rn-nota">Escribe a Fátima o Domingo por el chat y te dirán cómo pagar.</p>';
  return '<details class="rn-box"' + (abierto ? ' open' : '') + '><summary>¿Cómo renovar?</summary><div class="rn-cuerpo">' + h
    + (n ? '<p class="rn-nota">Cuando lo hayas hecho, avisa a Fátima o Domingo por el chat para que lo registren.</p>' : '') + '</div></details>';
}
mjBannerPago = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const c = document.getElementById('hoyPago');
    if (c && !c.querySelector('.rn-box')) { c.classList.add('rn-con'); c.insertAdjacentHTML('beforeend', rnHtml(false)); }
    return r;
  };
})(mjBannerPago);
mjBloqueoCliente = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const s = document.querySelector('#mjBloqueo .mj-bloq');
    if (r && s && !s.querySelector('.rn-box')) { const row = s.querySelector('.btn-row'); row.insertAdjacentHTML('beforebegin', rnHtml(true)); }
    return r;
  };
})(mjBloqueoCliente);

/* ---------- #157 Avisos de apoyo (ánimo) al cliente ----------
   Una vez por semana como mucho, al abrir la app o enviar el seguimiento:
   · racha buena: 3 o más semanas seguidas completando los entrenos, o 2 seguimientos seguidos con 80 o más → felicitación
   · racha mala: 2 seguimientos seguidos con puntuación baja (menos de 55) o 2 semanas sin entrenar → mensaje de ánimo
   En la campana van justo después de seguimiento y pago. */
TIPOS_CLIENTE.push({ id: 'apoyo', ico: '💪', nombre: 'Mensajes de ánimo', desc: 'Cuando llevas una racha muy buena o una semana difícil' });
AV_PRIORIDAD.apoyo = 3; AV_PRIORIDAD.plan = 4; AV_PRIORIDAD.revisado = 5;
function apSemanasSinEntreno(k){
  const d = clientesData[k], reg = typeof mjRegistro === 'function' ? mjRegistro(k) : null;
  if (!d || !reg || !PLANES[k] || !PLANES[k].ent || PLANES[k].ent.indexOf('ex-item') < 0) return 0;
  if (d.fechaAlta && Date.now() - new Date(d.fechaAlta).getTime() < 21 * 864e5) return 0;
  const sem = {}; (reg.ses || []).forEach(function(f){ sem[mjISO(mjLunes(new Date(f + 'T12:00:00')))] = 1; });
  let l = mjSumarDias(mjISO(mjLunes()), -7), n = 0;
  while (!sem[l] && n < 8) { n++; l = mjSumarDias(l, -7); }
  return n;
}
function apAltas(k){
  const l = SEGUIMIENTOS[k] || []; let n = 0;
  for (let i = 0; i < l.length; i++) { const p = puntuacionCliente(k, i); if (p && p.total != null && p.total >= 80) n++; else break; }
  return n;
}
function apRevisar(){
  const k = clienteActual; if (!k || !window.fsdSesionCliente || isCoachView() || !clientesData[k]) return;
  const dest = claveCliente(k), lunes = mjISO(mjLunes()), nom = String(clientesData[k].nombre || '').split(' ')[0];
  let racha = 0; try { racha = exRachaEntreno(k); } catch(e){}
  const altas = apAltas(k), bajas = atBajas(k), sinEnt = apSemanasSinEntreno(k);
  if ((racha >= 3 || altas >= 2) && tocaAvisarUnaVez('apoyo-bien-' + k + '-' + lunes)) {
    crearAviso(dest, 'apoyo', '🔥 ¡Vas on fire, ' + nom + '!',
      racha >= 3 ? 'Llevas ' + racha + ' semanas seguidas cumpliendo todos tus entrenos. Así se consiguen los resultados: sigue así.'
        : 'Tus últimos ' + altas + ' seguimientos han sido de nota. Estamos muy orgullosos de cómo lo estás haciendo.', { vista: 'progreso' });
  } else if ((bajas >= 2 || sinEnt >= 2) && tocaAvisarUnaVez('apoyo-mal-' + k + '-' + lunes)) {
    crearAviso(dest, 'apoyo', '💙 Ánimo, ' + nom + ': estamos contigo',
      (sinEnt >= 2 ? 'Llevas ' + sinEnt + ' semanas sin registrar entrenos.' : 'Las últimas semanas se han hecho cuesta arriba.')
        + ' Es normal tener rachas así; lo importante es retomar con algo pequeño. Escríbenos y lo ajustamos juntos.', { vista: 'chat' });
  }
}
enterApp = (function(orig){ return function(){ const r = orig.apply(this, arguments); setTimeout(function(){ try { apRevisar(); pintarListas(); } catch(e){} }, 400); return r; }; })(enterApp);
guardarSeguimiento = (function(orig){ return function(){ const r = orig.apply(this, arguments); setTimeout(function(){ try { apRevisar(); pintarListas(); } catch(e){} }, 1600); return r; }; })(guardarSeguimiento);
setTimeout(function(){ try { apRevisar(); pintarListas(); } catch(e){} }, 1500);

/* ---------- #150 Instalar en este ordenador ----------
   En el ordenador (Chrome o Edge), si la app aún no está instalada: botón «Instalar en este ordenador»
   en el pie del menú lateral y la tarjeta de instalar adaptada al ordenador. */
pintarAyudaInstalar = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const pc = typeof escEsOrdenador === 'function' && escEsOrdenador(), puede = pc && !!promptInstalar && !esInstalada();
    const c = document.getElementById('instalarCard');
    if (c && puede) { const b = c.querySelector('b'); if (b) b.textContent = 'Instala la app en este ordenador'; const s = c.querySelector('span'); if (s) s.textContent = 'Tendrás su icono en el escritorio y la barra de tareas, y se abrirá en su propia ventana.'; }
    const pie = document.getElementById('escPie');
    let bt = document.getElementById('escInstalar');
    if (pie && puede && !bt) {
      bt = document.createElement('button'); bt.type = 'button'; bt.id = 'escInstalar'; bt.className = 'esc-pie-btn esc-instalar';
      bt.innerHTML = '<span aria-hidden="true">⬇</span><span>Instalar en este ordenador</span>';
      bt.onclick = instalarApp; pie.insertBefore(bt, pie.firstChild);
    }
    if (bt) bt.style.display = puede ? '' : 'none';
    return r;
  };
})(pintarAyudaInstalar);
pintarAyudaInstalar();

/* ---------- 21/10 · El cliente nunca ve las herramientas de montaje del plan ----------
   Si se entra como cliente con el modo edición de un profesional aún activo (mismo dispositivo),
   se apaga sin guardar nada; y por CSS, fuera de la vista profesional no salen calculadora,
   «Plan rápido», «+ Añadir comida», «+ Añadir sesión» ni los controles de edición. */
function clSinEdicion(){
  const app = document.getElementById('app'); if (!app || isCoachView()) return;
  if (!coachEditing && !app.classList.contains('coach-edit')) return;
  coachEditing = false;
  document.querySelectorAll('.rx-field').forEach(function(f){ f.setAttribute('readonly', 'readonly'); });
  document.querySelectorAll('.meal-block-title,[contenteditable]').forEach(function(t){ t.removeAttribute('contenteditable'); });
  document.querySelectorAll('.chip-x').forEach(function(el){ el.style.display = 'none'; });
  document.querySelectorAll('.chip-add').forEach(function(el){ el.style.display = 'none'; });
  app.classList.remove('coach-edit');
  try { closeExercisePicker(); closeFoodPicker(); cerrarVideoModal(); } catch(e){}
  try { ruPlegableActualizar && ruPlegableActualizar(); } catch(e){}
}
enterApp = (function(orig){ return function(){ clSinEdicion(); const r = orig.apply(this, arguments); clSinEdicion(); return r; }; })(enterApp);
goTo = (function(orig){ return function(){ if (window.fsdSesionCliente) clSinEdicion(); return orig.apply(this, arguments); }; })(goTo);

/* ---------- 21/10 · Entrar al plan desde el chat = igual que desde el cliente ----------
   En la vista del profesional, al cambiar con las pestañas (Chat → Entrenamiento o Nutrición) a SU área,
   se abre como desde la ficha: directamente en modo edición, con el mismo formato (columnas, líneas plegadas…). */
goTo = (function(orig){
  return function(n){
    const r = orig.apply(this, arguments);
    try {
      if (!isCoachView() || coachEditing || !coachActivo || !clienteActual) return r;
      const mia = coachActivo.rol === 'dietista' ? 'plan' : 'entreno';
      if (n === mia && document.getElementById('app').style.display !== 'none') editarPlan();
    } catch(e){}
    return r;
  };
})(goTo);

/* ---------- 21/10 · Domingo: pestaña «Entrenamientos» debajo de Clientes ----------
   Lista de clientes con foto, buscador y estado de su rutina; un toque abre su entreno directamente
   (listo para editar). Atrás vuelve a la lista. */
enPintarTabRol = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    if (coachActivo && coachActivo.rol !== 'dietista') {
      const b = document.getElementById('ctab-planes');
      if (b) { b.hidden = false; b.setAttribute('aria-label', 'Entrenamientos de cada cliente'); }
      setTxt('ctabPlanesTxt', typeof escActivo === 'function' && escActivo() ? 'ENTRENAMIENTOS' : 'ENTRENOS');
    }
    return r;
  };
})(enPintarTabRol);
setTimeout(function(){ try { if (coachActivo) { enPintarTabRol(); pintarTabsPro(); } } catch(e){} }, 0);
window.addEventListener('resize', function(){ try { if (coachActivo) enPintarTabRol(); } catch(e){} });

/* ---------- 21/10 · «Volver» de la barra del plan vuelve a donde estabas ----------
   (Entrenamientos, Nutrición, Chats o la ficha del cliente), igual que el botón atrás. */
(function(){
  const b = document.querySelector('#coachBar [onclick="backToCliente()"]');
  if (b) b.setAttribute('onclick', 'atrasPorNiveles()');
})();

/* ---------- 21/10 · Orden del menú: Clientes · Seguimientos · Entrenamientos · Chats · Pagos · Ajustes (· Más) ---------- */
function clOrdenMenu(){
  const nav = document.getElementById('coachTabs'); if (!nav) return;
  const pie = document.getElementById('escPie');
  ['ctab-clientes', 'ctab-segs', 'ctab-planes', 'ctab-recetas', 'ctab-chats', 'ctab-pagos', 'ctab-ajustes', 'ctab-mas'].forEach(function(id){
    const b = document.getElementById(id); if (b) nav.insertBefore(b, pie && pie.parentNode === nav ? pie : null);
  });
}
clOrdenMenu();
entrarAlPanel = (function(orig){ return function(){ const r = orig.apply(this, arguments); clOrdenMenu(); return r; }; })(entrarAlPanel);

/* ---------- #148 (21/10) · Emojis en el chat del ordenador ----------
   En el móvil se usan los del teclado. En la app de escritorio vuelve el botón 😊 con un panel
   por categorías (Recientes, Caras, Gestos, Deporte, Comida, Símbolos); se inserta donde está el cursor,
   el panel sigue abierto para poner varios y se cierra con Esc o al hacer clic fuera. */
const EMO_CAT = [
  ['rec', '🕘', 'Recientes', []],
  ['car', '😀', 'Caras', '😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😌 😍 🥰 😘 😋 😎 🤩 🥳 😏 🤔 🤨 😐 😶 🙄 😬 😮 😲 😳 🥺 😢 😭 😤 😠 🤯 😱 😓 😩 😫 🥱 😴 🤒 🤕 🤢 🥵 🥶 🤗 🤫 🤭'.split(' ')],
  ['ges', '👍', 'Gestos', '👍 👎 👌 ✌️ 🤞 🤟 🤘 👏 🙌 👐 🤝 🙏 💪 🦵 👊 ✊ 👋 🫶 ❤️ 🧡 💛 💚 💙 💜 🤍 🖤 💔 💯'.split(' ')],
  ['dep', '🏋️', 'Deporte', '🏋️ 🏋️‍♀️ 🤸 🏃 🏃‍♀️ 🚴 🚴‍♀️ 🧘 🧘‍♀️ 🏊 ⛹️ 🧗 🥊 🏆 🥇 🥈 🥉 🎯 ⏱️ ⏰ 📈 📉 🔥 ⚡ 💧 🫀 🦾 👟'.split(' ')],
  ['com', '🥗', 'Comida', '🥗 🍎 🍌 🍓 🫐 🍊 🥑 🥦 🥕 🍅 🥚 🍳 🥩 🍗 🐟 🍤 🍚 🍝 🍞 🥐 🥜 🧀 🥛 ☕ 🍵 🍫 🍪 🍕 🍔 🍟 🌮 🍣 🥤 💊'.split(' ')],
  ['sim', '✅', 'Símbolos', '✅ ❌ ⚠️ ❓ ❗ 💡 📅 📸 🎉 🎊 ✨ ⭐ 🌟 💤 🚀 📝 📌 🔔 💬 👀 ➡️ ⬆️ ⬇️ 🔝'.split(' ')]
];
let emoCat = 'car';
function emoRecientes(){ try { return JSON.parse(localStorage.getItem('fsd_emo_rec') || '[]'); } catch(e){ return []; } }
function emoPintar(){
  const p = document.getElementById('emojiPanel'); if (!p) return;
  const rec = emoRecientes();
  if (emoCat === 'rec' && !rec.length) emoCat = 'car';
  const cat = EMO_CAT.filter(function(c){ return c[0] === emoCat; })[0];
  const lista = emoCat === 'rec' ? rec : cat[3];
  p.innerHTML = '<div class="emo-tabs" role="tablist">' + EMO_CAT.map(function(c){
      if (c[0] === 'rec' && !rec.length) return '';
      return '<button type="button" role="tab" aria-selected="' + (c[0] === emoCat) + '" class="emo-tab' + (c[0] === emoCat ? ' on' : '') + '" title="' + c[2] + '" onclick="emoElegirCat(\'' + c[0] + '\')">' + c[1] + '</button>';
    }).join('') + '</div><div class="emo-tit">' + cat[2] + '</div><div class="emo-grid">'
    + lista.map(function(e){ return '<button type="button" class="emo-b" aria-label="' + e + '" onclick="emoPoner(\'' + e + '\')">' + e + '</button>'; }).join('') + '</div>';
}
function emoElegirCat(c){ emoCat = c; emoPintar(); }
function emoPoner(e){
  insertarEmoji(e);
  let r = emoRecientes().filter(function(x){ return x !== e; }); r.unshift(e); r = r.slice(0, 24);
  try { localStorage.setItem('fsd_emo_rec', JSON.stringify(r)); } catch(err){}
  const i = document.getElementById('chatInput'); if (i) { i.focus(); i.dispatchEvent(new Event('input', { bubbles: true })); }
}
toggleEmojis = function(){
  const i = document.getElementById('chatInput');
  if (!(typeof escActivo === 'function' && escActivo())) { if (i) i.focus(); return; }
  const p = document.getElementById('emojiPanel'), b = document.getElementById('emojiBtn'); if (!p) return;
  if (p.hidden) emoPintar();
  p.hidden = !p.hidden;
  if (b) { b.setAttribute('aria-expanded', String(!p.hidden)); b.classList.toggle('on', !p.hidden); }
  if (i) i.focus();
};
document.addEventListener('keydown', function(e){ if (e.key === 'Escape') { const p = document.getElementById('emojiPanel'); if (p && !p.hidden) { cerrarEmojis(); e.stopPropagation(); } } }, true);
document.addEventListener('mousedown', function(e){
  const p = document.getElementById('emojiPanel'); if (!p || p.hidden || !e.target.closest) return;
  if (!e.target.closest('#emojiPanel') && !e.target.closest('#emojiBtn')) cerrarEmojis();
});

/* ---------- 22/10 · Cliente: al entrar en Entrenamiento, todas las sesiones plegadas ----------
   Aspecto más limpio: el cliente despliega la que le interese tocando su cabecera. */
function clPlegarSesiones(){
  if (!window.fsdSesionCliente || isCoachView()) return;
  sesionCards().forEach(function(c){
    const b = c.querySelector('.sesion-body'), h = c.querySelector('.sesion-head');
    if (b && h && b.style.display !== 'none') toggleSesion(h);
    if (b && !b.style.display) { b.style.display = 'none'; c.classList.remove('open'); const ch = h && h.querySelector('.sesion-chevron'); if (ch) ch.classList.remove('open'); }
  });
}
fsdTras('goTo', function(r, n){ if (n === 'entreno') { clPlegarSesiones(); try { exBarraEntreno(); } catch(e){} } });
