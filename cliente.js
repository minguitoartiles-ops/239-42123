/* =========================================================
   Fitness sin Dramas — Barra del cliente (21/10/2026)
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
const FP_PLEGABLES = { 'gestión del cliente': 'gestion', 'suscripción': 'pago', 'entrenamiento': 'entreno' };
let fpAbiertos = {}, fpCliente = null;
function fpContenido(lbl){
  const r = []; let x = lbl.nextElementSibling;
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
    if (id === 'gestion') return 'Datos, código, alergias…';
  } catch(e){}
  return '';
}
function fpAplicar(){
  const v = document.getElementById('view-coach-cliente'); if (!v || !coachActivo) return;
  const filtro = typeof enSeccion === 'string' && enSeccion !== 'todo';
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
    const abierto = filtro || !!fpAbiertos[id];
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
    const algo = Array.prototype.some.call(g.children, function(c){ return c.offsetHeight > 2; });
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
    return r;
  };
})(pintarPagosPro);
/* desde Pagos se abre la ficha con «Suscripción» desplegada */
mjAbrirFichaPago = (function(orig){
  return function(k){ const r = orig.apply(this, arguments); fpAbiertos.pago = true; fpAplicar(); return r; };
})(mjAbrirFichaPago);
