/* =========================================================
   Fitnessindramas — Pulido (25/10/2026, tarea #184)
   · Estados vacíos: sin clientes, un solo mensaje claro (antes salían dos, uno contradictorio).
   · Progreso del cliente: gráfico de su evolución (peso, medidas, pasos, sensaciones…), como el de los profesionales.
   · Microinteracciones: los botones responden al tocarlos (y se respeta «reducir movimiento»).
   ========================================================= */
function puSinClientes(){ return !Object.keys(clientesData || {}).length; }
/* Seguimientos: «No hay clientes en este apartado» sobra si ya dice «Todavía no hay clientes» */
pintarSegsResumen = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    if (puSinClientes()) { const v = document.getElementById('sgVacio'); if (v) v.remove(); }
    return r;
  };
})(pintarSegsResumen);
/* Planes: «Ningún cliente coincide con la búsqueda» solo cuando hay clientes y una búsqueda */
if (typeof plAplicar === 'function') plAplicar = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const vac = document.getElementById('plVacio');
    if (vac && (puSinClientes() || !(plBusca || '').trim())) vac.hidden = true;
    return r;
  };
})(plAplicar);

/* ---------- gráfico de evolución en «Tu progreso» (cliente) ---------- */
function puGraficoCliente(){
  const v = document.getElementById('view-progreso'); if (!v || isCoachView() || !clienteActual) return;
  let g = document.getElementById('pgGraf');
  const hay = GR_METRICAS.some(function(m){ return grSerie(clienteActual, m[0]).length > 1; });
  if (!hay) { if (g) g.remove(); return; }
  if (!g) {
    g = document.createElement('div'); g.id = 'pgGraf'; g.className = 'card pg-graf';
    g.innerHTML = '<div class="card-head"><b>📈 Tu evolución</b><span>semana a semana</span></div><div class="gr-box fg-box"></div>';
    const ring = v.querySelector('.ring-card');
    if (ring) ring.insertAdjacentElement('afterend', g); else v.appendChild(g);
  }
  if (!grSerie(clienteActual, grMetrica).length) grMetrica = GR_METRICAS.filter(function(m){ return grSerie(clienteActual, m[0]).length; })[0][0];
  grPintar(g.querySelector('.gr-box'));
}
fsdTras('goTo', function(r, n){ if (n === 'progreso') setTimeout(puGraficoCliente, 0); });
grPintar = (function(orig){
  return function(boxIn){
    const r = orig.apply(this, arguments);
    if (!boxIn) { const c = document.querySelector('#pgGraf .gr-box'); if (c && c.offsetParent) orig(c); }
    return r;
  };
})(grPintar);
window.addEventListener('resize', function(){ clearTimeout(puGraficoCliente._t); puGraficoCliente._t = setTimeout(function(){ const b = document.querySelector('#pgGraf .gr-box'); if (b && b.offsetParent) grPintar(b); }, 150); });

/* =========================================================
   #212 · Planes de entrenamiento (Domingo): el resumen de los días y el «Volumen semanal por músculo»
   salen plegados, con una línea de resumen; se abren al tocar su título (se recuerda mientras navegas)
   ========================================================= */
const puAbierto = { res: false, mu: false };
function puPlegable(cual, titulo, res, nodo){
  const d = document.createElement('details'); d.className = 'pu-fold'; d.dataset.fold = cual;
  if (puAbierto[cual]) d.open = true;
  d.innerHTML = '<summary><span class="pu-fold-t">' + titulo + '</span><span class="pu-fold-r">' + res + '</span><span class="pu-fold-ch" aria-hidden="true">⌄</span></summary>';
  nodo.parentNode.insertBefore(d, nodo); d.appendChild(nodo);
}
if (typeof entResumenHtml === 'function') entResumenHtml = (function(orig){
  return function(k){
    const t = document.createElement('template'); t.innerHTML = orig.apply(this, arguments);
    const card = t.content.querySelector('.ent-prev-card');
    if (card) {
      const dias = card.querySelectorAll('.fe-dia').length, ej = card.querySelectorAll('.fe-ej').length;
      puPlegable('res', '🏋️ Resumen del entrenamiento', dias ? dias + (dias === 1 ? ' día' : ' días') + ' · ' + ej + (ej === 1 ? ' ejercicio' : ' ejercicios') : 'sin sesiones', card);
    }
    const mu = t.content.querySelector('.mu-box');
    if (mu) {
      const s = mu.querySelector('.mu-cab span');
      puPlegable('mu', '💪 Volumen semanal por músculo', s ? esc(s.textContent.trim()) : '', mu);
    }
    const w = document.createElement('div'); w.appendChild(t.content.cloneNode(true)); return w.innerHTML;
  };
})(entResumenHtml);
document.addEventListener('toggle', function(e){
  const d = e.target; if (!d.classList || !d.classList.contains('pu-fold')) return;
  puAbierto[d.dataset.fold] = d.open;
}, true);
if (typeof muCambiarModo === 'function') muCambiarModo = (function(orig){
  return function(btn){
    const d = btn.closest('.pu-fold'), r = orig.apply(this, arguments);
    if (d) { const s = d.querySelector('.mu-cab span'), x = d.querySelector('.pu-fold-r'); if (s && x) x.textContent = s.textContent.trim(); }
    return r;
  };
})(muCambiarModo);

