/* =========================================================
   Fitnessindramas — Modelo de datos (backend · fase 1, 27/10/2026)
   Los planes y el chat se guardan hoy como HTML de la pantalla. Este módulo los convierte en
   DATOS (lector) y vuelve a construir la pantalla a partir de los datos (pintor), para que en
   la fase 5 Firebase guarde datos y no HTML.
   Regla de oro: pintor(lector(html)) → cargarPlan → lector(...) da exactamente los mismos datos
   y la misma pantalla. Lo prueba la batería de ida y vuelta (scratchpad/ux/fase1*.py).
   Nada de esto cambia todavía lo que se guarda ni lo que se ve.
   ========================================================= */
const FSD_MODELO_V = 1;

/* ---------- utilidades ---------- */
function fsdMdDiv(html){ const t = document.createElement('div'); t.innerHTML = html || ''; return t; }
function fsdMdAttr(el, a){ const v = el && el.getAttribute(a); return v == null ? '' : v; }
function fsdMdVal(el){ return el ? fsdMdAttr(el, 'value') : ''; }
function fsdMdTxt(el){ return el ? el.textContent : ''; }
/* data-* que no conocemos: se guardan en «extra» para no perder nada (y la prueba los señala) */
/* atributos que la app calcula sola al pintar (emoji del alimento, icono, marcas de edición): no son datos */
const FSD_MD_DERIVADOS = ['emo', 'ico', 'edit-ready', 'ph'];
function fsdMdExtra(el, conocidos){
  const x = {};
  if (!el) return x;
  Array.prototype.forEach.call(el.attributes, function(a){
    if (a.name.indexOf('data-') !== 0) return;
    const k = a.name.slice(5);
    if (conocidos.indexOf(k) < 0 && FSD_MD_DERIVADOS.indexOf(k) < 0) x[k] = a.value;
  });
  return x;
}
function fsdMdLimpio(o){                      // quita claves vacías para que los datos sean compactos
  Object.keys(o).forEach(function(k){
    const v = o[k];
    if (v === '' || v == null || v === false || (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)) delete o[k];
  });
  return o;
}

/* =========================================================
   1 · ENTRENAMIENTO
   { v, sesiones: [ { titulo, hecha, hechaFecha, ejercicios: [ {
       nombre, musculo, nota, notaPropia, video, v2,
       pauta: { series, reps, rir },                     ← cabecera (Series · Reps · RIR)
       tec, tecPauta,                                     ← técnica (myo, drop, rp)
       grupo, grupoTipo, grupoPauta, grupoMin, rondas,    ← superserie / circuito (EMOM, AMRAP…)
       cardio: { modo, min, intensidad, trabajo, descanso, rondas, hecho, id },
       series: [ { reps, rir, kg, prev, hechas, tipo, nota, rirHecho, ok } ],
       extra } ] } ] }
   ========================================================= */
const FSD_EJ_DATA = ['fid', 'v2', 'video', 'tec', 'tec-p', 'grupo', 'grupo-t', 'grupo-p', 'grupo-min', 'rondas', 'lbl',
  'cardio', 'cd-min', 'cd-int', 'cd-trab', 'cd-desc', 'cd-rondas', 'cd-ok', 'cd-id'];
const FSD_SERIE_DATA = ['reps', 'rir', 'prev', 'tipo', 'nota', 'rirh', 'ok'];
const FSD_SES_DATA = ['fid', 'hecha'];

