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

/* ---------- figura (dibujo propio, sencillo) ---------- */
function muZona(g, v, forma){ return '<g class="mu-z ' + muNivel(v[g] ? v[g].hecho : 0).c + '" data-g="' + g + '" role="button" tabindex="0" aria-label="' + MU_GRUPOS[g] + ': ' + muFmt(v[g] ? v[g].hecho : 0) + ' series">' + forma + '</g>'; }
function muCuerpo(){
  return '<path class="mu-sil" d="M100 14c13 0 22 10 22 24s-9 26-22 26-22-12-22-26 9-24 22-24z'
    + 'M86 64h28l6 10c16 2 30 8 36 20l8 40 6 44-2 34-10 2-8-34-6-30-4 22-2 40 6 46 2 52-4 46 2 30-22 2-2-30-4-52-2-48-4 48-2 52-2 30-22-2 2-30-4-46 2-52 6-46-2-40-4-22-6 30-8 34-10-2-2-34 6-44 8-40c6-12 20-18 36-20z"/>';
}
function muFrente(v){
  return '<svg viewBox="0 0 200 420" class="mu-svg" aria-label="Músculos de frente">' + muCuerpo()
    + muZona('hombro', v, '<ellipse cx="62" cy="92" rx="15" ry="13"/><ellipse cx="138" cy="92" rx="15" ry="13"/>')
    + muZona('pecho', v, '<path d="M98 80c-14-2-30 2-34 12-3 10 2 26 14 30 10 3 20 0 20-8z"/><path d="M102 80c14-2 30 2 34 12 3 10-2 26-14 30-10 3-20 0-20-8z"/>')
    + muZona('biceps', v, '<ellipse cx="50" cy="132" rx="9" ry="21" transform="rotate(8 50 132)"/><ellipse cx="150" cy="132" rx="9" ry="21" transform="rotate(-8 150 132)"/>')
    + muZona('core', v, '<rect x="84" y="126" width="32" height="64" rx="9"/><path d="M78 130l6 0 0 54-8-6z"/><path d="M122 130l-6 0 0 54 8-6z"/>')
    + muZona('cuadriceps', v, '<path d="M82 214c-10 10-14 40-10 70 2 14 10 20 16 18 6-2 10-16 10-36 0-26-4-46-16-52z"/><path d="M118 214c10 10 14 40 10 70-2 14-10 20-16 18-6-2-10-16-10-36 0-26 4-46 16-52z"/>')
    + muZona('gemelos', v, '<ellipse cx="80" cy="340" rx="8" ry="24"/><ellipse cx="120" cy="340" rx="8" ry="24"/>')
    + '<g class="mu-lin"><line x1="100" y1="132" x2="100" y2="186"/><line x1="86" y1="148" x2="114" y2="148"/><line x1="86" y1="166" x2="114" y2="166"/></g>'
    + '</svg>';
}
function muEspalda(v){
  return '<svg viewBox="0 0 200 420" class="mu-svg" aria-label="Músculos de espalda">' + muCuerpo()
    + muZona('hombro', v, '<ellipse cx="62" cy="92" rx="15" ry="13"/><ellipse cx="138" cy="92" rx="15" ry="13"/>')
    + muZona('espalda', v, '<path d="M100 70l-24 14 24 20 24-20z"/><path d="M96 104c-10-4-22-6-28 0-4 18 2 46 14 60 6 6 14 4 14-6z"/><path d="M104 104c10-4 22-6 28 0 4 18-2 46-14 60-6 6-14 4-14-6z"/>')
    + muZona('triceps', v, '<ellipse cx="50" cy="130" rx="9" ry="21" transform="rotate(8 50 130)"/><ellipse cx="150" cy="130" rx="9" ry="21" transform="rotate(-8 150 130)"/>')
    + muZona('gluteo', v, '<ellipse cx="87" cy="214" rx="15" ry="16"/><ellipse cx="113" cy="214" rx="15" ry="16"/>')
    + muZona('isquios', v, '<path d="M80 236c-6 16-8 40-4 58 2 8 8 10 12 8 6-4 8-20 8-36 0-18-4-30-16-30z"/><path d="M120 236c6 16 8 40 4 58-2 8-8 10-12 8-6-4-8-20-8-36 0-18 4-30 16-30z"/>')
    + muZona('gemelos', v, '<ellipse cx="80" cy="336" rx="10" ry="26"/><ellipse cx="120" cy="336" rx="10" ry="26"/>')
    + '<g class="mu-lin"><line x1="100" y1="70" x2="100" y2="196"/></g>'
    + '</svg>';
}
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
    + '<div class="mu-cuerpo"><div class="mu-figs"><figure>' + muFrente(vv) + '<figcaption>Frente</figcaption></figure><figure>' + muEspalda(vv) + '<figcaption>Espalda</figcaption></figure></div>'
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
