// Pruebas de las funciones del servidor contra Supabase local (supabase start).
// Se ejecutan en GitHub Actions: deno test --allow-net --allow-env pruebas/
// Variables: API_URL, ANON_KEY, SERVICE_ROLE_KEY (de `supabase status`).
import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { assert, assertEquals } from 'jsr:@std/assert@1';

const API = Deno.env.get('API_URL')!;
const ANON = Deno.env.get('ANON_KEY')!;
const SERVICIO = Deno.env.get('SERVICE_ROLE_KEY')!;
const LIMPIEZA = Deno.env.get('LIMPIEZA_TOKEN')!;
const FUNCIONES = `${API}/functions/v1`;

const admin = createClient(API, SERVICIO, { auth: { persistSession: false } });
const sinSesion = () => createClient(API, ANON, { auth: { persistSession: false } });

async function crearUsuario(email: string, password: string) {
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  return data.user!.id;
}

async function token(email: string, password: string): Promise<string> {
  const { data, error } = await sinSesion().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session!.access_token;
}

async function llamar(nombre: string, cuerpo: unknown, auth?: string, extra: Record<string, string> = {}) {
  const r = await fetch(`${FUNCIONES}/${nombre}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON, ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...extra },
    body: JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  let json: Record<string, unknown> = {};
  try { json = JSON.parse(texto); } catch { /* respuesta vacía */ }
  return { estado: r.status, json, cabeceras: r.headers };
}

const CLAVE = 'Clave-de-prueba-larga-123';
const sufijo = crypto.randomUUID().slice(0, 8);

Deno.test('Funciones del servidor', async (t) => {
  const domingo = await crearUsuario(`domingo-${sufijo}@prueba.local`, CLAVE);
  await crearUsuario(`intruso-${sufijo}@prueba.local`, CLAVE);
  {
    const { error } = await admin.from('equipo').insert({ user_id: domingo, nombre: 'Domingo', rol: 'entrenador' });
    if (error) throw error;
  }
  const tDomingo = await token(`domingo-${sufijo}@prueba.local`, CLAVE);
  const tIntruso = await token(`intruso-${sufijo}@prueba.local`, CLAVE);
  const hoyMas30 = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10);

  let clienteId = '';
  let codigo = '';

  await t.step('Sin sesión no se puede dar de alta', async () => {
    const r = await llamar('alta-cliente', { nombre: 'X', acceso_hasta: hoyMas30 });
    assertEquals(r.estado, 401);
  });

  await t.step('Alguien que no es del equipo no puede dar de alta', async () => {
    const r = await llamar('alta-cliente', { nombre: 'X', acceso_hasta: hoyMas30 }, tIntruso);
    assertEquals(r.estado, 403);
  });

  await t.step('El equipo da de alta y recibe el código una vez', async () => {
    const r = await llamar('alta-cliente', { nombre: 'Cliente Prueba', acceso_hasta: hoyMas30 }, tDomingo);
    assertEquals(r.estado, 200);
    clienteId = String(r.json.id);
    codigo = String(r.json.codigo);
    assert(/^[23456789A-HJKMNP-Z]{4}-[23456789A-HJKMNP-Z]{4}$/.test(codigo), `formato de código: ${codigo}`);
    const { data } = await admin.schema('public').from('clientes').select('nombre').eq('id', clienteId).single();
    assertEquals(data?.nombre, 'Cliente Prueba');
  });

  await t.step('Un código inventado no sirve', async () => {
    const r = await llamar('canjear-codigo', { codigo: 'ZZZZ-ZZZZ', email: `c-${sufijo}@prueba.local`, password: CLAVE });
    assertEquals(r.estado, 400);
  });

  await t.step('Contraseña débil rechazada', async () => {
    for (const password of ['corta', 'sinmayusculas123', 'SinNumerosNinguno']) {
      const r = await llamar('canjear-codigo', { codigo, email: `c-${sufijo}@prueba.local`, password });
      assertEquals(r.estado, 400, password);
    }
  });

  await t.step('El cliente canjea su código y entra a su ficha', async () => {
    const r = await llamar('canjear-codigo', { codigo: codigo.toLowerCase(), email: `c-${sufijo}@prueba.local`, password: CLAVE });
    assertEquals(r.estado, 200);
    const c = sinSesion();
    const { error } = await c.auth.signInWithPassword({ email: `c-${sufijo}@prueba.local`, password: CLAVE });
    assertEquals(error, null);
    const { data } = await c.from('clientes').select('id');
    assertEquals(data?.map((x) => x.id), [clienteId]);
  });

  await t.step('El mismo código no se canjea dos veces', async () => {
    const r = await llamar('canjear-codigo', { codigo, email: `otro-${sufijo}@prueba.local`, password: CLAVE });
    assertEquals(r.estado, 400);
  });

  await t.step('No se genera código nuevo para quien ya tiene cuenta', async () => {
    const r = await llamar('alta-cliente', { cliente_id: clienteId }, tDomingo);
    assertEquals(r.estado, 400);
  });

  await t.step('La limpieza solo la lanza la tarea, con su llave propia', async () => {
    assertEquals((await llamar('limpieza-diaria', {}, ANON)).estado, 401);
    assertEquals((await llamar('limpieza-diaria', {}, tDomingo)).estado, 401);
    assertEquals((await llamar('limpieza-diaria', {}, SERVICIO)).estado, 401);
    const r = await llamar('limpieza-diaria', {}, LIMPIEZA);
    assertEquals(r.estado, 200);
  });

  await t.step('Tras 10 intentos por hora desde el mismo origen, se bloquea', async () => {
    const ip = { 'X-Forwarded-For': `203.0.113.${Math.floor(Math.random() * 200) + 1}` };
    let ultimo = 0;
    for (let i = 0; i < 11; i++) {
      ultimo = (await llamar('canjear-codigo', { codigo: 'ZZZZ-ZZZZ', email: 'x@prueba.local', password: CLAVE }, undefined, ip)).estado;
    }
    assertEquals(ultimo, 429);
  });
});
