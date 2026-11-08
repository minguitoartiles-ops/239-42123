/* =========================================================
   Fitnessindramas — Modo servidor · sesión y consentimientos (6/11/2026)
   Solo en modo servidor (?servidor=pruebas). Se carga después de servidor-facturas.js.

   1 · La sesión, vigilada. Si se cierra o cambia de cuenta desde otra pestaña o ventana del mismo
       navegador (otra persona entra o sale), esta pestaña sale también y lo explica. Antes la app
       seguía como si nada y todo lo que pedía al servidor iba sin sesión («No tienes permiso…»).
       Así además nadie actúa sin querer con la cuenta de otro.
   2 · Consentimientos en el servidor: el de datos de salud (art. 9.2.a RGPD) y el de imagen se
       guardan allí al darlos, cambiarlos o retirarlos, con fecha, versión de los textos y navegador.
       Sin guardarlo en el servidor no se entra. Lo ven el cliente y Domingo y Fátima.
   ========================================================= */
const SV_SES = { uid: null, dejar: null, saliendo: false };
function svSesDentro(){ return !!coachActivo || !!window.fsdSesionCliente; }

/* ---------- 1 · sesión ---------- */
function svSesApuntar(){
  return svCargar().then(function(x){ return x.quienSoy(); }).then(function(uid){ SV_SES.uid = uid; return uid; }).catch(function(){ return null; });
}
function svSesFuera(motivo){
  if (SV_SES.saliendo || !svSesDentro()) return;
  SV_SES.saliendo = true;
  SV_SES.uid = null;
  svNoTocarSesion = true;                       // la sesión ya no es nuestra: no se cierra (sería la de otra pestaña)
  try {
    if (coachActivo) coachLogout(); else svEcharCliente();
    abrirDialogo({ titulo: 'Se ha cerrado tu sesión',
      texto: motivo === 'otra'
        ? 'En este navegador se ha entrado con otra cuenta (en otra pestaña o ventana), y solo puede haber una a la vez. Vuelve a entrar con la tuya.\n\nPara probar con dos cuentas a la vez, usa otro navegador o una ventana privada.'
        : 'Se ha salido de la cuenta en este navegador (quizá desde otra pestaña o ventana), o la sesión ha caducado. Vuelve a entrar.',
      ok: 'Entendido', soloOk: true });
  } finally { svNoTocarSesion = false; setTimeout(function(){ SV_SES.saliendo = false; }, 500); }
}
function svSesComprobar(uid){
  if (!svSesDentro() || !SV_SES.uid || SV_SES.saliendo) return;
  if (!uid) svSesFuera('cerrada');
  else if (uid !== SV_SES.uid) svSesFuera('otra');
}
function svSesVigilar(){
  if (SV_SES.dejar) return;
  svCargar().then(function(x){
    if (SV_SES.dejar) return;
    SV_SES.dejar = x.vigilarSesion(function(uid){ svSesComprobar(uid); });
  }).catch(function(){});
}
/* por si el aviso entre pestañas no llega: al volver a la pestaña y si cambia la sesión guardada */
function svSesRevisar(){
  if (!svSesDentro() || !SV_SES.uid) return;
  svCargar().then(function(x){ return x.quienSoy(); }).then(svSesComprobar).catch(function(){});
}

/* ---------- 2 · consentimientos ---------- */
function svCsUltimos(filas){
  const u = {};
  filas.forEach(function(r){ u[r.cliente_id + '|' + r.tipo] = r; });     // vienen del más antiguo al más nuevo
  return u;
}
function svCsAplicar(d, salud, imagen){
  d.consentSalud = salud && salud.estado === 'dado' ? { fecha: salud.fecha, v: salud.version, sv: true } : null;
  if (imagen) {
    const dt = imagen.estado === 'dado' && imagen.detalle ? imagen.detalle : {};
    d.consentImagen = { fecha: imagen.fecha, v: imagen.version, progreso: !!dt.progreso, reconocible: !!dt.reconocible, nombre: !!dt.nombre, sv: true };
  } else d.consentImagen = null;
}
let svCsTrayendo = null;
function svCsTraer(){
  if (!svSesDentro()) return Promise.resolve();
  if (svCsTrayendo) return svCsTrayendo;
  svCsTrayendo = svCargar().then(function(x){ return x.consentimientos.lista(); }).then(function(filas){
    const u = svCsUltimos(filas);
    Object.keys(clientesData).forEach(function(k){
      const d = clientesData[k]; if (!d || !d.sid) return;
      const sid = String(d.sid).toLowerCase();
      svCsAplicar(d, u[sid + '|salud'], u[sid + '|imagen']);
    });
    guardarTodo();
    if (window.fsdSesionCliente && !coachActivo) {
      // el cliente: si el servidor no tiene su consentimiento, se le pide (aunque lo diera antes en este móvil)
      try { comprobarConsentSalud(); } catch(e){}
      try { svSaTraer(); } catch(e){}
      try { if (vistaActual === 'ajustes' && typeof renderAjustes === 'function') renderAjustes('cliente'); } catch(e){}
    } else {
      try { if (typeof pantallaVisible === 'function' && pantallaVisible() === 'view-coach-cliente' && typeof pintarImagenFicha === 'function') pintarImagenFicha(); } catch(e){}
    }
  }).catch(function(){}).finally(function(){ svCsTrayendo = null; });
  return svCsTrayendo;
}

