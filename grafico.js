/* =========================================================
   Fitness sin Dramas — #127 Evolución del cliente en gráfico (21/10/2026)
   En «Seguimientos» de un cliente (profesionales), arriba: gráfico de línea con filtros
   Peso · Cintura · Cadera · Bíceps · Muslo · Entreno · Nutrición · Motivación · Estrés · Pasos · Tonelaje.
   Una sola serie cada vez (un solo eje); pasar el ratón o el dedo muestra cada semana.
   La tabla de antes queda en «Ver tabla».
   ========================================================= */
let grMetrica = 'peso', grTabla = false;
const GR_METRICAS = [
  ['peso', 'Peso', 'kg'], ['cintura', 'Cintura', 'cm'], ['cadera', 'Cadera', 'cm'], ['biceps', 'Bíceps', 'cm'], ['muslo', 'Muslo', 'cm'],
  ['e', 'Entreno', '/10'], ['n', 'Nutrición', '/10'], ['m', 'Motivación', '/5'], ['x', 'Estrés', '/10'],
  ['pasos', 'Pasos/día', ''], ['ton', 'Tonelaje', 'kg']
];
function grNum(v){ if (v == null || v === '' || v === '—') return null; const n = typeof mjNum === 'function' ? mjNum(v) : parseFloat(String(v).replace(',', '.')); return (n == null || isNaN(n)) ? null : n; }
function grSerie(k, met){
  if (met === 'ton') {
    const reg = clientesData[k] && clientesData[k].registro && clientesData[k].registro.ej; if (!reg) return [];
    const sem = {};
    Object.keys(reg).forEach(function(ej){ (reg[ej] || []).forEach(function(w){
      const t = (w.s || []).reduce(function(a, s){ const kg = grNum(s[0]), r = grNum(s[1]); return a + (kg && r ? kg * r : 0); }, 0);
      if (t) sem[w.sem] = (sem[w.sem] || 0) + t;
    }); });
    return Object.keys(sem).sort().map(function(f){ return { f: f, v: Math.round(sem[f]), l: 'Semana del ' + fechaCorta(f) }; });
  }
  const l = (SEGUIMIENTOS[k] || []).slice().sort(function(a, b){ return (a.fecha || '') < (b.fecha || '') ? -1 : 1; });
  return l.map(function(r){
    let v = null;
    if (['peso', 'cintura', 'cadera', 'biceps', 'muslo'].indexOf(met) > -1) v = grNum(r.med && r.med[met]) != null ? grNum(r.med[met]) : (met === 'peso' ? grNum(String(r.peso || '').replace(/[^\d,.\-]/g, '')) : null);
    else if (met === 'pasos') v = grNum(r.pasos);
    else v = grNum(r[met]);
    return { f: r.fecha, v: v, l: (r.s || fechaCorta(r.fecha)).split(' · ')[0] + ' · ' + fechaCorta(r.fecha) };
  }).filter(function(x){ return x.v != null; });
}
function grFmt(v, met){ return met === 'pasos' || met === 'ton' ? fmtMil(Math.round(v)) : fmtNum(Math.round(v * 10) / 10); }
function grPintar(){
  const box = document.getElementById('grBox'); if (!box || !clienteActual) return;
  const k = clienteActual, mdef = GR_METRICAS.filter(function(m){ return m[0] === grMetrica; })[0];
  const datos = grSerie(k, grMetrica);
  const chips = GR_METRICAS.map(function(m){
    const n = grSerie(k, m[0]).length;
    return '<button type="button" role="tab" aria-selected="' + (m[0] === grMetrica) + '" class="chip protein' + (m[0] === grMetrica ? ' selected' : '') + '"' + (n ? '' : ' disabled title="Sin datos"') + ' onclick="grElegir(\'' + m[0] + '\')">' + m[1] + '</button>';
  }).join('');
  let cab = '', svg = '';
  if (datos.length) {
    const a = datos[0].v, z = datos[datos.length - 1].v, dif = z - a;
    const signo = dif > 0 ? '+' : (dif < 0 ? '−' : '±');
    cab = '<div class="gr-cab"><div><span class="gr-tit">' + mdef[1] + '</span><b class="gr-val">' + grFmt(z, grMetrica) + ' <small>' + mdef[2] + '</small></b></div>'
      + (datos.length > 1 ? '<span class="gr-dif">' + signo + grFmt(Math.abs(dif), grMetrica) + ' ' + mdef[2] + ' desde ' + fechaCorta(datos[0].f) + '</span>' : '') + '</div>';
    svg = '<div class="gr-plot" id="grPlot"></div>';
  } else cab = '<div class="gr-vacio">Todavía no hay datos de ' + mdef[1].toLowerCase() + '.</div>';
  box.innerHTML = '<div class="chips gr-chips" role="tablist" aria-label="Qué ver en el gráfico">' + chips + '</div>' + cab + svg
    + '<button type="button" class="gr-tabla-btn" onclick="grVerTabla()">' + (grTabla ? 'Ocultar tabla ▴' : 'Ver tabla ▾') + '</button>';
  const tw = document.querySelector('#seguiList .esc-tabla-wrap'); if (tw) tw.hidden = !grTabla;
  const tb = box.querySelector('.gr-tabla-btn'); if (tb) tb.hidden = !tw;
  if (datos.length) grDibujar(document.getElementById('grPlot'), datos, mdef);
}
function grDibujar(el, d, mdef){
  const W = Math.max(280, el.clientWidth || 600), H = W < 500 ? 190 : 230, P = { l: 46, r: 16, t: 14, b: 26 };
  const vs = d.map(function(x){ return x.v; });
  let mn = Math.min.apply(null, vs), mx = Math.max.apply(null, vs);
  if (mn === mx) { mn -= 1; mx += 1; }
  const pad = (mx - mn) * 0.15; mn -= pad; mx += pad;
  if (/\/(10|5)$/.test(mdef[2])) { mn = Math.max(0, mn); mx = Math.min(mdef[2] === '/5' ? 5 : 10, mx); }
  const x = function(i){ return d.length === 1 ? (P.l + W - P.r) / 2 : P.l + i * (W - P.l - P.r) / (d.length - 1); };
  const y = function(v){ return P.t + (1 - (v - mn) / (mx - mn)) * (H - P.t - P.b); };
  const ticks = [0, 1, 2, 3].map(function(i){ return mn + (mx - mn) * i / 3; });
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="' + H + '" role="img" aria-label="Evolución de ' + mdef[1] + '">';
  ticks.forEach(function(t){ s += '<line class="gr-grid" x1="' + P.l + '" x2="' + (W - P.r) + '" y1="' + y(t).toFixed(1) + '" y2="' + y(t).toFixed(1) + '"/><text class="gr-ax" x="' + (P.l - 8) + '" y="' + (y(t) + 4).toFixed(1) + '" text-anchor="end">' + grFmt(t, grMetrica) + '</text>'; });
  const idx = d.length <= 6 ? d.map(function(_, i){ return i; }) : [0, Math.round((d.length - 1) / 2), d.length - 1];
  idx.forEach(function(i){ s += '<text class="gr-ax" x="' + x(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + (i === 0 && d.length > 1 ? 'start' : (i === d.length - 1 && d.length > 1 ? 'end' : 'middle')) + '">' + fechaCorta(d[i].f).slice(0, 5) + '</text>'; });
  const pts = d.map(function(p, i){ return x(i).toFixed(1) + ',' + y(p.v).toFixed(1); });
  if (d.length > 1) s += '<polygon class="gr-area" points="' + x(0).toFixed(1) + ',' + (H - P.b) + ' ' + pts.join(' ') + ' ' + x(d.length - 1).toFixed(1) + ',' + (H - P.b) + '"/>'
    + '<polyline class="gr-linea" points="' + pts.join(' ') + '"/>';
  d.forEach(function(p, i){ s += '<circle class="gr-pt' + (i === d.length - 1 ? ' ult' : '') + '" cx="' + x(i).toFixed(1) + '" cy="' + y(p.v).toFixed(1) + '" r="4"/>'; });
  s += '<line class="gr-cruz" id="grCruz" x1="0" x2="0" y1="' + P.t + '" y2="' + (H - P.b) + '" style="display:none"/>';
  s += '<circle class="gr-hl" id="grHl" r="6" style="display:none"/>';
  s += '<rect class="gr-hit" x="' + P.l + '" y="0" width="' + (W - P.l - P.r) + '" height="' + H + '"/></svg><div class="gr-tip" id="grTip" hidden></div>';
  el.innerHTML = s;
  const hit = el.querySelector('.gr-hit'), tip = el.querySelector('#grTip'), cruz = el.querySelector('#grCruz'), hl = el.querySelector('#grHl');
  const mover = function(ev){
    const r = el.querySelector('svg').getBoundingClientRect(), px = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
    const fx = px * W / r.width;
    let best = 0; d.forEach(function(_, i){ if (Math.abs(x(i) - fx) < Math.abs(x(best) - fx)) best = i; });
    const cx = x(best), cy = y(d[best].v);
    cruz.setAttribute('x1', cx); cruz.setAttribute('x2', cx); cruz.style.display = '';
    hl.setAttribute('cx', cx); hl.setAttribute('cy', cy); hl.style.display = '';
    tip.hidden = false;
    tip.innerHTML = '<span>' + esc(d[best].l) + '</span><b>' + grFmt(d[best].v, grMetrica) + ' ' + mdef[2] + '</b>';
    const left = cx * r.width / W; tip.style.left = Math.min(Math.max(left, 70), r.width - 70) + 'px'; tip.style.top = Math.max(0, cy * r.height / H - 52) + 'px';
  };
  const salir = function(){ tip.hidden = true; cruz.style.display = 'none'; hl.style.display = 'none'; };
  hit.addEventListener('mousemove', mover); hit.addEventListener('touchstart', mover, { passive: true }); hit.addEventListener('touchmove', mover, { passive: true });
  hit.addEventListener('mouseleave', salir); hit.addEventListener('touchend', function(){ setTimeout(salir, 1500); });
}
function grElegir(m){ grMetrica = m; grPintar(); }
function grVerTabla(){ grTabla = !grTabla; grPintar(); }
goToSeguimientos = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const cont = document.getElementById('seguiList'); if (!cont || !(SEGUIMIENTOS[clienteActual] || []).length) return r;
    let box = document.getElementById('grBox');
    if (!box) { box = document.createElement('div'); box.id = 'grBox'; box.className = 'gr-box'; }
    cont.insertBefore(box, cont.firstChild);
    if (!grSerie(clienteActual, grMetrica).length) grMetrica = 'peso';
    grPintar();
    return r;
  };
})(goToSeguimientos);
let grRz = null;
window.addEventListener('resize', function(){ clearTimeout(grRz); grRz = setTimeout(function(){ if (document.getElementById('grPlot') && pantallaVisible() === 'view-coach-seguimientos') grPintar(); }, 150); });
