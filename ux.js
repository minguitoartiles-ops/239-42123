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
        obs: txt[2] ? txt[2].value.trim() : '',
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
    if (t) t.placeholder = 'Escribe un mensaje';
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
  if (visible === 'view-coach-panel') { confirmarSalidaCoach(); return true; }   // como mucho, a la pantalla de acceso (con aviso)
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
  if (ignorarPop) { ignorarPop = false; return; }
  if (atrasDentroApp()) { armarAtras(); return; }
  salirDeGuardas();
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

/* =========================================================
   Foto de perfil (clientes y profesionales) para las conversaciones
   Se recorta en cuadrado y se reduce a 192 px (JPEG) antes de guardarla.
   ========================================================= */
const FOTOS_KEY = 'fsd_fotos';
let fotosCoachMem = null;
function leerFotosCoach(){
  if (fotosCoachMem) return fotosCoachMem;
  try { fotosCoachMem = JSON.parse(localStorage.getItem(FOTOS_KEY) || '{}') || {}; } catch(e){ fotosCoachMem = {}; }
  return fotosCoachMem;
}
function guardarFotosCoach(o){
  fotosCoachMem = o;
  try { localStorage.setItem(FOTOS_KEY, JSON.stringify(o)); } catch(e){ toast('No hay espacio para guardar la foto en este dispositivo'); }
}
function fotoDe(quien){            // quien: 'cliente:<clave>' o nombre de profesional
  if (!quien) return '';
  if (quien.indexOf('cliente:') === 0) { const d = clientesData[quien.slice(8)]; return d && d.foto ? d.foto : ''; }
  return leerFotosCoach()[norm(quien)] || '';
}
function pintarFoto(el, url){
  if (!el) return;
  if (url) { el.style.backgroundImage = 'url("' + url + '")'; el.classList.add('con-foto'); }
  else { el.style.backgroundImage = ''; el.classList.remove('con-foto'); }
}
let fotoDestino = null;
function elegirFoto(destino){
  fotoDestino = destino;
  let i = document.getElementById('fotoInput');
  if (!i) {
    i = document.createElement('input');
    i.type = 'file'; i.accept = 'image/*'; i.id = 'fotoInput'; i.hidden = true;
    i.addEventListener('change', function(){ procesarFoto(i.files && i.files[0]); });
    document.body.appendChild(i);
  }
  i.value = '';
  i.click();
}
function procesarFoto(file){
  if (!file || !fotoDestino) return;
  if (!/^image\//.test(file.type)) { toast('Elige una imagen'); return; }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = function(){
    const lado = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - lado) / 2, sy = (img.naturalHeight - lado) / 2;
    const c = document.createElement('canvas');
    c.width = c.height = 192;
    c.getContext('2d').drawImage(img, sx, sy, lado, lado, 0, 0, 192, 192);
    URL.revokeObjectURL(url);
    let dato = '';
    try { dato = c.toDataURL('image/jpeg', 0.82); } catch(e){}
    if (!dato) { toast('No se ha podido leer la imagen'); return; }
    asignarFoto(fotoDestino, dato);
    toast('Foto de perfil actualizada');
  };
  img.onerror = function(){ URL.revokeObjectURL(url); toast('No se ha podido abrir esa imagen'); };
  img.src = url;
}
function asignarFoto(destino, dato){
  if (destino.indexOf('cliente:') === 0) {
    const d = clientesData[destino.slice(8)];
    if (!d) return;
    if (dato) d.foto = dato; else delete d.foto;
    guardarTodo();
  } else {
    const o = leerFotosCoach();
    if (dato) o[norm(destino)] = dato; else delete o[norm(destino)];
    guardarFotosCoach(o);
  }
  pintarAvatares();
  refrescarAjustes();
}
function quitarFoto(destino){ asignarFoto(destino, ''); toast('Foto quitada'); }
function destinoPropio(rol){
  if (rol === 'cliente') return clienteActual ? 'cliente:' + clienteActual : null;
  return coachActivo ? coachActivo.u : null;
}
/* fila «Foto de perfil» para la sección Cuenta de Ajustes */
function filaFoto(rol){
  const dest = destinoPropio(rol);
  if (!dest) return '';
  const tiene = !!fotoDe(dest);
  const url = fotoDe(dest);
  return '<div class="list-row foto-row" style="cursor:default"><span class="foto-row-l">'
    + '<span class="avatar foto-prev' + (tiene ? ' con-foto' : '') + '"' + (tiene ? ' style="background-image:url(&quot;' + url + '&quot;)"' : '') + '></span>Foto de perfil</span>'
    + '<span class="ajx-acts"><button class="mini-btn" onclick="elegirFoto(\'' + dest.replace(/'/g, "\\'") + '\')">' + (tiene ? 'Cambiar' : 'Añadir') + '</button>'
    + (tiene ? '<button class="mini-btn" onclick="quitarFoto(\'' + dest.replace(/'/g, "\\'") + '\')">Quitar</button>' : '')
    + '</span></div>';
}

/* pintar fotos en toda la app */
function pintarAvatares(){
  const propia = clienteActual ? fotoDe('cliente:' + clienteActual) : '';
  pintarFoto(document.querySelector('#view-hoy .topline .avatar'), propia);
  pintarFoto(document.querySelector('#view-perfil .avatar.lg'), propia);
  /* etiquetas del equipo en el chat y vista previa en «Hoy» */
  Array.prototype.forEach.call(document.querySelectorAll('.team-chip'), function(ch){
    const nombre = ch.textContent.split('·')[0].trim();
    const dot = ch.querySelector('.dot');
    pintarFoto(dot, fotoDe(nombre));
  });
  const minis = document.querySelectorAll('.chat-hero-avs .av-mini');
  pintarFoto(minis[0], fotoDe('Fátima'));
  pintarFoto(minis[1], fotoDe('Domingo'));
  /* tarjetas de clientes en el panel del profesional */
  const claves = Object.keys(clientesData);
  Array.prototype.forEach.call(document.querySelectorAll('#listaClientes .cliente-card'), function(card, i){
    pintarFoto(card.querySelector('.avatar'), claves[i] ? fotoDe('cliente:' + claves[i]) : '');
  });
  decorarChat();
}
/* foto junto al nombre en cada mensaje (no se guarda en la conversación) */
function decorarChat(){
  const list = document.getElementById('chatList');
  if (!list) return;
  Array.prototype.forEach.call(list.querySelectorAll('.bubble .sender'), function(s){
    const viejo = s.querySelector('.msg-av');
    if (viejo) viejo.remove();
    const url = fotoDe(s.textContent.trim());
    if (url) {
      const im = document.createElement('img');
      im.className = 'msg-av'; im.alt = ''; im.src = url;
      s.insertBefore(im, s.firstChild);
    }
  });
}
guardarChat = function(){
  if (!clienteActual) return;
  const l = document.getElementById('chatList');
  if (!l) return;
  const copia = l.cloneNode(true);
  Array.prototype.forEach.call(copia.querySelectorAll('.msg-av'), function(x){ x.remove(); });
  PLANES[clienteActual] = PLANES[clienteActual] || { ent: '', nut: '' };
  PLANES[clienteActual].chat = copia.innerHTML;
};
/* el avatar del perfil del cliente abre el selector de foto */
(function(){
  const a = document.querySelector('#view-perfil .avatar.lg');
  if (a) { a.title = 'Cambiar foto de perfil'; a.addEventListener('click', function(){ if (clienteActual && !isCoachView()) elegirFoto('cliente:' + clienteActual); }); }
})();
/* volver a pintar cuando cambia lo que se ve */
(function(){
  const g = goTo;
  goTo = function(n, s){ g(n, s); pintarAvatares(); };
  const sh = showScreen;
  showScreen = function(id){ sh(id); pintarAvatares(); };
  const sm = sendMsg;
  sendMsg = function(){ sm(); decorarChat(); };
  const pl = pintarListaClientes;
  pintarListaClientes = function(){ pl(); pintarAvatares(); };
})();
window.addEventListener('storage', function(e){ if (e.key === DB_KEY || e.key === FOTOS_KEY) { fotosCoachMem = null; pintarAvatares(); } });
pintarAvatares();

/* Corrección: guardar el plan ya no borra la conversación ni otros datos del cliente */
guardarPlan = function(){
  if (!clienteActual) return;
  const prev = PLANES[clienteActual] || {};
  PLANES[clienteActual] = Object.assign({}, prev, { ent: contEnt().innerHTML, nut: contNut().innerHTML });
};

/* =========================================================
   Compatibilidad Android e iOS
   ========================================================= */
const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const esAndroid = /Android/i.test(navigator.userAgent);
function esInstalada(){
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
}

/* --- Guardado con aviso si la memoria del móvil se llena (antes fallaba en silencio) --- */
let avisoMemoria = false;
guardarTodo = function(){
  if (fsdBloqueoGuardado) return;
  try { sincronizarInputs(contEnt()); sincronizarInputs(contNut()); guardarPlan(); guardarChat(); } catch(e){}
  try {
    localStorage.setItem(DB_KEY, JSON.stringify({
      v: 1, clientes: clientesData, seg: SEGUIMIENTOS, planes: PLANES, notis: notisCoach,
      sesion: (window.fsdSesionCliente && clienteActual) ? { cliente: clienteActual, tipo: 'cliente' } : null
    }));
    avisoMemoria = false;
  } catch(e){
    if (!avisoMemoria) {
      avisoMemoria = true;
      toast('La memoria de la app está llena y no se han guardado los últimos cambios. Descarga una copia en Ajustes y borra fotos o audios antiguos.');
    }
  }
};

/* --- Fotos del chat: se reducen antes de guardarlas (una foto de móvil podía llenar la memoria) --- */
function reducirImagen(file, max, calidad, cb){
  const u = URL.createObjectURL(file);
  const im = new Image();
  im.onload = function(){
    let w = im.naturalWidth, h = im.naturalHeight;
    const k = Math.min(1, max / Math.max(w, h));
    w = Math.round(w * k); h = Math.round(h * k);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(im, 0, 0, w, h);
    URL.revokeObjectURL(u);
    let d = '';
    try { d = c.toDataURL('image/jpeg', calidad); } catch(e){}
    cb(d);
  };
  im.onerror = function(){ URL.revokeObjectURL(u); cb(''); };
  im.src = u;
}
subirImagen = function(input){
  const f = input.files && input.files[0];
  input.value = '';
  if (!f) return;
  reducirImagen(f, 1024, 0.72, function(url){
    if (!url) { toast('No se ha podido abrir esa imagen'); return; }
    const b = burbujaNueva();
    b.classList.add('media');
    const img = document.createElement('img');
    img.src = url; img.alt = 'Imagen enviada';
    b.appendChild(img);
    meterEnChat(b);
  });
};
/* lo que entra al chat (fotos, audios) se guarda al momento */
meterEnChat = (function(orig){
  return function(b){ orig(b); decorarChat(); guardarTodo(); pintarChatHero(); };
})(meterEnChat);

/* --- Notas de voz: formato que entiende cada móvil y guardadas de verdad --- */
function formatoAudio(){
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
  const opciones = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/aac'];   // iPhone: mp4 · Android: webm
  for (let i = 0; i < opciones.length; i++) if (MediaRecorder.isTypeSupported(opciones[i])) return opciones[i];
  return '';
}
const MAX_AUDIO_SEG = 60;
toggleMic = function(){
  if (mediaRec && mediaRec.state === 'recording') { mediaRec.stop(); return; }
  if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder)) {
    toast('Este navegador no permite grabar notas de voz.');
    return;
  }
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream){
    const mt = formatoAudio();
    try { mediaRec = mt ? new MediaRecorder(stream, { mimeType: mt, audioBitsPerSecond: 24000 }) : new MediaRecorder(stream); }
    catch(e){ mediaRec = new MediaRecorder(stream); }
    recChunks = []; recSegs = 0;
    setTxt('recTime', '0:00');
    mediaRec.ondataavailable = function(e){ if (e.data && e.data.size) recChunks.push(e.data); };
    mediaRec.onstop = function(){
      clearInterval(recInt); recInt = null; recUI(false);
      stream.getTracks().forEach(function(t){ t.stop(); });
      const tipo = (mediaRec && mediaRec.mimeType) || mt || 'audio/mp4';
      const segs = recSegs;
      mediaRec = null;
      if (!recChunks.length || segs < 1) return;
      const fr = new FileReader();
      fr.onload = function(){ addAudioBubble(fr.result, segs); };
      fr.readAsDataURL(new Blob(recChunks, { type: tipo }));
    };
    mediaRec.start();
    recUI(true);
    recInt = setInterval(function(){
      recSegs++;
      setTxt('recTime', fmtDur(recSegs));
      if (recSegs >= MAX_AUDIO_SEG && mediaRec && mediaRec.state === 'recording') mediaRec.stop();
    }, 1000);
  }).catch(function(){
    toast('Sin permiso para el micrófono. Actívalo en los ajustes del móvil para esta app.');
  });
};

