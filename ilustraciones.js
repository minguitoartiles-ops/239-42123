/* =========================================================
   Fitnessindramas — Ilustraciones de los ejercicios (26/10/2026, tarea #234)
   Dibujos propios (sin derechos de terceros): una figura de líneas que repite el movimiento
   (posición inicial ↔ final) según el patrón del ejercicio, con su material (barra, mancuernas,
   kettlebell, polea, máquina, banco…). Se ven en el entreno del cliente, debajo del nombre de cada
   ejercicio, junto a una indicación técnica corta. Tocar el dibujo lo amplía.
   Con «reducir movimiento» activado en el móvil se muestra quieto.
   ========================================================= */
const IL_SUELO = '<line x1="6" y1="84.5" x2="114" y2="84.5" class="il-fondo"/>';
const IL_BANCO_TUMB = '<rect x="18" y="58" width="68" height="4" rx="2" class="il-mueble"/><line x1="26" y1="62" x2="26" y2="84" class="il-fondo"/><line x1="78" y1="62" x2="78" y2="84" class="il-fondo"/>';
const IL_ASIENTO = '<rect x="36" y="56" width="26" height="4" rx="2" class="il-mueble"/><line x1="38" y1="28" x2="38" y2="58" class="il-mueble"/><line x1="49" y1="60" x2="49" y2="84" class="il-fondo"/>';
const IL_PIERNAS = { p: [60, 47], k: [60, 65], a: [60, 83], f: [68, 83] };
function ilDe(base, cambios){ return Object.assign({}, base, cambios); }
/* Cada patrón: puntos de la posición A y lo que cambia en B, segmentos del cuerpo, cabeza, manos (donde va el material),
   ancla de la polea y fondo fijo. Vista de lado mirando a la derecha salvo los marcados como «frente». */
