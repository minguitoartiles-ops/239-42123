/* =========================================================
   Fitness sin Dramas — Correcciones y mejoras del análisis del 20/10/2026
   y sistema de tarifas, recordatorios de pago y acceso.
   Se carga el último (después de panelpro.js).
   ========================================================= */

/* ---------- utilidades ---------- */
function mjNum(v){ const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? null : n; }
function mjLunes(d){ const x = new Date(d || Date.now()); x.setHours(12, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
function mjISO(d){ const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }
function mjDias(desdeISO, hastaISO){ return Math.round((new Date(hastaISO + 'T12:00:00') - new Date(desdeISO + 'T12:00:00')) / DIA_MS); }
function mjSumarDias(iso, n){ const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return mjISO(d); }
function mjSumarMeses(iso, n){
  const d = new Date(iso + 'T12:00:00'), dia = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  const ult = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(dia, ult));
  return mjISO(d);
}
function mjFecha(iso){ if (!iso) return '—'; const p = iso.slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
function mjEuros(n){ return n == null ? '' : (Math.round(n * 100) / 100).toFixed(2).replace('.', ',').replace(',00', '') + ' €'; }
function mjHoja(id){
  let o = document.getElementById(id);
  if (!o) {
    o = document.createElement('div');
    o.className = 'fsd-overlay'; o.id = id;
    o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true');
    const ref = document.getElementById('consentSalud');
    ref.parentNode.insertBefore(o, ref.nextSibling);
  }
  return o;
}
function mjCerrarHoja(id){ const o = document.getElementById(id); if (o) o.classList.remove('show'); }

/* =========================================================
   B1 · Peso por serie con coma decimal (antes «22,5» se guardaba como 225)
   ========================================================= */
function mjArreglarSeries(scope){
  Array.prototype.forEach.call((scope || document).querySelectorAll('.serie-in input[type=number]'), function(x){
    const v = x.value;
    x.type = 'text'; x.setAttribute('type', 'text');
    x.removeAttribute('step');
    x.setAttribute('inputmode', 'decimal');
    if (v) { x.value = v; x.setAttribute('value', v); }
  });
}
document.addEventListener('input', function(e){
  const x = e.target;
  if (!x.closest || !x.closest('.serie-in')) return;
  const limpio = x.value.replace(/[^0-9.,]/g, '').replace(/([.,].*)[.,]/g, '$1');
  if (limpio !== x.value) x.value = limpio;
}, true);
tonelajeDe = function(scope){
  let t = 0;
  Array.prototype.forEach.call(scope.querySelectorAll('.serie-in input'), function(x){
    const v = mjNum(x.value), r = mjNum(x.dataset.reps) || 0;
    if (v != null && v > 0) t += v * r;
  });
  return t;
};
onSerieInput = function(inp){
  const item = inp.closest('.ex-item');
  const tro = item && item.querySelector('.ex-trophy');
  let mejor = false;
  if (item) Array.prototype.forEach.call(item.querySelectorAll('.serie-in input'), function(x){
    const v = mjNum(x.value), p = mjNum(x.dataset.prev);
    if (v != null && p != null && p > 0 && v > p) mejor = true;
  });
  if (tro) tro.style.display = mejor ? 'inline' : 'none';
  recalcTonelaje(); recalcEntreno(); recalcCumplimiento(); recalcProgreso();
};
/* B7 · Tonelaje: solo se compara si hay pesos de la semana anterior */
recalcTonelaje = function(){
  const v = document.getElementById('tonelajeValue'), d = document.getElementById('tonelajeDelta');
  if (!v) return;
  const sec = document.getElementById('view-entreno');
  const hay = Array.prototype.filter.call(sec.querySelectorAll('.serie-in input'), function(x){ return x.value.trim() !== ''; }).length;
  const tot = tonelajeDe(sec);
  v.textContent = fmtMil(tot) + ' kg';
  if (!hay) { d.textContent = 'Registra tus pesos para verlo'; d.className = 'tonelaje-delta'; return; }
  let prev = 0, comparables = 0, ahora = 0;
  Array.prototype.forEach.call(sec.querySelectorAll('.serie-in input'), function(x){
    const val = mjNum(x.value), p = mjNum(x.dataset.prev), r = mjNum(x.dataset.reps) || 0;
    if (val != null && val > 0 && p != null && p > 0) { prev += p * r; ahora += val * r; comparables++; }
  });
  if (!comparables) { d.textContent = 'Primera semana con pesos: la próxima podrás compararla'; d.className = 'tonelaje-delta'; return; }
  const dif = Math.round(ahora - prev);
  if (dif > 0) { d.textContent = '+' + fmtMil(dif) + ' kg vs la semana pasada 🏆'; d.className = 'tonelaje-delta up'; }
  else if (dif < 0) { d.textContent = '−' + fmtMil(-dif) + ' kg vs la semana pasada'; d.className = 'tonelaje-delta'; }
  else { d.textContent = 'Igual que la semana pasada'; d.className = 'tonelaje-delta'; }
};

/* =========================================================
   B8 · Cumplimiento: si no hay comidas en el plan, solo cuenta el entreno
   ========================================================= */
recalcCumplimiento = (function(orig){
  return function(){
    orig();
    const ses = sesionCards(), com = mealBlocks();
    if (com.length && ses.length) return;
    const hechas = ses.filter(function(x){ return x.classList.contains('hecha'); }).length;
    const tomadas = com.filter(function(x){ return x.classList.contains('eaten'); }).length;
    const partes = [];
    if (ses.length) partes.push(hechas / ses.length);
    if (com.length) partes.push(tomadas / com.length);
    if (!com.length) setTxt('cumplComidasTxt', 'sin plan');
    if (!ses.length) setTxt('cumplEntrenoTxt', 'sin plan');
    if (!partes.length) { setTxt('cumplGlobal', '—'); const n = document.getElementById('cumplNota'); if (n) n.textContent = 'Cuando tu equipo te prepare el plan, verás aquí cuánto lo cumples.'; return; }
    const glob = Math.round(partes[0] * 100);
    setTxt('cumplGlobal', glob + ' %');
    const nota = document.getElementById('cumplNota');
    if (nota) {
      if (glob >= 85) nota.innerHTML = 'Vas por encima del <b>85 %</b>: es justo el rango en el que se ven los cambios.';
      else if (glob >= 60) nota.innerHTML = 'Estás en el <b>' + glob + ' %</b>. Subir al 85 % marca la diferencia.';
      else nota.innerHTML = 'Vas al <b>' + glob + ' %</b>. Marca lo que vayas cumpliendo para verlo aquí.';
    }
  };
})(recalcCumplimiento);
recalcProgreso = (function(orig){
  return function(){
    orig();
    const ses = sesionCards(), com = mealBlocks();
    if (com.length && ses.length) return;
    const hechas = ses.filter(function(x){ return x.classList.contains('hecha'); }).length;
    const tomadas = com.filter(function(x){ return x.classList.contains('eaten'); }).length;
    const p = ses.length ? hechas / ses.length : (com.length ? tomadas / com.length : null);
    setTxt('pgSemana', p == null ? '—' : Math.round(p * 100) + ' %');
  };
})(recalcProgreso);

/* =========================================================
   Semana real del plan: fechas de sesiones hechas y comidas tomadas,
   cambio de semana (los pesos pasan a «semana anterior») y cambio de día
   ========================================================= */
function mjRegistro(k){ const d = clientesData[k]; if (!d) return null; d.registro = d.registro || { ses: [], com: {}, ton: [] }; return d.registro; }
function mjCambioDeSemana(k){
  const d = clientesData[k];
  if (!d) return false;
  const lunes = mjISO(mjLunes());
  let cambio = false;
  // comidas: «tomada» solo vale para el día en que se marcó
  Array.prototype.forEach.call(contNut().querySelectorAll('.meal-block.eaten'), function(b){
    if (b.dataset.tomada !== mjISO(new Date())) { b.classList.remove('eaten'); delete b.dataset.tomada; cambio = true; }
  });
  if (!d.semanaRef) { d.semanaRef = lunes; return true; }
  if (d.semanaRef >= lunes) return cambio;
  // nueva semana: guardar el tonelaje, pasar los pesos a «semana anterior» y desmarcar sesiones
  const reg = mjRegistro(k);
  const ton = tonelajeDe(contEnt());
  if (ton > 0) { reg.ton.push({ sem: d.semanaRef, kg: Math.round(ton) }); if (reg.ton.length > 60) reg.ton = reg.ton.slice(-60); }
  Array.prototype.forEach.call(contEnt().querySelectorAll('.serie-in input'), function(x){
    if (x.value.trim() !== '') { x.dataset.prev = x.value.trim(); x.setAttribute('data-prev', x.value.trim()); }
    x.value = ''; x.removeAttribute('value');
  });
  Array.prototype.forEach.call(contEnt().querySelectorAll('.sesion-card.hecha'), function(c){ c.classList.remove('hecha'); delete c.dataset.hecha; });
  Array.prototype.forEach.call(contEnt().querySelectorAll('.ex-trophy'), function(t){ t.style.display = 'none'; });
  d.semanaRef = lunes;
  return true;
}
cargarPlan = (function(orig){
  return function(key){
    mjPrepararCalculadora(key);
    orig(key);
    mjArreglarSeries(contEnt());
    if (mjCambioDeSemana(key)) {
      guardarPlan();
      programarGuardado();
      recalcEntreno(); recalcTonelaje(); recalcCumplimiento(); recalcProgreso(); recalcConsumo();
    }
    mjPintarObjetivoNut();
  };
})(cargarPlan);
toggleSesionHecha = (function(orig){
  return function(ev, el){
    orig(ev, el);
    const c = el.closest('.sesion-card');
    const reg = clienteActual && mjRegistro(clienteActual);
    const hoy = mjISO(new Date());
    if (c.classList.contains('hecha')) {
      c.dataset.hecha = hoy;
      if (reg) reg.ses.push(hoy);
    } else {
      const antes = c.dataset.hecha;
      delete c.dataset.hecha;
      if (reg && antes) { const i = reg.ses.lastIndexOf(antes); if (i > -1) reg.ses.splice(i, 1); }
    }
    if (reg && reg.ses.length > 200) reg.ses = reg.ses.slice(-200);
    renderHoy();
    programarGuardado();
  };
})(toggleSesionHecha);
toggleComida = (function(orig){
  return function(ev, el){
    orig(ev, el);
    const b = el.closest('.meal-block');
    const hoy = mjISO(new Date());
    if (b.classList.contains('eaten')) b.dataset.tomada = hoy; else delete b.dataset.tomada;
    const reg = clienteActual && mjRegistro(clienteActual);
    if (reg) {
      const bl = mealBlocks();
      reg.com[hoy] = { t: bl.filter(function(x){ return x.classList.contains('eaten'); }).length, n: bl.length };
      const dias = Object.keys(reg.com).sort();
      while (dias.length > 60) delete reg.com[dias.shift()];
    }
    programarGuardado();
  };
})(toggleComida);
/* B6 · Tira de la semana en «Hoy»: cada sesión hecha aparece en el día real */
renderHoy = (function(orig){
  return function(){
    orig();
    const row = document.getElementById('weekRow');
    if (!row) return;
    const lunes = mjLunes();
    const fechas = sesionCards().map(function(c){ return c.dataset.hecha; }).filter(Boolean);
    Array.prototype.forEach.call(row.querySelectorAll('.week-day'), function(dia, i){
      const iso = mjISO(new Date(lunes.getTime() + i * DIA_MS));
      const n = fechas.filter(function(f){ return f === iso; }).length;
      const dot = dia.querySelector('.week-dot');
      if (!dot) return;
      dot.classList.toggle('done', n > 0);
      dot.textContent = n > 1 ? '✓' + n : (n ? '✓' : '');
      dot.setAttribute('aria-label', n ? n + (n === 1 ? ' sesión hecha' : ' sesiones hechas') : 'sin sesión');
    });
  };
})(renderHoy);

/* =========================================================
   B4 / D3 · Objetivo nutricional propio de cada cliente
   (antes la calculadora era la misma para todos y el cliente veía 2.000 kcal por defecto)
   ========================================================= */
const NUT_DEF = { kcal: 2000, p: 30, c: 45, f: 25 };
function mjPrepararCalculadora(key){
  const d = clientesData[key];
  const o = (d && d.nutObj && d.nutObj.kcal) ? d.nutObj : NUT_DEF;
  const set = function(id, v){ const el = document.getElementById(id); if (el) { el.value = v; el.setAttribute('value', v); } };
  set('calcKcal', o.kcal); set('calcP', o.p); set('calcC', o.c); set('calcF', o.f);
  const row = document.getElementById('calcMealRow');
  if (row && d && d.nutObj && d.nutObj.comidas) {
    row.innerHTML = d.nutObj.comidas.map(function(v, i){
      return '<label>C' + (i + 1) + '<input type="number" oninput="calcularPlan()" class="calc-meal" value="' + v + '"></label>';
    }).join('');
  }
}
let mjGuardarNutPend = null;
function mjGuardarObjetivoNut(){
  if (!isCoachView() || !clienteActual || !clientesData[clienteActual]) return;
  const v = function(id){ return mjNum((document.getElementById(id) || {}).value); };
  const o = { kcal: v('calcKcal'), p: v('calcP'), c: v('calcC'), f: v('calcF') };
  if (!o.kcal || [o.p, o.c, o.f].some(function(x){ return x == null; }) || Math.abs(o.p + o.c + o.f - 100) > 0.5) return;
  o.comidas = Array.prototype.map.call(document.querySelectorAll('.calc-meal'), function(x){ return mjNum(x.value) || 0; });
  const d = clientesData[clienteActual], antes = d.nutObj || {};
  const igual = antes.kcal === o.kcal && antes.p === o.p && antes.c === o.c && antes.f === o.f && JSON.stringify(antes.comidas || []) === JSON.stringify(o.comidas);
  if (igual) return;
  o.fecha = new Date().toISOString();
  o.por = coachActivo ? coachActivo.u : '';
  d.nutObj = o;
  programarGuardado();
}
calcularPlan = (function(orig){
  return function(){
    orig();
    if (isCoachView()) { clearTimeout(mjGuardarNutPend); mjGuardarNutPend = setTimeout(mjGuardarObjetivoNut, 500); }
    mjPintarObjetivoNut();
  };
})(calcularPlan);
function mjPintarObjetivoNut(){
  const d = clienteActual && clientesData[clienteActual];
  if (!d) return;
  const n = mealBlocks().length;
  if (!(d.nutObj && d.nutObj.kcal) && !isCoachView()) {
    // el cliente no ve un objetivo inventado
    setTxt('resKcal', '—'); setTxt('resP', '—'); setTxt('resC', '—'); setTxt('resF', '—');
    setTxt('resNote', 'Fátima todavía no ha fijado tu objetivo diario');
    setTxt('kcalObj', '—'); setTxt('kcalRest', '—');
    Array.prototype.forEach.call(document.querySelectorAll('#comidasCont .chip-qty'), function(q){ q.textContent = ''; });
    return;
  }
  let nota = n ? 'Reparto en ' + n + (n === 1 ? ' comida' : ' comidas') : (isCoachView() ? 'Objetivo fijado · aún sin comidas en el plan' : 'Tu plan de comidas está en preparación');
  if (d.nutObj && d.nutObj.fecha) nota += ' · actualizado el ' + fechaCorta(d.nutObj.fecha) + (d.nutObj.por ? ' por ' + d.nutObj.por : '');
  setTxt('resNote', nota);
}
/* el texto fijo «Ajustado por Fátima» pasa a decir cuándo se actualizó el plan */
goTo = (function(orig){
  return function(n, s){ orig(n, s); if (n === 'plan') mjPintarObjetivoNut(); };
})(goTo);

/* =========================================================
   B3 · Textos vacíos distintos para el cliente y para el profesional
   ========================================================= */
function mjTextosVacios(){
  const cli = isCoachView() ? null : (clienteActual && clientesData[clienteActual]);
  const e = contEnt() && contEnt().querySelector('.vacio');
  if (e) e.innerHTML = cli ? '<b>Tu entrenamiento está en preparación</b><span>Domingo te avisará en cuanto tengas tus sesiones.</span>'
                           : '<b>Sin sesiones todavía</b><span>Pulsa «Añadir sesión» para montar el entrenamiento de este cliente.</span>';
  const n = contNut() && contNut().querySelector('.vacio');
  if (n) n.innerHTML = cli ? '<b>Tu plan nutricional está en preparación</b><span>Fátima te avisará en cuanto tengas tus comidas.</span>'
                           : '<b>Sin comidas todavía</b><span>Pulsa «Añadir comida» para montar el plan nutricional de este cliente.</span>';
}
cargarPlan = (function(orig){ return function(key){ orig(key); mjTextosVacios(); }; })(cargarPlan);
goTo = (function(orig){ return function(n, s){ orig(n, s); if (n === 'plan' || n === 'entreno') mjTextosVacios(); }; })(goTo);
removeMeal = (function(orig){ return function(ev, el){ orig(ev, el); mjTextosVacios(); }; })(removeMeal);
if (typeof removeSesion === 'function') removeSesion = (function(orig){ return function(ev, el){ orig(ev, el); mjTextosVacios(); }; })(removeSesion);

/* =========================================================
   B2 / D1 / D2 · Alta: medidas iniciales, duración y semana real del programa
   ========================================================= */
const MJ_MEDIDAS_ALTA = ['peso', 'altura', 'cintura', 'cadera', 'biceps', 'muslo'];
function mjDuracion(d){ return (d && d.duracion) || 12; }
function mjSemanaNum(d){
  if (!d || !d.fechaAlta) return 1;
  const dias = Math.floor((Date.now() - new Date(d.fechaAlta).getTime()) / DIA_MS);
  return Math.max(1, Math.floor(dias / 7) + 1);
}
function mjRefrescarSemanas(){
  Object.keys(clientesData).forEach(function(k){
    const d = clientesData[k];
    if (!d) return;
    const dur = mjDuracion(d), n = mjSemanaNum(d);
    d.semana = Math.min(n, dur) + ' de ' + dur + (n > dur ? ' · terminado' : '');
  });
}
function mjBase(k){
  const d = clientesData[k];
  if (!d || !d.medIni) return null;
  return { fecha: d.fechaAlta, s: 'Alta · ' + fechaCorta(d.fechaAlta), med: d.medIni, base: true,
           peso: d.medIni.peso != null ? fmtNum(d.medIni.peso) + ' kg' : '—' };
}
confirmAlta = (function(orig){
  return function(){
    const v = document.getElementById('view-alta');
    const nums = v.querySelectorAll('.row2col .field input');
    const med = {};
    let alguna = false;
    MJ_MEDIDAS_ALTA.forEach(function(m, i){
      const x = mjNum(nums[i] && nums[i].value);
      if (x != null && x > 0) { med[m] = x; alguna = true; }
    });
    const dur = +((v.querySelector('#altaDuracion .chip.selected') || {}).dataset || {}).sem || 12;
    const tipo = ((v.querySelector('#altaTarifa .chip.selected') || {}).dataset || {}).tarifa || 'ninguna';
    const precio = mjNum((document.getElementById('altaPrecio') || {}).value);
    const pagado = !!(document.getElementById('altaPagado') || {}).checked;
    const antes = Object.keys(clientesData);
    orig();
    const nuevo = Object.keys(clientesData).filter(function(k){ return antes.indexOf(k) < 0; })[0];
    if (!nuevo) return;
    const d = clientesData[nuevo];
    if (alguna) d.medIni = med;
    d.duracion = dur;
    d.semanaRef = mjISO(mjLunes());
    mjPonerTarifa(d, tipo, precio, pagado, mjISO(new Date()));
    mjRefrescarSemanas();
    guardarTodo();
    actualizarPanel();
  };
})(confirmAlta);
goToAlta = (function(orig){
  return function(){
    orig();
    const p = document.getElementById('altaPagado'); if (p) p.checked = true;
  };
})(goToAlta);
/* la semana se recalcula siempre con la fecha de alta */
actualizarPanel = (function(orig){ return function(){ mjRefrescarSemanas(); orig(); }; })(actualizarPanel);
goToCliente = (function(orig){ return function(k){ mjRefrescarSemanas(); orig(k); }; })(goToCliente);
enterApp = (function(orig){ return function(){ mjRefrescarSemanas(); orig(); }; })(enterApp);
/* D1 · Las medidas del alta cuentan como punto de partida («seguimiento 0») */
tarjetaSeguimiento = (function(orig){
  return function(r, i, lista){
    if (lista && !lista[i + 1] && !r.base) {
      const k = Object.keys(SEGUIMIENTOS).filter(function(x){ return SEGUIMIENTOS[x] === lista; })[0];
      const b = k && mjBase(k);
      if (b) return orig(r, i, lista.concat([b]));
    }
    return orig(r, i, lista);
  };
})(tarjetaSeguimiento);
let mjBaseEvol = null;
evolucion = (function(orig){ return function(obj, r, prev){ return orig(obj, r, prev || mjBaseEvol); }; })(evolucion);
puntuacionCliente = (function(orig){
  return function(k, i){
    const b = mjBase(k);
    const segs = SEGUIMIENTOS[k] || [];
    mjBaseEvol = (b && !segs[(i || 0) + 1]) ? b : null;
    try { return orig(k, i); } finally { mjBaseEvol = null; }
  };
})(puntuacionCliente);
function mjConBase(fn){
  return function(){
    const k = clienteActual, b = k && mjBase(k), lista = k && SEGUIMIENTOS[k];
    if (!b || !lista) return fn.apply(this, arguments);
    lista.push(b);
    try { return fn.apply(this, arguments); } finally { const i = lista.indexOf(b); if (i > -1) lista.splice(i, 1); }
  };
}
pintarCambiosCuerpo = mjConBase(pintarCambiosCuerpo);
if (typeof pintarProgreso === 'function') pintarProgreso = mjConBase(pintarProgreso);
/* sin seguimientos previos, el formulario muestra de fondo las medidas del alta */
sgAnterior = (function(orig){
  return function(){ return orig() || (clienteActual ? mjBase(clienteActual) : null); };
})(sgAnterior);
/* la ficha muestra el peso de partida */
goToCliente = (function(orig){
  return function(k){
    orig(k);
    const d = clientesData[k], b = mjBase(k), segs = SEGUIMIENTOS[k] || [];
    if (b && b.med.peso != null && !segs.length) { setTxt('cd-peso', fmtNum(b.med.peso) + ' kg'); setTxt('cd-pesoDelta', 'Peso del alta'); }
    else if (b && b.med.peso != null && segs[0] && segs[0].med && segs[0].med.peso != null) {
      const df = segs[0].med.peso - b.med.peso;
      setTxt('cd-pesoDelta', (df > 0 ? '+' : (df < 0 ? '−' : '')) + fmtNum(Math.abs(df)) + ' kg desde el alta');
    }
  };
})(goToCliente);

/* =========================================================
   B11 · «Mensajes sin leer» en rojo solo si hay alguno
   ========================================================= */
actualizarPanel = (function(orig){
  return function(){
    orig();
    const m = document.getElementById('statMsg');
    if (m) m.classList.toggle('warn', (parseInt(m.textContent, 10) || 0) > 0);
  };
})(actualizarPanel);

/* =========================================================
   B14 · Tras restaurar una copia se avisa de que hay que volver a entrar
   ========================================================= */
(function(){
  let n = null;
  try { n = sessionStorage.getItem('fsd_restaurada'); sessionStorage.removeItem('fsd_restaurada'); } catch(e){}
  if (n != null) setTimeout(function(){ toast('Copia restaurada (' + n + (n === '1' ? ' cliente' : ' clientes') + '). Vuelve a entrar con tu contraseña.'); }, 600);
})();

/* =========================================================
   B9 · Pantallas estrechas: etiquetas cortas en la barra inferior
   ========================================================= */
(function(){
  const cortos = { 'tab-entreno': 'ENTRENO', 'ctab-segs': 'SEGUIM.' };
  Object.keys(cortos).forEach(function(id){
    const b = document.getElementById(id);
    if (!b) return;
    const nodo = Array.prototype.filter.call(b.childNodes, function(n){ return n.nodeType === 3 && n.textContent.trim(); })[0];
    if (!nodo) return;
    const largo = nodo.textContent.trim();
    const sp = document.createElement('span'); sp.className = 'tl-largo'; sp.textContent = largo;
    const sc = document.createElement('span'); sc.className = 'tl-corto'; sc.textContent = cortos[id]; sc.setAttribute('aria-hidden', 'true');
    b.replaceChild(sp, nodo); b.insertBefore(sc, sp.nextSibling);
    b.setAttribute('aria-label', largo.charAt(0) + largo.slice(1).toLowerCase());
  });
})();

/* =========================================================
   D2 · Editar los datos del cliente desde la ficha
   (nombre, contacto, objetivo, duración y fecha de alta)
   ========================================================= */
const MJ_OBJETIVOS = ['Perder grasa', 'Ganar músculo', 'Recomposición', 'Mantenimiento'];
const MJ_DURACIONES = [[4, '4 semanas'], [8, '8 semanas'], [12, '12 semanas'], [16, '16 semanas'], [24, '24 semanas'], [52, '1 año']];
function abrirEditarCliente(){
  const k = clienteActual, d = clientesData[k];
  if (!d) return;
  const o = mjHoja('mjEditCli');
  o.setAttribute('aria-labelledby', 'mjEditTit');
  const chips = function(lista, actual, grupo){
    return '<div class="chips" data-grupo="' + grupo + '">' + lista.map(function(x){
      const v = Array.isArray(x) ? x[0] : x, t = Array.isArray(x) ? x[1] : x;
      return '<button type="button" class="chip protein' + (String(v) === String(actual) ? ' selected' : '') + '" data-v="' + esc(String(v)) + '" onclick="mjChip(this)">' + esc(t) + '</button>';
    }).join('') + '</div>';
  };
  o.innerHTML = '<div class="fsd-sheet full"><div class="sheet-head"><h3 id="mjEditTit">Datos de ' + esc(d.nombre) + '</h3><button class="x-btn" onclick="mjCerrarHoja(\'mjEditCli\')" aria-label="Cerrar">×</button></div>'
    + '<div class="field"><label for="mjEcNom">Nombre completo</label><input type="text" id="mjEcNom" value="' + esc(d.nombre || '') + '"></div>'
    + '<div class="field"><label for="mjEcMail">Correo</label><input type="email" id="mjEcMail" value="' + esc(d.email || '') + '"></div>'
    + '<div class="field"><label for="mjEcTel">Teléfono</label><input type="tel" id="mjEcTel" value="' + esc(d.telefono || '') + '"></div>'
    + '<div class="alta-label">Objetivo</div>' + chips(MJ_OBJETIVOS, d.objetivo, 'obj')
    + '<div class="alta-label">Duración del programa</div>' + chips(MJ_DURACIONES, mjDuracion(d), 'dur')
    + '<div class="field"><label for="mjEcAlta">Fecha de alta (inicio del programa)</label><input type="date" id="mjEcAlta" value="' + esc((d.fechaAlta || '').slice(0, 10)) + '"></div>'
    + '<p class="ajx-note">La semana del programa se calcula sola a partir de esta fecha. Ahora va por la semana ' + esc(d.semana || '—') + '.</p>'
    + '<button class="btn-primary" onclick="guardarEditarCliente()">Guardar</button></div>';
  o.classList.add('show');
}
function mjChip(b){
  Array.prototype.forEach.call(b.parentElement.querySelectorAll('.chip'), function(x){ x.classList.remove('selected'); });
  b.classList.add('selected');
}
function guardarEditarCliente(){
  const d = clientesData[clienteActual], o = document.getElementById('mjEditCli');
  if (!d || !o) return;
  const nom = document.getElementById('mjEcNom').value.trim();
  if (!nom) { toast('El nombre no puede quedar vacío.'); return; }
  d.nombre = nom;
  d.email = document.getElementById('mjEcMail').value.trim();
  d.telefono = document.getElementById('mjEcTel').value.trim();
  const sel = function(g){ const c = o.querySelector('[data-grupo="' + g + '"] .chip.selected'); return c ? c.dataset.v : null; };
  d.objetivo = sel('obj') || d.objetivo;
  d.duracion = +(sel('dur') || mjDuracion(d));
  const f = document.getElementById('mjEcAlta').value;
  if (f) d.fechaAlta = new Date(f + 'T12:00:00').toISOString();
  mjRefrescarSemanas();
  guardarTodo();
  mjCerrarHoja('mjEditCli');
  goToCliente(clienteActual);
  actualizarPanel();
  toast('Datos guardados');
}

/* =========================================================
   D11 · Copiar el plan de otro cliente (como plantilla)
   ========================================================= */
function abrirCopiarPlan(){
  const k = clienteActual;
  const otros = Object.keys(clientesData).filter(function(x){ return x !== k && PLANES[x] && (PLANES[x].ent || PLANES[x].nut); });
  if (!otros.length) { toast('Todavía no hay otro cliente con plan para copiar.'); return; }
  const rol = coachActivo ? coachActivo.rol : '';
  const o = mjHoja('mjCopiar');
  o.innerHTML = '<div class="fsd-sheet"><div class="sheet-head"><h3>Copiar plan a ' + esc(clientesData[k].nombre) + '</h3><button class="x-btn" onclick="mjCerrarHoja(\'mjCopiar\')" aria-label="Cerrar">×</button></div>'
    + '<p class="ajx-note">Se sustituye el plan actual de este cliente. Los pesos y lo marcado por el otro cliente no se copian.</p>'
    + '<div class="field"><label for="mjCpDe">Copiar desde</label><select id="mjCpDe" class="mj-select">' + otros.map(function(x){ return '<option value="' + x + '">' + esc(clientesData[x].nombre) + '</option>'; }).join('') + '</select></div>'
    + '<label class="chk-row"><input type="checkbox" id="mjCpEnt"' + (rol !== 'dietista' ? ' checked' : '') + '><span>Entrenamiento</span></label>'
    + '<label class="chk-row"><input type="checkbox" id="mjCpNut"' + (rol === 'dietista' ? ' checked' : '') + '><span>Plan nutricional (con su objetivo de calorías)</span></label>'
    + '<button class="btn-primary" onclick="copiarPlan()">Copiar</button></div>';
  o.classList.add('show');
}
function mjLimpiarPlanCopiado(html){
  const t = document.createElement('div'); t.innerHTML = html || '';
  Array.prototype.forEach.call(t.querySelectorAll('.serie-in input'), function(x){ x.removeAttribute('value'); x.setAttribute('data-prev', '0'); });
  Array.prototype.forEach.call(t.querySelectorAll('.sesion-card.hecha, .meal-block.eaten'), function(x){ x.classList.remove('hecha', 'eaten'); x.removeAttribute('data-hecha'); x.removeAttribute('data-tomada'); });
  Array.prototype.forEach.call(t.querySelectorAll('.ex-trophy'), function(x){ x.style.display = 'none'; });
  return t.innerHTML;
}
function copiarPlan(){
  const k = clienteActual, de = document.getElementById('mjCpDe').value;
  const ent = document.getElementById('mjCpEnt').checked, nut = document.getElementById('mjCpNut').checked;
  if (!ent && !nut) { toast('Marca qué quieres copiar.'); return; }
  const fuente = PLANES[de] || {};
  PLANES[k] = PLANES[k] || { ent: '', nut: '' };
  if (ent) PLANES[k].ent = mjLimpiarPlanCopiado(fuente.ent);
  if (nut) {
    PLANES[k].nut = mjLimpiarPlanCopiado(fuente.nut);
    if (clientesData[de].nutObj) clientesData[k].nutObj = Object.assign({}, clientesData[de].nutObj, { fecha: new Date().toISOString(), por: coachActivo ? coachActivo.u : '' });
  }
  cargarPlan(k);                       // al guardar se toma lo que hay en pantalla: primero se carga el plan copiado
  guardarTodo();
  mjCerrarHoja('mjCopiar');
  if (ent) crearAviso(claveCliente(k), 'plan', 'Tu entrenamiento se ha actualizado', (coachActivo ? coachActivo.u : 'Tu equipo') + ' te ha preparado un plan nuevo.', { vista: 'entreno' });
  if (nut) crearAviso(claveCliente(k), 'plan', 'Tu plan de nutrición se ha actualizado', (coachActivo ? coachActivo.u : 'Tu equipo') + ' te ha preparado un plan nuevo.', { vista: 'plan' });
  toast('Plan copiado de ' + clientesData[de].nombre);
}

/* filas nuevas en la ficha: editar datos y copiar plan */
(function(){
  const v = document.getElementById('view-coach-cliente');
  const cod = document.getElementById('fichaCodigo');
  const grupo = cod && cod.closest('.list-group');
  if (!grupo) return;
  const r1 = document.createElement('div');
  r1.className = 'list-row'; r1.id = 'fichaEditar'; r1.onclick = abrirEditarCliente;
  r1.innerHTML = '<span>Editar datos del cliente</span><span class="ajx-acts"><span class="ajx-val">Objetivo, duración, contacto</span><span class="chev">›</span></span>';
  grupo.insertBefore(r1, grupo.firstChild);
  const del = Array.prototype.filter.call(grupo.querySelectorAll('.list-row'), function(r){ return /Eliminar cliente/.test(r.textContent); })[0];
  const r2 = document.createElement('div');
  r2.className = 'list-row'; r2.id = 'fichaCopiar'; r2.onclick = abrirCopiarPlan;
  r2.innerHTML = '<span>Copiar plan de otro cliente</span><span class="chev">›</span>';
  grupo.insertBefore(r2, del || null);
})();

/* =========================================================
   D5 · Comidas tomadas y sesiones hechas → adherencia sugerida en el seguimiento
   ========================================================= */
function mjAdherenciaSugerida(k){
  const reg = mjRegistro(k);
  if (!reg) return {};
  const hoy = new Date(), dias = [];
  for (let i = 6; i >= 0; i--) dias.push(mjISO(new Date(hoy.getTime() - i * DIA_MS)));
  const out = {};
  const nSes = sesionCards().length;
  if (nSes) {
    const hechas = reg.ses.filter(function(f){ return dias.indexOf(f) > -1; }).length;
    if (hechas || reg.ses.length) out.ent = Math.max(1, Math.round(Math.min(1, hechas / nSes) * 10));
    out.entTxt = hechas + ' de ' + nSes + (nSes === 1 ? ' sesión' : ' sesiones') + ' en los últimos 7 días';
  }
  const conDatos = dias.filter(function(f){ return reg.com[f]; });
  if (conDatos.length) {
    const nCom = mealBlocks().length || (reg.com[conDatos[conDatos.length - 1]] || {}).n || 0;
    let t = 0, n = 0;
    dias.forEach(function(f){ const c = reg.com[f]; t += c ? c.t : 0; n += c ? c.n : nCom; });
    if (n) { out.nut = Math.max(1, Math.round(t / n * 10)); out.nutTxt = t + ' de ' + n + ' comidas marcadas en los últimos 7 días'; }
  }
  return out;
}
function mjPintarSugerencias(){
  if (!clienteActual || isCoachView()) return;
  const s = mjAdherenciaSugerida(clienteActual);
  [['rEntreno', s.ent, s.entTxt], ['rNutri', s.nut, s.nutTxt]].forEach(function(g){
    const out = document.getElementById(g[0]); if (!out) return;
    const fila = out.parentElement, inp = fila.querySelector('input[type=range]');
    let p = fila.nextElementSibling && fila.nextElementSibling.classList.contains('sg-sugerido') ? fila.nextElementSibling : null;
    if (g[1] == null) { if (p) p.remove(); return; }
    if (!p) { p = document.createElement('p'); p.className = 'sg-sugerido'; fila.parentNode.insertBefore(p, fila.nextSibling); }
    p.innerHTML = 'Según lo que has marcado: <b>' + g[1] + '/10</b> (' + esc(g[2]) + '). Puedes cambiarlo.';
    if (inp && !inp.dataset.tocado) { inp.value = g[1]; out.textContent = g[1]; }
  });
}
document.addEventListener('input', function(e){ if (e.target.matches && e.target.matches('#view-seguimiento input[type=range]')) e.target.dataset.tocado = '1'; }, true);
goTo = (function(orig){ return function(n, s){ orig(n, s); if (n === 'seguimiento') mjPintarSugerencias(); }; })(goTo);
guardarSeguimiento = (function(orig){
  return function(){
    orig();
    Array.prototype.forEach.call(document.querySelectorAll('#view-seguimiento input[type=range]'), function(i){ delete i.dataset.tocado; });
  };
})(guardarSeguimiento);

/* =========================================================
   D6 · Aviso en «Hoy» si faltan las alergias
   ========================================================= */
function mjAvisoAlergiasHoy(){
  const hoy = document.getElementById('view-hoy');
  if (!hoy) return;
  let c = document.getElementById('hoyAlergias');
  const d = clienteActual && clientesData[clienteActual];
  const falta = d && !isCoachView() && !(d.alergias && d.alergias.fecha);
  if (!falta) { if (c) c.remove(); return; }
  if (!c) {
    c = document.createElement('button');
    c.type = 'button'; c.id = 'hoyAlergias'; c.className = 'hoy-aviso amb';
    c.onclick = function(){ abrirAlergias(); };
    const ref = document.getElementById('seguiAviso');
    ref.parentNode.insertBefore(c, ref);
  }
  c.innerHTML = '<span class="ha-ico" aria-hidden="true">⚠️</span><span class="ha-txt"><b>Indica tus alergias e intolerancias</b><span>Fátima las necesita para preparar tu dieta.</span></span><span class="chev">›</span>';
}
goTo = (function(orig){ return function(n, s){ orig(n, s); if (n === 'hoy') mjAvisoAlergiasHoy(); }; })(goTo);
guardarAlergias = (function(orig){ return function(){ orig(); mjAvisoAlergiasHoy(); }; })(guardarAlergias);
enterApp = (function(orig){ return function(){ orig(); mjAvisoAlergiasHoy(); }; })(enterApp);

/* =========================================================
   D7 · Campana en todas las pestañas del profesional
   ========================================================= */
(function(){
  ['view-coach-chats', 'view-coach-segs', 'view-coach-ajustes'].forEach(function(id, i){
    const top = document.querySelector('#' + id + ' .alta-top');
    if (!top) return;
    const b = document.createElement('button');
    b.className = 'bell mj-bell'; b.setAttribute('aria-label', 'Notificaciones'); b.style.order = '3';
    b.onclick = function(){ abrirNotisCoach(); };
    b.innerHTML = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg><span class="bell-badge hide mj-bell-badge">0</span>';
    top.appendChild(b);
  });
})();
pintarCampanas = (function(orig){
  return function(){
    orig();
    const src = document.getElementById('coachBellBadge');
    Array.prototype.forEach.call(document.querySelectorAll('.mj-bell-badge'), function(b){
      b.textContent = src ? src.textContent : '0';
      b.className = 'bell-badge mj-bell-badge' + (src && src.classList.contains('hide') ? ' hide' : '');
    });
  };
})(pintarCampanas);

/* =========================================================
   D8 · Barra del cliente con 5 pestañas: Ajustes pasa al perfil
   ========================================================= */
(function(){
  const t = document.getElementById('tab-ajustes');
  if (t) t.hidden = true;
  const i = TABS_CLIENTE.indexOf('ajustes'); if (i > -1) TABS_CLIENTE.splice(i, 1);
})();
/* ajustes ahora cuelga del perfil: el atrás vuelve al perfil */
goTo = (function(orig){
  return function(n, s){
    if (n === 'ajustes' && !s && vistaActual !== 'perfil' && navHist[navHist.length - 1] !== 'perfil' && vistaActual !== 'ajustes') { orig('perfil', s); }
    orig(n, s);
    if (TABS_CLIENTE.indexOf(n) > -1 && !isCoachView()) navHist.length = 0;   // una pestaña principal empieza de cero
    if (n === 'ajustes' || n === 'perfil') Array.prototype.forEach.call(document.querySelectorAll('#app .tb .tbi'), function(b){ b.classList.remove('active'); });
  };
})(goTo);

/* =========================================================
   D9 · Copia de seguridad: recordatorio semanal para los profesionales
   D10 · Espacio usado en el móvil
   ========================================================= */
const MJ_COPIA_KEY = 'fsd_ultima_copia';
descargarCopiaCompleta = (function(orig){
  return function(){ orig(); try { localStorage.setItem(MJ_COPIA_KEY, new Date().toISOString()); } catch(e){} mjAvisoCopia(); };
})(descargarCopiaCompleta);
function mjDiasSinCopia(){
  let u = null; try { u = localStorage.getItem(MJ_COPIA_KEY); } catch(e){}
  return u ? Math.floor((Date.now() - new Date(u).getTime()) / DIA_MS) : null;
}
function mjAvisoCopia(){
  const panel = document.getElementById('view-coach-panel');
  if (!panel) return;
  let c = document.getElementById('avisoCopia');
  const n = Object.keys(clientesData).length, dias = mjDiasSinCopia();
  const toca = coachActivo && n > 0 && (dias == null || dias >= 7);
  if (!toca) { if (c) c.remove(); return; }
  if (!c) {
    c = document.createElement('button');
    c.type = 'button'; c.id = 'avisoCopia'; c.className = 'hoy-aviso';
    c.onclick = function(){ descargarCopiaCompleta(); };
    const body = panel.querySelector('.alta-body') || panel;
    const ref = body.querySelector('.panel-stats') || body.firstChild;
    body.insertBefore(c, ref ? ref.nextSibling : null);
  }
  c.innerHTML = '<span class="ha-ico" aria-hidden="true">💾</span><span class="ha-txt"><b>' + (dias == null ? 'Aún no has descargado ninguna copia' : 'Hace ' + dias + ' días de tu última copia')
    + '</b><span>Los datos solo están en este móvil. Toca para descargar una copia.</span></span><span class="chev">›</span>';
}
actualizarPanel = (function(orig){ return function(){ orig(); mjAvisoCopia(); }; })(actualizarPanel);
function mjEspacio(){
  let total = 0;
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); total += (k.length + (localStorage.getItem(k) || '').length) * 2; } } catch(e){}
  return total;
}
htmlAjustes = (function(orig){
  return function(rol){
    let h = orig(rol);
    const usado = mjEspacio(), lim = 5 * 1024 * 1024, pct = Math.min(100, Math.round(usado / lim * 100));
    const mb = (usado / 1024 / 1024).toFixed(usado < 1024 * 1024 ? 2 : 1).replace('.', ',');
    const bloque = '<div class="mj-espacio"><div class="mj-esp-top"><span>Espacio usado en este móvil</span><b>' + mb + ' MB de unos 5 MB</b></div>'
      + '<div class="mj-esp-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Espacio usado"><i class="' + (pct >= 80 ? 'alto' : '') + '" style="width:' + Math.max(2, pct) + '%"></i></div>'
      + '<p>Las fotos y notas de voz son lo que más ocupa.' + (pct >= 80 ? ' Descarga una copia y borra fotos o audios antiguos.' : '') + '</p></div>';
    const marca = '<div class="section-lbl">Privacidad</div>';
    return h.indexOf(marca) > -1 ? h.replace(marca, bloque + marca) : h + bloque;
  };
})(htmlAjustes);

