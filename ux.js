/* =========================================================
   Fitness sin Dramas — v0.4
   Navegación estándar, animaciones, emojis en el chat,
   seguimientos con flechas y datos reales en «Hoy».
   Se carga después de app.js y ajustes.js.
   ========================================================= */

/* ---------- utilidades numéricas ---------- */
function numES(v){
  if (v == null) return null;
  const s = String(v).trim().replace(',', '.');
  if (!s) return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}
function fmtNum(n, dec){
  const f = Math.pow(10, dec == null ? 1 : dec);
  return String(Math.round(n * f) / f).replace('.', ',');
}

/* =========================================================
   SEGUIMIENTOS: guardar el historial con todas las medidas
   ========================================================= */
const MEDIDAS = [
  ['peso', 'Peso', 'kg'],
  ['cintura', 'Cintura', 'cm'],
  ['cadera', 'Cadera', 'cm'],
  ['biceps', 'Bíceps', 'cm'],
  ['muslo', 'Muslo', 'cm']
];

guardarSeguimiento = (function(orig){
  return function(){
    if (clienteActual) {
      const sec = document.getElementById('view-seguimiento');
      const nums = sec.querySelectorAll('.row2col input');
      const txt = sec.querySelectorAll('.sg-text');
      const med = {};
      MEDIDAS.forEach(function(m, i){ med[m[0]] = numES(nums[i] && nums[i].value); });
      const lista = SEGUIMIENTOS[clienteActual] = SEGUIMIENTOS[clienteActual] || [];
      lista.unshift({
        fecha: new Date().toISOString(),
        s: 'Semana ' + (lista.length + 1) + ' · ' + fechaCorta(new Date().toISOString()),
        peso: med.peso != null ? fmtNum(med.peso) + ' kg' : '—',
        e: document.getElementById('rEntreno').textContent,
        n: document.getElementById('rNutri').textContent,
        m: leerEscala(sec, 1) || '—',
        x: document.getElementById('rEstres').textContent,
        agujetas: leerEscala(sec, 0) || '—',
        prog: txt[0] ? txt[0].value.trim() : '',
        obs: txt[3] ? txt[3].value.trim() : '',
        med: med
      });
      programarGuardado();
    }
    orig();
    pintarHistorialCliente();
    pintarCambiosCuerpo();
    pintarProgreso();
  };
})(guardarSeguimiento);

function flecha(actual, anterior, unidad){
  if (actual == null || anterior == null) return '';
  const d = actual - anterior;
  if (Math.abs(d) < 0.05) return '<span class="flecha eq" title="Sin cambios">=</span>';
  const sube = d > 0;
  return '<span class="flecha ' + (sube ? 'up' : 'down') + '" title="' + (sube ? 'Sube' : 'Baja') + ' ' + fmtNum(Math.abs(d)) + ' ' + unidad + ' respecto al seguimiento anterior">'
    + (sube ? '↑' : '↓') + ' ' + fmtNum(Math.abs(d)) + '</span>';
}
function bloqueMedidas(r, prev){
  if (!r.med) return '';
  const celdas = MEDIDAS.filter(function(m){ return r.med[m[0]] != null; }).map(function(m){
    const v = r.med[m[0]];
    const p = prev && prev.med ? prev.med[m[0]] : null;
    return '<div class="med"><span class="segui-lbl">' + m[1] + '</span>'
      + '<span class="med-val">' + fmtNum(v) + ' <small>' + m[2] + '</small></span>'
      + flecha(v, p, m[2]) + '</div>';
  });
  if (!celdas.length) return '';
  return '<div class="segui-med">' + celdas.join('') + '</div>'
    + (prev ? '' : '<div class="med-hint">Las flechas aparecerán al comparar con el siguiente seguimiento.</div>');
}
tarjetaSeguimiento = function(r, i, lista){
  const prev = lista ? lista[i + 1] : null;
  return '<div class="segui-card">'
    + '<div class="segui-head"><span class="segui-week">' + esc(r.s) + '</span><span class="segui-peso">' + esc(r.peso || '—') + '</span></div>'
    + bloqueMedidas(r, prev)
    + '<div class="segui-stats">'
    + '<div><span class="segui-lbl">Entreno</span><span class="segui-val">' + esc(r.e) + '/10</span></div>'
    + '<div><span class="segui-lbl">Nutrición</span><span class="segui-val">' + esc(r.n) + '/10</span></div>'
    + '<div><span class="segui-lbl">Motivación</span><span class="segui-val">' + esc(r.m) + '/5</span></div>'
    + '<div><span class="segui-lbl">Estrés</span><span class="segui-val">' + esc(r.x) + '/10</span></div></div>'
    + (r.prog ? '<div class="segui-note"><b>Progreso — </b>' + esc(r.prog) + '</div>' : '')
    + (r.obs ? '<div class="segui-note"><b>Obstáculos — </b>' + esc(r.obs) + '</div>' : '')
    + '</div>';
};
function pintarHistorialCliente(){
  const cont = document.getElementById('historialSegui');
  if (!cont) return;
  const lista = (clienteActual && SEGUIMIENTOS[clienteActual]) || [];
  cont.innerHTML = lista.length
    ? lista.map(tarjetaSeguimiento).join('')
    : '<div class="picker-empty">Aquí verás tus seguimientos anteriores y cómo cambian tus medidas.</div>';
}

