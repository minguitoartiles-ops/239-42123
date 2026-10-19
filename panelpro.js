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

/* =========================================================
   Puntuación global del cliente (0-100) y tarjetas de Clientes
   Pesos: evolución según objetivo 30 · entreno 20 · nutrición 20 ·
          constancia 20 · motivación 5 · estrés 5
   (los datos que falten no cuentan y el resto se reparte en proporción)
   ========================================================= */
const PESOS_PUNTUACION = { evol: 30, ent: 20, nut: 20, cons: 20, mot: 5, est: 5 };
function limitar(v){ return Math.max(0, Math.min(1, v)); }
function numDe(v){ const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? null : n; }
function constancia(dias){
  if (dias == null) return null;
  if (dias <= 7) return 1;
  if (dias <= 14) return 1 - (dias - 7) / 7 * 0.7;          // de 1 a 0,3
  return limitar(0.3 - (dias - 14) / 7 * 0.3);              // de 0,3 a 0
}
/* evolución entre dos seguimientos según el objetivo (0 a 1) */
function evolucion(objetivo, r, prev){
  if (!r || !prev || !r.med || !prev.med) return null;
  const dP = (r.med.peso != null && prev.med.peso != null) ? r.med.peso - prev.med.peso : null;
  const dC = (r.med.cintura != null && prev.med.cintura != null) ? r.med.cintura - prev.med.cintura : null;
  if (dP == null && dC == null) return null;
  const o = norm(objetivo || '');
  const mezcla = function(c, pc, p, pp){
    if (c == null) return p; if (p == null) return c;
    return c * pc + p * pp;
  };
  const cintBaja = dC == null ? null : limitar(0.5 - dC * 0.5);            // −1 cm → 1 · 0 → 0,5 · +1 cm → 0
  const cintEstable = dC == null ? null : (dC <= 0.5 ? 1 : limitar(1 - (dC - 0.5)));   // hasta +0,5 cm, perfecto
  const pesoEstable = dP == null ? null : limitar(1 - Math.abs(dP) / 1.5);
  if (o.indexOf('perder') === 0) {                         // manda la cintura
    const pesoBaja = dP == null ? null : limitar(0.5 - dP / 1.6);
    return mezcla(cintBaja, 0.7, pesoBaja, 0.3);
  }
  if (o.indexOf('ganar') === 0) {                          // volumen: sube el peso y la cintura se mantiene
    const pesoSube = dP == null ? null : limitar((dP + 0.5) / 0.8);         // −0,5 kg → 0 · +0,3 kg o más → 1
    if (pesoSube == null) return cintEstable;
    if (cintEstable == null) return pesoSube;
    return pesoSube * (0.5 + 0.5 * cintEstable);
  }
  if (o.indexOf('recomp') === 0) return mezcla(cintBaja, 0.7, pesoEstable, 0.3);
  return mezcla(cintEstable, 0.5, pesoEstable, 0.5);       // mantenimiento u otro
}
/* puntuación en un seguimiento concreto (i = 0 el último) */
function puntuacionCliente(k, i){
  i = i || 0;
  const d = clientesData[k];
  const segs = SEGUIMIENTOS[k] || [];
  const r = segs[i];
  if (!d || !r) return null;
  const dias = i === 0 ? diasDesde(r.fecha)
                       : Math.floor((new Date(segs[i - 1].fecha).getTime() - new Date(r.fecha).getTime()) / DIA_MS);
  const e = numDe(r.e), n = numDe(r.n), m = numDe(r.m), x = numDe(r.x);
  const partes = {
    evol: evolucion(d.objetivo, r, segs[i + 1]),
    ent: e == null ? null : limitar(e / 10),
    nut: n == null ? null : limitar(n / 10),
    cons: constancia(dias),
    mot: m == null ? null : limitar(m / 5),
    est: x == null ? null : limitar(1 - x / 10)
  };
  let suma = 0, pesos = 0;
  Object.keys(PESOS_PUNTUACION).forEach(function(c){
    if (partes[c] == null) return;
    suma += partes[c] * PESOS_PUNTUACION[c]; pesos += PESOS_PUNTUACION[c];
  });
  if (!pesos) return null;
  return { total: Math.round(suma / pesos * 100), partes: partes };
}
function nivelPuntuacion(p){ return p < 35 ? 1 : (p < 55 ? 2 : (p < 70 ? 3 : (p < 85 ? 4 : 5))); }

/* tarjetas de la pestaña Clientes con los datos que importan */
pintarListaClientes = (function(orig){
  return function(){
    orig();
    const cont = document.getElementById('listaClientes');
    if (!cont) return;
    const rol = coachActivo ? coachActivo.rol : null;
    const pend = coachActivo ? sinLeerDe(clavePro(coachActivo.u)) : {};
    const claves = Object.keys(clientesData);
    Array.prototype.forEach.call(cont.querySelectorAll('.cliente-card'), function(card, idx){
      const k = claves[idx];
      if (!k) return;
      const segs = SEGUIMIENTOS[k] || [];
      const r = segs[0];
      const p = puntuacionCliente(k, 0);
      const pAnt = puntuacionCliente(k, 1);
      let flecha = '';
      if (p && pAnt) { const df = p.total - pAnt.total; flecha = df >= 3 ? '↑' : (df <= -3 ? '↓' : '='); }
      const msgs = pend[k] || 0;
      const celda = function(cls, lbl, val, extra){ return '<div class="kc ' + cls + '"><span class="kc-l">' + lbl + '</span><span class="kc-v">' + val + (extra || '') + '</span></div>'; };
      const ent = r && numDe(r.e) != null ? esc(r.e) + '<small>/10</small>' : '—';
      const nut = r && numDe(r.n) != null ? esc(r.n) + '<small>/10</small>' : '—';
      const punt = p
        ? '<div class="kc kc-punt v-n' + nivelPuntuacion(p.total) + '"><span class="kc-l">Global</span><span class="kc-v"><b class="v' + nivelPuntuacion(p.total) + '">' + p.total + '</b><small>/100</small>' + (flecha ? ' <i title="Frente al seguimiento anterior">' + flecha + '</i>' : '') + '</span></div>'
        : '<div class="kc kc-punt"><span class="kc-l">Global</span><span class="kc-v">—</span></div>';
      const grid = punt
        + celda('kc-ent' + (rol === 'entrenador' ? ' dest' : ''), 'Entreno', ent)
        + celda('kc-nut' + (rol === 'dietista' ? ' dest' : ''), 'Nutrición', nut)
        + celda('kc-msgs' + (msgs ? ' hay' : ''), 'Mensajes', msgs ? '<b>' + msgs + '</b><small> sin leer</small>' : '0');
      const g = card.querySelector('.kc-grid');
      if (g) g.innerHTML = grid;
      const pie = card.querySelector('.kc-pie');
      if (pie) pie.innerHTML = '<span>📋 Último seguimiento: ' + (r ? haceTxt(diasDesde(r.fecha)) : 'ninguno') + '</span>'
        + (p && p.partes.evol != null ? '<span class="kc-evo">Evolución ' + Math.round(p.partes.evol * 100) + '/100</span>' : '');
    });
  };
})(pintarListaClientes);
actualizarPanel();

/* Cliente en «Hoy»: el atrás del móvil pregunta antes de salir a la pantalla de acceso */
atrasDentroApp = (function(orig){
  return function(){
    const r = orig();
    if (!r && pantallaVisible() === 'app' && !isCoachView() && clienteActual) { confirmarSalidaCliente(); return true; }
    return r;
  };
})(atrasDentroApp);

/* =========================================================
   Pestaña Seguimientos con el mismo formato y colores que el detalle
   Orden: primero pendientes, después peor puntuación global arriba.
   ========================================================= */