/* =========================================================
   #218 · Plegables: que se note siempre si están abiertos o cerrados (móvil y ordenador)
   Un mismo patrón en toda la app: flecha en un círculo que gira y se colorea, título teñido con una línea
   de color al abrir, contenido que entra con una animación corta y, en la ficha, lo que pertenece al
   apartado abierto queda unido a él con una línea a la izquierda. Los lectores de pantalla oyen abierto/cerrado.
   ========================================================= */
fpAplicar = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const v = document.getElementById('view-coach-cliente'); if (!v) return r;
    Array.prototype.forEach.call(v.querySelectorAll('.alta-label.fp-lbl'), function(lbl){
      const ab = lbl.classList.contains('fp-abierto'), cont = fpContenido(lbl);
      cont.forEach(function(x, i){ x.classList.toggle('fp-dentro', ab); x.classList.toggle('fp-dentro-fin', ab && i === cont.length - 1); });
      const ch = lbl.querySelector('.fp-chev'); if (ch) ch.textContent = '⌄';
    });
    return r;
  };
})(fpAplicar);
/* sesiones y comidas: estado para lectores de pantalla y teclado */
function puAria(){
  Array.prototype.forEach.call(document.querySelectorAll('#sesionesCont .sesion-head'), function(h){
    const c = h.parentElement; h.setAttribute('role', 'button'); if (!h.hasAttribute('tabindex')) h.tabIndex = 0;
    h.setAttribute('aria-expanded', c.classList.contains('open') ? 'true' : 'false');
  });
  Array.prototype.forEach.call(document.querySelectorAll('#comidasCont .meal-head'), function(h){
    const b = h.nextElementSibling; h.setAttribute('role', 'button'); if (!h.hasAttribute('tabindex')) h.tabIndex = 0;
    h.setAttribute('aria-expanded', b && b.classList.contains('open') ? 'true' : 'false');
  });
}
if (typeof toggleSesion === 'function') toggleSesion = (function(orig){ return function(){ const r = orig.apply(this, arguments); puAria(); return r; }; })(toggleSesion);
if (typeof toggleMealBlock === 'function') toggleMealBlock = (function(orig){ return function(){ const r = orig.apply(this, arguments); puAria(); return r; }; })(toggleMealBlock);
fsdTras('goTo', function(){ setTimeout(puAria, 0); });
document.addEventListener('keydown', function(e){
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const h = e.target.closest && e.target.closest('#sesionesCont .sesion-head, #comidasCont .meal-head');
  if (!h || e.target !== h) return;
  e.preventDefault(); h.click();
});

/* =========================================================
   25/10 · Ficha en el ordenador: dos columnas fijas (izquierda: evolución, sensaciones, peso y fotos;
   derecha: el resto). Antes las columnas se repartían solas y, al desplegar un apartado, otros saltaban
   de columna y el contenido parecía abrirse por encima.
   ========================================================= */
if (typeof escAgruparFicha === 'function') escAgruparFicha = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const grid = document.getElementById('escFichaGrid'); if (!grid) return r;
    grid.classList.add('pu-cols');
    let a = grid.querySelector(':scope > .esc-col-a'), b = grid.querySelector(':scope > .esc-col-b');
    if (!a) { a = document.createElement('div'); a.className = 'esc-col esc-col-a'; grid.insertBefore(a, grid.firstChild); }
    if (!b) { b = document.createElement('div'); b.className = 'esc-col esc-col-b'; a.insertAdjacentElement('afterend', b); }
    const orden = ESC_GRUPOS[coachActivo && coachActivo.rol === 'dietista' ? 'dietista' : 'entrenador'];
    const grupos = Array.prototype.slice.call(grid.querySelectorAll('.esc-grupo'));
    grupos.sort(function(x, y){ return orden.indexOf(x.dataset.g) - orden.indexOf(y.dataset.g); });
    grupos.forEach(function(g){ (g.dataset.g === 'segui' ? a : b).appendChild(g); });
    return r;
  };
})(escAgruparFicha);

/* =========================================================
   #221 Pagos: al tocar un cliente se despliega ahí mismo su «Suscripción»
   (el mismo bloque de la ficha, con sus botones), sin ir a la ficha
   ========================================================= */
