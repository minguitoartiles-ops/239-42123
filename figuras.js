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
const FG_RECORTES = [];   // para las pruebas: extremidades que no llegan a su sitio
function fgIK(r, t, l1, l2, lado){
  let dx = t[0] - r[0], dy = t[1] - r[1], d = Math.hypot(dx, dy) || 0.001;
  const max = l1 + l2 - 0.05, min = Math.abs(l1 - l2) + 0.05;
  if (d > max + 0.6 || d < min - 0.6) FG_RECORTES.push(Math.round(d - (d > max ? max : min)));
  if (d > max) { t = [r[0] + dx / d * max, r[1] + dy / d * max]; dx = t[0] - r[0]; dy = t[1] - r[1]; d = max; }
  if (d < min) { t = [r[0] + dx / d * min, r[1] + dy / d * min]; dx = t[0] - r[0]; dy = t[1] - r[1]; d = min; }
  const a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const base = Math.atan2(dy, dx), ang = base + (lado || 1) * a;
  return { j: [r[0] + l1 * Math.cos(ang), r[1] + l1 * Math.sin(ang)], t: t };
}
/* de las dos maneras de doblar, la que deja el codo más abajo (de frente: los codos caen hacia el suelo o hacia fuera) */
function fgIKAbajo(r, t, l1, l2, fuera){   // fuera: -1 brazo izquierdo, 1 derecho (desempata hacia fuera)
  const n = FG_RECORTES.length, a = fgIK(r, t, l1, l2, 1), b = fgIK(r, t, l1, l2, -1); FG_RECORTES.length = Math.min(FG_RECORTES.length, n + 1);
  const nota = function(e){ return e.j[1] + 0.6 * (fuera || 0) * (e.j[0] - r[0]); };
  return nota(a) >= nota(b) ? a : b;
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
    // 11/11 · codo dado a mano (en línea con la muñeca): el brazo se ve más corto o más largo según vaya hacia quien mira
    const ex = fgVal(S['e' + s] || (S['w' + s] ? null : S.e), P);   // el otro brazo copia el codo si copia la mano
    if (ex) { P['e' + s] = ex; P['w' + s] = w; return; }
    if (S.recto) { const d = Math.hypot(w[0] - P.n[0], w[1] - P.n[1]) || 1, u = [(w[0] - P.n[0]) / d, (w[1] - P.n[1]) / d]; P['e' + s] = [P.n[0] + u[0] * FG_L.brazo, P.n[1] + u[1] * FG_L.brazo]; P['w' + s] = [P.n[0] + u[0] * (FG_L.brazo + FG_L.antebrazo), P.n[1] + u[1] * (FG_L.brazo + FG_L.antebrazo)]; return; }
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
  P.ea = S.escAnte || 1;           // para colocar la mano a la medida del antebrazo en cada instante
  P.p = S.p;
  // escTronco < 1: el tronco se inclina hacia delante y, visto de frente, se ve más corto
  P.n = fgSum(P.p, fgDir(S.t || 0, FG_L.tronco * (S.escTronco || 1)));
  P.h = fgSum(P.n, fgDir((S.t || 0) + (S.cab || 0), FG_L.cuello));
  const perp = fgDir((S.t || 0) + 90, 1);
  P.sL = [P.n[0] - perp[0] * hs, P.n[1] - perp[1] * hs + 1.5]; P.sR = [P.n[0] + perp[0] * hs, P.n[1] + perp[1] * hs + 1.5];
  if (S.enc) { P.sL[1] -= S.enc; P.sR[1] -= S.enc; }   // 11/11 · encogimientos: los hombros suben hacia las orejas
  P.pL = [P.p[0] - perp[0] * hc, P.p[1] - perp[1] * hc]; P.pR = [P.p[0] + perp[0] * hc, P.p[1] + perp[1] * hc];
  ['L', 'R'].forEach(function(s){
    const sig = s === 'L' ? -1 : 1;
    const a = fgVal(S['a' + s], P);
    // sentado de frente: el muslo apunta hacia quien mira (se ve corto); la rodilla se da a mano
    const k = S['k' + s] ? { j: S['k' + s], t: a } : fgIK(P['p' + s], a, FG_L.muslo, FG_L.canilla, S['r' + s] != null ? S['r' + s] : (s === 'L' ? 1 : -1));
    P['k' + s] = k.j; P['a' + s] = k.t;
    const f = fgVal(S['f' + s], P);
    P['f' + s] = f || fgSum(k.t, [sig * 4.5, 1]);
    const br = S['brazo' + s];
    if (br) { P['e' + s] = fgSum(P['s' + s], fgDir(br[0], FG_L.brazo * (br[3] != null ? br[3] : 1))); P['w' + s] = fgSum(P['e' + s], fgDir(br[1], FG_L.antebrazo * (br[2] != null ? br[2] : 1))); return; }
    const w = fgVal(S['w' + s], P);
    const ex = fgVal(S['e' + s], P);
    if (w && ex) { P['e' + s] = ex; P['w' + s] = w; return; }   // 11/11 · codo dado a mano
    if (w) { const e = S.codos ? fgIKAbajo(P['s' + s], w, FG_L.brazo * (S.escBrazo || 1), FG_L.antebrazo * (S.escAnte || 1), S.codos === 'pegados' ? -sig : sig) : fgIK(P['s' + s], w, FG_L.brazo * (S.escBrazo || 1), FG_L.antebrazo * (S.escAnte || 1), S['c' + s] != null ? S['c' + s] : (s === 'L' ? 1 : -1)); P['e' + s] = e.j; P['w' + s] = e.t; }
  });
  return P;
}
const FG_HUESOS_LADO = [['p', 'n'], ['p', 'k2'], ['k2', 'a2'], ['a2', 'f2'], ['n', 'e2'], ['e2', 'w2'], ['p', 'k'], ['k', 'a'], ['a', 'f'], ['n', 'e'], ['e', 'w']];
const FG_HUESOS_FRENTE = [['p', 'n'], ['sL', 'sR'], ['pL', 'pR'], ['sL', 'eL'], ['eL', 'wL'], ['sR', 'eR'], ['eR', 'wR'], ['pL', 'kL'], ['kL', 'aL'], ['aL', 'fL'], ['pR', 'kR'], ['kR', 'aR'], ['aR', 'fR']];

/* primitivas de un instante: [tipo, clase, ...números] — mismo orden en todos los instantes */
function fgPrims(F, S){
  const out0 = [];
  if (S.dibujo) { S.dibujo(F, function(a, b, cls){ out0.push(['l', cls || 'il-cuerpo', a[0], a[1], b[0], b[1]]); }, function(c, r, cls){ out0.push(['c', cls, c[0], c[1], r]); }); return out0; }
  const out = [], P = S.vista === 'frente' ? fgFrente(F) : fgLadoAl(F);
  const ln = function(a, b, cls){ out.push(['l', cls || 'il-cuerpo', a[0], a[1], b[0], b[1]]); };
  const ci = function(c, r, cls){ out.push(['c', cls, c[0], c[1], r]); };
  if (S.atras) S.atras(P, ln, ci, F);                             // material detrás del cuerpo
  const huesos = S.vista === 'frente' ? FG_HUESOS_FRENTE : FG_HUESOS_LADO;
  const lejos = S.lejos || (S.segundo ? ['k2', 'a2', 'f2', 'e2', 'w2'] : []);   // la pierna o el brazo del otro lado, más claro
  huesos.forEach(function(hb){ if (P[hb[0]] && P[hb[1]]) ln(P[hb[0]], P[hb[1]], lejos.indexOf(hb[1]) > -1 ? 'il-cuerpo il-lejos' : 'il-cuerpo'); });
  ci(P.h, 5.6, 'il-cabeza');
  if (S.delante) S.delante(P, ln, ci, F);                         // material en las manos
  return out;
}
/* ---------- línea de tiempo: [postura, segundos para llegar a ella] ---------- */
/* cada postura con sus pies completos: si una no dice hacia dónde apunta el pie, se pone el de por defecto
   (antes se copiaba el de la postura siguiente y el pie salía torcido) */
