/* =========================================================
   Fitness sin Dramas — Entrenamiento para Domingo (estructura del Excel «Planificación»)
   - Sesiones «Día 1, Día 2…» con nombre editable.
   - Cada serie con sus repeticiones, RIR y peso (y repeticiones hechas por el cliente).
   - RIR por colores: 0-2 rojo (alta) · 3-4 amarillo (media) · 5+ verde (baja).
   - Rapidez: varios ejercicios a la vez, pautas de un toque, duplicar, ordenar, plantillas.
   Se carga después de nutricion.js.
   ========================================================= */

/* ---------- utilidades ---------- */
function enRir(v){ const n = mjNum(v); return n == null ? '' : (n <= 2 ? 'rir-r' : (n <= 4 ? 'rir-a' : 'rir-v')); }
function enRirTxt(v){ const n = mjNum(v); return n == null ? '' : (n <= 2 ? 'Intensidad alta' : (n <= 4 ? 'Intensidad media' : 'Intensidad baja')); }
function enPesos(item){ return Array.prototype.slice.call(item.querySelectorAll('.serie-in input')); }
function enEditando(){ return !!coachEditing && isCoachView(); }

/* ---------- ejercicios propios: se guardan en el móvil ---------- */
const EN_EJ_KEY = 'fsd_ejercicios';
(function(){
  let l = []; try { l = JSON.parse(localStorage.getItem(EN_EJ_KEY) || '[]'); } catch(e){}
  l.forEach(function(o){ if (o && o.n && !EX_CATALOG.some(function(e){ return norm(e.n) === norm(o.n); })) EX_CATALOG.push(Object.assign({}, o, { custom: true })); });
})();
saveNewExercise = (function(orig){
  return function(){
    const destino = addEjBtn, antes = EX_CATALOG.length;
    orig();
    if (EX_CATALOG.length > antes) {
      const nuevo = EX_CATALOG[EX_CATALOG.length - 1];
      try { localStorage.setItem(EN_EJ_KEY, JSON.stringify(EX_CATALOG.filter(function(e){ return e.custom; }).map(function(e){ return { n: e.n, m: e.m, e: e.e }; }))); } catch(e){}
      // antes, al crear un ejercicio desde «+ Añadir ejercicio» no se añadía a la sesión
      if (destino) { enInsertarEjercicios(destino, [{ n: nuevo.n, m: nuevo.m }]); }
    }
  };
})(saveNewExercise);

/* =========================================================
   1 · Sesiones: «Día N» con nombre editable
   ========================================================= */
function enRenumerar(){
  Array.prototype.forEach.call(contEnt().querySelectorAll('.sesion-card'), function(s, k){
    const n = s.querySelector('.sesion-num'); if (n) n.textContent = 'Día ' + (k + 1);
  });
}
renumerarSesiones = function(){ enRenumerar(); };
addSesion = (function(orig){
  return function(){
    orig();
    const cards = contEnt().querySelectorAll('.sesion-card');
    const c = cards[cards.length - 1];
    const t = c && c.querySelector('.sesion-title');
    if (t && t.textContent.trim() === 'Nueva sesión') t.textContent = 'Día ' + cards.length;
    enRenumerar(); enPrepararEdicion();
    programarGuardado();
  };
})(addSesion);
function enPrepararEdicion(){
  const ed = enEditando();
  Array.prototype.forEach.call(contEnt().querySelectorAll('.sesion-title'), function(t){
    if (ed) { t.setAttribute('contenteditable', 'true'); t.setAttribute('spellcheck', 'false'); }
    else t.removeAttribute('contenteditable');
  });
  // acciones de edición en sesiones y ejercicios
  Array.prototype.forEach.call(contEnt().querySelectorAll('.sesion-card'), function(c){
    let a = c.querySelector('.en-ses-acts');
    if (!a) {
      a = document.createElement('div'); a.className = 'en-ses-acts';
      a.innerHTML = '<button type="button" onclick="enMoverSesion(event,this,-1)" aria-label="Subir sesión">↑</button><button type="button" onclick="enMoverSesion(event,this,1)" aria-label="Bajar sesión">↓</button><button type="button" onclick="enDuplicarSesion(event,this)" aria-label="Duplicar sesión">⧉ Duplicar</button>';
      const body = c.querySelector('.sesion-body'); if (body) body.insertBefore(a, body.firstChild);
    }
  });
  Array.prototype.forEach.call(contEnt().querySelectorAll('.ex-item'), function(it){
    enSyncSeries(it);
    let a = it.querySelector('.en-ej-acts');
    if (!a) {
      a = document.createElement('div'); a.className = 'en-ej-acts';
      a.innerHTML = '<span class="en-pautas">' + EN_PAUTAS.map(function(p, i){ return '<button type="button" onclick="enPauta(this,' + i + ')">' + p[3] + '</button>'; }).join('') + '</span>'
        + '<span class="en-ej-btns"><button type="button" onclick="enMoverEj(this,-1)" aria-label="Subir ejercicio">↑</button><button type="button" onclick="enMoverEj(this,1)" aria-label="Bajar ejercicio">↓</button><button type="button" onclick="enDuplicarEj(this)" aria-label="Duplicar ejercicio">⧉</button><button type="button" class="en-del" onclick="enQuitarEj(this)" aria-label="Quitar ejercicio">✕</button></span>';
      const ser = it.querySelector('.ex-series'); it.insertBefore(a, ser || null);
    }
  });
}
editarPlan = (function(orig){
  return function(){
    const salia = coachEditing;
    orig();
    enPrepararEdicion();
    if (salia && !coachEditing) { enMarcarActualizado(); guardarTodo(); }
  };
})(editarPlan);
document.addEventListener('blur', function(e){
  const t = e.target;
  if (t.classList && t.classList.contains('sesion-title')) {
    if (!t.textContent.trim()) t.textContent = 'Día ' + (Array.prototype.indexOf.call(contEnt().querySelectorAll('.sesion-card'), t.closest('.sesion-card')) + 1);
    programarGuardado();
  }
}, true);

/* =========================================================
   2 · Cada serie con sus repeticiones y su RIR (como el Excel); 5 · colores del RIR
   ========================================================= */
