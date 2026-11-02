/* =========================================================
   Fitnessindramas — Modo servidor (2/11/2026)
   Conecta la app con Supabase. De momento solo con el servidor de pruebas.
   Se activa abriendo la app con  ?servidor=pruebas  y se apaga con  ?servidor=no
   (lo decide servidor-inicio.js al abrir). Sin activarlo, la app funciona exactamente igual que antes.

   En modo servidor:
   · Domingo y Fátima entran con el correo y la contraseña de su cuenta de Supabase
   · el papel (entrenador o dietista) lo dice el servidor, no el botón que se pulse
   · al cerrar sesión (también el cierre automático por inactividad) se cierra en el servidor
   · cada vez que se abre la app, los profesionales tienen que volver a entrar
   Paso 2 (clientes desde el servidor):
   · el alta la hace el servidor: crea la ficha, calcula el acceso pagado y da el código
   · el código se enseña solo en esta sesión; no se guarda en el dispositivo
   · la lista de clientes sale del servidor y se actualiza sola si el otro profesional cambia algo
   · editar los datos de un cliente se guarda en el servidor
   · el cliente entra la primera vez con su código y crea su cuenta (correo y contraseña);
     después entra con «Ya tengo cuenta»
   · planes: los sincroniza servidor-planes.js (paso 3)
   · seguimientos, chat, pagos y bajas siguen en el dispositivo: llegan en los siguientes pasos
   ========================================================= */

function svEntorno(){ return window.FSD_MODO_SERVIDOR || null; }
function svActivo(){ return !!svEntorno(); }

if (window.FSD_MODO_CAMBIO) {
  window.addEventListener('load', function(){ setTimeout(function(){
    try { toast(svActivo() ? 'Modo servidor de pruebas activado en este dispositivo' : 'Modo servidor desactivado'); } catch(e){}
  }, 600); });
}

/* ---------- carga del módulo de Supabase (solo en modo servidor) ---------- */
let svListo = null;
function svCargar(){
  if (!svActivo()) return Promise.reject(new Error('modo servidor apagado'));
  if (svListo) return svListo;
  svListo = new Promise(function(ok, mal){
    if (window.fsdDatos) { ok(window.fsdDatos); return; }
    window.addEventListener('fsd:servidor-listo', function(){ ok(window.fsdDatos); }, { once: true });
    import('./backend.js').catch(function(e){ svListo = null; mal(e); });
  });
  return svListo;
}
function svMensaje(e, otro){
  return (window.fsdDatos && fsdDatos.esErrorAcceso(e)) ? e.message
    : (otro || 'No se ha podido conectar con el servidor. Comprueba internet y vuelve a probar.');
}

/* ---------- marca visible: así nunca hay duda de en qué modo se está ---------- */
function svMarca(){
  let m = document.getElementById('svMarca');
  if (!svActivo()) { if (m) m.remove(); return; }
  if (!m) {
    m = document.createElement('div');
    m.id = 'svMarca'; m.className = 'sv-marca'; m.setAttribute('role', 'status');
    m.textContent = 'Servidor de pruebas';
    document.body.appendChild(m);
  }
  document.documentElement.classList.add('fsd-servidor');
}

/* =========================================================
   ACCESO DE PROFESIONALES
   ========================================================= */
let svPermitirEntrada = false;   // solo se entra al panel tras una comprobación real en el servidor

function svDialogo(){
  document.getElementById('proPassTit').textContent = 'Entrar · Servidor de pruebas';
  let fila = document.getElementById('svEmailFila');
  if (!fila) {
    const pass = document.getElementById('proPassInput').closest('.field');
    fila = document.createElement('div');
    fila.className = 'field'; fila.id = 'svEmailFila';
    fila.innerHTML = '<label for="svEmail">Correo</label>'
      + '<input type="email" id="svEmail" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="email">';
    pass.parentNode.insertBefore(fila, pass);
  }
}

pedirPassPro = (function(orig){
  return function(usuario){
    if (!svActivo()) return orig.apply(this, arguments);
    // Se abre el diálogo directamente, sin pasar por las versiones anteriores (contraseñas antiguas)
    proPendiente = usuario;
    document.getElementById('proPassInput').value = '';
    document.getElementById('proPassErr').textContent = '';
    svDialogo();
    document.getElementById('proPass').classList.add('show');
    const e = document.getElementById('svEmail');
    if (e) setTimeout(function(){ try { e.focus(); } catch(_){} }, 80);
    svCargar().catch(function(){});           // va cargando la conexión mientras escribe
  };
})(pedirPassPro);