function colorearSeguimientos(cont){
  Array.prototype.forEach.call(cont.querySelectorAll('.segui-card'), function(card){
    let suma = 0, n = 0;
    Array.prototype.forEach.call(card.querySelectorAll('.segui-stats > div'), function(d){
      const lbl = d.querySelector('.segui-lbl'), val = d.querySelector('.segui-val');
      if (!lbl || !val) return;
      const m = val.textContent.match(/([\d.,]+)\s*\/\s*(\d+)/);
      if (!m) return;
      let p = parseFloat(m[1].replace(',', '.')) / parseFloat(m[2]);
      if (/estr[eé]s/i.test(lbl.textContent)) p = 1 - p;
      p = limitar(p);
      val.className = 'segui-val v' + nivel(p);
      suma += p; n++;
    });
    const wk = card.querySelector('.segui-week');
    if (wk && n) {
      const media = suma / n;
      let b = wk.querySelector('.sem-badge');
      if (!b) { b = document.createElement('span'); wk.appendChild(b); }
      b.className = 'sem-badge b' + nivel(media);
      b.textContent = Math.round(media * 100) + ' %';
    }
  });
}
pintarSegsResumen = function(){
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
    const p = puntuacionCliente(k, 0);
    return { k: k, d: clientesData[k], segs: segs, dias: dias, pendiente: dias != null && dias >= 7, p: p ? p.total : null };
  });
  datos.sort(function(a, b){
    if (a.pendiente !== b.pendiente) return a.pendiente ? -1 : 1;
    if (a.pendiente) return (b.dias || 0) - (a.dias || 0);
    return (a.p == null ? 999 : a.p) - (b.p == null ? 999 : b.p);     // peor puntuación arriba
  });
  const pend = datos.filter(function(x){ return x.pendiente; }).length;
  const semana = datos.reduce(function(n, x){
    return n + x.segs.filter(function(r){ return r.fecha && Date.now() - new Date(r.fecha).getTime() < 7 * DIA_MS; }).length;
  }, 0);
  let h = '<div class="panel-stats">'
    + '<div class="panel-stat"><div class="val">' + (datos.length - pend) + '</div><div class="lbl">Al día</div></div>'
    + '<div class="panel-stat"><div class="val' + (pend ? ' warn' : '') + '">' + pend + '</div><div class="lbl">Pendientes</div></div>'
    + '<div class="panel-stat"><div class="val">' + semana + '</div><div class="lbl">Recibidos esta semana</div></div>'
    + '</div>'
    + '<div class="segui-leyenda"><span>Deficiente</span><span class="leyenda-barra"></span><span>Excelente</span></div>';
  h += datos.map(function(x){
    const estado = x.pendiente
      ? '<span class="kc-estado pend">' + (x.segs.length ? 'Pendiente · ' + x.dias + ' días' : 'Sin seguimientos') + '</span>'
      : (x.segs.length ? '<span class="kc-estado ok">Al día</span>' : '<span class="kc-estado nuevo">Nuevo</span>');
    const glob = x.p != null ? '<span class="sg-glob v' + nivelPuntuacion(x.p) + '" title="Puntuación global">' + x.p + '</span>' : '';
    const cab = '<div class="sg-cab" onclick="abrirSegsCliente(\'' + x.k + '\',' + (x.segs.length ? 'true' : 'false') + ')">'
      + '<div class="avatar' + (x.d.foto ? ' con-foto' : '') + '"' + (x.d.foto ? ' style="background-image:url(&quot;' + x.d.foto + '&quot;)"' : '') + '></div>'
      + '<div class="cliente-info"><div class="cliente-name">' + esc(x.d.nombre) + '</div><div class="cliente-sub">' + esc(x.d.objetivo || 'Sin objetivo') + '</div></div>'
      + '<div class="sg-cab-der">' + glob + estado + '</div></div>';
    const cuerpo = x.segs.length
      ? tarjetaSeguimiento(x.segs[0], 0, x.segs)
        + '<div class="sg-ver-todos" onclick="abrirSegsCliente(\'' + x.k + '\',true)">Ver sus ' + x.segs.length + ' seguimiento' + (x.segs.length === 1 ? '' : 's') + ' ›</div>'
      : '<div class="sg-sin">Aún no ha enviado ningún seguimiento' + (x.dias != null ? ' · alta ' + haceTxt(x.dias) : '') + '.</div>';
    return '<div class="sg-bloque' + (x.pendiente ? ' pend' : '') + '">' + cab + cuerpo + '</div>';
  }).join('');
  cont.innerHTML = h;
  colorearSeguimientos(cont);
};

/* =========================================================
   v0.51 · Gestión del cliente: el globo solo marca lo pendiente
   y desaparece en cuanto el profesional lo abre
   ========================================================= */
function segsSinVer(k){
  if (!coachActivo) return 0;
  const yo = norm(coachActivo.u);
  return (SEGUIMIENTOS[k] || []).filter(function(r){ return !(r.vistoPor && r.vistoPor[yo]); }).length;
}
function msgsSinLeer(k){ return coachActivo ? (sinLeerDe(clavePro(coachActivo.u))[k] || 0) : 0; }
function pintarGlobo(id, n, txt){
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = n;
  el.hidden = !n;
  el.classList.toggle('pill-nuevo', !!n);
  el.setAttribute('aria-label', n ? n + ' ' + txt : '');
}
function pintarPendientesFicha(){
  const k = clienteActual;
  if (!k) return;
  pintarGlobo('fichaSegN', segsSinVer(k), n1(segsSinVer(k), 'seguimiento sin revisar', 'seguimientos sin revisar'));
  pintarGlobo('fichaChatN', msgsSinLeer(k), n1(msgsSinLeer(k), 'mensaje sin leer', 'mensajes sin leer'));
}
function n1(n, uno, varios){ return n === 1 ? uno : varios; }
/* al abrir los seguimientos se dan por vistos todos (y sus avisos de la campana) */
goToSeguimientos = (function(orig){
  return function(){
    orig();
    const k = clienteActual;
    if (!k || !coachActivo) return;
    const yo = norm(coachActivo.u), ahora = new Date().toISOString();
    let cambio = false;
    (SEGUIMIENTOS[k] || []).forEach(function(r){
      r.vistoPor = r.vistoPor || {};
      if (!r.vistoPor[yo]) { r.vistoPor[yo] = ahora; cambio = true; }
    });
    const pro = clavePro(coachActivo.u);
    ((leerAvisos().lista[pro]) || []).forEach(function(x){
      if (x.tipo === 'seguimientos' && x.ir && x.ir.cliente === k && !x.leida) { x.leida = true; cambio = true; }
    });
    if (cambio) { guardarAvisos(); guardarTodo(); pintarCampanas(); }
  };
})(goToSeguimientos);
(function(){
  const sh = showScreen;
  showScreen = function(id){ sh(id); if (id === 'view-coach-cliente') pintarPendientesFicha(); };
})();
goToCliente = (function(orig){
  return function(k){ orig(k); pintarPendientesFicha(); };
})(goToCliente);
window.addEventListener('storage', function(){ pintarPendientesFicha(); });

/* =========================================================
   v0.51 · Sensaciones del día (cliente en Nutrición y Entrenamiento)
   Se guardan en la ficha del cliente: clientesData[k].sens = [{ f, area, animo, txt, hora, visto }]
   ========================================================= */
TIPOS_PRO.push({ id: 'sensaciones', ico: '🗒️', nombre: 'Sensaciones del día', desc: 'Cuando un cliente cuenta cómo le ha ido el entreno o la comida' });
const ANIMOS = [null, ['😣', 'Muy mal'], ['😕', 'Regular'], ['😐', 'Normal'], ['🙂', 'Bien'], ['💪', 'Genial']];
const AREAS_SENS = {
  ent: { vista: 'entreno', ico: '🏋️', nombre: 'Entrenamiento', rol: 'entrenador', pregunta: '¿Cómo te ha ido el entreno hoy?', ej: 'Me he notado fuerte en sentadilla, pero me molestaba el hombro en press…' },
  nut: { vista: 'plan', ico: '🍽️', nombre: 'Nutrición', rol: 'dietista', pregunta: '¿Cómo te ha ido hoy con la comida?', ej: 'He pasado hambre por la tarde, me ha costado la cena fuera…' }
};
function sensDe(k){ const c = clientesData[k]; return (c && c.sens) || []; }
function sensHoy(k, area){ const f = hoyISO(); return sensDe(k).filter(function(s){ return s.f === f && s.area === area; })[0] || null; }
function proDeArea(area){ return COACHES.filter(function(c){ return c.rol === AREAS_SENS[area].rol; })[0]; }
function diasEntre(f){ const a = new Date(f + 'T12:00:00'), b = new Date(hoyISO() + 'T12:00:00'); return Math.round((b - a) / DIA_MS); }
function cuandoSens(s){ const d = diasEntre(s.f); return d === 0 ? 'hoy' : (d === 1 ? 'ayer' : 'hace ' + d + ' días'); }

