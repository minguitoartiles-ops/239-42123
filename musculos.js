/* =========================================================
   Fitnessindramas — Mapa muscular semanal (21/10/2026)
   Volumen semanal por grupo muscular a partir de las series HECHAS esa semana
   (serie marcada ✓ y que no sea de aproximación ni de descarga).
   Conteo fraccional: el músculo principal del ejercicio suma 1 serie y los que ayudan, 0,5
   (p. ej. press banca: pecho 1, tríceps 0,5, hombro 0,5).
   Escala según la evidencia de dosis-respuesta en hipertrofia (Schoenfeld 2017; Baz-Valle 2022;
   Pelland 2024): series efectivas por músculo y semana
     0          · sin trabajar
     0,5 – 3    · mantenimiento
     4 – 9      · mínimo eficaz
     10 – 20    · rango óptimo de hipertrofia
     más de 20  · volumen alto (rendimiento decreciente: vigilar recuperación)
   - Domingo: en Entrenamientos, junto al entreno del cliente (hecho y planificado).
   - Cliente: tarjeta en su pestaña de entreno y, al completar un día, hoja con el mapa y el tonelaje.
   ========================================================= */
const MU_GRUPOS = { pecho: 'Pecho', espalda: 'Espalda', hombro: 'Hombros', biceps: 'Bíceps', triceps: 'Tríceps', core: 'Core', cuadriceps: 'Cuádriceps', isquios: 'Isquios', gluteo: 'Glúteos', gemelos: 'Gemelos' };
const MU_NIVELES = [
  { min: 0, max: 0, c: 'n0', t: 'Sin trabajar' },
  { min: 0.5, max: 3.5, c: 'n1', t: 'Mantenimiento', r: '1-3' },
  { min: 4, max: 9.5, c: 'n2', t: 'Mínimo eficaz', r: '4-9' },
  { min: 10, max: 20, c: 'n3', t: 'Óptimo', r: '10-20' },
  { min: 20.5, max: 999, c: 'n4', t: 'Alto', r: '+20' }
];
function muNivel(n){ n = +n || 0; if (n <= 0) return MU_NIVELES[0]; if (n < 4) return MU_NIVELES[1]; if (n < 10) return MU_NIVELES[2]; if (n <= 20) return MU_NIVELES[3]; return MU_NIVELES[4]; }
function muAportes(m, nombre){
  const n = norm(nombre || ''), a = {}; a[m] = 1;
  const t = function(re){ return re.test(n); };
  if (m === 'pecho' && t(/press|fondo|flexion/)) { a.triceps = 0.5; a.hombro = 0.5; }
  if (m === 'espalda' && t(/remo|jalon|dominad|pull ?up|chin/) && !t(/pullover/)) a.biceps = 0.5;
  if (m === 'espalda' && t(/peso muerto/)) { a.isquios = 0.5; a.gluteo = 0.5; }
  if (m === 'hombro' && t(/press|militar|arnold|push press/)) a.triceps = 0.5;
  if (m === 'cuadriceps' && t(/sentadilla|prensa|zancada|bulgara|step|hack|goblet|lunge/)) a.gluteo = 0.5;
  if (m === 'isquios' && t(/peso muerto|rumano|buenos dias|good morning/)) a.gluteo = 0.5;
  if (m === 'gluteo' && t(/hip thrust|puente|empuje de cadera/)) a.isquios = 0.5;
  if (m === 'triceps' && t(/fondo|press cerrado|press frances en banco/)) a.pecho = 0.5;
  return a;
}
/* volumen de un plan (DOM vivo o HTML guardado) */
function muVolumen(raiz){
  const v = {}; Object.keys(MU_GRUPOS).forEach(function(g){ v[g] = { hecho: 0, plan: 0, ej: [] }; });
  if (!raiz) return v;
  raiz.querySelectorAll('.ex-item').forEach(function(it){
    if (it.classList.contains('cd-item') || it.dataset.cardio === 'tiempo' || it.dataset.cardio === 'int') return;
    const nom = (typeof enNombreEj === 'function' ? enNombreEj(it) : '') || '';
    if (!nom.trim()) return;
    const cel = it.querySelector('.ex-name-cell'); let m = cel && cel.dataset.muscle;
    if (!m || !MU_GRUPOS[m]) { const c = EX_CATALOG.filter(function(e){ return norm(e.n) === norm(nom); })[0]; m = c && c.m; }
    if (!m || !MU_GRUPOS[m]) return;
    const ps = enPesos(it);
    const hechas = ps.filter(function(p){ return p.dataset.ok === '1' && p.dataset.tipo !== 'aprox' && p.dataset.tipo !== 'desc'; }).length;
    const ap = muAportes(m, nom);
    Object.keys(ap).forEach(function(g){
      if (!v[g]) return;
      v[g].hecho += hechas * ap[g]; v[g].plan += ps.length * ap[g];
      if (ps.length) v[g].ej.push({ n: nom, h: hechas * ap[g], p: ps.length * ap[g], ind: ap[g] < 1 });
    });
  });
  return v;
}
function muVolCliente(k){
  if (k === clienteActual && !isCoachView() && typeof contEnt === 'function' && contEnt()) return muVolumen(contEnt());
  const t = document.createElement('div'); t.innerHTML = (PLANES[k] && PLANES[k].ent) || ''; return muVolumen(t);
}
function muFmt(n){ return fmtNum(Math.round(n * 2) / 2); }

