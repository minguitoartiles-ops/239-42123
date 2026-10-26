/* =========================================================
   Fitnessindramas — Recetas de Fátima (20/10/2026)
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
    + '<div style="flex:1"><div class="eyebrow">Nutrición · para todos los clientes</div><div class="h-title" style="margin-top:2px;font-size:var(--fs-2xl)">Recetas</div></div></div>'
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

/* =========================================================
   #224 Creador de recetas: buscador propio de alimentos (el mismo catálogo que los planes de nutrición,
   con los alimentos propios de Fátima), con emoji del tipo de alimento, calorías y macros por 100 g,
   agrupado por macronutriente y manejable con teclado. Sustituye a la lista nativa del navegador.
   ========================================================= */
const RC_GRUPOS = [['p', '🥩 Proteína'], ['c', '🍚 Hidratos'], ['f', '🥑 Grasa']];
function rcEmo(n, g){ return typeof alimEmoji === 'function' ? alimEmoji(n, g) : '🍽️'; }
function rcBuscar(q){
  q = norm(String(q || '').trim());
  const pal = q.split(/\s+/).filter(function(w){ return w && ['de', 'del', 'la', 'el', 'y', 'con'].indexOf(w) < 0; });
  const l = FOOD_CATALOG.concat(typeof RC_BASICOS !== 'undefined' ? RC_BASICOS : []).filter(function(o){ const n = norm(o.n); return pal.every(function(w){ return n.indexOf(w) > -1; }); });
  l.sort(function(a, b){
    const ia = q ? (norm(a.n).indexOf(q) === 0 ? 0 : 1) : 0, ib = q ? (norm(b.n).indexOf(q) === 0 ? 0 : 1) : 0;
    return ia - ib || a.n.localeCompare(b.n, 'es');
  });
  return l;
}
function rcSugCerrar(){ Array.prototype.forEach.call(document.querySelectorAll('.rc-sug'), function(s){ s.remove(); }); Array.prototype.forEach.call(document.querySelectorAll('.rc-ing-n[aria-expanded="true"]'), function(i){ i.setAttribute('aria-expanded', 'false'); }); }
function rcSugAbrir(inp){
  rcSugCerrar();
  const fila = inp.closest('.rc-ing'); if (!fila) return;
  const k = +fila.dataset.k, q = inp.value.trim(), l = rcBuscar(q);
  const s = document.createElement('div'); s.className = 'rc-sug'; s.id = 'rcSug'; s.setAttribute('role', 'listbox');
  const item = function(o){
    return '<div class="rc-sug-it" role="option" data-n="' + esc(o.n) + '">'
      + '<span class="rc-sug-e" aria-hidden="true">' + rcEmo(o.n, o.g) + '</span>'
      + '<span class="rc-sug-t"><b>' + esc(o.n) + '</b><small>' + foodKcal(o) + ' kcal · P ' + o.p + ' · C ' + o.c + ' · G ' + o.f + ' /100 g</small></span>'
      + (o.custom ? '<span class="rc-sug-b">Propio</span>' : (o.basico ? '<span class="rc-sug-b">Repostería</span>' : (o.super ? '<span class="rc-sug-b">Súper</span>' : ''))) + '</div>';
  };
  let h = '';
  if (!l.length) h = '<div class="rc-sug-vacio">Ningún alimento coincide. Puedes dejarlo escrito (especias, «al gusto»): no cuenta en las calorías.</div>';
  else if (q) h = l.slice(0, 60).map(item).join('');
  else RC_GRUPOS.forEach(function(g){ const x = l.filter(function(o){ return o.g === g[0]; }); if (x.length) h += '<div class="rc-sug-g">' + g[1] + '</div>' + x.map(item).join(''); });
  s.innerHTML = h;
  fila.appendChild(s);
  inp.setAttribute('aria-expanded', 'true'); inp.setAttribute('aria-controls', 'rcSug');
  s.addEventListener('mousedown', function(e){ e.preventDefault(); });
  Array.prototype.forEach.call(s.querySelectorAll('.rc-sug-it'), function(it){
    it.addEventListener('click', function(){ rcSugElegir(k, it.dataset.n); });
  });
}
function rcSugElegir(k, n){
  rcSugCerrar();
  rcBorr.ing[k].n = n;
  rcIngPintar();
  const g = document.querySelector('#rcIngs .rc-ing[data-k="' + k + '"] .rc-ing-g');
  if (g) { g.focus(); g.select(); }
}
function rcSugMover(inp, d){
  const s = document.getElementById('rcSug'); if (!s) { rcSugAbrir(inp); return; }
  const its = Array.prototype.slice.call(s.querySelectorAll('.rc-sug-it')); if (!its.length) return;
  let i = its.findIndex(function(x){ return x.classList.contains('on'); });
  if (i > -1) its[i].classList.remove('on');
  i = Math.max(0, Math.min(its.length - 1, i + d));
  its[i].classList.add('on'); its[i].scrollIntoView({ block: 'nearest' });
}
/* calorías de un ingrediente, en su fila, sin repintar la lista (no se pierde el foco al escribir o tabular) */
function rcIngKcal(f, k){
  const ing = rcBorr.ing[k], inf = ing && ing.n ? rcIngInfo(ing.n) : null;
  let s = f.querySelector('.rc-ing-k'); const g = inf ? mjNum(ing.g) : 0;
  if (!g) { if (s) s.remove(); return; }
  if (!s) { s = document.createElement('small'); s.className = 'rc-ing-k'; f.appendChild(s); }
  s.textContent = Math.round(foodKcal(inf) * g / 100) + ' kcal · P ' + Math.round(inf.p * g / 100) + ' · C ' + Math.round(inf.c * g / 100) + ' · G ' + Math.round(inf.f * g / 100);
}
rcIngPintar = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const c = document.getElementById('rcIngs'); if (!c) return r;
    Array.prototype.forEach.call(c.querySelectorAll('.rc-ing'), function(f){
      const k = +f.dataset.k, inp = f.querySelector('.rc-ing-n'), ing = rcBorr.ing[k];
      inp.removeAttribute('list'); inp.setAttribute('role', 'combobox'); inp.setAttribute('aria-autocomplete', 'list'); inp.setAttribute('aria-expanded', 'false'); inp.autocomplete = 'off';
      const inf = ing && ing.n ? rcIngInfo(ing.n) : null;
      if (inf) {
        f.classList.add('rc-ok');
        inp.insertAdjacentHTML('beforebegin', '<span class="rc-ing-emo" aria-hidden="true">' + rcEmo(inf.n, inf.g) + '</span>');
        rcIngKcal(f, k);
      }
      const prev = inp.oninput;
      inp.oninput = function(){ if (prev) prev.call(this); rcSugAbrir(this); };
      inp.onfocus = function(){ if (!this.value) rcSugAbrir(this); };
      inp.onclick = function(){ rcSugAbrir(this); };
      inp.onblur = function(){ setTimeout(rcSugCerrar, 120); };
      inp.onkeydown = function(e){
        if (e.key === 'ArrowDown') { e.preventDefault(); rcSugMover(this, 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); rcSugMover(this, -1); }
        else if (e.key === 'Enter') { const on = document.querySelector('#rcSug .rc-sug-it.on') || (this.value.trim() && document.querySelector('#rcSug .rc-sug-it')); if (on) { e.preventDefault(); rcSugElegir(k, on.dataset.n); } }
        else if (e.key === 'Escape') { if (document.getElementById('rcSug')) { e.preventDefault(); e.stopPropagation(); rcSugCerrar(); } }
      };
      const gi = f.querySelector('.rc-ing-g'), pg = gi.oninput;
      gi.oninput = function(){ if (pg) pg.call(this); rcIngKcal(f, k); };
    });
    return r;
  };
})(rcIngPintar);


