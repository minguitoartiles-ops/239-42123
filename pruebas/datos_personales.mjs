// Comprobación en GitHub (auditoría de seguridad del 9/11/2026): que no entre en el repositorio ningún DNI/NIE ni
// ninguna cuenta bancaria (IBAN) de verdad. El repositorio es público y lo que se sube se queda en el historial.
// Busca números con la letra o los dígitos de control correctos (así no salta con cualquier cifra) y deja pasar
// solo los de prueba de siempre.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const DE_PRUEBA = new Set(['11111111H', '12345678Z', '00000000T', '22222222J', '33333333P', '44444444A', '55555555K', '66666666Q', '77777777B', '88888888Y', '99999999R']);
const LETRAS = 'TRWAGMYFPDXBNJZSQVHLCKE';

function nifValido(num, letra) {
  const n = num.replace(/^X/, '0').replace(/^Y/, '1').replace(/^Z/, '2');
  return LETRAS[Number(n) % 23] === letra;
}
function ibanValido(iban) {
  const t = iban.slice(4) + iban.slice(0, 4);
  const num = t.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let r = 0;
  for (const d of num) r = (r * 10 + Number(d)) % 97;
  return r === 1;
}

const archivos = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0')
  .filter((f) => f && !/\.(png|jpe?g|webp|gif|ico|woff2?|ttf|mp3|ogg|wav|pdf|zip)$/i.test(f) && !/(^|\/)package-lock\.json$/.test(f));

const hallazgos = [];
for (const f of archivos) {
  let texto;
  try { texto = readFileSync(f, 'utf8'); } catch { continue; }
  texto.split('\n').forEach((linea, i) => {
    for (const m of linea.matchAll(/(?<![A-Za-z0-9])([XYZ]?\d{7,8})[\s.-]?([A-Z])(?![A-Za-z0-9])/g)) {
      const num = m[1];
      if (num.length === 7) continue;                                      // 7 cifras sin X/Y/Z: no es un DNI
      const nif = num + m[2];
      if (nifValido(num, m[2]) && !DE_PRUEBA.has(nif)) hallazgos.push(`${f}:${i + 1}: parece un DNI/NIE real (${nif.slice(0, 2)}…)`);
    }
    for (const m of linea.matchAll(/(?<![A-Za-z0-9])([A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){3,7}(?:[ ]?[A-Z0-9]{1,3})?)(?![A-Za-z0-9])/g)) {
      const iban = m[1].replace(/ /g, '');
      if (/^[A-Z]{2}\d{2}0+$/.test(iban)) continue;                       // ES00 0000 … de ejemplo
      if (iban.length >= 15 && ibanValido(iban)) hallazgos.push(`${f}:${i + 1}: parece una cuenta bancaria (IBAN) real (${iban.slice(0, 4)}…)`);
    }
  });
}

if (hallazgos.length) {
  console.error('Hay datos personales que parecen reales en el repositorio. Quítalos (o, si son de prueba, añádelos a DE_PRUEBA):');
  hallazgos.forEach((h) => console.error('  ' + h));
  process.exit(1);
}
console.log(`Sin DNI/NIE ni IBAN reales en ${archivos.length} archivos.`);
