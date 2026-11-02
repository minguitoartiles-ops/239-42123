/* =========================================================
   Fitnessindramas — Modo servidor · paso 3: planes desde el servidor (2/11/2026)
   Solo en modo servidor (?servidor=pruebas). Se carga después de servidor.js.

   Cada plan va al servidor en dos partes (modelo.js las separa y las vuelve a unir):
   · la PAUTA: la escribe el profesional de su área (entreno → Domingo, nutrición → Fátima)
   · el REGISTRO de la semana: lo que apunta el cliente (pesos, series, sesiones y comidas hechas)
   Cada uno solo sube su parte: nadie pisa lo del otro, y el servidor lo obliga igualmente.

   · Se guardan DATOS, no el HTML de la pantalla. Al traerlos, la pantalla se vuelve a dibujar
     con las piezas de la app, y lo que llega se limpia antes (solo números, fechas y textos cortos
     en lo que apunta el cliente), para que nadie pueda colar código en la pantalla de otro.
   · Lo que llega del servidor no pisa lo que aún no se ha subido desde este aparato, ni lo que
     se está editando o escribiendo en ese momento (se aplica al terminar).
   · Sin conexión, lo pendiente se queda en el aparato y se sube al volver internet.
   ========================================================= */
const SV_PL_PARTES = ['entP', 'entR', 'nutP', 'nutR'];

/* ---------- semanas ISO (2026-W45) ---------- */
function svSemanaISO(iso){
  const p = String(iso || '').slice(0, 10).split('-').map(Number);
  const t = new Date(Date.UTC(p[0], p[1] - 1, p[2]));
  const dia = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dia);                       // el jueves decide el año de la semana
  const ini = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const n = Math.ceil(((t - ini) / 864e5 + 1) / 7);
  return t.getUTCFullYear() + '-W' + String(n).padStart(2, '0');
}
function svLunesDe(sem){
  const y = +sem.slice(0, 4), w = +sem.slice(6);
  const t = new Date(Date.UTC(y, 0, 4));
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() || 7) - 1) + (w - 1) * 7);
  return t.toISOString().slice(0, 10);
}
function svHoyISO(){ return mjISO(new Date()); }
function svPlSemanaLocal(d){ return svSemanaISO((d && d.semanaRef) || mjISO(mjLunes())); }
function svPlDesde(){ const t = new Date(); t.setDate(t.getDate() - 42); return svSemanaISO(mjISO(t)); }

/* ---------- huellas para saber si algo ha cambiado ---------- */
function svPlNormal(o){                                        // sin la versión ni lo vacío, con las claves en orden
  if (Array.isArray(o)) { const a = o.map(svPlNormal).filter(function(x){ return x !== undefined; }); return a.length ? a : undefined; }
  if (o && typeof o === 'object') {
    const r = {}; Object.keys(o).sort().forEach(function(k){ if (k === 'v') return; const v = svPlNormal(o[k]); if (v !== undefined) r[k] = v; });
    return Object.keys(r).length ? r : undefined;
  }
  return (o === '' || o == null || o === false) ? undefined : o;
}
function svPlHuella(o, pre){
  const s = (pre || '') + '|' + (JSON.stringify(svPlNormal(o)) || '');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36) + '.' + s.length.toString(36);
}

