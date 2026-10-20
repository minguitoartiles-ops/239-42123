/* =========================================================
   Fitness sin Dramas — Recetas de Fátima (20/10/2026)
   - Fátima crea recetas completas a mano (ingredientes en gramos, raciones y preparación).
   - Con un clic las envía a todos los clientes: la última sale destacada una semana
     («Receta de la semana») y todas quedan en el recetario de cada cliente.
   - El cliente elige en qué comida la usa y ve las cantidades de SU ración: la receta entera
     se escala (mismas proporciones) a las kcal de esa comida.
   Sin servidor, las recetas solo llegan a los clientes de este mismo dispositivo
   (ver PENDIENTE_SUPABASE.md).
   Se carga después de rutinas.js.
   ========================================================= */
const RC_KEY = 'fsd_recetas';
const RC_DESTACADA_DIAS = 7;
let rcMem = null;
function rcDatos(){
  if (rcMem) return rcMem;
  try { rcMem = JSON.parse(localStorage.getItem(RC_KEY) || 'null'); } catch(e){ rcMem = null; }
  if (!rcMem || !Array.isArray(rcMem.lista)) rcMem = { lista: [] };
  return rcMem;
}
function rcGuardar(){ try { localStorage.setItem(RC_KEY, JSON.stringify(rcDatos())); } catch(e){ toast('No se ha podido guardar (memoria llena).'); } }
window.addEventListener('storage', function(e){ if (e.key === RC_KEY) { rcMem = null; rcRefrescar(); } });
function rcPorId(id){ return rcDatos().lista.filter(function(r){ return r.id === id; })[0] || null; }
function rcEnviadas(){ return rcDatos().lista.filter(function(r){ return r.enviada; }).sort(function(a, b){ return a.enviada < b.enviada ? 1 : -1; }); }
function rcDestacada(){ const r = rcEnviadas()[0]; return r && (Date.now() - new Date(r.enviada).getTime()) < RC_DESTACADA_DIAS * 864e5 ? r : null; }

/* ---------- números de una receta ---------- */
function rcIngInfo(n){ return foodInfo(n); }
function rcTotales(r, factor){
  const t = { p: 0, c: 0, f: 0, kcal: 0, sinDatos: [] };
  (r.ing || []).forEach(function(i){
    const info = rcIngInfo(i.n), g = (mjNum(i.g) || 0) * (factor || 1);
    if (!info) { if (g > 0) t.sinDatos.push(i.n); return; }
    t.p += info.p * g / 100; t.c += info.c * g / 100; t.f += info.f * g / 100;
  });
  t.kcal = Math.round(t.p * 4 + t.c * 4 + t.f * 9);
  return t;
}
function rcPorRacion(r){ const t = rcTotales(r, 1 / Math.max(1, mjNum(r.raciones) || 1)); return t; }
function rcAlergenos(r){
  const out = [];
  (r.ing || []).forEach(function(i){ nuAlergenosDe(i.n).forEach(function(a){ if (out.indexOf(a) < 0) out.push(a); }); });
  return out;
}
function rcMacroTxt(t){ return fmtMil(t.kcal) + ' kcal · P ' + Math.round(t.p) + ' · C ' + Math.round(t.c) + ' · G ' + Math.round(t.f); }

/* =========================================================
   1 · Profesionales: pantalla «Recetas»
   ========================================================= */
