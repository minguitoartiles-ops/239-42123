/* =========================================================
   Fitnessindramas — Figuras de los ejercicios, versión 4 (8/11/2026)
   Revisión de Domingo: de 233 figuras, 81 valen y 152 hay que rehacerlas (ver el documento
   «revisión de figuras 8/11» del proyecto). Este motor nuevo solo se usa para las que se rehacen:
   · una figura con articulaciones y medidas fijas (los brazos y piernas no se estiran ni encogen);
   · varias posturas seguidas (el pie se levanta al dar el paso, pausas, saltos, secuencias);
   · vista de lado o de frente, según lo que distingue al ejercicio;
   · el material donde va de verdad (barra en el trapecio, alineada con el raíl de la multipower…).
   Se calcula la postura entera en cada instante (cinemática inversa para codos y rodillas) y se
   anima con SMIL, como las figuras de antes. Sin dependencias.
   ========================================================= */
const FG_L = { canilla: 18, muslo: 19, tronco: 24, cuello: 8.5, brazo: 13, antebrazo: 12, pie: 7 };
const FG_SUELO = 84;
function fgRad(d){ return d * Math.PI / 180; }
/* ángulo medido desde «hacia arriba», en el sentido de las agujas del reloj (90 = hacia delante/derecha) */
function fgDir(ang, l){ return [Math.sin(fgRad(ang)) * l, -Math.cos(fgRad(ang)) * l]; }
function fgSum(a, b){ return [a[0] + b[0], a[1] + b[1]]; }
function fgLerp(a, b, k){
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * k;
  if (Array.isArray(a) && Array.isArray(b)) return a.map(function(v, i){ return fgLerp(v, b[i], k); });
  return k < 0.5 ? a : b;
}
/* dos segmentos desde «r» hasta «t»: devuelve la articulación del medio. lado: 1 / -1 (hacia qué lado se dobla) */
function fgIK(r, t, l1, l2, lado){
  let dx = t[0] - r[0], dy = t[1] - r[1], d = Math.hypot(dx, dy) || 0.001;
  const max = l1 + l2 - 0.05, min = Math.abs(l1 - l2) + 0.05;
  if (d > max) { t = [r[0] + dx / d * max, r[1] + dy / d * max]; dx = t[0] - r[0]; dy = t[1] - r[1]; d = max; }
  if (d < min) { t = [r[0] + dx / d * min, r[1] + dy / d * min]; dx = t[0] - r[0]; dy = t[1] - r[1]; d = min; }
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const base = Math.atan2(dy, dx), ang = base + (lado || 1) * a;
  return { j: [r[0] + l1 * Math.cos(ang), r[1] + l1 * Math.sin(ang)], t: t };
}
function fgVal(v, P){ return typeof v === 'function' ? v(P) : v; }

/* ---------- postura de lado (mirando a la derecha) ----------
   p: cadera · t: inclinación del tronco (0 de pie, 90 tumbado boca abajo hacia delante, -90 boca arriba)
   a/a2: tobillos · f/f2: punta del pie · r/r2: hacia dónde se doblan las rodillas
   w/w2: manos (punto o función de la postura) · c/c2: hacia dónde se doblan los codos
   brazo/brazo2: [ángulo del brazo, ángulo del antebrazo] en lugar de la mano */
function fgLado(S){
  const P = {};
  P.p = S.p;
  P.n = fgSum(P.p, fgDir(S.t, FG_L.tronco));
  P.h = fgSum(P.n, fgDir(S.t + (S.cab || 0), FG_L.cuello));
  [['', 1], ['2', 2]].forEach(function(x){
    const s = x[0];
    const a = fgVal(S['a' + s] || S.a, P);
    const k = fgIK(P.p, a, FG_L.muslo, FG_L.canilla, S['r' + s] != null ? S['r' + s] : (S.r != null ? S.r : -1));
    P['k' + s] = k.j; P['a' + s] = k.t;
    const f = fgVal(S['f' + s] || S.f, P);
    P['f' + s] = f || fgSum(k.t, [FG_L.pie, 0]);
  });
  [['', 1], ['2', 2]].forEach(function(x){
    const s = x[0];
    const br = S['brazo' + s] || (!S['w' + s] && S.brazo);
    if (br) { P['e' + s] = fgSum(P.n, fgDir(br[0], FG_L.brazo)); P['w' + s] = fgSum(P['e' + s], fgDir(br[1], FG_L.antebrazo)); return; }
    const w = fgVal(S['w' + s] || S.w, P);
    if (!w) return;
    // escBrazo < 1: el brazo va abierto hacia fuera y, visto de lado, se ve más corto (press de banca)
    const e = fgIK(P.n, w, FG_L.brazo * (S.escBrazo || 1), FG_L.antebrazo, S['c' + s] != null ? S['c' + s] : (S.c != null ? S.c : 1));
    P['e' + s] = e.j; P['w' + s] = e.t;
  });
  return P;
}
/* ---------- postura de frente (o de espaldas) ----------
   p: centro de la cadera · t: inclinación lateral · aL/aR: tobillos · wL/wR: manos
   hombros: media anchura de hombros · caderas: media anchura de cadera */