let pgAbierto = null, pgPintando = false;
function pgElegir(k){
  if (clienteActual === k) return;
  try { guardarPlan(); } catch(e){}
  clienteActual = k;
  try { cargarPlan(k); } catch(e){}
}
function pgDesplegar(k){
  pgAbierto = pgAbierto === k ? null : k;
  if (pgAbierto) pgElegir(k);
  pintarPagosPro();
}
function pgPanelHtml(k){
  pgElegir(k);
  pintarSuscripcionFicha();
  const box = document.getElementById('fichaPago'); if (!box) return '';
  const c = box.cloneNode(true);
  c.removeAttribute('id');
  Array.prototype.forEach.call(c.querySelectorAll('.alta-label'), function(x){ x.remove(); });
  Array.prototype.forEach.call(c.querySelectorAll('.fp-oculto,.fp-dentro,.fp-dentro-fin'), function(x){ x.classList.remove('fp-oculto', 'fp-dentro', 'fp-dentro-fin'); });
  Array.prototype.forEach.call(c.querySelectorAll('[id]'), function(x){ x.removeAttribute('id'); });
  return c.innerHTML + '<a href="#" class="lnk pg-ficha-lnk" onclick="mjAbrirFichaPago(\'' + k + '\');return false;">Ver ficha completa ›</a>';
}
pintarPagosPro = (function(orig){
  return function(){
    pgPintando = true;
    let r;
    try {
      r = orig.apply(this, arguments);
      const l = document.querySelector('#pagosPro .pagos-lista');
      if (l) Array.prototype.forEach.call(l.querySelectorAll('.pago-fila'), function(f){
        const m = (f.getAttribute('onclick') || '').match(/mjAbrirFichaPago\('([^']+)'\)/);
        if (!m) return;
        const k = m[1], ab = pgAbierto === k;
        f.setAttribute('onclick', "pgDesplegar('" + k + "')");
        f.setAttribute('aria-expanded', ab ? 'true' : 'false');
        f.classList.add('pg-plegable'); f.classList.toggle('pg-abierta', ab);
        if (ab && clientesData[k]) {
          const p = document.createElement('div');
          p.className = 'pg-panel'; p.setAttribute('role', 'region'); p.setAttribute('aria-label', 'Suscripción de ' + clientesData[k].nombre);
          p.innerHTML = pgPanelHtml(k);
          f.parentNode.insertBefore(p, f.nextSibling);
        }
      });
    } finally { pgPintando = false; }
    return r;
  };
})(pintarPagosPro);
/* al registrar un pago, cambiar el acceso, la tarifa o la baja: se refresca la lista sin cerrar el panel */
pintarSuscripcionFicha = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    if (!pgPintando && pgAbierto && pgAbierto === clienteActual) {
      const v = document.getElementById('view-coach-pagos');
      if (v && v.style.display !== 'none' && v.offsetParent !== null) setTimeout(function(){ if (!pgPintando) pintarPagosPro(); }, 0);
    }
    return r;
  };
})(pintarSuscripcionFicha);
/* las tarjetas de adherencia pueden quedar fuera del documento entre pintadas (p. ej. al desplegar Pagos);
   antes de abrir una ficha se devuelven a su sitio para que se puedan rellenar */
goToCliente = (function(orig){
  return function(){
    try {
      const v = document.getElementById('view-coach-cliente');
      if (v && typeof fpAdh === 'object') ['e', 'n'].forEach(function(t){ const w = fpAdh[t]; if (w && !w.isConnected) v.appendChild(w); });
    } catch(e){}
    return orig.apply(this, arguments);
  };
})(goToCliente);

/* =========================================================
   #227 Chat en el ordenador (pestaña Chats): la lista ya dice con quién hablas,
   así que la barra de arriba no repite el nombre ni enseña «Volver»
   ========================================================= */