confirmarPassPro = (function(orig){
  return function(){
    if (!svActivo()) return orig.apply(this, arguments);
    const err = document.getElementById('proPassErr');
    const email = (document.getElementById('svEmail') || {}).value || '';
    const pass = document.getElementById('proPassInput').value;
    const btn = document.querySelector('#proPass button[type="submit"]');
    if (!email.trim() || !pass) { err.textContent = 'Escribe tu correo y tu contraseña.'; return; }
    err.textContent = '';
    if (btn) { btn.disabled = true; btn.textContent = 'Entrando…'; }
    svCargar()
      .then(function(d){ return d.auth.entrar(email, pass); })
      .then(function(p){
        const c = COACHES.filter(function(x){ return x.rol === p.rol; })[0];
        if (!c) throw new Error('Papel desconocido');
        document.getElementById('proPassInput').value = '';
        cerrarPassPro();
        svPermitirEntrada = true;
        try { entrarComo(c.u); } finally { svPermitirEntrada = false; }
        try { toast('Has entrado como ' + p.nombre + ' (servidor de pruebas)'); } catch(e){}
        svEmpezarSincro();
      })
      .catch(function(e){
        err.textContent = svMensaje(e);
        const i = document.getElementById('proPassInput'); try { i.select(); } catch(_){}
      })
      .finally(function(){ if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; } });
  };
})(confirmarPassPro);

/* Nadie entra al panel en modo servidor sin haber pasado por el servidor */
entrarComo = (function(orig){
  return function(){
    if (svActivo() && !svPermitirEntrada) { try { toast('En modo servidor hay que entrar con correo y contraseña'); } catch(e){} return; }
    return orig.apply(this, arguments);
  };
})(entrarComo);

/* Cerrar sesión (a mano o por inactividad) también la cierra en el servidor */
coachLogout = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    if (svActivo()) { svPararSincro(); window.dispatchEvent(new Event('fsd:sesion-fuera')); if (window.fsdDatos) fsdDatos.auth.salir(); }
    return r;
  };
})(coachLogout);

/* =========================================================
   FICHAS DE CLIENTES: del servidor a la app
   ========================================================= */
const svCodigos = {};          // códigos recién creados: solo en memoria, nunca en el dispositivo
let svDejarDeEscuchar = null;

function svClaveDe(id){
  const k = Object.keys(clientesData).filter(function(x){ return clientesData[x] && clientesData[x].sid === id; })[0];
  return k || null;
}
function svFichaNueva(){
  return { nombre: '', semana: '1 de 12', objetivo: 'Sin objetivo', adhE: null, adhN: null,
    tonelaje: '—', tonelajeDelta: 'Sin datos todavía', peso: '—', pesoDelta: 'Peso inicial',
    revision: 'Primera revisión el lunes', mensajes: 0, email: '', telefono: '' };
}
/* Copia en la ficha local lo que dice el servidor (lo demás —planes, seguimientos— no se toca) */
function svAFicha(r, d){
  d.sid = r.id;
  d.svCuenta = !!r.user_id;
  d.nombre = r.nombre;
  d.objetivo = r.objetivo || 'Sin objetivo';
  d.email = r.email || '';
  d.telefono = r.telefono || '';
  d.duracion = r.programa_semanas || 12;
  if (r.inicio_programa) d.fechaAlta = new Date(r.inicio_programa + 'T12:00:00').toISOString();
  const t = d.tarifa || {};
  t.tipo = r.tarifa;
  t.precio = r.precio == null ? null : Number(r.precio);
  if (r.tarifa === 'ninguna') delete t.hasta; else t.hasta = r.acceso_hasta;
  if (!Array.isArray(t.pagos)) t.pagos = [];
  if (!t.acceso) t.acceso = 'auto';
  d.tarifa = t;
  delete d.codigo;
  return d;
}
function svAsegurarFicha(r){
  let k = svClaveDe(r.id);
  if (!k) {
    k = 'sv' + r.id.replace(/-/g, '');
    clientesData[k] = svFichaNueva();
    SEGUIMIENTOS[k] = SEGUIMIENTOS[k] || [];
    PLANES[k] = PLANES[k] || { ent: '', nut: '' };
    try { clientesData[k].semanaRef = mjISO(mjLunes()); } catch(e){}
  }
  svAFicha(r, clientesData[k]);
  return k;
}

