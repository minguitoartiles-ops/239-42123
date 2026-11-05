/* =========================================================
   Fitnessindramas — Modo servidor · paso 5: seguimientos desde el servidor (5/11/2026)
   Solo en modo servidor (?servidor=pruebas). Se carga después de servidor-chat.js.

   · El cliente envía su seguimiento (uno por semana) y solo puede corregir el de esta semana.
     Cada seguimiento lleva un id puesto aquí: sin conexión se queda en el móvil y se envía al
     volver internet, sin duplicarse.
   · Cada profesional apunta lo suyo (visto, revisado y su comentario) sin quitarle nada al otro.
     Si el cliente corrige el seguimiento, lo anterior deja de contar y vuelve a salir pendiente.
   · El historial del cliente (registro de pesos por semana, tonelaje, sesiones, comidas, cardio)
     lo escribe su móvil; el equipo lo lee.
   · Manda el servidor: los seguimientos hechos en modo servidor antes de este paso no se suben.
     Lo que llega se limpia antes de enseñarlo (nadie cuela código en la pantalla de otro).
   · Fotos de progreso (paso 6): hasta 3 (frente, perfil, espalda). Se reducen en el móvil, se suben a
     la carpeta privada del cliente y el seguimiento guarda solo su ruta. Las ven el cliente, Domingo
     y Fátima; se descargan con la sesión de cada uno (en la app, su id es «sv:<ruta>»).
   ========================================================= */
function svSgSesion(){ return svActivo() && !!window.fsdDatos && (!!coachActivo || !!window.fsdSesionCliente); }
function svSgCliente(){ return !coachActivo && !!window.fsdSesionCliente; }
function svSgYo(){ return coachActivo ? norm(coachActivo.u) : null; }
const svSgDesde = Date.now();

