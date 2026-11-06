/* =========================================================
   Fitnessindramas — Modo servidor · pagos y bajas (paso 7, 5/11/2026)
   Solo en modo servidor (?servidor=pruebas). Se carga después de servidor-perfiles.js.

   · Registrar un pago (con su importe y cómo se pagó) se guarda en el servidor, que amplía
     solo el «pagado hasta». Lo veis los dos al momento; el cliente, también.
   · Tarifa, precio y «pagado hasta» se cambian en el servidor.
   · El acceso lo decide el servidor: hasta «pagado hasta» y 7 días de margen para pagar.
     Ya no hay «Denegar / Permitir acceso» a mano: para quitarlo, se da de baja; para darlo,
     se cambia «pagado hasta» en la tarifa.
   · Baja: el cliente pierde el acceso al momento y, si no se reactiva en 15 días, el servidor
     borra su ficha (decisión de Domingo, 5/11/2026). Las facturas se conservan.
   · Reactivar: vuelve como mínimo en el margen de pago, para que registréis su pago.
   · Bizum, transferencia y enlace de pago se guardan en el servidor (los ven los clientes
     con acceso). Las facturas con el servidor llegan en el paso siguiente.
   ========================================================= */
const SV_PG = { equipo: null, metodo: 'bizum', ocupado: false };
const SV_PG_BAJA_DIAS = 15;
function svPgSesion(){ return svActivo() && !!window.fsdDatos && (!!coachActivo || !!window.fsdSesionCliente); }
function svPgNombre(uid){
  const e = (SV_PG.equipo || []).filter(function(x){ return x.user_id === uid; })[0];
  return e ? e.nombre : '';
}
function svPgFechaBorrado(d){ return d && d.baja && d.baja.fecha ? mjSumarDias(String(d.baja.fecha).slice(0, 10), SV_PG_BAJA_DIAS) : null; }

/* ---------- del servidor a la app ---------- */
function svPgAPago(r){
  const p = { id: r.id, fecha: r.fecha, importe: r.importe == null ? null : Number(r.importe), desde: r.periodo_desde || null,
    hasta: r.periodo_hasta || null, metodo: r.metodo, por: svPgNombre(r.registrado_por), nota: r.nota || '', svFactura: !!r.factura_id, facturaId: r.factura_id || null };
  if (r.anulado) p.anulado = { fecha: r.anulado, por: svPgNombre(r.anulado_por), motivo: r.anulado_motivo || '' };
  return p;
}
/* los anulados se guardan aparte: no cuentan para nada (cobrado, facturas…), solo se ven en el historial */
function svPgRepartir(t, lista){
  t.pagos = lista.filter(function(p){ return !p.anulado; });
  t.pagosAnulados = lista.filter(function(p){ return !!p.anulado; });
}
function svPgPonerPagos(filas){
  const por = {};
  filas.forEach(function(r){ (por[r.cliente_id] = por[r.cliente_id] || []).push(svPgAPago(r)); });
  Object.keys(clientesData).forEach(function(k){
    const d = clientesData[k]; if (!d || !d.sid) return;
    d.tarifa = d.tarifa || { tipo: 'ninguna', acceso: 'auto' };
    svPgRepartir(d.tarifa, por[d.sid] || []);
  });
}
/* 3 días antes de que el servidor borre una ficha, aviso en la campana de Domingo y Fátima */
function svPgAvisosBorrado(){
  if (!coachActivo) return;
  const hoy = mjISO(new Date());
  Object.keys(clientesData).forEach(function(k){
    const d = clientesData[k]; if (!d || !d.sid) return;
    const b = d.baja ? null : (typeof pgBorrado === 'function' ? pgBorrado(d) : null);
    const fecha = d.baja ? svPgFechaBorrado(d) : (b && b.fecha);
    if (!fecha) return;
    const dias = mjDias(hoy, fecha);
    if (dias < 0 || dias > 3) return;
    if (typeof tocaAvisarUnaVez === 'function' && !tocaAvisarUnaVez('sv-borrado|' + d.sid + '|' + fecha)) return;
    try {
      avisarPros('pendientes', d.nombre + ': su ficha se borrará el ' + mjFecha(fecha),
        d.baja ? 'Está de baja desde el ' + mjFecha(String(d.baja.fecha).slice(0, 10)) + '. Si vuelve, reactívalo antes.'
               : 'Lleva sin pagar desde el ' + mjFecha(d.tarifa.hasta) + '. Registra el pago o descarga sus datos antes.',
        { cliente: k, vista: 'ficha' });
    } catch(e){}
  });
}
function svPgPonerDatos(c){
  if (!c) return;
  const b = Array.isArray(c.bizum) ? c.bizum : [];
  mjGuardarCfgPagos(Object.assign(mjCfgPagos(), {
    auto: true, bizum1: b[0] || '', bizum2: b[1] || '', iban: c.iban || '', titular: c.titular || '', banco: c.banco || '', enlace: c.enlace || ''
  }));
}
let svPgRepT = null;
function svPgRepintar(){
  clearTimeout(svPgRepT);
  svPgRepT = setTimeout(function(){
    const v = typeof pantallaVisible === 'function' ? pantallaVisible() : '';
    try { if (v === 'view-coach-cliente') pintarSuscripcionFicha(); } catch(e){}
    try { if (v === 'view-coach-pagos' || document.getElementById('view-coach-pagos').classList.contains('esc-izq')) pintarPagosPro(); } catch(e){}
    try { actualizarPanel(); } catch(e){}
    try { if (coachActivo && capaVisible('prPagos')) verPagos(); } catch(e){}
    try { if (window.fsdSesionCliente) { mjBannerPago(); if (v === 'view-ajustes' && typeof renderAjustes === 'function') renderAjustes('cliente'); } } catch(e){}
  }, 120);
}