const IL_CUERPO = [['n', 'p'], ['p', 'k'], ['k', 'a'], ['a', 'f'], ['n', 'e'], ['e', 'w']];
const IL_FRENTE = [['n', 'p'], ['sL', 'sR'], ['sL', 'eL'], ['eL', 'wL'], ['sR', 'eR'], ['eR', 'wR'], ['p', 'kL'], ['kL', 'aL'], ['p', 'kR'], ['kR', 'aR']];
const IL_PAT = {
  sentadilla: { A: ilDe(IL_PIERNAS, { h: [60, 13], n: [60, 22], e: [53, 30], w: [57, 23] }),
    B: { h: [67, 33], n: [64, 41], p: [48, 62], k: [70, 66], e: [57, 49], w: [62, 42] }, fondo: IL_SUELO },
  bisagra: { A: ilDe(IL_PIERNAS, { h: [61, 13], n: [60, 22], p: [58, 47], e: [64, 35], w: [65, 47] }),
    B: { h: [80, 35], n: [73, 40], p: [47, 50], k: [63, 66], e: [72, 53], w: [71, 65] }, fondo: IL_SUELO },
  empuje_cadera: { A: { h: [26, 44], n: [33, 50], p: [52, 72], k: [68, 60], a: [78, 83], f: [85, 83], e: [44, 62], w: [53, 70] },
    B: { p: [55, 52], k: [71, 52], e: [44, 52], w: [56, 50] }, fondo: IL_SUELO + '<rect x="14" y="52" width="22" height="32" rx="3" class="il-mueble"/>' },
  zancada: { A: ilDe(IL_PIERNAS, { h: [60, 13], n: [60, 22], k: [63, 65], a: [64, 83], f: [71, 83], k2: [57, 65], a2: [56, 83], f2: [63, 83], e: [64, 35], w: [65, 47] }),
    B: { h: [60, 30], n: [60, 39], p: [60, 63], k: [76, 64], a: [76, 83], f: [83, 83], k2: [50, 78], a2: [38, 82], f2: [44, 84], e: [64, 51], w: [65, 63] },
    extra: [['p', 'k2'], ['k2', 'a2'], ['a2', 'f2']], fondo: IL_SUELO },
  extension_piernas: { A: { h: [46, 15], n: [46, 24], p: [46, 56], k: [64, 57], a: [66, 79], f: [72, 80], e: [50, 40], w: [54, 54] },
    B: { a: [86, 52], f: [90, 46] }, manos: [], pies: 'a', fondo: IL_ASIENTO },
  curl_piernas: { A: { h: [46, 15], n: [46, 24], p: [46, 56], k: [64, 57], a: [86, 52], f: [90, 46], e: [50, 40], w: [54, 54] },
    B: { a: [62, 78], f: [68, 81] }, manos: [], pies: 'a', fondo: IL_ASIENTO },
  prensa: { A: { h: [24, 36], n: [29, 43], p: [42, 64], k: [52, 44], a: [64, 56], f: [68, 50], e: [36, 56], w: [42, 62], q1: [68, 42], q2: [72, 64] },
    B: { k: [64, 52], a: [82, 44], f: [86, 38], q1: [86, 30], q2: [90, 52] }, manos: [], placa: true,
    fondo: IL_SUELO + '<line x1="20" y1="34" x2="40" y2="68" class="il-mueble"/><line x1="40" y1="68" x2="40" y2="84" class="il-fondo"/>' },
  gemelos: { A: ilDe(IL_PIERNAS, { h: [60, 14], n: [60, 23], p: [60, 48], k: [60, 66], a: [60, 83], f: [68, 83], e: [64, 36], w: [65, 48] }),
    B: { h: [60, 9], n: [60, 18], p: [60, 43], k: [60, 61], a: [62, 78], e: [64, 31], w: [65, 43] }, fondo: IL_SUELO },
  press_banca: { A: { h: [24, 52], n: [32, 55], p: [62, 56], k: [76, 52], a: [82, 83], f: [89, 83], e: [36, 40], w: [38, 26] },
    B: { e: [28, 52], w: [37, 46] }, fondo: IL_SUELO + IL_BANCO_TUMB },
  flexiones: { A: { h: [86, 49], n: [77, 53], p: [48, 63], k: [33, 72], a: [18, 80], f: [14, 84], e: [77, 68], w: [77, 83] },
    B: { h: [86, 70], n: [77, 73], p: [48, 77], k: [33, 80], e: [67, 73] }, fondo: IL_SUELO },
  fondos: { A: { h: [60, 12], n: [60, 21], p: [58, 46], k: [61, 62], a: [54, 74], f: [52, 78], e: [65, 36], w: [64, 51] },
    B: { h: [60, 26], n: [60, 35], p: [58, 60], k: [62, 74], a: [54, 82], f: [52, 84], e: [49, 44] },
    fondo: '<line x1="48" y1="52" x2="78" y2="52" class="il-mueble"/><line x1="74" y1="52" x2="74" y2="84" class="il-fondo"/>' },
  press_hombro: { A: ilDe(IL_PIERNAS, { h: [60, 17], n: [60, 26], p: [60, 50], k: [60, 66], e: [66, 34], w: [64, 26] }),
    B: { e: [62, 13], w: [61, 3] }, fondo: IL_SUELO },
  remo: { A: { h: [81, 32], n: [74, 36], p: [50, 50], k: [62, 66], a: [60, 83], f: [68, 83], e: [74, 50], w: [74, 64] },
    B: { e: [61, 39], w: [68, 54] }, fondo: IL_SUELO },
  remo_polea: { A: { h: [40, 18], n: [40, 27], p: [40, 56], k: [58, 50], a: [70, 64], f: [73, 58], e: [54, 32], w: [68, 36] },
    B: { e: [28, 35], w: [45, 39] }, ancla: [112, 38], fondo: IL_ASIENTO.replace('x1="38" y1="28" x2="38" y2="58"', 'x1="70" y1="56" x2="76" y2="70"') },
  jalon: { A: { h: [56, 30], n: [56, 39], p: [56, 64], k: [74, 62], a: [76, 83], f: [83, 83], e: [59, 22], w: [61, 8] },
    B: { e: [49, 50], w: [62, 41] }, ancla: [62, 0],
    fondo: IL_SUELO + '<rect x="46" y="64" width="24" height="4" rx="2" class="il-mueble"/><line x1="58" y1="68" x2="58" y2="84" class="il-fondo"/>' },
  dominadas: { A: { h: [60, 22], n: [60, 30], p: [59, 54], k: [60, 70], a: [55, 83], f: [60, 84], e: [61, 18], w: [62, 7] },
    B: { h: [61, 8], n: [60, 16], p: [59, 40], k: [60, 56], a: [55, 69], f: [60, 70], e: [53, 17] }, manos: [],
    fondo: '<line x1="38" y1="7" x2="86" y2="7" class="il-mueble"/>' },
  curl: { A: ilDe(IL_PIERNAS, { h: [60, 13], n: [60, 22], e: [64, 39], w: [65, 55] }), B: { w: [74, 30] }, ancla: [66, 84], fondo: IL_SUELO },
  triceps: { A: ilDe(IL_PIERNAS, { h: [62, 13], n: [61, 22], e: [61, 39], w: [72, 31] }), B: { w: [64, 57] }, ancla: [76, 0], fondo: IL_SUELO },
  triceps_nuca: { A: { h: [60, 26], n: [60, 34], p: [60, 56], k: [60, 70], a: [60, 84], f: [67, 84], e: [62, 17], w: [51, 26] },
    B: { w: [63, 2] }, fondo: IL_SUELO },
  frontales: { A: ilDe(IL_PIERNAS, { h: [60, 13], n: [60, 22], e: [64, 36], w: [65, 48] }), B: { e: [74, 23], w: [87, 24] }, ancla: [56, 84], fondo: IL_SUELO },
  laterales: { frente: true, A: { h: [60, 12], n: [60, 21], p: [60, 47], sL: [51, 24], sR: [69, 24], eL: [49, 36], wL: [49, 48], eR: [71, 36], wR: [71, 48], kL: [56, 65], aL: [55, 83], kR: [64, 65], aR: [65, 83] },
    B: { eL: [39, 26], wL: [27, 28], eR: [81, 26], wR: [93, 28] }, manos: ['wL', 'wR'], fondo: IL_SUELO },
  aperturas: { frente: true, A: { h: [60, 12], n: [60, 21], p: [60, 47], sL: [51, 24], sR: [69, 24], eL: [39, 28], wL: [28, 34], eR: [81, 28], wR: [92, 34], kL: [56, 65], aL: [55, 83], kR: [64, 65], aR: [65, 83] },
    B: { eL: [50, 34], wL: [57, 41], eR: [70, 34], wR: [63, 41] }, manos: ['wL', 'wR'], anclas: [[6, 4], [114, 4]], fondo: IL_SUELO },
  encogimientos: { frente: true, A: { h: [60, 12], n: [60, 21], p: [60, 47], sL: [51, 25], sR: [69, 25], eL: [50, 37], wL: [50, 49], eR: [70, 37], wR: [70, 49], kL: [56, 65], aL: [55, 83], kR: [64, 65], aR: [65, 83] },
    B: { sL: [51, 20], sR: [69, 20], eL: [50, 32], wL: [50, 44], eR: [70, 32], wR: [70, 44] }, manos: ['wL', 'wR'], fondo: IL_SUELO },
  plancha: { A: { h: [87, 60], n: [79, 64], p: [50, 69], k: [34, 75], a: [20, 81], f: [17, 84], e: [79, 83], w: [91, 83] },
    B: { p: [50, 67], n: [79, 63], h: [87, 59] }, manos: [], fondo: IL_SUELO },
  abdominales: { A: { h: [22, 78], n: [31, 80], p: [52, 80], k: [64, 62], a: [74, 82], f: [80, 83], e: [33, 72], w: [25, 74] },
    B: { h: [32, 62], n: [38, 70], e: [41, 63], w: [33, 59] }, manos: [], fondo: IL_SUELO },
  elevacion_piernas: { A: { h: [20, 78], n: [29, 80], p: [56, 80], k: [72, 80], a: [88, 80], f: [92, 76], e: [40, 82], w: [50, 82] },
    B: { k: [62, 64], a: [66, 46], f: [72, 44] }, manos: [], fondo: IL_SUELO },
  correr: { A: { h: [63, 12], n: [61, 21], p: [57, 46], k: [68, 60], a: [62, 77], f: [70, 78], k2: [52, 64], a2: [42, 72], f2: [40, 66], e: [53, 33], w: [61, 41] },
    B: { k: [52, 64], a: [42, 72], f: [40, 66], k2: [68, 60], a2: [62, 77], f2: [70, 78], e: [68, 32], w: [74, 24] },
    extra: [['p', 'k2'], ['k2', 'a2'], ['a2', 'f2']], manos: [], fondo: IL_SUELO },
  bici: { A: { h: [68, 16], n: [63, 24], p: [46, 40], k: [60, 48], a: [54, 70], f: [60, 72], e: [72, 32], w: [80, 40] },
    B: { k: [58, 56], a: [46, 76], f: [52, 78] }, manos: [],
    fondo: '<circle cx="34" cy="72" r="11" class="il-fondo"/><circle cx="88" cy="72" r="11" class="il-fondo"/><path d="M34 72 L50 72 L46 42 M50 72 L80 42 L88 72 M78 38 L84 38" class="il-mueble il-sin"/>' },
  saltos: { A: ilDe(IL_PIERNAS, { h: [60, 15], n: [60, 24], p: [60, 49], k: [62, 66], a: [60, 83], e: [55, 36], w: [58, 46] }),
    B: { h: [60, 6], n: [60, 15], p: [60, 40], k: [60, 58], a: [59, 75], f: [66, 77], e: [69, 9], w: [75, 2] }, manos: [], fondo: IL_SUELO }
};
/* ---------- qué patrón y qué material tiene cada ejercicio ---------- */
const IL_REGLAS = [
  [/gemelos en prensa/, 'gemelos'],
  [/b[uú]lgara|split squat/, 'zancada'],
  [/thruster|wall ball/, 'sentadilla'],
  [/patada de gl[uú]teo|abducci/, 'empuje_cadera'],
  [/n[oó]rdico/, 'curl_piernas'],
  [/rack pull/, 'bisagra'],
  [/ergómetro|ergometro|skierg/, 'remo_polea'],
  [/mountain climber|renegado/, 'plancha'],
  [/pallof/, 'plancha'],
  [/franc[eé]s|sobre la cabeza|tras nuca/, 'triceps_nuca'],
  [/encogimientos? (con|de hombros)|shrug|remo al ment[oó]n/, 'encogimientos'],
  [/assault|bike/, 'bici'],
  [/prensa/, 'prensa'],
  [/sentadilla|squat|goblet|hack|pistol/, 'sentadilla'],
  [/hip thrust|puente de gl|glute bridge|empuje de cadera/, 'empuje_cadera'],
  [/peso muerto|rumano|buenos d[ií]as|good morning|swing|pull.?through|hiperextensi|bisagra/, 'bisagra'],
  [/zancada|split|b[uú]lgara|lunge|step.?up|subida al caj|desplante/, 'zancada'],
  [/extensi[oó]n de (cu[aá]driceps|piernas)|cu[aá]driceps en m[aá]quina/, 'extension_piernas'],
  [/curl femoral|femoral (tumbado|sentado)|isquios en m[aá]quina/, 'curl_piernas'],
  [/gemel|pantorrill|talones|s[oó]leo/, 'gemelos'],
  [/fondos/, 'fondos'],
  [/flexion/, 'flexiones'],
  [/aperturas|cruce de poleas|contractor|pec.?deck|peck/, 'aperturas'],
  [/militar|press de hombro|arnold|press (de )?hombros|overhead|por encima de la cabeza|press landmine/, 'press_hombro'],
  [/press|banca/, 'press_banca'],
  [/face pull|p[aá]jaros|posterior|reverse fly|elevaciones? lateral/, 'laterales'],
  [/elevaci[oó]n(es)? frontal/, 'frontales'],
  [/encogimiento(s)? de hombros|shrug/, 'encogimientos'],
  [/jal[oó]n (al pecho|tras nuca|agarre|a una mano)|jal[oó]n$|pulldown|pullover/, 'jalon'],
  [/dominad|chin.?up|pull.?up/, 'dominadas'],
  [/remo en polea|remo sentado|remo en m[aá]quina|remo (con|en) (cable|polea)|seal row/, 'remo_polea'],
  [/remo/, 'remo'],
  [/tr[ií]ceps (en polea|con cuerda)|jal[oó]n de tr[ií]ceps|pushdown|extensi[oó]n de tr[ií]ceps en polea/, 'triceps'],
  [/franc[eé]s|tras nuca|por encima|copa|tr[ií]ceps con mancuerna a dos manos/, 'triceps_nuca'],
  [/tr[ií]ceps|patada|kickback|extensi[oó]n de codo/, 'triceps'],
  [/curl|b[ií]ceps|martillo/, 'curl'],
  [/elevaci[oó]n(es)? de piernas|leg raise|colgad|v.?up/, 'elevacion_piernas'],
  [/crunch|abdominal|sit.?up|encogimientos abdominales|rueda|ab wheel|bicho muerto|dead bug/, 'abdominales'],
  [/plancha|plank|pallof|le[nñ]ador|woodchop|giro ruso|russian|rotaci/, 'plancha'],
  [/bici|ciclo|spinning|el[ií]ptica|airbike/, 'bici'],
  [/comba|salto|burpee|jumping|jacks|box jump|skipping/, 'saltos'],
  [/cinta|correr|carrera|sprint|running|caminar|andar|rodaje|intervalos|siit|hiit/, 'correr']
];
const IL_POR_MUSCULO = { pecho: 'press_banca', espalda: 'remo', hombro: 'press_hombro', biceps: 'curl', triceps: 'triceps', cuadriceps: 'sentadilla',
  femoral: 'bisagra', isquios: 'bisagra', gluteo: 'empuje_cadera', gemelo: 'gemelos', abdomen: 'abdominales', core: 'plancha', cardio: 'correr', trapecio: 'encogimientos', lumbar: 'bisagra' };
