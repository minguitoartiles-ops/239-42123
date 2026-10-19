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