/* equipo: todos los pagos y los datos de pago, cada vez que llega la lista de clientes */
let svPgTrayendo = null;
function svPgTraerEquipo(){
  if (!svPgSesion() || !coachActivo) return Promise.resolve();
  if (svPgTrayendo) return svPgTrayendo;
  svPgTrayendo = svCargar().then(function(x){
    return Promise.all([
      SV_PG.equipo ? null : x.chat.equipo().then(function(e){ SV_PG.equipo = e; }, function(){}),
    ]).then(function(){ return Promise.all([x.pagos.lista(), x.pagos.datos().catch(function(){ return null; })]); });
  }).then(function(r){
    svPgPonerPagos(r[0]); svPgPonerDatos(r[1]);
    guardarTodo(); svPgRepintar(); svPgAvisosBorrado();
  }).catch(function(e){
    try { toast(svMensaje(e, 'No se han podido traer los pagos del servidor')); } catch(_){}
  }).finally(function(){ svPgTrayendo = null; });
  return svPgTrayendo;
}

/* cliente: su ficha (acceso al día), sus pagos y cómo pagar; si ya no tiene acceso, fuera */
let svPgDejarCli = null, svPgCliT = null;
function svPgTraerCliente(){
  if (!svPgSesion() || !window.fsdSesionCliente || coachActivo) return Promise.resolve();
  return svCargar().then(function(x){
    return x.clientes.miFicha().then(function(f){
      if (!f) { svPgParar(); svEcharCliente(); return; }
      const k = svAsegurarFicha(f);
      return Promise.all([
        SV_PG.equipo ? null : x.chat.equipo().then(function(e){ SV_PG.equipo = e; }, function(){}),
      ]).then(function(){ return Promise.all([x.pagos.lista(f.id), x.pagos.datos().catch(function(){ return null; })]); })
        .then(function(r){
          if (clientesData[k]) svPgRepartir(clientesData[k].tarifa, r[0].map(svPgAPago));
          svPgPonerDatos(r[1]);
          guardarTodo(); svPgRepintar();
        });
    });
  }).catch(function(){});
}
function svPgEscucharCliente(){
  if (svPgDejarCli || !window.fsdSesionCliente || coachActivo) return;
  svCargar().then(function(x){
    if (svPgDejarCli || !window.fsdSesionCliente) return;
    svPgDejarCli = x.clientes.escuchar(function(){ clearTimeout(svPgCliT); svPgCliT = setTimeout(svPgTraerCliente, 300); });
  }).catch(function(){});
}
function svPgParar(){
  if (svPgDejarCli) { try { svPgDejarCli(); } catch(e){} svPgDejarCli = null; }
  SV_PG.equipo = null;
}

