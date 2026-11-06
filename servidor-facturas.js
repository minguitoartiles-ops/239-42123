/* =========================================================
   Fitnessindramas — Modo servidor · facturas (paso 8, 6/11/2026)
   Solo en modo servidor (?servidor=pruebas). Se carga después de servidor-pagos.js.

   · Fátima → cliente: una factura por pago con el 7 % de IGIC incluido en el precio
     (Pagos → Facturas → «Facturar»). Su numeración sigue la suya.
   · Domingo → Fátima: una al mes, por el 50 % de lo que pagaron los clientes ese mes,
     exenta de IGIC (franquicia fiscal) y con un 15 % de retención. Solo meses cerrados.
     Su numeración sigue desde la 11.
   · Los números, el IGIC y la retención los calcula el servidor; la app solo los enseña.
   · Datos de facturación (nombre, NIF, domicilio) en el servidor: los veis los dos y cada
     uno cambia los suyos. Cada factura guarda una copia de los de entonces.
   · El cliente ve y descarga sus facturas en Ajustes.
   · El PDF se hace aquí, con el diseño de siempre.
   ========================================================= */
const SV_FC = { facturas: [], datos: [], num: null, yo: null, ocupado: false };
const SV_FC_MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function svFcSesion(){ return svActivo() && !!window.fsdDatos && (!!coachActivo || !!window.fsdSesionCliente); }
function svFcRol(){ return coachActivo ? coachActivo.rol : null; }
function svFcMes(ym){ const p = String(ym).split('-'); return SV_FC_MESES[+p[1] - 1] + ' de ' + p[0]; }
function svFcMios(){ return SV_FC.datos.filter(function(x){ return x.user_id === SV_FC.yo; })[0] || null; }
function svFcRedondear(n){ return Math.round(n * 100) / 100; }

/* ---------- traer ---------- */
let svFcTrayendo = null, svFcDejar = null;
function svFcTraer(){
  if (!svFcSesion()) return Promise.resolve();
  if (svFcTrayendo) return svFcTrayendo;
  svFcTrayendo = svCargar().then(function(x){
    const equipo = !!coachActivo;
    return Promise.all([
      x.facturas.lista(),
      equipo ? x.facturas.datosFiscales() : [],
      equipo ? x.facturas.numeracion() : null,
      SV_FC.yo ? SV_FC.yo : x.chat.yo(),
    ]);
  }).then(function(r){
    SV_FC.facturas = r[0]; SV_FC.datos = r[1]; SV_FC.num = r[2]; SV_FC.yo = r[3];
    svFcRepintar();
  }).catch(function(){}).finally(function(){ svFcTrayendo = null; });
  return svFcTrayendo;
}
function svFcEscuchar(){
  if (svFcDejar || !coachActivo) return;
  svCargar().then(function(x){
    if (svFcDejar || !coachActivo) return;
    svFcDejar = x.facturas.escuchar(function(){ svFcTraer(); try { svPgTraerEquipo(); } catch(e){} });
  }).catch(function(){});
}
function svFcParar(){
  if (svFcDejar) { try { svFcDejar(); } catch(e){} svFcDejar = null; }
  SV_FC.facturas = []; SV_FC.datos = []; SV_FC.num = null; SV_FC.yo = null;
}
function svFcRepintar(){
  try { if (document.getElementById('fcCaja') && !document.getElementById('fcCaja').hidden) fcPintar(); } catch(e){}
  try { if (typeof pgVista !== 'undefined' && document.getElementById('pagosPro') && typeof pantallaVisible === 'function' && pantallaVisible() === 'view-coach-pagos') pintarPagosPro(); } catch(e){}
  try { if (capaVisible('svFcMias')) svFcVerMias(); } catch(e){}
}

