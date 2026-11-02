/* =========================================================
   Fitnessindramas — Modo servidor · arranque (2/11/2026)
   Se carga el PRIMERO de todos los scripts de la app (antes que almacen.js y app.js).

   1 · Decide, una sola vez al abrir, si la app está en modo servidor:
       ?servidor=pruebas lo activa en este dispositivo, ?servidor=no lo apaga.
       El modo no cambia mientras la app está abierta (así no se mezclan datos a medias).
   2 · En modo servidor, los datos de clientes que la app guarda en el dispositivo van a un
       cajón aparte («…__servidor_pruebas»). Los datos locales de siempre no se tocan ni se
       mezclan con los del servidor de pruebas, y al apagar el modo vuelven a aparecer tal cual.
   ========================================================= */
(function(){
  const CLAVE_MODO = 'fsd_servidor';
  const ENTORNOS = ['pruebas'];
  // Claves con datos de clientes (fichas, planes, chats, fotos, avisos, borradores, facturas)
  const CAJON = { fsd_datos_v1: 1, fsd_fotos: 1, fsd_avisos: 1, fsd_borradores: 1,
                  fsd_facturacion: 1, fsd_mt_chat: 1, fsd_equipo_cliente: 1 };
  const BASES_IDB = { fsd_archivos: 1 };

  let cambio = null;
  try {
    const q = new URLSearchParams(location.search).get('servidor');
    if (q !== null) {
      if (ENTORNOS.indexOf(q) > -1) localStorage.setItem(CLAVE_MODO, q); else localStorage.removeItem(CLAVE_MODO);
      cambio = ENTORNOS.indexOf(q) > -1 ? 'on' : 'off';
      const u = new URL(location.href); u.searchParams.delete('servidor');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    }
  } catch(e){}

  let entorno = null;
  try { const v = localStorage.getItem(CLAVE_MODO); entorno = ENTORNOS.indexOf(v) > -1 ? v : null; } catch(e){}

  Object.defineProperty(window, 'FSD_MODO_SERVIDOR', { value: entorno, writable: false, configurable: false });
  Object.defineProperty(window, 'FSD_MODO_CAMBIO', { value: cambio, writable: false, configurable: false });
  if (!entorno) return;

  const sufijo = '__servidor_' + entorno;
  const S = Storage.prototype;
  const get = S.getItem, set = S.setItem, rem = S.removeItem;
  const mapa = function(k){ return (typeof k === 'string' && CAJON[k]) ? k + sufijo : k; };
  S.getItem = function(k){ return get.call(this, mapa(k)); };
  S.setItem = function(k, v){ return set.call(this, mapa(k), v); };
  S.removeItem = function(k){ return rem.call(this, mapa(k)); };

  if (typeof IDBFactory !== 'undefined') {
    const abrir = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function(nombre){
      const a = Array.prototype.slice.call(arguments);
      if (typeof nombre === 'string' && BASES_IDB[nombre]) a[0] = nombre + sufijo;
      return abrir.apply(this, a);
    };
  }
})();
