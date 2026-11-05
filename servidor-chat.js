/* =========================================================
   Fitnessindramas — Modo servidor · paso 4: el chat desde el servidor (5/11/2026)
   Solo en modo servidor (?servidor=pruebas). Se carga después de servidor-planes.js.

   · Manda el servidor: la conversación de la pantalla se dibuja con lo que hay en el servidor
     (con las piezas de siempre: modelo.js → fsdChatPintar, que escribe los textos como texto, nunca
     como código). Lo que había antes en este aparato en modo servidor no se sube (era de prueba).
   · Enviar: cada mensaje lleva un id puesto aquí. Sin conexión se queda «pendiente» en el aparato y
     se envía al volver internet; si llega dos veces, el servidor lo ignora (mismo id).
   · Responder (cita), fijar, eliminar (solo lo propio), reenviar, dudas entre profesionales y la
     etiqueta «📋 Revisión de tu seguimiento» van al servidor. Las dudas solo las ve el equipo.
   · Sin leer y «esperando respuesta»: los calcula el servidor con el «leído hasta aquí» de cada
     persona, así coinciden en el móvil y en el ordenador.
   · Fotos y notas de voz (paso 6): primero se sube el archivo a la carpeta privada del cliente y
     después se envía el mensaje con su ruta. Para verlos, la app los descarga con la sesión de cada
     persona (no hay enlaces que se puedan reenviar) y los guarda solo en memoria mientras la app
     está abierta. Se descargan al aparecer en pantalla; la nota de voz, como muy tarde, al tocar ▶.
     Sin conexión no se envían (se avisa): el archivo no se puede subir.
   ========================================================= */
const SV_CH = {};                       // por clave de cliente: { mensajes, fijado, dudas, cargado }
let svChEquipo = null;                  // [{ user_id, nombre, rol }]
let svChYo = null;                      // id de la cuenta con sesión
let svChRes = {};                       // resumen del servidor por id de cliente
const svChDesde = Date.now();           // no se avisa de lo que ya había al abrir la app

