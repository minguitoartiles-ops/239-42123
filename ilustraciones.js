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

/* =========================================================
   26/10 · v2 · Biomecánica afinada por ejercicio
   · Bancos: plano, inclinado y declinado según el nombre.
   · Presses: en la bajada el codo baja hacia la cadera (por debajo del pecho) y la barra llega al esternón.
   · Patada de glúteo a cuatro apoyos (cadera en extensión), polea desde atrás y abajo.
   · Curl femoral tumbado / sentado / de pie con el rodillo detrás del tobillo y la carga en su sentido real.
   · Patrones propios para peso muerto desde el suelo, hiperextensión, remo a una mano, remo invertido,
     fondos en banco, press francés, patada de tríceps, curl predicador, colgado, búlgara, step up, nórdico,
     abducción, pájaros, face pull, remo al mentón, aperturas tumbado, pullover, swing, thruster, etc.
   ========================================================= */
const IL_BANCO_PLANO = IL_SUELO + '<rect x="14" y="58" width="52" height="4" rx="2" class="il-mueble"/><line x1="22" y1="62" x2="22" y2="84" class="il-fondo"/><line x1="58" y1="62" x2="58" y2="84" class="il-fondo"/>';
const IL_BANCO_INCL = IL_SUELO + '<line x1="20" y1="38" x2="46" y2="62" class="il-mueble"/><rect x="44" y="60" width="22" height="4" rx="2" class="il-mueble"/><line x1="52" y1="64" x2="52" y2="84" class="il-fondo"/><line x1="30" y1="50" x2="30" y2="84" class="il-fondo"/>';
const IL_BANCO_DECL = IL_SUELO + '<line x1="28" y1="70" x2="68" y2="52" class="il-mueble"/><line x1="40" y1="66" x2="40" y2="84" class="il-fondo"/><line x1="64" y1="54" x2="64" y2="84" class="il-fondo"/><circle cx="88" cy="58" r="3.5" class="il-mueble"/><line x1="76" y1="56" x2="88" y2="70" class="il-fondo"/>';
const IL_PIE = { a: [60, 83], f: [68, 83] };
Object.assign(IL_PAT, {
  press_banca: { A: { h: [22, 52], n: [31, 55], p: [58, 56], k: [74, 60], a: [77, 83], f: [84, 83], e: [33, 42], w: [35, 29] },
    B: { e: [37, 65], w: [39, 50] }, fondo: IL_BANCO_PLANO },
  press_inclinado: { A: { h: [23, 34], n: [30, 40], p: [52, 58], k: [70, 57], a: [74, 83], f: [81, 83], e: [33, 27], w: [35, 14] },
    B: { e: [31, 53], w: [39, 39] }, fondo: IL_BANCO_INCL },
  press_declinado: { A: { h: [27, 69], n: [35, 65], p: [60, 54], k: [76, 50], a: [87, 60], f: [92, 56], e: [34, 51], w: [30, 38] },
    B: { e: [45, 72], w: [38, 51] }, fondo: IL_BANCO_DECL },
  press_frances: { A: { h: [22, 52], n: [31, 55], p: [58, 56], k: [74, 60], a: [77, 83], f: [84, 83], e: [33, 41], w: [34, 28] },
    B: { w: [22, 44] }, fondo: IL_BANCO_PLANO },
  aperturas_tumbado: { frente: true, A: { h: [60, 47], n: [60, 55], p: [60, 62], sL: [50, 56], sR: [70, 56], eL: [51, 43], wL: [53, 31], eR: [69, 43], wR: [67, 31], kL: [54, 72], aL: [52, 84], kR: [66, 72], aR: [68, 84] },
    B: { eL: [38, 61], wL: [27, 53], eR: [82, 61], wR: [93, 53] }, manos: ['wL', 'wR'], fondo: IL_SUELO + '<rect x="52" y="60" width="16" height="24" rx="2" class="il-mueble"/>' },
  pullover: { A: { h: [31, 59], n: [40, 56], p: [60, 66], k: [74, 60], a: [78, 83], f: [85, 83], e: [27, 52], w: [15, 56] },
    B: { e: [38, 44], w: [42, 31] }, fondo: IL_SUELO + '<rect x="30" y="60" width="20" height="24" rx="2" class="il-mueble"/>' },
  flexiones: { A: { h: [86, 49], n: [77, 53], p: [48, 63], k: [33, 72], a: [18, 80], f: [14, 84], e: [77, 68], w: [77, 83] },
    B: { h: [86, 70], n: [77, 74], p: [48, 77], k: [33, 80], e: [69, 68] }, fondo: IL_SUELO },
  fondos_banco: { A: { h: [49, 23], n: [48, 32], p: [53, 58], k: [70, 63], a: [86, 82], f: [90, 77], e: [43, 45], w: [40, 58] },
    B: { h: [51, 37], n: [50, 46], p: [55, 72], k: [71, 71], e: [35, 51] }, fondo: IL_SUELO + '<rect x="14" y="58" width="28" height="4" rx="2" class="il-mueble"/><line x1="20" y1="62" x2="20" y2="84" class="il-fondo"/>' },
  sentadilla: { A: ilDe(IL_PIE, { h: [62, 13], n: [60, 22], p: [60, 47], k: [61, 65], e: [49, 34], w: [53, 26] }),
    B: { h: [69, 33], n: [64, 41], p: [48, 62], k: [70, 66], e: [51, 51], w: [56, 44] }, fondo: IL_SUELO },
  sentadilla_frontal: { A: ilDe(IL_PIE, { h: [60, 13], n: [60, 22], p: [60, 47], k: [61, 65], e: [71, 30], w: [66, 24] }),
    B: { h: [66, 33], n: [63, 41], p: [48, 62], k: [70, 66], e: [76, 48], w: [70, 42] }, fondo: IL_SUELO },
  sentadilla_goblet: { A: ilDe(IL_PIE, { h: [60, 13], n: [60, 22], p: [60, 47], k: [61, 65], e: [64, 37], w: [67, 31] }),
    B: { h: [66, 33], n: [63, 41], p: [48, 62], k: [70, 66], e: [69, 54], w: [72, 47] }, fondo: IL_SUELO },
  sentadilla_lados: { A: ilDe(IL_PIE, { h: [60, 13], n: [60, 22], p: [60, 47], k: [61, 65], e: [62, 35], w: [62, 48] }),
    B: { h: [66, 33], n: [63, 41], p: [48, 62], k: [70, 66], e: [65, 53], w: [66, 66] }, fondo: IL_SUELO },
  sentadilla_libre: { A: ilDe(IL_PIE, { h: [60, 13], n: [60, 22], p: [60, 47], k: [61, 65], e: [62, 35], w: [63, 47] }),
    B: { h: [66, 33], n: [63, 41], p: [48, 62], k: [70, 66], e: [76, 42], w: [89, 42] }, manos: [], fondo: IL_SUELO },
  bulgara: { A: { h: [60, 14], n: [59, 23], p: [58, 48], k: [64, 66], a: [64, 83], f: [71, 83], k2: [50, 64], a2: [38, 62], f2: [34, 58], e: [62, 36], w: [62, 48] },
    B: { h: [59, 29], n: [58, 38], p: [56, 62], k: [72, 67], k2: [49, 78], e: [61, 51], w: [62, 63] },
    extra: [['p', 'k2'], ['k2', 'a2'], ['a2', 'f2']], fondo: IL_SUELO + '<rect x="24" y="62" width="20" height="22" rx="2" class="il-mueble"/>' },
  step_up: { A: { h: [63, 15], n: [62, 24], p: [58, 48], k: [74, 56], a: [72, 70], f: [79, 70], k2: [56, 66], a2: [52, 83], f2: [59, 83], e: [62, 37], w: [62, 49] },
    B: { h: [73, 8], n: [72, 16], p: [70, 39], k: [72, 55], k2: [66, 53], a2: [68, 67], f2: [74, 66], e: [73, 28], w: [73, 40] },
    extra: [['p', 'k2'], ['k2', 'a2'], ['a2', 'f2']], fondo: IL_SUELO + '<rect x="62" y="70" width="28" height="14" rx="2" class="il-mueble"/>' },
  peso_muerto: { A: { h: [77, 42], n: [70, 46], p: [48, 58], k: [64, 64], a: [60, 83], f: [68, 83], e: [69, 60], w: [68, 74] },
    B: { h: [61, 13], n: [60, 22], p: [58, 47], k: [60, 65], e: [62, 35], w: [63, 48] }, fondo: IL_SUELO },
  buenos_dias: { A: ilDe(IL_PIE, { h: [62, 13], n: [60, 22], p: [58, 47], k: [60, 65], e: [49, 34], w: [53, 26] }),
    B: { h: [80, 35], n: [73, 40], p: [47, 50], k: [63, 66], e: [66, 46], w: [70, 40] }, fondo: IL_SUELO },
  swing: { A: { h: [79, 36], n: [72, 40], p: [46, 52], k: [62, 66], a: [60, 83], f: [68, 83], e: [64, 54], w: [56, 64] },
    B: { h: [61, 13], n: [60, 22], p: [58, 47], k: [60, 65], e: [72, 27], w: [84, 27] }, fondo: IL_SUELO },
  hiperextension: { A: { h: [62, 81], n: [58, 73], p: [50, 54], k: [38, 66], a: [26, 78], f: [22, 74] },
    B: { h: [73, 31], n: [67, 37] }, manos: [], fondo: '<line x1="18" y1="84" x2="54" y2="52" class="il-mueble"/><circle cx="54" cy="58" r="4" class="il-mueble"/><line x1="18" y1="84" x2="106" y2="84" class="il-fondo"/>' },
  puente: { A: { h: [20, 78], n: [29, 81], p: [50, 81], k: [64, 64], a: [76, 83], f: [83, 83], e: [38, 83], w: [46, 83] },
    B: { p: [54, 66], k: [68, 59] }, manos: ['p'], fondo: IL_SUELO },
  patada_gluteo: { A: { h: [86, 46], n: [78, 52], p: [50, 54], k: [58, 72], a: [44, 78], f: [40, 76], k2: [50, 82], a2: [32, 82], f2: [28, 80], e: [78, 67], w: [78, 82] },
    B: { k: [34, 47], a: [16, 43], f: [12, 47] }, extra: [['p', 'k2'], ['k2', 'a2']], manos: ['a'], ancla: [4, 82], fondo: IL_SUELO },
  abduccion: { frente: true, A: { h: [60, 12], n: [60, 21], p: [60, 47], sL: [51, 24], sR: [69, 24], eL: [46, 32], wL: [40, 40], eR: [70, 36], wR: [66, 46], kL: [56, 65], aL: [55, 83], kR: [64, 65], aR: [65, 83] },
    B: { kR: [70, 64], aR: [79, 81] }, manos: ['aR'], anclas: [[14, 83]], fondo: IL_SUELO + '<line x1="36" y1="40" x2="36" y2="84" class="il-mueble"/>' },
  curl_femoral: { A: { h: [18, 52], n: [27, 56], p: [56, 56], k: [73, 57], a: [91, 58], f: [95, 63], e: [24, 64], w: [16, 64], pd: [88, 53] },
    B: { a: [64, 41], f: [69, 37], pd: [61, 45] }, manos: [], fondo: IL_SUELO + '<rect x="12" y="60" width="62" height="4" rx="2" class="il-mueble"/><line x1="20" y1="64" x2="20" y2="84" class="il-fondo"/><line x1="66" y1="64" x2="66" y2="84" class="il-fondo"/>' },
  curl_femoral_sentado: { A: { h: [46, 15], n: [46, 24], p: [46, 56], k: [66, 56], a: [84, 56], f: [88, 51], e: [50, 40], w: [56, 50], pd: [84, 61] },
    B: { a: [60, 73], f: [66, 77], pd: [56, 72] }, manos: [], fondo: IL_ASIENTO + '<rect x="54" y="48" width="14" height="4" rx="2" class="il-mueble"/>' },
  curl_femoral_pie: { A: ilDe(IL_PIE, { h: [60, 13], n: [60, 22], p: [60, 47], k: [61, 65], a: [60, 83], f: [68, 83], k2: [57, 65], a2: [56, 83], f2: [63, 83], e: [66, 33], w: [74, 38], pd: [55, 80] }),
    B: { a: [46, 56], f: [43, 61], pd: [43, 52] }, extra: [['p', 'k2'], ['k2', 'a2'], ['a2', 'f2']], manos: [],
    fondo: IL_SUELO + '<line x1="78" y1="30" x2="78" y2="84" class="il-mueble"/>' },
  nordico: { A: { h: [52, 25], n: [51, 34], p: [50, 58], k: [50, 82], a: [30, 82], f: [27, 79], e: [57, 44], w: [57, 37] },
    B: { h: [99, 54], n: [92, 58], p: [71, 70], e: [96, 70], w: [101, 78] }, manos: [], fondo: IL_SUELO + '<circle cx="30" cy="77" r="3.5" class="il-mueble"/>' },
  extension_piernas: ilDe(IL_PAT.extension_piernas, { A: ilDe(IL_PAT.extension_piernas.A, { pd: [70, 78] }), B: { a: [86, 52], f: [90, 46], pd: [86, 47] }, pies: null }),
  remo_mancuerna: { A: { h: [82, 40], n: [74, 42], p: [46, 44], k: [50, 64], a: [52, 83], f: [59, 83], k2: [44, 57], a2: [32, 57], e2: [73, 50], w2: [72, 57], e: [75, 55], w: [76, 68] },
    B: { e: [64, 36], w: [68, 50] }, extra: [['p', 'k2'], ['k2', 'a2'], ['n', 'e2'], ['e2', 'w2']],
    fondo: IL_SUELO + '<rect x="28" y="58" width="50" height="4" rx="2" class="il-mueble"/><line x1="34" y1="62" x2="34" y2="84" class="il-fondo"/><line x1="72" y1="62" x2="72" y2="84" class="il-fondo"/>' },
  remo_invertido: { A: { h: [80, 59], n: [72, 62], p: [46, 72], k: [32, 77], a: [18, 82], f: [18, 76], e: [76, 50], w: [79, 37] },
    B: { h: [71, 40], n: [64, 46], p: [41, 64], k: [30, 73], e: [60, 40] }, manos: [],
    fondo: IL_SUELO + '<line x1="60" y1="37" x2="100" y2="37" class="il-mueble"/><line x1="96" y1="37" x2="96" y2="84" class="il-fondo"/>' },
  patada_triceps: { A: { h: [81, 36], n: [74, 40], p: [50, 52], k: [62, 66], a: [60, 83], f: [68, 83], e: [63, 50], w: [63, 63] },
    B: { w: [50, 57] }, ancla: [112, 80], fondo: IL_SUELO },
  curl_predicador: { A: { h: [54, 14], n: [54, 23], p: [52, 50], k: [66, 52], a: [66, 76], f: [72, 77], e: [69, 41], w: [80, 53] },
    B: { w: [64, 29] }, fondo: IL_SUELO + '<line x1="56" y1="26" x2="76" y2="46" class="il-mueble"/><line x1="72" y1="46" x2="72" y2="84" class="il-fondo"/><rect x="42" y="52" width="16" height="4" rx="2" class="il-mueble"/>' },
  colgado_rodillas: { A: { h: [60, 22], n: [60, 30], p: [60, 54], k: [60, 70], a: [60, 84], f: [64, 85], e: [61, 18], w: [62, 7] },
    B: { k: [76, 52], a: [77, 68], f: [83, 69] }, manos: [], fondo: '<line x1="38" y1="7" x2="86" y2="7" class="il-mueble"/>' },
  colgado_piernas: { A: { h: [60, 22], n: [60, 30], p: [60, 54], k: [60, 70], a: [60, 84], f: [64, 85], e: [61, 18], w: [62, 7] },
    B: { k: [76, 50], a: [92, 46], f: [94, 41] }, manos: [], fondo: '<line x1="38" y1="7" x2="86" y2="7" class="il-mueble"/>' },
  pajaros: { frente: true, A: { h: [60, 26], n: [60, 33], p: [60, 44], sL: [50, 33], sR: [70, 33], eL: [49, 46], wL: [49, 58], eR: [71, 46], wR: [71, 58], kL: [54, 64], aL: [55, 83], kR: [66, 64], aR: [65, 83] },
    B: { eL: [38, 34], wL: [26, 36], eR: [82, 34], wR: [94, 36] }, manos: ['wL', 'wR'], fondo: IL_SUELO },
  face_pull: { A: ilDe(IL_PIE, { h: [60, 13], n: [60, 22], p: [60, 47], k: [61, 65], e: [72, 24], w: [84, 24] }),
    B: { e: [54, 18], w: [66, 15] }, ancla: [114, 22], fondo: IL_SUELO },
  remo_menton: { frente: true, A: { h: [60, 12], n: [60, 21], p: [60, 47], sL: [51, 24], sR: [69, 24], eL: [50, 37], wL: [56, 49], eR: [70, 37], wR: [64, 49], kL: [56, 65], aL: [55, 83], kR: [64, 65], aR: [65, 83] },
    B: { eL: [41, 22], wL: [56, 27], eR: [79, 22], wR: [64, 27] }, manos: ['wL', 'wR'], fondo: IL_SUELO },
  giro_ruso: { frente: true, A: { h: [60, 30], n: [60, 39], p: [60, 62], sL: [52, 41], sR: [68, 41], eL: [47, 48], wL: [44, 56], eR: [58, 52], wR: [46, 57], kL: [53, 54], aL: [49, 66], kR: [67, 54], aR: [71, 66] },
    B: { eL: [62, 52], wL: [74, 57], eR: [73, 48], wR: [76, 56] }, manos: ['wL'], fondo: IL_SUELO },
  pallof: { A: ilDe(IL_PIE, { h: [60, 13], n: [60, 22], p: [60, 47], k: [61, 65], k2: [58, 65], a2: [52, 83], f2: [59, 83], e: [64, 37], w: [70, 32] }),
    B: { e: [75, 31], w: [88, 31] }, extra: [['p', 'k2'], ['k2', 'a2'], ['a2', 'f2']], ancla: [114, 44], fondo: IL_SUELO },
  escalador: { A: { h: [86, 48], n: [77, 52], p: [48, 60], k: [64, 70], a: [56, 80], f: [52, 84], k2: [33, 70], a2: [18, 80], f2: [14, 84], e: [77, 68], w: [77, 83] },
    B: { k: [33, 70], a: [18, 80], f: [14, 84], k2: [64, 70], a2: [56, 80], f2: [52, 84] }, extra: [['p', 'k2'], ['k2', 'a2'], ['a2', 'f2']], manos: [], fondo: IL_SUELO },
  jacks: { frente: true, A: { h: [60, 12], n: [60, 21], p: [60, 47], sL: [51, 24], sR: [69, 24], eL: [49, 36], wL: [49, 48], eR: [71, 36], wR: [71, 48], kL: [57, 65], aL: [56, 83], kR: [63, 65], aR: [64, 83] },
    B: { eL: [42, 14], wL: [38, 3], eR: [78, 14], wR: [82, 3], kL: [52, 65], aL: [44, 83], kR: [68, 65], aR: [76, 83] }, manos: [], fondo: IL_SUELO },
  thruster: { A: { h: [66, 33], n: [63, 41], p: [48, 62], k: [70, 66], a: [60, 83], f: [68, 83], e: [74, 47], w: [69, 41] },
    B: { h: [60, 17], n: [60, 26], p: [60, 50], k: [61, 66], e: [62, 13], w: [61, 3] }, fondo: IL_SUELO },
  granjero: { A: { h: [62, 13], n: [61, 22], p: [60, 47], k: [65, 65], a: [67, 83], f: [74, 83], k2: [56, 65], a2: [53, 83], f2: [60, 83], e: [62, 35], w: [62, 48] },
    B: { k: [56, 65], a: [53, 83], f: [60, 83], k2: [65, 65], a2: [67, 83], f2: [74, 83] }, extra: [['p', 'k2'], ['k2', 'a2'], ['a2', 'f2']], fondo: IL_SUELO }
});
IL_PAT.extension_piernas.manos = [];
/* reglas por nombre (de lo más concreto a lo más general) */
const IL_REGLAS2 = [
  [/gemel|pantorrill|s[oó]leo/, 'gemelos'],
  [/renegado/, 'plancha'],
  [/prensa/, 'prensa'],
  [/b[uú]lgara|split squat/, 'bulgara'],
  [/step.?up|subida al caj/, 'step_up'],
  [/thruster|wall ball/, 'thruster'],
  [/sentadilla (frontal|zercher)|front squat/, 'sentadilla_frontal'],
  [/goblet|sentadilla sumo con mancuerna|sentadilla con kettlebell/, 'sentadilla_goblet'],
  [/sentadilla con mancuernas|sentadilla con talones elevados/, 'sentadilla_lados'],
  [/sentadilla (con peso corporal|con salto|cosaca|pistol)|sissy|pistol/, 'sentadilla_libre'],
  [/sentadilla|squat|hack/, 'sentadilla'],
  [/patada de gl[uú]teo|kickback de gl/, 'patada_gluteo'],
  [/abducci/, 'abduccion'],
  [/hip thrust/, 'empuje_cadera'],
  [/puente de gl|glute bridge|frog pump/, 'puente'],
  [/n[oó]rdico/, 'nordico'],
  [/curl femoral sentado/, 'curl_femoral_sentado'],
  [/curl femoral de pie/, 'curl_femoral_pie'],
  [/curl femoral|femoral tumbado/, 'curl_femoral'],
  [/hiperextensi/, 'hiperextension'],
  [/buenos d[ií]as|good morning/, 'buenos_dias'],
  [/swing/, 'swing'],
  [/rumano|piernas r[ií]gidas|a una pierna|stiff/, 'bisagra'],
  [/peso muerto|rack pull/, 'peso_muerto'],
  [/zancada|lunge|desplante/, 'zancada'],
  [/extensi[oó]n de (cu[aá]driceps|piernas)/, 'extension_piernas'],
  [/gemel|pantorrill|talones|s[oó]leo/, 'gemelos'],
  [/fondos en banco/, 'fondos_banco'],
  [/fondos/, 'fondos'],
  [/mountain climber/, 'escalador'],
  [/flexion/, 'flexiones'],
  [/pallof/, 'pallof'],
  [/franc[eé]s/, 'press_frances'],
  [/sobre la cabeza|tras nuca|copa|tr[ií]ceps con mancuerna a dos manos/, 'triceps_nuca'],
  [/patada de tr[ií]ceps|kickback/, 'patada_triceps'],
  [/aperturas (con mancuernas|inclinadas)/, 'aperturas_tumbado'],
  [/aperturas|cruce de poleas|contractor|pec.?deck|peck/, 'aperturas'],
  [/pullover/, 'pullover'],
  [/militar|press de hombro|arnold|press (de )?hombros|overhead|push press|press landmine|press con kettlebell$/, 'press_hombro'],
  [/press.*inclinad|inclinado.*press/, 'press_inclinado'],
  [/press.*declinad/, 'press_declinado'],
  [/press|banca/, 'press_banca'],
  [/face pull/, 'face_pull'],
  [/p[aá]jaros|posterior|reverse fly/, 'pajaros'],
  [/remo al ment[oó]n/, 'remo_menton'],
  [/elevaci[oó]n(es)? lateral/, 'laterales'],
  [/elevaci[oó]n(es)? frontal/, 'frontales'],
  [/encogimientos? (con|de hombros)|shrug/, 'encogimientos'],
  [/jal[oó]n|pulldown/, 'jalon'],
  [/dominad|chin.?up|pull.?up/, 'dominadas'],
  [/remo invertido/, 'remo_invertido'],
  [/remo con mancuerna|remo kroc|remo con kettlebell/, 'remo_mancuerna'],
  [/remo en polea|remo sentado|remo en m[aá]quina|remo apoyado|ergómetro|ergometro|skierg/, 'remo_polea'],
  [/remo/, 'remo'],
  [/tr[ií]ceps|pushdown|extensi[oó]n en polea|extensi[oó]n de codo/, 'triceps'],
  [/predicador|scott/, 'curl_predicador'],
  [/curl|b[ií]ceps|martillo/, 'curl'],
  [/rodillas colgado|knee raise/, 'colgado_rodillas'],
  [/colgad|toes to bar/, 'colgado_piernas'],
  [/elevaci[oó]n(es)? de piernas|leg raise|v.?up/, 'elevacion_piernas'],
  [/russian|giro ruso|rotaci|le[nñ]ador|woodchop/, 'giro_ruso'],
  [/crunch|abdominal|sit.?up|rueda|ab wheel|bicho muerto|dead bug/, 'abdominales'],
  [/plancha|plank|renegado/, 'plancha'],
  [/granjero|farmer|maleta/, 'granjero'],
  [/assault|bike|bici|ciclo|spinning|el[ií]ptica/, 'bici'],
  [/jumping|jacks/, 'jacks'],
  [/comba|salto|burpee|box jump|skipping/, 'saltos'],
  [/cinta|correr|carrera|sprint|running|caminar|andar|rodaje|intervalos|siit|hiit|escalera|escaladora|nataci|senderismo|trineo|battle/, 'correr']
];
ilPatron = function(nombre, musculo, material){
  const n = norm(nombre || '').toLowerCase();
  for (let i = 0; i < IL_REGLAS2.length; i++) if (IL_REGLAS2[i][0].test(n)) {
    let p = IL_REGLAS2[i][1];
    if (p === 'remo' && /polea|m[aá]quina|cable/.test(material || '')) p = 'remo_polea';
    if (p === 'press_banca' && norm(musculo || '') === 'hombro') p = 'press_hombro';
    if (p === 'sentadilla' && (material === 'mancuerna')) p = 'sentadilla_lados';
    if (p === 'sentadilla' && (material === 'kettlebell')) p = 'sentadilla_goblet';
    if (p === 'sentadilla' && material === 'corporal') p = 'sentadilla_libre';
    return p;
  }
  return IL_POR_MUSCULO[norm(musculo || '')] || 'sentadilla_libre';
};
/* dibujo v2: rodillos (pd) y barra vista de frente */
ilSvg = function(patron, material, quieto){
  const P = IL_PAT[patron] || IL_PAT.sentadilla;
  const A = P.A, B = ilDe(P.A, P.B || {});
  let h = P.fondo || '';
  const manos = P.manos || (P.frente ? ['wL', 'wR'] : ['w']);
  if (material === 'polea' && manos.length) {
    if (P.anclas) manos.forEach(function(m, i){ h += ilCable(A, B, m, P.anclas[i] || P.anclas[0], quieto); });
    else manos.forEach(function(m){ h += ilCable(A, B, m, P.ancla || [112, 12], quieto); });
  }
  if (material === 'banda' && manos.length) manos.forEach(function(m){ h += ilCable(A, B, m, P.anclas ? P.anclas[0] : (P.ancla || (P.frente ? [m === 'wL' ? 50 : 70, 84] : (A.f || [64, 84]))), quieto, 'il-cable il-banda'); });
  if (material === 'multipower' && manos.length && A[manos[0]]) { const w = A[manos[0]]; h += '<line x1="' + (w[0] + 9) + '" y1="2" x2="' + (w[0] + 9) + '" y2="84" class="il-fondo"/>'; }
  if (P.frente && (material === 'barra' || material === 'multipower') && manos.indexOf('wL') > -1 && manos.indexOf('wR') > -1) h += ilLinea(A, B, 'wL', 'wR', 'il-barra', quieto);
  (P.frente ? IL_FRENTE : IL_CUERPO).concat(P.extra || []).forEach(function(s){ h += ilLinea(A, B, s[0], s[1], 'il-cuerpo', quieto); });
  if (P.placa) h += ilLinea(A, B, 'q1', 'q2', 'il-placa', quieto);
  h += ilCirculo(A, B, 'h', 5.6, 'il-cabeza', 0, 0, quieto);
  if (A.pd) h += ilCirculo(A, B, 'pd', 3.8, 'il-rodillo', 0, 0, quieto);
  if (P.pies) h += ilCirculo(A, B, P.pies, 3.4, 'il-peso', 0, 0, quieto);
  manos.forEach(function(m){
    if (!A[m]) return;
    if (material === 'barra' || material === 'multipower') { if (!P.frente) h += ilCirculo(A, B, m, 6.5, 'il-disco', 0, 0, quieto) + ilCirculo(A, B, m, 1.6, 'il-peso', 0, 0, quieto); else h += ilCirculo(A, B, m, 2.2, 'il-peso', 0, 0, quieto); }
    else if (material === 'mancuerna') h += ilCirculo(A, B, m, 3.8, 'il-peso', 0, 0, quieto);
    else if (material === 'kettlebell') h += ilCirculo(A, B, m, 4.6, 'il-peso', 0, 5, quieto);
    else if (material === 'polea' || material === 'banda' || material === 'maquina') h += ilCirculo(A, B, m, 2.6, 'il-peso', 0, 0, quieto);
  });
  return '<svg viewBox="0 0 120 90" class="il-svg" role="img" aria-hidden="true" focusable="false">' + h + '</svg>';
};