/* --- Teclado: la barra del chat siempre visible por encima (iPhone no redimensiona solo) --- */
if (window.visualViewport) {
  const vv = window.visualViewport;
  const ajustarAlto = function(){
    document.documentElement.style.setProperty('--app-h', Math.round(vv.height) + 'px');
    if (esIOS) window.scrollTo(0, 0);
    const cl = document.getElementById('chatList');
    if (cl && document.activeElement && document.activeElement.id === 'chatInput') cl.scrollTop = cl.scrollHeight;
  };
  vv.addEventListener('resize', ajustarAlto);
  ajustarAlto();
}

/* --- Alternativa a :has() para iPhones con iOS antiguo --- */
goTo = (function(orig){
  return function(n, s){ orig(n, s); const c = document.getElementById('content'); if (c) c.classList.toggle('en-chat', n === 'chat'); };
})(goTo);

/* --- Pedir al navegador que no borre los datos de la app --- */
if (navigator.storage && navigator.storage.persist) { navigator.storage.persist().catch(function(){}); }

/* --- Ayuda para instalar la app (Android: botón; iPhone: pasos) --- */
let promptInstalar = null;
window.addEventListener('beforeinstallprompt', function(e){
  e.preventDefault();
  promptInstalar = e;
  pintarAyudaInstalar();
});
window.addEventListener('appinstalled', function(){ promptInstalar = null; pintarAyudaInstalar(); toast('App instalada'); });
function pintarAyudaInstalar(){
  const c = document.getElementById('instalarCard');
  if (!c) return;
  if (esInstalada()) { c.hidden = true; return; }
  let html = '<b>Instala la app en tu móvil</b>';
  if (promptInstalar) {
    html += '<span>Tendrás su icono en la pantalla de inicio y se abrirá a pantalla completa.</span><button class="btn-eq" onclick="instalarApp()">Instalar</button>';
  } else if (esIOS) {
    html += '<span>En Safari, pulsa <i class="ico-share" aria-label="Compartir"></i> <b>Compartir</b> y después <b>«Añadir a pantalla de inicio»</b>.</span>';
  } else if (esAndroid) {
    html += '<span>En Chrome, abre el menú <b>⋮</b> y pulsa <b>«Instalar aplicación»</b> o <b>«Añadir a pantalla de inicio»</b>.</span>';
  } else {
    html += '<span>Abre este enlace en tu móvil (Chrome en Android, Safari en iPhone) para instalarla.</span>';
  }
  c.innerHTML = html;
  c.hidden = false;
}
function instalarApp(){
  if (!promptInstalar) return;
  promptInstalar.prompt();
  promptInstalar.userChoice.then(function(){ promptInstalar = null; pintarAyudaInstalar(); });
}
pintarAyudaInstalar();

