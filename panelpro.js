/* =========================================================
   Fitness sin Dramas — Espacio de los profesionales con barra inferior
   Pestañas: Clientes · Seguimientos · Ajustes (como el panel del cliente)
   Se carga después de app.js, ajustes.js, ux.js y avisos.js.
   ========================================================= */

let tabProActual = 'clientes';
const PANTALLAS_CON_TABS = ['view-coach-panel', 'view-coach-segs', 'view-coach-ajustes', 'view-coach-cliente', 'view-alta', 'view-coach-seguimientos'];
topScreens.push('view-coach-segs');

/* ---------- barra inferior ---------- */
(function crearBarraPro(){
  const root = document.getElementById('screenRoot');
  const nav = document.createElement('nav');
  nav.className = 'tb coach-tb'; nav.id = 'coachTabs'; nav.hidden = true;
  nav.setAttribute('aria-label', 'Secciones del profesional');
  nav.innerHTML =
      '<button class="tbi" id="ctab-clientes" onclick="abrirTabPro(\'clientes\')"><span class="tbi-emo" aria-hidden="true">👥</span>CLIENTES</button>'
    + '<button class="tbi" id="ctab-segs" onclick="abrirTabPro(\'segs\')"><span class="tbi-emo" aria-hidden="true">📋</span>SEGUIMIENTOS</button>'
    + '<button class="tbi" id="ctab-ajustes" onclick="abrirTabPro(\'ajustes\')"><span class="tbi-emo" aria-hidden="true">⚙️</span>AJUSTES</button>';
  root.appendChild(nav);
})();
function pantallaVisible(){
  return topScreens.filter(function(id){
    const el = document.getElementById(id);
    return el && el.style.display !== 'none' && getComputedStyle(el).display !== 'none';
  })[0];
}
function pintarTabsPro(){
  const nav = document.getElementById('coachTabs');
  if (!nav) return;
  const v = pantallaVisible();
  nav.hidden = !(coachActivo && PANTALLAS_CON_TABS.indexOf(v) > -1);
  ['clientes', 'segs', 'ajustes'].forEach(function(t){
    const b = document.getElementById('ctab-' + t);
    if (b) b.classList.toggle('active', t === tabProActual);
  });
}
function abrirTabPro(t){
  tabProActual = t;
  navDir = 'tab';
  try {
    if (t === 'clientes') showScreen('view-coach-panel');
    else if (t === 'segs') { pintarSegsResumen(); showScreen('view-coach-segs'); }
    else if (t === 'ajustes') abrirAjustesCoach();
  } finally { navDir = null; }
  pintarTabsPro();
  const v = document.getElementById(pantallaVisible());
  const b = v && v.querySelector('.alta-body');
  if (b) b.scrollTop = 0;
}
(function(){
  const sh = showScreen;
  showScreen = function(id){ sh(id); pintarTabsPro(); };
  const ent = entrarAlPanel;
  entrarAlPanel = function(){ tabProActual = 'clientes'; ent(); pintarTabsPro(); };
  const out = coachLogout;
  coachLogout = function(){ out.apply(this, arguments); tabProActual = 'clientes'; pintarTabsPro(); };
})();