/* =========================================================
   ENGANCHES (solo en modo servidor)
   ========================================================= */
if (svActivo()) {
  /* la sesión: se apunta quién entró y se vigila */
  window.addEventListener('fsd:pro-dentro', function(){ svSesApuntar(); svSesVigilar(); });
  window.addEventListener('fsd:cliente-dentro', function(){ svSesApuntar(); svSesVigilar(); svCsTraer(); });
  window.addEventListener('fsd:lista-servidor', svCsTraer);
  window.addEventListener('fsd:al-volver', svSesRevisar);
  window.addEventListener('focus', svSesRevisar);
  window.addEventListener('storage', function(e){ if (!e.key || /^fsd-sesion-/.test(e.key)) setTimeout(svSesRevisar, 200); });
  window.addEventListener('fsd:sesion-fuera', function(){ SV_SES.uid = null; });

  /* dar el consentimiento de salud: primero en el servidor; si no se guarda, no se entra */
  csAceptar = (function(orig){
    let ocupado = false;
    return function(){
      if (!window.fsdSesionCliente) return orig.apply(this, arguments);
      if (ocupado) return;
      const yo = this, args = arguments, b = document.getElementById('csOk');
      ocupado = true; if (b) b.disabled = true;
      svCargar().then(function(x){ return x.consentimientos.registrar('salud', 'dado', POLICY_V); })
        .then(function(){ orig.apply(yo, args); const d = clientesData[clienteActual]; if (d && d.consentSalud) d.consentSalud.sv = true; try { svSaTraer(); } catch(e){} })
        .catch(function(e){ toast(svMensaje(e, 'No se ha podido guardar tu consentimiento. Inténtalo de nuevo.')); })
        .finally(function(){ ocupado = false; if (b) b.disabled = !document.getElementById('csChk').checked; });
    };
  })(csAceptar);

  /* retirarlo: queda apuntado en el servidor y se cierra la sesión */
  retirarConsentSalud = function(){
    abrirDialogo({
      titulo: 'Retirar consentimiento',
      texto: 'Dejaremos de tratar tus datos de salud y se cerrará tu sesión. Sin este consentimiento no podemos seguir con tu asesoría personalizada. Retirarlo no afecta a lo tratado antes.',
      ok: 'Retirar', peligro: true,
      onOk: function(){
        svCargar().then(function(x){ return x.consentimientos.registrar('salud', 'retirado', POLICY_V); }).then(function(){
          const d = clientesData[clienteActual];
          if (d) d.consentSalud = null;
          guardarTodo();
          try { avisarPros('cuentas', (d ? d.nombre : 'Un cliente') + ' ha retirado su consentimiento de datos de salud', 'Ya no podéis tratar sus datos de salud. Habla con él o dale de baja.', { cliente: clienteActual, vista: 'ficha' }); } catch(e){}
          cerrarSesionCliente();
          document.getElementById('loginError').textContent = 'Has retirado tu consentimiento y se ha cerrado tu sesión.';
        }).catch(function(e){ toast(svMensaje(e, 'No se ha podido retirar. Inténtalo de nuevo.')); });
      }
    });
  };

  /* uso de imagen: también en el servidor */
  ciGuardar = (function(orig){
    return function(ninguno){
      const r = orig.apply(this, arguments);
      if (!window.fsdSesionCliente) return r;
      const d = clientesData[clienteActual], c = d && d.consentImagen;
      if (!c) return r;
      svCargar().then(function(x){ return x.consentimientos.registrar('imagen', 'dado', POLICY_V, c); })
        .then(function(){ c.sv = true; })
        .catch(function(e){ toast(svMensaje(e, 'No se ha podido guardar tu permiso de imagen en el servidor')); });
      return r;
    };
  })(ciGuardar);
}

