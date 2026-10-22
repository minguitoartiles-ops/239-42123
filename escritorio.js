/* =========================================================
   Fitnessindramas · MODO ORDENADOR (v0.59)
   Solo para Fátima y Domingo en pantallas anchas (≥ 900 px; antes 1100).
   En el móvil no cambia nada. Los clientes solo pueden usar la app en el móvil o la tablet.
   ========================================================= */
const ESC_MIN = 900;    // 21/10: también en ventanas a media pantalla (multitarea)
const ESC_MQ = window.matchMedia('(min-width: ' + ESC_MIN + 'px)');
function escActivo(){ return document.documentElement.classList.contains('esc'); }
function escDebe(){ return !!(ESC_MQ.matches && coachActivo); }

/* ---------- 9 · Clientes: solo móvil o tablet ---------- */
function escEsOrdenador(){
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile|Tablet|Silk|Kindle/i.test(ua)) return false;
  if ((navigator.maxTouchPoints || 0) > 1) return false;           // iPad con iPadOS se presenta como Mac
  if (window.matchMedia && matchMedia('(pointer: coarse)').matches) return false;
  return true;
}
function escSoloMovil(conSesion){
  let o = document.getElementById('escSoloMovil');
  if (!o) {
    o = document.createElement('div');
    o.id = 'escSoloMovil'; o.className = 'esc-solo-movil';
    o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'escSmTit');
    document.body.appendChild(o);
  }
  o.innerHTML = '<div class="esc-sm-card">'
    + '<img class="esc-sm-logo" src="assets/logo_fsd.png" alt="Fitnessindramas">'
    + '<h2 id="escSmTit">La app de clientes funciona en el móvil</h2>'
    + '<p>Para ver tu entrenamiento, tu plan y hablar con tu equipo, abre la app en tu móvil o tu tablet. Escanea este código con la cámara:</p>'
    + '<img class="esc-sm-qr" src="assets/qr_app.png" alt="Código QR para abrir la app en el móvil" width="180" height="180">'
    + '<div class="esc-sm-url">minguitoartiles-ops.github.io/Fitnessindramas-APP</div>'
    + '<p class="esc-sm-nota">Usa el mismo código de acceso que te dio tu profesional. Desde el ordenador solo pueden entrar Fátima y Domingo.</p>'
    + '<button type="button" class="btn-primary" onclick="escCerrarSoloMovil(' + (conSesion ? 'true' : 'false') + ')">Volver</button>'
    + (conSesion ? '' : '<button type="button" class="esc-sm-equipo" onclick="escEquipoForm()">Soy del equipo: ver la app como este cliente</button>'
      + '<div class="esc-sm-form" id="escSmForm" hidden><div class="esc-sm-quien" role="radiogroup" aria-label="Profesional">'
      + '<button type="button" class="chip protein selected" data-u="Domingo" onclick="escEquipoQuien(this)">Domingo</button><button type="button" class="chip protein" data-u="Fátima" onclick="escEquipoQuien(this)">Fátima</button></div>'
      + '<input type="password" id="escSmPass" placeholder="Tu contraseña" autocomplete="current-password" aria-label="Contraseña del profesional">'
      + '<div class="esc-sm-err" id="escSmErr" role="alert"></div><button type="button" class="btn-eq btn-eq-p" onclick="escEquipoEntrar()">Entrar como cliente</button></div>')
    + '</div>';
  o.classList.add('show');
}
function escCerrarSoloMovil(conSesion){
  const o = document.getElementById('escSoloMovil'); if (o) o.classList.remove('show');
  if (conSesion && window.fsdSesionCliente) cerrarSesionCliente();
}
let escEnterOrig = null;
const ESC_EQUIPO_KEY = 'fsd_equipo_cliente';
function escEsEquipo(){ try { return sessionStorage.getItem(ESC_EQUIPO_KEY) === '1'; } catch(e){ return false; } }
function escEquipoForm(){
  const f = document.getElementById('escSmForm'); if (!f) return;
  f.hidden = false; setTimeout(function(){ const i = document.getElementById('escSmPass'); if (i) i.focus(); }, 30);
}
function escEquipoQuien(b){
  Array.prototype.forEach.call(document.querySelectorAll('.esc-sm-quien .chip'), function(x){ x.classList.toggle('selected', x === b); });
}
function escEquipoEntrar(){
  const sel = document.querySelector('.esc-sm-quien .chip.selected'), i = document.getElementById('escSmPass'), err = document.getElementById('escSmErr');
  if (!i.value.trim()) { err.textContent = 'Escribe tu contraseña.'; i.focus(); return; }
  if (!window.crypto || !crypto.subtle) { err.textContent = 'Abre la app desde su dirección segura (https).'; return; }
  const u = sel ? sel.dataset.u : 'Domingo';
  huellaPro(u, i.value).then(function(h){
    if (h !== PRO_HASH[norm(u)]) { err.textContent = 'Contraseña incorrecta.'; i.select(); return; }
    try { sessionStorage.setItem(ESC_EQUIPO_KEY, '1'); } catch(e){}
    document.getElementById('escSoloMovil').classList.remove('show');
    escEnterOrig();
    escVistaCliente();
  });
}
/* el equipo ve la app del cliente con el ancho de un móvil */
function escVistaCliente(){
  const on = !!(window.fsdSesionCliente && escEsOrdenador() && escEsEquipo());
  document.documentElement.classList.toggle('esc-cliente', on);
  let p = document.getElementById('escCliPill');
  if (on && !p) {
    p = document.createElement('div'); p.id = 'escCliPill'; p.className = 'esc-cli-pill';
    document.body.appendChild(p);
  }
  if (p) {
    p.hidden = !on;
    const d = clienteActual && clientesData[clienteActual];
    if (on) p.innerHTML = '<span>👀 Vista de cliente' + (d ? ': <b>' + esc(d.nombre) + '</b>' : '') + '</span><button type="button" onclick="cerrarSesionCliente()">Salir</button>';
  }
}
cerrarSesionCliente = (function(orig){
  return function(){
    orig.apply(this, arguments);
    try { sessionStorage.removeItem(ESC_EQUIPO_KEY); } catch(e){}
    escVistaCliente();
  };
})(cerrarSesionCliente);
enterApp = (function(orig){
  escEnterOrig = orig;
  return function(){
    if (escEsOrdenador()) {
      const cod = (document.getElementById('accessCode').value || '').trim();
      if (!cod) { orig(); return; }                                // que salga el aviso normal de «introduce tu código»
      document.getElementById('loginError').textContent = '';
      escSoloMovil(false); return;
    }
    orig();
  };
})(enterApp);
if (window.fsdSesionCliente && escEsOrdenador()) { if (escEsEquipo()) escVistaCliente(); else escSoloMovil(true); }