let svSincronizando = null;
function svSincronizar(){
  if (!svActivo() || !coachActivo) return Promise.resolve();
  if (svSincronizando) return svSincronizando;
  svSincronizando = svCargar().then(function(d){ return d.clientes.listar(); }).then(function(lista){
    const vistos = {};
    lista.forEach(function(r){ vistos[svAsegurarFicha(r)] = 1; });
    // Lo que ya no está en el servidor (o nunca estuvo) desaparece de este cajón
    Object.keys(clientesData).forEach(function(k){
      if (vistos[k]) return;
      delete clientesData[k]; delete SEGUIMIENTOS[k]; delete PLANES[k];
      if (clienteActual === k) { clienteActual = null; try { backToPanel(); } catch(e){} }
    });
    try { mjRefrescarSemanas(); } catch(e){}
    guardarTodo();
    actualizarPanel();
    window.dispatchEvent(new Event('fsd:lista-servidor'));             // servidor-planes.js trae los planes
  }).catch(function(e){
    try { toast(svMensaje(e, 'No se ha podido traer la lista de clientes del servidor')); } catch(_){}
  }).finally(function(){ svSincronizando = null; });
  return svSincronizando;
}
function svEmpezarSincro(){
  svPararSincro();
  svSincronizar();
  svCargar().then(function(d){
    if (coachActivo && !svDejarDeEscuchar) svDejarDeEscuchar = d.clientes.escuchar(svSincronizar);
  }).catch(function(){});
}
function svPararSincro(){
  if (svDejarDeEscuchar) { try { svDejarDeEscuchar(); } catch(e){} svDejarDeEscuchar = null; }
}
window.addEventListener('online', function(){ if (svActivo() && coachActivo) svSincronizar(); });

/* ---------- comprobaciones antes de enviar (las mismas reglas que el servidor) ---------- */
function svTelefono(t){ return String(t || '').replace(/[^0-9+]/g, ''); }
function svDatosNoValidos(email, tel){
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'El correo no parece válido. Revísalo o déjalo en blanco.';
  if (tel && !/^\+?[0-9]{6,15}$/.test(svTelefono(tel))) return 'El teléfono no parece válido. Revísalo o déjalo en blanco.';
  return '';
}

/* ---------- alta: la hace el servidor ---------- */
let svAltaEnCurso = false;
confirmAlta = (function(orig){
  return function(){
    if (!svActivo()) return orig.apply(this, arguments);
    if (svAltaEnCurso) return;
    const v = document.getElementById('view-alta');
    const campos = v.querySelectorAll('.field input');
    const nombre = (campos[0].value || '').trim();
    if (!nombre) return orig.apply(this, arguments);           // el aviso de «falta el nombre» de siempre
    const err = document.getElementById('altaError');
    const email = ((campos[1] && campos[1].value) || '').trim();
    const tel = ((campos[2] && campos[2].value) || '').trim();
    const malo = svDatosNoValidos(email, tel);
    if (malo) { err.textContent = malo; return; }
    const chip = v.querySelector('.chips:not(#altaDuracion):not(#altaTarifa) .chip.selected');
    const objetivo = chip ? chip.textContent.trim() : '';
    const dur = +((v.querySelector('#altaDuracion .chip.selected') || {}).dataset || {}).sem || 12;
    const tarifa = ((v.querySelector('#altaTarifa .chip.selected') || {}).dataset || {}).tarifa || 'ninguna';
    const precio = mjNum((document.getElementById('altaPrecio') || {}).value);
    const pagado = !!(document.getElementById('altaPagado') || {}).checked;
    const btn = document.getElementById('confirmBtn');
    const txt = btn ? btn.textContent : '';
    err.textContent = '';
    svAltaEnCurso = true;
    if (btn) { btn.disabled = true; btn.textContent = 'Creando en el servidor…'; }
    const yo = this, args = arguments;
    svCargar().then(function(d){
      return d.clientes.crear({
        nombre: nombre, objetivo: objetivo && objetivo !== 'Sin objetivo' ? objetivo : undefined,
        email: email || undefined, telefono: tel ? svTelefono(tel) : undefined,
        programa_semanas: dur, tarifa: tarifa, precio: precio == null ? undefined : precio, pagado: pagado,
      });
    }).then(function(r){
      if (btn) btn.textContent = txt;
      // Se hace el alta de siempre en la pantalla, pero con el código que ha dado el servidor
      const antes = Object.keys(clientesData);
      const gen = generateCode;
      generateCode = function(){ document.getElementById('generatedCode').textContent = r.codigo; };
      try { orig.apply(yo, args); } finally { generateCode = gen; }
      const k = Object.keys(clientesData).filter(function(x){ return antes.indexOf(x) < 0; })[0];
      if (k) {
        const d = clientesData[k];
        d.sid = r.id; d.svCuenta = false;
        delete d.codigo;
        svCodigos[k] = r.codigo;
        if (d.tarifa && d.tarifa.tipo !== 'ninguna' && r.acceso_hasta) d.tarifa.hasta = r.acceso_hasta;
        guardarTodo();
      }
      svSincronizar();
    }).catch(function(e){
      err.textContent = svMensaje(e);
      if (btn) { btn.disabled = false; btn.textContent = txt; }
    }).finally(function(){ svAltaEnCurso = false; });
  };
})(confirmAlta);

