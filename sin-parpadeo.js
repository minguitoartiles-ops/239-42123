/* =========================================================
   8/11/2026 · Sin parpadeos al llegar datos en directo (avisado por Domingo: «la pantalla parpadea mucho»,
   sobre todo en Entrenamientos y en el chat).

   Antes, cada aviso del servidor (un peso apuntado, un mensaje, un «leído»…) borraba y volvía a construir
   la zona entera: la lista de Entrenamientos con su vista previa, el plan abierto, la conversación, la lista
   de chats. Al ser elementos nuevos, las fotos se volvían a dibujar, las animaciones de entrada se repetían,
   el scroll saltaba y se perdía el cursor del buscador.

   Ahora se construye lo nuevo en una copia invisible (con el mismo id, para que todo el código de siempre
   funcione igual) y luego se pasan a la pantalla SOLO las diferencias: un texto que cambia, un atributo,
   un mensaje que se añade. Lo que no cambia ni se toca.
   ========================================================= */

/* clave para emparejar hijos aunque cambien de sitio (mensajes, filas de clientes…) */
function fsdClaveNodo(n){
  if (n.nodeType !== 1) return null;
  // primero los datos estables (mensaje, cliente…); el id, al final: alguno se inventa en cada pintado
  const v = n.getAttribute('data-fid') || n.getAttribute('data-k') || n.getAttribute('data-mid') || n.getAttribute('data-sid') || n.id;
  return v ? n.nodeName + '|' + v : null;
}
function fsdMismoNodo(a, b){
  return a.nodeType === b.nodeType && a.nodeName === b.nodeName && fsdClaveNodo(a) === fsdClaveNodo(b);
}
/* opciones de cada zona:
   · bloque: piezas que, si cambian, se cambian enteras (sus botones guardan referencias a la propia pieza)
   · conservar: marcas que pone la propia pantalla y no vienen en lo nuevo (no se quitan)
   · saltar: piezas que no se tocan mientras pasa algo en ellas (una nota de voz sonando) */
function fsdParcharAtributos(v, n, opc){
  const va = v.attributes, na = n.attributes, cons = (opc && opc.conservar) || [];
  for (let i = va.length - 1; i >= 0; i--) { const a = va[i]; if (!n.hasAttribute(a.name) && cons.indexOf(a.name) < 0) v.removeAttribute(a.name); }
  for (let i = 0; i < na.length; i++) { const a = na[i]; if (v.getAttribute(a.name) !== a.value) v.setAttribute(a.name, a.value); }
  // lo que se escribe en un campo no siempre está en el atributo: se copia si no se está escribiendo en él
  if (v !== document.activeElement) {
    if (v.nodeName === 'INPUT' || v.nodeName === 'TEXTAREA' || v.nodeName === 'SELECT') { if (v.value !== n.value) v.value = n.value; }
    if (v.nodeName === 'INPUT' && v.checked !== n.checked) v.checked = n.checked;
  }
}
/* deja en «viejo» lo mismo que hay en «nuevo» (sus hijos), tocando solo lo que cambia */
function fsdParchear(viejo, nuevo, opc){
  opc = opc || {};
  const nuevos = Array.prototype.slice.call(nuevo.childNodes);
  const porClave = {};
  Array.prototype.forEach.call(viejo.childNodes, function(o){ const c = fsdClaveNodo(o); if (c && !porClave[c]) porClave[c] = o; });
  let i = 0;
  nuevos.forEach(function(n){
    let o = viejo.childNodes[i] || null;
    const c = fsdClaveNodo(n);
    if (c && porClave[c] && porClave[c] !== o) { viejo.insertBefore(porClave[c], o); o = porClave[c]; }
    if (o && fsdMismoNodo(o, n)) {
      if (o.nodeType !== 1) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; }
      else if (opc.saltar && o.matches(opc.saltar)) { /* se deja como está */ }
      else if (opc.bloque && o.matches(opc.bloque)) { if (o.outerHTML !== n.outerHTML) viejo.replaceChild(n, o); }
      else { fsdParcharAtributos(o, n, opc); fsdParchear(o, n, opc); }
    } else viejo.insertBefore(n, o);
    if (c) delete porClave[c];
    i++;
  });
  while (viejo.childNodes.length > i) viejo.removeChild(viejo.lastChild);
}

/* ¿se ve? (si la zona está oculta, no hay parpadeo posible y se pinta como siempre) */
function fsdSeVe(el){ return !!(el && el.isConnected && el.getClientRects().length); }

/* Ejecuta «fn» (que pinta las zonas con esos ids como siempre, con innerHTML) sin que la pantalla parpadee.
   «tirar»: ids cuyo repintado se descarta (lo pinta otra parte de la app). «opc»: { id: opciones de fsdParchear }. */
function fsdSinParpadeo(ids, fn, tirar, opc){
  const zonas = [];
  (ids || []).concat(tirar || []).forEach(function(id){
    const v = document.getElementById(id);
    if (!fsdSeVe(v) && (tirar || []).indexOf(id) < 0) return;
    if (!v || !v.parentNode) return;
    const t = v.cloneNode(false);
    // la copia va ANTES de la original: así getElementById (también el de lo que hay dentro) encuentra la copia
    t.style.cssText = (v.getAttribute('style') || '') + ';position:fixed !important;left:-20000px !important;top:0 !important;width:' + (v.getBoundingClientRect().width || 400) + 'px !important;visibility:hidden !important;pointer-events:none !important;';
    t.setAttribute('aria-hidden', 'true'); t.setAttribute('data-fsd-copia', '');
    v.removeAttribute('id');
    // y los ids de lo que hay dentro, para que lo que se busca por id (filtros, gráficos…) se cree en la copia
    const dentro = Array.prototype.map.call(v.querySelectorAll('[id]'), function(e){ const i = e.id; e.removeAttribute('id'); return [e, i]; });
    v.parentNode.insertBefore(t, v);
    zonas.push({ id: id, v: v, t: t, dentro: dentro, tirar: (tirar || []).indexOf(id) > -1 });
  });
  if (!zonas.length) return fn();
  let r;
  try { r = fn(); }
  finally {
    zonas.forEach(function(z){
      z.v.id = z.id;
      z.dentro.forEach(function(x){ if (!x[0].hasAttribute('id')) x[0].id = x[1]; });
      if (!z.t.isConnected) { if (!z.tirar) z.v.remove(); return; }   // el propio pintado la quitó: fuera también de la pantalla
      try { if (!z.tirar) fsdParchear(z.v, z.t, (opc && opc[z.id]) || null); }
      catch (e) { z.v.innerHTML = ''; while (z.t.firstChild) z.v.appendChild(z.t.firstChild); }   // por si acaso, como antes
      z.t.remove();
    });
  }
  return r;
}

/* Entrenamientos / Nutrición: la lista de clientes con su vista previa */
if (typeof enPintarPlanes === 'function') enPintarPlanes = (function(orig){
  return function(){ const a = arguments, s = this; return fsdSinParpadeo(['planesPro'], function(){
    const r = orig.apply(s, a);
    try { if (typeof plDivisores === 'function') plDivisores(); } catch(e){}   // el separador arrastrable, ya en la copia: así se conserva el de la pantalla
    return r;
  }); };
})(enPintarPlanes);
/* lista de chats */
if (typeof pintarChatsPro === 'function') pintarChatsPro = (function(orig){
  return function(){ const a = arguments, s = this; return fsdSinParpadeo(['chatsPro'], function(){ return orig.apply(s, a); }); };
})(pintarChatsPro);