/* ---------- «Hoy»: cambios reales del cuerpo (primer vs último seguimiento) ---------- */
function pintarCambiosCuerpo(){
  const lista = (clienteActual && SEGUIMIENTOS[clienteActual]) || [];
  let hay = false;
  [['peso', 'cuPeso', 'kg'], ['cintura', 'cuCintura', 'cm'], ['biceps', 'cuBiceps', 'cm']].forEach(function(c){
    const vals = lista.map(function(r){ return r.med ? r.med[c[0]] : null; }).filter(function(v){ return v != null; });
    const el = document.getElementById(c[1]);
    if (!el) return;
    if (vals.length < 2) { el.textContent = '—'; return; }
    hay = true;
    const d = vals[0] - vals[vals.length - 1];   // lista: más reciente primero
    el.textContent = (d > 0 ? '+' : (d < 0 ? '−' : '')) + fmtNum(Math.abs(d)) + ' ' + c[2];
  });
  const t = document.getElementById('cuTitulo');
  if (t) t.textContent = hay ? 'Y esto es lo que está haciendo en tu cuerpo' : 'Tus cambios aparecerán aquí desde tu segundo seguimiento';
}

/* =========================================================
   CHAT: sin respuestas simuladas, guardado real y emojis
   ========================================================= */
sendMsg = function(){
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  const coach = isCoachView();
  const list = document.getElementById('chatList');
  const vacio = document.getElementById('chatVacio');
  if (vacio) vacio.remove();
  const b = document.createElement('div');
  b.className = 'bubble ' + (coach ? 'in' : 'out');
  if (coach) {
    const s = document.createElement('div');
    s.className = 'sender';
    s.textContent = coachActivo ? coachActivo.u : 'Equipo';
    b.appendChild(s);
  }
  b.appendChild(document.createTextNode(text));
  list.appendChild(b);
  input.value = '';
  list.scrollTop = list.scrollHeight;
  cerrarEmojis();
  programarGuardado();
  pintarChatHero();
};

const EMOJIS = ['😀','😂','😊','😍','🤩','😅','😉','🙂','🙌','👏','💪','🔥','✅','👍','👌','🙏',
                '❤️','💙','😴','😓','😩','🤔','😬','🥵','🏋️','🏃','🚴','🧘','🥗','🍎','🍌','🥑',
                '🍗','🍳','🥦','🍝','☕','💧','📈','📉','🎯','⏰','📸','🎉','💯','🤝'];
function pintarEmojis(){
  const p = document.getElementById('emojiPanel');
  if (!p || p.childElementCount) return;
  p.innerHTML = EMOJIS.map(function(e){
    return '<button type="button" onclick="insertarEmoji(\'' + e + '\')" aria-label="' + e + '">' + e + '</button>';
  }).join('');
}
function toggleEmojis(){
  const p = document.getElementById('emojiPanel');
  const b = document.getElementById('emojiBtn');
  if (!p) return;
  pintarEmojis();
  p.hidden = !p.hidden;
  if (b) { b.setAttribute('aria-expanded', p.hidden ? 'false' : 'true'); b.classList.toggle('on', !p.hidden); }
  const list = document.getElementById('chatList');
  if (list) list.scrollTop = list.scrollHeight;
}
function cerrarEmojis(){
  const p = document.getElementById('emojiPanel');
  const b = document.getElementById('emojiBtn');
  if (p) p.hidden = true;
  if (b) { b.setAttribute('aria-expanded', 'false'); b.classList.remove('on'); }
}
function insertarEmoji(e){
  const i = document.getElementById('chatInput');
  const a = i.selectionStart != null ? i.selectionStart : i.value.length;
  const z = i.selectionEnd != null ? i.selectionEnd : i.value.length;
  i.value = i.value.slice(0, a) + e + i.value.slice(z);
  const pos = a + e.length;
  try { i.setSelectionRange(pos, pos); } catch(err){}
}