/* =========================================================
   D12 · Seguimientos en PDF (se abre el diálogo de imprimir → «Guardar como PDF»)
   ========================================================= */
function exportarSeguimientosPDF(k){
  k = k || clienteActual;
  const d = clientesData[k];
  if (!d) return;
  const lista = (SEGUIMIENTOS[k] || []).slice().reverse();
  const b = mjBase(k);
  const filas = (b ? [b] : []).concat(lista);
  if (!filas.length) { toast('Todavía no hay seguimientos.'); return; }
  const cel = function(v){ return '<td>' + (v == null || v === '' ? '—' : esc(String(v))) + '</td>'; };
  const num = function(r, m){ return r.med && r.med[m] != null ? fmtNum(r.med[m]) : null; };
  let t = '<table><thead><tr><th>Semana</th><th>Peso</th><th>Cintura</th><th>Cadera</th><th>Bíceps</th><th>Muslo</th><th>Entreno</th><th>Nutrición</th><th>Motiv.</th><th>Estrés</th><th>Pasos/día</th></tr></thead><tbody>';
  filas.forEach(function(r){
    t += '<tr>' + cel(r.s) + cel(num(r, 'peso')) + cel(num(r, 'cintura')) + cel(num(r, 'cadera')) + cel(num(r, 'biceps')) + cel(num(r, 'muslo'))
      + cel(r.e ? r.e + '/10' : null) + cel(r.n ? r.n + '/10' : null) + cel(r.m && r.m !== '—' ? r.m + '/5' : null) + cel(r.x ? r.x + '/10' : null)
      + cel(r.pasos != null ? fmtPasos(r.pasos) : null) + '</tr>';
  });
  t += '</tbody></table>';
  const notas = lista.filter(function(r){ return r.prog || r.obs; }).map(function(r){
    return '<div class="n"><b>' + esc(r.s) + '</b>' + (r.prog ? '<p><i>Progreso:</i> ' + esc(r.prog) + '</p>' : '') + (r.obs ? '<p><i>Obstáculos:</i> ' + esc(r.obs) + '</p>' : '') + '</div>';
  }).join('');
  const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Seguimientos de ' + esc(d.nombre) + '</title><style>'
    + 'body{font:12px/1.45 Arial,sans-serif;color:#111;margin:24px}h1{font-size:20px;margin:0}h2{font-size:14px;margin:22px 0 8px}.m{color:#555;margin:4px 0 16px}'
    + 'table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:5px 6px;text-align:left}th{background:#EAF2FB;font-size:11px}'
    + '.n{margin:0 0 10px;page-break-inside:avoid}.n p{margin:2px 0}footer{margin-top:24px;color:#777;font-size:10px}</style></head><body>'
    + '<h1>Seguimientos · ' + esc(d.nombre) + '</h1><div class="m">' + esc(d.objetivo || '') + ' · Semana ' + esc(d.semana || '') + ' · alta el ' + fechaCorta(d.fechaAlta) + '</div>'
    + t + (notas ? '<h2>Notas</h2>' + notas : '')
    + '<footer>Fitness sin Dramas · generado el ' + fechaCorta(new Date().toISOString()) + '. Contiene datos de salud: guárdalo en un lugar seguro.</footer></body></html>';
  let f = document.getElementById('mjPrint');
  if (f) f.remove();
  f = document.createElement('iframe');
  f.id = 'mjPrint'; f.setAttribute('aria-hidden', 'true');
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(f);
  f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close();
  setTimeout(function(){
    try { f.contentWindow.focus(); f.contentWindow.print(); }
    catch(e){ toast('Tu navegador no permite imprimir desde aquí.'); }
  }, 300);
}
(function(){
  // botón en el formulario del cliente (debajo de «Tus seguimientos») y en la vista del profesional
  const h = document.getElementById('historialSegui');
  if (h) {
    const b = document.createElement('button');
    b.className = 'mini-btn mj-pdf'; b.textContent = '📄 Descargar en PDF';
    b.onclick = function(){ exportarSeguimientosPDF(clienteActual); };
    h.parentNode.insertBefore(b, h);
  }
  const s = document.getElementById('seguiList');
  if (s) {
    const b2 = document.createElement('button');
    b2.className = 'mini-btn mj-pdf'; b2.textContent = '📄 Descargar en PDF';
    b2.onclick = function(){ exportarSeguimientosPDF(clienteActual); };
    s.parentNode.insertBefore(b2, s);
  }
})();

