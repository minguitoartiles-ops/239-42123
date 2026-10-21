/* =========================================================
   Fitnessindramas — #142 Protocolos en PDF (21/10/2026)
   - Fátima sube PDFs (protocolos, guías…) a la ficha de cada cliente, en el bloque de Nutrición.
   - El cliente los ve en Nutrición («Protocolos de Fátima») y los abre o descarga.
   - Domingo los ve en la ficha, sin poder subir ni borrar.
   Los datos de cada PDF (nombre, fecha, tamaño) van con el cliente; el archivo se guarda en
   IndexedDB de este dispositivo para no llenar la memoria de la app.
   Sin servidor, solo llegan al cliente en este mismo dispositivo (ver PENDIENTE_SUPABASE.md).
   ========================================================= */
const PR_MAX_MB = 10;
let prDbP = null;
function prDb(){
  if (prDbP) return prDbP;
  prDbP = new Promise(function(ok, ko){
    try {
      const r = indexedDB.open('fsd_archivos', 1);
      r.onupgradeneeded = function(){ r.result.createObjectStore('pdf'); };
      r.onsuccess = function(){ ok(r.result); };
      r.onerror = function(){ ko(r.error); };
    } catch(e){ ko(e); }
  });
  return prDbP;
}
function prOp(modo, fn){
  return prDb().then(function(db){ return new Promise(function(ok, ko){
    const tx = db.transaction('pdf', modo), st = tx.objectStore('pdf'), q = fn(st);
    tx.oncomplete = function(){ ok(q && q.result); }; tx.onerror = function(){ ko(tx.error); };
  }); });
}
function prLista(k){ const d = clientesData[k]; return (d && d.protocolos) || []; }
function prEsDietista(){ return !!(coachActivo && coachActivo.rol === 'dietista'); }
function prTam(b){ return b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : fmtNum(Math.round(b / 104857.6) / 10) + ' MB'; }
function prItems(k, puedeBorrar){
  return prLista(k).map(function(p){
    return '<div class="pr-it"><button type="button" class="pr-abrir" onclick="prAbrir(\'' + k + '\',\'' + p.id + '\')">'
      + '<span class="pr-ico" aria-hidden="true">📄</span><span class="pr-t"><b>' + esc(p.nombre) + '</b><small>' + fechaCorta(p.fecha) + ' · ' + prTam(p.tam) + '</small></span><span class="pr-desc">Descargar</span></button>'
      + (puedeBorrar ? '<button type="button" class="pr-x" aria-label="Quitar ' + esc(p.nombre) + '" onclick="prQuitar(\'' + p.id + '\')">✕</button>' : '') + '</div>';
  }).join('');
}

