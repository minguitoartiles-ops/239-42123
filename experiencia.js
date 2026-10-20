/* =========================================================
   Fitness sin Dramas · EXPERIENCIA DE USO (v0.62)
   Auditoría de navegación del 20/10/2026 · fases A, B y C + recompensas.
   Se carga la última: envuelve funciones de los demás archivos.
   ========================================================= */
function exCliente(){ return !isCoachView(); }
function exScroll(){ return document.getElementById('content'); }
function exIrA(el, margen){
  const sc = exScroll(); if (!sc || !el) return;
  const y = el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - (margen || 12);
  sc.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
}

/* =========================================================
   A6 · Ordenador: al volver de una ficha o de un chat no se pierde la pantalla actual
   ========================================================= */
pantallaVisible = (function(orig){
  return function(){
    const v = orig();
    if (v) return v;
    if (typeof escPrincipal !== 'undefined' && escPrincipal) {
      const el = document.getElementById(escPrincipal);
      if (el && el.style.display !== 'none') return escPrincipal;
    }
    return v;
  };
})(pantallaVisible);

/* =========================================================
   A1 · «Hoy» con lo de hoy: qué entreno toca y qué comida es ahora
   ========================================================= */
function exSesionQueToca(){
  const cards = sesionCards();
  if (!cards.length) return null;
  const pend = cards.filter(function(c){ return !c.classList.contains('hecha'); });
  return { card: pend[0] || null, hechas: cards.length - pend.length, total: cards.length };
}
function exSeriesDe(card){
  const p = card.querySelectorAll('.serie-in input');
  const ok = Array.prototype.filter.call(p, function(x){ return x.dataset.ok === '1'; }).length;
  return { total: p.length, ok: ok };
}
/* comida según la hora: por su nombre y, si no, por su posición en el día */
const EX_FRANJAS = [[/desayuno/i, 5, 10.5], [/media ma[nñ]ana|almuerzo de media/i, 10.5, 12.75], [/^comida|almuerzo/i, 12.75, 16], [/merienda/i, 16, 19], [/^cena/i, 19, 22.5], [/recena|antes de dormir/i, 22.5, 27]];
function exComidaAhora(){
  const bl = mealBlocks(); if (!bl.length) return -1;
  const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
  const franja = bl.map(function(b, i){
    const t = ((b.querySelector('.meal-block-title') || {}).textContent || '').trim();
    const f = EX_FRANJAS.filter(function(x){ return x[0].test(t); })[0];
    if (f) return [f[1], f[2]];
    const ini = 7 + (14 / bl.length) * i;                         // reparto de 7:00 a 21:00
    return [ini, ini + 14 / bl.length];
  });
  let i = franja.findIndex(function(f){ return h >= f[0] && h < f[1]; });
  if (i < 0) i = h < franja[0][0] ? 0 : bl.length - 1;
  // si ya la ha marcado como tomada, la siguiente sin tomar
  for (let j = i; j < bl.length; j++) if (!bl[j].classList.contains('eaten')) return j;
  return i;
}
function exPintarHoyToca(){
  const v = document.getElementById('view-hoy'); if (!v || !exCliente()) return;
  let c = document.getElementById('hoyToca');
  if (!c) {
    c = document.createElement('div'); c.id = 'hoyToca'; c.className = 'hoy-toca';
    const w = document.getElementById('weekRow');
    v.insertBefore(c, w ? w.nextSibling : v.firstChild);
  }
  let h = '';
  const s = exSesionQueToca();
  if (s && s.card) {
    const t = (s.card.querySelector('.sesion-title') || {}).textContent || 'Sesión';
    const n = s.card.querySelectorAll('.ex-item').length, sr = exSeriesDe(s.card);
    const empezada = sr.ok > 0;
    h += '<button type="button" class="ht-card ht-ent" onclick="exEmpezarEntreno()">'
      + '<span class="ht-eye">🏋️ ' + (empezada ? 'A medias' : 'Hoy toca') + ' · ' + esc(((s.card.querySelector('.sesion-num') || {}).textContent || '').trim()) + '</span>'
      + '<b>' + esc(t.trim()) + '</b>'
      + '<span class="ht-sub">' + (empezada ? sr.ok + ' de ' + sr.total + ' series hechas' : n + (n === 1 ? ' ejercicio' : ' ejercicios') + ' · ' + sr.total + ' series') + '</span>'
      + '<span class="ht-cta">' + (empezada ? 'Seguir' : 'Empezar') + ' ›</span></button>';
  } else if (s && !s.card) {
    h += '<button type="button" class="ht-card ht-ent hecho" onclick="goTo(\'entreno\')"><span class="ht-eye">🏋️ Entreno</span><b>¡Semana completada! 💪</b><span class="ht-sub">' + s.total + ' de ' + s.total + ' sesiones hechas</span><span class="ht-cta">Ver ›</span></button>';
  }
  const i = exComidaAhora();
  if (i > -1) {
    const b = mealBlocks()[i];
    const t = ((b.querySelector('.meal-block-title') || {}).textContent || 'Comida').trim();
    const kcal = Math.round((+b.dataset.mp || 0) * 4 + (+b.dataset.mc || 0) * 4 + (+b.dataset.mf || 0) * 9);
    const el = Array.prototype.map.call(b.querySelectorAll('.macro-group'), function(g){
      const ch = g.querySelector('.chip.selected') || g.querySelector('.chip:not(.chip-add)');
      return ch ? chipName(ch) : null;
    }).filter(Boolean);
    const tomadas = mealBlocks().filter(function(x){ return x.classList.contains('eaten'); }).length;
    h += '<button type="button" class="ht-card ht-nut" onclick="exAbrirComida(' + i + ')">'
      + '<span class="ht-eye">🍽️ Ahora · ' + tomadas + ' de ' + mealBlocks().length + ' comidas</span>'
      + '<b>' + esc(t) + (kcal ? ' · ' + fmtMil(kcal) + ' kcal' : '') + '</b>'
      + '<span class="ht-sub">' + esc(el.join(' · ') || 'Elige tus opciones') + '</span>'
      + '<span class="ht-cta">Ver ›</span></button>';
  }
  c.innerHTML = h;
  c.hidden = !h;
}
function exEmpezarEntreno(){
  goTo('entreno');
  const s = exSesionQueToca(); if (!s || !s.card) return;
  exAbrirSesion(s.card, true);
  setTimeout(function(){
    // a la primera serie sin hacer de esa sesión
    const f = Array.prototype.filter.call(s.card.querySelectorAll('.srf'), function(x){ return !x.classList.contains('ok'); })[0];
    const ej = f ? f.closest('.ex-item') : null;
    exIrA(ej && exSeriesDe(s.card).ok ? ej : s.card, 56);
  }, 80);
}
function exAbrirSesion(card, solo){
  sesionCards().forEach(function(c){
    const body = c.querySelector('.sesion-body'); if (!body) return;
    const abierta = body.style.display !== 'none';
    const quiero = c === card ? true : (solo ? false : abierta);
    if (abierta !== quiero) toggleSesion(c.querySelector('.sesion-head'));
  });
}
function exAbrirComida(i){
  goTo('plan');
  exPlegarComidas(i);
  setTimeout(function(){ exIrA(mealBlocks()[i], 12); }, 80);
}

