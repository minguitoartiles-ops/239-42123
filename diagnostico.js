/* =========================================================
   9/11/2026 · Diagnóstico de pantalla (para la barra inferior recortada en Android, avisado por Domingo).
   Tocar 5 veces seguidas la pestaña «Ajustes» abre un cuadro con las medidas que da el navegador: tamaño de la
   ventana y de la pantalla, los huecos del sistema (barra de estado y de navegación), si la app está instalada y
   dónde acaba la barra inferior. No guarda ni envía nada: solo se ve en pantalla para hacer una captura.
   ========================================================= */
(function(){
  let toques = [];
  function medirEnv(valor){
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;padding-bottom:' + valor;
    document.body.appendChild(p);
    const v = getComputedStyle(p).paddingBottom;
    p.remove();
    return v;
  }
  function medirAlto(unidad){
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;left:0;top:0;width:0;visibility:hidden;pointer-events:none;height:100' + unidad;
    document.body.appendChild(p);
    const v = Math.round(p.getBoundingClientRect().height);
    p.remove();
    return v;
  }
  function rect(sel){ const e = document.querySelector(sel); if (!e) return '—'; const r = e.getBoundingClientRect(); return Math.round(r.top) + ' → ' + Math.round(r.bottom) + ' (alto ' + Math.round(r.height) + ')'; }
  function datos(){
    const vv = window.visualViewport;
    const modo = ['fullscreen', 'standalone', 'minimal-ui', 'browser'].filter(function(m){ return matchMedia('(display-mode: ' + m + ')').matches; })[0] || '?';
    return [
      ['Versión', (typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?')],
      ['Modo', modo],
      ['Ventana (innerWidth × innerHeight)', innerWidth + ' × ' + innerHeight],
      ['Documento (clientHeight)', document.documentElement.clientHeight],
      ['Vista visible (visualViewport)', vv ? Math.round(vv.width) + ' × ' + Math.round(vv.height) + ' · arriba ' + Math.round(vv.offsetTop) : '—'],
      ['Pantalla (screen)', screen.width + ' × ' + screen.height],
      ['Pantalla disponible (availWidth × availHeight)', screen.availWidth + ' × ' + screen.availHeight],
      ['Píxeles por punto', window.devicePixelRatio],
      ['100vh / 100dvh / 100svh / 100lvh', [medirAlto('vh'), medirAlto('dvh'), medirAlto('svh'), medirAlto('lvh')].join(' / ')],
      ['Hueco arriba (safe-area-inset-top)', medirEnv('env(safe-area-inset-top, -1px)')],
      ['Hueco abajo (safe-area-inset-bottom)', medirEnv('env(safe-area-inset-bottom, -1px)')],
      ['Hueco abajo máx. (safe-area-max-inset-bottom)', medirEnv('env(safe-area-max-inset-bottom, -1px)')],
      ['Barra inferior (arriba → abajo)', rect('nav.tb')],
      ['Relleno inferior de la barra', (function(){ const e = document.querySelector('nav.tb'); return e ? getComputedStyle(e).paddingBottom : '—'; })()],
      ['Teléfono (.phone)', rect('.phone')],
      ['Navegador', navigator.userAgent],
    ];
  }
  function abrir(){
    let o = document.getElementById('diagPantalla');
    if (o) o.remove();
    o = document.createElement('div');
    o.id = 'diagPantalla';
    o.setAttribute('role', 'dialog');
    o.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.55);display:flex;align-items:flex-start;justify-content:center;padding:max(16px, env(safe-area-inset-top)) 12px 12px;overflow:auto;';
    const filas = datos().map(function(f){ return '<tr><td style="padding:4px 8px 4px 0;color:#5b6573;vertical-align:top">' + fsdEsc(f[0]) + '</td><td style="padding:4px 0;font-weight:600;word-break:break-word">' + fsdEsc(String(f[1])) + '</td></tr>'; }).join('');
    o.innerHTML = '<div style="background:#fff;color:#12151a;border-radius:14px;padding:14px 16px;max-width:520px;width:100%;font:13px/1.35 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.3)">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b style="font-size:15px">Diagnóstico de pantalla</b>'
      + '<button type="button" id="diagCerrar" style="border:0;background:#eef1f5;border-radius:8px;padding:6px 12px;font:600 13px system-ui">Cerrar</button></div>'
      + '<p style="margin:0 0 8px;color:#5b6573">Haz una captura de esta pantalla y envíasela a Claude.</p>'
      + '<table style="border-collapse:collapse;width:100%">' + filas + '</table></div>';
    document.body.appendChild(o);
    document.getElementById('diagCerrar').onclick = function(){ o.remove(); };
  }
  document.addEventListener('click', function(e){
    const t = e.target && e.target.closest && e.target.closest('#tab-ajustes');
    if (!t) return;
    const ahora = Date.now();
    toques = toques.filter(function(x){ return ahora - x < 3000; });
    toques.push(ahora);
    if (toques.length >= 5) { toques = []; abrir(); }
  }, true);
  window.fsdDiagnosticoPantalla = abrir;      // para las pruebas
})();