/* ---------- «Hoy»: vista previa real del chat ---------- */
function pintarChatHero(){
  const msg = document.getElementById('chatHeroMsg');
  const pill = document.getElementById('chatHeroPill');
  const cta = document.getElementById('chatHeroCta');
  if (!msg) return;
  const list = document.getElementById('chatList');
  const bubbles = list ? list.querySelectorAll('.bubble') : [];
  const last = bubbles[bubbles.length - 1];
  if (pill) pill.hidden = true;
  if (!last) {
    msg.textContent = 'Aún no hay mensajes. Escribe a tu equipo cuando lo necesites.';
    if (cta) cta.textContent = 'Escribir';
    return;
  }
  let texto = '';
  if (last.querySelector('img')) texto = '📷 Foto';
  else if (last.querySelector('audio')) texto = '🎤 Nota de voz';
  else {
    const c = last.cloneNode(true);
    const s = c.querySelector('.sender');
    if (s) s.remove();
    texto = c.textContent.trim();
  }
  const deTi = last.classList.contains('out') && !isCoachView();
  const quien = deTi ? 'Tú' : ((last.querySelector('.sender') || {}).textContent || 'Tu equipo');
  msg.textContent = quien + ': ' + (texto.length > 90 ? texto.slice(0, 87) + '…' : texto);
  if (cta) cta.textContent = 'Abrir conversación';
}

/* ---------- Progreso con datos reales ---------- */
function serieMedida(clave){
  const lista = (clienteActual && SEGUIMIENTOS[clienteActual]) || [];
  return lista.slice().reverse()   // de más antiguo a más reciente
    .filter(function(r){ return r.med && r.med[clave] != null; })
    .map(function(r){ return { v: r.med[clave], f: r.fecha }; });
}
function difTxt(d, u){ return (d > 0 ? '+' : (d < 0 ? '−' : '')) + fmtNum(Math.abs(d)) + ' ' + u; }
function pintarProgreso(){
  const d = clienteActual ? clientesData[clienteActual] : null;
  const m = d && d.semana ? String(d.semana).match(/(\d+)\s*de\s*(\d+)/) : null;
  const sem = m ? +m[1] : 0, tot = m ? +m[2] : 0;
  setTxt('pgSemNum', sem || '—');
  setTxt('pgSemTot', tot ? 'DE ' + tot + ' SEM.' : 'SEMANAS');
  const ring = document.getElementById('pgRing');
  if (ring) {
    const pc = tot ? Math.max(0, Math.min(100, Math.round(sem / tot * 100))) : 0;
    ring.style.background = 'conic-gradient(var(--accent) 0 ' + pc + '%, var(--wash-med) ' + pc + '% 100%)';
  }
  setTxt('pgRingTit', tot ? 'Semana ' + sem + ' de ' + tot : 'Tu asesoría');

  const pesos = serieMedida('peso'), cint = serieMedida('cintura');
  const lista = (clienteActual && SEGUIMIENTOS[clienteActual]) || [];
  setTxt('pgNumSeg', lista.length);
  setTxt('pgPeso', pesos.length ? fmtNum(pesos[pesos.length - 1].v) + ' kg' : '—');
  setTxt('pgCintura', cint.length ? fmtNum(cint[cint.length - 1].v) + ' cm' : '—');
  setTxt('pgCinturaIni', cint.length > 1 ? difTxt(cint[cint.length - 1].v - cint[0].v, 'cm') : '—');
  setTxt('pgPesoDelta', pesos.length > 1 ? difTxt(pesos[pesos.length - 1].v - pesos[0].v, 'kg') + ' desde el primero' : '');

  const chart = document.getElementById('pgChart');
  if (!chart) return;
  const ult = pesos.slice(-8);
  if (!ult.length) {
    chart.innerHTML = '<div class="chart-vacio">Tu evolución de peso aparecerá aquí cuando envíes tu primer seguimiento.</div>';
    return;
  }
  const vals = ult.map(function(x){ return x.v; });
  const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
  const lo = min - Math.max(1, (max - min) * 0.6);   // margen mínimo de 1 kg: no exagerar cambios pequeños
  const off = lista.filter(function(r){ return r.med && r.med.peso != null; }).length - ult.length;
  chart.innerHTML = '<div class="bars">' + ult.map(function(x, i){
    const h = Math.round(20 + (x.v - lo) / (max - lo) * 70);
    const ultimo = i === ult.length - 1;
    return '<div class="bar-col"><span class="bar-val">' + fmtNum(x.v) + '</span>'
      + '<div class="bar" style="height:' + h + 'px' + (ultimo ? '' : ';opacity:.45') + '" title="' + fmtNum(x.v) + ' kg · ' + fechaCorta(x.f) + '"></div>'
      + '<span class="bar-lbl' + (ultimo ? ' on' : '') + '">S' + (off + i + 1) + '</span></div>';
  }).join('') + '</div>';
}

