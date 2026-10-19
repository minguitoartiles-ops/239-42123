/* =========================================================
   Fitness sin Dramas — Notificaciones (sin servidor)
   Los avisos se generan con lo que ocurre en este móvil y se guardan aquí.
   Avisos entre móviles distintos y con la app cerrada: pendiente de servidor
   (ver PENDIENTE_SUPABASE.md).
   Se carga después de app.js, ajustes.js y ux.js.
   ========================================================= */

const AVISOS_KEY = 'fsd_avisos';
const TIPOS_CLIENTE = [
  { id: 'mensajes',    ico: '💬', nombre: 'Mensajes del equipo',        desc: 'Cuando Domingo o Fátima te escriben' },
  { id: 'plan',        ico: '📝', nombre: 'Cambios en tu plan',          desc: 'Cuando se actualiza tu entrenamiento o tu nutrición' },
  { id: 'seguimiento', ico: '⏰', nombre: 'Recordatorio de seguimiento', desc: 'Cuando toca enviar el seguimiento semanal' },
  { id: 'revisado',    ico: '👀', nombre: 'Seguimiento revisado',        desc: 'Cuando tu profesional ha visto tu seguimiento' }
];
const TIPOS_PRO = [
  { id: 'seguimientos', ico: '📋', nombre: 'Seguimientos recibidos',  desc: 'Cuando un cliente envía su seguimiento' },
  { id: 'mensajes',     ico: '💬', nombre: 'Mensajes de clientes',    desc: 'Cuando un cliente escribe en el chat' },
  { id: 'altas',        ico: '🆕', nombre: 'Clientes nuevos',         desc: 'Cuando el otro profesional da de alta a alguien' },
  { id: 'pendientes',   ico: '⏰', nombre: 'Seguimientos pendientes', desc: 'Clientes con más de 7 días sin enviar seguimiento' }
];
const DIA_MS = 86400000;

/* ---------- almacenamiento ---------- */
let avisosMem = null;
function leerAvisos(){
  if (avisosMem) return avisosMem;
  try { avisosMem = JSON.parse(localStorage.getItem(AVISOS_KEY) || 'null'); } catch(e){ avisosMem = null; }
  if (!avisosMem || typeof avisosMem !== 'object') avisosMem = {};
  avisosMem.lista = avisosMem.lista || {};
  avisosMem.pref = avisosMem.pref || {};
  avisosMem.ultimo = avisosMem.ultimo || {};      // última vez que se avisó de algo repetible
  return avisosMem;
}
function guardarAvisos(){
  try { localStorage.setItem(AVISOS_KEY, JSON.stringify(leerAvisos())); } catch(e){}
}
function claveCliente(k){ return 'cliente:' + k; }
function clavePro(nombre){ return 'pro:' + norm(nombre); }
function destinatarioActual(){
  if (coachActivo && !(document.getElementById('app').style.display === 'flex' && !isCoachView())) return clavePro(coachActivo.u);
  if (clienteActual && window.fsdSesionCliente && !isCoachView()) return claveCliente(clienteActual);
  return null;
}
function tiposDe(dest){ return dest && dest.indexOf('pro:') === 0 ? TIPOS_PRO : TIPOS_CLIENTE; }
function avisoActivo(dest, tipo){
  const p = leerAvisos().pref[dest];
  return !p || p[tipo] !== false;
}
function recortar(t, n){ t = String(t || '').replace(/\s+/g, ' ').trim(); n = n || 80; return t.length > n ? t.slice(0, n - 1) + '…' : t; }