/* Consentimiento comercial (boletín y ofertas): voluntario, separado y revocable — art. 21 LSSI */
csAceptar = (function(orig){
  return function(){
    const d = clientesData[clienteActual];
    const com = document.getElementById('csCom');
    if (d) d.consentComercial = (com && com.checked) ? { fecha: new Date().toISOString() } : null;
    orig();
  };
})(csAceptar);
comprobarConsentSalud = (function(orig){
  return function(){ const c = document.getElementById('csCom'); if (c) c.checked = false; orig(); };
})(comprobarConsentSalud);
function toggleComercial(el){
  const d = clientesData[clienteActual];
  if (!d) return;
  const on = !el.classList.contains('on');
  d.consentComercial = on ? { fecha: new Date().toISOString() } : null;
  el.classList.toggle('on', on);
  el.setAttribute('aria-checked', on ? 'true' : 'false');
  guardarTodo();
  toast(on ? 'Te avisaremos de novedades y ofertas' : 'Te has dado de baja del boletín');
}

/* =========================================================
   v0.48 · Botón atrás fiable en Chrome Android
   Chrome se salta las entradas de historial creadas sin un toque del usuario.
   La marca se renueva en cada toque, así siempre hay una que Chrome respeta.
   ========================================================= */
/* v0.51 (cambio 1 hacia la 0.52) · Varias marcas de una vez, puestas siempre con un toque.
   Antes, tras cada «atrás» se ponía una marca nueva sin toque; Chrome la daba por sospechosa y,
   al pulsar atrás dos veces seguidas (p. ej. al entrar desde una notificación), sacaba de la app. */
const GUARDAS = 6;
let ignorarPop = false;
document.removeEventListener('pointerdown', armarAtras, true);   // sustituye al vigilante anterior
function nivelGuarda(){ const st = history.state; return st && st.fsd ? (st.n || 1) : 0; }
function rellenarGuardas(){
  for (let n = nivelGuarda() + 1; n <= GUARDAS; n++) {
    try { history.pushState({ fsd: 1, n: n }, ''); } catch(e){ break; }
  }
}
armarAtras = function(){            // tras un «atrás» atendido: si quedan marcas, no se crea ninguna
  if (nivelGuarda() > 0) return;
  try { history.pushState({ fsd: 1, n: 1 }, ''); } catch(e){}   // último recurso (sin toque)
};
function salirDeGuardas(){           // en la pantalla de acceso: se baja hasta la entrada real
  const n = nivelGuarda();
  if (n > 0) { ignorarPop = true; history.go(-n); }
}
document.addEventListener('pointerdown', function(){
  if (nivelGuarda() < GUARDAS) rellenarGuardas();
}, true);

/* Aviso antes de salir del espacio del profesional a la pantalla de acceso */
function confirmarSalidaCoach(){
  const quien = coachActivo ? coachActivo.u : 'tu espacio';
  abrirDialogo({
    titulo: '¿Salir a la pantalla de acceso?',
    texto: 'Se cerrará la sesión de ' + quien + '. Para volver a entrar tendrás que escribir tu contraseña.',
    ok: 'Salir', cancel: 'Cancelar', peligro: true,
    onOk: function(){ coachLogout(); }
  });
}

/* Los avisos flotantes desaparecen al cambiar de pantalla o de pestaña */
function ocultarToast(){
  const t = document.getElementById('fsdToast');
  if (t) t.classList.remove('show');
  clearTimeout(toast._t);
}
(function(){
  const sh = showScreen;
  showScreen = function(id){ ocultarToast(); sh(id); };
  const g = goTo;
  goTo = function(n, s){ if (n !== vistaActual) ocultarToast(); g(n, s); };
})();

/* =========================================================
   Chat estilo grupos de WhatsApp: foto y nombre de quien escribe
   Todo lo que se añade aquí es visual: no se guarda en la conversación.
   ========================================================= */