/* ---------- figura: react-native-body-highlighter (MIT, ver cuerpo.js), hombre o mujer según el cliente ---------- */
const MU_SLUG = { chest: 'pecho', 'upper-back': 'espalda', 'lower-back': 'espalda', trapezius: 'espalda', deltoids: 'hombro', biceps: 'biceps', triceps: 'triceps',
  abs: 'core', obliques: 'core', quadriceps: 'cuadriceps', adductors: 'cuadriceps', hamstring: 'isquios', gluteal: 'gluteo', calves: 'gemelos' };
function muFiguraDe(k){ const d = clientesData[k]; return d && d.figura === 'mujer' ? 'mujer' : 'hombre'; }
function muFigura(v, lado, fig){
  const f = (typeof CUERPO_SVG !== 'undefined' && CUERPO_SVG[fig || 'hombre'] || {})[lado]; if (!f) return '';
  const grupos = {}, neutro = [];
  f.p.forEach(function(p){
    const g = MU_SLUG[p.s];
    if (g) (grupos[g] = grupos[g] || []).push.apply(grupos[g], p.d);
    else { const c = p.s === 'hair' ? 'mu-pelo' : (p.s === 'head' ? 'mu-cabeza' : 'mu-neutro'); p.d.forEach(function(d){ neutro.push('<path class="' + c + '" d="' + d + '"/>'); }); }
  });
  let h = '<svg viewBox="' + f.vb + '" class="mu-svg" role="img" aria-label="Músculos ' + (lado === 'frente' ? 'de frente' : 'de espalda') + '">'
    + '<path class="mu-sil" d="' + f.c + '"/>' + neutro.join('');
  Object.keys(grupos).forEach(function(g){
    const val = v[g] ? v[g].hecho : 0;
    h += '<g class="mu-z ' + muNivel(val).c + '" data-g="' + g + '" role="button" tabindex="0" aria-label="' + MU_GRUPOS[g] + ': ' + muFmt(val) + ' series">' + grupos[g].map(function(d){ return '<path d="' + d + '"/>'; }).join('') + '</g>';
  });
  return h + '</svg>';
}
function muFrente(v, fig){ return muFigura(v, 'frente', fig); }
function muEspalda(v, fig){ return muFigura(v, 'espalda', fig); }
function muLeyenda(){
  return '<div class="mu-ley">' + MU_NIVELES.slice(1).map(function(n){ return '<span class="mu-ley-i"><i class="' + n.c + '"></i><b>' + n.r + '</b>' + n.t + '</span>'; }).join('') + '</div>'
    + '<p class="mu-nota">Series efectivas por músculo esta semana. Para ganar músculo, la evidencia sitúa el rango más productivo en <b>10-20 series semanales</b>; con 4-9 ya hay progreso y por encima de 20 la mejora es pequeña y cuesta más recuperarse.</p>';
}
/* modo «plan» (series pautadas en la rutina: lo que decide Domingo) o «hecho» (series realizadas) */
function muVal(x, modo){ return modo === 'plan' ? x.plan : x.hecho; }
function muHtml(k, opc){
  opc = opc || {};
  const modo = opc.modo || 'hecho', v = muVolCliente(k), id = 'mu' + Math.random().toString(36).slice(2, 7);
  const vv = {}; Object.keys(v).forEach(function(g){ vv[g] = { hecho: muVal(v[g], modo) }; });
  const tot = Object.keys(v).reduce(function(a, g){ return a + muVal(v[g], modo); }, 0);
  const lista = Object.keys(MU_GRUPOS).sort(function(a, b){ return muVal(v[b], modo) - muVal(v[a], modo); });
  const conmut = opc.conmutar ? '<div class="mu-modos" role="tablist">'
    + '<button type="button" role="tab" aria-selected="' + (modo === 'plan') + '" class="cd-chip' + (modo === 'plan' ? ' on' : '') + '" onclick="muCambiarModo(this,\'plan\')">Pautado en la rutina</button>'
    + '<button type="button" role="tab" aria-selected="' + (modo === 'hecho') + '" class="cd-chip' + (modo === 'hecho' ? ' on' : '') + '" onclick="muCambiarModo(this,\'hecho\')">Hecho esta semana</button></div>' : '';
  return '<div class="mu-box' + (opc.compacto ? ' mu-compacto' : '') + '" id="' + id + '" data-k="' + k + '" data-modo="' + modo + '" data-opc="' + esc(JSON.stringify(opc)) + '">'
    + (opc.titulo !== false ? '<div class="mu-cab"><b>' + (opc.titulo || 'Músculos de la semana') + '</b><span>' + muFmt(tot) + ' series ' + (modo === 'plan' ? 'pautadas / semana' : 'efectivas hechas') + '</span></div>' : '')
    + conmut
    + '<div class="mu-cuerpo"><div class="mu-figs"><figure>' + muFrente(vv, muFiguraDe(k)) + '<figcaption>Frente</figcaption></figure><figure>' + muEspalda(vv, muFiguraDe(k)) + '<figcaption>Espalda</figcaption></figure></div>'
    + (opc.lista !== false ? '<div class="mu-lista">' + lista.map(function(g){
        const val = muVal(v[g], modo), n = muNivel(val), otro = modo === 'plan' ? 'hechas ' + muFmt(v[g].hecho) : 'de ' + muFmt(v[g].plan) + ' pautadas';
        return '<button type="button" class="mu-fila" data-g="' + g + '"><i class="' + n.c + '"></i><span>' + MU_GRUPOS[g] + '</span><b>' + muFmt(val) + '</b><small>' + n.t + ' · ' + otro + '</small></button>';
      }).join('') + '</div>' : '') + '</div>'
    + muLeyenda()
    + '<div class="mu-det" aria-live="polite">Toca un músculo para ver de qué ejercicios salen sus series.</div>'
    + '</div>';
}
function muCambiarModo(btn, modo){
  const box = btn.closest('.mu-box'); if (!box) return;
  let opc = {}; try { opc = JSON.parse(box.dataset.opc || '{}'); } catch(e){}
  opc.modo = modo; try { localStorage.setItem('fsd_mu_modo', modo); } catch(e){}
  box.outerHTML = muHtml(box.dataset.k, opc);
}
function muDetalle(box, g){
  const k = box.dataset.k, modo = box.dataset.modo, v = muVolCliente(k)[g]; if (!v) return;
  const val = muVal(v, modo), n = muNivel(val), d = box.querySelector('.mu-det');
  box.querySelectorAll('.mu-z, .mu-fila').forEach(function(z){ z.classList.toggle('sel', z.dataset.g === g); });
  d.innerHTML = '<b>' + MU_GRUPOS[g] + ' · ' + muFmt(val) + ' series ' + (modo === 'plan' ? 'pautadas' : 'hechas') + '</b> <span class="mu-tag ' + n.c + '">' + n.t + '</span>'
    + (v.ej.length ? '<ul>' + v.ej.map(function(e){ return '<li>' + esc(e.n) + (e.ind ? ' <small>(ayuda, cuenta ½)</small>' : '') + ': ' + (modo === 'plan' ? muFmt(e.p) : muFmt(e.h) + ' de ' + muFmt(e.p)) + '</li>'; }).join('') + '</ul>' : '<p>No hay ejercicios en la rutina para este músculo.</p>');
}
document.addEventListener('click', function(e){
  const z = e.target.closest && e.target.closest('.mu-box .mu-z, .mu-box .mu-fila'); if (!z) return;
  muDetalle(z.closest('.mu-box'), z.dataset.g);
});
document.addEventListener('keydown', function(e){
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('mu-z')) { e.preventDefault(); muDetalle(e.target.closest('.mu-box'), e.target.dataset.g); }
});