/* ---------- 10 · fuera el texto del prototipo ---------- */
(function(){ const c = document.querySelector('body > .caption'); if (c) c.remove(); })();

/* ---------- 1 · Menú lateral ---------- */
(function(){
  const nav = document.getElementById('coachTabs');
  if (!nav) return;
  const logo = document.createElement('div');
  logo.className = 'esc-logo'; logo.id = 'escLogo';
  logo.innerHTML = '<img src="assets/logo_fsd.png" alt="" width="40" height="40"><div><b>Fitnessindramas</b><span id="escQuien"></span></div>';
  nav.insertBefore(logo, nav.firstChild);
  const pie = document.createElement('div');
  pie.className = 'esc-pie'; pie.id = 'escPie';
  pie.innerHTML = '<button type="button" class="esc-pie-btn mj-bell" onclick="abrirNotisCoach()" aria-label="Notificaciones">'
    + '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>'
    + '<span>Notificaciones</span><span class="bell-badge hide mj-bell-badge">0</span></button>'
    + '<button type="button" class="esc-pie-btn" onclick="confirmarSalidaCoach()"><span aria-hidden="true">↩</span><span>Salir</span></button>';
  nav.appendChild(pie);
  // fondo para cuando no hay nada elegido a la derecha
  const vacio = document.createElement('div');
  vacio.id = 'escVacio'; vacio.className = 'esc-vacio'; vacio.style.display = 'none';
  document.getElementById('screenRoot').appendChild(vacio);
})();

