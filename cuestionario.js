/* =========================================================
   Fitnessindramas — Bienvenida en 5 toques + consentimientos + cuestionario inicial (25/10/2026, #223)
   Cliente nuevo (sin seguimientos):
   1. Recorrido por Hoy · Nutrición · Entreno · Chat · Ajustes: un toque por pestaña (5 en total).
   2. Consentimientos (salud e imagen): justo después del recorrido, no al entrar.
   3. Cuestionario inicial (Word «Cuestionario inicial asesoría V5»), en 7 pasos, con borrador.
      Las alergias e intolerancias son las mismas de siempre (clientesData[k].alergias), no se duplican;
      se añaden las enfermedades gastrointestinales en ese mismo apartado (alergias.gastro).
   Se guarda en clientesData[k].cuestionario = { fecha, v, r } y avisa a Domingo y Fátima.
   El DNI va a clientesData[k].dni (para las facturas). Nunca en el código.
   ========================================================= */

/* ---------- 1 · recorrido de 5 toques ---------- */
const OB_TOUR = [
  { tab: 'hoy', id: 'tab-hoy', e: '☀️', t: 'Hoy', l: ['Lo que te toca hoy: entreno, la comida de ahora y los avisos de tu equipo.', 'Una vez por semana, desde aquí harás tu seguimiento.'] },
  { tab: 'plan', id: 'tab-plan', e: '🍕', t: 'Nutrición', l: ['Tu plan con las cantidades ya calculadas. Toca una opción para cambiarla o combinar hasta 3.', 'Apunta tus vasos de agua y saca la lista de la compra.'] },
  { tab: 'entreno', id: 'tab-entreno', e: '🏋️', t: 'Entreno', l: ['Tus sesiones. Abre un ejercicio para ver cómo se hace.', 'Apunta el peso y las repeticiones de cada serie; el descanso se cuenta solo.'] },
  { tab: 'chat', id: 'tab-chat', e: '💬', t: 'Chat', l: ['Domingo y Fátima, en la misma conversación.', 'Escribe, manda fotos o notas de voz cuando lo necesites.'] },
  { tab: 'ajustes', id: 'tab-ajustes', e: '⚙️', t: 'Ajustes', l: ['Tu perfil, tus alergias, las notificaciones y la privacidad.', 'Desde aquí también cierras sesión.'] }
];
obPasos = function(){ return OB_TOUR; };
obAbrir = function(){
  obCerrar(); obPaso = 0;
  const o = document.createElement('div'); o.id = 'obBienvenida'; o.className = 'ob-capa ob-tour';
  o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-labelledby', 'obTit');
  (document.getElementById('screenRoot') || document.body).appendChild(o);
  o.addEventListener('click', function(e){
    const b = e.target.closest('[data-ob]'); if (!b) return;
    const a = b.dataset.ob;
    if (a === 'sig') { if (obPaso < OB_TOUR.length - 1) { obPaso++; obPintar(); } else obTerminar(); }
    else if (a === 'saltar') obTerminar();
  });
  obPintar();
};
obPintar = function(){
  const o = document.getElementById('obBienvenida'); if (!o) return;
  const p = OB_TOUR[obPaso], n = OB_TOUR.length, ult = obPaso === n - 1;
  try { goTo(p.tab, true); } catch(e){}
  const d = clientesData[clienteActual] || {}, nom = ((d.nombre || '').split(' ')[0]) || '';
  const inst = ult && !obInstalada() ? '<p class="obt-tip">📲 Consejo: instálala en tu móvil (' + (obIos() ? 'Safari → Compartir → «Añadir a pantalla de inicio»' : 'menú ⋮ → «Instalar aplicación»') + ').</p>' : '';
  o.innerHTML = '<div class="obt-foco" aria-hidden="true"></div>'
    + '<div class="obt-card">'
    + (obPaso === 0 ? '<p class="obt-hola">¡Hola' + (nom ? ', ' + esc(nom) : '') + '! Te enseñamos la app en 5 toques.</p>' : '')
    + '<div class="obt-top"><span class="obt-e" aria-hidden="true">' + p.e + '</span><h2 id="obTit">' + p.t + '</h2><span class="obt-n">' + (obPaso + 1) + ' / ' + n + '</span></div>'
    + '<ul class="obt-l">' + p.l.map(function(x){ return '<li>' + x + '</li>'; }).join('') + '</ul>' + inst
    + '<div class="obt-acts"><button type="button" class="obt-saltar" data-ob="saltar">Saltar</button>'
    + '<button type="button" class="btn-primary obt-sig" data-ob="sig">' + (ult ? 'Empezar ✓' : 'Siguiente') + '</button></div>'
    + '<div class="ob-puntos" aria-hidden="true">' + OB_TOUR.map(function(x, i){ return '<i class="' + (i === obPaso ? 'on' : '') + '"></i>'; }).join('') + '</div></div>';
  requestAnimationFrame(function(){ obFoco(p.id); });
  try { o.querySelector('.obt-sig').focus({ preventScroll: true }); } catch(e){}
};
function obFoco(id){
  const o = document.getElementById('obBienvenida'), f = o && o.querySelector('.obt-foco'), b = document.getElementById(id);
  if (!f) return;
  const r = b && b.offsetParent ? b.getBoundingClientRect() : null;
  if (!r || !r.width) { f.hidden = true; return; }
  f.hidden = false;
  f.style.left = (r.left - 6) + 'px'; f.style.top = (r.top - 6) + 'px';
  f.style.width = (r.width + 12) + 'px'; f.style.height = (r.height + 12) + 'px';
  const card = o.querySelector('.obt-card');
  if (card) card.style.bottom = Math.max(16, window.innerHeight - r.top + 14) + 'px';
}
window.addEventListener('resize', function(){ if (document.getElementById('obBienvenida')) obFoco(OB_TOUR[obPaso].id); });
obTerminar = function(){
  const d = clientesData[clienteActual]; if (d) { d.bienvenida = new Date().toISOString(); try { guardarTodo(); } catch(e){} }
  obCerrar();
  try { goTo('hoy', true); } catch(e){}
  /* 2 · consentimientos y, después, el cuestionario */
  setTimeout(function(){
    const dd = clientesData[clienteActual];
    if (!dd) return;
    if (!(dd.consentSalud && dd.consentSalud.fecha)) { comprobarConsentSalud(); return; }
    if (typeof ciDecidido === 'function' && !ciDecidido(dd)) { comprobarConsentImagen(); return; }
    cqIntro();
  }, 250);
};
/* atrás durante el recorrido: un paso atrás (o salir en el primero) */
atrasDentroApp = (function(orig){
  return function(){
    if (document.getElementById('obBienvenida')) { if (obPaso > 0) { obPaso--; obPintar(); } else obTerminar(); return true; }
    return orig.apply(this, arguments);
  };
})(atrasDentroApp);

