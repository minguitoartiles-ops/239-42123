/* =========================================================
   Fitnessindramas — Cardio en el creador de rutinas (21/10/2026)
   - Ejercicios nuevos en la base: máquinas de cardio, exterior y metabólicos (grupo «Cardio»).
   - Cada ejercicio de cardio se pauta:
       · Por tiempo: minutos + intensidad (Zona 2, RPE 6…)
       · Intervalos / SIIT / HIIT: trabajo (s) / descanso (s) × rondas + intensidad
       · Por series: como un ejercicio de fuerza (reps o segundos en la columna de reps)
     Se guarda en el propio ejercicio: data-cardio="tiempo|int|series", data-cd-min, data-cd-int,
     data-cd-trab, data-cd-desc, data-cd-rondas; el cliente lo marca como hecho (data-cd-ok).
   - Circuitos de fuerza + cardio: tipo de grupo «Circuito» en «⚡ Técnica» (vueltas y descanso),
     además de EMOM, AMRAP, Tabata e Intervalos que ya existían.
   ========================================================= */
MUS_LABEL.cardio = 'Cardio';
REGION.cardio = 'cardio';
EQ_LABEL.cardio = 'Máquina de cardio';
EQ_LABEL.exterior = 'Exterior';
EQ_LABEL.metab = 'Metabólico';
EQ_FILTERS.push('cardio', 'exterior', 'metab');
[
  ['Cinta de correr', 'cardio', 'Ritmo constante o por cambios. Pisa con la mitad del pie y braceo relajado.'],
  ['Caminar en cinta inclinada', 'cardio', 'Pendiente del 8-15 %, paso firme y sin agarrarte a la barra.'],
  ['Bicicleta estática', 'cardio', 'Sillín a la altura de la cadera, rodilla casi estirada abajo. Cadencia estable.'],
  ['Bici de spinning', 'cardio', 'Ajusta la resistencia según la pauta: llano, subida o sprint.'],
  ['Elíptica', 'cardio', 'Postura erguida, empuja y tira con brazos y piernas. Bajo impacto.'],
  ['Remo ergómetro', 'cardio', 'Piernas, tronco y brazos, en ese orden. Vuelve en orden inverso.'],
  ['Escaladora', 'cardio', 'Escalones completos, sin apoyar el peso en los brazos.'],
  ['Assault bike', 'cardio', 'Brazos y piernas a la vez. Ideal para intervalos muy intensos.'],
  ['SkiErg', 'cardio', 'Tira desde arriba con brazos y tronco, flexionando cadera y rodillas.'],
  ['Caminar', 'exterior', 'Paso ligero; mantén una intensidad en la que puedas hablar.'],
  ['Correr', 'exterior', 'Ritmo cómodo salvo que la pauta diga otra cosa. Zancada corta y ligera.'],
  ['Bicicleta (exterior)', 'exterior', 'Cadencia constante; sube marchas en vez de forzar con piernas.'],
  ['Natación', 'exterior', 'Estilo libre o el que domines; respira cada 2-3 brazadas.'],
  ['Subir escaleras', 'exterior', 'Peldaño a peldaño, tronco erguido; baja con calma.'],
  ['Senderismo', 'exterior', 'Ritmo sostenido; en subida acorta el paso.'],
  ['Sprints', 'exterior', 'Esfuerzo máximo el tiempo indicado; recupera caminando.'],
  ['Burpees', 'metab', 'Agáchate, salta atrás a plancha, vuelve y salta arriba. Ritmo constante.'],
  ['Comba', 'metab', 'Saltos cortos sobre la punta del pie; las muñecas giran la cuerda.'],
  ['Jumping jacks', 'metab', 'Abre piernas y brazos a la vez; aterriza suave.'],
  ['Mountain climbers', 'metab', 'En plancha, lleva rodillas al pecho alternando, cadera baja.'],
  ['Kettlebell swing', 'metab', 'Bisagra de cadera, empuja con glúteos; la pesa sube por inercia.'],
  ['Battle ropes', 'metab', 'Ondas alternas o simultáneas; rodillas flexionadas y tronco firme.'],
  ['Empuje de trineo', 'metab', 'Cuerpo inclinado, brazos firmes, pasos cortos y potentes.'],
  ['Saltos al cajón', 'metab', 'Salta con los dos pies y aterriza suave; baja caminando.'],
  ['Thrusters con mancuernas', 'metab', 'Sentadilla frontal y press arriba en un solo movimiento.'],
  ['Wall balls', 'metab', 'Sentadilla y lanza el balón a la diana; recíbelo y repite.'],
  ['Skipping', 'metab', 'Rodillas altas alternas a ritmo rápido, braceo activo.']
].forEach(function(x){ if (!EX_CATALOG.some(function(e){ return norm(e.n) === norm(x[0]); })) EX_CATALOG.push({ n: x[0], m: 'cardio', e: x[1], d: x[2] }); });

