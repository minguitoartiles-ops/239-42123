/* =========================================================
   11/11/2026 · MUESTRA «diseño de la web»: se activa solo con ?diseno=web en la dirección.
   Añade la clase html.dw y carga diseno-web.css. Los emojis de la app se mantienen
   (decisión de Domingo, 11/11). No guarda nada: sin ?diseno=web todo sigue como siempre.
   ========================================================= */
(function(){
  let activa = false;
  try { activa = new URLSearchParams(location.search).get('diseno') === 'web'; } catch(e){}
  if (!activa) return;
  document.documentElement.classList.add('dw');
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'diseno-web.css';
  document.head.appendChild(l);
})();