function fgCompletar(F, frente){
  const G = Object.assign({}, F);
  if (frente) {
    if (!G.fL && Array.isArray(G.aL)) G.fL = [G.aL[0] - 4.5, G.aL[1] + 1];
    if (!G.fR && Array.isArray(G.aR)) G.fR = [G.aR[0] + 4.5, G.aR[1] + 1];
  } else {
    if (!G.f && Array.isArray(G.a)) G.f = [G.a[0] + FG_L.pie, G.a[1] + 1];
    if (!G.f2 && Array.isArray(G.a2)) G.f2 = [G.a2[0] + FG_L.pie, G.a2[1] + 1];
  }
  return G;
}
function fgCuadros(S){
  const seq = S.seq.map(function(x){ return [fgCompletar(x[0], S.vista === 'frente'), x[1]]; }), cuadros = [], tiempos = [];
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
  const prims = (quieto ? [fgCompletar(S.seq[S.quieto || 0][0], S.vista === 'frente')] : tl.cuadros).map(function(F){ return fgPrims(F, S); });
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
  // zoom < 1: figuras que no caben (subir a un cajón alto); el suelo se queda en su sitio
  if (S.zoom) h = '<g transform="translate(' + fgNum(60 * (1 - S.zoom)) + ' ' + fgNum(FG_SUELO * (1 - S.zoom)) + ') scale(' + S.zoom + ')">' + h + '</g>';
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
  const manos = { wL: function(P){ return [P.n[0] - 3, P.n[1] + 15]; }, wR: function(P){ return [P.n[0] + 3, P.n[1] + 15]; } };
  const base = Object.assign({ vista: 'frente', aL: [38, 82], aR: [82, 82] }, manos);
  const centro = Object.assign({}, base, { p: [60, 49.5] });   // de pie: piernas estiradas y bien abiertas
  const izq = Object.assign({}, base, { p: [42, 70], t: -4, rR: -1, fR: [85, 76.5] });   // abajo: profunda sobre la pierna flexionada; la otra estirada, punta arriba
  const der = Object.assign({}, base, { p: [78, 70], t: 4, rL: 1, fL: [35, 76.5] });
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
/* sumo (de frente): pies muy abiertos con las puntas hacia fuera; los brazos cuelgan estirados */
(function(){
  const pies = { aL: [40, 82], aR: [80, 82], fL: [35, 84], fR: [85, 84], rL: 1, rR: -1 };
  const cuelga = { wL: function(P){ return [P.sL[0] + 3, P.sL[1] + 24.6]; }, wR: function(P){ return [P.sR[0] - 3, P.sR[1] + 24.6]; }, cL: -1, cR: 1 };
  const arriba = Object.assign({ vista: 'frente', p: [60, 49] }, pies, cuelga);
  const abajo = Object.assign({ vista: 'frente', p: [60, 63] }, pies, cuelga);
  FG['sentadilla sumo con mancuerna'] = { vista: 'frente', seq: [[arriba, 1], [abajo, 1.3], [abajo, 0.2]], vuelta: 1.1, fondo: FG_PISO,
    delante: function(P, ln, ci){ const c = fgLerp(P.wL, P.wR, 0.5); ln([c[0], c[1] - 1], [c[0], c[1] + 9], 'il-barra'); ci([c[0], c[1] + 10], 3.6, 'il-peso'); } };
  // peso muerto sumo: arranca con los discos apoyados en el suelo; abajo el tronco va inclinado (de frente se ve más corto)
  const agarre = { wL: function(P){ return [P.sL[0] + 1, P.sL[1] + 24.6]; }, wR: function(P){ return [P.sR[0] - 1, P.sR[1] + 24.6]; }, cL: -1, cR: 1 };
  const pmA = Object.assign({ vista: 'frente', p: [60, 49], escTronco: 1 }, pies, agarre);
  const pmB = Object.assign({ vista: 'frente', p: [60, 68], escTronco: 0.7, cab: 0 }, pies, agarre);
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
  const remo = function(y){ return { p: [48, 50], t: 62, cab: -40, a: [56, 82.5], f: [64, 83.5], w: [63, y], c: 1 }; };   // el codo sube hacia atrás, pegado al cuerpo   // el codo sube hacia atrás, pegado al cuerpo
  FG['remo en multipower'] = { seq: [[remo(62.5), 0.8], [remo(50), 1], [remo(50), 0.3]], vuelta: 1.1, fondo: FG_PISO + fgRail(63), delante: fgEnManos('barra') };
  // press de hombro en multipower: sentado, la barra baja delante de la cara hasta la barbilla
  const asiento = '<rect x="38" y="56" width="26" height="4" rx="2" class="il-mueble"/><line x1="40" y1="24" x2="40" y2="58" class="il-mueble"/><line x1="51" y1="60" x2="51" y2="84" class="il-fondo"/>';
  const hom = function(y){ return { p: [46, 54], t: -4, cab: 0, a: [66, 82.5], f: [73, 83.5], w: [50, y], e: [50, y + 12.5], c: 1 }; };   // 11/11 (nota de Domingo): el codo, siempre debajo de la muñeca   // la barra baja hasta la clavícula   // codos delante y debajo de la barra
  FG['press de hombro en multipower'] = { seq: [[hom(31), 0.8], [hom(6.5), 1.2], [hom(6.5), 0.2]], vuelta: 1.1, fondo: FG_PISO + asiento + fgRail(50), delante: fgEnManos('barra') };
  // búlgara en multipower: barra en el trapecio y en el raíl; el pie de atrás sobre el banco
  const bulg = function(arriba){
    return { p: [58, arriba ? 47 : 64], t: arriba ? 4 : 12, cab: -4, a: [65, 82.5], f: [73, 83.5], a2: [33, 59.5], f2: [26, 58.5], r2: -1, w: fgTrapecio, c: -1, al: { en: fgTrapecio, x: 58 } };
  };
  FG['sentadilla bulgara en multipower'] = { segundo: true, seq: [[bulg(true), 1], [bulg(false), 1.3], [bulg(false), 0.2]], vuelta: 1.1, fondo: FG_PISO + fgBanco(16, 40, 61) + fgRail(58), delante: fgEnManos('barra', fgTrapecio) };
  // peso muerto rumano en multipower: bisagra de cadera, la barra baja en vertical pegada a las piernas
  // brazos siempre estirados, colgando bajo los hombros; la cadera se coloca para que la barra vaya por el raíl
  const rum = function(baja){
    return Object.assign(baja ? { p: [43, 51.5], t: 70, cab: -45 } : { p: [56, 49], t: 5, cab: 0 },
      { a: [55, 82.5], f: [63, 83.5], recto: true, w: function(P){ return [P.n[0], P.n[1] + 40]; }, al: { en: function(P){ return P.w; }, x: 61 } });
  };
  FG['peso muerto rumano en multipower'] = { seq: [[rum(false), 0.8], [rum(true), 1.4], [rum(true), 0.2]], vuelta: 1.2, fondo: FG_PISO + fgRail(61), delante: fgEnManos('barra') };
})();

/* =========================================================
   Tanda 2 · zancadas y step up: el pie se levanta, avanza y se apoya (antes se deslizaba)
   pierna cercana (a, k, f) = la que da el paso; la otra, más clara
   ========================================================= */
const FG_BRAZOS_CAEN = [182, 180];          // brazos estirados a los lados (con mancuernas)
function fgPose(o){ return Object.assign({ t: 2, cab: 0, brazo: FG_BRAZOS_CAEN }, o); }
(function(){
  const conMancuernas = function(fig){ return Object.assign({ segundo: true, fondo: FG_PISO, delante: fgEnManos('mancuerna') }, fig); };
  // zancada hacia delante: de pie → levanta el pie → lo apoya delante → baja (rodilla de atrás cerca del suelo) → vuelve
  const de0 = fgPose({ p: [46, 46.5], a: [46, 82.5], f: [53, 83.5], a2: [46, 82.5], f2: [53, 83.5] });
  const de1 = fgPose({ p: [49, 46.5], a: [58, 70.5], f: [64, 72], a2: [46, 82.5], f2: [53, 83.5] });
  const de2 = fgPose({ p: [55, 50], a: [69, 82.5], f: [76, 83.5], a2: [46, 81], f2: [52, 84] });
  const de3 = fgPose({ p: [57, 65], t: 4, a: [70, 82.5], f: [77, 83.5], a2: [44, 80.5], f2: [50, 84] });
  const zancada = { seq: [[de0, 0.5], [de1, 0.45], [de2, 0.45], [de3, 0.9], [de3, 0.2], [de2, 0.8], [de1, 0.45]], vuelta: 0.45 };
  FG['zancadas'] = conMancuernas(zancada);
  FG['zancadas con mancuernas'] = conMancuernas(zancada);
  // zancada inversa: el pie de delante no se mueve en ningún momento (pierna oscura); el otro se levanta y va atrás (más clara)
  const fijo = { a: [62, 82.5], f: [69, 83.5], r: -1 };
  const in0 = fgPose(Object.assign({ p: [62, 46.5], a2: [62, 82.5], f2: [69, 83.5] }, fijo));
  const in1 = fgPose(Object.assign({ p: [60, 47], a2: [50, 75], f2: [46, 79], r2: -1 }, fijo));
  const in2 = fgPose(Object.assign({ p: [56, 51], a2: [38, 81], f2: [44, 84], r2: -1 }, fijo));
  const in3 = fgPose(Object.assign({ p: [52, 65], t: 4, a2: [36, 80.5], f2: [42, 84], r2: -1 }, fijo));
  FG['zancada inversa'] = { segundo: true, seq: [[in0, 0.5], [in1, 0.45], [in2, 0.45], [in3, 0.9], [in3, 0.2], [in2, 0.8], [in1, 0.45]], vuelta: 0.45, fondo: FG_PISO, delante: fgEnManos('mancuerna') };
  // zancadas caminando: zancada con una pierna, sube y la otra pasa delante a la siguiente zancada (avanza)
  const c0 = fgPose({ p: [26, 46.5], a: [26, 82.5], f: [33, 83.5], a2: [26, 82.5], f2: [33, 83.5] });
  const c1 = fgPose({ p: [30, 46.5], a: [38, 70.5], f: [44, 72], a2: [26, 82.5], f2: [33, 83.5] });
  const c2 = fgPose({ p: [37, 65], t: 4, a: [49, 82.5], f: [56, 83.5], a2: [24, 80.5], f2: [30, 84] });
  const c3 = fgPose({ p: [49, 46.5], a: [49, 82.5], f: [56, 83.5], a2: [58, 70.5], f2: [64, 72] });
  const c4 = fgPose({ p: [60, 65], t: 4, a: [47, 80.5], f: [53, 84], a2: [72, 82.5], f2: [79, 83.5] });
  const c5 = fgPose({ p: [72, 46.5], a: [72, 82.5], f: [79, 83.5], a2: [72, 82.5], f2: [79, 83.5] });
  FG['zancadas caminando'] = conMancuernas({ seq: [[c0, 0.4], [c1, 0.45], [c2, 0.8], [c2, 0.15], [c3, 0.9], [c4, 0.9], [c4, 0.15], [c5, 0.9], [c5, 0.4]], vuelta: 0.01 });
  // zancadas en multipower: los pies no se mueven (zancada estática); la barra sube y baja por el raíl
  const zm = function(y){ return { p: [54, y], t: 3, cab: 0, a: [67, 82.5], f: [74, 83.5], a2: [40, 81], f2: [46, 84], w: fgTrapecio, c: -1, al: { en: fgTrapecio, x: 55 } }; };
  FG['zancadas en multipower'] = { segundo: true, seq: [[zm(48), 1], [zm(65), 1.2], [zm(65), 0.2]], vuelta: 1.1, fondo: FG_PISO + fgRail(55), delante: fgEnManos('barra', fgTrapecio) };
  // zancada en déficit: el pie de delante sobre un disco o un step; más recorrido
  const df = function(y){ return fgPose({ p: [55, y], t: 3, a: [68, 77.5], f: [75, 78.5], a2: [40, 81], f2: [46, 84] }); };
  FG['zancada en deficit'] = { segundo: true, seq: [[df(48), 1], [df(68), 1.3], [df(68), 0.2]], vuelta: 1.1, fondo: FG_PISO + '<rect x="62" y="79" width="20" height="5" rx="1.5" class="il-mueble"/>', delante: fgEnManos('mancuerna') };
})();
/* step up al cajón alto (más extensión de cadera): un pie al cajón, empuja, la otra pierna sube con la rodilla
   delante y se apoya junto a la primera; baja al revés */
(function(){
  const caja = '<rect x="62" y="56" width="40" height="28" rx="2" class="il-mueble"/>';
  const s0 = fgPose({ p: [44, 46.5], a: [44, 82.5], f: [51, 83.5], a2: [44, 82.5], f2: [51, 83.5] });
  const s1 = fgPose({ p: [48, 47], t: 8, a: [69, 54.5], f: [76, 55.5], a2: [44, 82.5], f2: [51, 83.5] });
  const s2 = fgPose({ p: [55, 45], t: 14, a: [70, 54.5], f: [77, 55.5], a2: [48, 80.5], f2: [54, 84] });
  const s2b = fgPose({ p: [66, 30], t: 6, a: [71, 54.5], f: [78, 55.5], a2: [63, 47], f2: [69, 49], r2: -1 });
  const s3 = fgPose({ p: [71, 18.5], a: [71, 54.5], f: [78, 55.5], a2: [72, 54.5], f2: [79, 55.5] });
  FG['step up al cajon'] = { segundo: true, zoom: 0.78, seq: [[s0, 0.4], [s1, 0.55], [s2, 0.4], [s2b, 0.4], [s3, 0.35], [s3, 0.35], [s2b, 0.4], [s2, 0.4], [s1, 0.45]], vuelta: 0.5,
    fondo: FG_PISO + caja, delante: fgEnManos('mancuerna') };
  // step up lateral (de frente): el cajón a la derecha; el pie derecho sube al cajón, empuja y el izquierdo se le une
  const cajaL = '<rect x="64" y="60" width="44" height="24" rx="2" class="il-mueble"/>';
  const manos = { wL: function(P){ return [P.sL[0] + 1, P.sL[1] + 24.6]; }, wR: function(P){ return [P.sR[0] - 1, P.sR[1] + 24.6]; }, cL: -1, cR: 1 };
  const t0 = Object.assign({ vista: 'frente', p: [48, 46.5], aL: [43, 82], aR: [53, 82] }, manos);
  const t1 = Object.assign({ vista: 'frente', p: [52, 47.5], aL: [43, 82], aR: [73, 58.5], fR: [77, 59.5], rR: -1 }, manos);
  const t05 = Object.assign({ vista: 'frente', p: [49, 47], aL: [43, 82], aR: [62, 66], fR: [66, 67], rR: -1 }, manos);   // el pie sube antes de ir al cajón (no se arrastra)
  const t2 = Object.assign({ vista: 'frente', p: [62, 36], aL: [57, 68], fL: [54, 70], rL: 1, aR: [74, 58.5], fR: [78, 59.5], rR: -1 }, manos);
  const t3 = Object.assign({ vista: 'frente', p: [72, 22], aL: [67, 58.5], fL: [63, 59.5], aR: [77, 58.5], fR: [81, 59.5] }, manos);
  FG['step up lateral'] = { vista: 'frente', zoom: 0.8, seq: [[t0, 0.4], [t05, 0.3], [t1, 0.3], [t2, 0.45], [t3, 0.45], [t3, 0.35], [t2, 0.5], [t1, 0.5], [t05, 0.3]], vuelta: 0.3, fondo: FG_PISO + cajaL,
    delante: function(P, ln, ci){ ci(P.wL, 3.6, 'il-peso'); ci(P.wR, 3.6, 'il-peso'); } };
})();

/* =========================================================
   Tanda 3 · brazos: el codo queda fijo pegado al cuerpo y solo se mueve el antebrazo
   ========================================================= */
/* palma: marca corta en la muñeca hacia donde mira la palma (1: hacia delante/arriba, supino · -1: hacia atrás/abajo, prono) */
function fgPalma(ln, P, signo, e, w){
  e = e || P.e; w = w || P.w;
  const d = Math.hypot(w[0] - e[0], w[1] - e[1]) || 1, dx = (w[0] - e[0]) / d, dy = (w[1] - e[1]) / d;
  const nx = signo > 0 ? dy : -dy, ny = signo > 0 ? -dx : dx;
  ln([w[0] + nx * 1.2, w[1] + ny * 1.2], [w[0] + nx * 4.2 + dx * 1, w[1] + ny * 4.2 + dy * 1], 'il-palma');
}
/* columna de polea con su rueda (x, y de la rueda) */
function fgColumna(x, y){ return '<rect x="' + (x + 3) + '" y="2" width="7" height="82" rx="2" class="il-mueble"/><circle cx="' + x + '" cy="' + y + '" r="3.2" class="il-mueble"/>'; }
function fgCable(desde, ln, P, m){ ln(desde, m || P.w, 'il-cable'); }
/* mancuerna vista de lado con agarre neutro (martillo): barrita perpendicular al antebrazo con sus discos */
function fgMancuernaMartillo(ln, ci, P, e, w){
  e = e || P.e; w = w || P.w;
  const d = Math.hypot(w[0] - e[0], w[1] - e[1]) || 1, dx = (w[0] - e[0]) / d, dy = (w[1] - e[1]) / d, nx = dy, ny = -dx;
  const a = [w[0] + nx * 4.5, w[1] + ny * 4.5], b = [w[0] - nx * 4.5, w[1] - ny * 4.5];
  ln(a, b, 'il-barra'); ci(a, 2.4, 'il-peso'); ci(b, 2.4, 'il-peso');
}
(function(){
  const pie = { p: [56, 46.5], t: 2, cab: 0, a: [56, 82.5], f: [63, 83.5] };
  const abajo = Object.assign({}, pie, { brazo: [181, 181] }), arriba = Object.assign({}, pie, { brazo: [178, 32] });
  const curl = function(material, extra){
    return Object.assign({ seq: [[abajo, 0.3], [arriba, 1.1], [arriba, 0.25]], vuelta: 1.3, fondo: FG_PISO,
      delante: material === 'martillo' ? function(P, ln, ci){ fgMancuernaMartillo(ln, ci, P); } : fgEnManos(material) }, extra || {});
  };
  FG['curl de biceps'] = curl('barra');
  FG['curl con barra z'] = curl('barra');
  FG['curl con mancuernas'] = curl('mancuerna');
  // curl martillo (referencia de Domingo, 8/11): de frente, con las dos mancuernas a la vez. Los codos quietos pegados al costado;
  // el antebrazo sube hacia quien mira (de frente se ve corto) hasta llevar la mancuerna al hombro. Agarre neutro: de frente
  // se ve el disco de delante de cada mancuerna
  const cmA = { vista: 'frente', p: [60, 46.5], aL: [54, 82], aR: [66, 82], brazoL: [182, 0, -1], brazoR: [178, 0, -1] };
  const cmB = Object.assign({}, cmA, { brazoL: [182, 6, 0.55], brazoR: [178, -6, 0.55] });
  FG['curl martillo'] = { vista: 'frente', seq: [[cmA, 0.3], [cmB, 1.1], [cmB, 0.25]], vuelta: 1.3, fondo: fgAgarre('neutro') + FG_PISO,
    delante: function(P, ln, ci){ ci(P.wL, 4.2, 'il-disco'); ci(P.wL, 1.4, 'il-peso'); ci(P.wR, 4.2, 'il-disco'); ci(P.wR, 1.4, 'il-peso'); } };
  FG['curl con kettlebell'] = curl('kettlebell');
  // Zottman: sube con la palma hacia arriba (supino), gira arriba y baja con la palma hacia abajo (prono)
  const zA = Object.assign({}, abajo, { palma: 1 }), zB = Object.assign({}, arriba, { palma: 1 }), zC = Object.assign({}, arriba, { palma: -1 }), zD = Object.assign({}, abajo, { palma: -1 });
  FG['curl zottman'] = { seq: [[zA, 0.3], [zB, 1.1], [zC, 0.45], [zD, 1.4]], vuelta: 0.45, fondo: fgAgarre(['supino', 'prono'], 86, 54) + FG_PISO,
    delante: function(P, ln, ci, F){ ci(P.w, 3.8, 'il-peso'); fgPalma(ln, P, F.palma); } };
  // curl en polea: de pie frente a la polea baja (columna con su rueda abajo); el cable sube hasta la mano
  const rueda = [86, 80];
  FG['curl en polea'] = curl('polea', { fondo: FG_PISO + fgColumna(86, 80), atras: function(P, ln){ fgCable(rueda, ln, P); }, delante: function(P, ln, ci){ ln([P.w[0], P.w[1] - 3], [P.w[0], P.w[1] + 3], 'il-barra'); } });
  FG['curl en polea a una mano'] = curl('polea', { segundo: true, fondo: FG_PISO + fgColumna(86, 80), atras: function(P, ln){ fgCable(rueda, ln, P); },
    delante: function(P, ln, ci){ ci(P.w, 2.6, 'il-peso'); } });
  FG['curl en polea a una mano'].seq = FG['curl en polea a una mano'].seq.map(function(x){ return [Object.assign({}, x[0], { brazo2: [185, 182] }), x[1]]; });
  // concentrado: sentado, tronco inclinado, el codo apoyado en la cara interna del muslo; solo sube el antebrazo
  const banco = '<rect x="22" y="58" width="30" height="4" rx="2" class="il-mueble"/><line x1="28" y1="62" x2="28" y2="84" class="il-fondo"/><line x1="46" y1="62" x2="46" y2="84" class="il-fondo"/>';
  const conc = function(fore){ return { p: [42, 56], t: 40, cab: 25, a: [66, 82.5], f: [73, 83.5], brazo: [176, fore] }; };
  FG['curl concentrado'] = { seq: [[conc(178), 0.3], [conc(18), 1.1], [conc(18), 0.25]], vuelta: 1.3, fondo: FG_PISO + banco, delante: fgEnManos('mancuerna') };
  // predicador: sentado, el brazo apoyado en el pad inclinado; el antebrazo baja hasta casi estirar sin pasar del pad
  const pred = function(fore){ return { p: [40, 57], t: 12, cab: 10, a: [62, 82.5], f: [69, 83.5], brazo: [140, fore] }; };
  const padPred = function(P0){ return ''; };
  (function(){
    const P0 = fgLado(pred(140));
    const e = P0.e, n0 = P0.n;
    const d = [e[0] - n0[0], e[1] - n0[1]], L = Math.hypot(d[0], d[1]), u = [d[0] / L, d[1] / L];
    const nx = u[1], ny = -u[0];         // normal hacia abajo del brazo
    const a = [n0[0] + u[0] * 4 - nx * 3.2, n0[1] + u[1] * 4 - ny * 3.2], b = [e[0] + u[0] * 3 - nx * 3.2, e[1] + u[1] * 3 - ny * 3.2];
    const pad = '<line x1="' + fgNum(a[0]) + '" y1="' + fgNum(a[1]) + '" x2="' + fgNum(b[0]) + '" y2="' + fgNum(b[1]) + '" class="il-mueble"/><line x1="' + fgNum((a[0] + b[0]) / 2) + '" y1="' + fgNum((a[1] + b[1]) / 2 + 2) + '" x2="' + fgNum((a[0] + b[0]) / 2) + '" y2="84" class="il-fondo"/>';
    const asiento = '<rect x="26" y="56" width="22" height="4" rx="2" class="il-mueble"/><line x1="37" y1="60" x2="37" y2="84" class="il-fondo"/>';
    FG['curl predicador con barra'] = { seq: [[pred(150), 0.3], [pred(20), 1.1], [pred(20), 0.25]], vuelta: 1.3, fondo: FG_PISO + asiento + pad, delante: fgEnManos('barra') };
    // en máquina: la palanca gira en el codo; el agarre va al final de la palanca
    FG['curl predicador en maquina'] = { seq: [[pred(150), 0.3], [pred(20), 1.1], [pred(20), 0.25]], vuelta: 1.3, fondo: FG_PISO + asiento + pad + '<circle cx="' + fgNum(e[0]) + '" cy="' + fgNum(e[1]) + '" r="2.4" class="il-mueble"/>',
      delante: function(P, ln, ci){ ln(P.e, P.w, 'il-mueble il-sin'); ci(P.w, 2.4, 'il-peso'); } };
  })();
  // martillo cruzado (de frente): el brazo quieto pegado al costado; el antebrazo sube cruzando hacia el hombro contrario
  const mcA = { vista: 'frente', p: [60, 46.5], aL: [55, 82], aR: [65, 82], brazoL: [181, 180, 1], brazoR: [179, 180, 1] };
  const mcB = Object.assign({}, mcA, { brazoR: [182, 322, 1] });   // de 180° a 322°: cruza por delante del cuerpo
  FG['curl martillo cruzado'] = { vista: 'frente', seq: [[mcA, 0.3], [mcB, 1.1], [mcB, 0.25]], vuelta: 1.3, fondo: fgAgarre('neutro') + FG_PISO,
    // 11/11 (nota de Domingo: «la mancuerna está mal representada»): con agarre neutro el asa va de delante a atrás todo el recorrido,
    // así que de frente se ve el disco de cada mancuerna, como en el curl martillo
    delante: function(P, ln, ci){ ci(P.wL, 4.2, 'il-disco'); ci(P.wL, 1.4, 'il-peso'); ci(P.wR, 4.2, 'il-disco'); ci(P.wR, 1.4, 'il-peso'); } };

  /* --- tríceps --- */
  // extensión con cuerda (de frente): el cable baja de la polea alta a un nudo y la cuerda se abre en dos hacia las manos
  // arriba: codos pegados a los costados y el antebrazo hacia delante (de frente se ve corto); abajo: brazos estirados y la cuerda abierta
  // arriba: codos pegados y flexionados del todo (las manos a la altura del pecho, el antebrazo hacia quien mira);
  // abajo: brazos estirados y la cuerda abierta
  const cuA = { vista: 'frente', p: [60, 46.5], aL: [55, 82], aR: [65, 82], brazoL: [181, 0, 0.5], brazoR: [179, 0, 0.5] };
  const cuB = Object.assign({}, cuA, { brazoL: [181, 8, -1], brazoR: [179, -8, -1] });   // el antebrazo baja «hacia quien mira», sin abrirse
  FG['extension en polea con cuerda'] = { vista: 'frente', seq: [[cuA, 0.3], [cuB, 0.9], [cuB, 0.25]], vuelta: 1.1, fondo: FG_PISO + '<circle cx="60" cy="4" r="3.2" class="il-mueble"/>',
    atras: function(P, ln){ const nudo = [(P.wL[0] + P.wR[0]) / 2, Math.min(P.wL[1], P.wR[1]) - 7]; ln([60, 4], nudo, 'il-cable'); ln(nudo, P.wL, 'il-cuerda-t'); ln(nudo, P.wR, 'il-cuerda-t'); } };
  // agarre inverso (de lado): codos pegados, palmas hacia arriba; polea alta delante
  const piePolea = { p: [44, 46.5], t: 6, cab: 0, a: [44, 82.5], f: [51, 83.5] };
  const invA = Object.assign({}, piePolea, { brazo: [182, 55], palma: 1 }), invB = Object.assign({}, piePolea, { brazo: [180, 176], palma: 1 });
  FG['extension en polea agarre inverso'] = { seq: [[invA, 0.3], [invB, 0.9], [invB, 0.25]], vuelta: 1.1, fondo: fgAgarre('supino') + FG_PISO + '<rect x="64" y="2" width="7" height="82" rx="2" class="il-mueble"/><line x1="64" y1="5" x2="53" y2="5" class="il-mueble"/><circle cx="52" cy="6" r="3.2" class="il-mueble"/>',
    atras: function(P, ln){ fgCable([52, 6], ln, P); }, delante: function(P, ln, ci, F){ ln([P.w[0] - 3, P.w[1]], [P.w[0] + 3, P.w[1]], 'il-barra'); fgPalma(ln, P, F.palma); } };
  // sobre la cabeza en polea: de espaldas a la polea baja; el cable sube por detrás hasta las manos tras la nuca;
  // los codos apuntan arriba y los antebrazos estiran en vertical
  const ohA = { p: [58, 46.5], t: 12, cab: -6, a: [64, 82.5], f: [71, 83.5], a2: [50, 82.5], f2: [57, 83.5], brazo: [4, 192] };
  const ohB = Object.assign({}, ohA, { brazo: [4, 364] });   // de 192° a 364°: el antebrazo pasa por detrás de la cabeza
  FG['extension sobre la cabeza en polea'] = { segundo: true, seq: [[ohA, 0.3], [ohB, 0.9], [ohB, 0.25]], vuelta: 1.1, fondo: FG_PISO + fgColumna(26, 80),
    atras: function(P, ln){ fgCable([26, 80], ln, P); }, delante: function(P, ln, ci){ ci(P.w, 2.6, 'il-peso'); } };
  // fondos en máquina: sentado, agarra las asas a los lados y empuja hacia abajo hasta estirar los brazos (codos hacia atrás)
  const asientoM = '<rect x="36" y="56" width="26" height="4" rx="2" class="il-mueble"/><line x1="38" y1="20" x2="38" y2="58" class="il-mueble"/><line x1="49" y1="60" x2="49" y2="84" class="il-fondo"/>';
  const fmA = { p: [45, 54], t: 24, cab: -6, a: [66, 82.5], f: [73, 83.5], w: [56, 42], c: 1 }, fmB = Object.assign({}, fmA, { w: [55, 57] });
  FG['fondos en maquina'] = { seq: [[fmA, 0.3], [fmB, 0.9], [fmB, 0.25]], vuelta: 1.1, fondo: FG_PISO + asientoM,
    delante: function(P, ln, ci){ ln([P.w[0] - 4, P.w[1]], [P.w[0] + 4, P.w[1]], 'il-barra'); ln([P.w[0] + 4, P.w[1]], [P.w[0] + 8, P.w[1] + 10], 'il-mueble il-sin'); } };
  // extensión de tríceps en máquina: sentado, los brazos apoyados en el pad de delante; el antebrazo empuja la palanca hasta estirar
  const etA = { p: [42, 54], t: 4, cab: 0, a: [64, 82.5], f: [71, 83.5], brazo: [120, 20] }, etB = Object.assign({}, etA, { brazo: [120, 118] });
  (function(){
    const P0 = fgLado(etA);
    const padT = '<line x1="' + fgNum(P0.n[0] + 3) + '" y1="' + fgNum(P0.n[1] + 7) + '" x2="' + fgNum(P0.e[0] + 2) + '" y2="' + fgNum(P0.e[1] + 4.5) + '" class="il-mueble"/><line x1="' + fgNum(P0.e[0]) + '" y1="' + fgNum(P0.e[1] + 6) + '" x2="' + fgNum(P0.e[0]) + '" y2="84" class="il-fondo"/>';
    FG['extension de triceps en maquina'] = { seq: [[etA, 0.3], [etB, 0.9], [etB, 0.25]], vuelta: 1.1, fondo: FG_PISO + '<rect x="30" y="56" width="24" height="4" rx="2" class="il-mueble"/><line x1="42" y1="60" x2="42" y2="84" class="il-fondo"/>' + padT + '<circle cx="' + fgNum(P0.e[0]) + '" cy="' + fgNum(P0.e[1]) + '" r="2.4" class="il-mueble"/>',
      delante: function(P, ln, ci){ ln(P.e, P.w, 'il-mueble il-sin'); ci(P.w, 2.4, 'il-peso'); } };
  })();
})();

/* =========================================================
   Tanda 4 · máquinas: cada una con su asiento, sus pads y sus palancas
   ========================================================= */
function fgPalanca(pivote, cls){ return function(P, ln, ci){ ln(pivote, P.w, 'il-mueble il-sin'); ci(P.w, 2.6, 'il-peso'); }; }
const FG_PIVOTE = function(x, y){ return '<circle cx="' + x + '" cy="' + y + '" r="2.6" class="il-mueble"/>'; };
function fgAsiento(xRes, xFin, y){ return '<rect x="' + xRes + '" y="' + y + '" width="' + (xFin - xRes) + '" height="4" rx="2" class="il-mueble"/><line x1="' + (xRes + 2) + '" y1="' + (y - 34) + '" x2="' + (xRes + 4) + '" y2="' + (y + 1) + '" class="il-mueble"/><line x1="' + ((xRes + xFin) / 2) + '" y1="' + (y + 4) + '" x2="' + ((xRes + xFin) / 2) + '" y2="84" class="il-fondo"/>'; }
/* vista desde arriba: cabeza, hombros y brazos que van desde los hombros hasta las manos (wL, wR) */
function fgArriba(extra){
  return function(F, ln, ci){
    if (extra && extra.antes) extra.antes(F, ln, ci);
    const sL = [50, 62], sR = [70, 62];
    ln(sL, sR);
    [['L', sL, 1], ['R', sR, -1]].forEach(function(x){ const e = fgIK(x[1], F['w' + x[0]], FG_L.brazo, FG_L.antebrazo, F['c' + x[0]] != null ? F['c' + x[0]] : x[2]); ln(x[1], e.j); ln(e.j, e.t); if (extra && extra.mano) extra.mano(e.t, ln, ci, x[0]); });
    ci([60, 63], 5.6, 'il-cabeza');
    if (extra && extra.despues) extra.despues(F, ln, ci);
  };
}
(function(){
  // press en máquina: sentado; las asas al final de las palancas, que giran desde arriba y detrás
  const res = fgAsiento(36, 60, 56) + FG_PIVOTE(58, 3);
  const pm = function(fw, esc){ return { p: [46, 56], t: -6, cab: 4, a: [68, 82.5], f: [75, 83.5], w: function(P){ return fgSum(P.n, [fw, 5]); }, c: 1, escBrazo: esc }; };
  FG['press en maquina'] = { seq: [[pm(8, 0.65), 0.6], [pm(16, 0.82), 1.1], [pm(24, 1), 1.1], [pm(24, 1), 0.5], [pm(16, 0.82), 1.5]], vuelta: 1.5,   // muy controlado: sube en 2,2 s, pausa, baja en 3 s y pausa abajo
    fondo: FG_PISO + res,   // controlado: sube en 1,6 s y baja en 2,2 s
 atras: function(P, ln){ ln([58, 3], P.w, 'il-mueble il-sin'); }, delante: function(P, ln, ci){ ci(P.w, 2.6, 'il-peso'); } };
  // press convergente (como la referencia de Domingo, 8/11): de frente y sentado. Las asas salen junto al pecho con los codos
  // abiertos y por debajo del hombro; al empujar, los brazos van hacia delante y arriba (de frente se ven cortos) y las manos
  // se acercan, sin llegar a juntarse. Las palancas giran desde arriba y detrás, con sus discos
  const sentF = { aL: [53, 82], aR: [67, 82], kL: [52, 64], kR: [68, 64] };
  const cvA = Object.assign({ vista: 'frente', p: [60, 60], brazoL: [226, 12, 0.35, 0.85], brazoR: [134, -12, 0.35, 0.85] }, sentF);
  const cvB = Object.assign({}, cvA, { brazoL: [336, -24, 0.55, 0.55], brazoR: [24, 24, 0.55, 0.55] });
  const pivL = [30, 20], pivR = [90, 20];
  const palanca = function(piv, w, ln, ci){ ln(piv, w, 'il-mueble il-sin'); const d = [piv[0] - w[0], piv[1] - w[1]]; const pl = [piv[0] + d[0] * 0.22, piv[1] + d[1] * 0.22]; ln(piv, pl, 'il-mueble il-sin'); ci(pl, 4.5, 'il-disco'); ln([w[0] - 3.5, w[1]], [w[0] + 3.5, w[1]], 'il-barra'); };
  FG['press convergente en maquina'] = { vista: 'frente', seq: [[cvA, 0.4], [cvB, 1.5], [cvB, 0.3]], vuelta: 1.9,
    fondo: FG_PISO + '<rect x="46" y="60" width="28" height="4" rx="2" class="il-mueble"/><line x1="60" y1="64" x2="60" y2="84" class="il-fondo"/><line x1="30" y1="20" x2="30" y2="84" class="il-mueble il-sin"/><line x1="90" y1="20" x2="90" y2="84" class="il-mueble il-sin"/>' + FG_PIVOTE(30, 20) + FG_PIVOTE(90, 20),
    delante: function(P, ln, ci){ palanca(pivL, P.wL, ln, ci); palanca(pivR, P.wR, ln, ci); } };
  // pájaros en máquina / deltoides posterior (referencia de Domingo, 8/11; nota del 8/11: «un plano más diagonal y respeta
  // la abducción y aducción a 90 grados de los brazos»): visto de espaldas y algo desde arriba, sentado de cara a la máquina.
  // Los brazos van SIEMPRE a la altura del hombro (90°) y se mueven en horizontal: estirados al frente (desde arriba se ven
  // cortos y hacia arriba) se abren por un arco plano hasta formar una T. Las palancas giran desde el centro, delante del pecho
  const sentF2 = { aL: [53, 82], aR: [67, 82], kL: [52, 64], kR: [68, 64] };
  const pjArco = function(g){   // g = apertura en el plano horizontal (0 al frente, 90 a los lados); la cámara, algo por encima
    const r = g * Math.PI / 180, x = Math.sin(r), y = Math.cos(r) * 0.36, an = Math.atan2(y, x) * 180 / Math.PI, L = Math.hypot(x, y);
    return Object.assign({ vista: 'frente', p: [60, 60], brazoL: [270 + an, 270 + an, L, L], brazoR: [90 - an, 90 - an, L, L] }, sentF2);
  };
  const pj0 = pjArco(4), pj30 = pjArco(30), pj60 = pjArco(60), pj90 = pjArco(90);
  FG['pajaros en maquina'] = { vista: 'frente', seq: [[pj0, 0.4], [pj30, 0.35], [pj60, 0.35], [pj90, 0.4], [pj90, 0.3], [pj60, 0.45], [pj30, 0.45]], vuelta: 0.45,
    fondo: FG_PISO + '<rect x="46" y="60" width="28" height="4" rx="2" class="il-mueble"/><line x1="60" y1="64" x2="60" y2="84" class="il-fondo"/>' + FG_PIVOTE(60, 22) + '<text x="60" y="89" text-anchor="middle" class="il-rotulo">de espaldas, desde arriba</text>',
    atras: function(P, ln){ ln([60, 22], P.wL, 'il-mueble il-sin'); ln([60, 22], P.wR, 'il-mueble il-sin'); },
    delante: function(P, ln){ ln([P.wL[0], P.wL[1] - 4], [P.wL[0], P.wL[1] + 4], 'il-barra'); ln([P.wR[0], P.wR[1] - 4], [P.wR[0], P.wR[1] + 4], 'il-barra'); } };
  // remo en máquina (sentado, sin pad de pecho) y remo con el pecho apoyado: los brazos van de estirados al frente a los codos
  // atrás pegados al cuerpo (el brazo pasa por abajo, sin saltos); las asas al final de la palanca que gira desde abajo y delante
  const rmq = function(k, t){ return { p: [44, 56], t: t, cab: 0, a: [66, 82.5], f: [73, 83.5], brazo: [fgLerp(t + 88, t + 236, k), fgLerp(t + 88, t + 92, k)] }; };
  // remo en máquina (como la referencia de Domingo, 8/11): sentado en el banco largo, los pies en la plataforma y las rodillas
  // algo flexionadas; tronco erguido. Brazos estirados al frente a la altura del pecho, el cable en horizontal hasta la polea
  // de la columna; tira hasta llevar el asa al abdomen con los codos muy atrás y el tronco apenas echado atrás
  const rs = function(k){ const t = fgLerp(4, -6, k); return { p: [34, 59], t: t, cab: fgLerp(-4, 4, k), a: [64, 67], f: [67, 60], r: -1, brazo: [fgLerp(t + 90, t + 215, k), fgLerp(t + 90, t + 84, k)] }; };
  FG['remo en maquina'] = { seq: [[rs(0), 0.4], [rs(1), 1.0], [rs(1), 0.4]], vuelta: 1.4,
    fondo: FG_PISO + '<rect x="18" y="61" width="58" height="4" rx="2" class="il-mueble"/><line x1="24" y1="65" x2="24" y2="84" class="il-fondo"/><line x1="70" y1="65" x2="70" y2="84" class="il-fondo"/>'
      + '<line x1="63" y1="71" x2="69" y2="56" class="il-placa"/><line x1="66" y1="64" x2="72" y2="65" class="il-mueble il-sin"/>' + '<rect x="98" y="2" width="8" height="82" rx="2" class="il-mueble"/><circle cx="97" cy="38" r="3.2" class="il-mueble"/>',
    atras: function(P, ln){ ln([97, 38], P.w, 'il-cable'); },
    delante: function(P, ln){ ln([P.w[0] + 1, P.w[1] - 3], [P.w[0] + 1, P.w[1] + 3], 'il-barra'); } };
  // remo con el pecho apoyado en máquina (referencia de Domingo, 8/11: «#28 es este»): de lado, sentado y erguido con el pecho
  // contra el pad vertical, los pies en el suelo. Empieza con los brazos estirados al frente a la altura del pecho y tira de las
  // asas (verticales) hasta llevarlas junto al pad, con los codos muy atrás. Las asas van en la palanca de carga con discos, que
  // gira abajo y delante: por eso las manos recorren un arco
  // nota de Domingo (8/11): «los codos deben estar alineados con la muñeca y el movimiento fluido». El antebrazo va siempre en
  // horizontal, en la línea del tirón (el codo a la altura de la muñeca); las asas recorren el arco plano de la palanca, que gira
  // en el suelo justo debajo. Al pasar junto al costado el brazo va algo abierto y, de lado, se ve más corto (escBrazo)
  const pivRa = [52, 85], R_RA = 42, hombroRa = [39.3, 34];
  const manoRa = function(k){ const dx = fgLerp(9.8, -9.7, k); return [pivRa[0] + dx, pivRa[1] - Math.sqrt(R_RA * R_RA - dx * dx)]; };
  const ra = function(k){ const w = manoRa(k), esc = Math.hypot(w[0] - 12 - hombroRa[0], w[1] - hombroRa[1]) / FG_L.brazo;
    return { p: [38, 58], t: 3, cab: 0, a: [57, 82.5], f: [64, 83.5], w: w, c: 1, escBrazo: Math.min(esc, 1.04) }; };
  FG['remo apoyado en pecho en maquina'] = { seq: [[ra(0), 0.4], [ra(0.25), 0.28], [ra(0.5), 0.28], [ra(0.75), 0.28], [ra(1), 0.28], [ra(1), 0.4], [ra(0.66), 0.45], [ra(0.33), 0.45]], vuelta: 0.45,
    fondo: FG_PISO + '<rect x="28" y="60" width="18" height="4" rx="2" class="il-mueble"/><line x1="37" y1="64" x2="37" y2="84" class="il-fondo"/>'
      + '<line x1="45" y1="33" x2="45" y2="52" class="il-pad"/><line x1="46" y1="44" x2="84" y2="44" class="il-mueble il-sin"/><line x1="84" y1="44" x2="84" y2="84" class="il-mueble il-sin"/>' + FG_PIVOTE(52, 84),
    atras: function(P, ln, ci){ ln(pivRa, P.w, 'il-mueble il-sin');   // los discos, en un tetón que sale hacia delante y gira con la palanca
      const L = Math.hypot(P.w[0] - pivRa[0], P.w[1] - pivRa[1]) || 1, u = [(P.w[0] - pivRa[0]) / L, (P.w[1] - pivRa[1]) / L], b = fgLerp(pivRa, P.w, 0.42), d = [b[0] - u[1] * 12, b[1] + u[0] * 12];
      ln(b, d, 'il-mueble il-sin'); ci(d, 5.5, 'il-disco'); ci(d, 1.5, 'il-peso'); },
    delante: function(P, ln){ ln([P.w[0], P.w[1] - 3.5], [P.w[0], P.w[1] + 3.5], 'il-barra'); } };
  // press de hombro en máquina: sentado con respaldo alto; las asas suben por la palanca que gira detrás
  const phm = function(y){ return { p: [46, 56], t: -4, cab: 2, a: [68, 82.5], f: [75, 83.5], w: function(P){ return fgSum(P.n, [5, y]); }, c: 1 }; };
  FG['press de hombro en maquina'] = { seq: [[phm(-2), 0.3], [phm(-24), 1], [phm(-24), 0.2]], vuelta: 1.1, fondo: FG_PISO + fgAsiento(36, 60, 56) + FG_PIVOTE(22, 30) + '<line x1="22" y1="30" x2="22" y2="84" class="il-mueble il-sin"/>' + fgFlecha(84, 40, 14),
    atras: function(P, ln){ ln([22, 30], P.w, 'il-mueble il-sin'); }, delante: function(P, ln, ci){ ci(P.w, 2.6, 'il-peso'); } };
  // elevaciones laterales en máquina (de frente, sentado): los pads van por fuera de los codos y el brazo los empuja hacia arriba
  const piernasSent = { aL: [53, 82], aR: [67, 82], kL: [53, 64], kR: [67, 64] };
  const lmA = Object.assign({ vista: 'frente', p: [60, 58], brazoL: [186, 186, 0.25], brazoR: [174, 174, 0.25] }, piernasSent);
  const lmB = Object.assign({}, lmA, { brazoL: [280, 280, 0.25], brazoR: [80, 80, 0.25] });   // el izquierdo por su lado (186° → 280°), sin cruzar
  const pad = function(s, e, sig){ const d = [e[0] - s[0], e[1] - s[1]], L = Math.hypot(d[0], d[1]) || 1, u = [d[0] / L, d[1] / L], nrm = [u[1] * sig, -u[0] * sig]; const c = [e[0] - u[0] * 2 + nrm[0] * 3.5, e[1] - u[1] * 2 + nrm[1] * 3.5]; return [[c[0] - u[0] * 4, c[1] - u[1] * 4], [c[0] + u[0] * 4, c[1] + u[1] * 4]]; };
  FG['elevaciones laterales en maquina'] = { vista: 'frente', seq: [[lmA, 0.3], [lmB, 1], [lmB, 0.25]], vuelta: 1.1,
    fondo: FG_PISO + '<rect x="46" y="60" width="28" height="4" rx="2" class="il-mueble"/><line x1="60" y1="64" x2="60" y2="84" class="il-fondo"/>',
    delante: function(P, ln){ const pl = pad(P.sL, P.eL, -1), pr = pad(P.sR, P.eR, 1);   // el pad va por fuera y encima del brazo: el brazo lo empuja desde abajo
      ln([P.sL[0], P.sL[1] - 4], pl[0], 'il-mueble il-sin'); ln([P.sR[0], P.sR[1] - 4], pr[0], 'il-mueble il-sin'); ln(pl[0], pl[1], 'il-pad'); ln(pr[0], pr[1], 'il-pad'); } };
  // crunch en máquina: sentado, el pecho contra el pad de la palanca; flexiona el tronco hacia delante
  const crq = function(t){ return { p: [46, 56], t: t, cab: t > 20 ? 20 : 4, a: [68, 82.5], f: [75, 83.5], brazo: [t + 150, t + 30] }; };
  FG['crunch en maquina'] = { seq: [[crq(-4), 0.3], [crq(38), 1], [crq(38), 0.3]], vuelta: 1.1, fondo: FG_PISO + fgAsiento(36, 60, 56) + FG_PIVOTE(46, 50),
    delante: function(P, ln){ const c = fgSum(P.n, fgDir(Math.atan2(P.n[0] - P.p[0], P.p[1] - P.n[1]) * 180 / Math.PI + 90, 4)); ln([46, 50], c, 'il-mueble il-sin'); ln([c[0], c[1] - 6], [c[0], c[1] + 6], 'il-pad'); } };
})();

/* --- máquinas de pierna --- */
(function(){
  // hack (como la referencia de Domingo, 8/11): recostado sobre el respaldo del carro, que baja por los raíles inclinados con
  // los discos; los pies en la plataforma inclinada de delante; las manos en las asas junto a la cabeza, los codos delante del pecho
  const tH = -48, bajaH = fgDir(132, 17);
  const hk = function(k){ return { p: [56 + bajaH[0] * k, 52 + bajaH[1] * k], t: tH, cab: 14, a: [82, 75.5], f: [87, 70.5], r: -1, brazo: [tH + 112, tH - 8] }; };
  const H0 = fgLado(hk(0)), atrasH = fgDir(tH - 90, 3.8);
  const railH = [fgSum(fgSum(H0.n, atrasH), fgDir(tH, 20)), fgSum(fgSum(H0.p, atrasH), fgDir(tH + 180, 28))];
  const espaldaH = function(P, ln, ci){
    const a = fgDir(tH - 90, 3.8); ln(fgSum(P.p, a), fgSum(P.n, a), 'il-pad');
    ln(fgSum(P.n, fgDir(tH - 90, 1.5)), fgSum(P.n, fgDir(tH + 75, 5.5)), 'il-pad');                 // pad del hombro
    const disco = fgSum(fgLerp(P.p, P.n, 0.45), fgDir(tH - 90, 9)); ci(disco, 6, 'il-disco'); ci(disco, 1.5, 'il-peso');   // discos en el carro
  };
  FG['sentadilla hack'] = { seq: [[hk(0), 0.4], [hk(1), 1.4], [hk(1), 0.3]], vuelta: 1.3,
    fondo: FG_PISO + '<line x1="' + fgNum(railH[0][0]) + '" y1="' + fgNum(railH[0][1]) + '" x2="' + fgNum(railH[1][0]) + '" y2="' + fgNum(railH[1][1]) + '" class="il-mueble il-sin"/><line x1="72" y1="81" x2="98" y2="68" class="il-placa"/><line x1="86" y1="75" x2="86" y2="84" class="il-fondo"/>',
    atras: espaldaH, delante: function(P, ln, ci){ ln([P.w[0], P.w[1] - 3], [P.w[0], P.w[1] + 3], 'il-barra'); } };
  // lever squat (referencias de Domingo, 8/11; nota: «la figura debe enfrentar a la máquina»): de cara a la máquina. La palanca
  // gira delante y abajo, sube por encima de las rodillas hasta los pads de los hombros y sigue detrás, donde lleva los discos;
  // las manos en las asas por delante de los pads; los pies sobre la plataforma inclinada con tope en el talón
  const lv = function(baja){ return { p: baja ? [46, 64] : [56, 45], t: baja ? 30 : 8, cab: baja ? -14 : 0, a: [58, 77], f: [65, 76], brazo: baja ? [178, 8] : [156, -14], al: { en: function(P){ return P.n; }, x: 58 } }; };
  const padLv = function(P){ return fgSum(P.n, [0, -3.5]); };
  FG['sentadilla lever'] = { seq: [[lv(false), 0.4], [lv(true), 1.4], [lv(true), 0.3]], vuelta: 1.3,
    fondo: FG_PISO + '<line x1="44" y1="80" x2="78" y2="75" class="il-placa"/><circle cx="48" cy="77" r="2" class="il-mueble"/><line x1="61" y1="78" x2="61" y2="84" class="il-fondo"/>'
      + '<line x1="100" y1="76" x2="100" y2="84" class="il-mueble il-sin"/><line x1="78" y1="75" x2="100" y2="80" class="il-mueble il-sin"/>' + FG_PIVOTE(100, 76),
    atras: function(P, ln, ci){ const pd = padLv(P), fin = fgLerp([100, 76], pd, 1.17); ln([100, 76], fin, 'il-mueble il-sin'); ci(fin, 6, 'il-disco'); ci(fin, 1.5, 'il-peso'); },
    delante: function(P, ln){ const pd = padLv(P); ln(fgSum(pd, [-4, 0]), fgSum(pd, [4, 0]), 'il-pad'); ln([P.w[0], P.w[1] - 3], [P.w[0], P.w[1] + 3], 'il-barra'); } };
  // cinturón: de pie sobre dos plataformas; el cinturón en la cadera tira de una cadena hacia abajo; las manos en la barra de delante
  const cn = function(baja){ return { p: baja ? [48, 58] : [52, 38.5], t: baja ? 14 : 5, cab: 0, a: [53, 74.5], f: [60, 75.5], w: [70, 32], c: 1 }; };   // las manos en el asa fija de delante
  FG['sentadilla con cinturon en maquina'] = { zoom: 0.9, seq: [[cn(false), 0.3], [cn(true), 1.3], [cn(true), 0.2]], vuelta: 1.1,
    fondo: FG_PISO + '<rect x="40" y="76" width="26" height="8" rx="1.5" class="il-mueble"/><line x1="74" y1="32" x2="74" y2="84" class="il-mueble il-sin"/><line x1="68" y1="32" x2="76" y2="32" class="il-mueble"/>',
    atras: function(P, ln, ci){ ln([P.p[0] + 2, P.p[1] + 2], [P.p[0] + 6, 88], 'il-cable'); }, delante: function(P, ln){ ln([P.p[0] - 3, P.p[1] - 1], [P.p[0] + 4, P.p[1] + 1.5], 'il-pad'); } };
  // prensa 45°: recostado en el respaldo; los pies arriba en la plataforma, que baja por el raíl hasta llevar las rodillas al pecho
  const u45 = fgDir(45, 1), placaDir = fgDir(-45, 1);
  const pr = function(k){ const a = [60.5 - u45[0] * 18 * k, 35.5 - u45[1] * 18 * k]; return { p: [36, 62], t: -62, cab: 18, a: a, f: fgSum(a, fgDir(-45, 6.5)), r: -1, brazo: [130, 150] }; };   // r: -1, la rodilla hacia el pecho
  const placaPr = function(P, ln){ const c = P.a; ln(fgSum(c, [placaDir[0] * 9, placaDir[1] * 9]), fgSum(c, [-placaDir[0] * 12, -placaDir[1] * 12]), 'il-placa'); };
  FG['prensa de piernas'] = { seq: [[pr(0), 0.3], [pr(1), 1.3], [pr(1), 0.2]], vuelta: 1.1,
    fondo: FG_PISO + '<line x1="40" y1="84" x2="104" y2="20" class="il-mueble il-sin"/><line x1="14" y1="40" x2="34" y2="66" class="il-mueble"/><rect x="30" y="64" width="18" height="4" rx="2" class="il-mueble"/><line x1="40" y1="68" x2="40" y2="84" class="il-fondo"/>',
    delante: placaPr };
  // gemelos en prensa: piernas estiradas (sin bloquear); solo la punta del pie en el borde de abajo de la plataforma;
  // el pie gira en el tobillo: de los dedos hacia la espinilla (flexión) a la punta estirada, y empuja la plataforma
  const aG = fgSum([36, 62], fgDir(45, 36.3));
  const gp = function(k){ const ang = fgLerp(-72, -12, k); return { p: [36, 62], t: -62, cab: 18, a: aG, f: fgSum(aG, fgDir(ang, 7)), r: -1, brazo: [130, 150] }; };
  FG['elevacion de gemelos en prensa'] = { seq: [[gp(0), 0.4], [gp(1), 0.9], [gp(1), 0.4]], vuelta: 1,
    fondo: FG_PISO + '<line x1="40" y1="84" x2="104" y2="20" class="il-mueble il-sin"/><line x1="14" y1="40" x2="34" y2="66" class="il-mueble"/><rect x="30" y="64" width="18" height="4" rx="2" class="il-mueble"/><line x1="40" y1="68" x2="40" y2="84" class="il-fondo"/>',
    delante: function(P, ln){ ln(fgSum(P.f, [placaDir[0] * 18, placaDir[1] * 18]), fgSum(P.f, [-placaDir[0] * 1.5, -placaDir[1] * 1.5]), 'il-placa'); } };
  // gemelos de pie en máquina: los pads sobre los hombros (brazo de la máquina); la punta del pie en el bloque y los talones bajan y suben
  const gm = function(arriba){ const a = arriba ? [57, 73.5] : [57, 80.5]; return { p: [57, a[1] - 36.4], t: 2, cab: 0, a: a, f: [64, 77.5], w: function(P){ return fgSum(P.n, [3, -2.5]); }, c: -1 }; };
  FG['elevacion de gemelos'] = { seq: [[gm(false), 0.3], [gm(true), 0.8], [gm(true), 0.4]], vuelta: 0.8,
    fondo: FG_PISO + '<rect x="58" y="78" width="16" height="6" rx="1" class="il-mueble"/><rect x="86" y="2" width="7" height="82" rx="2" class="il-mueble"/>',   // de cara a la máquina
    atras: function(P, ln){ ln([86, P.n[1] - 3.5], fgSum(P.n, [2, -3.5]), 'il-mueble'); }, delante: function(P, ln, ci){ ln(fgSum(P.n, [-3, -3.5]), fgSum(P.n, [4, -3.5]), 'il-pad'); ci(P.w, 2.2, 'il-peso'); } };
  // patada de glúteo en máquina: los codos apoyados en el pad justo debajo de los hombros y los antebrazos sobre el pad,
  // con las manos en el asa; el pie empuja la plataforma de la palanca hacia atrás y arriba
  const pgm = function(k){ const a = fgLerp([45, 70], [20, 44], k); return { p: [52, 48], t: 55, cab: -30, a: a, f: fgSum(a, fgLerp([-2, 6], [-6, 4], k)), r: -1, a2: [57, 82.5], f2: [64, 83.5], brazo: [180, 90] }; };
  const PM0 = fgLado(pgm(0)), yPad = fgNum(PM0.e[1] + 3);
  FG['patada de gluteo en maquina'] = { segundo: true, lejos: ['k2', 'a2', 'f2'], seq: [[pgm(0), 0.3], [pgm(1), 0.9], [pgm(1), 0.3]], vuelta: 0.9,
    fondo: FG_PISO + '<line x1="' + fgNum(PM0.e[0] - 3) + '" y1="' + yPad + '" x2="' + fgNum(PM0.w[0] + 4) + '" y2="' + yPad + '" class="il-pad"/><line x1="' + fgNum(PM0.w[0]) + '" y1="' + yPad + '" x2="' + fgNum(PM0.w[0]) + '" y2="84" class="il-fondo"/>' + FG_PIVOTE(52, 62),
    atras: function(P, ln){ ln([52, 62], P.a, 'il-mueble il-sin'); }, delante: function(P, ln, ci){ const d = [P.f[0] - P.a[0], P.f[1] - P.a[1]], L = Math.hypot(d[0], d[1]) || 1, nn = [d[1] / L, -d[0] / L]; ln(fgSum(P.a, [-nn[0] * 1.5, -nn[1] * 1.5]), fgSum(P.f, [-nn[0] * 1.5, -nn[1] * 1.5]), 'il-placa'); ci(P.w, 2.2, 'il-peso'); } };
  // patada de glúteo en polea (como la referencia de Domingo, 8/11): tronco muy inclinado hacia delante, los antebrazos apoyados
  // en la columna; la pierna de apoyo estirada; la otra, con la tobillera en la polea baja, sube estirada hacia atrás hasta la
  // altura de la cadera
  // la pierna sube estirada describiendo un arco (varias posturas intermedias para que la rodilla no se doble)
  const pgp = function(k){ const a = fgSum([58, 45.6], fgDir(fgLerp(190, 264, k), 37.3)); return { p: [58, 45.6], t: 45, cab: -20, a: a, f: fgSum(a, fgDir(fgLerp(100, 180, k), 6.5)), r: -1, a2: [58, 82.5], f2: [65, 83.5], w: [83, 31], c: 1 }; };
  FG['patada de gluteo en polea'] = { segundo: true, lejos: ['k2', 'a2', 'f2'], seq: [[pgp(0), 0.3], [pgp(0.2), 0.18], [pgp(0.4), 0.18], [pgp(0.6), 0.18], [pgp(0.8), 0.18], [pgp(1), 0.18], [pgp(1), 0.3], [pgp(0.75), 0.25], [pgp(0.5), 0.25], [pgp(0.25), 0.25]], vuelta: 0.25, fondo: FG_PISO + fgColumna(84, 80),
    atras: function(P, ln){ ln([84, 80], P.a, 'il-cable'); }, delante: function(P, ln, ci){ ci(P.a, 2, 'il-peso'); } };
})();

/* remo T con el pecho apoyado (referencia de Domingo, 8/11: «#24 es este»): boca abajo en el pad inclinado, con la cadera alta
   y el tronco muy echado adelante; las piernas atrás, casi estiradas, y los pies en la plataforma; la cabeza alineada con el
   tronco. Los brazos cuelgan rectos hasta las asas, en el extremo de delante de la palanca (que lleva los discos junto a las
   asas y gira abajo y atrás); tira llevando los codos atrás y arriba hasta acercar las asas al pecho */
function fgRemoT(){
  // nota de Domingo (8/11): «el recorrido de la barra y la posición de los codos están mal». La palanca gira atrás y abajo, junto a
  // la plataforma de los pies: las asas suben en un arco ancho hacia el pecho (arriba y algo atrás). Los codos van hacia atrás y
  // arriba, por encima de la espalda, con el antebrazo casi vertical en la línea del tirón
  const t = 58, piv = [24.3, 80], R = 46.8;
  const angS = Math.atan2(55.8 - 80, 64.35 - 24.3), angE = Math.atan2(43.3 - 80, 53.35 - 24.3);
  const mano = function(k){ const g = fgLerp(angS, angE, k); return [piv[0] + Math.cos(g) * R, piv[1] + Math.sin(g) * R]; };
  const pose = function(k){ return { p: [44, 44], t: t, cab: 4, a: [22, 70.5], f: [18.5, 76.5], r: 1, w: mano(k), c: 1 }; };
  const P0 = fgLado(pose(0)), bajo = fgDir(t + 90, 4.6);
  const ini = fgLerp(P0.p, P0.n, 0.2), fin = fgLerp(P0.p, P0.n, 0.9);
  const pad = '<line x1="' + fgNum(ini[0] + bajo[0]) + '" y1="' + fgNum(ini[1] + bajo[1]) + '" x2="' + fgNum(fin[0] + bajo[0]) + '" y2="' + fgNum(fin[1] + bajo[1]) + '" class="il-pad"/>'
    + '<line x1="' + fgNum(ini[0] + bajo[0] + 3) + '" y1="' + fgNum(ini[1] + bajo[1] + 2) + '" x2="' + fgNum(ini[0] + bajo[0] + 3) + '" y2="84" class="il-mueble il-sin"/>'
    + '<line x1="13" y1="79" x2="23" y2="75" class="il-placa"/><line x1="18" y1="77" x2="18" y2="84" class="il-fondo"/>';
  return { seq: [[pose(0), 0.4], [pose(0.25), 0.25], [pose(0.5), 0.25], [pose(0.75), 0.25], [pose(1), 0.25], [pose(1), 0.4], [pose(0.66), 0.45], [pose(0.33), 0.45]], vuelta: 0.45,
    fondo: FG_PISO + pad + FG_PIVOTE(24.3, 80),
    atras: function(P, ln, ci){ ln(piv, P.w, 'il-mueble il-sin'); const d = fgLerp(piv, P.w, 0.84); ci([d[0], d[1] + 2], 6, 'il-disco'); ci([d[0], d[1] + 2], 1.5, 'il-peso'); },
    delante: function(P, ln){ ln([P.w[0] - 3.5, P.w[1]], [P.w[0] + 3.5, P.w[1]], 'il-barra'); } };
}
FG['remo en punta (t-bar)'] = fgRemoT();

/* =========================================================
   Tanda 5 (8/11): vistas de frente / de espaldas y agarres, con las notas de Domingo
   ========================================================= */
/* 11/11 · flecha que indica hacia dónde se empuja (press: hacia arriba), para no confundirlo con un jalón */
function fgFlecha(x, y1, y2){ const d = y2 < y1 ? 1 : -1; return '<line x1="' + x + '" y1="' + y1 + '" x2="' + x + '" y2="' + y2 + '" class="il-palma"/><polyline points="' + (x - 4) + ',' + (y2 + 5 * d) + ' ' + x + ',' + y2 + ' ' + (x + 4) + ',' + (y2 + 5 * d) + '" class="il-palma" fill="none"/>'; }
function fgRotulo(txt){ return '<text x="60" y="89" text-anchor="middle" class="il-rotulo">' + txt + '</text>'; }

/* --- dominadas, de espaldas («para que se vea la apertura de brazos, el movimiento y la tracción») ---
   la barra va de lado a lado (de espaldas se ve entera); las manos, con la anchura de cada variante; las piernas
   cuelgan con las rodillas algo dobladas (los pies hacia atrás, hacia quien mira). Agarre: de espaldas, en prono se ven
   los nudillos (puño oscuro sobre la barra) y en supino las palmas (en color), que miran hacia quien mira */
const FG_BARRA_Y = 9;
/* recuadro abajo a la derecha con las manos en la barra vistas de cerca: supino = palmas (en color) que miran hacia ti;
   neutro = asas paralelas con las palmas una frente a otra */
/* 11/11 · guía del agarre (pedido de Domingo): la mano derecha vista desde los dedos, como en las láminas de anatomía.
   Puño oscuro; la palma, en color: arriba = supino, de lado con el pulgar arriba = neutro, abajo = prono.
   tipos: 'supino' | 'neutro' | 'prono' o una lista para los cambios de agarre (Zottman: supino → prono) */
function fgPuno(tipo, cx, cy){
  const r = function(x, y, w, h, cls){ return '<rect x="' + fgNum(x) + '" y="' + fgNum(y) + '" width="' + w + '" height="' + h + '" rx="2.5" class="' + cls + '"/>'; };
  const l = function(x1, y1, x2, y2){ return '<line x1="' + fgNum(x1) + '" y1="' + fgNum(y1) + '" x2="' + fgNum(x2) + '" y2="' + fgNum(y2) + '" class="il-palma"/>'; };
  if (tipo === 'neutro') return r(cx - 4.5, cy - 4, 9, 11, 'il-cabeza') + r(cx - 1.5, cy - 8, 4, 6, 'il-cabeza') + l(cx - 5.6, cy - 2.5, cx - 5.6, cy + 5.5);
  if (tipo === 'supino') return r(cx - 5.5, cy - 4, 11, 9, 'il-cabeza') + r(cx - 9.5, cy - 2, 6, 4, 'il-cabeza') + l(cx - 4, cy - 5.6, cx + 4, cy - 5.6);
  return r(cx - 5.5, cy - 4, 11, 9, 'il-cabeza') + r(cx + 3.5, cy - 1, 6, 4, 'il-cabeza') + l(cx - 4, cy + 6.6, cx + 4, cy + 6.6);   // prono
}
function fgAgarre(tipos, x, y){
  tipos = [].concat(tipos);
  x = x == null ? 88 : x; y = y == null ? 2 : y;
  const n = tipos.length, ancho = n === 1 ? 30 : 46;
  let h = '<rect x="' + (x + 30 - ancho) + '" y="' + y + '" width="' + ancho + '" height="26" rx="3" class="il-fondo"/>';
  if (n === 1) h += fgPuno(tipos[0], x + 15, y + 11) + '<text x="' + (x + 15) + '" y="' + (y + 23.5) + '" text-anchor="middle" class="il-rotulo">' + tipos[0] + '</text>';
  else { const x0 = x + 30 - ancho; h += fgPuno(tipos[0], x0 + 11, y + 11) + fgPuno(tipos[1], x0 + 35, y + 11)
    + '<line x1="' + (x0 + 19.5) + '" y1="' + (y + 11) + '" x2="' + (x0 + 25.5) + '" y2="' + (y + 11) + '" class="il-fondo"/><polyline points="' + (x0 + 23.5) + ',' + (y + 9) + ' ' + (x0 + 25.5) + ',' + (y + 11) + ' ' + (x0 + 23.5) + ',' + (y + 13) + '" class="il-fondo" fill="none"/>'
    + '<text x="' + (x0 + ancho / 2) + '" y="' + (y + 23.5) + '" text-anchor="middle" class="il-rotulo">' + tipos[0] + ' → ' + tipos[1] + '</text>'; }
  return h;
}
function fgDomPose(n, ancho, k, piernas){
  const y = fgLerp(n.cuelga, n.arriba, k), p = [60, y + 24];
  const pose = { vista: 'frente', p: p, wL: [60 - ancho, FG_BARRA_Y], wR: [60 + ancho, FG_BARRA_Y], cL: n.c, cR: -n.c };
  if (piernas === 'rectas') Object.assign(pose, { kL: [p[0] - 5, p[1] + 18.5], aL: [p[0] - 4.5, p[1] + 36], kR: [p[0] + 5, p[1] + 18.5], aR: [p[0] + 4.5, p[1] + 36],
    fL: [p[0] - 5.5, p[1] + 38], fR: [p[0] + 5.5, p[1] + 38] });
  else if (piernas === 'rodillas') Object.assign(pose, { kL: [p[0] - 5, p[1] + 19], aL: [p[0] - 4.5, p[1] + 24], kR: [p[0] + 5, p[1] + 19], aR: [p[0] + 4.5, p[1] + 24],
    fL: [p[0] - 4.5, p[1] + 26], fR: [p[0] + 4.5, p[1] + 26] });   // de rodillas en el pad: las espinillas van hacia quien mira (se ven cortas)
  else Object.assign(pose, { kL: [p[0] - 4.5, p[1] + 18.5], aL: [p[0] - 3, p[1] + 27], kR: [p[0] + 4.5, p[1] + 18.5], aR: [p[0] + 3, p[1] + 27],
    fL: [p[0] - 3.5, p[1] + 29.5], fR: [p[0] + 3.5, p[1] + 29.5] });
  return pose;
}
function fgDomAlturas(ancho){
  const dx = Math.max(0, ancho - 8);
  return { cuelga: FG_BARRA_Y + Math.sqrt(24.6 * 24.6 - dx * dx) - 1.5, arriba: FG_BARRA_Y + 5.5, c: -1 };   // c: -1, los codos hacia abajo y afuera
}
function fgManoAgarre(agarre){
  return function(P, ln, ci){
    ['L', 'R'].forEach(function(s){
      const w = P['w' + s], sig = s === 'L' ? -1 : 1;
      if (agarre === 'supino') { ci([w[0], w[1] + 2.2], 2.6, 'il-peso'); }            // la palma (en color), hacia quien mira
      else if (agarre === 'neutro') { ln([w[0] - sig * 1.8, w[1] - 2.5], [w[0] - sig * 1.8, w[1] + 2.5], 'il-palma'); }   // las palmas, una frente a otra
      else { ln([w[0] - 2, w[1] - 1.2], [w[0] + 2, w[1] - 1.2], 'il-cuerpo'); }                                  // nudillos por encima de la barra
    });
  };
}
function fgDominada(o){
  const al = fgDomAlturas(o.ancho);
  const A = fgDomPose(al, o.ancho, 0, o.piernas), B = fgDomPose(al, o.ancho, 1, o.piernas);
  // codos pegados (supinas y neutras; nota de Domingo, 9/11): los codos bajan por delante del cuerpo, junto al torso; de espaldas
  // el brazo se ve más corto (va hacia delante) y el codo no se separa del costado
  if (o.pegados) {   // en cada momento, el brazo justo para llegar a la barra: el codo queda en la línea hombro-mano o por debajo, nunca hacia un lado
    const pg = function(k){ const q = fgDomPose(al, o.ancho, k, o.piernas), sy = fgLerp(al.cuelga, al.arriba, k) + 1.5, d = Math.hypot(Math.abs(o.ancho - 8), sy - FG_BARRA_Y);
      q.codos = 'pegados'; q.escBrazo = Math.min(1, (Math.abs(d - FG_L.antebrazo) + 0.3) / FG_L.brazo); return q; };
    o.seq = function(){ return [[pg(0), 0.4], [pg(0.25), 0.3], [pg(0.5), 0.3], [pg(0.75), 0.3], [pg(1), 0.3], [pg(1), 0.3], [pg(0.75), 0.35], [pg(0.5), 0.35], [pg(0.25), 0.35]]; };
    o.vuelta = 0.35;
  }
  const barra = o.agarre === 'neutro'
    ? '<line x1="14" y1="' + (FG_BARRA_Y - 7) + '" x2="106" y2="' + (FG_BARRA_Y - 7) + '" class="il-mueble il-sin"/>'
      + '<line x1="' + (60 - o.ancho) + '" y1="' + (FG_BARRA_Y - 7) + '" x2="' + (60 - o.ancho) + '" y2="' + (FG_BARRA_Y + 3) + '" class="il-barra"/>'
      + '<line x1="' + (60 + o.ancho) + '" y1="' + (FG_BARRA_Y - 7) + '" x2="' + (60 + o.ancho) + '" y2="' + (FG_BARRA_Y + 3) + '" class="il-barra"/>'
    : '<line x1="14" y1="' + FG_BARRA_Y + '" x2="106" y2="' + FG_BARRA_Y + '" class="il-barra"/>';
  const postes = '<line x1="12" y1="' + (FG_BARRA_Y - 7) + '" x2="12" y2="84" class="il-mueble il-sin"/><line x1="108" y1="' + (FG_BARRA_Y - 7) + '" x2="108" y2="84" class="il-mueble il-sin"/>';
  return Object.assign({ vista: 'frente', seq: o.seq ? o.seq(A, B) : [[A, 0.4], [B, 1.2], [B, 0.3]], vuelta: o.vuelta || 1.5,
    fondo: FG_PISO + postes + barra + (o.fondo || '') + fgRotulo(o.rotulo),
    delante: function(P, ln, ci, F){ fgManoAgarre(o.agarre)(P, ln, ci); if (o.delante) o.delante(P, ln, ci, F); } }, o.atras ? { atras: o.atras } : {});
}
FG['dominadas'] = fgDominada({ ancho: 15, agarre: 'prono', rotulo: 'de espaldas · agarre prono' });
FG['dominadas anchas'] = fgDominada({ ancho: 22, agarre: 'prono', rotulo: 'de espaldas · agarre ancho' });
FG['dominadas supinas'] = fgDominada({ ancho: 9, agarre: 'supino', pegados: true, rotulo: 'de espaldas · agarre supino', fondo: fgAgarre('supino', 77, 56) });
FG['dominadas agarre neutro'] = fgDominada({ ancho: 8, agarre: 'neutro', pegados: true, rotulo: 'de espaldas · agarre neutro', fondo: fgAgarre('neutro', 77, 56) });
// con banda: la banda elástica va atada a la barra y pasa por debajo de las rodillas (ayuda abajo, donde más cuesta)
FG['dominadas con banda'] = fgDominada({ ancho: 15, agarre: 'prono', rotulo: 'de espaldas · con banda',
  atras: function(P, ln){ ln([58, FG_BARRA_Y], P.kL, 'il-cable il-banda'); ln([62, FG_BARRA_Y], P.kR, 'il-cable il-banda'); },
  delante: function(P, ln){ ln(P.kL, P.kR, 'il-cuerda-t'); } });
// lastradas: cinturón en la cadera con una cadena y el disco colgando entre las piernas
FG['dominadas lastradas'] = fgDominada({ ancho: 15, agarre: 'prono', rotulo: 'de espaldas · con lastre',
  delante: function(P, ln, ci){ ln([P.pL[0] - 1.5, P.pL[1] - 1], [P.pR[0] + 1.5, P.pR[1] - 1], 'il-placa'); const d = [P.p[0], P.p[1] + 14]; ln(P.p, d, 'il-cable'); ci(d, 5.5, 'il-disco'); ci(d, 1.4, 'il-peso'); } });
// negativas: sube al cajón con la barbilla por encima de la barra, levanta los pies y baja MUY despacio (3-5 s); vuelve al cajón
(function(){
  const al = fgDomAlturas(15), cajonY = 74;
  const sobreCajon = (function(){ const p = [60, cajonY - 36 + 0.5]; return { vista: 'frente', p: p, wL: [45, FG_BARRA_Y], wR: [75, FG_BARRA_Y], cL: -1, cR: 1,
    kL: [p[0] - 5, p[1] + 18.5], aL: [p[0] - 4.5, p[1] + 36], kR: [p[0] + 5, p[1] + 18.5], aR: [p[0] + 4.5, p[1] + 36], fL: [p[0] - 9, p[1] + 37], fR: [p[0] + 9, p[1] + 37] }; })();
  const arriba = fgDomPose(al, 15, 1), mitad = fgDomPose(al, 15, 0.5), abajo = fgDomPose(al, 15, 0);
  FG['dominadas negativas'] = { vista: 'frente', seq: [[sobreCajon, 0.5], [arriba, 0.4], [arriba, 0.3], [mitad, 1.8], [abajo, 1.8], [abajo, 0.4]], vuelta: 0.9,
    fondo: FG_PISO + '<line x1="12" y1="' + (FG_BARRA_Y - 7) + '" x2="12" y2="84" class="il-mueble il-sin"/><line x1="108" y1="' + (FG_BARRA_Y - 7) + '" x2="108" y2="84" class="il-mueble il-sin"/>'
      + '<line x1="14" y1="' + FG_BARRA_Y + '" x2="106" y2="' + FG_BARRA_Y + '" class="il-barra"/>' + fgCaja(44, cajonY + 1, 32, 84 - cajonY - 1) + fgRotulo('baja despacio · 3-5 s'),
    delante: fgManoAgarre('prono') };
})();
// asistidas en máquina: de rodillas en el pad, que empuja hacia arriba con el contrapeso; las asas arriba
(function(){
  const al = fgDomAlturas(15);
  const pad = function(P, ln){ ln([P.kL[0] - 5, P.kL[1] + 2.5], [P.kR[0] + 5, P.kR[1] + 2.5], 'il-pad'); ln([60, P.kL[1] + 5], [60, 84], 'il-mueble il-sin'); };
  FG['dominadas asistidas en maquina'] = fgDominada({ ancho: 15, agarre: 'prono', piernas: 'rodillas', rotulo: 'de espaldas · en máquina', atras: pad });
  void al;
})();

/* --- jalón con agarre neutro (de frente): sentado con los muslos bajo el rodillo; el asa en V (palmas una frente a otra) baja
   desde arriba hasta la parte alta del pecho, con los codos hacia abajo y algo abiertos --- */
(function(){
  const sent = { aL: [53, 82], aR: [67, 82], kL: [51, 62], kR: [69, 62] };
  // 11/11 (nota de Domingo): los codos no se abren; van siempre en línea con las muñecas, justo debajo
  const A = Object.assign({ vista: 'frente', codos: 'abajo', p: [60, 60], wL: [49, 14.5], wR: [71, 14.5], eL: [49, 26.5], eR: [71, 26.5] }, sent);   // asas paralelas, algo más anchas que los hombros
  const B = Object.assign({}, A, { wL: [49, 38.5], wR: [71, 38.5], eL: [49, 50.5], eR: [71, 50.5] });   // abajo: las asas a la altura de la barbilla y los codos bajo las manos
  FG['jalon agarre neutro'] = { vista: 'frente', seq: [[A, 0.4], [B, 1.1], [B, 0.3]], vuelta: 1.5,
    fondo: FG_PISO + '<rect x="46" y="60" width="28" height="4" rx="2" class="il-mueble"/><line x1="60" y1="64" x2="60" y2="84" class="il-fondo"/>'
      + '<line x1="42" y1="58" x2="78" y2="58" class="il-pad"/><line x1="40" y1="58" x2="40" y2="84" class="il-mueble il-sin"/><line x1="80" y1="58" x2="80" y2="84" class="il-mueble il-sin"/>'
      + '<rect x="56" y="0" width="8" height="3" rx="1" class="il-mueble"/>' + fgAgarre('neutro') + fgRotulo('de frente · agarre neutro'),
    atras: function(P, ln){ const y = P.wL[1] - 5; ln([60, 2], [60, y], 'il-cable'); ln([P.wL[0] - 4, y], [P.wR[0] + 4, y], 'il-barra'); },
    delante: function(P, ln){ ln([P.wL[0], P.wL[1] - 5], [P.wL[0], P.wL[1] + 3], 'il-barra'); ln([P.wR[0], P.wR[1] - 5], [P.wR[0], P.wR[1] + 3], 'il-barra');
      ln([P.wL[0] + 1.8, P.wL[1] - 2], [P.wL[0] + 1.8, P.wL[1] + 2], 'il-palma'); ln([P.wR[0] - 1.8, P.wR[1] - 2], [P.wR[0] - 1.8, P.wR[1] + 2], 'il-palma'); } };
})();

/* --- press en banco visto desde la cabeza («para que se vea la apertura de brazos»): el banco de frente, los hombros
   apoyados, la cabeza delante y las piernas al fondo (más claras). La barra va de lado a lado con los discos de canto --- */
function fgPressCabeza(o){
  const sL = [50, 57], sR = [70, 57];
  const dibujo = function(F, ln, ci){
    ln([60, 57], [52, 47], 'il-cuerpo il-lejos'); ln([60, 57], [68, 47], 'il-cuerpo il-lejos');         // muslos (al fondo)
    ln([52, 47], [44, 83], 'il-cuerpo il-lejos'); ln([68, 47], [76, 83], 'il-cuerpo il-lejos');         // espinillas hasta el suelo
    ln(sL, sR);
    [['L', sL, -1], ['R', sR, 1]].forEach(function(x){ const e = fgIKAbajo(x[1], F['w' + x[0]], FG_L.brazo * F.eb, FG_L.antebrazo, x[2]); ln(x[1], e.j); ln(e.j, e.t); });   // los codos caen hacia el suelo; eb: el brazo va hacia los pies (se ve corto)
    ci([60, 58], 5.6, 'il-cabeza');
    const y = F.wL[1];
    ln([18, y], [102, y], 'il-barra'); ln([24, y - 8], [24, y + 8], 'il-placa'); ln([96, y - 8], [96, y + 8], 'il-placa');
  };
  const A = { wL: [60 - o.ancho, 35], wR: [60 + o.ancho, 35], cL: o.c, cR: -o.c, eb: 1 }, B = { wL: [60 - o.ancho, 50], wR: [60 + o.ancho, 50], cL: o.c, cR: -o.c, eb: o.eb };
  return { seq: [[A, 0.4], [B, 1.3], [B, 0.25]], vuelta: 1.1, dibujo: dibujo,
    fondo: FG_PISO + '<rect x="48" y="60" width="24" height="5" rx="2" class="il-mueble"/><line x1="53" y1="65" x2="53" y2="84" class="il-fondo"/><line x1="67" y1="65" x2="67" y2="84" class="il-fondo"/>' + fgRotulo(o.rotulo) };
}
FG['press cerrado'] = fgPressCabeza({ ancho: 7, c: 1, eb: 0.45, rotulo: 'visto desde la cabeza · cerrado' });
FG['press banca agarre ancho'] = fgPressCabeza({ ancho: 21, c: -1, eb: 1, rotulo: 'visto desde la cabeza · ancho' });

/* --- flexiones de frente («para que se vea la apertura»): la cabeza delante, los hombros y los brazos hasta las manos en el
   suelo; el cuerpo se aleja hacia los pies (más claro, al fondo) --- */
function fgFlexDibujo(extra, libre){
  return function(F, ln, ci){
    const sL = [60 - 10 + F.dx, F.sy + F.inc], sR = [60 + 10 + F.dx, F.sy - F.inc], c = [60 + F.dx, F.sy];
    ln(c, [60, 76], 'il-cuerpo il-lejos'); ln([60, 76], [56 - F.pies, 83], 'il-cuerpo il-lejos'); ln([60, 76], [64 + F.pies, 83], 'il-cuerpo il-lejos');
    ln(sL, sR);
    [['L', sL, F.cL], ['R', sR, F.cR]].forEach(function(x){
      if (libre === x[0]) { const e = [x[1][0] + 2, x[1][1] - 3], m = [c[0] - 2, c[1] - 4]; ln(x[1], e, 'il-cuerpo il-lejos'); ln(e, m, 'il-cuerpo il-lejos'); return; }   // la mano libre, a la espalda
      const e = fgIK(x[1], F['w' + x[0]], FG_L.brazo, FG_L.antebrazo, x[2]); ln(x[1], e.j); ln(e.j, e.t); });
    ci([c[0], c[1] - 1], 5.6, 'il-cabeza');
    if (extra) extra(F, ln, ci);
  };
}
function fgFlexPose(o){ return Object.assign({ dx: 0, inc: 0, pies: 0, cL: 1, cR: -1 }, o); }
function fgManosSuelo(F, ln){ ln([F.wL[0] - 2.5, F.wL[1] + 0.5], [F.wL[0] + 2.5, F.wL[1] + 0.5], 'il-palma'); ln([F.wR[0] - 2.5, F.wR[1] + 0.5], [F.wR[0] + 2.5, F.wR[1] + 0.5], 'il-palma'); }
// abiertas: las manos mucho más anchas que los hombros; abajo, los codos se abren
(function(){
  const A = fgFlexPose({ sy: 61, wL: [36, 83], wR: [84, 83] }), B = fgFlexPose({ sy: 74, wL: [36, 83], wR: [84, 83] });
  FG['flexiones abiertas'] = { seq: [[A, 0.3], [B, 1], [B, 0.2]], vuelta: 1, dibujo: fgFlexDibujo(fgManosSuelo), fondo: FG_PISO + fgRotulo('de frente · manos abiertas') };
})();
// diamante: las manos juntas bajo el pecho, los pulgares y los índices formando un rombo; los codos van pegados hacia atrás
(function(){
  const A = fgFlexPose({ sy: 60, wL: [58, 83], wR: [62, 83] }), B = fgFlexPose({ sy: 73, wL: [58, 83], wR: [62, 83] });
  const rombo = function(F, ln){ ln([54, 83.5], [60, 80.5], 'il-palma'); ln([60, 80.5], [66, 83.5], 'il-palma'); ln([54, 83.5], [60, 86.5], 'il-palma'); ln([60, 86.5], [66, 83.5], 'il-palma'); };
  FG['flexiones diamante'] = { seq: [[A, 0.3], [B, 1], [B, 0.2]], vuelta: 1, dibujo: fgFlexDibujo(rombo), fondo: FG_PISO + fgRotulo('de frente · manos en rombo') };
})();
// arquero: manos muy abiertas; baja hacia un lado doblando ese brazo mientras el otro se queda estirado; sube y repite al otro lado
(function(){
  const arr = fgFlexPose({ sy: 63, wL: [36, 83], wR: [84, 83] });
  const izq = fgFlexPose({ sy: 73, dx: -8, inc: 1.5, wL: [36, 83], wR: [84, 83] }), der = fgFlexPose({ sy: 73, dx: 8, inc: -1.5, wL: [36, 83], wR: [84, 83] });
  FG['flexiones arquero'] = { seq: [[arr, 0.3], [izq, 1], [izq, 0.2], [arr, 0.9], [arr, 0.3], [der, 1], [der, 0.2]], vuelta: 0.9, dibujo: fgFlexDibujo(fgManosSuelo), fondo: FG_PISO + fgRotulo('de frente · un brazo estirado') };
})();
// a una mano: la mano de apoyo bajo el pecho, la otra a la espalda; los pies muy separados para el equilibrio
(function(){
  const A = fgFlexPose({ sy: 60, dx: -3, inc: 1, pies: 9, wL: [0, 0], wR: [62, 83], cR: -1 }), B = fgFlexPose({ sy: 72, dx: -3, inc: 2, pies: 9, wL: [0, 0], wR: [62, 83], cR: -1 });
  FG['flexiones a una mano'] = { seq: [[A, 0.3], [B, 1.2], [B, 0.2]], vuelta: 1.1,
    dibujo: fgFlexDibujo(function(F, ln){ ln([F.wR[0] - 2.5, 83.5], [F.wR[0] + 2.5, 83.5], 'il-palma'); }, 'L'), fondo: FG_PISO + fgRotulo('de frente · a una mano') };
})();
// con palmada: baja, empuja fuerte hasta que las manos se despegan, da una palmada delante del pecho y cae
(function(){
  const arr = fgFlexPose({ sy: 61, wL: [46, 83], wR: [74, 83] }), abj = fgFlexPose({ sy: 74, wL: [46, 83], wR: [74, 83] });
  const vuela = fgFlexPose({ sy: 52, wL: [58.5, 72], wR: [61.5, 72], cL: 1, cR: -1 }), suelta = fgFlexPose({ sy: 55, wL: [48, 74], wR: [72, 74] });
  FG['flexiones con palmada'] = { seq: [[arr, 0.3], [abj, 0.8], [abj, 0.1], [suelta, 0.15], [vuela, 0.12], [vuela, 0.08], [suelta, 0.12], [arr, 0.15]], vuelta: 0.3,
    dibujo: fgFlexDibujo(fgManosSuelo), fondo: FG_PISO + fgRotulo('de frente · palmada') };
})();

/* --- remo con barra, agarre supino (de lado; nota de Domingo, 9/11: «fatal el recorrido de la barra y no se ve que sea supino»):
   tronco a unos 45°, rodillas flexionadas. La barra empieza colgando con los brazos estirados, justo debajo de los hombros, a la
   altura de las rodillas, y sube pegada a los muslos hasta tocar el abdomen (el ombligo); los codos van pegados al cuerpo y
   acaban por detrás del tronco. El recorrido se ve marcado con puntos. Agarre supino: la mano rodea la barra por debajo (la
   palma, en color, mira hacia delante) y el recuadro enseña las manos vistas de frente --- */
(function(){
  const t = 50, p = [32, 52];
  const n = fgSum(p, fgDir(t, FG_L.tronco));
  // 11/11: la barra sube casi en vertical (sobre el medio del pie) desde debajo de los hombros hasta tocar el abdomen
  const fin = fgSum(fgLerp(p, n, 0.55), fgDir(t + 90, 3)), ini = [fin[0] + 2, 61];
  // 11/11 (nota de Domingo: «la dirección del remo es errática y antinatural por los codos»): en cada momento el codo va hacia
  // atrás, por el lado de la espalda, y sube pegado al cuerpo; nunca se adelanta ni cambia de lado a mitad del recorrido
  const atrasN = fgDir(t - 90, 1);
  const codo = function(w){ const n0 = FG_RECORTES.length, a = fgIK(n, w, FG_L.brazo, FG_L.antebrazo, 1), b = fgIK(n, w, FG_L.brazo, FG_L.antebrazo, -1); FG_RECORTES.length = n0;
    const sc = function(e){ return (e.j[0] - n[0]) * atrasN[0] + (e.j[1] - n[1]) * atrasN[1]; }; return (sc(a) >= sc(b) ? a : b).j; };
  const pose = function(k){ const w = fgLerp(ini, fin, k); return { p: p, t: t, cab: -14, a: [45, 82.5], f: [52, 83.5], r: -1, w: w, e: codo(w) }; };
  const traza = '<line x1="' + fgNum(ini[0]) + '" y1="' + fgNum(ini[1]) + '" x2="' + fgNum(fin[0]) + '" y2="' + fgNum(fin[1]) + '" class="il-fondo" stroke-dasharray="1.5 2.5"/>';
  FG['remo con barra agarre supino'] = { seq: [[pose(0), 0.4], [pose(0.25), 0.25], [pose(0.5), 0.25], [pose(0.75), 0.25], [pose(1), 0.25], [pose(1), 0.3], [pose(0.66), 0.4], [pose(0.33), 0.4]], vuelta: 0.4,
    fondo: FG_PISO + traza + fgAgarre('supino') + fgRotulo('agarre supino · palmas delante'),
    atras: function(P, ln, ci){ fgDisco(ci, P.w); },
    delante: function(P, ln){ const w = P.w; ln([w[0] - 2.4, w[1] + 0.4], [w[0] - 0.6, w[1] + 2.8], 'il-palma'); ln([w[0] - 0.6, w[1] + 2.8], [w[0] + 2, w[1] + 1.4], 'il-palma'); } };   // la mano, por debajo de la barra
})();

/* --- comba (de frente): saltitos de puntillas con las manos junto a la cadera girando las muñecas; la cuerda da la vuelta
   (por encima de la cabeza, por delante, por debajo de los pies, por detrás) y salta justo cuando pasa por debajo --- */
(function(){
  const pose = function(g){
    const salta = Math.max(0, Math.cos(fgRad(g - 180))) ;   // en lo alto cuando la cuerda pasa bajo los pies
    const y = 46.5 - salta * 4;
    return { vista: 'frente', p: [60, y], aL: [55, 82 - salta * 4], aR: [65, 82 - salta * 4], fL: [53, 84 - salta * 4], fR: [67, 84 - salta * 4],
      wL: [48, y - 0.5], wR: [72, y - 0.5], cL: 1, cR: -1, g: g };
  };
  const seq = [];
  for (let g = 0; g <= 360; g += 45) seq.push([pose(g), 0.07]);
  seq[0][1] = 0.07;
  FG['comba'] = { vista: 'frente', seq: seq, vuelta: 0.001, fondo: FG_PISO + fgRotulo('de frente · comba'),
    delante: function(P, ln, ci, F){
      const g = fgRad(F.g), cy = P.wL[1], arriba = 44, abajo = 84 - cy + 1.5;
      const my = cy - Math.cos(g) * (Math.cos(g) > 0 ? arriba : abajo), m = [60, my];
      const qL = [P.wL[0] - 6, (P.wL[1] + my) / 2], qR = [P.wR[0] + 6, (P.wR[1] + my) / 2];
      ln(P.wL, qL, 'il-cuerda-t'); ln(qL, m, 'il-cuerda-t'); ln(m, qR, 'il-cuerda-t'); ln(qR, P.wR, 'il-cuerda-t');
      ln([P.wL[0], P.wL[1] - 2.5], [P.wL[0], P.wL[1] + 2.5], 'il-barra'); ln([P.wR[0], P.wR[1] - 2.5], [P.wR[0], P.wR[1] + 2.5], 'il-barra'); } };
})();


/* =========================================================
   TANDA 6a (11/11/2026) · pecho y fondos
   ========================================================= */
/* --- aperturas visto desde la cabeza (nota de Domingo: «el plano es perfecto, afinar el recorrido de las mancuernas»):
   tumbado en el banco, los brazos casi rectos (codo apenas flexionado) dibujan un arco: de arriba, con las mancuernas
   juntas sobre el pecho, a abrirse a los lados hasta la altura del banco. De frente se ve el disco de cada mancuerna --- */
function fgAperturas(o){
  const sL = [50, 57], sR = [70, 57];
  const dibujo = function(F, ln, ci){
    ln([60, 57], [52, 47], 'il-cuerpo il-lejos'); ln([60, 57], [68, 47], 'il-cuerpo il-lejos');
    ln([52, 47], [44, 83], 'il-cuerpo il-lejos'); ln([68, 47], [76, 83], 'il-cuerpo il-lejos');
    ln(sL, sR);
    [[sL, 1], [sR, -1]].forEach(function(x){
      const g = F.g * x[1], e = fgSum(x[0], fgDir(g, FG_L.brazo)), w = fgSum(e, fgDir(g + 22 * x[1], FG_L.antebrazo));   // el antebrazo se curva hacia dentro (codo blando)
      ln(x[0], e); ln(e, w); ci(w, 4, 'il-disco'); ci(w, 1.4, 'il-peso');
    });
    ci([60, 58], 5.6, 'il-cabeza');
  };
  const A = { g: -2 }, M1 = { g: -35 }, M2 = { g: -70 }, B = { g: -100 };   // ángulo del brazo izquierdo (el derecho, en espejo)
  return { seq: [[A, 0.4], [M1, 0.45], [M2, 0.45], [B, 0.5], [B, 0.25], [M2, 0.4], [M1, 0.4]], vuelta: 0.4, dibujo: dibujo,
    fondo: FG_PISO + '<rect x="48" y="60" width="24" height="5" rx="2" class="il-mueble"/><line x1="53" y1="65" x2="53" y2="84" class="il-fondo"/><line x1="67" y1="65" x2="67" y2="84" class="il-fondo"/>'
      + (o.inclinado ? '<line x1="90" y1="78" x2="110" y2="64" class="il-mueble"/><line x1="96" y1="78" x2="106" y2="78" class="il-mueble"/>' : '') + fgRotulo(o.rotulo) };
}
FG['aperturas con mancuernas'] = fgAperturas({ rotulo: 'desde la cabeza · banco plano' });
// inclinadas: mismo plano; el banco inclinado se ve aparte (dibujo pequeño a la derecha) y el arco acaba algo más arriba
FG['aperturas inclinadas con mancuernas'] = (function(){ const S = fgAperturas({ inclinado: true, rotulo: 'desde la cabeza · inclinado' }); S.seq = S.seq.map(function(x){ return [{ g: Math.max(x[0].g, -88) }, x[1]]; }); return S; })();

/* --- cruce de poleas a media altura (nota de Domingo: «bajar las dos poleas y ponerlas en medio; aducción a 90 grados»):
   de frente, las poleas a la altura de los hombros; los brazos casi rectos, a la altura de los hombros, se cierran por delante
   del pecho hasta juntar las manos (al ir hacia quien mira, se ven más cortos) --- */
(function(){
  const sL = [52, 24], sR = [68, 24], y = 25;
  const pose = function(k){ const g = fgRad(k * 90), r = 24;
    const wL = [sL[0] - r * Math.cos(g) + 7.6 * Math.sin(g), y + 2 * Math.sin(g)], wR = [120 - wL[0], wL[1]];
    const eL = fgSum(fgLerp(sL, wL, 0.52), [0, 1.2]), eR = [120 - eL[0], eL[1]];
    return { vista: 'frente', p: [60, 46.5], aL: [55, 82], aR: [65, 82], wL: wL, wR: wR, eL: eL, eR: eR }; };
  const polea = [14, 24], poleaR = [106, 24];
  FG['cruce de poleas alto'] = { vista: 'frente', seq: [[pose(0), 0.4], [pose(0.35), 0.4], [pose(0.7), 0.4], [pose(1), 0.4], [pose(1), 0.3], [pose(0.6), 0.45], [pose(0.25), 0.45]], vuelta: 0.45,
    fondo: FG_PISO + '<rect x="4" y="2" width="7" height="82" rx="2" class="il-mueble"/><rect x="109" y="2" width="7" height="82" rx="2" class="il-mueble"/>'
      + '<circle cx="' + polea[0] + '" cy="' + polea[1] + '" r="3.2" class="il-mueble"/><circle cx="' + poleaR[0] + '" cy="' + poleaR[1] + '" r="3.2" class="il-mueble"/>' + fgRotulo('poleas a media altura'),
    atras: function(P, ln){ ln(polea, P.wL, 'il-cable'); ln(poleaR, P.wR, 'il-cable'); },
    delante: function(P, ln, ci){ ci(P.wL, 2.4, 'il-peso'); ci(P.wR, 2.4, 'il-peso'); } };
})();

/* --- press de suelo con barra (de lado): tumbado en el suelo con las rodillas dobladas; la barra baja hasta que los codos
   (abiertos, por eso el brazo se ve corto) tocan el suelo, y sube con los brazos estirados sobre el pecho --- */
(function(){
  const pose = function(arriba){ return { p: [60, 79], t: -90, cab: 4, a: [76, 82.5], f: [83, 83.5], r: -1,
    w: arriba ? [37, 54] : [37, 68], e: arriba ? [36.5, 66.5] : [37, 81] }; };
  FG['press de suelo con barra'] = { seq: [[pose(true), 0.4], [pose(false), 1.2], [pose(false), 0.35]], vuelta: 1, fondo: FG_PISO + fgRotulo('los codos tocan el suelo'),
    delante: fgEnManos('barra') };
})();

/* --- fondos en paralelas (de lado; nota de Domingo: «los codos, antinatural y muy recto; el torso ligeramente inclinado
   hacia delante»): las manos fijas en las barras junto a la cadera; al bajar, los hombros van hacia delante y abajo, el
   tronco se inclina y los codos se doblan hacia atrás hasta unos 90°; rodillas dobladas con los pies hacia atrás --- */
function fgFondos(o){
  const barY = 44, w = [60, barY];
  const tAr = o.tronco[0], tAb = o.tronco[1];
  const pose = function(k){
    const n = fgLerp([59, barY - 24.6], [o.hombroAbajo[0], o.hombroAbajo[1]], k), t = fgLerp(tAr, tAb, k);
    const p = fgSum(n, fgDir(t + 180, FG_L.tronco));
    const ik = function(P){ const a = fgIK(P.n, w, FG_L.brazo, FG_L.antebrazo, 1), b = fgIK(P.n, w, FG_L.brazo, FG_L.antebrazo, -1); return (a.j[0] < b.j[0] ? a : b).j; };   // el codo, hacia atrás
    const pie = o.rodillas ? { a: fgSum(p, [-9, 17]), f: fgSum(p, [-15, 17.5]), r: -1 } : { a: fgSum(p, [-8, 27]), f: fgSum(p, [-10, 33]), r: -1 };   // rodillas delante, pies atrás
    return Object.assign({ p: p, t: t, cab: -4, w: w, e: ik }, pie, o.extra ? o.extra(p) : {});
  };
  const seq = o.seq ? o.seq(pose) : [[pose(0), 0.4], [pose(0.5), 0.5], [pose(1), 0.5], [pose(1), 0.25], [pose(0.5), 0.45]];
  return { seq: seq, vuelta: o.vuelta || 0.45,
    fondo: FG_PISO + '<line x1="38" y1="' + barY + '" x2="84" y2="' + barY + '" class="il-mueble"/><line x1="42" y1="' + barY + '" x2="42" y2="84" class="il-mueble il-sin"/><line x1="80" y1="' + barY + '" x2="80" y2="84" class="il-mueble il-sin"/>' + (o.fondo || '') + fgRotulo(o.rotulo),
    atras: o.atras, delante: o.delante };
}
FG['fondos en paralelas'] = fgFondos({ tronco: [12, 30], hombroAbajo: [64, 33], rotulo: 'torso algo hacia delante' });
FG['fondos en paralelas para triceps'] = fgFondos({ tronco: [4, 10], hombroAbajo: [61.5, 33], rotulo: 'torso erguido · codos atrás' });
// lastrados: cinturón con cadena y el disco colgando entre las piernas
FG['fondos lastrados'] = fgFondos({ tronco: [12, 30], hombroAbajo: [64, 33], rotulo: 'con lastre en el cinturón',
  delante: function(P, ln, ci){ const d = fgSum(P.p, [2, 13]); ln(P.p, d, 'il-cable'); ci(d, 5, 'il-disco'); ci(d, 1.4, 'il-peso'); } });
// asistida: de rodillas en el pad, que empuja hacia arriba (contrapeso)
FG['fondos en maquina asistida'] = fgFondos({ tronco: [12, 28], hombroAbajo: [64, 33], rodillas: true, rotulo: 'rodillas en el pad · asistida',
  atras: function(P, ln){ const k = P.k; ln([k[0] - 9, k[1] + 3], [k[0] + 4, k[1] + 3], 'il-pad'); ln([k[0] - 2, k[1] + 5], [k[0] - 2, 84], 'il-mueble il-sin'); } });
// negativos: sube con un salto (o desde un cajón) arriba con los brazos estirados y baja MUY despacio (3-5 s); vuelve al cajón
FG['fondos negativos'] = fgFondos({ tronco: [12, 30], hombroAbajo: [64, 33], rotulo: 'baja despacio · 3-5 s', vuelta: 0.6,
  fondo: fgCaja(36, 70, 20, 14),
  seq: function(pose){ const caj = Object.assign({}, pose(0.15), {}); caj.a = [47, 69.5]; caj.f = [54, 70]; caj.r = -1; caj.p = [caj.p[0], caj.p[1] + 4];
    return [[caj, 0.5], [pose(0), 0.35], [pose(0), 0.3], [pose(0.5), 1.8], [pose(1), 1.8], [pose(1), 0.3]]; } });


/* =========================================================
   TANDA 6b (11/11/2026) · espalda
   ========================================================= */
/* cuerpo recto (plancha, remo invertido): de los tobillos a los hombros en línea; devuelve cadera e inclinación */
function fgRecto(tobillo, hombro){
  const d = [hombro[0] - tobillo[0], hombro[1] - tobillo[1]], L = Math.hypot(d[0], d[1]) || 1, u = [d[0] / L, d[1] / L];
  const p = [tobillo[0] + u[0] * (FG_L.muslo + FG_L.canilla - 0.1), tobillo[1] + u[1] * (FG_L.muslo + FG_L.canilla - 0.1)];
  return { p: p, t: Math.atan2(u[0], -u[1]) * 180 / Math.PI, a: tobillo };
}
/* codo por el lado que se pide (dir: vector hacia donde debe quedar) */
function fgCodoHacia(n, w, dir){
  const n0 = FG_RECORTES.length, a = fgIK(n, w, FG_L.brazo, FG_L.antebrazo, 1), b = fgIK(n, w, FG_L.brazo, FG_L.antebrazo, -1); FG_RECORTES.length = n0;
  const sc = function(e){ return (e.j[0] - n[0]) * dir[0] + (e.j[1] - n[1]) * dir[1]; }; return (sc(a) >= sc(b) ? a : b).j;
}

/* --- remo Pendlay (nota de Domingo: «desde el suelo con la barra muerta»): tronco paralelo al suelo; la barra parte apoyada
   en el suelo (los discos tocan el suelo), sube rápido hasta la parte baja del pecho y vuelve a parar en el suelo cada repetición --- */
(function(){
  const p = [40, 54.5], t = 86, n = fgSum(p, fgDir(t, FG_L.tronco));
  const suelo = [n[0], FG_SUELO - 6.5], pecho = fgSum(fgLerp(p, n, 0.72), fgDir(t + 90, 3.5));
  const pose = function(k){ const w = fgLerp(suelo, pecho, k); return { p: p, t: t, cab: -10, a: [47, 82.5], f: [54, 83.5], r: -1, w: w, e: fgCodoHacia(n, w, fgDir(t - 90, 1)) }; };
  FG['remo pendlay'] = { seq: [[pose(0), 0.6], [pose(0.5), 0.15], [pose(1), 0.15], [pose(1), 0.15], [pose(0.5), 0.3], [pose(0), 0.3]], vuelta: 0.3,
    fondo: FG_PISO + fgRotulo('desde el suelo · barra parada'), atras: function(P, ln, ci){ fgDisco(ci, P.w); } };
})();

/* --- pullover en polea (nota: «movimiento de los brazos antinatural»): de pie frente a la polea alta, el tronco algo
   inclinado; los brazos casi rectos bajan en arco desde arriba y delante hasta los muslos (el hombro hace todo el trabajo) --- */
(function(){
  const polea = [106, 6];
  const pose = function(g){ return { p: [46, 50], t: 22, cab: 4, a: [46, 82.5], f: [53, 83.5], r: -1, brazo: [g, g + 12] }; };
  FG['pullover en polea'] = { seq: [[pose(38), 0.4], [pose(80), 0.4], [pose(125), 0.4], [pose(160), 0.4], [pose(160), 0.3], [pose(110), 0.5], [pose(70), 0.5]], vuelta: 0.5,
    fondo: FG_PISO + '<rect x="108" y="2" width="7" height="82" rx="2" class="il-mueble"/><circle cx="' + polea[0] + '" cy="' + polea[1] + '" r="3" class="il-mueble"/>' + fgRotulo('brazos casi rectos · polea alta'),
    atras: function(P, ln){ ln(polea, P.w, 'il-cable'); }, delante: function(P, ln){ ln([P.w[0] - 1.5, P.w[1] - 3], [P.w[0] + 1.5, P.w[1] + 3], 'il-barra'); } };
})();

/* --- pullover con mancuerna (nota: «brazos antinatural»): la parte alta de la espalda apoyada en el banco, cadera a la
   altura del banco y pies en el suelo; la mancuerna, con los brazos casi rectos, va de encima del pecho a detrás de la
   cabeza en arco y vuelve --- */
(function(){
  const pose = function(g){ return { p: [62, 59], t: -88, cab: 0, a: [76, 82.5], f: [83, 83.5], r: -1, brazo: [g, g - 10] }; };
  FG['pullover con mancuerna'] = { seq: [[pose(-4), 0.4], [pose(-40), 0.45], [pose(-80), 0.45], [pose(-108), 0.45], [pose(-108), 0.3], [pose(-60), 0.5]], vuelta: 0.5,
    fondo: FG_PISO + fgCaja(28, 62, 20, 22) + fgRotulo('espalda alta en el banco'), delante: function(P, ln, ci){ ci(P.w, 4.2, 'il-disco'); ci(P.w, 1.4, 'il-peso'); } };
})();

/* --- encogimientos con barra (nota: «no se ve que use una barra olímpica»): de frente, la barra larga con sus discos
   delante de los muslos; los brazos estirados y solo suben los hombros hacia las orejas --- */
(function(){
  const pose = function(enc){ return { vista: 'frente', p: [60, 46.5], aL: [55, 82], aR: [65, 82], enc: enc, brazoL: [181, 180], brazoR: [179, 180] }; };
  FG['encogimientos con barra'] = { vista: 'frente', seq: [[pose(0), 0.5], [pose(4.5), 0.6], [pose(4.5), 0.5]], vuelta: 0.7,
    fondo: FG_PISO + fgFlecha(98, 40, 26) + fgRotulo('barra olímpica · encoge'),
    delante: function(P, ln){ const y = P.wL[1]; ln([14, y], [106, y], 'il-barra'); ln([20, y - 9], [20, y + 9], 'il-placa'); ln([25, y - 7], [25, y + 7], 'il-placa'); ln([100, y - 9], [100, y + 9], 'il-placa'); ln([95, y - 7], [95, y + 7], 'il-placa'); } };
})();

/* --- remo al mentón en polea (nota: «la polea, desde los pies hacia arriba»): de frente, la polea en el suelo entre los pies;
   la barra sube pegada al cuerpo hasta debajo de la barbilla con los codos altos y abiertos, por encima de las manos --- */
(function(){
  const pose = function(k){ const wy = fgLerp(49, 25, k), wL = [55.5, wy], wR = [64.5, wy];
    const eL = fgLerp([50.5, 36.5], [41, 19.5], k), eR = [120 - eL[0], eL[1]];
    return { vista: 'frente', p: [60, 46.5], aL: [54, 82], aR: [66, 82], wL: wL, wR: wR, eL: eL, eR: eR }; };
  FG['remo al menton en polea'] = { vista: 'frente', seq: [[pose(0), 0.4], [pose(0.5), 0.4], [pose(1), 0.4], [pose(1), 0.3], [pose(0.5), 0.5]], vuelta: 0.5,
    fondo: FG_PISO + '<rect x="54" y="80" width="12" height="4" rx="2" class="il-mueble"/>' + fgRotulo('polea baja · codos altos'),
    atras: function(P, ln){ ln([60, 81], [60, P.wL[1]], 'il-cable'); },
    delante: function(P, ln){ ln([P.wL[0] - 2, P.wL[1]], [P.wR[0] + 2, P.wR[1]], 'il-barra'); } };
})();

/* --- remo invertido (de lado): el cuerpo recto como una plancha boca arriba, los talones en el suelo, colgado de una barra
   (vista de canto, un círculo); tira hasta llevar el pecho a la barra, con los codos hacia los pies --- */
function fgRemoInvertido(o){
  const barra = o.barra, tob = o.tobillo;
  const pose = function(n){ const R = fgRecto(tob, n); return { p: R.p, t: R.t, cab: -6, a: tob, f: fgSum(tob, [1, -6.5]), r: 1, w: barra, e: fgCodoHacia(n, barra, [-0.6, 0.8]) }; };
  return { seq: [[pose(o.abajo), 0.4], [pose(fgLerp(o.abajo, o.arriba, 0.5)), 0.45], [pose(o.arriba), 0.45], [pose(o.arriba), 0.3], [pose(fgLerp(o.abajo, o.arriba, 0.5)), 0.55]], vuelta: 0.55,
    fondo: FG_PISO + '<line x1="' + barra[0] + '" y1="' + barra[1] + '" x2="' + barra[0] + '" y2="84" class="il-mueble il-sin"/><circle cx="' + barra[0] + '" cy="' + barra[1] + '" r="2.4" class="il-mueble"/>' + (o.fondo || '') + fgRotulo(o.rotulo) };
}
FG['remo invertido'] = fgRemoInvertido({ tobillo: [18, 82], barra: [78.5, 40], abajo: [78.5, 65], arriba: [72, 48.5], rotulo: 'cuerpo recto · pecho a la barra' });
FG['remo invertido con pies elevados'] = fgRemoInvertido({ tobillo: [18, 63.5], barra: [79, 40], abajo: [79, 65], arriba: [77, 49], fondo: fgCaja(6, 66, 22, 18), rotulo: 'pies elevados en el banco' });

/* --- remo Seal (nota: «parece al revés por los pies hacia arriba»): tumbado boca abajo en un banco alto, el cuerpo recto y
   las piernas estiradas sobre el banco; la barra cuelga con los brazos estirados y sube hasta tocar la parte de abajo del banco --- */
(function(){
  const p = [50, 48.5], t = 90, n = fgSum(p, fgDir(t, FG_L.tronco));
  const abajo = [n[0] + 0.5, n[1] + 24.5], arriba = [n[0] - 1, 61];
  const pose = function(k){ const w = fgLerp(abajo, arriba, k); return { p: p, t: t, cab: 6, a: [13.15, 49], f: [12, 55], r: 1, w: w, e: fgCodoHacia(n, w, [0, -1]) }; };
  FG['remo seal'] = { seq: [[pose(0), 0.4], [pose(0.5), 0.4], [pose(1), 0.4], [pose(1), 0.3], [pose(0.5), 0.5]], vuelta: 0.5,
    fondo: FG_PISO + '<rect x="10" y="51" width="68" height="4" rx="2" class="il-mueble"/><line x1="16" y1="55" x2="16" y2="84" class="il-fondo"/><line x1="72" y1="55" x2="72" y2="84" class="il-fondo"/>' + fgRotulo('boca abajo en el banco alto'),
    atras: function(P, ln, ci){ fgDisco(ci, P.w); } };
})();

/* --- remo renegado (nota: «no se ve el remo + flexión»): en plancha alta sobre dos mancuernas; una flexión y después un remo
   con cada brazo (el otro sostiene el cuerpo) --- */
(function(){
  const tob = [14, 82], manos = [70, 78];
  const plancha = function(n){ const R = fgRecto(tob, n); return { p: R.p, t: R.t, cab: -4, a: tob, f: fgSum(tob, [-2, 1.5]), r: -1, segundo: true }; };
  const arribaN = [70, 53.5], abajoN = [76, 66];
  const pose = function(n, w, w2){ return Object.assign(plancha(n), { w: w || manos, w2: w2 || manos, e: fgCodoHacia(n, w || manos, [-0.5, -0.9]), e2: fgCodoHacia(n, w2 || manos, [-0.5, -0.9]) }); };
  const rema = [62, 61];
  FG['remo renegado'] = { segundo: true, seq: [[pose(arribaN), 0.4], [pose(abajoN), 0.6], [pose(arribaN), 0.5], [pose(arribaN), 0.2], [pose(arribaN, rema), 0.5], [pose(arribaN, rema), 0.2], [pose(arribaN), 0.4], [pose(arribaN, null, rema), 0.5], [pose(arribaN, null, rema), 0.2]], vuelta: 0.4,
    fondo: FG_PISO + fgRotulo('flexión + remo con cada brazo'),
    delante: function(P, ln, ci){ ci(P.w, 4, 'il-disco'); ci(P.w, 1.4, 'il-peso'); }, atras: function(P, ln, ci){ ci(P.w2, 4, 'il-disco il-lejos'); } };
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