/* =========================================================
   #236 Ingredientes básicos de repostería (harinas, azúcar, cacao, levadura…)
   Solo para el creador de recetas: no están en el catálogo de los planes ni en el buscador de los clientes.
   Valores de referencia por 100 g (BEDCA y, si no lo recoge, USDA).
   ========================================================= */
const RC_BASICOS = [
  ['Harina de trigo', 10, 72, 1.2], ['Harina de trigo integral', 13, 62, 2.5], ['Harina de maíz', 6.9, 72, 3.9],
  ['Maicena (almidón de maíz)', 0.3, 91, 0.1], ['Harina de avena', 14.7, 60, 9.1], ['Harina de almendra', 21.4, 10.7, 50],
  ['Harina de arroz', 6, 80, 1.4], ['Harina de garbanzo', 22.4, 47, 6.7], ['Azúcar blanco', 0, 100, 0],
  ['Azúcar moreno', 0.1, 97, 0], ['Panela', 0.4, 90, 0.1], ['Miel', 0.3, 82, 0], ['Cacao puro en polvo', 19.6, 21, 13.7],
  ['Levadura química', 0, 27.7, 0], ['Bicarbonato sódico', 0, 0, 0], ['Gelatina neutra en polvo', 85.6, 0, 0.1],
  ['Edulcorante (eritritol)', 0, 0, 0], ['Leche condensada', 7.9, 54.4, 8.7]
].map(function(x){ return { n: x[0], p: x[1], c: x[2], f: x[3], g: nuGrupoPorMacros(x[1], x[2], x[3]), basico: true, ref: 'BEDCA/USDA' }; });
function rcBasico(n){ const k = norm(String(n || '').trim()); return RC_BASICOS.filter(function(o){ return norm(o.n) === k; })[0] || null; }
rcIngInfo = function(n){ return foodInfo(n) || rcBasico(n); };
NU_ALERGENOS.push(
  [/harina de trigo/i, ['gluten', 'celiaquia', 'sgnc']],
  [/harina de avena/i, ['gluten']],
  [/harina de almendra/i, ['frutoscascara']],
  [/harina de garbanzo/i, ['legumbres']],
  [/leche condensada/i, ['leche', 'lactosa']],
  [/^miel$|panela|az[uú]car/i, ['fructosa']]
);
if (typeof ALIM_TIPOS !== 'undefined') ALIM_TIPOS.unshift([/^harina|maicena/, '🌾'], [/azucar|panela|edulcorante/, '🍬'], [/^miel/, '🍯'], [/levadura|bicarbonato|gelatina/, '🧂'], [/leche condensada/, '🥛']);