/* ---------- código de acceso en la ficha: solo el recién creado, y uno nuevo si hace falta ---------- */
codigoFicha = (function(orig){
  return function(){
    if (!svActivo()) return orig.apply(this, arguments);
    return (clienteActual && svCodigos[clienteActual]) || '';
  };
})(codigoFicha);

function svCodigoNuevo(){
  const k = clienteActual, d = k ? clientesData[k] : null;
  if (!d || !d.sid) return;
  if (d.svCuenta) { toast('Ya tiene su cuenta: entra con su correo y su contraseña'); return; }
  const b = document.getElementById('svCodNuevo');
  if (b) { b.disabled = true; b.textContent = 'Creando…'; }
  svCargar().then(function(x){ return x.clientes.nuevoCodigo(d.sid); }).then(function(c){
    svCodigos[k] = c;
    const el = document.getElementById('fichaCodigo');
    if (el && clienteActual === k) {
      el.textContent = c; el.setAttribute('data-visible', '1');
      const m = document.getElementById('fichaCodBtn'); if (m) m.textContent = 'Ocultar';
    }
    toast('Código nuevo creado. Vale 3 días; el anterior ya no sirve.');
  }).catch(function(e){ toast(svMensaje(e)); })
    .finally(function(){ if (b) { b.disabled = false; b.textContent = 'Nuevo'; } });
}
function svPintarFichaCodigo(){
  if (!svActivo()) return;
  const cod = document.getElementById('fichaCodigo');
  const acts = cod && cod.parentNode;
  if (!acts) return;
  let b = document.getElementById('svCodNuevo');
  if (!b) {
    b = document.createElement('button');
    b.id = 'svCodNuevo'; b.className = 'mini-btn'; b.type = 'button'; b.textContent = 'Nuevo';
    b.title = 'Crear un código nuevo (el anterior deja de valer)';
    b.onclick = svCodigoNuevo;
    acts.appendChild(b);
  }
  const d = clienteActual ? clientesData[clienteActual] : null;
  b.hidden = !d || !!d.svCuenta;
  if (d && d.svCuenta && !svCodigos[clienteActual]) {
    const lbl = cod.closest('.list-row') && cod.closest('.list-row').firstElementChild;
    if (lbl) lbl.textContent = 'Código de acceso · ya tiene cuenta';
  } else {
    const lbl = cod.closest('.list-row') && cod.closest('.list-row').firstElementChild;
    if (lbl) lbl.textContent = 'Código de acceso';
  }
}
goToCliente = (function(orig){
  return function(){ const r = orig.apply(this, arguments); try { svPintarFichaCodigo(); } catch(e){} return r; };
})(goToCliente);

