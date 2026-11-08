/* =========================================================
   Fitnessindramas — Modo servidor · plantillas propias (8/11/2026)
   Solo en modo servidor (?servidor=pruebas). Se carga después de servidor-cuenta.js.

   Las plantillas de entrenamiento de Domingo y las de nutrición de Fátima estaban solo en el aparato donde
   se guardaron. Ahora viajan al servidor (tabla «plantillas»; cada profesional ve solo las suyas):
   · al entrar y al volver a la app, y tras guardar o borrar una, se pone todo al día;
   · las que ya había en el aparato suben solas la primera vez, y las del servidor bajan a los demás aparatos;
   · «borrar» archiva en el servidor (nada se borra de verdad desde la app);
   · si la misma cambia en dos aparatos, gana la del aparato donde se acaba de editar.
   Para saber qué cambió y dónde, cada aparato recuerda cómo estaba cada plantilla en la última puesta al día.
   ========================================================= */
/* 8/11 · Todo va dentro de su propia función y con nombres «svPt…»: antes se llamaban «svPl…», como los de
   servidor-planes.js, y «svPlProgramar» (declarada dentro de este bloque) sustituía a la de los planes en toda la app.
   Desde entonces, lo que apuntaba el cliente (pesos, series, sesiones y comidas hechas) no se subía al escribirlo,
   solo al volver a abrir la app. */
(function(){
if (svActivo()) {
  const SV_PT = {
    ent: { clave: 'fsd_plantillas_ent', area: 'entreno', rol: 'entrenador', base: 'fsd_pl_base_ent', hoja: 'enPlantillas', pintar: function(){ abrirPlantillas(); } },
    nut: { clave: 'fsd_plantillas_nut', area: 'nutricion', rol: 'dietista', base: 'fsd_pl_base_nut', hoja: 'nuPlantillas', pintar: function(){ abrirPlantillasNut(); } }
  };
  let svPtOcupado = false, svPtOtra = false, svPtTimer = null;

  function svPtCfg(){ const r = typeof coachActivo !== 'undefined' && coachActivo && coachActivo.rol; return r === 'entrenador' ? SV_PT.ent : (r === 'dietista' ? SV_PT.nut : null); }
  function svPtJson(clave){ try { const o = JSON.parse(localStorage.getItem(clave) || '{}'); return o && typeof o === 'object' && !Array.isArray(o) ? o : {}; } catch(e){ return {}; } }
  // texto estable (claves ordenadas): el servidor puede devolver las claves en otro orden
  function svPtEstable(v){
    if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
    if (Array.isArray(v)) return '[' + v.map(svPtEstable).join(',') + ']';
    return '{' + Object.keys(v).sort().map(function(k){ return JSON.stringify(k) + ':' + svPtEstable(v[k]); }).join(',') + '}';
  }
  function svPtHash(v){ const s = svPtEstable(v); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h + ':' + s.length; }

  function svPtSincronizar(){
    const cfg = svPtCfg(); if (!cfg) return Promise.resolve();
    if (svPtOcupado) { svPtOtra = true; return Promise.resolve(); }
    svPtOcupado = true;
    return svCargar().then(function(x){
      return x.plantillas.lista().then(function(filas){
        const S = {}; filas.forEach(function(f){ if (f.area === cfg.area) S[f.nombre] = f; });
        const L = svPtJson(cfg.clave), B = svPtJson(cfg.base), nuevaBase = {}, tareas = [];
        let cambioLocal = false;
        const valorS = function(f){ return f && f.contenido ? f.contenido.v : undefined; };
        const nombres = {}; Object.keys(L).forEach(function(n){ nombres[n] = 1; }); Object.keys(S).forEach(function(n){ nombres[n] = 1; });
        Object.keys(nombres).forEach(function(n){
          const f = S[n], enL = Object.prototype.hasOwnProperty.call(L, n), enS = !!(f && !f.archivada);
          const hL = enL ? svPtHash(L[n]) : null, hS = enS ? svPtHash(valorS(f)) : null, hB = B[n];
          const subir = function(){
            tareas.push((f ? x.plantillas.cambiar(f.id, { v: L[n] }) : x.plantillas.crear(cfg.area, n, { v: L[n] })).then(function(){ nuevaBase[n] = hL; }, function(){ if (hB !== undefined) nuevaBase[n] = hB; }));
          };
          if (enL && enS) {
            if (hL === hS) nuevaBase[n] = hS;
            else if (hB === undefined || hL !== hB) subir();                         // la he cambiado aquí: gana este aparato
            else { L[n] = valorS(f); cambioLocal = true; nuevaBase[n] = hS; }       // la cambió otro aparato: baja
          } else if (enL && !enS) {
            if (hB !== undefined && hL === hB) { delete L[n]; cambioLocal = true; }  // se borró en otro aparato y aquí no se tocó
            else subir();                                                            // nueva (o cambiada) aquí
          } else if (!enL && enS) {
            if (hB !== undefined) tareas.push(x.plantillas.archivar(f.id).then(function(){}, function(){ nuevaBase[n] = hB; }));   // la borré aquí
            else { L[n] = valorS(f); cambioLocal = true; nuevaBase[n] = hS; }        // nueva del servidor
          }
        });
        return Promise.all(tareas).then(function(){
          try { localStorage.setItem(cfg.base, JSON.stringify(nuevaBase)); } catch(e){}
          if (cambioLocal) {
            try { localStorage.setItem(cfg.clave, JSON.stringify(L)); } catch(e){}
            try { if (typeof capaVisible === 'function' && capaVisible(cfg.hoja)) cfg.pintar(); } catch(e){}
          }
        });
      });
    }).catch(function(){}).then(function(){
      svPtOcupado = false;
      if (svPtOtra) { svPtOtra = false; svPtProgramar(); }
    });
  }
  window.svPtSincronizar = svPtSincronizar;                       // para ponerlas al día desde fuera (y en las pruebas)
  function svPtProgramar(){ clearTimeout(svPtTimer); svPtTimer = setTimeout(svPtSincronizar, 600); }
  window.svPtSincronizar = svPtSincronizar;

  window.addEventListener('fsd:pro-dentro', function(){ setTimeout(svPtSincronizar, 800); });
  window.addEventListener('fsd:al-volver', function(){ if (svPtCfg()) svPtProgramar(); });

  /* tras guardar o borrar una plantilla */
  if (typeof enConfirmarPlantilla === 'function') enConfirmarPlantilla = (function(orig){ return function(){ const r = orig.apply(this, arguments); svPtProgramar(); return r; }; })(enConfirmarPlantilla);
  if (typeof enBorrarPlantilla === 'function') enBorrarPlantilla = (function(orig){ return function(){ const r = orig.apply(this, arguments); svPtProgramar(); return r; }; })(enBorrarPlantilla);
  if (typeof nuGuardarMisPlantillas === 'function') nuGuardarMisPlantillas = (function(orig){ return function(){ const r = orig.apply(this, arguments); if (r) svPtProgramar(); return r; }; })(nuGuardarMisPlantillas);
}
})();
