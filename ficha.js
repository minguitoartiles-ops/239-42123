/* =========================================================
   Fitnessindramas — Ficha del cliente (24/10/2026)
   #205/#207 «Sensaciones del día» y «Antes / Ahora» salen plegados (móvil y ordenador), con un resumen al lado.
   #209 El gráfico de evolución de los seguimientos va arriba del todo, encima de «Sensaciones del día».
   Se carga después de panelpro.js, cliente.js, seguimiento.js y grafico.js.
   ========================================================= */
FP_PLEGABLES['sensaciones del día'] = 'sens';
FP_PLEGABLES['📸 antes / ahora'] = 'fotos';

/* el contenido de esos dos apartados es todo lo que va después de su título dentro de su bloque */
fpContenido = (function(orig){
  return function(lbl){
    const p = lbl.parentNode;
    if (p && (p.id === 'fichaSens' || p.id === 'fichaFotos')) { const r = []; let x = lbl.nextElementSibling; while (x) { r.push(x); x = x.nextElementSibling; } return r; }
    return orig.apply(this, arguments);
  };
})(fpContenido);
fpResumen = (function(orig){
  return function(id, cont){
    if (id === 'sens') {
      const box = document.getElementById('fichaSens'), n = box ? +(box.dataset.nuevas || 0) : 0;
      const tot = typeof sensDe === 'function' ? sensDe(clienteActual).length : 0;
      return n ? n + (n === 1 ? ' nueva' : ' nuevas') : (tot ? tot + (tot === 1 ? ' registrada' : ' registradas') : 'Aún sin sensaciones');
    }
    if (id === 'fotos') {
      const n = typeof sgAntesAhora === 'function' ? sgAntesAhora(clienteActual).length : 0;
      return n ? n + (n === 1 ? ' posición' : ' posiciones') : '';
    }
    return orig.apply(this, arguments);
  };
})(fpResumen);
/* «Sensaciones del día»: el globo de nuevas pasa al resumen del título plegado */
pintarSensFicha = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const box = document.getElementById('fichaSens');
    if (box) {
      const lbl = box.querySelector('.alta-label'), pill = lbl && lbl.querySelector('.pill-nuevo');
      box.dataset.nuevas = pill ? (parseInt(pill.textContent, 10) || 0) : 0;
      if (pill) pill.remove();
      if (lbl) lbl.setAttribute('data-fp-txt', 'Sensaciones del día');
    }
    try { fpAplicar(); } catch(e){}
    return r;
  };
})(pintarSensFicha);
sgPintarFotosFicha = (function(orig){
  return function(){ const r = orig.apply(this, arguments); try { fpAplicar(); } catch(e){} return r; };
})(sgPintarFotosFicha);

/* ---------- #209 gráfico de evolución arriba ---------- */
function fgPintar(){
  const v = document.getElementById('view-coach-cliente'), k = clienteActual; if (!v || !k || !coachActivo) return;
  let g = document.getElementById('fichaGraf');
  const hay = GR_METRICAS.some(function(m){ return grSerie(k, m[0]).length; });
  if (!hay) { if (g) g.remove(); return; }
  if (!g) {
    g = document.createElement('div'); g.id = 'fichaGraf';
    g.innerHTML = '<div class="alta-label">📈 Evolución</div><div class="gr-box fg-box"></div>';
  }
  fgColocar(g);
  if (!grSerie(k, grMetrica).length) grMetrica = GR_METRICAS.filter(function(m){ return grSerie(k, m[0]).length; })[0][0];
  grPintar(g.querySelector('.gr-box'));
}
/* justo encima de «Sensaciones del día» (en el ordenador, dentro de su mismo bloque) */
function fgColocar(g){
  g = g || document.getElementById('fichaGraf'); if (!g) return;
  const sens = document.getElementById('fichaSens');
  if (sens && sens.parentNode) { if (sens.previousElementSibling !== g) sens.parentNode.insertBefore(g, sens); return; }
  if (!g.parentNode) { const sec = document.getElementById('fichaSecciones'); if (sec) sec.insertAdjacentElement('afterend', g); }
}
enSeccionDe = (function(orig){ return function(el){ return el.id === 'fichaGraf' ? 'segui' : orig.apply(this, arguments); }; })(enSeccionDe);
fpOrdenarArriba = (function(orig){ return function(){ const r = orig.apply(this, arguments); fgColocar(); return r; }; })(fpOrdenarArriba);
enPintarFicha = (function(orig){ return function(){ const r = orig.apply(this, arguments); try { fgPintar(); } catch(e){} return r; }; })(enPintarFicha);
let fgRz = null;
window.addEventListener('resize', function(){ clearTimeout(fgRz); fgRz = setTimeout(function(){ const b = document.querySelector('#fichaGraf .gr-box'); if (b && b.offsetParent) grPintar(b); }, 150); });

/* =========================================================
   #222 «Evolución» también sale plegada al abrir la ficha (móvil y ordenador), con su resumen
   ========================================================= */
FP_PLEGABLES['📈 evolución'] = 'evol';
fpContenido = (function(orig){
  return function(lbl){
    const p = lbl.parentNode;
    if (p && p.id === 'fichaGraf') { const r = []; let x = lbl.nextElementSibling; while (x) { r.push(x); x = x.nextElementSibling; } return r; }
    return orig.apply(this, arguments);
  };
})(fpContenido);
fpResumen = (function(orig){
  return function(id, cont){
    if (id === 'evol') {
      try {
        const s = grSerie(clienteActual, 'peso');
        if (s.length) {
          const u = s[s.length - 1].v, d = s.length > 1 ? Math.round((u - s[0].v) * 10) / 10 : null;
          return 'Peso ' + String(u).replace('.', ',') + ' kg' + (d ? ' · ' + (d > 0 ? '+' : '−') + String(Math.abs(d)).replace('.', ',') : '');
        }
        const n = (SEGUIMIENTOS[clienteActual] || []).length;
        return n + (n === 1 ? ' seguimiento' : ' seguimientos');
      } catch(e){ return ''; }
    }
    return orig.apply(this, arguments);
  };
})(fpResumen);
/* el gráfico se dibuja al desplegarlo (plegado no tiene ancho) */
fpAplicar = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    if (fpAbiertos.evol) { const b = document.querySelector('#fichaGraf .gr-box'); if (b && b.offsetParent && !b.dataset.fgOk) { b.dataset.fgOk = '1'; try { grPintar(b); } catch(e){} } }
    else { const b = document.querySelector('#fichaGraf .gr-box'); if (b) delete b.dataset.fgOk; }
    return r;
  };
})(fpAplicar);
fgPintar = (function(orig){
  return function(){ const r = orig.apply(this, arguments); const b = document.querySelector('#fichaGraf .gr-box'); if (b) delete b.dataset.fgOk; try { fpAplicar(); } catch(e){} return r; };
})(fgPintar);
