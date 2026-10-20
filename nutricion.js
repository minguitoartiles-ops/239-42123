/* =========================================================
   Fitness sin Dramas — Nutrición: cálculo automático, plan rápido y resumen de un vistazo
   Se carga después de mejoras.js.
   - Las cantidades de cada opción se calculan para que la comida cuadre con su parte de las kcal
     y de los macros del día (también al cambiar de opción).
   - El reparto entre comidas es automático salvo que Fátima lo cambie.
   ========================================================= */

/* ---------- alimentos propios: se guardan en el móvil ---------- */
const NU_ALIM_KEY = 'fsd_alimentos';
(function(){
  let l = []; try { l = JSON.parse(localStorage.getItem(NU_ALIM_KEY) || '[]'); } catch(e){}
  l.forEach(function(o){ if (o && o.n && !foodInfo(o.n)) FOOD_CATALOG.push(Object.assign({}, o, { custom: true })); });
})();
saveNewFood = (function(orig){
  return function(){
    const antes = FOOD_CATALOG.length;
    orig();
    if (FOOD_CATALOG.length > antes) {
      const propios = FOOD_CATALOG.filter(function(o){ return o.custom; }).map(function(o){ return { n: o.n, g: o.g, p: o.p, c: o.c, f: o.f }; });
      try { localStorage.setItem(NU_ALIM_KEY, JSON.stringify(propios)); } catch(e){}
    }
  };
})(saveNewFood);

/* ---------- alérgenos de los alimentos del catálogo (para avisar y para el plan rápido) ---------- */
const NU_ALERGENOS = [
  [/yogur|skyr|queso|reques|whey/i, ['leche', 'lactosa']],
  [/huevo|claras/i, ['huevo']],
  [/merluza|bacalao|salm[oó]n|sardina|at[uú]n/i, ['pescado', 'anisakis']],
  [/gamba/i, ['crustaceos']],
  [/pan |pan$|pasta|cous|bulgur|seit[aá]n|muesli|avena/i, ['gluten', 'celiaquia', 'sgnc']],
  [/frutos secos|nueces|almendra/i, ['frutoscascara']],
  [/cacahuete/i, ['cacahuete']],
  [/tofu/i, ['soja']],
  [/semillas/i, ['semillas', 'sesamo']],
  [/legumbre/i, ['legumbres']],
  [/aguacate/i, ['latexfrutas']],
  [/^fruta$/i, ['rosaceas', 'fructosa']],
  [/at[uú]n|sardina|queso curado|chocolate/i, ['histamina']]
];
function nuAlergenosDe(nombre){
  const out = [];
  NU_ALERGENOS.forEach(function(r){ if (r[0].test(nombre)) r[1].forEach(function(a){ if (out.indexOf(a) < 0) out.push(a); }); });
  return out;
}
function nuConflictos(nombre, k){
  const d = clientesData[k || clienteActual];
  const a = d && d.alergias && d.alergias.items;
  if (!a) return [];
  return nuAlergenosDe(nombre).filter(function(x){ return x in a; });
}

/* ---------- resolutor: gramos de cada alimento para cuadrar P, C y G (error medido en kcal) ---------- */
function nuResolver(foods, t){
  const W = [16, 16, 81];                       // (4, 4, 9 kcal por gramo)²
  const n = foods.length;
  let mejor = null;
  for (let mask = 1; mask < (1 << n); mask++) {
    const idx = []; for (let j = 0; j < n; j++) if (mask & (1 << j)) idx.push(j);
    const k = idx.length;
    // ecuaciones normales (A^T W A) x = A^T W t
    const M = [], b = [];
    for (let a = 0; a < k; a++) {
      M.push([]); let s = 0;
      for (let c = 0; c < k; c++) {
        let v = 0;
        for (let r = 0; r < 3; r++) v += W[r] * foods[idx[a]][r] * foods[idx[c]][r];
        M[a].push(v);
      }
      for (let r = 0; r < 3; r++) s += W[r] * foods[idx[a]][r] * t[r];
      b.push(s);
    }
    const x = nuGauss(M, b);
    if (!x || x.some(function(v){ return v < -1e-9; })) continue;
    const sol = new Array(n).fill(0);
    idx.forEach(function(j, i){ sol[j] = Math.max(0, x[i]); });
    let err = 0;
    for (let r = 0; r < 3; r++) { let g = 0; for (let j = 0; j < n; j++) g += foods[j][r] * sol[j]; err += W[r] * (g - t[r]) * (g - t[r]); }
    err -= k * 1e-6;                              // a igualdad, mejor usar todos los alimentos
    if (!mejor || err < mejor.err) mejor = { sol: sol, err: err };
  }
  return mejor ? mejor.sol : new Array(n).fill(0);
}
function nuGauss(M, b){
  const n = b.length, A = M.map(function(r, i){ return r.concat([b[i]]); });
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-9) return null;
    const tmp = A[c]; A[c] = A[p]; A[p] = tmp;
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
  }
  return A.map(function(r, i){ return r[n] / A[i][i]; });
}
function nuRedondear(g){ return g <= 0 ? 0 : (g < 20 ? Math.max(1, Math.round(g)) : Math.round(g / 5) * 5); }
function nuMacros(info){ return [info.p / 100, info.c / 100, info.f / 100]; }

/* ---------- reparto entre comidas ---------- */
const NU_REPARTOS = { 1: [100], 2: [50, 50], 3: [30, 40, 30], 4: [25, 35, 15, 25], 5: [20, 10, 35, 10, 25], 6: [20, 10, 30, 10, 20, 10] };
function nuRepartoAuto(n){
  if (NU_REPARTOS[n]) return NU_REPARTOS[n].slice();
  const v = Math.floor(100 / n), r = new Array(n).fill(v); r[0] += 100 - v * n; return r;
}
function nuRepartoManual(){
  const d = clienteActual && clientesData[clienteActual];
  return !!(d && d.nutObj && d.nutObj.repartoManual);
}