/* ---------- editar datos del cliente: se guarda en el servidor ---------- */
guardarEditarCliente = (function(orig){
  return function(){
    if (!svActivo()) return orig.apply(this, arguments);
    const k = clienteActual, d = k ? clientesData[k] : null;
    if (!d || !d.sid) return orig.apply(this, arguments);
    const email = ((document.getElementById('mjEcMail') || {}).value || '').trim();
    const tel = ((document.getElementById('mjEcTel') || {}).value || '').trim();
    const malo = svDatosNoValidos(email, tel);
    if (malo) { toast(malo); return; }
    orig.apply(this, arguments);
    const c = clientesData[k];
    if (!c) return;
    svCargar().then(function(x){
      return x.clientes.actualizar(c.sid, {
        nombre: c.nombre, objetivo: c.objetivo && c.objetivo !== 'Sin objetivo' ? c.objetivo : null,
        email: c.email || null, telefono: c.telefono ? svTelefono(c.telefono) : null,
        programa_semanas: mjDuracion(c),
        inicio_programa: c.fechaAlta ? mjISO(c.fechaAlta) : undefined,
      });
    }).then(function(){ toast('Datos guardados en el servidor'); })
      .catch(function(e){ toast(svMensaje(e, 'No se han podido guardar en el servidor')); svSincronizar(); });
  };
})(guardarEditarCliente);

/* ---------- lo que todavía no está conectado: mejor no hacerlo que perderlo ----------
   (se haría solo en este dispositivo y la siguiente actualización del servidor lo desharía) */
function svTodaviaNo(fn, aviso){
  return function(){
    if (svActivo()) { toast(aviso); return; }
    return fn.apply(this, arguments);
  };
}
if (typeof eliminarCliente === 'function') eliminarCliente = svTodaviaNo(eliminarCliente, 'Con el servidor de pruebas, la baja llega en un paso siguiente');
if (typeof confirmarPago === 'function') confirmarPago = svTodaviaNo(confirmarPago, 'Con el servidor de pruebas, los pagos llegan en un paso siguiente');
if (typeof guardarTarifa === 'function') guardarTarifa = svTodaviaNo(guardarTarifa, 'Con el servidor de pruebas, cambiar la tarifa llega en un paso siguiente');
if (typeof cambiarAcceso === 'function') cambiarAcceso = svTodaviaNo(cambiarAcceso, 'Con el servidor de pruebas, el acceso lo decide el servidor según los pagos');

/* =========================================================
   ACCESO DE CLIENTES
   Primera vez: su código + crear cuenta (correo y contraseña). Después: «Ya tengo cuenta».
   ========================================================= */
let svPermitirCliente = false;
let svModoCli = 'cuenta';
let svCodigoCanje = '';

