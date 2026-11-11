/* =========================================================
   11/11/2026 · Auditoría de seguridad (pedida por Domingo)
   · Verificación en dos pasos (opcional): activarla, quitarla y pedir el código al entrar.
   · Roles y permisos del equipo: quién tiene cada rol, qué puede hacer y, el administrador, cambiarlos.
   · Registro de actividad (solo el administrador): quién hizo qué, cuándo y con qué rol.
   · Derechos RGPD: el cliente los pide desde la app y el equipo los atiende con el plazo a la vista.
   · El consentimiento de cookies se guarda también en el servidor.
   Solo en modo servidor. Sin manejadores en línea: todo va por data-sg y addEventListener.
   ========================================================= */
(function(){
  const D = function(){ return window.fsdDatos || null; };
  const E = function(s){ return fsdEsc(s); };
  const MSG = function(e){ return (window.fsdDatos && fsdDatos.esErrorAcceso(e) && e.message) || 'No se ha podido completar. Inténtalo de nuevo.'; };
  const fecha = function(v, hora){
    if (!v) return '—';
    const d = new Date(v); if (isNaN(d)) return '—';
    const f = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    return hora ? f + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : f;
  };

  /* ---------- estado que se enseña en Ajustes ---------- */
  const est = { dosPasos: null, permisos: null, yo: null, pendientes: null, cargando: false, hora: 0 };
  function soyAdmin(){ return !!(est.permisos && est.yo && est.permisos.some(function(p){ return p.user_id === est.yo && p.admin && p.activo; })); }
  function cargarEstado(forzar){
    const d = D();
    if (!d || est.cargando || (!forzar && Date.now() - est.hora < 60000)) return;
    est.cargando = true;
    const coach = typeof coachActivo !== 'undefined' && !!coachActivo;
    Promise.all([
      d.auth.dosPasos.estado().catch(function(){ return null; }),
      d.quienSoy().catch(function(){ return null; }),
      coach ? d.registro.permisos().catch(function(){ return null; }) : Promise.resolve(null),
      d.derechos.lista().catch(function(){ return null; }),
    ]).then(function(r){
      est.dosPasos = r[0]; est.yo = r[1]; est.permisos = r[2];
      est.pendientes = r[3] ? r[3].filter(function(s){ return s.estado === 'pendiente' || s.estado === 'en_curso'; }).length : null;
      est.hora = Date.now();
    }).finally(function(){
      est.cargando = false;
      if (typeof refrescarAjustes === 'function') refrescarAjustes();
    });
  }

  /* ---------- sección «Seguridad» en Ajustes ---------- */
  function filaSg(accion, texto, der, cls){
    return '<div class="list-row' + (cls ? ' ' + cls : '') + '" data-sg="' + accion + '" role="button" tabindex="0"><span>' + texto + '</span>'
      + (der || '<span class="chev" aria-hidden="true">›</span>') + '</div>';
  }
  function pillSg(t, ok){ return '<span class="pill' + (ok ? ' ok' : '') + '">' + E(t) + '</span>'; }
  function htmlSeguridad(rol){
    const cliente = rol === 'cliente';
    const dp = est.dosPasos;
    let h = '<div class="section-lbl">Seguridad</div><div class="list-group">';
    h += filaSg('dos-pasos', 'Verificación en dos pasos', dp ? pillSg(dp.activa ? 'Activada' : 'Desactivada', dp.activa) : pillSg('…'));
    if (!cliente) {
      h += filaSg('roles', 'Roles y permisos del equipo');
      if (soyAdmin()) h += filaSg('registro', 'Registro de actividad');
      h += filaSg('derechos-equipo', 'Solicitudes de derechos (RGPD)', est.pendientes ? pillSg(est.pendientes + (est.pendientes === 1 ? ' pendiente' : ' pendientes')) : null);
    } else {
      h += filaSg('derechos', 'Mis derechos sobre mis datos', est.pendientes ? pillSg(est.pendientes + ' en curso') : null);
    }
    h += '</div><p class="ajx-note">' + (cliente
      ? 'Con la verificación en dos pasos, además de tu contraseña te pediremos un código de la app de tu móvil. Aunque alguien adivine tu contraseña, no podrá entrar.'
      : 'Con la verificación en dos pasos, aunque alguien robe tu contraseña no verá ningún dato de los clientes: el servidor exige también el código del móvil.')
      + '</p>';
    return h;
  }
  if (typeof htmlAjustes === 'function') htmlAjustes = (function(orig){
    return function(rol){
      const h = orig.apply(this, arguments);
      if (!D()) return h;
      cargarEstado(false);
      const marca = '<div class="section-lbl">Privacidad</div>';
      const i = h.indexOf(marca);
      return i < 0 ? h + htmlSeguridad(rol) : h.slice(0, i) + htmlSeguridad(rol) + h.slice(i);
    };
  })(htmlAjustes);

  /* ---------- hojas (ventanas) propias ---------- */
  function abrirHoja(titulo, cuerpo, opciones){
    const o = document.createElement('div');
    o.className = 'fsd-overlay dlg-layer sg-capa';
    o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    o.innerHTML = '<div class="fsd-sheet sg-hoja' + (opciones && opciones.estrecha ? ' dlg' : '') + '">'
      + '<h3 class="sg-tit">' + E(titulo) + '</h3><div class="sg-cuerpo"></div>'
      + '<div class="btn-row sg-pie"><button type="button" class="btn-eq" data-sg-cerrar>' + E((opciones && opciones.cerrar) || 'Cerrar') + '</button></div></div>';
    o.querySelector('.sg-cuerpo').innerHTML = cuerpo;
    // Dentro de la pantalla de la app (ahí están definidos los colores), como las demás ventanas
    const ref = document.getElementById('consentSalud');
    if (ref && ref.parentNode) ref.parentNode.insertBefore(o, ref.nextSibling); else document.body.appendChild(o);
    requestAnimationFrame(function(){ o.classList.add('show'); });
    o.addEventListener('click', function(ev){
      if (ev.target === o || ev.target.closest('[data-sg-cerrar]')) cerrarHoja(o);
    });
    // Se cierre como se cierre (botón, fondo, «atrás» o Escape), se recoge igual
    let abierta = false;
    const vigia = new MutationObserver(function(){
      if (o.classList.contains('show')) { abierta = true; return; }
      if (!abierta) return;
      vigia.disconnect();
      if (o._alCerrar) { const f = o._alCerrar; o._alCerrar = null; f(); }
      setTimeout(function(){ o.remove(); }, 250);
    });
    vigia.observe(o, { attributes: true, attributeFilter: ['class'] });
    return o;
  }
  function cerrarHoja(o){
    if (o) o.classList.remove('show');
  }
  function enHoja(o, sel){ return o.querySelector(sel); }

  /* ---------- código al entrar (lo llama servidor.js) ---------- */
  window.sgPedirCodigo = function(aviso){
    return new Promise(function(listo){
      const o = abrirHoja('Verificación en dos pasos',
        '<p class="sg-txt">Abre la app de códigos de tu móvil y escribe el código de 6 cifras de Fitnessindramas.</p>'
        + '<form class="sg-form" data-sg-form>'
        + '<div class="field"><label for="sgCodigo">Código</label><input id="sgCodigo" inputmode="numeric" autocomplete="one-time-code" maxlength="7" pattern="[0-9 ]*" autocapitalize="none" spellcheck="false"></div>'
        + '<div class="picker-new-error" role="alert">' + E(aviso || '') + '</div>'
        + '<button type="submit" class="btn-primary">Comprobar</button></form>',
        { estrecha: true, cerrar: 'Cancelar' });
      let hecho = false;
      o._alCerrar = function(){ if (!hecho) { hecho = true; listo(null); } };
      enHoja(o, '[data-sg-form]').addEventListener('submit', function(ev){
        ev.preventDefault();
        const v = enHoja(o, '#sgCodigo').value;
        hecho = true; listo(v);
        o._alCerrar = null; cerrarHoja(o);
      });
      setTimeout(function(){ try { enHoja(o, '#sgCodigo').focus(); } catch(e){} }, 120);
    });
  };

  /* ---------- verificación en dos pasos ---------- */
  function hojaDosPasos(){
    const d = D(); if (!d) return;
    const o = abrirHoja('Verificación en dos pasos', '<p class="sg-txt">Comprobando…</p>', { estrecha: true });
    const cuerpo = enHoja(o, '.sg-cuerpo');
    d.auth.dosPasos.estado().then(function(s){
      if (s.activa) {
        cuerpo.innerHTML = '<p class="sg-txt"><b>Está activada.</b> Cada vez que entres con tu contraseña te pediremos también el código de tu app.</p>'
          + '<p class="sg-txt">Si cambias de móvil, quítala aquí antes y vuelve a activarla en el nuevo.</p>'
          + '<div class="picker-new-error" role="alert"></div>'
          + '<button type="button" class="btn-eq danger" data-sg-quitar>Quitar la verificación</button>';
        enHoja(o, '[data-sg-quitar]').addEventListener('click', function(){
          const b = this;
          if (!b.dataset.seguro) { b.dataset.seguro = '1'; b.textContent = 'Pulsa otra vez para quitarla'; return; }
          b.disabled = true;
          d.auth.dosPasos.quitar(s.factorId).then(function(){
            toast('Verificación en dos pasos quitada'); cerrarHoja(o); cargarEstado(true);
          }).catch(function(e){ b.disabled = false; enHoja(o, '.picker-new-error').textContent = MSG(e); });
        });
        return;
      }
      cuerpo.innerHTML = '<p class="sg-txt">Además de tu contraseña, al entrar te pediremos un código de 6 cifras que cambia cada 30 segundos. Lo da una app gratuita en tu móvil: <b>Google Authenticator</b>, <b>Microsoft Authenticator</b> o la app <b>Contraseñas</b> del iPhone.</p>'
        + '<div class="picker-new-error" role="alert"></div>'
        + '<button type="button" class="btn-primary" data-sg-empezar>Activar</button>';
      enHoja(o, '[data-sg-empezar]').addEventListener('click', function(){
        const b = this; b.disabled = true; b.textContent = 'Preparando…';
        d.auth.dosPasos.empezar().then(function(n){
          cuerpo.innerHTML = '<p class="sg-txt"><b>1.</b> En la app de tu móvil, añade una cuenta y escanea este código:</p>'
            + '<div class="sg-qr"><img alt="Código QR para la app de códigos" width="180" height="180"></div>'
            + '<p class="sg-txt sg-peq">Si lo estás leyendo en el mismo móvil, copia esta clave en la app:</p>'
            + '<div class="sg-secreto mono"></div><button type="button" class="mini-btn" data-sg-copiar>Copiar clave</button>'
            + '<form class="sg-form" data-sg-form><p class="sg-txt"><b>2.</b> Escribe el código que te da la app:</p>'
            + '<div class="field"><label for="sgCodigoNuevo">Código</label><input id="sgCodigoNuevo" inputmode="numeric" autocomplete="one-time-code" maxlength="7"></div>'
            + '<div class="picker-new-error" role="alert"></div>'
            + '<button type="submit" class="btn-primary">Confirmar y activar</button></form>';
          if (/^data:image\/svg\+xml/i.test(n.qr)) enHoja(o, '.sg-qr img').src = n.qr;
          enHoja(o, '.sg-secreto').textContent = n.secreto;
          enHoja(o, '[data-sg-copiar]').addEventListener('click', function(){
            try { navigator.clipboard.writeText(n.secreto).then(function(){ toast('Clave copiada'); }); } catch(e){}
          });
          enHoja(o, '[data-sg-form]').addEventListener('submit', function(ev){
            ev.preventDefault();
            const btn = this.querySelector('button[type="submit"]'); btn.disabled = true;
            d.auth.dosPasos.confirmar(n.factorId, enHoja(o, '#sgCodigoNuevo').value).then(function(){
              toast('Verificación en dos pasos activada'); cerrarHoja(o); cargarEstado(true);
            }).catch(function(e){ btn.disabled = false; enHoja(o, '.sg-form .picker-new-error').textContent = MSG(e); });
          });
        }).catch(function(e){ b.disabled = false; b.textContent = 'Activar'; enHoja(o, '.picker-new-error').textContent = MSG(e); });
      });
    }).catch(function(e){ cuerpo.innerHTML = '<p class="sg-txt">' + E(MSG(e)) + '</p>'; });
  }

  /* ---------- roles y permisos ---------- */
  const ROLES = {
    entrenador: 'Ve todos los clientes y su salud. Crea y cambia los planes de entrenamiento, registra pagos, emite sus facturas y da de alta clientes.',
    dietista: 'Ve todos los clientes y su salud. Crea y cambia los planes de nutrición y las recetas, registra y anula pagos y emite sus facturas.',
  };
  function hojaRoles(){
    const d = D(); if (!d) return;
    const o = abrirHoja('Roles y permisos', '<p class="sg-txt">Cargando…</p>');
    const cuerpo = enHoja(o, '.sg-cuerpo');
    function pintar(){
      Promise.all([d.registro.permisos(), d.quienSoy()]).then(function(r){
        const lista = r[0], yo = r[1];
        est.permisos = lista; est.yo = yo;
        const admin = soyAdmin();
        let h = '<div class="sg-lista">';
        lista.forEach(function(p){
          const yoMismo = p.user_id === yo;
          h += '<div class="sg-item" data-uid="' + E(p.user_id) + '"><div class="sg-item-cab"><b>' + E(p.nombre) + '</b>'
            + pillSg(p.rol === 'dietista' ? 'Dietista' : 'Entrenador', true)
            + (p.admin ? pillSg('Administrador', true) : '') + (p.activo ? '' : pillSg('Suspendido'))
            + pillSg(p.dos_pasos ? 'Dos pasos' : 'Sin dos pasos', p.dos_pasos) + '</div>'
            + '<div class="sg-peq">' + E(ROLES[p.rol] || '') + (p.admin ? ' Además administra: roles, permisos y registro de actividad.' : '') + '</div>'
            + '<div class="sg-peq">Último acceso: ' + E(fecha(p.ultimo_acceso, true)) + '</div>';
          if (admin && !yoMismo) {
            h += '<div class="sg-ctl"><label>Rol <select data-sg-rol><option value="entrenador"' + (p.rol === 'entrenador' ? ' selected' : '') + '>Entrenador</option>'
              + '<option value="dietista"' + (p.rol === 'dietista' ? ' selected' : '') + '>Dietista</option></select></label>'
              + '<label><input type="checkbox" data-sg-admin' + (p.admin ? ' checked' : '') + '> Administrador</label>'
              + '<label><input type="checkbox" data-sg-activo' + (p.activo ? ' checked' : '') + '> Acceso activo</label>'
              + '<button type="button" class="mini-btn" data-sg-guardar>Guardar</button></div><div class="picker-new-error" role="alert"></div>';
          }
          h += '</div>';
        });
        h += '</div>'
          + '<div class="sg-sub">Qué puede hacer cada rol</div>'
          + '<ul class="sg-ul"><li><b>Administrador</b> (Domingo): además de su rol, cambia los roles y permisos del equipo y ve el registro de actividad.</li>'
          + '<li><b>Entrenador</b>: ' + E(ROLES.entrenador) + '</li><li><b>Dietista</b>: ' + E(ROLES.dietista) + '</li>'
          + '<li><b>Cliente</b>: solo ve lo suyo y mientras tiene acceso: planes, registro, seguimientos, cuestionario, chat y sus facturas.</li></ul>'
          + '<p class="sg-peq">Las personas nuevas del equipo se dan de alta solo desde el panel de Supabase, por seguridad. Cada cambio de permisos queda en el registro de actividad.'
          + (admin ? '' : ' Solo el administrador puede cambiar los permisos.') + '</p>';
        cuerpo.innerHTML = h;
      }).catch(function(e){ cuerpo.innerHTML = '<p class="sg-txt">' + E(MSG(e)) + '</p>'; });
    }
    cuerpo.addEventListener('click', function(ev){
      const b = ev.target.closest('[data-sg-guardar]'); if (!b) return;
      const it = b.closest('.sg-item');
      const activo = it.querySelector('[data-sg-activo]').checked;
      if (!activo && !b.dataset.seguro) { b.dataset.seguro = '1'; b.textContent = 'Pulsa otra vez: dejará de ver los datos'; return; }
      b.disabled = true;
      d.registro.cambiarPermisos(it.dataset.uid, it.querySelector('[data-sg-rol]').value, it.querySelector('[data-sg-admin]').checked, activo)
        .then(function(){ toast('Permisos guardados'); pintar(); })
        .catch(function(e){ b.disabled = false; it.querySelector('.picker-new-error').textContent = MSG(e); });
    });
    pintar();
  }

  /* ---------- registro de actividad ---------- */
  const QUE = {
    inicio_sesion: 'Inicio de sesión', segundo_paso_superado: 'Código de dos pasos correcto', dos_pasos_activado: 'Activó la verificación en dos pasos',
    dos_pasos_desactivado: 'Quitó la verificación en dos pasos', cambio_contrasena: 'Cambió su contraseña', cuenta_borrada: 'Cuenta borrada',
    descarga_mis_datos: 'Descargó sus datos', descarga_copia_completa: 'Descargó una copia completa',
  };
  const TABLA = {
    clientes: ['Alta de cliente', 'Cambio en la ficha', 'Cliente borrado'], equipo: ['Alta en el equipo', 'Cambio de permisos', 'Baja del equipo'],
    pagos: ['Pago registrado', 'Pago cambiado', 'Pago borrado'], facturas: ['Factura emitida', 'Factura cambiada', 'Factura borrada'],
    consentimientos: ['Consentimiento', 'Consentimiento', 'Consentimiento borrado'], salud: ['Ficha de salud creada', 'Cuestionario o salud', 'Ficha de salud borrada'],
    planes_entreno: ['Plan de entreno creado', 'Plan de entreno', 'Plan de entreno borrado'], planes_nutricion: ['Plan de nutrición creado', 'Plan de nutrición', 'Plan de nutrición borrado'],
    datos_fiscales: ['Datos fiscales', 'Datos fiscales', 'Datos fiscales borrados'], config_pagos: ['Datos de cobro', 'Datos de cobro', 'Datos de cobro'],
    catalogo: ['Catálogo', 'Catálogo', 'Catálogo'], solicitudes_derechos: ['Solicitud de derecho', 'Solicitud atendida', 'Solicitud borrada'],
  };
  const ROL_TXT = { entrenador: 'entrenador', dietista: 'dietista', cliente: 'cliente', sistema: 'sistema', cuenta: 'cuenta' };
  function textoAccion(r){
    if (QUE[r.accion]) return QUE[r.accion];
    const t = TABLA[r.tabla];
    let s = t ? t[r.accion === 'alta' ? 0 : (r.accion === 'cambio' ? 1 : 2)] : (r.accion + ' · ' + (r.tabla || ''));
    if (r.tabla === 'consentimientos' && r.detalle) s += ': ' + (r.detalle.tipo || '') + ' ' + (r.detalle.estado || '');
    if (r.tabla === 'solicitudes_derechos' && r.detalle && r.detalle.tipo) s += ': ' + r.detalle.tipo;
    return s;
  }
  function textoDetalle(r){
    const out = [];
    if (r.campos && r.campos.length) out.push('Campos: ' + r.campos.join(', '));
    if (r.detalle) Object.keys(r.detalle).forEach(function(k){
      if (k === 'navegador') return;
      const v = r.detalle[k];
      if (v && typeof v === 'object' && 'antes' in v) out.push(k + ': ' + JSON.stringify(v.antes) + ' → ' + JSON.stringify(v.ahora));
      else if (k !== 'tipo' && k !== 'estado') out.push(k + ': ' + (typeof v === 'object' ? JSON.stringify(v) : v));
    });
    return out.join(' · ');
  }
  function hojaRegistro(){
    const d = D(); if (!d) return;
    const o = abrirHoja('Registro de actividad',
      '<p class="sg-peq">Quién hizo qué, cuándo y con qué rol. Nadie puede cambiarlo ni borrarlo; se vacía solo a los 2 años. De la salud se apunta qué apartado cambió, nunca su contenido.</p>'
      + '<div class="sg-filtros"><select data-sg-f="periodo"><option value="7">Últimos 7 días</option><option value="30" selected>Últimos 30 días</option><option value="365">Último año</option><option value="">Todo</option></select>'
      + '<select data-sg-f="accion"><option value="">Todo</option><option value="inicio_sesion">Inicios de sesión</option><option value="clientes">Fichas de clientes</option>'
      + '<option value="pagos">Pagos</option><option value="facturas">Facturas</option><option value="consentimientos">Consentimientos (cookies, salud, imagen)</option>'
      + '<option value="equipo">Permisos del equipo</option><option value="salud">Salud y cuestionario</option><option value="planes_entreno">Planes de entreno</option>'
      + '<option value="planes_nutricion">Planes de nutrición</option><option value="solicitudes_derechos">Derechos RGPD</option>'
      + '<option value="descarga_mis_datos">Descargas de datos</option><option value="dos_pasos_activado">Dos pasos activados</option><option value="dos_pasos_desactivado">Dos pasos quitados</option></select>'
      + '<input type="search" data-sg-f="buscar" placeholder="Buscar persona o cliente"></div>'
      + '<div class="sg-lista" data-sg-res><p class="sg-txt">Cargando…</p></div>'
      + '<button type="button" class="mini-btn" data-sg-csv>Descargar en CSV</button>');
    let filas = [];
    const res = enHoja(o, '[data-sg-res]');
    function pintar(){
      const q = (enHoja(o, '[data-sg-f="buscar"]').value || '').trim().toLowerCase();
      const vis = filas.filter(function(r){ return !q || ((r.quien_nombre || '') + ' ' + (r.cliente_nombre || '')).toLowerCase().indexOf(q) > -1; });
      if (!vis.length) { res.innerHTML = '<p class="sg-txt">No hay nada con estos filtros.</p>'; return; }
      res.innerHTML = vis.map(function(r){
        const det = textoDetalle(r);
        return '<div class="sg-reg"><div class="sg-reg-cab"><b>' + E(textoAccion(r)) + '</b><span class="sg-peq mono">' + E(fecha(r.fecha, true)) + '</span></div>'
          + '<div class="sg-peq">' + E(r.quien_nombre || (r.rol === 'sistema' ? 'Sistema / panel de Supabase' : 'Cuenta sin nombre')) + ' · ' + E(ROL_TXT[r.rol] || r.rol)
          + (r.cliente_id ? ' · cliente: ' + E(r.cliente_nombre || 'borrado') : '') + '</div>'
          + (det ? '<div class="sg-peq sg-det">' + E(det) + '</div>' : '') + '</div>';
      }).join('');
    }
    function cargar(){
      res.innerHTML = '<p class="sg-txt">Cargando…</p>';
      const dias = enHoja(o, '[data-sg-f="periodo"]').value;
      d.registro.actividad({ desde: dias ? new Date(Date.now() - dias * 864e5).toISOString() : null, accion: enHoja(o, '[data-sg-f="accion"]').value || null, limite: 1000 })
        .then(function(r){ filas = r; pintar(); })
        .catch(function(e){ res.innerHTML = '<p class="sg-txt">' + E(MSG(e)) + '</p>'; });
    }
    enHoja(o, '[data-sg-f="periodo"]').addEventListener('change', cargar);
    enHoja(o, '[data-sg-f="accion"]').addEventListener('change', cargar);
    enHoja(o, '[data-sg-f="buscar"]').addEventListener('input', pintar);
    enHoja(o, '[data-sg-csv]').addEventListener('click', function(){
      const c = function(v){ return '"' + String(v == null ? '' : v).replace(/"/g, '""').replace(/^[=+\-@]/, "'$&") + '"'; };
      const txt = ['Fecha;Qué;Quién;Rol;Cliente;Detalle'].concat(filas.map(function(r){
        return [fecha(r.fecha, true), textoAccion(r), r.quien_nombre || '', r.rol, r.cliente_nombre || '', textoDetalle(r)].map(c).join(';');
      })).join('\r\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + txt], { type: 'text/csv;charset=utf-8' }));
      a.download = 'registro-actividad-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
    });
    cargar();
  }

  /* ---------- derechos RGPD ---------- */
  const DERECHOS = [
    ['acceso', 'Acceso', 'Saber qué datos tuyos tenemos y recibir una copia.'],
    ['rectificacion', 'Rectificación', 'Corregir un dato que esté mal o incompleto.'],
    ['supresion', 'Supresión', 'Que borremos tus datos (salvo lo que la ley nos obliga a guardar, como las facturas).'],
    ['oposicion', 'Oposición', 'Que dejemos de usar tus datos para algo concreto.'],
    ['limitacion', 'Limitación', 'Que guardemos tus datos sin usarlos mientras se resuelve algo.'],
    ['portabilidad', 'Portabilidad', 'Recibir tus datos en un archivo para llevarlos a otro servicio.'],
  ];
  const NOMBRE_DER = {}; DERECHOS.forEach(function(x){ NOMBRE_DER[x[0]] = x[1]; });
  const ESTADO_TXT = { pendiente: 'Pendiente', en_curso: 'En curso', resuelta: 'Resuelta', denegada: 'Denegada' };
  function hojaDerechosCliente(){
    const d = D(); if (!d) return;
    const o = abrirHoja('Mis derechos',
      '<p class="sg-txt">La ley de protección de datos te da estos derechos. Pídelos aquí y te responderemos en el plazo de un mes como máximo.</p>'
      + '<ul class="sg-ul">' + DERECHOS.map(function(x){ return '<li><b>' + x[1] + ':</b> ' + x[2] + '</li>'; }).join('') + '</ul>'
      + '<button type="button" class="btn-eq" data-sg-descargar>Descargar mis datos ahora</button>'
      + '<form class="sg-form" data-sg-form><div class="sg-sub">Hacer una solicitud</div>'
      + '<div class="field"><label for="sgDer">Qué derecho</label><select id="sgDer">' + DERECHOS.map(function(x){ return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join('') + '</select></div>'
      + '<div class="field"><label for="sgDerTxt">Cuéntanos qué necesitas (opcional)</label><textarea id="sgDerTxt" maxlength="1000" rows="3"></textarea></div>'
      + '<div class="picker-new-error" role="alert"></div><button type="submit" class="btn-primary">Enviar solicitud</button></form>'
      + '<div class="sg-sub">Mis solicitudes</div><div class="sg-lista" data-sg-mias><p class="sg-txt">Cargando…</p></div>'
      + '<p class="sg-peq">Si crees que no hemos atendido bien tu solicitud, puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>');
    const mias = enHoja(o, '[data-sg-mias]');
    function pintar(){
      d.derechos.lista().then(function(l){
        mias.innerHTML = l.length ? l.map(function(s){
          return '<div class="sg-reg"><div class="sg-reg-cab"><b>' + E(NOMBRE_DER[s.tipo] || s.tipo) + '</b>' + pillSg(ESTADO_TXT[s.estado] || s.estado, s.estado === 'resuelta') + '</div>'
            + '<div class="sg-peq">Pedida el ' + E(fecha(s.creada)) + (s.estado === 'pendiente' || s.estado === 'en_curso' ? ' · respuesta antes del ' + E(fecha(s.plazo)) : '') + '</div>'
            + (s.detalle ? '<div class="sg-peq">' + E(s.detalle) + '</div>' : '')
            + (s.respuesta ? '<div class="sg-peq sg-det"><b>Respuesta:</b> ' + E(s.respuesta) + '</div>' : '') + '</div>';
        }).join('') : '<p class="sg-txt">Aún no has pedido nada.</p>';
      }).catch(function(e){ mias.innerHTML = '<p class="sg-txt">' + E(MSG(e)) + '</p>'; });
    }
    enHoja(o, '[data-sg-descargar]').addEventListener('click', function(){ if (typeof descargarMisDatos === 'function') descargarMisDatos(); });
    enHoja(o, '[data-sg-form]').addEventListener('submit', function(ev){
      ev.preventDefault();
      const b = this.querySelector('button[type="submit"]'); b.disabled = true;
      const err = this.querySelector('.picker-new-error'); err.textContent = '';
      d.derechos.pedir(enHoja(o, '#sgDer').value, enHoja(o, '#sgDerTxt').value).then(function(){
        enHoja(o, '#sgDerTxt').value = '';
        toast('Solicitud enviada. Te responderemos en un mes como máximo.');
        pintar(); cargarEstado(true);
      }).catch(function(e){ err.textContent = MSG(e); }).finally(function(){ b.disabled = false; });
    });
    pintar();
  }
  function nombreCliente(id){
    const k = typeof svClaveDe === 'function' ? svClaveDe(id) : null;
    return (k && clientesData[k] && clientesData[k].nombre) || 'Cliente';
  }
  function hojaDerechosEquipo(){
    const d = D(); if (!d) return;
    const o = abrirHoja('Solicitudes de derechos (RGPD)',
      '<p class="sg-peq">Lo que piden los clientes desde la app. Hay que responder en un mes (ampliable a tres en casos complejos, avisando al cliente). Para denegar, explica el motivo. Todo queda en el registro de actividad.</p>'
      + '<div class="sg-lista" data-sg-todas><p class="sg-txt">Cargando…</p></div>');
    const todas = enHoja(o, '[data-sg-todas]');
    function pintar(){
      d.derechos.lista().then(function(l){
        const hoy = new Date().toISOString().slice(0, 10);
        todas.innerHTML = l.length ? l.map(function(s){
          const abierta = s.estado === 'pendiente' || s.estado === 'en_curso';
          const vencida = abierta && s.plazo < hoy;
          return '<div class="sg-item" data-id="' + E(s.id) + '"><div class="sg-item-cab"><b>' + E(NOMBRE_DER[s.tipo] || s.tipo) + '</b> · ' + E(nombreCliente(s.cliente_id))
            + pillSg(ESTADO_TXT[s.estado] || s.estado, s.estado === 'resuelta') + (vencida ? pillSg('Plazo vencido') : '') + '</div>'
            + '<div class="sg-peq">Pedida el ' + E(fecha(s.creada)) + ' · plazo: ' + E(fecha(s.plazo)) + (s.resuelta_en ? ' · cerrada el ' + E(fecha(s.resuelta_en)) : '') + '</div>'
            + (s.detalle ? '<div class="sg-peq">«' + E(s.detalle) + '»</div>' : '')
            + '<div class="sg-ctl"><select data-sg-estado>' + Object.keys(ESTADO_TXT).map(function(k){ return '<option value="' + k + '"' + (s.estado === k ? ' selected' : '') + '>' + ESTADO_TXT[k] + '</option>'; }).join('') + '</select>'
            + '<textarea data-sg-resp maxlength="1000" rows="2" placeholder="Respuesta para el cliente">' + E(s.respuesta || '') + '</textarea>'
            + '<button type="button" class="mini-btn" data-sg-responder>Guardar</button></div><div class="picker-new-error" role="alert"></div></div>';
        }).join('') : '<p class="sg-txt">No hay solicitudes.</p>';
      }).catch(function(e){ todas.innerHTML = '<p class="sg-txt">' + E(MSG(e)) + '</p>'; });
    }
    todas.addEventListener('click', function(ev){
      const b = ev.target.closest('[data-sg-responder]'); if (!b) return;
      const it = b.closest('.sg-item'); b.disabled = true;
      d.derechos.responder(it.dataset.id, it.querySelector('[data-sg-estado]').value, it.querySelector('[data-sg-resp]').value)
        .then(function(){ toast('Solicitud guardada'); pintar(); cargarEstado(true); })
        .catch(function(e){ b.disabled = false; it.querySelector('.picker-new-error').textContent = MSG(e); });
    });
    pintar();
  }

  /* ---------- clics en Ajustes ---------- */
  const ACCIONES = { 'dos-pasos': hojaDosPasos, roles: hojaRoles, registro: hojaRegistro, derechos: hojaDerechosCliente, 'derechos-equipo': hojaDerechosEquipo };
  function alPulsar(ev){
    const f = ev.target.closest('[data-sg]');
    if (!f || !ACCIONES[f.dataset.sg]) return;
    if (ev.type === 'keydown' && ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    ACCIONES[f.dataset.sg]();
  }
  document.addEventListener('click', alPulsar);
  document.addEventListener('keydown', alPulsar);

  /* ---------- cookies: la elección se guarda también en el servidor ---------- */
  function sincronizarCookies(){
    const d = D();
    if (!d || typeof consentActual !== 'function' || typeof consentVigente !== 'function') return;
    const c = consentActual();
    if (!consentVigente(c)) return;
    d.quienSoy().then(function(uid){
      if (!uid || c.sv === uid) return;
      return d.consentimientos.registrar('cookies', c.pref ? 'dado' : 'retirado', POLICY_V).then(function(){
        c.sv = uid;                                   // ya está en el servidor para esta cuenta
        try { localStorage.setItem(CONSENT_KEY, JSON.stringify(c)); } catch(e){}
      });
    }).catch(function(){ /* sin conexión o sin acceso: se intentará la próxima vez */ });
  }
  if (typeof guardarConsent === 'function') guardarConsent = (function(orig){
    return function(){ const r = orig.apply(this, arguments); sincronizarCookies(); return r; };
  })(guardarConsent);
  ['fsd:pro-dentro', 'fsd:cliente-dentro', 'fsd:servidor-listo'].forEach(function(n){
    window.addEventListener(n, function(){ setTimeout(sincronizarCookies, 1500); est.hora = 0; });
  });

  /* ---------- las descargas de datos quedan apuntadas ---------- */
  if (typeof descargarMisDatos === 'function') descargarMisDatos = (function(orig){
    return function(){ const r = orig.apply(this, arguments); const d = D(); if (d) d.registro.apuntarDescarga('mis_datos'); return r; };
  })(descargarMisDatos);
  if (typeof descargarCopiaCompleta === 'function') descargarCopiaCompleta = (function(orig){
    return function(){ const r = orig.apply(this, arguments); const d = D(); if (d) d.registro.apuntarDescarga('copia_completa'); return r; };
  })(descargarCopiaCompleta);

  /* ---------- el equipo se entera de las solicitudes nuevas ---------- */
  let escuchando = null;
  window.addEventListener('fsd:pro-dentro', function(){
    const d = D(); if (!d || escuchando) return;
    let antes = null;
    const mirar = function(){
      d.derechos.lista().then(function(l){
        const abiertas = l.filter(function(s){ return s.estado === 'pendiente'; }).length;
        if (antes !== null && abiertas > antes) toast('Nueva solicitud de derechos de un cliente: mírala en Ajustes → Seguridad');
        antes = abiertas; est.pendientes = l.filter(function(s){ return s.estado === 'pendiente' || s.estado === 'en_curso'; }).length;
        if (typeof refrescarAjustes === 'function') refrescarAjustes();
      }).catch(function(){});
    };
    try { escuchando = d.derechos.escuchar(mirar); } catch(e){}
    mirar();
  });
})();
