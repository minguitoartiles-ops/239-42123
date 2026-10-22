/* =========================================================
   Fitnessindramas — Menú de cada mensaje del chat (22/10/2026)
   Clic derecho sobre un bocadillo (en el móvil, mantenerlo pulsado):
   Responder · Fijar · Copiar texto · Reenviar · Eliminar · Seleccionar (+ Duda para el compañero, solo profesionales)
   · Responder: el mensaje nuevo lleva la cita (se guarda en el chat; al tocarla se va al original).
   · Fijar: un mensaje fijado por chat, visible arriba para todos (clientesData[k].chatFijo).
   · Reenviar (solo profesionales): a otro chat de cliente, solo texto y sin decir de qué cliente viene.
   · Eliminar: el profesional puede con cualquiera; el cliente, con los suyos. El bocadillo queda como «Mensaje eliminado»
     (así las posiciones de la conversación no cambian).
   ========================================================= */
const CM_SVG = function(p){ return '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
const CM_ICO = {
  responder: CM_SVG('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v3"/>'),
  fijar: CM_SVG('<path d="M12 17v5"/><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6z"/>'),
  copiar: CM_SVG('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>'),
  reenviar: CM_SVG('<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0-6 6v3"/>'),
  eliminar: CM_SVG('<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="m6 7 1 13h10l1-13"/>'),
  seleccionar: CM_SVG('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'),
  duda: CM_SVG('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><path d="M12 17h.01"/>')
};
let cmReply = null, cmSel = null;                              // respuesta en curso · mensajes seleccionados (null = sin selección)
function cmRaiz(){ return document.getElementById('screenRoot') || document.body; }
function cmPro(){ return !!coachActivo && isCoachView(); }
function cmEliminado(b){ return b.classList.contains('msg-del'); }
function cmEsMio(b){ return cmPro() ? b.classList.contains('in') : b.classList.contains('out'); }
function cmPuedeEliminar(b){ return !cmEliminado(b) && (cmPro() || cmEsMio(b)); }
function cmTexto(b, max){
  const c = b.cloneNode(true);
  Array.prototype.forEach.call(c.querySelectorAll('.dd-x, .sender, .sender-x, .msg-av, .msg-av2, .mencion-tag, .rp-q, .fw-tag, .audio-wrap, audio'), function(x){ x.remove(); });
  const t = c.textContent.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
  return max ? t.slice(0, max) : t;
}
function cmQuien(b){
  const s = b.querySelector('.sender, .sender-x');
  if (s && s.textContent.trim()) return s.textContent.trim();
  const d = clientesData[clienteActual] || {};
  return cmPro() ? ((d.nombre || 'Cliente').split(' ')[0]) : 'Tú';
}
function cmGuardar(){ try { guardarChat(); } catch(e){} try { guardarTodo(); } catch(e){} }
function cmFlash(b){ if (!b) return; b.scrollIntoView({ block: 'center', behavior: 'smooth' }); b.classList.add('cm-flash'); setTimeout(function(){ b.classList.remove('cm-flash'); }, 1800); }

/* ---------- el menú ---------- */
function cmCerrar(){
  const m = document.getElementById('cmMenu'); if (m) m.remove();
  Array.prototype.forEach.call(document.querySelectorAll('#chatList .bubble.cm-on'), function(x){ x.classList.remove('cm-on'); });
}
function cmAbrir(b, x, y){
  cmCerrar();
  if (cmEliminado(b) || cmSel) return;
  const pro = cmPro(), txt = cmTexto(b), fijo = cmFijoDe(b);
  const o = pro ? ddOtro() : null;
  const it = [['responder', 'Responder'], ['fijar', fijo ? 'Desfijar' : 'Fijar']];
  if (txt) it.push(['copiar', 'Copiar texto']);
  if (pro && txt) it.push(['reenviar', 'Reenviar']);
  if (pro && o) it.push(['duda', 'Duda para ' + o.u]);
  if (cmPuedeEliminar(b)) it.push(['eliminar', 'Eliminar']);
  it.push(['seleccionar', 'Seleccionar']);
  const m = document.createElement('div'); m.id = 'cmMenu'; m.className = 'cm-menu'; m.setAttribute('role', 'menu');
  m.innerHTML = it.map(function(i){ return '<button type="button" role="menuitem" data-cm="' + i[0] + '"' + (i[0] === 'eliminar' ? ' class="peligro"' : '') + '>' + CM_ICO[i[0]] + '<span>' + i[1] + '</span></button>'; }).join('');
  cmRaiz().appendChild(m);
  const w = m.offsetWidth, h = m.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
  m.style.left = Math.max(8, Math.min(x, vw - w - 8)) + 'px';
  m.style.top = Math.max(8, Math.min(y, vh - h - 8)) + 'px';
  b.classList.add('cm-on');
  m.addEventListener('click', function(e){
    const bt = e.target.closest('button[data-cm]'); if (!bt) return;
    e.stopPropagation(); cmCerrar(); cmAccion(bt.dataset.cm, b);
  });
}
document.addEventListener('contextmenu', function(e){
  const b = e.target.closest && e.target.closest('#chatList .bubble');
  if (!b || !clienteActual) return;
  e.preventDefault(); cmAbrir(b, e.clientX, e.clientY);
});
document.addEventListener('mousedown', function(e){ if (!(e.target.closest && e.target.closest('#cmMenu'))) cmCerrar(); }, true);
document.addEventListener('keydown', function(e){ if (e.key === 'Escape') { cmCerrar(); if (cmSel) cmSalirSel(); } });
window.addEventListener('resize', cmCerrar);
document.addEventListener('scroll', cmCerrar, true);
/* móvil: mantener pulsado */
(function(){
  let t = null, x0 = 0, y0 = 0, hecho = false;
  document.addEventListener('touchstart', function(e){
    const b = e.target.closest && e.target.closest('#chatList .bubble');
    if (!b || !clienteActual || e.touches.length !== 1 || e.target.closest('audio, .audio-play, .wave')) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; hecho = false;
    clearTimeout(t);
    t = setTimeout(function(){ hecho = true; if (navigator.vibrate) try { navigator.vibrate(15); } catch(_){} cmAbrir(b, x0, y0); }, 480);
  }, { passive: true });
  document.addEventListener('touchmove', function(e){
    if (!t) return; const q = e.touches[0];
    if (Math.abs(q.clientX - x0) > 9 || Math.abs(q.clientY - y0) > 9) { clearTimeout(t); t = null; }
  }, { passive: true });
  ['touchend', 'touchcancel'].forEach(function(n){
    document.addEventListener(n, function(e){ clearTimeout(t); t = null; if (hecho && e.cancelable) { e.preventDefault(); hecho = false; } }, { passive: false });
  });
})();

function cmAccion(a, b){
  if (a === 'responder') cmResponder(b);
  else if (a === 'fijar') cmFijar(b);
  else if (a === 'copiar') cmCopiar([b]);
  else if (a === 'reenviar') cmReenviar([b]);
  else if (a === 'duda') ddCrearDuda(b);
  else if (a === 'eliminar') cmConfirmarEliminar([b]);
  else if (a === 'seleccionar') cmEntrarSel(b);
}

/* ---------- Responder ---------- */
function cmResponder(b){
  const n = ddBurbujas().indexOf(b);
  cmReply = { n: n, t: ddTexto(b), vista: cmTexto(b, 110) || ddTexto(b), quien: cmQuien(b) };
  cmPintarReply();
  const i = document.getElementById('chatInput'); if (i) { try { i.focus(); } catch(e){} }
}
function cmPintarReply(){
  let bar = document.getElementById('cmReplyBar');
  if (!cmReply) { if (bar) bar.remove(); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'cmReplyBar'; bar.className = 'cm-reply';
    const c = document.getElementById('composer'); c.parentNode.insertBefore(bar, c); }
  bar.innerHTML = '<div class="cm-reply-t"><b>Respondiendo a ' + esc(cmReply.quien) + '</b><span>' + esc(cmReply.vista) + '</span></div><button type="button" aria-label="Cancelar la respuesta">✕</button>';
  bar.querySelector('button').onclick = function(){ cmReply = null; cmPintarReply(); };
}
sendMsg = (function(orig){
  return function(){
    const rp = cmReply, txt = ((document.getElementById('chatInput') || {}).value || '').trim(), antes = ddBurbujas().length;
    const r = orig.apply(this, arguments);
    if (rp && txt) {
      const b = ddBurbujas()[antes];
      if (b) {
        const q = document.createElement('div'); q.className = 'rp-q'; q.dataset.n = rp.n; q.dataset.t = rp.t;
        q.innerHTML = '<b>' + esc(rp.quien) + '</b><span>' + esc(rp.vista) + '</span>';
        const s = b.querySelector('.sender'); if (s) s.insertAdjacentElement('afterend', q); else b.insertBefore(q, b.firstChild);
        cmGuardar();
      }
    }
    if (rp) { cmReply = null; cmPintarReply(); }
    return r;
  };
})(sendMsg);
document.addEventListener('click', function(e){
  const q = e.target.closest && e.target.closest('#chatList .rp-q'); if (!q) return;
  const bs = ddBurbujas(), n = +q.dataset.n;
  let o = bs[n] && ddTexto(bs[n]) === q.dataset.t ? bs[n] : null;
  if (!o) for (let i = 0; i < bs.length; i++) if (ddTexto(bs[i]) === q.dataset.t) { o = bs[i]; break; }
  if (o) cmFlash(o);
});

/* ---------- Fijar ---------- */
function cmFijoDe(b){
  const f = (clientesData[clienteActual] || {}).chatFijo; if (!f) return false;
  const bs = ddBurbujas(), i = bs.indexOf(b);
  return i === f.n && ddTexto(b) === f.t;
}
function cmFijar(b){
  const d = clientesData[clienteActual]; if (!d) return;
  if (cmFijoDe(b)) { d.chatFijo = null; toast('Mensaje desfijado'); }
  else { d.chatFijo = { n: ddBurbujas().indexOf(b), t: ddTexto(b), vista: cmTexto(b, 90) || ddTexto(b), quien: cmQuien(b) }; toast('Mensaje fijado'); }
  try { guardarTodo(); } catch(e){}
  cmPintarFijo(true);
}
function cmPintarFijo(forzar){
  const v = document.getElementById('view-chat'), l = document.getElementById('chatList'); if (!v || !l) return;
  const f = clienteActual && clientesData[clienteActual] && clientesData[clienteActual].chatFijo;
  let bar = document.getElementById('cmPin');
  const sig = f ? clienteActual + '|' + f.n + '|' + f.t : '';
  if (!f) { if (bar) bar.remove(); return; }
  if (bar && bar.dataset.sig === sig && !forzar) return;
  if (!bar) { bar = document.createElement('div'); bar.id = 'cmPin'; bar.className = 'cm-pin'; l.parentNode.insertBefore(bar, l); }
  bar.dataset.sig = sig;
  bar.innerHTML = '<span class="cm-pin-i">' + CM_ICO.fijar + '</span><div class="cm-pin-t"><b>Mensaje fijado · ' + esc(f.quien || '') + '</b><span>' + esc(f.vista || f.t) + '</span></div><button type="button" aria-label="Desfijar">✕</button>';
  bar.onclick = function(e){
    if (e.target.closest('button')) { clientesData[clienteActual].chatFijo = null; try { guardarTodo(); } catch(_){} cmPintarFijo(true); return; }
    const bs = ddBurbujas(); let o = bs[f.n] && ddTexto(bs[f.n]) === f.t ? bs[f.n] : null;
    if (!o) for (let i = 0; i < bs.length; i++) if (ddTexto(bs[i]) === f.t) { o = bs[i]; break; }
    cmFlash(o);
  };
}
setInterval(function(){ try { cmPintarFijo(); if (!document.getElementById('view-chat').classList.contains('active') && cmReply) { /* se conserva */ } } catch(e){} }, 700);

/* ---------- Copiar ---------- */
function cmCopiar(bs){
  const t = bs.map(function(b){ return cmTexto(b); }).filter(Boolean).join('\n');
  if (!t) { toast('No hay texto que copiar'); return; }
  const ok = function(){ toast(bs.length > 1 ? 'Mensajes copiados' : 'Texto copiado'); };
  const alt = function(){
    const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select();
    try { document.execCommand('copy'); ok(); } catch(e){ toast('No se ha podido copiar'); } a.remove();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, alt); else alt();
}

/* ---------- Eliminar ---------- */
function cmConfirmarEliminar(bs){
  const ok = bs.filter(cmPuedeEliminar);
  if (!ok.length) { toast('No puedes eliminar estos mensajes'); return; }
  abrirDialogo({
    titulo: ok.length === 1 ? '¿Eliminar este mensaje?' : '¿Eliminar ' + ok.length + ' mensajes?',
    texto: 'En el chat se verá «Mensaje eliminado». No se puede deshacer.',
    ok: 'Eliminar', peligro: true,
    onOk: function(){ ok.forEach(cmBorrar); cmGuardar(); ddPintar(); cmPintarFijo(true); if (cmSel) cmSalirSel(); toast(ok.length === 1 ? 'Mensaje eliminado' : 'Mensajes eliminados'); }
  });
}
function cmBorrar(b){
  const d = clientesData[clienteActual], n = ddBurbujas().indexOf(b), t = ddTexto(b);
  if (d && d.chatFijo && d.chatFijo.n === n) d.chatFijo = null;
  if (d && Array.isArray(d.dudas)) d.dudas = d.dudas.filter(function(x){ return !(x.n === n && x.txt === t); });
  /* las citas de otros mensajes que lo mencionaban dejan de enseñar su texto */
  Array.prototype.forEach.call(document.querySelectorAll('#chatList .rp-q'), function(q){
    if (q.dataset.t === t && +q.dataset.n === n) { q.dataset.t = ''; const sp = q.querySelector('span'); if (sp) sp.textContent = '🚫 Mensaje eliminado'; }
  });
  Array.prototype.slice.call(b.children).forEach(function(c){
    if (!c.matches('.sender, .sender-x, .msg-av, .msg-av2')) c.remove();
  });
  Array.prototype.slice.call(b.childNodes).forEach(function(c){ if (c.nodeType === 3) c.remove(); });
  const s = document.createElement('span'); s.className = 'msg-del-t'; s.textContent = '🚫 Mensaje eliminado';
  b.appendChild(s);
  b.classList.remove('media', 'mencion');
  b.classList.add('msg-del');
}

/* ---------- Reenviar (solo profesionales) ---------- */
function cmReenviar(bs){
  const textos = bs.map(function(b){ return cmTexto(b); }).filter(Boolean);
  if (!cmPro() || !textos.length) { toast('Solo se pueden reenviar mensajes de texto'); return; }
  cmCerrarHoja();
  const h = document.createElement('div'); h.id = 'cmFw'; h.className = 'cm-fw show';
  const claves = Object.keys(clientesData).filter(function(k){ return k !== clienteActual && !mjEsBaja(clientesData[k]); });
  h.innerHTML = '<div class="cm-fw-in" role="dialog" aria-modal="true" aria-label="Reenviar a…"><div class="cm-fw-top"><b>Reenviar a…</b><button type="button" class="cm-fw-x" aria-label="Cerrar">✕</button></div>'
    + '<input type="search" class="cm-fw-q" placeholder="Buscar cliente" aria-label="Buscar cliente" autocomplete="off">'
    + '<div class="cm-fw-lista"></div></div>';
  cmRaiz().appendChild(h);
  const lista = h.querySelector('.cm-fw-lista'), q = h.querySelector('.cm-fw-q');
  const pintar = function(){
    const f = (typeof norm === 'function' ? norm(q.value) : q.value.toLowerCase());
    const v = claves.filter(function(k){ return !f || (typeof norm === 'function' ? norm(clientesData[k].nombre || '') : (clientesData[k].nombre || '').toLowerCase()).indexOf(f) > -1; });
    lista.innerHTML = v.length ? v.map(function(k){ return '<button type="button" data-k="' + esc(k) + '">' + esc(clientesData[k].nombre || k) + '</button>'; }).join('') : '<div class="picker-empty">Ningún cliente coincide</div>';
  };
  q.addEventListener('input', pintar); pintar();
  h.addEventListener('click', function(e){
    if (e.target === h || e.target.closest('.cm-fw-x')) { cmCerrarHoja(); return; }
    const bt = e.target.closest('.cm-fw-lista button[data-k]'); if (!bt) return;
    cmEnviarA(bt.dataset.k, textos); cmCerrarHoja(); if (cmSel) cmSalirSel();
  });
  setTimeout(function(){ try { q.focus(); } catch(e){} }, 80);
}
function cmCerrarHoja(){ const h = document.getElementById('cmFw'); if (h) h.remove(); }
function cmEnviarA(k, textos){
  const d = clientesData[k]; if (!d) return;
  const html = textos.map(function(t){
    return '<div class="bubble in"><div class="sender">' + esc(coachActivo.u) + '</div><div class="fw-tag">↪ Reenviado</div>' + esc(t).replace(/\n/g, '<br>') + '</div>';
  }).join('');
  PLANES[k] = PLANES[k] || {};
  const vac = /chatVacio/.test(PLANES[k].chat || '');
  PLANES[k].chat = (vac ? '' : (PLANES[k].chat || '')) + html;
  try { clChatSumar(k); } catch(e){}
  crearAviso(claveCliente(k), 'mensajes', coachActivo.u + ' te ha escrito', recortar(textos[0], 90), { vista: 'chat' });
  try { guardarTodo(); } catch(e){}
  toast('Reenviado a ' + (d.nombre || 'el cliente'));
}

/* ---------- Seleccionar varios ---------- */
function cmEntrarSel(b){
  cmSel = new Set(); document.getElementById('chatList').classList.add('cm-selmodo');
  if (b) { b.classList.add('sel-on'); cmSel.add(b); }
  cmPintarSel();
}
function cmSalirSel(){
  cmSel = null;
  const l = document.getElementById('chatList'); if (l) { l.classList.remove('cm-selmodo'); Array.prototype.forEach.call(l.querySelectorAll('.sel-on'), function(x){ x.classList.remove('sel-on'); }); }
  const bar = document.getElementById('cmSelBar'); if (bar) bar.remove();
}
function cmPintarSel(){
  let bar = document.getElementById('cmSelBar');
  if (!cmSel) { if (bar) bar.remove(); return; }
  const l = document.getElementById('chatList');
  if (!bar) { bar = document.createElement('div'); bar.id = 'cmSelBar'; bar.className = 'cm-selbar'; l.parentNode.insertBefore(bar, l); }
  const n = cmSel.size, bs = Array.from(cmSel).sort(function(a, b){ return ddBurbujas().indexOf(a) - ddBurbujas().indexOf(b); });
  const hayTxt = bs.some(function(b){ return cmTexto(b); }), pue = bs.some(cmPuedeEliminar);
  bar.innerHTML = '<button type="button" data-s="x" aria-label="Cancelar la selección">✕</button><b>' + (n === 1 ? '1 seleccionado' : n + ' seleccionados') + '</b><span class="cm-selbar-sp"></span>'
    + (hayTxt ? '<button type="button" data-s="copiar" aria-label="Copiar" title="Copiar">' + CM_ICO.copiar + '</button>' : '')
    + (cmPro() && hayTxt ? '<button type="button" data-s="reenviar" aria-label="Reenviar" title="Reenviar">' + CM_ICO.reenviar + '</button>' : '')
    + (pue ? '<button type="button" data-s="eliminar" class="peligro" aria-label="Eliminar" title="Eliminar">' + CM_ICO.eliminar + '</button>' : '');
  bar.onclick = function(e){
    const bt = e.target.closest('button[data-s]'); if (!bt) return;
    const a = bt.dataset.s;
    if (a === 'x') cmSalirSel(); else if (a === 'copiar') { cmCopiar(bs); cmSalirSel(); }
    else if (a === 'reenviar') cmReenviar(bs); else if (a === 'eliminar') cmConfirmarEliminar(bs);
  };
  if (!n) bar.querySelectorAll('button:not([data-s="x"])').forEach(function(x){ x.disabled = true; });
}
document.addEventListener('click', function(e){
  if (!cmSel) return;
  const b = e.target.closest && e.target.closest('#chatList .bubble'); if (!b) return;
  e.stopPropagation(); e.preventDefault();
  if (cmEliminado(b)) return;
  if (cmSel.has(b)) { cmSel.delete(b); b.classList.remove('sel-on'); } else { cmSel.add(b); b.classList.add('sel-on'); }
  cmPintarSel();
}, true);

/* ---------- lo pintado no se guarda en el chat ---------- */
guardarChat = (function(orig){
  return function(){
    orig.apply(this, arguments);
    const p = clienteActual && PLANES[clienteActual];
    if (!p || typeof p.chat !== 'string' || !/sel-on|cm-on|cm-flash/.test(p.chat)) return;
    const t = document.createElement('template'); t.innerHTML = p.chat;
    Array.prototype.forEach.call(t.content.querySelectorAll('.sel-on, .cm-on, .cm-flash'), function(x){ x.classList.remove('sel-on', 'cm-on', 'cm-flash'); });
    p.chat = t.innerHTML;
  };
})(guardarChat);