/* ---------- cálculo de un plan (en pantalla o guardado) ---------- */
function nuColumnas(block){
  return Array.prototype.map.call(block.querySelectorAll('.macro-group'), function(g){
    const chips = Array.prototype.filter.call(g.querySelectorAll('.chip'), function(ch){ return !ch.classList.contains('chip-add'); });
    const items = chips.map(function(ch){ return { chip: ch, nombre: chipName(ch), info: foodInfo(chipName(ch)), sel: ch.classList.contains('selected') }; })
      .filter(function(o){ return o.info; });
    const ref = items.filter(function(o){ return o.sel; })[0] || items[0] || null;
    return { items: items, ref: ref };
  });
}
function nuCalcularPlan(cont, obj, reparto, pintar){
  const bloques = Array.prototype.slice.call(cont.querySelectorAll('.meal-block'));
  const suma = reparto.slice(0, bloques.length).reduce(function(a, b){ return a + b; }, 0) || 1;
  const out = { comidas: [], p: 0, c: 0, f: 0, kcal: 0, faltan: 0 };
  bloques.forEach(function(b, i){
    const share = (reparto[i] != null ? reparto[i] : 100 / bloques.length) / suma;
    const t = [obj.p * share, obj.c * share, obj.f * share];
    const cols = nuColumnas(b);
    const refs = cols.map(function(c){ return c.ref; }).filter(Boolean);
    const titulo = ((b.querySelector('.meal-block-title') || {}).textContent || 'Comida ' + (i + 1)).trim();
    const com = { titulo: titulo, kcalObj: Math.round(t[0] * 4 + t[1] * 4 + t[2] * 9), p: 0, c: 0, f: 0, kcal: 0, refs: [], block: b };
    if (!refs.length) { out.faltan++; out.comidas.push(com); return; }
    const g = nuResolver(refs.map(function(o){ return nuMacros(o.info); }), t);
    refs.forEach(function(o, j){
      const gr = nuRedondear(g[j]);
      com.p += o.info.p * gr / 100; com.c += o.info.c * gr / 100; com.f += o.info.f * gr / 100;
      com.refs.push({ nombre: o.nombre, g: gr });
      if (pintar) setChipQty(o.chip, '· ' + gr + ' g');
    });
    com.kcal = Math.round(com.p * 4 + com.c * 4 + com.f * 9);
    if (pintar) {
      // cada alternativa: lo que hay que comer de ella para que, con las otras columnas, la comida siga cuadrando
      cols.forEach(function(col, ci){
        col.items.forEach(function(o){
          if (o === col.ref) return;
          const comb = cols.map(function(c2, cj){ return cj === ci ? o : c2.ref; }).filter(Boolean);
          const g2 = nuResolver(comb.map(function(x){ return nuMacros(x.info); }), t);
          setChipQty(o.chip, '· ' + nuRedondear(g2[comb.indexOf(o)]) + ' g');
        });
        Array.prototype.forEach.call(b.querySelectorAll('.macro-group')[ci].querySelectorAll('.chip'), function(ch){
          if (ch.classList.contains('chip-add')) return;
          if (!foodInfo(chipName(ch))) setChipQty(ch, '· sin datos');
        });
      });
      b.dataset.mp = com.p; b.dataset.mc = com.c; b.dataset.mf = com.f;
      const old = b.querySelector('.meal-calc'); if (old) old.remove();
      const s = b.querySelector('.meal-summary');
      if (s) {
        const dif = com.kcal - com.kcalObj;
        s.innerHTML = '<b>' + fmtMil(com.kcal) + ' kcal</b> · P ' + Math.round(com.p) + ' · C ' + Math.round(com.c) + ' · G ' + Math.round(com.f)
          + (Math.abs(dif) > Math.max(25, com.kcalObj * 0.06) ? ' <span class="nu-dif">(' + (dif > 0 ? '+' : '') + dif + ' kcal)</span>' : '');
      }
    }
    out.p += com.p; out.c += com.c; out.f += com.f; out.kcal += com.kcal;
    out.comidas.push(com);
  });
  out.kcal = Math.round(out.kcal);
  return out;
}
function nuObjetivoDe(k){
  const d = clientesData[k], o = d && d.nutObj;
  if (!o || !o.kcal) return null;
  return { kcal: o.kcal, p: o.kcal * o.p / 400, c: o.kcal * o.c / 400, f: o.kcal * o.f / 900, pPct: o.p, cPct: o.c, fPct: o.f };
}
/* resumen de un cliente sin abrir su plan (para la ficha y las tarjetas) */
function nuResumenCliente(k){
  const obj = nuObjetivoDe(k);
  const html = PLANES[k] && PLANES[k].nut;
  const r = { obj: obj, comidas: [], total: null };
  if (!html) return r;
  const t = document.createElement('div'); t.innerHTML = html;
  const n = t.querySelectorAll('.meal-block').length;
  if (!n) return r;
  if (!obj) { r.comidas = Array.prototype.map.call(t.querySelectorAll('.meal-block-title'), function(x){ return { titulo: x.textContent.trim(), refs: [] }; }); return r; }
  const d = clientesData[k];
  const rep = d.nutObj.repartoManual && d.nutObj.comidas && d.nutObj.comidas.length === n ? d.nutObj.comidas : nuRepartoAuto(n);
  const res = nuCalcularPlan(t, obj, rep, false);
  r.comidas = res.comidas; r.total = res;
  return r;
}