/* =========================================================
   3 · Cuestionario inicial en el servidor y aviso de «ya ha entrado» (pedido por Domingo, 8/11/2026)
   · El cuestionario (con el teléfono, el DNI para la factura, medidas, alergias…) se guarda en el
     servidor al enviarlo; Domingo y Fátima lo ven y les llega el aviso. Si ya lo rellenó en otro
     móvil, no se le vuelve a pedir.
   · Cuando el cliente crea su cuenta y entra por primera vez, a los dos les llega un aviso.
   ========================================================= */
/* Un tipo de aviso propio que sí entra en la campana (los de «altas» y «pendientes» se quitaron de ella) */
if (svActivo()) {
  TIPOS_PRO.push({ id: 'cuentas', ico: '🔑', nombre: 'Cuentas de clientes', desc: 'Cuando un cliente entra por primera vez en la app o retira su consentimiento' });
  try { CAMPANA_PRO.push('cuentas'); } catch(e){}
}
const SV_SA_DIAS_AVISO = 14;                  // en un aparato nuevo, solo se avisa de lo reciente
function svSaDatos(d){
  const x = {};
  ['cuestionario', 'medIni', 'alergias', 'dni', 'nombreFiscal', 'dirFiscal'].forEach(function(c){ if (d[c] != null) x[c] = d[c]; });
  return JSON.parse(JSON.stringify(x));
}
function svSaSubir(k){
  const d = clientesData[k]; if (!d || !d.sid || !d.cuestionario) return Promise.resolve();
  return svCargar().then(function(x){ return x.salud.guardar(d.sid, svSaDatos(d)); })
    .then(function(){ delete d.svSaludPend; guardarTodo(); })
    .catch(function(e){ d.svSaludPend = true; guardarTodo(); throw e; });
}
function svSaReciente(f){ return f && (Date.now() - Date.parse(f)) < SV_SA_DIAS_AVISO * 864e5; }
// «Ya ha entrado en la app»: una sola vez por cliente, en cuanto el equipo se entera (al abrir o en directo)
function svSaAvisoCuenta(k){
  const d = clientesData[k];
  if (!coachActivo || !d || !d.sid || !d.svCuentaDesde || !svSaReciente(d.svCuentaDesde)) return;
  if (!tocaAvisarUnaVez('sv-cuenta|' + d.sid)) return;
  try { avisarPros('cuentas', d.nombre + ' ya ha entrado en la app', 'Creó su cuenta el ' + fechaCorta(d.svCuentaDesde) + '. Todo ha ido bien: ahora le toca el cuestionario inicial.', { cliente: k, vista: 'ficha' }); } catch(e){}
}
let svSaTrayendo = null;
function svSaTraer(){
  if (!svSesDentro()) return Promise.resolve();
  if (svSaTrayendo) return svSaTrayendo;
  svSaTrayendo = svCargar().then(function(x){ return x.salud.lista(); }).then(function(filas){
    const por = {}; filas.forEach(function(r){ por[String(r.cliente_id).toLowerCase()] = r.datos || {}; });
    if (window.fsdSesionCliente && !coachActivo) {
      const k = clienteActual, d = clientesData[k]; if (!d || !d.sid) return;
      const s = por[String(d.sid).toLowerCase()] || {};
      if (s.cuestionario && !d.cuestionario) {          // lo rellenó en otro móvil
        Object.assign(d, s); delete d.cqBorrador; guardarTodo();
        try { mjAvisoAlergiasHoy(); } catch(e){}
      } else if (d.cuestionario && (!s.cuestionario || d.svSaludPend)) {
        // lo tenía solo en este móvil (o quedó a medias). 8/11: solo cuando su consentimiento de salud ya consta en el
        // servidor; si no, se sube justo después de que lo dé (ver csAceptar más abajo)
        if (d.consentSalud && d.consentSalud.sv) svSaSubir(k).catch(function(){});
      }
      return;
    }
    // el equipo: cuestionarios y avisos
    Object.keys(clientesData).forEach(function(k){
      const d = clientesData[k]; if (!d || !d.sid) return;
      const s = por[String(d.sid).toLowerCase()];
      if (s && s.cuestionario) {
        const nuevo = !d.cuestionario || d.cuestionario.fecha !== s.cuestionario.fecha;
        ['cuestionario', 'medIni', 'alergias', 'dni', 'nombreFiscal', 'dirFiscal'].forEach(function(c){ if (s[c] != null) d[c] = s[c]; });
        const tel = s.cuestionario.r && s.cuestionario.r.telefono;
        if (tel && !d.telefono) d.telefono = String(tel).slice(0, 30);
        if (nuevo && svSaReciente(s.cuestionario.fecha) && tocaAvisarUnaVez('sv-cq|' + d.sid + '|' + s.cuestionario.fecha)) {
          try { avisarPros('seguimientos', d.nombre + ' ha enviado su cuestionario inicial', 'Objetivo: ' + recortar((s.cuestionario.r || {}).objetivo || (s.cuestionario.r || {}).ent_objetivo || '', 90), { cliente: k, vista: 'ficha' }); } catch(e){}
        }
      }
      svSaAvisoCuenta(k);
    });
    guardarTodo();
  }).catch(function(){}).finally(function(){ svSaTrayendo = null; });
  return svSaTrayendo;
}

