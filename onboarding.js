/* =========================================================
   Fitnessindramas — Bienvenida del cliente (25/10/2026, tarea #186)
   La primera vez que entra un cliente nuevo (aún sin ningún seguimiento):
   1. qué es la app · 2. dónde está cada cosa · 3. cómo instalarla (Android e iPhone)
   Al terminar le propone hacer su primer seguimiento, con una guía paso a paso arriba del formulario.
   Se muestra una sola vez por cliente (clientesData[k].bienvenida).
   ========================================================= */
let obPaso = 0;
function obCliente(){ return window.fsdSesionCliente && clienteActual && !isCoachView() && document.getElementById('app').style.display !== 'none'; }
function obToca(){
  if (!obCliente()) return false;
  const d = clientesData[clienteActual]; if (!d || d.bienvenida) return false;
  if ((SEGUIMIENTOS[clienteActual] || []).length) { d.bienvenida = 'antigua'; return false; }   // ya usa la app: no se le enseña
  /* que no se cruce con los avisos de la primera vez (cookies, consentimientos, diálogos) */
  if (document.querySelector('.fsd-overlay.show, .picker-overlay.show, .noti-pop.show, [aria-modal="true"].show, #nhCompra, #cmVisor') || capaVisible('dlgOverlay')) return false;
  return true;
}
function obInstalada(){ try { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch(e){ return false; } }
function obIos(){ return /iPhone|iPad|iPod/.test(navigator.userAgent); }
function obPasos(){
  const d = clientesData[clienteActual] || {}, nom = ((d.nombre || '').split(' ')[0]) || '';
  const inst = obInstalada()
    ? '<p class="ob-ok">✓ Ya la tienes instalada. Ábrela siempre desde su icono.</p>'
    : (obIos()
      ? '<ol class="ob-lista"><li>Abre este enlace en <b>Safari</b> (no dentro de WhatsApp ni Instagram).</li><li>Toca el botón <b>Compartir</b> <span aria-hidden="true">⬆️</span> abajo.</li><li>Elige <b>«Añadir a pantalla de inicio»</b>.</li></ol><p class="ob-nota">Así te llegarán los avisos de tu equipo y tus datos estarán más seguros.</p>'
      : '<ol class="ob-lista"><li>Toca el menú <b>⋮</b> del navegador (arriba a la derecha).</li><li>Elige <b>«Instalar aplicación»</b> o <b>«Añadir a pantalla de inicio»</b>.</li><li>Ábrela desde su icono a partir de ahora.</li></ol><p class="ob-nota">Así te llegarán los avisos de tu equipo.</p>');
  return [
    { e: '👋', t: '¡Hola' + (nom ? ', ' + esc(nom) : '') + '!', h: '<p>Este es tu espacio con <b>Domingo</b> (entreno) y <b>Fátima</b> (nutrición). Aquí tienes tu plan, registras tu progreso y hablas con tu equipo.</p><p>Te enseñamos lo básico en un minuto.</p>' },
    { e: '🧭', t: 'Dónde está cada cosa', h: '<ul class="ob-sitios">'
        + '<li><span>☀️</span><div><b>Hoy</b>Lo que toca hoy: entreno, comida y avisos.</div></li>'
        + '<li><span>🍕</span><div><b>Nutrición</b>Tu plan, el agua y la lista de la compra.</div></li>'
        + '<li><span>🏋️</span><div><b>Entreno</b>Tus sesiones: apunta peso y repeticiones de cada serie.</div></li>'
        + '<li><span>💬</span><div><b>Chat</b>Habla con Domingo y Fátima cuando lo necesites.</div></li>'
        + '<li><span>📋</span><div><b>Seguimiento</b>Una vez por semana: peso, medidas y cómo te sientes.</div></li></ul>' },
    { e: '📲', t: 'Instálala en tu móvil', h: inst }
  ];
}
function obAbrir(){
  obCerrar(); obPaso = 0;
  const o = document.createElement('div'); o.id = 'obBienvenida'; o.className = 'ob-capa';
  o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'obTit');
  (document.getElementById('screenRoot') || document.body).appendChild(o);
  o.addEventListener('click', function(e){
    const b = e.target.closest('[data-ob]'); if (!b) return;
    const a = b.dataset.ob;
    if (a === 'sig') { if (obPaso < 2) { obPaso++; obPintar(); } else obTerminar(); }
    else if (a === 'ant') { if (obPaso > 0) { obPaso--; obPintar(); } }
    else if (a === 'saltar') obTerminar();
  });
  obPintar();
}
function obPintar(){
  const o = document.getElementById('obBienvenida'); if (!o) return;
  const p = obPasos()[obPaso];
  o.innerHTML = '<div class="ob-in">'
    + '<button type="button" class="ob-saltar" data-ob="saltar">Saltar</button>'
    + '<div class="ob-e" aria-hidden="true">' + p.e + '</div><h2 id="obTit">' + p.t + '</h2><div class="ob-txt">' + p.h + '</div>'
    + '<div class="ob-puntos" aria-label="Paso ' + (obPaso + 1) + ' de 3">' + [0, 1, 2].map(function(i){ return '<i class="' + (i === obPaso ? 'on' : '') + '"></i>'; }).join('') + '</div>'
    + '<div class="ob-acts">' + (obPaso ? '<button type="button" class="ob-ant" data-ob="ant">Atrás</button>' : '')
    + '<button type="button" class="btn-primary ob-sig" data-ob="sig">' + (obPaso < 2 ? 'Siguiente' : 'Empezar') + '</button></div></div>';
  try { o.querySelector('.ob-sig').focus(); } catch(e){}
}
function obCerrar(){ const o = document.getElementById('obBienvenida'); if (o) o.remove(); }
function obTerminar(){
  const d = clientesData[clienteActual]; if (d) { d.bienvenida = new Date().toISOString(); try { guardarTodo(); } catch(e){} }
  obCerrar();
  if (!(SEGUIMIENTOS[clienteActual] || []).length) {
    abrirDialogo({ titulo: '¿Hacemos tu primer seguimiento?', texto: 'Tardas unos 2 minutos: tu peso, tus medidas y cómo te sientes. Así Domingo y Fátima ajustan tu plan desde el primer día.',
      ok: 'Ahora', cancel: 'Más tarde', onOk: function(){ goTo('seguimiento'); } });
  }
}
/* guía arriba del formulario del primer seguimiento */
function obGuia(){
  const v = document.getElementById('view-seguimiento'); if (!v) return;
  let g = document.getElementById('obGuia');
  const toca = obCliente() && !(SEGUIMIENTOS[clienteActual] || []).length && !(clientesData[clienteActual] || {}).guiaVista;
  if (!toca) { if (g) g.remove(); return; }
  if (!g) {
    g = document.createElement('div'); g.id = 'obGuia'; g.className = 'ob-guia';
    g.innerHTML = '<div class="ob-guia-h"><b>📋 Tu primer seguimiento</b><button type="button" aria-label="Cerrar la guía">✕</button></div>'
      + '<p class="ob-guia-i">Son unas pocas pantallas: responde y pulsa «Siguiente». Unos consejos:</p>'
      + '<ul><li><b>Cómo te sientes:</b> marca con sinceridad, no hay respuestas malas.</li><li><b>Peso:</b> mejor en ayunas, después de ir al baño.</li>'
      + '<li><b>Medidas:</b> con cinta métrica, sin apretar (cintura a la altura del ombligo).</li><li><b>Fotos (si quieres):</b> con buena luz, de frente, de lado y de espaldas.</li></ul>'
      + '<p>Al enviarlo, tu equipo lo recibe al momento.</p>';
    g.querySelector('button').onclick = function(){ const d = clientesData[clienteActual]; if (d) { d.guiaVista = 1; try { guardarTodo(); } catch(e){} } g.remove(); };
    const top = v.querySelector('.view-top, .topline');
    if (top) top.insertAdjacentElement('afterend', g); else v.insertBefore(g, v.firstChild);
  }
}
fsdTras('goTo', function(r, n){ if (n === 'seguimiento') setTimeout(obGuia, 0); });
if (typeof atrasDentroApp === 'function') atrasDentroApp = (function(orig){
  return function(){
    if (document.getElementById('obBienvenida')) { if (obPaso > 0) { obPaso--; obPintar(); } else obTerminar(); return true; }
    return orig.apply(this, arguments);
  };
})(atrasDentroApp);
setInterval(function(){ if (!document.getElementById('obBienvenida') && obToca()) obAbrir(); }, 1200);