/* ---------- ficha del coach: peso del último seguimiento ---------- */
goToCliente = (function(orig){
  return function(key){
    orig(key);
    const lista = SEGUIMIENTOS[key] || [];
    const pesos = lista.slice().reverse().filter(function(r){ return r.med && r.med.peso != null; });
    if (pesos.length) {
      setTxt('cd-peso', fmtNum(pesos[pesos.length - 1].med.peso) + ' kg');
      setTxt('cd-pesoDelta', pesos.length > 1
        ? difTxt(pesos[pesos.length - 1].med.peso - pesos[0].med.peso, 'kg') + ' desde el primer seguimiento'
        : 'Primer seguimiento');
    }
  };
})(goToCliente);

/* ---------- perfil con datos reales ---------- */
pintarCliente = (function(orig){
  return function(){
    orig();
    const d = clienteActual ? clientesData[clienteActual] : null;
    const o = document.getElementById('perfObjetivo');
    if (o) o.textContent = 'Objetivo · ' + (d && d.objetivo ? d.objetivo : '—');
    const es = document.getElementById('entSemana');
    if (es) es.textContent = d && d.semana ? 'Semana ' + d.semana : 'Tu plan';
  };
})(pintarCliente);

/* =========================================================
   NAVEGACIÓN ESTÁNDAR Y ANIMACIONES
   ========================================================= */
let navDir = null;   // 'pop' cuando se vuelve atrás
const reduceMov = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function animar(el, tipo){
  if (!el || reduceMov) return;
  el.classList.remove('anim-tab', 'anim-push', 'anim-pop');
  void el.offsetWidth;
  el.classList.add('anim-' + tipo);
}
document.addEventListener('animationend', function(e){
  const t = e.target;
  if (t && t.classList) t.classList.remove('anim-tab', 'anim-push', 'anim-pop');
});

/* «Volver» solo en pantallas secundarias; las pestañas principales no lo llevan */
pintarAtras = function(){
  const mostrar = navHist.length > 0 && tabs.indexOf(vistaActual) === -1;
  Array.prototype.forEach.call(document.querySelectorAll('.view-back'), function(b){
    b.style.display = mostrar ? '' : 'none';
    b.style.visibility = 'visible';
  });
};

(function(){
  const origGoTo = goTo;
  goTo = function(name, sinHist){
    const antes = vistaActual;
    origGoTo(name, sinHist);
    if (name === 'hoy') { pintarChatHero(); pintarCambiosCuerpo(); }
    if (name === 'seguimiento') pintarHistorialCliente();
    if (name === 'progreso') pintarProgreso();
    if (name !== 'chat') cerrarEmojis();
    if (antes !== name) animar(document.getElementById('view-' + name), navDir || (tabs.indexOf(name) > -1 ? 'tab' : 'push'));
  };
  const origVolver = volverAtras;
  volverAtras = function(){ navDir = 'pop'; try { origVolver(); } finally { navDir = null; } };

  const origShow = showScreen;
  showScreen = function(id){
    origShow(id);
    if (id === 'view-coach-panel') { actualizarPanel(); if (typeof pintarNotisCoach === 'function') pintarNotisCoach(); }
    animar(document.getElementById(id), navDir || 'push');
  };
  ['backToSplash', 'backToPanel', 'backToCliente', 'coachLogout', 'cerrarSesionCliente'].forEach(function(fn){
    const orig = window[fn];
    if (typeof orig !== 'function') return;
    window[fn] = function(){ navDir = 'pop'; try { return orig.apply(this, arguments); } finally { navDir = null; } };
  });
})();

/* ---------- arranque ---------- */
pintarCliente();
pintarChatHero();
pintarCambiosCuerpo();
pintarHistorialCliente();
pintarProgreso();
pintarAtras();

/* =========================================================
   v0.41 · Panel del coach con los clientes reales
   ========================================================= */