/* =========================================================
   A2 · Entreno: se abre el día que toca y lo demás va después
   ========================================================= */
pintarSens = (function(orig){
  return function(area){
    orig(area);
    const box = document.getElementById('sensBox-' + area); if (!box) return;
    // las sensaciones del día van al final: se cuentan después de entrenar o de comer
    const ref = area === 'ent' ? document.getElementById('sesionesCont') : document.getElementById('comidasCont');
    if (ref && box.previousElementSibling !== ref && box !== ref.nextElementSibling) {
      let destino = ref.nextElementSibling;
      while (destino && (destino.classList.contains('add-sesion-btn') || destino.classList.contains('add-meal-btn'))) destino = destino.nextElementSibling;
      ref.parentNode.insertBefore(box, destino);
    }
  };
})(pintarSens);
let exEntrenoAbierto = false;
goTo = (function(orig){
  return function(name){
    const r = orig.apply(this, arguments);
    if (name === 'hoy') exPintarHoyToca();
    if (name === 'entreno' && exCliente()) {
      // si no hay ninguna sesión abierta, se abre la que toca
      const abiertas = sesionCards().filter(function(c){ const b = c.querySelector('.sesion-body'); return b && b.style.display !== 'none'; });
      const s = exSesionQueToca();
      if (!abiertas.length && s && s.card) exAbrirSesion(s.card, true);
      exBarraEntreno();
    }
    if (name === 'plan' && exCliente()) exPlegarComidas(exComidaAhora());
    return r;
  };
})(goTo);
renderHoy = (function(orig){ return function(){ const r = orig.apply(this, arguments); exPintarHoyToca(); return r; }; })(renderHoy);

/* =========================================================
   A3 · Ejercicio compacto: técnica plegada, ejercicio hecho se pliega y se pasa al siguiente,
        barra fina con el progreso de la sesión
   ========================================================= */
enPintarFilas = (function(orig){
  return function(it){
    orig(it);
    const f = it.querySelector('.sr-filas'); if (!f) { it.classList.remove('ej-hecho'); return; }
    const cab = f.querySelector('.srf-cab');
    if (cab && it.querySelector('.ex-desc') && !cab.querySelector('.ex-tec-btn')) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ex-tec-btn'; b.textContent = it.classList.contains('ver-tec') ? 'Ocultar técnica' : 'ⓘ Técnica';
      b.onclick = function(e){ e.stopPropagation(); it.classList.toggle('ver-tec'); b.textContent = it.classList.contains('ver-tec') ? 'Ocultar técnica' : 'ⓘ Técnica'; };
      cab.appendChild(b);
    }
    const p = enPesos(it);
    // móviles pequeños: el RIR solo se despliega en la serie que toca; en las demás, una etiqueta con el RIR apuntado
    let act = false;
    Array.prototype.forEach.call(f.querySelectorAll('.srf'), function(fila){
      const x = p[+fila.dataset.i]; if (!x) return;
      const ok = x.dataset.ok === '1';
      fila.classList.toggle('actual', !ok && !act); if (!ok) act = true;
      const n = fila.querySelector('.srf-n'), r = x.dataset.rirh;
      if (n && r != null && r !== '' && !n.querySelector('.srf-rirb')) n.insertAdjacentHTML('beforeend', '<small class="srf-rirb ' + enRir(r) + '">RIR ' + (r === '5' ? '5+' : esc(r)) + '</small>');
    });
    const hecho = p.length > 0 && p.every(function(x){ return x.dataset.ok === '1'; });
    it.classList.toggle('ej-hecho', hecho);
    let r = it.querySelector('.ej-resumen');
    if (hecho) {
      const s = enLeerSeries(it), m = s.length ? enMejorSerie(s) : null;
      if (!r) { r = document.createElement('button'); r.type = 'button'; r.className = 'ej-resumen'; r.onclick = function(){ it.classList.toggle('ej-abrir'); }; const fila = it.querySelector('.ex-table-row'); it.insertBefore(r, fila ? fila.nextSibling : it.firstChild); }
      r.innerHTML = '<span>✓ ' + p.length + (p.length === 1 ? ' serie hecha' : ' series hechas') + (m ? ' · mejor ' + enTxtSerie(m).replace('×', ' kg × ') : '') + '</span><span class="ej-res-v">' + (it.classList.contains('ej-abrir') ? 'Ocultar' : 'Ver') + '</span>';
    } else if (r) { r.remove(); it.classList.remove('ej-abrir'); }
  };
})(enPintarFilas);
/* al completar un ejercicio, la pantalla baja sola al siguiente */
(function(){
  const cont = contEnt(); if (!cont) return;
  let antes = null, itCap = null;
  cont.addEventListener('click', function(e){
    const b = e.target.closest && e.target.closest('.srf [data-a="ok"]');
    itCap = b ? b.closest('.ex-item') : null;
    antes = itCap ? itCap.classList.contains('ej-hecho') : null;
  }, true);
  cont.addEventListener('click', function(){
    const it = itCap; itCap = null; if (!it || isCoachView()) return;
    setTimeout(function(){
      exBarraEntreno();
      if (!antes && it.classList.contains('ej-hecho')) {
        let sig = it.nextElementSibling;
        while (sig && !(sig.classList.contains('ex-item') && !sig.classList.contains('ej-hecho'))) sig = sig.nextElementSibling;
        if (sig) exIrA(sig, 56);
        else {
          const c = it.closest('.sesion-card');
          if (c && !c.classList.contains('hecha')) exAvisoSesionLista(c);
        }
      }
    }, 120);
  });
})();
function exAvisoSesionLista(c){
  const t = c.querySelector('.ses-tick');
  if (t) { t.classList.add('ex-latido'); setTimeout(function(){ t.classList.remove('ex-latido'); }, 2400); }
  toast('¡Todas las series hechas! Marca la sesión como hecha ✓');
  exIrA(c, 12);
}
/* barra fina fija con el progreso de la sesión abierta */
function exBarraEntreno(){
  const v = document.getElementById('view-entreno'), cont = contEnt(); if (!v || !cont) return;
  let b = document.getElementById('exBarraEnt');
  if (!b) {
    b = document.createElement('div'); b.id = 'exBarraEnt'; b.className = 'ex-barra'; b.setAttribute('aria-live', 'polite');
    cont.parentNode.insertBefore(b, cont);
  }
  const abierta = sesionCards().filter(function(c){ const x = c.querySelector('.sesion-body'); return x && x.style.display !== 'none'; })[0];
  if (!abierta || !exCliente() || coachEditing) { b.hidden = true; return; }
  const its = Array.prototype.slice.call(abierta.querySelectorAll('.ex-item'));
  const sr = exSeriesDe(abierta);
  const sc = exScroll(), tope = sc ? sc.getBoundingClientRect().top + 60 : 60;
  let actual = its.findIndex(function(it){ return it.getBoundingClientRect().bottom > tope; });
  if (actual < 0) actual = its.length - 1;
  const titulo = ((abierta.querySelector('.sesion-title') || {}).textContent || '').trim();
  b.hidden = false;
  b.innerHTML = '<span class="exb-t">' + esc(titulo) + '</span><span class="exb-e">Ejercicio ' + (actual + 1) + '/' + its.length + '</span>'
    + '<span class="exb-s">' + sr.ok + '/' + sr.total + ' series</span><i style="width:' + (sr.total ? Math.round(sr.ok / sr.total * 100) : 0) + '%"></i>';
}
(function(){
  const sc = exScroll(); if (!sc) return;
  let pend = false;
  sc.addEventListener('scroll', function(){
    if (pend || vistaActual !== 'entreno') return;
    pend = true; requestAnimationFrame(function(){ pend = false; exBarraEntreno(); });
  }, { passive: true });
})();
toggleSesion = (function(orig){ return function(h){ orig(h); exBarraEntreno(); }; })(toggleSesion);
cargarPlan = (function(orig){
  return function(k){
    orig(k);
    Array.prototype.forEach.call(contEnt().querySelectorAll('.ver-tec, .ej-abrir'), function(x){ x.classList.remove('ver-tec', 'ej-abrir'); });
    exBarraEntreno();
  };
})(cargarPlan);