function svChSesion(){ return svActivo() && !!window.fsdDatos && (!!coachActivo || !!window.fsdSesionCliente); }
function svChSoyEquipo(){ return !!coachActivo; }
function svChId(){
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16); crypto.getRandomValues(b);
  b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = Array.prototype.map.call(b, function(x){ return (x + 256).toString(16).slice(1); }).join('');
  return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
}
const SV_CH_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function svChClave(sid){ return svClaveDe(sid); }
function svChVisible(k){
  if (!k || document.visibilityState !== 'visible') return false;
  // ordenador en «Multitarea»: el chat del cliente abierto se ve a la derecha
  if (document.documentElement.classList.contains('mt-con-chat') && typeof mtChatDe !== 'undefined' && mtChatDe === k) return true;
  const v = document.getElementById('view-chat'), app = document.getElementById('app');
  return k === clienteActual && !!v && v.classList.contains('active') && !!app && app.style.display !== 'none';
}
function svChNombre(uid){
  const e = (svChEquipo || []).filter(function(x){ return x.user_id === uid; })[0];
  return e ? e.nombre : null;
}
function svChUidDe(nombre){
  const e = (svChEquipo || []).filter(function(x){ return norm(x.nombre) === norm(nombre || ''); })[0];
  return e ? e.user_id : null;
}
/* fechas del servidor a ISO estándar (el tiempo real y la API no siempre las escriben igual; Safari es estricto) */
function svChISO(s){
  if (!s) return s;
  const n = String(s).replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1').replace(/([+-]\d{2})$/, '$1:00');
  const d = new Date(n);
  return isNaN(d) ? s : d.toISOString();
}
function svChFila(f){
  if (!f) return f;
  ['fecha', 'creada', 'cerrada_en', 'ultimo_fecha', 'espera_desde', 'hasta'].forEach(function(c){ if (f[c]) f[c] = svChISO(f[c]); });
  return f;
}
/* ---------- archivos (fotos y notas de voz) ---------- */
const SV_ARCH = {};                       // ruta → URL local (blob:) ya descargada
const svArchVa = {};                      // ruta → descarga en curso
const SV_ARCH_VACIO = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const SV_ARCH_RUTA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9_-]{1,64}\.(jpg|jpeg|png|webp|webm|m4a|mp4|mp3|ogg|aac)$/;
function svArchCarpeta(ruta){ return /\.(jpg|jpeg|png|webp)$/i.test(ruta) ? 'fotos' : 'audios'; }
function svArchTraer(ruta){
  if (!SV_ARCH_RUTA.test(String(ruta || ''))) return Promise.reject(new Error('Archivo no válido'));
  if (SV_ARCH[ruta]) return Promise.resolve(SV_ARCH[ruta]);
  if (svArchVa[ruta]) return svArchVa[ruta];
  const carpeta = svArchCarpeta(ruta);
  svArchVa[ruta] = svCargar().then(function(x){ return x.archivos.descargar(carpeta, ruta); }).then(function(b){
    // el tipo lo fija la app: una foto solo se enseña como imagen y un audio como audio
    const t = String(b.type || '').split(';')[0];
    const tipo = carpeta === 'fotos' ? (/^image\/(jpeg|png|webp)$/.test(t) ? t : 'image/jpeg') : (/^audio\//.test(t) ? t : 'audio/mp4');
    SV_ARCH[ruta] = URL.createObjectURL(new Blob([b], { type: tipo }));
    return SV_ARCH[ruta];
  }).finally(function(){ delete svArchVa[ruta]; });
  return svArchVa[ruta];
}
function svArchOndas(id){
  const n = String(id || '').split('').reduce(function(a, c){ return a + c.charCodeAt(0); }, 0);
  const o = []; for (let i = 0; i < 22; i++) o.push(5 + Math.round(Math.abs(Math.sin((i + n % 7) * 1.7)) * 15));
  return o;
}
/* pone en pantalla los archivos ya descargados y descarga los que se vayan viendo */
let svArchVigia = null;
function svArchPoner(b, url){
  if (!b) return;
  const img = b.querySelector(':scope > img');
  if (img) { if (img.getAttribute('src') !== url) img.src = url; img.classList.remove('sv-arch-carga'); return; }
  const w = b.querySelector(':scope > .audio-b');
  if (w && !w.querySelector('audio')) { const a = document.createElement('audio'); a.src = url; a.preload = 'metadata'; a.style.display = 'none'; w.appendChild(a); }
}
function svArchFallo(ruta){
  Array.prototype.forEach.call(document.querySelectorAll('.bubble[data-arch]'), function(b){
    if (b.getAttribute('data-arch') !== ruta) return;
    const img = b.querySelector(':scope > img'); if (img) { img.classList.remove('sv-arch-carga'); img.classList.add('sv-arch-no'); img.alt = 'Foto no disponible'; }
  });
}
function svArchCargar(b){
  const ruta = b.getAttribute('data-arch');
  svArchTraer(ruta).then(function(url){
    Array.prototype.forEach.call(document.querySelectorAll('.bubble[data-arch]'), function(x){ if (x.getAttribute('data-arch') === ruta) svArchPoner(x, url); });
  }, function(){ svArchFallo(ruta); });
}
function svArchRellenar(raiz){
  if (!raiz) return;
  Array.prototype.forEach.call(raiz.querySelectorAll('.bubble[data-arch]'), function(b){
    const ruta = b.getAttribute('data-arch');
    if (SV_ARCH[ruta]) { svArchPoner(b, SV_ARCH[ruta]); return; }
    const img = b.querySelector(':scope > img'); if (img) img.classList.add('sv-arch-carga');
    if (!('IntersectionObserver' in window)) { svArchCargar(b); return; }
    if (!svArchVigia) svArchVigia = new IntersectionObserver(function(es){
      es.forEach(function(e){ if (e.isIntersecting) { svArchVigia.unobserve(e.target); svArchCargar(e.target); } });
    }, { rootMargin: '400px 0px' });
    svArchVigia.observe(b);
  });
}

function svChPend(k){ const d = clientesData[k]; if (!d) return []; if (!Array.isArray(d.svChPend)) d.svChPend = []; return d.svChPend; }

/* =========================================================
   PINTAR: del servidor (y lo pendiente) a la pantalla
   ========================================================= */
function svChLista(k){
  const S = SV_CH[k] || { mensajes: [] };
  const vistos = {};
  const ms = S.mensajes.slice();
  ms.forEach(function(m){ vistos[m.id] = 1; });
  const yo = svChYo, lado = svChSoyEquipo() ? 'in' : 'out';
  svChPend(k).forEach(function(p){
    if (vistos[p.id]) return;
    vistos[p.id] = 1;
    ms.push({ id: p.id, lado: lado, autor: yo, tipo: p.tipo || 'texto', texto: p.texto, archivo_ruta: p.ruta || null, duracion: p.dur || null,
              cita_de: p.citaDe || null, eliminado: false, fecha: p.ts, reenviado: !!p.reenviado, etiqueta: p.etiqueta || null, pendiente: true });
  });
  (svChSubiendo[k] || []).forEach(function(u){
    if (vistos[u.id]) return;
    ms.push({ id: u.id, lado: lado, autor: yo, tipo: u.tipo, local: u.local, duracion: u.dur || null, eliminado: false, fecha: u.ts, pendiente: true });
  });
  return ms;
}
function svChQuien(m, k){
  if (m.lado === 'in') return m.autor ? (svChNombre(m.autor) || 'Equipo') : 'Aviso automático';
  if (svChSoyEquipo()) return ((clientesData[k] || {}).nombre || 'Cliente').split(' ')[0];
  return 'Tú';
}
function svChVista(m, max){
  if (m.eliminado) return '🚫 Mensaje eliminado';
  if (m.tipo === 'foto') return '📷 Foto';
  if (m.tipo === 'audio') return '🎤 Nota de voz';
  return String(m.texto || '').replace(/\s+/g, ' ').trim().slice(0, max);
}
function svChModelo(k){
  const ms = svChLista(k), pos = {};
  ms.forEach(function(m, i){ pos[m.id] = i; });
  return { v: FSD_MODELO_V, mensajes: ms.map(function(m){
    const x = { id: m.id, lado: m.lado === 'in' ? 'in' : 'out', ts: m.fecha };
    if (m.lado === 'in') x.de = svChQuien(m, k);
    let media = false;
    if (m.eliminado) x.tipo = 'eliminado';
    else if (m.tipo === 'foto' && (m.archivo_ruta || m.local)) {
      // lo descargado se pone después de pintar (en la copia guardada no quedan enlaces locales)
      media = true; x.tipo = 'foto'; x.foto = { src: m.local || SV_ARCH_VACIO, alt: 'Foto' };
    } else if (m.tipo === 'audio' && (m.archivo_ruta || m.local)) {
      const s = Math.max(1, Math.min(120, Math.round(+m.duracion || 0)));
      media = true; x.tipo = 'audio'; x.audio = { src: m.local || '', dur: String(s), durTxt: fmtDur(s), ondas: svArchOndas(m.id) };
    } else { x.tipo = 'texto'; x.texto = String(m.texto || '').slice(0, 4000); }
    if (media && m.archivo_ruta && SV_ARCH_RUTA.test(m.archivo_ruta)) x.extra = { arch: m.archivo_ruta };
    if (m.cita_de && !m.eliminado) {
      const o = pos[m.cita_de] != null ? ms[pos[m.cita_de]] : null;
      x.cita = { id: m.cita_de, n: o ? String(pos[m.cita_de]) : '', t: o && !o.eliminado ? svChVista(o, 60) : '',
                 quien: o ? svChQuien(o, k) : '', vista: o ? svChVista(o, 110) : '…' };
    }
    if (m.reenviado && !m.eliminado) x.reenviado = '1';
    if (m.etiqueta === 'revision' && !m.eliminado) x.mencion = '📋 Revisión de tu seguimiento';
    const cl = [];
    if (m.pendiente) cl.push('sv-pend');
    if (x.tipo === 'foto') cl.push('media');
    if (m.lado === 'in' && !m.autor) cl.push('sv-aviso');
    if (cl.length) x.clases = cl.join(' ');
    return x;
  }) };
}
/* fijado y dudas en el formato de siempre (chatmenu.js y duda.js los buscan por id) */
function svChLocales(k, tpl){
  const S = SV_CH[k], d = clientesData[k]; if (!S || !d) return;
  const bs = Array.prototype.slice.call(tpl.content.querySelectorAll('.bubble'));
  const porId = function(id){ for (let i = 0; i < bs.length; i++) if (bs[i].getAttribute('data-fid') === id) return i; return -1; };
  const txt = function(i){ return i > -1 ? ddTexto(bs[i]) : ''; };
  const f = S.fijado, fi = f ? porId(f.mensaje_id) : -1;
  d.chatFijo = fi > -1 ? { mid: f.mensaje_id, n: fi, t: txt(fi), vista: (cmTexto(bs[fi], 90) || txt(fi)), quien: (bs[fi].querySelector('.sender') || {}).textContent || (bs[fi].classList.contains('out') ? svChQuien({ lado: 'out' }, k) : '') } : null;
  d.dudas = (S.dudas || []).filter(function(x){ return x.estado !== 'quitada'; }).map(function(x){
    const i = porId(x.mensaje_id);
    return { id: x.id, n: i, txt: txt(i), mid: x.mensaje_id, de: svChNombre(x.de) || 'Equipo', para: svChNombre(x.para) || 'Equipo',
             f: x.creada, ok: x.estado === 'resuelta', res: x.cerrada_por ? svChNombre(x.cerrada_por) : undefined, fr: x.cerrada_en || undefined };
  });
}
function svChOcupado(){
  return (typeof cmSel !== 'undefined' && cmSel) || !!document.getElementById('cmMenu') || !!document.getElementById('cmFw');
}
let svChDiferido = {};
const svChVistos = {};              // mensajes ya pintados en pantalla, por chat
function svChPintar(k){
  if (!SV_CH[k] || !clientesData[k]) return;
  const html = fsdLimpiarHtml(fsdChatPintar(svChModelo(k)));
  const tpl = document.createElement('template'); tpl.innerHTML = html;
  svChLocales(k, tpl);
  PLANES[k] = Object.assign({}, PLANES[k] || {}, { chat: html });
  if (k !== clienteActual) return;
  if (svChOcupado()) { svChDiferido[k] = 1; return; }
  delete svChDiferido[k];
  const l = document.getElementById('chatList'); if (!l) return;
  const abajo = l.scrollHeight - l.scrollTop - l.clientHeight < 80;
  const antes = l.scrollTop;
  const nuevos = l.querySelector('.chat-nuevos'), trasNuevos = nuevos && nuevos.nextElementSibling && nuevos.nextElementSibling.getAttribute('data-fid');
  l.innerHTML = html;
  // 5/11 · lo que no estaba antes en pantalla (mensaje nuevo) entra con suavidad
  const vistos = svChVistos[k], ids = Array.prototype.map.call(l.querySelectorAll('.bubble[data-fid]'), function(b){ return b.getAttribute('data-fid'); });
  if (vistos) {
    const nuevosB = Array.prototype.filter.call(l.querySelectorAll('.bubble[data-fid]'), function(b){ return !vistos[b.getAttribute('data-fid')]; });
    if (nuevosB.length <= 5) nuevosB.forEach(function(b){ b.classList.add('msg-nuevo'); });
  }
  svChVistos[k] = {}; ids.forEach(function(i){ svChVistos[k][i] = 1; });
  if (nuevos && trasNuevos) { const b = l.querySelector('.bubble[data-fid="' + trasNuevos.replace(/["\\]/g, '') + '"]'); if (b) b.parentNode.insertBefore(nuevos, b); }
  svArchRellenar(l);
  try { decorarChat(); } catch(e){}
  try { puChatFechas(); } catch(e){}
  try { cmPintarFijo(true); } catch(e){}
  try { ddPintar(); } catch(e){}
  try { pintarChatHero(); } catch(e){}
  l.scrollTop = abajo ? l.scrollHeight : antes;
  try { puBajarPintar(); } catch(e){}
}
setInterval(function(){ if (svChSesion() && !svChOcupado()) Object.keys(svChDiferido).forEach(svChPintar); }, 800);

/* =========================================================
   TRAER Y ESCUCHAR
   ========================================================= */
function svChPreparar(){
  return svCargar().then(function(x){
    const t = [];
    if (!svChYo) t.push(x.chat.yo().then(function(y){ svChYo = y; }));
    if (!svChEquipo) t.push(x.chat.equipo().then(function(e){ svChEquipo = e; }, function(){ svChEquipo = null; }));
    return Promise.all(t).then(function(){ return x; });
  });
}
const svChTrayendo = {};
function svChTraer(k){
  const d = clientesData[k];
  if (!svChSesion() || !d || !d.sid) return Promise.resolve();
  if (svChTrayendo[k]) return svChTrayendo[k];
  // 5/11 · mientras llega la conversación, no decir «Aún no hay mensajes»
  const vacio = !SV_CH[k] && k === clienteActual && document.getElementById('chatVacio');
  if (vacio) vacio.textContent = 'Cargando la conversación…';
  svChTrayendo[k] = svChPreparar().then(function(x){ return x.chat.traer(d.sid); }).then(function(r){
    SV_CH[k] = { mensajes: r.mensajes.map(svChFila), fijado: r.fijado, dudas: r.dudas.map(svChFila), cargado: true };
    svChLimpiarPend(k);
    svChPintar(k);
    guardarTodo();
    if (svChVisible(k)) svChLeer(k);
  }).catch(function(e){
    const v = document.getElementById('chatVacio');
    if (v && /Cargando/.test(v.textContent)) v.textContent = (window.fsdDatos && fsdDatos.sinConexion(e)) ? 'Sin conexión: la conversación se cargará al volver internet.' : 'Aún no hay mensajes. Escribe el primero.';
    if (!(window.fsdDatos && fsdDatos.sinConexion(e))) { try { toast(svMensaje(e, 'No se ha podido cargar el chat')); } catch(_){} }
  }).finally(function(){ delete svChTrayendo[k]; });
  return svChTrayendo[k];
}
/* lo pendiente que ya está en el servidor deja de estar pendiente */
function svChLimpiarPend(k){
  const S = SV_CH[k]; if (!S) return;
  const ids = {}; S.mensajes.forEach(function(m){ ids[m.id] = 1; });
  const d = clientesData[k]; if (d && Array.isArray(d.svChPend)) d.svChPend = d.svChPend.filter(function(p){ return !ids[p.id]; });
}

/* resumen: sin leer, último mensaje y quién espera respuesta */
let svChResT = null;
function svChResumen(){
  if (!svChSesion()) return Promise.resolve();
  return svChPreparar().then(function(x){ return x.chat.resumen(); }).then(function(lista){
    svChRes = {};
    lista.forEach(function(r){ svChRes[r.cliente_id] = svChFila(r); });
    svChVolcarSinLeer();
  }).catch(function(){});
}
function svChResumenLuego(){ clearTimeout(svChResT); svChResT = setTimeout(svChResumen, 700); }
function svChVolcarSinLeer(){
  const a = leerAvisos(); a.sinLeer = a.sinLeer || {};
  Object.keys(clientesData).forEach(function(k){
    const d = clientesData[k]; if (!d || !d.sid) return;
    const r = svChRes[d.sid], n = r && !svChVisible(k) ? (r.sin_leer || 0) : 0;
    if (coachActivo) { const s = a.sinLeer[clavePro(coachActivo.u)] = a.sinLeer[clavePro(coachActivo.u)] || {}; s[k] = n; }
    else if (window.fsdSesionCliente && k === clienteActual) { const s = a.sinLeer[claveCliente(k)] = a.sinLeer[claveCliente(k)] || {}; s.chat = n; }
  });
  guardarAvisos();
  try { pintarCampanas(); } catch(e){}
  try { pintarBadgeChats(); } catch(e){}
  try { clPintarChat(); } catch(e){}
  try { puPendPintar(); } catch(e){}
  try { const v = document.getElementById('view-coach-chats'); if (v && (v.classList.contains('active') || v.classList.contains('esc-izq'))) pintarChatsPro(); } catch(e){}
}

/* «leído hasta aquí» */
const svChLeerT = {};
function svChLeer(k){
  const d = clientesData[k]; if (!d || !d.sid || !svChSesion()) return;
  clearTimeout(svChLeerT[k]);
  svChLeerT[k] = setTimeout(function(){
    svCargar().then(function(x){ return x.chat.leido(d.sid); }).then(function(){
      if (svChRes[d.sid]) svChRes[d.sid].sin_leer = 0;
      svChVolcarSinLeer();
    }).catch(function(){});
  }, 600);
}
document.addEventListener('visibilitychange', function(){ if (svChSesion() && svChVisible(clienteActual)) svChLeer(clienteActual); });

/* avisos de la campana en este aparato (el otro aparato hace lo mismo con los suyos) */
function svChAvisar(k, m){
  if (svChVisible(k) || m.autor === svChYo || new Date(m.fecha).getTime() < svChDesde) return;
  const d = clientesData[k] || {};
  const t = m.tipo === 'foto' ? '📷 Foto' : (m.tipo === 'audio' ? '🎤 Nota de voz' : recortar(m.texto || '', 90));
  if (coachActivo && m.lado === 'out') crearAviso(clavePro(coachActivo.u), 'mensajes', 'Mensaje de ' + (d.nombre || 'cliente'), t, { cliente: k, vista: 'chat' });
  else if (!coachActivo && window.fsdSesionCliente && m.lado === 'in') crearAviso(claveCliente(k), 'mensajes', m.autor ? 'Mensaje de ' + (svChNombre(m.autor) || 'tu equipo') : 'Aviso de tu equipo', t, { vista: 'chat' });
}
function svChAvisarDuda(k, x, evento, antes){
  if (!coachActivo || !svChYo) return;
  const d = clientesData[k] || {}, du = (d.dudas || []).filter(function(y){ return y.id === x.id; })[0];
  const txt = du ? du.txt : '';
  if (evento === 'INSERT' && x.para === svChYo && x.estado === 'pendiente')
    crearAviso(clavePro(coachActivo.u), 'duda', '❓ ' + (svChNombre(x.de) || 'Tu compañero') + ' tiene una duda · ' + (d.nombre || 'cliente'), txt, { cliente: k, vista: 'chat', duda: x.id });
  else if (evento === 'UPDATE' && x.estado === 'resuelta' && (!antes || antes.estado !== 'resuelta') && x.de === svChYo && x.cerrada_por !== svChYo)
    crearAviso(clavePro(coachActivo.u), 'duda', '✓ ' + (svChNombre(x.cerrada_por) || 'Tu compañero') + ' ha resuelto tu duda · ' + (d.nombre || 'cliente'), txt, { cliente: k, vista: 'chat' });
}
function svChMeter(lista, fila){
  const i = lista.findIndex(function(y){ return y.id === fila.id; });
  if (i > -1) { lista[i] = Object.assign({}, lista[i], fila); return lista[i]; }
  lista.push(fila);
  return null;
}
function svChCambio(tabla, fila, evento){
  if (!fila || !fila.cliente_id) {
    if (tabla === 'chat_lecturas' || evento === 'DELETE') svChResumenLuego();
    return;
  }
  const k = svChClave(fila.cliente_id);
  if (!k) { svChResumenLuego(); return; }
  svChFila(fila);
  const S = SV_CH[k];
  if (tabla === 'mensajes') {
    if (S) {
      svChMeter(S.mensajes, fila);
      S.mensajes.sort(function(a, b){ return new Date(a.fecha) - new Date(b.fecha); });
      svChLimpiarPend(k);
      svChPintar(k);
      guardarTodo();
    }
    if (evento === 'INSERT') svChAvisar(k, fila);
    if (svChVisible(k)) svChLeer(k);
    svChResumenLuego();
  } else if (tabla === 'chat_fijado') {
    if (S) { S.fijado = fila.mensaje_id ? fila : null; svChPintar(k); guardarTodo(); }
  } else if (tabla === 'dudas') {
    if (!coachActivo) return;
    if (!S) { svChTraer(k).then(function(){ svChAvisarDuda(k, fila, evento, null); }); return; }
    const antes = svChMeter(S.dudas, fila);
    const previo = antes ? Object.assign({}, antes) : null;
    svChPintar(k); guardarTodo();
    svChAvisarDuda(k, fila, evento, previo && previo.estado === fila.estado ? null : previo);
    try { pintarChatsPro(); } catch(e){}
  } else if (tabla === 'chat_lecturas') {
    svChResumenLuego();
  }
}
let svChDejar = null;
function svChEscuchar(){
  if (svChDejar || !svChSesion()) return;
  svChPreparar().then(function(x){
    if (svChDejar || !svChSesion()) return;
    let primera = true;
    svChDejar = x.chat.escuchar(svChCambio, function(estado){
      // al volver a conectar (tras un corte) se pone al día lo que se haya perdido
      if (estado === 'SUBSCRIBED') { if (!primera) svChPonerAlDia(); primera = false; }
    });
  }).catch(function(){});
}
function svChParar(){
  if (svChDejar) { try { svChDejar(); } catch(e){} svChDejar = null; }
  Object.keys(SV_CH).forEach(function(k){ delete SV_CH[k]; });
  svChEquipo = null; svChYo = null; svChRes = {}; svChDiferido = {};
  Object.keys(SV_ARCH).forEach(function(r){ try { URL.revokeObjectURL(SV_ARCH[r]); } catch(e){} delete SV_ARCH[r]; });
}
function svChPonerAlDia(){
  svChResumen();
  Object.keys(SV_CH).forEach(function(k){ svChTraer(k); });
}

/* =========================================================
   ENVIAR (y la cola sin conexión)
   ========================================================= */
let svChEnviando = false, svChAvisado = false;
function svChEncolar(k, p){
  const d = clientesData[k]; if (!d || !d.sid) return false;
  p.id = p.id || svChId(); p.ts = p.ts || new Date().toISOString();
  svChPend(k).push(p);
  guardarTodo();
  svChMostrar(k, p.id);
  svChEnviar();
  return true;
}
/* pinta un mensaje recién puesto (si el chat aún no se ha traído, se añade al final) */
function svChMostrar(k, id){
  if (SV_CH[k]) { svChPintar(k); return; }
  if (k !== clienteActual) return;
  const l = document.getElementById('chatList'), mod = svChModelo(k);
  mod.mensajes = mod.mensajes.filter(function(m){ return m.id === id; });
  if (l && mod.mensajes.length) {
    const viejo = l.querySelector('.bubble[data-fid="' + String(id).replace(/["\\]/g, '') + '"]');
    const html = fsdLimpiarHtml(fsdChatPintar(mod));
    if (viejo) viejo.outerHTML = html;
    else { const v = document.getElementById('chatVacio'); if (v) v.remove(); l.insertAdjacentHTML('beforeend', html); }
    svArchRellenar(l);
    try { decorarChat(); } catch(e){}
    l.scrollTop = l.scrollHeight;
  }
  svChTraer(k);
}
/* foto o nota de voz: se sube el archivo (con el id del mensaje como nombre) y después se envía */
const svChSubiendo = {};                  // por chat: lo que se está subiendo (solo en memoria)
function svChMandarArchivo(k, tipo, blob, dur){
  const d = clientesData[k]; if (!d || !d.sid || !blob) return;
  const u = { id: svChId(), tipo: tipo, local: URL.createObjectURL(blob), dur: dur || null, ts: new Date().toISOString() };
  (svChSubiendo[k] = svChSubiendo[k] || []).push(u);
  svChMostrar(k, u.id);
  const quitar = function(){ svChSubiendo[k] = (svChSubiendo[k] || []).filter(function(x){ return x !== u; }); };
  svCargar().then(function(x){ return x.archivos.subir(tipo === 'foto' ? 'fotos' : 'audios', d.sid, u.id, blob); }).then(function(ruta){
    SV_ARCH[ruta] = u.local;                        // ya está en este aparato: no hace falta descargarlo
    quitar();
    svChEncolar(k, { id: u.id, ts: u.ts, tipo: tipo, ruta: ruta, dur: tipo === 'audio' ? dur : null });
  }, function(e){
    quitar();
    URL.revokeObjectURL(u.local);
    if (SV_CH[k]) svChPintar(k); else { const b = document.querySelector('#chatList .bubble[data-fid="' + u.id + '"]'); if (b) b.remove(); }
    const sin = window.fsdDatos && fsdDatos.sinConexion(e);
    try { toast(sin ? 'Sin conexión: ' + (tipo === 'foto' ? 'la foto' : 'la nota de voz') + ' no se ha enviado. Vuelve a enviarla con internet.'
                    : svMensaje(e, 'No se ha podido enviar ' + (tipo === 'foto' ? 'la foto' : 'la nota de voz'))); } catch(_){}
  });
}
function svChEnviar(){
  if (svChEnviando || !svChSesion()) return Promise.resolve();
  const lado = svChSoyEquipo() ? 'in' : 'out';
  const cola = [];
  Object.keys(clientesData).forEach(function(k){ svChPend(k).forEach(function(p){ if (!p.enviado) cola.push([k, p]); }); });
  cola.sort(function(a, b){ return a[1].ts < b[1].ts ? -1 : 1; });
  if (!cola.length) return Promise.resolve();
  svChEnviando = true;
  return svCargar().then(function(x){
    let i = 0;
    const siguiente = function(){
      if (i >= cola.length) return null;
      const k = cola[i][0], p = cola[i][1], d = clientesData[k]; i++;
      if (!d || !d.sid) return siguiente();
      return x.chat.enviar({ id: p.id, clienteId: d.sid, lado: lado, texto: p.texto, citaDe: p.citaDe, reenviado: p.reenviado, etiqueta: p.etiqueta,
                             tipo: p.tipo, archivoRuta: p.ruta, duracion: p.dur })
        .then(function(){ p.enviado = true; svChAvisado = false; return siguiente(); }, function(e){
          if (x.sinConexion(e)) {
            if (!svChAvisado) { svChAvisado = true; try { toast('Sin conexión: tus mensajes se enviarán al volver internet'); } catch(_){} }
            return null;                                           // se reintenta más tarde, en orden
          }
          d.svChPend = svChPend(k).filter(function(y){ return y !== p; });
          try { toast(svMensaje(e, 'No se ha podido enviar el mensaje')); } catch(_){}
          const inp = document.getElementById('chatInput');
          if (p.texto && k === clienteActual && inp && !inp.value.trim()) { inp.value = p.texto; try { actualizarComposer(); } catch(_){} }
          svChPintar(k);
          return siguiente();
        });
    };
    return siguiente();
  }).catch(function(){}).finally(function(){
    svChEnviando = false;
    guardarTodo();
  });
}
window.addEventListener('online', function(){ if (svChSesion()) svChEnviar().then(svChPonerAlDia); });
setInterval(function(){ if (svChSesion() && Object.keys(clientesData).some(function(k){ return svChPend(k).some(function(p){ return !p.enviado; }); })) svChEnviar(); }, 15000);

/* =========================================================
   ENGANCHES (solo en modo servidor)
   ========================================================= */
if (svActivo()) {
  (function(){
    const s = document.createElement('style');
    s.textContent = '#chatList .bubble.sv-pend{opacity:.62}#chatList .bubble.sv-pend::after{content:"🕓";font-size:11px;margin-left:6px;vertical-align:-1px}'
      + '#chatList .bubble img.sv-arch-carga,#chatList .bubble img.sv-arch-no{width:200px;height:150px;max-width:100%;border-radius:12px;background:var(--line,#e5e7eb)}'
      + '#chatList .bubble img.sv-arch-carga{animation:svArchLate 1.2s ease-in-out infinite}'
      + '@keyframes svArchLate{50%{opacity:.55}}@media (prefers-reduced-motion:reduce){#chatList .bubble img.sv-arch-carga{animation:none}}';
    document.head.appendChild(s);
  })();
  /* foto: se reduce en el aparato (1280 px, JPEG) y se sube */
  subirImagen = (function(orig){
    return function(input){
      if (!svChSesion()) return orig.apply(this, arguments);
      const f = input && input.files && input.files[0], k = clienteActual;
      if (input) input.value = '';
      if (!f || !k) return;
      if (!/^image\//.test(f.type || '')) { toast('Elige una imagen'); return; }
      sgFotoReducir(f).then(function(b){
        if (!/^image\/(jpeg|png|webp)$/.test(b.type || '')) { toast('Esa imagen no se puede enviar. Prueba con otra (JPG o PNG).'); return; }
        if (b.size > 5 * 1024 * 1024) { toast('La foto es demasiado grande'); return; }
        svChMandarArchivo(k, 'foto', b);
      });
    };
  })(subirImagen);
  /* nota de voz: llega como data:… al terminar de grabar (máximo 2 minutos) */
  const svDataABlob = function(url){
    const m = /^data:([^;,]+)(?:;[^,]*)?;base64,(.*)$/.exec(String(url || '')); if (!m) return null;
    const bin = atob(m[2]), a = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new Blob([a], { type: m[1] });
  };
  addAudioBubble = (function(orig){
    return function(src, segs){
      if (!svChSesion()) return orig.apply(this, arguments);
      const b = svDataABlob(src), k = clienteActual;
      if (!b || !k) { toast('No se ha podido grabar la nota de voz'); return; }
      svChMandarArchivo(k, 'audio', b, Math.max(1, Math.min(120, Math.round(+segs || 1))));
    };
  })(addAudioBubble);
  meterEnChat = (function(orig){ return function(){ if (!svChSesion()) return orig.apply(this, arguments); }; })(meterEnChat);
  /* la copia del chat que se guarda en el aparato (se lee de la pantalla) no lleva enlaces locales: al
     reabrir la app ya no valen. La foto queda en gris y la nota de voz sin audio hasta volver a descargarlas */
  guardarChat = (function(orig){
    return function(){
      const r = orig.apply(this, arguments);
      const c = svChSesion() && clienteActual && PLANES[clienteActual] && PLANES[clienteActual].chat;
      if (typeof c === 'string' && c.indexOf('blob:') > -1)
        PLANES[clienteActual].chat = c.replace(/(<img\b[^>]*?\ssrc=")blob:[^"]*"/g, '$1' + SV_ARCH_VACIO + '"').replace(/<audio\b[^>]*\ssrc="blob:[^"]*"[^>]*><\/audio>/g, '');
      return r;
    };
  })(guardarChat);
  /* ▶ de una nota de voz aún sin descargar: se descarga y suena */
  reproducirAudio = (function(orig){
    return function(btn){
      const w = btn && btn.parentElement, b = btn && btn.closest('.bubble'), ruta = b && b.getAttribute('data-arch');
      if (!svChSesion() || !ruta || !w || w.querySelector('audio')) return orig.apply(this, arguments);
      btn.textContent = '…';
      svArchTraer(ruta).then(function(url){ svArchPoner(b, url); btn.textContent = '▶'; orig(btn); },
        function(e){ btn.textContent = '▶'; try { toast(svMensaje(e, 'No se ha podido cargar la nota de voz')); } catch(_){} });
    };
  })(reproducirAudio);
  /* tocar una foto que aún no ha llegado: se espera a tenerla y se abre en grande */
  window.addEventListener('click', function(e){
    if (!svChSesion() || !e.target.closest) return;
    const img = e.target.closest('#chatList .bubble[data-arch] > img');
    if (!img || (img.src && img.src.indexOf('blob:') === 0)) return;
    e.preventDefault(); e.stopPropagation();
    const ruta = img.parentNode.getAttribute('data-arch');
    svArchTraer(ruta).then(function(url){ svArchPoner(img.parentNode, url); try { cmAbrirVisor(url, img.alt); } catch(_){} }, function(){ svArchFallo(ruta); });
  }, true);
  /* fotos del chat: antes de enseñarlas todas, se descargan */
  if (typeof puGaleria === 'function') puGaleria = (function(orig){
    return function(){
      if (!svChSesion()) return orig.apply(this, arguments);
      const l = document.getElementById('chatList');
      const rutas = Array.prototype.map.call(l ? l.querySelectorAll('.bubble[data-arch] > img') : [], function(i){ return i.parentNode.getAttribute('data-arch'); });
      const self = this, args = arguments;
      Promise.all(rutas.map(function(r){ return svArchTraer(r).catch(function(){ return null; }); })).then(function(){ svArchRellenar(l); orig.apply(self, args); });
    };
  })(puGaleria);

  /* enviar un mensaje de texto */
  sendMsg = (function(orig){
    return function(){
      if (!svChSesion()) return orig.apply(this, arguments);
      const input = document.getElementById('chatInput'), k = clienteActual;
      const texto = ((input && input.value) || '').trim();
      if (!texto || !k) return;
      if (texto.length > 4000) { toast('El mensaje es demasiado largo (máximo 4000 caracteres)'); return; }
      const rp = typeof cmReply !== 'undefined' ? cmReply : null;
      const p = { texto: texto };
      if (rp && rp.mid && SV_CH_UUID.test(rp.mid)) p.citaDe = rp.mid;
      if (!svChEncolar(k, p)) return;
      input.value = '';
      if (rp) { cmReply = null; try { cmPintarReply(); } catch(e){} }
      try { cerrarEmojis(); } catch(e){}
      try { actualizarComposer(); } catch(e){}
      try { clearTimeout(puBorrT); puBorrGuardar(''); } catch(e){}     // sin borrador que vuelva a salir
      const l = document.getElementById('chatList'); if (l) l.scrollTop = l.scrollHeight;
    };
  })(sendMsg);

  /* reenviar a otro chat (solo profesionales) */
  cmEnviarA = (function(orig){
    return function(k, textos){
      if (!svChSesion()) return orig.apply(this, arguments);
      const d = clientesData[k]; if (!d || !d.sid) return;
      textos.forEach(function(t){ svChEncolar(k, { texto: String(t).slice(0, 4000), reenviado: true }); });
      toast('Reenviado a ' + (d.nombre || 'el cliente'));
    };
  })(cmEnviarA);

  /* revisión del seguimiento → mensaje con su etiqueta */
  sgMencionChat = (function(orig){
    return function(k, texto){
      if (!svChSesion()) return orig.apply(this, arguments);
      if (!clientesData[k] || !texto) return;
      svChEncolar(k, { texto: String(texto).slice(0, 4000), etiqueta: 'revision' });
    };
  })(sgMencionChat);

  /* eliminar: solo lo propio (lo que aún no se ha enviado se quita sin más) */
  const svChMioId = function(b){
    const id = b && b.getAttribute('data-fid'), k = clienteActual;
    if (!id || !k) return false;
    if (svChPend(k).some(function(p){ return p.id === id; })) return true;
    const m = ((SV_CH[k] || {}).mensajes || []).filter(function(x){ return x.id === id; })[0];
    return !!(m && m.autor && m.autor === svChYo);
  };
  cmPuedeEliminar = (function(orig){
    return function(b){ if (!svChSesion()) return orig.apply(this, arguments); return !cmEliminado(b) && svChMioId(b); };
  })(cmPuedeEliminar);
  cmBorrar = (function(orig){
    return function(b){
      if (!svChSesion()) return orig.apply(this, arguments);
      const k = clienteActual, id = b && b.getAttribute('data-fid'), d = clientesData[k];
      if (!id || !d) return;
      if (svChPend(k).some(function(p){ return p.id === id && !p.enviado; })) {
        d.svChPend = svChPend(k).filter(function(p){ return p.id !== id; });
        svChPintar(k); guardarTodo(); return;
      }
      const S = SV_CH[k], m = S && S.mensajes.filter(function(x){ return x.id === id; })[0];
      const antes = m ? { texto: m.texto, ruta: m.archivo_ruta } : null;
      if (m) { m.eliminado = true; m.texto = null; m.archivo_ruta = null; }
      svChPintar(k);
      svCargar().then(function(x){
        return x.chat.vaciar(id).then(function(){
          // el archivo también se quita (si fallara, lo borra la limpieza diaria)
          if (antes && antes.ruta) {
            x.archivos.quitar(svArchCarpeta(antes.ruta), antes.ruta).catch(function(){});
            if (SV_ARCH[antes.ruta]) { URL.revokeObjectURL(SV_ARCH[antes.ruta]); delete SV_ARCH[antes.ruta]; }
          }
        });
      }).catch(function(e){
        if (m && antes) { m.eliminado = false; m.texto = antes.texto; m.archivo_ruta = antes.ruta; }
        svChPintar(k);
        try { toast(svMensaje(e, 'No se ha podido eliminar el mensaje')); } catch(_){}
      });
    };
  })(cmBorrar);

  /* fijar y desfijar */
  const svChFijar = function(k, id){
    const d = clientesData[k]; if (!d || !d.sid) return;
    const S = SV_CH[k], antes = S ? S.fijado : null;
    if (S) { S.fijado = id ? { mensaje_id: id } : null; svChPintar(k); }
    svCargar().then(function(x){ return x.chat.fijar(d.sid, id); }).then(function(){
      toast(id ? 'Mensaje fijado' : 'Mensaje desfijado');
    }, function(e){
      if (S) { S.fijado = antes; svChPintar(k); }
      try { toast(svMensaje(e, 'No se ha podido fijar el mensaje')); } catch(_){}
    });
  };
  cmFijar = (function(orig){
    return function(b){
      if (!svChSesion()) return orig.apply(this, arguments);
      const k = clienteActual, id = b && b.getAttribute('data-fid');
      if (!k || !id) return;
      if (svChPend(k).some(function(p){ return p.id === id; })) { toast('Espera a que se envíe el mensaje'); return; }
      const f = (SV_CH[k] || {}).fijado;
      svChFijar(k, f && f.mensaje_id === id ? null : id);
    };
  })(cmFijar);
  document.addEventListener('click', function(e){
    if (!svChSesion() || !e.target.closest || !e.target.closest('#cmPin button')) return;
    e.stopPropagation(); e.preventDefault();
    if (clienteActual) svChFijar(clienteActual, null);
  }, true);

  /* dudas entre profesionales */
  const svChDuda = function(b){
    const k = clienteActual, d = clientesData[k], id = b && b.getAttribute('data-fid');
    const o = typeof ddOtro === 'function' ? ddOtro() : null, para = o && svChUidDe(o.u);
    if (!d || !d.sid || !id || !para) { toast('No se ha podido enviar la duda'); return; }
    svCargar().then(function(x){ return x.chat.nuevaDuda(d.sid, id, para); }).then(function(){
      try { ddQuitarChip(); } catch(_){}
      toast('Aviso enviado a ' + o.u);
      return svChTraer(k);
    }, function(e){ try { toast(svMensaje(e, 'No se ha podido enviar la duda')); } catch(_){} });
  };
  ddCrearDuda = (function(orig){
    return function(b){ if (!svChSesion()) return orig.apply(this, arguments); svChDuda(b); };
  })(ddCrearDuda);
  ddAccion = (function(orig){
    return function(bot){
      if (!svChSesion()) return orig.apply(this, arguments);
      const a = bot.dataset.dd, k = clienteActual; if (!k) return;
      if (a === 'nueva') { const chip = bot.closest('.dd-chip'); if (chip && chip._b) svChDuda(chip._b); return; }
      const t = bot.closest('.dd-tag'), id = t && t.dataset.id; if (!id) return;
      svCargar().then(function(x){ return x.chat.cerrarDuda(id, a === 'ok' ? 'resuelta' : 'quitada'); }).then(function(){
        toast(a === 'ok' ? 'Duda resuelta' : 'Duda quitada');
        return svChTraer(k);
      }).then(function(){ try { pintarChatsPro(); } catch(_){} }, function(e){ try { toast(svMensaje(e, 'No se ha podido cerrar la duda')); } catch(_){} });
    };
  })(ddAccion);

  /* lista de chats de los profesionales: con lo que dice el servidor */
  esperaDesde = (function(orig){
    return function(k){
      if (!svChSesion()) return orig.apply(this, arguments);
      const d = clientesData[k], r = d && d.sid && svChRes[d.sid];
      if (!r || !r.espera_desde) return null;
      // «✓ Marcar como resuelto» (en este aparato): vuelve a salir solo si el cliente escribe después
      const res = d.chatT && d.chatT.resuelto;
      if (res && r.espera_desde <= res) return r.ultimo_lado === 'out' && r.ultimo_fecha > res ? r.ultimo_fecha : null;
      return r.espera_desde;
    };
  })(esperaDesde);
  ultimoTextoChat = (function(orig){
    return function(k){
      if (!svChSesion()) return orig.apply(this, arguments);
      const d = clientesData[k], r = d && d.sid && svChRes[d.sid];
      if (!r || !r.ultimo_fecha) return null;
      const txt = r.ultimo_eliminado ? '🚫 Mensaje eliminado' : (r.ultimo_tipo === 'foto' ? '📷 Foto' : (r.ultimo_tipo === 'audio' ? '🎤 Nota de voz' : (r.ultimo_texto || '')));
      const quien = r.ultimo_lado === 'out' ? 'cliente' : (r.ultimo_autor ? (svChNombre(r.ultimo_autor) || 'Equipo') : 'Aviso');
      return { t: r.ultimo_fecha, quien: quien, txt: recortar(txt, 90) };
    };
  })(ultimoTextoChat);

  /* abrir un chat: lo de este aparato al momento y lo del servidor en cuanto llega */
  abrirVistaCliente = (function(orig){
    return function(vista){
      const r = orig.apply(this, arguments);
      if (vista === 'chat' && svChSesion() && clienteActual) { const k = clienteActual; svChPintar(k); svChTraer(k).then(function(){ svChLeer(k); }); }
      return r;
    };
  })(abrirVistaCliente);
  goTo = (function(orig){
    return function(n){
      const r = orig.apply(this, arguments);
      if (n === 'chat' && svChSesion() && clienteActual && !coachActivo) { const k = clienteActual; svChPintar(k); svChLeer(k); }
      return r;
    };
  })(goTo);

  /* ordenador en «Multitarea»: al abrir la ficha, el chat de la derecha también se carga del servidor */
  if (typeof mtPonerChat === 'function') mtPonerChat = (function(orig){
    return function(k){
      const r = orig.apply(this, arguments);
      if (svChSesion() && k && clientesData[k]) { if (SV_CH[k]) { svChPintar(k); svChLeer(k); } else svChTraer(k); }   // luego lo pone al día el tiempo real
      return r;
    };
  })(mtPonerChat);

  window.addEventListener('fsd:lista-servidor', function(){
    svChPreparar().then(function(x){
      svChEscuchar();
      svChResumen();
      svChEnviar();
      return x.chat.dudasPendientes().then(function(ids){ ids.forEach(function(sid){ const k = svChClave(sid); if (k) svChTraer(k); }); });
    }).catch(function(){});
  });
  window.addEventListener('fsd:cliente-dentro', function(){
    const k = clienteActual;
    svChPreparar().then(function(){ svChEscuchar(); svChEnviar(); if (k) svChTraer(k); svChResumen(); }).catch(function(){});
  });
  window.addEventListener('fsd:sesion-fuera', svChParar);
  window.addEventListener('fsd:al-volver', function(){ if (svChSesion()) svChEnviar().then(svChPonerAlDia); });
}
