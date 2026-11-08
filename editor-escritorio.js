/* =========================================================
   Fitnessindramas — Editor de rutinas en el ordenador, más simple (8/11/2026, pedido por Domingo)
   Se carga después de constructor.js. Solo cuando Domingo edita un entrenamiento en el ordenador
   (html.ru-compacto); en el móvil y en lo que ve el cliente no cambia nada.
   1 · Ejercicio en una fila: ⠿ · nombre · series × reps · RIR · ⌄ · ⋯
       - tocar cualquier parte libre de la fila (o ⌄) abre y cierra el detalle; solo uno abierto a la vez;
       - en ⋯: Cambiar ejercicio, Subir, Bajar, Duplicar y Quitar.
   2 · Día: nombre · ⌄ · ⋯ (Renombrar, Subir, Bajar, Duplicar, Borrar con confirmación).
   3 · Arriba: «Plan de Nombre» y una sola fila de herramientas; fuera «Vista detallada», la leyenda de colores
       (queda «¿Qué es el RIR?») y el «+ Añadir sesión» repetido de abajo.
   4 · Días en columnas solo si caben; si no, pasan a la fila de abajo (nada queda cortado).
   Lo que se añade aquí es solo de pantalla: no se guarda en el plan.
   ========================================================= */
ruCompactaPref = function(){ return true; };          // una sola vista: la nueva
function edOn(){ return document.documentElement.classList.contains('ru-compacto'); }
const ED_FALSO = { stopPropagation: function(){}, preventDefault: function(){} };

function edBoton(cls, txt, lbl){ const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = txt; b.setAttribute('aria-label', lbl); b.title = lbl; return b; }
function edDecorar(){
  const root = document.documentElement, on = edOn();
  root.classList.toggle('ed-v2', on);
  edTitulo(on);
  if (!on) { edCerrarMenu(); return; }
  const cont = document.getElementById('sesionesCont'); if (!cont) return;
  Array.prototype.forEach.call(cont.querySelectorAll('.sesion-card'), function(c){
    const acts = c.querySelector('.sesion-acts');
    if (acts && !acts.querySelector('.ed-mas-dia')) acts.insertBefore(edBoton('ed-mas ed-mas-dia', '⋯', 'Opciones del día'), acts.querySelector('.sesion-chevron'));
  });
  Array.prototype.forEach.call(cont.querySelectorAll('.ex-item'), function(it){
    let a = it.querySelector(':scope > .ed-acc');
    if (!a) {
      a = document.createElement('span'); a.className = 'ed-acc';
      const ch = document.createElement('span'); ch.className = 'ed-chev'; ch.setAttribute('aria-hidden', 'true'); ch.textContent = '⌄';
      a.appendChild(ch); a.appendChild(edBoton('ed-mas ed-mas-ej', '⋯', 'Opciones del ejercicio'));
      it.appendChild(a);
    }
    const nom = it.querySelector('.ex-name-cell'); if (nom) nom.setAttribute('aria-expanded', it.classList.contains('ru-foco') ? 'true' : 'false');
  });
}
/* «Tus sesiones» es el texto del cliente: a Domingo le sale «Plan de Nombre» */
function edTitulo(on){
  const v = document.getElementById('view-entreno'); if (!v) return;
  const t = v.querySelector('.view-top .h-title'), e = document.getElementById('entSemana'); if (!t) return;
  if (on) {
    if (t.dataset.edOrig == null) { t.dataset.edOrig = t.textContent; if (e) e.dataset.edOrig = e.textContent; }
    const d = clientesData[clienteActual] || {};
    t.textContent = 'Plan de ' + String(d.nombre || 'cliente').trim().split(/\s+/)[0];
    if (e) e.textContent = 'Entrenamiento';
  } else if (t.dataset.edOrig != null) {
    t.textContent = t.dataset.edOrig; delete t.dataset.edOrig;
    if (e && e.dataset.edOrig != null) { e.textContent = e.dataset.edOrig; delete e.dataset.edOrig; }
  }
}
ruPintarCompacta = (function(orig){ return function(){ const r = orig.apply(this, arguments); try { edDecorar(); } catch(e){} return r; }; })(ruPintarCompacta);
/* lo de pantalla no se guarda (ni cuenta para «Deshacer») */
ruLimpiarHtml = (function(orig){
  return function(h){
    const t = document.createElement('template'); t.innerHTML = orig.apply(this, arguments);
    t.content.querySelectorAll('.ed-acc, .ed-mas').forEach(function(x){ x.remove(); });
    return t.innerHTML;
  };
})(ruLimpiarHtml);