/* al: { en: función(P) → punto, x } · mueve la cadera hasta que ese punto (la barra) quede en la vertical x */
function fgLadoAl(S){
  let P = fgLado(S);
  if (!S.al) return P;
  let Q = S;
  for (let i = 0; i < 4; i++) { const q = S.al.en(P); Q = Object.assign({}, Q, { p: [Q.p[0] + (S.al.x - q[0]), Q.p[1]] }); P = fgLado(Q); }
  return P;
}
function fgFrente(S){
  const P = {}, hs = S.hombros || 8, hc = S.caderas || 5;
  P.p = S.p;
  P.n = fgSum(P.p, fgDir(S.t || 0, FG_L.tronco));
  P.h = fgSum(P.n, fgDir((S.t || 0) + (S.cab || 0), FG_L.cuello));
  const perp = fgDir((S.t || 0) + 90, 1);
  P.sL = [P.n[0] - perp[0] * hs, P.n[1] - perp[1] * hs + 1.5]; P.sR = [P.n[0] + perp[0] * hs, P.n[1] + perp[1] * hs + 1.5];
  P.pL = [P.p[0] - perp[0] * hc, P.p[1] - perp[1] * hc]; P.pR = [P.p[0] + perp[0] * hc, P.p[1] + perp[1] * hc];
  ['L', 'R'].forEach(function(s){
    const sig = s === 'L' ? -1 : 1;
    const a = fgVal(S['a' + s], P);
    const k = fgIK(P['p' + s], a, FG_L.muslo, FG_L.canilla, S['r' + s] != null ? S['r' + s] : (s === 'L' ? 1 : -1));
    P['k' + s] = k.j; P['a' + s] = k.t;
    const f = fgVal(S['f' + s], P);
    P['f' + s] = f || fgSum(k.t, [sig * 4.5, 1]);
    const w = fgVal(S['w' + s], P);
    if (w) { const e = fgIK(P['s' + s], w, FG_L.brazo, FG_L.antebrazo, S['c' + s] != null ? S['c' + s] : (s === 'L' ? 1 : -1)); P['e' + s] = e.j; P['w' + s] = e.t; }
  });
  return P;
}
const FG_HUESOS_LADO = [['p', 'n'], ['p', 'k2'], ['k2', 'a2'], ['a2', 'f2'], ['n', 'e2'], ['e2', 'w2'], ['p', 'k'], ['k', 'a'], ['a', 'f'], ['n', 'e'], ['e', 'w']];
const FG_HUESOS_FRENTE = [['p', 'n'], ['sL', 'sR'], ['pL', 'pR'], ['sL', 'eL'], ['eL', 'wL'], ['sR', 'eR'], ['eR', 'wR'], ['pL', 'kL'], ['kL', 'aL'], ['aL', 'fL'], ['pR', 'kR'], ['kR', 'aR'], ['aR', 'fR']];