/* =========================================================
   A4 · Nutrición: abierta la comida que toca, las demás plegadas con lo elegido
   ========================================================= */
function exPlegarComidas(abrir){
  mealBlocks().forEach(function(b, i){
    const body = b.querySelector('.meal-body'), ch = b.querySelector('.meal-chevron');
    if (!body) return;
    body.classList.toggle('open', i === abrir); if (ch) ch.classList.toggle('open', i === abrir);
    b.classList.toggle('ahora', i === abrir);
  });
  exResumenComidas();
}
function exResumenComidas(){
  mealBlocks().forEach(function(b){
    const head = b.querySelector('.meal-head-txt'); if (!head) return;
    let r = head.querySelector('.meal-elegidas');
    if (!r) { r = document.createElement('div'); r.className = 'meal-elegidas'; head.appendChild(r); }
    const el = Array.prototype.map.call(b.querySelectorAll('.macro-group'), function(g){
      const ch = g.querySelector('.chip.selected') || g.querySelector('.chip:not(.chip-add)');
      if (!ch) return null;
      const q = ch.querySelector('.chip-qty');
      return chipName(ch) + (q ? ' ' + q.textContent.replace('·', '').replace('📌', '').trim() : '');
    }).filter(Boolean);
    r.textContent = el.join(' · ');
  });
}
calcularPlan = (function(orig){ return function(){ const r = orig.apply(this, arguments); exResumenComidas(); if (typeof exBarraNutri === 'function') exBarraNutri(); return r; }; })(calcularPlan);
pick = (function(orig){ return function(el){ orig(el); exResumenComidas(); }; })(pick);

/* =========================================================
   B7 · Lista de clientes: compacta, con buscador (también en el móvil) y «Necesitan atención» primero
   ========================================================= */
