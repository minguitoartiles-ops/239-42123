/* =========================================================
   Fitnessindramas — Modo servidor (2/11/2026)
   Conecta el acceso de profesionales con Supabase. De momento solo con el servidor de pruebas.
   Se activa abriendo la app con  ?servidor=pruebas  y se apaga con  ?servidor=no
   (se recuerda en este dispositivo). Sin activarlo, la app funciona exactamente igual que antes.

   En modo servidor:
   · Domingo y Fátima entran con el correo y la contraseña de su cuenta de Supabase
   · el papel (entrenador o dietista) lo dice el servidor, no el botón que se pulse
   · no existe «entrar sin contraseña en este dispositivo» ni el cambio rápido de profesional
   · al cerrar sesión (también el cierre automático por inactividad) se cierra en el servidor
   · cada vez que se abre la app hay que volver a entrar
   Los clientes, planes y chats siguen guardados en este dispositivo: se conectarán en los siguientes pasos.
   ========================================================= */
const SV_KEY = 'fsd_servidor';
const SV_ENTORNOS = ['pruebas'];

(function(){
  const q = new URLSearchParams(location.search).get('servidor');
  if (q === null) return;
  try { if (SV_ENTORNOS.indexOf(q) > -1) localStorage.setItem(SV_KEY, q); else localStorage.removeItem(SV_KEY); } catch(e){}
  try { const u = new URL(location.href); u.searchParams.delete('servidor'); history.replaceState(null, '', u.pathname + u.search + u.hash); } catch(e){}
  window.addEventListener('load', function(){ setTimeout(function(){
    try { toast(svActivo() ? 'Modo servidor de pruebas activado en este dispositivo' : 'Modo servidor desactivado'); } catch(e){}
  }, 600); });
})();

function svEntorno(){ try { const v = localStorage.getItem(SV_KEY); return SV_ENTORNOS.indexOf(v) > -1 ? v : null; } catch(e){ return null; } }
function svActivo(){ return !!svEntorno(); }

/* ---------- carga del módulo de Supabase (solo en modo servidor) ---------- */
let svListo = null;
function svCargar(){
  if (!svActivo()) return Promise.reject(new Error('modo servidor apagado'));
  if (svListo) return svListo;
  window.FSD_SERVIDOR = svEntorno();
  svListo = new Promise(function(ok, mal){
    if (window.fsdDatos) { ok(window.fsdDatos); return; }
    window.addEventListener('fsd:servidor-listo', function(){ ok(window.fsdDatos); }, { once: true });
    import('./backend.js').catch(function(e){ svListo = null; mal(e); });
  });
  return svListo;
}

/* ---------- marca visible: así nunca hay duda de en qué modo se está ---------- */
function svMarca(){
  let m = document.getElementById('svMarca');
  if (!svActivo()) { if (m) m.remove(); return; }
  if (!m) {
    m = document.createElement('div');
    m.id = 'svMarca'; m.className = 'sv-marca'; m.setAttribute('role', 'status');
    m.textContent = 'Servidor de pruebas';
    document.body.appendChild(m);
  }
  document.documentElement.classList.add('fsd-servidor');
}

/* ---------- acceso de profesionales ---------- */
let svPermitirEntrada = false;   // solo se entra al panel tras una comprobación real en el servidor

function svDialogo(){
  document.getElementById('proPassTit').textContent = 'Entrar · Servidor de pruebas';
  let fila = document.getElementById('svEmailFila');
  if (!fila) {
    const pass = document.getElementById('proPassInput').closest('.field');
    fila = document.createElement('div');
    fila.className = 'field'; fila.id = 'svEmailFila';
    fila.innerHTML = '<label for="svEmail">Correo</label>'
      + '<input type="email" id="svEmail" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="email">';
    pass.parentNode.insertBefore(fila, pass);
  }
  const rec = document.getElementById('pbRecordarFila'); if (rec) rec.hidden = true;
  const cb = document.getElementById('pbRecordar'); if (cb) cb.checked = false;
}