function fsdEntLeerEj(it){
  const d = it.dataset;
  const nom = it.querySelector('.ex-name-cell');
  const desc = it.querySelector('.ex-desc');
  const f = it.querySelectorAll('.ex-table-row .rx-field');
  const hech = it.querySelectorAll('.sr-hechas .sr-h');
  const ej = {
    id: fsdMdAttr(it, 'data-fid'),
    nombre: fsdMdTxt(nom).replace(/\s*✎\s*$/, '').trim(),
    musculo: fsdMdAttr(nom, 'data-muscle'),
    nota: desc ? desc.textContent : '',
    notaPropia: desc && desc.hasAttribute('data-propia') ? '1' : '',
    video: d.video || '',
    v2: d.v2 || '',
    pauta: fsdMdLimpio({ series: fsdMdVal(f[0]), reps: fsdMdVal(f[1]), rir: fsdMdVal(f[2]) }),
    tec: d.tec || '', tecPauta: d.tecP || '',
    grupo: d.grupo || '', grupoTipo: d.grupoT || '', grupoPauta: d.grupoP || '', grupoMin: d.grupoMin || '', rondas: d.rondas || '',
    cardio: fsdMdLimpio({ modo: d.cardio || '', min: d.cdMin || '', intensidad: d.cdInt || '', trabajo: d.cdTrab || '',
      descanso: d.cdDesc || '', rondas: d.cdRondas || '', hecho: d.cdOk || '', id: d.cdId || '' }),
    series: Array.prototype.map.call(it.querySelectorAll('.ex-series-inputs .serie-in input'), function(p, i){
      return fsdMdLimpio({
        reps: fsdMdAttr(p, 'data-reps'), rir: fsdMdAttr(p, 'data-rir'), kg: fsdMdVal(p), prev: fsdMdAttr(p, 'data-prev'),
        hechas: fsdMdVal(hech[i]), tipo: fsdMdAttr(p, 'data-tipo'), nota: fsdMdAttr(p, 'data-nota'),
        rirHecho: fsdMdAttr(p, 'data-rirh'), ok: fsdMdAttr(p, 'data-ok'),
        extra: fsdMdExtra(p, FSD_SERIE_DATA)
      });
    }),
    extra: fsdMdExtra(it, FSD_EJ_DATA)
  };
  if (!ej.series.length) delete ej.series;
  return fsdMdLimpio(ej);
}
function fsdEntLeer(html){
  const t = fsdMdDiv(html);
  return {
    v: FSD_MODELO_V,
    sesiones: Array.prototype.map.call(t.querySelectorAll('.sesion-card'), function(c){
      return fsdMdLimpio({
        id: fsdMdAttr(c, 'data-fid'),
        titulo: fsdMdTxt(c.querySelector('.sesion-title')),
        hecha: c.classList.contains('hecha') ? '1' : '',
        hechaFecha: fsdMdAttr(c, 'data-hecha'),
        ejercicios: Array.prototype.map.call(c.querySelectorAll('.ex-item'), fsdEntLeerEj),
        extra: fsdMdExtra(c, FSD_SES_DATA)
      });
    })
  };
}

/* ---------- pintor: datos → HTML con las piezas de la propia app ----------
   Solo pone lo esencial (lo que vive en atributos y valores); lo demás (fila del plan, colores
   de RIR, grupos, cardio, vídeo) lo vuelve a dibujar cargarPlan como con cualquier plan guardado. */
function fsdMdPonerData(el, k, v){ if (v != null && v !== '') el.setAttribute('data-' + k, v); else el.removeAttribute('data-' + k); }
function fsdMdPonerExtra(el, x){ Object.keys(x || {}).forEach(function(k){ el.setAttribute('data-' + k, x[k]); }); }
function fsdEntPintarEj(e){
  const p = e.pauta || {}, se = (e.series || []).length;
  const t = fsdMdDiv(filaEjercicio(e.nombre || '', e.musculo || '', se, p.reps != null ? p.reps : '', p.rir != null ? p.rir : ''));
  const it = t.firstElementChild;
  if (!e.v2) it.removeAttribute('data-v2');
  fsdMdPonerData(it, 'fid', e.id);
  const f = it.querySelectorAll('.ex-table-row .rx-field');
  [p.series != null ? p.series : '', p.reps != null ? p.reps : '', p.rir != null ? p.rir : ''].forEach(function(v, i){ if (f[i]) f[i].setAttribute('value', v); });
  const desc = it.querySelector('.ex-desc');
  if (desc) { desc.textContent = e.nota || ''; if (e.notaPropia) desc.setAttribute('data-propia', '1'); }
  fsdMdPonerData(it, 'video', e.video);
  fsdMdPonerData(it, 'tec', e.tec); fsdMdPonerData(it, 'tec-p', e.tecPauta);
  fsdMdPonerData(it, 'grupo', e.grupo); fsdMdPonerData(it, 'grupo-t', e.grupoTipo); fsdMdPonerData(it, 'grupo-p', e.grupoPauta);
  fsdMdPonerData(it, 'grupo-min', e.grupoMin); fsdMdPonerData(it, 'rondas', e.rondas);
  const c = e.cardio || {};
  fsdMdPonerData(it, 'cardio', c.modo); fsdMdPonerData(it, 'cd-min', c.min); fsdMdPonerData(it, 'cd-int', c.intensidad);
  fsdMdPonerData(it, 'cd-trab', c.trabajo); fsdMdPonerData(it, 'cd-desc', c.descanso); fsdMdPonerData(it, 'cd-rondas', c.rondas);
  fsdMdPonerData(it, 'cd-ok', c.hecho); fsdMdPonerData(it, 'cd-id', c.id);
  fsdMdPonerExtra(it, e.extra);
  const ins = it.querySelectorAll('.ex-series-inputs .serie-in input');
  const hech = [];
  (e.series || []).forEach(function(s, i){
    const x = ins[i]; if (!x) return;
    x.setAttribute('placeholder', 'kg');
    x.setAttribute('data-reps', s.reps != null ? s.reps : '');
    x.setAttribute('data-rir', s.rir != null ? s.rir : '');
    fsdMdPonerData(x, 'prev', s.prev);
    x.setAttribute('value', s.kg != null ? s.kg : '');
    fsdMdPonerData(x, 'tipo', s.tipo); fsdMdPonerData(x, 'nota', s.nota); fsdMdPonerData(x, 'rirh', s.rirHecho); fsdMdPonerData(x, 'ok', s.ok);
    fsdMdPonerExtra(x, s.extra);
    hech.push(s.hechas || '');
  });
  if (hech.some(Boolean)) {                     // repeticiones hechas: enSyncSeries las conserva si ya existen
    const cont = it.querySelector('.ex-series-inputs');
    const h = document.createElement('div'); h.className = 'sr-hechas';
    h.innerHTML = hech.map(function(v){ return '<input type="text" inputmode="numeric" class="sr-h" placeholder="reps" value="' + fsdEsc(v) + '">'; }).join('');
    cont.parentNode.insertBefore(h, cont.nextSibling);
  }
  if (typeof pintarVideo === 'function') pintarVideo(it);
  return it.outerHTML;
}
function fsdEntPintar(datos){
  const ses = (datos && datos.sesiones) || [];
  if (!ses.length) return typeof VACIO_ENT !== 'undefined' ? VACIO_ENT : '';
  return ses.map(function(s, i){
    const c = fsdMdDiv(nuevaSesion(i + 1)).firstElementChild;
    c.classList.remove('open');
    const ch = c.querySelector('.sesion-chevron'); if (ch) ch.classList.remove('open');
    const body = c.querySelector('.sesion-body'); body.style.display = 'none';
    fsdMdPonerData(c, 'fid', s.id);
    c.querySelector('.sesion-title').textContent = s.titulo || '';
    if (s.hecha) c.classList.add('hecha');
    fsdMdPonerData(c, 'hecha', s.hechaFecha);
    fsdMdPonerExtra(c, s.extra);
    const btn = body.querySelector('.add-ej-btn');
    btn.insertAdjacentHTML('beforebegin', (s.ejercicios || []).map(fsdEntPintarEj).join(''));
    return c.outerHTML;
  }).join('');
}