let exFiltro = 'todos';
function exMotivos(k){
  const d = clientesData[k], m = [];
  if (!d || (typeof mjEsBaja === 'function' && mjEsBaja(d))) return m;
  const msg = msgsSinLeer(k); if (msg) m.push('💬 ' + msg + (msg === 1 ? ' mensaje' : ' mensajes'));
  const esp = esperaDesde(k); if (esp && horasDesde(esp) >= ESPERA_ROJA_H && !msg) m.push('💬 +48 h sin contestar');
  const sg = segsSinVer(k); if (sg) m.push('📋 ' + (sg === 1 ? 'seguimiento nuevo' : sg + ' seguimientos nuevos'));
  const pg = typeof estadoPago === 'function' ? estadoPago(d) : null;
  if (pg && ['vence', 'gracia', 'vencido'].indexOf(pg.cod) > -1) m.push('💳 ' + (pg.cod === 'vence' ? 'pago a punto de vencer' : (pg.cod === 'gracia' ? 'en periodo de gracia' : 'pago vencido')));
  return m;
}
function exSinPlan(k){
  const nutri = coachActivo && coachActivo.rol === 'dietista';
  const h = PLANES[k] && (nutri ? PLANES[k].nut : PLANES[k].ent);
  return !h || (nutri ? h.indexOf('meal-block') < 0 : h.indexOf('sesion-card') < 0);
}
function exPintarFiltros(){
  const lista = document.getElementById('listaClientes'); if (!lista || !coachActivo) return;
  const claves = Object.keys(clientesData);
  const cards = lista.querySelectorAll('.cliente-card');
  let nAt = 0, nSin = 0;
  Array.prototype.forEach.call(cards, function(card, i){
    const k = claves[i]; if (!k) return;
    const mot = exMotivos(k), sin = exSinPlan(k);
    if (mot.length) nAt++; if (sin) nSin++;
    card.dataset.atencion = mot.length ? '1' : ''; card.dataset.sinplan = sin ? '1' : '';
    card.style.order = mot.length ? -1 : 0;                     // lo urgente arriba sin cambiar el orden real de la lista
    let a = card.querySelector('.kc-motivos');
    if (mot.length) {
      if (!a) { a = document.createElement('div'); a.className = 'kc-motivos'; const top = card.querySelector('.kc-top'); card.insertBefore(a, top ? top.nextSibling : null); }
      a.textContent = mot.join(' · ');
    } else if (a) a.remove();
  });
  let f = document.getElementById('exFiltros');
  if (!f) {
    f = document.createElement('div'); f.id = 'exFiltros'; f.className = 'ex-filtros'; f.setAttribute('role', 'tablist');
    const b = document.getElementById('escBuscar');
    lista.parentNode.insertBefore(f, b ? b.nextSibling : lista);
  }
  const op = [['todos', 'Todos', claves.length], ['atencion', '⚠️ Necesitan atención', nAt], ['sinplan', 'Sin plan', nSin]];
  f.innerHTML = op.map(function(o){ return '<button type="button" role="tab" aria-selected="' + (exFiltro === o[0]) + '" class="' + (exFiltro === o[0] ? 'sel' : '') + (o[0] === 'atencion' && o[2] ? ' hay' : '') + '" onclick="exFiltrar(\'' + o[0] + '\')">' + o[1] + ' <b>' + o[2] + '</b></button>'; }).join('');
  exAplicarFiltro();
}
function exFiltrar(f){ exFiltro = f; exPintarFiltros(); }
function exAplicarFiltro(){
  Array.prototype.forEach.call(document.querySelectorAll('#listaClientes .cliente-card'), function(c){
    const fuera = (exFiltro === 'atencion' && c.dataset.atencion !== '1') || (exFiltro === 'sinplan' && c.dataset.sinplan !== '1');
    c.classList.toggle('ex-oculto', fuera);
  });
}
pintarListaClientes = (function(orig){ return function(){ orig(); exPintarFiltros(); }; })(pintarListaClientes);
/* el aviso de copia se puede dejar para dentro de una semana */
const EX_COPIA_KEY = 'fsd_copia_pospuesta';
mjAvisoCopia = (function(orig){
  return function(){
    orig();
    const c = document.getElementById('avisoCopia'); if (!c) return;
    let hasta = 0; try { hasta = +localStorage.getItem(EX_COPIA_KEY) || 0; } catch(e){}
    if (Date.now() < hasta) { c.remove(); return; }
    if (!c.querySelector('.ha-x')) {
      const x = document.createElement('span');
      x.className = 'ha-x'; x.setAttribute('role', 'button'); x.setAttribute('aria-label', 'Recordármelo dentro de una semana'); x.title = 'Recordármelo dentro de una semana'; x.textContent = '×';
      x.onclick = function(e){ e.stopPropagation(); try { localStorage.setItem(EX_COPIA_KEY, Date.now() + 7 * DIA_MS); } catch(err){} c.remove(); toast('Te lo recordaré dentro de una semana'); };
      c.appendChild(x);
    }
  };
})(mjAvisoCopia);

/* =========================================================
   B9 · Editor de nutrición: barra fija con el cuadre y calculadora plegable en el móvil
   ========================================================= */
function exBarraNutri(){
  const cont = contNut(); if (!cont) return;
  let b = document.getElementById('exBarraNut');
  if (!b) { b = document.createElement('div'); b.id = 'exBarraNut'; b.className = 'ex-barra ex-barra-nut'; b.setAttribute('aria-live', 'polite'); cont.parentNode.insertBefore(b, cont); }
  if (!isCoachView() || !coachEditing || !mealBlocks().length) { b.hidden = true; return; }
  const o = nuLeerObjetivo(); if (!o.kcal) { b.hidden = true; return; }
  const obj = { kcal: o.kcal, p: o.kcal * o.p / 400, c: o.kcal * o.c / 400, f: o.kcal * o.f / 900 };
  const r = nuCalcularPlan(cont, obj, nuRepartoPantalla(mealBlocks().length), false);
  const dif = r.kcal - o.kcal, ok = Math.abs(dif) <= Math.max(30, o.kcal * 0.03);
  const m = function(l, v, t){ const d = Math.round(v) - Math.round(t); return '<span class="exn-m' + (Math.abs(d) > Math.max(5, t * 0.08) ? ' fuera' : '') + '">' + l + ' ' + Math.round(v) + '<small>/' + Math.round(t) + '</small></span>'; };
  b.hidden = false;
  b.innerHTML = '<span class="exn-k' + (ok ? ' ok' : '') + '"><b>' + fmtMil(r.kcal) + '</b><small>/' + fmtMil(o.kcal) + ' kcal</small>' + (ok ? ' ✓' : ' <i>' + (dif > 0 ? '+' : '') + dif + '</i>') + '</span>'
    + m('P', r.p, obj.p) + m('C', r.c, obj.c) + m('G', r.f, obj.f);
}
(function(){
  const cc = document.getElementById('calcCard'); if (!cc) return;
  const h = document.createElement('button');
  h.type = 'button'; h.className = 'calc-plegar'; h.id = 'calcPlegar';
  h.onclick = function(){ cc.classList.toggle('plegada'); exTextoCalc(); };
  cc.insertBefore(h, cc.firstChild);
})();
function exTextoCalc(){
  const cc = document.getElementById('calcCard'), h = document.getElementById('calcPlegar'); if (!cc || !h) return;
  const o = nuLeerObjetivo();
  h.innerHTML = '<span>🧮 Objetivo y reparto' + (o.kcal ? ' · <b>' + fmtMil(o.kcal) + ' kcal</b> · ' + o.p + '/' + o.c + '/' + o.f + ' %' : '') + '</span><span class="calc-plegar-v">' + (cc.classList.contains('plegada') ? 'Cambiar ▾' : 'Plegar ▴') + '</span>';
}
editarPlan = (function(orig){
  return function(){
    orig();
    const cc = document.getElementById('calcCard');
    // en el móvil, si ya tiene objetivo, la calculadora empieza plegada
    if (cc && coachEditing && !(typeof escActivo === 'function' && escActivo())) cc.classList.toggle('plegada', !!(nuLeerObjetivo().kcal && clienteActual && clientesData[clienteActual] && clientesData[clienteActual].nutObj));
    exTextoCalc(); exBarraNutri(); exBarraEntreno();
  };
})(editarPlan);

/* =========================================================
   B10 · Pestaña Seguimientos: una línea por cliente; el detalle se abre al tocar
   ========================================================= */
