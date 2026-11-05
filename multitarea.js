/* =========================================================
   Fitnessindramas — Vista multitarea del escritorio (26/10/2026, tarea #259)
   · «Vista ampliada»: la de siempre (lista + contenido).
   · «Vista multitarea»: lista del apartado (con el cliente marcado) · contenido · chat con ese cliente.
     El chat de la derecha es el chat de siempre (mismo bloque, con fotos, notas de voz, emojis y borradores),
     colocado en una tercera columna mientras haga falta.
   · El selector está en el menú lateral y se recuerda en este dispositivo.
   · Necesita una ventana de al menos 1200 px; por debajo se comporta como la vista ampliada.
   Carga después de escritorio.js, avisos.js, area.js y pulido.js.
   ========================================================= */

const MT_KEY = 'fsd_vista_esc', MT_MIN = 1200;
/* 5/11 · Antes, ⤢ dejaba el ordenador en «Ampliada» sin querer (y entonces, desde Seguimientos o
   Entrenamientos, el chat no salía). Una sola vez, cada ordenador vuelve a «Multitarea». */
try { if (!localStorage.getItem('fsd_vista_esc_2')) { localStorage.removeItem(MT_KEY); localStorage.setItem('fsd_vista_esc_2', '1'); } } catch(e){}
let mtOrigen = null;               // apartado desde el que se revisa: 'segs', 'planes' o null (Clientes)
let mtChatDe = null;               // cliente cuyo chat se ve a la derecha
let mtPusoCoach = false;           // la columna puso «coach-view» en #app (para quitarlo luego)
const mtCasa = (function(){ const v = document.getElementById('view-chat'); return v ? { padre: v.parentNode, sig: v.nextSibling } : null; })();

function mtModo(){ try { return localStorage.getItem(MT_KEY) === 'ampliada' ? 'ampliada' : 'multi'; } catch(e){ return 'multi'; } }
function mtCabe(){ return window.innerWidth >= MT_MIN; }
function mtActiva(){ return typeof escActivo === 'function' && escActivo() && !!coachActivo && mtModo() === 'multi' && mtCabe(); }

