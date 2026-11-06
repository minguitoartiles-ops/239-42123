/* =========================================================
   Fitnessindramas — Modo servidor · consentimientos (6/11/2026)
   Solo en modo servidor (?servidor=pruebas). Se carga después de servidor-facturas.js.

   · El consentimiento de datos de salud, el de uso de imagen y el comercial se apuntan en el
     servidor, como prueba (quién, qué, cuándo, versión de la política, IP y navegador).
     Antes se quedaban solo en el móvil del cliente.
   · Lo que vale es lo del servidor: si el cliente ya dio su consentimiento en otro aparato, no
     se le vuelve a preguntar; si no consta en el servidor, se le pregunta.
   · Si no se puede apuntar (sin conexión), no se da por dado: se le pide que vuelva a pulsar.
   · Domingo y Fátima ven en la ficha si consta, desde cuándo y el historial.
   ========================================================= */
const SV_CS = { cargado: false, pendiente: false, filas: [] };
function svCsCliente(){ return svActivo() && !!window.fsdDatos && !!window.fsdSesionCliente && !coachActivo; }
function svCsEquipo(){ return svActivo() && !!window.fsdDatos && !!coachActivo; }

/* el último apunte de cada tipo → los campos que ya usa la app */
function svCsAplicar(d, filas){
  const ult = {};
  filas.forEach(function(f){ ult[f.tipo] = f; });                 // vienen ordenados por fecha
  const s = ult.salud, i = ult.imagen, c = ult.comercial;
  d.consentSalud = s && s.dado ? { fecha: s.fecha, v: s.version } : null;
  if (i) d.consentImagen = { fecha: i.fecha, v: i.version, progreso: !!(i.dado && i.detalle && i.detalle.progreso),
    reconocible: !!(i.dado && i.detalle && i.detalle.reconocible), nombre: !!(i.dado && i.detalle && i.detalle.nombre) };
  else delete d.consentImagen;
  d.consentComercial = c && c.dado ? { fecha: c.fecha } : null;
  d.svConsentimientos = filas;
}
function svCsTraerCliente(){
  if (!svCsCliente()) return Promise.resolve();
  return svCargar().then(function(x){ return x.consentimientos.lista(); }).then(function(filas){
    const d = clientesData[clienteActual]; if (!d) return;
    svCsAplicar(d, filas);
    guardarTodo();
    SV_CS.cargado = true;
    if (SV_CS.pendiente) { SV_CS.pendiente = false; comprobarConsentSalud(); }
    try { if (vistaActual === 'ajustes') renderAjustes('cliente'); } catch(e){}
  }).catch(function(){
    // sin conexión: se usa lo del aparato, pero no se da nada por apuntado
    SV_CS.cargado = true;
    if (SV_CS.pendiente) { SV_CS.pendiente = false; comprobarConsentSalud(); }
  });
}
function svCsTraerEquipo(){
  if (!svCsEquipo()) return Promise.resolve();
  return svCargar().then(function(x){ return x.consentimientos.lista(); }).then(function(filas){
    const por = {};
    filas.forEach(function(f){ (por[f.cliente_id] = por[f.cliente_id] || []).push(f); });
    Object.keys(clientesData).forEach(function(k){ const d = clientesData[k]; if (d && d.sid) svCsAplicar(d, por[d.sid] || []); });
    guardarTodo();
    try { if (pantallaVisible() === 'view-coach-cliente') pintarImagenFicha(); } catch(e){}
  }).catch(function(){});
}
function svCsApuntar(tipo, dado, detalle){
  return svCargar().then(function(x){ return x.consentimientos.apuntar(tipo, dado, POLICY_V, detalle); });
}
function svCsFallo(e){
  try { toast(svMensaje(e, 'No se ha podido registrar tu decisión') + '. Vuelve a pulsar cuando tengas conexión.'); } catch(_){}
}

/* ficha del cliente (equipo): consentimiento de salud y su historial */
const SV_CS_NOMBRE = { salud: 'Datos de salud', imagen: 'Uso de imagen', comercial: 'Boletín y ofertas' };
function svCsVerHistorial(){
  const d = clientesData[clienteActual]; if (!d) return;
  const filas = (d.svConsentimientos || []).slice().reverse();
  const txt = filas.length ? filas.map(function(f){
      const det = f.tipo === 'imagen' && f.dado ? ' (' + CI_OPCIONES.filter(function(o){ return f.detalle && f.detalle[o[0]]; }).map(function(o){ return o[1].toLowerCase(); }).join(', ') + ')' : '';
      return fechaCorta(f.fecha) + ' · ' + SV_CS_NOMBRE[f.tipo] + ': ' + (f.dado ? 'acepta' : (f.tipo === 'salud' ? 'retira' : 'no acepta')) + det;
    }).join('\n') + '\n\nCada decisión queda apuntada en el servidor con su fecha, la versión de la política, la IP y el navegador.'
    : 'Todavía no consta ninguna decisión en el servidor. Se le pedirá la próxima vez que entre en la app.';
  abrirDialogo({ titulo: 'Consentimientos de ' + d.nombre, texto: txt, ok: 'Entendido', soloOk: true });
}

