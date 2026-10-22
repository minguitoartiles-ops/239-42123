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