topScreens.push('view-coach-recetas');
PANTALLAS_CON_TABS.push('view-coach-recetas');
(function(){
  const root = document.getElementById('screenRoot');
  const v = document.createElement('div'); v.id = 'view-coach-recetas'; v.style.display = 'none';
  v.innerHTML = '<div class="alta-top"><button class="back-btn rc-volver" onclick="abrirTabPro(\'mas\')"><span class="vb-chev" aria-hidden="true">‹</span>Volver</button>'
    + '<div style="flex:1"><div class="eyebrow">Nutrición · para todos los clientes</div><div class="h-title" style="margin-top:2px;font-size:22px">Recetas</div></div></div>'
    + '<div class="alta-body"><button type="button" class="btn-primary rc-nueva" onclick="rcEditar()">+ Nueva receta</button>'
    + '<p class="rc-ayuda">Crea la receta con sus ingredientes en gramos y envíala a todos con un clic. Cada cliente verá las cantidades ajustadas a la comida en la que la quiera usar.</p>'
    + '<div id="rcLista"></div></div>';
  const ref = document.getElementById('view-coach-mas');
  root.insertBefore(v, ref ? ref.nextSibling : null);
  // menú lateral del ordenador
  const nav = document.getElementById('coachTabs'), pagos = document.getElementById('ctab-pagos');
  const b = document.createElement('button'); b.className = 'tbi'; b.id = 'ctab-recetas'; b.hidden = true;
  b.setAttribute('onclick', "abrirTabPro('recetas')");
  b.innerHTML = '<span class="tbi-emo" aria-hidden="true">🍲</span><span class="tl-largo">RECETAS</span><span class="tl-corto">RECETAS</span>';
  if (nav) nav.insertBefore(b, pagos || null);
})();
abrirTabPro = (function(orig){
  return function(t){
    if (t === 'recetas') {
      tabProActual = 'recetas'; navDir = 'tab';
      try { rcPintarLista(); showScreen('view-coach-recetas'); } finally { navDir = null; }
      pintarTabsPro();
      const bd = document.querySelector('#view-coach-recetas .alta-body'); if (bd) bd.scrollTop = 0;
      return;
    }
    orig(t);
  };
})(abrirTabPro);
pintarTabsPro = (function(orig){
  return function(){
    orig();
    const b = document.getElementById('ctab-recetas'); if (!b) return;
    if (typeof escActivo === 'function' && escActivo()) { b.classList.toggle('active', tabProActual === 'recetas'); }
    else { b.classList.remove('active'); const m = document.getElementById('ctab-mas'); if (m && tabProActual === 'recetas') m.classList.add('active'); }
  };
})(pintarTabsPro);
atrasPorNiveles = (function(orig){
  return function(){ if (coachActivo && pantallaVisible() === 'view-coach-recetas') { abrirTabPro('mas'); return; } orig(); };
})(atrasPorNiveles);
enPintarMas = (function(orig){
  return function(){
    orig();
    const c = document.getElementById('masPro'); if (!c) return;
    const g = c.querySelector('.list-group'); if (!g) return;
    const n = rcDatos().lista.length;
    g.insertAdjacentHTML('afterbegin', '<div class="list-row" onclick="abrirTabPro(\'recetas\')"><span>🍲 Recetas para clientes</span><span class="ajx-acts">' + (n ? '<span class="rc-num">' + n + '</span>' : '') + '<span class="chev">›</span></span></div>');
  };
})(enPintarMas);

function rcPintarLista(){
  const c = document.getElementById('rcLista'); if (!c) return;
  const l = rcDatos().lista.slice().sort(function(a, b){ return (b.enviada || b.creada || '') > (a.enviada || a.creada || '') ? 1 : -1; });
  const dest = rcDestacada();
  if (!l.length) { c.innerHTML = '<div class="rc-vacio">Aún no hay recetas. Empieza con la de este miércoles 🍽️</div>'; return; }
  const nCli = Object.keys(clientesData).filter(function(k){ return !(typeof mjEsBaja === 'function' && mjEsBaja(clientesData[k])); }).length;
  c.innerHTML = l.map(function(r){
    const t = rcPorRacion(r), al = rcAlergenos(r);
    const estado = r.enviada
      ? '<span class="rc-estado ok">' + (dest && dest.id === r.id ? '⭐ Receta de la semana · ' : '') + 'Enviada el ' + fechaCorta(r.enviada) + '</span>'
      : '<span class="rc-estado">Borrador</span>';
    return '<div class="card rc-card"><div class="rc-card-h"><b>' + esc(r.nombre) + '</b>' + estado + '</div>'
      + '<div class="rc-card-m">Por ración (' + (mjNum(r.raciones) || 1) + ' raciones): ' + rcMacroTxt(t) + '</div>'
      + '<div class="rc-card-i">' + (r.ing || []).map(function(i){ return esc(i.n); }).join(' · ') + '</div>'
      + (al.length ? '<div class="rc-card-a">⚠️ ' + al.map(function(a){ return esc(typeof nombreAlergia === 'function' ? nombreAlergia(a) : a); }).join(', ') + '</div>' : '')
      + '<div class="rc-card-b"><button type="button" class="btn-primary" onclick="rcEnviar(\'' + r.id + '\')">📣 ' + (r.enviada ? 'Volver a enviar a todos' : 'Enviar a todos (' + nCli + ')') + '</button>'
      + '<button type="button" class="btn-eq" onclick="rcEditar(\'' + r.id + '\')">Editar</button>'
      + '<button type="button" class="btn-eq rc-borrar" onclick="rcBorrar(\'' + r.id + '\')" aria-label="Borrar receta">✕</button></div></div>';
  }).join('');
}