/* =========================================================
   26/10 · v3 · Coherencia título ↔ dibujo
   · Posición: «sentado» se dibuja sentado (asiento y respaldo); tumbado, de rodillas, en suelo o en banco, igual.
   · Material: se lee primero del título («en máquina», «en polea», «con mancuernas», «multipower», «banda»…).
     Las máquinas se dibujan con su asiento, rodillos y agarres (anillo), nunca con mancuernas.
   ========================================================= */
const IL_SEAT_F = function(p){ return '<rect x="' + (p[0] - 14) + '" y="' + (p[1] + 2) + '" width="28" height="4" rx="2" class="il-mueble"/><rect x="' + (p[0] - 10) + '" y="' + (p[1] - 30) + '" width="20" height="30" rx="3" class="il-mueble il-respaldo"/>'; };
const IL_SEAT_L = function(p){ return '<rect x="' + (p[0] - 12) + '" y="' + (p[1] + 2) + '" width="24" height="4" rx="2" class="il-mueble"/><line x1="' + (p[0] - 9) + '" y1="' + (p[1] - 30) + '" x2="' + (p[0] - 9) + '" y2="' + (p[1] + 4) + '" class="il-mueble"/><line x1="' + p[0] + '" y1="' + (p[1] + 6) + '" x2="' + p[0] + '" y2="84" class="il-fondo"/>'; };
const IL_PIERNA_PTS = ['p', 'k', 'a', 'f', 'k2', 'a2', 'f2', 'kL', 'kR', 'aL', 'aR', 'q1', 'q2'];
/* convierte un patrón de pie en sentado: el tronco baja 9 px, muslos al frente y pies al suelo */
function ilSentar(P){
  const dy = 9;
  const conv = function(X){
    const Y = {};
    Object.keys(X).forEach(function(k){ if (IL_PIERNA_PTS.indexOf(k) < 0) Y[k] = [X[k][0], X[k][1] + dy]; });
    const p = [X.p[0], X.p[1] + dy];
    Y.p = p;
    if (P.frente) { Y.kL = [p[0] - 7, p[1] + 9]; Y.aL = [p[0] - 8, 83]; Y.kR = [p[0] + 7, p[1] + 9]; Y.aR = [p[0] + 8, 83]; }
    else { Y.k = [p[0] + 17, p[1] + 1]; Y.a = [p[0] + 19, 83]; Y.f = [p[0] + 26, 83]; }
    return Y;
  };
  const A = conv(P.A), B = conv(ilDe(P.A, P.B || {}));
  const extra = (P.extra || []).filter(function(s){ return IL_PIERNA_PTS.indexOf(s[0]) < 0 || s[0] === 'p' && IL_PIERNA_PTS.indexOf(s[1]) < 0; })
    .filter(function(s){ return ['k2', 'a2', 'f2'].indexOf(s[1]) < 0 && ['k2', 'a2', 'f2'].indexOf(s[0]) < 0; });
  return ilDe(P, { A: A, B: B, extra: extra, fondo: IL_SUELO + (P.frente ? IL_SEAT_F(A.p) : IL_SEAT_L(A.p)),
    ancla: P.ancla ? [P.ancla[0], P.ancla[1] + (P.ancla[1] < 60 ? dy : 0)] : P.ancla });
}
const IL_SENTADO_BASE = { h: [46, 16], n: [46, 25], p: [46, 56], k: [64, 57], a: [66, 83], f: [73, 83] };
const IL_FRENTE_SENT = { h: [60, 21], n: [60, 30], p: [60, 56], sL: [51, 33], sR: [69, 33], kL: [53, 65], aL: [52, 83], kR: [67, 65], aR: [68, 83] };
Object.assign(IL_PAT, {
  press_pecho_maquina: { A: ilDe(IL_SENTADO_BASE, { e: [37, 37], w: [54, 34] }), B: { e: [61, 33], w: [75, 33] },
    fondo: IL_SUELO + IL_SEAT_L([46, 56]) + '<line x1="88" y1="14" x2="88" y2="84" class="il-mueble"/>' },
  triceps_maquina: { A: ilDe(IL_SENTADO_BASE, { e: [37, 40], w: [49, 38] }), B: { e: [46, 46], w: [49, 60] }, fondo: IL_SUELO + IL_SEAT_L([46, 56]) },
  crunch_maquina: { A: ilDe(IL_SENTADO_BASE, { e: [53, 31], w: [50, 23] }), B: { h: [64, 30], n: [58, 36], e: [65, 42], w: [63, 34] }, fondo: IL_SUELO + IL_SEAT_L([46, 56]) },
  pec_deck: { frente: true, A: ilDe(IL_FRENTE_SENT, { eL: [37, 33], wL: [37, 20], eR: [83, 33], wR: [83, 20] }),
    B: { eL: [52, 36], wL: [55, 23], eR: [68, 36], wR: [65, 23] }, manos: ['eL', 'eR'], pads: true, fondo: IL_SUELO + IL_SEAT_F([60, 56]) },
  pajaros_maquina: { frente: true, A: ilDe(IL_FRENTE_SENT, { eL: [52, 35], wL: [57, 34], eR: [68, 35], wR: [63, 34] }),
    B: { eL: [40, 33], wL: [26, 33], eR: [80, 33], wR: [94, 33] }, manos: ['wL', 'wR'], fondo: IL_SUELO + IL_SEAT_F([60, 56]) },
  abduccion_maquina: { frente: true, A: ilDe(IL_FRENTE_SENT, { eL: [49, 44], wL: [46, 54], eR: [71, 44], wR: [74, 54], kL: [56, 65], aL: [56, 83], kR: [64, 65], aR: [64, 83] }),
    B: { kL: [45, 63], aL: [47, 83], kR: [75, 63], aR: [73, 83] }, manos: ['kL', 'kR'], pads: true, fondo: IL_SUELO + IL_SEAT_F([60, 56]) },
  gemelos_sentado: { A: ilDe(IL_SENTADO_BASE, { a: [66, 79], f: [73, 80], e: [52, 42], w: [62, 52], pd: [64, 53] }),
    B: { k: [64, 53], a: [66, 75], f: [74, 80], w: [62, 48], pd: [64, 49] }, manos: [], fondo: IL_SUELO + IL_SEAT_L([46, 56]) + '<rect x="70" y="80" width="10" height="4" class="il-mueble"/>' },
  gemelos_maquina: ilDe(IL_PAT.gemelos, { A: ilDe(IL_PAT.gemelos.A, { pd: [57, 21] }), B: ilDe(IL_PAT.gemelos.B, { pd: [57, 16] }), manos: [], fondo: IL_SUELO + '<line x1="48" y1="4" x2="48" y2="84" class="il-mueble"/>' }),
  sentadilla_maquina: ilDe(IL_PAT.sentadilla, { A: ilDe(IL_PAT.sentadilla.A, { pd: [57, 21] }), B: ilDe(IL_PAT.sentadilla.B, { pd: [61, 39] }), manos: [],
    fondo: IL_SUELO + '<line x1="40" y1="4" x2="52" y2="84" class="il-mueble"/>' }),
  laterales_maquina: ilDe(IL_PAT.laterales, { manos: ['eL', 'eR'], pads: true, sentado: true }),
  aperturas_bajo: ilDe(IL_PAT.aperturas, { A: ilDe(IL_PAT.aperturas.A, { eL: [42, 44], wL: [34, 54], eR: [78, 44], wR: [86, 54] }), B: { eL: [52, 30], wL: [57, 24], eR: [68, 30], wR: [63, 24] }, anclas: [[6, 84], [114, 84]] }),
  press_suelo: { A: { h: [22, 79], n: [31, 80], p: [58, 80], k: [72, 66], a: [80, 83], f: [86, 83], e: [33, 67], w: [35, 54] },
    B: { e: [37, 82], w: [39, 70] }, fondo: IL_SUELO },
  pullover_polea: { A: ilDe(IL_PIE, { h: [70, 16], n: [66, 24], p: [58, 47], k: [61, 65], e: [77, 16], w: [87, 9] }), B: { e: [70, 37], w: [68, 49] }, ancla: [116, 2], fondo: IL_SUELO },
  curl_inclinado: { A: { h: [23, 34], n: [30, 40], p: [52, 58], k: [70, 57], a: [74, 83], f: [81, 83], e: [28, 53], w: [27, 66] }, B: { w: [38, 45] }, fondo: IL_BANCO_INCL },
  curl_concentrado: { A: ilDe(IL_SENTADO_BASE, { h: [66, 27], n: [60, 33], e: [63, 48], w: [63, 62] }), B: { w: [68, 37] },
    fondo: IL_SUELO + '<rect x="32" y="58" width="28" height="4" rx="2" class="il-mueble"/><line x1="46" y1="62" x2="46" y2="84" class="il-fondo"/>' },
  flexiones_rodillas: { A: { h: [86, 52], n: [77, 56], p: [48, 68], k: [36, 82], a: [24, 74], f: [21, 70], e: [77, 70], w: [77, 83] },
    B: { h: [86, 72], n: [77, 76], p: [48, 80], e: [69, 70] }, fondo: IL_SUELO },
  flexiones_inclinadas: { A: { h: [86, 42], n: [77, 46], p: [48, 62], k: [33, 72], a: [18, 80], f: [14, 84], e: [77, 54], w: [77, 62] },
    B: { h: [86, 56], n: [77, 60], p: [48, 70], k: [33, 76], e: [70, 54] }, fondo: IL_SUELO + '<rect x="68" y="62" width="34" height="4" rx="2" class="il-mueble"/><line x1="96" y1="66" x2="96" y2="84" class="il-fondo"/><line x1="74" y1="66" x2="74" y2="84" class="il-fondo"/>' },
  flexiones_declinadas: { A: { h: [86, 52], n: [77, 56], p: [50, 60], k: [34, 60], a: [20, 58], f: [16, 55], e: [77, 70], w: [77, 83] },
    B: { h: [86, 72], n: [77, 75], p: [50, 68], k: [34, 62], e: [69, 70] }, fondo: IL_SUELO + '<rect x="8" y="58" width="26" height="4" rx="2" class="il-mueble"/><line x1="14" y1="62" x2="14" y2="84" class="il-fondo"/>' },
  plancha_lateral: { A: { h: [86, 52], n: [78, 58], p: [48, 70], k: [34, 76], a: [20, 82], f: [17, 84], e: [78, 82], w: [90, 82], e2: [79, 46], w2: [80, 34] },
    B: { p: [48, 66], n: [78, 57], h: [86, 51] }, extra: [['n', 'e2'], ['e2', 'w2']], manos: [], fondo: IL_SUELO },
  zancada_lateral: { frente: true, A: { h: [60, 12], n: [60, 21], p: [60, 47], sL: [51, 24], sR: [69, 24], eL: [49, 36], wL: [49, 48], eR: [71, 36], wR: [71, 48], kL: [56, 65], aL: [55, 83], kR: [64, 65], aR: [65, 83] },
    B: { h: [67, 25], n: [67, 34], p: [64, 58], sL: [58, 37], sR: [76, 37], eL: [57, 49], wL: [59, 59], eR: [77, 49], wR: [75, 59], kL: [54, 70], aL: [44, 83], kR: [77, 64], aR: [83, 83] }, fondo: IL_SUELO },
  bisagra_una: { A: ilDe(IL_PIE, { h: [61, 13], n: [60, 22], p: [58, 47], k: [60, 65], k2: [56, 65], a2: [55, 81], f2: [61, 82], e: [63, 35], w: [64, 48] }),
    B: { h: [84, 37], n: [77, 41], p: [54, 48], k: [59, 66], k2: [38, 52], a2: [22, 56], f2: [18, 60], e: [77, 54], w: [77, 67] }, extra: [['p', 'k2'], ['k2', 'a2'], ['a2', 'f2']], fondo: IL_SUELO },
  remo_tumbado: { A: { h: [86, 40], n: [77, 43], p: [48, 43], k: [32, 44], a: [16, 44], f: [13, 40], e: [77, 57], w: [77, 71] }, B: { e: [66, 40], w: [72, 54] },
    fondo: IL_SUELO + '<rect x="18" y="46" width="66" height="4" rx="2" class="il-mueble"/><line x1="26" y1="50" x2="26" y2="84" class="il-fondo"/><line x1="76" y1="50" x2="76" y2="84" class="il-fondo"/>' },
  crunch_polea: { A: { h: [60, 28], n: [56, 36], p: [50, 58], k: [50, 82], a: [32, 82], f: [28, 80], e: [64, 36], w: [62, 28] },
    B: { h: [79, 62], n: [72, 55], e: [77, 49], w: [79, 56] }, ancla: [62, 0], fondo: IL_SUELO },
  rueda: { A: { h: [68, 50], n: [60, 53], p: [38, 60], k: [36, 82], a: [20, 82], f: [16, 80], e: [62, 66], w: [64, 78] },
    B: { h: [92, 70], n: [84, 72], p: [56, 72], e: [96, 74], w: [104, 78] }, fondo: IL_SUELO },
  dead_bug: { A: { h: [22, 76], n: [30, 78], p: [56, 78], k: [64, 62], a: [78, 62], f: [80, 58], e: [32, 66], w: [34, 54] },
    B: { k: [74, 72], a: [92, 76], f: [95, 72], e: [22, 70], w: [12, 68] }, manos: [], fondo: IL_SUELO },
  nadar: { A: { h: [80, 49], n: [71, 50], p: [42, 52], k: [27, 52], a: [13, 54], f: [10, 58], e: [83, 47], w: [95, 47] },
    B: { e: [60, 57], w: [46, 58], k: [27, 55], a: [13, 50] }, manos: [], fondo: '<path d="M4 46 q8 -4 16 0 t16 0 t16 0 t16 0 t16 0 t16 0 t16 0" class="il-fondo il-agua"/>' },
  cuerdas: { A: { h: [63, 26], n: [60, 34], p: [52, 58], k: [66, 64], a: [60, 83], f: [68, 83], e: [70, 44], w: [80, 40] },
    B: { e: [70, 50], w: [80, 57] }, ancla: [116, 72], fondo: IL_SUELO },
  trineo: { A: { h: [79, 36], n: [71, 40], p: [49, 56], k: [42, 68], a: [30, 83], f: [36, 84], k2: [58, 66], a2: [54, 83], f2: [61, 84], e: [80, 46], w: [90, 44] },
    B: { k: [58, 66], a: [54, 83], f: [61, 84], k2: [42, 68], a2: [30, 83], f2: [36, 84] }, extra: [['p', 'k2'], ['k2', 'a2'], ['a2', 'f2']], manos: [],
    fondo: IL_SUELO + '<line x1="92" y1="36" x2="92" y2="84" class="il-mueble"/><rect x="92" y="62" width="20" height="20" rx="2" class="il-mueble"/>' }
});
IL_PAT.sentadilla_libre.cajon = true;
/* material: primero lo que dice el título, luego el del catálogo */
function ilMatDe(t){
  t = norm(t || '').toLowerCase();
  if (/multipower|smith/.test(t)) return 'multipower';
  if (/m[aá]quina|contractor|pec.?deck|prensa|hack|lever|extensi[oó]n de cu|curl femoral|hip thrust en m/.test(t)) return 'maquina';
  if (/polea|cable|face pull|cruce de poleas|jal[oó]n|pallof/.test(t)) return 'polea';
  if (/kettlebell|pesa rusa|swing/.test(t)) return 'kettlebell';
  if (/banda|goma|el[aá]stic/.test(t)) return 'banda';
  if (/mancuern|goblet/.test(t)) return 'mancuerna';
  if (/wall ball|bal[oó]n/.test(t)) return 'balon';
  if (/rueda|ab wheel/.test(t)) return 'rueda';
  if (/barra|disco|landmine|pendlay|t-bar|zercher|\bz\b/.test(t)) return 'barra';
  return '';
}
ilMaterial = function(nombre, material){ return ilMatDe(nombre) || ilMatDe(material) || 'corporal'; };
const IL_REGLAS3 = [
  [/press de suelo/, 'press_suelo'],
  [/press (en m[aá]quina|convergente)|chest press/, 'press_pecho_maquina'],
  [/extensi[oó]n de tr[ií]ceps en m[aá]quina|^fondos en m[aá]quina$/, 'triceps_maquina'],
  [/crunch en m[aá]quina/, 'crunch_maquina'],
  [/crunch en polea/, 'crunch_polea'],
  [/rueda abdominal|ab wheel/, 'rueda'],
  [/dead bug|bicho muerto/, 'dead_bug'],
  [/contractor|pec.?deck|peck/, 'pec_deck'],
  [/p[aá]jaros en m[aá]quina/, 'pajaros_maquina'],
  [/abducci[oó]n de cadera en m[aá]quina/, 'abduccion_maquina'],
  [/gemelos sentado/, 'gemelos_sentado'],
  [/cruce de poleas bajo/, 'aperturas_bajo'],
  [/pullover en polea|skierg/, 'pullover_polea'],
  [/curl en banco inclinado/, 'curl_inclinado'],
  [/curl concentrado/, 'curl_concentrado'],
  [/flexiones con rodillas/, 'flexiones_rodillas'],
  [/flexiones inclinadas/, 'flexiones_inclinadas'],
  [/flexiones (declinadas|pike)/, 'flexiones_declinadas'],
  [/plancha lateral/, 'plancha_lateral'],
  [/zancada lateral/, 'zancada_lateral'],
  [/peso muerto a una pierna/, 'bisagra_una'],
  [/remo seal|remo tumbado|remo en banco/, 'remo_tumbado'],
  [/nataci/, 'nadar'],
  [/battle|cuerdas/, 'cuerdas'],
  [/trineo/, 'trineo'],
  [/caminar|senderismo|andar/, 'granjero'],
  [/subir escaleras|escaladora/, 'step_up']
];
const IL_DE_PIE = ['press_hombro', 'curl', 'frontales', 'laterales', 'encogimientos', 'triceps_nuca', 'remo_menton'];
ilPatron = (function(orig){
  return function(nombre, musculo, material){
    const n = norm(nombre || '').toLowerCase();
    let p = null;
    for (let i = 0; i < IL_REGLAS3.length; i++) if (IL_REGLAS3[i][0].test(n)) { p = IL_REGLAS3[i][1]; break; }
    if (!p) p = orig.apply(this, arguments);
    if (p === 'gemelos' && material === 'maquina') p = 'gemelos_maquina';
    if (/^sentadilla/.test(p) && material === 'maquina') p = 'sentadilla_maquina';
    if (p === 'laterales' && material === 'maquina') p = 'laterales_maquina';
    if (p === 'press_hombro' && material === 'maquina') p += '+sentado';
    else if (IL_DE_PIE.indexOf(p) > -1 && /sentad[oa]/.test(n)) p += '+sentado';
    if (p === 'laterales_maquina') p += '+sentado';
    if (p === 'sentadilla' && /a caj[oó]n/.test(n)) p = 'sentadilla+cajon';
    return p;
  };
})(ilPatron);
/* dibujo v3: sentado, cajón, almohadillas de máquina, agarres en anillo, balón, rueda y cuerdas */
ilSvg = (function(orig){
  return function(patron, material, quieto){
    const partes = String(patron).split('+'), base = partes[0], mods = partes.slice(1);
    let P = IL_PAT[base] || IL_PAT.sentadilla;
    if (mods.indexOf('sentado') > -1 || P.sentado) P = ilSentar(P);
    if (mods.indexOf('cajon') > -1) P = ilDe(P, { fondo: (P.fondo || '') + '<rect x="30" y="64" width="20" height="20" rx="2" class="il-mueble"/>' });
    const A = P.A, B = ilDe(P.A, P.B || {});
    const manos = P.manos || (P.frente ? ['wL', 'wR'] : ['w']);
    let h = P.fondo || '';
    if (material === 'polea' && manos.length) {
      if (P.anclas) manos.forEach(function(m, i){ h += ilCable(A, B, m, P.anclas[i] || P.anclas[0], quieto); });
      else manos.forEach(function(m){ h += ilCable(A, B, m, P.ancla || [112, 12], quieto); });
    }
    if (base === 'cuerdas') h += ilCable(A, B, 'w', P.ancla, quieto, 'il-cable il-cuerda');
    if (material === 'banda' && manos.length) manos.forEach(function(m){ h += ilCable(A, B, m, P.anclas ? P.anclas[0] : (P.ancla || (P.frente ? [m === 'wL' ? 50 : 70, 84] : (A.f || [64, 84]))), quieto, 'il-cable il-banda'); });
    if (material === 'multipower' && manos.length && A[manos[0]]) { const w = A[manos[0]]; h += '<line x1="' + (w[0] + 9) + '" y1="2" x2="' + (w[0] + 9) + '" y2="84" class="il-fondo"/>'; }
    if (P.frente && (material === 'barra' || material === 'multipower') && manos.indexOf('wL') > -1 && manos.indexOf('wR') > -1) h += ilLinea(A, B, 'wL', 'wR', 'il-barra', quieto);
    (P.frente ? IL_FRENTE : IL_CUERPO).concat(P.extra || []).forEach(function(s){ h += ilLinea(A, B, s[0], s[1], 'il-cuerpo', quieto); });
    if (P.placa) h += ilLinea(A, B, 'q1', 'q2', 'il-placa', quieto);
    h += ilCirculo(A, B, 'h', 5.6, 'il-cabeza', 0, 0, quieto);
    if (A.pd) h += ilCirculo(A, B, 'pd', 3.8, 'il-rodillo', 0, 0, quieto);
    if (P.pies) h += ilCirculo(A, B, P.pies, 3.4, 'il-peso', 0, 0, quieto);
    manos.forEach(function(m){
      if (!A[m]) return;
      if (P.pads) h += ilCirculo(A, B, m, 4, 'il-rodillo', 0, 0, quieto);
      else if (material === 'barra' || material === 'multipower') { if (!P.frente) h += ilCirculo(A, B, m, 6.5, 'il-disco', 0, 0, quieto) + ilCirculo(A, B, m, 1.6, 'il-peso', 0, 0, quieto); else h += ilCirculo(A, B, m, 2.2, 'il-peso', 0, 0, quieto); }
      else if (material === 'mancuerna') h += ilCirculo(A, B, m, 3.8, 'il-peso', 0, 0, quieto);
      else if (material === 'kettlebell') h += ilCirculo(A, B, m, 4.6, 'il-peso', 0, 5, quieto);
      else if (material === 'balon') h += ilCirculo(A, B, m, 6, 'il-balon', 0, -2, quieto);
      else if (material === 'rueda') h += ilCirculo(A, B, m, 4.5, 'il-disco', 0, 1, quieto);
      else if (material === 'maquina') h += ilCirculo(A, B, m, 3, 'il-mango', 0, 0, quieto);
      else if (material === 'polea' || material === 'banda') h += ilCirculo(A, B, m, 2.6, 'il-peso', 0, 0, quieto);
    });
    return '<svg viewBox="0 0 120 90" class="il-svg" role="img" aria-hidden="true" focusable="false">' + h + '</svg>';
  };
})(ilSvg);
/* v3 · últimos ajustes de coherencia */
Object.assign(IL_PAT, {
  dominadas_asistidas: ilDe(IL_PAT.dominadas, { A: ilDe(IL_PAT.dominadas.A, { k: [60, 68], a: [46, 66], f: [42, 62], pd: [56, 72] }), B: ilDe(IL_PAT.dominadas.B, { k: [60, 54], a: [46, 52], f: [42, 48], pd: [56, 58] }),
    fondo: IL_PAT.dominadas.fondo + '<line x1="56" y1="76" x2="56" y2="84" class="il-fondo"/>' }),
  fondos_asistidos: ilDe(IL_PAT.fondos, { A: ilDe(IL_PAT.fondos.A, { pd: [58, 66] }), B: ilDe(IL_PAT.fondos.B, { pd: [60, 78] }) }),
  curl_arana: { A: { h: [70, 32], n: [62, 38], p: [40, 58], k: [36, 72], a: [30, 83], f: [36, 84], e: [64, 51], w: [64, 64] }, B: { w: [72, 43] },
    fondo: IL_SUELO + '<line x1="36" y1="66" x2="60" y2="40" class="il-mueble"/><line x1="44" y1="58" x2="44" y2="84" class="il-fondo"/>' },
  gemelos_prensa: ilDe(IL_PAT.prensa, { A: ilDe(IL_PAT.prensa.A, IL_PAT.prensa.B, { a: [80, 46], f: [86, 40], q1: [86, 30], q2: [90, 52] }), B: { f: [88, 36], q1: [89, 27], q2: [93, 49] } }),
  renegado: { A: { h: [86, 49], n: [77, 53], p: [48, 63], k: [33, 72], a: [18, 80], f: [14, 84], e: [77, 68], w: [77, 80] }, B: { e: [66, 50], w: [72, 64] }, fondo: IL_SUELO },
  plancha_pierna: ilDe(IL_PAT.plancha, { B: { k: [32, 66], a: [16, 64], f: [12, 66] } }),
  saltos_cajon: { A: ilDe(IL_PIE, { h: [56, 30], n: [54, 38], p: [44, 58], k: [62, 64], a: [54, 83], f: [62, 83], e: [46, 50], w: [42, 60] }),
    B: { h: [80, 20], n: [80, 29], p: [80, 52], k: [82, 66], a: [80, 66], f: [88, 66], e: [86, 40], w: [90, 30] }, manos: [],
    fondo: IL_SUELO + '<rect x="70" y="66" width="28" height="18" rx="2" class="il-mueble"/>' }
});
IL_PAT.saltos_cajon.B.k = [84, 59];
IL_PAT.gemelos_prensa.manos = [];
IL_REGLAS3.unshift(
  [/dominadas asistidas/, 'dominadas_asistidas'],
  [/fondos en m[aá]quina asistida|fondos asistidos/, 'fondos_asistidos'],
  [/curl ara[nñ]a/, 'curl_arana'],
  [/gemelos en prensa/, 'gemelos_prensa'],
  [/remo renegado/, 'renegado'],
  [/plancha con elevaci[oó]n de pierna/, 'plancha_pierna'],
  [/saltos al caj[oó]n|box jump/, 'saltos_cajon']
);
ilMatDe = (function(orig){ return function(t){ return /skierg/.test(norm(t || '').toLowerCase()) ? 'polea' : orig(t); }; })(ilMatDe);

/* =========================================================
   6/11/2026 · Domingo pide quitar por ahora las figuras animadas de los ejercicios.
   Se queda la indicación técnica corta. Para volver a enseñarlas: IL_FIGURAS = true.
   ========================================================= */
const IL_FIGURAS = false;
if (!IL_FIGURAS) ilPoner = function(it){
  if (!it || isCoachView()) return;
  const nombre = enNombreEj(it); if (!nombre) return;
  let box = it.querySelector(':scope > .il-box');
  if (box && box.dataset.n === nombre) return;
  const txt = ilConsejo(ilInfo(nombre));
  if (!txt) { if (box) box.remove(); return; }
  if (!box) {
    box = document.createElement('div'); box.className = 'il-box il-solo-txt';
    const fila = it.querySelector('.ex-table-row');
    it.insertBefore(box, fila ? fila.nextSibling : it.firstChild);
  }
  box.dataset.n = nombre;
  box.innerHTML = '<p class="il-txt">' + esc(txt) + '</p>';
};