pintarSegsResumen = (function(orig){
  return function(){
    orig();
    Array.prototype.forEach.call(document.querySelectorAll('#segsResumen .sg-bloque'), function(bl){
      const card = bl.querySelector('.segui-card'); if (!card) return;
      bl.classList.add('ex-compacto');
      const cab = bl.querySelector('.sg-cab-der');
      if (cab && !bl.querySelector('.sg-ver')) {
        const sem = (bl.querySelector('.segui-week') || {}).textContent || '';
        const peso = (bl.querySelector('.segui-peso') || {}).textContent || '';
        const linea = document.createElement('div'); linea.className = 'sg-linea';
        linea.innerHTML = '<span>' + esc(sem.replace(/\d+ %$/, '').trim()) + (peso ? ' · ' + esc(peso) : '') + '</span>';
        const v = document.createElement('button'); v.type = 'button'; v.className = 'sg-ver'; v.textContent = 'Ver resumen ▾';
        v.onclick = function(e){ e.stopPropagation(); bl.classList.toggle('ex-abierto'); v.textContent = bl.classList.contains('ex-abierto') ? 'Ocultar ▴' : 'Ver resumen ▾'; };
        linea.appendChild(v);
        bl.insertBefore(linea, card);
      }
    });
  };
})(pintarSegsResumen);

/* =========================================================
   C11 · Seguimiento semanal en 4 pasos; el historial pasa a Progreso
   ========================================================= */
let exPaso = 0;
(function(){
  const v = document.getElementById('view-seguimiento'), prog = document.getElementById('view-progreso');
  if (!v) return;
  // historial de seguimientos → Progreso
  const hist = document.getElementById('historialSegui');
  if (hist && prog) {
    const lbl = Array.prototype.filter.call(v.children, function(e){ return e.classList.contains('section-lbl') && /seguimientos/i.test(e.textContent); })[0];
    const pdf = Array.prototype.filter.call(v.children, function(e){ return e.classList.contains('mini-btn'); })[0];
    [lbl, pdf, hist].forEach(function(e){ if (e) prog.appendChild(e); });
  }
  const pasos = v.querySelectorAll('.sg-block');
  if (pasos.length < 2) return;
  const cab = document.createElement('div'); cab.id = 'sgPasoCab'; cab.className = 'sg-paso-cab';
  pasos[0].parentNode.insertBefore(cab, pasos[0]);
  const nav = document.createElement('div'); nav.id = 'sgNav'; nav.className = 'sg-nav';
  nav.innerHTML = '<button type="button" class="btn-eq" id="sgAnt" onclick="exPasoIr(-1)">‹ Anterior</button><button type="button" class="btn-primary" id="sgSig" onclick="exPasoIr(1)">Siguiente ›</button>';
  const save = document.getElementById('sgSave');
  pasos[pasos.length - 1].parentNode.insertBefore(nav, pasos[pasos.length - 1].nextSibling);
  if (save) nav.appendChild(save);
  v.classList.add('sg-por-pasos');
  exPasoPintar();
})();
function exPasoPintar(){
  const v = document.getElementById('view-seguimiento'); if (!v) return;
  const pasos = Array.prototype.slice.call(v.querySelectorAll('.sg-block')); if (pasos.length < 2) return;
  exPaso = Math.max(0, Math.min(exPaso, pasos.length - 1));
  pasos.forEach(function(p, i){ p.classList.toggle('sg-activo', i === exPaso); });
  const tit = function(p){ const l = p.querySelector('.sg-cat') || p.firstElementChild; return ((l && l.textContent) || '').trim().toLowerCase().replace(/^./, function(c){ return c.toUpperCase(); }); };
  const cab = document.getElementById('sgPasoCab');
  cab.innerHTML = '<div class="sg-paso-txt"><b>Paso ' + (exPaso + 1) + ' de ' + pasos.length + '</b> · ' + esc(tit(pasos[exPaso])) + '</div>'
    + '<div class="sg-paso-barra">' + pasos.map(function(p, i){ return '<i class="' + (i <= exPaso ? 'on' : '') + '"></i>'; }).join('') + '</div>';
  const ult = exPaso === pasos.length - 1;
  document.getElementById('sgAnt').hidden = exPaso === 0;
  document.getElementById('sgSig').hidden = ult;
  const save = document.getElementById('sgSave'); if (save) save.hidden = !ult;
}
function exPasoIr(d){
  exPaso += d; exPasoPintar();
  const cab = document.getElementById('sgPasoCab'); if (cab) exIrA(cab, 8);
}
goTo = (function(orig){ return function(name){ if (name === 'seguimiento') exPaso = 0; const r = orig.apply(this, arguments); if (name === 'seguimiento') exPasoPintar(); return r; }; })(goTo);
guardarSeguimiento = (function(orig){
  return function(){
    const v = document.getElementById('view-seguimiento'), k = clienteActual, antes = k ? (SEGUIMIENTOS[k] || []).length : 0;
    // si falta un dato obligatorio en otro paso, se salta a ese paso para que el aviso se vea
    const fila = v && v.querySelectorAll('.esc-row')[1];
    if (fila && !fila.querySelector('.esc-btn.on')) {
      const pasos = Array.prototype.slice.call(v.querySelectorAll('.sg-block')), i = pasos.indexOf(fila.closest('.sg-block'));
      if (i > -1 && i !== exPaso) { exPaso = i; exPasoPintar(); }
    }
    const r = orig.apply(this, arguments);
    if (k && (SEGUIMIENTOS[k] || []).length > antes) { exPaso = 0; exPasoPintar(); }
    return r;
  };
})(guardarSeguimiento);

/* =========================================================
   C12 · Ordenador: pestañas del cliente en la barra de arriba y atajos de teclado
   ========================================================= */