if (svActivo()) {
  svAFicha = (function(orig){
    return function(r, d){
      const res = orig.apply(this, arguments);
      if (r.cuenta_desde) d.svCuentaDesde = r.cuenta_desde; else delete d.svCuentaDesde;
      if (d.svCuentaDesde && r.id) setTimeout(function(){ const k = svClaveDe(r.id); if (k) svSaAvisoCuenta(k); }, 0);
      return res;
    };
  })(svAFicha);
  cqEnviar = (function(orig){
    return function(){
      const r = orig.apply(this, arguments);
      if (window.fsdSesionCliente && clienteActual) {
        svSaSubir(clienteActual).catch(function(e){
          toast(svMensaje(e, 'Tu cuestionario se ha guardado en el móvil, pero no se ha podido enviar. Se volverá a intentar al abrir la app.'));
        });
      }
      return r;
    };
  })(cqEnviar);
  window.addEventListener('fsd:lista-servidor', svSaTraer);
  window.addEventListener('fsd:cliente-dentro', svSaTraer);
  window.addEventListener('fsd:al-volver', function(){ if (window.fsdSesionCliente && !coachActivo) svSaTraer(); });
}

/* =========================================================
   4 · «Duda para …» (en cualquier modo; pedido por Domingo, 8/11/2026)
   Quien pasa una duda a su compañero ya ha atendido ese chat: para él no cuenta como
   «sin contestar» (le sigue saliendo a quien se la ha pasado). Si el cliente vuelve a escribir
   después, vuelve a contar.
   ========================================================= */
esperaDesde = (function(orig){
  return function(k){
    const r = orig.apply(this, arguments);
    if (!r || !coachActivo) return r;
    const d = clientesData[k]; if (!d || !Array.isArray(d.dudas)) return r;
    const yo = norm(coachActivo.u);
    const mia = d.dudas.filter(function(x){ return !x.ok && x.f && norm(x.de || '') === yo && x.f >= r; })
      .map(function(x){ return x.f; }).sort().pop();
    if (!mia) return r;
    // ¿ha escrito el cliente después de pasar la duda?
    let ultimoCli = '';
    if (d.chatT && Array.isArray(d.chatT.cli)) ultimoCli = d.chatT.cli.slice(-1)[0] || '';
    try { const s = d.sid && typeof svChRes !== 'undefined' && svChRes[d.sid]; if (s && s.ultimo_lado === 'out' && s.ultimo_fecha > ultimoCli) ultimoCli = s.ultimo_fecha; } catch(e){}
    return ultimoCli > mia ? ultimoCli : null;
  };
})(esperaDesde);

/* =========================================================
   5 · Chat abierto (8/11/2026): si el cliente escribe mientras el profesional tiene su chat a la vista,
   ya lo está viendo: no queda como «sin contestar». (Solo en modo servidor, donde llegan en directo.)
   ========================================================= */
if (svActivo() && typeof svChPintar === 'function') {
  svChPintar = (function(orig){
    return function(k){
      const r = orig.apply(this, arguments);
      try { if (coachActivo && k === clienteActual && svChVisible(k)) puAtender(k); } catch(e){}
      return r;
    };
  })(svChPintar);
}

/* =========================================================
   6 · Ficha del cliente al día (8/11/2026, avisado por Domingo): al abrirla se traen del servidor su
   cuestionario, sus alergias y sus permisos (antes solo al abrir la app), y se vuelve a pintar.
   ========================================================= */
if (svActivo() && typeof goToCliente === 'function') {
  goToCliente = (function(orig){
    return function(k){
      const r = orig.apply(this, arguments);
      if (coachActivo) {
        Promise.all([svSaTraer(), svCsTraer()]).then(function(){
          if (clienteActual !== k || typeof pantallaVisible !== 'function' || pantallaVisible() !== 'view-coach-cliente') return;
          try { pintarAlergiasFicha(); } catch(e){}
          try { pintarImagenFicha(); } catch(e){}
        });
      }
      return r;
    };
  })(goToCliente);
}