/* =========================================================
   ENGANCHES (solo en modo servidor)
   ========================================================= */
if (svActivo()) {
  /* no preguntar hasta saber qué consta en el servidor */
  comprobarConsentSalud = (function(orig){
    return function(){
      if (svCsCliente() && !SV_CS.cargado) { SV_CS.pendiente = true; return; }
      return orig.apply(this, arguments);
    };
  })(comprobarConsentSalud);
  comprobarConsentImagen = (function(orig){
    return function(){
      if (svCsCliente() && !SV_CS.cargado) return;
      return orig.apply(this, arguments);
    };
  })(comprobarConsentImagen);

  /* aceptar: primero se apunta en el servidor; si no se puede, no se da por dado */
  csAceptar = (function(orig){
    return function(){
      if (!svCsCliente()) return orig.apply(this, arguments);
      const b = document.getElementById('csOk'); if (b && b.disabled) return;
      const com = document.getElementById('csCom'), comercial = !!(com && com.checked);
      if (b) b.disabled = true;
      const yo = this, args = arguments;
      svCsApuntar('salud', true).then(function(){ return svCsApuntar('comercial', comercial); })
        .then(function(){ orig.apply(yo, args); svCsTraerCliente(); })
        .catch(function(e){ svCsFallo(e); if (b) b.disabled = false; });
    };
  })(csAceptar);

  retirarConsentSalud = (function(orig){
    return function(){
      if (!svCsCliente()) return orig.apply(this, arguments);
      abrirDialogo({
        titulo: 'Retirar consentimiento',
        texto: 'Dejaremos de tratar tus datos de salud y se cerrará tu sesión. Sin este consentimiento no podemos seguir con tu asesoría personalizada. Retirarlo no afecta a lo tratado antes. Domingo y Fátima verán que lo has retirado.',
        ok: 'Retirar', peligro: true,
        onOk: function(){
          svCsApuntar('salud', false).then(function(){
            const d = clientesData[clienteActual];
            if (d) d.consentSalud = null;
            guardarTodo();
            cerrarSesionCliente();
            document.getElementById('loginError').textContent = 'Has retirado tu consentimiento y se ha cerrado tu sesión.';
          }).catch(svCsFallo);
        }
      });
    };
  })(retirarConsentSalud);

  ciGuardar = (function(orig){
    return function(ninguno){
      if (!svCsCliente()) return orig.apply(this, arguments);
      const val = function(id){ return !ninguno && !!(document.getElementById(id) || {}).checked; };
      const det = { progreso: val('ciProgreso'), reconocible: val('ciReconocible'), nombre: val('ciNombre') };
      const dado = det.progreso || det.reconocible;
      const yo = this, args = arguments;
      svCsApuntar('imagen', dado, det).then(function(){ orig.apply(yo, args); svCsTraerCliente(); }).catch(svCsFallo);
    };
  })(ciGuardar);

  toggleComercial = (function(orig){
    return function(el){
      if (!svCsCliente()) return orig.apply(this, arguments);
      const on = !el.classList.contains('on');
      const yo = this, args = arguments;
      svCsApuntar('comercial', on).then(function(){ orig.apply(yo, args); svCsTraerCliente(); }).catch(svCsFallo);
    };
  })(toggleComercial);

  /* ficha (equipo): fila «Consentimiento de salud» con su historial */
  pintarImagenFicha = (function(orig){
    return function(){
      const r = orig.apply(this, arguments);
      const d = clientesData[clienteActual], img = document.getElementById('fichaImagen');
      if (!d || !img || !svCsEquipo()) return r;
      let row = document.getElementById('fichaSalud');
      if (!row) {
        row = document.createElement('div'); row.id = 'fichaSalud'; row.className = 'list-row';
        row.setAttribute('onclick', 'svCsVerHistorial()');
        img.parentNode.insertBefore(row, img);
      }
      const filas = (d.svConsentimientos || []).filter(function(f){ return f.tipo === 'salud'; });
      const u = filas[filas.length - 1];
      const txt = !u ? 'Pendiente' : (u.dado ? 'Dado el ' + fechaCorta(u.fecha) : 'Retirado el ' + fechaCorta(u.fecha));
      row.innerHTML = '<span>Consentimiento de salud</span><span class="ajx-acts"><span class="pill' + (u && u.dado ? ' ok' : '') + '">' + esc(txt) + '</span><span class="chev">›</span></span>';
      return r;
    };
  })(pintarImagenFicha);
  window.svCsVerHistorial = svCsVerHistorial;

  window.addEventListener('fsd:cliente-dentro', function(){ SV_CS.cargado = false; svCsTraerCliente(); });
  window.addEventListener('fsd:lista-servidor', svCsTraerEquipo);
  window.addEventListener('fsd:al-volver', function(){ if (svCsCliente()) svCsTraerCliente(); else if (svCsEquipo()) svCsTraerEquipo(); });
  window.addEventListener('fsd:sesion-fuera', function(){ SV_CS.cargado = false; SV_CS.pendiente = false; });
}