/* =========================================================
   2 · NUTRICIÓN
   { v, comidas: [ { titulo, tituloPropio, tomada, tomadaFecha, metas: { p, c, g },
       grupos: { p: [alimento], c: [...], g: [...] },
       extra } ] }
   alimento = { nombre, gramos, fijo, elegido }   (gramos los recalcula la app; fijo = cantidad puesta a mano)
   El objetivo diario (kcal y macros) vive en la ficha del cliente, no aquí.
   ========================================================= */
const FSD_NUT_GRUPOS = [['protein', 'p'], ['carb', 'c'], ['fat', 'g']];
const FSD_MEAL_DATA = ['fid', 'mp', 'mc', 'mf', 'tomada'];
const FSD_CHIP_DATA = ['fid', 'fijo'];
function fsdNutLeerChip(ch){
  const q = ch.querySelector('.chip-qty');
  const g = q ? (q.textContent.match(/(\d+(?:[.,]\d+)?)\s*g/) || [])[1] : '';
  return fsdMdLimpio({
    id: fsdMdAttr(ch, 'data-fid'),
    nombre: Array.prototype.filter.call(ch.childNodes, function(n){ return n.nodeType === 3; }).map(function(n){ return n.textContent; }).join('').trim(),
    gramos: g || '',
    fijo: fsdMdAttr(ch, 'data-fijo'),
    elegido: ch.classList.contains('selected') ? '1' : '',
    extra: fsdMdExtra(ch, FSD_CHIP_DATA)
  });
}
function fsdNutLeer(html){
  const t = fsdMdDiv(html);
  return {
    v: FSD_MODELO_V,
    comidas: Array.prototype.map.call(t.querySelectorAll('.meal-block'), function(b){
      const ti = b.querySelector('.meal-block-title');
      const grupos = {};
      Array.prototype.forEach.call(b.querySelectorAll('.macro-group'), function(gr){
        const lbl = gr.querySelector('.macro-label');
        const cl = FSD_NUT_GRUPOS.filter(function(x){ return lbl && lbl.classList.contains(x[0]); })[0];
        const chips = Array.prototype.filter.call(gr.querySelectorAll('.chips .chip'), function(c){ return !c.classList.contains('chip-add'); }).map(fsdNutLeerChip);
        if (cl && chips.length) grupos[cl[1]] = chips;
      });
      return fsdMdLimpio({
        id: fsdMdAttr(b, 'data-fid'),
        titulo: fsdMdTxt(ti),
        tituloPropio: fsdMdAttr(ti, 'data-custom'),
        tomada: b.classList.contains('eaten') ? '1' : '',
        tomadaFecha: fsdMdAttr(b, 'data-tomada'),
        metas: fsdMdLimpio({ p: fsdMdAttr(b, 'data-mp'), c: fsdMdAttr(b, 'data-mc'), g: fsdMdAttr(b, 'data-mf') }),
        grupos: grupos,
        extra: fsdMdExtra(b, FSD_MEAL_DATA)
      });
    })
  };
}
function fsdNutPintar(datos){
  const com = (datos && datos.comidas) || [];
  if (!com.length) return typeof VACIO_NUT !== 'undefined' ? VACIO_NUT : '';
  return com.map(function(m){
    const cols = [['protein', 'Proteína', '🥩', 'p'], ['carb', 'Carbohidrato', '🍚', 'c'], ['fat', 'Grasa', '🥑', 'g']];
    const mt = m.metas || {};
    const b = document.createElement('div'); b.className = 'meal-block' + (m.tomada ? ' eaten' : '');
    fsdMdPonerData(b, 'fid', m.id); fsdMdPonerData(b, 'mp', mt.p); fsdMdPonerData(b, 'mc', mt.c); fsdMdPonerData(b, 'mf', mt.g); fsdMdPonerData(b, 'tomada', m.tomadaFecha);
    fsdMdPonerExtra(b, m.extra);
    b.innerHTML = '<div class="meal-head" onclick="toggleMealBlock(this)">'
      + '<div class="meal-head-txt"><div class="meal-block-title" onclick="titleClick(event)" oninput="titleEdited(this)" onblur="titleBlur(this)" onkeydown="titleKey(event,this)"' + (m.tituloPropio ? ' data-custom="' + fsdEsc(m.tituloPropio) + '"' : '') + '>' + fsdEsc(m.titulo || '') + '</div><div class="meal-summary"></div></div>'
      + '<div class="meal-actions"><span class="meal-eat" onclick="toggleComida(event,this)" title="Marcar como tomada">✓</span><span class="meal-del" onclick="removeMeal(event,this)">×</span><span class="meal-chevron">⌄</span></div>'
      + '</div><div class="meal-body">'
      + cols.map(function(c){
          const lista = (m.grupos || {})[c[3]] || [];
          return '<div class="macro-group"><div class="macro-label ' + c[0] + '"><span class="macro-ico">' + c[2] + '</span>' + c[1] + '</div><div class="chips">'
            + lista.map(function(a){
                const ch = document.createElement('div'); ch.className = 'chip ' + c[0] + (a.elegido ? ' selected' : '');
                ch.textContent = a.nombre || '';
                fsdMdPonerData(ch, 'fid', a.id); fsdMdPonerData(ch, 'fijo', a.fijo); fsdMdPonerExtra(ch, a.extra);
                if (a.gramos) ch.insertAdjacentHTML('beforeend', '<span class="chip-qty">· ' + fsdEsc(a.gramos) + ' g</span>');
                return ch.outerHTML;
              }).join('')
            + '</div></div>';
        }).join('')
      + '</div>';
    return b.outerHTML;
  }).join('');
}