function svHojaCliente(){
  let o = document.getElementById('svCli');
  if (o) return o;
  o = document.createElement('div');
  o.className = 'fsd-overlay dlg-layer'; o.id = 'svCli';
  o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'svCliTit');
  o.innerHTML = '<div class="fsd-sheet dlg"><h3 id="svCliTit"></h3><p class="ajx-note" id="svCliTxt"></p>'
    + '<form id="svCliForm" novalidate>'
    + '<div class="field"><label for="svCliEmail">Correo</label><input type="email" id="svCliEmail" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="email"></div>'
    + '<div class="field"><label for="svCliPass">Contraseña</label><input type="password" id="svCliPass" autocapitalize="none" autocorrect="off" spellcheck="false"></div>'
    + '<div class="field" id="svCliPass2Fila"><label for="svCliPass2">Repite la contraseña</label><input type="password" id="svCliPass2" autocomplete="new-password" autocapitalize="none" autocorrect="off" spellcheck="false"></div>'
    + '<div class="picker-new-error" id="svCliErr" role="alert"></div>'
    + '<div class="btn-row"><button type="button" class="btn-eq" id="svCliNo">Cancelar</button>'
    + '<button type="submit" class="btn-primary btn-eq-p" id="svCliSi">Entrar</button></div></form></div>';
  const junto = document.getElementById('proPass');           // mismo sitio que el diálogo de profesionales (mismos estilos)
  (junto ? junto.parentNode : document.body).appendChild(o);
  document.getElementById('svCliNo').onclick = svCerrarHojaCliente;
  document.getElementById('svCliForm').onsubmit = function(ev){ ev.preventDefault(); svEnviarCliente(); };
  return o;
}
function svAbrirHojaCliente(modo){
  svModoCli = modo;
  const o = svHojaCliente();
  const canje = modo === 'canje';
  document.getElementById('svCliTit').textContent = canje ? 'Crea tu cuenta' : 'Entrar con tu cuenta';
  document.getElementById('svCliTxt').textContent = canje
    ? 'Tu código es válido. Elige el correo y la contraseña con los que entrarás a partir de ahora. La contraseña: al menos 12 caracteres, con mayúsculas, minúsculas y números.'
    : 'Escribe el correo y la contraseña de tu cuenta.';
  document.getElementById('svCliPass2Fila').hidden = !canje;
  document.getElementById('svCliPass').setAttribute('autocomplete', canje ? 'new-password' : 'current-password');
  document.getElementById('svCliSi').textContent = canje ? 'Crear cuenta y entrar' : 'Entrar';
  ['svCliPass', 'svCliPass2'].forEach(function(id){ document.getElementById(id).value = ''; });
  document.getElementById('svCliErr').textContent = '';
  o.classList.add('show');
  if (!canje) svCodigoCanje = '';
  setTimeout(function(){ try { document.getElementById('svCliEmail').focus(); } catch(e){} }, 80);
  svCargar().catch(function(){});
}
function svCerrarHojaCliente(){
  const o = document.getElementById('svCli');
  if (o) o.classList.remove('show');
  ['svCliPass', 'svCliPass2'].forEach(function(id){ const i = document.getElementById(id); if (i) i.value = ''; });
  svCodigoCanje = '';
}
function svContrasenaFlojaCli(p){
  if (p.length < 12) return 'La contraseña tiene que tener al menos 12 caracteres.';
  if (!/[a-z]/.test(p) || !/[A-Z]/.test(p) || !/[0-9]/.test(p)) return 'La contraseña tiene que llevar mayúsculas, minúsculas y números.';
  return '';
}
function svEnviarCliente(){
  const err = document.getElementById('svCliErr');
  const btn = document.getElementById('svCliSi');
  const email = document.getElementById('svCliEmail').value.trim();
  const pass = document.getElementById('svCliPass').value;
  const canje = svModoCli === 'canje';
  if (!email || !pass) { err.textContent = 'Escribe tu correo y tu contraseña.'; return; }
  if (canje) {
    const floja = svContrasenaFlojaCli(pass);
    if (floja) { err.textContent = floja; return; }
    if (pass !== document.getElementById('svCliPass2').value) { err.textContent = 'Las dos contraseñas no coinciden.'; return; }
  }
  err.textContent = '';
  const txt = btn.textContent;
  btn.disabled = true; btn.textContent = canje ? 'Creando tu cuenta…' : 'Entrando…';
  let canjeado = false;
  svCargar().then(function(d){
    return (canje ? d.clientes.canjear(svCodigoCanje, email, pass).then(function(){ canjeado = true; }) : Promise.resolve())
      .then(function(){ return d.auth.entrarCliente(email, pass); })
      .then(function(){ return d.clientes.miFicha(); });
  }).then(function(f){
    if (!f) throw new Error('sin ficha');
    svCerrarHojaCliente();
    svEntrarCliente(f);
  }).catch(function(e){
    const msg = svMensaje(e);
    if (canjeado) {
      // La cuenta ya está creada (el código ya no vale): a partir de aquí es «Ya tengo cuenta»
      svAbrirHojaCliente('cuenta');
      document.getElementById('svCliEmail').value = email;
      document.getElementById('svCliErr').textContent = 'Tu cuenta ya está creada, pero no se ha podido entrar: ' + msg;
      return;
    }
    err.textContent = msg;
  }).finally(function(){ btn.disabled = false; btn.textContent = canjeado ? 'Entrar' : txt; });
}
/* Entra en la app con la ficha que ha devuelto el servidor (reutiliza la entrada de siempre) */
function svEntrarCliente(f){
  const k = svAsegurarFicha(f);
  const ficha = clientesData[k];
  const llave = 'SV' + Math.random().toString(36).slice(2, 10).toUpperCase();
  const input = document.getElementById('accessCode');
  ficha.codigo = llave; input.value = llave;
  svPermitirCliente = true;
  try { enterApp(); } finally {
    svPermitirCliente = false;
    delete ficha.codigo; input.value = '';
    guardarTodo();
  }
  if (window.fsdSesionCliente) window.dispatchEvent(new Event('fsd:cliente-dentro'));
}