/* los consentimientos esperan a que termine el recorrido */
function obPendiente(){
  const k = clienteActual, d = k && clientesData[k];
  return !!(d && window.fsdSesionCliente && !isCoachView() && !d.bienvenida && !(SEGUIMIENTOS[k] || []).length);
}
comprobarConsentSalud = (function(orig){ return function(){ if (obPendiente()) return; return orig.apply(this, arguments); }; })(comprobarConsentSalud);
comprobarConsentImagen = (function(orig){ return function(){ if (obPendiente()) return; return orig.apply(this, arguments); }; })(comprobarConsentImagen);
ciGuardar = (function(orig){ return function(){ const r = orig.apply(this, arguments); if (cqToca()) setTimeout(cqIntro, 350); return r; }; })(ciGuardar);

/* ---------- 3 · cuestionario inicial ---------- */
const CQ_GASTRO = [['sii', 'Síndrome del intestino irritable'], ['crohn', 'Enfermedad de Crohn'], ['colitis', 'Colitis ulcerosa'], ['gastritis', 'Gastritis'],
  ['erge', 'Reflujo / ERGE'], ['hiato', 'Hernia de hiato'], ['estrenimiento', 'Estreñimiento crónico'], ['sibo', 'SIBO'], ['diverticulos', 'Diverticulosis / diverticulitis'], ['vesicula', 'Problemas de vesícula']];