/* ---------- calculadora de la pantalla de nutrición (sustituye a la anterior) ---------- */
function nuLeerObjetivo(){
  const v = function(id){ return mjNum((document.getElementById(id) || {}).value); };
  return { kcal: v('calcKcal'), p: v('calcP'), c: v('calcC'), f: v('calcF') };
}
function nuRepartoPantalla(n){
  const row = document.getElementById('calcMealRow');
  if (!row) return nuRepartoAuto(n);
  let ins = Array.prototype.slice.call(row.querySelectorAll('.calc-meal'));
  if (!nuRepartoManual() || ins.length !== n) {
    const auto = nuRepartoAuto(n);
    if (ins.length !== n) {
      row.innerHTML = auto.map(function(v, i){ return '<label>C' + (i + 1) + '<input type="number" inputmode="numeric" class="calc-meal" value="' + v + '"></label>'; }).join('');
      ins = Array.prototype.slice.call(row.querySelectorAll('.calc-meal'));
    }
    if (!nuRepartoManual()) ins.forEach(function(x, i){ x.value = auto[i]; x.setAttribute('value', auto[i]); });
  }
  return ins.map(function(x){ return Math.max(0, mjNum(x.value) || 0); });
}
calcularPlan = function(){
  const res = document.getElementById('calcResult');
  const o = nuLeerObjetivo();
  const aviso = function(t){ if (res) res.innerHTML = '<div class="calc-warn">' + t + '</div>'; };
  const sumaPct = (o.p || 0) + (o.c || 0) + (o.f || 0);
  let valido = true;
  if (!o.kcal || o.kcal <= 0) { aviso('Introduce las calorías objetivo.'); valido = false; }
  else if ([o.p, o.c, o.f].some(function(v){ return v == null || v < 0; })) { aviso('Revisa los porcentajes de macros.'); valido = false; }
  else if (Math.abs(sumaPct - 100) > 0.5) { aviso('Los macros deben sumar 100 %: ahora suman ' + Math.round(sumaPct) + ' %.'); valido = false; }
  if (!valido) { mjPintarObjetivoNut(); return; }
  const obj = { kcal: o.kcal, p: o.kcal * o.p / 400, c: o.kcal * o.c / 400, f: o.kcal * o.f / 900 };
  window.objNutri = obj;
  setTxt('resKcal', fmtMil(Math.round(o.kcal)) + ' kcal');
  setTxt('resP', Math.round(obj.p) + ' g'); setTxt('resC', Math.round(obj.c) + ' g'); setTxt('resF', Math.round(obj.f) + ' g');
  nuPintarGramosMacros(obj);
  const bloques = mealBlocks();
  let r = null;
  if (bloques.length) {
    const rep = nuRepartoPantalla(bloques.length);
    r = nuCalcularPlan(contNut(), obj, rep, true);
    nuPintarRepartoKcal(rep, o.kcal);
  }
  if (res) {
    if (!r) res.innerHTML = '<div class="calc-warn">Añade comidas para repartir estas calorías.</div>';
    else {
      const dif = r.kcal - Math.round(o.kcal);
      res.innerHTML = '<div class="calc-line"><span>Objetivo</span><b>' + fmtMil(Math.round(o.kcal)) + ' kcal · P ' + Math.round(obj.p) + ' · C ' + Math.round(obj.c) + ' · G ' + Math.round(obj.f) + '</b></div>'
        + '<div class="calc-line"><span>Plan</span><b>' + fmtMil(r.kcal) + ' kcal · P ' + Math.round(r.p) + ' · C ' + Math.round(r.c) + ' · G ' + Math.round(r.f) + '</b></div>'
        + '<div class="calc-diff' + (Math.abs(dif) <= Math.max(40, o.kcal * 0.03) ? ' ok' : '') + '">'
        + (r.faltan ? r.faltan + (r.faltan === 1 ? ' comida sin alimentos' : ' comidas sin alimentos') : (Math.abs(dif) <= 5 ? 'Cuadra con el objetivo ✓' : (dif > 0 ? '+' : '') + dif + ' kcal respecto al objetivo'))
        + '</div>';
    }
  }
  recalcConsumo(); recalcCumplimiento(); recalcProgreso();
  if (typeof pintarResumenGramos === 'function') pintarResumenGramos();
  const nota = document.querySelector('#resumenGramos .rg-nota');
  if (nota) nota.textContent = 'Cantidades en crudo. Cada opción ya está calculada para que la comida cuadre: puedes cambiar una por otra.';
  const sm = document.querySelector('#resumenGramos summary small');
  if (sm) sm.textContent = r ? fmtMil(r.kcal) + ' kcal en total' : '';
  if (isCoachView()) { clearTimeout(mjGuardarNutPend); mjGuardarNutPend = setTimeout(nuGuardarObjetivo, 500); }
  mjPintarObjetivoNut();
};
function nuPintarGramosMacros(obj){
  [['calcP', obj.p], ['calcC', obj.c], ['calcF', obj.f]].forEach(function(x){
    const inp = document.getElementById(x[0]); if (!inp) return;
    let s = inp.parentElement.querySelector('.nu-g');
    if (!s) { s = document.createElement('small'); s.className = 'nu-g'; inp.parentElement.appendChild(s); }
    s.textContent = Math.round(x[1]) + ' g';
  });
}
function nuPintarRepartoKcal(rep, kcal){
  const row = document.getElementById('calcMealRow'); if (!row) return;
  const suma = rep.reduce(function(a, b){ return a + b; }, 0) || 1;
  const tit = mealBlocks().map(function(b){ return ((b.querySelector('.meal-block-title') || {}).textContent || '').trim(); });
  Array.prototype.forEach.call(row.querySelectorAll('label'), function(l, i){
    const nodo = l.firstChild;
    if (nodo && nodo.nodeType === 3) nodo.textContent = (tit[i] || 'C' + (i + 1)).slice(0, 12);
    let s = l.querySelector('.nu-g');
    if (!s) { s = document.createElement('small'); s.className = 'nu-g'; l.appendChild(s); }
    s.textContent = Math.round(kcal * rep[i] / suma) + ' kcal';
  });
  let b = document.getElementById('nuRepartoAuto');
  if (!b) {
    b = document.createElement('button'); b.type = 'button'; b.id = 'nuRepartoAuto'; b.className = 'mini-btn nu-rep-btn';
    b.onclick = function(){ nuRepartoModo(false); };
    row.parentNode.insertBefore(b, row.nextSibling);
  }
  b.hidden = !nuRepartoManual();
  b.textContent = 'Repartir automáticamente';
  const sub = row.previousElementSibling;
  if (sub && sub.classList.contains('calc-sub')) sub.textContent = nuRepartoManual() ? 'Reparto por comida (%) · a mano' : 'Reparto por comida (%) · automático';
}
function nuRepartoModo(manual){
  const d = clienteActual && clientesData[clienteActual];
  if (!d) return;
  d.nutObj = d.nutObj || {};
  d.nutObj.repartoManual = !!manual;
  programarGuardado();
  calcularPlan();
}
document.addEventListener('input', function(e){
  const t = e.target;
  if (t.matches && t.matches('#calcKcal, #calcP, #calcC, #calcF')) { calcularPlan(); return; }
  if (t.classList && t.classList.contains('calc-meal')) {
    const d = clienteActual && clientesData[clienteActual];
    if (d) { d.nutObj = d.nutObj || {}; d.nutObj.repartoManual = true; }
    calcularPlan();
  }
}, true);
function nuGuardarObjetivo(){
  const manual = nuRepartoManual();
  mjGuardarObjetivoNut();
  const d = clienteActual && clientesData[clienteActual];
  if (d && d.nutObj) { d.nutObj.repartoManual = manual; programarGuardado(); }
}
/* las comidas cuentan sus kcal reales en el resumen de cada bloque */
updateMealSummary = (function(orig){
  return function(b){ if (b && b.querySelector('.meal-summary b')) return; orig(b); };
})(updateMealSummary);
/* la calculadora del cliente que se abre usa su reparto guardado */
mjPrepararCalculadora = (function(orig){
  return function(key){
    orig(key);
    const d = clientesData[key];
    const row = document.getElementById('calcMealRow');
    if (row && !(d && d.nutObj && d.nutObj.repartoManual && d.nutObj.comidas)) row.innerHTML = '';
  };
})(mjPrepararCalculadora);

