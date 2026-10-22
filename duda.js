/* =========================================================
   Fitnessindramas — Dudas en el chat entre profesionales (22/10/2026)
   Domingo o Fátima tocan un bocadillo del chat y, con el botón «❓ Duda para …», avisan a su compañero.
   · La duda se guarda aparte (clientesData[k].dudas), nunca dentro del chat: el cliente no ve nada.
   · El mensaje marcado se ve con una etiqueta «❓ Duda para …» para los dos profesionales.
   · El aviso del compañero abre el chat y baja directo al mensaje; cada vez que entra a ese chat con una
     duda pendiente se coloca en ella. «✓ Resuelta» la cierra y avisa a quien la planteó.
   · El mensaje se localiza por su posición en la conversación (que solo crece) y se comprueba con su texto.
   ========================================================= */
const DD_X = 'dd-x';                                         // lo que se pinta encima del chat y no se guarda
function ddOtro(){ return COACHES.filter(function(x){ return norm(x.u) !== norm(coachActivo.u); })[0]; }
function ddBurbujas(){ const l = document.getElementById('chatList'); return l ? Array.prototype.slice.call(l.querySelectorAll('.bubble')) : []; }
function ddTexto(b){
  const c = b.cloneNode(true);
  Array.prototype.forEach.call(c.querySelectorAll('.dd-x, .sender, .sender-x, .msg-av, .msg-av2, .mencion-tag'), function(x){ x.remove(); });
  const t = c.textContent.replace(/\s+/g, ' ').trim();
  return (t || (b.querySelector('audio') ? '🎤 Nota de voz' : (b.querySelector('img') ? '📷 Foto' : ''))).slice(0, 60);
}
function ddLista(k){ const d = clientesData[k]; return d && Array.isArray(d.dudas) ? d.dudas : []; }
function ddBuscar(du, bs){
  if (bs[du.n] && ddTexto(bs[du.n]) === du.txt) return bs[du.n];
  for (let i = 0; i < bs.length; i++) if (ddTexto(bs[i]) === du.txt) return bs[i];
  return null;
}
function ddPendientesPara(k){ return ddLista(k).filter(function(x){ return !x.ok && coachActivo && norm(x.para) === norm(coachActivo.u); }); }

/* ---- pintar etiquetas sobre los mensajes marcados ---- */
function ddPintar(){
  const l = document.getElementById('chatList');
  if (!l || !coachActivo || !clienteActual || !isCoachView()) return;
  ddObs && ddObs.disconnect();
  try {
    Array.prototype.forEach.call(l.querySelectorAll('.dd-tag'), function(x){ x.remove(); });
    Array.prototype.forEach.call(l.querySelectorAll('.bubble.dd-marca'), function(b){ b.classList.remove('dd-marca'); });
    const bs = ddBurbujas();
    ddLista(clienteActual).filter(function(x){ return !x.ok; }).forEach(function(du){
      const b = ddBuscar(du, bs); if (!b) return;
      b.classList.add('dd-marca');
      const mia = norm(du.para) === norm(coachActivo.u);
      const t = document.createElement('div'); t.className = 'dd-tag dd-x'; t.dataset.id = du.id;
      t.innerHTML = '<span>❓ ' + (mia ? esc(du.de) + ' te pregunta' : 'Duda para ' + esc(du.para)) + '</span>'
        + '<button type="button" data-dd="' + (mia ? 'ok' : 'quitar') + '">' + (mia ? '✓ Resuelta' : 'Quitar') + '</button>';
      b.insertBefore(t, b.firstChild);
    });
  } finally { ddObserva(); }
}
let ddObs = null;
function ddObserva(){
  const l = document.getElementById('chatList'); if (!l) return;
  if (!ddObs) ddObs = new MutationObserver(function(){ clearTimeout(ddObs._t); ddObs._t = setTimeout(ddPintar, 80); });
  ddObs.observe(l, { childList: true });
}

