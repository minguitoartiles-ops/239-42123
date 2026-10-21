/* =========================================================
   Fitnessindramas — Planes más ligeros y aviso de memoria (21/10/2026)
   - Los entrenos se guardaban con todos sus botones y pantallas (≈200 KB por cliente):
     ahora solo se guardan sus datos; los botones se vuelven a crear al abrir el plan.
   - Aviso cuando la memoria del dispositivo pasa del 80 %.
   Se carga la última.
   ========================================================= */
const FSD_SOBRA_ENT = '.cd-box, .sr-filas, .sr-plan, .en-ej-acts, .en-ses-acts, .ru-ss, .en-hist, .ej-resumen, .ru-asa, .ru-video, .ex-tec-btn';
function fsdLimpiarEnt(html){
  if (!html || typeof html !== 'string' || html.length < 200) return html;
  const t = document.createElement('template'); t.innerHTML = html;
  const r = t.content;
  r.querySelectorAll(FSD_SOBRA_ENT).forEach(function(x){ x.remove(); });
  const w = document.createTreeWalker(r, NodeFilter.SHOW_COMMENT); const com = [];
  while (w.nextNode()) com.push(w.currentNode);
  com.forEach(function(c){ c.remove(); });
  return t.innerHTML;                                  // sin sacar el contenido del <template> (no se carga nada)
}
guardarPlan = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const p = clienteActual && PLANES[clienteActual];
    if (p && p.ent) p.ent = fsdLimpiarEnt(p.ent);
    return r;
  };
})(guardarPlan);
/* plantillas propias de entreno: también sin botones */
if (typeof enConfirmarPlantilla === 'function') {
  (function(){
    try {
      const l = JSON.parse(localStorage.getItem(EN_PLANT_KEY) || '{}'); let cambio = false;
      Object.keys(l).forEach(function(n){ const v = fsdLimpiarEnt(l[n]); if (v !== l[n]) { l[n] = v; cambio = true; } });
      if (cambio) localStorage.setItem(EN_PLANT_KEY, JSON.stringify(l));
    } catch(e){}
  })();
  enConfirmarPlantilla = (function(orig){
    return function(){
      orig.apply(this, arguments);
      try { const l = JSON.parse(localStorage.getItem(EN_PLANT_KEY) || '{}'); Object.keys(l).forEach(function(n){ l[n] = fsdLimpiarEnt(l[n]); }); localStorage.setItem(EN_PLANT_KEY, JSON.stringify(l)); } catch(e){}
    };
  })(enConfirmarPlantilla);
}
/* al abrir: los planes guardados con el sistema anterior se aligeran y todo se guarda comprimido
   (se reescribe lo que hay guardado, sin tocar la sesión abierta) */
(function(){
  Object.keys(PLANES).forEach(function(k){ const p = PLANES[k]; if (p && p.ent) p.ent = fsdLimpiarEnt(p.ent); });
  try {
    const crudo = typeof fsdCrudo === 'function' ? fsdCrudo(DB_KEY) : null;
    if (!crudo) return;
    const d = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); if (!d || !d.planes) return;
    let cambio = crudo.indexOf('LZ2:') !== 0;
    Object.keys(d.planes).forEach(function(k){ const p = d.planes[k]; if (p && p.ent) { const v = fsdLimpiarEnt(p.ent); if (v !== p.ent) { p.ent = v; cambio = true; } } });
    if (cambio) localStorage.setItem(DB_KEY, JSON.stringify(d));
  } catch(e){}
})();

/* ---------- medidor de espacio con el tamaño real (comprimido) y aviso al 80 % ---------- */
const FSD_LIMITE = 5 * 1024 * 1024;                   // ~5 MB: lo más prudente (iPhone)
if (typeof mjEspacio === 'function') mjEspacio = function(){ return (typeof fsdTamGuardado === 'function' ? fsdTamGuardado() : 0) * 2; };
function fsdAvisoMemoria(){
  if (!coachActivo || typeof mjEspacio !== 'function') return;
  const pct = Math.round(mjEspacio() / FSD_LIMITE * 100);
  if (pct < 80) return;
  if (typeof tocaAvisar === 'function' && !tocaAvisar('memoria-80')) return;
  toast('⚠️ La memoria de la app va por el ' + pct + ' %. Descarga una copia en Ajustes y borra fotos o audios antiguos del chat.');
}
entrarAlPanel = (function(orig){ return function(){ orig.apply(this, arguments); setTimeout(fsdAvisoMemoria, 800); }; })(entrarAlPanel);

/* limpieza interna 21/10: los ganchos «después de…» se instalan al final de la carga */
fsdInstalarGanchos();
