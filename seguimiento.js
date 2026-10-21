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

/* ---------- #140 Formulario más visual ----------
   Agujetas 1 verde → 4 rojo · Motivación con caras (1 triste → 5 feliz)
   Cumplimiento nutricional 1 rojo → 10 verde · Estrés con caras (1 tranquilo → 10 estresado).
   Los números siguen siendo el valor que se guarda (las caras van por CSS). */
function sgTono(v, min, max, alReves){ let t = (v - min) / (max - min); if (alReves) t = 1 - t; return 'hsl(' + Math.round(t * 120) + ',62%,44%)'; }
const SG_CARAS_ESTRES = ['😌','😌','🙂','🙂','😐','😐','😟','😣','😫','😫'];
function sgVisual(){
  const v = document.getElementById('view-seguimiento'); if (!v) return;
  const filas = v.querySelectorAll('.esc-row');
  if (filas[0]) { filas[0].classList.add('sg-agujetas'); filas[0].querySelectorAll('.esc-btn').forEach(function(b, i){ b.style.setProperty('--tono', sgTono(i + 1, 1, 4, true)); }); }
  if (filas[1]) filas[1].classList.add('sg-motiv');
  const nut = document.getElementById('rNutri'), es = document.getElementById('rEstres');
  if (nut) {
    const inp = nut.parentElement.querySelector('input[type=range]'); nut.parentElement.classList.add('sg-nutri');
    const pinta = function(){ const c = sgTono(+inp.value, 1, 10); inp.style.accentColor = c; nut.style.color = c; };
    if (!inp.dataset.sgVis) { inp.dataset.sgVis = 1; inp.addEventListener('input', pinta); }
    pinta();
  }
  if (es) {
    const inp = es.parentElement.querySelector('input[type=range]'); es.parentElement.classList.add('sg-estres');
    let cara = es.parentElement.querySelector('.sg-cara');
    if (!cara) { cara = document.createElement('span'); cara.className = 'sg-cara'; cara.setAttribute('aria-hidden', 'true'); es.parentElement.insertBefore(cara, es); }
    const pinta = function(){ const n = +inp.value; cara.textContent = SG_CARAS_ESTRES[n - 1] || '😐'; const c = sgTono(n, 1, 10, true); inp.style.accentColor = c; es.style.color = c; };
    if (!inp.dataset.sgVis) { inp.dataset.sgVis = 1; inp.addEventListener('input', pinta); }
    pinta();
  }
}
sgVisual();
goTo = (function(orig){ return function(n){ const r = orig.apply(this, arguments); if (n === 'seguimiento') sgVisual(); return r; }; })(goTo);

/* ---------- #157 Fotos de progreso en «Datos biométricos» ----------
   Tres huecos (Frente · Perfil · Espalda), opcionales. Se reducen a 1280 px y se guardan en este
   dispositivo (IndexedDB, como los protocolos); el seguimiento guarda solo sus referencias.
   Fátima y Domingo las ven en la tarjeta del seguimiento; tocar una la amplía. */