/* primitivas de un instante: [tipo, clase, ...números] — mismo orden en todos los instantes */
function fgPrims(F, S){
  const out = [], P = S.vista === 'frente' ? fgFrente(F) : fgLadoAl(F);
  const ln = function(a, b, cls){ out.push(['l', cls || 'il-cuerpo', a[0], a[1], b[0], b[1]]); };
  const ci = function(c, r, cls){ out.push(['c', cls, c[0], c[1], r]); };
  if (S.atras) S.atras(P, ln, ci, F);                             // material detrás del cuerpo
  const huesos = S.vista === 'frente' ? FG_HUESOS_FRENTE : FG_HUESOS_LADO;
  huesos.forEach(function(hb){ if (P[hb[0]] && P[hb[1]]) ln(P[hb[0]], P[hb[1]], S.segundo && /2$/.test(hb[1]) ? 'il-cuerpo il-lejos' : 'il-cuerpo'); });
  ci(P.h, 5.6, 'il-cabeza');
  if (S.delante) S.delante(P, ln, ci, F);                         // material en las manos
  return out;
}
/* ---------- línea de tiempo: [postura, segundos para llegar a ella] ---------- */
function fgCuadros(S){
  const seq = S.seq, cuadros = [], tiempos = [];
  let total = 0;
  seq.forEach(function(x, i){ if (i) total += x[1]; });
  total += S.vuelta != null ? S.vuelta : seq[0][1];
  let t = 0;
  const suave = function(k){ return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; };
  const tramos = seq.map(function(x, i){ return [seq[i][0], (seq[i + 1] || seq[0])[0], i + 1 < seq.length ? seq[i + 1][1] : (S.vuelta != null ? S.vuelta : seq[0][1])]; });
  tramos.forEach(function(tr){
    const n = Math.max(1, Math.round(tr[2] * 14));
    for (let j = 0; j < n; j++) {
      const k = suave(j / n), F = {};
      Object.keys(Object.assign({}, tr[0], tr[1])).forEach(function(c){ F[c] = tr[0][c] === undefined ? tr[1][c] : (tr[1][c] === undefined ? tr[0][c] : fgLerp(tr[0][c], tr[1][c], k)); });
      cuadros.push(F); tiempos.push(t / total);
      t += tr[2] / n;
    }
  });
  cuadros.push(seq[0][0]); tiempos.push(1);
  return { cuadros: cuadros, tiempos: tiempos, total: total };
}
function fgNum(v){ return Math.round(v * 10) / 10; }
function fgSvg(S, quieto){
  const tl = fgCuadros(S);
  const prims = (quieto ? [S.seq[S.quieto || 0][0]] : tl.cuadros).map(function(F){ return fgPrims(F, S); });
  const kt = tl.tiempos.map(function(x){ return fgNum(x * 1000) / 1000; }).join(';');
  const dur = tl.total.toFixed(2) + 's';
  const anim = function(attr, vals){
    const v = vals.map(fgNum);
    if (quieto || v.every(function(x){ return x === v[0]; })) return '';
    return '<animate attributeName="' + attr + '" values="' + v.join(';') + '" keyTimes="' + kt + '" dur="' + dur + '" repeatCount="indefinite"/>';
  };
  let h = S.fondo || '';
  prims[0].forEach(function(p0, i){
    const col = function(j){ return prims.map(function(pr){ return pr[i][j]; }); };
    if (p0[0] === 'l') h += '<line x1="' + fgNum(p0[2]) + '" y1="' + fgNum(p0[3]) + '" x2="' + fgNum(p0[4]) + '" y2="' + fgNum(p0[5]) + '" class="' + p0[1] + '">' + anim('x1', col(2)) + anim('y1', col(3)) + anim('x2', col(4)) + anim('y2', col(5)) + '</line>';
    else h += '<circle cx="' + fgNum(p0[2]) + '" cy="' + fgNum(p0[3]) + '" r="' + p0[4] + '" class="' + p0[1] + '">' + anim('cx', col(2)) + anim('cy', col(3)) + '</circle>';
  });
  return '<svg viewBox="0 0 120 90" class="il-svg" role="img" aria-hidden="true" focusable="false">' + h + '</svg>';
}

