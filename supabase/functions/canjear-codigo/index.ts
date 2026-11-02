// Canje del código de primera vez: crea la cuenta del cliente y la une a su ficha.
// Es la única forma de crear una cuenta de cliente (el registro libre está cerrado).
// Se llama SIN sesión, así que está limitada: intentos por origen y en total.
//
// POST { "codigo": "ABCD-EFGH", "email": "…", "password": "…" } → { "ok": true }
// Después, la app inicia sesión con ese correo y contraseña.
//
// Los mensajes de error no dicen si el código existe: siempre «no válido o caducado».
import {
  cabeceras, clienteServidor, error, huellaCodigo, huellaOrigen, leerJSON, normalizarCodigo, responder,
} from '../_compartido/comun.ts';

const EMAIL = /^[^@\s]{1,64}@[^@\s]{1,189}\.[^@\s]{2,}$/;
const NO_VALIDO = 'Código no válido o caducado. Pide uno nuevo a tu entrenador.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cabeceras(req) });
  if (req.method !== 'POST') return error(req, 405, 'Método no permitido.');

  const servidor = clienteServidor();

  // 1 · Límite de intentos, antes de mirar nada más
  const { data: permitido, error: eLimite } = await servidor.rpc('permitir_intento_canje', {
    p_origen: await huellaOrigen(req),
  });
  if (eLimite) return error(req, 500, 'No se ha podido completar. Inténtalo de nuevo.');
  if (permitido !== true) return error(req, 429, 'Demasiados intentos. Prueba de nuevo dentro de una hora.');

  // 2 · Datos
  const cuerpo = await leerJSON(req);
  const codigo = normalizarCodigo(cuerpo?.codigo);
  const email = typeof cuerpo?.email === 'string' ? cuerpo.email.trim().toLowerCase() : '';
  const password = typeof cuerpo?.password === 'string' ? cuerpo.password : '';
  if (!codigo) return error(req, 400, NO_VALIDO);
  if (!EMAIL.test(email) || email.length > 254) return error(req, 400, 'Escribe un correo válido.');
  if (password.length < 10 || password.length > 72) {
    return error(req, 400, 'La contraseña debe tener entre 10 y 72 caracteres.');
  }

  // 3 · ¿Código válido? (todavía no se gasta)
  const huella = await huellaCodigo(codigo);
  const { data: cliente, error: eConsulta } = await servidor.rpc('consultar_codigo', { p_huella: huella });
  if (eConsulta) return error(req, 500, 'No se ha podido completar. Inténtalo de nuevo.');
  if (!cliente) return error(req, 400, NO_VALIDO);

  // 4 · Crear la cuenta
  const { data: creado, error: eCuenta } = await servidor.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (eCuenta || !creado?.user) {
    return error(req, 400, 'No se ha podido crear la cuenta con ese correo. Prueba con otro o escribe a tu entrenador.');
  }

  // 5 · Gastar el código y unir la cuenta, en un solo paso. Si alguien se adelantó, se deshace.
  const { data: unido, error: eUnir } = await servidor.rpc('vincular_cliente', {
    p_huella: huella, p_user: creado.user.id,
  });
  if (eUnir || !unido) {
    await servidor.auth.admin.deleteUser(creado.user.id);
    return error(req, 400, NO_VALIDO);
  }

  return responder(req, 200, { ok: true });
});