/* ---------- Domingo: Entrenamientos ---------- */
if (typeof entResumenHtml === 'function') entResumenHtml = (function(orig){
  return function(k){
    let m = 'plan'; try { m = localStorage.getItem('fsd_mu_modo') || 'plan'; } catch(e){}
    return orig.apply(this, arguments) + muHtml(k, { titulo: 'Volumen semanal por músculo', modo: m, conmutar: true, compacto: true });
  };
})(entResumenHtml);

/* ---------- Cliente: tarjeta en su entreno y hoja al completar el día ---------- */
function muTonSemana(){ try { return typeof tonelajeDe === 'function' ? tonelajeDe(contEnt()) : 0; } catch(e){ return 0; } }
function muPintarCliente(){
  const v = document.getElementById('view-entreno'); if (!v) return;
  let c = document.getElementById('muCliente');
  const k = clienteActual, es = k && window.fsdSesionCliente && !isCoachView();
  const vol = es ? muVolumen(contEnt()) : null;
  const hay = vol && Object.keys(vol).some(function(g){ return vol[g].hecho > 0; });
  if (!hay) { if (c) c.remove(); return; }
  if (!c) {
    c = document.createElement('details'); c.id = 'muCliente'; c.className = 'card mu-card';
    const ref = v.querySelector('.tonelaje-card'); v.insertBefore(c, ref ? ref.nextSibling : v.firstChild);
  }
  const ab = c.open;
  const ton = muTonSemana();
  c.innerHTML = '<summary><span>💪 Tu semana muscular</span><small>' + (ton ? fmtMil(Math.round(ton)) + ' kg movidos · ' : '') + 'ver mapa</small></summary>'
    + '<div class="mu-ton"><small>Tonelaje movido esta semana</small><b>' + (ton ? fmtMil(Math.round(ton)) + ' kg' : '—') + '</b></div>' + muHtml(k, { titulo: false });
  c.open = ab;
}
function muCelebrar(card){
  const k = clienteActual; if (!k) return;
  const o = mjHoja('muHoja'), ton = muTonSemana();
  const nom = ((card && card.querySelector('.sesion-title')) || {}).textContent || 'Sesión';
  o.innerHTML = '<div class="fsd-sheet full"><div class="sheet-head"><h3>¡' + esc(nom.trim()) + ' completada! 💪</h3><button class="x-btn" onclick="mjCerrarHoja(\'muHoja\')" aria-label="Cerrar">×</button></div>'
    + '<div class="mu-ton"><small>Tonelaje movido esta semana</small><b>' + (ton ? fmtMil(Math.round(ton)) + ' kg' : '—') + '</b></div>'
    + muHtml(k, { titulo: 'Así va tu semana' })
    + '<button type="button" class="btn-primary" onclick="mjCerrarHoja(\'muHoja\')">¡Seguimos!</button></div>';
  o.classList.add('show');
}
toggleSesionHecha = (function(orig){
  return function(ev, el){
    const card = el && el.closest && el.closest('.sesion-card'), antes = card && card.classList.contains('hecha');
    const r = orig.apply(this, arguments);
    try {
      muPintarCliente();
      /* al completar el día, su tarjeta se abre sola (sin tapar la celebración del logro) */
      if (card && !antes && card.classList.contains('hecha') && window.fsdSesionCliente && !isCoachView()) {
        const c = document.getElementById('muCliente'); if (c) { c.open = true; c.classList.add('mu-nuevo'); setTimeout(function(){ c.classList.remove('mu-nuevo'); }, 2500); }
      }
    } catch(e){}
    return r;
  };
})(toggleSesionHecha);
fsdTras('goTo', function(r, n){ if (n === 'entreno') muPintarCliente(); });
fsdTras('enPintarFilas', function(){ clearTimeout(muPintarCliente._t); muPintarCliente._t = setTimeout(muPintarCliente, 300); });
if (typeof atrasDentroApp === 'function') atrasDentroApp = (function(orig){ return function(){ if (capaVisible('muHoja')) { mjCerrarHoja('muHoja'); return true; } return orig(); }; })(atrasDentroApp);

