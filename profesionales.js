/* =========================================================
   Fitnessindramas — Herramientas de los profesionales (25/10/2026, tareas #187 y #211)
   1 · Plantillas de nutrición (Fátima): guardar un plan como plantilla y aplicarlo a otro cliente.
   2 · Adherencia por comida: qué comidas se salta más cada cliente (últimos 14 días).
   3 · Renovaciones próximas: en Pagos, quién renueva en los próximos 7 días, con botón para recordárselo por el chat.
       (No va a la campana: la campana solo lleva seguimientos, pagos vencidos y dudas.)
   4 · Facturas: cada pago tiene su factura, numerada por año, para imprimir o guardar en PDF.
       Los datos del emisor (nombre, NIF, dirección) se guardan solo en este dispositivo, nunca en el código.
   5 · #211 Atajo «💬 Escribirle» en cada cliente de la pestaña Seguimientos.
   ========================================================= */

/* ---------- utilidades ---------- */
function prChatCon(k, texto){
  if (!k || !clientesData[k]) return;
  goToCliente(k); verConversacion();
  setTimeout(function(){
    const i = document.getElementById('chatInput'); if (!i) return;
    if (texto && !i.value) { i.value = texto; i.dispatchEvent(new Event('input', { bubbles: true })); }
    try { i.focus(); } catch(e){}
  }, 150);
}

/* =========================================================
   1 · Plantillas de nutrición
   ========================================================= */
