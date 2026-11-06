/* =========================================================
   #293 · Facturas más fáciles (sin pasarela de pago)
   · Pestaña «Facturas» en Pagos: pagos sin factura («Facturar todos»), lista de facturas
     emitidas con buscador y filtro por trimestre, y «Descargar todas» en un solo PDF.
   · PDF directo (sin pasar por «Imprimir»), generado aquí mismo, sin librerías externas.
   · Los datos del emisor siguen guardándose SOLO en este dispositivo (Pagos → Datos de facturación).
   ========================================================= */

/* ---------- datos de cada factura ---------- */
function fcImpuesto(e){ return PR_IMPUESTOS.filter(function(x){ return x[0] === (e.imp || 'igic7'); })[0] || PR_IMPUESTOS[0]; }
function fcDatos(k, i){
  const d = clientesData[k], p = d && d.tarifa && d.tarifa.pagos && d.tarifa.pagos[i]; if (!p || !p.factura) return null;
  const e = prEmisor(), imp = fcImpuesto(e);
  const total = +p.importe || 0, base = imp[2] ? total / (1 + imp[2] / 100) : total;
  const tipo = d.tarifa && MJ_TARIFAS[d.tarifa.tipo] ? MJ_TARIFAS[d.tarifa.tipo].n.toLowerCase() : '';
  const t = d.tarifa.pagos;
  const desde = i > 0 && t[i - 1].hasta && t[i - 1].hasta < p.hasta ? t[i - 1].hasta : (p.fecha || '').slice(0, 10);
  return {
    k: k, i: i, num: p.factura, fecha: (p.fecha || '').slice(0, 10), em: e, imp: imp,
    cli: { nom: p.factNom || d.nombreFiscal || d.nombre || '', nif: p.factNif || '', dir: p.factDir || '' },
    concepto: 'Asesoramiento de entrenamiento y nutrición' + (tipo ? ' · tarifa ' + tipo : ''),
    periodo: desde && p.hasta ? mjFecha(desde) + ' – ' + mjFecha(p.hasta) : '',
    base: base, cuota: total - base, total: total
  };
}
/* todas las facturas emitidas y los pagos sin factura */
function fcTodas(){
  const r = [];
  Object.keys(clientesData).forEach(function(k){
    const t = clientesData[k].tarifa; (t && t.pagos || []).forEach(function(p, i){ if (p.factura) r.push({ k: k, i: i, p: p }); });
  });
  return r.sort(function(a, b){ return String(b.p.factura).localeCompare(String(a.p.factura)); });
}
function fcPendientes(){
  const r = [];
  Object.keys(clientesData).forEach(function(k){
    const d = clientesData[k], t = d.tarifa;
    (t && t.pagos || []).forEach(function(p, i){ if (!p.factura && p.importe != null && +p.importe > 0) r.push({ k: k, i: i, p: p }); });
  });
  return r.sort(function(a, b){ return String(a.p.fecha || '').localeCompare(String(b.p.fecha || '')); });
}
/* da número a un pago (con los datos fiscales que el cliente dio en el cuestionario) */
function fcNumerar(k, i){
  const d = clientesData[k], p = d.tarifa.pagos[i];
  if (p.factura) return p.factura;
  p.factNom = p.factNom || d.nombreFiscal || d.nombre || '';
  p.factNif = p.factNif || (d.dni ? String(d.dni).toUpperCase() : '');
  p.factDir = p.factDir || d.dirFiscal || '';
  p.factura = prSiguienteNumero((p.fecha || mjISO(new Date())).slice(0, 4));
  return p.factura;
}