/* ---------- comprobación en el propio dispositivo (Ajustes → Copias de seguridad) ----------
   Recorre todos los clientes de este dispositivo y mira que entreno, nutrición y chat hagan la ida y
   vuelta a datos sin perder nada. No envía nada a ningún sitio. */
function fsdMdComprobar(){
  const r = { clientes: 0, mal: [], raros: [] };
  const vuelta = function(leer, pintar, h){ const d = leer(h); return fsdMdIgual(leer(pintar(d)), d) ? d : null; };
  const parte = { 'entreno': [fsdEntSeparar, fsdEntUnir], 'nutrición': [fsdNutSeparar, fsdNutUnir] };
  Object.keys(PLANES).forEach(function(k){
    const p = PLANES[k] || {}, nom = (clientesData[k] || {}).nombre || k;
    r.clientes++;
    try {
      const partes = [['entreno', fsdEntLeer, fsdEntPintar, p.ent], ['nutrición', fsdNutLeer, fsdNutPintar, p.nut], ['chat', fsdChatLeer, fsdChatPintar, p.chat]];
      partes.forEach(function(x){
        const d = vuelta(x[1], x[2], x[3]);
        if (!d) { r.mal.push(nom + ' · ' + x[0]); return; }
        const sp = parte[x[0]]; if (sp) { const y = sp[0](d); if (!fsdMdIgual(sp[1](y.pauta, y.registro), d)) { r.mal.push(nom + ' · ' + x[0] + ' (pauta y registro)'); return; } }
        const j = JSON.stringify(d);
        if (j.indexOf('"extra":') > -1 || j.indexOf('"desconocido":') > -1) r.raros.push(nom + ' · ' + x[0]);
      });
    } catch(e){ r.mal.push(nom + ' · error'); }
  });
  return r;
}
function fsdMdInforme(){
  const r = fsdMdComprobar();
  const ok = !r.mal.length && !r.raros.length;
  abrirDialogo({
    titulo: ok ? '✓ Datos listos para la migración' : 'Revisión de datos para la migración',
    texto: ok
      ? (r.clientes === 1 ? 'Se ha revisado el único cliente' : 'Se han revisado los ' + r.clientes + ' clientes') + ' de este dispositivo: entrenos, planes de nutrición y chats se convierten a datos sin perder nada.'
      : 'Clientes revisados: ' + r.clientes + '.'
        + (r.mal.length ? '\n\nNo hacen bien la conversión (' + r.mal.length + '):\n· ' + r.mal.slice(0, 12).join('\n· ') : '')
        + (r.raros.length ? '\n\nTienen algún dato que la conversión aún no reconoce, aunque no se pierde (' + r.raros.length + '):\n· ' + r.raros.slice(0, 12).join('\n· ') : '')
        + '\n\nHaz una captura de este mensaje y pásasela a Claude. Tus datos no se han tocado.',
    ok: 'Entendido', soloOk: true
  });
}

