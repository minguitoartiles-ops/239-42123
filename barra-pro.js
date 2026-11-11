/* =========================================================
   11/11/2026 · Barra del profesional en el móvil (auditoría guías oficiales, punto 7)
   «Pagos» pasa a ser pestaña propia y desaparece «Más» (Apple pide evitarla).
   Ajustes se abre con el botón de la rueda en la cabecera, junto a la campana.
   Las recetas de Fátima se abren desde su pestaña «Nutrición».
   En el ordenador (html.esc) no cambia nada: allí el menú lateral ya muestra todo.
   Se carga la última, después de todas las capas que tocan abrirTabPro y pintarTabsPro.
   ========================================================= */
(function(){
  const esEsc = function(){ return typeof escActivo === 'function' && escActivo(); };
  const PESTANAS = { clientes: 'ctab-clientes', segs: 'ctab-segs', planes: 'ctab-planes', chats: 'ctab-chats', pagos: 'ctab-pagos' };
  let origenAjustes = 'clientes';   // pestaña desde la que se abrió Ajustes o Recetas

  /* rueda de Ajustes en la cabecera de cada pestaña, a la izquierda de la campana */
  const RUEDA = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';
  ['view-coach-panel', 'view-coach-segs', 'view-coach-chats', 'view-coach-planes', 'view-coach-pagos'].forEach(function(id){
    const top = document.querySelector('#' + id + ' .alta-top');
    if (!top || top.querySelector('.pro-cfg')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'bell pro-cfg'; b.setAttribute('aria-label', 'Ajustes');
    b.style.order = '2';
    b.addEventListener('click', function(){ abrirTabPro('ajustes'); });
    b.innerHTML = RUEDA;
    top.appendChild(b);
  });

  /* Ajustes y Recetas recuerdan la pestaña de origen para volver a ella */
  abrirTabPro = (function(orig){
    return function(t){
      if (!esEsc()) {
        if (t === 'mas') t = 'ajustes';                              // nadie llega ya a «Más» en el móvil
        if ((t === 'ajustes' || t === 'recetas') && PESTANAS[tabProActual]) origenAjustes = tabProActual;
      }
      const r = orig.call(this, t);
      if (!esEsc()) pintarTabsPro();                                  // otras capas desmarcan Pagos después de pintar
      return r;
    };
  })(abrirTabPro);

  /* la pestaña marcada: Pagos cuando toca; en Ajustes o Recetas, la de origen */
  pintarTabsPro = (function(orig){
    return function(){
      const r = orig.apply(this, arguments);
      if (esEsc()) return r;
      const t = PESTANAS[tabProActual] ? tabProActual : origenAjustes;
      Object.keys(PESTANAS).forEach(function(k){
        const b = document.getElementById(PESTANAS[k]); if (b) b.classList.toggle('active', k === t);
      });
      const m = document.getElementById('ctab-mas'); if (m) m.classList.remove('active');
      return r;
    };
  })(pintarTabsPro);

  /* atrás desde Ajustes o Recetas: a la pestaña de origen (antes iba a «Más») */
  atrasPorNiveles = (function(orig){
    return function(){
      const vis = pantallaVisible();
      if (coachActivo && !esEsc() && (vis === 'view-coach-ajustes' || vis === 'view-coach-recetas')) { abrirTabPro(origenAjustes); return; }
      if (coachActivo && !esEsc() && vis === 'view-coach-pagos') { abrirTabPro('clientes'); return; }
      return orig.apply(this, arguments);
    };
  })(atrasPorNiveles);
  /* Ajustes ya no es pestaña en el móvil: su «‹ Volver» se ve y vuelve a la pestaña de origen */
  const ajVolver = document.querySelector('#view-coach-ajustes .alta-top .back-btn');
  if (ajVolver) { ajVolver.removeAttribute('onclick'); ajVolver.addEventListener('click', function(){ if (esEsc()) backToPanel(); else atrasPorNiveles(); }); }
  const rcVolver = document.querySelector('#view-coach-recetas .rc-volver');
  if (rcVolver) { rcVolver.removeAttribute('onclick'); rcVolver.addEventListener('click', function(){ atrasPorNiveles(); }); }

  /* Recetas para clientes: acceso en la pestaña «Nutrición» de Fátima (en el móvil) */
  if (typeof enPintarPlanes === 'function') enPintarPlanes = (function(orig){
    return function(){
      const r = orig.apply(this, arguments);
      try {
        const cont = document.getElementById('planesPro');
        const fatima = coachActivo && coachActivo.rol === 'dietista' && !(typeof arRol === 'function' && arRol() === 'entrenador');
        if (cont && fatima && !esEsc() && typeof rcDatos === 'function' && !cont.querySelector('.pro-recetas')) {
          const n = rcDatos().lista.length;
          cont.insertAdjacentHTML('afterbegin', '<div class="list-group pro-recetas"><button type="button" class="list-row" onclick="abrirTabPro(\'recetas\')"><span>Recetas para clientes</span><span class="ajx-acts">' + (n ? '<span class="rc-num">' + n + '</span>' : '') + '<span class="chev" aria-hidden="true">›</span></span></button></div>');
        }
      } catch(e){}
      return r;
    };
  })(enPintarPlanes);
})();