/* =========================================================
   D13 · Accesibilidad: nombre en los interruptores
   ========================================================= */
function mjNombrarInterruptores(scope){
  Array.prototype.forEach.call((scope || document).querySelectorAll('.toggle'), function(t){
    if (t.getAttribute('aria-label')) return;
    const fila = t.parentElement && t.parentElement.closest('.list-row, .ajx-tipo, label, div');
    const txt = fila ? (fila.querySelector('b, span') || fila).textContent.replace(/\s+/g, ' ').trim() : '';
    if (txt) t.setAttribute('aria-label', txt.slice(0, 60));
    if (!t.getAttribute('role')) t.setAttribute('role', 'switch');
    if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '0');
  });
}
renderAjustes = (function(orig){
  return function(rol){ orig(rol); mjNombrarInterruptores(document.getElementById(rol === 'cliente' ? 'ajustesCliente' : 'ajustesCoach')); };
})(renderAjustes);
document.addEventListener('keydown', function(e){
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('toggle')) { e.preventDefault(); e.target.click(); }
});

/* =========================================================
   TARIFAS Y PAGOS
   - Tarifa mensual, trimestral o anual desde el alta del cliente.
   - Recordatorios al cliente antes de que venza y aviso diario (ventana) en el periodo de gracia.
   - Periodo de gracia de 7 días; después, sin acceso (automático o a mano, según elija el profesional).
   - El profesional registra los pagos y puede denegar o permitir el acceso.
   d.tarifa = { tipo, precio, hasta, pagos: [{ fecha, importe, hasta }], acceso: 'auto' | 'denegado' | 'permitido' }
   ========================================================= */