/* =========================================================
   3 · CHAT
   { v, mensajes: [ { lado: 'in' (equipo) | 'out' (cliente), de, ts, hora, tipo: texto|foto|audio|eliminado,
       texto, foto: { src, alt }, audio: { src, dur, ondas: [alturas] },
       cita: { n, t, quien, vista }, reenviado, mencion, clases, extra } ] }
   El mensaje fijado y las dudas viven en la ficha del cliente (chatFijo, dudas), no aquí.
   ========================================================= */
const FSD_MSG_CLASES = ['bubble', 'in', 'out', 'mencion', 'msg-del'];
const FSD_MSG_DATA = ['fid', 'ts', 'hora'];
const FSD_MSG_PIEZAS = '.sender, .rp-q, .fw-tag, .mencion-tag, img, .audio-b, .msg-del-t';
function fsdChatLeerMsg(b){
  const m = { id: fsdMdAttr(b, 'data-fid'), lado: b.classList.contains('in') ? 'in' : 'out' };
  const s = b.querySelector(':scope > .sender'); if (s) m.de = s.textContent;
  m.ts = fsdMdAttr(b, 'data-ts'); m.hora = fsdMdAttr(b, 'data-hora');
  const q = b.querySelector(':scope > .rp-q');
  if (q) m.cita = fsdMdLimpio({ id: fsdMdAttr(q, 'data-mid'), n: fsdMdAttr(q, 'data-n'), t: fsdMdAttr(q, 'data-t'), quien: fsdMdTxt(q.querySelector('b')), vista: fsdMdTxt(q.querySelector('span')) });
  if (b.querySelector(':scope > .fw-tag')) m.reenviado = '1';
  const mt = b.querySelector(':scope > .mencion-tag'); if (mt) m.mencion = mt.textContent;
  const img = b.querySelector(':scope > img');
  const au = b.querySelector(':scope > .audio-b');
  if (b.classList.contains('msg-del')) m.tipo = 'eliminado';
  else if (au) {
    m.tipo = 'audio';
    const a = au.querySelector('audio');
    m.audio = fsdMdLimpio({ src: fsdMdAttr(a, 'src'), dur: fsdMdAttr(au, 'data-dur'), durTxt: fsdMdTxt(au.querySelector('.audio-dur')),
      ondas: Array.prototype.map.call(au.querySelectorAll('.wave i'), function(i){ return parseInt(i.style.height, 10) || 0; }) });
  } else if (img) { m.tipo = 'foto'; m.foto = fsdMdLimpio({ src: fsdMdAttr(img, 'src'), alt: fsdMdAttr(img, 'alt') }); }
  else m.tipo = 'texto';
  /* texto: nodos de texto y <br> sueltos (lo demás son las piezas de arriba) */
  let t = '', raro = [];
  Array.prototype.forEach.call(b.childNodes, function(n){
    if (n.nodeType === 3) t += n.textContent;
    else if (n.nodeType === 1 && n.tagName === 'BR') t += '\n';
    else if (n.nodeType === 1 && !n.matches(FSD_MSG_PIEZAS)) raro.push(n.outerHTML);
  });
  m.texto = t;
  m.clases = Array.prototype.filter.call(b.classList, function(c){ return FSD_MSG_CLASES.indexOf(c) < 0; }).join(' ');
  if (raro.length) m.desconocido = raro;                 // no debería pasar: la prueba lo señala
  m.extra = fsdMdExtra(b, FSD_MSG_DATA);
  return fsdMdLimpio(m);
}
function fsdChatLeer(html){
  const t = fsdMdDiv(html);
  return { v: FSD_MODELO_V, mensajes: Array.prototype.map.call(t.querySelectorAll(':scope > .bubble'), fsdChatLeerMsg) };
}
function fsdChatPintar(datos){
  const ms = (datos && datos.mensajes) || [];
  if (!ms.length) return '<div class="picker-empty" id="chatVacio">Aún no hay mensajes. Escribe el primero.</div>';
  return ms.map(function(m){
    const b = document.createElement('div');
    b.className = 'bubble ' + (m.lado === 'in' ? 'in' : 'out');
    if (m.mencion != null) b.classList.add('mencion');
    if (m.tipo === 'eliminado') b.classList.add('msg-del');
    (m.clases || '').split(' ').filter(Boolean).forEach(function(c){ b.classList.add(c); });
    fsdMdPonerData(b, 'fid', m.id); fsdMdPonerData(b, 'ts', m.ts); fsdMdPonerData(b, 'hora', m.hora); fsdMdPonerExtra(b, m.extra);
    if (m.de != null) { const s = document.createElement('div'); s.className = 'sender'; s.textContent = m.de; b.appendChild(s); }
    if (m.cita) {
      const q = document.createElement('div'); q.className = 'rp-q';
      fsdMdPonerData(q, 'mid', m.cita.id); fsdMdPonerData(q, 'n', m.cita.n); q.setAttribute('data-t', m.cita.t || '');
      q.innerHTML = '<b>' + fsdEsc(m.cita.quien || '') + '</b><span>' + fsdEsc(m.cita.vista || '') + '</span>';
      b.appendChild(q);
    }
    if (m.reenviado) b.insertAdjacentHTML('beforeend', '<div class="fw-tag">↪ Reenviado</div>');
    if (m.mencion != null) { const mt = document.createElement('span'); mt.className = 'mencion-tag'; mt.textContent = m.mencion; b.appendChild(mt); }
    if (m.tipo === 'eliminado') b.insertAdjacentHTML('beforeend', '<span class="msg-del-t">🚫 Mensaje eliminado</span>');
    else if (m.tipo === 'foto' && m.foto) { const i = document.createElement('img'); i.src = m.foto.src || ''; if (m.foto.alt != null) i.alt = m.foto.alt; b.appendChild(i); }
    else if (m.tipo === 'audio' && m.audio) {
      const w = document.createElement('div'); w.className = 'audio-b'; fsdMdPonerData(w, 'dur', m.audio.dur);
      w.innerHTML = '<button class="audio-play" onclick="reproducirAudio(this)">▶</button><span class="wave">'
        + (m.audio.ondas || []).map(function(h){ return '<i style="height:' + (+h || 0) + 'px"></i>'; }).join('') + '</span>'
        + '<span class="audio-dur">' + fsdEsc(m.audio.durTxt || '') + '</span>';
      if (m.audio.src) { const a = document.createElement('audio'); a.src = m.audio.src; a.preload = 'metadata'; a.style.display = 'none'; w.appendChild(a); }
      b.appendChild(w);
    }
    (m.texto || '').split('\n').forEach(function(l, i){ if (i) b.appendChild(document.createElement('br')); if (l) b.appendChild(document.createTextNode(l)); });
    return b.outerHTML;
  }).join('');
}