const NU_PLANT_KEY = 'fsd_plantillas_nut';
function nuMisPlantillas(){ let l = {}; try { l = JSON.parse(localStorage.getItem(NU_PLANT_KEY) || '{}'); } catch(e){} return l; }
function nuGuardarMisPlantillas(l){ try { localStorage.setItem(NU_PLANT_KEY, JSON.stringify(l)); return true; } catch(e){ toast('No se ha podido guardar (memoria llena)'); return false; } }
function nuResumenPlantilla(p){
  const t = document.createElement('div'); t.innerHTML = p.html || '';
  const n = t.querySelectorAll('.meal-block').length;
  return n + (n === 1 ? ' comida' : ' comidas') + (p.obj ? ' · P ' + p.obj.p + ' % · C ' + p.obj.c + ' % · G ' + p.obj.f + ' %' : '');
}
function abrirPlantillasNut(){
  const o = mjHoja('nuPlantillas'), mias = nuMisPlantillas(), k = clienteActual;
  const nombres = Object.keys(mias).sort(function(a, b){ return a.localeCompare(b, 'es'); });
  o.innerHTML = '<div class="fsd-sheet full"><div class="sheet-head"><h3>Plantillas de nutrición</h3><button class="x-btn" onclick="mjCerrarHoja(\'nuPlantillas\')" aria-label="Cerrar">×</button></div>'
    + '<p class="ajx-note">Al usar una plantilla se sustituye el plan de ' + esc((clientesData[k] || {}).nombre || 'este cliente') + '. Se mantienen sus calorías si ya las tiene fijadas; si no, se usan las de la plantilla.</p>'
    + '<div class="section-lbl">Mis plantillas</div><div class="list-group">'
    + (nombres.length ? nombres.map(function(n){
        const q = esc(n).replace(/'/g, "\\'");
        return '<div class="list-row"><span>' + esc(n) + '<small class="nu-pl-res">' + esc(nuResumenPlantilla(mias[n])) + '</small></span><span class="ajx-acts">'
          + '<button class="mini-btn" onclick="nuBorrarPlantilla(\'' + q + '\')">Borrar</button><button class="mini-btn" onclick="nuAplicarPlantilla(\'' + q + '\')">Usar</button></span></div>';
      }).join('') : '<div class="list-row" style="cursor:default"><span class="ajx-val">Todavía no hay plantillas. Guarda un plan que te guste para reutilizarlo.</span></div>')
    + '</div><button class="btn-eq" style="width:100%;margin-top:12px" onclick="nuPedirNombrePlantilla()">Guardar el plan de ' + esc(((clientesData[k] || {}).nombre || 'este cliente').split(' ')[0]) + ' como plantilla</button></div>';
  o.classList.add('show');
}
function nuPedirNombrePlantilla(){
  try { guardarTodo(); } catch(e){}
  const k = clienteActual, html = PLANES[k] && PLANES[k].nut;
  const t = document.createElement('div'); t.innerHTML = html || '';
  if (!t.querySelector('.meal-block')) { toast('Este plan todavía no tiene comidas'); return; }
  const d = clientesData[k] || {};
  mjCerrarHoja('nuPlantillas');                                   // una hoja cada vez (las nuevas quedarían debajo)
  const o = mjHoja('nuPlantNombre');
  o.innerHTML = '<div class="fsd-sheet"><div class="sheet-head"><h3>Guardar como plantilla</h3><button class="x-btn" onclick="mjCerrarHoja(\'nuPlantNombre\')" aria-label="Cerrar">×</button></div>'
    + '<div class="field"><label for="nuPlNom">Nombre de la plantilla</label><input type="text" id="nuPlNom" maxlength="60" placeholder="Ej.: Pérdida de grasa · 5 comidas" value="' + esc((d.objetivo || 'Plan') + ' · ' + t.querySelectorAll('.meal-block').length + ' comidas') + '"></div>'
    + '<p class="ajx-note">Se guarda en este dispositivo. No se guardan las comidas marcadas por el cliente.</p>'
    + '<button class="btn-primary" onclick="nuGuardarPlantilla()">Guardar</button></div>';
  o.classList.add('show');
  setTimeout(function(){ const i = document.getElementById('nuPlNom'); if (i) { i.focus(); i.select(); } }, 60);
}
function nuGuardarPlantilla(){
  const n = ((document.getElementById('nuPlNom') || {}).value || '').trim();
  if (!n) { toast('Ponle un nombre'); return; }
  const k = clienteActual, d = clientesData[k] || {}, l = nuMisPlantillas();
  const guardar = function(){
    l[n] = { html: mjLimpiarPlanCopiado(PLANES[k].nut), obj: d.nutObj && d.nutObj.kcal ? { kcal: d.nutObj.kcal, p: d.nutObj.p, c: d.nutObj.c, f: d.nutObj.f } : null, fecha: new Date().toISOString() };
    if (!nuGuardarMisPlantillas(l)) return;
    mjCerrarHoja('nuPlantNombre'); abrirPlantillasNut(); toast('Plantilla guardada');
  };
  if (l[n]) abrirDialogo({ titulo: 'Ya hay una plantilla «' + n + '»', texto: '¿Quieres sustituirla por este plan?', ok: 'Sustituir', onOk: guardar });
  else guardar();
}
function nuBorrarPlantilla(n){
  abrirDialogo({ titulo: '¿Borrar «' + n + '»?', texto: 'Los planes que ya la usan no cambian.', ok: 'Borrar', peligro: true,
    onOk: function(){ const l = nuMisPlantillas(); delete l[n]; nuGuardarMisPlantillas(l); abrirPlantillasNut(); } });
}
function nuAplicarPlantilla(n){
  const p = nuMisPlantillas()[n]; if (!p) return;
  const k = clienteActual, d = clientesData[k]; if (!d) return;
  const hacer = function(){
    PLANES[k] = PLANES[k] || { ent: '', nut: '' };
    PLANES[k].nut = mjLimpiarPlanCopiado(p.html);
    if (p.obj) {
      const kcal = d.nutObj && d.nutObj.kcal ? d.nutObj.kcal : p.obj.kcal;
      d.nutObj = Object.assign({}, d.nutObj || {}, { kcal: kcal, p: p.obj.p, c: p.obj.c, f: p.obj.f, fecha: new Date().toISOString(), por: coachActivo ? coachActivo.u : '' });
      delete d.nutObj.comidas; delete d.nutObj.repartoManual;
    }
    cargarPlan(k); guardarTodo();
    mjCerrarHoja('nuPlantillas');
    crearAviso(claveCliente(k), 'plan', 'Tu plan de nutrición se ha actualizado', (coachActivo ? coachActivo.u : 'Tu equipo') + ' te ha preparado un plan nuevo.', { vista: 'plan' });
    toast('Plantilla aplicada: ' + n);
  };
  const t = document.createElement('div'); t.innerHTML = (PLANES[k] && PLANES[k].nut) || '';
  if (t.querySelector('.meal-block')) abrirDialogo({ titulo: 'Usar «' + n + '»', texto: 'Se sustituirá el plan de nutrición que tiene ahora ' + d.nombre + '.', ok: 'Usar plantilla', onOk: hacer });
  else hacer();
}
(function(){
  const card = document.getElementById('calcCard'); if (!card) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn-eq nu-plantillas'; b.innerHTML = '📋 Plantillas';
  b.onclick = abrirPlantillasNut;
  const r = card.querySelector('.nu-rapido');
  if (r) r.insertAdjacentElement('afterend', b); else card.insertBefore(b, card.firstChild.nextSibling);
})();
atrasDentroApp = (function(orig){
  return function(){
    if (capaVisible('nuPlantNombre')) { mjCerrarHoja('nuPlantNombre'); return true; }
    if (capaVisible('nuPlantillas')) { mjCerrarHoja('nuPlantillas'); return true; }
    if (capaVisible('prPagos')) { mjCerrarHoja('prPagos'); return true; }
    if (capaVisible('prEmisor')) { mjCerrarHoja('prEmisor'); return true; }
    if (capaVisible('prFactura')) { mjCerrarHoja('prFactura'); return true; }
    return orig.apply(this, arguments);
  };
})(atrasDentroApp);

/* =========================================================
   2 · Adherencia por comida
   ========================================================= */
toggleComida = (function(orig){
  return function(ev, el){
    const r = orig.apply(this, arguments);
    try {
      const reg = clienteActual && mjRegistro(clienteActual), hoy = mjISO(new Date());
      if (reg && reg.com && reg.com[hoy]) {
        reg.com[hoy].m = mealBlocks().filter(function(b){ return b.classList.contains('eaten'); })
          .map(function(b){ return ((b.querySelector('.meal-block-title') || {}).textContent || '').trim(); }).filter(Boolean);
        programarGuardado();
      }
    } catch(e){}
    return r;
  };
})(toggleComida);
function prAdherenciaComidas(k, dias){
  const d = clientesData[k], reg = d && d.registro, com = reg && reg.com; if (!com) return null;
  const desde = mjISO(Date.now() - (dias || 14) * 864e5);
  const f = Object.keys(com).filter(function(x){ return x >= desde && Array.isArray(com[x].m); });
  if (f.length < 3) return null;                               // con menos de 3 días no dice nada
  const t = document.createElement('div'); t.innerHTML = (PLANES[k] && PLANES[k].nut) || '';
  const comidas = Array.prototype.map.call(t.querySelectorAll('.meal-block-title'), function(x){ return x.textContent.trim(); });
  if (!comidas.length) return null;
  return { dias: f.length, l: comidas.map(function(c){ const n = f.filter(function(x){ return com[x].m.indexOf(c) > -1; }).length; return { c: c, n: n, p: n / f.length }; }) };
}
nuHtmlResumen = (function(orig){
  return function(k, compacto){
    let h = orig.apply(this, arguments);
    if (compacto) return h;
    const a = prAdherenciaComidas(k, 14);
    if (a) {
      const peor = a.l.slice().sort(function(x, y){ return x.p - y.p; })[0];
      h += '<div class="pr-adh"><div class="pr-adh-t">Adherencia por comida · últimos ' + a.dias + ' días con registro</div>'
        + a.l.map(function(x){
            const pc = Math.round(x.p * 100), cls = pc >= 80 ? 'ok' : (pc >= 50 ? 'med' : 'mal');
            return '<div class="pr-adh-f"><span>' + esc(x.c) + '</span><i class="pr-adh-b"><u class="' + cls + '" style="width:' + pc + '%"></u></i><b class="' + cls + '">' + x.n + '/' + a.dias + '</b></div>';
          }).join('')
        + (peor && peor.p < 0.6 ? '<div class="pr-adh-nota">⚠️ La que más se salta: <b>' + esc(peor.c) + '</b></div>' : '') + '</div>';
    }
    return h;
  };
})(nuHtmlResumen);

/* =========================================================
   3 · Renovaciones próximas (pestaña Pagos)
   ========================================================= */
pintarPagosPro = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const cont = document.getElementById('pagosPro'); if (!cont) return r;
    const prox = Object.keys(clientesData).map(function(k){ return { k: k, d: clientesData[k], e: estadoPago(clientesData[k]) }; })
      .filter(function(x){ return !mjEsBaja(x.d) && x.e.cod === 'vence'; })
      .sort(function(a, b){ return a.e.dias - b.e.dias; });
    let box = document.getElementById('prRenov'); if (box) box.remove();
    if (!prox.length) return r;
    box = document.createElement('div'); box.id = 'prRenov'; box.className = 'pr-renov';
    box.innerHTML = '<div class="pr-renov-t">🔔 Renuevan en los próximos 7 días · ' + prox.length + '</div>' + prox.map(function(x){
      const tipo = MJ_TARIFAS[x.e.tipo] ? MJ_TARIFAS[x.e.tipo].n.toLowerCase() : '';
      return '<div class="pr-renov-f"><div><b>' + esc(x.d.nombre) + '</b><span>' + esc(x.e.txt) + ' · ' + mjFecha(x.e.hasta) + (tipo ? ' · ' + tipo : '') + '</span></div>'
        + '<button type="button" class="mini-btn" data-renov="' + esc(x.k) + '">💬 Recordar</button></div>';
    }).join('');
    box.addEventListener('click', function(e){
      const b = e.target.closest('[data-renov]'); if (!b) return;
      const k = b.dataset.renov, d = clientesData[k], e2 = estadoPago(d);
      prChatCon(k, 'Hola ' + (d.nombre || '').split(' ')[0] + ', te recuerdo que tu tarifa ' + (MJ_TARIFAS[e2.tipo] ? MJ_TARIFAS[e2.tipo].n.toLowerCase() + ' ' : '') + (e2.dias === 0 ? 'vence hoy' : 'vence el ' + mjFecha(e2.hasta)) + '. ¿La renovamos para seguir con tu plan? 💪');
    });
    const ref = cont.querySelector('.pagos-resumen');
    if (ref) ref.insertAdjacentElement('afterend', box); else cont.insertBefore(box, cont.firstChild);
    return r;
  };
})(pintarPagosPro);