const MJ_TARIFAS = { mensual: { n: 'Mensual', meses: 1 }, trimestral: { n: 'Trimestral', meses: 3 }, anual: { n: 'Anual', meses: 12 } };
const MJ_GRACIA = 7;
const MJ_CFG_KEY = 'fsd_pagos_cfg';
TIPOS_CLIENTE.push({ id: 'pago', ico: '💳', nombre: 'Tu suscripción', desc: 'Cuando tu tarifa está a punto de vencer o ha vencido' });
TIPOS_PRO.push({ id: 'pagos', ico: '💳', nombre: 'Pagos de clientes', desc: 'Cuando una tarifa vence, entra en periodo de gracia o se queda sin acceso' });
function mjCfgPagos(){
  let c = null; try { c = JSON.parse(localStorage.getItem(MJ_CFG_KEY) || 'null'); } catch(e){}
  return Object.assign({ auto: true, enlace: '' }, c || {});
}
function mjGuardarCfgPagos(c){ try { localStorage.setItem(MJ_CFG_KEY, JSON.stringify(c)); } catch(e){} }
function mjPonerTarifa(d, tipo, precio, pagado, inicio){
  if (!MJ_TARIFAS[tipo]) { d.tarifa = { tipo: 'ninguna', pagos: [], acceso: 'auto' }; return; }
  const hasta = pagado ? mjSumarMeses(inicio, MJ_TARIFAS[tipo].meses) : inicio;
  d.tarifa = { tipo: tipo, precio: precio, hasta: hasta, pagos: pagado ? [{ fecha: inicio, importe: precio, hasta: hasta }] : [], acceso: 'auto' };
}
/* estado de la tarifa de un cliente */
function estadoPago(d){
  const t = d && d.tarifa;
  if (!t || !MJ_TARIFAS[t.tipo] || !t.hasta) return { cod: 'sin', txt: 'Sin tarifa', acceso: true };
  const hoy = mjISO(new Date());
  const dias = mjDias(hoy, t.hasta);                 // días hasta el vencimiento (negativo: ya vencida)
  const finGracia = mjSumarDias(t.hasta, MJ_GRACIA);
  const r = { dias: dias, hasta: t.hasta, finGracia: finGracia, tipo: t.tipo };
  if (dias > 7) { r.cod = 'ok'; r.txt = 'Al día · hasta el ' + mjFecha(t.hasta); }
  else if (dias >= 0) { r.cod = 'vence'; r.txt = dias === 0 ? 'Vence hoy' : 'Vence en ' + dias + (dias === 1 ? ' día' : ' días'); }
  else if (dias >= -MJ_GRACIA) { r.cod = 'gracia'; r.quedan = MJ_GRACIA + dias; r.txt = 'Periodo de gracia · ' + (r.quedan === 0 ? 'último día' : 'quedan ' + r.quedan + (r.quedan === 1 ? ' día' : ' días')); }
  else { r.cod = 'vencido'; r.txt = 'Vencida desde el ' + mjFecha(t.hasta); }
  const auto = mjCfgPagos().auto;
  r.acceso = t.acceso === 'denegado' ? false : (t.acceso === 'permitido' ? true : !(r.cod === 'vencido' && auto));
  if (!r.acceso) r.txt = 'Sin acceso · ' + (t.acceso === 'denegado' ? 'denegado por el equipo' : 'gracia terminada');
  return r;
}
function registrarPago(k, importe){
  const d = clientesData[k], t = d && d.tarifa;
  if (!t || !MJ_TARIFAS[t.tipo]) return;
  const hoy = mjISO(new Date());
  const e = estadoPago(d);
  // si paga a tiempo o en la gracia se mantiene su ciclo; si llevaba tiempo sin pagar, empieza hoy
  const base = (e.cod === 'vencido') ? hoy : (t.hasta || hoy);
  t.hasta = mjSumarMeses(base, MJ_TARIFAS[t.tipo].meses);
  t.pagos = t.pagos || [];
  t.pagos.push({ fecha: hoy, importe: importe, hasta: t.hasta, por: coachActivo ? coachActivo.u : '' });
  t.acceso = 'auto';
  guardarTodo();
  crearAviso(claveCliente(k), 'pago', 'Pago recibido ✓', 'Tu suscripción ' + MJ_TARIFAS[t.tipo].n.toLowerCase() + ' está activa hasta el ' + mjFecha(t.hasta) + '. ¡Gracias!', { vista: 'hoy' });
}