/* ---------- selector de alimentos: avisa de las alergias del cliente ---------- */
renderFoodList = (function(orig){
  return function(){
    orig();
    const list = document.getElementById('foodList');
    if (!list || !clienteActual) return;
    Array.prototype.forEach.call(list.querySelectorAll('.picker-item'), function(it){
      const c = nuConflictos(it.dataset.name);
      if (!c.length) return;
      it.classList.add('nu-alerg');
      const s = document.createElement('span');
      s.className = 'picker-item-eq nu-alerg-tag';
      s.textContent = '⚠️ ' + c.map(nombreAlergia).join(', ');
      it.appendChild(s);
    });
  };
})(renderFoodList);

/* =========================================================
   Plan rápido: crea las comidas, el reparto y opciones típicas en un paso
   ========================================================= */
const NU_NOMBRES = { 3: ['Desayuno', 'Comida', 'Cena'], 4: ['Desayuno', 'Comida', 'Merienda', 'Cena'], 5: ['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Cena'], 6: ['Desayuno', 'Media mañana', 'Comida', 'Merienda', 'Cena', 'Recena'] };
const NU_TIPICOS = {
  ligera: [['Yogur griego 0%', 'Claras de huevo', 'Queso fresco batido 0%', 'Jamón cocido'], ['Avena', 'Pan integral', 'Fruta', 'Tortitas de arroz'], ['Frutos secos', 'Crema 100% cacahuete', 'Aguacate']],
  principal: [['Pechuga de pollo', 'Merluza', 'Ternera magra', 'Tofu'], ['Arroz', 'Patata', 'Pasta integral', 'Legumbres'], ['Aceite de oliva', 'Aguacate']],
  cena: [['Merluza', 'Pavo', 'Huevos', 'Tofu'], ['Patata', 'Boniato', 'Pan integral', 'Arroz'], ['Aceite de oliva', 'Aguacate']],
  recena: [['Queso fresco batido 0%', 'Yogur griego 0%', 'Claras de huevo'], ['Fruta', 'Tortitas de arroz'], ['Nueces', 'Almendras']]
};
const NU_PRESETS = { 'Perder grasa': [35, 35, 30], 'Ganar músculo': [25, 50, 25], 'Recomposición': [30, 45, 25], 'Mantenimiento': [25, 50, 25] };
const NU_KCAL_KG = { 'Perder grasa': 26, 'Ganar músculo': 36, 'Recomposición': 30, 'Mantenimiento': 31 };
function nuPesoCliente(k){
  const segs = SEGUIMIENTOS[k] || [];
  for (let i = 0; i < segs.length; i++) if (segs[i].med && segs[i].med.peso) return segs[i].med.peso;
  const d = clientesData[k];
  return d && d.medIni && d.medIni.peso ? d.medIni.peso : null;
}
function abrirPlanRapido(){
  const k = clienteActual, d = clientesData[k];
  if (!d) return;
  const peso = nuPesoCliente(k);
  const obj = d.objetivo && NU_PRESETS[d.objetivo] ? d.objetivo : 'Mantenimiento';
  const sug = peso ? Math.round(peso * NU_KCAL_KG[obj] / 50) * 50 : (d.nutObj && d.nutObj.kcal) || 2000;
  const pr = NU_PRESETS[obj];
  const al = d.alergias && d.alergias.items ? Object.keys(d.alergias.items) : [];
  const o = mjHoja('nuPlanRapido');
  o.innerHTML = '<div class="fsd-sheet full"><div class="sheet-head"><h3>Plan rápido para ' + esc(d.nombre) + '</h3><button class="x-btn" onclick="mjCerrarHoja(\'nuPlanRapido\')" aria-label="Cerrar">×</button></div>'
    + '<p class="ajx-note">Crea las comidas con su reparto y opciones típicas ya calculadas. Después puedes cambiar lo que quieras.' + (mealBlocks().length ? ' <b>Sustituye las comidas que hay ahora.</b>' : '') + '</p>'
    + '<div class="alta-label">Comidas al día</div><div class="chips" data-grupo="nc">' + [3, 4, 5, 6].map(function(n){ return '<button type="button" class="chip protein' + (n === 5 ? ' selected' : '') + '" data-v="' + n + '" onclick="mjChip(this)">' + n + '</button>'; }).join('') + '</div>'
    + '<div class="field"><label for="nuKcal">Calorías al día</label><input type="text" inputmode="numeric" id="nuKcal" value="' + sug + '"></div>'
    + '<p class="ajx-note">' + (peso ? 'Sugerido para ' + fmtNum(peso) + ' kg y objetivo «' + esc(obj.toLowerCase()) + '» (' + NU_KCAL_KG[obj] + ' kcal por kg). Ajústalo a su actividad.' : 'Sin peso registrado: revisa la cifra.') + '</p>'
    + '<div class="alta-label">Macros</div><div class="chips" data-grupo="mac">' + Object.keys(NU_PRESETS).map(function(n){
        const v = NU_PRESETS[n]; return '<button type="button" class="chip protein' + (n === obj ? ' selected' : '') + '" data-v="' + v.join('/') + '" onclick="mjChip(this)">' + esc(n) + ' · ' + v.join('/') + '</button>'; }).join('') + '</div>'
    + '<label class="chk-row"><input type="checkbox" id="nuTipicos" checked><span>Añadir opciones típicas a cada comida<i class="opc">' + (al.length ? 'Se evitan sus alergias: ' + esc(al.map(nombreAlergia).join(', ')) + '.' : 'Proteína, carbohidrato y grasa, con 2 o 3 alternativas cada una.') + '</i></span></label>'
    + '<button class="btn-primary" onclick="crearPlanRapido()">Crear plan</button></div>';
  o.classList.add('show');
}
function nuOpcionesPara(tipo, k){
  return NU_TIPICOS[tipo].map(function(col){
    return col.filter(function(n){ return foodInfo(n) && !nuConflictos(n, k).length; }).slice(0, 3);
  });
}
function crearPlanRapido(){
  const k = clienteActual, d = clientesData[k], o = document.getElementById('nuPlanRapido');
  const n = +((o.querySelector('[data-grupo="nc"] .chip.selected') || {}).dataset || {}).v || 5;
  const kcal = mjNum(document.getElementById('nuKcal').value);
  if (!kcal || kcal < 800 || kcal > 6000) { toast('Revisa las calorías (entre 800 y 6.000).'); return; }
  const mac = ((o.querySelector('[data-grupo="mac"] .chip.selected') || {}).dataset || {}).v || '30/45/25';
  const pm = mac.split('/').map(Number);
  const tipicos = document.getElementById('nuTipicos').checked;
  if (!coachEditing) editarPlan();
  contNut().innerHTML = '';
  const nombres = NU_NOMBRES[n];
  nombres.forEach(function(nom){
    addMeal();
    const b = mealBlocks()[mealBlocks().length - 1];
    const t = b.querySelector('.meal-block-title');
    t.textContent = nom; t.dataset.custom = '1';
    if (!tipicos) return;
    const tipo = /desayuno|media|merienda/i.test(nom) ? 'ligera' : (/recena/i.test(nom) ? 'recena' : (/cena/i.test(nom) ? 'cena' : 'principal'));
    const ops = nuOpcionesPara(tipo, k);
    Array.prototype.forEach.call(b.querySelectorAll('.macro-group .chips'), function(g, gi){
      (ops[gi] || []).forEach(function(nombre){ foodTargetGroup = g; foodTargetMacro = ['p', 'c', 'f'][gi]; const fake = document.createElement('div'); fake.dataset.name = nombre; fake.dataset.g = foodInfo(nombre).g; pickFood(fake); });
    });
  });
  foodTargetGroup = null;
  const set = function(id, v){ const el = document.getElementById(id); el.value = v; el.setAttribute('value', v); };
  set('calcKcal', Math.round(kcal)); set('calcP', pm[0]); set('calcC', pm[1]); set('calcF', pm[2]);
  d.nutObj = d.nutObj || {}; d.nutObj.repartoManual = false;
  document.getElementById('calcMealRow').innerHTML = '';
  renumberMeals();
  calcularPlan();
  mjCerrarHoja('nuPlanRapido');
  mjTextosVacios();
  toast('Plan creado: ' + n + ' comidas · ' + fmtMil(Math.round(kcal)) + ' kcal');
  const cc = document.getElementById('calcCard'); if (cc) cc.scrollIntoView({ block: 'start', behavior: 'smooth' });
}
/* botón «Plan rápido» en la calculadora y en el estado vacío */
(function(){
  const card = document.getElementById('calcCard');
  if (!card) return;
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn-eq nu-rapido'; b.innerHTML = '⚡ Plan rápido';
  b.onclick = abrirPlanRapido;
  card.insertBefore(b, card.firstChild.nextSibling);
})();
atrasDentroApp = (function(orig){ return function(){ if (capaVisible('nuPlanRapido')) { mjCerrarHoja('nuPlanRapido'); return true; } return orig(); }; })(atrasDentroApp);

