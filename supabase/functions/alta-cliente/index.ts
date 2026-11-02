// Alta de cliente y códigos de acceso. Solo el equipo (Domingo y Fátima).
//
// POST, con la sesión del profesional:
//   { "nombre": "…", "objetivo"?: "…", "email"?: "…", "telefono"?: "…", "acceso_hasta": "AAAA-MM-DD" }
//     → { "id": "<cliente>", "codigo": "ABCD-EFGH" }      alta nueva
//   { "cliente_id": "<cliente>" }
//     → { "id": "<cliente>", "codigo": "ABCD-EFGH" }      código nuevo (si el anterior caducó)
//
// El código se enseña una sola vez: en la base de datos solo queda su huella.
import {
  clienteServidor, error, errorBD, huellaCodigo, leerJSON, mostrarCodigo, nuevoCodigo,
  responder, usuarioQueLlama, cabeceras,
} from '../_compartido/comun.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function texto(v: unknown, max: number): string | undefined {
  return typeof v === 'string' && v.trim() !== '' ? v.trim().slice(0, max) : undefined;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cabeceras(req) });
  if (req.method !== 'POST') return error(req, 405, 'Método no permitido.');

  const quien = await usuarioQueLlama(req);
  if (!quien) return error(req, 401, 'Tu sesión ha caducado. Vuelve a entrar.');

  const cuerpo = await leerJSON(req);
  if (!cuerpo) return error(req, 400, 'Petición no válida.');

  const servidor = clienteServidor();
  const codigo = nuevoCodigo();
  const huella = await huellaCodigo(codigo);

  // Código nuevo para un cliente que aún no tiene cuenta
  if (cuerpo.cliente_id !== undefined) {
    if (typeof cuerpo.cliente_id !== 'string' || !UUID.test(cuerpo.cliente_id)) {
      return error(req, 400, 'Cliente no válido.');
    }
    const { error: e } = await servidor.rpc('nuevo_codigo', {
      p_por: quien.id, p_cliente: cuerpo.cliente_id, p_huella: huella,
    });
    if (e) return errorBD(req, e);
    return responder(req, 200, { id: cuerpo.cliente_id, codigo: mostrarCodigo(codigo) });
  }

  // Alta nueva
  const nombre = texto(cuerpo.nombre, 80);
  const acceso = typeof cuerpo.acceso_hasta === 'string' && FECHA.test(cuerpo.acceso_hasta) ? cuerpo.acceso_hasta : undefined;
  if (!nombre) return error(req, 400, 'Falta el nombre del cliente.');
  if (!acceso) return error(req, 400, 'Falta la fecha hasta la que está pagado.');

  const { data, error: e } = await servidor.rpc('alta_cliente', {
    p_por: quien.id,
    p_datos: {
      nombre,
      objetivo: texto(cuerpo.objetivo, 40),
      email: texto(cuerpo.email, 254),
      telefono: texto(cuerpo.telefono, 20),
    },
    p_acceso_hasta: acceso,
    p_huella: huella,
  });
  if (e) return errorBD(req, e);
  return responder(req, 200, { id: data, codigo: mostrarCodigo(codigo) });
});
