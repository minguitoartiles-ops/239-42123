/* =========================================================
   Fitnessindramas — Modo servidor · fotos de perfil (5/11/2026)
   Solo en modo servidor (?servidor=pruebas). Se carga después de servidor-seguimientos.js.

   · Antes, la foto de perfil se quedaba en el aparato de quien la ponía. Ahora se guarda en el
     servidor: la del cliente la ven él, Domingo y Fátima (chat, cabecera, lista de clientes…);
     las de Domingo y Fátima, también sus clientes en el chat.
   · Al poner o quitar la tuya en Ajustes se sube o se quita en el servidor y les llega a los demás
     al momento. Cada uno solo cambia la suya (lo comprueba el servidor).
   · Las fotos se descargan con la sesión de cada uno (sin enlaces) y se guardan solo en memoria.
   ========================================================= */
const SV_PF = { filas: null, url: {}, va: {} };     // filas: user_id → { user_id, cliente_id, ruta }
function svPfSesion(){ return typeof svChSesion === 'function' && svChSesion(); }

/* la fila de la foto de alguien: undefined si el servidor no ha dicho nada (se usa lo de este aparato) */
function svPfFila(quien){
  if (!SV_PF.filas || !quien) return undefined;
  if (quien.indexOf('cliente:') === 0) {
    const d = clientesData[quien.slice(8)]; if (!d || !d.sid) return undefined;
    const sid = String(d.sid).toLowerCase();
    const f = Object.keys(SV_PF.filas).map(function(u){ return SV_PF.filas[u]; }).filter(function(x){ return String(x.cliente_id || '').toLowerCase() === sid; })[0];
    return f || undefined;
  }
  const uid = typeof svChUidDe === 'function' ? svChUidDe(quien) : null;
  return (uid && SV_PF.filas[uid]) || undefined;
}
function svPfBajar(ruta){
  if (SV_PF.url[ruta] || SV_PF.va[ruta]) return;
  SV_PF.va[ruta] = svCargar().then(function(x){ return x.perfiles.descargar(ruta); }).then(function(b){
    const t = String(b.type || '').split(';')[0];
    SV_PF.url[ruta] = URL.createObjectURL(new Blob([b], { type: /^image\/(jpeg|png|webp)$/.test(t) ? t : 'image/jpeg' }));
    svPfRepintar();
  }).catch(function(){}).finally(function(){ delete SV_PF.va[ruta]; });
}

/* volver a pintar las fotos donde salgan */
let svPfT = null;
function svPfRepintar(){
  clearTimeout(svPfT);
  svPfT = setTimeout(function(){
    ['mtAv', 'chatAvPro'].forEach(function(id){ const e = document.getElementById(id); if (e) delete e.dataset.k; });
    try { pintarAvatares(); } catch(e){}
    try { if (typeof mtChatDe !== 'undefined' && mtChatDe && typeof mtPonerChat === 'function') mtPonerChat(mtChatDe); } catch(e){}
    try { const v = document.getElementById('view-coach-chats'); if (v && (v.classList.contains('active') || v.classList.contains('esc-izq'))) pintarChatsPro(); } catch(e){}
    try { if (typeof pantallaVisible === 'function' && pantallaVisible() === 'view-coach-planes' && typeof enPintarPlanes === 'function') enPintarPlanes(); } catch(e){}
    try { if (typeof refrescarAjustes === 'function') refrescarAjustes(); } catch(e){}
  }, 150);
}

/* traer y escuchar */
let svPfDejar = null, svPfTrayendo = null;
function svPfTraer(){
  if (!svPfSesion()) return Promise.resolve();
  if (svPfTrayendo) return svPfTrayendo;
  svPfTrayendo = svChPreparar().then(function(x){ return x.perfiles.lista(); }).then(function(l){
    const f = {};
    l.forEach(function(r){ if (r && r.user_id) f[r.user_id] = r; });
    SV_PF.filas = f;
    l.forEach(function(r){ if (r.ruta) svPfBajar(r.ruta); });
    svPfRepintar();
  }).catch(function(){}).finally(function(){ svPfTrayendo = null; });
  return svPfTrayendo;
}
function svPfEscuchar(){
  if (svPfDejar || !svPfSesion()) return;
  svCargar().then(function(x){
    if (svPfDejar || !svPfSesion()) return;
    svPfDejar = x.perfiles.escuchar(function(fila){
      SV_PF.filas = SV_PF.filas || {};
      SV_PF.filas[fila.user_id] = fila;
      if (fila.ruta) svPfBajar(fila.ruta);
      svPfRepintar();
    });
  }).catch(function(){});
}
function svPfParar(){
  if (svPfDejar) { try { svPfDejar(); } catch(e){} svPfDejar = null; }
  Object.keys(SV_PF.url).forEach(function(r){ try { URL.revokeObjectURL(SV_PF.url[r]); } catch(e){} });
  SV_PF.filas = null; SV_PF.url = {};
}

/* =========================================================
   ENGANCHES (solo en modo servidor)
   ========================================================= */
if (svActivo()) {
  /* la foto de alguien: la del servidor si la hay; si no, la de este aparato */
  fotoDe = (function(orig){
    return function(quien){
      if (!svPfSesion()) return orig.apply(this, arguments);
      const f = svPfFila(quien);
      if (f === undefined) return orig.apply(this, arguments);
      if (!f.ruta) return '';
      if (SV_PF.url[f.ruta]) return SV_PF.url[f.ruta];
      svPfBajar(f.ruta);
      return orig.apply(this, arguments) || '';            // mientras llega
    };
  })(fotoDe);

  /* poner o quitar la propia: también en el servidor */
  asignarFoto = (function(orig){
    return function(destino, dato){
      const r = orig.apply(this, arguments);
      if (!svPfSesion()) return r;
      // solo la propia: el profesional, la suya; el cliente (en su sesión), la suya
      const propia = coachActivo ? destino === coachActivo.u : (!!window.fsdSesionCliente && destino === 'cliente:' + clienteActual);
      if (!propia) return r;
      svCargar().then(function(x){
        if (!dato) return x.perfiles.quitar();
        const m = /^data:(image\/(?:jpeg|png|webp));base64,(.*)$/.exec(String(dato)); if (!m) return null;
        const bin = atob(m[2]), a = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
        const b = new Blob([a], { type: m[1] });
        return x.perfiles.poner(b).then(function(ruta){ SV_PF.url[ruta] = URL.createObjectURL(b); });
      }).then(svPfTraer).catch(function(e){
        try { toast(svMensaje(e, dato ? 'No se ha podido guardar la foto en el servidor' : 'No se ha podido quitar la foto en el servidor')); } catch(_){}
      });
      return r;
    };
  })(asignarFoto);

  window.addEventListener('fsd:lista-servidor', function(){ svPfTraer(); svPfEscuchar(); });
  window.addEventListener('fsd:cliente-dentro', function(){ svPfTraer(); svPfEscuchar(); });
  window.addEventListener('fsd:al-volver', function(){ if (svPfSesion()) svPfTraer(); });
  window.addEventListener('fsd:sesion-fuera', svPfParar);
}