function pintarListaClientes(){
  const cont = document.getElementById('listaClientes');
  if (!cont) return;
  const claves = Object.keys(clientesData);
  cont.innerHTML = claves.map(function(k){
    const d = clientesData[k];
    const segs = SEGUIMIENTOS[k] || [];
    const ult = segs[0];
    const sub = 'Semana ' + esc(d.semana || '—') + ' · ' + (ult && ult.fecha ? 'último seguimiento ' + fechaCorta(ult.fecha) : 'sin seguimientos todavía');
    const flag = segs.length ? '' : '<span class="adh-badge new">Nuevo</span>';
    return '<div class="cliente-card" onclick="goToCliente(\'' + k + '\')">'
      + '<div class="avatar"></div>'
      + '<div class="cliente-info"><div class="cliente-name">' + esc(d.nombre) + '</div>'
      + '<div class="cliente-sub">' + sub + '</div></div>'
      + '<div class="cliente-flags">' + flag + '</div></div>';
  }).join('');
}
function revisionesSemana(){
  const desde = Date.now() - 7 * 86400000;
  let n = 0;
  Object.keys(SEGUIMIENTOS).forEach(function(k){
    if (!clientesData[k]) return;
    (SEGUIMIENTOS[k] || []).forEach(function(r){
      if (r.fecha && new Date(r.fecha).getTime() >= desde) n++;
    });
  });
  return n;
}
actualizarPanel = (function(orig){
  return function(){
    orig();
    setTxt('statRevis', revisionesSemana());
    pintarListaClientes();
  };
})(actualizarPanel);

function eliminarCliente(){
  const k = clienteActual;
  const d = k ? clientesData[k] : null;
  if (!d) return;
  abrirDialogo({
    titulo: 'Eliminar a ' + d.nombre,
    texto: 'Se borrarán su ficha, su plan, sus seguimientos y la conversación de este dispositivo. Su código de acceso dejará de funcionar. No se puede deshacer.',
    ok: 'Eliminar', peligro: true,
    onOk: function(){
      delete clientesData[k];
      delete SEGUIMIENTOS[k];
      delete PLANES[k];
      clienteActual = null;
      guardarTodo();
      actualizarPanel();
      backToPanel();
      toast('Cliente eliminado');
    }
  });
}

actualizarPanel();

/* =========================================================
   v0.42 · Espacios de trabajo separados por profesional
   Entrenador (Domingo): entrenamiento · Dietista (Fátima): nutrición
   ========================================================= */
function entrarComo(usuario){
  const c = COACHES.filter(function(x){ return norm(x.u) === norm(usuario); })[0];
  if (!c) return;
  coachActivo = c; coachPend = null;
  entrarAlPanel();
}
function aplicarEspacio(){
  const root = document.getElementById('screenRoot');
  const rol = coachActivo ? coachActivo.rol : null;
  root.classList.toggle('esp-entreno', rol === 'entrenador');
  root.classList.toggle('esp-nutri', rol === 'dietista');
  const t = document.querySelector('#view-coach-panel .alta-top .h-title');
  if (t) t.textContent = rol === 'dietista' ? 'Nutrición' : (rol === 'entrenador' ? 'Entrenamiento' : 'Panel de coach');
}
entrarAlPanel = (function(orig){
  return function(){ orig(); aplicarEspacio(); };
})(entrarAlPanel);
coachLogout = (function(orig){
  return function(){ orig.apply(this, arguments); aplicarEspacio(); };
})(coachLogout);
/* si alguien intenta abrir el área del otro profesional, se queda en la suya */
goToEntrenoCoach = (function(orig){
  return function(){ if (coachActivo && coachActivo.rol === 'dietista') return; orig(); };
})(goToEntrenoCoach);
goToPlanCoach = (function(orig){
  return function(){ if (coachActivo && coachActivo.rol === 'entrenador') return; orig(); };
})(goToPlanCoach);

/* =========================================================
   v0.43 · Barra de escritura estilo WhatsApp/Telegram
   ========================================================= */
const esTactil = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
function crecerInput(){
  const t = document.getElementById('chatInput');
  if (!t) return;
  t.style.height = 'auto';
  t.style.height = Math.min(t.scrollHeight, 132) + 'px';
}
function actualizarComposer(){
  const t = document.getElementById('chatInput');
  const c = document.getElementById('composer');
  if (!t || !c) return;
  c.classList.toggle('tiene-texto', t.value.trim().length > 0);
  crecerInput();
}
(function(){
  const t = document.getElementById('chatInput');
  if (!t) return;
  t.addEventListener('input', actualizarComposer);
  /* Enter: en el móvil hace salto de línea (como WhatsApp); en ordenador envía, Mayús+Enter salta línea.
     Se intercepta en captura para que el atajo antiguo de app.js no actúe. */
  document.addEventListener('keydown', function(e){
    if (e.target !== t || e.key !== 'Enter') return;
    e.stopPropagation();
    if (esTactil || e.shiftKey) return;
    e.preventDefault();
    sendMsg();
  }, true);
})();
insertarEmoji = (function(orig){
  return function(e){ orig(e); actualizarComposer(); };
})(insertarEmoji);
sendMsg = (function(orig){
  return function(){
    orig();
    actualizarComposer();
    if (programarGuardado && guardadoPend) { clearTimeout(guardadoPend); guardadoPend = null; }
    guardarTodo();                       // guardar al instante, sin esperar
  };
})(sendMsg);
recUI = (function(orig){
  return function(on){
    orig(on);
    const c = document.getElementById('composer');
    if (c) c.classList.toggle('grabando', !!on);
  };
})(recUI);
syncChatPerspective = (function(orig){
  return function(){
    orig();
    const t = document.getElementById('chatInput');
    if (t) t.placeholder = 'Mensaje';
  };
})(syncChatPerspective);