/* ---------- editor de receta ---------- */
let rcBorr = null;
function rcEditar(id){
  const r = id ? rcPorId(id) : null;
  rcBorr = r ? JSON.parse(JSON.stringify(r)) : { id: 'r' + Date.now().toString(36), nombre: '', raciones: 4, ing: [{ n: '', g: '' }, { n: '', g: '' }, { n: '', g: '' }], pasos: '', creada: new Date().toISOString() };
  const o = mjHoja('rcHoja');
  o.innerHTML = '<div class="fsd-sheet rc-sheet"><div class="sheet-head"><h3>' + (r ? 'Editar receta' : 'Nueva receta') + '</h3><button class="x-btn" onclick="mjCerrarHoja(\'rcHoja\')" aria-label="Cerrar">×</button></div>'
    + '<div class="field"><label for="rcNom">Nombre</label><input type="text" id="rcNom" placeholder="Por ejemplo: Pollo con salsa de curry" value="' + esc(rcBorr.nombre) + '"></div>'
    + '<div class="field rc-rac"><label for="rcRac">Raciones que salen</label><input type="text" inputmode="numeric" id="rcRac" value="' + esc(rcBorr.raciones) + '"></div>'
    + '<div class="section-lbl">Ingredientes (en crudo, para la receta entera)</div>'
    + '<datalist id="rcAlims">' + FOOD_CATALOG.map(function(f){ return '<option value="' + esc(f.n) + '">'; }).join('') + '</datalist>'
    + '<div class="rc-ing-cab" aria-hidden="true"><span>Alimento</span><span>Gramos</span><span></span></div><div id="rcIngs"></div>'
    + '<button type="button" class="rc-mas" onclick="rcIngAnadir()">+ Ingrediente</button>'
    + '<div id="rcTot" class="rc-tot"></div>'
    + '<div class="field"><label for="rcPasos">Preparación</label><textarea id="rcPasos" rows="5" placeholder="1. Corta el pollo en dados…">' + esc(rcBorr.pasos || '') + '</textarea></div>'
    + '<div class="btn-row"><button class="btn-eq" onclick="rcGuardarBorrador()">Guardar</button><button class="btn-eq btn-eq-p" onclick="rcGuardarBorrador(true)">Guardar y enviar a todos</button></div></div>';
  o.classList.add('show');
  rcIngPintar();
  o.querySelector('#rcNom').oninput = function(){ rcBorr.nombre = this.value; };
  o.querySelector('#rcRac').oninput = function(){ this.value = this.value.replace(/[^0-9]/g, ''); rcBorr.raciones = this.value; rcTotPintar(); };
  o.querySelector('#rcPasos').oninput = function(){ rcBorr.pasos = this.value; };
  if (!r) setTimeout(function(){ const n = document.getElementById('rcNom'); if (n) n.focus(); }, 120);
}
function rcIngPintar(){
  const c = document.getElementById('rcIngs'); if (!c) return;
  c.innerHTML = rcBorr.ing.map(function(i, k){
    const sin = i.n && !rcIngInfo(i.n);
    return '<div class="rc-ing" data-k="' + k + '"><input type="text" class="rc-ing-n" list="rcAlims" value="' + esc(i.n) + '" placeholder="Busca un alimento" aria-label="Ingrediente ' + (k + 1) + '">'
      + '<input type="text" inputmode="decimal" class="rc-ing-g" value="' + esc(i.g) + '" placeholder="g" aria-label="Gramos del ingrediente ' + (k + 1) + '">'
      + '<button type="button" class="ru-ss-x rc-ing-x" tabindex="-1" onclick="rcIngQuitar(' + k + ')" aria-label="Quitar ingrediente">✕</button>'
      + (sin ? '<small class="rc-sin">No está en el catálogo: no cuenta en las calorías (vale para especias o «al gusto»)</small>' : '') + '</div>';
  }).join('');
  Array.prototype.forEach.call(c.querySelectorAll('.rc-ing'), function(f){
    const k = +f.dataset.k;
    f.querySelector('.rc-ing-n').oninput = function(){ rcBorr.ing[k].n = this.value; rcTotPintar(); };
    f.querySelector('.rc-ing-n').onchange = function(){ const inf = rcIngInfo(this.value); if (inf) { rcBorr.ing[k].n = inf.n; } rcIngPintar(); };
    f.querySelector('.rc-ing-g').oninput = function(){ this.value = this.value.replace(/[^0-9.,]/g, ''); rcBorr.ing[k].g = this.value; rcTotPintar(); };
  });
  rcTotPintar();
}
function rcIngAnadir(){ rcBorr.ing.push({ n: '', g: '' }); rcIngPintar(); const l = document.querySelectorAll('#rcIngs .rc-ing-n'); if (l.length) l[l.length - 1].focus(); }
function rcIngQuitar(k){ rcBorr.ing.splice(k, 1); if (!rcBorr.ing.length) rcBorr.ing.push({ n: '', g: '' }); rcIngPintar(); }
function rcTotPintar(){
  const c = document.getElementById('rcTot'); if (!c) return;
  const r = rcLimpia(rcBorr), tot = rcTotales(r, 1), rac = rcPorRacion(r), al = rcAlergenos(r);
  c.innerHTML = r.ing.length
    ? '<div><b>Receta entera:</b> ' + rcMacroTxt(tot) + '</div><div><b>Por ración (' + (mjNum(r.raciones) || 1) + '):</b> ' + rcMacroTxt(rac) + '</div>'
      + (al.length ? '<div class="rc-card-a">⚠️ Contiene: ' + al.map(function(a){ return esc(typeof nombreAlergia === 'function' ? nombreAlergia(a) : a); }).join(', ') + '</div>' : '')
    : '<div>Añade los ingredientes para ver las calorías.</div>';
}
function rcLimpia(r){
  return Object.assign({}, r, { nombre: String(r.nombre || '').trim(), raciones: Math.max(1, Math.min(20, mjNum(r.raciones) || 1)),
    ing: (r.ing || []).filter(function(i){ return String(i.n || '').trim(); }).map(function(i){ return { n: String(i.n).trim(), g: mjNum(i.g) || 0 }; }) });
}
function rcGuardarBorrador(enviar){
  const r = rcLimpia(rcBorr);
  if (!r.nombre) { toast('Ponle un nombre a la receta'); document.getElementById('rcNom').focus(); return; }
  if (!r.ing.some(function(i){ return i.g > 0 && rcIngInfo(i.n); })) { toast('Añade al menos un ingrediente del catálogo con sus gramos'); return; }
  const l = rcDatos().lista, i = l.findIndex(function(x){ return x.id === r.id; });
  r.editada = new Date().toISOString();
  if (i > -1) l[i] = r; else l.push(r);
  rcGuardar(); mjCerrarHoja('rcHoja'); rcPintarLista();
  if (enviar) rcEnviar(r.id); else toast('Receta guardada');
}
function rcBorrar(id){
  const r = rcPorId(id); if (!r) return;
  abrirDialogo({ titulo: 'Borrar receta', texto: '¿Borrar «' + r.nombre + '»? Desaparecerá también del recetario de los clientes.', ok: 'Borrar', peligro: true,
    onOk: function(){ rcDatos().lista = rcDatos().lista.filter(function(x){ return x.id !== id; }); rcGuardar(); rcPintarLista(); toast('Receta borrada'); } });
}
function rcEnviar(id){
  const r = rcPorId(id); if (!r) return;
  const ks = Object.keys(clientesData).filter(function(k){ return !(typeof mjEsBaja === 'function' && mjEsBaja(clientesData[k])); });
  const hacer = function(){
    r.enviada = new Date().toISOString(); r.por = coachActivo ? coachActivo.u : 'Fátima';
    rcGuardar();
    if (typeof crearAviso === 'function') ks.forEach(function(k){ crearAviso(claveCliente(k), 'recetas', '🍲 Receta de la semana: ' + r.nombre, 'Mira las cantidades para ti y anímate a prepararla', { vista: 'plan', receta: r.id }); });
    rcPintarLista();
    toast('Enviada a ' + ks.length + (ks.length === 1 ? ' cliente' : ' clientes') + ': «' + r.nombre + '»');
  };
  abrirDialogo({ titulo: 'Enviar a todos', texto: '«' + r.nombre + '» llegará a ' + ks.length + (ks.length === 1 ? ' cliente' : ' clientes') + ' como «Receta de la semana» y quedará en su recetario.', ok: 'Enviar', onOk: hacer });
}