function puChatEsc(){
  const c = document.getElementById('content');
  const enChat = !!(c && c.classList.contains('en-chat') && coachActivo && isCoachView());
  const esc = typeof escActivo === 'function' && escActivo();
  const on = enChat && esc && typeof tabProActual !== 'undefined' && tabProActual === 'chats';
  document.documentElement.classList.toggle('esc-chat-pro', on);
  /* chat 1 · móvil del profesional: cabecera de una línea (Volver · foto · nombre · Ficha, Plan y Seguimientos) */
  document.documentElement.classList.toggle('chat-pro-movil', enChat && !esc);
  if (enChat && !esc) puChatCabecera();
}
function puChatCabecera(){
  const bar = document.getElementById('coachBar'), k = clienteActual, d = k && clientesData[k];
  if (!bar || !d) return;
  let a = document.getElementById('chatAccPro');
  if (!a) { a = document.createElement('div'); a.id = 'chatAccPro'; a.className = 'chat-acc-pro'; bar.appendChild(a); }
  const nutri = coachActivo && coachActivo.rol === 'dietista';
  const firma = k + '|' + (coachActivo && coachActivo.rol);
  if (a.dataset.k !== firma) {
    a.dataset.k = firma;
    a.innerHTML = '<button type="button" onclick="backToCliente()" aria-label="Ficha de ' + esc(d.nombre) + '" title="Ficha"><span aria-hidden="true">👤</span><small>Ficha</small></button>'
      + '<button type="button" onclick="' + (nutri ? 'enAbrirPlanNutri()' : 'enAbrirPlan(clienteActual)') + '" aria-label="Plan de ' + (nutri ? 'nutrición' : 'entrenamiento') + '" title="Plan"><span aria-hidden="true">' + (nutri ? '🍽️' : '🏋️') + '</span><small>Plan</small></button>'
      + '<button type="button" onclick="goToSeguimientos()" aria-label="Seguimientos" title="Seguimientos"><span aria-hidden="true">📋</span><small>Segs.</small></button>';
  }
  let av = document.getElementById('chatAvPro');
  const nom = document.getElementById('coachBarName');
  if (!av && nom) { av = document.createElement('span'); av.id = 'chatAvPro'; av.className = 'chat-av-pro'; av.setAttribute('aria-hidden', 'true'); nom.parentNode.insertBefore(av, nom); }
  if (av) {
    const foto = typeof fotoDe === 'function' ? fotoDe('cliente:' + k) : '';
    const html = foto ? '<img src="' + esc(foto) + '" alt="">' : esc((d.nombre || '?').charAt(0).toUpperCase());
    if (av.dataset.k !== k) { av.dataset.k = k; av.innerHTML = html; }
  }
}
(function(){
  const c = document.getElementById('content');
  if (c && window.MutationObserver) new MutationObserver(puChatEsc).observe(c, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', puChatEsc);
})();
abrirTabPro = (function(orig){ return function(){ const r = orig.apply(this, arguments); puChatEsc(); return r; }; })(abrirTabPro);

/* =========================================================
   #226 Hasta 3 opciones por fila (proteína, hidratos o grasa) en cada comida
   Tocar una opción la añade o la quita; la cantidad de la fila se reparte entre las elegidas
   para que la comida siga cuadrando (cliente, y Fátima en modo edición).
   ========================================================= */
function puRecalcComida(mb){
  try { if (mb) updateMealSummary(mb); } catch(e){}
  try { calcularPlan(); } catch(e){}
  try { if (typeof exResumenComidas === 'function') exResumenComidas(); } catch(e){}
  try { if (typeof pintarResumenGramos === 'function') pintarResumenGramos(); } catch(e){}
  try { if (typeof nhPintar === 'function') nhPintar(); } catch(e){}
  try { if (isCoachView() && typeof enUndoRegistrar === 'function') enUndoRegistrar(); } catch(e){}
  if (!isCoachView()) { try { programarGuardado(); } catch(e){} }
}
pick = (function(orig){
  return function(el){
    const g = el && el.closest && el.closest('#comidasCont .macro-group');
    if (!g || (isCoachView() && !coachEditing)) return orig.apply(this, arguments);
    const sel = Array.prototype.slice.call(g.querySelectorAll('.chip.selected'));
    const mb = el.closest('.meal-block');
    if (el.classList.contains('selected')) {
      if (sel.length > 1) { el.classList.remove('selected'); puRecalcComida(mb); toast('Quitado: ' + chipName(el)); return; }
      if (isCoachView()) return orig.apply(this, arguments);           // Fátima puede dejar la fila sin elegir
      toast('Deja al menos una opción en cada fila'); return;
    }
    if (!sel.length) return orig.apply(this, arguments);
    if (sel.length >= NU_MAX_COMBINAR) { toast('Puedes combinar hasta ' + NU_MAX_COMBINAR + ' opciones: quita una antes'); return; }
    el.classList.add('selected');
    puRecalcComida(mb);
    toast('Añadido: ' + chipName(el) + ' · ahora combinas ' + (sel.length + 1));
  };
})(pick);
/* chat 2 · móvil del profesional: en el chat de un cliente se mantiene la barra principal (Chats marcado) */
pintarTabsPro = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const nav = document.getElementById('coachTabs');
    const en = document.documentElement.classList.contains('chat-pro-movil') && pantallaVisible() === 'app';
    if (nav && en) {
      nav.hidden = false;
      Array.prototype.forEach.call(nav.querySelectorAll('.tbi'), function(b){ b.classList.toggle('active', b.id === 'ctab-chats'); });
    }
    return r;
  };
})(pintarTabsPro);
abrirTabPro = (function(orig){
  return function(){
    if (pantallaVisible() === 'app' && isCoachView()) { try { backToCliente(); } catch(e){} }   // sale del cliente guardando, como «Volver»
    return orig.apply(this, arguments);
  };
})(abrirTabPro);
(function(){
  const c = document.getElementById('content');
  if (c && window.MutationObserver) new MutationObserver(function(){ try { pintarTabsPro(); } catch(e){} }).observe(c, { attributes: true, attributeFilter: ['class'] });
})();
/* chat 3 · lista de chats con tres niveles: normal (<24 h), ámbar (24-48 h) y rojo (+48 h); el aviso sale una sola vez */
const PU_CHAT_AMBAR_H = 24;
pintarChatsPro = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const cont = document.getElementById('chatsPro'); if (!cont) return r;
    const datos = {}; datosChats().forEach(function(x){ datos[x.k] = x; });
    Array.prototype.forEach.call(cont.querySelectorAll('.chat-fila'), function(f){
      const m = (f.getAttribute('onclick') || '').match(/abrirChatPro\('([^']+)'\)/); const x = m && datos[m[1]]; if (!x) return;
      f.classList.remove('rojo', 'espera', 'nv-amb', 'nv-roj');
      const t = f.querySelector('.chat-fila-t'), est = f.querySelector('.chat-fila-est:not(.dd-fila)');
      if (!x.esp) return;
      const nivel = x.h >= ESPERA_ROJA_H ? 'nv-roj' : (x.h >= PU_CHAT_AMBAR_H ? 'nv-amb' : 'espera');
      f.classList.add(nivel);
      if (t) t.textContent = '';                                     // el tiempo ya va en el aviso
      if (est) est.textContent = nivel === 'espera' ? 'Esperando tu respuesta · ' + textoEspera(x.h) : (nivel === 'nv-roj' ? '⚠️ ' : '⏱ ') + 'Sin contestar · ' + textoEspera(x.h).replace('hace ', '');
    });
    return r;
  };
})(pintarChatsPro);
/* chat 4 · buscador por nombre y filtros rápidos en la lista de chats */
let puChatFiltro = 'todos', puChatQ = '';
const PU_CHAT_FILTROS = [['todos', 'Todos'], ['sin', 'Sin contestar'], ['duda', '❓ Con duda'], ['leer', 'Sin leer']];
function puChatCumple(f, filtro){
  if (filtro === 'sin') return f.classList.contains('espera') || f.classList.contains('nv-amb') || f.classList.contains('nv-roj');
  if (filtro === 'duda') return !!f.querySelector('.dd-fila');
  if (filtro === 'leer') return !!f.querySelector('.chat-fila-n');
  return true;
}
function puChatFiltrar(){
  const cont = document.getElementById('chatsPro'); if (!cont) return;
  const q = norm(puChatQ.trim());
  const filas = Array.prototype.slice.call(cont.querySelectorAll('.chat-fila'));
  let vis = 0;
  filas.forEach(function(f){
    const nom = norm(((f.querySelector('.chat-fila-top b') || {}).textContent || ''));
    const ok = (!q || nom.indexOf(q) > -1) && puChatCumple(f, puChatFiltro);
    f.hidden = !ok; if (ok) vis++;
  });
  Array.prototype.forEach.call(cont.querySelectorAll('.chat-filas'), function(l){
    const algo = Array.prototype.some.call(l.querySelectorAll('.chat-fila'), function(f){ return !f.hidden; });
    l.hidden = !algo; const lbl = l.previousElementSibling; if (lbl && lbl.classList.contains('alta-label')) lbl.hidden = !algo;
  });
  Array.prototype.forEach.call(document.querySelectorAll('#puChatChips .chip'), function(c){
    const on = c.dataset.v === puChatFiltro; c.classList.toggle('selected', on); c.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  let v = document.getElementById('puChatVacio');
  if (!vis) { if (!v) { v = document.createElement('div'); v.id = 'puChatVacio'; v.className = 'picker-empty'; cont.appendChild(v); } v.textContent = q ? 'Ningún chat coincide con «' + puChatQ.trim() + '».' : 'No hay chats en este apartado.'; }
  else if (v) v.remove();
}
function puChatElegir(f){ puChatFiltro = f; puChatFiltrar(); }
pintarChatsPro = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const cont = document.getElementById('chatsPro'); if (!cont || !cont.querySelector('.chat-fila')) return r;
    const filas = Array.prototype.slice.call(cont.querySelectorAll('.chat-fila'));
    const n = {}; PU_CHAT_FILTROS.forEach(function(x){ n[x[0]] = filas.filter(function(f){ return puChatCumple(f, x[0]); }).length; });
    const barra = document.createElement('div'); barra.className = 'pu-chat-barra';
    barra.innerHTML = '<input type="search" id="puChatQ" class="pu-chat-q" placeholder="Buscar cliente" aria-label="Buscar chat por nombre" autocomplete="off" value="' + esc(puChatQ) + '">'
      + '<div class="chips pu-chat-chips" id="puChatChips" role="tablist">' + PU_CHAT_FILTROS.map(function(x){
          return '<button type="button" role="tab" class="chip protein" data-v="' + x[0] + '" onclick="puChatElegir(\'' + x[0] + '\')">' + x[1] + (x[0] !== 'todos' && n[x[0]] ? ' <span class="sg-fn">' + n[x[0]] + '</span>' : '') + '</button>'; }).join('') + '</div>';
    const stats = cont.querySelector('.chats-stats');
    if (stats) stats.insertAdjacentElement('afterend', barra); else cont.insertBefore(barra, cont.firstChild);
    barra.querySelector('#puChatQ').addEventListener('input', function(){ puChatQ = this.value; puChatFiltrar(); });
    puChatFiltrar();
    return r;
  };
})(pintarChatsPro);
/* chat 5 · separadores de día («Hoy», «Ayer», «Lunes 20/10») y hora en cada mensaje.
   Cada mensaje nuevo guarda su momento (data-ts); los antiguos no tienen hora y no se inventa. */