const MARCAS_CHAT = ['msg-otro', 'msg-mio', 'sin-nombre', 'sin-av'];
function autorBurbuja(b){
  const s = b.querySelector('.sender:not(.sender-x)');
  if (b.classList.contains('out')) return { tipo: 'cliente', nombre: (clientesData[clienteActual] || {}).nombre || 'Cliente' };
  const n = s ? s.textContent.trim() : 'Equipo';
  return { tipo: 'pro', nombre: n };
}
function esMio(b, autor){
  if (!isCoachView()) return b.classList.contains('out');
  return autor.tipo === 'pro' && coachActivo && norm(autor.nombre) === norm(coachActivo.u);
}
function colorAutor(autor){
  if (autor.tipo === 'cliente') return 'av-cli';
  return norm(autor.nombre) === 'fatima' ? 'av-nut' : 'av-ent';
}
function fotoAutor(autor){ return autor.tipo === 'cliente' ? fotoDe('cliente:' + clienteActual) : fotoDe(autor.nombre); }
decorarChat = function(){
  const list = document.getElementById('chatList');
  if (!list) return;
  /* limpiar lo añadido antes */
  Array.prototype.forEach.call(list.querySelectorAll('.msg-av, .msg-av2, .sender-x'), function(x){ x.remove(); });
  const burbujas = Array.prototype.slice.call(list.querySelectorAll('.bubble'));
  const autores = burbujas.map(autorBurbuja);
  burbujas.forEach(function(b, i){
    MARCAS_CHAT.forEach(function(c){ b.classList.remove(c); });
    const a = autores[i];
    const mio = esMio(b, a);
    b.classList.add(mio ? 'msg-mio' : 'msg-otro');
    if (mio) return;
    const mismoAntes = i > 0 && !esMio(burbujas[i - 1], autores[i - 1]) && autores[i - 1].nombre === a.nombre;
    const mismoDespues = i < burbujas.length - 1 && !esMio(burbujas[i + 1], autores[i + 1]) && autores[i + 1].nombre === a.nombre;
    /* nombre encima (solo en el primero de una racha) */
    if (a.tipo === 'cliente') {
      const s = document.createElement('div');
      s.className = 'sender sender-x';
      s.textContent = a.nombre;
      b.insertBefore(s, b.firstChild);
    }
    if (mismoAntes) b.classList.add('sin-nombre');
    /* foto a la izquierda (solo en el último de una racha) */
    if (mismoDespues) { b.classList.add('sin-av'); return; }
    const av = document.createElement('span');
    av.className = 'msg-av2 ' + colorAutor(a);
    av.setAttribute('aria-hidden', 'true');
    const url = fotoAutor(a);
    if (url) { av.style.backgroundImage = 'url("' + url + '")'; av.classList.add('con-foto'); }
    else av.textContent = (a.nombre || '?').trim().charAt(0).toUpperCase();
    b.appendChild(av);
  });
  pintarCabeceraChat();
};
guardarChat = function(){
  if (!clienteActual) return;
  const l = document.getElementById('chatList');
  if (!l) return;
  const copia = l.cloneNode(true);
  Array.prototype.forEach.call(copia.querySelectorAll('.msg-av, .msg-av2, .sender-x'), function(x){ x.remove(); });
  Array.prototype.forEach.call(copia.querySelectorAll('.bubble'), function(b){ MARCAS_CHAT.forEach(function(c){ b.classList.remove(c); }); });
  PLANES[clienteActual] = PLANES[clienteActual] || { ent: '', nut: '' };
  PLANES[clienteActual].chat = copia.innerHTML;
};
/* cabecera del chat del profesional: foto del cliente junto a su nombre */
function pintarCabeceraChat(){
  const t = document.getElementById('chatTitle');
  if (!t) return;
  let w = document.getElementById('chatHead');
  if (!w) {
    w = document.createElement('div');
    w.id = 'chatHead'; w.className = 'chat-head';
    t.parentNode.insertBefore(w, t);
    const av = document.createElement('span');
    av.id = 'chatHeadAv'; av.className = 'chat-head-av av-cli'; av.setAttribute('aria-hidden', 'true');
    w.appendChild(av); w.appendChild(t);
  }
  const av = document.getElementById('chatHeadAv');
  const coach = isCoachView() && clienteActual && clientesData[clienteActual];
  av.hidden = !coach;
  if (!coach) return;
  const url = fotoDe('cliente:' + clienteActual);
  if (url) { av.style.backgroundImage = 'url("' + url + '")'; av.classList.add('con-foto'); av.textContent = ''; }
  else { av.style.backgroundImage = ''; av.classList.remove('con-foto'); av.textContent = (clientesData[clienteActual].nombre || '?').charAt(0).toUpperCase(); }
}
syncChatPerspective = (function(orig){
  return function(){ orig(); decorarChat(); };
})(syncChatPerspective);
decorarChat();

/* =========================================================
   Gramos de todas las opciones de comida y resumen rápido
   - Sin combinación completa: cada opción muestra los gramos que cubren
     el objetivo de su macronutriente en esa comida (equivalencia).
   - Con una opción elegida en cada columna: se mantiene el ajuste exacto.
   ========================================================= */