const CQ_PASOS = [
  { id: 'ti', e: '🙋', t: 'Sobre ti', intro: 'Sé sincero/a: no estamos aquí para juzgarte. Recuerda que la dieta y el entreno se adaptan a tu vida, no tú a ellos.', c: [
    { id: 'nombre', l: 'Nombre y apellidos (para la factura)', req: 1 },
    { id: 'dni', l: 'DNI o NIE (para la factura)', tipo: 'dni', req: 1, ph: '12345678Z' },
    { id: 'edad', l: 'Edad', tipo: 'num', req: 1, min: 18, max: 99, u: 'años' },
    { id: 'sexo', l: 'Sexo', tipo: 'chips', opts: ['Mujer', 'Hombre', 'Prefiero no decirlo'] },
    { id: 'altura', l: 'Altura', tipo: 'num', req: 1, min: 120, max: 230, u: 'cm' },
    { id: 'peso', l: 'Peso en ayunas', tipo: 'num', req: 1, min: 30, max: 300, u: 'kg', dec: 1 },
    { id: 'trabajo', l: '¿A qué te dedicas?', tipo: 'area' }
  ]},
  { id: 'med', e: '📏', t: 'Medidas', intro: 'Con cinta métrica y sin apretar. Si alguna no puedes tomarla ahora, déjala en blanco.', c: [
    { id: 'cadera', l: 'Cadera', tipo: 'num', u: 'cm', dec: 1, min: 40, max: 200 },
    { id: 'cintura', l: 'Cintura (en el punto más estrecho)', tipo: 'num', u: 'cm', dec: 1, min: 40, max: 200 },
    { id: 'pecho', l: 'Pecho', tipo: 'num', u: 'cm', dec: 1, min: 40, max: 200 },
    { id: 'brazo', l: 'Brazo', tipo: 'num', u: 'cm', dec: 1, min: 10, max: 80 },
    { id: 'muslo', l: 'Muslo', tipo: 'num', u: 'cm', dec: 1, min: 20, max: 120 }
  ], nota: '📸 Al terminar te pediremos 3 fotos (de frente, de perfil y de espaldas). Son MUY importantes en un seguimiento online: en lo que vemos nos basamos para tomar decisiones.' },
  { id: 'ent', e: '🏋️', t: 'Entrenamiento', c: [
    { id: 'ent_enfoque', l: '¿Cómo te gustaría que enfocáramos el entrenamiento para que te divierta y sea un reto? ¿Qué es lo que más te gusta del gimnasio?', tipo: 'area' },
    { id: 'ent_activo', l: '¿Te mantienes activo/a los días de descanso?', tipo: 'area' },
    { id: 'ent_lesiones', l: '¿Tienes alguna lesión o molestia que debamos tener en cuenta?', tipo: 'area' },
    { id: 'ent_motivacion', l: '¿Cuál es tu principal motivación para entrenar? ¿Tienes buena relación con el deporte?', tipo: 'area' },
    { id: 'ent_objetivo', l: 'OBJETIVO principal que quieres lograr con el entrenamiento', tipo: 'area', req: 1, nota: 'Es lo más importante para diseñar tu programa.' }
  ]},
  { id: 'salud', e: '🩺', t: 'Salud y descanso', c: [
    { id: 'patologias', l: '¿Tienes alguna patología, enfermedad o intervención quirúrgica a destacar?', tipo: 'area' },
    { id: 'medicacion', l: '¿Tomas algún tipo de medicación?', tipo: 'area' },
    { id: 'digestiones', l: '¿Cómo son tus digestiones normalmente? (acidez, malestar, reflujo, gases…)', tipo: 'area' },
    { id: 'ciclo', l: '¿Tienes un ciclo menstrual regular?', tipo: 'chips', opts: ['Sí, regular', 'Irregular', 'No tengo / no aplica'], si: function(r){ return r.sexo === 'Mujer'; } },
    { id: 'habitos', l: '¿Fumas o bebes alcohol habitualmente?', tipo: 'area' },
    { id: 'descanso', l: '¿Cómo es tu descanso? Horas de media, horario y si sientes que necesitas siesta.', tipo: 'area' },
    { id: 'descanso_mal', l: 'Si descansas mal, ¿por qué? (cuesta dormirte, te despiertas, estrés, ansiedad, insomnio, duermes pero no descansas)', tipo: 'area' }
  ]},
  { id: 'alg', e: '⚠️', t: 'Alergias, intolerancias y digestivo', especial: 'alergias', c: [
    { id: 'gastro', l: '¿Tienes alguna enfermedad gastrointestinal diagnosticada?', tipo: 'multi', opts: CQ_GASTRO },
    { id: 'gastro_txt', l: 'Otras o detalles', tipo: 'area', ph: 'Por ejemplo: diagnóstico, desde cuándo, qué alimentos te sientan mal…' }
  ]},
  { id: 'nut', e: '🍽️', t: 'Alimentación y hábitos', c: [
    { id: 'rutina', l: 'Cuéntanos tu día a día: horarios, cuántas comidas haces, tiempo que tienes para hacerlas y en cuál tienes más apetito', tipo: 'area' },
    { id: 'c_desayuno', l: 'Un ejemplo de tu desayuno' }, { id: 'c_mm', l: 'Media mañana' }, { id: 'c_almuerzo', l: 'Almuerzo' }, { id: 'c_merienda', l: 'Merienda' }, { id: 'c_cena', l: 'Cena' },
    { id: 'dieta_actual', l: '¿Sigues alguna dieta ahora? Si es así, cuéntanos cómo es', tipo: 'area' },
    { id: 'dietas_antes', l: '¿Cómo ha sido tu experiencia con dietas anteriores?', tipo: 'area' },
    { id: 'donde', l: '¿Sueles comer en casa o fuera? Si es fuera, ¿cómo? (tupper, en el trabajo, restaurante…)', tipo: 'area' },
    { id: 'fuera_frec', l: '¿Con qué frecuencia comes fuera de casa?' },
    { id: 'apetito', l: '¿A qué hora tienes más apetito? ¿Tienes hambre recién levantado/a?', tipo: 'area' },
    { id: 'variar', l: '¿Sueles comer siempre lo mismo o te gusta variar?', tipo: 'chips', opts: ['Siempre lo mismo', 'Me gusta variar', 'Depende'] },
    { id: 'agua', l: '¿Cuánta agua bebes habitualmente?', ph: 'Por ejemplo: 1,5 litros' },
    { id: 'estres', l: 'Cuando tienes estrés o ansiedad…', tipo: 'chips', opts: ['Como de más', 'Dejo de comer', 'No me afecta'] },
    { id: 'favoritos', l: 'Tus alimentos favoritos', tipo: 'area' },
    { id: 'no_gustan', l: 'Alimentos que no te gustan o no te sientan bien', tipo: 'area' },
    { id: 'suplementos', l: '¿Tomas algún suplemento? ¿Cuál?', tipo: 'area' },
    { id: 'debil', l: '¿Cuál dirías que es tu punto débil con la alimentación?', tipo: 'area' },
    { id: 'relacion', l: '¿Consideras que tienes una buena relación con la comida?', tipo: 'area' }
  ]},
  { id: 'obj', e: '🎯', t: 'Objetivos', c: [
    { id: 'objetivo', l: '¿Cuál es tu objetivo principal con esta asesoría?', tipo: 'area', req: 1 },
    { id: 'motiva', l: '¿Qué te motiva a alcanzarlo?', tipo: 'area' },
    { id: 'compromiso', l: 'Del 1 al 10, ¿cuánto te comprometes a trabajar por este objetivo?', tipo: 'escala', req: 1 },
    { id: 'confianza', l: 'Del 1 al 10, ¿cuánta confianza tienes en conseguirlo?', tipo: 'escala', req: 1 },
    { id: 'obstaculos', l: '¿Qué obstáculos o dificultades crees que pueden interferir en tu progreso?', tipo: 'area' }
  ]}
];
let cqPaso = 0, cqR = null, cqGuardarT = null;
function cqToca(){
  const k = clienteActual, d = k && clientesData[k];
  return !!(d && window.fsdSesionCliente && !isCoachView() && !d.cuestionario && !(SEGUIMIENTOS[k] || []).length && d.bienvenida && d.bienvenida !== 'antigua');
}
function cqIntro(){
  if (!cqToca() || document.getElementById('cqHoja') && capaVisible('cqHoja')) return;
  const d = clientesData[clienteActual], empezado = d.cqBorrador && Object.keys(d.cqBorrador.r || {}).length;
  abrirDialogo({ titulo: empezado ? 'Termina tu cuestionario inicial' : 'Último paso: tu cuestionario inicial',
    texto: 'Son 7 pasos cortos (unos 8 minutos) sobre ti, tu entreno, tu salud, tus alergias, tu alimentación y tus objetivos. Con esto Domingo y Fátima preparan tu plan. Se guarda solo: puedes seguir más tarde.',
    ok: empezado ? 'Seguir' : 'Empezar', cancel: 'Más tarde', onOk: cqAbrir });
}
function cqAbrir(){
  const k = clienteActual, d = k && clientesData[k]; if (!d) return;
  const b = d.cqBorrador || {};
  cqR = Object.assign({ nombre: d.nombreFiscal || d.nombre || '' }, b.r || {});
  if (d.cuestionario && d.cuestionario.r) cqR = Object.assign({}, d.cuestionario.r);
  cqPaso = Math.min(CQ_PASOS.length - 1, b.paso || 0);
  cqPintar();
  document.getElementById('cqHoja').classList.add('show');
}
function cqVisible(c){ return !c.si || c.si(cqR); }
function cqCampoHtml(c){
  const v = cqR[c.id], id = 'cq_' + c.id;
  let h = '<div class="field cq-f" data-c="' + c.id + '"><label for="' + id + '">' + esc(c.l) + (c.req ? ' <span class="cq-req" aria-label="obligatorio">*</span>' : '') + '</label>';
  if (c.tipo === 'area') h += '<textarea id="' + id + '" rows="2" class="sg-text" placeholder="' + esc(c.ph || '') + '">' + esc(v || '') + '</textarea>';
  else if (c.tipo === 'chips') h += '<div class="chips cq-chips" role="radiogroup" aria-labelledby="' + id + '">' + c.opts.map(function(o){ return '<button type="button" class="chip protein' + (v === o ? ' selected' : '') + '" role="radio" aria-checked="' + (v === o) + '" data-v="' + esc(o) + '">' + esc(o) + '</button>'; }).join('') + '</div><span id="' + id + '" hidden></span>';
  else if (c.tipo === 'multi') { const sel = Array.isArray(v) ? v : []; h += '<div class="chips cq-multi">' + c.opts.map(function(o){ return '<button type="button" class="chip protein' + (sel.indexOf(o[0]) > -1 ? ' selected' : '') + '" aria-pressed="' + (sel.indexOf(o[0]) > -1) + '" data-v="' + o[0] + '">' + esc(o[1]) + '</button>'; }).join('') + '<button type="button" class="chip protein' + (v === 'ninguna' ? ' selected' : '') + '" data-v="ninguna">Ninguna</button></div><span id="' + id + '" hidden></span>'; }
  else if (c.tipo === 'escala') h += '<div class="cq-escala" role="radiogroup">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(function(n){ return '<button type="button" class="' + (+v === n ? 'on' : '') + '" role="radio" aria-checked="' + (+v === n) + '" data-v="' + n + '">' + n + '</button>'; }).join('') + '</div><span id="' + id + '" hidden></span>';
  else {
    const num = c.tipo === 'num';
    h += '<div class="cq-in' + (c.u ? ' con-u' : '') + '"><input id="' + id + '" type="text" ' + (num ? 'inputmode="decimal"' : (c.tipo === 'dni' ? 'autocapitalize="characters" autocomplete="off" spellcheck="false"' : '')) + ' value="' + esc(v == null ? '' : v) + '" placeholder="' + esc(c.ph || '') + '">' + (c.u ? '<span class="cq-u">' + c.u + '</span>' : '') + '</div>';
  }
  return h + (c.nota ? '<small class="cq-nota">' + esc(c.nota) + '</small>' : '') + '<small class="cq-err" hidden></small></div>';
}
function cqPintar(){
  const o = mjHoja('cqHoja'), p = CQ_PASOS[cqPaso], n = CQ_PASOS.length;
  o.classList.add('cq-capa');
  let cuerpo = (p.intro ? '<p class="cq-intro">' + esc(p.intro) + '</p>' : '');
  if (p.especial === 'alergias') {
    const r = resumenAlergias(alergiasDe(clienteActual));
    cuerpo += '<div class="field cq-f" data-c="alergias"><label>Alergias e intolerancias alimentarias <span class="cq-req">*</span></label>'
      + '<button type="button" class="cq-alg" onclick="cqAlergias()"><span>' + (r.n || r.ok ? esc(r.txt) : 'Marcar alergias e intolerancias') + '</span><span class="chev">›</span></button>'
      + '<small class="cq-nota">Es la misma lista que verá Fátima al preparar tu dieta. Si no tienes ninguna, márcalo también.</small><small class="cq-err" hidden></small></div>';
  }
  cuerpo += p.c.filter(cqVisible).map(cqCampoHtml).join('');
  if (p.nota) cuerpo += '<p class="cq-aviso">' + esc(p.nota) + '</p>';
  o.innerHTML = '<div class="fsd-sheet full cq-sheet"><div class="sheet-head"><h3>Cuestionario inicial</h3><button class="x-btn" onclick="cqCerrar()" aria-label="Cerrar (se guarda lo que llevas)">×</button></div>'
    + '<div class="cq-prog"><span>Paso ' + (cqPaso + 1) + ' de ' + n + ' · ' + esc(p.t) + '</span><div class="cq-barra"><i style="width:' + Math.round((cqPaso + 1) / n * 100) + '%"></i></div></div>'
    + '<div class="cq-paso"><div class="cq-e" aria-hidden="true">' + p.e + '</div>' + cuerpo + '</div>'
    + '<div class="cq-acts">' + (cqPaso ? '<button type="button" class="btn-eq" onclick="cqIr(-1)">Atrás</button>' : '<span></span>')
    + '<button type="button" class="btn-primary" onclick="cqIr(1)">' + (cqPaso < n - 1 ? 'Siguiente' : 'Enviar a mi equipo') + '</button></div></div>';
  const s = o.querySelector('.fsd-sheet'); if (s) s.scrollTop = 0;
  /* lectura de lo que se escribe o se elige */
  o.querySelectorAll('.cq-f').forEach(function(f){
    const c = f.dataset.c;
    const inp = f.querySelector('input, textarea');
    if (inp) inp.addEventListener('input', function(){ cqR[c] = inp.value; f.classList.remove('cq-mal'); const e = f.querySelector('.cq-err'); if (e) e.hidden = true; cqBorrador(); });
    f.querySelectorAll('.cq-chips .chip').forEach(function(b){ b.onclick = function(){ cqR[c] = b.dataset.v; const reP = c === 'sexo'; if (reP) { cqBorrador(); cqPintarMantener(); return; } f.querySelectorAll('.chip').forEach(function(x){ const on = x === b; x.classList.toggle('selected', on); x.setAttribute('aria-checked', on); }); cqBorrador(); }; });
    f.querySelectorAll('.cq-multi .chip').forEach(function(b){ b.onclick = function(){
      let sel = Array.isArray(cqR[c]) ? cqR[c].slice() : [];
      if (b.dataset.v === 'ninguna') sel = cqR[c] === 'ninguna' ? [] : 'ninguna';
      else { if (!Array.isArray(sel)) sel = []; const i = sel.indexOf(b.dataset.v); if (i > -1) sel.splice(i, 1); else sel.push(b.dataset.v); }
      cqR[c] = sel;
      f.querySelectorAll('.chip').forEach(function(x){ const on = sel === 'ninguna' ? x.dataset.v === 'ninguna' : (Array.isArray(sel) && sel.indexOf(x.dataset.v) > -1); x.classList.toggle('selected', on); x.setAttribute('aria-pressed', on); });
      cqBorrador();
    }; });
    f.querySelectorAll('.cq-escala button').forEach(function(b){ b.onclick = function(){ cqR[c] = +b.dataset.v; f.querySelectorAll('button').forEach(function(x){ const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); }); f.classList.remove('cq-mal'); cqBorrador(); }; });
  });
}
function cqPintarMantener(){ const o = document.getElementById('cqHoja'), s = o && o.querySelector('.fsd-sheet'), y = s ? s.scrollTop : 0; cqPintar(); const s2 = document.querySelector('#cqHoja .fsd-sheet'); if (s2) s2.scrollTop = y; }
function cqBorrador(){
  clearTimeout(cqGuardarT);
  cqGuardarT = setTimeout(function(){ const d = clientesData[clienteActual]; if (!d || d.cuestionario) return; d.cqBorrador = { paso: cqPaso, r: cqR, fecha: new Date().toISOString() }; try { guardarTodo(); } catch(e){} }, 400);
}
/* DNI/NIE: admite minúsculas, espacios, puntos, guiones y DNI antiguos de 7 cifras (se completa con un 0 delante) */
const CQ_LETRAS = 'TRWAGMYFPDXBNJZSQVHLCKE';
function cqDniLimpio(v){ return String(v || '').toUpperCase().normalize('NFKC').replace(/[^0-9A-Z]/g, ''); }
function cqDniRevisar(v){
  let x = cqDniLimpio(v);
  if (/^\d{7}[A-Z]$/.test(x)) x = '0' + x;
  let m = x.match(/^(\d{8})([A-Z])$/);
  if (m) { const l = CQ_LETRAS[+m[1] % 23]; return l === m[2] ? { ok: x } : { err: 'La letra no coincide con el número: para ' + m[1] + ' la letra es ' + l + '. Revisa los números o la letra.' }; }
  m = x.match(/^([XYZ])(\d{7})([A-Z])$/);
  if (m) { const l = CQ_LETRAS[+('XYZ'.indexOf(m[1]) + m[2]) % 23]; return l === m[3] ? { ok: x } : { err: 'La letra final no coincide con el NIE: para ' + m[1] + m[2] + ' la letra es ' + l + '.' }; }
  if (/^\d{8}$/.test(x)) return { err: 'Falta la letra del final del DNI (por ejemplo 12345678Z).' };
  return { err: 'Escribe el DNI (8 números y la letra) o el NIE (X, Y o Z, 7 números y la letra).' };
}
function cqDniOk(v){ return cqDniRevisar(v).ok || null; }
function cqValidar(){
  const p = CQ_PASOS[cqPaso], o = document.getElementById('cqHoja'); let primero = null;
  const mal = function(id, txt){ const f = o.querySelector('.cq-f[data-c="' + id + '"]'); if (!f) return; f.classList.add('cq-mal'); const e = f.querySelector('.cq-err'); if (e) { e.hidden = false; e.textContent = txt; } if (!primero) primero = f; };
  o.querySelectorAll('.cq-err').forEach(function(e){ e.hidden = true; });
  p.c.filter(cqVisible).forEach(function(c){
    const v = cqR[c.id], vacio = v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length);
    if (c.req && vacio) { mal(c.id, 'Este dato es necesario.'); return; }
    if (vacio) return;
    if (c.tipo === 'num') { const n = mjNum(v); if (n == null || isNaN(n) || (c.min != null && n < c.min) || (c.max != null && n > c.max)) mal(c.id, 'Revisa el número' + (c.min != null ? ' (entre ' + c.min + ' y ' + c.max + (c.u ? ' ' + c.u : '') + ')' : '') + '.'); }
    if (c.tipo === 'dni') { const rv = cqDniRevisar(v); if (rv.err) mal(c.id, rv.err); else { cqR[c.id] = rv.ok; const inp = document.getElementById('cq_dni'); if (inp) inp.value = rv.ok; } }
  });
  if (p.especial === 'alergias') { const a = alergiasDe(clienteActual); if (!(a && a.fecha)) mal('alergias', 'Marca tus alergias o indica que no tienes ninguna.'); }
  if (primero) { try { primero.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch(e){} toast('Revisa lo marcado en rojo'); return false; }
  return true;
}
function cqIr(dir){
  if (dir > 0 && !cqValidar()) return;
  if (dir > 0 && cqPaso === CQ_PASOS.length - 1) { cqEnviar(); return; }
  cqPaso = Math.max(0, Math.min(CQ_PASOS.length - 1, cqPaso + dir));
  cqBorrador(); cqPintar();
}
function cqCerrar(){
  clearTimeout(cqGuardarT);
  const d = clientesData[clienteActual];
  if (d && !d.cuestionario && cqR) { d.cqBorrador = { paso: cqPaso, r: cqR, fecha: new Date().toISOString() }; try { guardarTodo(); } catch(e){} }
  const o = document.getElementById('cqHoja'); if (o) { delete o.dataset.capaSucia; o.classList.remove('show'); }
  try { mjAvisoAlergiasHoy(); } catch(e){}
  if (d && !d.cuestionario) toast('Guardado. Puedes terminarlo desde «Hoy».');
}
function cqAlergias(){
  abrirAlergias();
  const s = document.getElementById('alergiasSheet'), q = document.getElementById('cqHoja');
  if (s && q && q.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_PRECEDING) q.parentNode.insertBefore(s, q.nextSibling);   // por encima del cuestionario
}
guardarAlergias = (function(orig){ return function(){ const r = orig.apply(this, arguments); if (capaVisible('cqHoja')) cqPintarMantener(); return r; }; })(guardarAlergias);
function cqEnviar(){
  const k = clienteActual, d = clientesData[k]; if (!d) return;
  clearTimeout(cqGuardarT);
  const r = JSON.parse(JSON.stringify(cqR || {}));
  const primera = !d.cuestionario;
  d.cuestionario = { fecha: new Date().toISOString(), v: 'V5', r: r };
  delete d.cqBorrador;
  d.dni = cqDniOk(r.dni) || d.dni;
  if (r.nombre && r.nombre.trim()) d.nombreFiscal = r.nombre.trim().slice(0, 120);
  /* medidas de partida */
  const med = Object.assign({}, d.medIni || {});
  [['peso', 'peso'], ['cintura', 'cintura'], ['cadera', 'cadera'], ['brazo', 'biceps'], ['muslo', 'muslo'], ['pecho', 'pecho']].forEach(function(x){ const n = mjNum(r[x[0]]); if (n) med[x[1]] = n; });
  if (Object.keys(med).length) d.medIni = med;
  /* digestivo, junto a sus alergias (lo ve Fátima en el mismo sitio) */
  if (d.alergias) d.alergias.gastro = { items: Array.isArray(r.gastro) ? r.gastro : [], ninguna: r.gastro === 'ninguna', txt: String(r.gastro_txt || '').trim().slice(0, 800) };
  try { guardarTodo(); } catch(e){}
  COACHES.forEach(function(c){
    try { crearAviso(clavePro(c.u), 'seguimientos', d.nombre + (primera ? ' ha enviado su cuestionario inicial' : ' ha actualizado su cuestionario inicial'), 'Objetivo: ' + recortar(r.objetivo || r.ent_objetivo || '', 90), { cliente: k, vista: 'ficha' }); } catch(e){}
  });
  const o = document.getElementById('cqHoja');
  o.innerHTML = '<div class="fsd-sheet full cq-sheet cq-fin"><div class="cq-e" aria-hidden="true">🎉</div><h3>¡Enviado!</h3>'
    + '<p>Domingo y Fátima ya tienen tu cuestionario y van a preparar tu plan. Te avisaremos cuando esté listo.</p>'
    + '<p class="cq-aviso">📸 Último detalle: mándanos por el chat 3 fotos (de frente, de perfil y de espaldas), con buena luz y ropa ajustada.</p>'
    + '<div class="cq-acts"><button type="button" class="btn-eq" onclick="cqCerrar()">Cerrar</button><button type="button" class="btn-primary" onclick="cqCerrar();goTo(\'chat\')">Ir al chat</button></div></div>';
  delete o.dataset.capaSucia;
  try { mjAvisoAlergiasHoy(); } catch(e){}
}

