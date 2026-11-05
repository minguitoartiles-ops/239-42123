// Pruebas del código común de las funciones (no necesitan Supabase).
// deno test --allow-env pruebas/comun_test.ts
import { assert, assertEquals, assertNotEquals } from 'jsr:@std/assert@1';

Deno.env.set('CODIGO_PEPPER', 'clave-de-prueba-'.repeat(4));
Deno.env.set('ORIGENES_PERMITIDOS', 'https://app.fitnessindramas.com');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'clave-maestra-de-prueba');
Deno.env.set('LIMPIEZA_TOKEN', 'llave-de-limpieza-de-prueba-0123456789');
const m = await import('../supabase/functions/_compartido/comun.ts');

Deno.test('El código tiene 8 símbolos sin caracteres confusos', () => {
  for (let i = 0; i < 2000; i++) {
    const c = m.nuevoCodigo();
    assert(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/.test(c), c);
  }
});

Deno.test('Los códigos no se repiten', () => {
  const vistos = new Set<string>();
  for (let i = 0; i < 5000; i++) vistos.add(m.nuevoCodigo());
  assertEquals(vistos.size, 5000);
});

Deno.test('Todos los símbolos salen con la misma frecuencia (sin sesgo)', () => {
  const cuenta = new Map<string, number>();
  for (let i = 0; i < 20000; i++) for (const s of m.nuevoCodigo()) cuenta.set(s, (cuenta.get(s) ?? 0) + 1);
  const esperado = (20000 * 8) / 31;
  for (const [s, n] of cuenta) assert(Math.abs(n - esperado) / esperado < 0.08, `${s}: ${n}`);
  assertEquals(cuenta.size, 31);
});

Deno.test('El código se acepta con guion, espacios o minúsculas', () => {
  assertEquals(m.normalizarCodigo('abcd-efgh'), 'ABCDEFGH');
  assertEquals(m.normalizarCodigo(' AB CD EF GH '), 'ABCDEFGH');
  assertEquals(m.normalizarCodigo('ABCD-EFG0'), null);   // el 0 no existe en el alfabeto
  assertEquals(m.normalizarCodigo('ABC'), null);
  assertEquals(m.normalizarCodigo(12345678), null);
});

Deno.test('Contraseñas: de 6 a 72 caracteres, sin más reglas', () => {
  assertEquals(m.contrasenaValida('Clave-de-prueba-123'), true);
  assertEquals(m.contrasenaValida('fresas'), true);                  // 6, solo minúsculas
  assertEquals(m.contrasenaValida('123456'), true);
  assertEquals(m.contrasenaValida('corta'), false);                  // 5
  assertEquals(m.contrasenaValida(''), false);
  assertEquals(m.contrasenaValida('x'.repeat(72)), true);
  assertEquals(m.contrasenaValida('x'.repeat(73)), false);           // más de 72
  assertEquals(m.contrasenaValida(123456789012), false);
});

Deno.test('Acceso pagado al dar de alta, según la tarifa', () => {
  const hoy = new Date('2026-01-31T10:00:00Z');
  assertEquals(m.accesoHasta('mensual', 12, true, hoy), '2026-02-28');      // fin de mes
  assertEquals(m.accesoHasta('trimestral', 12, true, hoy), '2026-04-30');
  assertEquals(m.accesoHasta('semestral', 12, true, hoy), '2026-07-31');
  assertEquals(m.accesoHasta('anual', 12, true, hoy), '2027-01-31');
  assertEquals(m.accesoHasta('mensual', 12, false, hoy), '2026-01-31');     // sin pagar: hasta hoy
  assertEquals(m.accesoHasta('anual', 12, false, hoy), '2026-01-31');
  assertEquals(m.accesoHasta('ninguna', 12, false, hoy), '2026-04-25');     // sin tarifa: 12 semanas
  assertEquals(m.accesoHasta('ninguna', 4, true, hoy), '2026-02-28');
  assertEquals(m.accesoHasta('mensual', 12, true, new Date('2028-01-31T00:00:00Z')), '2028-02-29');   // bisiesto
});

Deno.test('La huella depende del secreto y no deja ver el código', async () => {
  const h = await m.huellaCodigo('ABCDEFGH');
  assert(/^[0-9a-f]{64}$/.test(h));
  assert(!h.includes('ABCDEFGH'));
  assertEquals(h, await m.huellaCodigo('ABCDEFGH'));
  assertNotEquals(h, await m.huellaCodigo('ABCDEFGJ'));
});

Deno.test('Solo la web de la app recibe permiso CORS', () => {
  const propia = m.cabeceras(new Request('http://x', { headers: { Origin: 'https://app.fitnessindramas.com' } }));
  assertEquals(propia.get('Access-Control-Allow-Origin'), 'https://app.fitnessindramas.com');
  const ajena = m.cabeceras(new Request('http://x', { headers: { Origin: 'https://web-ajena.example' } }));
  assertEquals(ajena.get('Access-Control-Allow-Origin'), null);
  assertEquals(ajena.get('Cache-Control'), 'no-store');
});

Deno.test('La limpieza solo acepta su llave propia, ni siquiera la clave maestra', () => {
  const con = (v?: string) => new Request('http://x', v === undefined ? {} : { headers: { Authorization: v } });
  assertEquals(m.llamaLaTarea(con('Bearer llave-de-limpieza-de-prueba-0123456789')), true);
  assertEquals(m.llamaLaTarea(con('Bearer llave-de-limpieza-de-prueba-012345678')), false);
  assertEquals(m.llamaLaTarea(con('Bearer clave-maestra-de-prueba')), false);
  assertEquals(m.llamaLaTarea(con('llave-de-limpieza-de-prueba-0123456789')), false);
  assertEquals(m.llamaLaTarea(con()), false);
});

Deno.test('Las respuestas de error de la base de datos no filtran detalles internos', async () => {
  const req = new Request('http://x');
  const r = m.errorBD(req, { code: 'XX000', message: 'detalle interno con datos' });
  assertEquals(r.status, 500);
  assert(!(await r.text()).includes('detalle interno'));
  assertEquals(m.errorBD(req, { code: '42501', message: 'No' }).status, 403);
  const regla = m.errorBD(req, { code: '23514', message: 'new row for relation "clientes" violates check constraint "clientes_email_check"' });
  assertEquals(regla.status, 400);
  assertEquals((await regla.json()).error.includes('clientes'), false);
});