/* ---------- tarjeta del cliente ---------- */
let sensBorrador = {};   // ánimo elegido antes de enviar, por área
function htmlSensCliente(area){
  const A = AREAS_SENS[area], k = clienteActual, hoy = sensHoy(k, area), pro = proDeArea(area);
  const sel = sensBorrador[area] != null ? sensBorrador[area] : (hoy ? hoy.animo : null);
  const editando = !hoy || sensBorrador[area + '_ed'];
  let h = '<div class="sens-card" data-area="' + area + '">'
    + '<div class="sens-top"><span class="sens-ico" aria-hidden="true">' + A.ico + '</span><div><b>' + A.pregunta + '</b>'
    + '<span>Lo verá ' + esc(pro ? pro.u : 'tu equipo') + '. Puedes cambiarlo durante el día.</span></div></div>';
  if (!editando) {
    h += '<div class="sens-hecho"><span class="sens-emo">' + ANIMOS[hoy.animo][0] + '</span><div><b>' + ANIMOS[hoy.animo][1] + '</b>'
      + (hoy.txt ? '<span>' + esc(hoy.txt) + '</span>' : '') + '<small>Enviado hoy a las ' + esc(hoy.hora) + ' ✓</small></div>'
      + '<button class="mini-btn" onclick="editarSens(\'' + area + '\')">Cambiar</button></div>';
    return h + '</div>';
  }
  h += '<div class="sens-animos" role="radiogroup" aria-label="Cómo te has sentido">';
  for (let i = 1; i <= 5; i++) {
    h += '<button type="button" role="radio" aria-checked="' + (sel === i) + '" class="sens-animo' + (sel === i ? ' on' : '') + '" onclick="elegirAnimo(\'' + area + '\',' + i + ')">'
      + '<span>' + ANIMOS[i][0] + '</span><small>' + ANIMOS[i][1] + '</small></button>';
  }
  h += '</div><textarea class="sg-text sens-txt" id="sensTxt-' + area + '" rows="2" placeholder="' + esc(A.ej) + '">' + esc(hoy && hoy.txt || '') + '</textarea>'
    + '<button class="btn-primary sens-enviar" onclick="enviarSens(\'' + area + '\')"' + (sel ? '' : ' disabled') + '>Enviar a ' + esc(pro ? pro.u : 'tu equipo') + '</button>';
  return h + '</div>';
}
/* ---------- vista del profesional dentro del plan del cliente: solo lectura ---------- */
function htmlSensLista(k, area, max){
  const lista = sensDe(k).filter(function(s){ return !area || s.area === area; }).slice(0, max || 7);
  if (!lista.length) return '<div class="picker-empty">Aún no ha contado sensaciones' + (area ? ' de ' + AREAS_SENS[area].nombre.toLowerCase() : '') + '.</div>';
  return lista.map(function(s){
    return '<div class="sens-item"><span class="sens-emo" title="' + ANIMOS[s.animo][1] + '">' + ANIMOS[s.animo][0] + '</span>'
      + '<div><b>' + AREAS_SENS[s.area].ico + ' ' + AREAS_SENS[s.area].nombre + ' · ' + cuandoSens(s) + ' · ' + esc(s.hora) + '</b>'
      + '<span>' + (s.txt ? esc(s.txt) : '<i>' + ANIMOS[s.animo][1] + ', sin comentario</i>') + '</span></div></div>';
  }).join('');
}
function pintarSens(area){
  const A = AREAS_SENS[area];
  const v = document.getElementById('view-' + A.vista);
  if (!v || !clienteActual) return;
  let box = document.getElementById('sensBox-' + area);
  if (!box) {
    box = document.createElement('div');
    box.id = 'sensBox-' + area; box.className = 'sens-box';
    const top = v.querySelector('.view-top');
    top.parentNode.insertBefore(box, top.nextSibling);
  }
  box.innerHTML = isCoachView()
    ? '<div class="section-lbl">Sensaciones del cliente</div><div class="sens-lista">' + htmlSensLista(clienteActual, area, 5) + '</div>'
    : htmlSensCliente(area);
}
function elegirAnimo(area, n){ sensBorrador[area] = n; pintarSens(area); }
function editarSens(area){ sensBorrador[area + '_ed'] = true; pintarSens(area); }
function enviarSens(area){
  const k = clienteActual, c = clientesData[k];
  const animo = sensBorrador[area] || (sensHoy(k, area) || {}).animo;
  if (!c || !animo) { toast('Elige cómo te has sentido.'); return; }
  const t = document.getElementById('sensTxt-' + area);
  const txt = t ? t.value.trim().slice(0, 600) : '';
  const ahora = new Date();
  const hora = String(ahora.getHours()).padStart(2, '0') + ':' + String(ahora.getMinutes()).padStart(2, '0');
  c.sens = c.sens || [];
  const ya = sensHoy(k, area);
  const nuevo = { f: hoyISO(), area: area, animo: animo, txt: txt, hora: hora, visto: {} };
  if (ya) c.sens[c.sens.indexOf(ya)] = nuevo; else c.sens.unshift(nuevo);
  if (c.sens.length > 90) c.sens.length = 90;
  sensBorrador[area] = null; sensBorrador[area + '_ed'] = false;
  guardarTodo();
  const pro = proDeArea(area);
  if (pro) crearAviso(clavePro(pro.u), 'sensaciones', c.nombre + ': ' + ANIMOS[animo][0] + ' ' + AREAS_SENS[area].nombre.toLowerCase() + (ya ? ' (actualizado)' : ''),
    txt ? recortar(txt) : ANIMOS[animo][1], { cliente: k, vista: 'ficha' });
  pintarSens(area);
  toast('Enviado a ' + (pro ? pro.u : 'tu equipo') + ' ✓');
}
goTo = (function(orig){
  return function(n, s){
    orig(n, s);
    if (n === 'entreno') pintarSens('ent');
    if (n === 'plan') pintarSens('nut');
  };
})(goTo);

/* ---------- profesional: tarjeta del panel y ficha ---------- */
function sensSinVer(k){
  if (!coachActivo) return [];
  const yo = norm(coachActivo.u);
  return sensDe(k).filter(function(s){ return !(s.visto && s.visto[yo]); });
}
function lineaSensTarjeta(k){
  const rol = coachActivo ? coachActivo.rol : null;
  const partes = ['ent', 'nut'].map(function(area){
    const s = sensDe(k).filter(function(x){ return x.area === area; })[0];
    if (!s || diasEntre(s.f) > 6) return '';
    const mio = AREAS_SENS[area].rol === rol;
    return '<span class="kc-sens-a' + (mio ? ' mio' : '') + '">' + AREAS_SENS[area].ico + ' ' + ANIMOS[s.animo][0] + ' ' + cuandoSens(s)
      + (mio && s.txt ? ' · «' + esc(recortar(s.txt, 42)) + '»' : '') + '</span>';
  }).filter(Boolean);
  if (!partes.length) return '';
  const n = sensSinVer(k).length;
  return '<div class="kc-sens">' + partes.join('') + (n ? '<b class="kc-sens-n">' + n + ' nueva' + (n > 1 ? 's' : '') + '</b>' : '') + '</div>';
}
pintarListaClientes = (function(orig){
  return function(){
    orig();
    const claves = Object.keys(clientesData);
    Array.prototype.forEach.call(document.querySelectorAll('#listaClientes .cliente-card'), function(card, i){
      const k = claves[i]; if (!k) return;
      const viejo = card.querySelector('.kc-sens'); if (viejo) viejo.remove();
      const html = lineaSensTarjeta(k);
      if (!html) return;
      const pie = card.querySelector('.kc-pie');
      const tmp = document.createElement('div'); tmp.innerHTML = html;
      if (pie) pie.parentNode.insertBefore(tmp.firstChild, pie); else card.appendChild(tmp.firstChild);
    });
  };
})(pintarListaClientes);
function pintarSensFicha(){
  const k = clienteActual;
  const v = document.getElementById('view-coach-cliente');
  if (!k || !v) return;
  let box = document.getElementById('fichaSens');
  if (!box) {
    box = document.createElement('div'); box.id = 'fichaSens';
    const gest = Array.prototype.filter.call(v.querySelectorAll('.alta-label'), function(x){ return /Gestión/.test(x.textContent); })[0];
    gest.parentNode.insertBefore(box, gest);
  }
  const nuevas = sensSinVer(k).length;
  box.innerHTML = '<div class="alta-label">Sensaciones del día' + (nuevas ? ' <span class="pill pill-nuevo">' + nuevas + '</span>' : '') + '</div>'
    + '<div class="sens-lista ficha">' + htmlSensLista(k, null, 7) + '</div>';
  // al entrar en la ficha se dan por vistas (el globo desaparece la próxima vez)
  if (nuevas && coachActivo) {
    const yo = norm(coachActivo.u), ahora = new Date().toISOString();
    sensDe(k).forEach(function(s){ s.visto = s.visto || {}; if (!s.visto[yo]) s.visto[yo] = ahora; });
    const pro = clavePro(coachActivo.u);
    ((leerAvisos().lista[pro]) || []).forEach(function(x){ if (x.tipo === 'sensaciones' && x.ir && x.ir.cliente === k) x.leida = true; });
    guardarAvisos(); guardarTodo(); pintarCampanas();
    setTimeout(function(){ const p = box.querySelector('.pill-nuevo'); if (p) p.classList.add('visto'); }, 1600);
  }
}
(function(){
  const sh = showScreen;
  showScreen = function(id){ sh(id); if (id === 'view-coach-cliente') pintarSensFicha(); if (id === 'view-coach-panel') actualizarPanel(); };
})();
window.addEventListener('storage', function(){
  if (pantallaVisible && pantallaVisible() === 'view-coach-cliente') pintarSensFicha();
  if (typeof vistaActual !== 'undefined' && document.getElementById('app').style.display !== 'none') {
    if (vistaActual === 'entreno') pintarSens('ent');
    if (vistaActual === 'plan') pintarSens('nut');
  }
});
actualizarPanel();

/* =========================================================
   v0.51 · Consentimiento de uso de imagen (redes sociales, marketing y divulgación)
   Se guarda en clientesData[k].consentImagen = { fecha, v, progreso, reconocible, nombre }
   ========================================================= */
