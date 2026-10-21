/* =========================================================
   Fitness sin Dramas — Seguimiento semanal del cliente (21/10/2026)
   #144 Uno por semana: si ya lo envió esta semana (de lunes a domingo), en vez del formulario
        ve «Ya enviado» con «Editar el de esta semana»; al editar, el formulario sale relleno
        con lo que puso y al enviar se corrige ese mismo seguimiento (no se crea otro).
   ========================================================= */
let sgEditando = false;
function sgSemana(f){ return mjISO(mjLunes(f)); }
function sgDeEstaSemana(k){
  const l = SEGUIMIENTOS[k] || [], r = l[0];
  return r && r.fecha && sgSemana(r.fecha) === sgSemana() ? r : null;
}
function sgPintarEstado(){
  const v = document.getElementById('view-seguimiento'); if (!v) return;
  const k = clienteActual, r = k && window.fsdSesionCliente && !isCoachView() ? sgDeEstaSemana(k) : null;
  const ya = !!r && !sgEditando;
  v.classList.toggle('sg-ya', ya);
  v.classList.toggle('sg-editando', !!r && sgEditando);
  let c = document.getElementById('sgHecho');
  if (!c) { c = document.createElement('div'); c.id = 'sgHecho'; c.className = 'sg-hecho'; const top = v.querySelector('.view-top'); v.insertBefore(c, top ? top.nextSibling : v.firstChild); }
  if (!r) { c.hidden = true; return; }
  c.hidden = false;
  const prox = fechaCorta(mjSumarDias(sgSemana(), 7));
  c.innerHTML = sgEditando
    ? '<b>✏️ Editando el seguimiento de esta semana</b><span>Cambia lo que necesites y pulsa «Guardar cambios». Lo demás se queda como estaba.</span><button type="button" class="btn-eq" onclick="sgCancelarEdicion()">Cancelar</button>'
    : '<span class="sg-hecho-ico" aria-hidden="true">✅</span><b>Ya has enviado el seguimiento de esta semana</b>'
      + '<span>Lo enviaste el ' + fechaCorta(r.fecha) + (r.editado ? ' (editado el ' + fechaCorta(r.editado) + ')' : '') + '. Podrás enviar el siguiente a partir del lunes ' + prox + '.</span>'
      + '<button type="button" class="btn-primary" onclick="sgEditar()">Editar el de esta semana</button>';
  const b = document.getElementById('sgSave'); if (b) b.textContent = sgEditando ? 'Guardar cambios' : 'Enviar seguimiento';
}
/* rellena el formulario con lo que ya envió */
function sgRellenar(r){
  const v = document.getElementById('view-seguimiento'); if (!v || !r) return;
  const escala = function(i, val){ const row = v.querySelectorAll('.esc-row')[i]; const n = parseInt(val, 10); if (!row || !n) return; const b = row.querySelectorAll('.esc-btn')[n - 1]; if (b) b.click(); };
  escala(0, r.agujetas); escala(1, r.m);
  const rangos = v.querySelectorAll('.sg-range:not(.sg-pasos) input[type=range]');
  [['e', 'rEntreno'], ['n', 'rNutri'], ['x', 'rEstres']].forEach(function(p, i){
    const inp = rangos[i], val = parseInt(r[p[0]], 10); if (!inp || !val) return;
    inp.value = val; inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const ps = v.querySelector('#sgPasos input');
  if (ps && r.pasos != null) { ps.value = r.pasos; ps.dispatchEvent(new Event('input', { bubbles: true })); }
  const txt = v.querySelectorAll('.sg-text');
  if (txt[0]) txt[0].value = r.prog || '';
  if (txt[2]) txt[2].value = r.obs || '';
  const nums = v.querySelectorAll('.row2col input');
  MEDIDAS.forEach(function(m, i){ const x = r.med && r.med[m[0]]; if (nums[i]) nums[i].value = x != null ? fmtNum(x) : ''; });
}
function sgEditar(){
  const r = sgDeEstaSemana(clienteActual); if (!r) return;
  sgEditando = true; sgPintarEstado(); sgRellenar(r);
  try { exPaso = 0; exPasoPintar(); } catch(e){}
  const c = document.getElementById('content'); if (c) c.scrollTop = 0;
}
function sgCancelarEdicion(){ sgEditando = false; sgPintarEstado(); }
guardarSeguimiento = (function(orig){
  return function(){
    const k = clienteActual;
    const previo = k ? sgDeEstaSemana(k) : null;
    if (previo && !sgEditando && window.fsdSesionCliente && !isCoachView()) { toast('Ya enviaste el seguimiento de esta semana. Puedes editarlo.'); sgPintarEstado(); return; }
    const antes = k ? (SEGUIMIENTOS[k] || []).length : 0;
    const r = orig.apply(this, arguments);
    const l = k && SEGUIMIENTOS[k];
    if (sgEditando && previo && l && l.length > antes && l[1] === previo) {
      const nuevo = l[0];
      nuevo.fecha = previo.fecha; nuevo.s = previo.s; nuevo.editado = new Date().toISOString();
      l.splice(1, 1);
      sgEditando = false;
      try { guardarTodo(); } catch(e){}
      try { pintarHistorialCliente(); pintarProgreso(); } catch(e){}
      toast('Seguimiento corregido ✓');
    }
    if (l && l.length > antes) sgEditando = false;
    sgPintarEstado();
    return r;
  };
})(guardarSeguimiento);
goTo = (function(orig){
  return function(n){
    const r = orig.apply(this, arguments);
    if (n === 'seguimiento') { if (!sgDeEstaSemana(clienteActual)) sgEditando = false; sgPintarEstado(); }
    return r;
  };
})(goTo);
sgPintarEstado();
