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
