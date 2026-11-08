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
        .then(function(){ orig.apply(yo, args); const d = clientesData[clienteActual]; if (d && d.consentSalud) d.consentSalud.sv = true; })
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
          try { avisarPros('pendientes', (d ? d.nombre : 'Un cliente') + ' ha retirado su consentimiento de datos de salud', 'Ya no podéis tratar sus datos de salud. Habla con él o dale de baja.', { cliente: clienteActual, vista: 'ficha' }); } catch(e){}
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