/* ---------- crear un aviso ---------- */
function crearAviso(dest, tipo, titulo, texto, ir){
  if (!dest || !avisoActivo(dest, tipo)) return;
  const a = leerAvisos();
  const lista = a.lista[dest] = a.lista[dest] || [];
  lista.unshift({ id: Date.now() + '-' + Math.random().toString(36).slice(2, 7), tipo: tipo, titulo: titulo, texto: texto || '',
                  fecha: new Date().toISOString(), leida: false, ir: ir || null });
  if (lista.length > 100) lista.length = 100;
  guardarAvisos();
  pintarCampanas();
  if (dest === destinatarioActual()) avisoDelSistema(dest, tipo, titulo, texto);
}
function avisarPros(tipo, titulo, texto, ir, excepto){
  COACHES.forEach(function(c){
    if (excepto && norm(c.u) === norm(excepto)) return;
    crearAviso(clavePro(c.u), tipo, titulo, texto, ir);
  });
}
/* evita repetir un aviso periódico más de una vez al día */
function tocaAvisar(clave){
  const a = leerAvisos();
  const t = a.ultimo[clave] || 0;
  if (Date.now() - t < DIA_MS) return false;
  a.ultimo[clave] = Date.now();
  guardarAvisos();
  return true;
}

/* ---------- campanas y lista ---------- */
function noLeidos(dest){ return ((leerAvisos().lista[dest]) || []).filter(function(x){ return !x.leida; }).length; }
function pintarBadge(id, n){
  const b = document.getElementById(id);
  if (!b) return;
  b.textContent = n > 9 ? '9+' : n;
  b.classList.toggle('hide', n === 0);
}
function pintarCampanas(){
  pintarBadge('coachBellBadge', coachActivo ? noLeidos(clavePro(coachActivo.u)) : 0);
  pintarBadge('bellBadge', clienteActual && window.fsdSesionCliente ? noLeidos(claveCliente(clienteActual)) : 0);
}
function hace(iso){
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'ahora';
  if (s < 3600) return 'hace ' + Math.round(s / 60) + ' min';
  if (s < DIA_MS / 1000) return 'hace ' + Math.round(s / 3600) + ' h';
  const d = Math.round(s / 86400);
  return d === 1 ? 'ayer' : 'hace ' + d + ' días';
}
function htmlListaAvisos(dest){
  const lista = (leerAvisos().lista[dest]) || [];
  const tipos = tiposDe(dest);
  if (!lista.length) return '<div class="picker-empty">No tienes notificaciones.</div>';
  return lista.map(function(x){
    const t = tipos.filter(function(y){ return y.id === x.tipo; })[0];
    return '<div class="noti-item' + (x.leida ? ' leida' : '') + '" onclick="abrirAviso(\'' + dest.replace(/'/g, "\\'") + '\',\'' + x.id + '\')">'
      + '<div class="noti-ico">' + (t ? t.ico : '🔔') + '</div>'
      + '<div class="noti-txt"><b>' + esc(x.titulo) + '</b>' + (x.texto ? '<span>' + esc(x.texto) + '</span>' : '')
      + '<span class="noti-when">' + hace(x.fecha) + '</span></div>'
      + (x.leida ? '' : '<span class="noti-dot" aria-label="Sin leer"></span>')
      + '</div>';
  }).join('');
}
function cabeceraAvisos(dest){
  return '<b>Notificaciones</b><span class="noti-acts">'
    + (noLeidos(dest) ? '<button class="mini-btn" onclick="marcarTodosLeidos(\'' + dest.replace(/'/g, "\\'") + '\')">Marcar todo como leído</button>' : '')
    + '<button class="picker-close" onclick="' + (dest.indexOf('pro:') === 0 ? 'cerrarNotisCoach()' : 'cerrarNotis()') + '" aria-label="Cerrar">✕</button></span>';
}
function pintarListas(){
  if (coachActivo) {
    const d = clavePro(coachActivo.u);
    const l = document.getElementById('notiListCoach');
    if (l) l.innerHTML = htmlListaAvisos(d);
    const h = document.querySelector('#notiPopCoach .noti-head');
    if (h) h.innerHTML = cabeceraAvisos(d);
  }
  if (clienteActual) {
    const d = claveCliente(clienteActual);
    const l = document.querySelector('#notiPop .noti-list');
    if (l) l.innerHTML = htmlListaAvisos(d);
    const h = document.querySelector('#notiPop .noti-head');
    if (h) h.innerHTML = cabeceraAvisos(d);
  }
  pintarCampanas();
}
function marcarTodosLeidos(dest){
  ((leerAvisos().lista[dest]) || []).forEach(function(x){ x.leida = true; });
  guardarAvisos();
  pintarListas();
}
function abrirAviso(dest, id){
  const x = ((leerAvisos().lista[dest]) || []).filter(function(y){ return y.id === id; })[0];
  if (!x) return;
  x.leida = true;
  guardarAvisos();
  pintarCampanas();
  const ir = x.ir || {};
  if (dest.indexOf('pro:') === 0) {
    cerrarNotisCoach();
    if (ir.cliente && clientesData[ir.cliente]) {
      goToCliente(ir.cliente);
      if (ir.vista === 'chat') verConversacion();
      else if (ir.vista === 'seguimientos') goToSeguimientos();
    }
  } else {
    cerrarNotis();
    if (ir.vista) goTo(ir.vista);
  }
}
/* sustituye las campanas antiguas (la del profesional abría siempre una ficha fija) */
abrirNotis = function(){ pintarListas(); document.getElementById('notiPop').classList.add('show'); };
cerrarNotis = function(){ document.getElementById('notiPop').classList.remove('show'); pintarCampanas(); };
abrirNotisCoach = function(){ pintarListas(); document.getElementById('notiPopCoach').classList.add('show'); };
cerrarNotisCoach = function(){ document.getElementById('notiPopCoach').classList.remove('show'); pintarCampanas(); };
pintarNotisCoach = function(){ pintarCampanas(); };

/* =========================================================
   CUÁNDO SE AVISA
   ========================================================= */

/* Mensajes de texto */
sendMsg = (function(orig){
  return function(){
    const t = (document.getElementById('chatInput').value || '').trim();
    const coach = isCoachView();
    const k = clienteActual;
    orig();
    if (!t || !k || !clientesData[k]) return;
    if (coach && coachActivo) crearAviso(claveCliente(k), 'mensajes', 'Mensaje de ' + coachActivo.u, recortar(t), { vista: 'chat' });
    else if (!coach) avisarPros('mensajes', 'Mensaje de ' + clientesData[k].nombre, recortar(t), { cliente: k, vista: 'chat' });
  };
})(sendMsg);
/* Fotos y notas de voz */
meterEnChat = (function(orig){
  return function(b){
    orig(b);
    const k = clienteActual;
    if (!k || !clientesData[k]) return;
    const que = b && b.querySelector && b.querySelector('img') ? '📷 Foto' : (b && b.querySelector && b.querySelector('audio, .audio-b') ? '🎤 Nota de voz' : 'Archivo');
    if (isCoachView() && coachActivo) crearAviso(claveCliente(k), 'mensajes', 'Mensaje de ' + coachActivo.u, que, { vista: 'chat' });
    else if (!isCoachView()) avisarPros('mensajes', 'Mensaje de ' + clientesData[k].nombre, que, { cliente: k, vista: 'chat' });
  };
})(meterEnChat);

/* Plan actualizado: solo si al guardar hay cambios reales */
let fotoPlanAntes = null;
function fotoPlan(){ try { sincronizarInputs(contEnt()); sincronizarInputs(contNut()); } catch(e){} return contEnt().innerHTML + '|' + contNut().innerHTML; }
editarPlan = (function(orig){
  return function(){
    const empezando = !coachEditing;
    const vista = vistaActual;
    if (empezando) fotoPlanAntes = fotoPlan();
    orig();
    if (!empezando && fotoPlanAntes !== null && clienteActual && coachActivo) {
      const cambio = fotoPlan() !== fotoPlanAntes;
      fotoPlanAntes = null;
      if (cambio) {
        const nut = vista === 'plan';
        crearAviso(claveCliente(clienteActual), 'plan',
          (nut ? 'Tu plan de nutrición' : 'Tu entrenamiento') + ' se ha actualizado',
          coachActivo.u + ' ha hecho cambios. Échales un vistazo.', { vista: nut ? 'plan' : 'entreno' });
      }
    }
  };
})(editarPlan);

/* Seguimiento enviado por el cliente → avisa a los dos profesionales */
guardarSeguimiento = (function(orig){
  return function(){
    const k = clienteActual;
    const antes = k ? (SEGUIMIENTOS[k] || []).length : 0;
    orig();
    if (!k || !clientesData[k]) return;
    const lista = SEGUIMIENTOS[k] || [];
    if (lista.length <= antes) return;
    const r = lista[0];
    const partes = [];
    if (r.peso && r.peso !== '—') partes.push(r.peso);
    if (r.e) partes.push('Entreno ' + r.e + '/10');
    if (r.n) partes.push('Nutrición ' + r.n + '/10');
    avisarPros('seguimientos', clientesData[k].nombre + ' ha enviado su seguimiento', partes.join(' · '), { cliente: k, vista: 'seguimientos' });
  };
})(guardarSeguimiento);

/* El profesional abre los seguimientos → el cliente sabe que se han revisado */
goToSeguimientos = (function(orig){
  return function(){
    orig();
    const k = clienteActual;
    if (!k || !coachActivo) return;
    const r = (SEGUIMIENTOS[k] || [])[0];
    if (!r) return;
    const yo = norm(coachActivo.u);
    r.vistoPor = r.vistoPor || {};
    if (r.vistoPor[yo]) return;
    r.vistoPor[yo] = new Date().toISOString();
    guardarTodo();
    crearAviso(claveCliente(k), 'revisado', coachActivo.u + ' ha revisado tu seguimiento', r.s || '', { vista: 'seguimiento' });
  };
})(goToSeguimientos);

/* Alta de un cliente → avisa al otro profesional */
confirmAlta = (function(orig){
  return function(){
    const antes = Object.keys(clientesData);
    orig();
    const nueva = Object.keys(clientesData).filter(function(k){ return antes.indexOf(k) === -1; })[0];
    if (!nueva || !coachActivo) return;
    avisarPros('altas', 'Nuevo cliente: ' + clientesData[nueva].nombre, 'Lo ha dado de alta ' + coachActivo.u + '.', { cliente: nueva, vista: 'ficha' }, coachActivo.u);
  };
})(confirmAlta);

/* Seguimientos atrasados: al entrar un profesional y al entrar un cliente */
function diasSinSeguimiento(k){
  const d = clientesData[k];
  const r = (SEGUIMIENTOS[k] || [])[0];
  const ref = r ? r.fecha : (d && d.fechaAlta);
  if (!ref) return null;
  return Math.floor((Date.now() - new Date(ref).getTime()) / DIA_MS);
}
function revisarPendientesPro(){
  if (!coachActivo) return;
  const dest = clavePro(coachActivo.u);
  Object.keys(clientesData).forEach(function(k){
    const dias = diasSinSeguimiento(k);
    if (dias == null || dias < 7) return;
    if (!tocaAvisar(dest + '|pend|' + k)) return;
    const tiene = (SEGUIMIENTOS[k] || []).length > 0;
    crearAviso(dest, 'pendientes', clientesData[k].nombre + ' tiene el seguimiento pendiente',
      tiene ? 'Último seguimiento hace ' + dias + ' días.' : 'Aún no ha enviado ninguno (alta hace ' + dias + ' días).',
      { cliente: k, vista: 'ficha' });
  });
}
function revisarRecordatorioCliente(){
  const k = clienteActual;
  if (!k || !window.fsdSesionCliente || isCoachView()) return;
  const dias = diasSinSeguimiento(k);
  if (dias == null || dias < 7) return;
  const dest = claveCliente(k);
  if (!tocaAvisar(dest + '|recordatorio')) return;
  crearAviso(dest, 'seguimiento', 'Toca tu seguimiento semanal', 'Cuéntanos tu peso, medidas y cómo te has sentido esta semana.', { vista: 'seguimiento' });
}
entrarAlPanel = (function(orig){
  return function(){ orig(); revisarPendientesPro(); pintarListas(); };
})(entrarAlPanel);
enterApp = (function(orig){
  return function(){ orig(); revisarRecordatorioCliente(); pintarListas(); };
})(enterApp);
coachLogout = (function(orig){
  return function(){ orig.apply(this, arguments); pintarCampanas(); };
})(coachLogout);
cerrarSesionCliente = (function(orig){
  return function(){ orig.apply(this, arguments); pintarCampanas(); };
})(cerrarSesionCliente);

/* =========================================================
   AJUSTES → NOTIFICACIONES
   ========================================================= */
function htmlAjustesAvisos(rol){
  const dest = rol === 'cliente' ? (clienteActual ? claveCliente(clienteActual) : null) : (coachActivo ? clavePro(coachActivo.u) : null);
  if (!dest) return '';
  let h = '<div class="section-lbl">Notificaciones</div><div class="list-group">';
  tiposDe(dest).forEach(function(t){
    const on = avisoActivo(dest, t.id);
    h += '<div class="list-row aviso-row"><span class="aviso-l"><span>' + t.ico + ' ' + t.nombre + '</span><small>' + t.desc + '</small></span>'
      + '<div class="toggle' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" onclick="cambiarTipoAviso(this,\'' + dest.replace(/'/g, "\\'") + '\',\'' + t.id + '\')"><div class="toggle-knob"></div></div></div>';
  });
  const sis = sistemaActivo(dest);
  h += '<div class="list-row aviso-row"><span class="aviso-l"><span>📲 Avisos del móvil</span><small>' + esc(textoSistema()) + '</small></span>'
    + '<div class="toggle' + (sis ? ' on' : '') + '" role="switch" aria-checked="' + sis + '" onclick="cambiarSistema(this,\'' + dest.replace(/'/g, "\\'") + '\')"><div class="toggle-knob"></div></div></div>';
  h += '</div><p class="ajx-note">Por ahora los avisos llegan con lo que ocurre en este móvil. Entre móviles distintos se activarán más adelante.</p>';
  return h;
}
function cambiarTipoAviso(el, dest, tipo){
  const a = leerAvisos();
  const p = a.pref[dest] = a.pref[dest] || {};
  const on = !el.classList.contains('on');
  p[tipo] = on;
  guardarAvisos();
  el.classList.toggle('on', on);
  el.setAttribute('aria-checked', on);
}

/* ---------- avisos del sistema (barra de notificaciones del móvil) ---------- */
function soportaSistema(){ return 'Notification' in window && 'serviceWorker' in navigator; }
function sistemaActivo(dest){
  const p = leerAvisos().pref[dest];
  return !!(p && p.sistema && soportaSistema() && Notification.permission === 'granted');
}
function textoSistema(){
  if (!soportaSistema()) return (typeof esIOS !== 'undefined' && esIOS && !esInstalada())
    ? 'En iPhone, instala la app (iOS 16.4 o posterior) para recibirlos.'
    : 'Este navegador no permite avisos del móvil.';
  if (Notification.permission === 'denied') return 'Bloqueados. Actívalos en los ajustes del móvil para esta app.';
  return 'Mostrar también los avisos en la barra de notificaciones.';
}
function cambiarSistema(el, dest){
  const a = leerAvisos();
  const p = a.pref[dest] = a.pref[dest] || {};
  if (el.classList.contains('on')) {
    p.sistema = false; guardarAvisos(); el.classList.remove('on'); el.setAttribute('aria-checked', 'false');
    return;
  }
  if (!soportaSistema()) { toast(textoSistema()); return; }
  Notification.requestPermission().then(function(r){
    if (r === 'granted') {
      p.sistema = true; guardarAvisos(); el.classList.add('on'); el.setAttribute('aria-checked', 'true');
      toast('Avisos del móvil activados');
    } else {
      toast('Sin permiso: actívalo en los ajustes del móvil para esta app.');
      refrescarAjustes();
    }
  });
}
function avisoDelSistema(dest, tipo, titulo, texto){
  if (!sistemaActivo(dest)) return;
  const t = tiposDe(dest).filter(function(y){ return y.id === tipo; })[0];
  navigator.serviceWorker.ready.then(function(reg){
    reg.showNotification(titulo, {
      body: texto || '', tag: 'fsd-' + tipo, icon: 'icons/icon-192-v2.png', badge: 'icons/icon-192-v2.png',
      data: { url: location.href }
    });
  }).catch(function(){});
}

/* repintar al moverse por la app */
(function(){
  const g = goTo;
  goTo = function(n, s){ g(n, s); pintarCampanas(); };
  const sh = showScreen;
  showScreen = function(id){ sh(id); pintarCampanas(); };
})();
window.addEventListener('storage', function(e){ if (e.key === AVISOS_KEY) { avisosMem = null; pintarListas(); } });
pintarCampanas();
revisarRecordatorioCliente();

/* =========================================================
   «Mensajes sin leer» de cada profesional (panel y tarjetas)
   ========================================================= */
function sinLeerDe(pro){ const a = leerAvisos(); a.sinLeer = a.sinLeer || {}; return a.sinLeer[pro] = a.sinLeer[pro] || {}; }
function sumarSinLeer(k){
  COACHES.forEach(function(c){ const s = sinLeerDe(clavePro(c.u)); s[k] = (s[k] || 0) + 1; });
  guardarAvisos();
}
sendMsg = (function(orig){
  return function(){
    const t = (document.getElementById('chatInput').value || '').trim();
    const k = clienteActual, coach = isCoachView();
    orig();
    if (t && k && !coach) sumarSinLeer(k);
  };
})(sendMsg);
meterEnChat = (function(orig){
  return function(b){ orig(b); if (clienteActual && !isCoachView()) sumarSinLeer(clienteActual); };
})(meterEnChat);
verConversacion = (function(orig){
  return function(){
    orig();
    if (!coachActivo || !clienteActual) return;
    const pro = clavePro(coachActivo.u);
    sinLeerDe(pro)[clienteActual] = 0;
    ((leerAvisos().lista[pro]) || []).forEach(function(x){
      if (x.tipo === 'mensajes' && x.ir && x.ir.cliente === clienteActual) x.leida = true;
    });
    guardarAvisos();
    pintarCampanas();
  };
})(verConversacion);
function totalSinLeer(){
  if (!coachActivo) return 0;
  const s = sinLeerDe(clavePro(coachActivo.u));
  return Object.keys(s).filter(function(k){ return clientesData[k]; }).reduce(function(t, k){ return t + (s[k] || 0); }, 0);
}
actualizarPanel = (function(orig){
  return function(){
    orig();
    setTxt('statMsg', totalSinLeer());
    if (!coachActivo) return;
    const s = sinLeerDe(clavePro(coachActivo.u));
    const claves = Object.keys(clientesData);
    Array.prototype.forEach.call(document.querySelectorAll('#listaClientes .cliente-card'), function(card, i){
      const n = s[claves[i]] || 0;
      const pie = card.querySelector('.kc-pie span:last-child');
      if (pie && n && !card.querySelector('.kc-msgs')) pie.innerHTML = '💬 ' + esc(pie.textContent.replace('💬', '').trim()) + ' · <b class="kc-nuevos">' + n + ' sin leer</b>';
    });
  };
})(actualizarPanel);
actualizarPanel();