const MACRO_COLS = [['protein', 'p', '🥩', 'Proteína'], ['carb', 'c', '🍚', 'Carbohidrato'], ['fat', 'f', '🥑', 'Grasa']];
function repartoComida(i, total){
  /* reparto de la calculadora de Fátima; si no suma 100 %, se usa en proporción */
  const ins = Array.prototype.slice.call(document.querySelectorAll('.calc-meal')).slice(0, total);
  const pct = ins.map(function(x){ return Math.max(0, parseFloat(x.value) || 0); });
  const suma = pct.reduce(function(a, b){ return a + b; }, 0);
  if (ins.length < total || !suma) return 1 / total;
  return pct[i] / suma;
}
calcularPlan = (function(orig){
  return function(){
    orig();
    const obj = window.objNutri;
    const blocks = mealBlocks();
    if (obj && blocks.length) {
      blocks.forEach(function(b, i){
        const body = b.querySelector('.meal-body') || b;
        const completa = MACRO_COLS.every(function(m){ return body.querySelector('.chip.' + m[0] + '.selected'); });
        if (completa) return;                                    // ya lo ha calculado el ajuste exacto
        const share = repartoComida(i, blocks.length);
        MACRO_COLS.forEach(function(m){
          const objetivo = obj[m[1]] * share;
          Array.prototype.forEach.call(body.querySelectorAll('.chip.' + m[0]), function(ch){
            if (ch.classList.contains('chip-add')) return;
            const inf = foodInfo(chipName(ch));
            if (!inf || !inf[m[1]]) { setChipQty(ch, ''); return; }
            setChipQty(ch, '· ' + Math.round(objetivo / inf[m[1]] * 100 / 5) * 5 + ' g');
          });
        });
      });
    }
    pintarResumenGramos();
  };
})(calcularPlan);
function pintarResumenGramos(){
  const cont = document.getElementById('comidasCont');
  if (!cont) return;
  let r = document.getElementById('resumenGramos');
  if (!r) {
    r = document.createElement('details');
    r.id = 'resumenGramos'; r.className = 'resumen-g'; r.open = true;
    cont.parentNode.insertBefore(r, cont);
  }
  const blocks = mealBlocks();
  const conOpciones = blocks.filter(function(b){ return b.querySelector('.meal-body .chip:not(.chip-add)'); });
  r.hidden = !conOpciones.length;
  if (!conOpciones.length) { r.innerHTML = ''; return; }
  let h = '<summary><span>Resumen rápido de cantidades</span><small>Elige una opción de cada fila</small></summary><div class="rg-cuerpo">';
  blocks.forEach(function(b){
    const titulo = (b.querySelector('.meal-block-title') || {}).textContent || 'Comida';
    const filas = MACRO_COLS.map(function(m){
      const ops = Array.prototype.filter.call(b.querySelectorAll('.meal-body .chip.' + m[0]), function(ch){ return !ch.classList.contains('chip-add'); })
        .map(function(ch){
          const q = ch.querySelector('.chip-qty');
          const g = q ? q.textContent.replace('·', '').trim() : '';
          return '<span class="rg-op' + (ch.classList.contains('selected') ? ' sel' : '') + '">' + esc(chipName(ch)) + (g ? ' <b>' + esc(g) + '</b>' : '') + '</span>';
        });
      if (!ops.length) return '';
      return '<div class="rg-fila ' + m[0] + '"><span class="rg-ico" title="' + m[3] + '" aria-label="' + m[3] + '">' + m[2] + '</span><div class="rg-ops">' + ops.join('') + '</div></div>';
    }).join('');
    if (!filas) return;
    h += '<div class="rg-comida"><div class="rg-tit">' + esc(titulo.trim()) + '</div>' + filas + '</div>';
  });
  h += '<p class="rg-nota">Cantidades en crudo. Si eliges una opción de cada fila, se ajustan para cuadrar la comida.</p></div>';
  r.innerHTML = h;
}
pick = (function(orig){
  return function(el){ orig(el); if (el && el.closest && el.closest('#comidasCont')) pintarResumenGramos(); };
})(pick);

/* Alta de cliente: el formulario se vacía siempre al abrir «Nuevo cliente» */
const ALTA_CHIPS_INICIO = Array.prototype.map.call(document.querySelectorAll('#view-alta .chip'), function(c){ return c.classList.contains('selected'); });
const ALTA_PISTA_INICIO = (document.getElementById('altaPista') || {}).textContent || '';
function vaciarFormularioAlta(){
  const v = document.getElementById('view-alta');
  if (!v) return;
  Array.prototype.forEach.call(v.querySelectorAll('input, textarea'), function(x){ x.value = ''; x.removeAttribute('value'); });
  Array.prototype.forEach.call(v.querySelectorAll('.chip'), function(c, i){ c.classList.toggle('selected', !!ALTA_CHIPS_INICIO[i]); });
  const ok = document.getElementById('altaOk'); if (ok) ok.classList.remove('show');
  setTxt('altaError', '');
  const b = document.getElementById('confirmBtn'); if (b) b.disabled = false;
  setTxt('altaPista', ALTA_PISTA_INICIO);
  const body = v.querySelector('.alta-body'); if (body) body.scrollTop = 0;
}
goToAlta = (function(orig){
  return function(){ vaciarFormularioAlta(); orig(); };
})(goToAlta);

/* =========================================================
   v0.50.2 · Seguimiento: lo del seguimiento anterior, difuminado de fondo
   ========================================================= */
const SG_RANGOS = [['rEntreno', 'e', 8], ['rNutri', 'n', 8], ['rEstres', 'x', 3]];
function sgAnterior(){
  const lista = (clienteActual && SEGUIMIENTOS[clienteActual]) || [];
  return lista[0] || null;
}
function pintarSeguimientoAnterior(){
  const sec = document.getElementById('view-seguimiento');
  if (!sec) return;
  const r = sgAnterior();
  // textos: progreso, sensaciones, obstáculos, descanso
  const txt = sec.querySelectorAll('.sg-text');
  Array.prototype.forEach.call(txt, function(t, i){
    if (t.dataset.ej == null) t.dataset.ej = t.placeholder;
    let ant = '';
    if (r && r.textos) ant = r.textos[i] || '';
    else if (r && i === 0) ant = r.prog || '';
    t.placeholder = ant || t.dataset.ej;
    t.classList.toggle('sg-ant', !!ant);
  });
  // medidas
  const nums = sec.querySelectorAll('.row2col input');
  MEDIDAS.forEach(function(m, i){
    const inp = nums[i];
    if (!inp) return;
    if (inp.dataset.ej == null) inp.dataset.ej = inp.placeholder;
    const v = r && r.med ? r.med[m[0]] : null;
    inp.placeholder = v != null ? fmtNum(v) : inp.dataset.ej;
    inp.classList.toggle('sg-ant', v != null);
  });
  // escalas (agujetas, motivación): el número anterior con un aro suave
  const filas = sec.querySelectorAll('.esc-row');
  [r && r.agujetas, r && r.m].forEach(function(v, i){
    if (!filas[i]) return;
    Array.prototype.forEach.call(filas[i].querySelectorAll('.esc-btn'), function(b){
      b.classList.toggle('esc-ant', !!v && b.textContent.trim() === String(v));
    });
  });
  // deslizadores: «antes 7» difuminado al lado
  SG_RANGOS.forEach(function(g){
    const out = document.getElementById(g[0]);
    if (!out) return;
    const fila = out.parentElement;
    let s = fila.querySelector('.sg-antes');
    const v = r ? r[g[1]] : null;
    if (v == null || v === '—') { if (s) s.remove(); return; }
    if (!s) { s = document.createElement('span'); s.className = 'sg-antes'; fila.appendChild(s); }
    s.textContent = 'antes ' + v;
  });
  // aviso arriba del formulario
  let aviso = document.getElementById('sgAntAviso');
  if (!r) { if (aviso) aviso.remove(); return; }
  if (!aviso) {
    aviso = document.createElement('div');
    aviso.id = 'sgAntAviso';
    aviso.className = 'sg-ant-aviso';
    const primero = sec.querySelector('.sg-block');
    primero.parentNode.insertBefore(aviso, primero);
  }
  aviso.textContent = 'En gris claro verás lo que pusiste en el seguimiento anterior (' + (r.s || 'último') + ').';
}
function vaciarSeguimiento(){
  const sec = document.getElementById('view-seguimiento');
  if (!sec) return;
  Array.prototype.forEach.call(sec.querySelectorAll('.sg-text, .row2col input'), function(el){ el.value = ''; });
  const filas = sec.querySelectorAll('.esc-row');
  // agujetas vuelve a 1; la motivación queda sin elegir (que la marque el cliente)
  const b0 = filas[0] && filas[0].querySelector('.esc-btn');
  if (b0) setEscala(b0, 'agujetas', 1);
  if (filas[1]) Array.prototype.forEach.call(filas[1].querySelectorAll('.esc-btn'), function(b){ b.classList.remove('on'); });
  const md = document.getElementById('motivDesc');
  if (md) { md.textContent = 'Toca un número para elegir tu grado de motivación.'; md.classList.add('sin-elegir'); }
  SG_RANGOS.forEach(function(g){
    const out = document.getElementById(g[0]);
    const inp = out && out.parentElement.querySelector('input[type=range]');
    if (inp) { inp.value = g[2]; out.textContent = g[2]; }
  });
}
guardarSeguimiento = (function(orig){
  return function(){
    const sec = document.getElementById('view-seguimiento');
    const textos = Array.prototype.map.call(sec.querySelectorAll('.sg-text'), function(t){ return t.value.trim(); });
    const lista = (clienteActual && SEGUIMIENTOS[clienteActual]) || [];
    const antes = lista.length;
    orig();
    const nueva = (clienteActual && SEGUIMIENTOS[clienteActual]) || [];
    if (nueva.length > antes && nueva[0]) { nueva[0].textos = textos; programarGuardado(); }
    vaciarSeguimiento();
    pintarSeguimientoAnterior();
  };
})(guardarSeguimiento);
goTo = (function(orig){
  return function(n, s){ orig(n, s); if (n === 'seguimiento') pintarSeguimientoAnterior(); };
})(goTo);

