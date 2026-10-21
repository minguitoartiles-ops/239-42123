/* =========================================================
   Fitnessindramas — #120 Tiempo con la rutina actual (21/10/2026)
   Cuenta desde el último cambio de EJERCICIOS (o de días) guardado en el entrenamiento;
   ajustar reps, RIR o notas no reinicia la cuenta.
   - Ficha: «Con esta rutina desde el dd/mm · N semanas» (ámbar desde 6 semanas, rojo desde 8).
   - Lista de clientes (Domingo): «🏋️ Rutina: N sem» en cada tarjeta.
   ========================================================= */
const RUT_AVISO = 6, RUT_ROJO = 8;
function rutHuella(html){
  const t = document.createElement('div'); t.innerHTML = html || '';
  return Array.prototype.map.call(t.querySelectorAll('.sesion-card'), function(c){
    return Array.prototype.map.call(c.querySelectorAll('.ex-item'), function(it){ return norm(enNombreEj(it)); }).join(',');
  }).join('|');
}
function rutDatos(k){
  const d = clientesData[k], p = PLANES[k];
  if (!d || !p || !p.ent || p.ent.indexOf('ex-item') < 0) return null;
  if (!d.rutina) {                                    // clientes de antes: cuenta desde el alta (o la última actualización)
    d.rutina = { desde: d.fechaAlta || (d.entAct && d.entAct.fecha) || new Date().toISOString(), huella: rutHuella(p.ent) };
  }
  const dias = Math.max(0, Math.floor((Date.now() - new Date(d.rutina.desde).getTime()) / 864e5));
  const sem = Math.floor(dias / 7);
  return { desde: d.rutina.desde, dias: dias, sem: sem, nivel: sem >= RUT_ROJO ? 'roj' : (sem >= RUT_AVISO ? 'amb' : 'ok'),
           txt: dias < 14 ? dias + (dias === 1 ? ' día' : ' días') : sem + ' semanas', corto: dias < 14 ? dias + ' d' : sem + ' sem' };
}
/* al guardar el entrenamiento: si cambian los ejercicios, la rutina empieza de nuevo */
editarPlan = (function(orig){
  return function(){
    const salia = coachEditing, vista = vistaActual, k = clienteActual;
    const r = orig.apply(this, arguments);
    if (salia && !coachEditing && vista === 'entreno' && k && clientesData[k] && PLANES[k]) {
      const d = clientesData[k], h = rutHuella(PLANES[k].ent);
      if (!d.rutina) d.rutina = { desde: d.fechaAlta || new Date().toISOString(), huella: h };
      else if (d.rutina.huella !== h) { d.rutina = { desde: new Date().toISOString(), huella: h, por: coachActivo ? coachActivo.u : '' }; guardarTodo(); }
    }
    return r;
  };
})(editarPlan);
/* ficha */
function rutPintarFicha(){
  const k = clienteActual, box = document.getElementById('fichaEntrenoRes'); if (!k || !box) return;
  const r = rutDatos(k); let n = box.querySelector('.rut-ficha');
  if (!r) { if (n) n.remove(); return; }
  if (!n) { n = document.createElement('div'); const card = box.querySelector('.fe-card'); if (!card) return; card.insertBefore(n, card.children[1] || null); }
  n.className = 'rut-ficha ' + r.nivel;
  n.innerHTML = '🗓️ Con esta rutina desde el ' + fechaCorta(r.desde) + ' · <b>' + r.txt + '</b>'
    + (r.nivel !== 'ok' ? '<span> · ' + (r.nivel === 'roj' ? 'toca cambiarla' : 'valora cambiarla pronto') + '</span>' : '');
  const lbl = box.querySelector('.fp-lbl .fp-res');
  if (lbl && lbl.textContent) lbl.textContent = 'Rutina: ' + r.txt;
}
if (typeof enPintarEntrenoFicha === 'function') enPintarEntrenoFicha = (function(orig){ return function(){ const x = orig.apply(this, arguments); rutPintarFicha(); return x; }; })(enPintarEntrenoFicha);
if (typeof fpAplicar === 'function') fpAplicar = (function(orig){ return function(){ const x = orig.apply(this, arguments); try { rutPintarFicha(); } catch(e){} return x; }; })(fpAplicar);
/* tarjetas de la lista (entrenador) */
function rutPintarLista(){
  if (!coachActivo || coachActivo.rol !== 'entrenador') return;
  const claves = Object.keys(clientesData);
  Array.prototype.forEach.call(document.querySelectorAll('#listaClientes .cliente-card'), function(card, i){
    const r = claves[i] && rutDatos(claves[i]);
    let s = card.querySelector('.rut-tag');
    if (!r) { if (s) s.remove(); return; }
    const pie = card.querySelector('.kc-pie'); if (!pie) return;
    if (!s) { s = document.createElement('span'); pie.insertBefore(s, pie.children[1] || null); }
    s.className = 'rut-tag ' + r.nivel; s.title = 'Con la rutina actual desde el ' + fechaCorta(r.desde);
    s.textContent = '🏋️ Rutina: ' + r.corto;
  });
}
if (typeof pintarListaClientes === 'function') pintarListaClientes = (function(orig){ return function(){ const x = orig.apply(this, arguments); rutPintarLista(); return x; }; })(pintarListaClientes);
if (typeof exPintarFiltros === 'function') exPintarFiltros = (function(orig){ return function(){ const x = orig.apply(this, arguments); rutPintarLista(); return x; }; })(exPintarFiltros);