function enValoresCabecera(it){
  const f = it.querySelectorAll('.rx-field');
  return { se: mjNum(f[0] && f[0].value) || 1, rep: mjNum(f[1] && f[1].value), rir: mjNum(f[2] && f[2].value) };
}
function enSyncSeries(it){
  const pesos = enPesos(it);
  const cab = enValoresCabecera(it);
  const cont = it.querySelector('.ex-series-inputs');
  if (!cont) return;
  pesos.forEach(function(p){
    if (p.dataset.reps == null || p.dataset.reps === '') { p.dataset.reps = cab.rep == null ? '' : cab.rep; p.setAttribute('data-reps', p.dataset.reps); }
    if (p.dataset.rir == null) { p.dataset.rir = cab.rir == null ? '' : cab.rir; p.setAttribute('data-rir', p.dataset.rir); }
    p.setAttribute('placeholder', 'kg');
  });
  // fila del plan (repeticiones · RIR de cada serie)
  let plan = it.querySelector('.sr-plan');
  if (!plan) { plan = document.createElement('div'); plan.className = 'sr-plan'; cont.parentNode.insertBefore(plan, cont); }
  const ed = enEditando();
  plan.innerHTML = pesos.map(function(p, i){
    const r = p.dataset.reps, ri = p.dataset.rir;
    return ed
      ? '<div class="sr-cel"><span class="sr-n">S' + (i + 1) + '</span><input class="sr-reps" type="text" inputmode="numeric" value="' + esc(r) + '" aria-label="Repeticiones serie ' + (i + 1) + '" data-i="' + i + '"><input class="sr-rir ' + enRir(ri) + '" type="text" inputmode="numeric" value="' + esc(ri) + '" aria-label="RIR serie ' + (i + 1) + '" data-i="' + i + '"></div>'
      : '<div class="sr-cel"><span class="sr-n">S' + (i + 1) + '</span><b class="sr-badge ' + enRir(ri) + '" title="' + enRirTxt(ri) + '">' + (r !== '' ? esc(r) : '—') + '<small>' + (ri !== '' && ri != null ? 'RIR ' + esc(ri) : '') + '</small></b></div>';
  }).join('');
  // fila de repeticiones hechas (las apunta el cliente, como en «Registro de pesos»)
  let hech = it.querySelector('.sr-hechas');
  if (!hech) { hech = document.createElement('div'); hech.className = 'sr-hechas'; cont.parentNode.insertBefore(hech, cont.nextSibling); }
  const ya = Array.prototype.map.call(hech.querySelectorAll('input'), function(x){ return x.value; });
  const soloVer = isCoachView();
  hech.innerHTML = pesos.map(function(p, i){
    const v = ya[i] != null ? ya[i] : '';
    return '<input type="text" inputmode="numeric" class="sr-h" placeholder="reps" value="' + esc(v) + '"' + (v ? '' : '') + (soloVer ? ' readonly' : '') + ' aria-label="Repeticiones hechas serie ' + (i + 1) + '">';
  }).join('');
  // etiquetas de las filas
  const top = it.querySelector('.ex-weight-lbl'); if (top) top.textContent = 'Series: plan · peso (kg) · reps hechas';
  const rx = it.querySelectorAll('.rx-field')[2];
  if (rx) { rx.classList.remove('rir-r', 'rir-a', 'rir-v'); const c = enRir(rx.value); if (c) rx.classList.add(c); }
}
function enTodoSync(){ Array.prototype.forEach.call(contEnt().querySelectorAll('.ex-item'), enSyncSeries); enLeyendaRir(); }
/* cambiar el número de series, o las reps/RIR de la cabecera («igual en todas») */
onPautaChange = function(inp){
  const it = inp.closest('.ex-item'); if (!it) return;
  const f = it.querySelectorAll('.rx-field');
  const idx = Array.prototype.indexOf.call(f, inp);
  const cont = it.querySelector('.ex-series-inputs');
  let pesos = enPesos(it);
  if (idx === 0) {
    const n = Math.max(1, Math.min(10, parseInt(f[0].value, 10) || 1));
    const ult = pesos[pesos.length - 1];
    while (pesos.length > n) { pesos.pop().closest('.serie-in').remove(); }
    while (pesos.length < n) {
      const l = document.createElement('label'); l.className = 'serie-in';
      l.innerHTML = '<span>S' + (pesos.length + 1) + '</span><input type="text" inputmode="decimal" placeholder="kg" data-prev="0" oninput="onSerieInput(this)">';
      const x = l.querySelector('input');
      x.dataset.reps = ult ? ult.dataset.reps : (mjNum(f[1].value) || ''); x.dataset.rir = ult ? (ult.dataset.rir || '') : (f[2].value || '');
      x.setAttribute('data-reps', x.dataset.reps); x.setAttribute('data-rir', x.dataset.rir);
      cont.appendChild(l); pesos.push(x);
    }
    pesos.forEach(function(p, i){ const s = p.closest('.serie-in').querySelector('span'); if (s) s.textContent = 'S' + (i + 1); });
  } else if (idx === 1 || idx === 2) {
    const clave = idx === 1 ? 'reps' : 'rir';
    pesos.forEach(function(p){ p.dataset[clave] = f[idx].value; p.setAttribute('data-' + clave, f[idx].value); });
  }
  enSyncSeries(it);
  recalcTonelaje(); recalcEntreno(); recalcCumplimiento(); recalcProgreso();
  programarGuardado();
};
document.addEventListener('input', function(e){
  const t = e.target;
  if (!t.closest) return;
  if (t.classList.contains('rx-field')) { const f = t.closest('.ex-item').querySelectorAll('.rx-field'); if (t === f[2]) onPautaChange(t); return; }
  if (t.classList.contains('sr-reps') || t.classList.contains('sr-rir')) {
    const it = t.closest('.ex-item'), p = enPesos(it)[+t.dataset.i];
    if (!p) return;
    const clave = t.classList.contains('sr-reps') ? 'reps' : 'rir';
    const v = t.value.replace(/[^0-9\-]/g, '');
    if (v !== t.value) t.value = v;
    p.dataset[clave] = v; p.setAttribute('data-' + clave, v);
    if (clave === 'rir') { t.classList.remove('rir-r', 'rir-a', 'rir-v'); const c = enRir(v); if (c) t.classList.add(c); }
    recalcTonelaje(); programarGuardado();
    return;
  }
  if (t.classList.contains('sr-h')) {
    const v = t.value.replace(/[^0-9]/g, ''); if (v !== t.value) t.value = v;
    recalcTonelaje(); recalcEntreno(); programarGuardado();
  }
}, true);
/* tonelaje con las repeticiones hechas (si las apunta) o las del plan */
tonelajeDe = function(scope){
  let t = 0;
  Array.prototype.forEach.call(scope.querySelectorAll('.ex-item'), function(it){
    const hech = it.querySelectorAll('.sr-h');
    enPesos(it).forEach(function(x, i){
      const v = mjNum(x.value || x.getAttribute('value'));
      const hv = hech[i] ? mjNum(hech[i].value || hech[i].getAttribute('value')) : null;
      const r = hv != null ? hv : (mjNum(String(x.dataset.reps || '').split('-')[0]) || 0);
      if (v != null && v > 0) t += v * r;
    });
  });
  if (!scope.querySelectorAll('.ex-item').length) {          // por si se llama con una sola serie suelta
    Array.prototype.forEach.call(scope.querySelectorAll('.serie-in input'), function(x){
      const v = mjNum(x.value), r = mjNum(x.dataset.reps) || 0; if (v != null && v > 0) t += v * r;
    });
  }
  return t;
};
/* leyenda del RIR (de «Reglas de Oro y RIR») */
function enLeyendaRir(){
  const v = document.getElementById('view-entreno');
  if (!v || !contEnt().querySelector('.ex-item')) { const l = document.getElementById('enLeyenda'); if (l) l.remove(); return; }
  let l = document.getElementById('enLeyenda');
  if (!l) {
    l = document.createElement('details'); l.id = 'enLeyenda'; l.className = 'en-leyenda';
    contEnt().parentNode.insertBefore(l, contEnt());
  }
  l.innerHTML = '<summary><span class="sr-badge rir-r">RIR 0-2</span><span class="sr-badge rir-a">RIR 3-4</span><span class="sr-badge rir-v">RIR 5+</span><span class="en-ley-q">¿Qué es el RIR?</span></summary>'
    + '<p><b>RIR = repeticiones en reserva</b>: las que te quedarían antes de no poder hacer ni una más con buena técnica.</p>'
    + '<p><b class="t-r">Rojo, intensidad alta (RIR 0-2)</b>: acabas al fallo o a 1-2 repeticiones de él. <b class="t-a">Amarillo, media (3-4)</b>: exigente pero con margen. <b class="t-v">Verde, baja (5 o más)</b>: técnica, calentamiento o descarga.</p>'
    + '<p>Elige el peso con el que llegues a las repeticiones marcadas con ese margen. Si te sobran muchas, sube el peso la próxima vez.</p>';
}

/* =========================================================
   3 · Más rápido: pautas de un toque, varios ejercicios a la vez, duplicar, ordenar, plantillas
   ========================================================= */
const EN_PAUTAS = [[3, 10, 2, '3×10 · RIR 2'], [4, 8, 1, '4×8 · RIR 1'], [3, 12, 3, '3×12 · RIR 3'], [5, 5, 2, '5×5 · RIR 2'], [4, 12, 2, '4×12 · RIR 2']];
function enPauta(btn, i){
  const it = btn.closest('.ex-item'), p = EN_PAUTAS[i];
  const f = it.querySelectorAll('.rx-field');
  f[0].value = p[0]; f[0].setAttribute('value', p[0]); onPautaChange(f[0]);
  f[1].value = p[1]; f[1].setAttribute('value', p[1]); onPautaChange(f[1]);
  f[2].value = p[2]; f[2].setAttribute('value', p[2]); onPautaChange(f[2]);
}
function enMoverEj(btn, dir){
  const it = btn.closest('.ex-item');
  const sib = dir < 0 ? it.previousElementSibling : it.nextElementSibling;
  if (!sib || !sib.classList.contains('ex-item')) return;
  if (dir < 0) it.parentNode.insertBefore(it, sib); else it.parentNode.insertBefore(sib, it);
  programarGuardado();
}
function enDuplicarEj(btn){
  const it = btn.closest('.ex-item');
  sincronizarInputs(it);
  const c = it.cloneNode(true);
  Array.prototype.forEach.call(c.querySelectorAll('.serie-in input, .sr-h'), function(x){ x.value = ''; x.removeAttribute('value'); });
  it.parentNode.insertBefore(c, it.nextSibling);
  enPrepararEdicion(); recalcEntreno(); programarGuardado();
}
function enQuitarEj(btn){
  const it = btn.closest('.ex-item');
  const nom = (it.querySelector('.ex-name-cell') || {}).textContent || 'este ejercicio';
  abrirDialogo({ titulo: 'Quitar ejercicio', texto: '¿Quitar «' + nom.replace(/\s*✎\s*$/, '').trim() + '» de la sesión?', ok: 'Quitar', peligro: true,
    onOk: function(){ it.remove(); recalcEntreno(); recalcTonelaje(); programarGuardado(); } });
}
function enMoverSesion(ev, btn, dir){
  ev.stopPropagation();
  const c = btn.closest('.sesion-card');
  const sib = dir < 0 ? c.previousElementSibling : c.nextElementSibling;
  if (!sib || !sib.classList.contains('sesion-card')) return;
  if (dir < 0) c.parentNode.insertBefore(c, sib); else c.parentNode.insertBefore(sib, c);
  enRenumerar(); programarGuardado();
}
function enDuplicarSesion(ev, btn){
  ev.stopPropagation();
  const c = btn.closest('.sesion-card');
  sincronizarInputs(c);
  const d = c.cloneNode(true);
  d.classList.remove('hecha'); d.removeAttribute('data-hecha');
  Array.prototype.forEach.call(d.querySelectorAll('.serie-in input, .sr-h'), function(x){ x.value = ''; x.removeAttribute('value'); x.setAttribute('data-prev', '0'); });
  const t = d.querySelector('.sesion-title'); if (t) t.textContent = t.textContent.trim() + ' (copia)';
  c.parentNode.insertBefore(d, c.nextSibling);
  enRenumerar(); enPrepararEdicion(); recalcEntreno(); programarGuardado();
  toast('Sesión duplicada');
}
/* añadir ejercicios ya hechos (desde el selector o una plantilla) */
function enInsertarEjercicios(addBtn, lista){
  lista.forEach(function(e){
    const p = e.pauta || [3, 10, 2];
    addBtn.insertAdjacentHTML('beforebegin', filaEjercicio(e.n, e.m || 'pecho', p[0], p[1], p[2]));
    const it = addBtn.previousElementSibling;
    if (coachEditing) {
      it.querySelector('.ex-desc').setAttribute('contenteditable', 'true');
      Array.prototype.forEach.call(it.querySelectorAll('.rx-field'), function(f){ f.removeAttribute('readonly'); });
    }
    if (e.series) {                                  // reps y RIR distintos por serie
      enPesos(it).forEach(function(x, i){
        const s = e.series[i] || e.series[e.series.length - 1];
        x.dataset.reps = s[0]; x.dataset.rir = s[1]; x.setAttribute('data-reps', s[0]); x.setAttribute('data-rir', s[1]);
      });
    }
    if (e.nota) { const d = it.querySelector('.ex-desc'); if (d) { d.textContent = e.nota + (d.textContent && d.textContent !== 'Sin descripción.' ? ' · ' + d.textContent : ''); d.dataset.propia = '1'; } }
  });
  enPrepararEdicion(); recalcEntreno(); recalcTonelaje(); programarGuardado();
}
/* selector de ejercicios: al añadir se pueden marcar varios */
let enMulti = [];
addEjercicio = (function(orig){
  return function(btn){
    enMulti = [];
    orig(btn);
    const pc = document.getElementById('pickerCurrent'); if (pc) pc.textContent = 'Marca los ejercicios que quieras';
    enBarraMulti();
  };
})(addEjercicio);
pickExercise = (function(orig){
  return function(el){
    if (!pickerTarget && addEjBtn) {
      const n = el.dataset.name, i = enMulti.findIndex(function(x){ return x.n === n; });
      if (i > -1) { enMulti.splice(i, 1); el.classList.remove('en-marcado'); }
      else { enMulti.push({ n: n, m: el.dataset.mus }); el.classList.add('en-marcado'); }
      enBarraMulti();
      return;
    }
    orig(el);
  };
})(pickExercise);
renderPickerList = (function(orig){
  return function(){
    orig();
    if (pickerTarget || !addEjBtn) return;
    Array.prototype.forEach.call(document.querySelectorAll('#pickerList .picker-item'), function(it){
      if (enMulti.some(function(x){ return x.n === it.dataset.name; })) it.classList.add('en-marcado');
    });
  };
})(renderPickerList);
function enBarraMulti(){
  const sheet = document.querySelector('#exPicker .picker-sheet');
  if (!sheet) return;
  let b = document.getElementById('enMultiBar');
  if (!addEjBtn || pickerTarget) { if (b) b.hidden = true; return; }
  if (!b) {
    b = document.createElement('div'); b.id = 'enMultiBar'; b.className = 'en-multi';
    sheet.appendChild(b);
  }
  b.hidden = false;
  b.innerHTML = '<span>' + (enMulti.length ? enMulti.length + (enMulti.length === 1 ? ' ejercicio marcado' : ' ejercicios marcados') : 'Toca para marcar uno o varios') + '</span>'
    + '<button type="button" class="btn-primary" ' + (enMulti.length ? '' : 'disabled') + ' onclick="enAnadirMarcados()">Añadir' + (enMulti.length ? ' ' + enMulti.length : '') + '</button>';
}
function enAnadirMarcados(){
  if (!addEjBtn || !enMulti.length) return;
  const btn = addEjBtn, lista = enMulti.slice();
  enMulti = []; addEjBtn = null;
  closeExercisePicker();
  enInsertarEjercicios(btn, lista);
  toast(lista.length + (lista.length === 1 ? ' ejercicio añadido' : ' ejercicios añadidos'));
}
closeExercisePicker = (function(orig){ return function(){ orig(); const b = document.getElementById('enMultiBar'); if (b) b.hidden = true; }; })(closeExercisePicker);