/* ---------- limpieza de lo que llega (o se envía) ---------- */
const SV_PL_VAL = /^[0-9A-Za-z.,:+\- ]{0,32}$/;                // lo que apunta el cliente: números, fechas, marcas
const SV_PL_ID = /^[A-Za-z0-9_-]{1,40}$/;
const SV_PL_PAUTA_NUM = /^[0-9A-Za-z.,+\-–/ ]{0,16}$/;          // series · reps · RIR de la pauta
function svPlVal(v){ if (typeof v === 'number' && isFinite(v)) v = String(v); return typeof v === 'string' && SV_PL_VAL.test(v) ? v : undefined; }
function svPlMapa(o, f, max){
  const r = {};
  if (o && typeof o === 'object' && !Array.isArray(o)) Object.keys(o).slice(0, max).forEach(function(k){ if (SV_PL_ID.test(k)) { const v = f(o[k]); if (v !== undefined) r[k] = v; } });
  return r;
}
function svPlCampos(o, campos){ const r = {}; if (o && typeof o === 'object') campos.forEach(function(c){ const v = svPlVal(o[c]); if (v) r[c] = v; }); return r; }
function svPlSanearReg(area, x){
  x = x || {};
  if (area === 'ent') return { v: FSD_MODELO_V,
    sesiones: svPlMapa(x.sesiones, function(s){ return svPlCampos(s, ['hecha', 'hechaFecha']); }, 300),
    ejercicios: svPlMapa(x.ejercicios, function(e){
      const r = svPlCampos(e, ['cardioHecho']);
      if (e && Array.isArray(e.series)) r.series = e.series.slice(0, 40).map(function(s){ return svPlCampos(s, FSD_SERIE_CLIENTE); });
      return r;
    }, 2000) };
  return { v: FSD_MODELO_V,
    comidas: svPlMapa(x.comidas, function(m){ return svPlCampos(m, ['tomada', 'tomadaFecha']); }, 200),
    elegidos: svPlMapa(x.elegidos, svPlVal, 4000) };
}
/* La pauta la escriben los profesionales, pero se limpia igual: textos acotados, nombres de
   atributos válidos, cifras de la pauta sin símbolos raros y vídeos solo con enlace https */