/* ---------- ficha del cliente: sección «Suscripción» ---------- */
function pintarSuscripcionFicha(){
  const k = clienteActual, d = clientesData[k], v = document.getElementById('view-coach-cliente');
  if (!d || !v) return;
  let box = document.getElementById('fichaPago');
  if (!box) {
    box = document.createElement('div'); box.id = 'fichaPago';
    const gest = Array.prototype.filter.call(v.querySelectorAll('.alta-label'), function(x){ return /Gestión/.test(x.textContent); })[0];
    gest.parentNode.insertBefore(box, gest);
  }
  const t = d.tarifa, e = estadoPago(d);
  let h = '<div class="alta-label">Suscripción</div><div class="list-group">';
  if (!t || !MJ_TARIFAS[t.tipo]) {
    h += '<div class="list-row" onclick="abrirTarifa()"><span>Tarifa</span><span class="ajx-acts"><span class="pill">Sin tarifa</span><span class="chev">›</span></span></div></div>';
    box.innerHTML = h; return;
  }
  const cls = { ok: 'ok', vence: 'pg-amb', gracia: 'pg-nar', vencido: 'pg-roj' }[e.cod] || '';
  h += '<div class="list-row" onclick="abrirTarifa()"><span>Tarifa</span><span class="ajx-acts"><span class="ajx-val">' + MJ_TARIFAS[t.tipo].n + (t.precio != null ? ' · ' + mjEuros(t.precio) : '') + '</span><span class="chev">›</span></span></div>'
    + '<div class="list-row" style="cursor:default"><span>Pagado hasta</span><span class="ajx-val">' + mjFecha(t.hasta) + '</span></div>'
    + '<div class="list-row" style="cursor:default"><span>Estado</span><span class="pill ' + (e.acceso ? cls : 'pg-roj') + '">' + esc(e.txt) + '</span></div>'
    + (e.cod === 'gracia' ? '<div class="pg-nota">Si no paga, perderá el acceso el ' + mjFecha(e.finGracia) + '.</div>' : '')
    + '<div class="list-row pg-acciones" style="cursor:default"><button class="btn-primary pg-btn" onclick="pedirPago()">Registrar pago</button>'
    + (e.acceso ? '<button class="btn-eq pg-btn" onclick="cambiarAcceso(\'denegado\')">Denegar acceso</button>' : '<button class="btn-eq pg-btn" onclick="cambiarAcceso(\'permitido\')">Permitir acceso</button>') + '</div>'
    + (t.acceso !== 'auto' ? '<div class="pg-nota">' + (t.acceso === 'denegado' ? 'Acceso denegado a mano.' : 'Acceso permitido a mano aunque no esté al día.') + ' <a href="#" class="lnk" onclick="cambiarAcceso(\'auto\');return false;">Volver al modo automático</a></div>' : '')
    + '<div class="list-row" onclick="verPagos()"><span>Historial de pagos</span><span class="ajx-acts"><span class="ajx-val">' + (t.pagos || []).length + '</span><span class="chev">›</span></span></div>'
    + '</div>';
  box.innerHTML = h;
}
function pedirPago(){
  const d = clientesData[clienteActual], t = d && d.tarifa;
  if (!t) return;
  const e = estadoPago(d);
  const base = e.cod === 'vencido' ? mjISO(new Date()) : t.hasta;
  const nuevo = mjSumarMeses(base, MJ_TARIFAS[t.tipo].meses);
  const o = mjHoja('mjPago');
  o.innerHTML = '<div class="fsd-sheet dlg"><h3>Registrar pago de ' + esc(d.nombre) + '</h3>'
    + '<p>Tarifa ' + MJ_TARIFAS[t.tipo].n.toLowerCase() + '. Quedará pagado hasta el <b>' + mjFecha(nuevo) + '</b>.</p>'
    + '<div class="field"><label for="mjPgImp">Importe (€)</label><input type="text" inputmode="decimal" id="mjPgImp" value="' + (t.precio != null ? String(t.precio).replace('.', ',') : '') + '" placeholder="Opcional"></div>'
    + '<div class="btn-row"><button class="btn-eq" onclick="mjCerrarHoja(\'mjPago\')">Cancelar</button><button class="btn-eq btn-eq-p" onclick="confirmarPago()">Registrar</button></div></div>';
  o.classList.add('show');
}
function confirmarPago(){
  const imp = mjNum(document.getElementById('mjPgImp').value);
  registrarPago(clienteActual, imp);
  mjCerrarHoja('mjPago');
  pintarSuscripcionFicha();
  actualizarPanel();
  toast('Pago registrado');
}
function cambiarAcceso(modo){
  const d = clientesData[clienteActual];
  if (!d || !d.tarifa) return;
  const hacer = function(){
    d.tarifa.acceso = modo;
    guardarTodo();
    if (modo === 'denegado') crearAviso(claveCliente(clienteActual), 'pago', 'Acceso pausado', 'Tu suscripción no está al día. Habla con tu equipo para reactivarla.', { vista: 'hoy' });
    pintarSuscripcionFicha(); actualizarPanel();
    toast(modo === 'denegado' ? 'Acceso denegado' : (modo === 'permitido' ? 'Acceso permitido' : 'Modo automático'));
  };
  if (modo === 'denegado') abrirDialogo({ titulo: 'Denegar acceso a ' + d.nombre, texto: 'No podrá entrar en la app hasta que registres un pago o le vuelvas a permitir el acceso. Sus datos no se borran.', ok: 'Denegar', peligro: true, onOk: hacer });
  else hacer();
}
function verPagos(){
  const d = clientesData[clienteActual], t = d && d.tarifa;
  const lista = (t && t.pagos || []).slice().reverse();
  abrirDialogo({ titulo: 'Pagos de ' + d.nombre, ok: 'Cerrar', soloOk: true,
    texto: lista.length ? lista.map(function(p){ return mjFecha(p.fecha) + (p.importe != null ? ' · ' + mjEuros(p.importe) : '') + ' → hasta el ' + mjFecha(p.hasta) + (p.por ? ' (' + p.por + ')' : ''); }).join('\n') : 'Todavía no hay pagos registrados.' });
}
function abrirTarifa(){
  const d = clientesData[clienteActual];
  if (!d) return;
  const t = d.tarifa || { tipo: 'ninguna' };
  const o = mjHoja('mjTarifa');
  o.innerHTML = '<div class="fsd-sheet"><div class="sheet-head"><h3>Tarifa de ' + esc(d.nombre) + '</h3><button class="x-btn" onclick="mjCerrarHoja(\'mjTarifa\')" aria-label="Cerrar">×</button></div>'
    + '<div class="chips" data-grupo="tar">' + ['mensual', 'trimestral', 'anual', 'ninguna'].map(function(x){
        return '<button type="button" class="chip protein' + (t.tipo === x ? ' selected' : '') + '" data-v="' + x + '" onclick="mjChip(this)">' + (MJ_TARIFAS[x] ? MJ_TARIFAS[x].n : 'Sin tarifa') + '</button>'; }).join('') + '</div>'
    + '<div class="field"><label for="mjTfPre">Precio (€)</label><input type="text" inputmode="decimal" id="mjTfPre" value="' + (t.precio != null ? String(t.precio).replace('.', ',') : '') + '" placeholder="Opcional"></div>'
    + '<div class="field"><label for="mjTfHasta">Pagado hasta</label><input type="date" id="mjTfHasta" value="' + (t.hasta || mjISO(new Date())) + '"></div>'
    + '<p class="ajx-note">Cambiar la tarifa no registra ningún pago. Para eso usa «Registrar pago».</p>'
    + '<button class="btn-primary" onclick="guardarTarifa()">Guardar</button></div>';
  o.classList.add('show');
}
function guardarTarifa(){
  const d = clientesData[clienteActual], o = document.getElementById('mjTarifa');
  const c = o.querySelector('[data-grupo="tar"] .chip.selected');
  const tipo = c ? c.dataset.v : 'ninguna';
  const t = d.tarifa || { pagos: [], acceso: 'auto' };
  t.tipo = tipo;
  t.precio = mjNum(document.getElementById('mjTfPre').value);
  t.hasta = document.getElementById('mjTfHasta').value || mjISO(new Date());
  t.pagos = t.pagos || []; t.acceso = t.acceso || 'auto';
  d.tarifa = t;
  guardarTodo();
  mjCerrarHoja('mjTarifa');
  pintarSuscripcionFicha(); actualizarPanel();
  toast('Tarifa guardada');
}
(function(){
  const sh = showScreen;
  showScreen = function(id){ sh(id); if (id === 'view-coach-cliente') pintarSuscripcionFicha(); };
})();
goToCliente = (function(orig){ return function(k){ orig(k); pintarSuscripcionFicha(); }; })(goToCliente);