function puTs(b){ if (b && b.classList && b.classList.contains('bubble') && !b.dataset.ts) b.dataset.ts = new Date().toISOString(); return b; }
burbujaNueva = (function(orig){ return function(){ return puTs(orig.apply(this, arguments)); }; })(burbujaNueva);
meterEnChat = (function(orig){ return function(b){ puTs(b); return orig.apply(this, arguments); }; })(meterEnChat);
function puDiaTxt(d){
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const dif = Math.round((hoy - x) / 864e5);
  if (dif === 0) return 'Hoy';
  if (dif === 1) return 'Ayer';
  const dd = ('0' + x.getDate()).slice(-2) + '/' + ('0' + (x.getMonth() + 1)).slice(-2);
  if (dif > 1 && dif < 7) return ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][x.getDay()] + ' ' + dd;
  return dd + '/' + x.getFullYear();
}
let puFechasOcupado = false;
function puChatFechas(){
  const l = document.getElementById('chatList'); if (!l || puFechasOcupado) return;
  puFechasOcupado = true;
  try {
    Array.prototype.forEach.call(l.querySelectorAll('.chat-dia'), function(s){ s.remove(); });
    let ult = '';
    Array.prototype.forEach.call(l.querySelectorAll('.bubble[data-ts]'), function(b){
      const d = new Date(b.dataset.ts); if (isNaN(d)) return;
      const hora = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
      if (b.dataset.hora !== hora) b.dataset.hora = hora;
      const dia = puDiaTxt(d);
      if (dia !== ult) {
        ult = dia;
        const s = document.createElement('div'); s.className = 'chat-dia'; s.setAttribute('role', 'separator');
        s.innerHTML = '<span>' + dia + '</span>';
        const fila = b.closest('.msg-row') || b;                 // si la burbuja va envuelta con su foto
        fila.parentNode.insertBefore(s, fila);
      }
    });
  } finally { setTimeout(function(){ puFechasOcupado = false; }, 0); }
}
(function(){
  const l = document.getElementById('chatList'); if (!l || !window.MutationObserver) return;
  let pend = false;
  new MutationObserver(function(recs){
    /* un mensaje que se añade solo (sin vaciar la lista) es nuevo: se le pone la hora; al cargar un chat se reemplaza todo y no se toca */
    recs.forEach(function(r){
      if (r.removedNodes.length) return;
      const nuevos = Array.prototype.filter.call(r.addedNodes, function(n){ return n.nodeType === 1 && n.classList.contains('bubble'); });
      if (nuevos.length && nuevos.length <= 3) nuevos.forEach(puTs);
    });
    if (pend || puFechasOcupado) return; pend = true; requestAnimationFrame(function(){ pend = false; puChatFechas(); });
  }).observe(l, { childList: true });
})();
/* los separadores no se guardan en el chat */
guardarChat = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const p = clienteActual && PLANES[clienteActual];
    if (p && typeof p.chat === 'string' && p.chat.indexOf('chat-dia') > -1) {
      const t = document.createElement('template'); t.innerHTML = p.chat;
      Array.prototype.forEach.call(t.content.querySelectorAll('.chat-dia'), function(x){ x.remove(); });
      p.chat = t.innerHTML;
    }
    return r;
  };
})(guardarChat);
/* la cabecera compacta y la barra principal también al volver a abrir un chat (la clase en-chat puede no cambiar) */
['abrirChatPro', 'verConversacion', 'goTo', 'showScreen', 'backToCliente'].forEach(function(n){
  if (typeof window[n] !== 'function') return;
  const orig = window[n];
  window[n] = function(){ const r = orig.apply(this, arguments); try { puChatEsc(); pintarTabsPro(); } catch(e){} return r; };
});
/* chat 6 · «Mensajes nuevos» antes del primero sin leer y botón «↓» para bajar al final */
function puMarcarNuevos(n){
  const l = document.getElementById('chatList'); if (!l) return;
  Array.prototype.forEach.call(l.querySelectorAll('.chat-nuevos'), function(x){ x.remove(); });
  if (!n) return;
  const otros = Array.prototype.filter.call(l.querySelectorAll('.bubble'), function(b){ return !b.classList.contains('msg-mio'); });
  const primero = otros[Math.max(0, otros.length - n)]; if (!primero) return;
  const s = document.createElement('div'); s.className = 'chat-nuevos'; s.setAttribute('role', 'separator');
  s.innerHTML = '<span>' + n + (n === 1 ? ' mensaje nuevo' : ' mensajes nuevos') + '</span>';
  primero.parentNode.insertBefore(s, primero);
  setTimeout(function(){ try { l.scrollTop = Math.max(0, s.offsetTop - l.offsetTop - 12); } catch(e){} puBajarPintar(); }, 60);
}
(function(){
  const envolver = function(nombre, cuantos){
    if (typeof window[nombre] !== 'function') return;
    const orig = window[nombre];
    window[nombre] = function(){
      let n = 0; try { n = cuantos.apply(this, arguments) || 0; } catch(e){}
      const r = orig.apply(this, arguments);
      if (n) setTimeout(function(){ puMarcarNuevos(n); }, 30);
      return r;
    };
  };
  envolver('abrirChatPro', function(k){ return msgsSinLeer(k); });
  envolver('verConversacion', function(){ return clienteActual ? msgsSinLeer(clienteActual) : 0; });
  envolver('goTo', function(v){ return v === 'chat' && !isCoachView() && typeof clChatSinLeer === 'function' && clienteActual ? clChatSinLeer(clienteActual) : 0; });
})();
guardarChat = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const p = clienteActual && PLANES[clienteActual];
    if (p && typeof p.chat === 'string' && p.chat.indexOf('chat-nuevos') > -1) {
      const t = document.createElement('template'); t.innerHTML = p.chat;
      Array.prototype.forEach.call(t.content.querySelectorAll('.chat-nuevos'), function(x){ x.remove(); });
      p.chat = t.innerHTML;
    }
    return r;
  };
})(guardarChat);
function puBajarPintar(){
  const l = document.getElementById('chatList'), v = document.getElementById('view-chat'); if (!l || !v) return;
  let b = document.getElementById('chatBajar');
  if (!b) {
    b = document.createElement('button'); b.type = 'button'; b.id = 'chatBajar'; b.className = 'chat-bajar'; b.setAttribute('aria-label', 'Ir al último mensaje'); b.innerHTML = '↓';
    b.addEventListener('click', function(){ try { l.scrollTo({ top: l.scrollHeight, behavior: 'smooth' }); } catch(e){ l.scrollTop = l.scrollHeight; } });
    l.insertAdjacentElement('afterend', b);
  }
  b.hidden = l.scrollHeight - l.clientHeight - l.scrollTop < 160;
}
(function(){ const l = document.getElementById('chatList'); if (l) l.addEventListener('scroll', function(){ puBajarPintar(); }, { passive: true }); })();
/* chat 8 · «✓ Marcar como resuelto»: quita el «Sin contestar» sin escribir nada al cliente (él no ve nada) */
esperaDesde = (function(orig){
  return function(k){
    const r = orig.apply(this, arguments);
    const d = clientesData[k], res = d && d.chatT && d.chatT.resuelto;
    if (!r || !res) return r;
    const pend = d.chatT.cli.filter(function(t){ return t > res && t >= r; });
    return pend.length ? pend[0] : null;
  };
})(esperaDesde);
function puResolver(){
  const k = clienteActual; if (!k || !coachActivo) return;
  const c = chatT(k); c.resuelto = new Date().toISOString();
  try { guardarTodo(); } catch(e){}
  puPendPintar();
  try { if (typeof pintarChatsPro === 'function') pintarChatsPro(); } catch(e){}
  try { if (typeof actualizarPanel === 'function') actualizarPanel(); } catch(e){}
  toast('Marcado como resuelto');
}
function puPendPintar(){
  const barra = document.getElementById('emojiPanel') || document.getElementById('composer'); if (!barra) return;
  let b = document.getElementById('chatPend');
  const k = clienteActual, esp = k && coachActivo && isCoachView() ? esperaDesde(k) : null;
  if (!esp) { if (b) b.hidden = true; return; }
  if (!b) { b = document.createElement('div'); b.id = 'chatPend'; b.className = 'chat-pend'; barra.parentNode.insertBefore(b, barra); }
  b.hidden = false;
  b.innerHTML = '<span>⏳ Esperando respuesta · ' + esc(textoEspera(horasDesde(esp))) + '</span><button type="button" onclick="puResolver()">✓ Marcar como resuelto</button>';
}
['abrirChatPro', 'verConversacion', 'sendMsg', 'goTo'].forEach(function(n){
  if (typeof window[n] !== 'function') return;
  const orig = window[n];
  window[n] = function(){ const r = orig.apply(this, arguments); setTimeout(function(){ try { puPendPintar(); } catch(e){} }, 40); return r; };
});
/* chat 12 · galería con todas las fotos de la conversación (cliente y profesionales) */
function puFotosChat(){
  return Array.prototype.filter.call(document.querySelectorAll('#chatList .bubble img'), function(i){ return i.src && !i.closest('.msg-av, .msg-av2, .yt-card'); });
}
function puGaleria(){
  const fotos = puFotosChat();
  if (!fotos.length) { toast('Todavía no hay fotos en este chat'); return; }
  const o = mjHoja('chatGaleria');
  o.innerHTML = '<div class="fsd-sheet"><div class="sheet-head"><h3>Fotos del chat · ' + fotos.length + '</h3><button class="x-btn" onclick="mjCerrarHoja(\'chatGaleria\')" aria-label="Cerrar">×</button></div>'
    + '<div class="pu-gal"></div><p class="ajx-note">Toca una foto para verla en grande. Las más recientes salen primero.</p></div>';
  const g = o.querySelector('.pu-gal');
  fotos.slice().reverse().forEach(function(im, i){
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pu-gal-it'; b.setAttribute('aria-label', 'Ver foto ' + (i + 1));
    const c = document.createElement('img'); c.src = im.src; c.alt = ''; c.loading = 'lazy';
    b.appendChild(c);
    b.addEventListener('click', function(){ cmAbrirVisor(im.src, 'Foto del chat'); });
    g.appendChild(b);
  });
  o.classList.add('show');
}
function puGaleriaBotones(){
  const n = puFotosChat().length;
  const txt = '🖼️ Fotos' + (n ? ' · ' + n : '');
  const row = document.querySelector('#view-chat > .team-row');
  if (row) {
    let c = document.getElementById('chatGalChip');
    if (!c) { c = document.createElement('button'); c.type = 'button'; c.id = 'chatGalChip'; c.className = 'team-chip pu-gal-chip'; c.onclick = puGaleria; row.appendChild(c); }
    if (c.textContent !== txt) c.textContent = txt;
  }
  const acc = document.getElementById('chatAccPro');
  if (acc && !acc.querySelector('.pu-gal-btn')) acc.insertAdjacentHTML('afterbegin', '<button type="button" class="pu-gal-btn" onclick="puGaleria()" aria-label="Fotos del chat" title="Fotos"><span aria-hidden="true">🖼️</span><small>Fotos</small></button>');
}
(function(){
  const l = document.getElementById('chatList'); if (!l || !window.MutationObserver) return;
  let pend = false;
  new MutationObserver(function(){ if (pend) return; pend = true; requestAnimationFrame(function(){ pend = false; try { puGaleriaBotones(); } catch(e){} }); }).observe(l, { childList: true });
})();
['abrirChatPro', 'verConversacion', 'goTo'].forEach(function(n){
  if (typeof window[n] !== 'function') return;
  const orig = window[n];
  window[n] = function(){ const r = orig.apply(this, arguments); setTimeout(function(){ try { puGaleriaBotones(); } catch(e){} }, 50); return r; };
});
/* chat 13 · borrador por cliente: lo que dejas a medio escribir sigue ahí al volver (solo en este dispositivo) */
const PU_BORR_KEY = 'fsd_borradores';
function puBorrClave(){ return clienteActual ? ((coachActivo && isCoachView()) ? 'pro:' + norm(coachActivo.u) : 'cli') + ':' + clienteActual : null; }
function puBorrLeer(){ try { return JSON.parse(localStorage.getItem(PU_BORR_KEY) || '{}') || {}; } catch(e){ return {}; } }
function puBorrGuardar(txt){
  const k = puBorrClave(); if (!k) return;
  const b = puBorrLeer();
  if (txt && txt.trim()) b[k] = txt.slice(0, 4000); else delete b[k];
  try { localStorage.setItem(PU_BORR_KEY, JSON.stringify(b)); } catch(e){}
}
let puBorrT = null;
(function(){
  const i = document.getElementById('chatInput'); if (!i) return;
  i.addEventListener('input', function(){ if (i.dataset.puRest) return; clearTimeout(puBorrT); const v = i.value; puBorrT = setTimeout(function(){ puBorrGuardar(v); }, 250); });
})();
function puBorrPoner(){
  const i = document.getElementById('chatInput'), k = puBorrClave(); if (!i || !k) return;
  const v = puBorrLeer()[k] || '';
  if (i.dataset.puK === k && i.value) return;            // ya es el de este chat
  i.dataset.puK = k;
  if (i.value === v) return;
  clearTimeout(puBorrT);
  i.dataset.puRest = '1'; i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); delete i.dataset.puRest;
}
sendMsg = (function(orig){ return function(){ const r = orig.apply(this, arguments); clearTimeout(puBorrT); puBorrGuardar(''); return r; }; })(sendMsg);
['abrirChatPro', 'verConversacion', 'goTo'].forEach(function(n){
  if (typeof window[n] !== 'function') return;
  const orig = window[n];
  window[n] = function(v){ const r = orig.apply(this, arguments); if (n !== 'goTo' || v === 'chat') setTimeout(function(){ try { puBorrPoner(); } catch(e){} }, 30); return r; };
});