/* ---------- material ---------- */
const FG_PISO = '<line x1="4" y1="84.5" x2="116" y2="84.5" class="il-fondo"/>';
function fgDisco(ci, c){ ci(c, 6.5, 'il-disco'); ci(c, 1.6, 'il-peso'); }
function fgRail(x){ return '<line x1="' + x + '" y1="3" x2="' + x + '" y2="84" class="il-mueble il-sin"/><line x1="' + (x - 3) + '" y1="3" x2="' + (x + 3) + '" y2="3" class="il-mueble"/>'; }
function fgCaja(x, y, w, hgt){ return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hgt + '" rx="2" class="il-mueble"/>'; }
function fgBanco(x1, x2, y){ return '<rect x="' + x1 + '" y="' + (y - 2) + '" width="' + (x2 - x1) + '" height="4" rx="2" class="il-mueble"/><line x1="' + (x1 + 6) + '" y1="' + (y + 2) + '" x2="' + (x1 + 6) + '" y2="84" class="il-fondo"/><line x1="' + (x2 - 6) + '" y1="' + (y + 2) + '" x2="' + (x2 - 6) + '" y2="84" class="il-fondo"/>'; }
/* barra apoyada en el trapecio: un poco por detrás y por debajo del hombro */
function fgTrapecio(P){ const t = Math.atan2(P.n[0] - P.p[0], P.p[1] - P.n[1]) * 180 / Math.PI; return fgSum(fgSum(P.n, fgDir(t - 90, 3.2)), fgDir(t + 180, 1.5)); }
function fgDeltoides(P){ const t = Math.atan2(P.n[0] - P.p[0], P.p[1] - P.n[1]) * 180 / Math.PI; return fgSum(fgSum(P.n, fgDir(t + 90, 4.2)), fgDir(t + 180, 1)); }
/* dónde está la barra o el peso en este instante (para dibujarlo encima de las manos) */
function fgEnManos(tipo, que){
  return function(P, ln, ci){
    const m = que ? (typeof que === 'function' ? que(P) : P[que]) : P.w;
    if (tipo === 'barra') fgDisco(ci, m);
    else if (tipo === 'mancuerna') ci(m, 3.8, 'il-peso');
    else if (tipo === 'kettlebell') ci(fgSum(m, [0, 5]), 4.6, 'il-peso');
  };
}

/* =========================================================
   CATÁLOGO DE FIGURAS NUEVAS
   ========================================================= */
