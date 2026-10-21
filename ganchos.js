/* =========================================================
   Fitness sin Dramas — Ganchos «después de…» (21/10/2026 · limpieza interna)
   En vez de envolver una función una y otra vez (goTo llegó a tener 30 capas), cada módulo
   registra lo que quiere hacer después con fsdTras('goTo', fn). Al final de la carga
   (fsdInstalarGanchos, en datos.js) se envuelve cada función UNA sola vez, como capa exterior,
   y cada gancho corre aislado: si uno falla, los demás siguen y la pantalla no se rompe.
   fn recibe (resultado, ...argumentos originales).
   ========================================================= */
const FSD_GANCHOS = {};
let fsdGanchosListos = false;
function fsdTras(nombre, fn){
  (FSD_GANCHOS[nombre] = FSD_GANCHOS[nombre] || []).push(fn);
  if (fsdGanchosListos) fsdEnvolver(nombre);
}
function fsdEnvolver(nombre){
  const orig = window[nombre];
  if (typeof orig !== 'function' || orig.__fsdGanchos) return;
  const env = function(){
    const r = orig.apply(this, arguments), args = [r].concat(Array.prototype.slice.call(arguments));
    (FSD_GANCHOS[nombre] || []).forEach(function(f){ try { f.apply(this, args); } catch(e){ try { console.error('[gancho ' + nombre + ']', e); } catch(_){} } }, this);
    return r;
  };
  env.__fsdGanchos = true;
  window[nombre] = env;
}
function fsdInstalarGanchos(){ fsdGanchosListos = true; Object.keys(FSD_GANCHOS).forEach(fsdEnvolver); }