function exTabsCoach(){
  const bar = document.getElementById('coachBar'); if (!bar) return;
  let t = document.getElementById('exTabsCoach');
  if (!t) { t = document.createElement('div'); t.id = 'exTabsCoach'; t.className = 'ex-tabs-coach'; t.setAttribute('role', 'tablist'); const ed = document.getElementById('enDeshacerBtn') || document.getElementById('editarBtn'); bar.insertBefore(t, ed); }
  const tbs = Array.prototype.filter.call(document.querySelectorAll('#app .tb .tbi'), function(b){ return b.offsetParent !== null || getComputedStyle(b).display !== 'none'; })
    .filter(function(b){ return !b.hidden && getComputedStyle(b).display !== 'none'; });
  t.innerHTML = tbs.map(function(b){
    const lg = b.querySelector('.tl-largo'), emo = b.querySelector('.tbi-emo');
    const txt = (b.getAttribute('aria-label') || (lg ? lg.textContent : b.textContent.replace(emo ? emo.textContent : '', ''))).trim(), act = b.classList.contains('active');
    return '<button type="button" role="tab" aria-selected="' + act + '" class="' + (act ? 'sel' : '') + '" onclick="document.getElementById(\'' + b.id + '\').click()">' + (emo ? '<span aria-hidden="true">' + emo.textContent + '</span> ' : '') + esc(txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()) + '</button>';
  }).join('');
}
abrirVistaCliente = (function(orig){ return function(v){ orig(v); exTabsCoach(); }; })(abrirVistaCliente);
goTo = (function(orig){ return function(){ const r = orig.apply(this, arguments); if (isCoachView()) exTabsCoach(); return r; }; })(goTo);
document.addEventListener('keydown', function(e){
  if (!coachActivo) return;
  const k = (e.key || '').toLowerCase();
  if ((e.ctrlKey || e.metaKey) && k === 'k') {
    e.preventDefault();
    if (coachEditing) editarPlan();
    if (pantallaVisible() === 'app') backToCliente();
    abrirTabPro('clientes');
    setTimeout(function(){ const b = document.getElementById('escBuscar'); if (b) { b.focus(); b.select(); } }, 60);
    return;
  }
  if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    const dir = e.key === 'ArrowDown' ? 1 : -1;
    const vis = pantallaVisible();
    if (vis === 'app' && typeof nuOtroCliente === 'function') { e.preventDefault(); nuOtroCliente(dir); return; }
    if (vis === 'view-coach-cliente' || vis === 'view-coach-seguimientos') {
      e.preventDefault();
      const ks = Object.keys(clientesData).filter(function(x){ return !(typeof mjEsBaja === 'function' && mjEsBaja(clientesData[x])); });
      const i = ks.indexOf(clienteActual);
      const sig = ks[(i + dir + ks.length) % ks.length];
      if (sig) { goToCliente(sig); if (vis === 'view-coach-seguimientos') goToSeguimientos(); }
    }
  }
});
(function(){
  const pie = document.getElementById('escPie'); if (!pie) return;
  const a = document.createElement('div'); a.className = 'esc-atajos';
  a.innerHTML = '<kbd>Ctrl</kbd>+<kbd>K</kbd> buscar cliente<br><kbd>Alt</kbd>+<kbd>↑</kbd><kbd>↓</kbd> cliente anterior / siguiente';
  pie.insertBefore(a, pie.firstChild);
})();

/* =========================================================
   C13 · Ajustes con apartados plegables
   ========================================================= */
const EX_AJ_KEY = 'fsd_ajustes_abiertos';
renderAjustes = (function(orig){
  return function(rol){
    orig(rol);
    const c = document.getElementById(rol === 'cliente' ? 'ajustesCliente' : 'ajustesCoach'); if (!c) return;
    let abiertos = null; try { abiertos = JSON.parse(sessionStorage.getItem(EX_AJ_KEY) || 'null'); } catch(e){}
    const hijos = Array.prototype.slice.call(c.children);
    let sec = null, n = 0;
    hijos.forEach(function(el){
      if (el.classList.contains('section-lbl')) {
        const nombre = el.textContent.trim();
        const abierto = abiertos ? abiertos.indexOf(nombre) > -1 : n === 0;
        sec = document.createElement('div'); sec.className = 'aj-sec' + (abierto ? ' abierta' : '');
        const b = document.createElement('button'); b.type = 'button'; b.className = 'aj-sec-h'; b.setAttribute('aria-expanded', abierto);
        b.innerHTML = '<span>' + esc(nombre) + '</span><span class="aj-sec-v" aria-hidden="true">⌄</span>';
        b.onclick = function(){ const s = b.parentNode; s.classList.toggle('abierta'); b.setAttribute('aria-expanded', s.classList.contains('abierta')); exAjGuardar(c); };
        const cuerpo = document.createElement('div'); cuerpo.className = 'aj-sec-c';
        sec.appendChild(b); sec.appendChild(cuerpo);
        c.insertBefore(sec, el); el.remove(); n++;
        return;
      }
      const fuera = el.classList.contains('ajx-foot') || (el.classList.contains('list-group') && /Cerrar sesión/.test(el.textContent) && el.children.length === 1);
      if (fuera) { sec = null; return; }
      if (sec) sec.querySelector('.aj-sec-c').appendChild(el);
    });
  };
})(renderAjustes);
function exAjGuardar(c){
  const ab = Array.prototype.map.call(c.querySelectorAll('.aj-sec.abierta .aj-sec-h span:first-child'), function(s){ return s.textContent.trim(); });
  try { sessionStorage.setItem(EX_AJ_KEY, JSON.stringify(ab)); } catch(e){}
}

/* =========================================================
   RECOMPENSAS · mensajes cortos de motivación y logros del cliente
   Se guardan en clientesData[k].logros = { lista: [{ id, ico, tit, txt, fecha }] }
   ========================================================= */