TIPOS_PRO.push({ id: 'imagen', ico: '📸', nombre: 'Permisos de imagen', desc: 'Cuando un cliente cambia lo que autoriza publicar' });
const CI_OPCIONES = [['progreso', 'Fotos de progreso sin la cara'], ['reconocible', 'Fotos o vídeos en los que se le reconoce'], ['nombre', 'Su nombre o testimonio']];
function ciDecidido(d){ return !!(d && d.consentImagen && d.consentImagen.fecha); }
function ciResumen(d){
  if (!ciDecidido(d)) return { txt: 'Pendiente', ok: false };
  const si = CI_OPCIONES.filter(function(o){ return d.consentImagen[o[0]]; });
  return si.length ? { txt: 'Autorizado ' + si.length + ' de 3', ok: true } : { txt: 'No autorizado', ok: false };
}
function abrirConsentImagen(){
  const d = clientesData[clienteActual];
  if (!d) return;
  const c = d.consentImagen || {};
  document.getElementById('ciProgreso').checked = !!c.progreso;
  document.getElementById('ciReconocible').checked = !!c.reconocible;
  document.getElementById('ciNombre').checked = !!c.nombre;
  document.getElementById('consentImagen').classList.add('show');
}
function comprobarConsentImagen(){
  if (!clienteActual || isCoachView()) return;
  const d = clientesData[clienteActual];
  if (!d || !(d.consentSalud && d.consentSalud.fecha) || ciDecidido(d)) return;
  abrirConsentImagen();
}
function ciGuardar(ninguno){
  const d = clientesData[clienteActual];
  if (!d) return;
  const val = function(id){ return !ninguno && document.getElementById(id).checked; };
  const antes = d.consentImagen;
  d.consentImagen = { fecha: new Date().toISOString(), v: POLICY_V, progreso: val('ciProgreso'), reconocible: val('ciReconocible'), nombre: val('ciNombre') };
  guardarTodo();
  document.getElementById('consentImagen').classList.remove('show');
  const r = ciResumen(d);
  toast(r.ok ? 'Guardado: ' + r.txt.toLowerCase() : 'Guardado: no se publicará tu imagen');
  // si cambia una decisión ya tomada, se avisa a los dos profesionales
  if (antes && antes.fecha) avisarPros('imagen', d.nombre + ' ha cambiado su permiso de imagen', r.txt, { cliente: clienteActual, vista: 'ficha' });
  if (vistaActual === 'ajustes' && typeof renderAjustes === 'function') renderAjustes('cliente');
}
csAceptar = (function(orig){ return function(){ orig(); setTimeout(comprobarConsentImagen, 250); }; })(csAceptar);
comprobarConsentSalud = (function(orig){
  return function(){ orig(); if (!document.getElementById('consentSalud').classList.contains('show')) comprobarConsentImagen(); };
})(comprobarConsentSalud);
atrasDentroApp = (function(orig){
  return function(){ if (capaVisible('consentImagen')) return true; return orig(); };   // hay que elegir una opción
})(atrasDentroApp);
/* Ajustes del cliente → Privacidad */
htmlAjustes = (function(orig){
  return function(rol){
    let h = orig(rol);
    const d = clienteActual && clientesData[clienteActual];
    if (rol !== 'cliente' || !d || !(d.consentSalud && d.consentSalud.fecha)) return h;
    const r = ciResumen(d);
    const filaCI = fila('Uso de tu imagen en redes', pill(r.txt, r.ok), 'abrirConsentImagen()');
    const marca = fila('Retirar consentimiento', '', 'retirarConsentSalud()', 'danger');
    return h.indexOf(marca) > -1 ? h.replace(marca, filaCI + marca) : h;
  };
})(htmlAjustes);
/* Ficha del cliente (profesionales): qué ha autorizado */
function pintarImagenFicha(){
  const d = clientesData[clienteActual];
  const v = document.getElementById('view-coach-cliente');
  if (!d || !v) return;
  let row = document.getElementById('fichaImagen');
  if (!row) {
    const cod = document.getElementById('fichaCodigo');
    const lr = cod && cod.closest('.list-row');
    if (!lr) return;
    row = document.createElement('div');
    row.id = 'fichaImagen'; row.className = 'list-row';
    row.onclick = verImagenFicha;
    lr.parentNode.insertBefore(row, lr.nextSibling);
  }
  const r = ciResumen(d);
  row.innerHTML = '<span>Uso de imagen en redes</span><span class="ajx-acts"><span class="pill' + (r.ok ? ' ok' : '') + '">' + esc(r.txt) + '</span><span class="chev">›</span></span>';
}
function verImagenFicha(){
  const d = clientesData[clienteActual];
  if (!d) return;
  const c = d.consentImagen;
  const texto = ciDecidido(d)
    ? CI_OPCIONES.map(function(o){ return (c[o[0]] ? '✓ ' : '✗ ') + o[1]; }).join('\n') + '\n\nDecidido el ' + fechaCorta(c.fecha) + '.' + (c.nombre ? '' : ' Publicar siempre de forma anónima.')
    : 'Todavía no ha respondido. Se le preguntará la próxima vez que entre en la app. Mientras tanto, no se puede publicar su imagen.';
  abrirDialogo({ titulo: 'Uso de imagen de ' + d.nombre, texto: texto, ok: 'Entendido', soloOk: true });
}
(function(){
  const sh = showScreen;
  showScreen = function(id){ sh(id); if (id === 'view-coach-cliente') pintarImagenFicha(); };
})();

/* v0.51 · Ficha: adherencias del último seguimiento (antes salía «—» aunque lo hubiera) */
function pintarAdherenciasFicha(){
  const k = clienteActual, d = clientesData[k];
  if (!d) return;
  const r = (SEGUIMIENTOS[k] || [])[0];
  const val = function(x, alt){ const n = numDe(x); return n != null ? n + '/10' : (alt != null ? alt + '/10' : '—'); };
  setTxt('cd-adhE', val(r && r.e, d.adhE));
  setTxt('cd-adhN', val(r && r.n, d.adhN));
}
(function(){
  const sh = showScreen;
  showScreen = function(id){ sh(id); if (id === 'view-coach-cliente') pintarAdherenciasFicha(); };
})();

/* =========================================================
   v0.51 · Botón atrás del móvil: siempre a la pantalla principal
   Cliente → «Hoy» · Profesional → panel de Clientes.
   En la principal, atrás muestra el aviso y el siguiente atrás sale de la app
   (la sesión sigue abierta; para cerrarla, Ajustes → Cerrar sesión).
   ========================================================= */
let noArmarAtras = false;
armarAtras = (function(orig){
  return function(){ if (noArmarAtras) { noArmarAtras = false; return; } orig(); };
})(armarAtras);
function hayCapaAbierta(){
  if (document.querySelector('.fsd-overlay.show')) return true;
  const ep = document.getElementById('emojiPanel');
  if (ep && !ep.hidden) return true;
  return ['videoModal', 'recursoPop', 'foodPicker', 'exPicker', 'notiPop', 'notiPopCoach'].some(capaVisible);
}
function avisoSalirApp(){
  const n = nivelGuarda();
  noArmarAtras = true;                                   // no se vuelve a poner marca: el próximo atrás sale
  if (n > 0) { ignorarPop = true; history.go(-n); }
  abrirDialogo({ titulo: '¿Salir de la app?', texto: 'Pulsa atrás otra vez para salir. Tu sesión seguirá abierta.', ok: 'Quedarme', soloOk: true });
}
function irAInicio(){
  if (document.getElementById('coachBar').classList.contains('show')) backToCliente();   // guarda lo que se editaba
  if (coachActivo) { abrirTabPro('clientes'); return; }
  navHist.length = 0;
  navDir = 'pop'; goTo('hoy', true); navDir = null;
}
atrasDentroApp = (function(orig){
  return function(){
    if (hayCapaAbierta()) return orig();                 // primero se cierran ventanas, avisos y paneles
    const vis = pantallaVisible();
    if (!vis || vis === 'view-splash') return orig();
    const enInicio = coachActivo
      ? (vis === 'view-coach-panel')
      : (vis === 'app' && vistaActual === 'hoy' && !document.getElementById('coachBar').classList.contains('show'));
    if (enInicio) { avisoSalirApp(); return true; }
    irAInicio();
    return true;
  };
})(atrasDentroApp);

/* =========================================================
   v0.51 · Alergias e intolerancias alimentarias
   Lista: 14 alérgenos de declaración obligatoria (Reglamento UE 1169/2011, anexo II),
   otras alergias frecuentes en España (SEAIC) e intolerancias habituales.
   Se guarda en clientesData[k].alergias = { items: { id: 'diag'|'sosp'|'' }, ninguna, otras, fecha }
   ========================================================= */