/* =========================================================
   4 · IDENTIFICADORES FIJOS (fase 2b, 27/10/2026)
   Cada sesión, ejercicio, comida, alimento del plan y mensaje lleva data-fid. Se pone a lo que no lo
   tenga (también a lo ya creado) y se renueva si dos elementos comparten id (al duplicar se copia).
   Mover algo conserva su id. No cambia nada de lo que se ve.
   ========================================================= */
const FSD_FID_SEL = ['.sesion-card', '.ex-item', '.meal-block', '.macro-group .chip:not(.chip-add)', '.bubble'];
function fsdMdNuevoId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function fsdMdIds(raiz){
  if (!raiz) return 0;
  let n = 0;
  FSD_FID_SEL.forEach(function(sel){
    const vistos = {};
    Array.prototype.forEach.call(raiz.querySelectorAll(sel), function(el){
      let id = el.getAttribute('data-fid');
      if (!id || vistos[id]) { id = fsdMdNuevoId(); el.setAttribute('data-fid', id); n++; }
      vistos[id] = 1;
    });
  });
  return n;
}
function fsdMdIdsHtml(html){ const t = fsdMdDiv(html); return fsdMdIds(t) ? t.innerHTML : html; }
/* al guardar: lo que está en pantalla recibe sus ids antes de convertirse en HTML guardado */
guardarPlan = (function(orig){
  return function(){
    try { fsdMdIds(contEnt()); fsdMdIds(contNut()); } catch(e){}
    return orig.apply(this, arguments);
  };
})(guardarPlan);
guardarChat = (function(orig){
  return function(){
    try { fsdMdIds(document.getElementById('chatList')); } catch(e){}
    return orig.apply(this, arguments);
  };
})(guardarChat);
/* los planes y chats de clientes que no están abiertos también reciben ids, una vez, al arrancar */
function fsdMdIdsTodos(){
  let cambio = false;
  Object.keys(PLANES || {}).forEach(function(k){
    const p = PLANES[k]; if (!p || k === clienteActual) return;
    ['ent', 'nut', 'chat'].forEach(function(c){
      if (typeof p[c] !== 'string' || !p[c]) return;
      const h = fsdMdIdsHtml(p[c]); if (h !== p[c]) { p[c] = h; cambio = true; }
    });
  });
  if (cambio) { try { guardarTodo(); } catch(e){} }
}
window.addEventListener('load', function(){ setTimeout(function(){ try { fsdMdIdsTodos(); } catch(e){} }, 1500); });