/* ---------- tarjeta del panel: estado del pago cuando requiere atención ---------- */
pintarListaClientes = (function(orig){
  return function(){
    orig();
    const claves = Object.keys(clientesData);
    Array.prototype.forEach.call(document.querySelectorAll('#listaClientes .cliente-card'), function(card, i){
      const k = claves[i]; if (!k) return;
      const viejo = card.querySelector('.kc-pago'); if (viejo) viejo.remove();
      const e = estadoPago(clientesData[k]);
      if (e.cod === 'sin' || (e.cod === 'ok' && e.acceso)) return;
      const div = document.createElement('div');
      div.className = 'kc-pago ' + (!e.acceso ? 'roj' : (e.cod === 'gracia' ? 'nar' : (e.cod === 'vencido' ? 'roj' : 'amb')));
      div.textContent = (e.acceso ? '💳 ' : '🔒 ') + e.txt;
      const pie = card.querySelector('.kc-pie');
      if (pie) pie.parentNode.insertBefore(div, pie); else card.appendChild(div);
    });
  };
})(pintarListaClientes);

/* ---------- avisos automáticos (al abrir la app) ---------- */
function revisarPagos(){
  Object.keys(clientesData).forEach(function(k){
    const d = clientesData[k], e = estadoPago(d);
    if (e.cod === 'sin' || e.cod === 'ok') return;
    const n = d.nombre, tipo = MJ_TARIFAS[e.tipo].n.toLowerCase();
    // al cliente: 7, 3 y 1 días antes, el día del vencimiento, al entrar en la gracia y el último día
    let clave = null, tit = '', txt = '';
    if (e.cod === 'vence' && [7, 3, 1, 0].indexOf(e.dias) > -1) {
      clave = 'pago-vence-' + e.hasta + '-' + e.dias;
      tit = e.dias === 0 ? 'Tu suscripción vence hoy' : 'Tu suscripción vence en ' + e.dias + (e.dias === 1 ? ' día' : ' días');
      txt = 'Renueva tu tarifa ' + tipo + ' antes del ' + mjFecha(e.hasta) + ' para seguir con tu plan sin cortes.';
    } else if (e.cod === 'gracia' && (e.quedan === MJ_GRACIA - 1 || e.quedan === 0)) {
      clave = 'pago-gracia-' + e.hasta + '-' + e.quedan;
      tit = e.quedan === 0 ? 'Último día para renovar' : 'Tu suscripción ha vencido';
      txt = 'Tienes hasta el ' + mjFecha(e.finGracia) + ' para pagar. Si no, perderás el acceso a la app.';
    }
    if (clave && tocaAvisar(clave + '|' + k)) crearAviso(claveCliente(k), 'pago', tit, txt, { vista: 'hoy' });
    // a los profesionales: al vencer, al entrar en gracia y al quedarse sin acceso
    let pc = null, pt = '';
    if (e.cod === 'vence' && e.dias === 0) { pc = 'pro-vence-' + e.hasta; pt = 'A ' + n + ' le vence hoy la tarifa ' + tipo; }
    else if (e.cod === 'gracia') { pc = 'pro-gracia-' + e.hasta; pt = n + ' está en periodo de gracia (hasta el ' + mjFecha(e.finGracia) + ')'; }
    else if (!e.acceso) { pc = 'pro-sinacceso-' + e.hasta + '-' + d.tarifa.acceso; pt = n + ' se ha quedado sin acceso a la app'; }
    if (pc && tocaAvisar(pc + '|' + k)) avisarPros('pagos', pt, 'Tarifa ' + tipo + ' · pagado hasta el ' + mjFecha(e.hasta), { cliente: k, vista: 'ficha' });
  });
}
function tocaAvisarUnaVez(clave){            // para avisos que solo deben salir una vez (no cada día)
  const a = leerAvisos(); a.unaVez = a.unaVez || {};
  if (a.unaVez[clave]) return false;
  a.unaVez[clave] = Date.now(); guardarAvisos(); return true;
}
tocaAvisar = (function(orig){
  return function(clave){ return /^pago-|^pro-/.test(clave) ? tocaAvisarUnaVez(clave) : orig(clave); };
})(tocaAvisar);

/* ---------- cliente: aviso en «Hoy», ventana diaria en la gracia y bloqueo ---------- */
function mjBannerPago(){
  const hoy = document.getElementById('view-hoy');
  if (!hoy) return;
  let c = document.getElementById('hoyPago');
  const d = clienteActual && !isCoachView() && clientesData[clienteActual];
  const e = d ? estadoPago(d) : { cod: 'sin' };
  if (!d || ['vence', 'gracia', 'vencido'].indexOf(e.cod) < 0 || !e.acceso) { if (c) c.remove(); return; }
  const enlace = mjCfgPagos().enlace;
  if (!c) {
    c = document.createElement('div'); c.id = 'hoyPago';
    const ref = document.getElementById('weekRow');
    ref.parentNode.insertBefore(c, ref.nextSibling);
  }
  c.className = 'hoy-aviso pago ' + (e.cod === 'vence' ? 'amb' : 'roj');
  const tit = e.cod === 'vence' ? (e.dias === 0 ? 'Tu suscripción vence hoy' : 'Tu suscripción vence en ' + e.dias + (e.dias === 1 ? ' día' : ' días'))
    : 'Tu suscripción venció el ' + mjFecha(e.hasta);
  const txt = e.cod === 'vence' ? 'Renuévala antes del ' + mjFecha(e.hasta) + ' para no perder el acceso.'
    : 'Paga antes del ' + mjFecha(e.finGracia) + ' (periodo de gracia de 7 días) o perderás el acceso a la app.';
  c.innerHTML = '<span class="ha-ico" aria-hidden="true">💳</span><span class="ha-txt"><b>' + tit + '</b><span>' + txt + '</span></span>'
    + (enlace ? '<a class="mini-btn" href="' + esc(enlace) + '" target="_blank" rel="noopener">Pagar</a>' : '');
}
function mjVentanaGracia(){
  const d = clienteActual && !isCoachView() && window.fsdSesionCliente && clientesData[clienteActual];
  if (!d) return;
  const e = estadoPago(d);
  if (e.cod !== 'gracia' || !e.acceso) return;
  const clave = 'fsd_gracia_vista_' + clienteActual;
  let ult = null; try { ult = localStorage.getItem(clave); } catch(e2){}
  const hoy = mjISO(new Date());
  if (ult === hoy) return;                                      // una vez al día
  try { localStorage.setItem(clave, hoy); } catch(e2){}
  const enlace = mjCfgPagos().enlace;
  abrirDialogo({
    titulo: 'Tu suscripción ha vencido',
    texto: 'Tu tarifa ' + MJ_TARIFAS[e.tipo].n.toLowerCase() + ' venció el ' + mjFecha(e.hasta) + '. Estás en el periodo de gracia: '
      + (e.quedan === 0 ? 'hoy es el último día.' : 'te ' + (e.quedan === 1 ? 'queda 1 día.' : 'quedan ' + e.quedan + ' días.'))
      + '\n\nSi no pagas antes del ' + mjFecha(e.finGracia) + ', perderás el acceso a la app. Tus datos no se borran.',
    ok: enlace ? 'Pagar ahora' : 'Entendido', cancel: 'Más tarde', soloOk: !enlace,
    onOk: function(){ if (enlace) window.open(enlace, '_blank', 'noopener'); }
  });
}
function mjBloqueoCliente(){
  const d = clienteActual && !isCoachView() && window.fsdSesionCliente && clientesData[clienteActual];
  const o = mjHoja('mjBloqueo');
  if (!d || estadoPago(d).acceso) { o.classList.remove('show'); return false; }
  const e = estadoPago(d), enlace = mjCfgPagos().enlace;
  o.innerHTML = '<div class="fsd-sheet dlg mj-bloq"><div class="mj-bloq-ico" aria-hidden="true">🔒</div><h3>Acceso pausado</h3>'
    + '<p>' + (d.tarifa.acceso === 'denegado' ? 'Tu equipo ha pausado tu acceso.' : 'Tu suscripción venció el ' + mjFecha(e.hasta) + ' y el periodo de gracia terminó el ' + mjFecha(e.finGracia) + '.')
    + ' Renueva tu tarifa o habla con Domingo o Fátima para reactivarla. Tus datos no se han borrado.</p>'
    + '<div class="btn-row">' + (enlace ? '<a class="btn-eq btn-eq-p" href="' + esc(enlace) + '" target="_blank" rel="noopener">Pagar ahora</a>' : '')
    + '<button class="btn-eq" onclick="mjSalirBloqueo()">Cerrar sesión</button></div></div>';
  o.classList.add('show');
  ['consentSalud', 'consentImagen', 'dlgOverlay'].forEach(function(id){ const c = document.getElementById(id); if (c) c.classList.remove('show'); });
  return true;
}
function mjSalirBloqueo(){ mjCerrarHoja('mjBloqueo'); cerrarSesionCliente(); }
function mjRevisarCliente(){
  if (!clienteActual || isCoachView() || !window.fsdSesionCliente) return;
  revisarPagos();
  if (mjBloqueoCliente()) return;
  mjBannerPago();
  // la ventana de la gracia sale después de los consentimientos
  const esperar = function(n){
    if (['consentSalud', 'consentImagen', 'dlgOverlay'].some(capaVisible) && n < 40) { setTimeout(function(){ esperar(n + 1); }, 500); return; }
    mjVentanaGracia();
  };
  esperar(0);
}
enterApp = (function(orig){ return function(){ orig(); mjRevisarCliente(); }; })(enterApp);
goTo = (function(orig){ return function(n, s){ if (window.fsdSesionCliente && !isCoachView() && mjBloqueoCliente()) return; orig(n, s); if (n === 'hoy') mjBannerPago(); }; })(goTo);
atrasDentroApp = (function(orig){ return function(){ if (capaVisible('mjBloqueo')) return true; return orig(); }; })(atrasDentroApp);
document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'visible') mjRevisarCliente(); });
entrarAlPanel = (function(orig){ return function(){ orig(); revisarPagos(); actualizarPanel(); }; })(entrarAlPanel);