/* ---------- PDF propio (A4, Helvetica, texto en WinAnsi) ---------- */
const FC_W = { ' ': 278, ',': 278, '.': 278, '-': 333, '–': 556, '/': 278, '€': 556, '%': 889 };
function fcAncho(s, tam){ let w = 0; for (const c of String(s)) w += (/[0-9]/.test(c) ? 556 : (FC_W[c] || (/[A-ZÁÉÍÓÚÑ]/.test(c) ? 700 : 556))); return w * tam / 1000; }
function fcTxt(s){
  // a WinAnsi: Latin-1 tal cual, más el euro y la raya; lo demás, «?»
  let r = '';
  for (const c of String(s)) {
    const n = c.codePointAt(0);
    let b = n < 128 || (n >= 160 && n <= 255) ? n : ({ 8364: 128, 8211: 150, 8212: 151, 8220: 147, 8221: 148, 8216: 145, 8217: 146, 8226: 149 })[n];
    if (b == null) b = 63;
    const ch = String.fromCharCode(b);
    r += (ch === '(' || ch === ')' || ch === '\\') ? '\\' + ch : ch;
  }
  return r;
}
function fcEur(n){ return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €'; }
function fcPagina(f){
  const L = [], M = 56, W = 595, D = W - M;           // márgenes
  const txt = function(x, y, s, tam, neg, gris){ L.push((gris ? '0.42 0.45 0.5 rg ' : '0.07 0.08 0.1 rg ') + 'BT /' + (neg ? 'F2' : 'F1') + ' ' + tam + ' Tf ' + x.toFixed(1) + ' ' + y.toFixed(1) + ' Td (' + fcTxt(s) + ') Tj ET'); };
  const der = function(xd, y, s, tam, neg, gris){ txt(xd - fcAncho(s, tam), y, s, tam, neg, gris); };
  const linea = function(y, g){ L.push((g || '0.85 0.88 0.92') + ' RG 0.8 w ' + M + ' ' + y + ' m ' + D + ' ' + y + ' l S'); };
  const caja = function(x, y, w, h, col){ L.push(col + ' rg ' + x + ' ' + y + ' ' + w + ' ' + h + ' re f'); };
  // cabecera
  caja(0, 782, W, 60, '0.533 0.725 0.902');
  if (f.logo) L.push('q 44 0 0 44 ' + M + ' 790 cm /Logo Do Q');
  txt(f.logo ? M + 56 : M, 805, 'FACTURA', 20, true);
  der(D, 816, 'Nº ' + f.num, 12, true); der(D, 801, 'Fecha: ' + mjFecha(f.fecha), 10);
  // emisor
  let y = 752;
  txt(M, y, f.em.nombre || '', 11, true); y -= 14;
  if (f.em.nif) { txt(M, y, 'NIF ' + f.em.nif, 10); y -= 13; }
  if (f.em.dir) { txt(M, y, f.em.dir, 10); y -= 13; }
  if (f.em.contacto) { txt(M, y, f.em.contacto, 10); y -= 13; }
  // cliente
  y -= 14; caja(M, y - 52, D - M, 64, '0.945 0.961 0.98');
  txt(M + 12, y - 2, 'CLIENTE', 8, true, true);
  txt(M + 12, y - 17, f.cli.nom, 11, true);
  let yc = y - 31;
  if (f.cli.nif) { txt(M + 12, yc, 'NIF ' + f.cli.nif, 10); yc -= 12; }
  if (f.cli.dir) { txt(M + 12, yc, f.cli.dir, 10); }
  // concepto
  y -= 90;
  txt(M, y, 'CONCEPTO', 8, true, true); der(D, y, 'IMPORTE', 8, true, true);
  linea(y - 7);
  txt(M, y - 24, f.concepto, 10); der(D, y - 24, fcEur(f.base), 10);
  if (f.periodo) txt(M, y - 38, 'Periodo: ' + f.periodo, 9, false, true);
  linea(y - 52);
  // totales
  let yt = y - 76; const xl = 340;
  txt(xl, yt, 'Base imponible', 10); der(D, yt, fcEur(f.base), 10); yt -= 16;
  // impuesto (y, si la hay, retención): f.totales = [[texto, importe o null], …]
  (f.totales || [[f.imp[1], f.cuota]]).forEach(function(t){ txt(xl, yt, t[0], 10); if (t[1] != null) der(D, yt, fcEur(t[1]), 10); yt -= 16; });
  yt += 6;
  L.push('0.07 0.08 0.1 RG 1 w ' + xl + ' ' + yt + ' m ' + D + ' ' + yt + ' l S'); yt -= 18;
  txt(xl, yt, 'TOTAL', 12, true); der(D, yt, fcEur(f.total), 12, true);
  // nota y pie
  if (f.em.nota) txt(M, 120, f.em.nota, 9, false, true);
  linea(70); txt(M, 54, 'Fitnessindramas · Para la vida real', 8, false, true); der(D, 54, f.num, 8, false, true);
  return L.join('\n');
}
function fcPDF(lista){
  const objs = [];                                   // texto de cada objeto (índice 0 = obj 1)
  const add = function(s){ objs.push(s); return objs.length; };
  const catalogo = add(''), paginas = add('');
  const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const kids = [];
  const logo = fcLogo ? add('<< /Type /XObject /Subtype /Image /Width ' + fcLogo.w + ' /Height ' + fcLogo.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + fcLogo.bin.length + ' >>\nstream\n' + fcLogo.bin + '\nendstream') : 0;
  lista.forEach(function(f){
    const cont = fcPagina(Object.assign({ logo: !!logo }, f));
    const c = add('<< /Length ' + cont.length + ' >>\nstream\n' + cont + '\nendstream');
    kids.push(add('<< /Type /Page /Parent ' + paginas + ' 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ' + f1 + ' 0 R /F2 ' + f2 + ' 0 R >>' + (logo ? ' /XObject << /Logo ' + logo + ' 0 R >>' : '') + ' >> /Contents ' + c + ' 0 R >>'));
  });
  objs[catalogo - 1] = '<< /Type /Catalog /Pages ' + paginas + ' 0 R >>';
  objs[paginas - 1] = '<< /Type /Pages /Kids [' + kids.map(function(k){ return k + ' 0 R'; }).join(' ') + '] /Count ' + kids.length + ' >>';
  let out = '%PDF-1.4\n%âãÏÓ\n'; const pos = [];
  objs.forEach(function(o, n){ pos.push(out.length); out += (n + 1) + ' 0 obj\n' + o + '\nendobj\n'; });
  const xref = out.length;
  out += 'xref\n0 ' + (objs.length + 1) + '\n0000000000 65535 f \n' + pos.map(function(p){ return ('0000000000' + p).slice(-10) + ' 00000 n \n'; }).join('');
  out += 'trailer\n<< /Size ' + (objs.length + 1) + ' /Root ' + catalogo + ' 0 R >>\nstartxref\n' + xref + '\n%%EOF';
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
  return new Blob([bytes], { type: 'application/pdf' });
}
/* logo de la cabecera (JPEG con el fondo azul de la franja); se carga una vez */
let fcLogo = null;
const fcLogoListo = fetch('assets/logo_factura.jpg').then(function(r){ return r.ok ? r.arrayBuffer() : null; }).then(function(b){
  if (!b) return;
  const u = new Uint8Array(b); let bin = '';
  for (let i = 0; i < u.length; i += 8192) bin += String.fromCharCode.apply(null, u.subarray(i, i + 8192));
  fcLogo = { bin: bin, w: 240, h: 240 };
}).catch(function(){});
function fcDescargar(lista, nombre){
  if (!lista.length) { toast('No hay facturas que descargar'); return; }
  fcLogoListo.then(function(){ fcDescargarYa(lista, nombre); });
}
function fcDescargarYa(lista, nombre){
  const url = URL.createObjectURL(fcPDF(lista));
  const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
}
function fcNombreArchivo(f){ return 'Factura ' + f.num + ' - ' + (f.cli.nom || 'cliente').replace(/[\\/:*?"<>|]/g, '') + '.pdf'; }
function fcDescargarUna(k, i){
  if (!prEmisorCompleto()) { toast('Antes, rellena tus datos de facturación'); abrirEmisor(); return; }
  const f = fcDatos(k, i); if (f) fcDescargar([f], fcNombreArchivo(f));
}

/* desde el formulario de una factura (historial de pagos del cliente): crear y descargar el PDF */
function fcCrearDesdeForm(k, i){
  const d = clientesData[k], p = d.tarifa.pagos[i];
  const v = function(id){ return ((document.getElementById(id) || {}).value || '').trim(); };
  p.factNom = v('prFcNom') || d.nombre; p.factNif = v('prFcNif').toUpperCase(); p.factDir = v('prFcDir');
  fcNumerar(k, i);
  try { guardarTodo(); } catch(err){}
  mjCerrarHoja('prFactura');
  fcDescargarUna(k, i);
  try { verPagos(); } catch(err){}
  try { if (pgVista === 'facturas') pgVer('facturas'); } catch(err){}
}
prFactura = (function(orig){
  return function(k, i){
    const r = orig.apply(this, arguments);
    const o = document.getElementById('prFactura'); if (!o) return r;
    const btn = o.querySelector('.btn-primary'); if (!btn) return r;
    const nota = o.querySelector('.ajx-note:last-of-type');
    if (nota && /imprimir/i.test(nota.textContent)) nota.textContent = 'Se descargará el PDF de la factura.';
    btn.textContent = '⬇ Crear y descargar PDF';
    btn.setAttribute('onclick', 'fcCrearDesdeForm(\'' + esc(k) + '\',' + (+i) + ')');
    if (!o.querySelector('.fc-imprimir')) btn.insertAdjacentHTML('afterend', '<button type="button" class="btn-eq fc-imprimir" style="width:100%;margin-top:8px" onclick="prImprimirFactura(\'' + esc(k) + '\',' + (+i) + ')">Imprimir</button>');
    return r;
  };
})(prFactura);
/* en el historial de pagos del cliente, las que ya tienen número se descargan directamente */
verPagos = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const k = clienteActual, d = clientesData[k], o = document.getElementById('prPagos'); if (!o || !d) return r;
    const pagos = d.tarifa && d.tarifa.pagos || [];
    o.querySelectorAll('.list-row .mini-btn[onclick^="prFactura("]').forEach(function(b){
      const m = (b.getAttribute('onclick') || '').match(/,(\d+)\)/); const i = m ? +m[1] : -1;
      if (i > -1 && pagos[i] && pagos[i].factura) { b.textContent = '⬇ PDF'; b.setAttribute('onclick', 'fcDescargarUna(\'' + esc(k) + '\',' + i + ')'); }
    });
    return r;
  };
})(verPagos);