/* ---------- selector en el menú lateral ---------- */
function mtSelector(){
  const pie = document.getElementById('escPie'); if (!pie) return;
  let s = document.getElementById('mtVista');
  if (!s) {
    s = document.createElement('div'); s.id = 'mtVista'; s.className = 'mt-vista'; s.setAttribute('role', 'group'); s.setAttribute('aria-label', 'Tipo de vista');
    s.innerHTML = '<button type="button" data-v="ampliada" onclick="mtCambiar(\'ampliada\')" title="Vista ampliada: lista y contenido a pantalla completa">'
      + '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg><span>Ampliada</span></button>'
      + '<button type="button" data-v="multi" onclick="mtCambiar(\'multi\')" title="Vista multitarea: lista · contenido · chat con el cliente">'
      + '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M16 4v16"/></svg><span>Multitarea</span></button>';
    pie.insertBefore(s, pie.firstChild);
  }
  const m = mtModo();
  Array.prototype.forEach.call(s.querySelectorAll('button'), function(b){
    const on = b.dataset.v === m;
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const multi = s.querySelector('[data-v="multi"]');
  multi.classList.toggle('mt-estrecha', !mtCabe());
  multi.title = mtCabe() ? 'Vista multitarea: lista · contenido · chat con el cliente' : 'Vista multitarea: necesita una ventana de al menos ' + MT_MIN + ' px de ancho';
}
function mtCambiar(v){
  try { localStorage.setItem(MT_KEY, v); } catch(e){}
  if (v === 'multi' && !mtCabe() && typeof toast === 'function') toast('Ensancha la ventana (mínimo ' + MT_MIN + ' px) para ver el chat al lado');
  else if (typeof toast === 'function') toast(v === 'multi' ? 'Vista multitarea: lista · contenido · chat' : 'Vista ampliada');
  if (typeof escLayout === 'function') escLayout(); else mtAplicar();
}

/* ---------- columna del chat ---------- */
function mtColumna(){
  let c = document.getElementById('escChatCol');
  if (!c) {
    c = document.createElement('aside'); c.id = 'escChatCol'; c.className = 'esc-chat-col coach-view'; c.setAttribute('aria-label', 'Chat con el cliente');
    c.innerHTML = '<div class="mt-cab"><span class="mt-av" id="mtAv" aria-hidden="true"></span><div class="mt-cab-txt"><small>Chat con</small><b id="mtNombre"></b></div>'
      + '<button type="button" class="mt-grande" onclick="mtChatGrande()" title="Abrir el chat en grande" aria-label="Abrir el chat en grande">⤢</button></div>';
    document.getElementById('screenRoot').appendChild(c);
  }
  return c;
}
function mtDevolverChat(){
  const v = document.getElementById('view-chat'), col = document.getElementById('escChatCol');
  if (col) col.classList.remove('on');
  if (v && mtCasa && v.parentNode !== mtCasa.padre) mtCasa.padre.insertBefore(v, mtCasa.sig && mtCasa.sig.parentNode === mtCasa.padre ? mtCasa.sig : null);
  if (mtPusoCoach) {
    mtPusoCoach = false;
    const app = document.getElementById('app');
    if (app && app.style.display === 'none') app.classList.remove('coach-view');
  }
  mtChatDe = null;
  document.documentElement.classList.remove('mt-con-chat');
}
function mtPonerChat(k){
  const d = clientesData[k]; if (!d) return mtDevolverChat();
  const col = mtColumna(), v = document.getElementById('view-chat'), app = document.getElementById('app');
  if (v && v.parentNode !== col) col.appendChild(v);
  if (app && !app.classList.contains('coach-view')) { app.classList.add('coach-view'); mtPusoCoach = true; }
  col.classList.add('on');
  Array.prototype.forEach.call(document.querySelectorAll('#coachBar button'), function(b){ if (/^💬\s*Chat/.test(b.textContent.trim())) b.setAttribute('data-mt-chat', ''); });
  document.documentElement.classList.add('mt-con-chat');
  const nuevo = mtChatDe !== k;
  mtChatDe = k;
  const nom = document.getElementById('mtNombre'); if (nom) nom.textContent = d.nombre || '';
  const av = document.getElementById('mtAv');
  if (av && av.dataset.k !== k) {
    av.dataset.k = k;
    const foto = typeof fotoDe === 'function' ? fotoDe('cliente:' + k) : '';
    av.innerHTML = foto ? '<img src="' + esc(foto) + '" alt="">' : esc((d.nombre || '?').trim().charAt(0).toUpperCase());
  }
  const bn = document.getElementById('coachBarName'); if (bn && !bn.textContent.trim()) bn.textContent = d.nombre || '';
  const inp = document.getElementById('chatInput');
  if (inp) inp.placeholder = 'Escribe a ' + String(d.nombre || '').split(' ')[0] + '…';
  if (nuevo) {
    mtLeido(k);
    setTimeout(function(){
      try { if (typeof puBorrPoner === 'function') puBorrPoner(); } catch(e){}
      try { if (typeof ddPintar === 'function') ddPintar(); } catch(e){}
      const l = document.getElementById('chatList'); if (l) l.scrollTop = l.scrollHeight;
    }, 40);
  }
}
/* al ver el chat de un cliente, sus mensajes cuentan como leídos (igual que al abrir la conversación) */
function mtLeido(k){
  try {
    if (!coachActivo || typeof sinLeerDe !== 'function') return;
    const pro = clavePro(coachActivo.u), s = sinLeerDe(pro), habia = s[k] || 0;
    s[k] = 0;
    ((leerAvisos().lista[pro]) || []).forEach(function(x){ if (x.tipo === 'mensajes' && x.ir && x.ir.cliente === k) x.leida = true; });
    guardarAvisos(); pintarCampanas();
    if (habia && typeof actualizarPanel === 'function') actualizarPanel();
  } catch(e){}
}
/* 5/11 · ⤢ abre el chat en grande solo esta vez: ya no cambia la vista a «Ampliada» para siempre
   (al volver a la ficha, Seguimientos o Entrenamientos, el chat vuelve a salir a la derecha) */
function mtChatGrande(){
  const k = mtChatDe; if (!k) return;
  mtDevolverChat();
  if (clienteActual !== k) goToCliente(k);
  verConversacion();
  mtSelector();
}
/* cambia el cliente cargado sin moverse de pantalla (pestaña Entrenamientos / Nutrición) */
function mtCargar(k){
  if (!k || !clientesData[k] || clienteActual === k) return true;
  if (coachEditing) return false;
  try { guardarTodo(); } catch(e){}
  clienteActual = k;
  cargarPlan(k);
  return true;
}

/* ---------- la columna de la izquierda: la lista del apartado ---------- */
function mtIzq(id){
  const root = document.getElementById('screenRoot'), el = document.getElementById(id); if (!el) return;
  Array.prototype.forEach.call(document.querySelectorAll('.esc-izq'), function(x){ if (x !== el) { x.classList.remove('esc-izq'); x.style.display = 'none'; } });
  el.style.display = 'flex';
  el.classList.add('esc-izq');
  root.classList.add('esc-dual');
  const vacio = document.getElementById('escVacio'); if (vacio) vacio.style.display = 'none';
}
function mtMarcar(){
  const k = clienteActual;
  Array.prototype.forEach.call(document.querySelectorAll('#view-coach-segs .sg-bloque'), function(b){
    const cab = b.querySelector('.sg-cab');
    b.classList.toggle('esc-sel', !!k && !!cab && (cab.getAttribute('onclick') || '').indexOf("'" + k + "'") > -1);
  });
  if (mtOrigen === 'planes' && typeof plSel !== 'undefined' && k && plSel !== k && typeof plAplicar === 'function') { plSel = k; plAplicar(); }
  // que el cliente marcado se vea en la lista de la izquierda
  if (k && mtMarcar._k !== k) {
    mtMarcar._k = k;
    setTimeout(function(){
      const sel = document.querySelector('.esc-izq .esc-sel, .esc-izq .pl-sel');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
    }, 60);
  }
}

/* ---------- reparto de columnas según la pantalla ---------- */
function mtAplicar(){
  mtSelector();
  const html = document.documentElement;
  if (!mtActiva()) { mtDevolverChat(); html.classList.remove('mt-on'); html.removeAttribute('data-mt-izq'); return; }
  html.classList.add('mt-on');
  const p = typeof pantallaVisible === 'function' ? pantallaVisible() : '';
  const app = document.getElementById('app');
  const enPlanCliente = p === 'app' && app && app.classList.contains('coach-view') && document.getElementById('coachBar').classList.contains('show') && vistaActual !== 'chat';
  const conCliente = p === 'view-coach-cliente' || p === 'view-coach-seguimientos' || enPlanCliente;
  let izq = null;
  if (conCliente) izq = mtOrigen === 'segs' ? 'view-coach-segs' : (mtOrigen === 'planes' ? 'view-coach-planes' : 'view-coach-panel');
  if (izq) {
    mtIzq(izq);
    const tab = mtOrigen === 'segs' ? 'segs' : (mtOrigen === 'planes' ? 'planes' : 'clientes');
    if (typeof tabProActual !== 'undefined' && tabProActual !== tab) { tabProActual = tab; pintarTabsPro(); }
    mtMarcar();
  }
  html.setAttribute('data-mt-izq', izq || '');
  // chat a la derecha
  let k = null;
  if (conCliente) k = clienteActual;
  else if (p === 'view-coach-planes' && typeof plSel !== 'undefined' && plSel && mtCargar(plSel)) k = plSel;
  if (k && clientesData[k]) mtPonerChat(k); else mtDevolverChat();
  if (typeof escDivisor === 'function') escDivisor();
}

/* ---------- ganchos ---------- */
if (typeof escLayout === 'function') escLayout = (function(orig){
  return function(){ const r = orig.apply(this, arguments); try { mtAplicar(); } catch(e){} return r; };
})(escLayout);
abrirTabPro = (function(orig){
  return function(t){
    mtOrigen = t === 'segs' ? 'segs' : (t === 'planes' ? 'planes' : null);
    return orig.apply(this, arguments);
  };
})(abrirTabPro);
/* desde la pestaña Seguimientos o Entrenamientos/Nutrición: se recuerda el apartado */
if (typeof abrirSegsCliente === 'function') abrirSegsCliente = (function(orig){
  return function(){ if (mtActiva()) mtOrigen = 'segs'; return orig.apply(this, arguments); };
})(abrirSegsCliente);
if (typeof enAbrirPlanDesdeTab === 'function') enAbrirPlanDesdeTab = (function(orig){
  return function(){ if (mtActiva()) mtOrigen = 'planes'; return orig.apply(this, arguments); };
})(enAbrirPlanDesdeTab);
/* en la lista de planes de la izquierda, un clic abre directamente el plan de ese cliente */
if (typeof plElegir === 'function') plElegir = (function(orig){
  return function(k){
    const pl = document.getElementById('view-coach-planes');
    if (mtActiva() && pl && pl.classList.contains('esc-izq')) { enAbrirPlanDesdeTab(k); return; }
    const r = orig.apply(this, arguments);
    if (mtActiva()) mtAplicar();
    return r;
  };
})(plElegir);
/* cambiar de cliente con un plan a medio editar: se guarda y se avisa antes (no se pierde nada) */
goToCliente = (function(orig){
  return function(k){
    if (coachEditing && clienteActual && k !== clienteActual) { try { editarPlan(); } catch(e){} }
    return orig.apply(this, arguments);
  };
})(goToCliente);
/* «Chat» desde la ficha con el chat ya a la derecha: solo lleva el cursor a escribir */
verConversacion = (function(orig){
  return function(){
    const col = document.getElementById('escChatCol');
    if (!mtDirecto && mtActiva() && col && col.classList.contains('on') && mtChatDe === clienteActual) {
      const i = document.getElementById('chatInput'); if (i) i.focus();
      mtLeido(clienteActual);
      return;
    }
    return orig.apply(this, arguments);
  };
})(verConversacion);
/* desde la pestaña Chats (o «Escribirle») la conversación se abre como siempre, en el centro */
let mtDirecto = false;
if (typeof abrirChatPro === 'function') abrirChatPro = (function(orig){
  return function(){ mtDirecto = true; try { return orig.apply(this, arguments); } finally { mtDirecto = false; } };
})(abrirChatPro);
/* las tarjetas de la lista de seguimientos se repintan: volver a marcar */
if (typeof pintarSegsResumen === 'function') pintarSegsResumen = (function(orig){
  return function(){ const r = orig.apply(this, arguments); if (mtActiva()) mtMarcar(); return r; };
})(pintarSegsResumen);
window.addEventListener('resize', function(){
  clearTimeout(mtAplicar._t);
  mtAplicar._t = setTimeout(function(){ try { mtAplicar(); } catch(e){} }, 120);
});
/* cerrar sesión del profesional: el chat vuelve a su sitio */
if (typeof coachLogout === 'function') coachLogout = (function(orig){
  return function(){ mtOrigen = null; mtDevolverChat(); return orig.apply(this, arguments); };
})(coachLogout);
mtSelector();

/* ---------- 26/10 · barras verticales arrastrables en multitarea ----------
   · La de la lista (izquierda) ya existía: ahora respeta también el ancho del chat.
   · Nueva barra entre el contenido y el chat: arrastrar, ← → con el teclado, doble clic = ancho normal.
   · Los anchos se recuerdan para cada profesional en este dispositivo. */
const MT_CHAT_KEY = 'fsd_mt_chat', MT_CENTRO_MIN = 380;
function mtMenuW(){ return document.documentElement.classList.contains('esc-mini') ? 72 : 232; }
function mtListaW(){ const izq = document.querySelector('.screen.esc-dual > .esc-izq'); return izq ? izq.getBoundingClientRect().width : 0; }
function mtChatW(){ const c = document.getElementById('escChatCol'); return c && c.classList.contains('on') ? c.getBoundingClientRect().width : 0; }
function mtChatGuardado(){ try { const o = JSON.parse(localStorage.getItem(MT_CHAT_KEY) || '{}'); return coachActivo ? o[norm(coachActivo.u)] : null; } catch(e){ return null; } }
function mtChatGuardar(px){ try { const o = JSON.parse(localStorage.getItem(MT_CHAT_KEY) || '{}'); if (coachActivo) { if (px) o[norm(coachActivo.u)] = px; else delete o[norm(coachActivo.u)]; } localStorage.setItem(MT_CHAT_KEY, JSON.stringify(o)); } catch(e){} }
function mtChatPoner(px){
  const r = document.documentElement.style;
  if (!px) { r.removeProperty('--mt-chat'); return; }
  const max = Math.max(300, window.innerWidth - mtMenuW() - mtListaW() - MT_CENTRO_MIN);
  r.setProperty('--mt-chat', Math.min(max, Math.max(300, Math.round(px))) + 'px');
}
/* la lista no puede comerse el centro cuando hay chat a la derecha */
if (typeof escListaLimites === 'function') escListaLimites = (function(orig){
  return function(){
    const l = orig.apply(this, arguments), ch = mtChatW();
    if (ch) l.max = Math.max(l.min, Math.round(window.innerWidth - mtMenuW() - ch - MT_CENTRO_MIN));
    return l;
  };
})(escListaLimites);
function mtDivisor(){
  let d = document.getElementById('mtDivisor');
  if (!d) {
    d = document.createElement('div'); d.id = 'mtDivisor'; d.className = 'esc-divisor mt-divisor';
    d.setAttribute('role', 'separator'); d.setAttribute('aria-orientation', 'vertical'); d.tabIndex = 0;
    d.title = 'Arrastra para cambiar el ancho del chat · doble clic: ancho normal';
    d.setAttribute('aria-label', 'Ancho del chat');
    (document.getElementById('screenRoot') || document.body).appendChild(d);   // 5/11 · dentro de la app, para que tenga sus colores (fuera era invisible)
    let x0 = 0, w0 = 0, arr = false;
    d.addEventListener('pointerdown', function(e){
      arr = true; x0 = e.clientX; w0 = mtChatW(); d.setPointerCapture(e.pointerId);
      document.documentElement.classList.add('esc-arrastrando'); e.preventDefault();
    });
    d.addEventListener('pointermove', function(e){ if (arr) mtChatPoner(w0 - (e.clientX - x0)); });   // hacia la izquierda = chat más ancho
    const fin = function(){ if (!arr) return; arr = false; document.documentElement.classList.remove('esc-arrastrando'); mtChatGuardar(Math.round(mtChatW())); window.dispatchEvent(new Event('resize')); };
    d.addEventListener('pointerup', fin); d.addEventListener('pointercancel', fin);
    d.addEventListener('dblclick', function(){ mtChatGuardar(null); mtChatPoner(null); window.dispatchEvent(new Event('resize')); });
    d.addEventListener('keydown', function(e){
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); mtChatPoner(mtChatW() + (e.key === 'ArrowLeft' ? 24 : -24)); mtChatGuardar(Math.round(mtChatW()));
    });
  }
  d.hidden = !mtChatW();
}
mtAplicar = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    if (!document.documentElement.classList.contains('esc-arrastrando')) mtChatPoner(mtChatGuardado());
    mtDivisor();
    return r;
  };
})(mtAplicar);