/* =========================================================
   2 · Cliente: «Receta de la semana» en Hoy, recetario en Nutrición y sus cantidades
   ========================================================= */
if (typeof TIPOS_CLIENTE !== 'undefined') TIPOS_CLIENTE.push({ id: 'recetas', ico: '🍲', nombre: 'Recetas de Fátima', desc: 'Cuando Fátima comparte una receta nueva' });
function rcEsCliente(){ return !!(clienteActual && window.fsdSesionCliente && !isCoachView()); }
function rcPintarHoy(){
  const v = document.getElementById('view-hoy'); if (!v) return;
  let c = document.getElementById('rcHoy');
  const r = rcEsCliente() ? rcDestacada() : null;
  if (!r) { if (c) c.remove(); return; }
  if (!c) {
    c = document.createElement('button'); c.type = 'button'; c.id = 'rcHoy'; c.className = 'rc-hoy';
    const ref = document.getElementById('hoyToca') || document.getElementById('weekRow');
    v.insertBefore(c, ref ? ref.nextSibling : v.firstChild);
  }
  const t = rcPorRacion(r);
  c.setAttribute('onclick', "rcAbrir('" + r.id + "')");
  c.innerHTML = '<span class="rc-hoy-ico" aria-hidden="true">🍲</span><span class="rc-hoy-t"><span class="ht-eye">Receta de la semana · ' + esc(r.por || 'Fátima') + '</span><b>' + esc(r.nombre) + '</b><span class="ht-sub">Mira las cantidades para ti · ' + fmtMil(t.kcal) + ' kcal la ración original</span></span><span class="ht-cta">Ver ›</span>';
}
function rcPintarRecetario(){
  const v = document.getElementById('view-plan'); if (!v) return;
  let c = document.getElementById('rcRecetario');
  const l = rcEsCliente() ? rcEnviadas() : [];
  if (!l.length) { if (c) c.remove(); return; }
  if (!c) {
    c = document.createElement('div'); c.id = 'rcRecetario'; c.className = 'rc-recetario';
    const add = v.querySelector('.add-meal-btn'); v.insertBefore(c, add || null);
  }
  const dest = rcDestacada();
  c.innerHTML = '<div class="section-lbl">🍲 Recetas de Fátima</div>' + l.map(function(r){
    const t = rcPorRacion(r), conf = rcConflictosCliente(r);
    return '<button type="button" class="rc-it" onclick="rcAbrir(\'' + r.id + '\')"><span><b>' + esc(r.nombre) + '</b>'
      + (dest && dest.id === r.id ? '<span class="rc-badge">Esta semana</span>' : '')
      + '<small>' + fmtMil(t.kcal) + ' kcal la ración original' + (conf.length ? ' · <i>⚠️ ' + esc(conf.map(function(a){ return typeof nombreAlergia === 'function' ? nombreAlergia(a) : a; }).join(', ')) + '</i>' : '') + '</small></span><span class="chev">›</span></button>';
  }).join('');
}
function rcConflictosCliente(r){
  const out = [];
  (r.ing || []).forEach(function(i){ nuConflictos(i.n, clienteActual).forEach(function(a){ if (out.indexOf(a) < 0) out.push(a); }); });
  return out;
}
function rcComidasCliente(){
  const k = clienteActual; if (!k) return [];
  const res = typeof nuResumenCliente === 'function' ? nuResumenCliente(k) : null;
  if (!res || !res.obj) return [];
  return res.comidas.filter(function(c){ return c.kcalObj > 0; }).map(function(c){
    const s = c.kcalObj / res.obj.kcal;
    return { titulo: c.titulo, kcal: c.kcalObj, p: res.obj.p * s, c: res.obj.c * s, f: res.obj.f * s };
  });
}
let rcElegida = {};
function rcAbrir(id, comida){
  const r = rcPorId(id); if (!r) { toast('Esta receta ya no está disponible'); return; }
  const coms = rcComidasCliente(), rac = rcPorRacion(r);
  if (comida != null) rcElegida[id] = comida;
  let i = rcElegida[id];
  if (i == null && coms.length) {                       // de inicio, la comida cuyas kcal se parecen más a una ración
    let mejor = 0; coms.forEach(function(c, k){ if (Math.abs(c.kcal - rac.kcal) < Math.abs(coms[mejor].kcal - rac.kcal)) mejor = k; }); i = mejor;
  }
  const com = coms[i];
  const factor = com && rac.kcal > 0 ? com.kcal / rac.kcal / Math.max(1, r.raciones) : 1 / Math.max(1, r.raciones);
  const tu = rcTotales(r, factor), conf = rcConflictosCliente(r);
  const o = mjHoja('rcVer');
  o.innerHTML = '<div class="fsd-sheet rc-sheet"><div class="sheet-head"><h3>' + esc(r.nombre) + '</h3><button class="x-btn" onclick="mjCerrarHoja(\'rcVer\')" aria-label="Cerrar">×</button></div>'
    + '<p class="rc-por">Receta de ' + esc(r.por || 'Fátima') + (r.enviada ? ' · ' + fechaCorta(r.enviada) : '') + '</p>'
    + (conf.length ? '<div class="rc-aviso">⚠️ Contiene ' + esc(conf.map(function(a){ return typeof nombreAlergia === 'function' ? nombreAlergia(a) : a; }).join(', ')) + ', que tienes en tus alergias o intolerancias. Consúltalo con Fátima antes de prepararla.</div>' : '')
    + (coms.length
      ? '<div class="section-lbl">¿En qué comida la quieres?</div><div class="chips rc-coms">' + coms.map(function(c, k){ return '<button type="button" class="chip' + (k === i ? ' selected' : '') + '" onclick="rcAbrir(\'' + r.id + '\',' + k + ')">' + esc(c.titulo) + ' · ' + fmtMil(Math.round(c.kcal)) + ' kcal</button>'; }).join('') + '</div>'
      : '<div class="rc-aviso suave">Fátima aún no ha calculado tus calorías: estas son las cantidades de una ración de la receta original.</div>')
    + '<div class="section-lbl">' + (com ? 'Tu ración para «' + esc(com.titulo) + '»' : 'Una ración') + '</div>'
    + '<div class="rc-ings">' + r.ing.map(function(x){
        const g = (mjNum(x.g) || 0) * factor, inf = rcIngInfo(x.n);
        return '<div class="rc-ing-v"><span>' + esc(x.n) + '</span><b>' + (!inf || g < 1 ? 'al gusto' : nuRedondear(g) + ' g') + '</b></div>';
      }).join('') + '</div>'
    + '<div class="rc-mac"><div><b>' + fmtMil(tu.kcal) + '</b><span>kcal</span></div><div><b>' + Math.round(tu.p) + '</b><span>proteína</span></div><div><b>' + Math.round(tu.c) + '</b><span>carbohidrato</span></div><div><b>' + Math.round(tu.f) + '</b><span>grasa</span></div></div>'
    + (com ? '<p class="rc-nota">Tu «' + esc(com.titulo) + '» del plan: ' + fmtMil(Math.round(com.kcal)) + ' kcal · P ' + Math.round(com.p) + ' · C ' + Math.round(com.c) + ' · G ' + Math.round(com.f) + '. La receta mantiene sus proporciones, así que los macros pueden variar un poco.</p>' : '')
    + (r.pasos ? '<div class="section-lbl">Preparación</div><div class="rc-pasos">' + esc(r.pasos).replace(/\n/g, '<br>') + '</div>' : '')
    + '<details class="rc-orig"><summary>Receta original (' + r.raciones + ' raciones)</summary>' + r.ing.map(function(x){ return '<div class="rc-ing-v"><span>' + esc(x.n) + '</span><b>' + (x.g ? fmtNum(x.g) + ' g' : 'al gusto') + '</b></div>'; }).join('') + '</details>'
    + '</div>';
  o.classList.add('show');
}
function rcRefrescar(){ rcPintarHoy(); rcPintarRecetario(); if (pantallaVisible() === 'view-coach-recetas') rcPintarLista(); }
renderHoy = (function(orig){ return function(){ const r = orig.apply(this, arguments); rcPintarHoy(); return r; }; })(renderHoy);
goTo = (function(orig){ return function(n){ const r = orig.apply(this, arguments); if (n === 'hoy') rcPintarHoy(); if (n === 'plan') rcPintarRecetario(); return r; }; })(goTo);
atrasDentroApp = (function(orig){ return function(){ if (capaVisible('rcVer')) { mjCerrarHoja('rcVer'); return true; } if (capaVisible('rcHoja')) { mjCerrarHoja('rcHoja'); return true; } return orig(); }; })(atrasDentroApp);
// abrir la receta desde el aviso
if (typeof abrirAviso === 'function') abrirAviso = (function(orig){
  return function(dest, id){
    const x = ((leerAvisos().lista[dest]) || []).filter(function(y){ return y.id === id; })[0];
    orig(dest, id);
    if (x && x.ir && x.ir.receta) rcAbrir(x.ir.receta);
  };
})(abrirAviso);