/* =========================================================
   Navegación entre clientes en el plan (flechas junto al nombre)
   ========================================================= */
(function(){
  const nom = document.getElementById('coachBarName');
  if (!nom) return;
  const mk = function(dir, txt, lbl){
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'nu-nav'; b.textContent = txt; b.setAttribute('aria-label', lbl);
    b.onclick = function(e){ e.stopPropagation(); nuOtroCliente(dir); };
    return b;
  };
  nom.parentNode.insertBefore(mk(-1, '‹', 'Cliente anterior'), nom);
  nom.parentNode.insertBefore(mk(1, '›', 'Cliente siguiente'), nom.nextSibling);
})();
function nuClientesOrden(){
  return Object.keys(clientesData).filter(function(k){ return !mjEsBaja(clientesData[k]); })
    .sort(function(a, b){ return (clientesData[a].nombre || '').localeCompare(clientesData[b].nombre || '', 'es'); });
}
function nuOtroCliente(dir){
  const l = nuClientesOrden(); if (l.length < 2) { toast('No hay más clientes.'); return; }
  const i = l.indexOf(clienteActual);
  const k = l[(i + dir + l.length) % l.length];
  const vista = vistaActual;
  if (coachEditing) editarPlan();                      // guarda lo que se estaba editando
  backToCliente();
  goToCliente(k);
  abrirVistaCliente(vista);
  toast(clientesData[k].nombre);
}