/* ---------- referencias a mensajes por id (fijado, dudas, respuestas citadas) ----------
   Se guarda el id junto a lo de antes (posición y texto), y al buscar se usa primero el id. */
function fsdMdMsgPorId(id){ if (!id) return null; const l = document.getElementById('chatList'); return l ? l.querySelector('.bubble[data-fid="' + String(id).replace(/["\\]/g, '') + '"]') : null; }
function fsdMdIdDe(b){ if (!b) return ''; if (!b.getAttribute('data-fid')) b.setAttribute('data-fid', fsdMdNuevoId()); return b.getAttribute('data-fid'); }
if (typeof cmFijar === 'function') cmFijar = (function(orig){
  return function(b){
    const r = orig.apply(this, arguments);
    const d = clientesData[clienteActual]; if (d && d.chatFijo) { d.chatFijo.mid = fsdMdIdDe(b); try { guardarTodo(); } catch(e){} }
    return r;
  };
})(cmFijar);
if (typeof cmFijoDe === 'function') cmFijoDe = (function(orig){
  return function(b){
    const f = (clientesData[clienteActual] || {}).chatFijo;
    if (f && f.mid && b) return b.getAttribute('data-fid') === f.mid;
    return orig.apply(this, arguments);
  };
})(cmFijoDe);
if (typeof ddCrearDuda === 'function') ddCrearDuda = (function(orig){
  return function(b){
    const k = clienteActual, mid = fsdMdIdDe(b), antes = ddLista(k).length;
    const r = orig.apply(this, arguments);
    const l = ddLista(k); if (l.length > antes) { l[l.length - 1].mid = mid; try { guardarTodo(); } catch(e){} }
    return r;
  };
})(ddCrearDuda);
if (typeof ddBuscar === 'function') ddBuscar = (function(orig){
  return function(du, bs){
    if (du && du.mid) { const b = fsdMdMsgPorId(du.mid); if (b) return b; }
    return orig.apply(this, arguments);
  };
})(ddBuscar);
/* respuesta citada: la cita guarda el id del mensaje original */
if (typeof cmResponder === 'function') cmResponder = (function(orig){
  return function(b){ const r = orig.apply(this, arguments); if (cmReply) cmReply.mid = fsdMdIdDe(b); return r; };
})(cmResponder);
sendMsg = (function(orig){
  return function(){
    const mid = typeof cmReply !== 'undefined' && cmReply ? cmReply.mid : '';
    const l = document.getElementById('chatList'), antes = l ? l.querySelectorAll('.bubble').length : 0;
    const r = orig.apply(this, arguments);
    if (mid && l) {
      const bs = l.querySelectorAll('.bubble'), b = bs.length > antes ? bs[bs.length - 1] : null, q = b && b.querySelector('.rp-q');
      if (q && !q.getAttribute('data-mid')) { q.setAttribute('data-mid', mid); try { guardarChat(); guardarTodo(); } catch(e){} }
    }
    return r;
  };
})(sendMsg);
document.addEventListener('click', function(e){
  const q = e.target.closest && e.target.closest('#chatList .rp-q[data-mid]'); if (!q) return;
  const o = fsdMdMsgPorId(q.getAttribute('data-mid'));
  if (o && typeof cmFlash === 'function') { e.stopImmediatePropagation(); cmFlash(o); }
}, true);
/* al borrar un mensaje: el fijado, las dudas y las citas que lo señalan por id también lo sueltan */
if (typeof cmBorrar === 'function') cmBorrar = (function(orig){
  return function(b){
    const mid = b && b.getAttribute('data-fid'), d = clientesData[clienteActual];
    const r = orig.apply(this, arguments);
    if (mid && d) {
      if (d.chatFijo && d.chatFijo.mid === mid) d.chatFijo = null;
      if (Array.isArray(d.dudas)) d.dudas = d.dudas.filter(function(x){ return x.mid !== mid; });
      Array.prototype.forEach.call(document.querySelectorAll('#chatList .rp-q[data-mid="' + mid + '"]'), function(q){ q.dataset.t = ''; const sp = q.querySelector('span'); if (sp) sp.textContent = '🚫 Mensaje eliminado'; });
    }
    return r;
  };
})(cmBorrar);

/* =========================================================
   5 · PAUTA (la escribe el profesional) Y REGISTRO (lo apunta el cliente), por separado
   En Firebase irán a documentos distintos (planes/entreno · registroEntreno, planes/nutricion · diario)
   para que el servidor pueda impedir que el cliente toque la pauta y que el profesional pise lo apuntado.
   unir(separar(datos)) devuelve exactamente los mismos datos.
   ========================================================= */
const FSD_SERIE_CLIENTE = ['kg', 'prev', 'hechas', 'rirHecho', 'ok'];
function fsdMdCopia(o){ return JSON.parse(JSON.stringify(o || {})); }
function fsdMdClave(o, alt){ return (o && o.id) || alt; }
function fsdEntSeparar(datos){
  const pauta = fsdMdCopia(datos), reg = { v: FSD_MODELO_V, sesiones: {}, ejercicios: {} };
  (pauta.sesiones || []).forEach(function(s, i){
    const ks = fsdMdClave(s, 's' + i);
    const rs = fsdMdLimpio({ hecha: s.hecha, hechaFecha: s.hechaFecha });
    delete s.hecha; delete s.hechaFecha;
    if (Object.keys(rs).length) reg.sesiones[ks] = rs;
    (s.ejercicios || []).forEach(function(e, j){
      const ke = fsdMdClave(e, ks + 'e' + j), re = {};
      if (e.cardio && e.cardio.hecho) { re.cardioHecho = e.cardio.hecho; delete e.cardio.hecho; if (!Object.keys(e.cardio).length) delete e.cardio; }
      const ser = (e.series || []).map(function(x){
        const o = {}; FSD_SERIE_CLIENTE.forEach(function(c){ if (x[c] != null) { o[c] = x[c]; delete x[c]; } }); return o;
      });
      if (ser.some(function(o){ return Object.keys(o).length; })) re.series = ser;
      if (Object.keys(re).length) reg.ejercicios[ke] = re;
    });
  });
  return { pauta: pauta, registro: reg };
}
function fsdEntUnir(pauta, reg){
  const d = fsdMdCopia(pauta); reg = reg || {};
  (d.sesiones || []).forEach(function(s, i){
    const ks = fsdMdClave(s, 's' + i), rs = (reg.sesiones || {})[ks];
    if (rs) { if (rs.hecha) s.hecha = rs.hecha; if (rs.hechaFecha) s.hechaFecha = rs.hechaFecha; }
    (s.ejercicios || []).forEach(function(e, j){
      const re = (reg.ejercicios || {})[fsdMdClave(e, ks + 'e' + j)]; if (!re) return;
      if (re.cardioHecho) { e.cardio = e.cardio || {}; e.cardio.hecho = re.cardioHecho; }
      (re.series || []).forEach(function(o, n){ const x = (e.series || [])[n]; if (x) FSD_SERIE_CLIENTE.forEach(function(c){ if (o[c] != null) x[c] = o[c]; }); });
    });
  });
  return d;
}
function fsdNutSeparar(datos){
  const pauta = fsdMdCopia(datos), reg = { v: FSD_MODELO_V, comidas: {}, elegidos: {} };
  (pauta.comidas || []).forEach(function(m, i){
    const km = fsdMdClave(m, 'm' + i);
    const rm = fsdMdLimpio({ tomada: m.tomada, tomadaFecha: m.tomadaFecha });
    delete m.tomada; delete m.tomadaFecha;
    if (Object.keys(rm).length) reg.comidas[km] = rm;
    Object.keys(m.grupos || {}).forEach(function(g){
      m.grupos[g].forEach(function(a, j){ if (a.elegido) { reg.elegidos[fsdMdClave(a, km + g + j)] = a.elegido; delete a.elegido; } });
    });
  });
  return { pauta: pauta, registro: reg };
}
function fsdNutUnir(pauta, reg){
  const d = fsdMdCopia(pauta); reg = reg || {};
  (d.comidas || []).forEach(function(m, i){
    const km = fsdMdClave(m, 'm' + i), rm = (reg.comidas || {})[km];
    if (rm) { if (rm.tomada) m.tomada = rm.tomada; if (rm.tomadaFecha) m.tomadaFecha = rm.tomadaFecha; }
    Object.keys(m.grupos || {}).forEach(function(g){
      m.grupos[g].forEach(function(a, j){ const v = (reg.elegidos || {})[fsdMdClave(a, km + g + j)]; if (v) a.elegido = v; });
    });
  });
  return d;
}
/* comparación de datos sin depender del orden de las claves */
function fsdMdOrden(o){
  if (Array.isArray(o)) return o.map(fsdMdOrden);
  if (o && typeof o === 'object') { const r = {}; Object.keys(o).sort().forEach(function(k){ r[k] = fsdMdOrden(o[k]); }); return r; }
  return o;
}
function fsdMdIgual(a, b){ return JSON.stringify(fsdMdOrden(a)) === JSON.stringify(fsdMdOrden(b)); }
