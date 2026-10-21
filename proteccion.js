/* =========================================================
   Fitnessindramas — Protección (mejoras de la auditoría de seguridad, 22/10/2026)
   A · Cierre automático: la sesión de Domingo o Fátima se cierra tras 30 minutos sin usar la app
       (lo que se estuviera editando se guarda antes, sin avisar al cliente).
   B · Copias de seguridad con contraseña: la copia completa se cifra en el propio navegador
       (AES-GCM 256, clave derivada con PBKDF2-SHA256, 310.000 iteraciones). Para restaurarla se pide la contraseña.
   C · Datos de pago (Bizum y transferencia) fuera del código: se configuran en Ajustes → Pagos de clientes.
   ========================================================= */

/* ---------- A · cierre por inactividad ---------- */
const PR_INACTIVO_MIN = 30;
let prUltimaActividad = Date.now();
['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function(ev){ document.addEventListener(ev, function(){ prUltimaActividad = Date.now(); }, { passive: true, capture: true }); });
function prCerrarPorInactividad(){
  if (!coachActivo) return;
  try {
    if (coachEditing) {                                    // se guarda tal cual, sin notificar al cliente
      try { guardarPlan(); } catch(e){}
      coachEditing = false;
      const app = document.getElementById('app'); if (app) app.classList.remove('coach-edit');
    }
    try { guardarTodo(); } catch(e){}
    document.querySelectorAll('.fsd-overlay.show, .picker-overlay.show, #exPicker.show, #foodPicker.show').forEach(function(o){ o.classList.remove('show'); });
    if (pantallaVisible() === 'app' && isCoachView()) { try { backToCliente(); } catch(e){} }
    coachLogout();
  } catch(e){ try { coachLogout(); } catch(_){} }
  setTimeout(function(){
    abrirDialogo({ titulo: 'Sesión cerrada por seguridad', texto: 'Llevabas ' + PR_INACTIVO_MIN + ' minutos sin usar la app y se ha cerrado la sesión para proteger los datos de tus clientes. Lo que estabas editando se ha guardado. Vuelve a entrar con tu contraseña.', ok: 'Entendido', soloOk: true });
  }, 200);
}
function prRevisarInactividad(){
  if (coachActivo && Date.now() - prUltimaActividad >= PR_INACTIVO_MIN * 60000) prCerrarPorInactividad();
}
setInterval(prRevisarInactividad, 30000);
document.addEventListener('visibilitychange', function(){ if (!document.hidden) prRevisarInactividad(); });
window.addEventListener('focus', prRevisarInactividad);
fsdTras('entrarComo', function(){ prUltimaActividad = Date.now(); });

/* ---------- B · copias de seguridad cifradas ---------- */
const PR_ITER = 310000;
function prB64(buf){ let s = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
function prDeB64(t){ const s = atob(t), b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i); return b; }
function prClave(pw, sal, iter){
  return crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']).then(function(k){
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: iter, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  });
}
function prCifrar(texto, pw){
  const sal = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  return prClave(pw, sal, PR_ITER).then(function(k){ return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, k, new TextEncoder().encode(texto)); })
    .then(function(c){ return { app: 'fitness-sin-dramas', tipo: 'cifrada', v: 1, alg: 'AES-GCM-256 / PBKDF2-SHA256', iter: PR_ITER, sal: prB64(sal), iv: prB64(iv), creada: new Date().toISOString(), datos: prB64(c) }; });
}
function prDescifrar(o, pw){
  return prClave(pw, prDeB64(o.sal), o.iter || PR_ITER).then(function(k){ return crypto.subtle.decrypt({ name: 'AES-GCM', iv: prDeB64(o.iv) }, k, prDeB64(o.datos)); })
    .then(function(b){ return new TextDecoder().decode(b); });
}
let prPwCopia = null;
/* la copia completa pasa por aquí: si hay contraseña elegida, se entrega cifrada */
entregarArchivo = (function(orig){
  return function(nombre, obj){
    if (obj && obj.tipo === 'completa' && obj.datos) {
      try { obj.datos.pagosCfg = typeof mjCfgPagos === 'function' ? mjCfgPagos() : null; } catch(e){}
      if (prPwCopia) {
        const pw = prPwCopia; prPwCopia = null;
        toast('Cifrando la copia…');
        prCifrar(JSON.stringify(obj), pw).then(function(c){ orig.call(this, nombre.replace(/\.json$/, '') + '-cifrada.json', c); })
          .catch(function(){ toast('No se ha podido cifrar la copia'); });
        return;
      }
    }
    return orig.apply(this, arguments);
  };
})(entregarArchivo);
function prHojaPw(titulo, texto, doble, conSin, alOk){
  const o = mjHoja('prPw');
  o.innerHTML = '<div class="fsd-sheet dlg"><h3>' + esc(titulo) + '</h3><p>' + texto + '</p>'
    + '<div class="field"><label for="prPw1">Contraseña de la copia</label><input type="password" id="prPw1" autocomplete="new-password" minlength="8"></div>'
    + (doble ? '<div class="field"><label for="prPw2">Repítela</label><input type="password" id="prPw2" autocomplete="new-password"></div>' : '')
    + '<p class="ajx-note" id="prPwErr" role="alert"></p>'
    + '<div class="btn-row"><button class="btn-eq" onclick="mjCerrarHoja(\'prPw\')">Cancelar</button><button class="btn-eq btn-eq-p" id="prPwOk">' + (doble ? 'Descargar cifrada' : 'Abrir copia') + '</button></div>'
    + (conSin ? '<button type="button" class="pr-sin" id="prPwSin">Descargar sin contraseña (no recomendado)</button>' : '') + '</div>';
  o.classList.add('show');
  const i1 = document.getElementById('prPw1'), err = document.getElementById('prPwErr');
  setTimeout(function(){ try { i1.focus(); } catch(e){} }, 60);
  const ok = function(){
    const a = i1.value, b = doble ? document.getElementById('prPw2').value : a;
    if (a.length < 8) { err.textContent = 'Usa al menos 8 caracteres (mejor una frase).'; return; }
    if (a !== b) { err.textContent = 'Las dos contraseñas no coinciden.'; return; }
    alOk(a, err);
  };
  document.getElementById('prPwOk').onclick = ok;
  o.querySelectorAll('input').forEach(function(i){ i.addEventListener('keydown', function(e){ if (e.key === 'Enter') ok(); }); });
  const sin = document.getElementById('prPwSin'); if (sin) sin.onclick = function(){ mjCerrarHoja('prPw'); conSin(); };
}
descargarCopiaCompleta = (function(orig){
  return function(){
    const self = this, args = arguments;
    prHojaPw('Copia de seguridad', 'La copia lleva datos de salud de tus clientes. Ponle una contraseña: sin ella nadie podrá abrirla. <b>Guárdala bien: si la olvidas, la copia no se puede recuperar.</b>', true,
      function(){ prPwCopia = null; orig.apply(self, args); },
      function(pw){ mjCerrarHoja('prPw'); prPwCopia = pw; orig.apply(self, args); });
  };
})(descargarCopiaCompleta);
/* restaurar: si la copia está cifrada, se pide la contraseña y se sigue como siempre */
restaurarCopia = (function(orig){
  return function(inp){
    const f = inp && inp.files && inp.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = function(){
      let o = null; try { o = JSON.parse(r.result); } catch(e){}
      const seguir = function(texto){
        try { const d = JSON.parse(texto); if (d && d.datos && d.datos.pagosCfg && typeof mjGuardarCfgPagos === 'function') { const act = mjCfgPagos(); if (!act.iban && !act.bizum1) mjGuardarCfgPagos(Object.assign(act, d.datos.pagosCfg)); } } catch(e){}
        let file; try { file = new File([texto], f.name, { type: 'application/json' }); } catch(e){ file = new Blob([texto], { type: 'application/json' }); }
        orig.call(this, { files: [file] });
      };
      if (o && o.tipo === 'cifrada') {
        prHojaPw('Copia protegida', 'Escribe la contraseña que pusiste al descargar esta copia.', false, null, function(pw, err){
          err.textContent = 'Comprobando…';
          prDescifrar(o, pw).then(function(t){ mjCerrarHoja('prPw'); seguir(t); }).catch(function(){ err.textContent = 'Contraseña incorrecta o copia dañada.'; });
        });
      } else seguir(r.result);
    };
    r.onerror = function(){ toast('No se ha podido leer el archivo'); };
    r.readAsText(f);
  };
})(restaurarCopia);