function svPlSanearPauta(area, x){
  const limpio = function(o, prof){
    if (prof > 12) return undefined;
    if (Array.isArray(o)) return o.slice(0, 500).map(function(v){ return limpio(v, prof + 1); });
    if (o && typeof o === 'object') {
      const r = {};
      Object.keys(o).slice(0, 200).forEach(function(k){
        if (k === 'extra') { const e = {}; if (o.extra && typeof o.extra === 'object') Object.keys(o.extra).slice(0, 40).forEach(function(n){ if (/^[a-z][a-z0-9-]{0,40}$/.test(n)) e[n] = String(o.extra[n]).slice(0, 500); }); r.extra = e; return; }
        if (!/^[A-Za-z0-9_]{1,40}$/.test(k)) return;
        r[k] = limpio(o[k], prof + 1);
      });
      return r;
    }
    if (typeof o === 'string') return o.slice(0, 4000);
    if (typeof o === 'number' && isFinite(o)) return o;
    return undefined;
  };
  const d = limpio(x || {}, 0) || {};
  d.v = FSD_MODELO_V;
  if (area === 'ent') {
    if (!Array.isArray(d.sesiones)) d.sesiones = [];
    d.sesiones.forEach(function(s){
      (s && Array.isArray(s.ejercicios) ? s.ejercicios : []).forEach(function(e){
        if (!e) return;
        const p = e.pauta || {};
        ['series', 'reps', 'rir'].forEach(function(c){ if (p[c] != null && !SV_PL_PAUTA_NUM.test(String(p[c]))) p[c] = ''; });
        (Array.isArray(e.series) ? e.series : []).forEach(function(s2){ ['reps', 'rir'].forEach(function(c){ if (s2 && s2[c] != null && !SV_PL_PAUTA_NUM.test(String(s2[c]))) s2[c] = ''; }); });
        if (e.video && !(/^https:\/\//i.test(e.video) && fsdUrlSegura(e.video))) e.video = '';
      });
    });
  } else if (!Array.isArray(d.comidas)) d.comidas = [];
  return d;
}

/* ---------- el plan de un cliente, en partes ---------- */
function svPlLocal(k){
  const p = PLANES[k] || {};
  const e = fsdEntSeparar(fsdEntLeer(p.ent || '')), n = fsdNutSeparar(fsdNutLeer(p.nut || ''));
  return { entP: e.pauta, entR: e.registro, nutP: n.pauta, nutR: n.registro };
}
function svPlHuellas(L, sem, semR){
  semR = semR || {};
  return { entP: svPlHuella(svPlSanearPauta('ent', L.entP)), nutP: svPlHuella(svPlSanearPauta('nut', L.nutP)),
           entR: svPlHuella(svPlSanearReg('ent', L.entR), semR.entR || sem), nutR: svPlHuella(svPlSanearReg('nut', L.nutR), semR.nutR || sem) };
}
/* qué partes puede subir esta sesión */
function svPlMias(){
  if (window.fsdSesionCliente && !coachActivo) return ['entR', 'nutR'];
  if (coachActivo && coachActivo.rol === 'entrenador') return ['entP'];
  if (coachActivo && coachActivo.rol === 'dietista') return ['nutP'];
  return [];
}
function svPlSesion(){ return svActivo() && !!window.fsdDatos && (!!coachActivo || !!window.fsdSesionCliente); }
function svPlOcupado(k){
  if (k !== clienteActual) return false;
  if (typeof coachEditing !== 'undefined' && coachEditing) return true;
  const a = document.activeElement;
  return !!(a && (/INPUT|TEXTAREA/.test(a.tagName) || a.isContentEditable) && ((typeof contEnt === 'function' && contEnt().contains(a)) || (typeof contNut === 'function' && contNut().contains(a))));
}

/* =========================================================
   DEL SERVIDOR A LA APP
   ========================================================= */
const svPlDiferido = {};
function svPlAplicar(k, S){
  const d = clientesData[k];
  if (!d) return false;
  if (svPlOcupado(k)) { svPlDiferido[k] = S; return false; }
  delete svPlDiferido[k];
  if (k === clienteActual) { try { guardarPlan(); } catch(e){} }     // lo que hay en pantalla cuenta como lo de este aparato
  const L = svPlLocal(k), base = d.svBase || (d.svBase = {}), mias = svPlMias();
  const semL = svPlSemanaLocal(d);
  const H = svPlHuellas(L, semL);
  const Sp = {
    entP: (S.ent && S.ent.pauta) || { sesiones: [] }, nutP: (S.nut && S.nut.pauta) || { comidas: [] },
    entR: (S.ent && S.ent.registro) || {}, nutR: (S.nut && S.nut.registro) || {},
  };
  const semS = { entR: S.ent && S.ent.semana, nutR: S.nut && S.nut.semana };
  const HS = svPlHuellas(Sp, semL, semS);
  const vacio = { entP: svPlHuella(svPlSanearPauta('ent', {})), nutP: svPlHuella(svPlSanearPauta('nut', {})) };
  const R = {}, nuevas = [];
  let semana = null;
  SV_PL_PARTES.forEach(function(p){
    const mia = mias.indexOf(p) > -1;
    // pendiente de subir desde aquí: se queda lo de este aparato
    const pendiente = mia && (d.svBase[p] !== undefined ? H[p] !== base[p]
      : (vacio[p] && HS[p] === vacio[p] && H[p] !== vacio[p]));          // primera vez: solo si el servidor está vacío
    if (pendiente) { R[p] = L[p]; if (p.slice(-1) === 'R') semana = semana || semL; return; }
    if (HS[p] !== base[p]) nuevas.push(p);
    R[p] = Sp[p];
    base[p] = HS[p];
    if (p.slice(-1) === 'R' && semS[p] && (!semana || semS[p] > semana)) semana = semS[p];
  });
  if (!nuevas.length) return false;
  if (semana && semana !== semL) d.semanaRef = svLunesDe(semana);    // así el cambio de semana se hace igual en todos los aparatos
  const ent = fsdLimpiarHtml(fsdEntPintar(fsdEntUnir(svPlSanearPauta('ent', R.entP), svPlSanearReg('ent', R.entR))));
  const nut = fsdLimpiarHtml(fsdNutPintar(fsdNutUnir(svPlSanearPauta('nut', R.nutP), svPlSanearReg('nut', R.nutR))));
  PLANES[k] = Object.assign({}, PLANES[k] || {}, { ent: fsdMdIdsHtml(ent), nut: fsdMdIdsHtml(nut) });
  if (k === clienteActual) {
    try { cargarPlan(k); } catch(e){}
    try { if (typeof ruPintar === 'function') ruPintar(); } catch(e){}
    if (window.fsdSesionCliente && !coachActivo && nuevas.some(function(p){ return p.slice(-1) === 'P'; }) && svPlYaCargado[k]) {
      try { toast('Tu plan se ha actualizado'); } catch(e){}
    }
  }
  svPlYaCargado[k] = true;
  return true;
}
const svPlYaCargado = {};

let svPlTrayendo = null;
function svPlTraer(ids){
  if (!svPlSesion()) return Promise.resolve();
  const sids = ids ? ids.filter(Boolean) : null;
  if (sids && !sids.length) return Promise.resolve();
  return svCargar().then(function(x){ return x.planes.traer(sids, svPlDesde()); }).then(function(r){
    let algo = false;
    Object.keys(clientesData).forEach(function(k){
      const d = clientesData[k];
      if (!d || !d.sid || (sids && sids.indexOf(d.sid) < 0)) return;
      if (svPlAplicar(k, r[d.sid] || {})) algo = true;
    });
    guardarTodo();
    if (algo && coachActivo) {
      try { actualizarPanel(); } catch(e){}
      try { if (typeof enPintarPlanes === 'function') enPintarPlanes(); } catch(e){}
      try { if (typeof pintarListas === 'function') pintarListas(); } catch(e){}
    }
  }).catch(function(e){
    try { toast(svMensaje(e, 'No se han podido traer los planes del servidor')); } catch(_){}
  });
}

/* ---------- tiempo real ---------- */
let svPlDejar = null;
const svPlEsperas = {};
function svPlEscuchar(){
  if (svPlDejar || !svPlSesion()) return;
  svCargar().then(function(x){
    if (svPlDejar || !svPlSesion()) return;
    svPlDejar = x.planes.escuchar(function(sid){
      clearTimeout(svPlEsperas[sid]);
      svPlEsperas[sid] = setTimeout(function(){ delete svPlEsperas[sid]; svPlTraer([sid]); }, 700);
    });
  }).catch(function(){});
}
function svPlParar(){
  if (svPlDejar) { try { svPlDejar(); } catch(e){} svPlDejar = null; }
  Object.keys(svPlEsperas).forEach(function(s){ clearTimeout(svPlEsperas[s]); delete svPlEsperas[s]; });
}

/* =========================================================
   DE LA APP AL SERVIDOR
   ========================================================= */
let svPlCola = {}, svPlTemp = null, svPlAvisado = false;
function svPlProgramar(k){
  if (!k || !svActivo()) return;
  svPlCola[k] = 1;
  clearTimeout(svPlTemp);
  svPlTemp = setTimeout(svPlSubir, 1200);
}
function svPlSubir(){
  if (!svPlSesion()) return Promise.resolve();
  const mias = svPlMias();
  if (!mias.length) return Promise.resolve();
  const claves = Object.keys(svPlCola);
  Object.keys(clientesData).forEach(function(k){ if (clientesData[k] && clientesData[k].svPend && claves.indexOf(k) < 0) claves.push(k); });
  svPlCola = {};
  const trabajos = [];
  claves.forEach(function(k){
    const d = clientesData[k];
    if (!d || !d.sid || !d.svBase) return;
    const L = svPlLocal(k), sem = svPlSemanaLocal(d);
    mias.forEach(function(p){
      if (d.svBase[p] === undefined) return;                       // aún no se ha traído nada: primero se trae
      if (p.slice(-1) === 'P' && k === clienteActual && typeof coachEditing !== 'undefined' && coachEditing) { d.svPend = true; return; }   // a medio editar: al terminar
      const area = p.slice(0, 3);
      const datos = p.slice(-1) === 'P' ? svPlSanearPauta(area, L[p]) : svPlSanearReg(area, L[p]);
      const h = p.slice(-1) === 'P' ? svPlHuella(datos) : svPlHuella(datos, sem);
      if (h === d.svBase[p]) return;
      trabajos.push(svCargar().then(function(x){
        return p.slice(-1) === 'P' ? x.planes.guardarPauta(area, d.sid, datos) : x.planes.guardarRegistro(area, d.sid, sem, datos);
      }).then(function(){
        d.svBase[p] = h;
        return true;
      }, function(e){
        d.svPend = true;
        if (!svPlAvisado) { svPlAvisado = true; try { toast(svMensaje(e, 'Sin conexión: el plan se guardará en el servidor al volver internet')); } catch(_){} }
        return false;
      }));
    });
  });
  if (!trabajos.length) return Promise.resolve();
  return Promise.all(trabajos).then(function(r){
    if (r.every(Boolean)) {
      claves.forEach(function(k){ if (clientesData[k]) delete clientesData[k].svPend; });
      svPlAvisado = false;
    }
    guardarTodo();
  });
}
function svPlAplicarDiferidos(){
  Object.keys(svPlDiferido).forEach(function(k){ if (!svPlOcupado(k)) svPlAplicar(k, svPlDiferido[k]) && guardarTodo(); });
}

/* =========================================================
   ENGANCHES
   ========================================================= */
if (svActivo()) {
  guardarTodo = (function(orig){
    return function(){
      const r = orig.apply(this, arguments);
      if (svPlSesion() && clienteActual) svPlProgramar(clienteActual);
      return r;
    };
  })(guardarTodo);

  /* al terminar de editar («Guardar cambios y notificar») se sube y se aplica lo que llegó mientras */
  editarPlan = (function(orig){
    return function(){
      const r = orig.apply(this, arguments);
      if (!coachEditing && svPlSesion()) {
        try { guardarTodo(); } catch(e){}
        clearTimeout(svPlTemp);
        if (clienteActual) svPlCola[clienteActual] = 1;
        svPlSubir().then(svPlAplicarDiferidos);
      }
      return r;
    };
  })(editarPlan);

  window.addEventListener('fsd:lista-servidor', function(){ svPlTraer(null).then(svPlSubir); svPlEscuchar(); });
  window.addEventListener('fsd:cliente-dentro', function(){
    const d = clienteActual && clientesData[clienteActual];
    if (d && d.sid) svPlTraer([d.sid]).then(svPlSubir);
    svPlEscuchar();
  });
  window.addEventListener('fsd:sesion-fuera', function(){ svPlParar(); clearTimeout(svPlTemp); svPlCola = {}; });
  window.addEventListener('online', function(){ if (svPlSesion()) svPlSubir().then(function(){ return svPlTraer(window.fsdSesionCliente && !coachActivo ? [(clientesData[clienteActual] || {}).sid] : null); }); });
  setInterval(function(){
    if (!svPlSesion()) return;
    svPlAplicarDiferidos();
    if (Object.keys(clientesData).some(function(k){ return clientesData[k] && clientesData[k].svPend; })) svPlSubir();
  }, 15000);
  document.addEventListener('focusout', function(){ setTimeout(svPlAplicarDiferidos, 300); });
  /* lo que el cliente escribe en su plan (pesos, repeticiones…) se guarda al momento, no solo al salir */
  ['input', 'change'].forEach(function(ev){
    document.addEventListener(ev, function(e){
      const t = e.target;
      if (!svPlSesion() || !t || !t.closest || !clienteActual) return;
      if ((typeof contEnt === 'function' && contEnt().contains(t)) || (typeof contNut === 'function' && contNut().contains(t))) {
        try { programarGuardado(); } catch(_){}
      }
    }, true);
  });
}