/* =========================================================
   Nutrición de un vistazo: ficha del cliente y tarjetas del panel
   ========================================================= */
function nuHtmlResumen(k, compacto){
  const d = clientesData[k], r = nuResumenCliente(k);
  let h = '';
  if (r.obj) {
    h += '<div class="nu-vista-top"><div><b>' + fmtMil(Math.round(r.obj.kcal)) + '</b><span>kcal/día</span></div>'
      + '<div><b>' + Math.round(r.obj.p) + ' g</b><span>Proteína</span></div><div><b>' + Math.round(r.obj.c) + ' g</b><span>Carbos</span></div><div><b>' + Math.round(r.obj.f) + ' g</b><span>Grasa</span></div></div>';
    if (r.total && r.total.comidas.length) {
      const dif = r.total.kcal - Math.round(r.obj.kcal);
      h += '<div class="nu-vista-cuadre' + (Math.abs(dif) <= Math.max(40, r.obj.kcal * 0.03) ? ' ok' : '') + '">Plan: ' + fmtMil(r.total.kcal) + ' kcal · ' + r.total.comidas.length + (r.total.comidas.length === 1 ? ' comida' : ' comidas') + (Math.abs(dif) <= 5 ? ' · cuadra ✓' : ' · ' + (dif > 0 ? '+' : '') + dif + ' kcal') + '</div>';
    }
  } else h += '<div class="nu-vista-vacio">Objetivo de calorías sin fijar.</div>';
  if (!compacto) {
    if (r.comidas.length) {
      h += '<div class="nu-vista-comidas">' + r.comidas.map(function(c){
        return '<div class="nu-vc"><b>' + esc(c.titulo) + (c.kcal ? ' <small>' + fmtMil(c.kcal) + ' kcal</small>' : '') + '</b><span>'
          + (c.refs.length ? c.refs.map(function(x){ return esc(x.nombre) + ' ' + x.g + ' g'; }).join(' · ') : 'Sin alimentos') + '</span></div>';
      }).join('') + '</div>';
    } else h += '<div class="nu-vista-vacio">Todavía no tiene comidas en el plan.</div>';
    const a = d.alergias;
    if (a && a.fecha && !a.ninguna && Object.keys(a.items || {}).length) h += '<div class="nu-vista-alerg">⚠️ ' + Object.keys(a.items).map(function(x){ return esc(nombreAlergia(x)) + (a.items[x] === 'diag' ? ' (diagn.)' : ''); }).join(' · ') + '</div>';
    else if (!(a && a.fecha)) h += '<div class="nu-vista-alerg gris">Alergias sin rellenar</div>';
    const s = sensDe(k).filter(function(x){ return x.area === 'nut'; })[0];
    const seg = (SEGUIMIENTOS[k] || [])[0];
    const extra = [];
    if (seg && seg.n) extra.push('Adherencia ' + seg.n + '/10');
    if (s) extra.push('Última sensación ' + ANIMOS[s.animo][0] + ' ' + cuandoSens(s));
    if (extra.length) h += '<div class="nu-vista-extra">' + extra.join(' · ') + '</div>';
  }
  return h;
}
function nuPintarFicha(){
  const k = clienteActual, v = document.getElementById('view-coach-cliente');
  if (!k || !v || !coachActivo) return;
  let box = document.getElementById('fichaNutri');
  // v0.60.2: también Domingo ve el resumen del plan nutricional
  if (!box) {
    box = document.createElement('div'); box.id = 'fichaNutri';
    const body = v.querySelector('.alta-body');
    const meta = document.getElementById('cd-meta');
    body.insertBefore(box, meta ? meta.nextSibling : body.firstChild);
  }
  box.innerHTML = '<div class="nu-vista" onclick="goToPlanCoach()" role="button" tabindex="0" aria-label="Abrir el plan nutricional">'
    + '<div class="nu-vista-h"><span>🍽️ Nutrición de un vistazo</span><span class="lnk">Abrir plan ›</span></div>' + nuHtmlResumen(k, false) + '</div>';
}
goToCliente = (function(orig){ return function(k){ orig(k); nuPintarFicha(); }; })(goToCliente);
(function(){
  const sh = showScreen;
  showScreen = function(id){ sh(id); if (id === 'view-coach-cliente') nuPintarFicha(); };
})();
pintarListaClientes = (function(orig){
  return function(){
    orig();
    if (!coachActivo || coachActivo.rol !== 'dietista') return;
    const claves = Object.keys(clientesData);
    Array.prototype.forEach.call(document.querySelectorAll('#listaClientes .cliente-card'), function(card, i){
      const k = claves[i]; if (!k) return;
      const viejo = card.querySelector('.kc-nutri'); if (viejo) viejo.remove();
      const r = nuResumenCliente(k), d = clientesData[k];
      const div = document.createElement('div');
      div.className = 'kc-nutri';
      const al = d.alergias && d.alergias.items ? Object.keys(d.alergias.items).length : 0;
      div.innerHTML = r.obj
        ? '🍽️ <b>' + fmtMil(Math.round(r.obj.kcal)) + ' kcal</b> · P ' + Math.round(r.obj.p) + ' · C ' + Math.round(r.obj.c) + ' · G ' + Math.round(r.obj.f) + ' · ' + r.comidas.length + (r.comidas.length === 1 ? ' comida' : ' comidas')
          + (al ? ' · <span class="kc-al">⚠️ ' + al + '</span>' : '')
        : '🍽️ <span class="kc-pend">Plan nutricional sin preparar</span>' + (al ? ' · <span class="kc-al">⚠️ ' + al + '</span>' : '');
      div.onclick = function(e){ e.stopPropagation(); goToCliente(k); goToPlanCoach(); };
      div.setAttribute('role', 'button'); div.title = 'Abrir el plan nutricional';
      const grid = card.querySelector('.kc-grid');
      if (grid) grid.parentNode.insertBefore(div, grid.nextSibling); else card.appendChild(div);
    });
  };
})(pintarListaClientes);
actualizarPanel();

