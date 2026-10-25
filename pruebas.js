/* =========================================================
   Fitnessindramas — Modo pruebas (22/10/2026)
   Temporal, solo en el dispositivo donde se activa (se guarda en este navegador, no en la app):
   · entra como Domingo o Fátima sin pedir contraseña
   · botón flotante para cambiar de profesional sin cerrar sesión
   · no se cierra la sesión por inactividad
   Se activa abriendo la app con  …/index.html#pruebas  y se apaga con  #pruebas-off
   ========================================================= */
const PB_KEY = 'fsd_pruebas';
function pbActivo(){ try { return localStorage.getItem(PB_KEY) === '1'; } catch(e){ return false; } }
(function(){
  const h = (location.hash || '').toLowerCase();
  if (h !== '#pruebas' && h !== '#pruebas-off') return;
  try { if (h === '#pruebas') localStorage.setItem(PB_KEY, '1'); else localStorage.removeItem(PB_KEY); } catch(e){}
  try { history.replaceState(null, '', location.pathname + location.search); } catch(e){}
  window.addEventListener('load', function(){ setTimeout(function(){ try { toast(h === '#pruebas' ? 'Modo pruebas activado en este dispositivo' : 'Modo pruebas desactivado'); } catch(e){} }, 600); });
})();

/* sin contraseña */
pedirPassPro = (function(orig){
  return function(usuario){ if (pbActivo()) { entrarComo(usuario); return; } return orig.apply(this, arguments); };
})(pedirPassPro);

/* cambiar de profesional */
function pbCambiar(){
  if (!coachActivo) return;
  const otro = COACHES.filter(function(x){ return norm(x.u) !== norm(coachActivo.u); })[0];
  if (!otro) return;
  try {
    if (coachEditing) {                                    // se guarda tal cual, sin notificar al cliente
      try { guardarPlan(); } catch(e){}
      coachEditing = false;
      const app = document.getElementById('app'); if (app) app.classList.remove('coach-edit');
    }
    try { guardarTodo(); } catch(e){}
    document.querySelectorAll('.fsd-overlay.show, .picker-overlay.show, #exPicker.show, #foodPicker.show').forEach(function(o){ o.classList.remove('show'); });
    if (pantallaVisible() === 'app' && isCoachView()) { try { backToCliente(); } catch(e){} }
  } catch(e){}
  entrarComo(otro.u);
  pbPintar();
}
function pbPintar(){
  let b = document.getElementById('pbBtn');
  const ver = pbActivo() && coachActivo && pantallaVisible() !== 'view-splash';
  if (!ver) { if (b) b.style.display = 'none'; return; }
  if (!b) {
    b = document.createElement('button'); b.type = 'button'; b.id = 'pbBtn'; b.className = 'pb-btn';
    b.addEventListener('click', pbCambiar);
    (document.getElementById('screenRoot') || document.body).appendChild(b);
  }
  const otro = COACHES.filter(function(x){ return norm(x.u) !== norm(coachActivo.u); })[0];
  const txt = '🧪 ' + coachActivo.u + ' → ' + (otro ? otro.u : '');
  if (b.textContent !== txt) b.textContent = txt;
  b.setAttribute('aria-label', 'Modo pruebas: cambiar a ' + (otro ? otro.u : ''));
  b.style.display = '';
}
setInterval(function(){
  if (pbActivo() && coachActivo) prUltimaActividad = Date.now();   // sin cierre por inactividad
  pbPintar();
}, 500);

/* =========================================================
   25/10/2026 · Acceso directo sin contraseña desde la app instalada
   En el diálogo de contraseña: «Entrar sin contraseña en este dispositivo». Se activa SOLO tras
   escribir la contraseña correcta una vez; queda guardado solo en ese móvil u ordenador.
   En la portada se ve «🧪 Sin contraseña en este dispositivo · Quitar».
   ========================================================= */
function pbCasilla(){
  const err = document.getElementById('proPassErr'); if (!err) return null;
  let c = document.getElementById('pbRecordarFila');
  if (!c) {
    c = document.createElement('label'); c.id = 'pbRecordarFila'; c.className = 'pb-recordar';
    c.innerHTML = '<input type="checkbox" id="pbRecordar"> <span>Entrar sin contraseña en este dispositivo<small>Solo en este móvil u ordenador. Se puede quitar desde la portada.</small></span>';
    err.parentNode.insertBefore(c, err);
  }
  return document.getElementById('pbRecordar');
}
pedirPassPro = (function(orig){
  return function(){ const r = orig.apply(this, arguments); const cb = pbCasilla(); if (cb) cb.checked = false; return r; };
})(pedirPassPro);
entrarComo = (function(orig){
  return function(){
    const cb = document.getElementById('pbRecordar');
    if (cb && cb.checked) {
      cb.checked = false;
      try { localStorage.setItem(PB_KEY, '1'); } catch(e){}
      setTimeout(function(){ try { toast('Listo: en este dispositivo ya no te pedirá la contraseña'); } catch(e){} }, 400);
    }
    return orig.apply(this, arguments);
  };
})(entrarComo);
function pbQuitar(){
  try { localStorage.removeItem(PB_KEY); } catch(e){}
  pbMarca(); try { toast('Vuelve a pedir la contraseña en este dispositivo'); } catch(e){}
}
function pbMarca(){
  const lbl = document.querySelector('#view-splash .pro-quick-lbl'); if (!lbl) return;
  let m = document.getElementById('pbMarca');
  if (!pbActivo()) { if (m) m.remove(); return; }
  if (!m) {
    m = document.createElement('div'); m.id = 'pbMarca'; m.className = 'pb-marca';
    m.innerHTML = '🧪 Sin contraseña en este dispositivo · <a href="#" class="lnk" onclick="pbQuitar();return false;">Quitar</a>';
    lbl.insertAdjacentElement('afterend', m);
  }
}
setInterval(pbMarca, 1000);
window.addEventListener('load', pbMarca);