/* ---------- ficha del cliente (profesionales) ---------- */
function prPintarFicha(){
  const box = document.getElementById('fichaNutri'); if (!box || !clienteActual || !coachActivo) return;
  let c = document.getElementById('prFicha');
  if (!c) { c = document.createElement('div'); c.id = 'prFicha'; c.className = 'pr-ficha'; }
  if (c.parentNode !== box) box.appendChild(c);
  const k = clienteActual, n = prLista(k).length, fat = prEsDietista();
  if (!fat && !n) { c.hidden = true; return; }
  c.hidden = false;
  c.innerHTML = '<div class="pr-cab"><span>📄 Protocolos en PDF' + (n ? ' · ' + n : '') + '</span>'
    + (fat ? '<label class="pr-subir">+ Subir PDF<input type="file" accept="application/pdf,.pdf" multiple onchange="prSubir(this)" hidden></label>' : '<span class="pr-nota">los sube Fátima</span>') + '</div>'
    + (n ? '<div class="pr-lista">' + prItems(k, fat) + '</div>' : '<p class="pr-vacio">Sube aquí protocolos o guías para ' + esc((clientesData[k].nombre || '').split(' ')[0]) + '. Los verá en su Nutrición y podrá descargarlos.</p>');
}
function prSubir(inp){
  const k = clienteActual, fs = Array.prototype.slice.call(inp.files || []); inp.value = '';
  if (!k || !prEsDietista() || !fs.length) return;
  const malos = fs.filter(function(f){ return !/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name); });
  if (malos.length) { toast('Solo se pueden subir archivos PDF'); return; }
  const grandes = fs.filter(function(f){ return f.size > PR_MAX_MB * 1048576; });
  if (grandes.length) { toast('«' + grandes[0].name + '» pasa de ' + PR_MAX_MB + ' MB'); return; }
  const d = clientesData[k]; d.protocolos = d.protocolos || [];
  Promise.all(fs.map(function(f){
    const id = 'pr' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    return prOp('readwrite', function(st){ return st.put(f, id); }).then(function(){
      d.protocolos.unshift({ id: id, nombre: f.name.replace(/\.pdf$/i, ''), fecha: new Date().toISOString(), tam: f.size, por: coachActivo.u });
      return f.name.replace(/\.pdf$/i, '');
    });
  })).then(function(nombres){
    try { guardarTodo(); } catch(e){}
    if (typeof crearAviso === 'function') crearAviso(claveCliente(k), 'protocolos', '📄 ' + (coachActivo.u || 'Fátima') + ' te ha enviado ' + (nombres.length === 1 ? 'un protocolo' : nombres.length + ' protocolos'), nombres.join(' · '), { vista: 'plan' });
    prPintarFicha();
    toast(nombres.length === 1 ? 'Protocolo subido: ya lo ve en su Nutrición' : nombres.length + ' protocolos subidos');
  }).catch(function(){ toast('No se ha podido guardar el PDF en este dispositivo'); });
}
function prQuitar(id){
  const k = clienteActual, d = clientesData[k]; if (!d || !prEsDietista()) return;
  const p = prLista(k).filter(function(x){ return x.id === id; })[0]; if (!p) return;
  abrirDialogo({ titulo: 'Quitar protocolo', texto: '«' + p.nombre + '» dejará de estar disponible para ' + (d.nombre || 'el cliente') + '.', ok: 'Quitar', peligro: true, onOk: function(){
    d.protocolos = prLista(k).filter(function(x){ return x.id !== id; });
    prOp('readwrite', function(st){ return st.delete(id); }).catch(function(){});
    try { guardarTodo(); } catch(e){}
    prPintarFicha(); toast('Protocolo quitado');
  } });
}
function prAbrir(k, id){
  const p = prLista(k).filter(function(x){ return x.id === id; })[0]; if (!p) return;
  prOp('readonly', function(st){ return st.get(id); }).then(function(b){
    if (!b) { toast('Este PDF no está en este dispositivo todavía'); return; }
    const url = URL.createObjectURL(b), a = document.createElement('a');
    a.href = url; a.download = p.nombre + '.pdf'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 30000);
  }).catch(function(){ toast('No se ha podido abrir el PDF'); });
}
fsdTras('nuPintarFicha', function(){ prPintarFicha(); });

/* ---------- cliente: en Nutrición ---------- */
function prPintarCliente(){
  const v = document.getElementById('view-plan'); if (!v) return;
  let c = document.getElementById('prCliente');
  const k = clienteActual, l = k && window.fsdSesionCliente && !isCoachView() ? prLista(k) : [];
  if (!l.length) { if (c) c.remove(); return; }
  if (!c) { c = document.createElement('div'); c.id = 'prCliente'; c.className = 'pr-cliente'; }
  const ref = document.getElementById('rcRecetario') || v.querySelector('.add-meal-btn');
  if (c.nextSibling !== ref || c.parentNode !== v) v.insertBefore(c, ref || null);
  c.innerHTML = '<div class="section-lbl">📄 Protocolos de Fátima</div><div class="pr-lista">' + prItems(k, false) + '</div>';
}
fsdTras('goTo', function(r, n){ if (n === 'plan') prPintarCliente(); });
fsdTras('rcPintarRecetario', function(){ prPintarCliente(); });
if (typeof TIPOS_CLIENTE !== 'undefined') TIPOS_CLIENTE.push({ id: 'protocolos', ico: '📄', nombre: 'Protocolos de Fátima', desc: 'Cuando Fátima te envía un protocolo en PDF' });

/* ---------- al borrar un cliente, fuera también sus PDF ---------- */
if (typeof eliminarCliente === 'function') eliminarCliente = (function(orig){
  return function(){
    const ids = prLista(clienteActual).map(function(p){ return p.id; });
    const r = orig.apply(this, arguments);
    setTimeout(function(){ Object.keys(clientesData).forEach(function(k){ prLista(k).forEach(function(p){ const i = ids.indexOf(p.id); if (i > -1) ids.splice(i, 1); }); });
      ids.forEach(function(id){ prOp('readwrite', function(st){ return st.delete(id); }).catch(function(){}); }); }, 5000);
    return r;
  };
})(eliminarCliente);