/* =========================================================
   #237 Vídeo de la receta (Instagram, TikTok, YouTube o Facebook de Fátima)
   El cliente lo abre en la red social: así llega también a su perfil.
   ========================================================= */
const RC_VIDEO_RE = /^https:\/\/([a-z0-9-]+\.)*(instagram\.com|tiktok\.com|youtube\.com|youtu\.be|facebook\.com|fb\.watch)(\/|$)/i;
function rcVideoOk(u){ u = String(u || '').trim(); return !u || (RC_VIDEO_RE.test(u) && u.length < 500 && !/[\s"'<>]/.test(u)); }
function rcRed(u){ const m = String(u).match(/instagram|tiktok|youtu|facebook|fb\.watch/i); return m ? ({ instagram: 'Instagram', tiktok: 'TikTok', youtu: 'YouTube', facebook: 'Facebook', 'fb.watch': 'Facebook' })[m[0].toLowerCase()] : ''; }
rcEditar = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const o = document.getElementById('rcHoja'); if (!o) return r;
    const fila = o.querySelector('.btn-row'); if (!fila || o.querySelector('#rcVideo')) return r;
    fila.insertAdjacentHTML('beforebegin', '<div class="field"><label for="rcVideo">Vídeo de la receta (opcional)</label>'
      + '<input type="url" id="rcVideo" inputmode="url" placeholder="Pega el enlace de Instagram, TikTok, YouTube o Facebook" value="' + esc(rcBorr.video || '') + '" autocomplete="off">'
      + '<small class="rc-video-ayuda" id="rcVideoAyuda">Tus clientes verán «▶ Ver cómo se hace» y lo abrirán en la red social.</small></div>');
    const i = o.querySelector('#rcVideo');
    i.oninput = function(){
      rcBorr.video = this.value.trim();
      const ok = rcVideoOk(this.value);
      this.classList.toggle('rc-mal', !ok);
      document.getElementById('rcVideoAyuda').textContent = ok ? (this.value.trim() ? '✓ Vídeo de ' + rcRed(this.value) : 'Tus clientes verán «▶ Ver cómo se hace» y lo abrirán en la red social.') : 'Pega un enlace https de Instagram, TikTok, YouTube o Facebook.';
    };
    return r;
  };
})(rcEditar);
rcLimpia = (function(orig){
  return function(r){ const x = orig.apply(this, arguments); const v = String(r.video || '').trim(); if (v && rcVideoOk(v)) x.video = v; else delete x.video; return x; };
})(rcLimpia);
rcGuardarBorrador = (function(orig){
  return function(){
    if (rcBorr && !rcVideoOk(rcBorr.video)) { toast('El enlace del vídeo no es válido: usa uno de Instagram, TikTok, YouTube o Facebook'); const i = document.getElementById('rcVideo'); if (i) i.focus(); return; }
    return orig.apply(this, arguments);
  };
})(rcGuardarBorrador);
rcAbrir = (function(orig){
  return function(id){
    const r0 = orig.apply(this, arguments);
    const r = rcPorId(id), o = document.getElementById('rcVer');
    if (r && r.video && rcVideoOk(r.video) && o && !o.querySelector('.rc-video')) {
      const por = o.querySelector('.rc-por');
      const a = '<a class="rc-video" href="' + esc(r.video) + '" target="_blank" rel="noopener noreferrer"><span aria-hidden="true">▶</span> Ver cómo se hace<small>Vídeo de ' + esc(r.por || 'Fátima') + ' en ' + rcRed(r.video) + '</small></a>';
      if (por) por.insertAdjacentHTML('afterend', a);
    }
    return r0;
  };
})(rcAbrir);