TIPOS_PRO.push({ id: 'alergias', ico: '⚠️', nombre: 'Alergias e intolerancias', desc: 'Cuando un cliente rellena o cambia sus alergias' });
const ALERGIAS = [
  { grupo: 'Alérgenos de declaración obligatoria (UE)', items: [
    ['gluten', 'Cereales con gluten', 'trigo, centeno, cebada, avena, espelta, kamut'],
    ['crustaceos', 'Crustáceos', 'gamba, langostino, cangrejo, bogavante…'],
    ['huevo', 'Huevo', ''],
    ['pescado', 'Pescado', ''],
    ['cacahuete', 'Cacahuete', ''],
    ['soja', 'Soja', ''],
    ['leche', 'Leche (proteína de leche)', 'alergia a la leche; la lactosa va en intolerancias'],
    ['frutoscascara', 'Frutos de cáscara', 'almendra, avellana, nuez, anacardo, pistacho, nuez de Brasil, pacana, macadamia'],
    ['apio', 'Apio', ''],
    ['mostaza', 'Mostaza', ''],
    ['sesamo', 'Sésamo', ''],
    ['sulfitos', 'Sulfitos', 'vino, frutos secos desecados, algunos embutidos y conservas'],
    ['altramuz', 'Altramuz', ''],
    ['moluscos', 'Moluscos', 'mejillón, almeja, calamar, pulpo, caracol…']
  ]},
  { grupo: 'Otras alergias frecuentes en España', items: [
    ['rosaceas', 'Frutas rosáceas / proteína LTP', 'melocotón, manzana, pera, cereza, ciruela, albaricoque…'],
    ['kiwi', 'Kiwi', ''],
    ['legumbres', 'Legumbres', 'lenteja, garbanzo, guisante, judía'],
    ['anisakis', 'Anisakis', 'parásito del pescado'],
    ['latexfrutas', 'Síndrome látex-frutas', 'plátano, aguacate, castaña, kiwi'],
    ['semillas', 'Otras semillas', 'pipas de girasol, lino, chía, amapola…']
  ]},
  { grupo: 'Intolerancias y otras', items: [
    ['celiaquia', 'Celiaquía (enfermedad celíaca)', ''],
    ['sgnc', 'Sensibilidad al gluten no celíaca', ''],
    ['lactosa', 'Intolerancia a la lactosa', ''],
    ['fructosa', 'Malabsorción de fructosa o sorbitol', ''],
    ['histamina', 'Intolerancia a la histamina', '']
  ]}
];
function nombreAlergia(id){ for (const g of ALERGIAS) for (const it of g.items) if (it[0] === id) return it[1]; return id; }
function alergiasDe(k){ const d = clientesData[k]; return (d && d.alergias) || null; }
function resumenAlergias(a){
  if (!a || !a.fecha) return { txt: 'Sin rellenar', ok: false, n: 0 };
  const n = Object.keys(a.items || {}).length;
  if (a.ninguna && !n && !a.otras) return { txt: 'Ninguna', ok: true, n: 0 };
  if (!n) return { txt: 'Ver nota', ok: false, n: 1 };
  return { txt: n + (n === 1 ? ' marcada' : ' marcadas'), ok: false, n: n };
}
let alergBorrador = null;
function hojaAlergias(){
  let o = document.getElementById('alergiasSheet');
  if (!o) {
    o = document.createElement('div');
    o.className = 'fsd-overlay'; o.id = 'alergiasSheet';
    o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'algTit');
    const ref = document.getElementById('consentSalud');            // junto a las demás ventanas (mismos colores y tema)
    ref.parentNode.insertBefore(o, ref.nextSibling);
  }
  return o;
}
function abrirAlergias(){
  const k = clienteActual;
  if (!k || !clientesData[k]) return;
  const a = alergiasDe(k) || {};
  alergBorrador = { items: Object.assign({}, a.items || {}), ninguna: !!a.ninguna, otras: a.otras || '' };
  pintarHojaAlergias();
  hojaAlergias().classList.add('show');
}
function cerrarAlergias(){ hojaAlergias().classList.remove('show'); alergBorrador = null; }
function pintarHojaAlergias(){
  const b = alergBorrador, o = hojaAlergias();
  let h = '<div class="fsd-sheet full alg-sheet"><div class="sheet-head"><h3 id="algTit">Alergias e intolerancias</h3><button class="x-btn" onclick="cerrarAlergias()" aria-label="Cerrar">×</button></div>'
    + '<p class="alg-intro">Marca lo que te afecte. Fátima lo tendrá delante al preparar tu dieta. Si no estás seguro, márcalo como «sospecha».</p>'
    + '<label class="chk-row alg-ninguna"><input type="checkbox"' + (b.ninguna ? ' checked' : '') + ' onchange="algNinguna(this.checked)"><span><b>No tengo ninguna alergia ni intolerancia alimentaria</b></span></label>';
  ALERGIAS.forEach(function(g){
    h += '<div class="section-lbl">' + esc(g.grupo) + '</div><div class="alg-grupo">';
    g.items.forEach(function(it){
      const on = it[0] in b.items, est = b.items[it[0]] || '';
      h += '<div class="alg-item' + (on ? ' on' : '') + '">'
        + '<label class="chk-row"><input type="checkbox"' + (on ? ' checked' : '') + ' onchange="algMarcar(\'' + it[0] + '\', this.checked)"><span>' + esc(it[1]) + (it[2] ? '<i class="opc">' + esc(it[2]) + '</i>' : '') + '</span></label>'
        + (on ? '<div class="alg-est" role="radiogroup" aria-label="¿Está diagnosticada?">'
          + '<button type="button" role="radio" aria-checked="' + (est === 'diag') + '" class="' + (est === 'diag' ? 'on' : '') + '" onclick="algEstado(\'' + it[0] + '\',\'diag\')">Diagnosticada por un médico</button>'
          + '<button type="button" role="radio" aria-checked="' + (est === 'sosp') + '" class="' + (est === 'sosp' ? 'on' : '') + '" onclick="algEstado(\'' + it[0] + '\',\'sosp\')">Solo sospecha</button></div>' : '')
        + '</div>';
    });
    h += '</div>';
  });
  h += '<div class="section-lbl">Otras o detalles</div>'
    + '<textarea class="sg-text" id="algOtras" rows="3" placeholder="Por ejemplo: solo me pasa con el melocotón con piel; reacciono a la merluza pero no al atún…" oninput="alergBorrador.otras=this.value">' + esc(b.otras) + '</textarea>'
    + '<p class="alg-nota">Esto no sustituye un diagnóstico médico. Si tienes síntomas, consulta con un alergólogo.</p>'
    + '<button class="btn-primary" onclick="guardarAlergias()">Guardar</button></div>';
  const y = o.querySelector('.fsd-sheet') ? o.querySelector('.fsd-sheet').scrollTop : 0;
  o.innerHTML = h;
  o.querySelector('.fsd-sheet').scrollTop = y;
}
function algMarcar(id, on){
  if (on) { alergBorrador.items[id] = ''; alergBorrador.ninguna = false; }
  else delete alergBorrador.items[id];
  pintarHojaAlergias();
}
function algEstado(id, est){ alergBorrador.items[id] = est; pintarHojaAlergias(); }
function algNinguna(on){
  alergBorrador.ninguna = on;
  if (on) alergBorrador.items = {};
  pintarHojaAlergias();
}
function guardarAlergias(){
  const k = clienteActual, d = clientesData[k], b = alergBorrador;
  if (!d || !b) return;
  b.otras = (document.getElementById('algOtras').value || '').trim().slice(0, 800);
  const n = Object.keys(b.items).length;
  if (!n && !b.ninguna && !b.otras) { toast('Marca al menos una opción o «No tengo ninguna».'); return; }
  const antes = d.alergias;
  d.alergias = { items: b.items, ninguna: b.ninguna && !n && !b.otras, otras: b.otras, fecha: new Date().toISOString() };
  guardarTodo();
  cerrarAlergias();
  pintarPerfilAlergias();
  toast('Guardado. Fátima lo verá al preparar tu dieta.');
  const fat = COACHES.filter(function(c){ return c.rol === 'dietista'; })[0];
  if (fat) {
    const lista = Object.keys(d.alergias.items).map(nombreAlergia);
    const txt = d.alergias.ninguna ? 'Sin alergias ni intolerancias' : (lista.join(', ') + (d.alergias.otras ? (lista.length ? ' · ' : '') + d.alergias.otras : ''));
    crearAviso(clavePro(fat.u), 'alergias', d.nombre + (antes && antes.fecha ? ' ha cambiado sus alergias' : ' ha indicado sus alergias'), recortar(txt, 120), { cliente: k, vista: 'ficha' });
  }
}
function pintarPerfilAlergias(){
  const el = document.getElementById('perfAlergias');
  if (!el || !clienteActual) return;
  const r = resumenAlergias(alergiasDe(clienteActual));
  el.textContent = r.txt;
  el.className = 'pill' + (r.ok ? ' ok' : '') + (r.n ? ' alg-hay' : '');
}
/* texto para el profesional: diagnosticadas primero */
function htmlAlergiasPro(k, compacto){
  const a = alergiasDe(k);
  if (!a || !a.fecha) return '<span class="alg-vacio">El cliente aún no ha rellenado sus alergias e intolerancias.</span>';
  if (a.ninguna) return '<span class="alg-vacio">Sin alergias ni intolerancias (indicado el ' + fechaCorta(a.fecha) + ').</span>';
  const orden = { diag: 0, '': 1, sosp: 2 };
  const ids = Object.keys(a.items).sort(function(x, y){ return orden[a.items[x]] - orden[a.items[y]]; });
  const chips = ids.map(function(id){
    const e = a.items[id];
    return '<span class="alg-chip ' + (e || 'sin') + '">' + esc(nombreAlergia(id)) + '<small>' + (e === 'diag' ? 'diagnosticada' : (e === 'sosp' ? 'sospecha' : 'sin indicar')) + '</small></span>';
  }).join('');
  return '<div class="alg-chips">' + chips + '</div>' + (a.otras ? '<div class="alg-otras">«' + esc(a.otras) + '»</div>' : '')
    + (compacto ? '' : '<div class="alg-fecha">Actualizado el ' + fechaCorta(a.fecha) + '</div>');
}
/* ficha del cliente */
function pintarAlergiasFicha(){
  const k = clienteActual, d = clientesData[k];
  const v = document.getElementById('view-coach-cliente');
  if (!d || !v) return;
  let row = document.getElementById('fichaAlergias');
  if (!row) {
    const ref = document.getElementById('fichaImagen') || (document.getElementById('fichaCodigo') || {}).closest && document.getElementById('fichaCodigo').closest('.list-row');
    if (!ref) return;
    row = document.createElement('div');
    row.id = 'fichaAlergias'; row.className = 'list-row';
    row.onclick = function(){ abrirDialogo({ titulo: 'Alergias de ' + clientesData[clienteActual].nombre, texto: '', ok: 'Entendido', soloOk: true }); document.getElementById('dlgTexto').innerHTML = htmlAlergiasPro(clienteActual); };
    ref.parentNode.insertBefore(row, ref.nextSibling);
  }
  const r = resumenAlergias(alergiasDe(k));
  const hayDiag = d.alergias && d.alergias.items && Object.keys(d.alergias.items).some(function(x){ return d.alergias.items[x] === 'diag'; });
  row.innerHTML = '<span>Alergias e intolerancias</span><span class="ajx-acts"><span class="pill' + (r.ok ? ' ok' : '') + (hayDiag ? ' alg-diag' : (r.n ? ' alg-hay' : '')) + '">' + esc(r.txt) + '</span><span class="chev">›</span></span>';
}
/* plan nutricional visto o editado por el profesional: aviso fijo arriba */
function pintarAlergiasPlan(){
  const v = document.getElementById('view-plan');
  if (!v) return;
  let box = document.getElementById('planAlergias');
  if (!isCoachView() || !clienteActual) { if (box) box.hidden = true; return; }
  if (!box) {
    box = document.createElement('div'); box.id = 'planAlergias'; box.className = 'alg-banner';
    const top = v.querySelector('.view-top');
    top.parentNode.insertBefore(box, top.nextSibling);
  }
  box.hidden = false;
  box.innerHTML = '<div class="alg-banner-t">⚠️ Alergias e intolerancias</div>' + htmlAlergiasPro(clienteActual, true);
}
goTo = (function(orig){
  return function(n, s){ orig(n, s); if (n === 'perfil') pintarPerfilAlergias(); if (n === 'plan') pintarAlergiasPlan(); };
})(goTo);
(function(){
  const sh = showScreen;
  showScreen = function(id){ sh(id); if (id === 'view-coach-cliente') pintarAlergiasFicha(); if (id === 'app') { pintarAlergiasPlan(); pintarPerfilAlergias(); } };
})();
atrasDentroApp = (function(orig){
  return function(){ if (capaVisible('alergiasSheet')) { cerrarAlergias(); return true; } return orig(); };
})(atrasDentroApp);