const FG = {};
/* --- sentadillas: profundas (cadera por debajo de la rodilla) y la barra bajando en vertical sobre la mitad del pie --- */
const FG_PIE = { a: [55, 82.5], f: [63, 83.5] };
/* opc: bx (vertical de la barra), en (dónde va la barra), brazo (función del tronco → [brazo, antebrazo]) o mano, tAbajo, pAbajoY */
function fgSent(opc){
  opc = opc || {};
  const en = opc.en || fgTrapecio, bx = opc.bx != null ? opc.bx : 59;
  const pose = function(y, t, cab){
    const S = { p: [bx, y], t: t, cab: cab, a: opc.a || FG_PIE.a, f: opc.f || FG_PIE.f, al: { en: en, x: bx } };
    if (opc.brazo) S.brazo = opc.brazo(t); else { S.w = opc.mano || en; S.c = opc.c != null ? opc.c : -1; }
    return S;
  };
  return { arriba: pose(46, opc.tArriba != null ? opc.tArriba : 3, -2), abajo: pose(opc.pAbajoY || 70, opc.tAbajo != null ? opc.tAbajo : 38, -18),
           en: en, medio: function(k){ return pose(fgLerp(opc.pAbajoY || 70, 46, k), fgLerp(opc.tAbajo != null ? opc.tAbajo : 38, 3, k), -14); } };
}
function fgSentFig(s, extra){
  return Object.assign({ seq: [[s.arriba, 1], [s.abajo, 1.3], [s.abajo, 0.25]], vuelta: 1.1, fondo: FG_PISO, delante: fgEnManos('barra', s.en) }, extra || {});
}
(function(){
  const s = fgSent();
  FG['sentadilla'] = fgSentFig(s);
  FG['sentadilla con pausa'] = fgSentFig(s, { seq: [[s.arriba, 1], [s.abajo, 1.3], [s.abajo, 1.4]] });
  FG['sentadilla 1 y 1/4'] = fgSentFig(s, { seq: [[s.arriba, 1], [s.abajo, 1.2], [s.medio(0.3), 0.55], [s.abajo, 0.55], [s.abajo, 0.15]], vuelta: 1.2 });
  // a cajón: baja hasta sentarse un instante en el cajón, detrás
  const c = fgSent({ tAbajo: 32, pAbajoY: 63 });
  const cb = fgLadoAl(c.abajo);              // el cajón, justo debajo de la cadera cuando se sienta
  FG['sentadilla a cajon'] = fgSentFig(c, { seq: [[c.arriba, 1], [c.abajo, 1.3], [c.abajo, 0.6]], fondo: FG_PISO + fgCaja(Math.round(cb.p[0] - 12), Math.round(cb.p[1] + 2.5), 16, Math.round(84 - cb.p[1] - 2.5)) });
  // multipower: el raíl pasa por la barra; los pies algo por delante de la barra
  const m = fgSent({ bx: 52, tAbajo: 28, a: [57, 82.5], f: [65, 83.5] });
  FG['sentadilla en multipower'] = fgSentFig(m, { fondo: FG_PISO + fgRail(52) });
  // frontal: barra sobre los deltoides, codos altos (brazo casi horizontal), tronco erguido
  const fr = fgSent({ en: fgDeltoides, bx: 60, tAbajo: 20, pAbajoY: 68, brazo: function(t){ return [t + 82, t - 62]; } });
  FG['sentadilla frontal'] = fgSentFig(fr);
  // Zercher: la barra en el pliegue de los codos, delante del abdomen («como coger a alguien en brazos»)
  const zEn = function(P){ return fgSum(P.e, [0, -2.5]); };
  const z = fgSent({ en: zEn, bx: 64, tAbajo: 24, pAbajoY: 66, brazo: function(t){ return [t + 145, t + 12]; } });
  FG['sentadilla zercher'] = fgSentFig(z);
})();
/* sentadilla con talones elevados (mancuernas en los hombros, talones sobre un disco) */
(function(){
  const a = [56, 78], f = [64, 83.5];
  const arriba = { p: [57, 43.5], t: 1, a: a, f: f, brazo: [166, 8] };
  const abajo = { p: [49, 66], t: 18, cab: -10, a: a, f: f, brazo: [183, 25] };
  FG['sentadilla con talones elevados'] = { seq: [[arriba, 1], [abajo, 1.3], [abajo, 0.2]], vuelta: 1.1,
    fondo: FG_PISO + '<rect x="50" y="80.5" width="10" height="3.5" rx="1" class="il-mueble"/>', delante: fgEnManos('mancuerna') };
})();
/* sentadilla con salto: baja, salta (los pies despegan) y amortigua */
(function(){
  const pie = { a: [55, 82.5], f: [63, 83.5] };
  const arriba = Object.assign({ p: [58, 46], t: 3, brazo: [185, 180] }, pie);
  const abajo = Object.assign({ p: [46, 66], t: 36, cab: -18, brazo: [95, 92] }, pie);          // brazos al frente al bajar
  const aire = { p: [58, 34], t: -2, a: [57, 71], f: [62, 76], brazo: [200, 195] };             // y atrás al saltar
  FG['sentadilla con salto'] = { seq: [[arriba, 0.6], [abajo, 0.9], [aire, 0.35], [arriba, 0.35]], vuelta: 0.4, fondo: FG_PISO };
})();
/* pistol: a una pierna; la otra estirada al frente; brazos al frente para equilibrar */
(function(){
  const arriba = { p: [55, 46], t: 3, a: [55, 82.5], f: [63, 83.5], a2: [76, 52], f2: [80, 47], r2: -1, brazo: [100, 95] };
  const abajo = { p: [44, 69], t: 34, cab: -16, a: [55, 82.5], f: [63, 83.5], a2: [79, 70], f2: [83, 64], r2: -1, brazo: [100, 95] };
  arriba.a2 = [63, 63]; arriba.f2 = [69, 62];
  FG['sentadilla pistol'] = { seq: [[arriba, 1], [abajo, 1.5], [abajo, 0.2]], vuelta: 1.3, fondo: FG_PISO };
})();
/* cosaca (de frente): pies muy abiertos, baja hacia un lado; la otra pierna estirada con la punta arriba */
(function(){
  const base = { vista: 'frente', aL: [34, 82], aR: [86, 82] };
  const centro = Object.assign({}, base, { p: [60, 47], wL: [56, 50], wR: [64, 50] });
  const izq = Object.assign({}, base, { p: [42, 66], t: -10, wL: [50, 58], wR: [58, 58], rR: -1, fR: [90, 78] });
  const der = Object.assign({}, base, { p: [78, 66], t: 10, wL: [62, 58], wR: [70, 58], rL: 1, fL: [30, 78] });
  FG['sentadilla cosaca'] = { vista: 'frente', seq: [[centro, 0.8], [izq, 1.1], [izq, 0.3], [centro, 1], [der, 1.1], [der, 0.3]], vuelta: 1, fondo: FG_PISO };
})();
/* sissy: sobre la punta de los pies, las rodillas van hacia delante y abajo, y la línea rodilla-cadera-hombro
   se mantiene recta, echada hacia atrás (la cadera no se dobla); brazos al frente para equilibrar */
