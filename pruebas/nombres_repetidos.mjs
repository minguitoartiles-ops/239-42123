// 8/11/2026 · Comprueba que dos archivos de la app no declaran una función con el mismo nombre.
// Los archivos se cargan como scripts normales y comparten los nombres: si dos declaran «function x», la última que
// se carga sustituye a la otra en toda la app sin avisar (así se rompió la subida de los pesos del cliente).
// Solo mira las funciones declaradas a nivel de archivo o dentro de un bloque «if (…) {» del nivel de archivo, que son
// las que se comparten; las de dentro de otras funciones no cuentan.
import { readFileSync, readdirSync } from 'node:fs';

const fuera = new Set(['lz-string.min.js', 'sw.js', 'backend.js']);
const visto = new Map();
const repetidos = [];
for (const f of readdirSync('.').filter((x) => x.endsWith('.js') && !fuera.has(x)).sort()) {
  let nivel = 0, enBloqueSuperior = false;
  const lineas = readFileSync(f, 'utf8').split('\n');
  lineas.forEach((l, i) => {
    const m = l.match(/^(\s*)function\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (m && (nivel === 0 || (nivel === 1 && enBloqueSuperior))) {
      const n = m[2];
      if (visto.has(n) && visto.get(n).f !== f) repetidos.push(`${n}: ${visto.get(n).f}:${visto.get(n).l} y ${f}:${i + 1}`);
      else if (!visto.has(n)) visto.set(n, { f, l: i + 1 });
    }
    // cuenta llaves de forma aproximada (sin cadenas ni comentarios)
    const limpia = l.replace(/\/\/.*$/, '').replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, '');
    if (nivel === 0 && /^\s*if\s*\(.*\)\s*\{\s*$/.test(limpia)) enBloqueSuperior = true;
    for (const c of limpia) { if (c === '{') nivel++; else if (c === '}') nivel--; }
    if (nivel <= 0) { nivel = 0; enBloqueSuperior = false; }
  });
}
if (repetidos.length) {
  for (const r of repetidos) console.log(`::error::Función declarada en dos archivos: ${r}`);
  process.exit(1);
}
console.log('Sin funciones repetidas entre archivos');