/* «Hoy»: tarjeta para empezar o terminar el cuestionario (sustituye a la de alergias mientras esté pendiente) */
mjAvisoAlergiasHoy = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const hoy = document.getElementById('view-hoy'); if (!hoy) return r;
    let c = document.getElementById('hoyCuest');
    if (!cqToca()) { if (c) c.remove(); if (obPendiente()) { const a0 = document.getElementById('hoyAlergias'); if (a0) a0.remove(); } return r; }
    const a = document.getElementById('hoyAlergias'); if (a) a.remove();
    if (!c) {
      c = document.createElement('button'); c.type = 'button'; c.id = 'hoyCuest'; c.className = 'hoy-aviso amb';
      c.onclick = cqAbrir;
      const ref = document.getElementById('seguiAviso'); if (ref) ref.parentNode.insertBefore(c, ref); else hoy.appendChild(c);
    }
    const d = clientesData[clienteActual], emp = d && d.cqBorrador;
    c.innerHTML = '<span class="ha-ico" aria-hidden="true">📝</span><span class="ha-txt"><b>' + (emp ? 'Termina tu cuestionario inicial' : 'Completa tu cuestionario inicial') + '</b><span>Con él Domingo y Fátima preparan tu plan. ' + (emp ? 'Ibas por el paso ' + ((emp.paso || 0) + 1) + ' de 7.' : 'Unos 8 minutos.') + '</span></span><span class="chev" aria-hidden="true">›</span>';
    return r;
  };
})(mjAvisoAlergiasHoy);
fsdTras('goTo', function(r, n){ if (n === 'hoy') setTimeout(function(){ try { mjAvisoAlergiasHoy(); } catch(e){} }, 0); });