(function(){
  const sissy = function(angCanilla, angLinea, cab){
    const a = [58, 80.5], k = fgSum(a, fgDir(angCanilla, FG_L.canilla)), p = fgSum(k, fgDir(angLinea, FG_L.muslo));
    return { p: p, t: angLinea, cab: cab, a: a, f: [66, 84], r: -1, brazo: [angLinea + 100, angLinea + 95] };
  };
  const arriba = sissy(8, 0, 0), abajo = sissy(62, -48, 28);
  FG['sissy squat'] = { seq: [[arriba, 1], [abajo, 1.5], [abajo, 0.3]], vuelta: 1.3, fondo: FG_PISO };
})();
/* sumo (de frente): pies muy abiertos con las puntas hacia fuera */
(function(){
  const pies = { aL: [40, 82], aR: [80, 82], fL: [35, 84], fR: [85, 84] };
  const arriba = Object.assign({ vista: 'frente', p: [60, 46], wL: [58, 68], wR: [62, 68], cL: -1, cR: 1 }, pies);
  const abajo = Object.assign({ vista: 'frente', p: [60, 62], wL: [58, 82], wR: [62, 82], cL: -1, cR: 1 }, pies);
  arriba.rL = 1; arriba.rR = -1; abajo.rL = 1; abajo.rR = -1;
  FG['sentadilla sumo con mancuerna'] = { vista: 'frente', seq: [[arriba, 1], [abajo, 1.3], [abajo, 0.2]], vuelta: 1.1, fondo: FG_PISO,
    delante: function(P, ln, ci){ const c = fgLerp(P.wL, P.wR, 0.5); ln([c[0], c[1] - 1], [c[0], c[1] + 9], 'il-barra'); ci([c[0], c[1] + 10], 3.6, 'il-peso'); } };
  // peso muerto sumo: barra en el suelo, delante de las canillas
  const pmA = Object.assign({ vista: 'frente', p: [60, 46], wL: [52, 68], wR: [68, 68], cL: -1, cR: 1, t: 0 }, pies);
  const pmB = Object.assign({ vista: 'frente', p: [60, 61], wL: [52, 77.5], wR: [68, 77.5], cL: -1, cR: 1, t: 0 }, pies);   // discos apoyados en el suelo
  pmA.rL = pmB.rL = 1; pmA.rR = pmB.rR = -1;
  FG['peso muerto sumo'] = { vista: 'frente', seq: [[pmB, 0.6], [pmA, 1.3], [pmA, 0.3], [pmB, 1.3]], vuelta: 0.6, fondo: FG_PISO,
    delante: function(P, ln, ci){ const y = (P.wL[1] + P.wR[1]) / 2; ln([20, y], [100, y], 'il-barra'); ['22', '98'].forEach(function(x){ ln([+x, y - 6.5], [+x, y + 6.5], 'il-placa'); }); } };
})();