/* ---------- abrir y cerrar ejercicios: uno a la vez ---------- */
function edToggle(it){
  const abrir = !it.classList.contains('ru-foco');
  Array.prototype.forEach.call(document.querySelectorAll('#sesionesCont .ex-item.ru-foco'), function(x){ x.classList.remove('ru-foco'); });
  if (abrir) it.classList.add('ru-foco');
  ruPintarCompacta();
}
let edAbajo = null;
window.addEventListener('mousedown', function(e){ edAbajo = { x: e.clientX, y: e.clientY }; }, true);
const ED_LIBRE = 'input,select,textarea,a,[contenteditable="true"],.ru-ss,.ex-desc,.ex-video-row,.ex-link-btn,.en-tec-btn,.en-ej-btns,.en-pautas';
window.addEventListener('click', function(e){
  if (!edOn() || !e.target.closest) return;
  const t = e.target;
  if (t.closest('#edMenu')) return;
  const mas = t.closest('#sesionesCont .ed-mas');
  if (mas) { e.preventDefault(); e.stopPropagation(); edAbrirMenu(mas); return; }
  edCerrarMenu();
  const movido = edAbajo && Math.hypot(e.clientX - edAbajo.x, e.clientY - edAbajo.y) > 8;     // fue un arrastre
  const it = t.closest('#sesionesCont .ex-item'); if (!it || movido) return;
  if (t.closest('.ed-chev')) { e.preventDefault(); e.stopPropagation(); edToggle(it); return; }
  if (t.closest(ED_LIBRE)) return;
  if (t.closest('button') && !t.closest('.ex-table-row')) return;          // botones del detalle (añadir serie…)
  const cab = t.closest('.ex-table-row, .ru-res') || (t === it ? it : null);
  if (!cab) return;
  e.preventDefault(); e.stopPropagation();
  edToggle(it);
}, true);

/* ---------- menú ⋯ ---------- */
function edCerrarMenu(){ const m = document.getElementById('edMenu'); if (m) m.remove(); }
function edAbrirMenu(btn){
  const ya = document.getElementById('edMenu'); if (ya && ya.dataset.de === String(btn.dataset.edId || '')) { edCerrarMenu(); return; }
  edCerrarMenu();
  btn.dataset.edId = btn.dataset.edId || String(Date.now() + Math.random());
  const dia = btn.classList.contains('ed-mas-dia'), card = btn.closest('.sesion-card'), it = btn.closest('.ex-item');
  const fin = function(){ setTimeout(function(){ try { ruPintarCompacta(); } catch(e){} try { enUndoRegistrar && enUndoRegistrar(); } catch(e){} }, 0); };
  const ops = dia ? [
    ['✎ Renombrar', function(){ ruRenombrar(card); }],
    ['↑ Subir', function(){ enMoverSesion(ED_FALSO, btn, -1); fin(); }, !card.previousElementSibling || !card.previousElementSibling.classList.contains('sesion-card')],
    ['↓ Bajar', function(){ enMoverSesion(ED_FALSO, btn, 1); fin(); }, !card.nextElementSibling || !card.nextElementSibling.classList.contains('sesion-card')],
    ['⧉ Duplicar día', function(){ enDuplicarSesion(ED_FALSO, btn); fin(); }],
    ['🗑 Borrar día', function(){
      const n = ((card.querySelector('.sesion-title') || {}).textContent || 'este día').trim();
      abrirDialogo({ titulo: 'Borrar día', texto: '¿Borrar «' + n + '» con todos sus ejercicios?', ok: 'Borrar', peligro: true, onOk: function(){ removeSesion(ED_FALSO, btn); fin(); } });
    }, false, true]
  ] : [
    ['🔄 Cambiar ejercicio', function(){ const n = it.querySelector('.ex-name-cell'); if (n) openExercisePicker(n); }],
    ['↑ Subir', function(){ enMoverEj(btn, -1); fin(); }],
    ['↓ Bajar', function(){ enMoverEj(btn, 1); fin(); }],
    ['⧉ Duplicar', function(){ enDuplicarEj(btn); fin(); }],
    ['🗑 Quitar', function(){ enQuitarEj(btn); fin(); }, false, true]
  ];
  const m = document.createElement('div'); m.id = 'edMenu'; m.className = 'ed-menu'; m.setAttribute('role', 'menu'); m.dataset.de = btn.dataset.edId;
  ops.forEach(function(o){
    const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.textContent = o[0];
    if (o[2]) b.disabled = true; if (o[3]) b.className = 'peligro';
    b.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); edCerrarMenu(); o[1](); });
    m.appendChild(b);
  });
  document.body.appendChild(m);
  const r = btn.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px';
  m.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4) + 'px';
  const pri = m.querySelector('button:not([disabled])'); if (pri) pri.focus();
}
document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && document.getElementById('edMenu')) { e.stopPropagation(); edCerrarMenu(); } }, true);
document.addEventListener('scroll', edCerrarMenu, true);
window.addEventListener('resize', edCerrarMenu);
edDecorar();