/* =========================================================
   Chat · enlaces de YouTube con portada y título (25/10/2026)
   La tarjeta se pinta al ver el chat y no se guarda en él. El título se pide una vez a YouTube (oEmbed)
   y se recuerda en el dispositivo; si no llega, «Vídeo de YouTube». Al tocarla se abre en YouTube.
   ========================================================= */
const PU_YT_RE = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^\s#]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const PU_YT_KEY = 'fsd_yt_titulos';
function puYtTitulos(){ try { return JSON.parse(localStorage.getItem(PU_YT_KEY) || '{}') || {}; } catch(e){ return {}; } }
function puYtGuardarTitulo(id, t){ const o = puYtTitulos(); o[id] = t; const ks = Object.keys(o); if (ks.length > 300) delete o[ks[0]]; try { localStorage.setItem(PU_YT_KEY, JSON.stringify(o)); } catch(e){} }
const puYtPidiendo = {};
function puYtTitulo(id, cb){
  const t = puYtTitulos()[id]; if (t) { cb(t); return; }
  if (puYtPidiendo[id] || !window.fetch) return;
  puYtPidiendo[id] = 1;
  fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id), { credentials: 'omit', referrerPolicy: 'no-referrer' })
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(j){ const tt = j && typeof j.title === 'string' ? j.title.slice(0, 200) : ''; if (tt) { puYtGuardarTitulo(id, tt); cb(tt); } })
    .catch(function(){}).then(function(){ delete puYtPidiendo[id]; });
}
function puYtTarjetas(){
  const l = document.getElementById('chatList'); if (!l) return;
  Array.prototype.forEach.call(l.querySelectorAll('.bubble'), function(b){
    if (b.querySelector('.yt-card')) return;
    const txt = Array.prototype.filter.call(b.childNodes, function(n){ return n.nodeType === 3; }).map(function(n){ return n.textContent; }).join(' ');
    const m = txt.match(PU_YT_RE); if (!m) return;
    const id = m[1], url = 'https://www.youtube.com/watch?v=' + id;
    const a = document.createElement('a'); a.className = 'yt-card'; a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', 'Abrir vídeo de YouTube');
    a.innerHTML = '<span class="yt-img"><img alt="" loading="lazy" referrerpolicy="no-referrer"><span class="yt-play" aria-hidden="true">▶</span></span><span class="yt-txt"><b>Vídeo de YouTube</b><small>YouTube · youtube.com</small></span>';
    const im = a.querySelector('img'); im.onerror = function(){ im.style.visibility = 'hidden'; }; im.src = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
    a.addEventListener('click', function(e){ e.stopPropagation(); });
    const av = b.querySelector('.msg-av, .msg-av2');
    if (av) b.insertBefore(a, av); else b.appendChild(a);
    puYtTitulo(id, function(t){ const x = a.querySelector('.yt-txt b'); if (x) x.textContent = t; });
  });
}
(function(){
  const l = document.getElementById('chatList'); if (!l || !window.MutationObserver) return;
  let pend = false;
  new MutationObserver(function(){ if (pend) return; pend = true; requestAnimationFrame(function(){ pend = false; try { puYtTarjetas(); } catch(e){} }); }).observe(l, { childList: true, subtree: true });
})();
guardarChat = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const p = clienteActual && PLANES[clienteActual];
    if (p && typeof p.chat === 'string' && p.chat.indexOf('yt-card') > -1) {
      const t = document.createElement('template'); t.innerHTML = p.chat;
      Array.prototype.forEach.call(t.content.querySelectorAll('.yt-card'), function(x){ x.remove(); });
      p.chat = t.innerHTML;
    }
    return r;
  };
})(guardarChat);

/* Ficha: «Peso actual» y «Próxima revisión» aparte, arriba del todo (encima de Evolución y Sensaciones del día).
   En el ordenador van fuera de la tarjeta, encima de ella, en la columna izquierda. */
fpOrdenarArriba = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    try {
      const peso = document.getElementById('cd-peso'), fila = peso ? peso.closest('.stat-row') : null;
      const graf = document.getElementById('fichaGraf'), sens = document.getElementById('fichaSens');
      if (!fila) return r;
      fila.classList.add('fp-peso-arriba');
      const primero = graf && graf.parentNode ? graf : sens;
      if (!primero || !primero.parentNode) return r;
      const grupo = primero.closest('.esc-grupo'), col = grupo && grupo.parentNode && grupo.parentNode.classList.contains('esc-col') ? grupo.parentNode : null;
      if (col) { if (fila.parentNode !== col || fila.nextElementSibling !== grupo) col.insertBefore(fila, grupo); }
      else if (fila.nextElementSibling !== primero) primero.parentNode.insertBefore(fila, primero);
    } catch(e){}
    return r;
  };
})(fpOrdenarArriba);