/* ---------- pestaña Seguimientos: resumen de cada cliente ---------- */
function htmlFlechaDato(dato, unidad){
  if (dato.v == null) return '—';
  return fmtNum(dato.v) + '<small> ' + unidad + '</small>' + (dato.f ? ' <i>' + dato.f + '</i>' : '');
}
function pintarSegsResumen(){
  const cont = document.getElementById('segsResumen');
  if (!cont) return;
  setTxt('segsWho', coachActivo ? coachActivo.u + ' · ' + coachActivo.rol : 'Fitness sin dramas');
  const claves = Object.keys(clientesData);
  if (!claves.length) {
    cont.innerHTML = '<div class="vacio"><b>Todavía no hay clientes</b><span>Cuando des de alta a alguien y envíe su seguimiento, lo verás aquí.</span></div>';
    return;
  }
  const datos = claves.map(function(k){
    const segs = SEGUIMIENTOS[k] || [];
    const dias = diasSinSeguimiento(k);
    const pendiente = dias != null && dias >= 7;
    return { k: k, d: clientesData[k], segs: segs, ult: segs[0], dias: dias, pendiente: pendiente,
             t: segs[0] ? new Date(segs[0].fecha).getTime() : 0 };
  });
  const pend = datos.filter(function(x){ return x.pendiente; }).sort(function(a, b){ return (b.dias || 0) - (a.dias || 0); });
  const resto = datos.filter(function(x){ return !x.pendiente; }).sort(function(a, b){ return b.t - a.t; });
  const semana = datos.reduce(function(n, x){
    return n + x.segs.filter(function(r){ return r.fecha && Date.now() - new Date(r.fecha).getTime() < 7 * DIA_MS; }).length;
  }, 0);
  let h = '<div class="panel-stats">'
    + '<div class="panel-stat"><div class="val">' + (datos.length - pend.length) + '</div><div class="lbl">Al día</div></div>'
    + '<div class="panel-stat"><div class="val' + (pend.length ? ' warn' : '') + '">' + pend.length + '</div><div class="lbl">Pendientes</div></div>'
    + '<div class="panel-stat"><div class="val">' + semana + '</div><div class="lbl">Recibidos esta semana</div></div>'
    + '</div>';
  function tarjeta(x){
    const r = x.ult;
    const estado = x.pendiente
      ? '<span class="kc-estado pend">' + (r ? 'Pendiente · ' + x.dias + ' días' : 'Sin seguimientos') + '</span>'
      : (r ? '<span class="kc-estado ok">Al día</span>' : '<span class="kc-estado nuevo">Nuevo</span>');
    let cuerpo;
    if (r) {
      const peso = datoCliente(x.segs, 'peso'), cint = datoCliente(x.segs, 'cintura');
      cuerpo = '<div class="kc-grid sg-grid">'
        + '<div class="kc"><span class="kc-l">Peso</span><span class="kc-v">' + htmlFlechaDato(peso, 'kg') + '</span></div>'
        + '<div class="kc"><span class="kc-l">Cintura</span><span class="kc-v">' + htmlFlechaDato(cint, 'cm') + '</span></div>'
        + '<div class="kc' + (coachActivo && coachActivo.rol === 'entrenador' ? ' dest' : '') + '"><span class="kc-l">Entreno</span><span class="kc-v">' + esc(r.e) + '<small>/10</small></span></div>'
        + '<div class="kc' + (coachActivo && coachActivo.rol === 'dietista' ? ' dest' : '') + '"><span class="kc-l">Nutrición</span><span class="kc-v">' + esc(r.n) + '<small>/10</small></span></div>'
        + '<div class="kc"><span class="kc-l">Motivación</span><span class="kc-v">' + esc(r.m) + '<small>/5</small></span></div>'
        + '<div class="kc"><span class="kc-l">Estrés</span><span class="kc-v">' + esc(r.x) + '<small>/10</small></span></div>'
        + '</div>'
        + (r.obs ? '<div class="sg-nota"><b>Obstáculos — </b>' + esc(r.obs) + '</div>' : '')
        + '<div class="kc-pie"><span>📋 Último: ' + haceTxt(diasDesde(r.fecha)) + '</span><span class="sg-ver">Ver sus ' + x.segs.length + ' seguimiento' + (x.segs.length === 1 ? '' : 's') + ' ›</span></div>';
    } else {
      cuerpo = '<div class="kc-pie"><span>Aún no ha enviado ningún seguimiento' + (x.dias != null ? ' · alta ' + haceTxt(x.dias) : '') + '</span><span class="sg-ver">Ver ficha ›</span></div>';
    }
    return '<div class="cliente-card kcard" onclick="abrirSegsCliente(\'' + x.k + '\',' + (r ? 'true' : 'false') + ')">'
      + '<div class="kc-top"><div class="avatar' + (x.d.foto ? ' con-foto' : '') + '"' + (x.d.foto ? ' style="background-image:url(&quot;' + x.d.foto + '&quot;)"' : '') + '></div>'
      + '<div class="cliente-info"><div class="cliente-name">' + esc(x.d.nombre) + '</div><div class="cliente-sub">Semana ' + esc(x.d.semana || '—') + ' · ' + esc(x.d.objetivo || 'Sin objetivo') + '</div></div>'
      + '<div class="cliente-flags">' + estado + '</div></div>'
      + cuerpo + '</div>';
  }
  if (pend.length) h += '<div class="alta-label">Pendientes</div>' + pend.map(tarjeta).join('');
  if (resto.length) h += '<div class="alta-label">Recientes</div>' + resto.map(tarjeta).join('');
  cont.innerHTML = h;
}
const ATRAS_SEGS_ORIGINAL = (function(){ const b = document.querySelector('#view-coach-seguimientos .back-btn'); return b ? b.getAttribute('onclick') : 'backToCliente()'; })();
function abrirSegsCliente(k, tiene){
  goToCliente(k);
  if (!tiene) return;                         // sin seguimientos: se queda en su ficha
  goToSeguimientos();
  const b = document.querySelector('#view-coach-seguimientos .back-btn');
  if (b) b.setAttribute('onclick', "abrirTabPro('segs')");
}
goToSeguimientos = (function(orig){
  return function(){
    orig();
    const b = document.querySelector('#view-coach-seguimientos .back-btn');
    if (b && tabProActual !== 'segs') b.setAttribute('onclick', ATRAS_SEGS_ORIGINAL);
  };
})(goToSeguimientos);

/* ---------- botón atrás del móvil en las pestañas ---------- */
atrasDentroApp = (function(orig){
  return function(){
    const v = pantallaVisible();
    const hayCapa = ['proPass', 'dlgOverlay', 'legalOverlay', 'cookieConfig', 'notiPopCoach'].some(function(id){
      const e = document.getElementById(id); return e && e.classList.contains('show');
    });
    if (!hayCapa && (v === 'view-coach-segs' || v === 'view-coach-ajustes')) { abrirTabPro('clientes'); return true; }
    return orig();
  };
})(atrasDentroApp);

/* ---------- el cliente también confirma antes de salir ---------- */
function confirmarSalidaCliente(){
  abrirDialogo({
    titulo: '¿Salir a la pantalla de acceso?',
    texto: 'Se cerrará tu sesión. Para volver a entrar necesitarás tu código de acceso.',
    ok: 'Salir', cancel: 'Cancelar', peligro: true,
    onOk: function(){ cerrarSesionCliente(); }
  });
}

pintarTabsPro();