/* =========================================================
   v0.50.3 · Notas de voz como en WhatsApp
   Mantener pulsado: graba · soltar: envía
   Deslizar arriba: bloquea (sigue grabando sin el dedo) · deslizar a la izquierda: cancela
   ========================================================= */
const VOZ_CANCELAR_PX = 90, VOZ_BLOQUEAR_PX = 70, VOZ_MIN_MS = 600;
const vozG = { estado: 'libre', id: null, x0: 0, y0: 0, t0: 0, stream: null, descartar: false, bloqueada: false };
function vozComposer(){ return document.getElementById('composer'); }
function vozPintarArrastre(dx, dy){
  const h = document.getElementById('recHint');
  const l = document.getElementById('recLock');
  if (h) h.style.transform = 'translateX(' + Math.max(-VOZ_CANCELAR_PX, Math.min(0, dx)) + 'px)';
  if (h) h.style.opacity = String(1 - Math.min(1, Math.max(0, -dx) / VOZ_CANCELAR_PX) * .7);
  if (l) l.style.transform = 'translateY(' + Math.max(-VOZ_BLOQUEAR_PX / 2, Math.min(0, dy / 2)) + 'px)';
}
function vozLimpiarUI(){
  const c = vozComposer();
  if (c) c.classList.remove('voz-sujeta', 'voz-bloqueada');
  vozPintarArrastre(0, 0);
}
/* Arranca la grabación. Si el dedo ya se soltó mientras el móvil pedía permiso, no graba. */
function iniciarGrabacion(){
  if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder)) {
    toast('Este navegador no permite grabar notas de voz.');
    vozG.estado = 'libre'; vozLimpiarUI();
    return;
  }
  vozG.estado = 'pidiendo';
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream){
    if (vozG.estado !== 'pidiendo') {            // se soltó o se canceló antes de tener micrófono
      stream.getTracks().forEach(function(t){ t.stop(); });
      return;
    }
    const mt = formatoAudio();
    try { mediaRec = mt ? new MediaRecorder(stream, { mimeType: mt, audioBitsPerSecond: 24000 }) : new MediaRecorder(stream); }
    catch(e){ mediaRec = new MediaRecorder(stream); }
    vozG.stream = stream; vozG.descartar = false; vozG.t0 = Date.now();
    recChunks = []; recSegs = 0;
    setTxt('recTime', '0:00');
    mediaRec.ondataavailable = function(e){ if (e.data && e.data.size) recChunks.push(e.data); };
    mediaRec.onstop = function(){
      clearInterval(recInt); recInt = null; recUI(false); vozLimpiarUI();
      stream.getTracks().forEach(function(t){ t.stop(); });
      const tipo = (mediaRec && mediaRec.mimeType) || mt || 'audio/mp4';
      const ms = Date.now() - vozG.t0;
      const descartar = vozG.descartar;
      mediaRec = null; vozG.stream = null; vozG.estado = 'libre'; vozG.bloqueada = false;
      if (descartar || !recChunks.length || ms < VOZ_MIN_MS) return;
      const segs = Math.max(1, Math.round(ms / 1000));
      const fr = new FileReader();
      fr.onload = function(){ addAudioBubble(fr.result, segs); };
      fr.readAsDataURL(new Blob(recChunks, { type: tipo }));
    };
    mediaRec.start();
    vozG.estado = 'grabando';
    recUI(true);
    if (navigator.vibrate) { try { navigator.vibrate(30); } catch(e){} }
    recInt = setInterval(function(){
      recSegs++;
      setTxt('recTime', fmtDur(recSegs));
      if (recSegs >= MAX_AUDIO_SEG && mediaRec && mediaRec.state === 'recording') terminarGrabacion(true);
    }, 1000);
  }).catch(function(){
    vozG.estado = 'libre'; vozLimpiarUI();
    toast('Sin permiso para el micrófono. Actívalo en los ajustes del móvil para esta app.');
  });
}
function terminarGrabacion(enviar){
  if (mediaRec && mediaRec.state === 'recording') {
    vozG.descartar = !enviar;
    vozG.estado = 'parando';
    mediaRec.stop();
  } else {
    vozG.estado = 'libre'; vozG.bloqueada = false; vozLimpiarUI();
  }
}
function cancelarGrabacion(){
  terminarGrabacion(false);
  toast('Nota de voz borrada');
}
function bloquearGrabacion(){
  vozG.bloqueada = true;
  const c = vozComposer();
  if (c) { c.classList.remove('voz-sujeta'); c.classList.add('voz-bloqueada'); }
  vozPintarArrastre(0, 0);
  setTxt('recHint', 'Grabando…');
  if (navigator.vibrate) { try { navigator.vibrate(20); } catch(e){} }
}
/* El botón antiguo (tocar para empezar / parar) ya no se usa; queda por si algo lo llama */
toggleMic = function(){
  if (vozG.bloqueada || (mediaRec && mediaRec.state === 'recording')) terminarGrabacion(true);
  else toast('Mantén pulsado el micrófono para grabar.');
};
recUI = (function(orig){
  return function(on){
    orig(on);
    if (on && !vozG.bloqueada) {
      const h = document.getElementById('recHint');
      if (h) h.innerHTML = '<span class="rh-chev">‹</span> Desliza para cancelar';
    }
  };
})(recUI);
(function(){
  const mic = document.getElementById('micBtn');
  if (!mic) return;
  mic.addEventListener('contextmenu', function(e){ e.preventDefault(); });
  mic.addEventListener('pointerdown', function(e){
    if (e.button && e.button !== 0) return;
    e.preventDefault();
    if (vozG.bloqueada) return;                 // con la grabación bloqueada, el botón es «Enviar» (click)
    if (vozG.estado !== 'libre') return;
    vozG.id = e.pointerId; vozG.gesto = e.pointerId; vozG.x0 = e.clientX; vozG.y0 = e.clientY; vozG.tPulsar = Date.now();
    try { mic.setPointerCapture(e.pointerId); } catch(err){}
    const c = vozComposer();
    if (c) c.classList.add('voz-sujeta');
    cerrarEmojis();
    iniciarGrabacion();
  });
  mic.addEventListener('pointermove', function(e){
    if (e.pointerId !== vozG.id || vozG.bloqueada || vozG.estado === 'libre') return;
    const dx = e.clientX - vozG.x0, dy = e.clientY - vozG.y0;
    if (dx < -VOZ_CANCELAR_PX) { vozG.id = null; cancelarGrabacion(); return; }
    if (dy < -VOZ_BLOQUEAR_PX && Math.abs(dx) < VOZ_CANCELAR_PX / 2) { vozG.id = null; bloquearGrabacion(); return; }
    vozPintarArrastre(dx, dy);
  });
  const soltar = function(e){
    // al soltar el dedo tras bloquear, el navegador manda un «click» que no debe enviar la nota
    if (e.pointerId === vozG.gesto) { vozG.gesto = null; if (vozG.bloqueada) vozG.ignorarClickHasta = Date.now() + 400; }
    if (e.pointerId !== vozG.id) return;
    vozG.id = null;
    if (vozG.bloqueada) return;
    const corto = Date.now() - (vozG.tPulsar || 0) < VOZ_MIN_MS;
    if (vozG.estado === 'pidiendo') {          // aún no había micrófono (p. ej. el móvil pedía permiso)
      vozG.estado = 'libre'; vozLimpiarUI();
      if (corto && e.type === 'pointerup') toast('Mantén pulsado el micrófono para grabar.');
      return;
    }
    if (vozG.estado !== 'grabando') return;
    if (corto) { terminarGrabacion(false); toast('Mantén pulsado el micrófono para grabar.'); return; }
    terminarGrabacion(e.type === 'pointerup');
  };
  mic.addEventListener('pointerup', soltar);
  mic.addEventListener('pointercancel', soltar);
  // con la grabación bloqueada, el botón del micrófono pasa a ser «Enviar»
  mic.addEventListener('click', function(){
    if (!vozG.bloqueada || Date.now() < (vozG.ignorarClickHasta || 0)) return;
    terminarGrabacion(true);
  });
})();
/* si se sale del chat a mitad de grabación, se descarta */
goTo = (function(orig){
  return function(n, s){ if (n !== 'chat' && vozG.estado !== 'libre') terminarGrabacion(false); orig(n, s); };
})(goTo);