/* =========================================================
   4 · Facturas
   ========================================================= */
const PR_EMISOR_KEY = 'fsd_facturacion';
const PR_IMPUESTOS = [['igic7', 'IGIC 7 %', 7], ['iva21', 'IVA 21 %', 21], ['exento', 'Exento', 0]];
function prEmisor(){ try { return JSON.parse(localStorage.getItem(PR_EMISOR_KEY) || 'null') || {}; } catch(e){ return {}; } }
function prEmisorCompleto(e){ e = e || prEmisor(); return !!(e.nombre && e.nif && e.dir); }
function abrirEmisor(volverA){
  mjCerrarHoja('prPagos'); mjCerrarHoja('prFactura');
  const e = prEmisor(), o = mjHoja('prEmisor');
  o.innerHTML = '<div class="fsd-sheet"><div class="sheet-head"><h3>Datos de facturación</h3><button class="x-btn" onclick="mjCerrarHoja(\'prEmisor\')" aria-label="Cerrar">×</button></div>'
    + '<p class="ajx-note">Salen en las facturas. Se guardan <b>solo en este dispositivo</b> (no en la app publicada).</p>'
    + '<div class="field"><label for="prEmNom">Nombre o razón social</label><input type="text" id="prEmNom" value="' + esc(e.nombre || '') + '" autocomplete="off"></div>'
    + '<div class="field"><label for="prEmNif">NIF</label><input type="text" id="prEmNif" value="' + esc(e.nif || '') + '" autocomplete="off"></div>'
    + '<div class="field"><label for="prEmDir">Dirección fiscal</label><input type="text" id="prEmDir" value="' + esc(e.dir || '') + '" autocomplete="off"></div>'
    + '<div class="field"><label for="prEmMail">Correo o teléfono (opcional)</label><input type="text" id="prEmMail" value="' + esc(e.contacto || '') + '" autocomplete="off"></div>'
    + '<div class="field"><label for="prEmImp">Impuesto (los precios lo incluyen)</label><select id="prEmImp" class="mj-select">' + PR_IMPUESTOS.map(function(x){ return '<option value="' + x[0] + '"' + ((e.imp || 'igic7') === x[0] ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></div>'
    + '<div class="field"><label for="prEmNota">Nota al pie (opcional)</label><input type="text" id="prEmNota" value="' + esc(e.nota || '') + '" placeholder="Ej.: motivo de exención o forma de pago"></div>'
    + '<p class="ajx-note">Revisa con tu gestoría qué impuesto y qué menciones te corresponden.</p>'
    + '<button class="btn-primary" onclick="guardarEmisor(' + (volverA ? '\'' + esc(volverA) + '\'' : '') + ')">Guardar</button></div>';
  o.classList.add('show');
}
function guardarEmisor(volverA){
  const v = function(id){ return ((document.getElementById(id) || {}).value || '').trim(); };
  const e = { nombre: v('prEmNom'), nif: v('prEmNif').toUpperCase(), dir: v('prEmDir'), contacto: v('prEmMail'), imp: v('prEmImp') || 'igic7', nota: v('prEmNota') };
  if (!prEmisorCompleto(e)) { toast('Faltan nombre, NIF o dirección'); return; }
  try { localStorage.setItem(PR_EMISOR_KEY, JSON.stringify(e)); } catch(err){ toast('No se ha podido guardar'); return; }
  mjCerrarHoja('prEmisor'); toast('Datos de facturación guardados');
  if (volverA) { const p = volverA.split('|'); prFactura(p[0], +p[1]); }
}
/* número: F2026-0001, correlativo por año entre todos los clientes; una vez dado, no cambia */
function prSiguienteNumero(anio){
  let max = 0;
  Object.keys(clientesData).forEach(function(k){
    const t = clientesData[k].tarifa; (t && t.pagos || []).forEach(function(p){
      const m = p.factura && String(p.factura).match(/^F(\d{4})-(\d+)$/); if (m && m[1] === String(anio)) max = Math.max(max, +m[2]);
    });
  });
  return 'F' + anio + '-' + ('000' + (max + 1)).slice(-4);
}
/* lista de pagos del cliente, cada uno con su factura (sustituye al diálogo de solo texto) */
verPagos = function(){
  const k = clienteActual, d = clientesData[k], t = d && d.tarifa;
  const lista = (t && t.pagos || []).map(function(p, i){ return { p: p, i: i }; }).reverse();
  const o = mjHoja('prPagos');
  o.innerHTML = '<div class="fsd-sheet"><div class="sheet-head"><h3>Pagos de ' + esc(d.nombre) + '</h3><button class="x-btn" onclick="mjCerrarHoja(\'prPagos\')" aria-label="Cerrar">×</button></div>'
    + (lista.length ? '<div class="list-group">' + lista.map(function(x){
        const p = x.p;
        return '<div class="list-row" style="cursor:default"><span>' + mjFecha(p.fecha) + (p.importe != null ? ' · <b>' + mjEuros(p.importe) + '</b>' : '') + '<small class="nu-pl-res">Hasta el ' + mjFecha(p.hasta) + (p.por ? ' · ' + esc(p.por) : '') + (p.factura ? ' · ' + esc(p.factura) : '') + '</small></span>'
          + '<span class="ajx-acts">' + (p.importe != null ? '<button class="mini-btn" onclick="prFactura(\'' + esc(k) + '\',' + x.i + ')">🧾 Factura</button>' : '<span class="ajx-val">Sin importe</span>') + '</span></div>';
      }).join('') + '</div>' : '<p class="ajx-note">Todavía no hay pagos registrados.</p>')
    + '<button class="btn-eq" style="width:100%;margin-top:12px" onclick="abrirEmisor()">Datos de facturación</button></div>';
  o.classList.add('show');
};
function prFactura(k, i){
  const d = clientesData[k], p = d && d.tarifa && d.tarifa.pagos && d.tarifa.pagos[i]; if (!p) return;
  if (!prEmisorCompleto()) { toast('Antes, rellena tus datos de facturación'); abrirEmisor(k + '|' + i); return; }
  mjCerrarHoja('prPagos');
  const o = mjHoja('prFactura');
  o.innerHTML = '<div class="fsd-sheet"><div class="sheet-head"><h3>Factura · ' + esc(d.nombre) + '</h3><button class="x-btn" onclick="mjCerrarHoja(\'prFactura\')" aria-label="Cerrar">×</button></div>'
    + '<p class="ajx-note">Pago del ' + mjFecha(p.fecha) + ' · ' + mjEuros(p.importe) + (p.factura ? ' · ya tiene el número <b>' + esc(p.factura) + '</b>' : ' · se le dará el número <b>' + prSiguienteNumero((p.fecha || mjISO(new Date())).slice(0, 4)) + '</b>') + '</p>'
    + '<div class="field"><label for="prFcNom">Nombre del cliente en la factura</label><input type="text" id="prFcNom" value="' + esc(p.factNom || d.nombreFiscal || d.nombre || '') + '"></div>'
    + '<div class="field"><label for="prFcNif">NIF del cliente (opcional)</label><input type="text" id="prFcNif" value="' + esc(p.factNif || d.dni || '') + '" autocomplete="off"></div>'
    + '<div class="field"><label for="prFcDir">Dirección del cliente (opcional)</label><input type="text" id="prFcDir" value="' + esc(p.factDir || d.dirFiscal || '') + '" autocomplete="off"></div>'
    + '<p class="ajx-note">Se abrirá la ventana de imprimir: elige «Guardar como PDF» para tener el archivo.</p>'
    + '<button class="btn-primary" onclick="prImprimirFactura(\'' + esc(k) + '\',' + i + ')">Crear factura</button></div>';
  o.classList.add('show');
}
function prImprimirFactura(k, i){
  const d = clientesData[k], p = d.tarifa.pagos[i], e = prEmisor();
  const v = function(id){ return ((document.getElementById(id) || {}).value || '').trim(); };
  p.factNom = v('prFcNom') || d.nombre; p.factNif = v('prFcNif').toUpperCase(); p.factDir = v('prFcDir');
  if (!p.factura) p.factura = prSiguienteNumero((p.fecha || mjISO(new Date())).slice(0, 4));
  try { guardarTodo(); } catch(err){}
  const imp = PR_IMPUESTOS.filter(function(x){ return x[0] === (e.imp || 'igic7'); })[0] || PR_IMPUESTOS[0];
  const total = +p.importe || 0, base = imp[2] ? total / (1 + imp[2] / 100) : total, cuota = total - base;
  const eur = function(n){ return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',') + ' €'; };
  const tipo = d.tarifa && MJ_TARIFAS[d.tarifa.tipo] ? MJ_TARIFAS[d.tarifa.tipo].n.toLowerCase() : '';
  const desde = (function(){ const t = d.tarifa.pagos; return i > 0 && t[i - 1].hasta && t[i - 1].hasta < p.hasta ? t[i - 1].hasta : (p.fecha || '').slice(0, 10); })();
  let f = document.getElementById('prFacturaPrint');
  if (!f) { f = document.createElement('div'); f.id = 'prFacturaPrint'; document.body.appendChild(f); }
  f.innerHTML = '<div class="fp-hoja">'
    + '<div class="fp-cab"><div><h1>Factura</h1><div class="fp-num">Nº ' + esc(p.factura) + '</div><div>Fecha: ' + mjFecha(p.fecha) + '</div></div>'
    + '<div class="fp-em"><b>' + esc(e.nombre) + '</b><br>NIF ' + esc(e.nif) + '<br>' + esc(e.dir) + (e.contacto ? '<br>' + esc(e.contacto) : '') + '</div></div>'
    + '<div class="fp-cli"><span>Cliente</span><b>' + esc(p.factNom) + '</b>' + (p.factNif ? '<br>NIF ' + esc(p.factNif) : '') + (p.factDir ? '<br>' + esc(p.factDir) : '') + '</div>'
    + '<table class="fp-tabla"><thead><tr><th>Concepto</th><th>Importe</th></tr></thead><tbody><tr><td>Asesoramiento de entrenamiento y nutrición' + (tipo ? ' · tarifa ' + esc(tipo) : '')
    + (desde && p.hasta ? '<br><small>Periodo: ' + mjFecha(desde) + ' – ' + mjFecha(p.hasta) + '</small>' : '') + '</td><td>' + eur(base) + '</td></tr></tbody></table>'
    + '<table class="fp-tot"><tr><td>Base imponible</td><td>' + eur(base) + '</td></tr><tr><td>' + esc(imp[1]) + '</td><td>' + eur(cuota) + '</td></tr><tr class="fp-total"><td>Total</td><td>' + eur(total) + '</td></tr></table>'
    + (e.nota ? '<p class="fp-nota">' + esc(e.nota) + '</p>' : '') + '</div>';
  mjCerrarHoja('prFactura');
  document.documentElement.classList.add('imprimiendo-factura');
  const fin = function(){ document.documentElement.classList.remove('imprimiendo-factura'); window.removeEventListener('afterprint', fin); };
  window.addEventListener('afterprint', fin);
  setTimeout(function(){ try { window.print(); } catch(err){} setTimeout(fin, 1500); verPagos(); }, 60);
}

/* =========================================================
   5 · #211 Atajo al chat en la pestaña Seguimientos
   ========================================================= */
pintarSegsResumen = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const cont = document.getElementById('segsResumen'); if (!cont || !coachActivo) return r;
    cont.querySelectorAll(':scope > .sg-bloque').forEach(function(bl){
      const cab = bl.querySelector('.sg-cab'), m = cab && (cab.getAttribute('onclick') || '').match(/abrirSegsCliente\('([^']+)'/);
      const k = m && m[1]; if (!k || bl.querySelector('.pr-sg-chat')) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'mini-btn pr-sg-chat';
      b.innerHTML = '💬 Escribirle'; b.setAttribute('aria-label', 'Abrir el chat con ' + ((clientesData[k] || {}).nombre || 'el cliente'));
      b.onclick = function(e){ e.stopPropagation(); prChatCon(k); };
      const fila = bl.querySelector('.sg-rev') || bl;
      fila.appendChild(b);
    });
    return r;
  };
})(pintarSegsResumen);