/* ---------- ajustes del profesional: cómo se cobra ---------- */
htmlAjustes = (function(orig){
  return function(rol){
    let h = orig(rol);
    if (rol === 'cliente') {
      const d = clienteActual && clientesData[clienteActual], e = d ? estadoPago(d) : null;
      if (!e || e.cod === 'sin') return h;
      const t = d.tarifa;
      const bloque = '<div class="section-lbl">Suscripción</div><div class="list-group">'
        + fila('Tarifa', val(MJ_TARIFAS[t.tipo].n + (t.precio != null ? ' · ' + mjEuros(t.precio) : '')))
        + fila('Pagada hasta', val(mjFecha(t.hasta)))
        + fila('Estado', pill(e.txt, e.cod === 'ok')) + '</div>';
      const m = '<div class="section-lbl">Apariencia</div>';
      return h.indexOf(m) > -1 ? h.replace(m, bloque + m) : h + bloque;
    }
    const c = mjCfgPagos();
    const bloque = '<div class="section-lbl">Pagos de clientes</div><div class="list-group">'
      + '<div class="list-row"><span>Quitar el acceso al acabar la gracia (7 días)</span><div class="toggle' + (c.auto ? ' on' : '') + '" onclick="mjToggleAuto(this)" role="switch" aria-checked="' + c.auto + '" aria-label="Quitar el acceso al acabar la gracia"><div class="toggle-knob"></div></div></div>'
      + '<div class="list-row" onclick="mjEditarEnlace()"><span>Enlace de pago</span><span class="ajx-acts"><span class="ajx-val">' + (c.enlace ? esc(c.enlace.replace(/^https?:\/\//, '').slice(0, 26)) : 'Sin enlace') + '</span><span class="chev">›</span></span></div>'
      + '</div><p class="ajx-note">Los clientes reciben avisos 7, 3 y 1 días antes de que venza su tarifa y el día del vencimiento. Durante la gracia les sale una ventana una vez al día. '
      + (c.auto ? 'Al acabar la gracia se quedan sin acceso hasta que registres el pago.' : 'Al acabar la gracia decides tú si les quitas el acceso.') + ' Con un enlace de pago (Stripe, PayPal…) les aparece el botón «Pagar».</p>';
    const m = '<div class="section-lbl">Apariencia</div>';
    return h.indexOf(m) > -1 ? h.replace(m, bloque + m) : h + bloque;
  };
})(htmlAjustes);
function mjToggleAuto(el){
  const c = mjCfgPagos(); c.auto = !c.auto; mjGuardarCfgPagos(c);
  el.classList.toggle('on', c.auto); el.setAttribute('aria-checked', c.auto);
  renderAjustes('coach'); actualizarPanel();
  toast(c.auto ? 'Se quitará el acceso al acabar la gracia' : 'Tú decides cuándo quitar el acceso');
}
function mjEditarEnlace(){
  const c = mjCfgPagos();
  const o = mjHoja('mjEnlace');
  o.innerHTML = '<div class="fsd-sheet dlg"><h3>Enlace de pago</h3><p>Pega el enlace donde tus clientes pagan (por ejemplo, un enlace de pago de Stripe). Les aparecerá el botón «Pagar».</p>'
    + '<div class="field"><label for="mjEnl">Enlace</label><input type="url" id="mjEnl" value="' + esc(c.enlace || '') + '" placeholder="https://…"></div>'
    + '<div class="btn-row"><button class="btn-eq" onclick="mjCerrarHoja(\'mjEnlace\')">Cancelar</button><button class="btn-eq btn-eq-p" onclick="mjGuardarEnlace()">Guardar</button></div></div>';
  o.classList.add('show');
}
function mjGuardarEnlace(){
  let v = document.getElementById('mjEnl').value.trim();
  if (v && !/^https:\/\//i.test(v)) { toast('El enlace debe empezar por https://'); return; }
  const c = mjCfgPagos(); c.enlace = v; mjGuardarCfgPagos(c);
  mjCerrarHoja('mjEnlace'); renderAjustes('coach'); toast(v ? 'Enlace guardado' : 'Enlace quitado');
}

/* ---------- capas nuevas: el atrás del móvil las cierra ---------- */
atrasDentroApp = (function(orig){
  return function(){
    const capas = ['mjEditCli', 'mjCopiar', 'mjPago', 'mjTarifa', 'mjEnlace'];
    for (let i = 0; i < capas.length; i++) if (capaVisible(capas[i])) { mjCerrarHoja(capas[i]); return true; }
    return orig();
  };
})(atrasDentroApp);

/* =========================================================
   Arranque: la sesión del cliente se restauró antes de cargar este archivo
   ========================================================= */
(function(){
  mjRefrescarSemanas();
  if (window.fsdSesionCliente && clienteActual && clientesData[clienteActual]) {
    cargarPlan(clienteActual);
    pintarCliente();
    mjAvisoAlergiasHoy();
    mjRevisarCliente();
  }
  actualizarPanel();
})();

/* =========================================================
   Pestaña «Pagos clientes»: tarifas, pagos, altas y bajas de cada cliente
   Baja de un cliente: d.baja = { fecha, motivo } (no se borra nada y pierde el acceso)
   ========================================================= */
topScreens.push('view-coach-pagos');
PANTALLAS_CON_TABS.push('view-coach-pagos');
(function(){
  const nav = document.getElementById('coachTabs');
  const aj = document.getElementById('ctab-ajustes');
  const b = document.createElement('button');
  b.className = 'tbi'; b.id = 'ctab-pagos';
  b.setAttribute('onclick', "abrirTabPro('pagos')");
  b.setAttribute('aria-label', 'Pagos clientes');
  b.innerHTML = '<span class="tbi-emo" aria-hidden="true">💳</span>PAGOS<span class="tab-badge rojo" id="ctabPagosN" hidden>0</span>';
  nav.insertBefore(b, aj);
  const top = document.querySelector('#view-coach-pagos .alta-top');
  if (top) {
    const bell = document.createElement('button');
    bell.className = 'bell mj-bell'; bell.setAttribute('aria-label', 'Notificaciones'); bell.style.order = '3';
    bell.onclick = function(){ abrirNotisCoach(); };
    bell.innerHTML = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg><span class="bell-badge hide mj-bell-badge">0</span>';
    top.appendChild(bell);
  }
})();
let mjFiltroPagos = 'todos';
function mjEsBaja(d){ return !!(d && d.baja && d.baja.fecha); }
/* la baja también quita el acceso */
estadoPago = (function(orig){
  return function(d){
    if (mjEsBaja(d)) return { cod: 'baja', txt: 'De baja desde el ' + mjFecha(d.baja.fecha), acceso: false, baja: true };
    return orig(d);
  };
})(estadoPago);
function mjPrecioMensual(t){
  if (!t || !MJ_TARIFAS[t.tipo] || t.precio == null) return 0;
  return t.precio / MJ_TARIFAS[t.tipo].meses;
}
function pintarPagosPro(){
  const cont = document.getElementById('pagosPro');
  if (!cont) return;
  setTxt('pagosWho', coachActivo ? coachActivo.u + ' · ' + coachActivo.rol : 'Fitness sin dramas');
  const hoy = mjISO(new Date()), mes = hoy.slice(0, 7);
  const claves = Object.keys(clientesData);
  const datos = claves.map(function(k){ const d = clientesData[k]; return { k: k, d: d, e: estadoPago(d), t: d.tarifa }; });
  const activos = datos.filter(function(x){ return !mjEsBaja(x.d); });
  const bajas = datos.filter(function(x){ return mjEsBaja(x.d); });
  const pendientes = activos.filter(function(x){ return ['vence', 'gracia', 'vencido'].indexOf(x.e.cod) > -1 || !x.e.acceso; });
  let cobradoMes = 0, nPagosMes = 0;
  const movs = [];
  datos.forEach(function(x){
    (x.t && x.t.pagos || []).forEach(function(p){
      if (p.fecha && p.fecha.slice(0, 7) === mes && p.importe != null) { cobradoMes += p.importe; nPagosMes++; }
      movs.push({ f: p.fecha, tipo: 'pago', txt: x.d.nombre + ' · pago' + (p.importe != null ? ' de ' + mjEuros(p.importe) : '') + ' → hasta el ' + mjFecha(p.hasta), k: x.k });
    });
    if (x.d.fechaAlta) movs.push({ f: x.d.fechaAlta.slice(0, 10), tipo: 'alta', txt: x.d.nombre + ' · alta' + (x.t && MJ_TARIFAS[x.t.tipo] ? ' (tarifa ' + MJ_TARIFAS[x.t.tipo].n.toLowerCase() + ')' : ''), k: x.k });
    if (mjEsBaja(x.d)) movs.push({ f: x.d.baja.fecha.slice(0, 10), tipo: 'baja', txt: x.d.nombre + ' · baja' + (x.d.baja.motivo ? ' (' + x.d.baja.motivo + ')' : ''), k: x.k });
  });
  const mensual = activos.reduce(function(s, x){ return s + mjPrecioMensual(x.t); }, 0);
  const altasMes = datos.filter(function(x){ return x.d.fechaAlta && x.d.fechaAlta.slice(0, 7) === mes; }).length;
  const bajasMes = bajas.filter(function(x){ return x.d.baja.fecha.slice(0, 7) === mes; }).length;
  let h = '<div class="panel-stats pagos-stats">'
    + '<div class="panel-stat"><div class="val">' + activos.length + '</div><div class="lbl">Activos</div></div>'
    + '<div class="panel-stat"><div class="val' + (pendientes.length ? ' warn' : '') + '">' + pendientes.length + '</div><div class="lbl">Pagos pendientes</div></div>'
    + '<div class="panel-stat"><div class="val">' + mjEuros(cobradoMes || 0) + '</div><div class="lbl">Cobrado este mes</div></div></div>'
    + '<div class="pagos-resumen"><span>Ingreso mensual estimado: <b>' + mjEuros(mensual) + '</b></span><span>Este mes: <b>' + altasMes + '</b> ' + (altasMes === 1 ? 'alta' : 'altas') + ' · <b>' + bajasMes + '</b> ' + (bajasMes === 1 ? 'baja' : 'bajas') + '</span></div>';
  const filtros = [['todos', 'Todos'], ['pendientes', 'Pendientes'], ['aldia', 'Al día'], ['sin', 'Sin tarifa'], ['bajas', 'Bajas']];
  h += '<div class="chips pagos-filtros" role="tablist">' + filtros.map(function(f){
    return '<button type="button" role="tab" aria-selected="' + (mjFiltroPagos === f[0]) + '" class="chip protein' + (mjFiltroPagos === f[0] ? ' selected' : '') + '" onclick="mjFiltrarPagos(\'' + f[0] + '\')">' + f[1] + '</button>';
  }).join('') + '</div>';
  const orden = { vencido: 0, gracia: 1, vence: 2, ok: 3, sin: 4, baja: 5 };
  let lista = datos.filter(function(x){
    if (mjFiltroPagos === 'bajas') return mjEsBaja(x.d);
    if (mjEsBaja(x.d)) return mjFiltroPagos === 'todos';
    if (mjFiltroPagos === 'pendientes') return pendientes.indexOf(x) > -1;
    if (mjFiltroPagos === 'aldia') return x.e.cod === 'ok' && x.e.acceso;
    if (mjFiltroPagos === 'sin') return x.e.cod === 'sin';
    return true;
  }).sort(function(a, b){
    const oa = a.e.acceso === false && !a.e.baja ? -1 : orden[a.e.cod], ob = b.e.acceso === false && !b.e.baja ? -1 : orden[b.e.cod];
    if (oa !== ob) return oa - ob;
    return (a.t && a.t.hasta || 'z').localeCompare(b.t && b.t.hasta || 'z');
  });
  if (!lista.length) h += '<div class="picker-empty">No hay clientes en este apartado.</div>';
  h += '<div class="pagos-lista">' + lista.map(function(x){
    const t = x.t, e = x.e;
    const cls = !e.acceso && !e.baja ? 'roj' : ({ vencido: 'roj', gracia: 'nar', vence: 'amb', ok: 'ok', sin: '', baja: 'gris' }[e.cod] || '');
    const tar = t && MJ_TARIFAS[t.tipo] ? MJ_TARIFAS[t.tipo].n + (t.precio != null ? ' · ' + mjEuros(t.precio) : '') : 'Sin tarifa';
    return '<div class="pago-fila ' + cls + '" onclick="mjAbrirFichaPago(\'' + x.k + '\')">'
      + '<div class="pago-top"><b>' + esc(x.d.nombre) + '</b><span class="pago-est ' + cls + '">' + esc(e.txt) + '</span></div>'
      + '<div class="pago-datos"><span>💳 ' + esc(tar) + '</span><span>Alta: ' + (x.d.fechaAlta ? fechaCorta(x.d.fechaAlta) : '—') + '</span>'
      + (t && t.hasta && !e.baja ? '<span>Pagado hasta: ' + mjFecha(t.hasta) + '</span>' : '')
      + '<span>' + (t && t.pagos ? t.pagos.length : 0) + ' pagos</span></div></div>';
  }).join('') + '</div>';
  movs.sort(function(a, b){ return a.f < b.f ? 1 : -1; });
  h += '<div class="alta-label">Últimos movimientos</div>';
  h += movs.length ? '<div class="pagos-movs">' + movs.slice(0, 25).map(function(m){
    return '<div class="pago-mov ' + m.tipo + '"><span class="pm-f">' + mjFecha(m.f) + '</span><span class="pm-i" aria-hidden="true">' + (m.tipo === 'pago' ? '💶' : (m.tipo === 'alta' ? '🆕' : '👋')) + '</span><span class="pm-t">' + esc(m.txt) + '</span></div>';
  }).join('') + '</div>' : '<div class="picker-empty">Todavía no hay movimientos.</div>';
  h += '<p class="ajx-note">Los pagos se registran a mano desde la ficha de cada cliente. El cobro automático con Stripe llegará con el servidor.</p>';
  cont.innerHTML = h;
}
function mjFiltrarPagos(f){ mjFiltroPagos = f; pintarPagosPro(); }
function mjAbrirFichaPago(k){
  goToCliente(k);
  setTimeout(function(){ const b = document.getElementById('fichaPago'); if (b) b.scrollIntoView({ block: 'start' }); }, 50);
}
function pintarBadgePagos(){
  const b = document.getElementById('ctabPagosN');
  if (!b) return;
  const n = coachActivo ? Object.keys(clientesData).filter(function(k){
    const d = clientesData[k], e = estadoPago(d);
    return !mjEsBaja(d) && (['gracia', 'vencido'].indexOf(e.cod) > -1 || !e.acceso);
  }).length : 0;
  b.hidden = !n; b.textContent = n;
}
abrirTabPro = (function(orig){
  return function(t){
    if (t !== 'pagos') { orig(t); pintarBadgePagos(); const p = document.getElementById('ctab-pagos'); if (p) p.classList.remove('active'); return; }
    tabProActual = 'pagos';
    navDir = 'tab';
    try { pintarPagosPro(); showScreen('view-coach-pagos'); } finally { navDir = null; }
    pintarTabsPro();
    const bd = document.querySelector('#view-coach-pagos .alta-body'); if (bd) bd.scrollTop = 0;
  };
})(abrirTabPro);
pintarTabsPro = (function(orig){
  return function(){
    orig();
    const b = document.getElementById('ctab-pagos');
    if (b) b.classList.toggle('active', tabProActual === 'pagos');
    pintarBadgePagos();
  };
})(pintarTabsPro);
actualizarPanel = (function(orig){ return function(){ orig(); pintarBadgePagos(); }; })(actualizarPanel);

/* ---------- dar de baja / reactivar desde la ficha ---------- */
pintarSuscripcionFicha = (function(orig){
  return function(){
    orig();
    const k = clienteActual, d = clientesData[k], box = document.getElementById('fichaPago');
    if (!d || !box) return;
    const grupo = box.querySelector('.list-group');
    if (!grupo) return;
    const r = document.createElement('div');
    if (mjEsBaja(d)) {
      r.className = 'list-row'; r.style.cursor = 'default';
      r.innerHTML = '<span>De baja desde el ' + mjFecha(d.baja.fecha) + (d.baja.motivo ? ' · ' + esc(d.baja.motivo) : '') + '</span><button class="mini-btn" onclick="reactivarCliente()">Reactivar</button>';
      // en baja no tiene sentido registrar pagos ni tocar el acceso
      Array.prototype.forEach.call(grupo.querySelectorAll('.pg-acciones, .pg-nota'), function(x){ x.remove(); });
    } else {
      r.className = 'list-row'; r.onclick = darDeBaja;
      r.innerHTML = '<span>Dar de baja</span><span class="ajx-acts"><span class="ajx-val">Conserva sus datos</span><span class="chev">›</span></span>';
    }
    grupo.appendChild(r);
  };
})(pintarSuscripcionFicha);
function darDeBaja(){
  const d = clientesData[clienteActual];
  const o = mjHoja('mjBaja');
  o.innerHTML = '<div class="fsd-sheet dlg"><h3>Dar de baja a ' + esc(d.nombre) + '</h3>'
    + '<p>Dejará de tener acceso a la app y no recibirá recordatorios de pago. Sus datos, su plan y sus seguimientos se conservan y puedes reactivarlo cuando quieras.</p>'
    + '<div class="field"><label for="mjBjMot">Motivo (opcional)</label><input type="text" id="mjBjMot" placeholder="Objetivo conseguido, precio, falta de tiempo…"></div>'
    + '<div class="btn-row"><button class="btn-eq" onclick="mjCerrarHoja(\'mjBaja\')">Cancelar</button><button class="btn-eq danger" onclick="confirmarBaja()">Dar de baja</button></div></div>';
  o.classList.add('show');
}
function confirmarBaja(){
  const d = clientesData[clienteActual];
  d.baja = { fecha: new Date().toISOString(), motivo: document.getElementById('mjBjMot').value.trim().slice(0, 120), por: coachActivo ? coachActivo.u : '' };
  guardarTodo();
  mjCerrarHoja('mjBaja');
  avisarPros('altas', d.nombre + ' se ha dado de baja', d.baja.motivo || 'Sin motivo indicado', { cliente: clienteActual, vista: 'ficha' }, coachActivo ? coachActivo.u : null);
  pintarSuscripcionFicha(); actualizarPanel();
  toast(d.nombre + ' está de baja');
}
function reactivarCliente(){
  const d = clientesData[clienteActual];
  d.bajas = d.bajas || []; d.bajas.push(d.baja);
  delete d.baja;
  guardarTodo();
  pintarSuscripcionFicha(); actualizarPanel();
  toast(d.nombre + ' vuelve a estar activo. Revisa su tarifa y registra el pago si hace falta.');
}
/* bloqueo del cliente dado de baja: mensaje propio */
mjBloqueoCliente = (function(orig){
  return function(){
    const r = orig();
    const d = clienteActual && clientesData[clienteActual];
    if (r && d && mjEsBaja(d)) {
      const o = document.getElementById('mjBloqueo');
      const h3 = o.querySelector('h3'), p = o.querySelector('p');
      if (h3) h3.textContent = 'Tu asesoría está de baja';
      if (p) p.textContent = 'Tu equipo ha dado de baja tu asesoría. Si quieres volver, habla con Domingo o Fátima. Tus datos no se han borrado.';
    }
    return r;
  };
})(mjBloqueoCliente);
/* panel de clientes: los dados de baja no cuentan como activos ni avisan de pagos */
revisarPagos = (function(orig){
  return function(){
    const guard = {};
    Object.keys(clientesData).forEach(function(k){ if (mjEsBaja(clientesData[k])) { guard[k] = clientesData[k]; delete clientesData[k]; } });
    try { orig(); } finally { Object.keys(guard).forEach(function(k){ clientesData[k] = guard[k]; }); }
  };
})(revisarPagos);
pintarListaClientes = (function(orig){
  return function(){
    orig();
    const claves = Object.keys(clientesData);
    Array.prototype.forEach.call(document.querySelectorAll('#listaClientes .cliente-card'), function(card, i){
      const d = clientesData[claves[i]];
      card.classList.toggle('de-baja', mjEsBaja(d));
    });
  };
})(pintarListaClientes);
atrasDentroApp = (function(orig){ return function(){ if (capaVisible('mjBaja')) { mjCerrarHoja('mjBaja'); return true; } return orig(); }; })(atrasDentroApp);
pintarBadgePagos();
actualizarPanel = (function(orig){
  return function(){ orig(); setTxt('statClientes', Object.keys(clientesData).filter(function(k){ return !mjEsBaja(clientesData[k]); }).length); };
})(actualizarPanel);
actualizarPanel();

/* =========================================================
   C · Ficha del cliente: tonelaje real de la semana y próxima revisión
   ========================================================= */
function mjTonelajeCliente(k){
  const p = PLANES[k];
  if (!p || !p.ent) return null;
  const t = document.createElement('div'); t.innerHTML = p.ent;
  const hay = Array.prototype.some.call(t.querySelectorAll('.serie-in input'), function(x){ return (x.getAttribute('value') || '').trim() !== ''; });
  Array.prototype.forEach.call(t.querySelectorAll('.serie-in input'), function(x){ x.value = x.getAttribute('value') || ''; });
  return hay ? tonelajeDe(t) : 0;
}
function mjPintarFichaSemana(){
  const k = clienteActual, d = clientesData[k];
  if (!d) return;
  const ton = mjTonelajeCliente(k);
  const reg = d.registro && d.registro.ton || [];
  const ant = reg.length ? reg[reg.length - 1].kg : null;
  const tv = document.getElementById('cd-tonelaje'), td = document.getElementById('cd-tonelajeDelta');
  if (tv && td) {
    if (!ton) { tv.textContent = '—'; td.textContent = ant ? 'Aún sin pesos esta semana · la anterior: ' + fmtMil(ant) + ' kg' : 'Sin pesos registrados esta semana'; td.className = 'tonelaje-delta'; }
    else {
      tv.textContent = fmtMil(Math.round(ton)) + ' kg';
      if (ant) { const df = Math.round(ton - ant); td.textContent = (df > 0 ? '+' : (df < 0 ? '−' : '')) + fmtMil(Math.abs(df)) + ' kg vs la semana pasada'; td.className = 'tonelaje-delta' + (df > 0 ? ' up' : ''); }
      else { td.textContent = 'Primera semana con pesos'; td.className = 'tonelaje-delta'; }
    }
  }
  // próxima revisión: el seguimiento se envía cada lunes
  const hoy = new Date(), lunes = mjLunes(hoy), esLunes = ((hoy.getDay() + 6) % 7) === 0;
  const ult = (SEGUIMIENTOS[k] || [])[0];
  const estaSemana = ult && new Date(ult.fecha) >= lunes;
  let txt;
  if (mjEsBaja(d)) txt = 'De baja';
  else if (esLunes && !estaSemana) txt = 'Hoy, lunes ' + mjFecha(mjISO(hoy)).slice(0, 5);
  else {
    const prox = new Date(lunes.getTime() + 7 * DIA_MS);
    txt = 'Lunes ' + mjFecha(mjISO(prox)).slice(0, 5) + (estaSemana ? ' · esta semana ya enviado' : '');
  }
  setTxt('cd-revision', txt);
}
goToCliente = (function(orig){ return function(k){ orig(k); mjPintarFichaSemana(); }; })(goToCliente);
(function(){
  const sh = showScreen;
  showScreen = function(id){ sh(id); if (id === 'view-coach-cliente') mjPintarFichaSemana(); if (id === 'view-coach-ajustes') setTxt('ajustesWho', coachActivo ? coachActivo.u + ' · ' + coachActivo.rol : 'Fitness sin dramas'); };
})();

/* Los pesos y textos del plan se guardan al escribir y al salir de la app
   (antes, si el cliente solo apuntaba pesos y cerraba, se perdían) */
document.addEventListener('input', function(e){
  if (e.target.closest && e.target.closest('#sesionesCont, #comidasCont') && clienteActual) programarGuardado();
}, true);
function mjGuardarYa(){ try { if (clienteActual || coachActivo) guardarTodo(); } catch(e){} }
document.addEventListener('visibilitychange', function(){ if (document.visibilityState === 'hidden') mjGuardarYa(); });
window.addEventListener('pagehide', mjGuardarYa);
cerrarSesionCliente = (function(orig){ return function(){ mjGuardarYa(); orig.apply(this, arguments); }; })(cerrarSesionCliente);