const CD_PRESETS = [
  ['HIIT 30/30 × 10', { trab: 30, desc: 30, rondas: 10, int: 'RPE 8-9' }],
  ['SIIT 20 s / 2 min × 6', { trab: 20, desc: 120, rondas: 6, int: 'Sprint máximo' }],
  ['Tabata 20/10 × 8', { trab: 20, desc: 10, rondas: 8, int: 'Máximo esfuerzo' }],
  ['1 min / 1 min × 10', { trab: 60, desc: 60, rondas: 10, int: 'RPE 7-8' }]
];
function cdCat(it){ const n = norm(enNombreEj(it) || ''); return EX_CATALOG.filter(function(e){ return norm(e.n) === n; })[0] || null; }
function cdSeg(s){ s = +s || 0; return s >= 60 && s % 60 === 0 ? (s / 60) + ' min' : (s >= 60 ? Math.floor(s / 60) + ' min ' + (s % 60) + ' s' : s + ' s'); }
function cdTexto(it){
  const d = it.dataset;
  if (d.cardio === 'tiempo') return (d.cdMin || '—') + ' min' + (d.cdInt ? ' · ' + d.cdInt : '');
  if (d.cardio === 'int') {
    const r = +d.cdRondas || 0, tot = r * ((+d.cdTrab || 0) + (+d.cdDesc || 0));
    return r + ' × ' + cdSeg(d.cdTrab) + ' trabajo / ' + cdSeg(d.cdDesc) + ' descanso' + (d.cdInt ? ' · ' + d.cdInt : '') + (tot ? ' (' + Math.round(tot / 60) + ' min)' : '');
  }
  return '';
}
/* modo por defecto según el ejercicio */
function cdDefecto(it){
  const c = cdCat(it);
  if (!c || c.m !== 'cardio') { if (it.dataset.cardio) cdQuitar(it); return; }
  if (!it.dataset.cardio) {
    if (c.e === 'metab') it.dataset.cardio = 'series';
    else { it.dataset.cardio = 'tiempo'; if (!it.dataset.cdMin) it.dataset.cdMin = '20'; if (!it.dataset.cdInt) it.dataset.cdInt = 'Zona 2'; }
  }
}
function cdQuitar(it){ ['cardio', 'cdMin', 'cdInt', 'cdTrab', 'cdDesc', 'cdRondas', 'cdOk'].forEach(function(k){ delete it.dataset[k]; }); it.classList.remove('cd-item'); }
function cdModo(btn, m){
  const it = btn.closest('.ex-item'); if (!it) return;
  it.dataset.cardio = m;
  if (m === 'tiempo') { if (!it.dataset.cdMin) it.dataset.cdMin = '20'; if (!it.dataset.cdInt) it.dataset.cdInt = 'Zona 2'; }
  if (m === 'int' && !it.dataset.cdRondas) { const p = CD_PRESETS[0][1]; it.dataset.cdTrab = p.trab; it.dataset.cdDesc = p.desc; it.dataset.cdRondas = p.rondas; it.dataset.cdInt = p.int; }
  cdSync(); try { ruPintarCompacta(); } catch(e){}
}
function cdPreset(btn, i){
  const it = btn.closest('.ex-item'), p = CD_PRESETS[i] && CD_PRESETS[i][1]; if (!it || !p) return;
  it.dataset.cdTrab = p.trab; it.dataset.cdDesc = p.desc; it.dataset.cdRondas = p.rondas; it.dataset.cdInt = p.int;
  cdSync();
}
function cdHecho(btn){
  const it = btn.closest('.ex-item'); if (!it) return;
  if (it.dataset.cdOk === '1') delete it.dataset.cdOk; else it.dataset.cdOk = '1';
  cdSync();
  try { guardarPlan(); guardarTodo(); } catch(e){}
  try { exBarraEntreno(); } catch(e){}
}
function cdCampo(it, k, lbl, ph, num){
  return '<label class="cd-f"><span>' + lbl + '</span><input type="' + (num ? 'number' : 'text') + '"' + (num ? ' inputmode="numeric" min="0"' : '') + ' data-cd="' + k + '" value="' + esc(it.dataset[k] || '') + '" placeholder="' + ph + '"></label>';
}
function cdHtml(it){
  const m = it.dataset.cardio, ed = enEditando(), cliente = !isCoachView();
  if (ed) {
    const chip = function(v, t){ return '<button type="button" class="cd-chip' + (m === v ? ' on' : '') + '" onclick="cdModo(this,\'' + v + '\')">' + t + '</button>'; };
    let h = '<div class="cd-modos">' + chip('tiempo', '⏱️ Por tiempo') + chip('int', '⏲️ Intervalos / SIIT') + chip('series', '🔁 Por series') + '</div>';
    if (m === 'tiempo') h += '<div class="cd-campos">' + cdCampo(it, 'cdMin', 'Minutos', '20', true) + cdCampo(it, 'cdInt', 'Intensidad', 'Zona 2 · RPE 6 · 130 ppm', false) + '</div>';
    else if (m === 'int') h += '<div class="cd-campos">' + cdCampo(it, 'cdRondas', 'Rondas', '8', true) + cdCampo(it, 'cdTrab', 'Trabajo (s)', '30', true) + cdCampo(it, 'cdDesc', 'Descanso (s)', '90', true) + cdCampo(it, 'cdInt', 'Intensidad', 'RPE 9 · sprint', false) + '</div>'
      + '<div class="cd-presets">' + CD_PRESETS.map(function(p, i){ return '<button type="button" class="cd-chip" onclick="cdPreset(this,' + i + ')">' + p[0] + '</button>'; }).join('') + '</div>';
    else h += '<p class="cd-nota">Se pauta con series y repeticiones; en un circuito puedes poner segundos en las reps (p. ej. «40 s»).</p>';
    if (m !== 'series') h += '<div class="cd-res">' + esc(cdTexto(it)) + '</div>';
    return '<span class="cd-mini">' + (m === 'int' ? '⏲️ ' : '⏱️ ') + esc(cdTexto(it)) + '</span><div class="cd-ed">' + h + '</div>';
  }
  if (m === 'series') return '';
  return '<span class="cd-ico" aria-hidden="true">' + (m === 'int' ? '⏲️' : '🫀') + '</span><span class="cd-txt">' + esc(cdTexto(it)) + '</span>'
    + (cliente ? '<button type="button" class="cd-ok' + (it.dataset.cdOk === '1' ? ' on' : '') + '" onclick="cdHecho(this)">' + (it.dataset.cdOk === '1' ? '✓ Hecho' : 'Marcar hecho') + '</button>' : '');
}
let cdOcupado = false;
function cdSync(){
  if (cdOcupado) return; cdOcupado = true;
  try {
    const c = typeof contEnt === 'function' ? contEnt() : null; if (!c) return;
    c.querySelectorAll('.ex-item').forEach(function(it){
      cdDefecto(it);
      let b = it.querySelector(':scope > .cd-box');
      const m = it.dataset.cardio;
      it.classList.toggle('cd-item', m === 'tiempo' || m === 'int');
      it.classList.toggle('cd-series', m === 'series');
      if (!m) { if (b) b.remove(); return; }
      const h = cdHtml(it);
      if (!h) { if (b) b.remove(); return; }
      if (!b) { b = document.createElement('div'); b.className = 'cd-box'; const fila = it.querySelector(':scope > .ex-table-row'); it.insertBefore(b, fila ? fila.nextSibling : it.firstChild); }
      if (b.dataset.h !== h) {
        const act = document.activeElement && b.contains(document.activeElement) ? document.activeElement.dataset.cd : null;
        b.innerHTML = h; b.dataset.h = h;
        if (act) { const i = b.querySelector('[data-cd="' + act + '"]'); if (i) { i.focus(); try { const L = i.value.length; i.setSelectionRange(L, L); } catch(e){} } }
      }
      b.classList.toggle('cd-edit', enEditando());
    });
  } finally { cdOcupado = false; }
}
document.addEventListener('input', function(e){
  const i = e.target; if (!i.dataset || !i.dataset.cd) return;
  const it = i.closest('.ex-item'); if (!it) return;
  it.dataset[i.dataset.cd] = i.value.trim();
  const bx = i.closest('.cd-box');
  if (bx) { const r = bx.querySelector('.cd-res'); if (r) r.textContent = cdTexto(it); const mi = bx.querySelector('.cd-mini'); if (mi) mi.textContent = (it.dataset.cardio === 'int' ? '⏲️ ' : '⏱️ ') + cdTexto(it); }
  const b = i.closest('.cd-box'); if (b) b.dataset.h = cdHtml(it);
});
/* las series ocultas del cardio no cuentan en «x de y series» */
exSeriesDe = (function(orig){
  return function(card){
    const r = orig.apply(this, arguments);
    card.querySelectorAll('.ex-item.cd-item').forEach(function(it){
      const p = it.querySelectorAll('.serie-in input');
      r.total -= p.length; r.ok -= Array.prototype.filter.call(p, function(x){ return x.dataset.ok === '1'; }).length;
      r.total += 1; if (it.dataset.cdOk === '1') r.ok += 1;
    });
    return r;
  };
})(exSeriesDe);
/* cuándo se repinta */
['enTecSync', 'editarPlan', 'cargarPlan', 'ruPintarCompacta'].forEach(function(n){ fsdTras(n, function(){ cdSync(); }); });
fsdTras('pickExercise', function(){ setTimeout(cdSync, 0); });
fsdTras('goTo', function(r, n){ if (n === 'entreno') cdSync(); });