/* ---------- pestaña «Facturas» dentro de Pagos ---------- */
let fcBusca = '', fcPeriodo = 'todo';
function fcTrimestre(iso){ const m = +String(iso).slice(5, 7); return String(iso).slice(0, 4) + '-T' + (Math.floor((m - 1) / 3) + 1); }
function fcFiltradas(){
  const q = fcBusca.trim().toLowerCase();
  return fcTodas().filter(function(x){
    const f = String(x.p.fecha || '');
    if (fcPeriodo !== 'todo' && !(fcPeriodo.length === 4 ? f.slice(0, 4) === fcPeriodo : fcTrimestre(f) === fcPeriodo)) return false;
    if (!q) return true;
    return (String(x.p.factura) + ' ' + (x.p.factNom || '') + ' ' + ((clientesData[x.k] || {}).nombre || '')).toLowerCase().indexOf(q) > -1;
  });
}
function fcFacturarTodos(){
  if (!prEmisorCompleto()) { toast('Antes, rellena tus datos de facturación'); abrirEmisor(); return; }
  const pend = fcPendientes(); if (!pend.length) return;
  pend.forEach(function(x){ fcNumerar(x.k, x.i); });
  try { guardarTodo(); } catch(e){}
  const hechas = pend.map(function(x){ return fcDatos(x.k, x.i); }).filter(Boolean);
  toast(hechas.length === 1 ? '1 factura creada' : hechas.length + ' facturas creadas');
  try { pgVer('facturas'); } catch(e){ fcPintar(); }
  fcDescargar(hechas, 'Facturas ' + hechas[0].num + (hechas.length > 1 ? ' a ' + hechas[hechas.length - 1].num : '') + '.pdf');
}
function fcDescargarFiltro(){
  if (!prEmisorCompleto()) { toast('Antes, rellena tus datos de facturación'); abrirEmisor(); return; }
  const l = fcFiltradas().slice().reverse().map(function(x){ return fcDatos(x.k, x.i); }).filter(Boolean);
  const per = fcPeriodo === 'todo' ? 'todas' : fcPeriodo.replace('-', ' ');
  fcDescargar(l, 'Facturas ' + per + '.pdf');
}
function fcPintar(){
  const caja = document.getElementById('fcCaja'); if (!caja) return;
  const pend = fcPendientes(), todas = fcTodas(), lista = fcFiltradas(), emOk = prEmisorCompleto();
  const periodos = {}; todas.forEach(function(x){ const f = String(x.p.fecha || ''); if (f) { periodos[f.slice(0, 4)] = 1; periodos[fcTrimestre(f)] = 1; } });
  const opts = Object.keys(periodos).sort().reverse().map(function(p){ return '<option value="' + p + '"' + (fcPeriodo === p ? ' selected' : '') + '>' + (p.length === 4 ? 'Año ' + p : p.slice(5) + ' · ' + p.slice(0, 4)) + '</option>'; }).join('');
  const total = lista.reduce(function(s, x){ return s + (+x.p.importe || 0); }, 0);
  caja.innerHTML = (emOk ? '' : '<div class="fc-aviso"><span>Para facturar, rellena una vez tus datos de facturación. Se guardan solo en este dispositivo.</span><button type="button" class="mini-btn" onclick="abrirEmisor()">Rellenar</button></div>')
    + (pend.length ? '<div class="fc-pend"><div><b>' + pend.length + (pend.length === 1 ? ' pago sin factura' : ' pagos sin factura') + '</b><small>' + pend.slice(0, 3).map(function(x){ return esc((clientesData[x.k] || {}).nombre || '') + ' · ' + mjEuros(x.p.importe); }).join(' · ') + (pend.length > 3 ? ' · …' : '') + '</small></div>'
        + '<button type="button" class="btn-primary fc-todos" onclick="fcFacturarTodos()"' + (emOk ? '' : ' disabled') + '>Facturar ' + (pend.length === 1 ? 'el pago' : 'los ' + pend.length) + '</button></div>'
      : '<div class="fc-ok">✓ Todos los pagos con importe tienen su factura</div>')
    + '<div class="fc-barra"><input type="search" id="fcBusca" class="fc-busca" placeholder="Buscar por cliente o número…" value="' + esc(fcBusca) + '" oninput="fcBusca=this.value;fcPintarLista()">'
    + '<select id="fcPeriodo" class="mj-select" onchange="fcPeriodo=this.value;fcPintar()"><option value="todo">Todas</option>' + opts + '</select></div>'
    + '<div id="fcLista"></div>'
    + '<button type="button" class="btn-eq" style="width:100%;margin-top:12px" onclick="abrirEmisor()">Datos de facturación</button>';
  fcPintarLista();
}
function fcPintarLista(){
  const l = document.getElementById('fcLista'); if (!l) return;
  const lista = fcFiltradas();
  const total = lista.reduce(function(s, x){ return s + (+x.p.importe || 0); }, 0);
  l.innerHTML = lista.length
    ? '<div class="fc-res"><span>' + lista.length + (lista.length === 1 ? ' factura' : ' facturas') + ' · ' + mjEuros(total) + '</span><button type="button" class="mini-btn" onclick="fcDescargarFiltro()">⬇ Descargar ' + (lista.length === 1 ? 'PDF' : 'todas') + '</button></div>'
      + '<div class="fc-lista">' + lista.map(function(x){
        const nom = x.p.factNom || (clientesData[x.k] || {}).nombre || '';
        return '<div class="fc-fila"><div class="fc-fila-t"><b class="fc-num">' + esc(x.p.factura) + '</b><span class="fc-imp">' + mjEuros(x.p.importe) + '</span></div>'
          + '<div class="fc-fila-s"><span>' + esc(nom) + '</span><small>' + mjFecha(x.p.fecha) + '</small></div>'
          + '<button type="button" class="mini-btn fc-pdf" onclick="fcDescargarUna(\'' + esc(x.k) + '\',' + x.i + ')" aria-label="Descargar la factura ' + esc(x.p.factura) + '">⬇ PDF</button></div>';
      }).join('') + '</div>'
    : '<p class="ajx-note">' + (fcTodas().length ? 'Ninguna factura coincide con la búsqueda.' : 'Todavía no hay facturas.') + '</p>';
}
/* tercera pestaña junto a «Clientes» y «Últimos movimientos» */
if (typeof pgSeparar === 'function') pgSeparar = (function(orig){
  return function(){
    const vista = pgVista;
    if (vista === 'facturas') pgVista = 'clientes';
    orig.apply(this, arguments);
    pgVista = vista;
    const cont = document.getElementById('pagosPro'), seg = document.getElementById('pgSeg'); if (!cont || !seg) return;
    const n = fcPendientes().length;
    seg.querySelectorAll('button').forEach(function(b){ if (/movimientos/i.test(b.textContent)) b.innerHTML = b.innerHTML.replace('Últimos movimientos', 'Movimientos'); });
    seg.querySelectorAll('button').forEach(function(b){ const on = vista !== 'facturas' && b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    seg.insertAdjacentHTML('beforeend', '<button type="button" role="tab" aria-selected="' + (vista === 'facturas') + '" class="' + (vista === 'facturas' ? 'on' : '') + '" onclick="pgVer(\'facturas\')">📄 Facturas' + (n ? ' <span class="sg-fn">' + n + '</span>' : '') + '</button>');
    let caja = document.getElementById('fcCaja');
    if (!caja) { caja = document.createElement('div'); caja.id = 'fcCaja'; caja.className = 'fc-caja'; seg.insertAdjacentElement('afterend', caja); }
    const ver = vista === 'facturas';
    caja.hidden = !ver;
    if (ver) {
      const mov = document.getElementById('pgMovsCaja'); if (mov) mov.hidden = true;
      ['.pagos-filtros', '.pagos-lista'].forEach(function(s){ const e = cont.querySelector(s); if (e) e.hidden = true; });
      Array.prototype.forEach.call(cont.querySelectorAll(':scope > .picker-empty'), function(e){ e.hidden = true; });
      fcPintar();
    }
  };
})(pgSeparar);
