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

// ---------------------------------------------------------------------
// Paso 2 · Fichas de clientes desde el servidor (backend/clientes.js)
// ---------------------------------------------------------------------
import { crearClientes } from './clientes.js';

test('Clientes desde el servidor', async (t) => {
  const s = Math.random().toString(36).slice(2, 8);
  const domingo = await crearUsuario(`domingo-${s}@prueba.local`);
  {
    const { error } = await admin.from('equipo').insert({ user_id: domingo, nombre: 'Domingo', rol: 'entrenador' });
    if (error) throw error;
  }
  // Cada prueba «llega» desde una dirección distinta: así no cuenta para el límite de canjes de las otras pruebas
  const ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;
  const otroDispositivo = () => createClient(API, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-forwarded-for': ip } },
  });

  const equipo = otroDispositivo();
  await crearAuth(equipo).entrar(`domingo-${s}@prueba.local`, CLAVE);
  const fichas = crearClientes(equipo);
  let alta;

  await t.test('El equipo da de alta y el servidor calcula el acceso', async () => {
    alta = await fichas.crear({ nombre: `Ana ${s}`, objetivo: 'Perder grasa', telefono: '612 345 678',
      programa_semanas: 16, tarifa: 'mensual', precio: 60, pagado: true });
    assert.match(alta.codigo, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    const dias = (Date.parse(alta.acceso_hasta) - Date.parse(new Date().toISOString().slice(0, 10))) / 864e5;
    assert.ok(dias >= 28 && dias <= 31, `mensual: ${alta.acceso_hasta}`);
    const lista = await fichas.listar();
    const ana = lista.find((x) => x.id === alta.id);
    assert.ok(ana, 'aparece en la lista');
    assert.equal(ana.telefono, '612345678');
    assert.equal(ana.programa_semanas, 16);
    assert.equal(ana.user_id, null);
  });

  await t.test('Un correo mal escrito se rechaza con un mensaje claro', async () => {
    await assert.rejects(fichas.crear({ nombre: 'X', email: 'sin-arroba' }), /no es válido/);
  });

  await t.test('El equipo edita la ficha; lo que no se puede tocar se ignora', async () => {
    await fichas.actualizar(alta.id, { nombre: `Ana María ${s}`, programa_semanas: 24, acceso_hasta: '2099-01-01', user_id: domingo });
    const { data } = await admin.from('clientes').select('nombre, programa_semanas, acceso_hasta, user_id').eq('id', alta.id).single();
    assert.equal(data.nombre, `Ana María ${s}`);
    assert.equal(data.programa_semanas, 24);
    assert.equal(data.acceso_hasta, alta.acceso_hasta);
    assert.equal(data.user_id, null);
    await assert.rejects(fichas.actualizar(alta.id, { email: 'mal' }), /no es válido/);
  });

  await t.test('El cliente canjea su código, crea su cuenta y entra', async () => {
    const movil = otroDispositivo();
    const suyas = crearClientes(movil);
    await suyas.canjear(alta.codigo.toLowerCase(), ` Ana-${s}@Prueba.local `, CLAVE);
    const quien = await crearAuth(movil).entrarCliente(`ana-${s}@prueba.local`, CLAVE);
    assert.equal(quien.id, alta.id);
    const f = await suyas.miFicha();
    assert.equal(f.id, alta.id);
    const lista = await suyas.listar();
    assert.deepEqual(lista.map((x) => x.id), [alta.id], 'un cliente solo ve su ficha');
    await suyas.actualizar(alta.id, { nombre: 'Me lo cambio' }).catch(() => {});
    const { data } = await admin.from('clientes').select('nombre').eq('id', alta.id).single();
    assert.notEqual(data.nombre, 'Me lo cambio', 'un cliente no se cambia su ficha');
  });

  await t.test('El código ya canjeado no vale otra vez, ni se crea otro código para quien ya tiene cuenta', async () => {
    await assert.rejects(crearClientes(otroDispositivo()).canjear(alta.codigo, `otra-${s}@prueba.local`, CLAVE), /no válido o caducado/);
    await assert.rejects(fichas.nuevoCodigo(alta.id));
  });

  await t.test('Un profesional no entra como cliente, y una cuenta sin ficha tampoco', async () => {
    await assert.rejects(crearAuth(otroDispositivo()).entrarCliente(`domingo-${s}@prueba.local`, CLAVE), /es de un profesional/);
    await crearUsuario(`suelto-${s}@prueba.local`);
    const sb = otroDispositivo();
    await assert.rejects(crearAuth(sb).entrarCliente(`suelto-${s}@prueba.local`, CLAVE), /no tiene acceso/);
    const { data } = await sb.auth.getSession();
    assert.equal(data.session, null, 'sin sesión tras el rechazo');
  });
});
