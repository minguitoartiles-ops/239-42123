/* =========================================================
   11/11/2026 · MUESTRA «diseño de la web»: se activa solo con ?diseno=web en la dirección.
   Añade la clase html.dw, carga diseno-web.css y, en la pantalla Hoy, cambia los emojis
   de botones y tarjetas por iconos de línea (Lucide, licencia ISC, https://lucide.dev),
   como pide el sistema de diseño. Los emojis del chat y de las caras de ánimo no se tocan.
   No guarda nada: al abrir la app sin ?diseno=web todo sigue como siempre.
   ========================================================= */
(function(){
  let activa = false;
  try { activa = new URLSearchParams(location.search).get('diseno') === 'web'; } catch(e){}
  if (!activa) return;
  document.documentElement.classList.add('dw');
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'diseno-web.css';
  document.head.appendChild(l);

  const P = {
    'circle-check': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    'calendar': '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    'dumbbell': '<path d="M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z"/><path d="m2.5 21.5 1.4-1.4"/><path d="m20.1 3.9 1.4-1.4"/><path d="M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z"/><path d="m9.6 14.4 4.8-4.8"/>',
    'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    'utensils': '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    'clipboard-pen': '<path d="M16 4h2a2 2 0 0 1 2 2v2"/><path d="M21.34 15.664a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"/><path d="M8 22H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
    'beef': '<circle cx="12.5" cy="8.5" r="2.5"/><path d="M12.5 2a6.5 6.5 0 0 0-6.22 4.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3A6.5 6.5 0 0 0 12.5 2Z"/><path d="m18.5 6 2.19 4.5a6.48 6.48 0 0 1 .31 2 6.49 6.49 0 0 1-2.6 5.2C15.4 20.2 11 22 7 22a3 3 0 0 1-2.68-1.66L2.4 16.5"/>',
    'wheat': '<path d="M2 22 16 8"/><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z"/><path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z"/><path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/><path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/><path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z"/>',
    'droplet': '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 10.1 5 12 5 15a7 7 0 0 0 7 7z"/>',
    'trending-up': '<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
    'flame': '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    'salad': '<path d="M19.496 12a2.5 2.5 0 00.399-2.214A2 2 0 0020.32 6.5 2 2 0 0019 3a2 2 0 00-1.5.68 2 2 0 00-3.287.424 2.5 2.5 0 00-3.189 2.06A3 3 0 0012 12l4-4"/><path d="M4 12a1 1 0 00-.99 1.133A9 9 0 0012 21a9 9 0 008.99-7.867A1 1 0 0020 12z"/><path d="M7 21h10"/><path d="M9.85 6.907A3.5 3.5 0 005.05 12"/>',
    'clipboard-list': '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>'
  };
  const MAP = { '✅': 'circle-check', '📅': 'calendar', '🏋': 'dumbbell', '🎯': 'target', '🍽': 'utensils', '📝': 'clipboard-pen',
    '🥩': 'beef', '🍚': 'wheat', '🥑': 'droplet', '📈': 'trending-up', '🔥': 'flame', '🥗': 'salad', '📋': 'clipboard-list' };
  const clave = function(t){ return (t || '').replace(/[️‍]/g, '').trim(); };
  const svg = function(n){ return '<svg class="ico-dw" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + P[n] + '</svg>'; };

  // elemento que solo contiene un emoji
  function soloEmoji(el){
    const t = clave(el.textContent);
    if (!MAP[t] || el.querySelector('svg.ico-dw')) return;
    el.innerHTML = svg(MAP[t]);
  }
  // texto que empieza por emoji («📈 Tu progreso», «🔥 3 semanas…»)
  function inicioEmoji(el){
    const n = el.firstChild;
    if (!n || n.nodeType !== 3) return;
    const m = n.textContent.match(/^\s*(\S+?)\s+([\s\S]*)$/u);
    if (!m || !MAP[clave(m[1])]) return;
    n.textContent = m[2];
    el.insertAdjacentHTML('afterbegin', svg(MAP[clave(m[1])]));
  }
  let pend = false;
  function repasar(){
    pend = false;
    const hoy = document.getElementById('view-hoy'); if (!hoy) return;
    hoy.querySelectorAll('.kcal-line .ki, .ha-ico, .mr > span').forEach(soloEmoji);
    hoy.querySelectorAll('.card-head > b, .hp-rachas > span').forEach(inicioEmoji);
  }
  function pedir(){ if (!pend) { pend = true; requestAnimationFrame(repasar); } }
  function iniciar(){
    repasar();
    const hoy = document.getElementById('view-hoy');
    if (hoy) new MutationObserver(pedir).observe(hoy, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