/* =========================================================
   ENGANCHES (solo en modo servidor)
   ========================================================= */
if (svActivo()) {
  /* la ficha trae también la baja; el acceso siempre lo decide el servidor */
  svAFicha = (function(orig){
    return function(r, d){
      const res = orig.apply(this, arguments);
      if (r.estado === 'baja') d.baja = { fecha: (r.baja && r.baja.fecha) || new Date().toISOString(), motivo: (r.baja && r.baja.motivo) || '' };
      else delete d.baja;
      if (d.tarifa) d.tarifa.acceso = 'auto';
      return res;
    };
  })(svAFicha);
  mjCfgPagos = (function(orig){ return function(){ const c = orig.apply(this, arguments); c.auto = true; return c; }; })(mjCfgPagos);

  /* el borrado lo hace el servidor (no la app al abrirla) */
  if (typeof pgRevisarBorrados === 'function') pgRevisarBorrados = function(){};
  estadoPago = (function(orig){
    return function(d){
      const r = orig.apply(this, arguments);
      if (r && r.baja) { const f = svPgFechaBorrado(d); if (f) r.txt += ' · se borra el ' + mjFecha(f); }
      return r;
    };
  })(estadoPago);

  /* ---------- registrar un pago ---------- */
  pedirPago = (function(orig){
    return function(){
      const r = orig.apply(this, arguments);
      const imp = document.getElementById('mjPgImp');
      if (imp) {
        imp.placeholder = 'Obligatorio';
        const campo = imp.closest('.field');
        if (campo && !document.getElementById('svPgMet')) {
          SV_PG.metodo = 'bizum';
          campo.insertAdjacentHTML('beforebegin', '<div class="section-lbl">¿Cómo ha pagado?</div><div class="chips" id="svPgMet">'
            + [['bizum', 'Bizum'], ['transferencia', 'Transferencia'], ['efectivo', 'Efectivo'], ['otro', 'Otro']].map(function(m){
                return '<button type="button" class="chip protein' + (m[0] === SV_PG.metodo ? ' selected' : '') + '" data-v="' + m[0] + '" onclick="svPgMetodo(\'' + m[0] + '\')">' + m[1] + '</button>'; }).join('')
            + '</div>');
        }
      }
      return r;
    };
  })(pedirPago);
  window.svPgMetodo = function(m){
    SV_PG.metodo = m;
    Array.prototype.forEach.call(document.querySelectorAll('#svPgMet .chip'), function(c){ c.classList.toggle('selected', c.dataset.v === m); });
  };

  confirmarPago = function(){
    const k = clienteActual, d = clientesData[k], t = d && d.tarifa;
    if (!d || !d.sid || !t || SV_PG.ocupado) return;
    const dur = mjPagoLeer(); if (!dur) return;
    const imp = mjNum((document.getElementById('mjPgImp') || {}).value);
    if (!(imp > 0)) { toast('Escribe el importe del pago'); const i = document.getElementById('mjPgImp'); if (i) i.focus(); return; }
    const hoy = mjISO(new Date()), desde = mjBasePago(d), hasta = mjHastaPago(d, dur);
    if (mjDias(hoy, hasta) > 400) { toast('Como mucho se puede dejar pagado hasta el ' + mjFecha(mjSumarDias(hoy, 400))); return; }
    const nuevoTipo = mjPagoDur && mjPagoDur.tipo !== 'otro' && mjPagoDur.tipo !== t.tipo ? mjPagoDur.tipo : null;
    const btn = document.getElementById('mjPgOk'), txt = btn ? btn.textContent : '';
    SV_PG.ocupado = true;
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
    svCargar().then(function(x){
      return x.pagos.registrar({ clienteId: d.sid, importe: imp, metodo: SV_PG.metodo, desde: desde, hasta: hasta });
    }).then(function(fila){
      mjCerrarHoja('mjPago');
      t.hasta = hasta > (t.hasta || '') ? hasta : t.hasta;
      t.pagos = (t.pagos || []).concat([svPgAPago(fila)]);
      guardarTodo(); pintarSuscripcionFicha(); actualizarPanel();
      toast('Pago registrado · hasta el ' + mjFecha(t.hasta));
      svSincronizar();
      if (nuevoTipo) {
        abrirDialogo({ titulo: '¿Cambiar su tarifa a ' + MJ_TARIFAS[nuevoTipo].n.toLowerCase() + '?',
          texto: d.nombre + ' tiene tarifa ' + (MJ_TARIFAS[t.tipo] ? MJ_TARIFAS[t.tipo].n.toLowerCase() : 'sin tarifa') + '. Si la cambias, los próximos pagos se propondrán como ' + MJ_TARIFAS[nuevoTipo].n.toLowerCase() + ' y el precio pasará a ' + mjEuros(imp) + '.',
          ok: 'Cambiar tarifa', cancel: 'Dejarla igual',
          onOk: function(){
            svCargar().then(function(x){ return x.pagos.tarifa(d.sid, { tarifa: nuevoTipo, precio: imp }); })
              .then(function(){ toast('Tarifa cambiada'); svSincronizar(); })
              .catch(function(e){ toast(svMensaje(e, 'No se ha podido cambiar la tarifa')); });
          } });
      }
    }).catch(function(e){
      toast(svMensaje(e, 'No se ha podido registrar el pago'));
    }).finally(function(){
      SV_PG.ocupado = false;
      if (btn) { btn.disabled = false; btn.textContent = txt; }
    });
  };

  /* ---------- tarifa, precio y «pagado hasta» ---------- */
  guardarTarifa = (function(orig){
    return function(){
      const k = clienteActual, d = clientesData[k], o = document.getElementById('mjTarifa');
      if (!d || !d.sid || !o || SV_PG.ocupado) return;
      const c = o.querySelector('[data-grupo="tar"] .chip.selected');
      const tipo = c ? c.dataset.v : 'ninguna';
      const precio = mjNum((document.getElementById('mjTfPre') || {}).value);
      const hasta = (document.getElementById('mjTfHasta') || {}).value || mjISO(new Date());
      const hoy = mjISO(new Date());
      if (Math.abs(mjDias(hoy, hasta)) > 400) { toast('«Pagado hasta» tiene que estar dentro de un año, más o menos'); return; }
      if (precio != null && !(precio >= 0 && precio < 100000)) { toast('Revisa el precio'); return; }
      SV_PG.ocupado = true;
      const yo = this, args = arguments;
      svCargar().then(function(x){ return x.pagos.tarifa(d.sid, { tarifa: tipo, precio: precio, hasta: hasta }); })
        .then(function(){ orig.apply(yo, args); svSincronizar(); })
        .catch(function(e){ toast(svMensaje(e, 'No se ha podido guardar la tarifa')); })
        .finally(function(){ SV_PG.ocupado = false; });
    };
  })(guardarTarifa);

  /* ---------- el acceso no se toca a mano: va con «pagado hasta» ---------- */
  cambiarAcceso = function(){
    toast('Con el servidor, el acceso va con «Pagado hasta»: para quitarlo, da de baja; para darlo, cambia la tarifa');
  };
  pintarSuscripcionFicha = (function(orig){
    return function(){
      const r = orig.apply(this, arguments);
      const d = clienteActual && clientesData[clienteActual], box = document.getElementById('fichaPago');
      if (!d || !box) return r;
      Array.prototype.forEach.call(box.querySelectorAll('button[onclick^="cambiarAcceso"]'), function(b){ b.remove(); });
      Array.prototype.forEach.call(box.querySelectorAll('.pg-nota'), function(n){ if (/modo automático/.test(n.textContent)) n.remove(); });
      const grupo = box.querySelector('.list-group'); if (!grupo) return r;
      Array.prototype.forEach.call(grupo.querySelectorAll('.list-row'), function(f){
        const v = f.querySelector('.ajx-val');
        if (v && v.textContent === 'Conserva sus datos') v.textContent = 'Se borra a los 15 días';
      });
      const f = svPgFechaBorrado(d);
      if (f && !box.querySelector('.sv-pg-borra')) {
        const n = document.createElement('div'); n.className = 'pg-nota sv-pg-borra';
        n.innerHTML = '🗑️ Si no lo reactivas, su ficha se borrará el <b>' + mjFecha(f) + '</b> (plan, seguimientos, chat y fotos). Las facturas se conservan.';
        grupo.parentNode.insertBefore(n, grupo.nextSibling);
      }
      if (!d.baja && !box.querySelector('.sv-pg-acceso')) {
        const n = document.createElement('div'); n.className = 'pg-nota sv-pg-acceso';
        n.textContent = 'Tiene acceso hasta «Pagado hasta» y 7 días más para pagar. Si no paga, 15 días después se borra su ficha.';
        grupo.parentNode.insertBefore(n, grupo.nextSibling);
      }
      return r;
    };
  })(pintarSuscripcionFicha);

  /* ---------- baja y reactivar ---------- */
  darDeBaja = (function(orig){
    return function(){
      const r = orig.apply(this, arguments);
      const p = document.querySelector('#mjBaja .fsd-sheet > p');
      if (p) p.textContent = 'Perderá el acceso a la app al momento y no recibirá avisos de pago. Si no lo reactivas en 15 días, su ficha se borra (plan, seguimientos, chat y fotos); las facturas se conservan.';
      return r;
    };
  })(darDeBaja);
  confirmarBaja = function(){
    const k = clienteActual, d = clientesData[k];
    if (!d || !d.sid || SV_PG.ocupado) return;
    const motivo = ((document.getElementById('mjBjMot') || {}).value || '').trim().slice(0, 120);
    SV_PG.ocupado = true;
    svCargar().then(function(x){ return x.pagos.baja(d.sid, motivo); }).then(function(){
      mjCerrarHoja('mjBaja');
      d.baja = { fecha: new Date().toISOString(), motivo: motivo };
      guardarTodo(); pintarSuscripcionFicha(); actualizarPanel();
      toast(d.nombre + ' está de baja');
      svSincronizar();
    }).catch(function(e){ toast(svMensaje(e, 'No se ha podido dar de baja')); })
      .finally(function(){ SV_PG.ocupado = false; });
  };
  reactivarCliente = function(){
    const k = clienteActual, d = clientesData[k];
    if (!d || !d.sid || SV_PG.ocupado) return;
    SV_PG.ocupado = true;
    svCargar().then(function(x){ return x.pagos.reactivar(d.sid); }).then(function(){
      delete d.baja;
      guardarTodo(); pintarSuscripcionFicha(); actualizarPanel();
      toast(d.nombre + ' vuelve a estar activo. Si no tenía pagado, está en el periodo para pagar: registra su pago.');
      svSincronizar();
    }).catch(function(e){ toast(svMensaje(e, 'No se ha podido reactivar')); })
      .finally(function(){ SV_PG.ocupado = false; });
  };

  /* ---------- Bizum, transferencia y enlace de pago ---------- */
  function svPgSubirDatos(){
    const c = mjCfgPagos();
    return svCargar().then(function(x){
      return x.pagos.guardarDatos({ bizum: [c.bizum1, c.bizum2], iban: c.iban, titular: c.titular, banco: c.banco, enlace: c.enlace });
    }).catch(function(e){
      toast(svMensaje(e, 'No se han podido guardar en el servidor'));
      svPgTraerEquipo();
    });
  }
  prGuardarDatosPago = (function(orig){
    return function(){
      const antes = JSON.stringify(mjCfgPagos());
      const r = orig.apply(this, arguments);
      if (coachActivo && JSON.stringify(mjCfgPagos()) !== antes) svPgSubirDatos();
      return r;
    };
  })(prGuardarDatosPago);
  mjGuardarEnlace = (function(orig){
    return function(){
      const antes = mjCfgPagos().enlace;
      const r = orig.apply(this, arguments);
      if (coachActivo && mjCfgPagos().enlace !== antes) svPgSubirDatos();
      return r;
    };
  })(mjGuardarEnlace);
  /* Ajustes: sin el interruptor de «quitar el acceso» (lo hace siempre el servidor) */
  htmlAjustes = (function(orig){
    return function(rol){
      let h = orig.apply(this, arguments);
      if (rol === 'cliente') return h;
      h = h.replace(/<div class="list-row"><span>Quitar el acceso al acabar la gracia \(7 días\)<\/span><div class="toggle[^"]*"[^>]*><div class="toggle-knob"><\/div><\/div><\/div>/, '');
      h = h.replace('Al acabar la gracia se quedan sin acceso hasta que registres el pago.', 'Al acabar la gracia se quedan sin acceso hasta que registres el pago y, 15 días después, el servidor borra su ficha.');
      h = h.replace('Se guardan en este dispositivo y en la copia de seguridad, no en el código de la app.', 'Se guardan en el servidor, no en el código de la app.');
      return h;
    };
  })(htmlAjustes);
  prEditarDatosPago = (function(orig){
    return function(){
      const r = orig.apply(this, arguments);
      const n = document.querySelector('#prPago .ajx-note');
      if (n) n.textContent = 'Los clientes los ven en «¿Cómo renovar?» cuando su tarifa está a punto de vencer, vencida o en gracia, con el concepto ya escrito. Se guardan en el servidor (los ven solo el equipo y los clientes con acceso), no en el código de la app.';
      return r;
    };
  })(prEditarDatosPago);

  /* ---------- historial de pagos: con «Anular» (si no tiene factura) y los anulados a la vista ---------- */
  const SV_PG_METODO = { bizum: 'Bizum', transferencia: 'Transferencia', efectivo: 'Efectivo', otro: 'Otro' };
  verPagos = function(){
    const k = clienteActual, d = clientesData[k], t = d && d.tarifa;
    if (!d) return;
    const fila = function(p, anulado){
      const det = [p.hasta ? 'Hasta el ' + mjFecha(p.hasta) : '', SV_PG_METODO[p.metodo] || '', p.por || ''].filter(Boolean).join(' · ');
      return '<div class="list-row sv-pg-fila' + (anulado ? ' anulado' : '') + '" style="cursor:default"><span><span class="sv-pg-imp">' + mjFecha(p.fecha) + ' · <b>' + mjEuros(p.importe) + '</b></span>'
        + '<small class="nu-pl-res">' + esc(det) + (anulado ? '<br>Anulado' + (p.anulado.por ? ' por ' + esc(p.anulado.por) : '') + ' el ' + mjFecha(String(p.anulado.fecha).slice(0, 10)) + ': ' + esc(p.anulado.motivo) : '') + '</small></span>'
        + '<span class="ajx-acts">' + (anulado ? '<span class="pill">Anulado</span>' : (p.svFactura ? '<button class="mini-btn" onclick="svFcDescargar(\'' + esc(p.facturaId) + '\')">⬇ Factura</button>'
          : '<button class="mini-btn" onclick="svPgPedirAnular(\'' + esc(p.id) + '\')">Anular</button>')) + '</span></div>';
    };
    const lista = (t && t.pagos || []).slice().reverse(), anul = (t && t.pagosAnulados || []).slice().reverse();
    const o = mjHoja('prPagos');
    o.innerHTML = '<div class="fsd-sheet"><div class="sheet-head"><h3>Pagos de ' + esc(d.nombre) + '</h3><button class="x-btn" onclick="mjCerrarHoja(\'prPagos\')" aria-label="Cerrar">×</button></div>'
      + (lista.length ? '<div class="list-group">' + lista.map(function(p){ return fila(p, false); }).join('') + '</div>' : '<p class="ajx-note">Todavía no hay pagos registrados.</p>')
      + (anul.length ? '<div class="alta-label">Anulados</div><div class="list-group">' + anul.map(function(p){ return fila(p, true); }).join('') + '</div>' : '')
      + '<p class="ajx-note">Si apuntaste un pago por error, «Anular» lo deja tachado con el motivo y «pagado hasta» vuelve a como estaba. Un pago con factura no se anula.</p></div>';
    o.classList.add('show');
  };
  window.svPgPedirAnular = function(id){
    const d = clientesData[clienteActual], p = d && d.tarifa && (d.tarifa.pagos || []).filter(function(x){ return x.id === id; })[0];
    if (!p) return;
    const o = mjHoja('svPgAnular');
    o.innerHTML = '<div class="fsd-sheet dlg"><h3>Anular pago</h3>'
      + '<p>Pago del ' + mjFecha(p.fecha) + ' de <b>' + mjEuros(p.importe) + '</b>' + (p.hasta ? ' (hasta el ' + mjFecha(p.hasta) + ')' : '') + '. No se borra: queda tachado en el historial con el motivo, y «pagado hasta» vuelve a como estaba antes de este pago.</p>'
      + '<div class="field"><label for="svPgMot">Motivo</label><input type="text" id="svPgMot" maxlength="200" placeholder="Apuntado dos veces, importe equivocado…"></div>'
      + '<div class="btn-row"><button class="btn-eq" onclick="mjCerrarHoja(\'svPgAnular\')">Cancelar</button><button class="btn-eq danger" id="svPgAnOk" onclick="svPgAnular(\'' + esc(id) + '\')">Anular pago</button></div></div>';
    o.classList.add('show');
    setTimeout(function(){ const i = document.getElementById('svPgMot'); if (i) i.focus(); }, 60);
  };
  window.svPgAnular = function(id){
    const motivo = ((document.getElementById('svPgMot') || {}).value || '').trim();
    if (!motivo) { toast('Escribe por qué se anula'); return; }
    if (SV_PG.ocupado) return;
    const b = document.getElementById('svPgAnOk'); if (b) b.disabled = true;
    SV_PG.ocupado = true;
    svCargar().then(function(x){ return x.pagos.anular(id, motivo); }).then(function(){
      mjCerrarHoja('svPgAnular');
      toast('Pago anulado');
      svSincronizar();
    }).catch(function(e){ toast(svMensaje(e, 'No se ha podido anular el pago')); })
      .finally(function(){ SV_PG.ocupado = false; if (b) b.disabled = false; });
  };
  atrasDentroApp = (function(orig){ return function(){ if (capaVisible('svPgAnular')) { mjCerrarHoja('svPgAnular'); return true; } return orig(); }; })(atrasDentroApp);

  /* ---------- facturas: llegan en el paso siguiente ---------- */
  ['prFactura', 'fcFacturarTodos', 'fcCrearDesdeForm', 'prImprimirFactura'].forEach(function(n){
    if (typeof window[n] === 'function') window[n] = function(){ toast('Con el servidor, las facturas llegan en el siguiente paso'); };
  });

  window.addEventListener('fsd:lista-servidor', svPgTraerEquipo);
  window.addEventListener('fsd:cliente-dentro', function(){ svPgTraerCliente(); svPgEscucharCliente(); });
  window.addEventListener('fsd:al-volver', function(){ if (window.fsdSesionCliente && !coachActivo) svPgTraerCliente(); });
  window.addEventListener('fsd:sesion-fuera', svPgParar);
}