/* ---------- circuito de fuerza + cardio (grupo en «⚡ Técnica») ---------- */
EN_GRUPO.circ = { n: 'Circuito', e: '🔄', p: '3 vueltas · sin descanso entre ejercicios · 90 s de descanso entre vueltas', min: false,
  i: 'Haz los ejercicios del circuito seguidos, uno detrás de otro, con el tiempo o las repeticiones de cada uno. Al terminar descansa lo indicado y repite las vueltas.' };
cdSync();

/* =========================================================
   Mejora 4 (21/10) · El cliente registra su cardio real
   Al marcarlo como hecho apunta minutos y distancia (por tiempo) o rondas (intervalos);
   se guarda en su registro semanal (registro.cardio) y suma «minutos de cardio» en
   el seguimiento, en el gráfico de evolución y en la ficha / Entrenamientos.
   ========================================================= */
function cdId(it){ if (!it.dataset.cdId) it.dataset.cdId = 'cd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); return it.dataset.cdId; }
function cdMinPauta(it){
  const d = it.dataset;
  if (d.cardio === 'tiempo') return +d.cdMin || 0;
  if (d.cardio === 'int') return Math.round((+d.cdRondas || 0) * ((+d.cdTrab || 0) + (+d.cdDesc || 0)) / 60);
  return 0;
}
function cdMinReal(it){
  const d = it.dataset;
  if (d.cardio === 'int') { const r = d.cdRealRondas !== undefined && d.cdRealRondas !== '' ? +d.cdRealRondas : (+d.cdRondas || 0); return Math.round(r * ((+d.cdTrab || 0) + (+d.cdDesc || 0)) / 60); }
  return d.cdRealMin !== undefined && d.cdRealMin !== '' ? +d.cdRealMin : cdMinPauta(it);
}
function cdRealTxt(it){
  const d = it.dataset, p = [];
  if (d.cardio === 'int') p.push((d.cdRealRondas || d.cdRondas || '—') + ' rondas');
  else p.push(cdMinReal(it) + ' min');
  if (d.cdRealKm) p.push(fmtNum(+String(d.cdRealKm).replace(',', '.')) + ' km');
  return p.join(' · ');
}
function cdRegistro(k){ const r = mjRegistro(k); if (!r) return []; r.cardio = r.cardio || []; return r.cardio; }
function cdMinSemana(k, lunes){
  lunes = lunes || mjISO(mjLunes());
  return cdRegistro(k).filter(function(x){ return x.sem === lunes; }).reduce(function(a, x){ return a + (+x.min || 0); }, 0);
}
function cdApuntar(it, hecho){
  const k = clienteActual; if (!k) return;
  const l = cdRegistro(k), lunes = mjISO(mjLunes()), id = cdId(it);
  for (let i = l.length - 1; i >= 0; i--) if (l[i].id === id && l[i].sem === lunes) l.splice(i, 1);
  if (hecho) l.push({ id: id, sem: lunes, f: mjISO(new Date()), ej: enNombreEj(it), min: cdMinReal(it), km: it.dataset.cdRealKm ? +String(it.dataset.cdRealKm).replace(',', '.') : null });
  if (l.length > 400) l.splice(0, l.length - 400);
}
/* formulario del cliente */
cdHtml = (function(orig){
  return function(it){
    const m = it.dataset.cardio;
    if (enEditando() || isCoachView() || m === 'series' || !m) return orig.apply(this, arguments);
    const d = it.dataset, ok = d.cdOk === '1', abierto = it.classList.contains('cd-abierto');
    let h = '<span class="cd-ico" aria-hidden="true">' + (m === 'int' ? '⏲️' : '🫀') + '</span><span class="cd-txt">' + esc(cdTexto(it))
      + (ok ? '<small class="cd-hecho">✓ Hecho: ' + esc(cdRealTxt(it)) + '</small>' : '') + '</span>';
    if (!abierto) return h + '<button type="button" class="cd-ok' + (ok ? ' on' : '') + '" onclick="cdAbrirReg(this)">' + (ok ? 'Cambiar' : 'Marcar hecho') + '</button>';
    const campo = function(k, lbl, val, ph){ return '<label class="cd-f"><span>' + lbl + '</span><input type="text" inputmode="decimal" data-cdr="' + k + '" value="' + esc(val || '') + '" placeholder="' + ph + '"></label>'; };
    h += '<div class="cd-reg">' + (m === 'int'
        ? campo('cdRealRondas', 'Rondas hechas', d.cdRealRondas || d.cdRondas, d.cdRondas || '8')
        : campo('cdRealMin', 'Minutos hechos', d.cdRealMin || d.cdMin, d.cdMin || '20') + campo('cdRealKm', 'Distancia (km, opcional)', d.cdRealKm, '—'))
      + '<div class="cd-reg-btns">' + (ok ? '<button type="button" class="cd-chip" onclick="cdDesmarcar(this)">Quitar «hecho»</button>' : '')
      + '<button type="button" class="cd-ok on" onclick="cdGuardarReg(this)">Guardar ✓</button></div></div>';
    return h;
  };
})(cdHtml);
function cdAbrirReg(btn){ const it = btn.closest('.ex-item'); if (!it) return; it.classList.add('cd-abierto'); cdSync(); const i = it.querySelector('[data-cdr]'); if (i) { i.focus(); try { i.select(); } catch(e){} } }
function cdGuardarReg(btn){
  const it = btn.closest('.ex-item'); if (!it) return;
  it.querySelectorAll('[data-cdr]').forEach(function(i){ const v = i.value.trim().replace(',', '.'); if (v && !isNaN(+v)) it.dataset[i.dataset.cdr] = v; else delete it.dataset[i.dataset.cdr]; });
  it.dataset.cdOk = '1'; it.classList.remove('cd-abierto');
  cdApuntar(it, true); cdSync(); try { exBarraEntreno(); } catch(e){}
  try { guardarPlan(); guardarTodo(); } catch(e){}
  toast('Cardio apuntado: ' + cdRealTxt(it));
}
function cdDesmarcar(btn){
  const it = btn.closest('.ex-item'); if (!it) return;
  ['cdOk', 'cdRealMin', 'cdRealKm', 'cdRealRondas'].forEach(function(k){ delete it.dataset[k]; });
  it.classList.remove('cd-abierto'); cdApuntar(it, false); cdSync(); try { exBarraEntreno(); } catch(e){}
  try { guardarPlan(); guardarTodo(); } catch(e){}
}
cdHecho = function(btn){ cdAbrirReg(btn); };
/* semana nueva: el cardio vuelve a quedar sin marcar y sin lo apuntado */
mjCambioDeSemana = (function(orig){
  return function(k){
    const d = clientesData[k], antes = d && d.semanaRef;
    const r = orig.apply(this, arguments);
    if (d && antes && d.semanaRef !== antes) contEnt().querySelectorAll('.ex-item[data-cd-ok],.ex-item[data-cd-real-min],.ex-item[data-cd-real-km],.ex-item[data-cd-real-rondas]').forEach(function(it){ ['cdOk', 'cdRealMin', 'cdRealKm', 'cdRealRondas'].forEach(function(x){ delete it.dataset[x]; }); });
    return r;
  };
})(mjCambioDeSemana);
/* seguimiento: guarda los minutos de cardio de la semana y los enseña en la tarjeta */
guardarSeguimiento = (function(orig){
  return function(){
    const k = clienteActual, l0 = k && (SEGUIMIENTOS[k] || [])[0];
    const r = orig.apply(this, arguments);
    const n = k && (SEGUIMIENTOS[k] || [])[0];
    if (n && n !== l0) { const m = cdMinSemana(k); if (m) n.cardio = m; else if (n.cardio == null) delete n.cardio; try { guardarTodo(); } catch(e){} }
    return r;
  };
})(guardarSeguimiento);
tarjetaSeguimiento = (function(orig){
  return function(r){
    let h = orig.apply(this, arguments);
    if (r && r.cardio) h = h.replace('<div class="segui-stats">', '<div class="segui-stats"><div><span class="segui-lbl">Cardio</span><span class="segui-val">' + fmtMil(+r.cardio) + ' min</span></div>');
    return h;
  };
})(tarjetaSeguimiento);
/* gráfico: «Cardio» en minutos por semana */
if (typeof GR_METRICAS !== 'undefined') {
  GR_METRICAS.push(['cardio', 'Cardio', 'min']);
  grSerie = (function(orig){
    return function(k, met){
      if (met !== 'cardio') return orig.apply(this, arguments);
      const reg = clientesData[k] && clientesData[k].registro && clientesData[k].registro.cardio; if (!reg) return [];
      const sem = {}; reg.forEach(function(x){ sem[x.sem] = (sem[x.sem] || 0) + (+x.min || 0); });
      return Object.keys(sem).sort().map(function(f){ return { f: f, v: sem[f], l: 'Semana del ' + fechaCorta(f) }; });
    };
  })(grSerie);
  grFmt = (function(orig){ return function(v, met){ return met === 'cardio' ? fmtMil(Math.round(v)) : orig.apply(this, arguments); }; })(grFmt);
}
/* Entrenamientos (Domingo): minutos de cardio de la semana junto al tonelaje */
if (typeof entResumenHtml === 'function') entResumenHtml = (function(orig){
  return function(k){
    const h = orig.apply(this, arguments), m = cdMinSemana(k);
    return m ? h.replace('</div></div><div class="fe-card', '</div><div><small>Cardio esta semana</small><b>' + fmtMil(m) + ' min</b></div></div><div class="fe-card') : h;
  };
})(entResumenHtml);
document.addEventListener('keydown', function(e){
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.cdr) { e.preventDefault(); const b = e.target.closest('.cd-box').querySelector('.cd-reg .cd-ok'); if (b) b.click(); }
});