/* ---------- 2 y 6 · dos paneles: lista a la izquierda, detalle a la derecha ---------- */
const ESC_CON_LISTA = ['view-coach-cliente', 'view-alta', 'view-coach-seguimientos'];
let escPrincipal = null;
let escEnChats = false;                                             // abriendo un chat desde la pestaña Chats
function escLayout(){
  const root = document.getElementById('screenRoot');
  const on = escDebe();
  document.documentElement.classList.toggle('esc', on);
  if (!on) escAgruparFicha();                                       // deshace las columnas de la ficha
  // limpiar lo anterior
  Array.prototype.forEach.call(document.querySelectorAll('.esc-izq'), function(el){
    el.classList.remove('esc-izq');
    if (el.id !== escPrincipal) el.style.display = 'none';
  });
  const vacio = document.getElementById('escVacio');
  vacio.style.display = 'none';
  root.classList.remove('esc-dual');
  if (!on) return;
  setTxt('escQuien', coachActivo ? coachActivo.u + ' · ' + coachActivo.rol : '');
  const p = escPrincipal || pantallaVisible();
  let izq = null, txtVacio = '';
  if (p === 'view-coach-panel') { izq = 'view-coach-panel'; txtVacio = '<span aria-hidden="true">👈</span><b>Elige un cliente</b><span>Su ficha se abrirá aquí, sin salir de la lista.</span>'; }
  else if (p === 'view-coach-chats') { izq = 'view-coach-chats'; txtVacio = '<span aria-hidden="true">💬</span><b>Elige una conversación</b><span>Se abrirá aquí. Intro envía y Mayúsculas+Intro hace un salto de línea.</span>'; }
  else if (ESC_CON_LISTA.indexOf(p) > -1) izq = 'view-coach-panel';
  else if (p === 'app' && vistaActual === 'chat' && document.getElementById('coachBar').classList.contains('show')) izq = tabProActual === 'chats' ? 'view-coach-chats' : 'view-coach-panel';
  if (!izq) return;
  // la lista que se ve a la izquierda manda en el menú
  const tab = izq === 'view-coach-chats' ? 'chats' : 'clientes';
  if (!escEnChats && tabProActual !== tab) { tabProActual = tab; pintarTabsPro(); }
  const el = document.getElementById(izq);
  if (izq === 'view-coach-chats' && p !== izq && typeof pintarChatsPro === 'function') pintarChatsPro();
  el.style.display = 'flex';
  el.classList.add('esc-izq');
  root.classList.add('esc-dual');
  if (izq === p) { vacio.innerHTML = txtVacio; vacio.style.display = 'flex'; }
  escMarcarElegido();
}
function escMarcarElegido(){
  const claves = Object.keys(clientesData);
  Array.prototype.forEach.call(document.querySelectorAll('#listaClientes .cliente-card'), function(c, i){
    c.classList.toggle('esc-sel', escPrincipal !== 'view-coach-panel' && claves[i] === clienteActual);
  });
  Array.prototype.forEach.call(document.querySelectorAll('#chatsPro .chat-fila'), function(f){
    const on = (f.getAttribute('onclick') || '').indexOf("'" + clienteActual + "'") > -1;
    f.classList.toggle('esc-sel', !!clienteActual && escPrincipal === 'app' && vistaActual === 'chat' && on);
  });
}
/* pantallaVisible: la lista de la izquierda no cuenta como pantalla principal */
pantallaVisible = (function(orig){
  return function(){
    if (!escActivo()) return orig();
    return topScreens.filter(function(id){
      const el = document.getElementById(id);
      return el && !el.classList.contains('esc-izq') && el.style.display !== 'none' && getComputedStyle(el).display !== 'none';
    })[0];
  };
})(pantallaVisible);
(function(){
  const sh = showScreen;
  showScreen = function(id){
    escPrincipal = id;
    Array.prototype.forEach.call(document.querySelectorAll('.esc-izq'), function(el){ el.classList.remove('esc-izq'); });
    sh(id);
    escLayout();
    if (id === 'view-coach-cliente') escAgruparFicha();
  };
})();
goTo = (function(orig){ return function(){ const r = orig.apply(this, arguments); if (coachActivo) escLayout(); return r; }; })(goTo);
goToCliente = (function(orig){ return function(k){ orig(k); escAgruparFicha(); escMarcarElegido(); }; })(goToCliente);
pintarListaClientes = (function(orig){ return function(){ orig(); escMarcarElegido(); escBuscador(); }; })(pintarListaClientes);
if (typeof pintarChatsPro === 'function') pintarChatsPro = (function(orig){ return function(){ orig(); escMarcarElegido(); }; })(pintarChatsPro);
ESC_MQ.addEventListener ? ESC_MQ.addEventListener('change', escLayout) : ESC_MQ.addListener(escLayout);