/* =========================================================
   v0.43 · Botón «atrás» del móvil dentro de la app
   ========================================================= */
function capaVisible(id){ const el = document.getElementById(id); return !!(el && el.classList.contains('show')); }
function atrasDentroApp(){
  /* 1. ventanas y capas abiertas */
  if (capaVisible('proPass')) { cerrarPassPro(); return true; }
  if (capaVisible('dlgOverlay')) { cerrarDialogo(false); return true; }
  if (capaVisible('legalOverlay')) { cerrarLegal(); return true; }
  if (capaVisible('cookieConfig')) { cookiesCerrarConfig(); return true; }
  if (capaVisible('cookieBanner') || capaVisible('consentSalud')) return true;   // hay que elegir una opción
  const ep = document.getElementById('emojiPanel');
  if (ep && !ep.hidden) { cerrarEmojis(); return true; }
  const capas = [['videoModal', cerrarVideoModal], ['recursoPop', cerrarRecurso], ['foodPicker', closeFoodPicker],
                 ['exPicker', closeExercisePicker], ['notiPop', cerrarNotis], ['notiPopCoach', cerrarNotisCoach]];
  for (let k = 0; k < capas.length; k++) {
    if (capaVisible(capas[k][0]) && typeof capas[k][1] === 'function') { capas[k][1](); return true; }
  }
  /* 2. pantallas */
  const visible = topScreens.filter(function(id){
    const el = document.getElementById(id);
    return el && el.style.display !== 'none' && getComputedStyle(el).display !== 'none';
  })[0];
  if (visible === 'view-coach-panel') { coachLogout(); return true; }   // como mucho, a la pantalla de acceso
  if (!visible || visible === 'view-splash') return false;
  if (visible === 'app') {
    if (document.getElementById('coachBar').classList.contains('show')) { backToCliente(); return true; }
    if (navHist.length) { volverAtras(); return true; }
    if (vistaActual !== 'hoy') { navDir = 'pop'; goTo('hoy', true); navDir = null; return true; }
    return false;
  }
  const btn = document.getElementById(visible).querySelector('.back-btn');
  if (btn) { btn.click(); return true; }
  return false;
}
function armarAtras(){
  if (!history.state || !history.state.fsd) {
    try { history.pushState({ fsd: 1 }, ''); } catch(e){}
  }
}
window.addEventListener('popstate', function(){
  if (atrasDentroApp()) { armarAtras(); return; }
  toast('Pulsa atrás otra vez para salir');
});
document.addEventListener('pointerdown', armarAtras, true);

/* =========================================================
   v0.43 · Ficha y datos siempre al día
   ========================================================= */
function contarMensajes(k){
  const html = PLANES[k] && PLANES[k].chat;
  if (!html) return 0;
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.querySelectorAll('.bubble').length;
}
goToCliente = (function(orig){
  return function(key){
    orig(key);
    setTxt('fichaSegN', (SEGUIMIENTOS[key] || []).length);
    setTxt('fichaChatN', contarMensajes(key));
  };
})(goToCliente);

/* Dos pestañas del mismo navegador (p. ej. cliente y profesional) se actualizan solas */
window.addEventListener('storage', function(e){
  if (e.key !== DB_KEY || !e.newValue) return;
  let d = null;
  try { d = JSON.parse(e.newValue); } catch(err){ return; }
  if (!d || !d.clientes) return;
  [[clientesData, d.clientes], [SEGUIMIENTOS, d.seg || {}], [PLANES, d.planes || {}]].forEach(function(par){
    Object.keys(par[0]).forEach(function(k){ if (!(k in par[1])) delete par[0][k]; });
    Object.keys(par[1]).forEach(function(k){
      if (par[0] === PLANES && k === clienteActual && par[0][k]) {
        par[0][k].chat = par[1][k].chat;        // solo la conversación: no pisar un plan que se está editando
      } else par[0][k] = par[1][k];
    });
  });
  notisCoach = d.notis || [];
  const cl = document.getElementById('chatList');
  if (cl && clienteActual && PLANES[clienteActual] && PLANES[clienteActual].chat && cl.innerHTML !== PLANES[clienteActual].chat) {
    cl.innerHTML = PLANES[clienteActual].chat;
    cl.scrollTop = cl.scrollHeight;
  }
  actualizarPanel();
  if (typeof pintarNotisCoach === 'function') pintarNotisCoach();
  pintarChatHero(); pintarHistorialCliente(); pintarCambiosCuerpo(); pintarProgreso();
  if (clienteActual) { setTxt('fichaSegN', (SEGUIMIENTOS[clienteActual] || []).length); setTxt('fichaChatN', contarMensajes(clienteActual)); }
});