/* ---------- 5/11 · barra vertical en Entrenamientos / Nutrición (pedida por Domingo) ----------
   Entre la lista de clientes y lo que se muestra en el centro (resumen del plan). Igual que las otras
   barras: se arrastra (o ← → con el teclado), doble clic = ancho normal, y el ancho se recuerda para
   cada profesional en este ordenador. Solo cuando la lista y el resumen están lado a lado. */
const PL_DIV_KEY = 'fsd_pl_lista';
function plDivGuardado(){ try { const o = JSON.parse(localStorage.getItem(PL_DIV_KEY) || '{}'); return coachActivo ? o[norm(coachActivo.u)] : null; } catch(e){ return null; } }
function plDivGuardar(px){ try { const o = JSON.parse(localStorage.getItem(PL_DIV_KEY) || '{}'); if (coachActivo) { if (px) o[norm(coachActivo.u)] = px; else delete o[norm(coachActivo.u)]; } localStorage.setItem(PL_DIV_KEY, JSON.stringify(o)); } catch(e){} }
function plDivPoner(px, split){
  const r = document.documentElement.style;
  if (!px) { r.removeProperty('--pl-lista'); return; }
  const total = split ? split.getBoundingClientRect().width : 1200;
  r.setProperty('--pl-lista', Math.round(Math.min(Math.max(260, total - 380), Math.max(260, px))) + 'px');   // al resumen le quedan ≥ 380 px
}
function plDivisores(){
  Array.prototype.forEach.call(document.querySelectorAll('#view-coach-planes .pl-split'), function(split){
    const izq = split.querySelector(':scope > .pl-izq'), der = split.querySelector(':scope > .pl-der');
    if (!izq || !der || split.querySelector(':scope > .pl-div')) return;
    const d = document.createElement('div'); d.className = 'pl-div';
    d.setAttribute('role', 'separator'); d.setAttribute('aria-orientation', 'vertical'); d.tabIndex = 0;
    d.title = 'Arrastra para cambiar el ancho de la lista · doble clic: ancho normal';
    d.setAttribute('aria-label', 'Ancho de la lista de clientes');
    split.insertBefore(d, der);
    let x0 = 0, w0 = 0, arr = false;
    d.addEventListener('pointerdown', function(e){
      arr = true; x0 = e.clientX; w0 = izq.getBoundingClientRect().width; d.setPointerCapture(e.pointerId);
      document.documentElement.classList.add('esc-arrastrando'); e.preventDefault();
    });
    d.addEventListener('pointermove', function(e){ if (arr) plDivPoner(w0 + e.clientX - x0, split); });
    const fin = function(){ if (!arr) return; arr = false; document.documentElement.classList.remove('esc-arrastrando'); plDivGuardar(Math.round(izq.getBoundingClientRect().width)); };
    d.addEventListener('pointerup', fin); d.addEventListener('pointercancel', fin);
    d.addEventListener('dblclick', function(){ plDivGuardar(null); plDivPoner(null); });
    d.addEventListener('keydown', function(e){
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); plDivPoner(izq.getBoundingClientRect().width + (e.key === 'ArrowRight' ? 24 : -24), split); plDivGuardar(Math.round(izq.getBoundingClientRect().width));
    });
  });
  const s = document.querySelector('#view-coach-planes .pl-split');
  if (!document.documentElement.classList.contains('esc-arrastrando')) plDivPoner(plDivGuardado(), s);
}
(function(){
  const v = document.getElementById('view-coach-planes'); if (!v) return;
  let t = null;
  new MutationObserver(function(){ clearTimeout(t); t = setTimeout(plDivisores, 0); }).observe(v, { childList: true, subtree: true });
  plDivisores();
})();
