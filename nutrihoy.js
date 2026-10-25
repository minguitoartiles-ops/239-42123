/* =========================================================
   Fitnessindramas — Nutrición del cliente: el día de un vistazo (25/10/2026, tarea #183)
   Arriba de su plan, una tarjeta «Hoy» con:
   · anillo de calorías tomadas (según las comidas que marca con ✓) y anillos de proteína, carbos y grasa con emoji
   · hidratación: vasos de agua del día (objetivo según su peso, unos 35 ml por kg)
   · «Ahora toca»: la comida de esta hora, que ya sale abierta y marcada en el plan; tocarla lleva a ella
   ========================================================= */
function nhHoy(){ const d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function nhKcal(b){ return (+b.dataset.mp || 0) * 4 + (+b.dataset.mc || 0) * 4 + (+b.dataset.mf || 0) * 9; }
function nhAguaObj(k){
  let peso = null;
  try { const s = grSerie(k, 'peso'); if (s.length) peso = s[s.length - 1].v; } catch(e){}
  if (!peso) return 8;
  return Math.max(6, Math.min(14, Math.round(peso * 35 / 250)));
}
function nhAgua(k){
  const d = clientesData[k]; if (!d) return 0;
  return d.agua && d.agua.fecha === nhHoy() ? d.agua.n : 0;
}
function nhPonerAgua(n){
  const k = clienteActual, d = clientesData[k]; if (!d || isCoachView()) return;
  const obj = nhAguaObj(k);
  n = Math.max(0, Math.min(obj + 6, n));
  d.agua = { fecha: nhHoy(), n: n };
  try { guardarTodo(); } catch(e){}
  if (n === obj && navigator.vibrate) try { navigator.vibrate(30); } catch(e){}
  nhPintar();
}
function nhAnillo(pct, color, r, grosor, centro, cls){
  const C = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct || 0));
  return '<div class="nh-anillo ' + (cls || '') + '"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="' + r + '" fill="none" stroke="var(--wash-med)" stroke-width="' + grosor + '"/>'
    + '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + grosor + '" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - p)).toFixed(1) + '" transform="rotate(-90 50 50)"/></svg>'
    + '<div class="nh-c">' + centro + '</div></div>';
}
function nhPintar(){
  const v = document.getElementById('view-plan'); if (!v) return;
  let c = document.getElementById('nhCard');
  const bl = mealBlocks();
  if (isCoachView() || !clienteActual || !bl.length) { if (c) c.remove(); return; }
  if (!c) {
    c = document.createElement('div'); c.id = 'nhCard'; c.className = 'nh-card';
    const ref = document.getElementById('planResumen');
    if (ref) ref.insertAdjacentElement('beforebegin', c); else v.insertBefore(c, v.firstChild);
    c.addEventListener('click', function(e){
      const g = e.target.closest('[data-vaso]'); if (g) { const n = +g.dataset.vaso; nhPonerAgua(n === nhAgua(clienteActual) ? n - 1 : n); return; }
      if (e.target.closest('[data-agua="+"]')) { nhPonerAgua(nhAgua(clienteActual) + 1); return; }
      if (e.target.closest('[data-agua="-"]')) { nhPonerAgua(nhAgua(clienteActual) - 1); return; }
      const a = e.target.closest('[data-ahora]'); if (a) exAbrirComida(+a.dataset.ahora);
    });
  }
  const k = clienteActual, obj = typeof nuObjetivoDe === 'function' ? nuObjetivoDe(k) : null;
  /* lo tomado hoy */
  let p = 0, cb = 0, f = 0, n = 0;
  bl.forEach(function(b){ if (b.classList.contains('eaten')) { p += +b.dataset.mp || 0; cb += +b.dataset.mc || 0; f += +b.dataset.mf || 0; n++; } });
  const kcal = Math.round(p * 4 + cb * 4 + f * 9);
  /* objetivo: el que fija Fátima o, si no hay, el total del plan */
  const tot = bl.reduce(function(a, b){ return { p: a.p + (+b.dataset.mp || 0), c: a.c + (+b.dataset.mc || 0), f: a.f + (+b.dataset.mf || 0) }; }, { p: 0, c: 0, f: 0 });
  const o = obj ? { kcal: obj.kcal, p: obj.p, c: obj.c, f: obj.f } : { kcal: Math.round(tot.p * 4 + tot.c * 4 + tot.f * 9), p: tot.p, c: tot.c, f: tot.f };
  const mac = [['p', '🥩', 'Proteína', p, o.p, 'var(--protein)'], ['c', '🍚', 'Carbos', cb, o.c, 'var(--carb)'], ['f', '🥑', 'Grasa', f, o.f, 'var(--fat)']];
  const agua = nhAgua(k), aObj = nhAguaObj(k);
  const ia = typeof exComidaAhora === 'function' ? exComidaAhora() : -1, ba = ia > -1 ? bl[ia] : null;
  const ahora = ba && !ba.classList.contains('eaten') ? ba : null;
  let h = '<div class="nh-top"><span class="nh-eye">Hoy · ' + n + ' de ' + bl.length + ' comidas</span>' + (o.kcal ? '<span class="nh-quedan">' + (kcal >= o.kcal ? '¡Objetivo cumplido! 🎉' : 'Te quedan <b>' + fmtMil(o.kcal - kcal) + '</b> kcal') + '</span>' : '') + '</div>'
    + '<div class="nh-anillos">'
    + nhAnillo(o.kcal ? kcal / o.kcal : 0, 'var(--accent)', 42, 9, '<b>' + fmtMil(kcal) + '</b><small>de ' + (o.kcal ? fmtMil(o.kcal) : '—') + ' kcal</small>', 'nh-grande')
    + '<div class="nh-macros">' + mac.map(function(m){
        return '<div class="nh-m ' + m[0] + '">' + nhAnillo(m[4] ? m[3] / m[4] : 0, m[5], 40, 12, '<span aria-hidden="true">' + m[1] + '</span>', 'nh-peq')
          + '<div class="nh-m-t"><b>' + Math.round(m[3]) + '<small>/' + Math.round(m[4] || 0) + ' g</small></b><span>' + m[2] + '</span></div></div>';
      }).join('') + '</div></div>'
    + '<div class="nh-agua"><div class="nh-agua-h"><span>💧 Agua</span><b>' + agua + ' de ' + aObj + ' vasos</b><small>' + fmtNum(Math.round(agua * 0.25 * 100) / 100) + ' l</small></div>'
    + '<div class="nh-vasos" role="group" aria-label="Vasos de agua de hoy">' + Array.from({ length: Math.max(aObj, agua) }, function(_, i){
        return '<button type="button" class="nh-vaso' + (i < agua ? ' on' : '') + '" data-vaso="' + (i + 1) + '" aria-label="' + (i + 1) + (i ? ' vasos' : ' vaso') + '" aria-pressed="' + (i < agua) + '"></button>';
      }).join('') + '<button type="button" class="nh-agua-mas" data-agua="+" aria-label="Añadir un vaso">+1</button></div></div>';
  if (ahora) {
    const t = ((ahora.querySelector('.meal-block-title') || {}).textContent || 'Comida').trim();
    const el = ((ahora.querySelector('.meal-elegidas') || {}).textContent || '').trim();
    h += '<button type="button" class="nh-ahora" data-ahora="' + ia + '"><span class="nh-ahora-eye">🍽️ Ahora toca</span><b>' + esc(t) + ' · ' + fmtMil(Math.round(nhKcal(ahora))) + ' kcal</b>'
      + (el ? '<span class="nh-ahora-sub">' + esc(el) + '</span>' : '') + '<span class="nh-ahora-cta" aria-hidden="true">›</span></button>';
  }
  c.innerHTML = h;
}
recalcConsumo = (function(orig){ return function(){ const r = orig.apply(this, arguments); try { nhPintar(); } catch(e){} return r; }; })(recalcConsumo);
fsdTras('goTo', function(r, v){ if (v === 'plan') setTimeout(nhPintar, 0); });
