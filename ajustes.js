/* =========================================================
   Fitness sin Dramas — Ajustes, privacidad y cookies
   Se carga después de app.js y usa sus variables globales
   (clientesData, PLANES, SEGUIMIENTOS, notisCoach, clienteActual,
   coachActivo, guardarTodo, cerrarSesionCliente, coachLogout…).
   ========================================================= */

const APP_VERSION = '0.66.3';
const POLICY_V = '2026-10-19-2';          // cambia al modificar las políticas: se vuelve a pedir el consentimiento
const CONSENT_KEY = 'fsd_consentimiento';
const TEMA_KEY = 'fsd_tema';
const CONSENT_MESES = 24;               // renovación recomendada por la AEPD

/* ---------- utilidades ---------- */
function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function p2(n){ return (n < 10 ? '0' : '') + n; }
function fechaCorta(iso){
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear();
}
function hoyISO(){
  const d = new Date();
  return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate());
}
function toast(msg){
  const t = document.getElementById('fsdToast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(function(){ t.classList.remove('show'); }, 2800);
}

/* ---------- bloqueo de guardado durante restauraciones/borrados ---------- */
let fsdBloqueoGuardado = false;
(function(){
  const orig = guardarTodo;
  guardarTodo = function(){ if (fsdBloqueoGuardado) return; orig(); };
})();

/* ---------- diálogo propio (sin confirm/alert del navegador) ---------- */
let dlgAccion = null;
function abrirDialogo(o){
  document.getElementById('dlgTitulo').textContent = o.titulo || '';
  document.getElementById('dlgTexto').textContent = o.texto || '';
  const ok = document.getElementById('dlgOk');
  ok.textContent = o.ok || 'Aceptar';
  ok.classList.toggle('danger', !!o.peligro);
  const cancel = document.getElementById('dlgCancel');
  cancel.textContent = o.cancel || 'Cancelar';
  cancel.hidden = !!o.soloOk;
  dlgAccion = o.onOk || null;
  document.getElementById('dlgOverlay').classList.add('show');
}
function cerrarDialogo(acepta){
  document.getElementById('dlgOverlay').classList.remove('show');
  const f = dlgAccion; dlgAccion = null;
  if (acepta && f) f();
}

/* =========================================================
   APARIENCIA
   ========================================================= */
let temaPref = 'claro';
const mqOscuro = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function aplicarTema(p){
  temaPref = p;
  const oscuro = p === 'oscuro' || (p === 'auto' && mqOscuro && mqOscuro.matches);
  document.getElementById('screenRoot').classList.toggle('light', !oscuro);
  const bg = oscuro ? '#0E1013' : '#FFFFFF';
  document.body.style.background = bg;
  document.documentElement.style.background = bg;
  const m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', bg);
  Array.prototype.forEach.call(document.querySelectorAll('.seg-tema button'), function(b){
    b.classList.toggle('on', b.getAttribute('data-tema') === p);
  });
}
function elegirTema(p){
  aplicarTema(p);
  if (prefPermitidas()) { try { localStorage.setItem(TEMA_KEY, p); } catch(e){} }
}
function cargarTema(){
  let p = 'claro';
  if (prefPermitidas()) { try { p = localStorage.getItem(TEMA_KEY) || 'claro'; } catch(e){} }
  aplicarTema(p);
}
if (mqOscuro) {
  const alCambiar = function(){ if (temaPref === 'auto') aplicarTema('auto'); };
  if (mqOscuro.addEventListener) mqOscuro.addEventListener('change', alCambiar);
  else if (mqOscuro.addListener) mqOscuro.addListener(alCambiar);
}

/* =========================================================
   COOKIES Y ALMACENAMIENTO (LSSI art. 22.2 + Guía AEPD)
   ========================================================= */
let consentMem = null;
function leerConsent(){
  try { return JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null'); } catch(e){ return null; }
}
function consentVigente(c){
  if (!c || c.v !== POLICY_V || !c.fecha) return false;
  const limite = new Date(c.fecha);
  limite.setMonth(limite.getMonth() + CONSENT_MESES);
  return Date.now() < limite.getTime();
}
function consentActual(){ return consentMem || leerConsent(); }
function prefPermitidas(){
  const c = consentActual();
  return !!(c && consentVigente(c) && c.pref);
}
function guardarConsent(pref){
  consentMem = { v: POLICY_V, fecha: new Date().toISOString(), pref: !!pref };
  try { localStorage.setItem(CONSENT_KEY, JSON.stringify(consentMem)); } catch(e){}
  if (pref) { try { localStorage.setItem(TEMA_KEY, temaPref); } catch(e){} }
  else      { try { localStorage.removeItem(TEMA_KEY); } catch(e){} }
  document.getElementById('cookieBanner').classList.remove('show');
  document.getElementById('cookieConfig').classList.remove('show');
  refrescarAjustes();
}
function cookiesAceptar(){ guardarConsent(true); toast('Has aceptado todas las cookies'); }
function cookiesRechazar(){ guardarConsent(false); toast('Solo usaremos el almacenamiento técnico'); }
function cookiesConfigurar(){
  document.getElementById('ckPref').checked = prefPermitidas();
  document.getElementById('cookieBanner').classList.remove('show');
  document.getElementById('cookieConfig').classList.add('show');
}
function cookiesGuardarSeleccion(){
  guardarConsent(document.getElementById('ckPref').checked);
  toast('Selección guardada');
}
function cookiesCerrarConfig(){
  document.getElementById('cookieConfig').classList.remove('show');
  if (!consentVigente(consentActual())) document.getElementById('cookieBanner').classList.add('show');
}
function revisarBannerCookies(){
  consentMem = leerConsent();
  if (!consentVigente(consentMem)) {
    consentMem = null;
    document.getElementById('cookieBanner').classList.add('show');
  }
}

/* =========================================================
   CONSENTIMIENTO EXPLÍCITO DE DATOS DE SALUD (RGPD art. 9.2.a)
   ========================================================= */
function comprobarConsentSalud(){
  if (!clienteActual || isCoachView()) return;
  const d = clientesData[clienteActual];
  if (!d || (d.consentSalud && d.consentSalud.fecha)) return;
  document.getElementById('csChk').checked = false;
  document.getElementById('csOk').disabled = true;
  document.getElementById('consentSalud').classList.add('show');
}
function csCambio(){
  document.getElementById('csOk').disabled = !document.getElementById('csChk').checked;
}
function csAceptar(){
  const d = clientesData[clienteActual];
  if (!d) return;
  d.consentSalud = { fecha: new Date().toISOString(), v: POLICY_V };
  guardarTodo();
  document.getElementById('consentSalud').classList.remove('show');
  toast('Consentimiento registrado');
}
function csRechazar(){
  document.getElementById('consentSalud').classList.remove('show');
  cerrarSesionCliente();
  document.getElementById('loginError').textContent =
    'Sin tu consentimiento para tratar datos de salud no podemos prestarte la asesoría. Puedes darlo cuando vuelvas a entrar.';
}
function retirarConsentSalud(){
  abrirDialogo({
    titulo: 'Retirar consentimiento',
    texto: 'Dejaremos de tratar tus datos de salud y se cerrará tu sesión. Sin este consentimiento no podemos seguir con tu asesoría personalizada. Retirarlo no afecta a lo tratado antes.',
    ok: 'Retirar', peligro: true,
    onOk: function(){
      const d = clientesData[clienteActual];
      if (d) d.consentSalud = null;
      guardarTodo();
      cerrarSesionCliente();
      document.getElementById('loginError').textContent = 'Has retirado tu consentimiento y se ha cerrado tu sesión.';
    }
  });
}

/* =========================================================
   COPIAS DE SEGURIDAD
   ========================================================= */
function entregarArchivo(nombre, obj){
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  let file = null;
  try { file = new File([blob], nombre, { type: 'application/json' }); } catch(e){}
  const tactil = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (file && tactil && navigator.canShare && navigator.share) {
    let puede = false;
    try { puede = navigator.canShare({ files: [file] }); } catch(e){}
    if (puede) {
      navigator.share({ files: [file], title: nombre })
        .then(function(){ toast('Copia lista'); })
        .catch(function(err){ if (err && err.name === 'AbortError') return; descargaDirecta(blob, nombre); });
      return;
    }
  }
  descargaDirecta(blob, nombre);
}
function descargaDirecta(blob, nombre){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre; a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 2000);
  toast('Copia descargada');
}
function descargarCopiaCompleta(){
  guardarTodo();
  entregarArchivo('fitness-sin-dramas-copia-' + hoyISO() + '.json', {
    app: 'fitness-sin-dramas', tipo: 'completa', version: APP_VERSION, creada: new Date().toISOString(),
    datos: { v: 1, clientes: clientesData, seg: SEGUIMIENTOS, planes: PLANES, notis: notisCoach, sesion: null,
             avisos: (function(){ try { return JSON.parse(localStorage.getItem('fsd_avisos') || 'null'); } catch(e){ return null; } })(),
             fotos: (typeof leerFotosCoach === 'function' ? leerFotosCoach() : {}) }
  });
}
function descargarMisDatos(){
  if (!clienteActual) return;
  guardarTodo();
  const k = clienteActual;
  entregarArchivo('fitness-sin-dramas-mis-datos-' + hoyISO() + '.json', {
    app: 'fitness-sin-dramas', tipo: 'cliente', version: APP_VERSION, creada: new Date().toISOString(),
    datos: { cliente: clientesData[k], plan: PLANES[k] || null, seguimientos: SEGUIMIENTOS[k] || [] }
  });
}
function elegirCopia(){
  const i = document.getElementById('restoreInput');
  i.value = '';
  i.click();
}
function restaurarCopia(inp){
  const f = inp.files && inp.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = function(){
    let o = null;
    try { o = JSON.parse(r.result); } catch(e){}
    if (!o || o.app !== 'fitness-sin-dramas' || o.tipo !== 'completa' || !o.datos || typeof o.datos.clientes !== 'object') {
      toast('Ese archivo no es una copia completa de Fitness sin Dramas');
      return;
    }
    const n = Object.keys(o.datos.clientes).length;
    abrirDialogo({
      titulo: 'Restaurar copia',
      texto: 'La copia del ' + fechaCorta(o.creada) + ' tiene ' + n + ' cliente' + (n === 1 ? '' : 's') +
             '. Sustituirá todos los datos guardados en este dispositivo.',
      ok: 'Restaurar', peligro: true,
      onOk: function(){
        fsdBloqueoGuardado = true;
        try {
          o.datos.sesion = null;
          if (o.datos.fotos) localStorage.setItem('fsd_fotos', JSON.stringify(o.datos.fotos));
          if (o.datos.avisos) localStorage.setItem('fsd_avisos', JSON.stringify(o.datos.avisos));
          delete o.datos.fotos; delete o.datos.avisos;
          try { sessionStorage.setItem('fsd_restaurada', String(n)); } catch(e){}
          localStorage.setItem(DB_KEY, JSON.stringify(o.datos));
        } catch(e){
          fsdBloqueoGuardado = false;
          toast('No se ha podido guardar la copia en este dispositivo');
          return;
        }
        location.reload();
      }
    });
  };
  r.onerror = function(){ toast('No se ha podido leer el archivo'); };
  r.readAsText(f);
}
function borrarDatosDispositivo(){
  abrirDialogo({
    titulo: 'Borrar datos de este dispositivo',
    texto: 'Se eliminarán los clientes, planes, seguimientos y mensajes guardados aquí. Descarga antes una copia si quieres conservarlos.',
    ok: 'Borrar', peligro: true,
    onOk: function(){
      fsdBloqueoGuardado = true;
      try { localStorage.removeItem(DB_KEY); } catch(e){}
      location.reload();
    }
  });
}
/* el botón antiguo de app.js usaba confirm(); lo sustituimos por el diálogo propio */
borrarDatos = borrarDatosDispositivo;

/* =========================================================
   CUENTA
   ========================================================= */
function mostrarCodigo(btn){
  const el = document.getElementById('ajxCodigo');
  const d = clientesData[clienteActual];
  if (!el || !d) return;
  const visible = el.getAttribute('data-visible') === '1';
  el.textContent = visible ? '••••-••••' : (d.codigo || '—');
  el.setAttribute('data-visible', visible ? '0' : '1');
  btn.textContent = visible ? 'Mostrar' : 'Ocultar';
}
function copiarTexto(txt){
  function respaldo(){
    const ta = document.createElement('textarea');
    ta.value = txt; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch(e){}
    ta.remove();
    toast(ok ? 'Copiado' : 'No se ha podido copiar');
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(function(){ toast('Copiado'); }).catch(respaldo);
  } else respaldo();
}
function copiarCodigo(){
  const d = clientesData[clienteActual];
  if (d && d.codigo) copiarTexto(d.codigo);
}
function editarContacto(){
  const f = document.getElementById('ajxContacto');
  if (f) f.hidden = !f.hidden;
}
function guardarContacto(){
  const d = clientesData[clienteActual];
  if (!d) return;
  const mail = document.getElementById('ajxMail').value.trim();
  const tel = document.getElementById('ajxTel').value.trim();
  if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { toast('Revisa el correo: falta algo (ej. nombre@correo.com)'); return; }
  d.email = mail; d.telefono = tel;
  guardarTodo();
  renderAjustes('cliente');
  toast('Datos de contacto guardados');
}
function infoContrasena(){
  abrirDialogo({
    titulo: 'Cambiar contraseña',
    texto: 'En esta versión de prueba la contraseña es fija. Podrás cambiarla cuando la app tenga servidor y cuentas reales.',
    ok: 'Entendido', soloOk: true
  });
}
function desvincularDesdeAjustes(){
  desvincularDispositivo();
  renderAjustes('coach');
  toast('Este dispositivo pedirá el código la próxima vez');
}

/* =========================================================
   DISPOSITIVOS Y APPS DE SALUD
   ========================================================= */
const DISPOSITIVOS = [
  { id: 'garmin', nombre: 'Garmin Connect', estado: 'Requiere servidor',
    texto: 'Pasos, actividades, frecuencia cardiaca, sueño y estrés. Garmin solo comparte datos con apps aprobadas en su programa para desarrolladores y a través de un servidor. Se activará cuando la app tenga servidor.' },
  { id: 'apple', nombre: 'Apple Salud', estado: 'Requiere app iOS',
    texto: 'Pasos, entrenamientos, frecuencia cardiaca, sueño y peso. Apple solo permite leer Salud desde apps nativas de iPhone: una app web no tiene acceso. Se activará con la versión para App Store.' },
  { id: 'samsung', nombre: 'Samsung Health', estado: 'Requiere app Android',
    texto: 'Pasos, ejercicio, sueño y composición corporal. Samsung Health comparte sus datos con apps nativas de Android, normalmente a través de Health Connect. Desde la web no es posible.' },
  { id: 'hc', nombre: 'Health Connect (Android)', estado: 'Requiere app Android',
    texto: 'Reúne en Android los datos de Samsung Health, Google Fit, Garmin y otras apps. Solo pueden leerlo las apps nativas que el usuario autorice.' }
];
function toggleDisp(el){ el.parentNode.classList.toggle('open'); }

/* =========================================================
   PANTALLA DE AJUSTES (cliente y coach)
   ========================================================= */
function fila(txt, der, onclick, cls){
  return '<div class="list-row' + (cls ? ' ' + cls : '') + '"' + (onclick ? ' onclick="' + onclick + '"' : ' style="cursor:default"') + '>'
    + '<span>' + txt + '</span>' + (der || '') + '</div>';
}
function chev(){ return '<span class="chev">›</span>'; }
function val(v){ return '<span class="ajx-val">' + esc(v || '—') + '</span>'; }
function pill(t, ok){ return '<span class="pill' + (ok ? ' ok' : '') + '">' + esc(t) + '</span>'; }

function htmlAjustes(rol){
  let h = '';
  const cliente = rol === 'cliente';
  const d = cliente && clienteActual ? clientesData[clienteActual] : null;

  /* --- Cuenta --- */
  h += '<div class="section-lbl">Cuenta</div><div class="list-group">';
  if (typeof filaFoto === 'function') h += filaFoto(rol);
  if (cliente) {
    h += fila('Nombre', val(d && d.nombre));
    h += fila('Correo', val(d && d.email));
    h += fila('Teléfono', val(d && d.telefono));
    h += fila('Objetivo', val(d && d.objetivo));
    h += fila('Fecha de alta', val(d && d.fechaAlta ? fechaCorta(d.fechaAlta) : '—'));
    h += '<div class="list-row" style="cursor:default"><span>Código de acceso</span><span class="ajx-acts">'
      + '<span class="ajx-val mono" id="ajxCodigo" data-visible="0">••••-••••</span>'
      + '<button class="mini-btn" onclick="mostrarCodigo(this)">Mostrar</button>'
      + '<button class="mini-btn" onclick="copiarCodigo()">Copiar</button></span></div>';
    h += fila('Editar datos de contacto', chev(), 'editarContacto()');
    h += '<div class="ajx-form" id="ajxContacto" hidden>'
      + '<div class="field"><label for="ajxMail">Correo</label><input id="ajxMail" type="email" inputmode="email" autocomplete="email" value="' + esc(d && d.email) + '"></div>'
      + '<div class="field"><label for="ajxTel">Teléfono</label><input id="ajxTel" type="tel" inputmode="tel" autocomplete="tel" value="' + esc(d && d.telefono) + '"></div>'
      + '<button class="btn-primary" onclick="guardarContacto()">Guardar</button></div>';
  } else {
    const c = coachActivo;
    h += fila('Usuario', val(c && c.u));
    h += fila('Rol', val(c && (c.rol === 'dietista' ? 'Dietista' : 'Entrenador')));
    h += fila('Correo de contacto', val(TITULAR.correo));
    h += fila('Cambiar contraseña', chev(), 'infoContrasena()');
  }
  h += '</div>';

  /* --- Apariencia --- */
  h += '<div class="section-lbl">Apariencia</div><div class="list-group"><div class="ajx-block">'
    + '<div class="seg seg-tema" role="radiogroup" aria-label="Apariencia">'
    + ['claro', 'oscuro', 'auto'].map(function(t){
        const lbl = t === 'claro' ? 'Claro' : (t === 'oscuro' ? 'Oscuro' : 'Automático');
        return '<button type="button" data-tema="' + t + '" class="' + (temaPref === t ? 'on' : '') + '" onclick="elegirTema(\'' + t + '\')">' + lbl + '</button>';
      }).join('')
    + '</div><div class="ajx-hint">Automático sigue el modo claro u oscuro de tu teléfono.'
    + (prefPermitidas() ? '' : ' Como no has aceptado las cookies de preferencias, la elección solo dura hasta que cierres la app.')
    + '</div></div></div>';

  /* --- Notificaciones (cliente y profesional) --- */
  if (typeof htmlAjustesAvisos === 'function') h += htmlAjustesAvisos(rol);

  /* --- Dispositivos (solo clientes) --- */
  if (cliente) {
  h += '<div class="section-lbl">Dispositivos y apps de salud</div>';
  h += '<p class="ajx-note">' + (cliente
      ? 'Conecta tu reloj o app de salud para que tu equipo vea tus pasos, actividad, sueño y frecuencia cardiaca sin apuntarlos a mano. Solo se leerán los datos que tú autorices.'
      : 'Cuando tus clientes conecten su reloj o app de salud, verás sus pasos, actividad, sueño y frecuencia cardiaca en su ficha. Solo se leerán los datos que cada cliente autorice.')
    + ' En esta versión de prueba las conexiones aún no están activas.</p>';
  h += '<div class="list-group">';
  DISPOSITIVOS.forEach(function(x){
    h += '<div class="ajx-item"><div class="list-row" onclick="toggleDisp(this)"><span>' + esc(x.nombre) + '</span>' + pill(x.estado) + '</div>'
      + '<div class="ajx-detail">' + esc(x.texto) + '</div></div>';
  });
  h += '</div>';
  }

  /* --- Copias de seguridad --- */
  h += '<div class="section-lbl">Copias de seguridad</div><div class="list-group">';
  if (cliente) {
    h += fila('Descargar mis datos', chev(), 'descargarMisDatos()');
  } else {
    h += fila('Descargar copia completa', chev(), 'descargarCopiaCompleta()');
    h += fila('Restaurar una copia', chev(), 'elegirCopia()');
    h += fila('Borrar datos de este dispositivo', '', 'borrarDatosDispositivo()', 'danger');
  }
  h += '</div><p class="ajx-note">' + (cliente
      ? 'Descarga un archivo con tu perfil, plan, seguimientos y mensajes. Es tu derecho de portabilidad.'
      : 'La copia incluye todos los clientes, planes, seguimientos y mensajes de este dispositivo. Contiene datos de salud: guárdala en un lugar seguro.')
    + '</p>';

  /* --- Privacidad --- */
  const c = consentActual();
  const ckTxt = consentVigente(c) ? (c.pref ? 'Aceptadas' : 'Solo técnicas') : 'Pendiente';
  h += '<div class="section-lbl">Privacidad</div><div class="list-group">';
  h += fila('Política de privacidad', chev(), "abrirLegal('privacidad')");
  h += fila('Política de cookies', chev(), "abrirLegal('cookies')");
  h += fila('Configurar cookies', pill(ckTxt, consentVigente(c) && c.pref), 'cookiesConfigurar()');
  if (cliente && d) {
    if (d.consentSalud && d.consentSalud.fecha) {
      h += fila('Consentimiento de datos de salud', pill('Dado el ' + fechaCorta(d.consentSalud.fecha), true));
      h += fila('Retirar consentimiento de salud', '', 'retirarConsentSalud()', 'danger');
      h += '<div class="list-row"><span>Boletín, novedades y ofertas</span><div class="toggle' + (d.consentComercial ? ' on' : '') + '" onclick="toggleComercial(this)" role="switch" aria-checked="' + (d.consentComercial ? 'true' : 'false') + '"><div class="toggle-knob"></div></div></div>';
    } else {
      h += fila('Consentimiento de datos de salud', pill('Pendiente'), 'comprobarConsentSalud()');
    }
  }
  h += '</div>';

  /* --- Sesión --- */
  h += '<div class="list-group">' + fila('Cerrar sesión', '', cliente ? 'confirmarSalidaCliente()' : 'confirmarSalidaCoach()', 'danger') + '</div>';
  h += '<div class="ajx-foot">Fitness sin Dramas · versión ' + APP_VERSION + '</div>';
  return h;
}
function renderAjustes(rol){
  const cont = document.getElementById(rol === 'cliente' ? 'ajustesCliente' : 'ajustesCoach');
  if (cont) cont.innerHTML = htmlAjustes(rol);
}
function refrescarAjustes(){
  const coachScr = document.getElementById('view-coach-ajustes');
  if (coachScr && coachScr.style.display !== 'none') renderAjustes('coach');
  const cliView = document.getElementById('view-ajustes');
  if (cliView && cliView.classList.contains('active')) renderAjustes('cliente');
}
function abrirAjustesCoach(){
  renderAjustes('coach');
  showScreen('view-coach-ajustes');
  const b = document.querySelector('#view-coach-ajustes .alta-body');
  if (b) b.scrollTop = 0;
}

/* =========================================================
   TEXTOS LEGALES
   ========================================================= */
const PH = function(t){ return '<span class="ph">[' + t + ']</span>'; };
const TITULAR = {
  nombre: 'Domingo Artiles Bordón',
  nif: '45374373L',
  direccion: 'Calle Juan XXIII n.º 33, 3.º B, 35110 Santa Lucía de Tirajana (Las Palmas)',
  correo: 'fitnessindramas@gmail.com',
  marca: 'Fitnessindramas (Fitness sin Dramas)'
};
const LEGAL_PRIVACIDAD =
  '<p class="legal-meta">Última actualización: 21 de octubre de 2026</p>'
+ '<p class="legal-aviso">Versión de prueba: por ahora los datos se guardan solo en este dispositivo y no se envían a ningún servidor.</p>'
+ '<h4>1. Responsable del tratamiento</h4>'
+ '<p><b>' + TITULAR.nombre + '</b>, profesional autónomo, NIF ' + TITULAR.nif + ', con domicilio en ' + TITULAR.direccion + '. Nombre comercial: ' + TITULAR.marca + '. Contacto: <b>' + TITULAR.correo + '</b>.</p>'
+ '<p>El servicio lo prestan dos profesionales autónomos: Domingo, entrenador, y Fátima, dietista-nutricionista. Cada uno accede solo a los datos que necesita para su parte del asesoramiento.</p>'
+ '<h4>2. Qué datos tratamos</h4>'
+ '<ul><li><b>Identificación y contacto:</b> nombre, correo, teléfono, código de acceso y, si la añades, tu foto de perfil.</li>'
+ '<li><b>Datos de salud y físicos:</b> peso, altura, medidas, fotos de progreso, alimentación, alergias e intolerancias, entrenamiento, descanso, estrés, sensaciones y adherencia.</li>'
+ '<li><b>Tu imagen</b> (fotos y vídeos), solo para publicarla si nos das permiso para ello.</li>'
+ '<li><b>Mensajes</b> que intercambias con tu equipo en el chat, incluidas fotos y notas de voz.</li>'
+ '<li><b>Datos de dispositivos</b> (pasos, actividad, sueño, frecuencia cardiaca), solo si conectas uno y lo autorizas.</li>'
+ '<li><b>Compras de productos propios y merchandising:</b> nombre, dirección de envío, teléfono y datos del pedido.</li>'
+ '<li><b>Pago:</b> fecha, importe y tarifa de cada pago. Se paga por transferencia bancaria o, cuando esté disponible, con Stripe; no guardamos los datos de tu tarjeta.</li></ul>'
+ '<h4>3. Para qué los usamos</h4>'
+ '<ul><li>Prestarte el asesoramiento de entrenamiento y nutrición: planes, seguimiento y ajustes.</li>'
+ '<li>Comunicarnos contigo a través de la app.</li>'
+ '<li>Gestionar la contratación, el cobro, la facturación y, si compras productos, el envío.</li>'
+ '<li>Enviarte nuestro boletín, novedades y ofertas de productos propios, <b>solo si lo aceptas</b>.</li>'
+ '<li>Conocer cómo se usa la app con analítica, <b>solo si aceptas esas cookies</b>.</li>'
+ '<li>Publicar fotos o vídeos tuyos en nuestras redes sociales y web con fines de marketing y divulgación, <b>solo con lo que autorices</b> en el formulario de uso de imagen.</li>'
+ '<li>Proteger el acceso a las cuentas.</li></ul>'
+ '<p>No tomamos decisiones automatizadas con efectos jurídicos sobre ti.</p>'
+ '<h4>4. Base legal</h4>'
+ '<ul><li><b>Contrato</b> (art. 6.1.b RGPD): prestarte el servicio y gestionar tus compras.</li>'
+ '<li><b>Consentimiento explícito</b> (art. 9.2.a RGPD): tratar tus datos de salud. Sin él no podemos ofrecerte una asesoría personalizada.</li>'
+ '<li><b>Consentimiento</b> (art. 6.1.a RGPD y art. 21 LSSI): comunicaciones comerciales y analítica. Es voluntario y no condiciona el servicio.</li>'
+ '<li><b>Consentimiento expreso</b> (art. 6.1.a RGPD y Ley Orgánica 1/1982 de protección del derecho a la propia imagen): uso de tu imagen en redes sociales y web. Eliges qué autorizas (fotos sin la cara, fotos o vídeos en los que se te reconoce, tu nombre o testimonio), es voluntario, no condiciona el servicio y puedes revocarlo en cualquier momento.</li>'
+ '<li><b>Obligación legal</b> (art. 6.1.c RGPD): facturación y obligaciones fiscales.</li>'
+ '<li><b>Interés legítimo</b> (art. 6.1.f RGPD): seguridad de la app y prevención de accesos indebidos.</li></ul>'
+ '<p>Puedes retirar cualquier consentimiento en Ajustes → Privacidad o escribiendo a ' + TITULAR.correo + '.</p>'
+ '<h4>5. Cuánto tiempo los guardamos</h4>'
+ '<p>Mientras tu asesoría esté activa. <b>Si no pagas</b>: tras el periodo de gracia de 7 días pierdes el acceso y guardamos tus datos 15 días más; si sigues sin pagar, borramos tu perfil (plan, seguimientos, conversación y fotos). <b>Si te das de baja</b>, dejas de tener acceso y tu ficha se conserva sin acceso para poder reactivarla si vuelves; puedes pedirnos que la borremos cuando quieras. Al terminar, los conservamos bloqueados solo durante los plazos que exige la ley y después los suprimimos (art. 32 LOPDGDD). Entre otros: la documentación contable y las facturas durante 6 años (art. 30 del Código de Comercio) y la información fiscal durante 4 años (Ley General Tributaria). Los datos para comunicaciones comerciales, hasta que te des de baja. Las imágenes publicadas, hasta que retires tu permiso: entonces las quitamos de nuestras publicaciones (no podemos controlar copias que terceros hayan hecho antes).</p>'
+ '<h4>6. Con quién los compartimos</h4>'
+ '<p>No vendemos ni cedemos tus datos. Solo los comunicamos cuando lo exige la ley o a proveedores que trabajan por nuestra cuenta:</p>'
+ '<ul><li>GitHub, Inc.: alojamiento de la app.</li>'
+ '<li>Google LLC: tipografías (Google Fonts, que recibe tu dirección IP) y correo electrónico.</li>'
+ '<li>Stripe: gestión de pagos.</li>'
+ '<li>Empresas de mensajería: envío de productos, si compras.</li></ul>'
+ '<p>Algunos proveedores están en EE. UU. Esas transferencias se amparan en el Marco de Privacidad de Datos UE-EE. UU. o en cláusulas contractuales tipo (art. 46 RGPD).</p>'
+ '<h4>7. Clientes fuera de España</h4>'
+ '<p>Prestamos el servicio en todo el mundo. Sea cual sea tu país, tratamos tus datos conforme al Reglamento General de Protección de Datos y a la normativa española.</p>'
+ '<h4>8. Tus derechos</h4>'
+ '<p>Puedes pedir acceso, rectificación, supresión, oposición, limitación y portabilidad, y retirar tu consentimiento en cualquier momento. Escribe a <b>' + TITULAR.correo + '</b> indicando qué derecho ejerces; podremos pedirte que acredites tu identidad. Respondemos en el plazo de un mes.</p>'
+ '<p>Puedes descargar tus datos desde Ajustes → Copias de seguridad. Si crees que no hemos atendido bien tu solicitud, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es, C/ Jorge Juan 6, 28001 Madrid).</p>'
+ '<h4>9. Solo personas adultas</h4>'
+ '<p>El servicio es exclusivamente para mayores de 18 años. Si detectamos datos de un menor, los eliminaremos.</p>'
+ '<h4>10. Seguridad</h4>'
+ '<p>Cada cliente entra con un código personal y los profesionales con contraseña. Aplicamos medidas técnicas y organizativas adecuadas al riesgo (art. 32 RGPD), teniendo en cuenta que tratamos datos de salud.</p>'
+ '<h4>11. Cambios</h4>'
+ '<p>Si cambiamos esta política te avisaremos en la app y, cuando haga falta, te pediremos de nuevo el consentimiento.</p>';

const LEGAL_COOKIES =
  '<p class="legal-meta">Última actualización: 19 de octubre de 2026 · Responsable: ' + TITULAR.nombre + ' (' + TITULAR.marca + '), ' + TITULAR.correo + '</p>'
+ '<p>Las cookies y tecnologías similares guardan información en tu dispositivo. Ahora mismo esta app solo usa almacenamiento técnico y, si lo aceptas, de preferencias. No usa cookies de publicidad ni de analítica.</p>'
+ '<h4>Qué guardamos</h4>'
+ '<div class="legal-tabla"><table><thead><tr><th>Nombre</th><th>Tipo</th><th>Para qué</th><th>Duración</th></tr></thead><tbody>'
+ '<tr><td>fsd_datos_v1</td><td>Técnica</td><td>Guardar tus planes, seguimientos y mensajes en el dispositivo</td><td>Hasta que borres los datos</td></tr>'
+ '<tr><td>fsd_fotos</td><td>Técnica</td><td>Guardar la foto de perfil de los profesionales</td><td>Hasta que la quites</td></tr>'
+ '<tr><td>fsd_dispositivos_confianza</td><td>Técnica</td><td>Recordar dispositivos de confianza de los profesionales</td><td>30 días</td></tr>'
+ '<tr><td>fsd_avisos</td><td>Técnica</td><td>Guardar tus notificaciones y qué tipos quieres recibir</td><td>Hasta que borres los datos</td></tr>'
+ '<tr><td>fsd_sonidos</td><td>Preferencia</td><td>Recordar si quieres los sonidos de avisos y mensajes</td><td>Hasta que borres los datos</td></tr>'
+ '<tr><td>fsd_consentimiento</td><td>Técnica</td><td>Recordar tu elección sobre cookies</td><td>24 meses</td></tr>'
+ '<tr><td>Caché fsd-' + APP_VERSION + '</td><td>Técnica</td><td>Que la app abra sin conexión</td><td>Hasta la siguiente versión</td></tr>'
+ '<tr><td>fsd_tema</td><td>Preferencias</td><td>Recordar el modo claro, oscuro o automático</td><td>Hasta que lo cambies o retires el permiso</td></tr>'
+ '</tbody></table></div>'
+ '<p>Todas son propias. Las técnicas son necesarias para que la app funcione y no requieren consentimiento (art. 22.2 LSSI). Las de preferencias solo se guardan si las aceptas.</p>'
+ '<h4>Analítica en el futuro</h4>'
+ '<p>Tenemos previsto medir el uso de la app para mejorarla. Cuando lo activemos, actualizaremos esta tabla con cada cookie, su proveedor y su duración, y te pediremos permiso antes de usarlas. Sin tu permiso no se instalará ninguna.</p>'
+ '<h4>Terceros</h4>'
+ '<p>Las tipografías se cargan desde Google Fonts. No instalan cookies, pero Google recibe tu dirección IP.</p>'
+ '<h4>Cómo cambiar tu elección</h4>'
+ '<p>En Ajustes → Privacidad → Configurar cookies, en cualquier momento. También puedes borrar los datos del sitio desde tu navegador. Te volveremos a preguntar cada 24 meses o si cambia esta política.</p>';

function abrirLegal(tipo){
  const cookies = tipo === 'cookies';
  document.getElementById('legalTitulo').textContent = cookies ? 'Política de cookies' : 'Política de privacidad';
  document.getElementById('legalCuerpo').innerHTML = cookies ? LEGAL_COOKIES : LEGAL_PRIVACIDAD;
  const ov = document.getElementById('legalOverlay');
  ov.classList.add('show');
  const s = ov.querySelector('.fsd-sheet');
  if (s) s.scrollTop = 0;
}
function cerrarLegal(){ document.getElementById('legalOverlay').classList.remove('show'); }

/* =========================================================
   ENGANCHES CON app.js
   ========================================================= */
tabs.push('ajustes');
topScreens.push('view-coach-ajustes');
(function(){
  const origGoTo = goTo;
  goTo = function(name, sinHist){
    if (name === 'ajustes') renderAjustes('cliente');
    origGoTo(name, sinHist);
  };
  const origEnter = enterApp;
  enterApp = function(){
    origEnter();
    if (clienteActual && document.getElementById('app').style.display === 'flex') comprobarConsentSalud();
  };
})();

/* ---------- arranque ---------- */
cargarTema();
revisarBannerCookies();
if (clienteActual && document.getElementById('app').style.display === 'flex') comprobarConsentSalud();