/* --- multipower: la barra sube y baja pegada al raíl --- */
(function(){
  // press de pecho / cerrado en multipower (banco plano)
  const banco = fgBanco(20, 82, 58);
  const tumb = function(y, esc){ return { p: [62, 54.5], t: -90, cab: 6, a: [74, 82.5], f: [81, 83.5], r: -1, w: [44, y], c: 1, escBrazo: esc }; };   // codos por debajo de la barra, hacia los pies (no hacia la cabeza)
  ['press de pecho en multipower', 'press cerrado en multipower'].forEach(function(n){
    FG[n] = { seq: [[tumb(31, 1), 0.8], [tumb(49, 0.7), 1.3], [tumb(49, 0.7), 0.2]], vuelta: 1.1, fondo: FG_PISO + banco + fgRail(44), delante: fgEnManos('barra') };
  });
  // inclinado: banco a 30-45 grados; la barra baja en vertical hasta la parte alta del pecho
  const incl = '<line x1="22" y1="34" x2="52" y2="60" class="il-mueble"/><rect x="50" y="58" width="22" height="4" rx="2" class="il-mueble"/><line x1="60" y1="62" x2="60" y2="84" class="il-fondo"/>';
  const inc = function(y, esc){ return { p: [56, 57], t: -52, cab: 10, a: [74, 82.5], f: [81, 83.5], w: [40, y], c: 1, escBrazo: esc }; };
  FG['press inclinado en multipower'] = { seq: [[inc(19, 1), 0.8], [inc(37, 0.7), 1.3], [inc(37, 0.7), 0.2]], vuelta: 1.1, fondo: FG_PISO + incl + fgRail(40), delante: fgEnManos('barra') };
  // remo en multipower: tronco inclinado, la barra sube en vertical por el raíl hasta el abdomen
  const remo = function(y){ return { p: [48, 50], t: 62, cab: -40, a: [56, 82.5], f: [64, 83.5], w: [63, y], c: 1 }; };   // el codo sube hacia atrás, pegado al cuerpo
  FG['remo en multipower'] = { seq: [[remo(70), 0.8], [remo(50), 1], [remo(50), 0.3]], vuelta: 1.1, fondo: FG_PISO + fgRail(63), delante: fgEnManos('barra') };
  // press de hombro en multipower: sentado, la barra baja delante de la cara hasta la barbilla
  const asiento = '<rect x="38" y="56" width="26" height="4" rx="2" class="il-mueble"/><line x1="40" y1="24" x2="40" y2="58" class="il-mueble"/><line x1="51" y1="60" x2="51" y2="84" class="il-fondo"/>';
  const hom = function(y){ return { p: [46, 54], t: -4, cab: 0, a: [66, 82.5], f: [73, 83.5], w: [54, y], c: 1 }; };   // codos delante y debajo de la barra
  FG['press de hombro en multipower'] = { seq: [[hom(31), 0.8], [hom(4), 1.2], [hom(4), 0.2]], vuelta: 1.1, fondo: FG_PISO + asiento + fgRail(54), delante: fgEnManos('barra') };
  // búlgara en multipower: barra en el trapecio y en el raíl; el pie de atrás sobre el banco
  const bulg = function(arriba){
    return { p: [58, arriba ? 47 : 64], t: arriba ? 4 : 12, cab: -4, a: [65, 82.5], f: [73, 83.5], a2: [33, 59.5], f2: [26, 58.5], r2: -1, w: fgTrapecio, c: -1, al: { en: fgTrapecio, x: 58 } };
  };
  FG['sentadilla bulgara en multipower'] = { segundo: true, seq: [[bulg(true), 1], [bulg(false), 1.3], [bulg(false), 0.2]], vuelta: 1.1, fondo: FG_PISO + fgBanco(16, 40, 61) + fgRail(58), delante: fgEnManos('barra', fgTrapecio) };
  // peso muerto rumano en multipower: bisagra de cadera, la barra baja en vertical pegada a las piernas
  const rum = function(baja){
    // rodillas siempre algo flexionadas (la cadera nunca llega a estirar del todo la pierna)
    return baja ? { p: [43, 49], t: 72, cab: -45, a: [55, 82.5], f: [63, 83.5], w: [61, 68], c: -1 } : { p: [55, 47.5], t: 5, cab: 0, a: [55, 82.5], f: [63, 83.5], w: [61, 47], c: -1 };
  };
  FG['peso muerto rumano en multipower'] = { seq: [[rum(false), 0.8], [rum(true), 1.4], [rum(true), 0.2]], vuelta: 1.2, fondo: FG_PISO + fgRail(61), delante: fgEnManos('barra') };
})();

/* ---------- enganche con la app ---------- */
function fgClave(nombre){ return norm(nombre || '').toLowerCase().replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i').replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/\s+/g, ' ').trim(); }
if (typeof ilPatron === 'function') ilPatron = (function(orig){
  return function(nombre){ const k = fgClave(nombre); return FG[k] ? 'v4|' + k : orig.apply(this, arguments); };
})(ilPatron);
if (typeof ilSvg === 'function') ilSvg = (function(orig){
  return function(patron, material, quieto){
    if (typeof patron === 'string' && patron.indexOf('v4|') === 0) { const S = FG[patron.slice(3)]; if (S) return fgSvg(S, quieto); }
    return orig.apply(this, arguments);
  };
})(ilSvg);