const EX_FRASES = {
  ses:  ['Un día más cerca de tu objetivo.', 'Hecho es mejor que perfecto.', 'Así se construye el hábito.', 'Tu yo de dentro de un mes te lo agradece.'],
  sem:  ['Semana redonda. ¡Así sí!', 'Constancia de la buena.', 'Cumplir lo pautado es el 80 % del resultado.'],
  pr:   ['Más fuerte que la semana pasada.', 'El progreso se nota.', 'Paso a paso, kilo a kilo.', 'Eso es sobrecarga progresiva.'],
  nut:  ['Constancia antes que perfección.', 'Tu cuerpo te lo agradece.', 'Así se ganan los resultados: en la cocina.'],
  racha:['La constancia es tu superpoder.', 'No rompas la cadena.', 'Esto ya es un hábito.'],
  seg:  ['Gracias por contarnos cómo vas.', 'Con tus datos ajustamos mejor tu plan.', 'Medir es mejorar.'],
  top:  ['Semana de nota. Sigue así.', 'Así da gusto revisar un seguimiento.']
};
function exFrase(t){ const l = EX_FRASES[t] || EX_FRASES.ses; return l[Math.floor(Math.random() * l.length)]; }
function exLogros(k){ const d = clientesData[k]; if (!d) return null; d.logros = d.logros || { lista: [] }; return d.logros; }
let exCola = [], exMostrando = false;
function exLogro(id, ico, tit, tipo, guardar){
  const k = clienteActual; if (!k || !exCliente()) return false;
  const L = exLogros(k); if (!L) return false;
  if (L.lista.some(function(x){ return x.id === id; })) return false;
  const txt = exFrase(tipo);
  if (guardar !== false) {
    L.lista.push({ id: id, ico: ico, tit: tit, txt: txt, fecha: new Date().toISOString(), tipo: tipo });
    if (L.lista.length > 120) L.lista = L.lista.slice(-120);
    programarGuardado();
  }
  exLote.push({ ico: ico, tit: tit, txt: txt, tipo: tipo });
  clearTimeout(exLoteT); exLoteT = setTimeout(exSoltarLote, 450);
  return true;
}
// los logros que llegan a la vez (p. ej. sesión + semana + racha) salen en un único mensaje
let exLote = [], exLoteT = null;
const EX_PRIORIDAD = ['racha', 'pr', 'top', 'sem', 'nut', 'seg', 'ses'];
function exSoltarLote(){
  let l = exLote; exLote = [];
  if (!l.length) return;
  if (l.length > 1) l = l.filter(function(x){ return x.tipo !== 'ses'; });   // «sesión hecha» sobra si hay algo mayor
  l.sort(function(a, b){ return EX_PRIORIDAD.indexOf(a.tipo) - EX_PRIORIDAD.indexOf(b.tipo); });
  if (l.length === 1) exCola.push(l[0]);
  else exCola.push({ ico: l[0].ico, tit: '¡' + l.length + ' logros a la vez!', txt: l[0].txt, lista: l.map(function(x){ return x.ico + ' ' + x.tit; }) });
  exSiguienteLogro();
}
function exSiguienteLogro(){
  if (exMostrando || !exCola.length) return;
  exMostrando = true;
  const x = exCola.shift();
  let p = document.getElementById('exLogroPop');
  if (!p) {
    p = document.createElement('div'); p.id = 'exLogroPop'; p.className = 'ex-logro'; p.setAttribute('role', 'status'); p.setAttribute('aria-live', 'polite');
    p.onclick = function(){ exCerrarLogro(); };
    document.getElementById('screenRoot').appendChild(p);
  }
  p.innerHTML = '<span class="exl-ico" aria-hidden="true">' + x.ico + '</span><span class="exl-txt"><b>' + esc(x.tit) + '</b>'
    + (x.lista ? '<ul class="exl-lista">' + x.lista.map(function(t){ return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '')
    + '<span>' + esc(x.txt) + '</span></span>'
    + '<span class="exl-chispas" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>';
  p.classList.remove('show'); void p.offsetWidth; p.classList.add('show');
  clearTimeout(p._t); p._t = setTimeout(exCerrarLogro, x.lista ? 5200 : (exCola.length ? 2600 : 4200));
}
function exCerrarLogro(){
  const p = document.getElementById('exLogroPop'); if (p) p.classList.remove('show');
  setTimeout(function(){ exMostrando = false; exSiguienteLogro(); }, 260);
}
/* ---------- rachas ---------- */
function exRachaEntreno(k){
  const reg = mjRegistro(k), n = sesionCards().length; if (!reg || !n) return 0;
  const porSem = {};
  reg.ses.forEach(function(f){ const l = mjISO(mjLunes(new Date(f + 'T12:00:00'))); porSem[l] = (porSem[l] || 0) + 1; });
  let lunes = mjISO(mjLunes()), r = 0;
  if ((porSem[lunes] || 0) < n) lunes = mjSumarDias(lunes, -7);        // la semana en curso cuenta cuando se completa
  while ((porSem[lunes] || 0) >= n) { r++; lunes = mjSumarDias(lunes, -7); }
  return r;
}
function exRachaNutri(k){
  const reg = mjRegistro(k); if (!reg) return 0;
  let dia = mjISO(new Date()), r = 0;
  const ok = function(f){ const c = reg.com[f]; return c && c.n > 0 && c.t >= c.n; };
  if (!ok(dia)) dia = mjSumarDias(dia, -1);
  while (ok(dia)) { r++; dia = mjSumarDias(dia, -1); }
  return r;
}
function exRachaSegs(k){
  const sem = {};
  (SEGUIMIENTOS[k] || []).forEach(function(s){ if (s.fecha) sem[mjISO(mjLunes(new Date(s.fecha)))] = 1; });
  let lunes = mjISO(mjLunes()), r = 0;
  if (!sem[lunes]) lunes = mjSumarDias(lunes, -7);
  while (sem[lunes]) { r++; lunes = mjSumarDias(lunes, -7); }
  return r;
}
const EX_HITOS = [2, 3, 4, 6, 8, 10, 12, 16, 20, 26, 52];
const EX_HITOS_DIAS = [3, 5, 7, 10, 14, 21, 30, 45, 60, 90];
/* ---------- 1 · entrenos: sesión hecha, semana completa y racha de semanas ---------- */
toggleSesionHecha = (function(orig){
  return function(ev, el){
    const c = el.closest('.sesion-card'), antes = c && c.classList.contains('hecha');
    orig(ev, el);
    if (!exCliente() || !c || antes || !c.classList.contains('hecha')) return;
    const k = clienteActual, hoy = mjISO(new Date()), lunes = mjISO(mjLunes());
    const cards = sesionCards(), hechas = cards.filter(function(x){ return x.classList.contains('hecha'); }).length;
    const t = ((c.querySelector('.sesion-title') || {}).textContent || 'Sesión').trim();
    if (hechas >= cards.length) {
      exLogro('semana-' + lunes, '🎯', '¡Semana de entrenos completada! ' + hechas + ' de ' + cards.length, 'sem');
      const r = exRachaEntreno(k);
      if (EX_HITOS.indexOf(r) > -1) exLogro('racha-ent-' + r + '-' + lunes, '🔥', r + ' semanas seguidas cumpliendo todos tus entrenos', 'racha');
    } else {
      exLogro('ses-' + hoy + '-' + t, '✅', t + ' hecha · llevas ' + hechas + ' de ' + cards.length + ' esta semana', 'ses', false);
    }
    if (vistaActual === 'progreso') exPintarLogros();
  };
})(toggleSesionHecha);
/* ---------- 2 · marcas: récord al marcar una serie con más peso que nunca ---------- */
// series de referencia: historial guardado + otras series ya marcadas hoy en ese ejercicio (no la que se marca)
function exSeriesRef(k, it, salvo){
  const out = [], d = clientesData[k], h = d && d.registro && d.registro.ej && d.registro.ej[enNombreEj(it)];
  (h || []).forEach(function(w){ (w.s || []).forEach(function(x){ out.push([mjNum(x[0]) || 0, mjNum(x[1]) || 0]); }); });
  const hechas = it.querySelectorAll('.sr-h');
  enPesos(it).forEach(function(p, i){
    const v = mjNum(p.dataset.prev); if (v > 0) out.push([v, 0]);
    if (i !== salvo && p.dataset.ok === '1' && mjNum(p.value) > 0) out.push([mjNum(p.value), hechas[i] ? (mjNum(hechas[i].value) || 0) : 0]);
  });
  return out;
}
function exMejorPeso(k, it, salvo){ return exSeriesRef(k, it, salvo).reduce(function(m, x){ return x[0] > m ? x[0] : m; }, 0); }
// más repeticiones nunca hechas con ese peso (o más)
function exMejorReps(k, it, peso, salvo){ return exSeriesRef(k, it, salvo).reduce(function(m, x){ return x[0] >= peso && x[1] > m ? x[1] : m; }, 0); }
(function(){
  const cont = contEnt(); if (!cont) return;
  let previo = null;
  cont.addEventListener('click', function(e){
    const b = e.target.closest && e.target.closest('.srf [data-a="ok"]');
    if (!b || isCoachView()) { previo = null; return; }
    const it = b.closest('.ex-item'), i = +b.closest('.srf').dataset.i, p = enPesos(it)[i];
    previo = { it: it, i: i, p: p, h: it.querySelectorAll('.sr-h')[i], ok: p && p.dataset.ok === '1', ref: exSeriesRef(clienteActual, it, i) };
  }, true);
  cont.addEventListener('click', function(){
    if (!previo) return;
    const x = previo; previo = null;
    setTimeout(function(){
      if (x.ok || !x.p || x.p.dataset.ok !== '1' || !x.ref.length) return;
      const v = mjNum(x.p.value), r = x.h ? mjNum(x.h.value) : 0;
      if (!(v > 0)) return;
      const n = enNombreEj(x.it), hoy = mjISO(new Date());
      const mejorPeso = x.ref.reduce(function(m, s){ return s[0] > m ? s[0] : m; }, 0);
      if (mejorPeso > 0 && v > mejorPeso) {
        exLogro('pr-' + n + '-' + v, '🏆', '¡Nuevo récord en ' + n + ': ' + fmtNum(v) + ' kg!', 'pr');
        return;
      }
      const mejorReps = x.ref.reduce(function(m, s){ return s[0] >= v && s[1] > m ? s[1] : m; }, 0);
      if (r > 0 && mejorReps > 0 && r > mejorReps)   // una sola vez por ejercicio y día para no saturar
        exLogro('prr-' + n + '-' + hoy, '💥', '¡Récord de repeticiones en ' + n + ': ' + r + ' × ' + fmtNum(v) + ' kg!', 'pr');
    }, 60);
  });
})();
/* ---------- 3 · nutrición: día completo y racha de días ---------- */
toggleComida = (function(orig){
  return function(ev, el){
    const b = el.closest('.meal-block'), antes = b && b.classList.contains('eaten');
    orig(ev, el);
    if (!exCliente() || !b || antes || !b.classList.contains('eaten')) return;
    const bl = mealBlocks(), t = bl.filter(function(x){ return x.classList.contains('eaten'); }).length;
    if (t >= bl.length && bl.length) {
      const k = clienteActual, hoy = mjISO(new Date());
      exLogro('nut-' + hoy, '🥗', '¡Día de nutrición completo! ' + t + ' de ' + bl.length + ' comidas', 'nut');
      const r = exRachaNutri(k);
      if (EX_HITOS_DIAS.indexOf(r) > -1) exLogro('racha-nut-' + r + '-' + mjSumarDias(hoy, -(r - 1)), '🔥', r + ' días seguidos cumpliendo tu plan de nutrición', 'racha');
    }
    exPintarHoyToca();
  };
})(toggleComida);
/* ---------- 4 · seguimientos: enviado, racha de semanas y semana de nota ---------- */
guardarSeguimiento = (function(orig){
  return function(){
    const k = clienteActual, antes = (SEGUIMIENTOS[k] || []).length;
    const r = orig.apply(this, arguments);
    if (!exCliente() || !k || (SEGUIMIENTOS[k] || []).length <= antes) return r;
    const lunes = mjISO(mjLunes()), s = SEGUIMIENTOS[k][0];
    exLogro('seg-' + lunes, '📋', 'Seguimiento enviado', 'seg');
    const n = exRachaSegs(k);
    if (EX_HITOS.indexOf(n) > -1) exLogro('racha-seg-' + n + '-' + lunes, '👏', n + ' semanas seguidas enviando tu seguimiento', 'racha');
    if (mjNum(s.e) >= 8 && mjNum(s.n) >= 8) exLogro('seg-top-' + lunes, '💪', 'Gran semana: entreno ' + s.e + '/10 y nutrición ' + s.n + '/10', 'top');
    return r;
  };
})(guardarSeguimiento);
/* ---------- tarjeta «Tus logros» en Progreso ---------- */
function exPintarLogros(){
  const v = document.getElementById('view-progreso'); if (!v || !clienteActual || !exCliente()) return;
  let c = document.getElementById('exLogros');
  if (!c) {
    c = document.createElement('div'); c.id = 'exLogros'; c.className = 'card ex-logros';
    const ring = v.querySelector('.ring-card'); v.insertBefore(c, ring ? ring.nextSibling : v.firstChild);
  }
  const k = clienteActual, L = exLogros(k);
  const re = exRachaEntreno(k), rn = exRachaNutri(k), rs = exRachaSegs(k);
  const ult = L.lista.slice(-5).reverse();
  c.innerHTML = '<div class="card-head"><b>🏅 Tus logros</b><span>' + L.lista.length + (L.lista.length === 1 ? ' logro' : ' logros') + '</span></div>'
    + '<div class="exg-rachas">'
    + '<div><b>' + re + '</b><span>' + (re === 1 ? 'semana' : 'semanas') + ' con todos los entrenos</span></div>'
    + '<div><b>' + rn + '</b><span>' + (rn === 1 ? 'día' : 'días') + ' seguidos con la nutrición</span></div>'
    + '<div><b>' + rs + '</b><span>' + (rs === 1 ? 'semana' : 'semanas') + ' enviando seguimiento</span></div></div>'
    + (ult.length ? '<div class="exg-lista">' + ult.map(function(x){ return '<div class="exg-it"><span aria-hidden="true">' + x.ico + '</span><span><b>' + esc(x.tit) + '</b><small>' + fechaCorta(x.fecha) + '</small></span></div>'; }).join('') + '</div>'
      : '<p class="exg-vacio">Completa tus entrenos, tus comidas y tu seguimiento semanal para ir sumando logros.</p>');
}
goTo = (function(orig){ return function(name){ const r = orig.apply(this, arguments); if (name === 'progreso') exPintarLogros(); return r; }; })(goTo);