/* v0.51 · Pestaña Clientes: colores de valoración en los recuadros (misma escala que Seguimientos) */
function colorearTarjetasClientes(){
  Array.prototype.forEach.call(document.querySelectorAll('#listaClientes .cliente-card'), function(card){
    ['kc-ent', 'kc-nut'].forEach(function(cls){
      const box = card.querySelector('.kc.' + cls);
      if (!box) return;
      const v = box.querySelector('.kc-v');
      const m = v && v.textContent.match(/([\d.,]+)\s*\/\s*10/);
      for (let i = 1; i <= 5; i++) box.classList.remove('v-n' + i);
      if (!m) return;
      const n = nivel(limitar(parseFloat(m[1].replace(',', '.')) / 10));
      box.classList.add('v-n' + n);
      const num = v.firstChild;
      if (num && num.nodeType === 3) { const b = document.createElement('b'); b.className = 'v' + n; b.textContent = num.textContent; v.replaceChild(b, num); }
    });
    const msg = card.querySelector('.kc.kc-msgs');
    if (msg) msg.classList.toggle('v-n1', msg.classList.contains('hay'));
  });
}
pintarListaClientes = (function(orig){
  return function(){ orig(); colorearTarjetasClientes(); };
})(pintarListaClientes);
actualizarPanel();

/* =========================================================
   v0.52 · Pestaña «Chats» del profesional
   Cada profesional ve como pendientes los mensajes del cliente que ÉL no ha contestado.
   Hora de los mensajes: clientesData[k].chatT = { cli: [iso…], pro: { domingo: iso, … }, ult: { t, quien, txt } }
   (los chats anteriores a este cambio no tienen hora: no cuentan como pendientes)
   ========================================================= */
