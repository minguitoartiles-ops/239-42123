// Pruebas del acceso de profesionales de la app (backend/auth.js) contra Supabase local.
// Se ejecutan en GitHub Actions, desde backend/: npm run probar
// Variables: API_URL, ANON_KEY, SERVICE_ROLE_KEY (de `supabase status`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { crearAuth } from './auth.js';

const API = process.env.API_URL;
const ANON = process.env.ANON_KEY;
const SERVICIO = process.env.SERVICE_ROLE_KEY;
const admin = createClient(API, SERVICIO, { auth: { persistSession: false } });
const nuevo = () => createClient(API, ANON, { auth: { persistSession: false, autoRefreshToken: false } });

const CLAVE = 'Clave-de-prueba-larga-123';
const sufijo = Math.random().toString(36).slice(2, 8);

async function crearUsuario(email) {
  const { data, error } = await admin.auth.admin.createUser({ email, password: CLAVE, email_confirm: true });
  if (error) throw error;
  return data.user.id;
}

test('Acceso de profesionales', async (t) => {
  const fatima = await crearUsuario(`fatima-${sufijo}@prueba.local`);
  await crearUsuario(`cliente-${sufijo}@prueba.local`);
  {
    const { error } = await admin.from('equipo').insert({ user_id: fatima, nombre: 'Fátima', rol: 'dietista' });
    if (error) throw error;
  }

  await t.test('Una profesional entra y el servidor le da su papel', async () => {
    const sb = nuevo();
    const p = await crearAuth(sb).entrar(`  FATIMA-${sufijo}@prueba.local `, CLAVE);
    assert.equal(p.nombre, 'Fátima');
    assert.equal(p.rol, 'dietista');
    const { data } = await sb.auth.getSession();
    assert.ok(data.session, 'queda con sesión');
  });

  await t.test('Con una contraseña incorrecta no entra', async () => {
    await assert.rejects(crearAuth(nuevo()).entrar(`fatima-${sufijo}@prueba.local`, 'Otra-Clave-123'),
      /Correo o contraseña incorrectos/);
  });

  await t.test('Una cuenta que no es del equipo no entra y no se queda con sesión', async () => {
    const sb = nuevo();
    await assert.rejects(crearAuth(sb).entrar(`cliente-${sufijo}@prueba.local`, CLAVE),
      /no es de un profesional/);
    const { data } = await sb.auth.getSession();
    assert.equal(data.session, null);
  });

  await t.test('Sin correo o sin contraseña no se intenta', async () => {
    await assert.rejects(crearAuth(nuevo()).entrar('', CLAVE), /Escribe tu correo/);
    await assert.rejects(crearAuth(nuevo()).entrar(`fatima-${sufijo}@prueba.local`, ''), /Escribe tu correo/);
  });

  await t.test('Salir cierra la sesión', async () => {
    const sb = nuevo();
    const auth = crearAuth(sb);
    await auth.entrar(`fatima-${sufijo}@prueba.local`, CLAVE);
    await auth.salir();
    const { data } = await sb.auth.getSession();
    assert.equal(data.session, null);
  });

  await t.test('Sin sesión, la tabla del equipo no se puede leer', async () => {
    const { data } = await nuevo().from('equipo').select('*');
    assert.deepEqual(data ?? [], []);
  });
});