/* ---- botoncito encima del bocadillo tocado ---- */
function ddQuitarChip(){ Array.prototype.forEach.call(document.querySelectorAll('#chatList .dd-chip'), function(x){ x.remove(); }); }
document.addEventListener('click', function(e){
  if (!coachActivo || !isCoachView()) return;
  const bot = e.target.closest && e.target.closest('#chatList .dd-x button');
  if (bot) { e.stopPropagation(); ddAccion(bot); return; }
  const b = e.target.closest && e.target.closest('#chatList .bubble');
  if (!b) { ddQuitarChip(); return; }
  if (e.target.closest('a, button, audio, img, .audio-play, .wave, .dd-x')) return;
  const ya = b.previousElementSibling && b.previousElementSibling.classList.contains('dd-chip');
  ddQuitarChip();
  if (ya || b.classList.contains('dd-marca')) return;
  const o = ddOtro(); if (!o) return;
  const c = document.createElement('div'); c.className = 'dd-chip dd-x';
  c.style.alignSelf = getComputedStyle(b).alignSelf;
  c.innerHTML = '<button type="button" data-dd="nueva">❓ Duda para ' + esc(o.u) + '</button>';
  b.parentNode.insertBefore(c, b);
  c._b = b;
});
function ddAccion(bot){
  const a = bot.dataset.dd, k = clienteActual; if (!k) return;
  if (a === 'nueva') {
    const chip = bot.closest('.dd-chip'), b = chip && chip._b; if (!b) return;
    const o = ddOtro(), d = clientesData[k];
    const du = { id: 'dd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), n: ddBurbujas().indexOf(b), txt: ddTexto(b),
                 de: coachActivo.u, para: o.u, f: new Date().toISOString(), ok: false };
    d.dudas = ddLista(k).concat([du]);
    try { guardarTodo(); } catch(e){}
    crearAviso(clavePro(o.u), 'duda', '❓ ' + coachActivo.u + ' tiene una duda · ' + (d.nombre || 'cliente'), du.txt, { cliente: k, vista: 'chat', duda: du.id });
    ddQuitarChip(); ddPintar();
    toast('Aviso enviado a ' + o.u);
  } else {
    const t = bot.closest('.dd-tag'), du = ddLista(k).filter(function(x){ return x.id === (t && t.dataset.id); })[0]; if (!du) return;
    if (a === 'ok') {
      du.ok = true; du.res = coachActivo.u; du.fr = new Date().toISOString();
      crearAviso(clavePro(du.de), 'duda', '✓ ' + coachActivo.u + ' ha resuelto tu duda · ' + (clientesData[k].nombre || 'cliente'), du.txt, { cliente: k, vista: 'chat' });
      toast('Duda resuelta');
    } else clientesData[k].dudas = ddLista(k).filter(function(x){ return x !== du; });
    try { guardarTodo(); } catch(e){}
    ddPintar(); pintarChatsPro && pintarChatsPro();
  }
}

/* ---- al llegar al chat, directo a la duda pendiente ---- */
function ddIrAlaDuda(){
  if (!coachActivo || !clienteActual || !isCoachView()) return;
  const p = ddPendientesPara(clienteActual)[0]; if (!p) return;
  const b = ddBuscar(p, ddBurbujas()); if (!b) return;
  setTimeout(function(){
    b.scrollIntoView({ block: 'center', behavior: 'smooth' });
    b.classList.add('dd-flash'); setTimeout(function(){ b.classList.remove('dd-flash'); }, 2200);
  }, 250);
}
abrirVistaCliente = (function(orig){
  return function(vista){
    const r = orig.apply(this, arguments);
    if (vista === 'chat') { setTimeout(function(){ ddPintar(); ddObserva(); ddIrAlaDuda(); }, 60); }
    return r;
  };
})(abrirVistaCliente);

/* ---- lo pintado no se guarda en el chat (el cliente no lo ve) ---- */
guardarChat = (function(orig){
  return function(){
    orig.apply(this, arguments);
    const p = clienteActual && PLANES[clienteActual];
    if (!p || typeof p.chat !== 'string' || p.chat.indexOf('dd-') < 0) return;
    const t = document.createElement('template'); t.innerHTML = p.chat;
    Array.prototype.forEach.call(t.content.querySelectorAll('.dd-x, .dd-tag, .dd-chip'), function(x){ x.remove(); });
    Array.prototype.forEach.call(t.content.querySelectorAll('.dd-marca, .dd-flash'), function(x){ x.classList.remove('dd-marca', 'dd-flash'); });
    p.chat = t.innerHTML;
  };
})(guardarChat);

/* ---- lista de chats: «❓ Duda de Domingo» ---- */
pintarChatsPro = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    try {
      Array.prototype.forEach.call(document.querySelectorAll('#chatsPro .chat-fila'), function(f){
        const m = /abrirChatPro\('([^']+)'\)/.exec(f.getAttribute('onclick') || ''); if (!m || !coachActivo) return;
        const p = ddPendientesPara(m[1])[0]; if (!p) return;
        const est = f.querySelector('.chat-fila-txt'); if (!est) return;
        const d = document.createElement('div'); d.className = 'chat-fila-est dd-fila'; d.textContent = '❓ Duda de ' + p.de;
        est.appendChild(d);
      });
    } catch(e){}
    return r;
  };
})(pintarChatsPro);