const ESPERA_ROJA_H = 48;
topScreens.push('view-coach-chats');
PANTALLAS_CON_TABS.push('view-coach-chats');
(function(){
  const nav = document.getElementById('coachTabs');
  const segs = document.getElementById('ctab-segs');
  const b = document.createElement('button');
  b.className = 'tbi'; b.id = 'ctab-chats';
  b.setAttribute('onclick', "abrirTabPro('chats')");
  b.innerHTML = '<span class="tbi-emo" aria-hidden="true">💬</span>CHATS<span class="tab-badge" id="ctabChatsN" hidden>0</span>';
  nav.insertBefore(b, segs);
})();
function chatT(k){ const d = clientesData[k]; if (!d) return null; d.chatT = d.chatT || { cli: [], pro: {}, ult: null }; return d.chatT; }
function registrarMensaje(k, deCliente, txt){
  const c = chatT(k); if (!c) return;
  const ahora = new Date().toISOString();
  if (deCliente) { c.cli.push(ahora); if (c.cli.length > 40) c.cli = c.cli.slice(-40); }
  else if (coachActivo) c.pro[norm(coachActivo.u)] = ahora;
  c.ult = { t: ahora, quien: deCliente ? 'cliente' : (coachActivo ? coachActivo.u : ''), txt: recortar(txt, 90) };
  programarGuardado();
  pintarBadgeChats();
}
/* desde cuándo espera respuesta de este profesional (null si no espera) */
function esperaDesde(k){
  const d = clientesData[k];
  if (!coachActivo || !d || !d.chatT) return null;
  const mio = d.chatT.pro[norm(coachActivo.u)] || '';
  const pend = d.chatT.cli.filter(function(t){ return t > mio; });
  return pend.length ? pend[0] : null;
}
function horasDesde(iso){ return (Date.now() - new Date(iso).getTime()) / 3600000; }
function textoEspera(h){
  if (h < 1) return 'hace ' + Math.max(1, Math.round(h * 60)) + ' min';
  if (h < 24) return 'hace ' + Math.round(h) + ' h';
  const d = Math.floor(h / 24);
  return 'hace ' + d + (d === 1 ? ' día' : ' días');
}
function ultimoTextoChat(k){
  const c = clientesData[k] && clientesData[k].chatT;
  if (c && c.ult) return c.ult;
  const html = PLANES[k] && PLANES[k].chat;                      // chats antiguos: último mensaje sin hora
  if (!html) return null;
  const tmp = document.createElement('div'); tmp.innerHTML = html;
  const bs = tmp.querySelectorAll('.bubble'); const b = bs[bs.length - 1];
  if (!b) return null;
  const s = b.querySelector('.sender'); if (s) s.remove();
  const txt = b.querySelector('audio') ? '🎤 Nota de voz' : (b.querySelector('img') && !b.textContent.trim() ? '📷 Foto' : b.textContent.trim());
  return { t: null, quien: '', txt: recortar(txt, 90) };
}
function datosChats(){
  return Object.keys(clientesData).map(function(k){
    const esp = esperaDesde(k), ult = ultimoTextoChat(k);
    return { k: k, d: clientesData[k], esp: esp, h: esp ? horasDesde(esp) : 0, ult: ult, sinLeer: msgsSinLeer(k) };
  }).sort(function(a, b){
    if (!!a.esp !== !!b.esp) return a.esp ? -1 : 1;
    if (a.esp) return a.esp < b.esp ? -1 : 1;                       // el que más tiempo lleva esperando, arriba
    const ta = a.ult && a.ult.t || '', tb = b.ult && b.ult.t || '';
    if (ta !== tb) return ta < tb ? 1 : -1;
    return (a.d.nombre || '').localeCompare(b.d.nombre || '');
  });
}
function pintarChatsPro(){
  const cont = document.getElementById('chatsPro');
  if (!cont) return;
  setTxt('chatsWho', coachActivo ? coachActivo.u + ' · ' + coachActivo.rol : 'Fitness sin dramas');
  const lista = datosChats();
  if (!lista.length) { cont.innerHTML = '<div class="vacio"><b>Todavía no hay clientes</b><span>Cuando des de alta a alguien, su chat aparecerá aquí.</span></div>'; return; }
  const esperan = lista.filter(function(x){ return x.esp; });
  const rojos = esperan.filter(function(x){ return x.h >= ESPERA_ROJA_H; }).length;
  let h = '<div class="panel-stats chats-stats">'
    + '<div class="panel-stat"><div class="val' + (esperan.length ? ' warn' : '') + '">' + esperan.length + '</div><div class="lbl">Sin contestar</div></div>'
    + '<div class="panel-stat"><div class="val' + (rojos ? ' warn' : '') + '">' + rojos + '</div><div class="lbl">Más de 48 h</div></div>'
    + '<div class="panel-stat"><div class="val">' + lista.length + '</div><div class="lbl">Chats</div></div></div>';
  const fila = function(x){
    const rojo = x.esp && x.h >= ESPERA_ROJA_H;
    const cuando = x.esp ? textoEspera(x.h) : (x.ult && x.ult.t ? textoEspera(horasDesde(x.ult.t)) : '');
    const quien = x.ult && x.ult.quien && x.ult.quien !== 'cliente' ? esc(x.ult.quien) + ': ' : '';
    return '<div class="chat-fila' + (rojo ? ' rojo' : (x.esp ? ' espera' : '')) + '" onclick="abrirChatPro(\'' + x.k + '\')">'
      + '<span class="avatar chat-fila-av" data-k="' + x.k + '"></span>'
      + '<div class="chat-fila-txt"><div class="chat-fila-top"><b>' + esc(x.d.nombre) + '</b><span class="chat-fila-t">' + cuando + '</span></div>'
      + '<div class="chat-fila-ult">' + (x.ult ? quien + esc(x.ult.txt) : '<i>Sin mensajes todavía</i>') + '</div>'
      + (x.esp ? '<div class="chat-fila-est">' + (rojo ? '⚠️ Sin contestar · ' + textoEspera(x.h).replace('hace ', '') : 'Esperando tu respuesta') + '</div>' : '')
      + '</div>'
      + (x.sinLeer ? '<span class="chat-fila-n">' + x.sinLeer + '</span>' : '')
      + '</div>';
  };
  if (esperan.length) h += '<div class="alta-label">Esperan tu respuesta</div><div class="chat-filas">' + esperan.map(fila).join('') + '</div>';
  const resto = lista.filter(function(x){ return !x.esp; });
  if (resto.length) h += '<div class="alta-label">' + (esperan.length ? 'Al día' : 'Todos los chats') + '</div><div class="chat-filas">' + resto.map(fila).join('') + '</div>';
  cont.innerHTML = h;
  Array.prototype.forEach.call(cont.querySelectorAll('.chat-fila-av'), function(av){
    const k = av.getAttribute('data-k'), url = fotoDe('cliente:' + k);
    if (url) pintarFoto(av, url); else av.textContent = (clientesData[k].nombre || '?').trim().charAt(0).toUpperCase();
  });
}
function pintarBadgeChats(){
  const b = document.getElementById('ctabChatsN');
  if (!b) return;
  const lista = coachActivo ? Object.keys(clientesData).map(esperaDesde).filter(Boolean) : [];
  b.hidden = !lista.length;
  b.textContent = lista.length;
  b.classList.toggle('rojo', lista.some(function(t){ return horasDesde(t) >= ESPERA_ROJA_H; }));
}
function abrirChatPro(k){
  goToCliente(k);
  verConversacion();
}
abrirTabPro = (function(orig){
  return function(t){
    if (t !== 'chats') { orig(t); pintarBadgeChats(); return; }
    tabProActual = 'chats';
    navDir = 'tab';
    try { pintarChatsPro(); showScreen('view-coach-chats'); } finally { navDir = null; }
    pintarTabsPro();
    const bd = document.querySelector('#view-coach-chats .alta-body'); if (bd) bd.scrollTop = 0;
  };
})(abrirTabPro);
pintarTabsPro = (function(orig){
  return function(){
    orig();
    const b = document.getElementById('ctab-chats');
    if (b) b.classList.toggle('active', tabProActual === 'chats');
    pintarBadgeChats();
  };
})(pintarTabsPro);
/* registrar la hora de cada mensaje (texto, fotos y notas de voz) */
sendMsg = (function(orig){
  return function(){
    const t = (document.getElementById('chatInput').value || '').trim();
    const k = clienteActual, coach = isCoachView();
    orig();
    if (t && k) registrarMensaje(k, !coach, t);
  };
})(sendMsg);
meterEnChat = (function(orig){
  return function(b){
    orig(b);
    if (!clienteActual) return;
    const txt = b && b.querySelector && b.querySelector('.audio-b') ? '🎤 Nota de voz' : '📷 Foto';
    registrarMensaje(clienteActual, !isCoachView(), txt);
  };
})(meterEnChat);
/* ficha del cliente: botón de chat bien visible arriba */
(function(){
  const top = document.querySelector('#view-coach-cliente .alta-top');
  if (!top) return;
  const b = document.createElement('button');
  b.className = 'ficha-chat-btn'; b.id = 'fichaChatBtn';
  b.setAttribute('aria-label', 'Abrir el chat con el cliente');
  b.innerHTML = '<span aria-hidden="true">💬</span>Chat<span class="tab-badge" id="fichaChatBtnN" hidden>0</span>';
  b.onclick = function(){ verConversacion(); };
  top.appendChild(b);
})();
function pintarBotonChatFicha(){
  const n = clienteActual ? msgsSinLeer(clienteActual) : 0;
  const esp = clienteActual ? esperaDesde(clienteActual) : null;
  const el = document.getElementById('fichaChatBtnN');
  if (el) { el.hidden = !n; el.textContent = n; }
  const b = document.getElementById('fichaChatBtn');
  if (b) b.classList.toggle('rojo', !!esp && horasDesde(esp) >= ESPERA_ROJA_H);
}
(function(){
  const sh = showScreen;
  showScreen = function(id){
    sh(id);
    if (id === 'view-coach-cliente') pintarBotonChatFicha();
    if (id === 'view-coach-chats') pintarChatsPro();
    pintarBadgeChats();
  };
})();
window.addEventListener('storage', function(){ pintarBadgeChats(); if (pantallaVisible() === 'view-coach-chats') pintarChatsPro(); });
setInterval(function(){ if (coachActivo) { pintarBadgeChats(); if (pantallaVisible() === 'view-coach-chats') pintarChatsPro(); } }, 60000);
pintarBadgeChats();

/* =========================================================
   v0.52 · Pasos medios semanales (actividad física)
   Puntuación 1–10: menos de 2.000 pasos = 1 · 10.000 o más = 10 · proporcional entre medias.
   Cuenta en la puntuación global (5 de 100, que salen de «entreno», que pasa de 20 a 15).
   ========================================================= */