pedirPassPro = (function(orig){
  return function(usuario){
    if (!svActivo()) return orig.apply(this, arguments);
    // Se abre el diálogo directamente, sin pasar por las versiones anteriores
    // (así el «entrar sin contraseña» del modo pruebas no puede saltárselo)
    proPendiente = usuario;
    document.getElementById('proPassInput').value = '';
    document.getElementById('proPassErr').textContent = '';
    svDialogo();
    document.getElementById('proPass').classList.add('show');
    const e = document.getElementById('svEmail');
    if (e) setTimeout(function(){ try { e.focus(); } catch(_){} }, 80);
    svCargar().catch(function(){});           // va cargando la conexión mientras escribe
  };
})(pedirPassPro);

confirmarPassPro = (function(orig){
  return function(){
    if (!svActivo()) return orig.apply(this, arguments);
    const err = document.getElementById('proPassErr');
    const email = (document.getElementById('svEmail') || {}).value || '';
    const pass = document.getElementById('proPassInput').value;
    const btn = document.querySelector('#proPass button[type="submit"]');
    if (!email.trim() || !pass) { err.textContent = 'Escribe tu correo y tu contraseña.'; return; }
    err.textContent = '';
    if (btn) { btn.disabled = true; btn.textContent = 'Entrando…'; }
    svCargar()
      .then(function(d){ return d.auth.entrar(email, pass); })
      .then(function(p){
        const c = COACHES.filter(function(x){ return x.rol === p.rol; })[0];
        if (!c) throw new Error('Papel desconocido');
        document.getElementById('proPassInput').value = '';
        cerrarPassPro();
        svPermitirEntrada = true;
        try { entrarComo(c.u); } finally { svPermitirEntrada = false; }
        try { toast('Has entrado como ' + p.nombre + ' (servidor de pruebas)'); } catch(e){}
      })
      .catch(function(e){
        err.textContent = (window.fsdDatos && fsdDatos.esErrorAcceso(e)) ? e.message
          : 'No se ha podido conectar con el servidor. Comprueba internet y vuelve a probar.';
        const i = document.getElementById('proPassInput'); try { i.select(); } catch(_){}
      })
      .finally(function(){ if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; } });
  };
})(confirmarPassPro);

/* Nadie entra al panel en modo servidor sin haber pasado por el servidor */
entrarComo = (function(orig){
  return function(){
    if (svActivo() && !svPermitirEntrada) { try { toast('En modo servidor hay que entrar con correo y contraseña'); } catch(e){} return; }
    return orig.apply(this, arguments);
  };
})(entrarComo);

if (typeof pbCambiar === 'function') {
  pbCambiar = (function(orig){
    return function(){
      if (svActivo()) { try { toast('En modo servidor, cada profesional entra con su propia cuenta'); } catch(e){} return; }
      return orig.apply(this, arguments);
    };
  })(pbCambiar);
}

/* Cerrar sesión (a mano o por inactividad) también la cierra en el servidor */
coachLogout = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    if (svActivo() && window.fsdDatos) fsdDatos.auth.salir();
    return r;
  };
})(coachLogout);

/* Al abrir la app en modo servidor se empieza siempre sin sesión */
if (svActivo()) {
  svMarca();
  svCargar().then(function(d){ return d.auth.salir(); }).catch(function(){
    try { toast('No se ha podido conectar con el servidor de pruebas'); } catch(e){}
  });
}

(function(){
  const s = document.createElement('style');
  s.textContent = '.sv-marca{position:fixed;left:50%;top:max(6px,env(safe-area-inset-top));transform:translateX(-50%);z-index:9998;'
    + 'background:var(--warn,#b45309);color:#fff;font:600 11px/1 var(--font-ui,system-ui);letter-spacing:.02em;'
    + 'padding:5px 10px;border-radius:999px;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.2)}';
  document.head.appendChild(s);
})();