/* ---------- C · Bizum y transferencia en Ajustes → Pagos de clientes ---------- */
function prPagoTxt(c){ const n = [c.bizum1, c.bizum2].filter(Boolean).length; return (n ? 'Bizum (' + n + ')' : 'Sin Bizum') + ' · ' + (c.iban ? 'IBAN …' + String(c.iban).replace(/\s/g, '').slice(-4) : 'sin IBAN'); }
htmlAjustes = (function(orig){
  return function(){
    let h = orig.apply(this, arguments);
    const i = h.indexOf('onclick="mjEditarEnlace()"'); if (i < 0) return h;
    const fin = h.indexOf('</div>', h.indexOf('<span class="chev">', i)) + 6;
    const fila = '<div class="list-row" onclick="prEditarDatosPago()"><span>Bizum y transferencia</span><span class="ajx-acts"><span class="ajx-val">' + esc(prPagoTxt(mjCfgPagos())) + '</span><span class="chev">›</span></span></div>';
    return h.slice(0, fin) + fila + h.slice(fin);
  };
})(htmlAjustes);
function prEditarDatosPago(){
  const c = mjCfgPagos(), o = mjHoja('prPago');
  const campo = function(id, lbl, v, ph, tipo){ return '<div class="field"><label for="' + id + '">' + lbl + '</label><input type="' + (tipo || 'text') + '" id="' + id + '" value="' + esc(v || '') + '" placeholder="' + ph + '"></div>'; };
  o.innerHTML = '<div class="fsd-sheet full"><div class="sheet-head"><h3>Bizum y transferencia</h3><button class="x-btn" onclick="mjCerrarHoja(\'prPago\')" aria-label="Cerrar">×</button></div>'
    + '<p class="ajx-note">Los clientes los ven en «¿Cómo renovar?» cuando su tarifa está a punto de vencer, vencida o en gracia, con el concepto ya escrito. Se guardan en este dispositivo y en la copia de seguridad, no en el código de la app.</p>'
    + '<div class="alta-label">Bizum</div>' + campo('prBz1', 'Número 1', c.bizum1, '+34 600 000 000', 'tel') + campo('prBz2', 'Número 2 (opcional)', c.bizum2, '+34 600 000 000', 'tel')
    + '<div class="alta-label">Transferencia</div>' + campo('prIban', 'IBAN', c.iban, 'ES00 0000 0000 0000 0000 0000') + campo('prTit', 'Titular', c.titular, 'Nombre del titular') + campo('prBanco', 'Banco', c.banco, 'Banco')
    + '<p class="ajx-note" id="prPagoErr" role="alert"></p><button class="btn-primary" onclick="prGuardarDatosPago()">Guardar</button></div>';
  o.classList.add('show');
}
function prGuardarDatosPago(){
  const v = function(id){ return document.getElementById(id).value.trim(); }, err = document.getElementById('prPagoErr');
  const tel = function(t){ return !t || /^\+?[\d\s]{9,16}$/.test(t); };
  const iban = v('prIban').toUpperCase().replace(/\s+/g, ' ');
  if (!tel(v('prBz1')) || !tel(v('prBz2'))) { err.textContent = 'Revisa los números de Bizum (solo cifras, espacios y +).'; return; }
  if (iban && !/^[A-Z]{2}\d{2}[A-Z0-9 ]{10,32}$/.test(iban)) { err.textContent = 'Ese IBAN no parece válido.'; return; }
  const c = mjCfgPagos();
  c.bizum1 = v('prBz1'); c.bizum2 = v('prBz2'); c.iban = iban; c.titular = v('prTit').slice(0, 80); c.banco = v('prBanco').slice(0, 60);
  mjGuardarCfgPagos(c);
  mjCerrarHoja('prPago'); try { renderAjustes('coach'); } catch(e){}
  toast('Datos de pago guardados');
}
if (typeof atrasDentroApp === 'function') atrasDentroApp = (function(orig){ return function(){ if (capaVisible('prPw')) { mjCerrarHoja('prPw'); return true; } if (capaVisible('prPago')) { mjCerrarHoja('prPago'); return true; } return orig(); }; })(atrasDentroApp);