/* =========================================================
   v0.50.4 · Seguimiento: la motivación hay que elegirla (antes venía marcada en 1)
   ========================================================= */
setEscala = (function(orig){
  return function(btn, grupo, n){ orig(btn, grupo, n); const d = document.getElementById(grupo + 'Desc'); if (d) d.classList.remove('sin-elegir'); };
})(setEscala);
guardarSeguimiento = (function(orig){
  return function(){
    const sec = document.getElementById('view-seguimiento');
    const filas = sec.querySelectorAll('.esc-row');
    if (filas[1] && !filas[1].querySelector('.esc-btn.on')) {
      toast('Elige tu grado de motivación antes de enviar.');
      filas[1].scrollIntoView({ behavior: 'smooth', block: 'center' });
      filas[1].classList.remove('falta'); void filas[1].offsetWidth; filas[1].classList.add('falta');
      return;
    }
    orig();
  };
})(guardarSeguimiento);

/* =========================================================
   v0.50.5 · Notas de voz: formato según el móvil, ondas que siguen el audio,
   tocar para saltar y velocidad x1 · x1,2 · x1,5 · x2
   ========================================================= */
/* iPhone graba y reproduce mp4; Android (Chrome) se lleva mejor con webm/opus */
formatoAudio = function(){
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
  const opciones = esIOS
    ? ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (let i = 0; i < opciones.length; i++) if (MediaRecorder.isTypeSupported(opciones[i])) return opciones[i];
  return '';
};
const VELOCIDADES = [1, 1.2, 1.5, 2];
let velAudio = 1;
try { const v = parseFloat(localStorage.getItem('fsd_audio_vel')); if (VELOCIDADES.indexOf(v) > -1) velAudio = v; } catch(e){}
function txtVel(v){ return 'x' + String(v).replace('.', ','); }
function segsDeTexto(t){ const p = String(t || '').split(':'); return p.length === 2 ? (+p[0]) * 60 + (+p[1]) : 0; }
function audioDe(w){ return w.querySelector('audio'); }
function duracionAudio(w){
  const a = audioDe(w);
  if (a && isFinite(a.duration) && a.duration > 0) return a.duration;
  return parseFloat(w.dataset.dur) || 0;   // webm de Android a veces no trae la duración
}
/* añade el botón de velocidad y el punto de avance a cada nota de voz (no se guardan) */
function prepararAudios(){
  const list = document.getElementById('chatList');
  if (!list) return;
  Array.prototype.forEach.call(list.querySelectorAll('.audio-b'), function(w){
    const d = w.querySelector('.audio-dur');
    if (!w.dataset.dur && d) w.dataset.dur = segsDeTexto(d.textContent);
    const wave = w.querySelector('.wave');
    if (wave && !wave.querySelector('.wave-dot')) {
      const dot = document.createElement('b'); dot.className = 'wave-dot'; wave.appendChild(dot);
      wave.setAttribute('role', 'slider'); wave.setAttribute('aria-label', 'Avance de la nota de voz');
    }
    if (!w.querySelector('.audio-vel')) {
      const v = document.createElement('button');
      v.type = 'button'; v.className = 'audio-vel'; v.setAttribute('aria-label', 'Velocidad de reproducción');
      v.textContent = txtVel(velAudio);
      w.appendChild(v);
    }
    if (!audioDe(w)) w.classList.add('sin-audio');
  });
}
function pintarAvance(w, t){
  const tot = duracionAudio(w);
  const f = tot ? Math.max(0, Math.min(1, t / tot)) : 0;
  const barras = w.querySelectorAll('.wave i');
  const n = Math.round(f * barras.length);
  Array.prototype.forEach.call(barras, function(b, i){ b.classList.toggle('on', i < n); });
  const dot = w.querySelector('.wave-dot');
  if (dot) dot.style.left = (f * 100) + '%';
  const d = w.querySelector('.audio-dur');
  if (d) d.textContent = (t > 0 || w.classList.contains('sonando')) ? fmtDur(Math.floor(t)) : fmtDur(Math.round(tot));
  const wave = w.querySelector('.wave');
  if (wave) wave.setAttribute('aria-valuenow', Math.round(f * 100));
}
let audioActual = null, audioRaf = null;
function seguirAudio(){
  if (!audioActual) return;
  const a = audioDe(audioActual);
  if (a) pintarAvance(audioActual, a.currentTime);
  audioRaf = requestAnimationFrame(seguirAudio);
}
function pararOtros(w){
  Array.prototype.forEach.call(document.querySelectorAll('#chatList .audio-b.sonando'), function(o){
    if (o === w) return;
    const a = audioDe(o); if (a) a.pause();
  });
}
function errorAudio(a){
  const e = a && a.error;
  if (e && e.code === 4) toast('Este móvil no puede reproducir esta nota de voz (formato no compatible).');
  else toast('No se ha podido reproducir la nota de voz. Revisa el volumen multimedia y vuelve a intentarlo.');
}
function enlazarAudio(w){
  const a = audioDe(w);
  if (!a || a.dataset.enlazado) return a;
  a.dataset.enlazado = '1';
  const btn = w.querySelector('.audio-play');
  a.addEventListener('play', function(){
    w.classList.add('sonando'); if (btn) btn.textContent = '❚❚';
    audioActual = w; cancelAnimationFrame(audioRaf); seguirAudio();
  });
  a.addEventListener('pause', function(){
    w.classList.remove('sonando'); if (btn) btn.textContent = '▶';
    if (audioActual === w) { cancelAnimationFrame(audioRaf); audioActual = null; }
    pintarAvance(w, a.currentTime);
  });
  a.addEventListener('ended', function(){
    a.currentTime = 0; w.classList.remove('sonando'); if (btn) btn.textContent = '▶'; pintarAvance(w, 0);
  });
  a.addEventListener('error', function(){ errorAudio(a); });
  a.addEventListener('loadedmetadata', function(){ if (!a.currentTime) pintarAvance(w, 0); });
  return a;
}
reproducirAudio = function(btn){
  const w = btn.closest('.audio-b');
  const a = w && enlazarAudio(w);
  if (!a) { toast('Esta nota de voz no se guardó (se grabó en una versión de prueba).'); return; }
  if (!a.paused) { a.pause(); return; }
  pararOtros(w);
  a.playbackRate = velAudio;
  const p = a.play();
  if (p && p.catch) p.catch(function(err){ if (err && err.name !== 'AbortError') errorAudio(a); });
};
(function(){
  const list = document.getElementById('chatList');
  if (!list) return;
  // tocar o arrastrar sobre las ondas: salta a ese momento
  let arrastre = null;
  const saltar = function(e){
    const w = arrastre; if (!w) return;
    const wave = w.querySelector('.wave'), a = enlazarAudio(w);
    if (!wave || !a) return;
    const r = wave.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const t = f * duracionAudio(w);
    try { a.currentTime = t; } catch(err){}
    pintarAvance(w, t);
    w.classList.add('buscando');
  };
  list.addEventListener('pointerdown', function(e){
    const wave = e.target.closest('.audio-b .wave');
    if (!wave) return;
    e.preventDefault();
    arrastre = wave.closest('.audio-b');
    try { wave.setPointerCapture(e.pointerId); } catch(err){}
    saltar(e);
  });
  list.addEventListener('pointermove', function(e){ if (arrastre) saltar(e); });
  const fin = function(){
    if (!arrastre) return;
    const w = arrastre; arrastre = null;
    setTimeout(function(){ w.classList.remove('buscando'); }, 900);
  };
  list.addEventListener('pointerup', fin);
  list.addEventListener('pointercancel', fin);
  // botón de velocidad: x1 → x1,2 → x1,5 → x2 → x1 (se recuerda en este móvil)
  list.addEventListener('click', function(e){
    const b = e.target.closest('.audio-vel');
    if (!b) return;
    velAudio = VELOCIDADES[(VELOCIDADES.indexOf(velAudio) + 1) % VELOCIDADES.length];
    try { localStorage.setItem('fsd_audio_vel', String(velAudio)); } catch(err){}
    Array.prototype.forEach.call(document.querySelectorAll('#chatList .audio-vel'), function(x){ x.textContent = txtVel(velAudio); });
    Array.prototype.forEach.call(document.querySelectorAll('#chatList audio'), function(a){ a.playbackRate = velAudio; });
  });
})();
decorarChat = (function(orig){
  return function(){ orig(); prepararAudios(); };
})(decorarChat);
guardarChat = (function(orig){
  return function(){
    const l = document.getElementById('chatList');
    if (!l || !clienteActual) return orig();
    // se guarda la nota tal cual se grabó: sin botón de velocidad, sin avance y con su duración
    orig();
    const tmp = document.createElement('div');
    tmp.innerHTML = PLANES[clienteActual].chat || '';
    Array.prototype.forEach.call(tmp.querySelectorAll('.audio-vel, .wave-dot'), function(x){ x.remove(); });
    Array.prototype.forEach.call(tmp.querySelectorAll('.audio-b'), function(w){
      w.classList.remove('sonando', 'buscando', 'sin-audio');
      Array.prototype.forEach.call(w.querySelectorAll('.wave i.on'), function(i){ i.classList.remove('on'); });
      const wave = w.querySelector('.wave');
      if (wave) { wave.removeAttribute('role'); wave.removeAttribute('aria-label'); wave.removeAttribute('aria-valuenow'); }
      const btn = w.querySelector('.audio-play'); if (btn) btn.textContent = '▶';
      const d = w.querySelector('.audio-dur'); if (d && w.dataset.dur) d.textContent = fmtDur(Math.round(+w.dataset.dur));
      const a = w.querySelector('audio'); if (a) a.removeAttribute('data-enlazado');
    });
    PLANES[clienteActual].chat = tmp.innerHTML;
  };
})(guardarChat);
prepararAudios();