/* =========================================================
   v0.44 · Contraseña en el acceso directo de profesionales
   Solo se guarda la huella SHA-256 (nunca la contraseña).
   Ojo: en una app sin servidor esto es un cierre de cortesía,
   no seguridad real; la seguridad llegará con cuentas en servidor.
   ========================================================= */
const PRO_HASH = {
  domingo: 'ebae2c1adf746cc77c6fc004773014594f63b6163ba809b1489646de67f421d3',
  fatima:  '694a7b907fd5774f2b3dd6ae3f42eaf54843622e8b1165140d53aff75f443ce5'
};
let proPendiente = null;
function pedirPassPro(usuario){
  proPendiente = usuario;
  document.getElementById('proPassTit').textContent = 'Contraseña de ' + usuario;
  const i = document.getElementById('proPassInput');
  i.value = '';
  document.getElementById('proPassErr').textContent = '';
  document.getElementById('proPass').classList.add('show');
  setTimeout(function(){ try { i.focus(); } catch(e){} }, 60);
}
function cerrarPassPro(){
  document.getElementById('proPass').classList.remove('show');
  proPendiente = null;
}
function huellaPro(usuario, pw){
  const datos = new TextEncoder().encode('fsd-pro:' + norm(usuario) + ':' + pw.trim().toLowerCase());
  return crypto.subtle.digest('SHA-256', datos).then(function(buf){
    return Array.prototype.map.call(new Uint8Array(buf), function(b){ return ('0' + b.toString(16)).slice(-2); }).join('');
  });
}
function confirmarPassPro(){
  const i = document.getElementById('proPassInput');
  const err = document.getElementById('proPassErr');
  if (!proPendiente) return;
  if (!i.value.trim()) { err.textContent = 'Escribe la contraseña.'; i.focus(); return; }
  if (!window.crypto || !crypto.subtle) { err.textContent = 'Abre la app desde su dirección segura (https) para entrar.'; return; }
  const u = proPendiente;
  huellaPro(u, i.value).then(function(h){
    if (h === PRO_HASH[norm(u)]) { cerrarPassPro(); entrarComo(u); }
    else { err.textContent = 'Contraseña incorrecta. Inténtalo de nuevo.'; i.select(); }
  });
}

/* =========================================================
   v0.45 · Datos clave de cada cliente en el panel del profesional
   ========================================================= */
