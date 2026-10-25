/* =========================================================
   Fitnessindramas — Pulido (25/10/2026, tarea #184)
   · Estados vacíos: sin clientes, un solo mensaje claro (antes salían dos, uno contradictorio).
   · Progreso del cliente: gráfico de su evolución (peso, medidas, pasos, sensaciones…), como el de los profesionales.
   · Microinteracciones: los botones responden al tocarlos (y se respeta «reducir movimiento»).
   ========================================================= */
function puSinClientes(){ return !Object.keys(clientesData || {}).length; }
/* Seguimientos: «No hay clientes en este apartado» sobra si ya dice «Todavía no hay clientes» */
pintarSegsResumen = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    if (puSinClientes()) { const v = document.getElementById('sgVacio'); if (v) v.remove(); }
    return r;
  };
})(pintarSegsResumen);
/* Planes: «Ningún cliente coincide con la búsqueda» solo cuando hay clientes y una búsqueda */
if (typeof plAplicar === 'function') plAplicar = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const vac = document.getElementById('plVacio');
    if (vac && (puSinClientes() || !(plBusca || '').trim())) vac.hidden = true;
    return r;
  };
})(plAplicar);

/* ---------- gráfico de evolución en «Tu progreso» (cliente) ---------- */
function puGraficoCliente(){
  const v = document.getElementById('view-progreso'); if (!v || isCoachView() || !clienteActual) return;
  let g = document.getElementById('pgGraf');
  const hay = GR_METRICAS.some(function(m){ return grSerie(clienteActual, m[0]).length > 1; });
  if (!hay) { if (g) g.remove(); return; }
  if (!g) {
    g = document.createElement('div'); g.id = 'pgGraf'; g.className = 'card pg-graf';
    g.innerHTML = '<div class="card-head"><b>📈 Tu evolución</b><span>semana a semana</span></div><div class="gr-box fg-box"></div>';
    const ring = v.querySelector('.ring-card');
    if (ring) ring.insertAdjacentElement('afterend', g); else v.appendChild(g);
  }
  if (!grSerie(clienteActual, grMetrica).length) grMetrica = GR_METRICAS.filter(function(m){ return grSerie(clienteActual, m[0]).length; })[0][0];
  grPintar(g.querySelector('.gr-box'));
}
fsdTras('goTo', function(r, n){ if (n === 'progreso') setTimeout(puGraficoCliente, 0); });
grPintar = (function(orig){
  return function(boxIn){
    const r = orig.apply(this, arguments);
    if (!boxIn) { const c = document.querySelector('#pgGraf .gr-box'); if (c && c.offsetParent) orig(c); }
    return r;
  };
})(grPintar);
window.addEventListener('resize', function(){ clearTimeout(puGraficoCliente._t); puGraficoCliente._t = setTimeout(function(){ const b = document.querySelector('#pgGraf .gr-box'); if (b && b.offsetParent) grPintar(b); }, 150); });

/* =========================================================
   #212 · Planes de entrenamiento (Domingo): el resumen de los días y el «Volumen semanal por músculo»
   salen plegados, con una línea de resumen; se abren al tocar su título (se recuerda mientras navegas)
   ========================================================= */
const puAbierto = { res: false, mu: false };
function puPlegable(cual, titulo, res, nodo){
  const d = document.createElement('details'); d.className = 'pu-fold'; d.dataset.fold = cual;
  if (puAbierto[cual]) d.open = true;
  d.innerHTML = '<summary><span class="pu-fold-t">' + titulo + '</span><span class="pu-fold-r">' + res + '</span><span class="pu-fold-ch" aria-hidden="true">›</span></summary>';
  nodo.parentNode.insertBefore(d, nodo); d.appendChild(nodo);
}
if (typeof entResumenHtml === 'function') entResumenHtml = (function(orig){
  return function(k){
    const t = document.createElement('template'); t.innerHTML = orig.apply(this, arguments);
    const card = t.content.querySelector('.ent-prev-card');
    if (card) {
      const dias = card.querySelectorAll('.fe-dia').length, ej = card.querySelectorAll('.fe-ej').length;
      puPlegable('res', '🏋️ Resumen del entrenamiento', dias ? dias + (dias === 1 ? ' día' : ' días') + ' · ' + ej + (ej === 1 ? ' ejercicio' : ' ejercicios') : 'sin sesiones', card);
    }
    const mu = t.content.querySelector('.mu-box');
    if (mu) {
      const s = mu.querySelector('.mu-cab span');
      puPlegable('mu', '💪 Volumen semanal por músculo', s ? esc(s.textContent.trim()) : '', mu);
    }
    const w = document.createElement('div'); w.appendChild(t.content.cloneNode(true)); return w.innerHTML;
  };
})(entResumenHtml);
document.addEventListener('toggle', function(e){
  const d = e.target; if (!d.classList || !d.classList.contains('pu-fold')) return;
  puAbierto[d.dataset.fold] = d.open;
}, true);
if (typeof muCambiarModo === 'function') muCambiarModo = (function(orig){
  return function(btn){
    const d = btn.closest('.pu-fold'), r = orig.apply(this, arguments);
    if (d) { const s = d.querySelector('.mu-cab span'), x = d.querySelector('.pu-fold-r'); if (s && x) x.textContent = s.textContent.trim(); }
    return r;
  };
})(muCambiarModo);
