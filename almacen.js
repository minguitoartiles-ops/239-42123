/* =========================================================
   Fitnessindramas — Almacenamiento comprimido (21/10/2026)
   Los datos de la app (clientes, planes, seguimientos y chats) se guardan comprimidos
   en el dispositivo (lz-string), así caben muchos más clientes en los ~5 MB del navegador.
   Es transparente: el resto de la app sigue leyendo y escribiendo como siempre.
   Se carga antes que app.js (después de lz-string.min.js).
   ========================================================= */
(function(){
  if (typeof LZString === 'undefined' || typeof Storage === 'undefined') return;
  const CLAVES = { fsd_datos_v1: 1 };
  const MARCA = 'LZ1:', MARCA2 = 'LZ2:';
  const get = Storage.prototype.getItem, set = Storage.prototype.setItem;
  // cada plan (entreno, nutrición, chat) se comprime por separado y se recuerda: al guardar
  // solo se vuelve a comprimir lo que ha cambiado (guardar es rápido aunque haya muchos clientes)
  let memoC = new Map();
  const memoD = new Map();
  function comp(str, usados){
    let c = memoC.get(str);
    if (c == null) { c = LZString.compressToUTF16(str); memoD.set(c, str); }
    usados.set(str, c);
    return c;
  }
  function desc(c){ let s = memoD.get(c); if (s == null) { s = LZString.decompressFromUTF16(c); memoD.set(c, s); memoC.set(s, c); } return s; }
  let cacheRaw = null, cacheVal = null;
  function abrir(raw){
    if (typeof raw !== 'string') return raw;
    if (raw === cacheRaw) return cacheVal;
    let v = raw;
    try {
      if (raw.indexOf(MARCA2) === 0) {
        const o = JSON.parse(raw.slice(MARCA2.length));
        if (o && o.planes) Object.keys(o.planes).forEach(function(k){ const p = o.planes[k]; if (p) Object.keys(p).forEach(function(f){ if (p[f] && typeof p[f] === 'object' && typeof p[f].__z === 'string') p[f] = desc(p[f].__z); }); });
        v = JSON.stringify(o);
      } else if (raw.indexOf(MARCA) === 0) v = LZString.decompressFromUTF16(raw.slice(MARCA.length));
      else return raw;
    } catch(e){ v = null; }
    cacheRaw = raw; cacheVal = v;
    return v;
  }
  Storage.prototype.getItem = function(k){
    const raw = get.call(this, k);
    return CLAVES[k] ? abrir(raw) : raw;
  };
  Storage.prototype.setItem = function(k, v){
    if (CLAVES[k] && typeof v === 'string' && v.length > 2000) {
      let c = null;
      try {
        const o = JSON.parse(v), usados = new Map();
        if (o && o.planes) Object.keys(o.planes).forEach(function(kk){ const p = o.planes[kk]; if (p) Object.keys(p).forEach(function(f){ if (typeof p[f] === 'string' && p[f].length > 1500) p[f] = { __z: comp(p[f], usados) }; }); });
        c = MARCA2 + JSON.stringify(o);
        memoC = usados;                         // se olvida lo que ya no está guardado
      } catch(e){ c = MARCA + LZString.compressToUTF16(v); }
      set.call(this, k, c);                     // si la memoria está llena, el error llega a quien guarda
      cacheRaw = c; cacheVal = v;
      return;
    }
    set.call(this, k, v);
  };
  window.fsdCrudo = function(k){ try { return get.call(localStorage, k); } catch(e){ return null; } };
  // tamaño real ocupado (comprimido), para el medidor de Ajustes
  window.fsdTamGuardado = function(){
    let t = 0;
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); t += k.length + (get.call(localStorage, k) || '').length; } } catch(e){}
    return t;
  };
  // otras pestañas: el evento «storage» trae el valor comprimido; se entrega ya descomprimido
  const add = window.addEventListener;
  window.addEventListener = function(tipo, fn, op){
    if (tipo === 'storage' && typeof fn === 'function') {
      const orig = fn;
      fn = function(e){
        if (!e || !CLAVES[e.key]) return orig.call(this, e);
        return orig.call(this, { key: e.key, newValue: abrir(e.newValue), oldValue: abrir(e.oldValue), storageArea: e.storageArea, url: e.url, type: 'storage' });
      };
    }
    return add.call(this, tipo, fn, op);
  };
})();
