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