/* =========================================================
   26/10 · Foto de la receta (Fátima): entra por los ojos
   · En el editor: «📷 Añadir foto» (cámara o galería), con vista previa, «Cambiar» y «Quitar».
   · Se reduce a 1000 px (JPEG) antes de guardarla para no llenar la memoria del móvil.
   · Se ve en la lista de recetas de Fátima, en «Receta de la semana» (Hoy), en el recetario del
     cliente y arriba del todo al abrir la receta.
   ========================================================= */
function rcFotoOk(u){ return typeof u === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u) && u.length < 700000; }
function rcFotoPintar(){
  const box = document.getElementById('rcFotoBox'); if (!box || !rcBorr) return;
  const f = rcFotoOk(rcBorr.foto) ? rcBorr.foto : '';
  box.innerHTML = f
    ? '<div class="rc-foto-prev" style="background-image:url(&quot;' + f + '&quot;)" role="img" aria-label="Foto de la receta"></div>'
      + '<div class="rc-foto-acc"><button type="button" class="btn-eq" onclick="rcFotoElegir()">📷 Cambiar foto</button><button type="button" class="btn-eq rc-foto-quitar" onclick="rcFotoQuitar()">Quitar</button></div>'
    : '<button type="button" class="rc-foto-vacia" onclick="rcFotoElegir()"><span aria-hidden="true">📷</span><b>Añadir foto</b><small>Una buena foto hace que la prueben. Desde la cámara o la galería.</small></button>';
}
function rcFotoElegir(){
  let i = document.getElementById('rcFotoInput');
  if (!i) {
    i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.id = 'rcFotoInput'; i.hidden = true;
    i.addEventListener('change', function(){
      const f = i.files && i.files[0]; if (!f) return;
      if (!/^image\//.test(f.type)) { toast('Elige una imagen'); return; }
      toast('Preparando la foto…');
      reducirImagen(f, 1000, 0.72, function(d){
        const fin = function(x){
          if (!rcFotoOk(x)) { toast('No se ha podido usar esa foto'); return; }
          if (rcBorr) { rcBorr.foto = x; rcFotoPintar(); toast('Foto añadida'); }
        };
        if (d && d.length > 380000) reducirImagen(f, 800, 0.62, fin); else fin(d);
      });
    });
    document.body.appendChild(i);
  }
  i.value = ''; i.click();
}
function rcFotoQuitar(){ if (!rcBorr) return; delete rcBorr.foto; rcFotoPintar(); }
function rcFotoHtml(r, cls){ return r && rcFotoOk(r.foto) ? '<span class="' + cls + '" style="background-image:url(&quot;' + r.foto + '&quot;)" aria-hidden="true"></span>' : ''; }
rcEditar = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const o = document.getElementById('rcHoja'); if (!o || o.querySelector('#rcFotoBox')) return r;
    const nom = o.querySelector('#rcNom'), campo = nom && nom.closest('.field');
    if (campo) campo.insertAdjacentHTML('afterend', '<div class="field"><label>Foto de la receta (opcional)</label><div id="rcFotoBox" class="rc-foto-box"></div></div>');
    rcFotoPintar();
    return r;
  };
})(rcEditar);
rcLimpia = (function(orig){
  return function(r){ const x = orig.apply(this, arguments); if (rcFotoOk(r.foto)) x.foto = r.foto; else delete x.foto; return x; };
})(rcLimpia);
/* lista de Fátima: la foto como portada de cada receta */
rcPintarLista = (function(orig){
  return function(){
    const r0 = orig.apply(this, arguments);
    const c = document.getElementById('rcLista'); if (!c) return r0;
    Array.prototype.forEach.call(c.querySelectorAll('.rc-card'), function(card){
      const b = card.querySelector('[onclick^="rcEditar"]'), m = b && (b.getAttribute('onclick') || '').match(/'([^']+)'/);
      const r = m && rcPorId(m[1]);
      if (r && rcFotoOk(r.foto) && !card.querySelector('.rc-portada')) { card.insertAdjacentHTML('afterbegin', rcFotoHtml(r, 'rc-portada')); card.classList.add('rc-con-foto'); }
    });
    return r0;
  };
})(rcPintarLista);
/* cliente: miniatura en «Receta de la semana» y en el recetario */
rcPintarHoy = (function(orig){
  return function(){
    const r0 = orig.apply(this, arguments);
    const c = document.getElementById('rcHoy'), r = c && rcDestacada();
    if (c && r && rcFotoOk(r.foto)) { const ico = c.querySelector('.rc-hoy-ico'); if (ico) ico.outerHTML = rcFotoHtml(r, 'rc-hoy-foto'); c.classList.add('rc-con-foto'); }
    return r0;
  };
})(rcPintarHoy);
rcPintarRecetario = (function(orig){
  return function(){
    const r0 = orig.apply(this, arguments);
    const c = document.getElementById('rcRecetario'); if (!c) return r0;
    Array.prototype.forEach.call(c.querySelectorAll('.rc-it'), function(b){
      const m = (b.getAttribute('onclick') || '').match(/'([^']+)'/), r = m && rcPorId(m[1]);
      if (r && rcFotoOk(r.foto) && !b.querySelector('.rc-it-foto')) b.insertAdjacentHTML('afterbegin', rcFotoHtml(r, 'rc-it-foto'));
    });
    return r0;
  };
})(rcPintarRecetario);
/* al abrir la receta: la foto grande arriba */
rcAbrir = (function(orig){
  return function(id){
    const r0 = orig.apply(this, arguments);
    const r = rcPorId(id), o = document.getElementById('rcVer');
    if (r && rcFotoOk(r.foto) && o && !o.querySelector('.rc-ver-foto')) {
      const head = o.querySelector('.sheet-head');
      if (head) head.insertAdjacentHTML('afterend', '<div class="rc-ver-foto" style="background-image:url(&quot;' + r.foto + '&quot;)" role="img" aria-label="' + esc(r.nombre) + '"></div>');
    }
    return r0;
  };
})(rcAbrir);