/* el menú lateral marca Pagos y Ajustes (en el móvil están dentro de «Más») */
pintarTabsPro = (function(orig){
  return function(){
    orig();
    if (!escActivo()) return;
    const t = tabProActual;
    const marca = { clientes: 'ctab-clientes', planes: 'ctab-planes', chats: 'ctab-chats', segs: 'ctab-segs', pagos: 'ctab-pagos', ajustes: 'ctab-ajustes', mas: 'ctab-ajustes' }[t];
    Array.prototype.forEach.call(document.querySelectorAll('#coachTabs .tbi'), function(b){ b.classList.toggle('active', b.id === marca); });
  };
})(pintarTabsPro);
/* en el ordenador «Más» no existe: si se pide, va a Ajustes */
abrirTabPro = (function(orig){ return function(t){ if (t === 'mas' && escActivo()) t = 'ajustes'; orig(t); }; })(abrirTabPro);
atrasPorNiveles = (function(orig){
  return function(){
    const vis = pantallaVisible();
    if (escActivo() && (vis === 'view-coach-pagos' || vis === 'view-coach-ajustes')) { abrirTabPro('clientes'); return; }
    orig();
  };
})(atrasPorNiveles);

/* buscador de clientes encima de la lista */
function escBuscador(){
  const lista = document.getElementById('listaClientes'); if (!lista) return;
  let b = document.getElementById('escBuscar');
  if (!b) {
    b = document.createElement('input');
    b.id = 'escBuscar'; b.className = 'esc-buscar'; b.type = 'search';
    b.placeholder = 'Buscar cliente…'; b.setAttribute('aria-label', 'Buscar cliente');
    b.addEventListener('input', escFiltrarClientes);
    lista.parentNode.insertBefore(b, lista);
  }
  escFiltrarClientes();
}
function escFiltrarClientes(){
  const b = document.getElementById('escBuscar'); if (!b) return;
  const q = (b.value || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  Array.prototype.forEach.call(document.querySelectorAll('#listaClientes .cliente-card'), function(c){
    const n = ((c.querySelector('.cliente-name') || {}).textContent || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    c.classList.toggle('esc-oculto', !!q && n.indexOf(q) < 0);
  });
}

/* ---------- 3 · Ficha en columnas ---------- */
const ESC_GRUPOS = {
  entrenador: ['segui', 'gestion', 'pago', 'entreno', 'ton', 'nutri', 'datos'],
  dietista: ['segui', 'gestion', 'pago', 'nutri', 'datos', 'entreno', 'ton']
};
enSeccionDe = (function(orig){ return function(el){ return el.id === 'escFichaGrid' ? 'siempre' : orig(el); }; })(enSeccionDe);
function escAgruparFicha(){
  const v = document.getElementById('view-coach-cliente'); if (!v) return;
  const body = v.querySelector('.alta-body');
  let grid = document.getElementById('escFichaGrid');
  if (!escActivo()) {
    if (grid) {
      Array.prototype.forEach.call(grid.querySelectorAll('.esc-grupo'), function(g){
        while (g.firstChild) body.insertBefore(g.firstChild, grid);
      });
      grid.remove();
    }
    return;
  }
  if (!grid) {
    grid = document.createElement('div'); grid.id = 'escFichaGrid'; grid.className = 'esc-ficha-grid';
    const sec = document.getElementById('fichaSecciones');
    body.insertBefore(grid, sec ? sec.nextSibling : null);
  }
  const orden = ESC_GRUPOS[coachActivo && coachActivo.rol === 'dietista' ? 'dietista' : 'entrenador'];
  const grupo = function(g){
    let el = grid.querySelector('.esc-grupo[data-g="' + g + '"]');
    if (!el) { el = document.createElement('div'); el.className = 'esc-grupo'; el.dataset.g = g; el.dataset.sec = g === 'gestion' ? 'datos' : (g === 'ton' ? 'entreno' : g); grid.appendChild(el); }
    return el;
  };
  let gestion = !!grid.querySelector('.esc-grupo[data-g="gestion"] .alta-label');
  Array.prototype.slice.call(body.children).forEach(function(el){
    if (el === grid) return;
    const s = enSeccionDe(el);
    if (s === 'siempre') return;
    if (el.classList.contains('alta-label') && /Gestión/i.test(el.textContent)) gestion = true;
    const g = gestion && (el.classList.contains('alta-label') || el.classList.contains('list-group')) ? 'gestion' : (el.classList.contains('tonelaje-card') ? 'ton' : s);   // #147 tonelaje en su propio marco
    grupo(g).appendChild(el);
  });
  orden.forEach(function(g){ const el = grid.querySelector('.esc-grupo[data-g="' + g + '"]'); if (el) grid.appendChild(el); });
  Array.prototype.forEach.call(grid.querySelectorAll('.esc-grupo'), function(g){ g.hidden = !g.children.length; });
  escFiltroFicha();
}
function escFiltroFicha(){
  const grid = document.getElementById('escFichaGrid'); if (!grid) return;
  Array.prototype.forEach.call(grid.querySelectorAll('.esc-grupo'), function(g){
    g.classList.toggle('sec-oculta', !(enSeccion === 'todo' || g.dataset.sec === enSeccion));
  });
  grid.classList.toggle('una', enSeccion !== 'todo');
}
enAplicarSeccion = (function(orig){ return function(){ orig(); escFiltroFicha(); }; })(enAplicarSeccion);
enPintarFicha = (function(orig){ return function(){ orig(); escAgruparFicha(); }; })(enPintarFicha);

/* ---------- 4 · Editor de entrenos: teclado ---------- */
enPrepararEdicion = (function(orig){
  return function(){
    orig();
    // el tabulador va de casilla en casilla: los botones de cada fila se usan con el ratón
    const fuera = escActivo();
    Array.prototype.forEach.call(contEnt().querySelectorAll('.en-pautas button, .en-ej-btns button, .en-ses-acts button, .ex-desc-restore, .ex-video-row button, .ex-video-row a'), function(b){
      if (fuera) b.setAttribute('tabindex', '-1'); else b.removeAttribute('tabindex');
    });
    Array.prototype.forEach.call(contEnt().querySelectorAll('.sr-h[readonly], .serie-in input[readonly]'), function(i){
      if (fuera) i.setAttribute('tabindex', '-1'); else i.removeAttribute('tabindex');
    });
  };
})(enPrepararEdicion);
document.addEventListener('keydown', function(e){
  if (!coachActivo) return;
  // Ctrl+S / Cmd+S: guardar
  if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    if (typeof sincronizarInputs === 'function') try { sincronizarInputs(); } catch(x){}
    guardarTodo();
    toast('Guardado');
    return;
  }
  // Esc: cierra la ventana que esté abierta
  if (e.key === 'Escape' && document.querySelector('.fsd-overlay.show, .picker-overlay.show, .noti-pop.show')) {
    e.preventDefault();
    atrasDentroApp();
  }
});
/* 6 · Chat: Mayúsculas+Intro hace salto de línea; Intro envía */
document.addEventListener('keydown', function(e){
  if (e.target && e.target.id === 'chatInput' && e.key === 'Enter') {
    if (e.shiftKey) { e.stopPropagation(); return; }                  // no llega al «Intro envía»
    e.preventDefault();
  }
}, true);

/* ---------- 7 · Seguimientos en tabla ---------- */
goToSeguimientos = (function(orig){
  return function(){
    orig();
    if (!escActivo()) return;
    const lista = (SEGUIMIENTOS[clienteActual] || []);
    const cont = document.getElementById('seguiList');
    if (!cont || !lista.length) return;
    const med = MEDIDAS.filter(function(m){ return m[0] !== 'peso'; });
    const val = function(v){ return v == null || v === '' || v === '—' ? '<span class="esc-nd">—</span>' : esc(String(v)); };
    let h = '<div class="esc-tabla-wrap"><table class="esc-tabla"><thead><tr><th>Semana</th><th>Peso</th>'
      + med.map(function(m){ return '<th>' + m[1] + '</th>'; }).join('')
      + '<th>Entreno</th><th>Nutrición</th><th>Motivación</th><th>Estrés</th><th>Pasos/día</th></tr></thead><tbody>';
    h += lista.map(function(r){
      return '<tr><th>' + esc(r.s || '') + '</th><td>' + val(r.peso) + '</td>'
        + med.map(function(m){ const v = r.med && r.med[m[0]]; return '<td>' + (v != null ? fmtNum(v) + ' ' + m[2] : '<span class="esc-nd">—</span>') + '</td>'; }).join('')
        + '<td>' + val(r.e) + '</td><td>' + val(r.n) + '</td><td>' + val(r.m) + '</td><td>' + val(r.x) + '</td>'
        + '<td>' + (r.pasos != null ? fmtMil(r.pasos) : '<span class="esc-nd">—</span>') + '</td></tr>';
    }).join('');
    h += '</tbody></table></div>';
    const t = document.createElement('div'); t.innerHTML = h;
    cont.insertBefore(t.firstChild, cont.firstChild);
  };
})(goToSeguimientos);

/* abrir un chat desde la pestaña Chats deja la lista de chats a la izquierda */
abrirChatPro = (function(orig){
  return function(k){
    const desdeChats = escActivo() && tabProActual === 'chats';
    escEnChats = desdeChats;
    try { orig(k); } finally { escEnChats = false; }
    if (desdeChats) { tabProActual = 'chats'; pintarTabsPro(); escLayout(); }
  };
})(abrirChatPro);
/* la lista de chats de la izquierda se actualiza al enviar */
sendMsg = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    if (escActivo() && document.getElementById('view-coach-chats').classList.contains('esc-izq') && typeof pintarChatsPro === 'function') setTimeout(pintarChatsPro, 50);
    return r;
  };
})(sendMsg);

/* arranque */
entrarAlPanel = (function(orig){ return function(){ orig(); escLayout(); }; })(entrarAlPanel);
coachLogout = (function(orig){ return function(){ orig.apply(this, arguments); escLayout(); }; })(coachLogout);
escLayout();

/* ---------- #154 franja superior de la app de escritorio (solo con la barra de título oculta) ---------- */
(function(){ if (document.getElementById('escBarra')) return; const b = document.createElement('div'); b.id = 'escBarra'; b.setAttribute('aria-hidden', 'true'); document.body.appendChild(b); })();