/* ---------- plantillas ---------- */
const EN_PLANT_KEY = 'fsd_plantillas_ent';
const EN_PLANTILLAS = {
  'Full body · 2 días': [
    ['Full body A', [['Sentadilla', 'cuadriceps'], ['Press banca', 'pecho'], ['Remo con barra', 'espalda'], ['Peso muerto rumano', 'isquios'], ['Press militar con mancuernas', 'hombro'], ['Plancha', 'core']]],
    ['Full body B', [['Prensa de piernas', 'cuadriceps'], ['Jalón al pecho', 'espalda'], ['Press inclinado con mancuernas', 'pecho'], ['Hip thrust', 'gluteo'], ['Elevaciones laterales', 'hombro'], ['Curl femoral', 'isquios']]]],
  'Full body · 3 días': [
    ['Full body A', [['Sentadilla', 'cuadriceps'], ['Press banca', 'pecho'], ['Remo con barra', 'espalda'], ['Curl femoral', 'isquios'], ['Elevaciones laterales', 'hombro']]],
    ['Full body B', [['Peso muerto rumano', 'isquios'], ['Press militar con mancuernas', 'hombro'], ['Jalón al pecho', 'espalda'], ['Zancadas', 'cuadriceps'], ['Curl con mancuernas', 'biceps']]],
    ['Full body C', [['Hip thrust', 'gluteo'], ['Press inclinado con mancuernas', 'pecho'], ['Remo en polea baja', 'espalda'], ['Prensa de piernas', 'cuadriceps'], ['Extensión de tríceps en polea', 'triceps']]]],
  'Torso / Pierna · 4 días': [
    ['Torso', [['Press banca', 'pecho'], ['Remo con barra', 'espalda'], ['Press militar con mancuernas', 'hombro'], ['Jalón al pecho', 'espalda'], ['Curl con mancuernas', 'biceps'], ['Extensión de tríceps en polea', 'triceps']]],
    ['Pierna', [['Sentadilla', 'cuadriceps'], ['Peso muerto rumano', 'isquios'], ['Prensa de piernas', 'cuadriceps'], ['Curl femoral', 'isquios'], ['Elevación de gemelos', 'gemelos']]],
    ['Torso', [['Press inclinado con mancuernas', 'pecho'], ['Remo con mancuerna', 'espalda'], ['Elevaciones laterales', 'hombro'], ['Dominadas asistidas en máquina', 'espalda'], ['Curl martillo', 'biceps'], ['Press francés con barra Z', 'triceps']]],
    ['Pierna', [['Hip thrust', 'gluteo'], ['Sentadilla búlgara', 'cuadriceps'], ['Extensión de cuádriceps', 'cuadriceps'], ['Curl femoral sentado', 'isquios'], ['Plancha', 'core']]]],
  'Empuje / Tirón / Pierna · 3 días': [
    ['Empuje', [['Press banca', 'pecho'], ['Press militar', 'hombro'], ['Press inclinado con mancuernas', 'pecho'], ['Elevaciones laterales', 'hombro'], ['Extensión de tríceps en polea', 'triceps']]],
    ['Tirón', [['Dominadas asistidas en máquina', 'espalda'], ['Remo con barra', 'espalda'], ['Remo en polea baja', 'espalda'], ['Face pull', 'hombro'], ['Curl con barra Z', 'biceps']]],
    ['Pierna', [['Sentadilla', 'cuadriceps'], ['Peso muerto rumano', 'isquios'], ['Prensa de piernas', 'cuadriceps'], ['Curl femoral', 'isquios'], ['Elevación de gemelos', 'gemelos']]]],
  'Weider · 5 días': [
    ['Pecho', [['Press banca', 'pecho'], ['Press inclinado con mancuernas', 'pecho'], ['Aperturas con mancuernas', 'pecho'], ['Cruce de poleas', 'pecho'], ['Fondos en paralelas', 'pecho']]],
    ['Espalda', [['Dominadas', 'espalda'], ['Remo con barra', 'espalda'], ['Jalón al pecho', 'espalda'], ['Remo en polea baja', 'espalda'], ['Pullover en polea', 'espalda']]],
    ['Pierna', [['Sentadilla', 'cuadriceps'], ['Prensa de piernas', 'cuadriceps'], ['Peso muerto rumano', 'isquios'], ['Curl femoral', 'isquios'], ['Hip thrust', 'gluteo'], ['Elevación de gemelos', 'gemelos']]],
    ['Hombro', [['Press militar', 'hombro'], ['Elevaciones laterales', 'hombro'], ['Pájaros con mancuernas', 'hombro'], ['Face pull', 'hombro'], ['Encogimientos con mancuernas', 'espalda']]],
    ['Brazos', [['Curl con barra Z', 'biceps'], ['Press cerrado', 'triceps'], ['Curl martillo', 'biceps'], ['Extensión de tríceps en polea', 'triceps'], ['Curl en polea', 'biceps'], ['Press francés con mancuernas', 'triceps']]]]
};
function enMisPlantillas(){ let l = {}; try { l = JSON.parse(localStorage.getItem(EN_PLANT_KEY) || '{}'); } catch(e){} return l; }
function abrirPlantillas(){
  const o = mjHoja('enPlantillas');
  const mias = enMisPlantillas();
  const fila = function(nombre, propia){
    return '<div class="list-row"><span>' + esc(nombre) + '</span><span class="ajx-acts">'
      + (propia ? '<button class="mini-btn" onclick="enBorrarPlantilla(\'' + esc(nombre).replace(/'/g, "\\'") + '\')">Borrar</button>' : '')
      + '<button class="mini-btn" onclick="enAplicarPlantilla(\'' + esc(nombre).replace(/'/g, "\\'") + '\',' + (propia ? 'true' : 'false') + ')">Usar</button></span></div>';
  };
  o.innerHTML = '<div class="fsd-sheet full"><div class="sheet-head"><h3>Plantillas de entrenamiento</h3><button class="x-btn" onclick="mjCerrarHoja(\'enPlantillas\')" aria-label="Cerrar">×</button></div>'
    + '<p class="ajx-note">Al usar una plantilla se sustituyen las sesiones actuales de este cliente. Luego puedes cambiar todo.</p>'
    + '<div class="section-lbl">Plantillas base</div><div class="list-group">' + Object.keys(EN_PLANTILLAS).map(function(n){ return fila(n, false); }).join('') + '</div>'
    + '<div class="section-lbl">Mis plantillas</div><div class="list-group">' + (Object.keys(mias).length ? Object.keys(mias).map(function(n){ return fila(n, true); }).join('') : '<div class="list-row" style="cursor:default"><span class="ajx-val">Todavía no has guardado ninguna</span></div>') + '</div>'
    + '<button class="btn-eq" style="width:100%;margin-top:12px" onclick="enGuardarPlantilla()">Guardar el plan actual como plantilla</button></div>';
  o.classList.add('show');
}
function enAplicarPlantilla(nombre, propia){
  const hacer = function(){
    if (!coachEditing) editarPlan();
    if (propia) {
      contEnt().innerHTML = mjLimpiarPlanCopiado(enMisPlantillas()[nombre]);
    } else {
      contEnt().innerHTML = '';
      EN_PLANTILLAS[nombre].forEach(function(s){
        addSesion();
        const cards = contEnt().querySelectorAll('.sesion-card'), c = cards[cards.length - 1];
        c.querySelector('.sesion-title').textContent = s[0];
        enInsertarEjercicios(c.querySelector('.add-ej-btn'), s[1].filter(function(e){ return EX_CATALOG.some(function(x){ return x.n === e[0]; }); }).map(function(e){ return { n: e[0], m: e[1] }; }));
      });
    }
    enRenumerar(); enPrepararEdicion(); enTodoSync();
    recalcEntreno(); recalcTonelaje(); programarGuardado();
    mjCerrarHoja('enPlantillas');
    toast('Plantilla aplicada: ' + nombre);
  };
  if (contEnt().querySelector('.sesion-card')) abrirDialogo({ titulo: 'Usar «' + nombre + '»', texto: 'Se sustituirán las sesiones que tiene ahora este cliente.', ok: 'Usar plantilla', onOk: hacer });
  else hacer();
}
function enGuardarPlantilla(){
  if (!contEnt().querySelector('.sesion-card')) { toast('Este cliente aún no tiene sesiones.'); return; }
  const o = mjHoja('enPlantNombre');
  o.innerHTML = '<div class="fsd-sheet dlg"><h3>Guardar como plantilla</h3><div class="field"><label for="enPlNom">Nombre</label><input type="text" id="enPlNom" placeholder="Por ejemplo: Torso/Pierna principiante"></div>'
    + '<div class="btn-row"><button class="btn-eq" onclick="mjCerrarHoja(\'enPlantNombre\')">Cancelar</button><button class="btn-eq btn-eq-p" onclick="enConfirmarPlantilla()">Guardar</button></div></div>';
  o.classList.add('show');
}
function enConfirmarPlantilla(){
  const n = document.getElementById('enPlNom').value.trim();
  if (!n) { toast('Escribe un nombre.'); return; }
  sincronizarInputs(contEnt());
  const l = enMisPlantillas(); l[n] = mjLimpiarPlanCopiado(contEnt().innerHTML);
  try { localStorage.setItem(EN_PLANT_KEY, JSON.stringify(l)); } catch(e){ toast('No se ha podido guardar (memoria llena).'); return; }
  mjCerrarHoja('enPlantNombre'); abrirPlantillas(); toast('Plantilla guardada');
}
function enBorrarPlantilla(n){
  const l = enMisPlantillas(); delete l[n];
  try { localStorage.setItem(EN_PLANT_KEY, JSON.stringify(l)); } catch(e){}
  abrirPlantillas();
}
/* la copia de plantillas propias también limpia las repeticiones hechas */
mjLimpiarPlanCopiado = (function(orig){
  return function(html){
    const t = document.createElement('div'); t.innerHTML = orig(html);
    Array.prototype.forEach.call(t.querySelectorAll('.sr-h'), function(x){ x.removeAttribute('value'); });
    return t.innerHTML;
  };
})(mjLimpiarPlanCopiado);

/* ---------- barra de herramientas del entrenamiento (solo editando) ---------- */
(function(){
  const v = document.getElementById('view-entreno');
  if (!v) return;
  const bar = document.createElement('div');
  bar.id = 'enHerr'; bar.className = 'en-herr';
  bar.innerHTML = '<button type="button" class="btn-eq" onclick="abrirAsistente()">✨ Asistente</button><button type="button" class="btn-eq" onclick="abrirPlantillas()">📋 Plantillas</button><button type="button" class="btn-eq" onclick="addSesion()">+ Día</button>';
  contEnt().parentNode.insertBefore(bar, contEnt());
})();

/* ---------- al cargar un plan: series al día, nombres y colores ---------- */
cargarPlan = (function(orig){
  return function(key){
    orig(key);
    // planes antiguos: «Sesión N / Nueva sesión» pasan a «Día N»
    Array.prototype.forEach.call(contEnt().querySelectorAll('.sesion-card'), function(c, i){
      const t = c.querySelector('.sesion-title'); if (t && t.textContent.trim() === 'Nueva sesión') t.textContent = 'Día ' + (i + 1);
    });
    enRenumerar(); enTodoSync(); enPrepararEdicion();
  };
})(cargarPlan);
goTo = (function(orig){ return function(n, s){ orig(n, s); if (n === 'entreno') { enTodoSync(); enPrepararEdicion(); } }; })(goTo);

/* cambio de semana: también se vacían las repeticiones hechas (se guardan antes en el registro) */
mjCambioDeSemana = (function(orig){
  return function(k){
    const d = clientesData[k];
    const lunes = mjISO(mjLunes());
    if (d && d.semanaRef && d.semanaRef < lunes) enGuardarRegistroSemana(k, d.semanaRef);
    const r = orig(k);
    if (d && d.semanaRef === lunes && r) Array.prototype.forEach.call(contEnt().querySelectorAll('.sr-h'), function(x){ x.value = ''; x.removeAttribute('value'); });
    return r;
  };
})(mjCambioDeSemana);

/* fecha de la última actualización del entrenamiento (para la pestaña de planes) */
function enMarcarActualizado(){
  const d = clienteActual && clientesData[clienteActual];
  if (!d || !coachActivo) return;
  if (vistaActual === 'entreno') d.entAct = { fecha: new Date().toISOString(), por: coachActivo.u };
  if (vistaActual === 'plan') d.nutAct = { fecha: new Date().toISOString(), por: coachActivo.u };
}

/* =========================================================
   7 · Registro de pesos (como la pestaña «REGISTRO PESOS» del Excel)
   d.registro.ej[ejercicio] = [{ sem: 'AAAA-MM-DD' (lunes), s: [[peso, reps], …] }]
   ========================================================= */
function enLeerSeries(it){
  const hech = it.querySelectorAll('.sr-h');
  return enPesos(it).map(function(x, i){
    const p = mjNum(x.value || x.getAttribute('value'));
    const h = hech[i] ? mjNum(hech[i].value || hech[i].getAttribute('value')) : null;
    const r = h != null ? h : mjNum(String(x.dataset.reps || '').split('-')[0]);
    return p != null && p > 0 ? [p, r] : null;
  }).filter(Boolean);
}
function enNombreEj(it){ return ((it.querySelector('.ex-name-cell') || {}).textContent || '').replace(/\s*✎\s*$/, '').trim(); }
function enGuardarRegistroSemana(k, semRef){
  const reg = mjRegistro(k); if (!reg) return;
  reg.ej = reg.ej || {};
  Array.prototype.forEach.call(contEnt().querySelectorAll('.ex-item'), function(it){
    const s = enLeerSeries(it), n = enNombreEj(it);
    if (!s.length || !n) return;
    const l = reg.ej[n] = reg.ej[n] || [];
    if (l.length && l[l.length - 1].sem === semRef) l[l.length - 1].s = s; else l.push({ sem: semRef, s: s });
    if (l.length > 26) reg.ej[n] = l.slice(-26);
  });
}
function enMejorSerie(s){ return s.reduce(function(m, x){ return (!m || x[0] > m[0] || (x[0] === m[0] && (x[1] || 0) > (m[1] || 0))) ? x : m; }, null); }
function enTxtSerie(x){ return x ? fmtNum(x[0]) + '×' + (x[1] != null ? x[1] : '?') : '—'; }
/* cliente: historial de cada ejercicio dentro de su sesión */
enSyncSeries = (function(orig){
  return function(it){
    orig(it);
    const k = clienteActual, reg = k && clientesData[k] && clientesData[k].registro;
    const l = reg && reg.ej && reg.ej[enNombreEj(it)];
    let h = it.querySelector('.en-hist');
    if (!l || !l.length) { if (h) h.remove(); return; }
    if (!h) { h = document.createElement('details'); h.className = 'en-hist'; it.appendChild(h); }
    const ult = l.slice(-4).reverse();
    h.innerHTML = '<summary>📈 Semanas anteriores · la última: ' + enTxtSerie(enMejorSerie(ult[0].s)) + '</summary>'
      + ult.map(function(w){ return '<div class="en-hist-f"><span>' + mjFecha(w.sem).slice(0, 5) + '</span><b>' + w.s.map(enTxtSerie).join(' · ') + '</b></div>'; }).join('');
  };
})(enSyncSeries);
/* profesional: tabla de registro en la ficha (últimas 6 semanas + la actual) */
function enHtmlRegistro(k){
  const d = clientesData[k], reg = d && d.registro && d.registro.ej || {};
  const plan = PLANES[k] && PLANES[k].ent;
  if (!plan) return '<div class="picker-empty">Aún no tiene entrenamiento.</div>';
  const t = document.createElement('div'); t.innerHTML = plan;
  const sems = {};
  Object.keys(reg).forEach(function(n){ reg[n].forEach(function(w){ sems[w.sem] = 1; }); });
  const cols = Object.keys(sems).sort().slice(-6);
  let h = '', hay = false;
  Array.prototype.forEach.call(t.querySelectorAll('.sesion-card'), function(c, ci){
    const tit = ((c.querySelector('.sesion-title') || {}).textContent || 'Día ' + (ci + 1)).trim();
    const filas = Array.prototype.map.call(c.querySelectorAll('.ex-item'), function(it){
      const n = enNombreEj(it), l = reg[n] || [];
      const actual = enMejorSerie(enLeerSeries(it));
      let prev = null;
      const celdas = cols.map(function(s){
        const w = l.filter(function(x){ return x.sem === s; })[0];
        const m = w ? enMejorSerie(w.s) : null;
        const sube = m && prev && m[0] > prev[0];
        if (m) prev = m;
        return '<td' + (sube ? ' class="sube"' : '') + '>' + (m ? enTxtSerie(m) + (sube ? ' 🏆' : '') : '·') + '</td>';
      }).join('');
      const subeA = actual && prev && actual[0] > prev[0];
      if (actual || l.length) hay = true;
      return '<tr><th>' + esc(n) + '</th>' + celdas + '<td class="act' + (subeA ? ' sube' : '') + '">' + (actual ? enTxtSerie(actual) + (subeA ? ' 🏆' : '') : '·') + '</td></tr>';
    }).join('');
    if (!filas) return;
    h += '<div class="en-reg-dia">' + esc(tit) + '</div><div class="en-reg-scroll"><table class="en-reg"><thead><tr><th>Ejercicio</th>'
      + cols.map(function(s){ return '<th>' + mjFecha(s).slice(0, 5) + '</th>'; }).join('') + '<th>Esta semana</th></tr></thead><tbody>' + filas + '</tbody></table></div>';
  });
  if (!h) return '<div class="picker-empty">Aún no tiene ejercicios en el plan.</div>';
  return (hay ? '' : '<p class="ajx-note">Todavía no ha apuntado pesos. Aquí verás la mejor serie de cada semana (peso × repeticiones).</p>') + h;
}
function enPintarRegistroFicha(){
  const k = clienteActual, v = document.getElementById('view-coach-cliente');
  if (!k || !v) return;
  let box = document.getElementById('fichaRegistro');
  if (!box) {
    box = document.createElement('div'); box.id = 'fichaRegistro';
    const ref = document.getElementById('fichaPasos') || document.getElementById('fichaSens');
    ref.parentNode.insertBefore(box, ref);
  }
  box.innerHTML = '<div class="alta-label">Registro de pesos</div>' + enHtmlRegistro(k);
}

/* =========================================================
   8 · Asistente para crear el plan base (por reglas) + «Preparar con Claude»
   ========================================================= */
const EN_SLOTS = {
  fb: ['cuadriceps', 'pecho', 'espalda', 'isquios', 'hombro', 'core', 'gluteo'],
  torso: ['pecho', 'espalda', 'hombro', 'espalda', 'biceps', 'triceps', 'pecho'],
  pierna: ['cuadriceps', 'isquios', 'gluteo', 'cuadriceps', 'gemelos', 'core', 'isquios'],
  empuje: ['pecho', 'hombro', 'pecho', 'hombro', 'triceps', 'triceps', 'pecho'],
  tiron: ['espalda', 'espalda', 'espalda', 'hombro', 'biceps', 'biceps', 'core']
};
const EN_SPLITS = {
  2: [['fb', 'Full body A'], ['fb', 'Full body B']],
  3: [['fb', 'Full body A'], ['fb', 'Full body B'], ['fb', 'Full body C']],
  '3b': [['empuje', 'Empuje'], ['tiron', 'Tirón'], ['pierna', 'Pierna']],
  4: [['torso', 'Torso A'], ['pierna', 'Pierna A'], ['torso', 'Torso B'], ['pierna', 'Pierna B']],
  5: [['torso', 'Torso'], ['pierna', 'Pierna A'], ['empuje', 'Empuje'], ['tiron', 'Tirón'], ['pierna', 'Pierna B']],
  6: [['empuje', 'Empuje A'], ['tiron', 'Tirón A'], ['pierna', 'Pierna A'], ['empuje', 'Empuje B'], ['tiron', 'Tirón B'], ['pierna', 'Pierna B']]
};
const EN_MATERIAL = { gimnasio: null, mancuernas: ['mancuerna', 'corporal', 'banda'], casa: ['corporal', 'banda'], kettlebell: ['kettlebell', 'corporal', 'banda'] };
const EN_EVITAR = {
  hombro: /press militar$|fondos|remo al ment|elevaciones frontales|press tras/i,
  rodilla: /b[uú]lgara|zancada|sissy|^sentadilla$|frontal|zercher|step up|extensi[oó]n de cu[aá]driceps/i,
  lumbar: /peso muerto convencional|peso muerto sumo|buenos d[ií]as|remo con barra|remo pendlay|^sentadilla$|frontal|zercher|hiperextensi/i
};
function abrirAsistente(){
  const k = clienteActual, d = clientesData[k];
  if (!d) return;
  if (!coachEditing) editarPlan();
  const ch = function(g, lista, sel){ return '<div class="chips" data-grupo="' + g + '">' + lista.map(function(x){ return '<button type="button" class="chip protein' + (String(x[0]) === String(sel) ? ' selected' : '') + '" data-v="' + x[0] + '" onclick="mjChip(this)">' + x[1] + '</button>'; }).join('') + '</div>'; };
  const segs = SEGUIMIENTOS[k] || [];
  const o = mjHoja('enAsistente');
  o.innerHTML = '<div class="fsd-sheet full"><div class="sheet-head"><h3>✨ Asistente de entrenamiento</h3><button class="x-btn" onclick="mjCerrarHoja(\'enAsistente\')" aria-label="Cerrar">×</button></div>'
    + '<p class="ajx-note">Crea un plan base para ' + esc(d.nombre) + ' con lo principal. Después ajústalo con tu criterio sesión a sesión.</p>'
    + '<div class="alta-label">Días por semana</div>' + ch('dias', [[2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6']], 3)
    + '<div class="alta-label">Nivel</div>' + ch('nivel', [['principiante', 'Principiante'], ['intermedio', 'Intermedio'], ['avanzado', 'Avanzado']], 'intermedio')
    + '<div class="alta-label">Material</div>' + ch('mat', [['gimnasio', 'Gimnasio completo'], ['mancuernas', 'Mancuernas y bandas'], ['kettlebell', 'Kettlebell'], ['casa', 'En casa sin material']], 'gimnasio')
    + '<div class="alta-label">Tiempo por sesión</div>' + ch('min', [[45, '45 min'], [60, '60 min'], [75, '75 min']], 60)
    + '<div class="alta-label">Objetivo</div>' + ch('obj', MJ_OBJETIVOS.map(function(x){ return [x, x]; }), d.objetivo || 'Mantenimiento')
    + '<div class="alta-label">Prioridad muscular</div>' + ch('prio', [['', 'Ninguna'], ['gluteo', 'Glúteo'], ['pecho', 'Pecho'], ['espalda', 'Espalda'], ['hombro', 'Hombro'], ['brazos', 'Brazos'], ['pierna', 'Pierna']], '')
    + '<div class="alta-label">Molestias o lesiones (se evitan los ejercicios que más cargan esa zona)</div>'
    + '<label class="chk-row"><input type="checkbox" id="enLimHombro"><span>Hombro</span></label><label class="chk-row"><input type="checkbox" id="enLimRodilla"><span>Rodilla</span></label><label class="chk-row"><input type="checkbox" id="enLimLumbar"><span>Zona lumbar</span></label>'
    + '<button class="btn-primary" onclick="enGenerarPlan()">Crear plan base</button>'
    + '<div class="section-lbl" style="margin-top:22px">Con Claude</div>'
    + '<p class="ajx-note">Copia una petición con estos datos' + (segs.length ? ' y su último seguimiento' : '') + ', pégala en Claude y luego pega aquí su respuesta para importarla como sesiones editables.</p>'
    + '<div class="en-ia-btns"><button class="btn-eq" onclick="enCopiarPeticion()">📋 Copiar petición</button><a class="btn-eq" href="https://claude.ai/new" target="_blank" rel="noopener">Abrir Claude ↗</a></div>'
    + '<textarea class="sg-text" id="enIaResp" rows="6" placeholder="Pega aquí la respuesta de Claude (DÍA 1: … / - Ejercicio | series | reps | RIR | nota)"></textarea>'
    + '<button class="btn-eq" style="width:100%;margin-top:8px" onclick="enImportarRespuesta()">Importar respuesta</button></div>';
  o.classList.add('show');
}
function enOpcionesAsistente(){
  const o = document.getElementById('enAsistente');
  const v = function(g){ const c = o.querySelector('[data-grupo="' + g + '"] .chip.selected'); return c ? c.dataset.v : ''; };
  return { dias: +v('dias') || 3, nivel: v('nivel') || 'intermedio', mat: v('mat') || 'gimnasio', min: +v('min') || 60, obj: v('obj') || 'Mantenimiento', prio: v('prio'),
    lim: ['Hombro', 'Rodilla', 'Lumbar'].filter(function(x){ return document.getElementById('enLim' + x).checked; }).map(function(x){ return x.toLowerCase(); }) };
}
function enCandidatos(mus, op){
  const eq = EN_MATERIAL[op.mat];
  return EX_CATALOG.filter(function(e){
    if (e.m !== mus) return false;
    if (eq && eq.indexOf(e.e) < 0) return false;
    return !op.lim.some(function(l){ return EN_EVITAR[l].test(e.n); });
  });
}
function enPautaPara(op, idx){
  const reps = op.obj === 'Perder grasa' ? [12, 15] : (op.obj === 'Ganar músculo' ? [8, 10] : [10, 12]);
  if (op.nivel === 'principiante') return { se: 3, series: [[reps[1], 3], [reps[1], 3], [reps[1], 3]] };
  if (op.nivel === 'avanzado') {
    if (idx < 2) return { se: 4, series: [[reps[0] - 2, 2], [reps[0] - 2, 2], [reps[0] - 2, 1], [reps[0] - 2, 1]] };
    return { se: 3, series: [[reps[1], 2], [reps[1], 1], [reps[1], 0]] };
  }
  if (idx < 2) return { se: 4, series: [[reps[0], 2], [reps[0], 2], [reps[0], 2], [reps[0], 1]] };
  return { se: 3, series: [[reps[1], 2], [reps[1], 2], [reps[1], 2]] };
}
function enGenerarPlan(){
  const op = enOpcionesAsistente();
  const split = EN_SPLITS[op.dias === 3 && op.nivel !== 'principiante' ? '3b' : op.dias];
  const nEj = op.min <= 45 ? 4 : (op.min >= 75 ? 6 : 5);
  const prio = { gluteo: ['gluteo'], pecho: ['pecho'], espalda: ['espalda'], hombro: ['hombro'], brazos: ['biceps', 'triceps'], pierna: ['cuadriceps', 'isquios'] }[op.prio] || [];
  const usados = {};
  const plan = split.map(function(s){
    let slots = EN_SLOTS[s[0]].slice(0, nEj);
    prio.forEach(function(m){ if (EN_SLOTS[s[0]].indexOf(m) > -1 || s[0] === 'fb') slots.push(m); });
    const ej = [];
    slots.forEach(function(m, i){
      const cand = enCandidatos(m, op).filter(function(e){ return !ej.some(function(x){ return x.n === e.n; }); });
      if (!cand.length) return;
      // variedad: en cada día del mismo tipo se usa el siguiente ejercicio de la lista
      const clave = s[0] + '|' + m; usados[clave] = usados[clave] || 0;
      const e = cand[usados[clave] % cand.length]; usados[clave]++;
      const p = enPautaPara(op, ej.length);
      ej.push({ n: e.n, m: e.m, pauta: [p.se, p.series[0][0], p.series[0][1]], series: p.series });
    });
    return [s[1], ej];
  });
  enAplicarPlanGenerado(plan);
  mjCerrarHoja('enAsistente');
  toast('Plan base creado: ' + plan.length + ' días. Ajústalo a tu criterio.');
}
function enAplicarPlanGenerado(plan){
  const hacer = function(){
    if (!coachEditing) editarPlan();
    contEnt().innerHTML = '';
    plan.forEach(function(s, i){
      addSesion();
      const cards = contEnt().querySelectorAll('.sesion-card'), c = cards[cards.length - 1];
      c.querySelector('.sesion-title').textContent = String(s[0]).replace(/^d[ií]a\s*\d+\s*[·:.\-–]?\s*/i, '') || 'Día ' + (i + 1);
      enInsertarEjercicios(c.querySelector('.add-ej-btn'), s[1]);
    });
    enRenumerar(); enPrepararEdicion(); enTodoSync();
    recalcEntreno(); recalcTonelaje(); programarGuardado();
  };
  hacer();
}
function enPeticionClaude(){
  const k = clienteActual, d = clientesData[k], op = enOpcionesAsistente();
  const ult = (SEGUIMIENTOS[k] || [])[0];
  const sens = sensDe(k).filter(function(x){ return x.area === 'ent'; }).slice(0, 3);
  const lin = [];
  lin.push('Eres un entrenador personal experto. Prepara un plan de entrenamiento de fuerza semanal para este cliente.');
  lin.push('');
  lin.push('DATOS DEL CLIENTE');
  lin.push('- Objetivo: ' + op.obj);
  lin.push('- Nivel: ' + op.nivel);
  lin.push('- Días por semana: ' + op.dias + ' · Tiempo por sesión: ' + op.min + ' min');
  lin.push('- Material: ' + { gimnasio: 'gimnasio completo', mancuernas: 'mancuernas y bandas', kettlebell: 'kettlebell', casa: 'en casa sin material' }[op.mat]);
  if (op.prio) lin.push('- Prioridad muscular: ' + op.prio);
  if (op.lim.length) lin.push('- Molestias: ' + op.lim.join(', ') + ' (evita los ejercicios que más cargan esas zonas)');
  const peso = nuPesoCliente(k); if (peso) lin.push('- Peso: ' + fmtNum(peso) + ' kg');
  if (ult) lin.push('- Último seguimiento: entreno ' + ult.e + '/10, motivación ' + ult.m + '/5, estrés ' + ult.x + '/10' + (ult.pasos != null ? ', ' + fmtPasos(ult.pasos) + ' pasos/día' : '') + (ult.prog ? '. Progreso: «' + ult.prog + '»' : ''));
  sens.forEach(function(s){ if (s.txt) lin.push('- Sensación reciente (' + cuandoSens(s) + '): «' + s.txt + '»'); });
  lin.push('');
  lin.push('NORMAS');
  lin.push('- Intensidad con RIR (repeticiones en reserva): 0-2 alta, 3-4 media, 5 o más baja.');
  lin.push('- Entre 4 y 6 ejercicios por sesión. Puedes poner repeticiones y RIR distintos en cada serie.');
  lin.push('- Si usas técnicas de intensidad (drop set, rest-pause, myo-reps, superserie), indícalo en la nota.');
  lin.push('');
  lin.push('RESPONDE SOLO CON ESTE FORMATO, SIN NADA MÁS:');
  lin.push('DÍA 1: Nombre del día');
  lin.push('- Ejercicio | series | repeticiones por serie separadas por comas | RIR por serie separados por comas | nota opcional');
  lin.push('Ejemplo:');
  lin.push('DÍA 1: Torso');
  lin.push('- Press banca | 4 | 8,8,6,6 | 2,2,1,1 | ');
  lin.push('- Remo con mancuerna | 3 | 10 | 2 | última serie drop set');
  return lin.join('\n');
}
function enCopiarPeticion(){
  const t = enPeticionClaude();
  const ok = function(){ toast('Petición copiada. Pégala en Claude.'); };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function(){ enCopiaManual(t); });
  else enCopiaManual(t);
}
function enCopiaManual(t){
  const a = document.getElementById('enIaResp');
  a.value = t; a.focus(); a.select();
  toast('Selecciona y copia el texto del cuadro (luego bórralo y pega la respuesta).');
}
function enBuscarEjercicio(nombre){
  const n = norm(nombre.trim());
  let e = EX_CATALOG.filter(function(x){ return norm(x.n) === n; })[0];
  if (!e) e = EX_CATALOG.filter(function(x){ return norm(x.n).indexOf(n) === 0 || n.indexOf(norm(x.n)) === 0; }).sort(function(a, b){ return b.n.length - a.n.length; })[0];
  if (!e) e = EX_CATALOG.filter(function(x){ return norm(x.n).indexOf(n) > -1 || n.indexOf(norm(x.n)) > -1; })[0];
  return e || null;
}
function enParsearRespuesta(txt){
  const dias = []; let cur = null;
  String(txt || '').split(/\r?\n/).forEach(function(l){
    const s = l.trim().replace(/^\*+|\*+$/g, '').replace(/\*\*/g, '');
    if (!s) return;
    const m = s.match(/^(?:#+\s*)?d[ií]a\s*(\d+)\s*[:.\-–]?\s*(.*)$/i);
    if (m) { cur = [m[2] ? m[2].trim() : '', []]; dias.push(cur); return; }
    if (!cur || !/^[-•*\d]/.test(s) || s.indexOf('|') < 0) return;
    const p = s.replace(/^[-•*]\s*|^\d+[.)]\s*/, '').split('|').map(function(x){ return x.trim(); });
    if (!p[0]) return;
    const se = Math.max(1, Math.min(10, parseInt(p[1], 10) || 3));
    const lista = function(v, def){ const a = String(v || '').split(/[,;/]|\s+-\s+/).map(function(x){ return mjNum(x.replace(/[^0-9.,]/g, '')); }).filter(function(x){ return x != null; }); return a.length ? a : [def]; };
    const reps = lista(p[2], 10), rir = lista(p[3], 2);
    const series = []; for (let i = 0; i < se; i++) series.push([reps[Math.min(i, reps.length - 1)], rir[Math.min(i, rir.length - 1)]]);
    const e = enBuscarEjercicio(p[0]);
    cur[1].push({ n: e ? e.n : p[0], m: e ? e.m : 'core', nuevo: !e, pauta: [se, series[0][0], series[0][1]], series: series, nota: p[4] || '' });
  });
  return dias.filter(function(d){ return d[1].length; });
}
function enImportarRespuesta(){
  const plan = enParsearRespuesta(document.getElementById('enIaResp').value);
  if (!plan.length) { toast('No encuentro días ni ejercicios. Revisa que la respuesta tenga el formato pedido.'); return; }
  const nuevos = [];
  plan.forEach(function(d){ d[1].forEach(function(e){ if (e.nuevo && nuevos.indexOf(e.n) < 0) nuevos.push(e.n); }); });
  const n = plan.reduce(function(s, d){ return s + d[1].length; }, 0);
  abrirDialogo({ titulo: 'Importar plan', texto: plan.length + ' días y ' + n + ' ejercicios.' + (nuevos.length ? '\n\nNo están en el catálogo y se añaden como propios: ' + nuevos.join(', ') + '.' : '') + '\n\nSe sustituyen las sesiones actuales.', ok: 'Importar',
    onOk: function(){
      nuevos.forEach(function(n){ if (!EX_CATALOG.some(function(e){ return e.n === n; })) EX_CATALOG.push({ n: n, m: 'core', e: 'corporal', custom: true }); });
      if (nuevos.length) try { localStorage.setItem(EN_EJ_KEY, JSON.stringify(EX_CATALOG.filter(function(e){ return e.custom; }).map(function(e){ return { n: e.n, m: e.m, e: e.e }; }))); } catch(e){}
      enAplicarPlanGenerado(plan.map(function(d, i){ return [d[0] || 'Día ' + (i + 1), d[1]]; })); mjCerrarHoja('enAsistente'); toast('Plan importado. Revísalo y ajústalo.'); } });
}
atrasDentroApp = (function(orig){
  return function(){
    const capas = ['enAsistente', 'enPlantillas', 'enPlantNombre'];
    for (let i = 0; i < capas.length; i++) if (capaVisible(capas[i])) { mjCerrarHoja(capas[i]); return true; }
    return orig();
  };
})(atrasDentroApp);

/* =========================================================
   9 · Barra de abajo según el rol:  Clientes · Entrenos|Nutrición · Chats · Seguimientos · Más
   10 · Pestaña de planes: cada cliente con el estado de su plan; se abre listo para editar
   ========================================================= */
topScreens.push('view-coach-planes', 'view-coach-mas');
PANTALLAS_CON_TABS.push('view-coach-planes', 'view-coach-mas');
(function(){
  const nav = document.getElementById('coachTabs');
  const chats = document.getElementById('ctab-chats');
  const b = document.createElement('button');
  b.className = 'tbi'; b.id = 'ctab-planes'; b.setAttribute('onclick', "abrirTabPro('planes')");
  b.innerHTML = '<span class="tbi-emo" aria-hidden="true" id="ctabPlanesEmo">🏋️</span><span id="ctabPlanesTxt">ENTRENOS</span>';
  nav.insertBefore(b, chats);
  const m = document.createElement('button');
  m.className = 'tbi'; m.id = 'ctab-mas'; m.setAttribute('onclick', "abrirTabPro('mas')"); m.setAttribute('aria-label', 'Más: pagos y ajustes');
  m.innerHTML = '<span class="tbi-emo" aria-hidden="true">☰</span>MÁS<span class="tab-badge rojo" id="ctabMasN" hidden>0</span>';
  nav.appendChild(m);
  ['ctab-pagos', 'ctab-ajustes'].forEach(function(id){ const x = document.getElementById(id); if (x) x.hidden = true; });
  ['view-coach-planes', 'view-coach-mas'].forEach(function(id){
    const top = document.querySelector('#' + id + ' .alta-top');
    const bell = document.createElement('button');
    bell.className = 'bell mj-bell'; bell.setAttribute('aria-label', 'Notificaciones'); bell.style.order = '3';
    bell.onclick = function(){ abrirNotisCoach(); };
    bell.innerHTML = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg><span class="bell-badge hide mj-bell-badge">0</span>';
    top.appendChild(bell);
  });
})();
function enVistaRol(){ return coachActivo && coachActivo.rol === 'dietista' ? 'plan' : 'entreno'; }
function enPintarTabRol(){
  const nutri = coachActivo && coachActivo.rol === 'dietista';
  setTxt('ctabPlanesTxt', nutri ? 'NUTRICIÓN' : 'ENTRENOS');
  setTxt('ctabPlanesEmo', nutri ? '🍕' : '🏋️');
  const b = document.getElementById('ctab-planes'); if (b) b.setAttribute('aria-label', nutri ? 'Planes de nutrición' : 'Planes de entrenamiento');
}
let enPlanDesdeTab = false;
function enEstadoPlan(k){
  const d = clientesData[k], vista = enVistaRol();
  const html = PLANES[k] && (vista === 'entreno' ? PLANES[k].ent : PLANES[k].nut);
  const t = document.createElement('div'); t.innerHTML = html || '';
  const act = vista === 'entreno' ? d.entAct : (d.nutAct || (d.nutObj && d.nutObj.fecha ? { fecha: d.nutObj.fecha, por: d.nutObj.por } : null));
  const ult = (SEGUIMIENTOS[k] || [])[0];
  const r = { k: k, d: d, act: act };
  if (vista === 'entreno') {
    const ses = t.querySelectorAll('.sesion-card').length, ej = t.querySelectorAll('.ex-item').length;
    r.vacio = !ses; r.resumen = ses ? ses + (ses === 1 ? ' día' : ' días') + ' · ' + ej + (ej === 1 ? ' ejercicio' : ' ejercicios') : 'Sin sesiones';
  } else {
    const n = t.querySelectorAll('.meal-block').length, o = nuObjetivoDe(k);
    r.vacio = !n; r.resumen = (o ? fmtMil(Math.round(o.kcal)) + ' kcal · ' : 'Sin objetivo · ') + n + (n === 1 ? ' comida' : ' comidas');
  }
  const dias = act ? Math.floor((Date.now() - new Date(act.fecha).getTime()) / DIA_MS) : null;
  if (r.vacio) { r.cod = 'vacio'; r.txt = 'Sin plan'; }
  else if (ult && act && new Date(ult.fecha) > new Date(act.fecha)) { r.cod = 'revisar'; r.txt = 'Seguimiento nuevo desde el último cambio'; }
  else if (dias != null && dias >= 21) { r.cod = 'revisar'; r.txt = 'Sin cambios hace ' + dias + ' días'; }
  else { r.cod = 'ok'; r.txt = act ? 'Actualizado ' + (dias === 0 ? 'hoy' : (dias === 1 ? 'ayer' : 'hace ' + dias + ' días')) + (act.por ? ' · ' + act.por : '') : 'Al día'; }
  return r;
}
function enPintarPlanes(){
  const cont = document.getElementById('planesPro'); if (!cont) return;
  const nutri = enVistaRol() === 'plan';
  setTxt('planesTit', nutri ? 'Planes de nutrición' : 'Planes de entrenamiento');
  setTxt('planesWho', coachActivo ? coachActivo.u + ' · ' + coachActivo.rol : '');
  const orden = { vacio: 0, revisar: 1, ok: 2 };
  const lista = Object.keys(clientesData).filter(function(k){ return !mjEsBaja(clientesData[k]); }).map(enEstadoPlan)
    .sort(function(a, b){ return orden[a.cod] - orden[b.cod] || (a.d.nombre || '').localeCompare(b.d.nombre || '', 'es'); });
  const n = function(c){ return lista.filter(function(x){ return x.cod === c; }).length; };
  let h = '<div class="panel-stats"><div class="panel-stat"><div class="val' + (n('vacio') ? ' warn' : '') + '">' + n('vacio') + '</div><div class="lbl">Sin plan</div></div>'
    + '<div class="panel-stat"><div class="val' + (n('revisar') ? ' warn' : '') + '">' + n('revisar') + '</div><div class="lbl">Toca revisar</div></div>'
    + '<div class="panel-stat"><div class="val">' + n('ok') + '</div><div class="lbl">Al día</div></div></div>';
  if (!lista.length) h += '<div class="vacio"><b>Todavía no hay clientes</b><span>Cuando des de alta a alguien, aparecerá aquí.</span></div>';
  h += '<div class="planes-lista">' + lista.map(function(x){
    return '<button type="button" class="plan-fila ' + x.cod + '" onclick="enAbrirPlanDesdeTab(\'' + x.k + '\')">'
      + '<div class="plan-fila-top"><b>' + esc(x.d.nombre) + '</b><span class="plan-est ' + x.cod + '">' + esc(x.cod === 'ok' ? 'Al día' : (x.cod === 'vacio' ? 'Sin plan' : 'Revisar')) + '</span></div>'
      + '<div class="plan-fila-sub">' + esc(x.resumen) + ' · ' + esc(x.d.objetivo || '') + '</div>'
      + '<div class="plan-fila-est">' + esc(x.txt) + '</div><span class="plan-fila-cta">' + (x.vacio ? 'Crear plan ›' : 'Editar ›') + '</span></button>';
  }).join('') + '</div>';
  cont.innerHTML = h;
}
function enAbrirPlan(k, desdeTab){
  goToCliente(k);
  enPlanDesdeTab = !!desdeTab;
  abrirVistaCliente(enVistaRol());
  if (!coachEditing) editarPlan();                 // listo para editar, sin pulsar «Editar»
}
function enAbrirPlanDesdeTab(k){ enAbrirPlan(k, true); }
/* «Más»: pagos y ajustes */
function enPintarMas(){
  const c = document.getElementById('masPro'); if (!c) return;
  setTxt('masWho', coachActivo ? coachActivo.u + ' · ' + coachActivo.rol : '');
  const np = document.getElementById('ctabPagosN');
  const n = np && !np.hidden ? np.textContent : '';
  c.innerHTML = '<div class="list-group">'
    + '<div class="list-row" onclick="abrirTabPro(\'pagos\')"><span>💳 Pagos clientes</span><span class="ajx-acts">' + (n ? '<span class="pill pill-nuevo">' + n + '</span>' : '') + '<span class="chev">›</span></span></div>'
    + '<div class="list-row" onclick="abrirTabPro(\'ajustes\')"><span>⚙️ Ajustes</span><span class="chev">›</span></div>'
    + '<div class="list-row" onclick="abrirTabPro(\'planes\'); setTimeout(function(){},0)"><span>' + (enVistaRol() === 'plan' ? '🍕 Planes de nutrición' : '🏋️ Planes de entrenamiento') + '</span><span class="chev">›</span></div>'
    + '</div>';
}
abrirTabPro = (function(orig){
  return function(t){
    if (t === 'planes' || t === 'mas') {
      tabProActual = t;
      navDir = 'tab';
      try { if (t === 'planes') { enPintarPlanes(); showScreen('view-coach-planes'); } else { enPintarMas(); showScreen('view-coach-mas'); } } finally { navDir = null; }
      pintarTabsPro();
      const bd = document.querySelector('#view-coach-' + t + ' .alta-body'); if (bd) bd.scrollTop = 0;
      return;
    }
    orig(t);
  };
})(abrirTabPro);
pintarTabsPro = (function(orig){
  return function(){
    orig();
    enPintarTabRol();
    const t = tabProActual;
    const marca = { planes: 'ctab-planes', mas: 'ctab-mas', pagos: 'ctab-mas', ajustes: 'ctab-mas' }[t];
    ['ctab-planes', 'ctab-mas'].forEach(function(id){ const b = document.getElementById(id); if (b) b.classList.toggle('active', id === marca); });
    if (marca === 'ctab-mas') ['ctab-pagos', 'ctab-ajustes'].forEach(function(id){ const b = document.getElementById(id); if (b) b.classList.remove('active'); });
    const np = document.getElementById('ctabPagosN'), nm = document.getElementById('ctabMasN');
    if (np && nm) { nm.hidden = np.hidden; nm.textContent = np.textContent; }
  };
})(pintarTabsPro);
entrarAlPanel = (function(orig){ return function(){ orig(); enPintarTabRol(); pintarTabsPro(); }; })(entrarAlPanel);
/* atrás: Pagos y Ajustes vuelven a «Más»; el plan abierto desde la pestaña vuelve a ella */
atrasPorNiveles = (function(orig){
  return function(){
    const vis = pantallaVisible();
    if (coachActivo && (vis === 'view-coach-pagos' || vis === 'view-coach-ajustes')) { abrirTabPro('mas'); return; }
    if (coachActivo && vis === 'app' && enPlanDesdeTab && document.getElementById('coachBar').classList.contains('show')) {
      enPlanDesdeTab = false; backToCliente(); abrirTabPro('planes'); return;
    }
    if (coachActivo && vis === 'view-coach-cliente' && (tabProActual === 'planes' || tabProActual === 'mas')) { abrirTabPro(tabProActual); return; }
    orig();
  };
})(atrasPorNiveles);
goToCliente = (function(orig){ return function(k){ enPlanDesdeTab = false; orig(k); }; })(goToCliente);
/* el plan abierto con las flechas ‹ › sigue en modo edición */
nuOtroCliente = (function(orig){
  return function(dir){
    const ed = coachEditing, desde = enPlanDesdeTab;
    orig(dir);
    enPlanDesdeTab = desde;
    if (ed && !coachEditing) editarPlan();
  };
})(nuOtroCliente);
/* mientras se edita, todo se guarda solo */
document.addEventListener('click', function(e){
  if (coachEditing && e.target.closest && e.target.closest('#sesionesCont, #comidasCont, #enHerr')) programarGuardado();
}, true);

/* =========================================================
   11 · Ficha del cliente: accesos grandes arriba y apartados como las pestañas del Excel
   ========================================================= */
(function(){
  const v = document.getElementById('view-coach-cliente');
  if (!v) return;
  const body = v.querySelector('.alta-body');
  const acc = document.createElement('div');
  acc.id = 'fichaAccesos'; acc.className = 'ficha-accesos';
  body.insertBefore(acc, body.firstChild);
  const sec = document.createElement('div');
  sec.id = 'fichaSecciones'; sec.className = 'chips ficha-secciones'; sec.setAttribute('role', 'tablist');
  const meta = document.getElementById('cd-meta');
  body.insertBefore(sec, meta ? meta.nextSibling : acc.nextSibling);
  const vb = document.getElementById('fichaChatBtn'); if (vb) vb.hidden = true;
})();
const EN_SECCIONES = [['todo', 'Todo'], ['datos', 'Datos y medidas'], ['segui', 'Seguimiento'], ['entreno', 'Entrenamiento'], ['registro', 'Registro de pesos'], ['nutri', 'Nutrición'], ['pago', 'Suscripción']];
let enSeccion = 'todo';
function enPintarAccesos(){
  const a = document.getElementById('fichaAccesos'); if (!a || !clienteActual) return;
  const k = clienteActual;
  const msgs = msgsSinLeer(k), segs = segsSinVer(k);
  const esp = esperaDesde(k), rojo = esp && horasDesde(esp) >= ESPERA_ROJA_H;
  const bt = {
    entreno: '<button type="button" class="acc-btn" onclick="enAbrirPlan(clienteActual)"><span aria-hidden="true">🏋️</span>Entreno</button>',
    nutri: '<button type="button" class="acc-btn" onclick="enAbrirPlanNutri()"><span aria-hidden="true">🍽️</span>Nutrición</button>',
    chat: '<button type="button" class="acc-btn' + (rojo ? ' rojo' : '') + '" onclick="verConversacion()"><span aria-hidden="true">💬</span>Chat' + (msgs ? '<i class="acc-n">' + msgs + '</i>' : '') + '</button>',
    segs: '<button type="button" class="acc-btn" onclick="goToSeguimientos()"><span aria-hidden="true">📋</span>Seguimientos' + (segs ? '<i class="acc-n">' + segs + '</i>' : '') + '</button>'
  };
  const orden = coachActivo && coachActivo.rol === 'dietista' ? ['nutri', 'entreno', 'chat', 'segs'] : ['entreno', 'nutri', 'chat', 'segs'];
  a.innerHTML = orden.map(function(x){ return bt[x]; }).join('');
}
function enAbrirPlanNutri(){
  const k = clienteActual;
  goToCliente(k);
  abrirVistaCliente('plan');
  if (!coachEditing) editarPlan();
}
enAbrirPlan = (function(orig){
  return function(k, desdeTab){
    if (desdeTab) { orig(k, true); return; }
    goToCliente(k); abrirVistaCliente('entreno'); if (!coachEditing) editarPlan();
  };
})(enAbrirPlan);
enAbrirPlanDesdeTab = function(k){
  goToCliente(k);
  enPlanDesdeTab = true;
  abrirVistaCliente(enVistaRol());
  if (!coachEditing) editarPlan();
};
function enSeccionDe(el){
  const id = el.id || '';
  if (id === 'fichaAccesos' || id === 'fichaSecciones' || id === 'cd-meta') return 'siempre';
  if (id === 'fichaNutri') return 'nutri';
  if (id === 'fichaSens' || id === 'fichaPasos') return 'segui';
  if (id === 'fichaRegistro') return 'registro';
  if (id === 'fichaPago') return 'pago';
  if (id === 'fichaEntrenoRes') return 'entreno';
  if (el.classList.contains('tonelaje-card')) return 'entreno';
  if (el.classList.contains('stat-row')) return el.querySelector('#cd-adhE') ? 'segui' : 'datos';
  return 'datos';
}
function enAplicarSeccion(){
  const v = document.getElementById('view-coach-cliente'); if (!v) return;
  const body = v.querySelector('.alta-body');
  let grupoGestion = false;
  Array.prototype.forEach.call(body.children, function(el){
    let s = enSeccionDe(el);
    if (el.classList.contains('alta-label') && /Gestión/.test(el.textContent)) grupoGestion = true;
    if (grupoGestion && (el.classList.contains('alta-label') || el.classList.contains('list-group'))) s = 'datos';
    el.classList.toggle('sec-oculta', !(s === 'siempre' || enSeccion === 'todo' || s === enSeccion));
  });
  const sec = document.getElementById('fichaSecciones');
  if (sec) sec.innerHTML = EN_SECCIONES.map(function(x){
    return '<button type="button" role="tab" aria-selected="' + (enSeccion === x[0]) + '" class="chip protein' + (enSeccion === x[0] ? ' selected' : '') + '" onclick="enIrSeccion(\'' + x[0] + '\')">' + x[1] + '</button>';
  }).join('');
}
function enIrSeccion(s){ enSeccion = s; enAplicarSeccion(); }
/* resumen del entrenamiento en la ficha */
function enPintarEntrenoFicha(){
  const k = clienteActual, v = document.getElementById('view-coach-cliente'); if (!k || !v) return;
  let box = document.getElementById('fichaEntrenoRes');
  if (!box) {
    box = document.createElement('div'); box.id = 'fichaEntrenoRes';
    const ton = v.querySelector('.tonelaje-card'); ton.parentNode.insertBefore(box, ton.nextSibling);
  }
  const html = PLANES[k] && PLANES[k].ent;
  const t = document.createElement('div'); t.innerHTML = html || '';
  const ses = Array.prototype.map.call(t.querySelectorAll('.sesion-card'), function(c, i){
    const ej = Array.prototype.map.call(c.querySelectorAll('.ex-item'), function(it){
      const p = enPesos(it), rir = p.map(function(x){ return x.dataset.rir; });
      const min = rir.map(mjNum).filter(function(x){ return x != null; });
      const r0 = min.length ? Math.min.apply(null, min) : null;
      return '<span class="fe-ej">' + esc(enNombreEj(it)) + ' <small>' + p.length + '×' + esc(p[0] ? p[0].dataset.reps : '') + '</small>' + (r0 != null ? '<b class="sr-badge ' + enRir(r0) + '">RIR ' + r0 + '</b>' : '') + '</span>';
    });
    return '<div class="fe-dia"><b>' + esc(((c.querySelector('.sesion-title') || {}).textContent || 'Día ' + (i + 1)).trim()) + (c.classList.contains('hecha') ? ' ✓' : '') + '</b>' + (ej.length ? ej.join('') : '<span class="fe-ej">Sin ejercicios</span>') + '</div>';
  });
  const st = enEstadoPlanRol(k, 'entreno');
  box.innerHTML = '<div class="alta-label">Entrenamiento</div><div class="fe-card" onclick="enAbrirPlan(clienteActual)" role="button" tabindex="0">'
    + '<div class="fe-top"><span>' + esc(st) + '</span><span class="lnk">Editar ›</span></div>' + (ses.length ? ses.join('') : '<div class="picker-empty">Todavía no tiene sesiones.</div>') + '</div>';
}
function enEstadoPlanRol(k, vista){
  const d = clientesData[k], act = vista === 'entreno' ? d.entAct : d.nutAct;
  if (!act) return vista === 'entreno' ? 'Plan de entrenamiento' : 'Plan nutricional';
  const dias = Math.floor((Date.now() - new Date(act.fecha).getTime()) / DIA_MS);
  return 'Actualizado ' + (dias === 0 ? 'hoy' : (dias === 1 ? 'ayer' : 'hace ' + dias + ' días')) + (act.por ? ' por ' + act.por : '');
}
function enPintarFicha(){
  if (!coachActivo || !clienteActual) return;
  enPintarAccesos(); enPintarEntrenoFicha(); enPintarRegistroFicha(); enAplicarSeccion();
}
(function(){
  const sh = showScreen;
  showScreen = function(id){ sh(id); if (id === 'view-coach-cliente') enPintarFicha(); if (id === 'view-coach-planes') enPintarPlanes(); };
})();
goToCliente = (function(orig){ return function(k){ const cambia = k !== clienteActual; orig(k); if (cambia) enSeccion = 'todo'; enPintarFicha(); }; })(goToCliente);
/* tarjeta de cada cliente: botón directo a su plan */
pintarListaClientes = (function(orig){
  return function(){
    orig();
    if (!coachActivo) return;
    const claves = Object.keys(clientesData), nutri = coachActivo.rol === 'dietista';
    Array.prototype.forEach.call(document.querySelectorAll('#listaClientes .cliente-card'), function(card, i){
      const k = claves[i]; if (!k || mjEsBaja(clientesData[k])) return;
      if (card.querySelector('.kc-plan-btn')) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'kc-plan-btn';
      b.textContent = nutri ? '🍽️ Plan' : '🏋️ Entreno';
      b.onclick = function(e){ e.stopPropagation(); if (nutri) { goToCliente(k); enAbrirPlanNutri(); } else enAbrirPlan(k); };
      const est = card.querySelector('.kc-estado, .adh-badge');
      const top = card.querySelector('.kc-top') || card;
      top.appendChild(b);
    });
  };
})(pintarListaClientes);
actualizarPanel();