/* ---------- limpieza de lo que se envía y de lo que llega ---------- */
const SV_SG_CORTO = /^[^<>&"'`]{0,60}$/;
function svSgTexto(v, max){ return typeof v === 'string' ? v.replace(/</g, '‹').replace(/>/g, '›').slice(0, max) : undefined; }
function svSgCorto(v){ if (typeof v === 'number' && isFinite(v)) v = String(v); return typeof v === 'string' && SV_SG_CORTO.test(v) ? v : undefined; }
function svSgNum(v){
  const n = typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v.replace(',', '.')) : NaN);
  return isFinite(n) && Math.abs(n) < 1e7 ? n : undefined;
}
function svSgDatos(r){
  r = r || {};
  const d = {};
  ['s', 'peso', 'e', 'n', 'm', 'x', 'agujetas', 'd'].forEach(function(c){ const v = svSgCorto(r[c]); if (v !== undefined) d[c] = v; });
  ['prog', 'obs'].forEach(function(c){ const v = svSgTexto(r[c], 4000); if (v) d[c] = v; });
  if (r.med && typeof r.med === 'object') {
    const m = {};
    MEDIDAS.forEach(function(x){ const v = svSgNum(r.med[x[0]]); if (v !== undefined) m[x[0]] = v; });
    d.med = m;
  }
  ['cardio', 'pasos'].forEach(function(c){ const v = svSgNum(r[c]); if (v !== undefined) d[c] = v; });
  if (Array.isArray(r.textos)) d.textos = r.textos.slice(0, 12).map(function(t){ return svSgTexto(t, 4000) || ''; });
  // fotos de progreso: { pos, ruta } (del servidor) o { pos, id: 'sv:<ruta>' } (de la app); las del
  // móvil aún sin subir no van
  if (Array.isArray(r.fotos)) {
    const vistas = {}, f = [];
    r.fotos.forEach(function(x){
      if (!x || typeof x !== 'object') return;
      const ruta = typeof x.ruta === 'string' ? x.ruta : (typeof x.id === 'string' && x.id.indexOf('sv:') === 0 ? x.id.slice(3) : '');
      if (!SV_SG_POS[x.pos] || vistas[x.pos] || !SV_ARCH_RUTA.test(ruta) || !/\.(jpg|jpeg|png|webp)$/.test(ruta)) return;
      vistas[x.pos] = 1; f.push({ pos: x.pos, ruta: ruta });
    });
    if (f.length) d.fotos = f.slice(0, 3);
  }
  return d;
}
const SV_SG_POS = { frente: 1, perfil: 1, espalda: 1 };
/* historial: claves y textos acotados, sin < > ni comillas; números finitos */
const SV_SG_CLAVE = /^[^<>&"'`]{1,120}$/;
function svSgHist(o, prof){
  prof = prof || 0;
  if (prof > 6) return undefined;
  if (Array.isArray(o)) return o.slice(-400).map(function(v){ const x = svSgHist(v, prof + 1); return x === undefined ? null : x; });
  if (o && typeof o === 'object') {
    const r = {};
    Object.keys(o).slice(0, 600).forEach(function(k){ if (!SV_SG_CLAVE.test(k)) return; const v = svSgHist(o[k], prof + 1); if (v !== undefined) r[k] = v; });
    return r;
  }
  if (typeof o === 'string') return svSgTexto(o, 200);
  if (typeof o === 'number') return isFinite(o) ? o : undefined;
  if (typeof o === 'boolean' || o === null) return o;
  return undefined;
}

/* ---------- del servidor a la app ---------- */
function svSgNombres(){
  const n = {};
  (svChEquipo || []).forEach(function(e){ n[e.user_id] = norm(e.nombre); });
  return n;
}
function svSgDeServidor(row, eq, nombres){
  const r = svSgDatos(row.datos);
  if (r.fotos) r.fotos = r.fotos.filter(function(f){ return f.ruta.indexOf(String(row.cliente_id).toLowerCase() + '/') === 0; })
                                .map(function(f){ return { pos: f.pos, id: 'sv:' + f.ruta }; });
  r.sid = row.id;
  r.fecha = svChISO(row.creado) || row.fecha;
  if (row.editado) r.editado = svChISO(row.editado);
  const ed = r.editado || '', rev = {}, visto = {};
  eq.forEach(function(e){
    if (e.seguimiento_id !== row.id) return;
    const n = nombres[e.user_id]; if (!n) return;
    const v = svChISO(e.visto), f = svChISO(e.revisado);
    if (v && v >= ed) visto[n] = v;
    if (f && f >= ed) rev[n] = { f: f, c: e.comentario ? svSgTexto(e.comentario, 4000) : '' };
  });
  if (Object.keys(rev).length) r.rev = rev;
  if (Object.keys(visto).length) r.vistoPor = visto;
  return r;
}
function svSgMiaRev(r, yo){ return r && r.rev && r.rev[yo] ? r.rev[yo].f : ''; }
function svSgMioVisto(r, yo){ return (r && r.vistoPor && r.vistoPor[yo]) || ''; }
function svSgAplicar(k, rows, eq, hist, hayHist){
  const d = clientesData[k]; if (!d) return;
  const yo = svSgYo(), nombres = svSgNombres();
  const local = SEGUIMIENTOS[k] || [], porSid = {};
  local.forEach(function(r){ if (r && r.sid) porSid[r.sid] = r; });
  const enServidor = {};
  const lista = rows.map(function(row){
    enServidor[row.id] = 1;
    const l = porSid[row.id];
    if (l && l.svSube) return l;                                  // corrección del cliente aún sin subir
    const r = svSgDeServidor(row, eq, nombres);
    if (yo) {
      r.svRevBase = svSgMiaRev(r, yo); r.svVistoBase = svSgMioVisto(r, yo);
      if (l) {                                                    // lo mío aún sin subir se queda
        const lr = svSgMiaRev(l, yo);
        if (lr !== (l.svRevBase || '')) { r.rev = r.rev || {}; if (lr) r.rev[yo] = l.rev[yo]; else delete r.rev[yo]; }
        const lv = svSgMioVisto(l, yo);
        if (lv && lv !== (l.svVistoBase || '')) { r.vistoPor = r.vistoPor || {}; r.vistoPor[yo] = lv; }
      }
    }
    return r;
  });
  local.forEach(function(l){ if (l && l.svSube === 'enviar' && l.sid && !enServidor[l.sid]) lista.push(l); });
  lista.sort(function(a, b){ return a.fecha < b.fecha ? 1 : (a.fecha > b.fecha ? -1 : 0); });
  SEGUIMIENTOS[k] = lista;
  // historial: en el móvil del cliente manda lo suyo si aún no se ha subido
  // (la primera vez en un móvil nuevo manda lo del servidor, para no pisarlo con un historial vacío)
  if (hayHist) {
    const pendiente = svSgCliente() && d.svHistBase !== undefined && d.registro && svPlHuella(svSgHist(d.registro)) !== d.svHistBase;
    if (!pendiente && hist) { d.registro = svSgHist(hist); d.svHistBase = svPlHuella(d.registro); }
    else if (!hist && d.svHistBase === undefined) d.svHistBase = '';      // el servidor aún no tiene: se sube lo de aquí
  }
}
let svSgYaCargado = false;
function svSgTraer(ids){
  if (!svSgSesion()) return Promise.resolve();
  const sids = ids ? ids.filter(Boolean) : null;
  if (sids && !sids.length) return Promise.resolve();
  return svChPreparar().then(function(x){ return x.seguimientos.traer(sids, !!coachActivo); }).then(function(r){
    const filas = {}, eq = {};
    r.seguimientos.forEach(function(s){ (filas[s.cliente_id] = filas[s.cliente_id] || []).push(s); });
    r.equipo.forEach(function(e){ (eq[e.cliente_id] = eq[e.cliente_id] || []).push(e); });
    Object.keys(clientesData).forEach(function(k){
      const d = clientesData[k];
      if (!d || !d.sid || (sids && sids.indexOf(d.sid) < 0)) return;
      if (svSgCliente() && k !== clienteActual) return;
      svSgAplicar(k, filas[d.sid] || [], eq[d.sid] || [], r.historial[d.sid], true);
    });
    svSgYaCargado = true;
    guardarTodo();
    svSgRepintar();
  }).catch(function(e){
    if (!(window.fsdDatos && fsdDatos.sinConexion(e))) { try { toast(svMensaje(e, 'No se han podido traer los seguimientos')); } catch(_){} }
  });
}
/* volver a pintar lo que dependa de los seguimientos (sin pisar un comentario a medio escribir) */
let svSgRepintarT = null;
function svSgOcupado(){
  const a = document.activeElement;
  return !!document.querySelector('#segsResumen .sg-rev.abierto') || !!(a && a.closest && a.closest('#segsResumen') && /TEXTAREA|INPUT/.test(a.tagName))
    || (typeof sgEditando !== 'undefined' && sgEditando);
}
function svSgRepintar(){
  clearTimeout(svSgRepintarT);
  if (svSgOcupado()) { svSgRepintarT = setTimeout(svSgRepintar, 1500); return; }
  ['actualizarPanel', 'pintarSegsResumen', 'pintarListas', 'pintarCampanas', 'pintarHistorialCliente', 'pintarCambiosCuerpo', 'pintarProgreso', 'sgPintarEstado', 'enPintarRegistroFicha']
    .forEach(function(n){ try { if (typeof window[n] === 'function') window[n](); } catch(e){} });
}

/* ---------- de la app al servidor ---------- */
let svSgSubiendo = false, svSgAvisado = false, svSgOtraVez = false;
function svSgSubir(){
  if (svSgSubiendo) { svSgOtraVez = true; return Promise.resolve(); }     // al terminar se vuelve a mirar
  if (!svSgSesion() || !svSgYaCargado) return Promise.resolve();
  const trabajos = [];
  if (svSgCliente()) {
    const k = clienteActual, d = k && clientesData[k];
    if (d && d.sid) {
      (SEGUIMIENTOS[k] || []).forEach(function(r){
        if (!r || !r.svSube || !r.sid) return;
        // las fotos nuevas se guardan primero en el móvil: se espera a que estén (como mucho 15 s)
        if (r.svFotosN && (r.fotos || []).length < r.svFotosN && Date.now() - (r.svFotosT || 0) < 15000) { svSgProgramar(1500); return; }
        trabajos.push([k, r]);
      });
      const h = d.registro ? svSgHist(d.registro) : null;
      if (h && d.svHistBase !== undefined && svPlHuella(h) !== d.svHistBase) trabajos.push([k, null, h]);
    }
  } else if (coachActivo) {
    const yo = svSgYo();
    Object.keys(SEGUIMIENTOS).forEach(function(k){
      (SEGUIMIENTOS[k] || []).forEach(function(r){
        if (!r || !r.sid) return;
        if (svSgMiaRev(r, yo) !== (r.svRevBase || '') || (svSgMioVisto(r, yo) && svSgMioVisto(r, yo) !== (r.svVistoBase || ''))) trabajos.push([k, r]);
      });
    });
  }
  if (!trabajos.length) return Promise.resolve();
  svSgSubiendo = true;
  return svCargar().then(function(x){
    let i = 0;
    const siguiente = function(){
      if (i >= trabajos.length) return null;
      const t = trabajos[i++], k = t[0], r = t[1], d = clientesData[k];
      let p;
      if (!r) p = x.seguimientos.guardarHistorial(d.sid, t[2]).then(function(){ d.svHistBase = svPlHuella(t[2]); });
      else if (svSgCliente()) {
        const op = r.svSube;
        p = svSgSubirFotos(x, d, r).then(function(){
          const datos = svSgDatos(r);
          return op === 'enviar'
            ? x.seguimientos.enviar({ id: r.sid, clienteId: d.sid, fecha: r.svDia || mjISO(new Date(r.fecha)), datos: datos })
            : x.seguimientos.corregir(r.sid, datos);
        }).then(function(){ if (r.svSube === op) { delete r.svSube; delete r.svFotosN; delete r.svFotosT; } });
      } else {
        const yo = svSgYo(), rev = svSgMiaRev(r, yo), visto = svSgMioVisto(r, yo), cambios = {};
        if (rev !== (r.svRevBase || '')) { cambios.revisado = rev || null; cambios.comentario = rev ? r.rev[yo].c : null; }
        if (visto && visto !== (r.svVistoBase || '')) cambios.visto = visto;
        p = x.seguimientos.marcar(r.sid, cambios).then(function(){
          if ('revisado' in cambios) r.svRevBase = rev;
          if ('visto' in cambios) r.svVistoBase = visto;
        });
      }
      return p.then(function(){ svSgAvisado = false; return siguiente(); }, function(e){
        if (x.sinConexion(e)) {
          if (!svSgAvisado) { svSgAvisado = true; try { toast('Sin conexión: se guardará en el servidor al volver internet'); } catch(_){} }
          return null;
        }
        // rechazado por el servidor: se avisa y se vuelve a lo que dice el servidor
        if (r && r.svSube) delete r.svSube;
        try { toast(svMensaje(e, 'No se ha podido guardar el seguimiento')); } catch(_){}
        svSgTraer([d.sid]);
        return siguiente();
      });
    };
    return siguiente();
  }).catch(function(){}).finally(function(){
    svSgSubiendo = false;
    try { guardarTodo(); } catch(e){}
    if (svSgOtraVez) { svSgOtraVez = false; svSgProgramar(200); }
  });
}
/* fotos de progreso aún en el móvil (IndexedDB): se suben y pasan a «sv:<ruta>».
   Cada una lleva su nombre fijo (svN): si se corta y se reintenta, no se duplica. */
function svSgSubirFotos(x, d, r){
  const locales = (r.fotos || []).filter(function(f){ return f && typeof f.id === 'string' && f.id.indexOf('sv:') !== 0; });
  let cadena = Promise.resolve();
  locales.forEach(function(f){
    cadena = cadena.then(function(){
      return prOp('readonly', function(st){ return st.get(f.id); }).then(function(b){
        if (!b) { r.fotos = r.fotos.filter(function(y){ return y !== f; }); return; }          // ya no está en el móvil
        f.svN = f.svN || svChId();
        return x.archivos.subir('fotos', d.sid, f.svN, b).then(function(ruta){
          const local = f.id;
          SV_ARCH[ruta] = URL.createObjectURL(b);
          f.id = 'sv:' + ruta; delete f.svN;
          try { guardarTodo(); } catch(e){}
          prOp('readwrite', function(st){ return st.delete(local); }).catch(function(){});
        });
      });
    });
  });
  return cadena;
}
let svSgSubirT = null;
function svSgProgramar(ms){ clearTimeout(svSgSubirT); svSgSubirT = setTimeout(svSgSubir, ms || 1500); }

/* ---------- tiempo real ---------- */
let svSgDejar = null;
const svSgEsperas = {};
function svSgEscuchar(){
  if (svSgDejar || !svSgSesion()) return;
  svCargar().then(function(x){
    if (svSgDejar || !svSgSesion()) return;
    svSgDejar = x.seguimientos.escuchar(function(tabla, cid, ev, fila){
      const k = svClaveDe(cid);
      if (coachActivo && k && tabla === 'seguimientos' && ev === 'INSERT' && new Date(svChISO(fila.creado) || 0).getTime() >= svSgDesde) {
        const s = svSgDatos(fila.datos), partes = [];
        if (s.peso && s.peso !== '—') partes.push(s.peso);
        if (s.e) partes.push('Entreno ' + s.e + '/10');
        if (s.n) partes.push('Nutrición ' + s.n + '/10');
        crearAviso(clavePro(coachActivo.u), 'seguimientos', ((clientesData[k] || {}).nombre || 'Un cliente') + ' ha enviado su seguimiento', partes.join(' · '), { cliente: k, vista: 'seguimientos' });
      }
      clearTimeout(svSgEsperas[cid]);
      svSgEsperas[cid] = setTimeout(function(){ delete svSgEsperas[cid]; svSgTraer([cid]); }, 700);
    });
  }).catch(function(){});
}
function svSgParar(){
  if (svSgDejar) { try { svSgDejar(); } catch(e){} svSgDejar = null; }
  Object.keys(svSgEsperas).forEach(function(c){ clearTimeout(svSgEsperas[c]); delete svSgEsperas[c]; });
  svSgYaCargado = false;
}

/* =========================================================
   ENGANCHES (solo en modo servidor)
   ========================================================= */
if (svActivo()) {
  /* las fotos que ya están en el servidor se descargan con la sesión de cada uno */
  sgFotoSrc = (function(orig){
    return function(im, id){
      if (typeof id === 'string' && id.indexOf('sv:') === 0) {
        svArchTraer(id.slice(3)).then(function(u){ im.src = u; }, function(){ im.alt = 'Foto no disponible'; im.classList.add('sv-arch-no'); });
        return;
      }
      return orig.apply(this, arguments);
    };
  })(sgFotoSrc);

  /* el cliente envía o corrige su seguimiento */
  guardarSeguimiento = (function(orig){
    return function(){
      if (!svSgSesion() || !svSgCliente()) return orig.apply(this, arguments);
      const k = clienteActual, l0 = (SEGUIMIENTOS[k] || [])[0];
      const editando = typeof sgEditando !== 'undefined' && sgEditando, previo = k ? sgDeEstaSemana(k) : null;
      // cuántas fotos llevará (las nuevas se guardan en el móvil un instante después)
      const nFotos = Object.keys(Object.assign({}, (typeof sgFotosPrevias !== 'undefined' && sgFotosPrevias) || {}, (typeof sgFotosNuevas !== 'undefined' && sgFotosNuevas) || {})).length;
      const r = orig.apply(this, arguments);
      const n0 = k && (SEGUIMIENTOS[k] || [])[0];
      if (!n0 || n0 === l0) return r;                                       // no se ha guardado nada
      if (editando && previo && previo.sid && n0.fecha === previo.fecha) {
        n0.sid = previo.sid; n0.svDia = previo.svDia;
        n0.svSube = previo.svSube === 'enviar' ? 'enviar' : 'corregir';
      } else {
        n0.sid = svChId(); n0.svSube = 'enviar'; n0.svDia = mjISO(new Date());
      }
      if (nFotos) { n0.svFotosN = nFotos; n0.svFotosT = Date.now(); }
      try { guardarTodo(); } catch(e){}
      svSgProgramar(300);
      return r;
    };
  })(guardarSeguimiento);

  /* todo lo demás (revisar, deshacer, visto, historial) se sube al guardar */
  guardarTodo = (function(orig){
    return function(){
      const r = orig.apply(this, arguments);
      if (svSgSesion() && svSgYaCargado) svSgProgramar(1500);
      return r;
    };
  })(guardarTodo);

  window.addEventListener('fsd:lista-servidor', function(){ svSgTraer(null).then(svSgSubir); svSgEscuchar(); });
  window.addEventListener('fsd:cliente-dentro', function(){
    const d = clienteActual && clientesData[clienteActual];
    if (d && d.sid) svSgTraer([d.sid]).then(svSgSubir);
    svSgEscuchar();
  });
  window.addEventListener('fsd:sesion-fuera', function(){ svSgParar(); clearTimeout(svSgSubirT); });
  window.addEventListener('online', function(){
    if (!svSgSesion()) return;
    const d = clienteActual && clientesData[clienteActual];
    svSgSubir().then(function(){ return svSgTraer(svSgCliente() ? [d && d.sid] : null); });
  });
  setInterval(function(){ if (svSgSesion()) svSgSubir(); }, 15000);
  window.addEventListener('fsd:al-volver', function(){
    if (!svSgSesion()) return;
    const d = clienteActual && clientesData[clienteActual];
    svSgSubir().then(function(){ return svSgTraer(svSgCliente() ? [d && d.sid] : null); });
  });
}