function diasDesde(iso){
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}
function haceTxt(d){ return d == null ? '—' : (d === 0 ? 'hoy' : (d === 1 ? 'ayer' : 'hace ' + d + ' días')); }
function datoCliente(lista, clave){
  const vals = lista.filter(function(r){ return r.med && r.med[clave] != null; });
  if (!vals.length) return { v: null, f: '' };
  const v = vals[0].med[clave];
  const prev = vals[1] ? vals[1].med[clave] : null;
  let f = '';
  if (prev != null) { const d = v - prev; f = Math.abs(d) < 0.05 ? '=' : (d > 0 ? '↑' : '↓'); }
  return { v: v, f: f };
}
pintarListaClientes = function(){
  const cont = document.getElementById('listaClientes');
  if (!cont) return;
  const rol = coachActivo ? coachActivo.rol : null;
  cont.innerHTML = Object.keys(clientesData).map(function(k){
    const d = clientesData[k];
    const segs = SEGUIMIENTOS[k] || [];
    const ult = segs[0];
    const dUlt = ult ? diasDesde(ult.fecha) : null;
    const dAlta = d.fechaAlta ? diasDesde(d.fechaAlta) : null;
    let estado, cls;
    if (!segs.length && (dAlta == null || dAlta < 7)) { estado = 'Nuevo'; cls = 'nuevo'; }
    else if (!segs.length || dUlt > 7) { estado = 'Seguimiento pendiente'; cls = 'pend'; }
    else { estado = 'Al día'; cls = 'ok'; }
    const peso = datoCliente(segs, 'peso'), cint = datoCliente(segs, 'cintura');
    const ent = ult ? ult.e : null, nut = ult ? ult.n : null;
    const msgs = contarMensajes(k);
    function celda(lbl, val, extra, destacar){
      return '<div class="kc' + (destacar ? ' dest' : '') + '"><span class="kc-l">' + lbl + '</span><span class="kc-v">' + val + (extra ? ' <i>' + extra + '</i>' : '') + '</span></div>';
    }
    const celdas = [
      celda('Peso', peso.v != null ? fmtNum(peso.v) + '<small> kg</small>' : '—', peso.f),
      celda('Cintura', cint.v != null ? fmtNum(cint.v) + '<small> cm</small>' : '—', cint.f),
      celda('Entreno', ent != null && ent !== '—' ? esc(ent) + '<small>/10</small>' : '—', '', rol === 'entrenador'),
      celda('Nutrición', nut != null && nut !== '—' ? esc(nut) + '<small>/10</small>' : '—', '', rol === 'dietista')
    ];
    if (rol === 'dietista') { const t = celdas[2]; celdas[2] = celdas[3]; celdas[3] = t; }
    return '<div class="cliente-card kcard" onclick="goToCliente(\'' + k + '\')">'
      + '<div class="kc-top"><div class="avatar"></div>'
      +   '<div class="cliente-info"><div class="cliente-name">' + esc(d.nombre) + '</div>'
      +   '<div class="cliente-sub">Semana ' + esc(d.semana || '—') + ' · ' + esc(d.objetivo || 'Sin objetivo') + '</div></div>'
      +   '<div class="cliente-flags"><span class="kc-estado ' + cls + '">' + estado + '</span></div></div>'
      + '<div class="kc-grid">' + celdas.join('') + '</div>'
      + '<div class="kc-pie"><span>📋 Último seguimiento: ' + (ult ? haceTxt(dUlt) : 'ninguno') + '</span>'
      +   '<span>💬 ' + msgs + '</span></div>'
      + '</div>';
  }).join('');
};
actualizarPanel();

/* =========================================================
   v0.46 · Atrás blindado: nunca mostrar una copia antigua de la app
   ========================================================= */
/* Si el móvil restaura una copia congelada de la app (caché de atrás/adelante),
   se recarga para arrancar con el estado real; así nunca reaparece el perfil
   de un cliente que se estaba viendo en una versión anterior de la página. */
window.addEventListener('pageshow', function(e){
  if (e.persisted) location.reload();
});
/* Protección del atrás activa desde el arranque, no solo tras el primer toque */
armarAtras();
/* La sesión del cliente se guarda en cuanto entra con su código */
enterApp = (function(orig){
  return function(){
    orig();
    if (window.fsdSesionCliente && clienteActual) guardarTodo();
  };
})(enterApp);

/* =========================================================
   v0.47 · Código de acceso del cliente visible para los profesionales
   ========================================================= */
function codigoFicha(){ const d = clienteActual ? clientesData[clienteActual] : null; return d && d.codigo ? d.codigo : ''; }
function ocultarCodigoCoach(){
  const el = document.getElementById('fichaCodigo');
  const b = document.getElementById('fichaCodBtn');
  if (el) { el.textContent = '••••-••••'; el.setAttribute('data-visible', '0'); }
  if (b) b.textContent = 'Mostrar';
  const s = document.getElementById('fichaCodShare');
  if (s) s.hidden = !navigator.share;
}
function mostrarCodigoCoach(){
  const el = document.getElementById('fichaCodigo');
  const b = document.getElementById('fichaCodBtn');
  if (!el) return;
  const visible = el.getAttribute('data-visible') === '1';
  el.textContent = visible ? '••••-••••' : (codigoFicha() || '—');
  el.setAttribute('data-visible', visible ? '0' : '1');
  if (b) b.textContent = visible ? 'Mostrar' : 'Ocultar';
}
function copiarCodigoCoach(){
  const c = codigoFicha();
  if (c) copiarTexto(c); else toast('Este cliente no tiene código');
}
function enviarCodigoCoach(){
  const c = codigoFicha();
  const d = clienteActual ? clientesData[clienteActual] : null;
  if (!c || !d) return;
  const nombre = (d.nombre || '').split(' ')[0];
  const texto = 'Hola' + (nombre ? ' ' + nombre : '') + ', tu código de acceso a Fitness sin Dramas es ' + c +
    '. Entra en ' + location.origin + location.pathname.replace(/index\.html$/, '') + ' y escríbelo en «Código de acceso».';
  if (navigator.share) {
    navigator.share({ title: 'Tu código de acceso', text: texto }).catch(function(err){
      if (!err || err.name !== 'AbortError') copiarTexto(texto);
    });
  } else copiarTexto(texto);
}
goToCliente = (function(orig){
  return function(key){ orig(key); ocultarCodigoCoach(); };
})(goToCliente);
