/* =========================================================
   Fitnessindramas — Entreno del cliente en el gimnasio (25/10/2026, tarea #182)
   · Peso de la semana pasada ya escrito en cada serie (en gris): con ✓ se confirma, con − / + se ajusta.
   · Temporizador de descanso al marcar una serie: 60 / 90 / 120 / 180 s, ±15 s, vibra y suena al terminar.
   · La pantalla no se apaga mientras el cliente está en Entrenamiento con la app delante.
   (El vídeo de ejemplo ya sale arriba de cada ejercicio cuando Domingo lo añade.)
   ========================================================= */

/* ---------- 1 · peso de la semana pasada en cada serie ---------- */
enPintarFilas = (function(orig){
  return function(it){
    try {
      if (!isCoachView()) {
        const d = clienteActual && clientesData[clienteActual];
        const hist = d && d.registro && d.registro.ej && d.registro.ej[enNombreEj(it)];
        const ult = hist && hist.length ? hist[hist.length - 1].s : null;
        if (ult && ult.length) enPesos(it).forEach(function(p, i){
          if (mjNum(p.dataset.prev) > 0) return;
          const s = ult[Math.min(i, ult.length - 1)];
          if (s && s[0] > 0) p.dataset.prev = fmtNum(s[0]);
        });
      }
    } catch(e){}
    return orig.apply(this, arguments);
  };
})(enPintarFilas);

/* ---------- 2 · temporizador de descanso ---------- */
const DS_KEY = 'fsd_descanso', DS_OPC = [60, 90, 120, 180];
let dsFin = 0, dsTot = 90, dsInt = null;
function dsPref(){ try { const v = +localStorage.getItem(DS_KEY); return DS_OPC.indexOf(v) > -1 ? v : 90; } catch(e){ return 90; } }
function dsFmt(s){ s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
function dsBarra(){
  let b = document.getElementById('dsBar');
  if (!b) {
    b = document.createElement('div'); b.id = 'dsBar'; b.className = 'ds-bar'; b.setAttribute('role', 'timer'); b.setAttribute('aria-live', 'off');
    b.innerHTML = '<div class="ds-prog"><i></i></div><div class="ds-fila">'
      + '<button type="button" class="ds-b" data-ds="-15" aria-label="Quitar 15 segundos">−15</button>'
      + '<div class="ds-c"><small>Descanso</small><b class="ds-t">1:30</b></div>'
      + '<button type="button" class="ds-b" data-ds="15" aria-label="Añadir 15 segundos">+15</button>'
      + '<button type="button" class="ds-b ds-x" data-ds="x" aria-label="Terminar el descanso">Saltar</button></div>'
      + '<div class="ds-opc" role="radiogroup" aria-label="Descanso por defecto">' + DS_OPC.map(function(v){ return '<button type="button" role="radio" data-ds-def="' + v + '">' + dsFmt(v) + '</button>'; }).join('') + '</div>';
    b.addEventListener('click', function(e){
      const x = e.target.closest('[data-ds]'), d = e.target.closest('[data-ds-def]');
      if (x) { if (x.dataset.ds === 'x') dsParar(); else { dsFin += (+x.dataset.ds) * 1000; dsTot = Math.max(dsTot, (dsFin - Date.now()) / 1000); dsTick(); } }
      if (d) { try { localStorage.setItem(DS_KEY, d.dataset.dsDef); } catch(err){} dsEmpezar(+d.dataset.dsDef); }
    });
    (document.getElementById('screenRoot') || document.body).appendChild(b);
  }
  Array.prototype.forEach.call(b.querySelectorAll('[data-ds-def]'), function(x){ const on = +x.dataset.dsDef === dsPref(); x.classList.toggle('on', on); x.setAttribute('aria-checked', String(on)); });
  return b;
}
function dsEmpezar(seg){
  dsTot = seg || dsPref(); dsFin = Date.now() + dsTot * 1000;
  const b = dsBarra(); b.classList.remove('fin'); b.hidden = false;
  clearInterval(dsInt); dsInt = setInterval(dsTick, 250); dsTick();
}
function dsTick(){
  const b = document.getElementById('dsBar'); if (!b) return;
  const q = (dsFin - Date.now()) / 1000;
  b.querySelector('.ds-t').textContent = dsFmt(q);
  b.querySelector('.ds-prog i').style.width = Math.max(0, Math.min(100, q / dsTot * 100)) + '%';
  if (q <= 0) {
    clearInterval(dsInt); dsInt = null;
    b.classList.add('fin'); b.querySelector('.ds-t').textContent = '¡A por la siguiente!';
    try { if (navigator.vibrate) navigator.vibrate([250, 120, 250]); } catch(e){}
    try { if (typeof sndSonar === 'function') sndSonar('campanita'); } catch(e){}
    setTimeout(function(){ if (!dsInt) dsParar(); }, 4000);
  }
}
function dsParar(){ clearInterval(dsInt); dsInt = null; const b = document.getElementById('dsBar'); if (b) b.hidden = true; }
/* al marcar una serie como hecha (no al desmarcarla) empieza el descanso */
document.addEventListener('click', function(e){
  const b = e.target.closest && e.target.closest('#sesionesCont .srf [data-a="ok"]');
  if (!b || isCoachView() || b.disabled) return;
  const it = b.closest('.ex-item'), i = +b.closest('.srf').dataset.i;
  setTimeout(function(){
    const p = enPesos(it)[i]; if (!p || p.dataset.ok !== '1') return;
    /* la última serie de la sesión no lleva descanso */
    const ses = it.closest('.sesion-card'), todas = ses ? Array.prototype.slice.call(ses.querySelectorAll('.ex-item')) : [it];
    const quedan = todas.some(function(x){ return enPesos(x).some(function(q){ return q.dataset.ok !== '1'; }); });
    if (quedan) dsEmpezar(); else dsParar();
  }, 0);
}, true);
/* fuera de Entrenamiento no se ve (sigue contando por si vuelve) */
function dsVisibilidad(){
  const b = document.getElementById('dsBar'); if (!b) return;
  const aqui = typeof vistaActual !== 'undefined' && vistaActual === 'entreno' && !isCoachView() && document.getElementById('app').style.display !== 'none';
  b.classList.toggle('ds-fuera', !aqui);
}
setInterval(dsVisibilidad, 400);

/* ---------- 3 · pantalla encendida durante el entreno ---------- */
let dsLock = null;
function dsQuierePantalla(){
  return typeof vistaActual !== 'undefined' && vistaActual === 'entreno' && !isCoachView()
    && document.getElementById('app').style.display !== 'none' && document.visibilityState === 'visible';
}
function dsPantalla(){
  if (!('wakeLock' in navigator)) return;
  if (dsQuierePantalla()) {
    if (!dsLock) navigator.wakeLock.request('screen').then(function(l){ dsLock = l; l.addEventListener('release', function(){ dsLock = null; }); }).catch(function(){});
  } else if (dsLock) { try { dsLock.release(); } catch(e){} dsLock = null; }
}
setInterval(dsPantalla, 1500);
document.addEventListener('visibilitychange', dsPantalla);