const SG_FOTO_POS = [['frente', 'Frente'], ['perfil', 'Perfil'], ['espalda', 'Espalda']];
let sgFotosNuevas = {}, sgFotosPrevias = null;
function sgFotoReducir(f){
  return new Promise(function(ok){
    const url = URL.createObjectURL(f), img = new Image();
    img.onload = function(){
      const m = 1280, k = Math.min(1, m / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      c.toBlob(function(b){ ok(b || f); }, 'image/jpeg', 0.82);
    };
    img.onerror = function(){ URL.revokeObjectURL(url); ok(f); };
    img.src = url;
  });
}
function sgFotosPintar(){
  const v = document.getElementById('view-seguimiento'); if (!v) return;
  const viejo = v.querySelector('.sg-foto'); if (viejo) { const f = viejo.closest('.field'); if (f) f.remove(); }
  let box = document.getElementById('sgFotos');
  if (!box) {
    box = document.createElement('div'); box.id = 'sgFotos'; box.className = 'sg-fotos';
    const bl = Array.prototype.filter.call(v.querySelectorAll('.sg-block'), function(b){ return /biom/i.test((b.querySelector('.sg-cat') || {}).textContent || ''); })[0];
    if (!bl) return; bl.appendChild(box);
  }
  box.innerHTML = '<div class="sg-q"><label>Fotos de progreso</label><span class="sg-help">Opcional. Con la misma luz y postura cada semana se ve mejor el cambio. Solo las verán Fátima y Domingo.</span></div>'
    + '<div class="sg-fotos-fila">' + SG_FOTO_POS.map(function(p){
      const tiene = sgFotosNuevas[p[0]] || (sgFotosPrevias && sgFotosPrevias[p[0]]);
      return '<label class="sg-foto-hueco' + (tiene ? ' con' : '') + '" data-pos="' + p[0] + '">'
        + '<input type="file" accept="image/*" hidden onchange="sgFotoElegir(this,\'' + p[0] + '\')">'
        + (tiene ? '<img alt="' + p[1] + '" data-pos-img="' + p[0] + '">' : '<span class="sg-foto-mas" aria-hidden="true">＋</span>')
        + '<span class="sg-foto-lbl">' + p[1] + '</span>'
        + (tiene ? '<button type="button" class="sg-foto-x" aria-label="Quitar la foto de ' + p[1].toLowerCase() + '" onclick="sgFotoQuitar(event,\'' + p[0] + '\')">✕</button>' : '') + '</label>';
    }).join('') + '</div>';
  SG_FOTO_POS.forEach(function(p){
    const im = box.querySelector('img[data-pos-img="' + p[0] + '"]'); if (!im) return;
    if (sgFotosNuevas[p[0]]) im.src = URL.createObjectURL(sgFotosNuevas[p[0]]);
    else if (sgFotosPrevias && sgFotosPrevias[p[0]]) sgFotoSrc(im, sgFotosPrevias[p[0]]);
  });
}
function sgFotoSrc(im, id){ prOp('readonly', function(st){ return st.get(id); }).then(function(b){ if (b) im.src = URL.createObjectURL(b); }).catch(function(){}); }
function sgFotoElegir(inp, pos){
  const f = inp.files && inp.files[0]; inp.value = ''; if (!f) return;
  if (!/^image\//.test(f.type)) { toast('Elige una imagen'); return; }
  sgFotoReducir(f).then(function(b){ sgFotosNuevas[pos] = b; sgFotosPintar(); });
}
function sgFotoQuitar(ev, pos){
  ev.preventDefault(); ev.stopPropagation();
  delete sgFotosNuevas[pos]; if (sgFotosPrevias) delete sgFotosPrevias[pos];
  sgFotosPintar();
}
guardarSeguimiento = (function(orig){
  return function(){
    const k = clienteActual, l0 = k && (SEGUIMIENTOS[k] || [])[0];
    const previas = sgFotosPrevias ? Object.assign({}, sgFotosPrevias) : {};
    const r = orig.apply(this, arguments);
    const nuevo = k && (SEGUIMIENTOS[k] || [])[0];
    if (!nuevo || nuevo === l0) return r;                                   // no se guardó nada
    const fotos = Object.keys(previas).map(function(pos){ return { pos: pos, id: previas[pos] }; });
    const blobs = sgFotosNuevas, pend = Object.keys(blobs);
    sgFotosNuevas = {}; sgFotosPrevias = null;
    Promise.all(pend.map(function(pos, i){
      const id = 'sf' + Date.now().toString(36) + i + Math.random().toString(36).slice(2, 5);
      return prOp('readwrite', function(st){ return st.put(blobs[pos], id); }).then(function(){
        const j = fotos.findIndex(function(f){ return f.pos === pos; }); if (j > -1) fotos.splice(j, 1);
        fotos.push({ pos: pos, id: id });
      });
    })).then(function(){
      fotos.sort(function(a, b){ return SG_FOTO_POS.map(function(p){ return p[0]; }).indexOf(a.pos) - SG_FOTO_POS.map(function(p){ return p[0]; }).indexOf(b.pos); });
      if (fotos.length) nuevo.fotos = fotos; else delete nuevo.fotos;
      try { guardarTodo(); pintarHistorialCliente(); } catch(e){}
      sgFotosPintar();
    }).catch(function(){ toast('No se han podido guardar las fotos en este dispositivo'); });
    return r;
  };
})(guardarSeguimiento);

/* al editar el de esta semana, sus fotos salen en los huecos */
sgRellenar = (function(orig){
  return function(r){
    orig.apply(this, arguments);
    sgFotosNuevas = {}; sgFotosPrevias = {};
    ((r && r.fotos) || []).forEach(function(f){ sgFotosPrevias[f.pos] = f.id; });
    sgFotosPintar();
  };
})(sgRellenar);
sgCancelarEdicion = (function(orig){ return function(){ sgFotosNuevas = {}; sgFotosPrevias = null; orig(); sgFotosPintar(); }; })(sgCancelarEdicion);
goTo = (function(orig){ return function(n){ const r = orig.apply(this, arguments); if (n === 'seguimiento') sgFotosPintar(); return r; }; })(goTo);
sgFotosPintar();

/* en la tarjeta de cada seguimiento (cliente y profesionales) */
tarjetaSeguimiento = (function(orig){
  return function(r){
    let h = orig.apply(this, arguments);
    if (r && r.fotos && r.fotos.length) {
      const f = '<div class="sg-fotos-res">' + r.fotos.map(function(x){
        const n = (SG_FOTO_POS.filter(function(p){ return p[0] === x.pos; })[0] || [0, 'Foto'])[1];
        return '<button type="button" class="sg-fr" onclick="sgFotoAmpliar(\'' + x.id + '\',\'' + n + '\')"><img alt="' + n + '" data-foto="' + x.id + '"><span>' + n + '</span></button>';
      }).join('') + '</div>';
      h = h.replace(/<\/div>$/, f + '</div>');
      setTimeout(sgFotosCargar, 0);
    }
    return h;
  };
})(tarjetaSeguimiento);
function sgFotosCargar(){
  Array.prototype.forEach.call(document.querySelectorAll('img[data-foto]:not([src])'), function(im){ im.src = 'data:image/gif;base64,R0lGODlhAQABAAAAACw='; sgFotoSrc(im, im.dataset.foto); });
}
function sgFotoAmpliar(id, n){
  let o = document.getElementById('sgFotoGrande');
  if (!o) { o = document.createElement('div'); o.id = 'sgFotoGrande'; o.className = 'sg-foto-grande'; o.onclick = function(){ o.classList.remove('show'); }; document.body.appendChild(o); }
  o.innerHTML = '<img alt="' + esc(n) + '"><span>' + esc(n) + ' · toca para cerrar</span>';
  sgFotoSrc(o.querySelector('img'), id); o.classList.add('show');
}