PESOS_PUNTUACION.ent = 15;
PESOS_PUNTUACION.pasos = 5;
function puntosPasos(p){
  if (p == null) return null;
  if (p < 2000) return 1;
  if (p >= 10000) return 10;
  return Math.round(1 + 9 * (p - 2000) / 8000);
}
function fmtPasos(p){ return String(Math.round(p)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
function setPasos(el){
  const box = document.getElementById('sgPasos');
  box.classList.remove('sin-tocar');
  const v = +el.value, pts = puntosPasos(v);
  setTxt('rPasos', fmtPasos(v));
  const d = document.getElementById('pasosDesc');
  if (d) d.innerHTML = (v >= 20000 ? 'Más de ' : '') + '<b>' + fmtPasos(v) + ' pasos al día</b> · actividad <b class="v' + nivel(pts / 10) + '">' + pts + '/10</b>';
}
function vaciarPasos(){
  const box = document.getElementById('sgPasos'); if (!box) return;
  box.classList.add('sin-tocar');
  const r = sgAnterior();
  box.querySelector('input').value = r && r.pasos != null ? r.pasos : 6000;
  setTxt('rPasos', '—');
  const d = document.getElementById('pasosDesc');
  if (d) d.textContent = 'Desliza para indicar tus pasos medios. Si no lo sabes, déjalo sin tocar.';
  let a = box.querySelector('.sg-antes');
  if (r && r.pasos != null) { if (!a) { a = document.createElement('span'); a.className = 'sg-antes'; box.appendChild(a); } a.textContent = 'antes ' + fmtPasos(r.pasos); }
  else if (a) a.remove();
}
guardarSeguimiento = (function(orig){
  return function(){
    const box = document.getElementById('sgPasos');
    const pasos = box && !box.classList.contains('sin-tocar') ? +box.querySelector('input').value : null;
    const k = clienteActual;
    const antes = k ? (SEGUIMIENTOS[k] || []).length : 0;
    orig();
    const lista = k ? (SEGUIMIENTOS[k] || []) : [];
    if (lista.length > antes && lista[0]) {
      lista[0].pasos = pasos;
      guardarTodo();
      vaciarPasos();
      pintarHistorialCliente();
    }
  };
})(guardarSeguimiento);
goTo = (function(orig){
  return function(n, s){ orig(n, s); if (n === 'seguimiento' && document.getElementById('sgPasos').classList.contains('sin-tocar')) vaciarPasos(); };
})(goTo);
/* la puntuación global incluye la actividad */
puntuacionCliente = (function(orig){
  return function(k, i){
    const res = orig(k, i);
    if (!res) return res;
    const r = (SEGUIMIENTOS[k] || [])[i || 0];
    const pts = r ? puntosPasos(r.pasos) : null;
    res.partes.pasos = pts == null ? null : pts / 10;
    let suma = 0, pesos = 0;
    Object.keys(PESOS_PUNTUACION).forEach(function(c){
      if (res.partes[c] == null) return;
      suma += res.partes[c] * PESOS_PUNTUACION[c]; pesos += PESOS_PUNTUACION[c];
    });
    res.total = Math.round(suma / pesos * 100);
    return res;
  };
})(puntuacionCliente);
/* tarjeta de cada seguimiento: actividad con su nota y la flecha frente a la semana anterior */
tarjetaSeguimiento = (function(orig){
  return function(r, i, lista){
    const html = orig(r, i, lista);
    if (!r || r.pasos == null) return html;
    const tmp = document.createElement('div'); tmp.innerHTML = html;
    const stats = tmp.querySelector('.segui-stats');
    if (!stats) return html;
    const pts = puntosPasos(r.pasos);
    const prev = lista ? lista[i + 1] : null;
    let fl = '';
    if (prev && prev.pasos != null) {
      const d = r.pasos - prev.pasos;
      fl = Math.abs(d) < 250 ? ' <span class="flecha eq">=</span>'
        : ' <span class="flecha ' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '↑ ' : '↓ ') + fmtPasos(Math.abs(d)) + '</span>';
    }
    const cel = document.createElement('div');
    cel.innerHTML = '<span class="segui-lbl">Actividad</span><span class="segui-val">' + pts + '/10</span>';
    stats.appendChild(cel);
    const linea = document.createElement('div');
    linea.className = 'segui-pasos';
    linea.innerHTML = '👟 <b>' + fmtPasos(r.pasos) + '</b> pasos al día' + fl;
    stats.parentNode.insertBefore(linea, stats.nextSibling);
    return tmp.innerHTML;
  };
})(tarjetaSeguimiento);
/* ficha: gráfico de actividad de las últimas semanas y tendencia */
function tendenciaPasos(vals){            // vals: del más antiguo al más reciente
  if (vals.length < 2) return null;
  const n = vals.length, xm = (n - 1) / 2, ym = vals.reduce(function(a, b){ return a + b; }, 0) / n;
  let num = 0, den = 0;
  vals.forEach(function(y, x){ num += (x - xm) * (y - ym); den += (x - xm) * (x - xm); });
  const pend = den ? num / den : 0;       // pasos por semana
  return pend > 300 ? 'sube' : (pend < -300 ? 'baja' : 'estable');
}
function pintarActividadFicha(){
  const k = clienteActual, v = document.getElementById('view-coach-cliente');
  if (!k || !v) return;
  let box = document.getElementById('fichaPasos');
  if (!box) {
    box = document.createElement('div'); box.id = 'fichaPasos';
    const ref = document.getElementById('fichaSens') || Array.prototype.filter.call(v.querySelectorAll('.alta-label'), function(x){ return /Gestión/.test(x.textContent); })[0];
    ref.parentNode.insertBefore(box, ref);
  }
  const segs = (SEGUIMIENTOS[k] || []).filter(function(r){ return r.pasos != null; }).slice(0, 12).reverse();
  if (!segs.length) {
    box.innerHTML = '<div class="alta-label">Actividad física</div><div class="picker-empty">Aún no ha indicado sus pasos en ningún seguimiento.</div>';
    return;
  }
  const vals = segs.map(function(r){ return r.pasos; });
  const max = Math.max(12000, Math.max.apply(null, vals));
  const media = vals.reduce(function(a, b){ return a + b; }, 0) / vals.length;
  const t = tendenciaPasos(vals.slice(-6));
  const tTxt = t === 'sube' ? '<span class="tend up">↑ Subiendo</span>' : (t === 'baja' ? '<span class="tend down">↓ Bajando</span>' : (t ? '<span class="tend eq">= Estable</span>' : ''));
  const barras = segs.map(function(r){
    const pts = puntosPasos(r.pasos);
    const s = String(r.s || '').split('·')[0].trim().replace('Semana ', 'S');
    return '<div class="pb"><span class="pb-v">' + (r.pasos >= 1000 ? (Math.round(r.pasos / 100) / 10).toString().replace('.', ',') + 'k' : r.pasos) + '</span>'
      + '<span class="pb-b b' + nivel(pts / 10) + '" style="height:' + Math.max(4, Math.round(r.pasos / max * 100)) + '%" title="' + fmtPasos(r.pasos) + ' pasos · ' + pts + '/10"></span>'
      + '<span class="pb-s">' + esc(s) + '</span></div>';
  }).join('');
  const ult = segs[segs.length - 1];
  box.innerHTML = '<div class="alta-label">Actividad física</div>'
    + '<div class="pasos-card"><div class="pasos-top"><div><b>' + fmtPasos(ult.pasos) + '</b> pasos/día <small>última semana · ' + puntosPasos(ult.pasos) + '/10</small></div>' + tTxt + '</div>'
    + '<div class="pasos-graf" role="img" aria-label="Pasos medios por semana">' + barras + '</div>'
    + '<div class="pasos-pie">Media de ' + vals.length + (vals.length === 1 ? ' semana' : ' semanas') + ': <b>' + fmtPasos(media) + '</b> pasos/día</div></div>';
}
(function(){
  const sh = showScreen;
  showScreen = function(id){ sh(id); if (id === 'view-coach-cliente') pintarActividadFicha(); };
})();

/* =========================================================
   v0.52 · Atrás del móvil por niveles
   subpantalla → su pestaña principal (paso a paso) → inicio → «¿Salir de la app?»
   Cliente: inicio «Hoy»; pestañas Nutrición, Entrenamiento, Progreso, Chat y Ajustes.
   Profesional: inicio «Clientes»; pestañas Chats, Seguimientos y Ajustes.
   ========================================================= */
const TABS_CLIENTE = ['hoy', 'plan', 'entreno', 'progreso', 'chat', 'ajustes'];
let chatDesdeTabChats = false;
goToCliente = (function(orig){ return function(k){ chatDesdeTabChats = false; orig(k); }; })(goToCliente);
abrirChatPro = function(k){ goToCliente(k); chatDesdeTabChats = true; verConversacion(); };
function atrasPorNiveles(){
  const vis = pantallaVisible();
  const coachBar = document.getElementById('coachBar').classList.contains('show');
  if (coachActivo) {
    if (vis === 'view-coach-panel') { avisoSalirApp(); return; }
    if (vis === 'app' && coachBar) {                     // chat, plan o entreno del cliente
      const desdeChats = chatDesdeTabChats;
      backToCliente();                                    // guarda lo que se estuviera editando
      if (desdeChats) { chatDesdeTabChats = false; abrirTabPro('chats'); }
      return;
    }
    if (vis === 'view-coach-seguimientos') { showScreen('view-coach-cliente'); return; }
    if (vis === 'view-coach-cliente') { abrirTabPro(tabProActual && tabProActual !== 'ajustes' ? tabProActual : 'clientes'); return; }
    abrirTabPro('clientes');                              // Chats, Seguimientos, Ajustes, alta…
    return;
  }
  // cliente
  if (vistaActual === 'hoy') { avisoSalirApp(); return; }
  if (TABS_CLIENTE.indexOf(vistaActual) > -1) { navHist.length = 0; navDir = 'pop'; goTo('hoy', true); navDir = null; return; }
  volverAtras();                                          // subpantalla: un paso atrás (p. ej. seguimiento → perfil → hoy)
}
atrasDentroApp = (function(orig){
  return function(){
    if (hayCapaAbierta()) return orig();
    const vis = pantallaVisible();
    if (!vis || vis === 'view-splash') return orig();
    if (!coachActivo && vis !== 'app') return orig();
    atrasPorNiveles();
    return true;
  };
})(atrasDentroApp);