if (svActivo()) {
  (function(){
    const s = document.createElement('style');
    s.textContent = '#svPgMet{margin-bottom:14px}'
      + '.sv-pg-fila > span:first-child{display:flex;flex-direction:column;align-items:flex-start;text-align:left;gap:2px;min-width:0;flex:1}'
      + '.sv-pg-fila .nu-pl-res{display:block;margin:0}'
      + '.sv-pg-fila.anulado .sv-pg-imp{text-decoration:line-through;opacity:.6}';
    document.head.appendChild(s);
  })();
}

/* =========================================================
   Clientes de baja fuera de los paneles de trabajo (pedido por Domingo, 6/11/2026)
   En cualquier modo. Mientras se pinta un panel de trabajo (Clientes, Seguimientos, Chats,
   Rutinas, avatares, contadores…), los clientes de baja se apartan un momento de la lista y
   después vuelven en el mismo orden. Siguen en Pagos (filtro «Bajas») y en su propia ficha.
   Si mientras tanto se guarda, se guardan también ellos (no se pierde nada).
   ========================================================= */
let svSbFuera = null;
function svSinBajas(fn){
  return function(){
    if (svSbFuera || typeof mjEsBaja !== 'function') return fn.apply(this, arguments);
    const orden = Object.keys(clientesData), fuera = {};
    const fichaAbierta = typeof pantallaVisible === 'function' && pantallaVisible() === 'view-coach-cliente';
    orden.forEach(function(k){
      if (mjEsBaja(clientesData[k]) && !(fichaAbierta && k === clienteActual)) { fuera[k] = clientesData[k]; delete clientesData[k]; }
    });
    if (!Object.keys(fuera).length) return fn.apply(this, arguments);
    svSbFuera = fuera;
    try { return fn.apply(this, arguments); }
    finally {
      svSbFuera = null;
      const ahora = {};
      Object.keys(clientesData).forEach(function(k){ ahora[k] = clientesData[k]; delete clientesData[k]; });
      orden.forEach(function(k){
        if (Object.prototype.hasOwnProperty.call(ahora, k)) { clientesData[k] = ahora[k]; delete ahora[k]; }
        else if (Object.prototype.hasOwnProperty.call(fuera, k)) clientesData[k] = fuera[k];
      });
      Object.keys(ahora).forEach(function(k){ clientesData[k] = ahora[k]; });      // altas hechas mientras tanto
    }
  };
}
/* guardar mientras están apartados: se guardan con todos */
guardarTodo = (function(orig){
  return function(){
    const f = svSbFuera; if (!f) return orig.apply(this, arguments);
    const puestos = Object.keys(f).filter(function(k){ return !clientesData[k]; });
    puestos.forEach(function(k){ clientesData[k] = f[k]; });
    try { return orig.apply(this, arguments); } finally { puestos.forEach(function(k){ delete clientesData[k]; }); }
  };
})(guardarTodo);
['actualizarPanel', 'pintarListaClientes', 'pintarSegsResumen', 'datosChats', 'pintarChatsPro', 'pintarBadgeChats',
 'totalSinLeer', 'escMarcarElegido', 'clMarcarEnLista', 'exPintarFiltros', 'rutPintarLista', 'pintarAvatares', 'mtAplicar'].forEach(function(n){
  if (typeof window[n] === 'function') window[n] = svSinBajas(window[n]);
});