/* ---------- lo que ven Domingo y Fátima ---------- */
htmlAlergiasPro = (function(orig){
  return function(k){
    let h = orig.apply(this, arguments);
    const a = alergiasDe(k), g = a && a.gastro;
    if (g && (g.items.length || g.txt || g.ninguna)) {
      h += '<div class="alg-gastro"><b>Digestivo:</b> ' + (g.ninguna && !g.txt ? 'sin enfermedades gastrointestinales' : g.items.map(function(id){ const x = CQ_GASTRO.filter(function(y){ return y[0] === id; })[0]; return esc(x ? x[1] : id); }).join(', ')) + (g.txt ? (g.items.length ? ' · ' : '') + '«' + esc(g.txt) + '»' : '') + '</div>';
    }
    return h;
  };
})(htmlAlergiasPro);
function cqValorTxt(c, v){
  if (v == null || v === '' || (Array.isArray(v) && !v.length)) return null;
  if (c.tipo === 'multi') return v === 'ninguna' ? 'Ninguna' : v.map(function(id){ const x = c.opts.filter(function(o){ return o[0] === id; })[0]; return x ? x[1] : id; }).join(', ');
  if (c.tipo === 'escala') return v + ' / 10';
  return String(v) + (c.u ? ' ' + c.u : '');
}
function cqVerPro(k){
  const d = clientesData[k], q = d && d.cuestionario; if (!q) return;
  const r = q.r || {};
  let h = '<div class="fsd-sheet full cq-sheet"><div class="sheet-head"><h3>Cuestionario de ' + esc(d.nombre) + '</h3><button class="x-btn" onclick="mjCerrarHoja(\'cqVer\')" aria-label="Cerrar">×</button></div>'
    + '<p class="ajx-note">Enviado el ' + fechaCorta(q.fecha) + '. Solo lo veis Domingo y Fátima.</p>';
  CQ_PASOS.forEach(function(p){
    let filas = '';
    if (p.especial === 'alergias') filas += '<div class="cq-qa"><span>Alergias e intolerancias</span><div>' + htmlAlergiasPro(k, true) + '</div></div>';
    p.c.forEach(function(c){
      if (c.id === 'gastro' || c.id === 'gastro_txt') return;           // ya van con las alergias
      const t = cqValorTxt(c, r[c.id]); if (t == null) return;
      filas += '<div class="cq-qa"><span>' + esc(c.l) + '</span><b>' + esc(t).replace(/\n/g, '<br>') + '</b></div>';
    });
    if (filas) h += '<div class="section-lbl">' + p.e + ' ' + esc(p.t) + '</div><div class="cq-qas">' + filas + '</div>';
  });
  h += '</div>';
  const o = mjHoja('cqVer'); o.innerHTML = h; o.classList.add('show');
}
pintarAlergiasFicha = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const k = clienteActual, d = clientesData[k], alg = document.getElementById('fichaAlergias');
    if (!d || !alg) return r;
    let row = document.getElementById('fichaCuest');
    if (!row) { row = document.createElement('div'); row.id = 'fichaCuest'; row.className = 'list-row'; alg.parentNode.insertBefore(row, alg); }
    row.onclick = function(){ if (clientesData[clienteActual].cuestionario) cqVerPro(clienteActual); else toast('Todavía no lo ha enviado'); };
    const q = d.cuestionario, b = d.cqBorrador;
    row.innerHTML = '<span>Cuestionario inicial</span><span class="ajx-acts"><span class="pill' + (q ? ' ok' : '') + '">' + (q ? 'Enviado el ' + fechaCorta(q.fecha) : (b ? 'A medias (paso ' + ((b.paso || 0) + 1) + ' de 7)' : 'Pendiente')) + '</span><span class="chev">›</span></span>';
    return r;
  };
})(pintarAlergiasFicha);