/* ---------- alimentos propios: revisar que los macros sean creíbles para 100 g (v0.59.2) ---------- */
// [nombre, patrón, excepción, rangos por 100 g {p,c,f:[mín, máx]}, valores típicos para el aviso]
const NU_REFS = [
  ['una leche', /\bleche\b/i, /polvo|coco|condensada/i, { p: [0.5, 4.5], c: [0, 7], f: [0, 4.5] }, 'P 3 · C 5 · G 0-4 por 100 ml'],
  ['una bebida vegetal', /bebida (de )?(avena|soja|almendra|arroz)/i, null, { p: [0, 4], c: [0, 12], f: [0, 3.5] }, 'P 0-3 · C 0-10 · G 1-3 por 100 ml'],
  ['un yogur o kéfir', /yogur|k[eé]fir|skyr/i, /polvo/i, { p: [2.5, 12], c: [0, 16], f: [0, 10] }, 'P 3-10 · C 3-12 · G 0-8'],
  ['claras de huevo', /claras?/i, /polvo/i, { p: [9, 13], c: [0, 2], f: [0, 1] }, 'P 11 · C 1 · G 0'],
  ['un huevo', /\bhuevos?\b/i, /claras?|polvo|\+/i, { p: [10, 15], c: [0, 2], f: [7, 13] }, 'P 13 · C 1 · G 10'],
  ['una patata o boniato', /patata|boniato|batata/i, /frita|chips|copos|pur[eé] en polvo/i, { p: [0.5, 3], c: [12, 25], f: [0, 1.5] }, 'P 2 · C 17-20 · G 0'],
  ['una fruta', /fruta|manzana|pl[aá]tano|naranja|fresa|pera|kiwi|mel[oó]n|sand[ií]a|uva|pi[nñ]a|mango|ar[aá]ndano/i, /deshidratad|seca|zumo|mermelada/i, { p: [0, 2], c: [3, 25], f: [0, 1] }, 'P 0-1 · C 8-20 · G 0'],
  ['una verdura', /verdura|br[oó]coli|espinaca|lechuga|tomate|calabac|pimiento|jud[ií]a verde|zanahoria|pepino|coliflor|esp[aá]rrago|champi/i, /frit/i, { p: [0, 4.5], c: [0, 10], f: [0, 1] }, 'P 1-3 · C 2-7 · G 0'],
  ['un aceite', /aceite/i, null, { p: [0, 1], c: [0, 1], f: [95, 100] }, 'G 99-100'],
  ['una crema de frutos secos', /crema (100% )?de (cacahuete|almendra|anacardo|avellana)|crema 100% cacahuete|mantequilla de cacahuete/i, null, { p: [18, 33], c: [4, 25], f: [42, 62] }, 'P 25 · C 10-15 · G 50'],
  ['frutos secos', /frutos secos|almendra|nuez|nueces|anacardo|avellana|pistacho|cacahuete/i, /crema|harina|bebida/i, { p: [8, 32], c: [3, 30], f: [40, 75] }, 'P 15-25 · C 5-20 · G 50-65'],
  ['un chocolate', /chocolate|cacao/i, /puro en polvo|desgrasado|bebida/i, { p: [3, 15], c: [12, 65], f: [25, 55] }, 'P 7-10 · C 20-45 · G 35-45'],
  ['una proteína en polvo', /whey|prote[ií]na en polvo|aislado|prote[ií]na whey|case[ií]na/i, null, { p: [60, 95], c: [0, 15], f: [0, 10] }, 'P 75-90 · C 2-8 · G 1-6'],
  ['un fiambre', /fiambre|pechuga de pavo loncha|jam[oó]n cocido|jam[oó]n york/i, null, { p: [10, 25], c: [0, 6], f: [0, 8] }, 'P 15-20 · C 1-3 · G 1-4'],
  ['carne magra', /pollo|pavo|pechuga|ternera|solomillo|lomo/i, /fiambre|nugget|empanad|frito|\+/i, { p: [17, 33], c: [0, 3], f: [0, 15] }, 'P 21-25 · C 0 · G 1-8'],
  ['un pescado o marisco', /at[uú]n|bacalao|merluza|pescado|salm[oó]n|sardina|lubina|dorada|gamba|langostino|pulpo|calamar|sepia/i, /empanad|rebozad|surimi|\+/i, { p: [12, 32], c: [0, 3], f: [0, 16] }, 'P 18-25 · C 0 · G 1-12'],
  ['un queso', /queso/i, /crema de queso light/i, { p: [7, 40], c: [0, 7], f: [0, 40] }, 'P 10-30 · C 1-4 · G 5-35'],
  ['un cereal o harina', /arroz|pasta|cous|quinoa|bulgur|avena|copos|ma[ií]z|pan\b|harina|tortita|cereal/i, /\+|integral con|leche/i, { p: [1.5, 18], c: [18, 88], f: [0, 10] }, 'cocido: P 3-5 · C 20-30 · G 1 · en crudo: P 7-14 · C 65-80 · G 1-7'],
  ['una legumbre', /legumbre|lenteja|garbanzo|alubia|jud[ií]a blanca|soja texturizada/i, /\+|harina/i, { p: [5, 52], c: [5, 62], f: [0, 20] }, 'cocida: P 7-9 · C 15-20 · G 1 · en seco: P 20-25 · C 45-60 · G 2-6']
];
function nuRevisarMacros(nombre, p, c, f){
  const kcal = p * 4 + c * 4 + f * 9;
  if (p + c + f === 0) return 'Has puesto 0 en los tres macros. Si el alimento tiene calorías, revisa la etiqueta (valores por 100 g).';
  if (kcal > 905) return 'Con esos valores saldrían ' + Math.round(kcal) + ' kcal por 100 g, más que el aceite puro. Revisa que sean por 100 g.';
  for (let i = 0; i < NU_REFS.length; i++) {
    const r = NU_REFS[i];
    if (!r[1].test(nombre) || (r[2] && r[2].test(nombre))) continue;
    const fuera = [['p', p, 'proteína'], ['c', c, 'carbohidrato'], ['f', f, 'grasa']].filter(function(x){ const lim = r[3][x[0]]; return x[1] < lim[0] || x[1] > lim[1]; });
    if (!fuera.length) return '';
    const alto = fuera.some(function(x){ return x[1] > r[3][x[0]][1]; });
    return 'Revisa los macros: para ' + r[0] + ' lo normal es ' + r[4] + (/ml/.test(r[4]) ? '' : ' por 100 g') + ', y has puesto P ' + fmtNum(p) + ' · C ' + fmtNum(c) + ' · G ' + fmtNum(f) + '. '
      + (alto ? '¿Puede que los hayas copiado de una ración, un vaso o el envase entero? Tienen que ser por 100 g.' : 'Algún valor parece bajo; compruébalo en la etiqueta (por 100 g).');
  }
  return '';
}
let nuMacrosConfirmados = '';
function nuGuardarIgualmente(){
  nuMacrosConfirmados = nuHuellaNuevo();
  saveNewFood();
}
function nuHuellaNuevo(){
  return ['newFoodName', 'newFoodP', 'newFoodC', 'newFoodF'].map(function(id){ return (document.getElementById(id).value || '').trim().toLowerCase(); }).join('|');
}
saveNewFood = (function(orig){
  return function(){
    const err = document.getElementById('newFoodError');
    const nombre = document.getElementById('newFoodName').value.trim();
    const p = parseFloat(document.getElementById('newFoodP').value), c = parseFloat(document.getElementById('newFoodC').value), f = parseFloat(document.getElementById('newFoodF').value);
    if (nombre && !foodInfo(nombre) && [p, c, f].every(function(v){ return !isNaN(v) && v >= 0; }) && p + c + f <= 100) {
      const aviso = nuRevisarMacros(nombre, p, c, f);
      if (aviso && nuMacrosConfirmados !== nuHuellaNuevo()) {
        err.innerHTML = '<span class="nu-aviso-macros">⚠️ ' + esc(aviso) + '</span>'
          + '<span class="nu-aviso-acts"><button type="button" class="picker-btn-ghost" onclick="document.getElementById(\'newFoodP\').focus()">Corregir</button>'
          + '<button type="button" class="picker-btn-solid" onclick="nuGuardarIgualmente()">Guardar igualmente</button></span>';
        return;
      }
    }
    nuMacrosConfirmados = '';
    orig();
  };
})(saveNewFood);
/* kcal por 100 g mientras se escriben los macros, para ver de un vistazo si cuadran */
(function(){
  const row = document.querySelector('#foodNewForm .calc-row'); if (!row) return;
  const k = document.createElement('div'); k.id = 'newFoodKcal'; k.className = 'nu-kcal100';
  row.parentNode.insertBefore(k, row.nextSibling);
  const pintar = function(){
    const v = ['newFoodP', 'newFoodC', 'newFoodF'].map(function(id){ return parseFloat(document.getElementById(id).value) || 0; });
    const kcal = v[0] * 4 + v[1] * 4 + v[2] * 9;
    k.textContent = kcal ? '≈ ' + Math.round(kcal) + ' kcal por 100 g' : '';
    const err = document.getElementById('newFoodError'); if (err && err.querySelector('.nu-aviso-macros')) err.textContent = '';
  };
  ['newFoodName', 'newFoodP', 'newFoodC', 'newFoodF'].forEach(function(id){ const i = document.getElementById(id); if (i) i.addEventListener('input', pintar); });
  toggleNewFood = (function(orig){ return function(s){ orig(s); nuMacrosConfirmados = ''; pintar(); }; })(toggleNewFood);
})();
