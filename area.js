/* =========================================================
   Fitness sin Dramas — #135 Cada profesional en su área (21/10/2026)
   Domingo (entrenador): ve un resumen rápido de la nutrición del cliente, pero no abre ni edita el plan
   nutricional ni las recetas. Fátima (dietista): ve un resumen del entrenamiento, pero no lo edita
   ni ve el registro de pesos ni el tonelaje. Lo compartido (ficha, chat, seguimientos, pagos) sigue igual.
   ========================================================= */
function arRol(){ return coachActivo ? coachActivo.rol : ''; }
function arAjena(vista){ const r = arRol(); return (r === 'entrenador' && vista === 'plan') || (r === 'dietista' && vista === 'entreno'); }
/* nadie empieza a editar el plan del otro */
editarPlan = (function(orig){
  return function(){
    if (!coachEditing && isCoachView() && arAjena(vistaActual)) {
      toast(arRol() === 'entrenador' ? 'El plan nutricional lo edita Fátima' : 'El entrenamiento lo edita Domingo');
      return;
    }
    return orig.apply(this, arguments);
  };
})(editarPlan);
/* abrir la vista del otro profesional desde cualquier sitio lleva a su resumen en la ficha */
abrirVistaCliente = (function(orig){
  return function(vista){
    if (arAjena(vista)) {
      toast(arRol() === 'entrenador' ? 'Tienes el resumen de nutrición en la ficha' : 'Tienes el resumen del entrenamiento en la ficha');
      if (typeof enIrSeccion === 'function') enIrSeccion(vista === 'plan' ? 'nutri' : 'entreno');
      return;
    }
    return orig.apply(this, arguments);
  };
})(abrirVistaCliente);
if (typeof enAbrirPlanNutri === 'function') enAbrirPlanNutri = (function(orig){
  return function(){ if (arRol() === 'entrenador') { abrirVistaCliente('plan'); return; } return orig.apply(this, arguments); };
})(enAbrirPlanNutri);
/* enAbrirPlan ya abre el plan de cada rol (entreno para Domingo, nutrición para Fátima) */
/* ficha: fuera los accesos y enlaces de edición del otro; los resúmenes se quedan sin clic */
function arLimpiarFicha(){
  const r = arRol(); if (!r) return;
  document.documentElement.classList.toggle('ar-entrenador', r === 'entrenador');
  document.documentElement.classList.toggle('ar-dietista', r === 'dietista');
  const acc = document.getElementById('fichaAccesos');
  if (acc) Array.prototype.forEach.call(acc.querySelectorAll('.acc-btn'), function(b){
    const oc = b.getAttribute('onclick') || '';
    if ((r === 'entrenador' && /enAbrirPlanNutri/.test(oc)) || (r === 'dietista' && /enAbrirPlan\(/.test(oc))) b.remove();
  });
  const nv = document.querySelector('#fichaNutri .nu-vista');
  if (nv && r === 'entrenador') { nv.removeAttribute('onclick'); nv.removeAttribute('role'); nv.removeAttribute('tabindex'); nv.classList.add('ar-solo-ver'); const l = nv.querySelector('.nu-vista-h .lnk'); if (l) l.textContent = 'Resumen · lo edita Fátima'; }
  const fe = document.querySelector('#fichaEntrenoRes .fe-card');
  if (fe && r === 'dietista') { fe.removeAttribute('onclick'); fe.removeAttribute('role'); fe.removeAttribute('tabindex'); fe.classList.add('ar-solo-ver'); const l = fe.querySelector('.fe-top .lnk'); if (l) l.textContent = 'Resumen · lo edita Domingo'; }
}
['enPintarFicha', 'nuPintarFicha', 'enPintarEntrenoFicha', 'goToCliente'].forEach(function(n){
  if (typeof window[n] !== 'function') return;
  const o = window[n]; window[n] = function(){ const x = o.apply(this, arguments); try { arLimpiarFicha(); } catch(e){} return x; };
});
/* recetas: solo para Fátima */
function arRecetas(){
  const b = document.getElementById('ctab-recetas');
  if (b) b.classList.toggle('ar-fuera', arRol() === 'entrenador');
  const m = document.getElementById('masPro');
  if (m) Array.prototype.forEach.call(m.querySelectorAll('.list-row'), function(x){ if (/Recetas para clientes/.test(x.textContent)) x.hidden = arRol() === 'entrenador'; });
}
['entrarAlPanel', 'pintarTabsPro', 'enPintarMas'].forEach(function(n){
  if (typeof window[n] !== 'function') return;
  const o = window[n]; window[n] = function(){ const x = o.apply(this, arguments); try { arRecetas(); arLimpiarFicha(); } catch(e){} return x; };
});
if (typeof abrirTabPro === 'function') abrirTabPro = (function(orig){
  return function(t){ if (t === 'recetas' && arRol() === 'entrenador') { toast('Las recetas son de Fátima'); return; } return orig.apply(this, arguments); };
})(abrirTabPro);

/* =========================================================
   #134 Fátima · «Planes de nutrición»: buscador, foto de cada cliente y lista;
   al elegir uno, su resumen nutricional sale a la derecha (en el móvil, debajo de la fila)
   con «Abrir plan».
   ========================================================= */
let plSel = null, plBusca = '';
function plFoto(k){
  const d = clientesData[k], url = typeof fotoDe === 'function' ? fotoDe('cliente:' + k) : '';
  return '<span class="pl-av' + (url ? ' con-foto' : '') + '"' + (url ? ' style="background-image:url(&quot;' + url + '&quot;)"' : '') + '>' + (url ? '' : esc((d.nombre || '?').trim().charAt(0).toUpperCase())) + '</span>';
}
function plResumen(k){
  if (!k || !clientesData[k]) return '<div class="pl-prev-vacio"><span aria-hidden="true">👈</span><b>Elige un cliente</b><span>Verás aquí el resumen de su nutrición.</span></div>';
  const d = clientesData[k];
  return '<div class="pl-prev-h">' + plFoto(k) + '<div><b>' + esc(d.nombre) + '</b><span>' + esc(d.objetivo || '') + (d.semana ? ' · semana ' + esc(d.semana) : '') + '</span></div></div>'
    + (typeof nuHtmlResumen === 'function' ? '<div class="nu-vista pl-nu">' + nuHtmlResumen(k, false) + '</div>' : '')
    + '<button type="button" class="btn-primary pl-abrir" onclick="enAbrirPlanDesdeTab(\'' + k + '\')">Abrir plan ›</button>';
}
function plFiltrar(v){ plBusca = v; plAplicar(); }
function plElegir(k){ plSel = plSel === k && !(typeof escActivo === 'function' && escActivo()) ? null : k; plAplicar(); }
function plAplicar(){
  const cont = document.getElementById('planesPro'); if (!cont) return;
  const q = norm(plBusca || '');
  Array.prototype.forEach.call(cont.querySelectorAll('.plan-fila'), function(f){
    const k = f.dataset.k, nom = norm((clientesData[k] || {}).nombre || '');
    f.hidden = !!q && nom.indexOf(q) < 0;
    f.classList.toggle('pl-sel', k === plSel);
    const ya = f.nextElementSibling && f.nextElementSibling.classList.contains('pl-prev-movil') ? f.nextElementSibling : null;
    if (ya && (k !== plSel || f.hidden)) ya.remove();
    if (k === plSel && !f.hidden && !(typeof escActivo === 'function' && escActivo()) && !ya) {
      const p = document.createElement('div'); p.className = 'pl-prev-movil'; p.innerHTML = plResumen(k); f.parentNode.insertBefore(p, f.nextSibling);
    }
  });
  const prev = document.getElementById('plPrev'); if (prev) prev.innerHTML = plResumen(plSel);
  const n = cont.querySelectorAll('.plan-fila:not([hidden])').length, vac = document.getElementById('plVacio');
  if (vac) vac.hidden = n > 0;
}
if (typeof enPintarPlanes === 'function') enPintarPlanes = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    if (arRol() !== 'dietista') return r;
    const cont = document.getElementById('planesPro'), lista = cont && cont.querySelector('.planes-lista'); if (!lista) return r;
    Array.prototype.forEach.call(lista.querySelectorAll('.plan-fila'), function(f){
      const m = (f.getAttribute('onclick') || '').match(/'([^']+)'/); if (!m) return;
      const k = m[1]; f.dataset.k = k;
      f.setAttribute('onclick', "plElegir('" + k + "')");
      f.setAttribute('ondblclick', "enAbrirPlanDesdeTab('" + k + "')");
      f.insertAdjacentHTML('afterbegin', plFoto(k));
      const cta = f.querySelector('.plan-fila-cta'); if (cta) cta.textContent = 'Ver resumen';
    });
    const busca = document.createElement('div'); busca.className = 'pl-busca';
    busca.innerHTML = '<input type="search" id="plBuscar" placeholder="Buscar cliente…" aria-label="Buscar cliente" autocomplete="off" value="' + esc(plBusca) + '" oninput="plFiltrar(this.value)"><div id="plVacio" class="picker-empty" hidden>Ningún cliente coincide con la búsqueda.</div>';
    const split = document.createElement('div'); split.className = 'pl-split';
    const izq = document.createElement('div'); izq.className = 'pl-izq';
    lista.parentNode.insertBefore(split, lista);
    izq.appendChild(busca); izq.appendChild(lista); split.appendChild(izq);
    const der = document.createElement('div'); der.className = 'pl-der'; der.id = 'plPrev'; split.appendChild(der);
    if (plSel && !clientesData[plSel]) plSel = null;
    if (!plSel && typeof escActivo === 'function' && escActivo()) { const f = lista.querySelector('.plan-fila'); if (f) plSel = f.dataset.k; }
    plAplicar();
    return r;
  };
})(enPintarPlanes);