/* ---------- de una factura del servidor al PDF ---------- */
function svFcPdf(row){
  const d = row.datos || {}, em = d.emisor || {}, re = d.receptor || {}, imp = d.impuesto || {};
  const lin = Array.isArray(d.lineas) ? d.lineas : [];
  const desde = lin.length && lin[0].desde, hasta = lin.length && lin[lin.length - 1].hasta;
  const f = {
    num: String(row.numero), fecha: row.fecha,
    em: { nombre: em.nombre || '', nif: em.nif || '', dir: em.direccion || '', contacto: em.contacto || '', nota: em.nota || '' },
    cli: { nom: re.nombre || '', nif: re.nif || '', dir: re.direccion || '' },
    concepto: d.concepto || 'Asesoramiento',
    periodo: row.tipo === 'mensual' ? (d.mes ? svFcMes(d.mes) : '') : (desde && hasta ? mjFecha(desde) + ' – ' + mjFecha(hasta) : ''),
    base: Number(d.base != null ? d.base : row.total), total: Number(row.total),
    imp: ['x', imp.nombre || 'Impuesto', imp.tipo || 0], cuota: Number(imp.cuota || 0),
  };
  if (d.retencion) f.totales = [[imp.nombre || 'Exento', null], [d.retencion.nombre || 'Retención', -Number(d.retencion.cuota || 0)]];
  return f;
}
function svFcArchivo(row){
  const re = (row.datos && row.datos.receptor && row.datos.receptor.nombre) || 'cliente';
  return 'Factura ' + row.numero + ' (' + row.anio + ') - ' + String(re).replace(/[\\/:*?"<>|]/g, '') + '.pdf';
}
window.svFcDescargar = function(id){
  const row = SV_FC.facturas.filter(function(f){ return f.id === id; })[0];
  if (!row) { toast('Esa factura todavía no ha llegado. Prueba en un momento.'); svFcTraer(); return; }
  fcDescargar([svFcPdf(row)], svFcArchivo(row));
};

/* ---------- lo que queda por facturar ---------- */
function svFcPendientesCliente(){                     // pagos sin factura (solo Fátima los factura)
  if (svFcRol() !== 'dietista') return [];
  const r = [];
  Object.keys(clientesData).forEach(function(k){
    const t = clientesData[k].tarifa;
    (t && t.pagos || []).forEach(function(p, i){ if (p.id && !p.svFactura && !p.anulado && +p.importe > 0) r.push({ k: k, i: i, p: p }); });
  });
  return r.sort(function(a, b){ return String(a.p.fecha).localeCompare(String(b.p.fecha)); });
}
function svFcMesesPendientes(){                       // meses cerrados con pagos y sin factura de Domingo
  if (svFcRol() !== 'entrenador') return [];
  const actual = mjISO(new Date()).slice(0, 7), por = {};
  Object.keys(clientesData).forEach(function(k){
    const t = clientesData[k].tarifa;
    (t && t.pagos || []).forEach(function(p){ const m = String(p.fecha || '').slice(0, 7); if (m && m < actual && +p.importe > 0) { por[m] = por[m] || { n: 0, cobrado: 0 }; por[m].n++; por[m].cobrado += +p.importe; } });
  });
  const hechas = {}; SV_FC.facturas.forEach(function(f){ if (f.tipo === 'mensual' && f.emisor === SV_FC.yo && f.mes) hechas[String(f.mes).slice(0, 7)] = 1; });
  return Object.keys(por).filter(function(m){ return !hechas[m]; }).sort().map(function(m){
    const base = svFcRedondear(por[m].cobrado * 0.5), ret = svFcRedondear(base * 0.15);
    return { mes: m, n: por[m].n, cobrado: svFcRedondear(por[m].cobrado), base: base, ret: ret, total: svFcRedondear(base - ret) };
  });
}

/* ---------- datos de facturación y numeración ---------- */
function svFcAbrirEmisor(){
  const e = svFcMios() || {}, n = SV_FC.num, o = mjHoja('prEmisor');
  const campo = function(id, lbl, v, extra){ return '<div class="field"><label for="' + id + '">' + lbl + '</label><input type="text" id="' + id + '" value="' + esc(v || '') + '" autocomplete="off"' + (extra || '') + '></div>'; };
  const impTxt = svFcRol() === 'dietista' ? 'Tus facturas a clientes llevan el <b>7 % de IGIC</b> incluido en el precio.'
    : 'Tu factura mensual a Fátima es por el <b>50 %</b> de lo que pagaron los clientes ese mes, <b>exenta de IGIC</b> (franquicia fiscal) y con un <b>15 % de retención</b>.';
  o.innerHTML = '<div class="fsd-sheet"><div class="sheet-head"><h3>Datos de facturación</h3><button class="x-btn" onclick="mjCerrarHoja(\'prEmisor\')" aria-label="Cerrar">×</button></div>'
    + '<p class="ajx-note">Salen en tus facturas. Se guardan en el servidor: solo los veis Domingo y Fátima, nunca los clientes ni el código de la app.</p>'
    + campo('svFcNom', 'Nombre completo', e.nombre) + campo('svFcNif', 'NIF', e.nif) + campo('svFcDir', 'Dirección fiscal', e.direccion)
    + campo('svFcCon', 'Teléfono o correo (opcional)', e.contacto) + campo('svFcNota', 'Nota al pie (opcional)', e.nota, ' placeholder="Ej.: forma de pago"')
    + '<p class="ajx-note">' + impTxt + '</p>'
    + (n ? (n.se_puede_fijar
        ? '<div class="field"><label for="svFcUlt">Número de tu última factura de ' + n.anio + ' hecha fuera de la app</label><input type="text" inputmode="numeric" id="svFcUlt" placeholder="0 si es la primera" oninput="this.value=this.value.replace(/[^0-9]/g,\'\')"></div>'
          + '<p class="ajx-note">Ahora la próxima sería la <b>Nº ' + n.siguiente + '</b>. Solo se puede cambiar mientras no hagas ninguna factura de ' + n.anio + ' en la app.</p>'
        : '<p class="ajx-note">Tu próxima factura será la <b>Nº ' + n.siguiente + '</b> de ' + n.anio + '.</p>') : '')
    + '<p class="ajx-note">Revisa con tu gestoría qué menciones te corresponden.</p>'
    + '<button class="btn-primary" id="svFcGuardar" onclick="svFcGuardarEmisor()">Guardar</button></div>';
  o.classList.add('show');
}
window.svFcGuardarEmisor = function(){
  const v = function(id){ return ((document.getElementById(id) || {}).value || '').trim(); };
  const d = { nombre: v('svFcNom'), nif: v('svFcNif'), direccion: v('svFcDir'), contacto: v('svFcCon'), nota: v('svFcNota') };
  if (!d.nombre || !d.nif || !d.direccion) { toast('Faltan nombre, NIF o dirección'); return; }
  const ult = v('svFcUlt');
  const b = document.getElementById('svFcGuardar'); if (b) b.disabled = true;
  svCargar().then(function(x){
    return x.facturas.guardarDatosFiscales(d).then(function(){ if (ult !== '' && SV_FC.num && SV_FC.num.se_puede_fijar) return x.facturas.fijarNumeracion(+ult); });
  }).then(function(){
    mjCerrarHoja('prEmisor'); toast('Datos de facturación guardados'); svFcTraer();
  }).catch(function(e){ toast(svMensaje(e, 'No se han podido guardar')); })
    .finally(function(){ if (b) b.disabled = false; });
};

/* ---------- emitir ---------- */
window.svFcFacturarClientes = function(){
  const pend = svFcPendientesCliente(); if (!pend.length || SV_FC.ocupado) return;
  if (!svFcMios()) { toast('Antes, rellena tus datos de facturación'); svFcAbrirEmisor(); return; }
  SV_FC.ocupado = true;
  const hechas = [];
  let cadena = svCargar();
  pend.forEach(function(x){
    const d = clientesData[x.k] || {};
    cadena = cadena.then(function(api){
      return api.facturas.emitirCliente([x.p.id], { nombre: d.nombreFiscal || d.nombre, nif: d.dni ? String(d.dni).toUpperCase() : '', direccion: d.dirFiscal || '' })
        .then(function(c){ hechas.push(c); return api; });
    });
  });
  cadena.then(function(){ return svFcTraer(); }).then(function(){
    toast(hechas.length === 1 ? '1 factura creada' : hechas.length + ' facturas creadas');
    const filas = SV_FC.facturas.filter(function(f){ return hechas.indexOf(f.codigo) > -1; });
    if (filas.length) fcDescargar(filas.map(svFcPdf), filas.length === 1 ? svFcArchivo(filas[0]) : 'Facturas ' + filas[0].numero + ' a ' + filas[filas.length - 1].numero + '.pdf');
  }).catch(function(e){
    toast(svMensaje(e, 'No se han podido crear las facturas') + (hechas.length ? ' (se crearon ' + hechas.length + ')' : ''));
    svFcTraer();
  }).finally(function(){ SV_FC.ocupado = false; try { svPgTraerEquipo(); } catch(e){} });
};
window.svFcFacturarMes = function(mes){
  if (SV_FC.ocupado) return;
  if (!svFcMios()) { toast('Antes, rellena tus datos de facturación'); svFcAbrirEmisor(); return; }
  const m = svFcMesesPendientes().filter(function(x){ return x.mes === mes; })[0]; if (!m) return;
  abrirDialogo({ titulo: 'Factura de ' + svFcMes(mes) + ' a Fátima',
    texto: 'Cobrado ese mes: ' + mjEuros(m.cobrado) + ' (' + m.n + (m.n === 1 ? ' pago' : ' pagos') + ').\nTu 50 %: ' + mjEuros(m.base) + ', exento de IGIC.\nRetención 15 %: −' + mjEuros(m.ret) + '.\nTotal: ' + mjEuros(m.total) + '.\n\nUna vez hecha, la factura no se cambia ni se borra.',
    ok: 'Crear factura', cancel: 'Cancelar',
    onOk: function(){
      SV_FC.ocupado = true;
      svCargar().then(function(x){ return x.facturas.emitirMensual(mes); }).then(function(c){
        return svFcTraer().then(function(){
          toast('Factura creada');
          const row = SV_FC.facturas.filter(function(f){ return f.codigo === c; })[0];
          if (row) fcDescargar([svFcPdf(row)], svFcArchivo(row));
        });
      }).catch(function(e){ toast(svMensaje(e, 'No se ha podido crear la factura')); })
        .finally(function(){ SV_FC.ocupado = false; });
    } });
};

/* ---------- cliente: sus facturas ---------- */
window.svFcVerMias = function(){
  const mias = SV_FC.facturas.filter(function(f){ return f.tipo === 'cliente'; }).slice().reverse();
  const o = mjHoja('svFcMias');
  o.innerHTML = '<div class="fsd-sheet"><div class="sheet-head"><h3>Mis facturas</h3><button class="x-btn" onclick="mjCerrarHoja(\'svFcMias\')" aria-label="Cerrar">×</button></div>'
    + (mias.length ? '<div class="list-group">' + mias.map(function(f){
        return '<div class="list-row" style="cursor:default"><span>Nº ' + f.numero + ' · <b>' + mjEuros(Number(f.total)) + '</b><small class="nu-pl-res"> ' + mjFecha(f.fecha) + '</small></span>'
          + '<span class="ajx-acts"><button class="mini-btn" onclick="svFcDescargar(\'' + esc(f.id) + '\')">⬇ PDF</button></span></div>';
      }).join('') + '</div>' : '<p class="ajx-note">Todavía no tienes facturas.</p>') + '</div>';
  o.classList.add('show');
};

/* =========================================================
   ENGANCHES (solo en modo servidor)
   ========================================================= */
if (svActivo()) {
  prEmisor = function(){
    const e = svFcMios(); if (!e) return {};
    return { nombre: e.nombre, nif: e.nif, dir: e.direccion, contacto: e.contacto || '', nota: e.nota || '', imp: svFcRol() === 'dietista' ? 'igic7' : 'exento' };
  };
  abrirEmisor = function(){ mjCerrarHoja('prPagos'); svFcAbrirEmisor(); if (!SV_FC.num) svFcTraer().then(function(){ if (capaVisible('prEmisor')) svFcAbrirEmisor(); }); };
  fcPendientes = function(){ return svFcPendientesCliente(); };
  fcFacturarTodos = function(){ svFcFacturarClientes(); };
  prFactura = function(){ toast('Las facturas se hacen en Pagos → Facturas'); };

  fcPintar = function(){
    const caja = document.getElementById('fcCaja'); if (!caja) return;
    const rol = svFcRol(), emOk = !!svFcMios(), pend = svFcPendientesCliente(), meses = svFcMesesPendientes();
    let h = emOk ? '' : '<div class="fc-aviso"><span>Para facturar, rellena una vez tus datos de facturación.</span><button type="button" class="mini-btn" onclick="abrirEmisor()">Rellenar</button></div>';
    if (rol === 'dietista') {
      h += pend.length ? '<div class="fc-pend"><div><b>' + pend.length + (pend.length === 1 ? ' pago sin factura' : ' pagos sin factura') + '</b><small>' + pend.slice(0, 3).map(function(x){ return esc((clientesData[x.k] || {}).nombre || '') + ' · ' + mjEuros(x.p.importe); }).join(' · ') + (pend.length > 3 ? ' · …' : '') + '</small></div>'
          + '<button type="button" class="btn-primary fc-todos" onclick="svFcFacturarClientes()"' + (emOk ? '' : ' disabled') + '>Facturar ' + (pend.length === 1 ? 'el pago' : 'los ' + pend.length) + '</button></div>'
        : '<div class="fc-ok">✓ Todos los pagos tienen su factura</div>';
    } else if (rol === 'entrenador') {
      h += meses.length ? meses.map(function(m){
          return '<div class="fc-pend"><div><b>' + svFcMes(m.mes).replace(/^./, function(c){ return c.toUpperCase(); }) + ' · ' + mjEuros(m.total) + '</b><small>Cobrado ' + mjEuros(m.cobrado) + ' → tu 50 %: ' + mjEuros(m.base) + ' − 15 % = ' + mjEuros(m.total) + '</small></div>'
            + '<button type="button" class="btn-primary fc-todos" onclick="svFcFacturarMes(\'' + m.mes + '\')"' + (emOk ? '' : ' disabled') + '>Facturar a Fátima</button></div>';
        }).join('')
        : '<div class="fc-ok">✓ No hay meses cerrados sin tu factura a Fátima</div>';
    }
    h += '<div class="fc-barra"><input type="search" id="fcBusca" class="fc-busca" placeholder="Buscar por nombre o número…" value="' + esc(fcBusca) + '" oninput="fcBusca=this.value;fcPintarLista()"></div>'
      + '<div id="fcLista"></div>'
      + '<button type="button" class="btn-eq" style="width:100%;margin-top:12px" onclick="abrirEmisor()">Datos de facturación</button>';
    caja.innerHTML = h;
    fcPintarLista();
  };
  fcPintarLista = function(){
    const l = document.getElementById('fcLista'); if (!l) return;
    const q = String(fcBusca || '').trim().toLowerCase();
    const lista = SV_FC.facturas.slice().reverse().filter(function(f){
      const re = (f.datos && f.datos.receptor && f.datos.receptor.nombre) || '';
      return !q || (String(f.numero) + ' ' + re).toLowerCase().indexOf(q) > -1;
    });
    l.innerHTML = lista.length ? '<div class="fc-lista">' + lista.map(function(f){
        const re = (f.datos && f.datos.receptor && f.datos.receptor.nombre) || '';
        const quien = f.tipo === 'mensual' ? 'Domingo → ' + re + ' · ' + svFcMes(String(f.mes).slice(0, 7)) : re;
        return '<div class="fc-fila"><div class="fc-fila-t"><b class="fc-num">Nº ' + f.numero + (f.tipo === 'mensual' ? ' (D)' : ' (F)') + '</b><span class="fc-imp">' + mjEuros(Number(f.total)) + '</span></div>'
          + '<div class="fc-fila-s"><span>' + esc(quien) + '</span><small>' + mjFecha(f.fecha) + '</small></div>'
          + '<button type="button" class="mini-btn fc-pdf" onclick="svFcDescargar(\'' + esc(f.id) + '\')" aria-label="Descargar la factura ' + f.numero + '">⬇ PDF</button></div>';
      }).join('') + '</div>'
      : '<p class="ajx-note">' + (SV_FC.facturas.length ? 'Ninguna factura coincide con la búsqueda.' : 'Todavía no hay facturas.') + '</p>';
  };

  /* el cliente: «Mis facturas» en Ajustes */
  htmlAjustes = (function(orig){
    return function(rol){
      let h = orig.apply(this, arguments);
      if (rol !== 'cliente' || !window.fsdSesionCliente) return h;
      const n = SV_FC.facturas.filter(function(f){ return f.tipo === 'cliente'; }).length;
      const fila = '<div class="list-row" onclick="svFcVerMias()"><span>Mis facturas</span><span class="ajx-acts"><span class="ajx-val">' + n + '</span><span class="chev">›</span></span></div>';
      const m = '<div class="section-lbl">Apariencia</div>';
      const bloque = '<div class="section-lbl">Facturas</div><div class="list-group">' + fila + '</div>';
      return h.indexOf(m) > -1 ? h.replace(m, bloque + m) : h + bloque;
    };
  })(htmlAjustes);
  atrasDentroApp = (function(orig){ return function(){ if (capaVisible('svFcMias')) { mjCerrarHoja('svFcMias'); return true; } return orig(); }; })(atrasDentroApp);

  window.addEventListener('fsd:lista-servidor', function(){ svFcTraer(); svFcEscuchar(); });
  window.addEventListener('fsd:cliente-dentro', svFcTraer);
  window.addEventListener('fsd:al-volver', function(){ if (svFcSesion()) svFcTraer(); });
  window.addEventListener('fsd:sesion-fuera', svFcParar);
}