/* ---------- figura del mapa en los datos del cliente (hombre / mujer) ---------- */
if (typeof abrirEditarCliente === 'function') abrirEditarCliente = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const o = document.getElementById('mjEditCli'), d = clientesData[clienteActual];
    if (o && d && !o.querySelector('[data-grupo="fig"]')) {
      const ref = Array.prototype.filter.call(o.querySelectorAll('.alta-label'), function(x){ return /Objetivo/.test(x.textContent); })[0];
      const w = document.createElement('div');
      w.innerHTML = '<div class="alta-label">Figura del mapa muscular</div><div class="chips" data-grupo="fig">'
        + [['hombre', 'Hombre'], ['mujer', 'Mujer']].map(function(x){ return '<button type="button" class="chip protein' + ((d.figura || 'hombre') === x[0] ? ' selected' : '') + '" data-v="' + x[0] + '" onclick="mjChip(this)">' + x[1] + '</button>'; }).join('') + '</div>';
      while (w.firstChild) ref.parentNode.insertBefore(w.firstChild, ref);
    }
    return r;
  };
})(abrirEditarCliente);
if (typeof guardarEditarCliente === 'function') guardarEditarCliente = (function(orig){
  return function(){
    const o = document.getElementById('mjEditCli'), d = clientesData[clienteActual];
    const c = o && o.querySelector('[data-grupo="fig"] .chip.selected');
    if (d && c) d.figura = c.dataset.v;
    return orig.apply(this, arguments);
  };
})(guardarEditarCliente);

