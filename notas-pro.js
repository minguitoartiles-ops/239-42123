/* =========================================================
   23/11/2026 · «Mis tareas»: agenda personal de cada profesional (pedido por Domingo)
   · Pantalla propia en el móvil y en el ordenador (decisión de Domingo, 23/11): en el ordenador,
     «Tareas» en el menú lateral, debajo de «Pagos»; en el móvil, el botón de la lista en la cabecera
     de cada pestaña, junto a la campana (la barra de abajo ya tiene 5 pestañas).
   · Texto libre (competiciones, cambios de plan, recordatorios…) con fecha opcional.
   · Personal: solo la ve quien la escribe (lo decide el servidor). Se ve igual en todos sus aparatos.
   · Orden: primero las que tienen fecha (las de hoy o ya pasadas, resaltadas), después las demás.
     Las hechas se guardan aparte, plegadas.
   Solo en modo servidor y con sesión de profesional. Sin manejadores en línea: todo va por data-nt.
   ========================================================= */
(function(){
  const D = function(){ return window.fsdDatos || null; };
  const E = function(s){ return fsdEsc(s); };
  const MSG = function(e, g){ return (window.fsdDatos && fsdDatos.esErrorAcceso(e) && e.message) || g; };
  const est = { notas: null, cargando: false, verHechas: false, borrar: null, borrarT: null, guardando: false };
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function activo(){ return !!D() && typeof coachActivo !== 'undefined' && !!coachActivo; }
  function hoy(){ return mjISO(new Date()); }
  function textoFecha(f){
    const n = mjDias(hoy(), f);
    if (n === 0) return 'Hoy';
    if (n === 1) return 'Mañana';
    if (n === -1) return 'Ayer';
    const d = new Date(f + 'T12:00:00');
    return d.getDate() + ' ' + MESES[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '');
  }
  function ordenar(a, b){
    if (a.fecha && b.fecha) return a.fecha < b.fecha ? -1 : (a.fecha > b.fecha ? 1 : (a.creada < b.creada ? 1 : -1));
    if (a.fecha) return -1;
    if (b.fecha) return 1;
    return a.creada < b.creada ? 1 : -1;
  }

  /* ---------- la tarjeta ---------- */
  function tarjeta(){
    let c = document.getElementById('ntCard');
    if (c) return c;
    const panel = document.querySelector('#view-coach-tareas .alta-body');
    if (!panel) return null;
    c = document.createElement('section');
    c.id = 'ntCard'; c.className = 'nt-card'; c.setAttribute('aria-labelledby', 'ntTit');
    c.innerHTML = '<div class="nt-cab"><h2 class="nt-tit" id="ntTit">Pendientes</h2><span class="nt-hoy" id="ntHoy" hidden></span></div>'
      + '<form class="nt-nueva" id="ntForm" autocomplete="off">'
      + '<label class="sr-only" for="ntTexto">Nueva tarea</label>'
      + '<input id="ntTexto" type="text" maxlength="500" placeholder="Competición, cambio de plan, recordatorio…">'
      + '<div class="nt-fila"><label class="nt-fecha"><span>Fecha</span><input id="ntFecha" type="date" aria-label="Fecha (opcional)"></label>'
      + '<button type="submit" class="nt-add">Añadir</button></div>'
      + '</form>'
      + '<ul class="nt-lista" id="ntLista" aria-live="polite"></ul>'
      + '<div class="nt-pie" id="ntPie"></div>'
      + '<p class="nt-priv">Solo las ves tú.</p>';
    panel.appendChild(c);
    c.querySelector('#ntForm').addEventListener('submit', function(ev){ ev.preventDefault(); nueva(); });
    c.addEventListener('click', clic);
    c.addEventListener('change', function(ev){
      const x = ev.target.closest('input[data-nt="hecha"]'); if (x) marcar(x.closest('[data-id]').getAttribute('data-id'), x.checked);
    });
    return c;
  }

  function fila(n){
    const vence = n.fecha && !n.hecha && n.fecha <= hoy();
    const bor = est.borrar === n.id;
    return '<li class="nt-item' + (n.hecha ? ' hecha' : '') + (vence ? ' vence' : '') + '" data-id="' + E(n.id) + '">'
      + '<input type="checkbox" data-nt="hecha" aria-label="' + (n.hecha ? 'Marcar como pendiente' : 'Marcar como hecha') + '"' + (n.hecha ? ' checked' : '') + '>'
      + '<div class="nt-txt">' + E(n.texto) + (n.fecha ? '<span class="nt-dia">' + E(textoFecha(n.fecha)) + '</span>' : '') + '</div>'
      + '<button type="button" class="nt-x' + (bor ? ' seguro' : '') + '" data-nt="borrar" aria-label="' + (bor ? 'Pulsa otra vez para borrar' : 'Borrar nota') + '">' + (bor ? '¿Borrar?' : '✕') + '</button>'
      + '</li>';
  }
  function pintar(){
    const c = document.getElementById('ntCard');
    if (!activo()) { if (c) c.hidden = true; return; }
    const t = tarjeta(); if (!t) return;
    t.hidden = false;
    const L = t.querySelector('#ntLista'), P = t.querySelector('#ntPie'), H = t.querySelector('#ntHoy');
    if (est.notas === null) { avisos(0); L.innerHTML = '<li class="nt-vacio">' + (est.cargando ? 'Cargando tus notas…' : 'No se han podido cargar tus notas.') + '</li>'; P.innerHTML = ''; H.hidden = true; return; }
    const pend = est.notas.filter(function(n){ return !n.hecha; }).sort(ordenar);
    const hechas = est.notas.filter(function(n){ return n.hecha; }).sort(function(a, b){ return a.creada < b.creada ? 1 : -1; });
    L.innerHTML = pend.length ? pend.map(fila).join('') : '<li class="nt-vacio">Nada pendiente. Apunta aquí lo que no quieras olvidar.</li>';
    if (est.verHechas && hechas.length) L.insertAdjacentHTML('beforeend', hechas.map(fila).join(''));
    P.innerHTML = hechas.length ? '<button type="button" class="nt-ver" data-nt="ver">' + (est.verHechas ? 'Ocultar hechas' : 'Ver hechas (' + hechas.length + ')') + '</button>' : '';
    const n = pend.filter(function(x){ return x.fecha && x.fecha <= hoy(); }).length;
    H.hidden = !n; H.textContent = n === 1 ? '1 para hoy' : n + ' para hoy';
    avisos(n);
  }
  function avisos(n){
    const m = document.getElementById('ctabTareasN'); if (m) { m.hidden = !n; m.textContent = n; }
    Array.prototype.forEach.call(document.querySelectorAll('.pro-tareas .bell-badge'), function(x){ x.classList.toggle('hide', !n); x.textContent = n; });
  }

  /* ---------- servidor ---------- */
  function cargar(){
    if (!activo() || est.cargando) return;
    est.cargando = true; pintar();
    D().notas.lista().then(function(l){ est.notas = l; }, function(){ if (est.notas === null) est.notas = null; })
      .finally(function(){ est.cargando = false; pintar(); });
  }
  function nueva(){
    const t = document.getElementById('ntTexto'), f = document.getElementById('ntFecha');
    const txt = (t.value || '').trim();
    if (!txt) { t.focus(); return; }
    if (est.guardando) return;
    est.guardando = true;
    D().notas.nueva(txt, f.value || null).then(function(n){
      (est.notas = est.notas || []).push(n);
      t.value = ''; f.value = '';
      pintar();
    }, function(e){ try { toast(MSG(e, 'No se ha podido guardar la nota')); } catch(_){} })
      .finally(function(){ est.guardando = false; });
  }
  function buscar(id){ return (est.notas || []).filter(function(n){ return n.id === id; })[0]; }
  function marcar(id, hecha){
    const n = buscar(id); if (!n) return;
    const antes = n.hecha; n.hecha = hecha; pintar();
    D().notas.cambiar(id, { hecha: hecha }).catch(function(e){
      n.hecha = antes; pintar();
      try { toast(MSG(e, 'No se ha podido cambiar la nota')); } catch(_){}
    });
  }
  function borrar(id){
    if (est.borrar !== id) {                     // primera vez: pide confirmación (3 s)
      est.borrar = id; clearTimeout(est.borrarT);
      est.borrarT = setTimeout(function(){ est.borrar = null; pintar(); }, 3000);
      pintar(); return;
    }
    est.borrar = null; clearTimeout(est.borrarT);
    const antes = est.notas.slice();
    est.notas = est.notas.filter(function(n){ return n.id !== id; }); pintar();
    D().notas.borrar(id).catch(function(e){
      est.notas = antes; pintar();
      try { toast(MSG(e, 'No se ha podido borrar la nota')); } catch(_){}
    });
  }
  function clic(ev){
    const b = ev.target.closest('button[data-nt]'); if (!b) return;
    const a = b.getAttribute('data-nt');
    if (a === 'ver') { est.verHechas = !est.verHechas; pintar(); }
    else if (a === 'borrar') borrar(b.closest('[data-id]').getAttribute('data-id'));
  }

  /* ---------- la pantalla «Tareas» ---------- */
  const ICO_TAREAS = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>';
  let origen = 'clientes';                       // pestaña desde la que se abrió (para «Volver» en el móvil)
  topScreens.push('view-coach-tareas');
  PANTALLAS_CON_TABS.push('view-coach-tareas');
  (function(){
    const root = document.getElementById('screenRoot');
    const v = document.createElement('div'); v.id = 'view-coach-tareas'; v.style.display = 'none';
    v.innerHTML = '<div class="alta-top"><button type="button" class="back-btn nt-volver" data-nt="volver"><span class="vb-chev" aria-hidden="true">‹</span>Volver</button>'
      + '<div style="flex:1"><div class="eyebrow">Solo las ves tú</div><div class="h-title" role="heading" aria-level="1" style="margin-top:2px;font-size:var(--fs-2xl)">Mis tareas</div></div></div>'
      + '<div class="alta-body"></div>';
    v.querySelector('[data-nt="volver"]').addEventListener('click', function(){ abrirTabPro(origen); });
    const ref = document.getElementById('view-coach-pagos');
    root.insertBefore(v, ref ? ref.nextSibling : null);
  })();
  /* ordenador: «Tareas» en el menú lateral, debajo de «Pagos» */
  function botonMenu(){
    const nav = document.getElementById('coachTabs'); if (!nav) return;
    let b = document.getElementById('ctab-tareas');
    if (!b) {
      b = document.createElement('button');
      b.type = 'button'; b.className = 'tbi'; b.id = 'ctab-tareas'; b.setAttribute('aria-label', 'Tareas');
      b.innerHTML = '<span class="tbi-emo" aria-hidden="true">' + ICO_TAREAS + '</span>TAREAS<span class="tab-badge rojo" id="ctabTareasN" hidden>0</span>';
      b.addEventListener('click', function(){ abrirTabPro('tareas'); });
    }
    const pagos = document.getElementById('ctab-pagos');
    if (pagos && pagos.parentNode === nav) { if (pagos.nextSibling !== b) nav.insertBefore(b, pagos.nextSibling); }
    else if (!b.parentNode) nav.appendChild(b);
    b.classList.toggle('nt-on', activo());
    b.classList.toggle('active', tabProActual === 'tareas');
  }
  /* móvil: botón con la lista en la cabecera de cada pestaña, a la izquierda de la rueda de Ajustes */
  ['view-coach-panel', 'view-coach-segs', 'view-coach-chats', 'view-coach-planes', 'view-coach-pagos'].forEach(function(id){
    const top = document.querySelector('#' + id + ' .alta-top');
    if (!top || top.querySelector('.pro-tareas')) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'bell pro-tareas'; b.setAttribute('aria-label', 'Mis tareas'); b.hidden = true;
    b.style.order = '2';
    b.innerHTML = ICO_TAREAS.replace('width="20" height="20"', 'width="19" height="19"') + '<span class="bell-badge hide">0</span>';
    b.addEventListener('click', function(){ abrirTabPro('tareas'); });
    top.appendChild(b);
  });
  function botonesCabecera(){
    Array.prototype.forEach.call(document.querySelectorAll('.pro-tareas'), function(b){ b.hidden = !activo(); });
  }
  abrirTabPro = (function(orig){
    return function(t){
      if (t !== 'tareas') return orig.apply(this, arguments);
      if (tabProActual !== 'tareas' && tabProActual !== 'ajustes') origen = tabProActual || 'clientes';
      tabProActual = 'tareas'; navDir = 'tab';
      try { pintar(); showScreen('view-coach-tareas'); } finally { navDir = null; }
      pintarTabsPro();
      const bd = document.querySelector('#view-coach-tareas .alta-body'); if (bd) bd.scrollTop = 0;
      if (activo()) cargar();
    };
  })(abrirTabPro);
  atrasPorNiveles = (function(orig){
    return function(){ if (coachActivo && pantallaVisible() === 'view-coach-tareas') { abrirTabPro(origen); return; } return orig.apply(this, arguments); };
  })(atrasPorNiveles);
  pintarTabsPro = (function(orig){
    return function(){ const r = orig.apply(this, arguments); try { botonMenu(); botonesCabecera(); } catch(e){} return r; };
  })(pintarTabsPro);

  /* ---------- cuándo ---------- */
  actualizarPanel = (function(orig){
    return function(){ orig.apply(this, arguments); try { pintar(); if (activo() && est.notas === null) cargar(); } catch(e){} };
  })(actualizarPanel);
  window.addEventListener('fsd:pro-dentro', function(){ est.notas = null; cargar(); botonMenu(); botonesCabecera(); });
  window.addEventListener('fsd:al-volver', function(){ if (activo()) cargar(); });
  window.addEventListener('fsd:sesion-fuera', function(){ est.notas = null; est.verHechas = false; const c = document.getElementById('ntCard'); if (c) c.remove(); const b = document.getElementById('ctab-tareas'); if (b) b.classList.remove('nt-on'); botonesCabecera(); avisos(0); });
})();