/* el cuestionario guarda solo lo que llevas: cerrarlo (✕, atrás, Esc) nunca pregunta ni pierde nada */
mjCerrarHoja = (function(orig){ return function(id){ if (id === 'cqHoja' && capaVisible('cqHoja') && document.querySelector('#cqHoja .cq-paso')) { cqCerrar(); return; } return orig.apply(this, arguments); }; })(mjCerrarHoja);
document.addEventListener('input', function(e){ const q = e.target && e.target.closest && e.target.closest('#cqHoja'); if (q) setTimeout(function(){ delete q.dataset.capaSucia; }, 0); });

/* ---------- más a la vista para los profesionales ---------- */
function cqNuevoPara(k){
  const d = clientesData[k], q = d && d.cuestionario;
  return !!(q && coachActivo && !(q.vistoPor && q.vistoPor[norm(coachActivo.u)]));
}
cqVerPro = (function(orig){
  return function(k){
    const r = orig.apply(this, arguments);
    const q = clientesData[k] && clientesData[k].cuestionario;
    if (q && coachActivo) { q.vistoPor = q.vistoPor || {}; q.vistoPor[norm(coachActivo.u)] = new Date().toISOString(); try { guardarTodo(); } catch(e){} try { enPintarAccesos(); } catch(e){} }
    return r;
  };
})(cqVerPro);
function cqAbrirDesdeFicha(){
  const k = clienteActual, d = clientesData[k]; if (!d) return;
  if (d.cuestionario) { cqVerPro(k); return; }
  toast(d.cqBorrador ? 'Lo tiene a medias (paso ' + ((d.cqBorrador.paso || 0) + 1) + ' de 7)' : 'Todavía no ha rellenado su cuestionario inicial');
}
/* botón «📝 Cuestionario» arriba de la ficha, junto a Seguimientos, Entreno/Nutrición y Chat */
enPintarAccesos = (function(orig){
  return function(){
    const r = orig.apply(this, arguments);
    const a = document.getElementById('fichaAccesos'), k = clienteActual, d = k && clientesData[k];
    if (!a || !d) return r;
    const nuevo = cqNuevoPara(k), pend = !d.cuestionario;
    a.insertAdjacentHTML('beforeend', '<button type="button" class="acc-btn' + (pend ? ' acc-pend' : '') + '" onclick="cqAbrirDesdeFicha()"><span aria-hidden="true">📝</span>Cuestionario' + (nuevo ? '<i class="acc-n">1</i>' : '') + '</button>');
    return r;
  };
})(enPintarAccesos);
/* tarjeta de la lista de clientes: «📝 Cuestionario nuevo» hasta que lo abráis */
exMotivos = (function(orig){
  return function(k){ const m = orig.apply(this, arguments); if (cqNuevoPara(k)) m.unshift('📝 Cuestionario nuevo'); return m; };
})(exMotivos);