enterApp = (function(orig){
  return function(){
    if (!svActivo() || svPermitirCliente) return orig.apply(this, arguments);
    const err = document.getElementById('loginError');
    const cod = (document.getElementById('accessCode').value || '').trim().toUpperCase();
    if (!cod) { err.textContent = 'Introduce tu código de acceso, o entra con «Ya tengo cuenta».'; return; }
    if (!/^[A-Z0-9]{4}-?[A-Z0-9]{4}$/.test(cod)) { err.textContent = 'El código tiene 8 letras y números, como ABCD-2345.'; return; }
    // En el ordenador la app del cliente no se usa: sale el aviso de siempre antes de crear nada
    if (typeof escEsOrdenador === 'function' && escEsOrdenador()) return orig.apply(this, arguments);
    err.textContent = '';
    svAbrirHojaCliente('canje');
    svCodigoCanje = cod;
  };
})(enterApp);

/* Salir (cliente) también cierra la sesión en el servidor */
cerrarSesionCliente = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    if (svActivo()) { window.dispatchEvent(new Event('fsd:sesion-fuera')); if (window.fsdDatos) fsdDatos.auth.salir(); }
    return r;
  };
})(cerrarSesionCliente);

/* Botón «Ya tengo cuenta» bajo el código (solo en modo servidor) */
function svBotonCuenta(){
  if (!svActivo() || document.getElementById('svYaCuenta')) return;
  const err = document.getElementById('loginError');
  if (!err) return;
  const b = document.createElement('button');
  b.type = 'button'; b.id = 'svYaCuenta'; b.className = 'btn-eq sv-ya-cuenta';
  b.textContent = 'Ya tengo cuenta';
  b.onclick = function(){ svAbrirHojaCliente('cuenta'); };
  err.parentNode.insertBefore(b, err.nextSibling);
  const pista = err.parentNode.querySelector('.login-hint');
  if (pista) pista.textContent = 'La primera vez, escribe el código que te ha enviado tu equipo y crea tu cuenta. Después, entra con «Ya tengo cuenta».';
}

/* El servidor no confirma la sesión del cliente: fuera, y sin ventanas suyas abiertas encima de la portada */
function svEcharCliente(){
  if (!window.fsdSesionCliente) return;
  cerrarSesionCliente();
  Array.prototype.forEach.call(document.querySelectorAll('.fsd-overlay.show'), function(o){ o.classList.remove('show'); });
  toast('Vuelve a entrar con tu cuenta');
}

/* =========================================================
   AL ABRIR LA APP EN MODO SERVIDOR
   · profesionales: siempre sin sesión
   · cliente que ya estaba dentro: sigue solo si el servidor confirma que su cuenta tiene acceso
   ========================================================= */
if (svActivo()) {
  svMarca();
  svBotonCuenta();
  const restaurado = !!(window.fsdSesionCliente && clienteActual);
  const k0 = clienteActual;
  svCargar().then(function(d){
    if (!restaurado) return d.auth.salir();
    return d.clientes.miFicha().then(function(f){
      if (f && svClaveDe(f.id) === k0) {
        svAsegurarFicha(f); guardarTodo(); try { pintarCliente(); } catch(e){}
        window.dispatchEvent(new Event('fsd:cliente-dentro'));
        return;
      }
      d.auth.salir();
      svEcharCliente();
    }, function(){
      // sin conexión: se queda con lo que tiene en el dispositivo
      if (navigator.onLine === false) return;
      d.auth.salir();
      svEcharCliente();
    });
  }).catch(function(){
    try { toast('No se ha podido conectar con el servidor de pruebas'); } catch(e){}
  });
}

(function(){
  const s = document.createElement('style');
  s.textContent = '.sv-marca{position:fixed;left:50%;top:max(6px,env(safe-area-inset-top));transform:translateX(-50%);z-index:9998;'
    + 'background:var(--warn,#b45309);color:#fff;font:600 11px/1 var(--font-ui,system-ui);letter-spacing:.02em;'
    + 'padding:5px 10px;border-radius:999px;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.2)}'
    + '.sv-ya-cuenta{display:block;width:100%;margin-top:10px}';
  document.head.appendChild(s);
})();