function ilInfo(nombre){
  const k = norm(nombre || '');
  const lista = (typeof EX_CATALOG !== 'undefined' ? EX_CATALOG : []);
  return lista.filter(function(x){ return x && x.n && norm(x.n) === k; })[0] || null;
}
function ilPatron(nombre, musculo, material){
  const n = norm(nombre || '').toLowerCase();
  for (let i = 0; i < IL_REGLAS.length; i++) if (IL_REGLAS[i][0].test(n)) {
    let p = IL_REGLAS[i][1];
    if (p === 'remo' && /polea|m[aá]quina|cable/.test(material || '')) p = 'remo_polea';
    if (p === 'press_banca' && norm(musculo || '') === 'hombro') p = 'press_hombro';
    return p;
  }
  return IL_POR_MUSCULO[norm(musculo || '')] || 'sentadilla';
}
function ilMaterial(nombre, material){
  const t = norm((material || '') + ' ' + (nombre || '')).toLowerCase();
  if (/multipower|smith/.test(t)) return 'multipower';
  if (/kettlebell|pesa rusa/.test(t)) return 'kettlebell';
  if (/polea|cable|cuerda/.test(t)) return 'polea';
  if (/banda|goma|el[aá]stic/.test(t)) return 'banda';
  if (/mancuern/.test(t)) return 'mancuerna';
  if (/barra|disco|landmine|z\b/.test(t)) return 'barra';
  if (/m[aá]quina/.test(t)) return 'maquina';
  return 'corporal';
}
/* ---------- dibujo ---------- */
function ilAnim(attr, a, b, quieto){
  return quieto || a === b ? '' : '<animate attributeName="' + attr + '" values="' + a + ';' + b + ';' + a + '" dur="2.6s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>';
}
function ilLinea(A, B, x, y, cls, quieto){
  const a1 = A[x], a2 = A[y], b1 = B[x], b2 = B[y]; if (!a1 || !a2) return '';
  return '<line x1="' + a1[0] + '" y1="' + a1[1] + '" x2="' + a2[0] + '" y2="' + a2[1] + '" class="' + cls + '">'
    + ilAnim('x1', a1[0], b1[0], quieto) + ilAnim('y1', a1[1], b1[1], quieto) + ilAnim('x2', a2[0], b2[0], quieto) + ilAnim('y2', a2[1], b2[1], quieto) + '</line>';
}
function ilCirculo(A, B, pto, r, cls, dx, dy, quieto){
  const a = A[pto], b = B[pto]; if (!a) return '';
  dx = dx || 0; dy = dy || 0;
  return '<circle cx="' + (a[0] + dx) + '" cy="' + (a[1] + dy) + '" r="' + r + '" class="' + cls + '">'
    + ilAnim('cx', a[0] + dx, b[0] + dx, quieto) + ilAnim('cy', a[1] + dy, b[1] + dy, quieto) + '</circle>';
}
function ilCable(A, B, pto, ancla, quieto, cls){
  const a = A[pto], b = B[pto]; if (!a) return '';
  return '<line x1="' + ancla[0] + '" y1="' + ancla[1] + '" x2="' + a[0] + '" y2="' + a[1] + '" class="' + (cls || 'il-cable') + '">'
    + ilAnim('x2', a[0], b[0], quieto) + ilAnim('y2', a[1], b[1], quieto) + '</line>';
}
function ilSvg(patron, material, quieto){
  const P = IL_PAT[patron] || IL_PAT.sentadilla;
  const A = P.A, B = ilDe(P.A, P.B || {});
  let h = P.fondo || '';
  const manos = P.manos || (P.frente ? ['wL', 'wR'] : ['w']);
  // material que va detrás del cuerpo (cables, guías)
  if (material === 'polea' && manos.length) {
    if (P.anclas) manos.forEach(function(m, i){ h += ilCable(A, B, m, P.anclas[i] || P.anclas[0], quieto); });
    else manos.forEach(function(m){ h += ilCable(A, B, m, P.ancla || [112, 12], quieto); });
  }
  if (material === 'banda' && manos.length) manos.forEach(function(m){ h += ilCable(A, B, m, P.frente ? [m === 'wL' ? 50 : 70, 84] : (A.f || [64, 84]), quieto, 'il-cable il-banda'); });
  if (material === 'multipower' && manos.length) { const w = A[manos[0]]; h += '<line x1="' + (w[0] + 9) + '" y1="2" x2="' + (w[0] + 9) + '" y2="84" class="il-fondo"/>'; }
  // cuerpo
  (P.frente ? IL_FRENTE : IL_CUERPO).concat(P.extra || []).forEach(function(s){ h += ilLinea(A, B, s[0], s[1], 'il-cuerpo', quieto); });
  if (P.placa) h += ilLinea(A, B, 'q1', 'q2', 'il-placa', quieto);
  h += ilCirculo(A, B, 'h', 5.6, 'il-cabeza', 0, 0, quieto);
  if (P.pies) h += ilCirculo(A, B, P.pies, 3.4, 'il-peso', 0, 0, quieto);
  // material en las manos
  manos.forEach(function(m){
    if (material === 'barra' || material === 'multipower') h += ilCirculo(A, B, m, 6.5, 'il-disco', 0, 0, quieto) + ilCirculo(A, B, m, 1.6, 'il-peso', 0, 0, quieto);
    else if (material === 'mancuerna') h += ilCirculo(A, B, m, 3.8, 'il-peso', 0, 0, quieto);
    else if (material === 'kettlebell') h += ilCirculo(A, B, m, 4.6, 'il-peso', 0, 5, quieto);
    else if (material === 'polea' || material === 'banda') h += ilCirculo(A, B, m, 2.4, 'il-peso', 0, 0, quieto);
  });
  return '<svg viewBox="0 0 120 90" class="il-svg" role="img" aria-hidden="true" focusable="false">' + h + '</svg>';
}
function ilQuieto(){ try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e){ return false; } }
function ilConsejo(info){
  const d = info && info.d ? String(info.d) : '';
  const m = d.match(/^[^.]*\./), f = m ? m[0] : d;
  return f.length > 140 ? f.slice(0, 137).replace(/\s+\S*$/, '') + '…' : f;
}
/* ---------- en el entreno del cliente ---------- */
function ilPoner(it){
  if (!it || isCoachView()) return;
  const nombre = enNombreEj(it); if (!nombre) return;
  let box = it.querySelector(':scope > .il-box');
  if (box && box.dataset.n === nombre) return;
  const info = ilInfo(nombre);
  const celda = it.querySelector('.ex-name-cell');
  const musculo = (info && info.m) || (celda && celda.dataset.muscle) || '';
  const mat = ilMaterial(nombre, info && info.e);
  const pat = ilPatron(nombre, musculo, mat);
  if (!box) {
    box = document.createElement('div'); box.className = 'il-box';
    const fila = it.querySelector('.ex-table-row');
    it.insertBefore(box, fila ? fila.nextSibling : it.firstChild);
  }
  box.dataset.n = nombre;
  const txt = ilConsejo(info);
  box.innerHTML = '<button type="button" class="il-fig" aria-label="Ver el movimiento de ' + esc(nombre) + ' más grande" onclick="ilAmpliar(this)">' + ilSvg(pat, mat, ilQuieto()) + '</button>'
    + (txt ? '<p class="il-txt">' + esc(txt) + '</p>' : '<p class="il-txt il-txt-suave">Fíjate en el dibujo: así es el movimiento. Si tienes dudas, pregunta por el chat.</p>');
}
function ilAmpliar(b){ const box = b.closest('.il-box'); if (box) box.classList.toggle('il-grande'); }
function ilTodos(){ if (isCoachView()) return; Array.prototype.forEach.call(contEnt().querySelectorAll('.ex-item'), ilPoner); }
if (typeof enPintarFilas === 'function') enPintarFilas = (function(orig){
  return function(it){ const r = orig.apply(this, arguments); try { ilPoner(it); } catch(e){} return r; };
})(enPintarFilas);
if (typeof toggleSesion === 'function') toggleSesion = (function(orig){
  return function(){ const r = orig.apply(this, arguments); try { ilTodos(); } catch(e){} return r; };
})(toggleSesion);
/* que el dibujo no viaje al guardar el plan ni al copiarlo (se vuelve a pintar al verlo) */
if (typeof guardarPlan === 'function') guardarPlan = (function(orig){
  return function(){
    const cajas = Array.prototype.slice.call(contEnt().querySelectorAll('.il-box'));
    const sitios = cajas.map(function(b){ return [b, b.parentNode, b.nextSibling]; });
    cajas.forEach(function(b){ b.remove(); });
    try { return orig.apply(this, arguments); }
    finally { sitios.forEach(function(s){ if (s[1]) s[1].insertBefore(s[0], s[2] && s[2].parentNode === s[1] ? s[2] : null); }); }
  };
})(guardarPlan);
/* rendimiento: cada dibujo solo se mueve mientras se ve en pantalla */
const IL_OBS = ('IntersectionObserver' in window) ? new IntersectionObserver(function(es){
  es.forEach(function(e){ const s = e.target; try { if (e.isIntersecting) s.unpauseAnimations(); else s.pauseAnimations(); } catch(x){} });
}) : null;
ilPoner = (function(orig){
  return function(it){
    const r = orig.apply(this, arguments);
    const s = it && it.querySelector(':scope > .il-box .il-svg');
    if (s && IL_OBS && !s.dataset.obs) { s.dataset.obs = '1'; try { s.pauseAnimations(); } catch(x){} IL_OBS.observe(s); }
    return r;
  };
})(ilPoner);
