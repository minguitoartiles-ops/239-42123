// Diseño · Fase 3: iconos de línea y avatares con inicial.
// Iconos: Lucide (licencia ISC, https://lucide.dev). Trazo 2 px, 24 px, color del texto.
// Los emojis se quedan solo donde aportan emoción (caras, reacciones, logros).
(function(){
  const P = {"sun": "<circle cx=\"12\" cy=\"12\" r=\"4\"/> <path d=\"M12 2v2\"/> <path d=\"M12 20v2\"/> <path d=\"m4.93 4.93 1.41 1.41\"/> <path d=\"m17.66 17.66 1.41 1.41\"/> <path d=\"M2 12h2\"/> <path d=\"M20 12h2\"/> <path d=\"m6.34 17.66-1.41 1.41\"/> <path d=\"m19.07 4.93-1.41 1.41\"/>", "utensils": "<path d=\"M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2\"/> <path d=\"M7 2v20\"/> <path d=\"M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7\"/>", "dumbbell": "<path d=\"M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z\"/> <path d=\"m2.5 21.5 1.4-1.4\"/> <path d=\"m20.1 3.9 1.4-1.4\"/> <path d=\"M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z\"/> <path d=\"m9.6 14.4 4.8-4.8\"/>", "trending-up": "<path d=\"M16 7h6v6\"/> <path d=\"m22 7-8.5 8.5-5-5L2 17\"/>", "message-circle": "<path d=\"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719\"/>", "settings": "<path d=\"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915\"/> <circle cx=\"12\" cy=\"12\" r=\"3\"/>", "users": "<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/> <path d=\"M16 3.128a4 4 0 0 1 0 7.744\"/> <path d=\"M22 21v-2a4 4 0 0 0-3-3.87\"/> <circle cx=\"9\" cy=\"7\" r=\"4\"/>", "clipboard-list": "<rect width=\"8\" height=\"4\" x=\"8\" y=\"2\" rx=\"1\" ry=\"1\"/> <path d=\"M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/> <path d=\"M12 11h4\"/> <path d=\"M12 16h4\"/> <path d=\"M8 11h.01\"/> <path d=\"M8 16h.01\"/>", "menu": "<path d=\"M4 5h16\"/> <path d=\"M4 12h16\"/> <path d=\"M4 19h16\"/>", "credit-card": "<rect width=\"20\" height=\"14\" x=\"2\" y=\"5\" rx=\"2\"/> <line x1=\"2\" x2=\"22\" y1=\"10\" y2=\"10\"/> <path d=\"M6 14h2\"/>", "chef-hat": "<path d=\"M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z\"/> <path d=\"M6 17h12\"/>", "salad": "<path d=\"M19.496 12a2.5 2.5 0 00.399-2.214A2 2 0 0020.32 6.5 2 2 0 0019 3a2 2 0 00-1.5.68 2 2 0 00-3.287.424 2.5 2.5 0 00-3.189 2.06A3 3 0 0012 12l4-4\"/> <path d=\"M4 12a1 1 0 00-.99 1.133A9 9 0 0012 21a9 9 0 008.99-7.867A1 1 0 0020 12z\"/> <path d=\"M7 21h10\"/> <path d=\"M9.85 6.907A3.5 3.5 0 005.05 12\"/>", "clipboard-pen": "<path d=\"M16 4h2a2 2 0 0 1 2 2v2\"/> <path d=\"M21.34 15.664a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z\"/> <path d=\"M8 22H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2\"/> <rect x=\"8\" y=\"2\" width=\"8\" height=\"4\" rx=\"1\"/>", "file-text": "<path d=\"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z\"/> <path d=\"M14 2v5a1 1 0 0 0 1 1h5\"/> <path d=\"M10 9H8\"/> <path d=\"M16 13H8\"/> <path d=\"M16 17H8\"/>"};
  const MAP = {'☀':'sun','🍕':'utensils','🍽':'utensils','🍲':'chef-hat','🥗':'salad','🏋':'dumbbell','📈':'trending-up','💬':'message-circle','⚙':'settings','👥':'users','📋':'clipboard-list','☰':'menu','💳':'credit-card','📝':'clipboard-pen','📄':'file-text'};
  function svg(n){ return '<svg class="ico" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + P[n] + '</svg>'; }
  function clave(t){ return (t || '').replace(/[\uFE0F\u200D]/g, '').replace(/[\u{1F3FB}-\u{1F3FF}]/gu, '').replace(/\u2642|\u2640/g, '').trim(); }
  window.fsdIcono = function(n){ return P[n] ? svg(n) : ''; };
  // Contenedor con solo un emoji (pestañas, accesos de la ficha)
  function ponerEn(el){
    const t = clave(el.textContent);
    if (!t || !MAP[t]) return;
    if (el.dataset.ico === t && el.querySelector('svg.ico')) return;
    el.dataset.ico = t; el.dataset.emo = el.textContent;
    el.innerHTML = svg(MAP[t]);
  }
  // Fila de lista que empieza por emoji («🍲 Recetas para clientes»)
  function ponerFila(sp){
    const n = sp.firstChild;
    if (!n || n.nodeType !== 3) return;
    const m = n.textContent.match(/^\s*(\S+?)\s+(.*)$/u);
    if (!m) return;
    const t = clave(m[1]);
    if (!MAP[t]) return;
    n.textContent = m[2];
    sp.insertAdjacentHTML('afterbegin', svg(MAP[t]).replace('class="ico"', 'class="ico ico-fila"'));
  }
  // Avatar sin foto: inicial sobre color
  function inicialDe(av){
    let k = av.dataset.k;
    const card = av.closest('[data-k],.kcard,.cliente-card,.chat-fila,.sg-card,.list-row,.plan-fila,.esc-fila') || av.parentElement;
    if (!k && card) {
      k = card.dataset && card.dataset.k;
      if (!k) { const oc = (card.getAttribute && (card.getAttribute('onclick') || '')) || ''; const mm = oc.match(/\(\s*'([^']+)'/); if (mm) k = mm[1]; }
    }
    let nom = '';
    try { if (k && typeof clientesData !== 'undefined' && clientesData[k]) nom = clientesData[k].nombre || ''; } catch (e) {}
    if (!nom && card) { const b = card.querySelector('b, strong, .kc-nombre, .chat-fila-n2, h3'); if (b) nom = b.textContent; }
    nom = (nom || '').trim();
    return nom ? nom.charAt(0).toLocaleUpperCase('es') : '';
  }
  function ponerAvatar(av){
    if (av.classList.contains('con-foto') || av.style.backgroundImage) { av.classList.remove('av-ini'); return; }
    if (av.textContent.trim()) { av.classList.add('av-ini'); delete av.dataset.ini; return; }
    let i = inicialDe(av);
    if (!i && av.closest('#view-hoy')) { try { const d = clientesData[clienteActual]; if (d && d.nombre) i = d.nombre.charAt(0).toLocaleUpperCase('es'); } catch (e) {} }
    if (!i) return;
    if (av.dataset.ini !== i) av.dataset.ini = i;
    av.classList.add('av-ini');
  }
  let pend = false;
  function repasar(){
    pend = false;
    document.querySelectorAll('.tbi-emo, .acc-btn > span[aria-hidden="true"]').forEach(ponerEn);
    document.querySelectorAll('.list-row > span:first-child').forEach(ponerFila);
    document.querySelectorAll('.avatar').forEach(ponerAvatar);
  }
  function pedir(){ if (!pend) { pend = true; requestAnimationFrame(repasar); } }
  function iniciar(){
    repasar();
    new MutationObserver(pedir).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();

/* =========================================================
   5/11/2026 · Auditoría de movimiento (0.84.0-1)
   1 · Al cerrar una ventana se deja un momento para su animación de salida.
   2 · Las ventanas informativas se cierran tocando fuera y con Esc (los diálogos de confirmación
       y los formularios, no: así nadie pierde nada por un toque sin querer).
   4 · Chat: el mensaje que llega o se envía entra con suavidad.
   ========================================================= */
(function(){
  const VENTANAS = '.fsd-overlay, .noti-pop, .picker-overlay';
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.MutationObserver && !reduce) {
    new MutationObserver(function(rs){
      rs.forEach(function(r){
        const el = r.target;
        if (!el.matches || !el.matches(VENTANAS)) return;
        const antes = /(^|\s)show(\s|$)/.test(r.oldValue || ''), ahora = el.classList.contains('show');
        if (antes && !ahora) {
          el.classList.add('fsd-cerrando');
          clearTimeout(el._fsdCierre);
          el._fsdCierre = setTimeout(function(){ el.classList.remove('fsd-cerrando'); }, 160);
        } else if (ahora && el.classList.contains('fsd-cerrando')) {
          clearTimeout(el._fsdCierre); el.classList.remove('fsd-cerrando');
        }
      });
    }).observe(document.body, { attributes: true, attributeFilter: ['class'], attributeOldValue: true, subtree: true });
  }

  /* cerrar tocando fuera / con Esc: solo las informativas */
  const CERRAR = {
    legalOverlay: function(){ cerrarLegal(); },
    chatFicha: function(){ mjCerrarHoja('chatFicha'); },
    chatGaleria: function(){ mjCerrarHoja('chatGaleria'); },
    notiPop: function(){ cerrarNotis(); },
    notiPopCoach: function(){ cerrarNotisCoach(); }
  };
  document.addEventListener('click', function(e){
    const o = e.target;
    if (!o || !o.id || !CERRAR[o.id] || !o.classList.contains('show')) return;   // solo el fondo, no lo de dentro
    e.stopPropagation();
    try { CERRAR[o.id](); } catch(_){ o.classList.remove('show'); }
  }, true);
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Escape') return;
    const abiertas = Object.keys(CERRAR).map(function(id){ return document.getElementById(id); }).filter(function(o){ return o && o.classList.contains('show'); });
    if (!abiertas.length) return;
    try { CERRAR[abiertas[abiertas.length - 1].id](); } catch(_){}
  });

  /* mensajes nuevos del chat (los que se añaden sin rehacer la lista) */
  if (typeof MARCAS_CHAT !== 'undefined' && MARCAS_CHAT.indexOf('msg-nuevo') < 0) MARCAS_CHAT.push('msg-nuevo');
  const l = document.getElementById('chatList');
  if (l && window.MutationObserver && !reduce) {
    new MutationObserver(function(rs){
      rs.forEach(function(r){
        if (r.removedNodes.length) return;
        const nuevos = Array.prototype.filter.call(r.addedNodes, function(n){ return n.nodeType === 1 && n.classList.contains('bubble'); });
        if (nuevos.length && nuevos.length <= 3) nuevos.forEach(function(b){ b.classList.add('msg-nuevo'); });
      });
    }).observe(l, { childList: true });
  }
  document.addEventListener('animationend', function(e){ if (e.target && e.target.classList && e.target.classList.contains('msg-nuevo')) e.target.classList.remove('msg-nuevo'); });
})();
