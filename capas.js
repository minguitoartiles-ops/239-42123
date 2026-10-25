/* =========================================================
   Fitnessindramas — Capas por encima (25/10/2026, #231)
   Todas las ventanas que se abren encima (fotos, términos, políticas, licencia, hojas, diálogos, buscadores…)
   se cierran al tocar fuera y con el botón «atrás» del móvil, sin salir de la pantalla en la que estabas.
   · Se cierra la de más arriba.
   · Las obligatorias (cookies, consentimiento de salud y de imagen, acceso pausado) no se cierran así.
   · Si en una hoja se ha escrito algo, pregunta antes de cerrarla para no perder los cambios.
   ========================================================= */
const CAPA_FIJAS = ['cookieBanner', 'consentSalud', 'consentImagen', 'mjBloqueo'];
const CAPA_SIN_AVISO = ['proPass', 'dlgOverlay', 'legalOverlay', 'cookieConfig'];
function capaCierres(){
  return {
    cmMenu: window.cmCerrar, cmVisor: window.cmCerrarVisor, cmFw: window.cmCerrarHoja, nhCompra: window.nhCerrarCompra, obBienvenida: window.obCerrar,
    proPass: window.cerrarPassPro, dlgOverlay: function(){ cerrarDialogo(false); }, legalOverlay: window.cerrarLegal,
    cookieConfig: window.cookiesCerrarConfig, videoModal: window.cerrarVideoModal, recursoPop: window.cerrarRecurso,
    foodPicker: window.closeFoodPicker, exPicker: window.closeExercisePicker
  };
}
function capaVis(el){
  if (!el || !el.isConnected) return false;
  if (el.classList.contains('fsd-overlay') || el.classList.contains('picker-overlay') || el.classList.contains('sg-foto-grande')) { if (!el.classList.contains('show')) return false; }
  const cs = getComputedStyle(el);
  return cs.display !== 'none' && cs.visibility !== 'hidden' && el.getClientRects().length > 0;
}
function capasAbiertas(){
  const l = Array.prototype.slice.call(document.querySelectorAll('.fsd-overlay, .picker-overlay, .sg-foto-grande, .cm-fw, #cmVisor, #cmMenu, #obBienvenida')).filter(capaVis);
  l.sort(function(a, b){
    const za = +getComputedStyle(a).zIndex || 0, zb = +getComputedStyle(b).zIndex || 0;
    if (za !== zb) return za - zb;
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });
  return l;
}
function capaArriba(){ const l = capasAbiertas(); return l[l.length - 1] || null; }
function capaCerrarYa(el){
  const f = capaCierres()[el.id];
  delete el.dataset.capaSucia;
  if (typeof f === 'function') { try { f(); } catch(e){} }
  if (el.isConnected && capaVis(el)) {
    if (el.classList.contains('fsd-overlay') && typeof mjCerrarHoja === 'function' && el.id) mjCerrarHoja(el.id);
    el.classList.remove('show');
    if (el.id === 'cmVisor' || el.id === 'cmMenu' || el.id === 'obBienvenida' || el.classList.contains('cm-fw')) el.remove();
  }
}
/* devuelve true si la ha cerrado o si no se puede cerrar (para que «atrás» no haga nada más) */
function capaCerrar(el){
  if (!el) return false;
  if (CAPA_FIJAS.indexOf(el.id) > -1 || el.id === 'obBienvenida') return true;   // el recorrido se cierra con «Saltar»
  if (el.dataset.capaSucia === '1' && CAPA_SIN_AVISO.indexOf(el.id) < 0 && typeof abrirDialogo === 'function') {
    abrirDialogo({ titulo: '¿Cerrar sin guardar?', texto: 'Has hecho cambios en esta ventana. Si la cierras ahora, se perderán.', ok: 'Cerrar sin guardar', cancel: 'Seguir editando', peligro: true,
      onOk: function(){ capaCerrarYa(el); } });
    return true;
  }
  capaCerrarYa(el);
  return true;
}
/* cambios sin guardar: cualquier cosa escrita en una hoja (no cuentan los buscadores) */
document.addEventListener('input', function(e){
  const t = e.target; if (!t || !t.closest) return;
  if (t.type === 'search' || /buscar|search/i.test(t.className + ' ' + (t.placeholder || '') + ' ' + (t.id || ''))) return;
  const c = t.closest('.fsd-overlay'); if (c && CAPA_SIN_AVISO.indexOf(c.id) < 0) c.dataset.capaSucia = '1';
}, true);
if (typeof mjHoja === 'function') mjHoja = (function(orig){ return function(id){ const o = orig.apply(this, arguments); if (o) delete o.dataset.capaSucia; return o; }; })(mjHoja);
if (typeof mjCerrarHoja === 'function') mjCerrarHoja = (function(orig){ return function(id){ const o = document.getElementById(id); if (o) delete o.dataset.capaSucia; return orig.apply(this, arguments); }; })(mjCerrarHoja);

/* tocar fuera: solo cuenta si se pulsa y se suelta sobre el fondo de la capa (no al arrastrar desde dentro) */
let capaPulsada = null;
document.addEventListener('pointerdown', function(e){ capaPulsada = e.target; }, true);
document.addEventListener('click', function(e){
  const t = e.target, desde = capaPulsada; capaPulsada = null;
  if (!t || t !== desde) return;
  const arriba = capaArriba();
  if (!arriba || t !== arriba) return;
  if (arriba.id === 'cmMenu') return;            // el menú del chat ya se cierra solo al tocar fuera
  e.stopPropagation();
  capaCerrar(arriba);
}, false);

/* botón atrás del móvil (y Esc en el ordenador): primero la capa de más arriba */
atrasDentroApp = (function(orig){
  return function(){
    const arriba = capaArriba();
    if (arriba && arriba.id === 'obBienvenida') return orig.apply(this, arguments);   // el recorrido va paso a paso
    if (arriba) return capaCerrar(arriba);
    return orig.apply(this, arguments);
  };
})(atrasDentroApp);
document.addEventListener('keydown', function(e){
  if (e.key !== 'Escape' || e.defaultPrevented) return;
  const arriba = capaArriba(); if (!arriba) return;
  const a = document.activeElement;
  if (a && a.closest && a.closest('.rc-ing') && document.getElementById('rcSug')) return;   // primero se cierra la lista del buscador de recetas
  e.preventDefault(); capaCerrar(arriba);
});