/* ---------- copia de seguridad completa: también las recetas ---------- */
if (typeof descargarCopiaCompleta === 'function') descargarCopiaCompleta = (function(orig){
  return function(){
    const ent = entregarArchivo;
    entregarArchivo = function(nombre, o){ if (o && o.datos) o.datos.recetas = rcDatos(); return ent.apply(this, arguments); };
    try { orig(); } finally { entregarArchivo = ent; }
  };
})(descargarCopiaCompleta);
(function(){
  // al restaurar una copia completa, sus recetas llegan dentro de los datos: se pasan a su sitio una sola vez
  try {
    const d = JSON.parse(localStorage.getItem(DB_KEY) || 'null');
    if (d && d.recetas && Array.isArray(d.recetas.lista)) {
      localStorage.setItem(RC_KEY, JSON.stringify(d.recetas)); rcMem = null;
      delete d.recetas; localStorage.setItem(DB_KEY, JSON.stringify(d));
    }
  } catch(e){}
})();
/* política de cookies: también se guarda el recetario */
if (typeof abrirLegal === 'function') abrirLegal = (function(orig){
  return function(tipo){
    orig(tipo);
    if (tipo !== 'cookies') return;
    const tb = document.querySelector('#legalCuerpo .legal-tabla tbody'); if (!tb || tb.querySelector('.rc-legal')) return;
    const av = Array.prototype.filter.call(tb.rows, function(r){ return /fsd_avisos/.test(r.textContent); })[0];
    const tr = document.createElement('tr'); tr.className = 'rc-legal';
    tr.innerHTML = '<td>fsd_recetas</td><td>Técnica</td><td>Guardar las recetas que comparte Fátima</td><td>Hasta que borres los datos</td>';
    tb.insertBefore(tr, av ? av.nextSibling : null);
  };
})(abrirLegal);

rcRefrescar();