/* ---------- créditos: licencia MIT de la figura del cuerpo ---------- */
const LEGAL_CREDITOS = '<p class="legal-meta">Software de terceros incluido en la app</p>'
  + '<h4>Figura del mapa muscular</h4><p>react-native-body-highlighter · © 2022 ELABBASSI Hicham · Licencia MIT · github.com/HichamELBSI/react-native-body-highlighter</p>'
  + '<p class="legal-aviso">Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.</p>'
  + '<h4>Compresión de datos</h4><p>lz-string · © Pieroxy · Licencia MIT.</p>';
abrirLegal = (function(orig){
  return function(tipo){
    if (tipo !== 'creditos') return orig.apply(this, arguments);
    document.getElementById('legalTitulo').textContent = 'Créditos y licencias';
    document.getElementById('legalCuerpo').innerHTML = LEGAL_CREDITOS;
    const ov = document.getElementById('legalOverlay'); ov.classList.add('show');
    const s = ov.querySelector('.fsd-sheet'); if (s) s.scrollTop = 0;
  };
})(abrirLegal);
function muFilaCreditos(){
  ['ajustesCliente', 'ajustesCoach'].forEach(function(id){
    const c = document.getElementById(id); if (!c || c.querySelector('.cr-fila')) return;
    const tc = c.querySelector('.tc-fila'); if (!tc) return;
    const f = tc.cloneNode(true); f.classList.remove('tc-fila'); f.classList.add('cr-fila');
    f.setAttribute('onclick', "abrirLegal('creditos')");
    const sp = f.querySelector('span'); if (sp) sp.textContent = 'Créditos y licencias';
    tc.parentNode.appendChild(f);
  });
}
['renderAjustes', 'refrescarAjustes'].forEach(function(n){ if (typeof window[n] === 'function') fsdTras(n, function(){ muFilaCreditos(); }); });
